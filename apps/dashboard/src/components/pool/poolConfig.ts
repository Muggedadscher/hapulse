/**
 * [fork] Pool page — entity wiring.
 *
 * HAPulse builds its pages from Home Assistant entities, and this fork's Pool
 * page targets a specific pool-pump setup. Rather than scatter these entity_ids
 * through the components, they live here as named roles. If the underlying HA
 * entities are ever renamed, this is the single place to update.
 *
 * The page self-hides when the core entities are absent (see `usePoolPresent`),
 * so shipping these defaults is harmless for installs without a pool.
 */

import type { PoolWeekday } from '@hapulse/core';
import type { TKey } from '../../i18n/useT';

/** Weekday → i18n key, shared by the schedule card and its editor. */
export const POOL_WEEKDAY_KEYS: Record<PoolWeekday, TKey> = {
  mon: 'pool.weekday.mon', tue: 'pool.weekday.tue', wed: 'pool.weekday.wed',
  thu: 'pool.weekday.thu', fri: 'pool.weekday.fri', sat: 'pool.weekday.sat', sun: 'pool.weekday.sun',
};

export const POOL_ENTITIES = {
  /** input_select with the operating mode (off / automatic / manual). */
  mode: 'input_select.modus_poolpumpe',
  /** The actual pump switch (ESPHome). */
  pump: 'switch.esppoolpumpe_poolpumpe',
  /** Hardware "bypass" switch on the pump controller. */
  bypass: 'switch.esppoolpumpe_schalter_uberbrucken',
  /** Countdown timer that runs while the pump is in manual mode. */
  manualTimer: 'timer.poolpumpe_manuell',
  /** Live solar production feeding the solar automation. */
  solarPower: 'sensor.balkonkraftwerk_power',
  /** Editable switch-on threshold for the solar automation. */
  solarThreshold: 'input_number.schwellwert_poolpumpe_solarleistung',
  /** Binary sensor: is solar production above the threshold. */
  solarExceeded: 'binary_sensor.schwellwert_poolpumpe_solarleistung',
  /** The scheduler-component switch entity behind the schedule editor. */
  scheduleSwitch: 'switch.schedule_zeitplan_poolpumpe',
  /** The input_boolean the schedule toggles on/off. */
  scheduleBoolean: 'input_boolean.poolpumpe_zeitplan',
  /** Live estimated power draw of the pump (W) — used for the history chart. */
  power: 'sensor.geschatzter_verbrauch_poolpumpe_power',
  /** Total pump runtime today. */
  runtimeToday: 'sensor.laufzeit_poolpumpe_heute',
  /** Estimated pump energy — today / this week / this month. */
  consumptionToday: 'sensor.geschatzter_verbrauch_poolpumpe_energy_daily',
  consumptionWeek: 'sensor.geschatzter_verbrauch_poolpumpe_energy_weekly',
  consumptionMonth: 'sensor.geschatzter_verbrauch_poolpumpe_energy_monthly',
  /** Button that reboots the pump controller. */
  restartButton: 'button.poolpumpe_esppoolpumpe_geraeteneustart',
} as const;

/** The entities that must exist for the Pool page to be meaningful. */
export const POOL_REQUIRED_ENTITIES: string[] = [
  POOL_ENTITIES.mode,
  POOL_ENTITIES.pump,
];

export type PoolModeTone = 'off' | 'auto' | 'manual' | 'neutral';

/**
 * Classify an input_select mode option into a semantic tone, so the segmented
 * control can show the right icon/colour without hard-coding the German option
 * strings. Falls back to `neutral` for anything unrecognised — the option label
 * still comes straight from Home Assistant.
 *
 * Auto/manual are matched first (more specific), then "off": the short off
 * tokens (`aus`/`off`/`av`) are word-boundary-anchored so a label that merely
 * *contains* them (e.g. "Pause") isn't mis-classified as off.
 */
export function poolModeTone(option: string): PoolModeTone {
  const o = option.toLowerCase();
  if (/(auto|automat)/.test(o)) return 'auto';
  if (/(manu|hand)/.test(o)) return 'manual';
  if (/\b(aus|off|av)\b|ausgeschal|apagad|arret|arrêt|spent|deslig/.test(o)) return 'off';
  return 'neutral';
}
