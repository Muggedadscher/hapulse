/**
 * Room building and summarization logic.
 * Pure functions — no I/O, no side effects.
 */

import type {
  AreaRegistryEntry,
  DeviceRegistryEntry,
  EntityRegistryEntry,
  Registries,
  HassEntity,
  HassEntityMap,
  Room,
  RoomSummary,
} from './types.js';
import { domainOf } from './domain.js';

/** Device id → area_id, as resolved by `resolveEntityAreaId`'s device fallback. */
export type DeviceAreaMap = Map<string, string | null>;

/** Builds a device id → area_id lookup from the device registry, for `resolveEntityAreaId`. */
export function buildDeviceAreaMap(devices: DeviceRegistryEntry[]): DeviceAreaMap {
  return new Map(devices.map((d) => [d.id, d.area_id ?? null]));
}

/**
 * Resolves the area (room) an entity belongs to, matching Home Assistant's
 * own precedence: the entity's own `area_id` first, falling back to its
 * device's `area_id` when the entity itself has none — which is the common
 * case for entities on a multi-entity device (e.g. a Hue "Room" device),
 * where only the device carries the area assignment.
 *
 * Returns `null` when neither the entity nor its device has an area — either
 * genuinely unassigned, or (by design) a "Zone" device spanning multiple
 * rooms, which HA leaves area-less on both the entity and the device.
 */
export function resolveEntityAreaId(
  entry: Pick<EntityRegistryEntry, 'area_id' | 'device_id'>,
  deviceAreaMap: DeviceAreaMap,
): string | null {
  return (
    entry.area_id ??
    (entry.device_id !== null ? (deviceAreaMap.get(entry.device_id) ?? null) : null)
  );
}

/**
 * Build a `Room[]` from registry data and the current entity state map.
 *
 * Rules:
 * - An entity belongs to a room via its own `area_id`, else its device's `area_id`.
 * - Entities with `disabled_by` or `hidden_by` are excluded entirely.
 * - Entities with `entity_category` ('config' | 'diagnostic') go into `entityIds`
 *   but are excluded from `domains` (so they don't appear in room summaries or cards).
 * - Rooms with no assigned entities are still included (they come from the area registry).
 * - Rooms are sorted alphabetically by name.
 */
export function buildRooms(registries: Registries, entities: HassEntityMap): Room[] {
  const { areas, devices, entities: entityEntries } = registries;

  const deviceAreaMap = buildDeviceAreaMap(devices);

  // Build a map: area_id → Room (start empty)
  const roomMap = new Map<string, Room>(
    areas.map((a: AreaRegistryEntry) => [
      a.area_id,
      {
        id: a.area_id,
        name: a.name,
        icon: a.icon ?? null,
        picture: a.picture ?? null,
        entityIds: [],
        domains: {},
      },
    ])
  );

  // Assign entities to rooms
  for (const entry of entityEntries) {
    // Skip disabled or hidden entities entirely.
    // Use loose != null so that absent fields (undefined) are treated the same
    // as explicit null — older HA versions omit these fields rather than sending null.
    if (entry.disabled_by != null || entry.hidden_by != null) continue;

    // Resolve which area this entity belongs to
    const areaId = resolveEntityAreaId(entry, deviceAreaMap);

    if (areaId === null) continue; // No room — skip

    const room = roomMap.get(areaId);
    if (!room) continue; // Area not in registry — skip

    room.entityIds.push(entry.entity_id);

    // Diagnostic/config entities are in entityIds but NOT in domains.
    // Use loose != null so absent entity_category (undefined on older HA) is treated as "no category".
    if (entry.entity_category != null) continue;

    // Only include if there's a live state entry
    if (!(entry.entity_id in entities)) continue;

    const domain = domainOf(entry.entity_id);
    if (!room.domains[domain]) {
      room.domains[domain] = [];
    }
    room.domains[domain]!.push(entry.entity_id);
  }

  return [...roomMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Compute a quick summary for a room card.
 *
 * - `temperature`: first `sensor` with `device_class: temperature` in the room;
 *   falls back to climate `current_temperature`.
 * - `humidity`: first `sensor` with `device_class: humidity`.
 * - `lightsOn` / `lightsTotal`: count of lights in the room.
 * - `mediaPlaying`: any `media_player` in state `playing`.
 * - `anyMotion`: any `binary_sensor` with `device_class: motion` that is `on`.
 * - `climateState`: hvac_action of the first climate entity.
 */
export function roomSummary(room: Room, entities: HassEntityMap): RoomSummary {
  let temperature: number | undefined;
  let humidity: number | undefined;
  let climateState: string | undefined;
  let lightsOn = 0;
  let lightsTotal = 0;
  let mediaPlaying = false;
  let anyMotion = false;

  // Temperature: sensor first, then climate fallback
  const sensorIds = room.domains['sensor'] ?? [];
  for (const id of sensorIds) {
    const entity = entities[id];
    if (!entity) continue;
    const dc = entity.attributes['device_class'];
    if (dc === 'temperature' && temperature === undefined) {
      const val = parseFloat(entity.state);
      if (!isNaN(val)) temperature = val;
    }
    if (dc === 'humidity' && humidity === undefined) {
      const val = parseFloat(entity.state);
      if (!isNaN(val)) humidity = val;
    }
  }

  // Lights
  const lightIds = room.domains['light'] ?? [];
  lightsTotal = lightIds.length;
  for (const id of lightIds) {
    const entity = entities[id];
    if (entity?.state === 'on') lightsOn++;
  }

  // Climate (temperature fallback + climateState)
  const climateIds = room.domains['climate'] ?? [];
  for (const id of climateIds) {
    const entity = entities[id];
    if (!entity) continue;
    if (temperature === undefined) {
      const cur = entity.attributes['current_temperature'];
      if (typeof cur === 'number') temperature = cur;
    }
    if (climateState === undefined) {
      const action = entity.attributes['hvac_action'];
      if (typeof action === 'string') climateState = action;
      else if (entity.state !== 'unavailable') climateState = entity.state;
    }
    break; // Only use first climate entity
  }

  // Media players
  const mediaIds = room.domains['media_player'] ?? [];
  for (const id of mediaIds) {
    const entity = entities[id];
    if (entity?.state === 'playing') {
      mediaPlaying = true;
      break;
    }
  }

  // Motion sensors
  const binarySensorIds = room.domains['binary_sensor'] ?? [];
  for (const id of binarySensorIds) {
    const entity = entities[id];
    if (entity?.attributes['device_class'] === 'motion' && entity.state === 'on') {
      anyMotion = true;
      break;
    }
  }

  const summary: RoomSummary = { lightsOn, lightsTotal, mediaPlaying, anyMotion };
  if (temperature !== undefined) summary.temperature = temperature;
  if (humidity !== undefined) summary.humidity = humidity;
  if (climateState !== undefined) summary.climateState = climateState;
  return summary;
}
