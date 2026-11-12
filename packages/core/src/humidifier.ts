/**
 * [fork] Rules of the humidifier card (`humidifier.*`, e.g. a generic hygrostat driving a dehumidifier plug).
 *
 * HA reports what the device does in the attribute `action` (`drying`, `humidifying`, `idle`, `off`): a hygrostat
 * that is on but waits because the room is dry enough is `idle`. The card names that state in HA's own wording and
 * tints itself while the device works (Glas, like a heating or cooling thermostat).
 */

import type { HassEntity } from './types.js';

/** `active` while the device dries or humidifies, `idle` while it waits, `off` when switched off. */
export type HumidifierTone = 'active' | 'idle' | 'off';

export function humidifierTone(entity: HassEntity): HumidifierTone {
  if (entity.state !== 'on') return 'off';
  const action = entity.attributes['action'];
  if (action === 'drying' || action === 'humidifying') return 'active';
  if (action === 'off') return 'off';
  return 'idle';
}

export interface HumiditySetpoint {
  /** target humidity in %, null when the entity reports none */
  value: number | null;
  step: number;
  min: number;
  max: number;
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** Target, range and step from the entity's attributes (HA's defaults: 0–100 %, step 1 %). */
export function humiditySetpoint(attrs: Record<string, unknown>): HumiditySetpoint {
  const step = num(attrs['target_humidity_step']);
  const min = num(attrs['min_humidity']) ?? 0;
  const max = num(attrs['max_humidity']) ?? 100;
  return {
    value: num(attrs['humidity']) ?? null,
    step: step != null && step > 0 ? step : 1,
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}

/** Next target one step up/down from `from`, on the step grid, within min/max. */
export function stepHumidity(from: number, dir: 1 | -1, sp: HumiditySetpoint): number {
  const next = Math.round((from + dir * sp.step) / sp.step) * sp.step;
  return Math.round(Math.min(sp.max, Math.max(sp.min, next)) * 100) / 100;
}

/** The current humidity the entity reports, if any. */
export function currentHumidity(entity: HassEntity): number | null {
  return num(entity.attributes['current_humidity']) ?? null;
}
