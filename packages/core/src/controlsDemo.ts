/**
 * [fork] The demo's number and select entities and a small copy of the scheduler component, so the battery's window
 * can set its charge limit, reserve, mode, command and plan in the demo (plan glas/energie-neu/umsetzung/PLAN-E4-AKKU.md,
 * E5 and E5b). `number.set_value` takes a value within the entity's `min` and `max`, `select.select_option` one of its
 * `options`; anything else changes nothing, as Home Assistant refuses it.
 *
 * The demo battery does what the integration does with its controls: a setpoint puts it in its manual mode, its
 * automatic mode clears the setpoint. The scheduler's services (`scheduler.add`, `edit`, `run_action`, and
 * `switch.turn_on`/`turn_off` of a `switch.schedule_*`) keep a schedule's attributes as the component shows them
 * (`timeslots` "HH:MM - HH:MM", `actions` with `data`, `entities`, `current_slot`, `next_slot`, `next_trigger`, `tags`)
 * and run the current slot's `number.set_value` at once, as the component does when a schedule is added, changed or
 * switched on. Not a model of the battery: its charge and power stay as the demo has them.
 */

import { hhmmToMinutes } from './pool.js';
import type { HassEntity, HassEntityMap } from './types.js';

/** The demo battery's setpoint and mode (demo.ts) and the mode's two options. */
const DEMO_SETPOINT = 'number.demo_battery_power_setpoint';
const DEMO_MODE = 'select.demo_battery_work_mode';
const DEMO_MANUAL = 'Custom / Manual';
const DEMO_AUTO = 'Self-Consumption (AI)';

const DAY = 24 * 60;

function setState(entities: HassEntityMap, id: string, state: string, now: string, attributes?: HassEntity['attributes']): void {
  const entity = entities[id];
  if (!entity) return;
  entities[id] = {
    ...entity,
    state,
    attributes: attributes ?? entity.attributes,
    last_updated: now,
    last_changed: entity.state !== state ? now : entity.last_changed,
  };
}

/** `number.set_value` on one entity, within its range; the demo battery's setpoint also puts it in its manual mode. */
function setNumber(entities: HassEntityMap, id: string, value: unknown, now: string): void {
  const entity = entities[id];
  if (!entity) return;
  const a = entity.attributes;
  const v = Number(value);
  const min = typeof a['min'] === 'number' ? a['min'] : -Infinity;
  const max = typeof a['max'] === 'number' ? a['max'] : Infinity;
  if (!Number.isFinite(v) || v < min || v > max) return;
  setState(entities, id, String(v), now);
  if (id === DEMO_SETPOINT) setState(entities, DEMO_MODE, DEMO_MANUAL, now);
}

// ---- the scheduler ----

interface DemoSlot {
  start: number;
  stop: number;
}

function parseDemoSlot(text: unknown): DemoSlot | null {
  if (typeof text !== 'string') return null;
  const [a, b] = text.split(' - ');
  const start = a === undefined ? null : hhmmToMinutes(a);
  const stop = b === undefined ? null : hhmmToMinutes(b);
  if (start === null || stop === null) return null;
  return { start, stop: stop === 0 ? DAY : stop };
}

const localMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** The slot running at `at` (local time), its successor and when that starts, from a schedule's `timeslots`. */
function slotTimes(timeslots: unknown, at: Date): { current: number | null; next: number | null; nextTrigger: string | null } {
  const slots = (Array.isArray(timeslots) ? timeslots : []).map(parseDemoSlot);
  const m = localMinutes(at);
  const current = slots.findIndex((s) => !!s && s.start <= m && m < s.stop);
  if (slots.length === 0) return { current: null, next: null, nextTrigger: null };
  // the next start after now, today or tomorrow
  let next: number | null = null;
  let best = Infinity;
  slots.forEach((s, i) => {
    if (!s) return;
    const wait = (s.start - m + DAY) % DAY || DAY;
    if (wait < best) {
      best = wait;
      next = i;
    }
  });
  const start = new Date(at);
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + (Number.isFinite(best) ? best : 0));
  return { current: current >= 0 ? current : null, next, nextTrigger: next === null ? null : start.toISOString() };
}

interface DemoTimeslot {
  start?: unknown;
  stop?: unknown;
  actions?: unknown;
}

/** A schedule's attributes from the timeslots `scheduler.add`/`edit` take, as the component's switch shows them. */
function scheduleAttributes(timeslots: unknown, prev: HassEntity['attributes'], extra: Record<string, unknown>): HassEntity['attributes'] {
  const list = (Array.isArray(timeslots) ? timeslots : []) as DemoTimeslot[];
  const entities: string[] = [];
  const actions = list.map((slot) => {
    const first = Array.isArray(slot.actions) ? (slot.actions[0] as Record<string, unknown> | undefined) : undefined;
    const id = first?.['entity_id'];
    if (typeof id === 'string' && !entities.includes(id)) entities.push(id);
    const data = first?.['service_data'] ?? first?.['data'];
    const service = String(first?.['service'] ?? '');
    return data && typeof data === 'object' && Object.keys(data).length > 0 ? { service, data } : { service };
  });
  const strings = list.map((slot) => (slot.stop ? `${String(slot.start)} - ${String(slot.stop)}` : String(slot.start)));
  return { ...prev, ...extra, timeslots: strings, actions, entities };
}

