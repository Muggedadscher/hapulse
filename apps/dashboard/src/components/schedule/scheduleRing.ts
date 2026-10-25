/**
 * [fork] The 24-hour ring of the period editor (plan glas/pool-zeiten/PLAN.md; first built for the heating plan,
 * glas/heizung-zeitplan/PLAN.md Etappe 2b): the knobs' keys and the ring's geometry. The rules of the periods
 * themselves are in @hapulse/core timePeriods.ts.
 */

import { PERIOD_STEP_MINUTES, periodEdgeRange, periodMinutes } from '@hapulse/core';
import type { PeriodEdge, TimePeriod } from '@hapulse/core';

/**
 * A knob's new value for a key, like a slider: arrows by one step, Page Up/Down by an hour, Home/End to the ends of
 * its range. Null for any other key.
 */
export function ringKeyValue(key: string, value: number, range: { min: number; max: number }): number | null {
  const by = (d: number) => Math.min(range.max, Math.max(range.min, value + d));
  switch (key) {
    case 'ArrowUp':
    case 'ArrowRight':
      return by(PERIOD_STEP_MINUTES);
    case 'ArrowDown':
    case 'ArrowLeft':
      return by(-PERIOD_STEP_MINUTES);
    case 'PageUp':
      return by(60);
    case 'PageDown':
      return by(-60);
    case 'Home':
      return range.min;
    case 'End':
      return range.max;
    default:
      return null;
  }
}

/** The angle in degrees of point (x, y) around (cx, cy): 0 at the top, clockwise, 0 ≤ angle < 360. */
export function ringPointerAngle(x: number, y: number, cx: number, cy: number): number {
  const deg = (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** The point at `minutes` on a circle around (c, c) with radius r (midnight at the top, clockwise). */
export function ringPoint(minutes: number, c: number, r: number): [number, number] {
  const a = (minutes / (24 * 60)) * 2 * Math.PI;
  return [c + r * Math.sin(a), c - r * Math.cos(a)];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** The SVG path of a period on the ring; a whole day is two half circles (one arc cannot close). */
export function ringArcPath(from: number, to: number, c: number, r: number): string {
  const point = (m: number) => ringPoint(m, c, r).map(round).join(' ');
  if (to - from >= 24 * 60) return `M ${point(0)} A ${r} ${r} 0 1 1 ${point(720)} A ${r} ${r} 0 1 1 ${point(0)}`;
  const large = to - from > 720 ? 1 : 0;
  return `M ${point(from)} A ${r} ${r} 0 ${large} 1 ${point(to)}`;
}

/**
 * Which knob a drag moves when it starts where both knobs lie (a whole day: both at midnight; a period of a few
 * minutes): the end in the direction of the drag while it can still move that way, so the period grows first.
 * Clockwise is the direction of the day.
 */
export function ringOverlapEdge(periods: readonly TimePeriod[], index: number, clockwise: boolean): PeriodEdge {
  const period = periods[index]!;
  if (clockwise) return periodMinutes(period.to) < periodEdgeRange(periods, index, 'to').max ? 'to' : 'from';
  return periodMinutes(period.from) > periodEdgeRange(periods, index, 'from').min ? 'from' : 'to';
}

/** The signed turn in degrees from angle `from` to angle `to` (both 0–360), the short way round: + is clockwise. */
export function ringTurn(from: number, to: number): number {
  return ((((to - from + 540) % 360) + 360) % 360) - 180;
}

/** The index in `after` of the period that `before` did not have; -1 when there is none. */
export function addedPeriodIndex(before: readonly TimePeriod[], after: readonly TimePeriod[]): number {
  return after.findIndex((b) => !before.some((o) => o.from === b.from && o.to === b.to));
}
