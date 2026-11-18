/**
 * [fork] Steering the home battery from HAPulse (plan glas/energie-neu/umsetzung/PLAN-E4-AKKU.md, E5b): a permanent
 * command (rest, charge or discharge with a power) or a daily plan that Home Assistant switches.
 *
 * The command is the integration's signed power setpoint (`aecc_battery`: plus charges, minus discharges, 0 rests;
 * one write switches the battery to its manual mode and holds all day). The plan is a schedule of the scheduler
 * component (`switch.schedule_*`, the one the pool uses too): the day cut into timeslots without gaps, each setting
 * the setpoint — the plan's periods with their power, the time in between with 0. HAPulse finds its schedule by the
 * tag `hapulse-batterie` and reads the plan back from the schedule's attributes, so what Home Assistant has is what
 * the window shows.
 *
 * DOM-free like the rest of the core; the calls are built here and made by the dashboard.
 */

import { hhmmToMinutes, minutesToHHMM } from './pool.js';
import { addPeriod, periodMinutes, periodTimeOf, sortPeriods } from './timePeriods.js';
import type { TimePeriod } from './timePeriods.js';
import { batteryWrites } from './batteryDetails.js';
import type { BatteryControls, BatteryDraft, BatteryWrite } from './batteryDetails.js';
import type { HassEntity, HassEntityMap } from './types.js';

// ---- the command ----

export type BatteryCommandKind = 'idle' | 'charge' | 'discharge';

/** What the battery does now: `watts` is 0 for `idle`, else above 0. */
export interface BatteryCommand {
  kind: BatteryCommandKind;
  watts: number;
}

/** The command a setpoint means (plus charges, minus discharges; under half a watt rests). */
export function batteryCommandOf(setpoint: number): BatteryCommand {
  if (!Number.isFinite(setpoint) || Math.abs(setpoint) < 0.5) return { kind: 'idle', watts: 0 };
  const watts = Math.round(Math.abs(setpoint));
  return { kind: setpoint > 0 ? 'charge' : 'discharge', watts };
}

/** The setpoint of a command. */
export function batterySetpointOf(command: BatteryCommand): number {
  if (command.kind === 'idle' || command.watts <= 0) return 0;
  return command.kind === 'charge' ? command.watts : -command.watts;
}

export function sameBatteryCommand(a: BatteryCommand, b: BatteryCommand): boolean {
  return batterySetpointOf(a) === batterySetpointOf(b);
}

/** The step of the power slider and the power a new command starts with (about a house's base load). */
export const BATTERY_POWER_STEP = 50;
export const BATTERY_POWER_START = 200;

/** The setpoint entity: its value now and the most it takes each way (from its `min` and `max`). */
export interface BatterySetpointControl {
  entityId: string;
  /** the setpoint now; null while Home Assistant has none (unavailable) */
  value: number | null;
  /** the most watts to charge (the entity's `max`) and to discharge (minus its `min`); 0 where a way is closed */
  maxCharge: number;
  maxDischarge: number;
}

const NO_STATE = new Set(['unavailable', 'unknown', '']);

/** The setpoint entity as the window needs it; null without the entity or without a usable range. */
export function batterySetpointControl(entityId: string | null, entities: HassEntityMap): BatterySetpointControl | null {
  if (!entityId) return null;
  const entity: HassEntity | undefined = entities[entityId];
  if (!entity) return null;
  const min = entity.attributes['min'];
  const max = entity.attributes['max'];
  if (typeof min !== 'number' || typeof max !== 'number' || !Number.isFinite(min) || !Number.isFinite(max) || min >= max) return null;
  const maxCharge = Math.max(0, Math.floor(max));
  const maxDischarge = Math.max(0, Math.floor(-min));
  if (maxCharge === 0 && maxDischarge === 0) return null;
  const raw = NO_STATE.has(entity.state) ? NaN : Number(entity.state);
  return { entityId, value: Number.isFinite(raw) ? raw : null, maxCharge, maxDischarge };
}

/**
 * The stops of the power slider for one way: every 50 W up to the most the entity takes, that most itself when it is
 * off the grid, and `keep` (Home Assistant's power, 230 W set elsewhere stays reachable). Empty when the way is closed.
 */
