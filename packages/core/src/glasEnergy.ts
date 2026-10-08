/**
 * [fork] Chart math of the Glas energy card (docs/GLAS-DESIGN.md §7.9, docs/glas/PLAN-ETAPPE-4.md K75).
 *
 * The periods are the calendar periods of `energyPeriodRange` (today hourly, week from Monday and month
 * from the 1st daily). Bars = grid import at the bottom + solar production on top, the same sum the classic
 * card draws. Pure and time-zone aware (local calendar, 23/25-hour days) — tested in scripts/smoke.mjs.
 */

import type { EnergyPeriod, EnergySeriesPoint } from './energy.js';

export interface GlasEnergyBar {
  /** Bucket start and end (epoch ms, local calendar boundaries). */
  start: number;
  end: number;
  grid: number;
  solar: number;
  total: number;
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

function periodStart(period: EnergyPeriod, now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  else if (period === 'month') d.setDate(1);
  else if (period === 'year') d.setMonth(0, 1);
  return d;
}

/** Bucket boundaries of the whole period (n + 1 values): hours of today, days of the week/month, months. */
export function energyBucketBounds(period: EnergyPeriod, now: Date): number[] {
  const start = periodStart(period, now);
  const out: number[] = [];
  if (period === 'today') {
    const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1).getTime();
    for (let t = start.getTime(); t < next; t += 3600_000) out.push(t);
    out.push(next);
    return out;
  }
  const y = start.getFullYear();
  const m = start.getMonth();
  const day = start.getDate();
  if (period === 'week') {
    for (let i = 0; i <= 7; i++) out.push(new Date(y, m, day + i).getTime());
  } else if (period === 'month') {
    const days = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i <= days; i++) out.push(new Date(y, m, 1 + i).getTime());
  } else {
    for (let i = 0; i <= 12; i++) out.push(new Date(y, i, 1).getTime());
  }
  return out;
}

/** One bar per bucket of the period; series points are added to the bucket that contains their start. */
export function energyBars(period: EnergyPeriod, series: readonly EnergySeriesPoint[], now: Date): GlasEnergyBar[] {
  const bounds = energyBucketBounds(period, now);
  const t = now.getTime();
  const bars: GlasEnergyBar[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const start = bounds[i]!;
    const end = bounds[i + 1]!;
    bars.push({ start, end, grid: 0, solar: 0, total: 0, future: start > t, current: start <= t && t < end });
  }
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
    bar.grid += Math.max(0, p.gridConsumed);
    bar.solar += Math.max(0, p.solar);
    bar.total = bar.grid + bar.solar;
  }
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

/** Average per bucket over the buckets that have begun (the running one included), or null. */
export function energyAverage(bars: readonly GlasEnergyBar[]): number | null {
  const past = bars.filter((b) => !b.future);
  if (past.length === 0) return null;
  return past.reduce((s, b) => s + b.total, 0) / past.length;
}

/** Axis values to hide because the Ø line sits within 10 % of the axis height of them. */
export function hiddenTicks(axis: GlasEnergyAxis, average: number | null): number[] {
  if (average === null) return [];
  return axis.ticks.filter((v) => Math.abs(v - average) < 0.1 * axis.top);
}

/** Bar heights in % of the axis top; a non-empty bar is at least 1.5 % tall, split in proportion. */
export function barPercent(bar: GlasEnergyBar, top: number): { grid: number; solar: number } {
  if (bar.total <= 0 || top <= 0) return { grid: 0, solar: 0 };
  const total = Math.max(1.5, Math.min(100, (bar.total / top) * 100));
  return { grid: (total * bar.grid) / bar.total, solar: (total * bar.solar) / bar.total };
}

/**
 * The same part of the previous period, for the comparison line: yesterday up to the same time, last week
 * from Monday up to the same weekday and time, last month from the 1st up to the same day (clamped to the
 * month's length) and time, last year up to the same date.
 */
export function energyCompareRange(period: EnergyPeriod, now: Date): { start: Date; end: Date } {
  const start = periodStart(period, now);
  const end = new Date(now);
  if (period === 'today') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (period === 'week') {
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() - 7);
  } else if (period === 'month') {
    start.setMonth(start.getMonth() - 1, 1);
    const days = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    end.setFullYear(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), days));
  } else {
    start.setFullYear(start.getFullYear() - 1, 0, 1);
    const days = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0).getDate();
    end.setFullYear(now.getFullYear() - 1, now.getMonth(), Math.min(now.getDate(), days));
  }
  return { start, end };
}

/** Change in whole percent, or null when there is nothing to compare with. */
export function energyChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
