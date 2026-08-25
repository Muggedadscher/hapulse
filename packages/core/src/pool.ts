/**
 * [fork] Pool pump — framework-agnostic domain logic.
 *
 * The only non-trivial piece here is the schedule model: HAPulse's Pool page
 * lets the user edit *when the pool-pump schedule is active across a day*, and
 * that has to round-trip through the nielsfaber `scheduler-component` timeslot
 * format used by the `switch.schedule_*` entity behind the original Lovelace
 * `custom:scheduler-card`.
 *
 * The scheduler models a day as a set of **contiguous timeslots** that
 * partition 00:00 → 00:00, each carrying an action (here: turn the schedule
 * helper on or off). HAPulse models the same thing as a short list of
 * **"on" windows**; everything outside a window is off. This module converts
 * between the two, so the editor UI can stay simple while what we write back
 * via `scheduler.edit` is byte-compatible with what the scheduler-card writes.
 *
 * Kept deliberately DOM-free and dependency-free (see CLAUDE.md): all HA I/O
 * lives in the dashboard app; this is pure data.
 */

/** Minutes in a full day. A stop at exactly midnight means end-of-day. */
export const POOL_DAY_MINUTES = 1440;

/** Weekday identifiers, in display/week order (Monday first). */
export type PoolWeekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** All weekdays, Monday-first — the canonical order for the day picker. */
export const POOL_WEEKDAYS: readonly PoolWeekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * A single "pump-schedule on" window within a day, expressed in minutes from
 * midnight. `stop` is exclusive; a stop of {@link POOL_DAY_MINUTES} (1440)
 * represents end-of-day (the scheduler writes this as "00:00").
 */
export interface PoolWindow {
  start: number;
  stop: number;
}

/** The editable shape of a pool schedule. */
export interface PoolScheduleModel {
  /** Days the schedule repeats on. Empty means "never runs". */
  weekdays: PoolWeekday[];
  /** On-windows, normalized: sorted, merged, non-overlapping. */
  windows: PoolWindow[];
  /** What the scheduler does after firing — always "repeat" for a daily plan. */
  repeatType: 'repeat' | 'single' | 'pause';
}

/** The scheduler-component action shape we read from / write to a timeslot. */
export interface PoolScheduleAction {
  service: string;
  entity_id?: string | string[];
  service_data?: Record<string, unknown>;
}

/** One scheduler-component timeslot as accepted by `scheduler.edit`. */
export interface PoolTimeslot {
  start: string;
  stop: string;
  actions: PoolScheduleAction[];
}