export function batteryPowerStops(most: number, keep: number | null = null): number[] {
  if (!(most > 0)) return [];
  const stops: number[] = [];
  for (let w = BATTERY_POWER_STEP; w <= most; w += BATTERY_POWER_STEP) stops.push(w);
  if (stops[stops.length - 1] !== most) stops.push(most);
  if (keep !== null && keep > 0 && keep <= most && !stops.includes(keep)) stops.push(keep);
  return stops.sort((a, b) => a - b);
}

/** The power a new command in a way starts with: 200 W, or the nearest stop. */
export function batteryStartPower(most: number): number {
  const stops = batteryPowerStops(most);
  if (stops.length === 0) return 0;
  return stops.reduce((best, s) => (Math.abs(s - BATTERY_POWER_START) < Math.abs(best - BATTERY_POWER_START) ? s : best), stops[0]!);
}

// ---- the plan ----

/** The scheduler tag and name of HAPulse's battery plan (`scheduler.add` makes `switch.schedule_batterie` of the name). */
export const BATTERY_PLAN_TAG = 'hapulse-batterie';
export const BATTERY_PLAN_NAME = 'Batterie';

/** One period of the plan: its times and the setpoint during it (never 0; the time outside the periods rests). */
export interface BatteryPlanPeriod extends TimePeriod {
  setpoint: number;
}

/** One scheduler timeslot as `scheduler.add` and `scheduler.edit` take it. */
export interface BatteryTimeslot {
  start: string;
  stop: string;
  actions: { service: 'number.set_value'; entity_id: string; service_data: { value: number } }[];
}

/**
 * The plan's timeslots: the whole day without gaps, each period with its setpoint, the time between with 0, a stop
 * at midnight written `00:00` (the scheduler's end of the day). Neighbours with the same setpoint become one slot.
 */
export function batteryPlanTimeslots(periods: readonly BatteryPlanPeriod[], setpointId: string): BatteryTimeslot[] {
  return planParts(periods).map((p) => ({
    start: minutesToHHMM(p.start),
    stop: minutesToHHMM(p.stop),
    actions: [{ service: 'number.set_value', entity_id: setpointId, service_data: { value: p.value } }],
  }));
}

const DAY = 24 * 60;

/** The day in parts without gaps (minutes): the periods with their setpoint (an earlier one wins), 0 between them. */
function planParts(periods: readonly BatteryPlanPeriod[]): { start: number; stop: number; value: number }[] {
  const sorted = sortPeriods(periods);
  const parts: { start: number; stop: number; value: number }[] = [];
  const push = (start: number, stop: number, value: number) => {
    if (stop <= start) return;
    const last = parts[parts.length - 1];
    if (last && last.value === value && last.stop === start) last.stop = stop;
    else parts.push({ start, stop, value });
  };
  let at = 0;
  for (const p of sorted) {
    const from = Math.max(at, periodMinutes(p.from));
    const to = Math.min(DAY, periodMinutes(p.to));
    push(at, from, 0);
    push(from, to, Math.round(p.setpoint));
    at = Math.max(at, to);
  }
  push(at, DAY, 0);
  return parts;
}

/** At most six times a day; a plan's first time is in the evening, when a house draws on its battery. */
export const BATTERY_MAX_PERIODS = 6;
export const BATTERY_FIRST_PERIOD: TimePeriod = { from: '18:00', to: '22:00' };

/** The periods with one more (core addPeriod: the largest gap), the new one with `setpoint`; null when no more fit. */
export function addBatteryPeriod(periods: readonly BatteryPlanPeriod[], setpoint: number): BatteryPlanPeriod[] | null {
  const next = addPeriod(periods, { max: BATTERY_MAX_PERIODS, first: BATTERY_FIRST_PERIOD });
  if (!next) return null;
  return next.map((p) => {
    const sp = (p as Partial<BatteryPlanPeriod>).setpoint;
    return typeof sp === 'number' ? (p as BatteryPlanPeriod) : { from: p.from, to: p.to, setpoint };
  });
}

/**
 * What the plan does at `minutes` past midnight, as Home Assistant runs it (its timeslots): the setpoint until it
 * changes — a touching period with the same setpoint runs on, also over midnight into tomorrow's first — so resting
 * lasts until the next period starts; `24:00` when the whole day is the same.
 */
