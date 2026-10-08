/**
 * [fork] Glas overview — small rules for the main-room card and the device tiles (docs/GLAS-DESIGN.md §7.8, §7.10;
 * plan docs/glas/PLAN-ETAPPE-4.md K83). Pure, tested in scripts/smoke.mjs.
 *
 * `roomGlances`: the values `roomSummary` shows (the first temperature sensor with a number, else the first climate
 * entity's current temperature; the first humidity sensor with a number) together with the entity each comes from,
 * so a tap on the capsule opens that entity's detail.
 * `lightPercent`: a light's brightness in percent while it is on (HA reports 0–255), else null.
 * `climateTone`: the colour a thermostat shows (what it does now, else auto mode, else idle), the rule of the home
 * climate card's `hvacColorKey`.
 */

import type { HassEntity, HassEntityMap, Room } from './types.js';

export interface RoomGlance {
  kind: 'temperature' | 'humidity';
  entityId: string;
  value: number;
  /** The sensor's `unit_of_measurement`; null for a climate entity's current temperature. */
  unit: string | null;
}

function unitOf(entity: HassEntity): string | null {
  const unit = entity.attributes['unit_of_measurement'];
  return typeof unit === 'string' && unit.length > 0 ? unit : null;
}

export function roomGlances(room: Room, entities: HassEntityMap): RoomGlance[] {
  let temperature: RoomGlance | undefined;
  let humidity: RoomGlance | undefined;
  for (const id of room.domains['sensor'] ?? []) {
    const entity = entities[id];
    if (!entity) continue;
    const dc = entity.attributes['device_class'];
    const value = parseFloat(entity.state);
    if (isNaN(value)) continue;
    if (dc === 'temperature' && !temperature) temperature = { kind: 'temperature', entityId: id, value, unit: unitOf(entity) };
    if (dc === 'humidity' && !humidity) humidity = { kind: 'humidity', entityId: id, value, unit: unitOf(entity) };
  }
  if (!temperature) {
    // like roomSummary: only the first climate entity that exists
    for (const id of room.domains['climate'] ?? []) {
      const entity = entities[id];
      if (!entity) continue;
      const cur = entity.attributes['current_temperature'];
      if (typeof cur === 'number') temperature = { kind: 'temperature', entityId: id, value: cur, unit: null };
      break;
    }
  }
  const out: RoomGlance[] = [];
  if (temperature) out.push(temperature);
  if (humidity) out.push(humidity);
  return out;
}

export function lightPercent(entity: HassEntity): number | null {
  if (entity.state !== 'on') return null;
  const b = entity.attributes['brightness'];
  if (typeof b !== 'number' || !Number.isFinite(b)) return null;
  return Math.max(1, Math.min(100, Math.round((b / 255) * 100)));
}

export type ClimateTone = 'heat' | 'cool' | 'auto' | 'idle';

export function climateTone(entity: HassEntity): ClimateTone {
  const action = entity.attributes['hvac_action'];
  if (action === 'heating') return 'heat';
  if (action === 'cooling') return 'cool';
  if (entity.state === 'auto' || entity.state === 'heat_cool') return 'auto';
  return 'idle';
}
