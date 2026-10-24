/**
 * [fork] Heating plan, editing the times (plan glas/heizung-zeitplan/PLAN.md, Etappe 2b): what the page "Werktags"
 * starts with, the ring's keys and geometry. The rules of the periods themselves are in @hapulse/core heatingEdit.ts.
 */

import { HEATING_NEW_DAY_BLOCK, HEATING_STEP_MINUTES, HEATING_WEEKDAYS, heatingEdgeRange, heatingMinutes } from '@hapulse/core';
import type { HeatingBlock, HeatingDayGroup, HeatingEdge, HeatingWeek, HeatingWeekday } from '@hapulse/core';

/** What the times page edits: the chosen days and the periods they get. */
export interface HeatingTimesDraft {
  days: HeatingWeekday[];
  blocks: HeatingBlock[];
}

/**
 * The start of the times page: a group's days and periods, or, for "add another time", the days without a comfort
 * period (none when every day has one) with a first period.
 */
export function heatingTimesDraft(week: HeatingWeek, group: HeatingDayGroup | null): HeatingTimesDraft {
  if (group) return { days: [...group.days], blocks: group.blocks.map((b) => ({ ...b })) };
  return { days: HEATING_WEEKDAYS.filter((d) => week[d].length === 0), blocks: [{ ...HEATING_NEW_DAY_BLOCK }] };
}

/** `days` with `day` added or removed, in week order. */
export function toggleHeatingDay(days: readonly HeatingWeekday[], day: HeatingWeekday): HeatingWeekday[] {
  return HEATING_WEEKDAYS.filter((d) => (d === day ? !days.includes(d) : days.includes(d)));
}

/**
 * A knob's new value for a key, like a slider: arrows by one step, Page Up/Down by an hour, Home/End to the ends of
 * its range. Null for any other key.
 */
export function heatingKeyValue(key: string, value: number, range: { min: number; max: number }): number | null {
  const by = (d: number) => Math.min(range.max, Math.max(range.min, value + d));
  switch (key) {
    case 'ArrowUp':
    case 'ArrowRight':
      return by(HEATING_STEP_MINUTES);
    case 'ArrowDown':
    case 'ArrowLeft':
      return by(-HEATING_STEP_MINUTES);
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
export function heatingPointerAngle(x: number, y: number, cx: number, cy: number): number {
  const deg = (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** The point at `minutes` on a circle around (c, c) with radius r (midnight at the top, clockwise). */
export function heatingRingPoint(minutes: number, c: number, r: number): [number, number] {
  const a = (minutes / (24 * 60)) * 2 * Math.PI;
  return [c + r * Math.sin(a), c - r * Math.cos(a)];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** The SVG path of a period on the ring; a whole day is two half circles (one arc cannot close). */
export function heatingArcPath(from: number, to: number, c: number, r: number): string {
  const point = (m: number) => heatingRingPoint(m, c, r).map(round).join(' ');
  if (to - from >= 24 * 60) return `M ${point(0)} A ${r} ${r} 0 1 1 ${point(720)} A ${r} ${r} 0 1 1 ${point(0)}`;
  const large = to - from > 720 ? 1 : 0;
  return `M ${point(from)} A ${r} ${r} 0 ${large} 1 ${point(to)}`;
}

/**
 * Which knob a drag moves when it starts where both knobs lie (a whole day: both at midnight; a period of a few
 * minutes): the end in the direction of the drag while it can still move that way, so the period grows first.
 * Clockwise is the direction of the day.
 */
export function heatingOverlapEdge(blocks: readonly HeatingBlock[], index: number, clockwise: boolean): HeatingEdge {
  const block = blocks[index]!;
  if (clockwise) return heatingMinutes(block.to) < heatingEdgeRange(blocks, index, 'to').max ? 'to' : 'from';
  return heatingMinutes(block.from) > heatingEdgeRange(blocks, index, 'from').min ? 'from' : 'to';
}

/** The signed turn in degrees from angle `from` to angle `to` (both 0–360), the short way round: + is clockwise. */
export function heatingTurn(from: number, to: number): number {
  return ((((to - from + 540) % 360) + 360) % 360) - 180;
}

/** The index in `after` of the period that `before` did not have; -1 when there is none. */
export function heatingAddedIndex(before: readonly HeatingBlock[], after: readonly HeatingBlock[]): number {
  return after.findIndex((b) => !before.some((o) => o.from === b.from && o.to === b.to));
}