export function batteryPlanAt(periods: readonly BatteryPlanPeriod[], minutes: number): { setpoint: number; until: string } {
  const parts = planParts(periods);
  const i = parts.findIndex((p) => p.start <= minutes && minutes < p.stop);
  const part = parts[i] ?? parts[parts.length - 1]!;
  const first = parts[0]!;
  const until = part.stop === DAY && i > 0 && first.value === part.value ? first.stop : part.stop;
  return { setpoint: part.value, until: periodTimeOf(until) };
}

/** HAPulse's battery plan in Home Assistant. */
export interface BatteryPlanState {
  /** the schedule HAPulse uses: the first with the tag that runs, else the first (by entity id) */
  entityId: string;
  /** its state as Home Assistant has it (`on`, `off`, `triggered`, `completed`, `unavailable` …) */
  state: string;
  /** the schedule runs (`on`, or `triggered` for the minute after a switch) */
  on: boolean;
  /** the periods as read back (setpoint ≠ 0) */
  periods: BatteryPlanPeriod[];
  /** the schedule holds something HAPulse does not write (changed by hand): saving replaces it */
  foreign: boolean;
  /** the running period's setpoint and the time it ends (`HH:MM`), from the schedule's `current_slot`; null when off */
  now: { setpoint: number; until: string } | null;
  /** further schedules with the tag that run (a second `scheduler.add`): HAPulse switches them off when it saves */
  others: string[];
}

interface RawSlot {
  start: number;
  stop: number;
  value: number | null;
}

function parseSlot(slot: unknown): { start: number; stop: number } | null {
  if (typeof slot !== 'string') return null;
  const parts = slot.split(' - ');
  if (parts.length !== 2) return null;
  const start = hhmmToMinutes(parts[0]!);
  const stopRaw = hhmmToMinutes(parts[1]!);
  if (start === null || stopRaw === null) return null;
  return { start, stop: stopRaw === 0 ? 24 * 60 : stopRaw };
}

/**
 * The value a slot's action sets, when it is `number.set_value` with a number. The schedule's `actions` attribute holds
 * each slot's first action as `{ service, data }` (the scheduler's switch.py; `service_data` only in what it is given).
 */
