/**
 * [fork] The heating plan in the demo living room (heatingPlan.ts): the room's automation, its schedule, the two
 * temperature helpers and the save automation, and what their service calls do in demo mode.
 *
 * Home Assistant keeps a schedule's periods in its storage, not in the entity; the demo keeps them in the schedule
 * entity's attribute `demo_week`, so `applyDemoService` stays a pure function of the entity map. `demoHeatingWeek`
 * answers `schedule.get_schedule` from it, and `automation.trigger` on the save automation writes it after the same
 * check as the automation in HA (an invalid request changes nothing, as there). `input_number.set_value` works only
 * on the demo's two helpers, so the other demo helpers (pool) keep their behaviour. The thermostat does not follow
 * the plan in the demo.
 */

import {
  HEATING_PLAN_LABEL,
  HEATING_PLAN_SAVE_AUTOMATION,
  HEATING_WEEKDAYS,
  heatingPlanStatus,
  parseHeatingWeek,
  sortHeatingBlocks,
  validHeatingBlocks,
} from './heatingPlan.js';
import type { HeatingBlock, HeatingWeek, HeatingWeekday } from './heatingPlan.js';
import type { EntityRegistryEntry, HassEntity, HassEntityAttributes, HassEntityMap } from './types.js';

export const DEMO_HEATING = {
  automation: 'automation.advanced_heating_living_room',
  schedule: 'schedule.heating_living_room',
  comfort: 'input_number.heating_plan_living_room_comfort',
  eco: 'input_number.heating_plan_living_room_eco',
} as const;

/** The schedule entity's attribute that holds the demo's periods. */
export const DEMO_WEEK_ATTRIBUTE = 'demo_week';

const WEEKDAY_BLOCKS: HeatingBlock[] = [
  { from: '06:00', to: '08:30' },
  { from: '16:30', to: '22:00' },
];
const WEEKEND_BLOCKS: HeatingBlock[] = [{ from: '08:00', to: '22:30' }];

function demoWeek(): HeatingWeek {
  const week = {} as HeatingWeek;
  for (const day of HEATING_WEEKDAYS) week[day] = (day === 'saturday' || day === 'sunday' ? WEEKEND_BLOCKS : WEEKDAY_BLOCKS).map((b) => ({ ...b }));
  return week;
}

/** State and `next_event` of a schedule entity with `week` at `now`, as HA reports them. */
function scheduleState(week: HeatingWeek, now: Date): { state: string; next_event: string | null } {
  const status = heatingPlanStatus({ automationOn: true, scheduleOn: null, week, now });
  const until = status.until;
  let next: string | null = null;
  if (until) {
    const [h, m] = until.time.split(':').map(Number);
    next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + until.dayOffset, h, m).toISOString();
  }
  return { state: status.phase === 'comfort' ? 'on' : 'off', next_event: next };
}

function entity(entity_id: string, state: string, attributes: HassEntityAttributes, now: string): HassEntity {
  return { entity_id, state, attributes, last_changed: now, last_updated: now, context: { id: 'demo', parent_id: null, user_id: null } };
}

export function demoHeatingEntities(): HassEntityMap {
  const now = new Date();
  const iso = now.toISOString();
  const week = demoWeek();
  const schedule = scheduleState(week, now);
  const helper = (name: string, icon: string): HassEntityAttributes => ({
    min: 5, max: 30, step: 0.5, mode: 'box', unit_of_measurement: '°C', friendly_name: name, icon,
  });
  return {
    [DEMO_HEATING.automation]: entity(DEMO_HEATING.automation, 'on', {
      friendly_name: 'Advanced Heating Living Room', last_triggered: new Date(now.getTime() - 40 * 60_000).toISOString(),
      current: 0, mode: 'single', category: 'Comfort', icon: 'mdi:radiator',
    }, iso),
    [HEATING_PLAN_SAVE_AUTOMATION]: entity(HEATING_PLAN_SAVE_AUTOMATION, 'on', {
      friendly_name: 'Save Heating Plan', last_triggered: null, current: 0, mode: 'queued', max: 10, category: 'Comfort',
    }, iso),
    [DEMO_HEATING.schedule]: entity(DEMO_HEATING.schedule, schedule.state, {
      friendly_name: 'Heating Living Room', icon: 'mdi:calendar-clock', editable: true, next_event: schedule.next_event,
      [DEMO_WEEK_ATTRIBUTE]: week,
    }, iso),
    [DEMO_HEATING.comfort]: entity(DEMO_HEATING.comfort, '21.0', helper('Heating Plan Living Room Comfort', 'mdi:sun-thermometer'), iso),
    [DEMO_HEATING.eco]: entity(DEMO_HEATING.eco, '18.0', helper('Heating Plan Living Room Eco', 'mdi:leaf'), iso),
  };
}

