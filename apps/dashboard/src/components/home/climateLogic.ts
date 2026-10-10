/**
 * [fork] Setpoint rules of the home climate card (unit-tested).
 *
 * The card stepped by a fixed 1°, never clamped, fell back to the CURRENT temperature as the setpoint for
 * thermostats without a single `temperature` (heat_cool: target_temp_low/high → a set_temperature of e.g.
 * 22.4 was sent), and drew its gauge on a fixed 15–30 scale (always full in °F).
 * The unit is the one HA is set to (ha/temperatureUnit.ts); guessing °F from `max_temp > 60` misread Celsius
 * thermostats that report a maximum of 90.
 */

import type { TemperatureUnit } from '../../ha/temperatureUnit';

export interface ClimateSetpoint {
  /** single target temperature, null when the thermostat has none (range mode / off) */
  value: number | null;
  step: number;
  min: number;
  max: number;
  fahrenheit: boolean;
  /** HA's temperature unit, null while not known yet */
  unit: TemperatureUnit | null;
  /** decimals to display (steps below 1°) */
  decimals: number;
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

export function climateSetpoint(attrs: Record<string, unknown>, unit: TemperatureUnit | null): ClimateSetpoint {
  const maxTemp = num(attrs['max_temp']);
  // HA reports climate temperatures in its own unit (no unit per entity); unknown → its Celsius defaults, no guess
  const fahrenheit = unit === '°F';
  const step = num(attrs['target_temp_step']) ?? (fahrenheit ? 1 : 0.5); // HA frontend default
  return {
    value: num(attrs['temperature']) ?? null,
    step,
    min: num(attrs['min_temp']) ?? (fahrenheit ? 45 : 7),
    max: maxTemp ?? (fahrenheit ? 95 : 35),
    fahrenheit,
    unit,
    decimals: step < 1 ? 1 : 0,
  };
}

/** Next setpoint one step up/down from `from`, on the step grid, within min/max. */
export function stepSetpoint(from: number, dir: 1 | -1, sp: ClimateSetpoint): number {
  const next = Math.round((from + dir * sp.step) / sp.step) * sp.step;
  return Math.round(Math.min(sp.max, Math.max(sp.min, next)) * 100) / 100;
}

/** Gauge scale: the card's 15–30 °C, the same span in °F. */
export function gaugeRange(sp: ClimateSetpoint): { min: number; max: number } {
  return sp.fahrenheit ? { min: 59, max: 86 } : { min: 15, max: 30 };
}
