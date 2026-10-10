/**
 * [fork] The temperature unit Home Assistant is set to (its unit system, `get_config` → `unit_system.temperature`).
 *
 * HA reports every climate temperature (current, target, min, max) in this unit; a climate entity carries no unit of
 * its own. The climate cards used to guess °F from `max_temp > 60`, which turned Celsius thermostats with a high
 * maximum (some report 90) into Fahrenheit: Glas wrote "°F" and both styles drew the ring on the °F scale.
 *
 * Subscribed per connection (connectionStore.wireConnection), refreshed by the library on `core_config_updated` and
 * after a reconnect; the demo data is in °C. Null while unknown: the cards then write "°" without a letter and use
 * HA's Celsius defaults, never a guess from the values.
 */

import { create } from 'zustand';
import type { HAConnection, UnsubscribeFunc } from '@hapulse/core';

export type TemperatureUnit = '°C' | '°F';

/** HA's `unit_system.temperature`; anything else (missing, Kelvin) counts as unknown. */
export function parseTemperatureUnit(value: unknown): TemperatureUnit | null {
  return value === '°C' || value === '°F' ? value : null;
}

const useUnitStore = create<{ unit: TemperatureUnit | null }>()(() => ({ unit: null }));

let _unsub: UnsubscribeFunc | null = null;

/** Follow the unit of a live connection. */
export function startTemperatureUnit(conn: Pick<HAConnection, 'subscribeConfig'>): void {
  stopTemperatureUnit();
  _unsub = conn.subscribeConfig((config) => {
    useUnitStore.setState({ unit: parseTemperatureUnit(config.unit_system?.temperature) });
  });
}

/** Demo mode: the demo entities are in °C. */
export function startDemoTemperatureUnit(): void {
  stopTemperatureUnit();
  useUnitStore.setState({ unit: '°C' });
}

/** Connection torn down: unknown until the next one reports its unit. */
export function stopTemperatureUnit(): void {
  _unsub?.();
  _unsub = null;
  useUnitStore.setState({ unit: null });
}

export function getTemperatureUnit(): TemperatureUnit | null {
  return useUnitStore.getState().unit;
}

export function useTemperatureUnit(): TemperatureUnit | null {
  return useUnitStore((s) => s.unit);
}
