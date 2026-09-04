/**
 * [fork] Waste collection — framework-agnostic domain logic.
 *
 * HAPulse has no native notion of "bin day", but the popular
 * `waste_collection_schedule` integration exposes one `sensor.*` per waste type
 * carrying the next pickup date(s). This module turns whatever such sensors an
 * install happens to have into a clean, de-duplicated `WasteBin[]` the Home card
 * renders — no per-install configuration required.
 *
 * A matching sensor looks like this (Kreis Emmendingen example):
 *
 *   sensor.grauetonne_komplett
 *     state:      "Graue Tonne in 7 days"
 *     daysTo:     7
 *     types:      ["Graue Tonne (verlegt)", "Graue Tonne"]
 *     upcoming:   [{ date: "2026-09-11", type: "Graue Tonne", icon: "mdi:trash-can" }, …]
 *     icon:       "mdi:trash-can"
 *
 * The same bin frequently exists as several sensors (a base one, a `_komplett`
 * one that folds in rescheduled "(verlegt)" dates, and a `_verlegt` one). They
 * all share a collection *type*, so we group by that and keep the richest
 * sensor per group — which is exactly the one a hand-built dashboard would pick.
 *
 * Kept deliberately DOM-free and dependency-free (see CLAUDE.md): all HA I/O and
 * rendering live in the dashboard app; this is pure data.
 */

import type { HassEntity, HassEntityMap } from './types.js';

/** One upcoming pickup for a bin. */
export interface WasteCollection {
  /** ISO calendar date, `YYYY-MM-DD`. */
  date: string;
  /** The appointment's own type label, e.g. "Gelber Sack (verlegt)", if given. */
  type?: string;
}

/** A single waste type with its next pickup, ready to render. */
export interface WasteBin {
  /** The source sensor's entity_id (also the React key). */
  entityId: string;
  /** Display name — the collection type, "(verlegt)"-style suffix stripped. */
  name: string;
  /** HA icon string (e.g. `mdi:recycle-variant`), if the sensor sets one. */
  icon?: string | undefined;
  /** Whole days until the next pickup (0 = today), or null when unknown. */
  daysTo: number | null;
  /** ISO date of the next pickup, or null when none is known. */
  nextDate: string | null;
  /** Upcoming pickups, ascending by date; `nextDate` is the first entry. */
  upcoming: WasteCollection[];
}

