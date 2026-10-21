/**
 * [fork] Chart math of the Glas energy card (docs/GLAS-DESIGN.md §7.9, docs/glas/PLAN-ETAPPE-4.md K75, variant V4).
 *
 * Periods like the sketch: Tag = today hourly, Woche = the last 7 days up to today, Monat = the last 30 days up to
 * today (daily, the last column is today). A bar is what the home used in that hour or day: grid at the bottom, the
 * home battery in the middle, the solar it used itself on top (Home Assistant's allocation, `allocateEnergy`; without a
 * battery the solar part is `max(0, produced − exported)`). The comparison stops at the last full hour in both periods: Home Assistant writes an hour's
 * statistics row only after the hour. Pure and time-zone aware (local calendar, 23/25-hour days) — tested in
 * scripts/smoke.mjs.
 */

import type { EnergySeriesPoint, StatisticsMap } from './energy.js';
import { allocateEnergy } from './energyFlow.js';

export type GlasEnergyPeriod = 'day' | 'week' | 'month';

export interface GlasEnergyWindow {
  period: GlasEnergyPeriod;
  /** Bucket boundaries, n + 1 values (epoch ms, local calendar). */
  bounds: number[];
  /** Statistics bucket to request. */
  bucket: 'hour' | 'day';
}

export interface GlasEnergyBar {
  /** Bucket start and end (epoch ms, local calendar boundaries). */
  start: number;
  end: number;
  /** Grid import the home used (kWh). */
  grid: number;
  /** Home battery the home used (kWh). */
  battery: number;
  /** Solar the home used itself (kWh). */
  solar: number;
  total: number;
  /** A statistics row fell into this bucket. */
  hasData: boolean;
  /** Starts after now: drawn as a stub. */
  future: boolean;
  /** Contains now (still running). */
  current: boolean;
}

export interface GlasEnergyAxis {
  step: number;
  /** Value of the top grid line (= 2 × step). */
  top: number;
  /** 0, step, top. */
  ticks: number[];
}

/** Days per period for the rolling windows. */
const DAYS: Record<Exclude<GlasEnergyPeriod, 'day'>, number> = { week: 7, month: 30 };
/** How far the comparison goes back, in calendar days. */
const SHIFT: Record<GlasEnergyPeriod, number> = { day: 1, week: 7, month: 30 };

/** The same local wall time `days` calendar days earlier (DST-safe). */
function daysBefore(t: number, days: number): number {
  const d = new Date(t);
  d.setDate(d.getDate() - days);
  return d.getTime();
}

/** The period's buckets: hours of today, or the last 7 / 30 days including today. */
export function glasEnergyWindow(period: GlasEnergyPeriod, now: Date): GlasEnergyWindow {
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = now.getDate();
  const bounds: number[] = [];
  if (period === 'day') {
    const start = new Date(y, m, day).getTime();
    const next = new Date(y, m, day + 1).getTime();
    // hourly; a DST day has 23 or 25 of them (epoch steps, local midnight to local midnight)
    for (let t = start; t < next; t += 3600_000) bounds.push(t);
    bounds.push(next);
    return { period, bounds, bucket: 'hour' };
  }
  const n = DAYS[period];
  for (let i = n - 1; i >= -1; i--) bounds.push(new Date(y, m, day - i).getTime());
  return { period, bounds, bucket: 'day' };
}

