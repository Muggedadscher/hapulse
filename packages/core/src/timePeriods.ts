/**
 * [fork] Periods within one day (`from`–`to` as `HH:MM`, the end of the day as `24:00`) and the rules for editing
 * them with a 24-hour ring and time fields: steps of five minutes, every period at least one step long, none crossing
 * midnight or another one, touching periods stay apart. Shared by the heating plan (heatingEdit.ts keeps its names)
 * and the pool schedule (pool.ts converts its on-windows). Plan: glas/pool-zeiten/PLAN.md in the project files.
 */

/** One period of a day. `from` up to `23:55`, `to` up to `24:00`. */
export interface TimePeriod {
  from: string;
  to: string;
}

/** Which end of a period. */
export type PeriodEdge = 'from' | 'to';

/** The step of the ring and the time fields, in minutes. */
export const PERIOD_STEP_MINUTES = 5;
const DAY = 24 * 60;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Minutes since midnight of an `HH:MM` time (`24:00` = 1440). */
export function periodMinutes(time: string): number {
  const [h, m] = time.split(':');
  return Number(h) * 60 + Number(m);
}

/** `HH:MM` of minutes since midnight; 1440 is `24:00`. */
export function periodTimeOf(minutes: number): string {
  const m = Math.min(DAY, Math.max(0, Math.round(minutes)));
  return m === DAY ? '24:00' : `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** Minutes snapped to the step. */
export function snapPeriodMinutes(minutes: number): number {
  return Math.round(minutes / PERIOD_STEP_MINUTES) * PERIOD_STEP_MINUTES;
}

/** The periods in the order of the day. */
export function sortPeriods<T extends TimePeriod>(periods: readonly T[]): T[] {
  return [...periods].sort((a, b) => periodMinutes(a.from) - periodMinutes(b.from) || periodMinutes(a.to) - periodMinutes(b.to));
}

/**
 * The range one edge of period `index` can move in without crossing its own other edge or a neighbour. It always holds
 * the edge's own value: a period kept shorter than a step (set elsewhere, 06:00–06:03) can grow, never flip.
 */
export function periodEdgeRange(periods: readonly TimePeriod[], index: number, edge: PeriodEdge): { min: number; max: number } {
  const period = periods[index]!;
  const cur = periodMinutes(period[edge]);
  const within = (min: number, max: number) => ({ min: Math.min(min, cur), max: Math.max(max, cur) });
  if (edge === 'from') {
    const prev = periods[index - 1];
    return within(prev ? periodMinutes(prev.to) : 0, periodMinutes(period.to) - PERIOD_STEP_MINUTES);
  }
  const next = periods[index + 1];
  return within(periodMinutes(period.from) + PERIOD_STEP_MINUTES, next ? periodMinutes(next.from) : DAY);
}

/**
 * Periods with one edge moved to `minutes` (snapped, kept within periodEdgeRange). `periods` must be sorted, as
 * sortPeriods leaves them; the result keeps the order.
 */
export function movePeriodEdge<T extends TimePeriod>(periods: readonly T[], index: number, edge: PeriodEdge, minutes: number): T[] {
  const { min, max } = periodEdgeRange(periods, index, edge);
  const value = Math.min(max, Math.max(min, snapPeriodMinutes(minutes)));
  return periods.map((p, i) => (i === index ? { ...p, [edge]: periodTimeOf(value) } : p));
}

/**
 * The ring's answer for a pointer at `angle` degrees (0 = midnight at the top, clockwise): the minutes of that angle,
 * taken on the side of midnight closest to `current`, so dragging past the top runs into the end of the day instead of
 * jumping to its start.
 */
export function periodRingMinutes(angle: number, current: number): number {
  const raw = ((((angle % 360) + 360) % 360) / 360) * DAY;
  const candidates = [raw - DAY, raw, raw + DAY];
  return candidates.reduce((best, c) => (Math.abs(c - current) < Math.abs(best - current) ? c : best));
}

/** The angle in degrees of `minutes` on the ring. */
export function periodRingAngle(minutes: number): number {
  return (minutes / DAY) * 360;
}

/** What addPeriod may do: at most `max` periods, and `first` for a day without one. */
export interface AddPeriodOptions {
  max: number;
  first: TimePeriod;
}

/**
 * The periods with one more: in the largest free stretch of the day, an hour (at most a quarter of it) after its
 * start, up to two hours long. A day without periods gets `first`. Null when the day is full: no stretch fits a period
 * of 15 minutes with room on both sides, or `max` is reached.
 */
export function addPeriod(periods: readonly TimePeriod[], { max, first }: AddPeriodOptions): TimePeriod[] | null {
  if (periods.length >= max) return null;
  const sorted = sortPeriods(periods);
  if (sorted.length === 0) return [{ ...first }];
  let best = { start: 0, end: 0 };
  let cursor = 0;
  for (const p of [...sorted, { from: '24:00', to: '24:00' }]) {
    const start = cursor;
    const end = periodMinutes(p.from);
    if (end - start > best.end - best.start) best = { start, end };
    cursor = periodMinutes(p.to);
  }
  const gap = best.end - best.start;
  const lead = Math.min(60, snapPeriodMinutes(Math.floor(gap / 4 / PERIOD_STEP_MINUTES) * PERIOD_STEP_MINUTES));
  const length = Math.min(120, Math.floor((gap - 2 * lead) / PERIOD_STEP_MINUTES) * PERIOD_STEP_MINUTES);
  if (lead < PERIOD_STEP_MINUTES || length < 15) return null;
  const period = { from: periodTimeOf(best.start + lead), to: periodTimeOf(best.start + lead + length) };
  return sortPeriods([...sorted, period]);
}

/** The periods without period `index`. */
export function removePeriod<T extends TimePeriod>(periods: readonly T[], index: number): T[] {
  return periods.filter((_, i) => i !== index);
}

/** Length of a period in minutes (`24:00` counts as the end of the day). */
export function periodLength(period: TimePeriod): number {
  return periodMinutes(period.to) - periodMinutes(period.from);
}

/**
 * A time from a time field (`HH:MM`, as `<input type="time">` gives it) for one edge, in minutes: snapped, and for the
 * end of a period `00:00` means the end of the day. Null for anything else.
 */
export function periodFieldMinutes(value: string, edge: PeriodEdge): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const minutes = h * 60 + min;
  return edge === 'to' && minutes === 0 ? DAY : snapPeriodMinutes(minutes);
}

/** The value for a time field: `24:00` cannot be typed, it shows as `00:00`. */
export function periodFieldValue(time: string): string {
  return time === '24:00' ? '00:00' : time;
}

/** True when both lists hold the same periods (in any order). */
export function samePeriods(a: readonly TimePeriod[], b: readonly TimePeriod[]): boolean {
  const x = sortPeriods(a);
  const y = sortPeriods(b);
  return x.length === y.length && x.every((p, i) => p.from === y[i]!.from && p.to === y[i]!.to);
}
