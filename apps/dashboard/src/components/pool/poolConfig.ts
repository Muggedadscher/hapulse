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
 */
export function poolModeTone(option: string): PoolModeTone {
  const o = option.toLowerCase();
  if (/(aus|off|ausgeschal|apagad|arrêt|spent|deslig|\bav\b)/.test(o)) return 'off';
  if (/(auto|automat)/.test(o)) return 'auto';
  if (/(manu|hand)/.test(o)) return 'manual';
  return 'neutral';
}