/** One bar per bucket of the window; series points are added to the bucket that contains their start. */
export function glasEnergyBars(win: GlasEnergyWindow, series: readonly EnergySeriesPoint[], now: Date): GlasEnergyBar[] {
  const { bounds } = win;
  const t = now.getTime();
  const bars: GlasEnergyBar[] = [];
  const raw: { gi: number; go: number; s: number; bi: number; bo: number }[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const start = bounds[i]!;
    const end = bounds[i + 1]!;
    bars.push({ start, end, grid: 0, battery: 0, solar: 0, total: 0, hasData: false, future: start > t, current: start <= t && t < end });
    raw.push({ gi: 0, go: 0, s: 0, bi: 0, bo: 0 });
  }
  const pos = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
  for (const p of series) {
    let lo = 0;
    let hi = bars.length - 1;
    // binary search: the last bar whose start ≤ p.start
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (bars[mid]!.start <= p.start) lo = mid;
      else hi = mid - 1;
    }
    const bar = bars[lo];
    if (!bar || p.start < bar.start || p.start >= bar.end) continue;
    bar.hasData = true;
    const r = raw[lo]!;
    r.gi += pos(p.gridConsumed);
    r.go += pos(p.gridReturned);
    r.s += pos(p.solar);
    r.bi += pos(p.batteryIn);
    r.bo += pos(p.batteryOut);
  }
  bars.forEach((bar, i) => {
    const r = raw[i]!;
    const a = allocateEnergy(r.s, r.bo, r.gi, r.bi, r.go);
    bar.grid = a.gridHome;
    bar.battery = a.batteryHome;
    bar.solar = a.solarHome;
    bar.total = a.home;
  });
  return bars;
}

const NICE = [1, 2, 2.5, 5, 10];

/** Axis with three lines 0 / step / 2·step, the smallest "nice" step whose top covers `max`. */
export function energyAxis(max: number): GlasEnergyAxis {
  const need = Math.max(max, 0.5) / 2;
  const mag = 10 ** Math.floor(Math.log10(need));
  let step = 10 * mag;
  for (const n of NICE) {
    if (n * mag >= need - 1e-9) {
      step = n * mag;
      break;
    }
  }
  step = Math.round(step * 1e6) / 1e6;
  return { step, top: 2 * step, ticks: [0, step, 2 * step] };
}

/** Average per bucket over the completed buckets that have data (not the running one, like the sketch), or null. */
export function energyAverage(bars: readonly GlasEnergyBar[]): number | null {
  const done = bars.filter((b) => !b.future && !b.current && b.hasData);
  if (done.length === 0) return null;
  return done.reduce((s, b) => s + b.total, 0) / done.length;
}

/** Axis values to hide because the Ø line sits within 10 % of the axis height of them. */
export function hiddenTicks(axis: GlasEnergyAxis, average: number | null): number[] {
  if (average === null) return [];
  return axis.ticks.filter((v) => Math.abs(v - average) < 0.1 * axis.top);
}

/** Bar heights in % of the axis top; a non-empty bar is at least 1.5 % tall, split in proportion. */
export function barPercent(
  bar: Pick<GlasEnergyBar, 'grid' | 'solar' | 'total'> & { battery?: number },
  top: number,
): { grid: number; battery: number; solar: number } {
  if (bar.total <= 0 || top <= 0) return { grid: 0, battery: 0, solar: 0 };
  const total = Math.max(1.5, Math.min(100, (bar.total / top) * 100));
  return {
    grid: (total * bar.grid) / bar.total,
    battery: (total * (bar.battery ?? 0)) / bar.total,
    solar: (total * bar.solar) / bar.total,
  };
}

/**
 * The two spans the comparison line compares: the window from its start up to the last full hour, and the same span
 * one day (Tag), 7 days (Woche) or 30 days (Monat) earlier, at the same local wall times. Both end on a full hour,
 * where Home Assistant's hourly statistics end.
 */
export function glasEnergyCompare(win: GlasEnergyWindow, now: Date): {
  current: { start: number; end: number };
  previous: { start: number; end: number };
} {
  const start = win.bounds[0]!;
  const end = Math.max(start, Math.floor(now.getTime() / 3600_000) * 3600_000);
  const shift = SHIFT[win.period];
  return { current: { start, end }, previous: { start: daysBefore(start, shift), end: daysBefore(end, shift) } };
}

/** Only the statistics rows that start before `end` (the comparison stops at the last full hour). */
export function trimStatistics(stats: StatisticsMap, end: number): StatisticsMap {
  const out: StatisticsMap = {};
  for (const [id, rows] of Object.entries(stats)) out[id] = rows.filter((r) => r.start < end);
  return out;
}

/** Change in whole percent, or null when there is nothing to compare with. */
export function energyChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
