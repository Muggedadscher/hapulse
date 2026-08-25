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
