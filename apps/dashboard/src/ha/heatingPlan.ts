/**
 * [fork] Heating plan service facade (rules and the Home Assistant side: @hapulse/core heatingPlan.ts).
 *
 * Every call works without admin rights. Switching and temperatures are plain entity services through the shared
 * `callService` seam (live connection or demo store). The schedule is read with `schedule.get_schedule` and written
 * by starting the automation `automation.heizplan_speichern` with the days as `variables`. That call succeeds even
 * when the automation refuses the request (HA reports it only in the automation's trace), so `saveHeatingWeek`
 * reads the schedule back and compares; the caller keeps its editor open when that fails.
 */

import {
  demoHeatingWeek,
  HEATING_PLAN_SAVE_AUTOMATION,
  heatingSaveDays,
  heatingWeekMatches,
  parseHeatingWeek,
  validHeatingBlocks,
} from '@hapulse/core';
import type { HeatingWeek, HeatingWeekday } from '@hapulse/core';
import { getLiveConnection, useConnectionStore } from '../stores/connectionStore';
import { useEntityStore } from '../stores/entityStore';
import { callService } from './service';

/** A second read after this long when the first read-back does not match yet. */
const READ_BACK_RETRY_MS = 600;

/** The periods of a schedule, or null when they cannot be read (no connection, error, unexpected answer). */
export async function getHeatingWeek(scheduleId: string): Promise<HeatingWeek | null> {
  if (useConnectionStore.getState().demo) return demoHeatingWeek(useEntityStore.getState().entities, scheduleId);
  const conn = getLiveConnection();
  if (!conn) return null;
  try {
    const response = await conn.callServiceWithResponse('schedule', 'get_schedule', undefined, { entity_id: scheduleId });
    return parseHeatingWeek(response, scheduleId);
  } catch (err) {
    console.warn('[HAPulse] heating plan: get_schedule failed:', err);
    return null;
  }
}

/**
 * Switch a room's plan, i.e. its whole automation (also its window and frost handling). After switching on, the
 * automation is started once: it applies the plan at once instead of at the next schedule change.
 */
export async function setHeatingPlanOn(automationId: string, on: boolean): Promise<void> {
  await callService('automation', on ? 'turn_on' : 'turn_off', undefined, { entity_id: automationId });
  if (on) await callService('automation', 'trigger', undefined, { entity_id: automationId });
}

/** Set the comfort or eco helper; the room's automation applies a new value to the thermostat by itself. */
export function setHeatingTemperature(helperId: string, value: number): Promise<void> {
  return callService('input_number', 'set_value', { value }, { entity_id: helperId });
}

export interface HeatingSaveResult {
  /** The schedule now has `week`'s periods on every saved day. */
  ok: boolean;
  /** The schedule as read after saving; null when it could not be read. */
  week: HeatingWeek | null;
}

/**
 * Save `days` of `week` into the schedule with one start of the save automation, then read the schedule back.
 * Throws when a day's periods are invalid (the editor must not offer that); a failed call or a refused request
 * comes back as `ok: false`, with the schedule as it is in HA when it could be read.
 */
export async function saveHeatingWeek(
  scheduleId: string,
  week: HeatingWeek,
  days: readonly HeatingWeekday[],
  retryMs = READ_BACK_RETRY_MS,
): Promise<HeatingSaveResult> {
  if (days.some((day) => !validHeatingBlocks(week[day]))) throw new Error('heating plan: invalid periods');
  if (days.length === 0) return { ok: true, week: await getHeatingWeek(scheduleId) };
  let sent = true;
  try {
    await callService(
      'automation',
      'trigger',
      { variables: { zeitplan: scheduleId, tage: heatingSaveDays(week, days) } },
      { entity_id: HEATING_PLAN_SAVE_AUTOMATION },
    );
  } catch {
    sent = false; // callService has shown the error
  }
  let actual = await getHeatingWeek(scheduleId);
  if (sent && actual && !heatingWeekMatches(week, actual, days)) {
    await new Promise((resolve) => setTimeout(resolve, retryMs));
    actual = (await getHeatingWeek(scheduleId)) ?? actual;
  }
  return { ok: sent && actual !== null && heatingWeekMatches(week, actual, days), week: actual };
}
