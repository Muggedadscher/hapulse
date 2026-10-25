/**
 * [fork] Setting up a room's heating plan with one button (plan: glas/heizung-zeitplan/PLAN-ETAPPE-4.md in the
 * project files) — the rules without Home Assistant calls: which rooms have a thermostat but no plan, the ids of the
 * new entries, the start values and the automation's config. The calls and their order are in
 * apps/dashboard/src/ha/heatingSetup.ts.
 *
 * A thermostat counts as controlled when an automation from the Advanced Heating blueprint uses it, in whatever area
 * and with or without the label (`search/related`, which every user may ask): so a setup never puts a second
 * automation on the same thermostat. A room counts as set up when an automation with the label sits in its area
 * (findHeatingPlans), also when that automation is unavailable. The label `ohne_heizplan` on a thermostat means "no
 * plan wanted" (an air conditioner, say) and takes its room out of the hints.
 */

import { domainOf } from './domain.js';
import { buildDeviceAreaMap, resolveEntityAreaId } from './rooms.js';
import type { HeatingPlanEntities } from './heatingPlan.js';
import type { HassEntity, HassEntityMap, Registries } from './types.js';

/** The blueprint behind every room's plan (`use_blueprint.path`). */
export const HEATING_BLUEPRINT_PATH = 'panhans/advanced_heating_control.yaml';
/** Label id on a thermostat whose room gets no plan ("Nicht einrichten"). */
export const HEATING_SKIP_LABEL = 'ohne_heizplan';
export const HEATING_SKIP_LABEL_NAME = 'Ohne Heizplan';
/** Name of the label `heizplan` (heatingPlanLabel.ts), when it has to be created. */
export const HEATING_PLAN_LABEL_NAME = 'Heizplan';
/** The categories the existing entries use, per scope of HA's category registry. */
export const HEATING_AUTOMATION_CATEGORY = 'Heizung Zeitplan';
export const HEATING_HELPER_CATEGORY = 'Zeitplan';
/** Range of the temperature helpers, narrowed to what the thermostats accept. */
export const HEATING_SETUP_MIN = 5;
export const HEATING_SETUP_MAX = 30;

/**
 * The room part of the new ids: lower case, umlauts as ae/oe/ue, ß as ss, other accents dropped, everything else
 * `_` ("Küche" → `kueche`, "Zimmer Jannick" → `zimmer_jannick`), as the entries of the existing rooms are named.
 */
export function heatingRoomSlug(name: string): string {
  const slug = name
    .normalize('NFC')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'raum';
}

/** The automation's config id: fixed per area, so a second setup overwrites instead of adding a second automation. */
export function heatingSetupAutomationId(areaId: string): string {
  return `heizplan_${areaId.replace(/[^A-Za-z0-9_]/g, '_')}`;
}

function hvacModes(entity: HassEntity | undefined): string[] {
  const modes = entity?.attributes['hvac_modes'];
  return Array.isArray(modes) ? modes.map(String) : [];
}

/** The thermostat offers heating. */
export function heatingCanHeat(entity: HassEntity | undefined): boolean {
  return hvacModes(entity).includes('heat');
}

/** The device can also cool: not chosen in advance, the plan would put it on heat (an air conditioner). */
export function heatingCanCool(entity: HassEntity | undefined): boolean {
  const modes = hvacModes(entity);
  return modes.includes('cool') || modes.includes('heat_cool');
}

export interface HeatingSetupRoom {
  areaId: string;
  name: string;
  /** The thermostats no plan controls, sorted by entity id. */
  thermostats: string[];
  /** Every one of them carries the label "Ohne Heizplan". */
  skipped: boolean;
}

export interface HeatingSetupInput {
  registries: Registries;
  entities: HassEntityMap;
  /** findHeatingPlans(registries). */
  plans: Record<string, HeatingPlanEntities>;
  /** Thermostats an automation from the blueprint uses (heatingCoveredThermostats). */
  covered: ReadonlySet<string>;
}

/**
 * The rooms with a thermostat that no plan controls, and no plan in the room, sorted by name. A thermostat counts when
 * it is enabled, not hidden, reachable and offers heating; an unavailable one says nothing (it may be back in a
 * minute).
 */