/** The schedule's slot times as attributes now (the component recomputes them on every change). */
function withSlotTimes(attributes: HassEntity['attributes'], at: Date): HassEntity['attributes'] {
  const t = slotTimes(attributes['timeslots'], at);
  return { ...attributes, current_slot: t.current, next_slot: t.next, next_trigger: t.nextTrigger };
}

/** Run the current slot's action (`number.set_value` only; the demo applies no other) on the schedule's entities. */
function runCurrentSlot(entities: HassEntityMap, scheduleId: string, now: string): void {
  const schedule = entities[scheduleId];
  if (!schedule) return;
  const slot = schedule.attributes['current_slot'];
  const actions = schedule.attributes['actions'];
  const targets = schedule.attributes['entities'];
  if (typeof slot !== 'number' || !Array.isArray(actions) || !Array.isArray(targets)) return;
  const action = actions[slot] as { service?: unknown; data?: Record<string, unknown> } | undefined;
  if (action?.service !== 'number.set_value') return;
  for (const id of targets) if (typeof id === 'string') setNumber(entities, id, action.data?.['value'], now);
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const isSchedule = (id: string) => id.startsWith('switch.schedule_');
const runs = (e: HassEntity | undefined) => e?.state === 'on' || e?.state === 'triggered';

function applySchedulerService(entities: HassEntityMap, service: string, data: Record<string, unknown>, now: string): HassEntityMap | null {
  const at = new Date(now);
  if (service === 'add') {
    const name = typeof data['name'] === 'string' ? data['name'] : '';
    const slug = slugify(name) || 'demo';
    let id = `switch.schedule_${slug}`;
    for (let n = 2; entities[id]; n++) id = `switch.schedule_${slug}_${n}`;
    const tags = Array.isArray(data['tags']) ? data['tags'].filter((t): t is string => typeof t === 'string') : [];
    const weekdays = Array.isArray(data['weekdays']) ? data['weekdays'] : ['daily'];
    const attributes = withSlotTimes(scheduleAttributes(data['timeslots'], {}, { weekdays, tags, friendly_name: name || id, icon: 'mdi:calendar-clock' }), at);
    entities[id] = { entity_id: id, state: 'on', attributes, last_changed: now, last_updated: now, context: { id: 'demo', parent_id: null, user_id: null } };
    runCurrentSlot(entities, id, now);
    return entities;
  }
  const id = data['entity_id'];
  if (typeof id !== 'string' || !isSchedule(id) || !entities[id]) return entities;
  if (service === 'edit') {
    const prev = entities[id]!;
    const extra: Record<string, unknown> = {};
    if (Array.isArray(data['weekdays'])) extra['weekdays'] = data['weekdays'];
    const base = Array.isArray(data['timeslots']) ? scheduleAttributes(data['timeslots'], prev.attributes, extra) : { ...prev.attributes, ...extra };
    setState(entities, id, prev.state, now, withSlotTimes(base, at));
    if (runs(entities[id])) runCurrentSlot(entities, id, now);
    return entities;
  }
  if (service === 'run_action') {
    setState(entities, id, entities[id]!.state, now, withSlotTimes(entities[id]!.attributes, at));
    runCurrentSlot(entities, id, now);
    return entities;
  }
  return entities;
}

export function applyDemoControlService(
  entities: HassEntityMap,
  domain: string,
  service: string,
  data: Record<string, unknown>,
  targetIds: string[],
  now: string,
): HassEntityMap | null {
  if (domain === 'scheduler') return applySchedulerService(entities, service, data, now);
  // a schedule switched: on runs its current slot at once
  if (domain === 'switch' && targetIds.length > 0 && targetIds.every((id) => isSchedule(id) && !!entities[id])) {
    if (service !== 'turn_on' && service !== 'turn_off' && service !== 'toggle') return null;
    for (const id of targetIds) {
      const entity = entities[id]!;
      const on = service === 'turn_on' || (service === 'toggle' && !runs(entity));
      setState(entities, id, on ? 'on' : 'off', now, withSlotTimes(entity.attributes, new Date(now)));
      if (on) runCurrentSlot(entities, id, now);
    }
    return entities;
  }
  const number = domain === 'number' && service === 'set_value';
  const select = domain === 'select' && service === 'select_option';
  if (!number && !select) return null;
  for (const id of targetIds) {
    const entity = entities[id];
    if (!entity) continue;
    if (number) {
      setNumber(entities, id, data['value'], now);
      continue;
    }
    const option = data['option'];
    const options = Array.isArray(entity.attributes['options']) ? entity.attributes['options'] : [];
    if (typeof option !== 'string' || !options.includes(option)) continue;
    setState(entities, id, option, now);
    // the automatic mode: the battery decides, the command is gone
    if (id === DEMO_MODE && option === DEMO_AUTO) setState(entities, DEMO_SETPOINT, '0', now);
  }
  return entities;
}
