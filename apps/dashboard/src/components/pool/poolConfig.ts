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
  /** Chosen duration (minutes) for a manual run started from HAPulse. */
  manualDuration: 'input_number.poolpumpe_manuell_dauer',
  /** HA script that (re)starts the manual timer with the stored duration — used when the mode is ALREADY Manuell
   *  (re-selecting the option changes no state, so the automation would not run; same as the Siri automation). */
  manualRestartScript: 'script.pool_manuell_timer_starten',
  /** Configurable duration (minutes) for a start via Siri / the Apple-Home switch. */
  siriDuration: 'input_number.poolpumpe_siri_dauer',
  /** Live solar production (the balcony panels on the home battery's PV input), shown with the sun threshold. */
  solarPower: 'sensor.batteriespeicher_pv_power',
  /** Editable sun threshold: from it on the pump may run on sun while the daily filter time is not met yet. */
  solarThreshold: 'input_number.schwellwert_poolpumpe_solarleistung',
  /** Binary sensor: is solar production above the threshold. */
  solarExceeded: 'binary_sensor.schwellwert_poolpumpe_solarleistung',
  /** The scheduler-component switch entity behind the schedule editor. */
  scheduleSwitch: 'switch.schedule_zeitplan_poolpumpe',
  /** The input_boolean the schedule toggles on/off. */
  scheduleBoolean: 'input_boolean.poolpumpe_zeitplan',
  /** Total pump runtime today (resets at midnight) — drives the runtime chart. */
  runtimeToday: 'sensor.laufzeit_poolpumpe_heute',
  /** Estimated pump energy — today / this week / this month. */
  consumptionToday: 'sensor.geschatzter_verbrauch_poolpumpe_energy_daily',
  consumptionWeek: 'sensor.geschatzter_verbrauch_poolpumpe_energy_weekly',
  consumptionMonth: 'sensor.geschatzter_verbrauch_poolpumpe_energy_monthly',
  /** Home battery: state of charge (%) and its charge limit (the surplus' "on from" above it is never reached). */
  batterySoc: 'sensor.batteriespeicher_battery_soc',
  batteryChargeLimit: 'number.batteriespeicher_charge_limit',
  /** Battery surplus: the pump may run from this charge on (%), and stops below the other one (%). */
  surplusOn: 'input_number.poolpumpe_akku_uberschuss_ab',
  surplusOff: 'input_number.poolpumpe_akku_uberschuss_aus_unter',
  /** HA's memory of the surplus between the two limits (the hysteresis), set by automation.pool_akku_uberschuss_merken. */
  surplusActive: 'input_boolean.poolpumpe_akku_uberschuss_aktiv',
  /** Off until a grid meter makes the battery feed the house (zero feed-in): without it the pump would run from the grid. */
  zeroFeedIn: 'input_boolean.poolpumpe_nulleinspeisung_aktiv',
  /** Daily filter time (h) and the time of day it should be reached by (input_datetime, time only). */
  dailyTarget: 'input_number.poolpumpe_tagesziel',
  finishBy: 'input_datetime.poolpumpe_tagesziel_fertig_bis',
  /** Timestamp sensor: the latest start that still reaches the target (`unknown` once HA gave up for the day). */
  mustRunFrom: 'sensor.poolpumpe_pflichtlauf_ab',
  /** input_select: why Automatik runs the pump right now (Akku voll, Sonne, Tagesziel, Zeitplan, Mindestlaufzeit, Keiner). */
  reason: 'input_select.poolpumpe_grund',
  /** Button that reboots the pump controller. */
  restartButton: 'button.poolpumpe_esppoolpumpe_geraeteneustart',
} as const;

/** The entities that must exist for the Pool page to be meaningful. */
export const POOL_REQUIRED_ENTITIES: string[] = [
  POOL_ENTITIES.mode,
  POOL_ENTITIES.pump,
];

/** The pool chip window shows the daily filter time when these exist (the runtime sensor and the target helper). */
export const POOL_TARGET_ENTITIES: string[] = [POOL_ENTITIES.dailyTarget, POOL_ENTITIES.runtimeToday];

/** The pool chip window shows the battery's charge when these exist. */
export const POOL_BATTERY_ENTITIES: string[] = [POOL_ENTITIES.batterySoc, POOL_ENTITIES.surplusOn, POOL_ENTITIES.surplusOff];

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