export function findHeatingSetupRooms(input: HeatingSetupInput): HeatingSetupRoom[] {
  const { registries, entities, plans, covered } = input;
  const deviceAreas = buildDeviceAreaMap(registries.devices);
  const names = new Map(registries.areas.map((a) => [a.area_id, a.name]));
  const byArea = new Map<string, { ids: string[]; skipped: boolean }>();
  const entries = [...registries.entities].sort((a, b) => a.entity_id.localeCompare(b.entity_id));
  for (const entry of entries) {
    if (domainOf(entry.entity_id) !== 'climate' || entry.disabled_by != null || entry.hidden_by != null) continue;
    const areaId = resolveEntityAreaId(entry, deviceAreas);
    if (areaId === null || !names.has(areaId) || plans[areaId]) continue;
    const state = entities[entry.entity_id];
    if (!state || state.state === 'unavailable' || state.state === 'unknown') continue;
    if (!heatingCanHeat(state) || covered.has(entry.entity_id)) continue;
    const room = byArea.get(areaId) ?? { ids: [], skipped: true };
    room.ids.push(entry.entity_id);
    room.skipped = room.skipped && (entry.labels?.includes(HEATING_SKIP_LABEL) ?? false);
    byArea.set(areaId, room);
  }
  return [...byArea]
    .map(([areaId, room]) => ({ areaId, name: names.get(areaId) ?? areaId, thermostats: room.ids, skipped: room.skipped }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.areaId.localeCompare(b.areaId));
}

/** The values of one `search/related` answer under `key` (`automation`, `entity`, …). */
export function heatingRelatedIds(result: unknown, key: string): string[] {
  if (result == null || typeof result !== 'object') return [];
  const list = (result as Record<string, unknown>)[key];
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
}

/**
 * The thermostats in the `search/related` answers of the blueprint's automations (`related[i]` belongs to
 * `automations[i]`). The room's own setup automation (`heizplan_<area>`) does not cover the thermostats of its room: a
 * setup that stopped before giving it label and area keeps the room's button, and pressing it finishes the setup (a
 * finished one makes the room a plan room anyway).
 */
export function heatingCoveredThermostats(automations: readonly string[], related: readonly unknown[], registries: Registries): Set<string> {
  const deviceAreas = buildDeviceAreaMap(registries.devices);
  const byId = new Map(registries.entities.map((e) => [e.entity_id, e]));
  const covered = new Set<string>();
  automations.forEach((automation, i) => {
    const own = byId.get(automation);
    const configId = own?.platform === 'automation' ? own.unique_id : undefined;
    for (const id of heatingRelatedIds(related[i], 'entity')) {
      if (domainOf(id) !== 'climate') continue;
      const entry = byId.get(id);
      const areaId = entry ? resolveEntityAreaId(entry, deviceAreas) : null;
      if (configId && areaId !== null && heatingSetupAutomationId(areaId) === configId) continue;
      covered.add(id);
    }
  });
  return covered;
}

export interface HeatingSetupContact {
  id: string;
  /** Windows and openings are chosen in advance, doors are offered. */
  preselected: boolean;
}

/**
 * The contacts the window may offer among the room's `entityIds`: binary sensors of class window or opening (chosen)
 * and door (offered); garage doors and everything else are left out. Chosen ones first.
 */
export function heatingSetupContacts(entityIds: readonly string[], entities: HassEntityMap): HeatingSetupContact[] {
  const out: HeatingSetupContact[] = [];
  for (const id of entityIds) {
    if (domainOf(id) !== 'binary_sensor') continue;
    const dc = String(entities[id]?.attributes['device_class'] ?? '');
    if (dc === 'window' || dc === 'opening') out.push({ id, preselected: true });
    else if (dc === 'door') out.push({ id, preselected: false });
  }
  return out.sort((a, b) => Number(b.preselected) - Number(a.preselected) || a.id.localeCompare(b.id));
}

export interface HeatingSetupTemps {
  min: number;
  max: number;
  step: number;
  comfort: number;
  eco: number;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** `value` on the grid of `step`, within `min`…`max`. */
export function heatingSnapTemp(value: number, t: Pick<HeatingSetupTemps, 'min' | 'max' | 'step'>): number {
  const snapped = Math.round(value / t.step) * t.step;
  const inRange = Math.min(t.max, Math.max(t.min, snapped));
  return Math.round(inRange * 100) / 100;
}

/**
 * Range, step and start values of the helpers for `thermostats`: the narrowest range all of them accept within 5–30 °C,
 * the coarsest step, and as start for comfort and eco the target of the first one that is not off (else the minimum).
 * Equal values: the room's temperature only changes once times are entered.
 */
export function heatingSetupTemps(thermostats: readonly (HassEntity | undefined)[]): HeatingSetupTemps {
  const list = thermostats.filter((t): t is HassEntity => t !== undefined);
  const mins = list.map((t) => num(t.attributes['min_temp'])).filter((v): v is number => v !== null);
  const maxs = list.map((t) => num(t.attributes['max_temp'])).filter((v): v is number => v !== null);
  const steps = list.map((t) => num(t.attributes['target_temp_step'])).filter((v): v is number => v !== null && v > 0);
  let min = Math.max(HEATING_SETUP_MIN, ...mins);
  let max = Math.min(HEATING_SETUP_MAX, ...maxs);
  if (!(min < max)) {
    min = HEATING_SETUP_MIN;
    max = HEATING_SETUP_MAX;
  }
  const step = steps.length > 0 ? Math.min(5, Math.max(...steps)) : 0.5;
  const running = list.find((t) => t.state !== 'off' && num(t.attributes['temperature']) !== null);
  const start = heatingSnapTemp(running ? (running.attributes['temperature'] as number) : min, { min, max, step });
  return { min, max, step, comfort: start, eco: start };
}

/** Ids of the helpers and the schedule (storage ids; the entity ids follow from them, see heatingSuffixedEntityId). */
export interface HeatingSetupIds {
  comfort: string;
  eco: string;
  schedule: string;
}

/** A stored helper or schedule (`input_number/list`, `schedule/list`) with the area of its registry entry. */
export interface HeatingStoredItem {
  id: string;
  areaId: string | null;
  /** A helper from YAML: shares the id space with the stored ones, but is never taken over. */
  yaml?: boolean;
}

/**
 * The ids for a room: `heizplan_<slug>_komfort`, `heizplan_<slug>_eco`, `zeitplan_heizung_<slug>`, or with `_2`, `_3`, …
 * after the slug while one of them belongs to another room or comes from YAML. An existing stored one in this room or in
 * none (an earlier setup that stopped halfway) is taken over.
 */
export function heatingSetupIds(
  slug: string,
  areaId: string,
  inputNumbers: readonly HeatingStoredItem[],
  schedules: readonly HeatingStoredItem[],
): HeatingSetupIds {
  const free = (list: readonly HeatingStoredItem[], id: string) => {
    const item = list.find((x) => x.id === id);
    return !item || (item.yaml !== true && (item.areaId === null || item.areaId === areaId));
  };
  for (let n = 1; n < 100; n++) {
    const sfx = n === 1 ? '' : `_${n}`;
    const ids = { comfort: `heizplan_${slug}${sfx}_komfort`, eco: `heizplan_${slug}${sfx}_eco`, schedule: `zeitplan_heizung_${slug}${sfx}` };
    if (free(inputNumbers, ids.comfort) && free(inputNumbers, ids.eco) && free(schedules, ids.schedule)) return ids;
  }
  throw new Error('heating setup: no free id');
}

/**
 * HA gives a new entity `_2` at the end when its entity id is taken; HAPulse finds the helpers by `_komfort`/`_eco` at
 * the end (findHeatingPlans). The entity id to rename to (number before the ending), or null when it already ends so.
 */
export function heatingSuffixedEntityId(entityId: string, suffix: '_komfort' | '_eco', taken: ReadonlySet<string>): string | null {
  if (entityId.endsWith(suffix)) return null;
  const dot = entityId.indexOf('.');
  const domain = entityId.slice(0, dot);
  let stem = entityId.slice(dot + 1).replace(/_\d+$/, '');
  if (stem.endsWith(suffix)) stem = stem.slice(0, -suffix.length);
  for (let k = 2; k < 100; k++) {
    const candidate = `${domain}.${stem}_${k}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return null;
}

export interface HeatingAutomationInput {
  roomName: string;
  description: string;
  thermostats: readonly string[];
  contacts: readonly string[];
  /** Entity ids of the schedule and the helpers. */
  schedule: string;
  comfort: string;
  eco: string;
  /** The fixed fallback values (the start values). */
  comfortValue: number;
  ecoValue: number;
}

/**
 * The automation's config for `POST /api/config/automation/config/<id>`, with the inputs of the living room and the
 * WC: thermostats, contacts, schedule, both helpers and their fixed fallbacks; "physical change" off, no room sensor
 * and no calibration.
 */
export function heatingAutomationConfig(a: HeatingAutomationInput): Record<string, unknown> {
  const input: Record<string, unknown> = {
    input_log_level: 'info',
    input_physical_change: false,
    input_schedulers: [a.schedule],
    input_temperature_comfort: a.comfort,
    input_temperature_comfort_static: a.comfortValue,
    input_temperature_eco: a.eco,
    input_temperature_eco_static: a.ecoValue,
    input_trvs: [...a.thermostats],
  };
  if (a.contacts.length > 0) input['input_windows'] = [...a.contacts];
  return {
    alias: `Advanced Heating ${a.roomName}`,
    description: a.description,
    use_blueprint: { path: HEATING_BLUEPRINT_PATH, input },
  };
}

/** A thermostat's state before the setup, for the automation's description (and setting it back by hand). */
export interface HeatingPriorState {
  name: string;
  /** `off`, `heat`, … */
  mode: string;
  temperature: number | null;
}

export function heatingPriorStates(thermostats: readonly (HassEntity | undefined)[]): HeatingPriorState[] {
  return thermostats
    .filter((t): t is HassEntity => t !== undefined)
    .map((t) => ({
      name: String(t.attributes['friendly_name'] ?? t.entity_id),
      mode: t.state,
      temperature: num(t.attributes['temperature']),
    }));
}
