/**
 * [fork] Heating plan per room — framework-agnostic domain logic.
 *
 * In Home Assistant each room with a thermostat runs an automation from the blueprint
 * panhans/advanced_heating_control ("Advanced Heating <room>"): while the room's `schedule.*` entity is on it holds
 * the comfort temperature, otherwise the eco temperature, both read from two `input_number` helpers. Automation,
 * schedule and helpers carry the label `heizplan` and sit in the room's area; HAPulse finds them from the entity
 * registry, which every user may read.
 *
 * Every user can operate the plan without admin rights: the automation is switched with `automation.turn_on/off`,
 * the temperatures with `input_number.set_value`, and the schedule is read with `schedule.get_schedule`. Writing a
 * schedule needs admin rights in HA, so HAPulse starts the automation `automation.heizplan_speichern` with
 * `automation.trigger` and hands it the days as `variables`; an automation runs without a user, and Spook's
 * `schedule.set_day` checks admin rights only when a user is behind the call. That automation validates the input
 * the same way as `validHeatingBlocks` below and reports errors only in its trace, so HAPulse reads the schedule
 * back and compares (`heatingWeekMatches`).
 *
 * Times are wall-clock `HH:MM` strings in Home Assistant's time zone; the end of a day is `24:00`, which HA stores
 * as `23:59:59.999999` (normalizeHeatingTime). The status line works on wall-clock minutes of the browser's clock,
 * so a 23- or 25-hour day needs no special case; it assumes the browser runs in HA's time zone, as the rest of
 * HAPulse does. Setup in HA and the decisions behind it: glas/heizung-zeitplan/PLAN.md and EINRICHTUNG-0a.md in the
 * project files.
 */

import { domainOf } from './domain.js';
import { isHeatingPlanEntry } from './heatingPlanLabel.js';
import { buildDeviceAreaMap, resolveEntityAreaId } from './rooms.js';
import type { EntityRegistryEntry, Registries } from './types.js';

export { HEATING_PLAN_LABEL, isHeatingPlanEntry } from './heatingPlanLabel.js';

/** The automation that writes a schedule for any user (see above). Has no label and no area. */
export const HEATING_PLAN_SAVE_AUTOMATION = 'automation.heizplan_speichern';

/** Most comfort periods per day the save automation accepts. */
export const HEATING_MAX_BLOCKS = 10;

/** Weekday ids as Home Assistant's schedule uses them, Monday first. */
export const HEATING_WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type HeatingWeekday = (typeof HEATING_WEEKDAYS)[number];

/** One comfort period of a day: `from` `00:00`–`23:59`, `to` up to `24:00`, `from` < `to`. */
export interface HeatingBlock {
  from: string;
  to: string;
}

/** The comfort periods of every weekday, each list sorted by `from`. */
export type HeatingWeek = Record<HeatingWeekday, HeatingBlock[]>;

/** The entities behind one room's heating plan. */
export interface HeatingPlanEntities {
  areaId: string;
  /** `automation.*`: the plan is on while it is on. */
  automation: string;
  /** `schedule.*`: comfort while on, eco while off. */
  schedule: string | null;
  /** `input_number.*_komfort` (or `_comfort`). */
  comfort: string | null;
  /** `input_number.*_eco`. */
  eco: string | null;
  /** The room's `climate.*` entities. */
  thermostats: string[];
}

const COMFORT_SUFFIXES = ['_komfort', '_comfort'];
const ECO_SUFFIXES = ['_eco'];

function hasSuffix(entityId: string, suffixes: string[]): boolean {
  return suffixes.some((s) => entityId.endsWith(s));
}

/**
 * The heating plans by area id. A room has a plan when an automation with the label sits in its area; schedule and
 * helpers are optional (the card leaves out what is missing). Disabled entries are ignored, hidden ones count: hiding
 * a helper in HA's lists does not take it out of the plan. Several candidates of one kind in a room: the first by
 * entity id wins, so the choice does not depend on the registry's order.
 */
