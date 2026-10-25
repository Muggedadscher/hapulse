/**
 * [fork] Heating plan, editing the times (plan glas/heizung-zeitplan/PLAN.md, Etappe 2b): what the page "Werktags"
 * starts with. The ring's keys and geometry are in ../schedule/scheduleRing.ts, the rules of the periods in
 * @hapulse/core timePeriods.ts.
 */

import { HEATING_NEW_DAY_BLOCK, HEATING_WEEKDAYS } from '@hapulse/core';
import type { HeatingBlock, HeatingDayGroup, HeatingWeek, HeatingWeekday } from '@hapulse/core';

// The ring's keys and geometry are shared with the pool schedule; the old names stay for the heating tests
export {
  addedPeriodIndex as heatingAddedIndex,
  ringArcPath as heatingArcPath,
  ringKeyValue as heatingKeyValue,
  ringOverlapEdge as heatingOverlapEdge,
  ringPointerAngle as heatingPointerAngle,
  ringPoint as heatingRingPoint,
  ringTurn as heatingTurn,
} from '../schedule/scheduleRing';

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
