/**
 * [fork] Editing the comfort periods of a heating plan (plan glas/heizung-zeitplan/PLAN.md, Etappe 2b): the rules
 * behind the ring and the time fields, without DOM. The rules themselves are shared with the pool schedule and live in
 * timePeriods.ts; this file keeps the heating names and adds the heating limits (HEATING_MAX_BLOCKS, a first period
 * 06:00–22:00). Times stay a valid day for the save automation (validHeatingBlocks); touching periods stay apart, as HA
 * keeps them.
 */

import { HEATING_MAX_BLOCKS, HEATING_WEEKDAYS, sameHeatingBlocks } from './heatingPlan.js';
import type { HeatingBlock, HeatingWeek, HeatingWeekday } from './heatingPlan.js';
import {
  PERIOD_STEP_MINUTES,
  addPeriod,
  movePeriodEdge,
  periodEdgeRange,
  periodFieldMinutes,
  periodFieldValue,
  periodLength,
  periodRingAngle,
  periodRingMinutes,
  periodTimeOf,
  removePeriod,
  snapPeriodMinutes,
} from './timePeriods.js';
import type { PeriodEdge } from './timePeriods.js';

/** The step of the ring and the time fields, in minutes. */
export const HEATING_STEP_MINUTES = PERIOD_STEP_MINUTES;

/** Which end of a period: when comfort starts (`from`) or when eco starts again (`to`). */
export type HeatingEdge = PeriodEdge;

/** A first comfort period for a day without one. */
export const HEATING_NEW_DAY_BLOCK: HeatingBlock = { from: '06:00', to: '22:00' };

/** `HH:MM` of minutes since midnight; 1440 is `24:00`. */
export const heatingTimeOf = periodTimeOf;

/** Minutes snapped to the step. */
export const snapHeatingMinutes = snapPeriodMinutes;

/** The range one edge of period `index` can move in (timePeriods.ts periodEdgeRange). */
export const heatingEdgeRange: (blocks: readonly HeatingBlock[], index: number, edge: HeatingEdge) => { min: number; max: number } =
  periodEdgeRange;

/** Periods with one edge moved (timePeriods.ts movePeriodEdge). */
export const moveHeatingEdge: (blocks: readonly HeatingBlock[], index: number, edge: HeatingEdge, minutes: number) => HeatingBlock[] =
  movePeriodEdge;

/** The ring's answer for a pointer at `angle` degrees (timePeriods.ts periodRingMinutes). */
export const heatingRingMinutes = periodRingMinutes;

/** The angle in degrees of `minutes` on the ring. */
export const heatingRingAngle = periodRingAngle;

/**
 * The periods with one more (timePeriods.ts addPeriod): at most HEATING_MAX_BLOCKS, a day without periods gets
 * HEATING_NEW_DAY_BLOCK. Null when the day is full.
 */
export function addHeatingBlock(blocks: readonly HeatingBlock[]): HeatingBlock[] | null {
  return addPeriod(blocks, { max: HEATING_MAX_BLOCKS, first: HEATING_NEW_DAY_BLOCK });
}

/** The periods without period `index`. */
export const removeHeatingBlock: (blocks: readonly HeatingBlock[], index: number) => HeatingBlock[] = removePeriod;

/** Length of a period in minutes (`24:00` counts as the end of the day). */
export const heatingBlockMinutes: (block: HeatingBlock) => number = periodLength;

/** A time from a time field for one edge, in minutes (timePeriods.ts periodFieldMinutes). */
export const heatingFieldMinutes = periodFieldMinutes;

/** The value for a time field: `24:00` cannot be typed, it shows as `00:00`. */
export const heatingFieldValue = periodFieldValue;

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