export function findHeatingPlans(registries: Registries): Record<string, HeatingPlanEntities> {
  const deviceAreas = buildDeviceAreaMap(registries.devices);
  const byArea = new Map<string, EntityRegistryEntry[]>();
  const thermostats = new Map<string, string[]>();
  const entries = [...registries.entities].sort((a, b) => a.entity_id.localeCompare(b.entity_id));
  for (const entry of entries) {
    if (entry.disabled_by != null) continue;
    const areaId = resolveEntityAreaId(entry, deviceAreas);
    if (areaId === null) continue;
    if (isHeatingPlanEntry(entry)) {
      byArea.set(areaId, [...(byArea.get(areaId) ?? []), entry]);
    } else if (domainOf(entry.entity_id) === 'climate') {
      thermostats.set(areaId, [...(thermostats.get(areaId) ?? []), entry.entity_id]);
    }
  }
  const plans: Record<string, HeatingPlanEntities> = {};
  for (const [areaId, list] of byArea) {
    const ids = list.map((e) => e.entity_id);
    const automation = ids.find((id) => domainOf(id) === 'automation' && id !== HEATING_PLAN_SAVE_AUTOMATION);
    if (!automation) continue;
    const helpers = ids.filter((id) => domainOf(id) === 'input_number');
    plans[areaId] = {
      areaId,
      automation,
      schedule: ids.find((id) => domainOf(id) === 'schedule') ?? null,
      comfort: helpers.find((id) => hasSuffix(id, COMFORT_SUFFIXES)) ?? null,
      eco: helpers.find((id) => hasSuffix(id, ECO_SUFFIXES)) ?? null,
      thermostats: thermostats.get(areaId) ?? [],
    };
  }
  return plans;
}

// ---------------------------------------------------------------------------
// Times and schedules
// ---------------------------------------------------------------------------

const DAY_MINUTES = 1440;
const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;
const FROM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TO_RE = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * A time from Home Assistant as `HH:MM`: seconds are cut, `24:00:00` and HA's end of day `23:59:59.999999` become
 * `24:00`. Null for anything that is not a time.
 */
export function normalizeHeatingTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = TIME_RE.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const s = m[3] === undefined ? 0 : Number(m[3]);
  if (h === 24 && min === 0 && s === 0) return '24:00';
  if (h > 23 || min > 59 || s > 59) return null;
  if (h === 23 && min === 59 && s === 59) return '24:00';
  return `${pad(h)}:${pad(min)}`;
}

/** Minutes since midnight of an `HH:MM` time (`24:00` = 1440). */
export function heatingMinutes(time: string): number {
  const [h, m] = time.split(':');
  return Number(h) * 60 + Number(m);
}

