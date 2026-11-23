/**
 * [fork] The pool's daily filter time and battery surplus — pure rules for the cards (tested in test/poolPlan.test.ts).
 *
 * Home Assistant decides when the pump runs (script.pool_automatik_auswerten, only in Automatik): the battery
 * surplus first, then the daily target from its latest start, then sun while the target is not met, then the
 * schedule. HAPulse only shows that state and edits the helpers behind it.
 */

/** What the filter-time card says about today's target. */
export type PoolTargetStatus =
  /** No target (0 h) or no usable figures. */
  | { kind: 'none' }
  | { kind: 'reached' }
  /** Not reached yet; the forced run starts at `at` at the latest. */
  | { kind: 'startsBy'; restH: number; at: Date }
  /** Not reached and the latest start has passed: the pump runs now until the target is met. */
  | { kind: 'runningNow'; restH: number }
  /** Not reached and Home Assistant gave up for today (an hour after "finished by"). */
  | { kind: 'missed'; restH: number }
  /** Not reached, the latest start is not known (sensor unavailable). */
  | { kind: 'rest'; restH: number };

/**
 * Today's target state from the runtime (h), the target (h) and `sensor.poolpumpe_pflichtlauf_ab` (an ISO timestamp,
 * `unknown` once HA gave up for the day, `unavailable` without its inputs).
 */
export function poolTargetStatus(runtimeH: number, targetH: number, mustRunFrom: string | undefined, now: Date): PoolTargetStatus {
  if (!Number.isFinite(targetH) || targetH <= 0 || !Number.isFinite(runtimeH)) return { kind: 'none' };
  const restH = targetH - runtimeH;
  if (restH <= 0) return { kind: 'reached' };
  if (mustRunFrom === 'unknown') return { kind: 'missed', restH };
  const at = mustRunFrom ? new Date(mustRunFrom) : null;
  if (!at || Number.isNaN(at.getTime())) return { kind: 'rest', restH };
  return at.getTime() > now.getTime() ? { kind: 'startsBy', restH, at } : { kind: 'runningNow', restH };
}

/** Rest hours as whole 5-minute steps for `formatManualDuration` (minutes), at least 5. */
export function restMinutes(restH: number): number {
  return Math.max(5, Math.round((restH * 60) / 5) * 5);
}

/** The battery-surplus limits keep "off below" at least this far under "on from" (as HA's automation does). */
export const POOL_SURPLUS_GAP = 5;

export interface SurplusLimits {
  on: number;
  off: number;
  onMin: number;
  onMax: number;
  offMin: number;
  offMax: number;
  onStep: number;
  offStep: number;
}

/** Whether each of the four stepper buttons may act: "off" stays at least {@link POOL_SURPLUS_GAP} under "on". */
export function surplusSteps(l: SurplusLimits): { onDown: boolean; onUp: boolean; offDown: boolean; offUp: boolean } {
  const ok = (v: number) => Number.isFinite(v);
  if (!ok(l.on) || !ok(l.off)) return { onDown: false, onUp: false, offDown: false, offUp: false };
  return {
    onDown: l.on - l.onStep >= Math.max(l.onMin, l.off + POOL_SURPLUS_GAP),
    onUp: l.on + l.onStep <= l.onMax,
    offDown: l.off - l.offStep >= l.offMin,
    offUp: l.off + l.offStep <= Math.min(l.offMax, l.on - POOL_SURPLUS_GAP),
  };
}

/** The window "finished by" may be set in — the same bounds as HA's `sensor.poolpumpe_pflichtlauf_ab` (10:00–23:00). */
export const POOL_FINISH_MIN = 10 * 60;
export const POOL_FINISH_MAX = 23 * 60;
export const POOL_FINISH_STEP = 30;

/** Minutes after midnight of an input_datetime time state ("20:00:00"), or NaN. */
export function clockMinutes(state: string | undefined): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(state ?? '');
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : NaN;
}

/** "HH:MM:SS" for input_datetime.set_datetime. */
export function clockState(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/** The next "finished by" one step away, inside {@link POOL_FINISH_MIN}–{@link POOL_FINISH_MAX}; null at the edge. */
export function shiftFinishBy(minutes: number, delta: number): number | null {
  if (!Number.isFinite(minutes) || delta === 0) return null;
  // onto the step grid (20:15 + 30 → 20:30), then into the window; a button never moves the other way (09:00 − 30)
  const snapped = delta > 0 ? Math.floor(minutes / POOL_FINISH_STEP) * POOL_FINISH_STEP + delta
    : Math.ceil(minutes / POOL_FINISH_STEP) * POOL_FINISH_STEP + delta;
  const next = Math.min(POOL_FINISH_MAX, Math.max(POOL_FINISH_MIN, snapped));
  return (delta > 0 ? next > minutes : next < minutes) ? next : null;
}

/** The reason options of `input_select.poolpumpe_grund` that name a running pump, with their text key's suffix. */
export type PoolReasonKey = 'battery' | 'sun' | 'target' | 'schedule' | 'minRun';
const REASONS: Record<string, PoolReasonKey> = {
  'Akku voll': 'battery',
  Sonne: 'sun',
  Tagesziel: 'target',
  Zeitplan: 'schedule',
  Mindestlaufzeit: 'minRun',
};

/** The reason key for a running pump in Automatik (`pool.reason.<key>`), the raw option for an unknown one, or null. */
export function poolReason(option: string | undefined): { key: PoolReasonKey } | { raw: string } | null {
  if (!option || option === 'Keiner' || option === 'unknown' || option === 'unavailable') return null;
  const key = REASONS[option];
  return key ? { key } : { raw: option };
}
