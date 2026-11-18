/**
 * [fork] The home battery's charge limit, reserve and mode (plan glas/energie-neu/umsetzung/PLAN-E4-AKKU.md).
 *
 * Home Assistant's energy settings know none of the three. Without fixed entity ids and without settings of its own
 * (plan PLAN.md §1, §7) HAPulse finds them through the entity registry: the registry entry of the battery's charge
 * sensor (`stat_soc`) names its device and integration, and a profile per integration says which entities of that
 * device hold the values, by the end of their `unique_id` (set by the integration, never translated; the same way as
 * systemMonitor.ts). Only the same device and the same integration count. Unknown integration, missing entity, a value
 * that is not a number, or more than one battery: that value is absent and the card behaves as without it.
 *
 * E5 (PLAN-E4-AKKU.md, second part): the battery's window sets the three. `batteryControls` adds what that needs (the
 * entity, the range from the number's attributes, the select's options); `batterySlider` gives a slider its stops (the
 * grid of the range plus the value Home Assistant has, which may lie off it) and keeps the reserve below the charge
 * limit; `batteryWrites` turns a draft into Home Assistant calls in a safe order.
 */

import type { HassEntity, HassEntityMap, Registries } from './types.js';

export type BatteryModeKey = 'auto' | 'manual';

export interface BatteryProfile {
  /** the integration (registry `platform`) */
  platform: string;
  /** `unique_id` ending of the charge limit (`number`, %) */
  chargeLimit?: string;
  /** `unique_id` ending of the reserve, the discharge limit (`number`, %) */
  reserve?: string;
  /** `unique_id` ending of the operating mode (`select`) */
  mode?: string;
  /** `unique_id` ending of the signed power setpoint (`number`, W: plus charges, minus discharges; E5b) */
  setpoint?: string;
  /** the mode's options HAPulse names; any other is shown as Home Assistant reports it */
  modes?: Record<string, BatteryModeKey>;
}

/** One line per integration. Checked against the integration's source (aecc_battery: number.py, select.py). */
export const BATTERY_PROFILES: readonly BatteryProfile[] = [
  {
    platform: 'aecc_battery',
    chargeLimit: '_max_soc',
    reserve: '_min_soc',
    mode: '_work_mode',
    // the full ending: the deprecated unsigned power ends in `_power_setpoint` too
    setpoint: '_signed_power_setpoint',
    modes: { 'Self-Consumption (AI)': 'auto', 'Custom / Manual': 'manual' },
  },
];

export interface BatteryDetailIds {
  chargeLimit: string | null;
  reserve: string | null;
  mode: string | null;
  /** the power setpoint (E5b); with it HAPulse can steer the battery in the manual mode */
  setpoint: string | null;
  modes: Record<string, BatteryModeKey>;
}

/**
 * The entities of the one battery in Home Assistant's energy settings: its device is the charge sensor's (`socIds`), or
 * the power sensor's (`powerIds`) when the charge sensor has none (a template or helper sensor); the integration of the
 * device's entries picks the profile. Null with no or more than one battery, no device, no known integration, or when
 * the profile finds none of the three.
 */
export function findBatteryDetails(
  registries: Registries | null | undefined,
  socIds: readonly string[] | null | undefined,
  powerIds: readonly string[] = [],
  profiles: readonly BatteryProfile[] = BATTERY_PROFILES,
): BatteryDetailIds | null {
  if (!registries || !socIds || socIds.length !== 1) return null;
  const deviceOf = (id: string | undefined) => (id ? registries.entities.find((e) => e.entity_id === id)?.device_id : null) || null;
  const device = deviceOf(socIds[0]) ?? (powerIds.length === 1 ? deviceOf(powerIds[0]) : null);
  if (!device) return null;
  const onDevice = registries.entities.filter((e) => e.device_id === device && !e.disabled_by);
  const profile = profiles.find((p) => onDevice.some((e) => e.platform === p.platform));
  if (!profile) return null;
  const mine = onDevice.filter((e) => e.platform === profile.platform);
  // exactly one match; two entities with the same ending would be a guess
  const pick = (end: string | undefined, domain: string) => {
    if (!end) return null;
    const hits = mine.filter((e) => e.entity_id.startsWith(`${domain}.`) && (e.unique_id ?? '').endsWith(end));
    return hits.length === 1 ? (hits[0]?.entity_id ?? null) : null;
  };
  const ids: BatteryDetailIds = {
    chargeLimit: pick(profile.chargeLimit, 'number'),
    reserve: pick(profile.reserve, 'number'),
    mode: pick(profile.mode, 'select'),
    setpoint: pick(profile.setpoint, 'number'),
    modes: profile.modes ?? {},
  };
  return ids.chargeLimit || ids.reserve || ids.mode || ids.setpoint ? ids : null;
}