/** Raw attribute bag of a `switch.schedule_*` entity (only the bits we read). */
export interface RawScheduleAttributes {
  weekdays?: unknown;
  timeslots?: unknown;
  actions?: unknown;
  repeat_type?: unknown;
  // Entity attribute bags carry arbitrary extra keys; the index signature also
  // keeps this from being a "weak type" so a HassEntity's attributes assign in.
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

/** Clamp a minute value into [0, 1440]. */
function clampMinutes(min: number): number {
  if (!Number.isFinite(min)) return 0;
  return Math.max(0, Math.min(POOL_DAY_MINUTES, Math.round(min)));
}

/**
 * Parse an "HH:MM" or "HH:MM:SS" clock string into minutes from midnight.
 * Returns null for anything unparseable.
 */
export function hhmmToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Format minutes-from-midnight as "HH:MM". End-of-day (1440) folds back to
 * "00:00", matching how the scheduler stores a slot that runs until midnight.
 */
export function minutesToHHMM(min: number): string {
  const total = clampMinutes(min) % POOL_DAY_MINUTES;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Window normalization
// ---------------------------------------------------------------------------

/**
 * Sort, clamp and merge overlapping/adjacent windows into a canonical list.
 * Drops zero-length windows. The result never overlaps and is start-ordered.
 */
export function normalizeWindows(windows: PoolWindow[]): PoolWindow[] {
  const cleaned = windows
    .map((w) => ({ start: clampMinutes(w.start), stop: clampMinutes(w.stop) }))
    .filter((w) => w.stop > w.start)
    .sort((a, b) => a.start - b.start);

  const merged: PoolWindow[] = [];
  for (const w of cleaned) {
    const last = merged[merged.length - 1];
    // Merge when the next window starts at or before the previous one ends
    // (adjacency included, so 08:00–10:00 + 10:00–12:00 becomes one block).
    if (last && w.start <= last.stop) {
      last.stop = Math.max(last.stop, w.stop);
    } else {
      merged.push({ ...w });
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Weekdays
// ---------------------------------------------------------------------------

const WORKDAYS: PoolWeekday[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
const WEEKEND: PoolWeekday[] = ['sat', 'sun'];

/** Order weekdays Monday-first and de-duplicate. */
export function sortWeekdays(days: PoolWeekday[]): PoolWeekday[] {
  return POOL_WEEKDAYS.filter((d) => days.includes(d));
}

/**
 * Expand the scheduler's weekday tokens (which may use the shorthands "daily",
 * "workday", "weekend") into concrete Monday-first weekdays.
 */
export function parseWeekdays(raw: unknown): PoolWeekday[] {
  if (!Array.isArray(raw)) return [...POOL_WEEKDAYS];
  const out = new Set<PoolWeekday>();
  for (const token of raw) {
    const t = String(token).toLowerCase();
    if (t === 'daily') POOL_WEEKDAYS.forEach((d) => out.add(d));
    else if (t === 'workday') WORKDAYS.forEach((d) => out.add(d));
    else if (t === 'weekend') WEEKEND.forEach((d) => out.add(d));
    else if ((POOL_WEEKDAYS as readonly string[]).includes(t)) out.add(t as PoolWeekday);
  }
  // An empty/unrecognized set most likely means "every day" in practice, but we
  // preserve an explicit selection; only a genuinely empty source defaults to daily.
  return out.size > 0 ? sortWeekdays([...out]) : [...POOL_WEEKDAYS];
}

/**
 * Collapse concrete weekdays into the compact form the scheduler prefers:
 * all seven → ["daily"], otherwise the Monday-first list of day tokens.
 */
export function weekdaysToScheduler(days: PoolWeekday[]): string[] {
  const sorted = sortWeekdays(days);
  if (sorted.length === POOL_WEEKDAYS.length) return ['daily'];
  return sorted;
}

// ---------------------------------------------------------------------------
// Parsing an existing schedule → editable model
// ---------------------------------------------------------------------------

/** True when a scheduler action turns its target on. */
function actionIsOn(action: unknown): boolean {
  if (!action || typeof action !== 'object') return false;
  const service = (action as PoolScheduleAction).service;
  return typeof service === 'string' && /(?:^|\.)turn_on$/.test(service);
}

/** Parse a "HH:MM:SS - HH:MM:SS" timeslot string into start/stop minutes. */
function parseTimeslotString(slot: string): PoolWindow | null {
  const parts = slot.split('-');
  if (parts.length !== 2) return null;
  const start = hhmmToMinutes(parts[0]!);
  const stopRaw = hhmmToMinutes(parts[1]!);
  if (start == null || stopRaw == null) return null;
  // A stop of 00:00 means end-of-day, not start-of-day.
  const stop = stopRaw === 0 ? POOL_DAY_MINUTES : stopRaw;
  return { start, stop };
}

/**
 * Read a `switch.schedule_*` entity's attributes into an editable
 * {@link PoolScheduleModel}. Windows are taken from the timeslots whose action
 * is a `turn_on`, then normalized.
 */
export function parseScheduleAttributes(attrs: RawScheduleAttributes): PoolScheduleModel {
  const timeslots = Array.isArray(attrs.timeslots) ? attrs.timeslots : [];
  const actions = Array.isArray(attrs.actions) ? attrs.actions : [];

  const windows: PoolWindow[] = [];
  timeslots.forEach((slot, i) => {
    if (typeof slot !== 'string') return;
    if (!actionIsOn(actions[i])) return;
    const w = parseTimeslotString(slot);
    if (w) windows.push(w);
  });

  const repeat = attrs.repeat_type;
  const repeatType: PoolScheduleModel['repeatType'] =
    repeat === 'single' || repeat === 'pause' ? repeat : 'repeat';

  return {
    weekdays: parseWeekdays(attrs.weekdays),
    windows: normalizeWindows(windows),
    repeatType,
  };
}

// ---------------------------------------------------------------------------
// Editable model → scheduler.edit payload
// ---------------------------------------------------------------------------

export interface BuildTimeslotsOptions {
  /** Entity the schedule toggles (e.g. the schedule input_boolean). */
  entityId: string;
  /** Service that turns it on (default `input_boolean.turn_on`). */
  onService?: string;
  /** Service that turns it off (default `input_boolean.turn_off`). */
  offService?: string;
}

/**
 * Build the contiguous timeslot list that fully partitions the day, with a
 * `turn_on` action inside every window and `turn_off` everywhere else — the
 * exact shape the scheduler-card produces, so edits stay compatible.
 */
export function buildScheduleTimeslots(
  windows: PoolWindow[],
  { entityId, onService = 'input_boolean.turn_on', offService = 'input_boolean.turn_off' }: BuildTimeslotsOptions,
): PoolTimeslot[] {
  const norm = normalizeWindows(windows);

  // Boundary points across the whole day, ascending and unique.
  const bounds = new Set<number>([0, POOL_DAY_MINUTES]);
  for (const w of norm) {
    bounds.add(w.start);
    bounds.add(w.stop);
  }
  const points = [...bounds].sort((a, b) => a - b);

  const isOn = (a: number, b: number) => norm.some((w) => a >= w.start && b <= w.stop);

  type Segment = { start: number; stop: number; on: boolean };
  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]!;
    const stop = points[i + 1]!;
    const on = isOn(start, stop);
    const last = segments[segments.length - 1];
    // Coalesce neighbouring segments that share the same on/off state.
    if (last && last.on === on) last.stop = stop;
    else segments.push({ start, stop, on });
  }

  return segments.map((seg) => ({
    start: minutesToHHMM(seg.start),
    stop: minutesToHHMM(seg.stop),
    actions: [{ service: seg.on ? onService : offService, entity_id: entityId }],
  }));
}

/** Total minutes the pump schedule is "on" per day for the given windows. */
export function scheduleOnMinutes(windows: PoolWindow[]): number {
  return normalizeWindows(windows).reduce((sum, w) => sum + (w.stop - w.start), 0);
}