function minutesToTime(minutes: number): string {
  return minutes >= DAY_MINUTES ? '24:00' : `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function sortHeatingBlocks(blocks: readonly HeatingBlock[]): HeatingBlock[] {
  return [...blocks].sort((a, b) => heatingMinutes(a.from) - heatingMinutes(b.from) || heatingMinutes(a.to) - heatingMinutes(b.to));
}

export function emptyHeatingWeek(): HeatingWeek {
  return { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
}

/**
 * The week from a `schedule.get_schedule` response (`{ "schedule.x": { monday: [{from, to, data?}], … } }`). A day
 * HA leaves out has no periods. Null when the entity is missing from the response or a period cannot be read, so the
 * caller shows "could not load" instead of a wrong plan.
 */
export function parseHeatingWeek(response: unknown, scheduleId: string): HeatingWeek | null {
  if (response == null || typeof response !== 'object') return null;
  const raw = (response as Record<string, unknown>)[scheduleId];
  if (raw == null || typeof raw !== 'object') return null;
  const week = emptyHeatingWeek();
  for (const day of HEATING_WEEKDAYS) {
    const list = (raw as Record<string, unknown>)[day];
    if (list === undefined) continue;
    if (!Array.isArray(list)) return null;
    const blocks: HeatingBlock[] = [];
    for (const item of list) {
      if (item == null || typeof item !== 'object') return null;
      const from = normalizeHeatingTime((item as Record<string, unknown>)['from']);
      const to = normalizeHeatingTime((item as Record<string, unknown>)['to']);
      if (from === null || to === null || from === '24:00') return null;
      // a period shorter than a minute (HA allows seconds) is empty once the seconds are cut: left out
      if (heatingMinutes(from) < heatingMinutes(to)) blocks.push({ from, to });
    }
    week[day] = sortHeatingBlocks(blocks);
  }
  return week;
}

/**
 * True when the save automation in HA accepts these periods: `from` as `HH:MM` up to `23:59`, `to` up to `24:00`,
 * `from` before `to`, no overlap (touching is fine), at most `HEATING_MAX_BLOCKS`. Mirrors the automation's check.
 */
export function validHeatingBlocks(blocks: readonly HeatingBlock[]): boolean {
  if (blocks.length > HEATING_MAX_BLOCKS) return false;
  let end = 0;
  for (const b of sortHeatingBlocks(blocks)) {
    if (!FROM_RE.test(b.from) || !TO_RE.test(b.to)) return false;
    const from = heatingMinutes(b.from);
    const to = heatingMinutes(b.to);
    if (from >= to || from < end) return false;
    end = to;
  }
  return true;
}

export function sameHeatingBlocks(a: readonly HeatingBlock[], b: readonly HeatingBlock[]): boolean {
  const x = sortHeatingBlocks(a);
  const y = sortHeatingBlocks(b);
  return x.length === y.length && x.every((block, i) => block.from === y[i]!.from && block.to === y[i]!.to);
}

/** True when `actual` has the periods of `expected` on each of `days`. */
export function heatingWeekMatches(expected: HeatingWeek, actual: HeatingWeek, days: readonly HeatingWeekday[]): boolean {
  return days.every((day) => sameHeatingBlocks(expected[day], actual[day]));
}

/** One entry of `variables.tage` for the save automation. */
export interface HeatingSaveDay {
  tag: HeatingWeekday;
  bloecke: HeatingBlock[];
}

/** `variables.tage` for the save automation: `days` in week order, each with its sorted periods (only from/to). */
export function heatingSaveDays(week: HeatingWeek, days: readonly HeatingWeekday[]): HeatingSaveDay[] {
  return HEATING_WEEKDAYS.filter((day) => days.includes(day)).map((tag) => ({
    tag,
    bloecke: sortHeatingBlocks(week[tag]).map(({ from, to }) => ({ from, to })),
  }));
}

/** Days with the same periods, as the card lists them ("Werktags", "Wochenende"). */
export interface HeatingDayGroup {
  days: HeatingWeekday[];
  blocks: HeatingBlock[];
}

export type HeatingDayGroupKind = 'daily' | 'weekdays' | 'weekend' | 'custom';

/** The week as groups of days with equal periods, ordered by their first day (Monday first). */
export function heatingDayGroups(week: HeatingWeek): HeatingDayGroup[] {
  const groups: HeatingDayGroup[] = [];
  for (const day of HEATING_WEEKDAYS) {
    const blocks = sortHeatingBlocks(week[day]);
    const group = groups.find((g) => sameHeatingBlocks(g.blocks, blocks));
    if (group) group.days.push(day);
    else groups.push({ days: [day], blocks });
  }
  return groups;
}

/** How a group of days can be named: every day, Monday to Friday, Saturday and Sunday, or listed one by one. */
export function heatingDayGroupKind(days: readonly HeatingWeekday[]): HeatingDayGroupKind {
  const set = new Set(days);
  const is = (list: readonly HeatingWeekday[]) => set.size === list.length && list.every((d) => set.has(d));
  if (is(HEATING_WEEKDAYS)) return 'daily';
  if (is(HEATING_WEEKDAYS.slice(0, 5))) return 'weekdays';
  if (is(HEATING_WEEKDAYS.slice(5))) return 'weekend';
  return 'custom';
}

/** The weekday of `date` on the browser's clock. */
export function heatingWeekday(date: Date): HeatingWeekday {
  return HEATING_WEEKDAYS[(date.getDay() + 6) % 7]!;
}

// ---------------------------------------------------------------------------
// Status line ("Komfort bis 20:00", "Eco bis morgen 05:30", …)
// ---------------------------------------------------------------------------

export type HeatingPhase = 'off' | 'window' | 'comfort' | 'eco' | 'unknown';

/** When the current phase ends: a wall-clock time `dayOffset` days from today (0 = today, 1 = tomorrow, …, 7). */
export interface HeatingUntil {
  time: string;
  dayOffset: number;
  weekday: HeatingWeekday;
}

export interface HeatingPlanStatus {
  phase: HeatingPhase;
  /** Null when the phase does not end (eco without any period, comfort all week) or the end is unknown. */
  until: HeatingUntil | null;
}

export interface HeatingStatusInput {
  /** The room's automation is on. */
  automationOn: boolean;
  /** The schedule entity: true = on (comfort), false = off (eco), null = missing or unavailable. */
  scheduleOn: boolean | null;
  /** A window or door of the room is open: the automation turns the heating off. */
  windowOpen?: boolean;
  /** The schedule's periods, null while not loaded. */
  week: HeatingWeek | null;
  /** The schedule entity's `next_event` attribute, used when the end cannot be taken from `week`. */
  nextEvent?: string | null;
  now: Date;
}

/**
 * What the plan does now and until when. The phase follows the schedule entity's state, which is what the
 * automation acts on; the end comes from the periods (touching periods count as one, also across midnight) or, when
 * they are not loaded or do not fit the entity's state, from `next_event`.
 */
export function heatingPlanStatus(input: HeatingStatusInput): HeatingPlanStatus {
  if (!input.automationOn) return { phase: 'off', until: null };
  if (input.windowOpen) return { phase: 'window', until: null };
  const { week, now } = input;
  const day = (now.getDay() + 6) % 7;
  const minute = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const inBlock = week ? blockAt(week, day, minute) : null;
  const on = input.scheduleOn ?? (week ? inBlock !== null : null);
  if (on === null) return { phase: 'unknown', until: null };
  let until: HeatingUntil | null | undefined;
  if (week) {
    if (on && inBlock) until = comfortEnd(week, day, inBlock);
    else if (!on && !inBlock) until = ecoEnd(week, day, minute);
  }
  if (until === undefined) until = untilFromIso(input.nextEvent ?? null, now);
  return { phase: on ? 'comfort' : 'eco', until };
}

/** A day's periods, sorted; empty ones are left out (comfortEnd only ends because every period moves `end` on). */
function dayBlocks(week: HeatingWeek, day: number): HeatingBlock[] {
  return sortHeatingBlocks(week[HEATING_WEEKDAYS[day % 7]!].filter((b) => heatingMinutes(b.from) < heatingMinutes(b.to)));
}

function blockAt(week: HeatingWeek, day: number, minute: number): HeatingBlock | null {
  return dayBlocks(week, day).find((b) => heatingMinutes(b.from) <= minute && minute < heatingMinutes(b.to)) ?? null;
}

function untilAt(day: number, dayOffset: number, minutes: number): HeatingUntil {
  return { time: minutesToTime(minutes), dayOffset, weekday: HEATING_WEEKDAYS[(day + dayOffset) % 7]! };
}

/** The end of the comfort run that `block` (today) belongs to; null when it never ends. */
function comfortEnd(week: HeatingWeek, day: number, block: HeatingBlock): HeatingUntil | null {
  let offset = 0;
  let end = heatingMinutes(block.to);
  for (;;) {
    const blocks = dayBlocks(week, day + offset);
    if (end < DAY_MINUTES) {
      const next = blocks.find((b) => heatingMinutes(b.from) === end);
      if (!next) return untilAt(day, offset, end);
      end = heatingMinutes(next.to);
      continue;
    }
    const first = dayBlocks(week, day + offset + 1).find((b) => heatingMinutes(b.from) === 0);
    if (!first) return untilAt(day, offset, end);
    offset++;
    if (offset > 7) return null; // past the same weekday a week on: comfort without a gap all week
    end = heatingMinutes(first.to);
  }
}

/** The start of the next period after `minute` today; null when the week has none. */
function ecoEnd(week: HeatingWeek, day: number, minute: number): HeatingUntil | null {
  for (let offset = 0; offset <= 7; offset++) {
    for (const b of dayBlocks(week, day + offset)) {
      const from = heatingMinutes(b.from);
      if (offset > 0 || from > minute) return untilAt(day, offset, from);
    }
  }
  return null;
}

/** `next_event` (ISO) as an end on the browser's clock; midnight counts as `24:00` of the day before. */
function untilFromIso(iso: string | null, now: Date): HeatingUntil | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime()) || at.getTime() <= now.getTime()) return null;
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  let dayOffset = Math.round((startOf(at) - startOf(now)) / 86_400_000);
  let minutes = at.getHours() * 60 + at.getMinutes();
  if (minutes === 0 && dayOffset > 0) {
    dayOffset--;
    minutes = DAY_MINUTES;
  }
  return untilAt((now.getDay() + 6) % 7, dayOffset, minutes);
}