export interface BatteryDetails {
  /** the charge limit (%), when it is a number from 1 to 100 */
  chargeLimit: number | null;
  /** the reserve (%), when it is a number from 0 to below the charge limit (or 100) */
  reserve: number | null;
  /** the mode: HAPulse's name for it, else Home Assistant's option as it is */
  mode: { key: BatteryModeKey | null; raw: string } | null;
}

const NO_STATE = new Set(['unavailable', 'unknown', '']);

/** The three values right now; absent where the entity is missing, unavailable or out of range. */
export function batteryDetails(ids: BatteryDetailIds | null, entities: HassEntityMap): BatteryDetails {
  const num = (id: string | null) => {
    const s = id ? entities[id]?.state : undefined;
    if (s === undefined || NO_STATE.has(s)) return null;
    const v = Number(s);
    return Number.isFinite(v) ? v : null;
  };
  const limit = num(ids?.chargeLimit ?? null);
  const chargeLimit = limit !== null && limit > 0 && limit <= 100 ? limit : null;
  const res = num(ids?.reserve ?? null);
  const reserve = res !== null && res >= 0 && res < (chargeLimit ?? 100) ? res : null;
  const raw = ids?.mode ? entities[ids.mode]?.state : undefined;
  const mode = raw === undefined || NO_STATE.has(raw) ? null : { key: (ids && Object.hasOwn(ids.modes, raw) ? ids.modes[raw] : null) ?? null, raw };
  return { chargeLimit, reserve, mode };
}

// ---- E5: setting the three in the battery's window ----

/** A setting's values: from `min` to `max` in steps of `step` counted from `min` (Home Assistant's number attributes). */
export interface BatteryRange {
  min: number;
  max: number;
  step: number;
}

export interface BatteryLimitControl {
  entityId: string;
  /** the value now (checked like batteryDetails) */
  value: number;
  /** null when the entity names no usable range: then it is shown, not set */
  range: BatteryRange | null;
}

export interface BatteryModeOption {
  /** the option as Home Assistant has it (what `select.select_option` takes) */
  raw: string;
  key: BatteryModeKey | null;
}

export interface BatteryModeControl {
  entityId: string;
  raw: string;
  key: BatteryModeKey | null;
  /** the select's options in its order; empty when it names none (then the mode is shown, not set) */
  options: BatteryModeOption[];
}

export interface BatteryControls {
  chargeLimit: BatteryLimitControl | null;
  reserve: BatteryLimitControl | null;
  mode: BatteryModeControl | null;
}

/** The range of a number entity from its attributes; null when min or max is missing or they make no range. */
export function batteryRange(entity: HassEntity | undefined): BatteryRange | null {
  const a = entity?.attributes;
  if (!a) return null;
  const min = a['min'];
  const max = a['max'];
  const step = a['step'] ?? 1;
  if (typeof min !== 'number' || typeof max !== 'number' || typeof step !== 'number') return null;
  if (![min, max, step].every(Number.isFinite) || min >= max || step <= 0) return null;
  return { min, max, step };
}

