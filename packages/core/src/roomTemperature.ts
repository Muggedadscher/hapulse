/**
 * [fork] Where a room's temperature comes from (plan /mnt/project-files/raumtemperatur/PLAN.md). Pure, tested in
 * scripts/smoke.mjs.
 *
 * Automatic (no choice, or a choice that no longer belongs to the room): the rule `roomSummary` has always used —
 * the first temperature sensor with a number, else the first climate entity's current temperature. A kitchen oven's
 * cavity sensor is a temperature sensor too, so an admin can pick the room's source (`customization.
 * roomTemperatureSource`, area id → entity id). A chosen source without a number shows nothing: falling back would
 * bring the oven back exactly when the thermostat is down.
 *
 * `roomTemperatureSources`: what the choice offers — every temperature sensor of the room, then every climate entity,
 * each with its current value (null without a number).
 */

import type { HassEntity, HassEntityMap, Room, RoomSummary } from './types.js';

export interface RoomTemperature {
  entityId: string;
  value: number;
  /** A sensor's `unit_of_measurement`; null for a climate entity's current temperature (HA's unit). */
  unit: string | null;
}

export interface RoomTemperatureSource {
  entityId: string;
  kind: 'sensor' | 'climate';
  value: number | null;
  unit: string | null;
}

function unitOf(entity: HassEntity): string | null {
  const unit = entity.attributes['unit_of_measurement'];
  return typeof unit === 'string' && unit.length > 0 ? unit : null;
}

function isTemperatureSensor(entity: HassEntity | undefined): entity is HassEntity {
  return entity?.attributes['device_class'] === 'temperature';
}

function sensorValue(entity: HassEntity): number | null {
  const value = parseFloat(entity.state);
  return isNaN(value) ? null : value;
}

function climateValue(entity: HassEntity): number | null {
  const cur = entity.attributes['current_temperature'];
  return typeof cur === 'number' && Number.isFinite(cur) ? cur : null;
}

export function roomTemperatureSources(room: Room, entities: HassEntityMap): RoomTemperatureSource[] {
  const out: RoomTemperatureSource[] = [];
  for (const id of room.domains['sensor'] ?? []) {
    const entity = entities[id];
    if (!isTemperatureSensor(entity)) continue;
    out.push({ entityId: id, kind: 'sensor', value: sensorValue(entity), unit: unitOf(entity) });
  }
  for (const id of room.domains['climate'] ?? []) {
    const entity = entities[id];
    if (!entity) continue;
    out.push({ entityId: id, kind: 'climate', value: climateValue(entity), unit: null });
  }
  return out;
}

/** The automatic rule (what `roomSummary` shows): first temperature sensor with a number, else the first climate. */
export function automaticRoomTemperature(room: Room, entities: HassEntityMap): RoomTemperature | null {
  for (const id of room.domains['sensor'] ?? []) {
    const entity = entities[id];
    if (!isTemperatureSensor(entity)) continue;
    const value = sensorValue(entity);
    if (value !== null) return { entityId: id, value, unit: unitOf(entity) };
  }
  // only the first climate entity that exists
  for (const id of room.domains['climate'] ?? []) {
    const entity = entities[id];
    if (!entity) continue;
    const value = climateValue(entity);
    return value === null ? null : { entityId: id, value, unit: null };
  }
  return null;
}

/**
 * Whether `sourceId` is a source of this room: a string among the room's climate entities, or among its sensors as a
 * temperature sensor. A room entity without a state yet still counts (it shows nothing then, never the automatic one).
 */
export function isRoomTemperatureSource(room: Room, entities: HassEntityMap, sourceId: unknown): sourceId is string {
  if (typeof sourceId !== 'string') return false;
  if ((room.domains['climate'] ?? []).includes(sourceId)) return true;
  if (!(room.domains['sensor'] ?? []).includes(sourceId)) return false;
  const entity = entities[sourceId];
  return entity === undefined || isTemperatureSensor(entity);
}

export function roomTemperature(room: Room, entities: HassEntityMap, sourceId?: unknown): RoomTemperature | null {
  if (!isRoomTemperatureSource(room, entities, sourceId)) return automaticRoomTemperature(room, entities);
  const entity = entities[sourceId];
  if (!entity) return null;
  if (sourceId.startsWith('climate.')) {
    const value = climateValue(entity);
    return value === null ? null : { entityId: sourceId, value, unit: null };
  }
  const value = sensorValue(entity);
  return value === null ? null : { entityId: sourceId, value, unit: unitOf(entity) };
}

/**
 * `roomSummary`'s result with its temperature from `roomTemperature` (the chosen source). Upstream `roomSummary` stays
 * as it is; the room cards and the hero pass their summary through this.
 */
export function withRoomTemperature(summary: RoomSummary, room: Room, entities: HassEntityMap, sourceId?: unknown): RoomSummary {
  if (sourceId === undefined) return summary;
  const { temperature: _automatic, ...rest } = summary;
  const t = roomTemperature(room, entities, sourceId);
  return t ? { ...rest, temperature: t.value } : rest;
}
