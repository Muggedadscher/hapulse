/**
 * [fork] Editing the comfort periods of a heating plan (plan glas/heizung-zeitplan/PLAN.md, Etappe 2b): the rules
 * behind the ring and the time fields, without DOM. Times move in steps of five minutes and stay a valid day for the
 * save automation (validHeatingBlocks): every period at least one step long, none crossing midnight or another one.
 * Touching periods stay apart, as HA keeps them.
 */

import { HEATING_MAX_BLOCKS, HEATING_WEEKDAYS, heatingMinutes, sameHeatingBlocks, sortHeatingBlocks } from './heatingPlan.js';
import type { HeatingBlock, HeatingWeek, HeatingWeekday } from './heatingPlan.js';

/** The step of the ring and the time fields, in minutes. */
export const HEATING_STEP_MINUTES = 5;
const DAY = 24 * 60;

/** Which end of a period: when comfort starts (`from`) or when eco starts again (`to`). */
export type HeatingEdge = 'from' | 'to';

/** A first comfort period for a day without one. */
export const HEATING_NEW_DAY_BLOCK: HeatingBlock = { from: '06:00', to: '22:00' };

const pad = (n: number): string => String(n).padStart(2, '0');

/** `HH:MM` of minutes since midnight; 1440 is `24:00`. */
export function heatingTimeOf(minutes: number): string {
  const m = Math.min(DAY, Math.max(0, Math.round(minutes)));
  return m === DAY ? '24:00' : `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** Minutes snapped to the step. */
export function snapHeatingMinutes(minutes: number): number {
  return Math.round(minutes / HEATING_STEP_MINUTES) * HEATING_STEP_MINUTES;
}

/** The range one edge of period `index` can move in without crossing its own other edge or a neighbour. */
export function heatingEdgeRange(blocks: readonly HeatingBlock[], index: number, edge: HeatingEdge): { min: number; max: number } {
  const block = blocks[index]!;
  if (edge === 'from') {
    const prev = blocks[index - 1];
    return { min: prev ? heatingMinutes(prev.to) : 0, max: heatingMinutes(block.to) - HEATING_STEP_MINUTES };
  }
  const next = blocks[index + 1];
  return { min: heatingMinutes(block.from) + HEATING_STEP_MINUTES, max: next ? heatingMinutes(next.from) : DAY };
}

/**
 * Periods with one edge moved to `minutes` (snapped, kept within heatingEdgeRange). `blocks` must be sorted, as
 * sortHeatingBlocks leaves them; the result keeps the order.
 */
export function moveHeatingEdge(blocks: readonly HeatingBlock[], index: number, edge: HeatingEdge, minutes: number): HeatingBlock[] {
  const { min, max } = heatingEdgeRange(blocks, index, edge);
  const value = Math.min(max, Math.max(min, snapHeatingMinutes(minutes)));
  return blocks.map((b, i) => (i === index ? { ...b, [edge]: heatingTimeOf(value) } : b));
}

/**
 * The ring's answer for a pointer at `angle` degrees (0 = midnight at the top, clockwise): the minutes of that angle,
 * taken on the side of midnight closest to `current`, so dragging past the top runs into the end of the day instead of
 * jumping to its start.
 */
export function heatingRingMinutes(angle: number, current: number): number {
  const raw = ((((angle % 360) + 360) % 360) / 360) * DAY;
  const candidates = [raw - DAY, raw, raw + DAY];
  return candidates.reduce((best, c) => (Math.abs(c - current) < Math.abs(best - current) ? c : best));
}

/** The angle in degrees of `minutes` on the ring. */
export function heatingRingAngle(minutes: number): number {
  return (minutes / DAY) * 360;
}

/**
 * The periods with one more: in the largest free stretch of the day, an hour (at most a quarter of it) after its
 * start, up to two hours long. A day without periods gets HEATING_NEW_DAY_BLOCK. Null when the day is full: no stretch
 * fits a period of 15 minutes with room on both sides, or HEATING_MAX_BLOCKS is reached.
 */
export function addHeatingBlock(blocks: readonly HeatingBlock[]): HeatingBlock[] | null {
  if (blocks.length >= HEATING_MAX_BLOCKS) return null;
  const sorted = sortHeatingBlocks(blocks);
  if (sorted.length === 0) return [{ ...HEATING_NEW_DAY_BLOCK }];
  let best = { start: 0, end: 0 };
  let cursor = 0;
  for (const b of [...sorted, { from: '24:00', to: '24:00' }]) {
    const start = cursor;
    const end = heatingMinutes(b.from);
    if (end - start > best.end - best.start) best = { start, end };
    cursor = heatingMinutes(b.to);
  }
  const gap = best.end - best.start;
  const lead = Math.min(60, snapHeatingMinutes(Math.floor(gap / 4 / HEATING_STEP_MINUTES) * HEATING_STEP_MINUTES));
  const length = Math.min(120, Math.floor((gap - 2 * lead) / HEATING_STEP_MINUTES) * HEATING_STEP_MINUTES);
  if (lead < HEATING_STEP_MINUTES || length < 15) return null;
  const block = { from: heatingTimeOf(best.start + lead), to: heatingTimeOf(best.start + lead + length) };
  return sortHeatingBlocks([...sorted, block]);
}

/** The periods without period `index`. */
export function removeHeatingBlock(blocks: readonly HeatingBlock[], index: number): HeatingBlock[] {
  return blocks.filter((_, i) => i !== index);
}

/** Length of a period in minutes (`24:00` counts as the end of the day). */
export function heatingBlockMinutes(block: HeatingBlock): number {
  return heatingMinutes(block.to) - heatingMinutes(block.from);
}

/**
 * A time from a time field (`HH:MM`, as `<input type="time">` gives it) for one edge, in minutes: snapped, and for the
 * end of a period `00:00` means the end of the day. Null for anything else.
 */
export function heatingFieldMinutes(value: string, edge: HeatingEdge): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const minutes = h * 60 + min;
  return edge === 'to' && minutes === 0 ? DAY : snapHeatingMinutes(minutes);
}

/** The value for a time field: `24:00` cannot be typed, it shows as `00:00`. */
export function heatingFieldValue(time: string): string {
  return time === '24:00' ? '00:00' : time;
}

/** The week with `blocks` on each of `days`; the other days keep theirs. */
export function heatingWeekWith(week: HeatingWeek, days: readonly HeatingWeekday[], blocks: readonly HeatingBlock[]): HeatingWeek {
  const next = { ...week };
  for (const day of days) next[day] = blocks.map((b) => ({ ...b }));
  return next;
}

/** Of `days`, those whose periods would change with `blocks`, in week order. */
export function heatingChangedDays(week: HeatingWeek, days: readonly HeatingWeekday[], blocks: readonly HeatingBlock[]): HeatingWeekday[] {
  return HEATING_WEEKDAYS.filter((day) => days.includes(day) && !sameHeatingBlocks(week[day], blocks));
}