/** The three with what the window needs to set them; a part is null where batteryDetails has no value. */
export function batteryControls(ids: BatteryDetailIds | null, entities: HassEntityMap): BatteryControls {
  const values = batteryDetails(ids, entities);
  const limit = (id: string | null, value: number | null): BatteryLimitControl | null =>
    id && value !== null ? { entityId: id, value, range: batteryRange(entities[id]) } : null;
  let mode: BatteryModeControl | null = null;
  if (ids?.mode && values.mode) {
    const raw = entities[ids.mode]?.attributes['options'];
    const keyOf = (o: string) => (Object.hasOwn(ids.modes, o) ? ids.modes[o] : null) ?? null;
    const options = Array.isArray(raw) ? raw.filter((o): o is string => typeof o === 'string' && o !== '').map((o) => ({ raw: o, key: keyOf(o) })) : [];
    mode = { entityId: ids.mode, raw: values.mode.raw, key: values.mode.key, options };
  }
  return {
    chargeLimit: limit(ids?.chargeLimit ?? null, values.chargeLimit),
    reserve: limit(ids?.reserve ?? null, values.reserve),
    mode,
  };
}

/** Float noise of the grid, in steps (steps like 0.1 do not add up exactly). */
const EPS = 1e-6;
const tidy = (v: number) => Math.round(v * 1e6) / 1e6;

export interface BatterySlider {
  /** the slider's stops in order: the grid of the entity's range and Home Assistant's value (which may lie off it) */
  stops: number[];
  /** the first and last stop (index) the slider may take now; the reserve stays below the charge limit, the limit above the reserve */
  first: number;
  last: number;
}

/**
 * A slider for the charge limit or the reserve: its stops are the grid of the entity's range (`min` + k × `step` up to
 * `max`) plus `keep`, Home Assistant's value — 98 % set in the battery's app stays reachable, and going back to it
 * counts as untouched. `other` is the other value (the draft): only stops below the charge limit, or above the
 * reserve, may be taken. Null when no stop is left to take.
 */
export function batterySlider(knob: 'chargeLimit' | 'reserve', range: BatteryRange, keep: number | null, other: number | null): BatterySlider | null {
  const n = Math.floor((range.max - range.min) / range.step + EPS);
  const grid = Array.from({ length: n + 1 }, (_, k) => tidy(range.min + k * range.step));
  const stops = keep === null || grid.some((g) => Math.abs(g - keep) <= EPS) ? grid : [...grid, keep].sort((a, b) => a - b);
  const ok = (v: number) => other === null || (knob === 'reserve' ? v < other - EPS : v > other + EPS);
  const first = stops.findIndex(ok);
  if (first < 0) return null;
  let last = first;
  while (last + 1 < stops.length && ok(stops[last + 1]!)) last++;
  return { stops, first, last };
}

/** What the window would set; null = left as it is. */
export interface BatteryDraft {
  mode: string | null;
  chargeLimit: number | null;
  reserve: number | null;
}

export type BatteryWrite =
  | { part: 'mode'; domain: 'select'; service: 'select_option'; entityId: string; data: { option: string } }
  | { part: 'chargeLimit' | 'reserve'; domain: 'number'; service: 'set_value'; entityId: string; data: { value: number } };

/**
 * The calls that make Home Assistant match the draft, only for what differs: first the two limits, in the order that
 * keeps the reserve below the charge limit in between — the reserve first when it fits under the limit now, else the
 * limit (one of the two orders always works, since before and after are valid) — and the mode last: a switch of the
 * mode takes the battery over from its app, so it comes after the harmless calls have shown the battery answers, and
 * the new mode starts with the new limits.
 */
export function batteryWrites(controls: BatteryControls, draft: BatteryDraft): BatteryWrite[] {
  const out: BatteryWrite[] = [];
  const { mode, chargeLimit, reserve } = controls;
  const write = (part: 'chargeLimit' | 'reserve', c: BatteryLimitControl | null, v: number | null): BatteryWrite | null =>
    c && v !== null && Math.abs(v - c.value) > EPS ? { part, domain: 'number', service: 'set_value', entityId: c.entityId, data: { value: v } } : null;
  const lim = write('chargeLimit', chargeLimit, draft.chargeLimit);
  const res = write('reserve', reserve, draft.reserve);
  const reserveFirst = res !== null && draft.reserve !== null && (chargeLimit === null || draft.reserve < chargeLimit.value);
  for (const w of reserveFirst ? [res, lim] : [lim, res]) if (w) out.push(w);
  if (mode && draft.mode !== null && draft.mode !== mode.raw) {
    out.push({ part: 'mode', domain: 'select', service: 'select_option', entityId: mode.entityId, data: { option: draft.mode } });
  }
  return out;
}
