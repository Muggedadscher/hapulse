/**
 * [fork] Pool service facade.
 *
 * Thin wrappers over the shared `callService` seam (which routes to the live HA
 * connection or the demo store). Keeping the service names + payload shapes in
 * one place means the Pool components never build raw service calls, and the
 * scheduler round-trip (model → timeslots) has a single, tested entry point.
 */

import { buildScheduleTimeslots, weekdaysToScheduler } from '@hapulse/core';
import type { PoolScheduleModel } from '@hapulse/core';
import { callService } from './service';

/** Select an operating mode on the pool input_select. */
export function setPoolMode(entityId: string, option: string): Promise<void> {
  return callService('input_select', 'select_option', { option }, { entity_id: entityId });
}

/** Set the solar switch-on threshold (input_number). */
export function setSolarThreshold(entityId: string, value: number): Promise<void> {
  return callService('input_number', 'set_value', { value }, { entity_id: entityId });
}

/**
 * Set a duration input_number (minutes) — used for both the manual-run and the
 * Siri/Apple-Home durations. The HA automation reads the value when a manual
 * run starts, so HAPulse only needs to write it before switching to Manuell.
 */
export function setDurationMinutes(entityId: string, minutes: number): Promise<void> {
  return callService('input_number', 'set_value', { value: minutes }, { entity_id: entityId });
}

/**
 * Start a manual run with `minutes`: the duration is written FIRST (the automation reads it when the mode turns
 * to Manuell), then the mode is selected — or, if the pump is already in Manuell, the timer script restarts the
 * run with the new duration (selecting the same option again changes nothing in HA). Rejects when a call fails.
 */
export async function startManualRun(
  durationEntity: string,
  modeEntity: string,
  manualOption: string,
  alreadyManual: boolean,
  restartScript: string,
  minutes: number,
): Promise<void> {
  await setDurationMinutes(durationEntity, minutes);
  if (alreadyManual) await callService('script', 'turn_on', undefined, { entity_id: restartScript });
  else await setPoolMode(modeEntity, manualOption);
}

/** Turn a switch (pump, bypass, schedule) on or off. */
export function setSwitch(entityId: string, on: boolean): Promise<void> {
  return callService('switch', on ? 'turn_on' : 'turn_off', undefined, { entity_id: entityId });
}

/** Press a button entity (e.g. device restart). */
export function pressButton(entityId: string): Promise<void> {
  return callService('button', 'press', undefined, { entity_id: entityId });
}

/**
 * Persist an edited schedule via the scheduler-component's `scheduler.edit`
 * service. The model's on-windows are converted to the contiguous timeslot
 * partition the integration expects (see `@hapulse/core` `buildScheduleTimeslots`).
 *
 * `entity_id` is passed in the data payload (not as a target): the custom
 * `scheduler.edit` service reads it as an explicit field.
 */
export function savePoolSchedule(
  scheduleSwitchEntityId: string,
  toggledEntityId: string,
  model: PoolScheduleModel,
): Promise<void> {
  return callService('scheduler', 'edit', {
    entity_id: scheduleSwitchEntityId,
    weekdays: weekdaysToScheduler(model.weekdays),
    timeslots: buildScheduleTimeslots(model.windows, { entityId: toggledEntityId }),
    repeat_type: model.repeatType,
  });
}