export function demoHeatingRegistryEntries(): EntityRegistryEntry[] {
  const entry = (entity_id: string, platform: string, labeled: boolean): EntityRegistryEntry => ({
    entity_id, area_id: labeled ? 'living_room' : null, device_id: null, entity_category: null, hidden_by: null,
    disabled_by: null, original_name: null, icon: null, platform, labels: labeled ? [HEATING_PLAN_LABEL] : [],
  });
  return [
    entry(DEMO_HEATING.automation, 'automation', true),
    entry(DEMO_HEATING.schedule, 'schedule', true),
    entry(DEMO_HEATING.comfort, 'input_number', true),
    entry(DEMO_HEATING.eco, 'input_number', true),
    entry(HEATING_PLAN_SAVE_AUTOMATION, 'automation', false),
  ];
}

/** The periods of a demo schedule, as `schedule.get_schedule` would return them; null when it has none. */
export function demoHeatingWeek(entities: HassEntityMap, scheduleId: string): HeatingWeek | null {
  const raw = entities[scheduleId]?.attributes[DEMO_WEEK_ATTRIBUTE];
  return raw === undefined ? null : parseHeatingWeek({ [scheduleId]: raw }, scheduleId);
}

const HELPERS = new Set<string>([DEMO_HEATING.comfort, DEMO_HEATING.eco]);

/** The days of a save request, or null when the automation in HA would refuse it. */
function saveRequest(entities: HassEntityMap, variables: unknown): { schedule: string; days: [HeatingWeekday, HeatingBlock[]][] } | null {
  if (variables == null || typeof variables !== 'object') return null;
  const { zeitplan, tage } = variables as Record<string, unknown>;
  if (typeof zeitplan !== 'string' || entities[zeitplan]?.attributes[DEMO_WEEK_ATTRIBUTE] === undefined) return null;
  if (!Array.isArray(tage) || tage.length < 1 || tage.length > 7) return null;
  const days: [HeatingWeekday, HeatingBlock[]][] = [];
  for (const item of tage) {
    if (item == null || typeof item !== 'object') return null;
    const { tag, bloecke } = item as Record<string, unknown>;
    if (!HEATING_WEEKDAYS.includes(tag as HeatingWeekday) || !Array.isArray(bloecke)) return null;
    const blocks: HeatingBlock[] = [];
    for (const b of bloecke) {
      if (b == null || typeof b !== 'object') return null;
      const { from, to } = b as Record<string, unknown>;
      if (typeof from !== 'string' || typeof to !== 'string') return null;
      blocks.push({ from, to });
    }
    if (!validHeatingBlocks(blocks)) return null;
    days.push([tag as HeatingWeekday, sortHeatingBlocks(blocks)]);
  }
  return { schedule: zeitplan, days };
}

/**
 * The demo's heating plan calls, applied to `entities` (a copy the caller owns). Returns the map when the call was
 * one of them, else null and the caller goes on with its own handling.
 */
export function applyDemoHeatingService(
  entities: HassEntityMap,
  domain: string,
  service: string,
  data: Record<string, unknown>,
  targetIds: string[],
  now: string,
): HassEntityMap | null {
  if (domain === 'input_number' && service === 'set_value' && targetIds.length > 0 && targetIds.every((id) => HELPERS.has(id))) {
    for (const id of targetIds) {
      const helper = entities[id];
      const value = Number(data['value']);
      if (!helper || !Number.isFinite(value)) continue;
      const min = Number(helper.attributes['min'] ?? -Infinity);
      const max = Number(helper.attributes['max'] ?? Infinity);
      if (value < min || value > max) continue; // HA refuses values outside the range
      const state = value.toFixed(1);
      entities[id] = { ...helper, state, last_updated: now, last_changed: state !== helper.state ? now : helper.last_changed };
    }
    return entities;
  }
  if (domain === 'automation' && service === 'trigger' && targetIds.includes(HEATING_PLAN_SAVE_AUTOMATION)) {
    const saver = entities[HEATING_PLAN_SAVE_AUTOMATION];
    if (saver) entities[HEATING_PLAN_SAVE_AUTOMATION] = { ...saver, last_updated: now, attributes: { ...saver.attributes, last_triggered: now } };
    const request = saveRequest(entities, data['variables']);
    const schedule = request ? entities[request.schedule] : undefined;
    const week = request ? demoHeatingWeek(entities, request.schedule) : null;
    if (request && schedule && week) {
      for (const [day, blocks] of request.days) week[day] = blocks;
      const next = scheduleState(week, new Date(now));
      entities[request.schedule] = {
        ...schedule,
        state: next.state,
        last_updated: now,
        last_changed: next.state !== schedule.state ? now : schedule.last_changed,
        attributes: { ...schedule.attributes, next_event: next.next_event, [DEMO_WEEK_ATTRIBUTE]: week },
      };
    }
    return entities;
  }
  return null;
}