export interface DetectWasteOptions {
  /** Entity ids to skip entirely (e.g. the user's `hiddenEntities`). */
  hidden?: Iterable<string> | undefined;
  /**
   * Epoch-ms "now". When given, past pickups are dropped and `daysTo` is
   * computed from the next date (in the runtime's local timezone) as a fallback
   * for sensors that don't expose their own `daysTo`. Omit to trust the sensor's
   * `daysTo` attribute and leave `upcoming` unfiltered.
   */
  nowMs?: number | undefined;
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/** ms in a day. */
const DAY_MS = 86_400_000;

/**
 * Normalize a date-ish value to an ISO `YYYY-MM-DD` string, or null.
 * Accepts a plain calendar date or the date portion of an ISO datetime.
 */
export function parseWasteDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${mo}-${d}`;
}

/**
 * Strip a trailing parenthetical qualifier (e.g. " (verlegt)", " (moved)") and
 * surrounding whitespace, so "Graue Tonne (verlegt)" and "Graue Tonne" collapse
 * to the same display name.
 */
export function wasteTypeName(raw: string): string {
  return raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/** Local-midnight epoch-ms for the day containing `ms`. */
function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Local-midnight epoch-ms for an ISO `YYYY-MM-DD` date. */
function isoDateToLocalMidnight(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

/** Whole-day difference from `nowMs`'s local day to an ISO date (can be negative). */
function daysUntil(iso: string, nowMs: number): number | null {
  const target = isoDateToLocalMidnight(iso);
  if (target == null) return null;
  return Math.round((target - startOfLocalDay(nowMs)) / DAY_MS);
}

/** A parsed sensor, plus the group key + ranking hints used for de-duplication. */
interface WasteCandidate extends WasteBin {
  /** Grouping key: the normalized primary type name. */
  key: string;
  /** How many collection types the source sensor covers (richness hint). */
  typeCount: number;
}

/**
 * Recognize a `waste_collection_schedule`-style sensor and parse it, or return
 * null. The fingerprint is an `upcoming` array of `{date}` objects, or a
 * `daysTo` number paired with a `types` array — both distinctive to these
 * sensors and absent from ordinary sensors.
 */
export function parseWasteSensor(entity: HassEntity, opts: DetectWasteOptions = {}): WasteCandidate | null {
  const attrs = entity.attributes;
  const rawUpcoming = Array.isArray(attrs['upcoming']) ? (attrs['upcoming'] as unknown[]) : [];
  const rawTypes = Array.isArray(attrs['types'])
    ? (attrs['types'] as unknown[]).filter((t): t is string => typeof t === 'string')
    : [];
  // Trust `daysTo` only when it is genuinely numeric (a real number, or a
  // numeric string like "7"). `Number()` alone is a trap here: the integration
  // serializes "no next collection" as `daysTo: null`, and `Number(null)` — like
  // Number('')/false/[] — is 0, which would fake a 0-day "today" countdown and
  // slip a phantom bin past the drop-empty filter below.
  const rawDaysTo = attrs['daysTo'];
  const attrDaysTo =
    typeof rawDaysTo === 'number'
      ? rawDaysTo
      : typeof rawDaysTo === 'string' && rawDaysTo.trim() !== '' && Number.isFinite(Number(rawDaysTo))
        ? Number(rawDaysTo)
        : NaN;
  const hasAttrDaysTo = Number.isFinite(attrDaysTo);

  // Fingerprint gate: must look like a waste sensor.
  const looksLikeWaste = rawUpcoming.length > 0 || (hasAttrDaysTo && rawTypes.length > 0);
  if (!looksLikeWaste) return null;

  // Parse the upcoming list into clean, dated, ascending, de-duplicated entries.
  let upcoming: WasteCollection[] = [];
  for (const item of rawUpcoming) {
    if (!item || typeof item !== 'object') continue;
    const date = parseWasteDate((item as Record<string, unknown>)['date']);
    if (!date) continue;
    const type = (item as Record<string, unknown>)['type'];
    upcoming.push(typeof type === 'string' ? { date, type } : { date });
  }
  if (opts.nowMs != null) {
    const todayMs = startOfLocalDay(opts.nowMs);
    upcoming = upcoming.filter((u) => {
      const ms = isoDateToLocalMidnight(u.date);
      return ms == null || ms >= todayMs;
    });
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  const seen = new Set<string>();
  upcoming = upcoming.filter((u) => (seen.has(u.date) ? false : (seen.add(u.date), true)));

  // Display name: prefer a non-"(verlegt)" type, else strip the qualifier, else
  // fall back to the friendly name / entity id.
  const plainType = rawTypes.find((t) => wasteTypeName(t) === t.trim());
  const primaryRaw = plainType ?? rawTypes[0];
  const fallbackName = (attrs.friendly_name ?? entity.entity_id.split('.')[1] ?? entity.entity_id)
    .replace(/^Waste Collection Schedule\s+/i, '')
    .replace(/_/g, ' ')
    .trim();
  const name = primaryRaw ? wasteTypeName(primaryRaw) || fallbackName : fallbackName;

  const nextDate = upcoming[0]?.date ?? null;

  // Prefer the sensor's own daysTo (already in HA's timezone); fall back to a
  // fresh computation from the next date when a clock was supplied.
  let daysTo: number | null = hasAttrDaysTo ? attrDaysTo : null;
  if (daysTo == null && nextDate && opts.nowMs != null) {
    daysTo = daysUntil(nextDate, opts.nowMs);
  }

  const icon = typeof attrs.icon === 'string' ? attrs.icon : undefined;

  return {
    entityId: entity.entity_id,
    name,
    icon,
    daysTo,
    nextDate,
    upcoming,
    key: name.toLowerCase().replace(/\s+/g, ' ').trim(),
    typeCount: rawTypes.length,
  };
}

/**
 * Rank two candidates for the same bin; the "better" one is kept. Richer sensors
 * win (more types → folds in rescheduled dates), then those with a known
 * countdown, then more upcoming dates, then the shorter/alphabetically-first id
 * for a stable, deterministic result.
 */
function isBetterCandidate(a: WasteCandidate, b: WasteCandidate): boolean {
  if (a.typeCount !== b.typeCount) return a.typeCount > b.typeCount;
  const aHas = a.daysTo != null, bHas = b.daysTo != null;
  if (aHas !== bHas) return aHas;
  if (a.upcoming.length !== b.upcoming.length) return a.upcoming.length > b.upcoming.length;
  if (a.entityId.length !== b.entityId.length) return a.entityId.length < b.entityId.length;
  return a.entityId < b.entityId;
}

/** Strip the internal candidate-only fields, leaving a plain WasteBin. */
function toBin(c: WasteCandidate): WasteBin {
  return {
    entityId: c.entityId,
    name: c.name,
    icon: c.icon,
    daysTo: c.daysTo,
    nextDate: c.nextDate,
    upcoming: c.upcoming,
  };
}

/**
 * Detect every waste bin present on a connection, de-duplicated and sorted by
 * soonest pickup first. Bins with neither an upcoming date nor a non-negative
 * countdown are dropped (e.g. a seasonal "Christbaumabfuhr" sensor with no
 * appointment scheduled), so the card only ever shows actionable rows.
 */
export function detectWasteBins(entities: HassEntityMap, opts: DetectWasteOptions = {}): WasteBin[] {
  const hidden = opts.hidden ? new Set(opts.hidden) : null;

  const groups = new Map<string, WasteCandidate>();
  for (const entity of Object.values(entities)) {
    if (!entity.entity_id.startsWith('sensor.')) continue;
    if (hidden?.has(entity.entity_id)) continue;
    const cand = parseWasteSensor(entity, opts);
    if (!cand) continue;
    const existing = groups.get(cand.key);
    if (!existing || isBetterCandidate(cand, existing)) groups.set(cand.key, cand);
  }

  const bins = [...groups.values()]
    .filter((c) => c.nextDate != null || (c.daysTo != null && c.daysTo >= 0))
    .map(toBin);

  bins.sort((a, b) => {
    const ad = a.daysTo, bd = b.daysTo;
    if (ad != null && bd != null && ad !== bd) return ad - bd;
    if ((ad == null) !== (bd == null)) return ad == null ? 1 : -1;
    if (a.nextDate && b.nextDate && a.nextDate !== b.nextDate) return a.nextDate.localeCompare(b.nextDate);
    return a.name.localeCompare(b.name);
  });

  return bins;
}
