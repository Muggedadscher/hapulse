/**
 * [fork] The home battery's charge limit, reserve and mode (plan glas/energie-neu/umsetzung/PLAN-E4-AKKU.md).
 *
 * Home Assistant's energy settings know none of the three. Without fixed entity ids and without settings of its own
 * (plan PLAN.md §1, §7) HAPulse finds them through the entity registry: the registry entry of the battery's charge
 * sensor (`stat_soc`) names its device and integration, and a profile per integration says which entities of that
 * device hold the values, by the end of their `unique_id` (set by the integration, never translated; the same way as
 * systemMonitor.ts). Only the same device and the same integration count. Unknown integration, missing entity, a value
 * that is not a number, or more than one battery: that value is absent and the card behaves as without it.
 */

import type { HassEntityMap, Registries } from './types.js';

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
    modes: { 'Self-Consumption (AI)': 'auto', 'Custom / Manual': 'manual' },
  },
];

export interface BatteryDetailIds {
  chargeLimit: string | null;
  reserve: string | null;
  mode: string | null;
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
    modes: profile.modes ?? {},
  };
  return ids.chargeLimit || ids.reserve || ids.mode ? ids : null;
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