function slotValue(action: unknown): number | null {
  if (!action || typeof action !== 'object') return null;
  const a = action as { service?: unknown; data?: unknown; service_data?: unknown };
  if (a.service !== 'number.set_value') return null;
  const data = a.data ?? a.service_data;
  const v = data && typeof data === 'object' ? (data as { value?: unknown }).value : undefined;
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

const isDaily = (weekdays: unknown) => {
  if (!Array.isArray(weekdays)) return false;
  if (weekdays.length === 1 && weekdays[0] === 'daily') return true;
  const all = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  return weekdays.length === 7 && all.every((d) => weekdays.includes(d));
};

/** The plan read from one schedule's attributes, and whether it is the way HAPulse writes it. */
export function parseBatteryPlan(entity: HassEntity, setpointId: string): { periods: BatteryPlanPeriod[]; foreign: boolean } {
  const a = entity.attributes;
  const slots = Array.isArray(a['timeslots']) ? a['timeslots'] : [];
  const actions = Array.isArray(a['actions']) ? a['actions'] : [];
  const targets = Array.isArray(a['entities']) ? a['entities'] : [];
  let foreign = !isDaily(a['weekdays']) || slots.length === 0 || slots.length !== actions.length;
  if (!(targets.length === 1 && targets[0] === setpointId)) foreign = true;
  const raw: RawSlot[] = [];
  slots.forEach((s, i) => {
    const range = parseSlot(s);
    if (!range) {
      foreign = true;
      return;
    }
    const value = slotValue(actions[i]);
    if (value === null) foreign = true;
    raw.push({ ...range, value });
  });
  // without gaps from midnight to midnight, in order
  raw.forEach((s, i) => {
    const expect = i === 0 ? 0 : raw[i - 1]!.stop;
    if (s.start !== expect || s.stop <= s.start) foreign = true;
  });
  if (raw.length > 0 && raw[raw.length - 1]!.stop !== 24 * 60) foreign = true;
  const periods = sortPeriods(
    raw
      .filter((s) => s.value !== null && s.value !== 0 && s.stop > s.start)
      .map((s) => ({ from: periodTimeOf(s.start), to: periodTimeOf(s.stop), setpoint: Math.round(s.value!) })),
  );
  return { periods, foreign };
}

/** A schedule runs while `on`, and for the minute after each switch, when the scheduler calls it `triggered`. */
const scheduleRuns = (entity: HassEntity | undefined) => entity?.state === 'on' || entity?.state === 'triggered';

/** Whether an entity (by its id in the state map) is one of the scheduler's schedules with HAPulse's battery tag. */
export function isBatteryPlanEntity(entityId: string, entity: HassEntity | undefined): boolean {
  if (!entity || !entityId.startsWith('switch.schedule_')) return false;
  const tags = entity.attributes['tags'];
  return Array.isArray(tags) && tags.includes(BATTERY_PLAN_TAG);
}

/** HAPulse's battery plan as Home Assistant has it; null while there is none. */
export function batteryPlanState(entities: HassEntityMap, setpointId: string | null): BatteryPlanState | null {
  if (!setpointId) return null;
  const ids = Object.keys(entities)
    .filter((id) => isBatteryPlanEntity(id, entities[id]))
    .sort();
  // the one that runs, so the window shows what steers the battery (a second one only from a second scheduler.add)
  const entityId = ids.find((id) => scheduleRuns(entities[id])) ?? ids[0];
  if (!entityId) return null;
  const entity = entities[entityId]!;
  const { periods, foreign } = parseBatteryPlan(entity, setpointId);
  const on = scheduleRuns(entity);
  let now: BatteryPlanState['now'] = null;
  const cur = entity.attributes['current_slot'];
  const slots = Array.isArray(entity.attributes['timeslots']) ? entity.attributes['timeslots'] : [];
  const actions = Array.isArray(entity.attributes['actions']) ? entity.attributes['actions'] : [];
  if (on && typeof cur === 'number' && Number.isInteger(cur) && cur >= 0 && cur < slots.length) {
    const range = parseSlot(slots[cur]);
    const value = slotValue(actions[cur]);
    if (range && value !== null) now = { setpoint: Math.round(value), until: periodTimeOf(range.stop) };
  }
  const others = ids.filter((id) => id !== entityId && scheduleRuns(entities[id]));
  return { entityId, state: entity.state, on, periods, foreign, now, others };
}

/** Schedules without HAPulse's tag that set the same setpoint: they steer the battery too (the window says so). */
export function batteryPlanRivals(entities: HassEntityMap, setpointId: string): string[] {
  return Object.keys(entities)
    .filter((id) => {
      const e = entities[id];
      if (!e || !id.startsWith('switch.schedule_') || isBatteryPlanEntity(id, e) || !scheduleRuns(e)) return false;
      const targets = e.attributes['entities'];
      return Array.isArray(targets) && targets.includes(setpointId);
    })
    .sort();
}

// ---- the steering as Home Assistant has it ----

export interface BatterySteer {
  setpoint: BatterySetpointControl;
  plan: BatteryPlanState | null;
  rivals: string[];
}

/** Command and plan of the battery; null without a usable setpoint entity (then the window steers nothing, as in E5). */
export function batterySteer(setpointId: string | null, entities: HassEntityMap): BatterySteer | null {
  const setpoint = batterySetpointControl(setpointId, entities);
  if (!setpoint) return null;
  return { setpoint, plan: batteryPlanState(entities, setpoint.entityId), rivals: batteryPlanRivals(entities, setpoint.entityId) };
}

/** How the window steers: a permanent command or the plan (its periods). */
export type BatteryControlDraft = { kind: 'command'; command: BatteryCommand } | { kind: 'plan'; periods: BatteryPlanPeriod[] };

/**
 * What the window shows first: the plan while it runs; in the automatic mode the plan when one is stored (going back
 * to Manual finds it again); else the command of the setpoint (resting while Home Assistant has none). `modeKey` as
 * batteryModeKey gives it: without a mode entity the setpoint means the manual mode.
 */
export function batteryControlNow(steer: BatterySteer, modeKey: string | null): BatteryControlDraft {
  const plan = steer.plan;
  if (plan && (plan.on || (modeKey !== 'manual' && plan.periods.length > 0))) return { kind: 'plan', periods: plan.periods };
  return { kind: 'command', command: batteryCommandOf(steer.setpoint.value ?? 0) };
}

/** Whether two steerings do the same: the same setpoint, or plans with the same timeslots. */
export function sameBatteryControl(a: BatteryControlDraft, b: BatteryControlDraft): boolean {
  if (a.kind === 'command' && b.kind === 'command') return sameBatteryCommand(a.command, b.command);
  if (a.kind === 'plan' && b.kind === 'plan') return JSON.stringify(batteryPlanTimeslots(a.periods, 'x')) === JSON.stringify(batteryPlanTimeslots(b.periods, 'x'));
  return false;
}

/** Why a plan cannot be saved: no period, or the same power all day (that is a permanent command). */
export function batteryPlanProblem(periods: readonly BatteryPlanPeriod[]): 'empty' | 'allDay' | null {
  if (periods.length === 0) return 'empty';
  return batteryPlanTimeslots(periods, 'x').length === 1 ? 'allDay' : null;
}

/** A setpoint within what the entity takes each way. */
export function clampBatterySetpoint(value: number, setpoint: BatterySetpointControl): number {
  return Math.round(Math.max(-setpoint.maxDischarge, Math.min(setpoint.maxCharge, value)));
}

/** Whether a period asks for more than the entity takes now (its limits lowered later): saving cuts it down. */
export function batteryPlanOutOfRange(periods: readonly BatteryPlanPeriod[], setpoint: BatterySetpointControl): boolean {
  return periods.some((p) => clampBatterySetpoint(p.setpoint, setpoint) !== Math.round(p.setpoint));
}

/**
 * The plan runs in the manual mode, but the setpoint is not the running period's (the scheduler does not retry a write
 * that failed). Not in another mode: there the battery's own steering rests the setpoint (the window says that the
 * plan still runs).
 */
export function batteryPlanMismatch(steer: BatterySteer | null, modeKey: string | null): boolean {
  if (modeKey !== 'manual' || !steer?.plan?.on || !steer.plan.now || steer.setpoint.value === null) return false;
  return Math.abs(steer.plan.now.setpoint - steer.setpoint.value) >= 0.5;
}

// ---- saving ----

export type BatteryCallPart = 'mode' | 'chargeLimit' | 'reserve' | 'command' | 'planOff' | 'planOn' | 'planAdd' | 'planEdit' | 'planRun';

/** One Home Assistant call of a save. */
export interface BatteryCall {
  part: BatteryCallPart;
  domain: string;
  service: string;
  data: Record<string, unknown>;
  /** the call's target entity; the scheduler's own services name their schedule in `data` instead */
  target?: string;
  /** what puts this call back when a later one fails: the plan switched on again, so the last command does not run on */
  undo?: BatteryCall;
}

/** The window's draft: E5's three and the steering (null = untouched). */
export interface BatterySaveDraft extends BatteryDraft {
  control: BatteryControlDraft | null;
}

const callOf = (w: BatteryWrite): BatteryCall => ({ part: w.part, domain: w.domain, service: w.service, data: { ...w.data }, target: w.entityId });

function planSwitch(part: 'planOff' | 'planOn', entityId: string, undo = false): BatteryCall {
  const call: BatteryCall = { part, domain: 'switch', service: part === 'planOff' ? 'turn_off' : 'turn_on', data: {}, target: entityId };
  if (undo) call.undo = planSwitch('planOn', entityId);
  return call;
}

/** The mode's key now; without a mode entity (none, or unavailable) a setpoint means the manual mode. */
export function batteryModeKey(controls: BatteryControls): string | null {
  return modeKeyOf(controls, null);
}

/** The mode key of one of the select's options; without a mode entity a setpoint means the manual mode. */
function modeKeyOf(controls: BatteryControls, raw: string | null): string | null {
  const mode = controls.mode;
  if (!mode) return 'manual';
  if (raw === null) return mode.key;
  if (raw === mode.raw) return mode.key;
  return mode.options.find((o) => o.raw === raw)?.key ?? null;
}

/**
 * Both limits, also unchanged: a command carries the limits the integration remembers (read at its start, else 100 %
 * and 10 %), and writing them sets that memory. The order keeps the reserve below the charge limit in between.
 */
function limitCalls(controls: BatteryControls, draft: BatteryDraft): BatteryCall[] {
  const { chargeLimit, reserve } = controls;
  const limit = chargeLimit?.range ? draft.chargeLimit ?? chargeLimit.value : null;
  const res = reserve?.range ? draft.reserve ?? reserve.value : null;
  const lim: BatteryCall | null =
    chargeLimit && limit !== null ? { part: 'chargeLimit', domain: 'number', service: 'set_value', data: { value: limit }, target: chargeLimit.entityId } : null;
  const rsv: BatteryCall | null =
    reserve && res !== null ? { part: 'reserve', domain: 'number', service: 'set_value', data: { value: res }, target: reserve.entityId } : null;
  const reserveFirst = rsv !== null && res !== null && (chargeLimit === null || res < chargeLimit.value);
  return (reserveFirst ? [rsv, lim] : [lim, rsv]).filter((c): c is BatteryCall => c !== null);
}

/** The steering the window shows and saves: the draft's, else what Home Assistant does now. */
export function batteryControlShown(controls: BatteryControls, steer: BatterySteer, draft: BatterySaveDraft): BatteryControlDraft {
  return draft.control ?? batteryControlNow(steer, batteryModeKey(controls));
}

/**
 * The calls of a save, in order (plan glas/energie-neu/umsetzung/PLAN-E4-AKKU.md, E5b §3). Without a setpoint entity
 * E5's calls (core batteryWrites). Otherwise:
 * - to the automatic mode (or another the window does not steer in): the plan off when it runs, then E5's calls;
 * - Manual with the steering untouched and the mode unchanged: E5's calls (only the limits);
 * - Manual, permanent: the plan off, both limits, the mode, the setpoint;
 * - Manual, plan: other tagged plans off, both limits, the mode, the plan added or edited, switched on — or, when it
 *   runs as it is, told to run its current slot again (after the mode write the battery must get it anew).
 * The mode is written with every Manual save: only that call clears the battery's own slots 2–16, where times from its
 * app could run beside Home Assistant's command. An empty plan or one with the same power all day is no plan: the
 * window does not offer ✓ for it (batteryPlanProblem), and here it saves nothing.
 */
export function batterySaveCalls(controls: BatteryControls, steer: BatterySteer | null, draft: BatterySaveDraft): BatteryCall[] {
  const e5 = () => batteryWrites(controls, draft).map(callOf);
  if (!steer) return e5();
  const mode = controls.mode;
  const targetRaw = draft.mode ?? mode?.raw ?? null;
  const targetKey = modeKeyOf(controls, targetRaw);
  const modeChanges = !!mode && draft.mode !== null && draft.mode !== mode.raw;
  const plan = steer.plan;
  const othersOff = (plan?.others ?? []).map((id) => planSwitch('planOff', id, true));
  const planOff = plan?.on ? [planSwitch('planOff', plan.entityId, true)] : [];

  if (targetKey !== 'manual') {
    const rest = e5();
    return rest.length === 0 ? [] : [...planOff, ...othersOff, ...rest];
  }
  if (draft.control === null && !modeChanges) return e5();

  const control = batteryControlShown(controls, steer, draft);
  const manualRaw = mode ? (mode.options.find((o) => o.key === 'manual')?.raw ?? (mode.key === 'manual' ? mode.raw : null)) : null;
  const modeCall: BatteryCall[] =
    mode && manualRaw ? [{ part: 'mode', domain: 'select', service: 'select_option', data: { option: manualRaw }, target: mode.entityId }] : [];
  const limits = limitCalls(controls, draft);
  const setpointId = steer.setpoint.entityId;

  if (control.kind === 'command') {
    const value = clampBatterySetpoint(batterySetpointOf(control.command), steer.setpoint);
    return [...planOff, ...othersOff, ...limits, ...modeCall, { part: 'command', domain: 'number', service: 'set_value', data: { value }, target: setpointId }];
  }

  if (batteryPlanProblem(control.periods)) return [];
  const periods = control.periods.map((p) => ({ ...p, setpoint: clampBatterySetpoint(p.setpoint, steer.setpoint) }));
  const timeslots = batteryPlanTimeslots(periods, setpointId);
  const out: BatteryCall[] = [...othersOff, ...limits, ...modeCall];
  if (!plan) {
    // created switched on; it runs its current slot at once (the scheduler's store and switch.py)
    out.push({
      part: 'planAdd',
      domain: 'scheduler',
      service: 'add',
      data: { name: BATTERY_PLAN_NAME, tags: [BATTERY_PLAN_TAG], weekdays: ['daily'], repeat_type: 'repeat', timeslots },
    });
    return out;
  }
  const same = !plan.foreign && JSON.stringify(batteryPlanTimeslots(plan.periods, setpointId)) === JSON.stringify(timeslots);
  // never `name` (a new name removes the entity) nor `tags` (they would replace the user's own)
  if (!same) out.push({ part: 'planEdit', domain: 'scheduler', service: 'edit', data: { entity_id: plan.entityId, weekdays: ['daily'], repeat_type: 'repeat', timeslots } });
  if (!plan.on) out.push(planSwitch('planOn', plan.entityId));
  else if (same) out.push({ part: 'planRun', domain: 'scheduler', service: 'run_action', data: { entity_id: plan.entityId } });
  return out;
}

/** What a save set, to check it a moment later. */
export interface BatterySaved {
  /** the mode's key the save went to */
  modeKey: string | null;
  control: BatteryControlDraft | null;
}

/** The target of a save (for batteryRecheck); null when the save steers nothing new. */
export function batterySaved(controls: BatteryControls, steer: BatterySteer | null, draft: BatterySaveDraft): BatterySaved {
  const modeKey = modeKeyOf(controls, draft.mode ?? controls.mode?.raw ?? null);
  const modeChanges = !!controls.mode && draft.mode !== null && draft.mode !== controls.mode.raw;
  const control = steer && modeKey === 'manual' && (draft.control !== null || modeChanges) ? batteryControlShown(controls, steer, draft) : null;
  return { modeKey, control };
}

/**
 * The calls to send once more a moment after a save, when Home Assistant shows something else: a command of the plan
 * that was already on its way can land after the save (the integration's write lock and debounce). Empty when all is
 * as saved.
 */
export function batteryRecheck(controls: BatteryControls, steer: BatterySteer | null, saved: BatterySaved): BatteryCall[] {
  const out: BatteryCall[] = [];
  const mode = controls.mode;
  if (mode && saved.modeKey && mode.key !== saved.modeKey) {
    const raw = mode.options.find((o) => o.key === saved.modeKey)?.raw;
    if (raw) out.push({ part: 'mode', domain: 'select', service: 'select_option', data: { option: raw }, target: mode.entityId });
  }
  if (!steer) return out;
  if (saved.modeKey !== 'manual') {
    if (steer.plan?.on) out.unshift(planSwitch('planOff', steer.plan.entityId));
    return out;
  }
  const control = saved.control;
  if (!control) return out;
  if (control.kind === 'command') {
    const want = clampBatterySetpoint(batterySetpointOf(control.command), steer.setpoint);
    if (steer.setpoint.value !== null && Math.abs(steer.setpoint.value - want) >= 0.5) {
      out.push({ part: 'command', domain: 'number', service: 'set_value', data: { value: want }, target: steer.setpoint.entityId });
    }
  } else if (steer.plan) {
    if (!steer.plan.on) out.push(planSwitch('planOn', steer.plan.entityId));
    else if (batteryPlanMismatch(steer, 'manual')) out.push(batteryPlanRunCall(steer.plan.entityId));
  }
  return out;
}

/** "Send again": the plan runs its current slot once more. */
export function batteryPlanRunCall(entityId: string): BatteryCall {
  return { part: 'planRun', domain: 'scheduler', service: 'run_action', data: { entity_id: entityId } };
}

/** "Switch the plan off" while the battery cannot be reached. */
export function batteryPlanOffCall(entityId: string): BatteryCall {
  return planSwitch('planOff', entityId);
}
