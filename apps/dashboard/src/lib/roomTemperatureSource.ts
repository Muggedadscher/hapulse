/**
 * [fork] The rooms' chosen temperature sources (`customization.roomTemperatureSource`, area id → entity id; plan
 * /mnt/project-files/raumtemperatur/PLAN.md). Read wherever a room's temperature is shown and passed to core
 * `roomTemperature` / `withRoomTemperature` / `roomGlances`.
 */

import { useSettingsStore } from '../stores/settingsStore';

const NONE: Readonly<Record<string, string>> = Object.freeze({});

export function useRoomTemperatureSources(): Readonly<Record<string, string>> {
  return useSettingsStore((s) => s.customization.roomTemperatureSource) ?? NONE;
}
