/**
 * [fork] The sections of a room page: which entities stand in which section, in which order. Pure; moved out of
 * `apps/dashboard/src/pages/Room.tsx` (and `lib/order.ts`, `lib/defaultSlot.ts`) so the native app ports the same
 * rules and is tested against them (`apps/ios/tools/export`).
 */

import type { HassEntityMap } from './types.js';
import { isGarageDoor } from './garage.js';

/**
 * Apply a stored order to a list of ids.
 *
 * IDs present in `stored` come first (in stored order), followed by any
 * remaining ids from the original `ids` array in their natural order.
 *
 * - If `stored` is undefined or empty, `ids` is returned as-is.
 * - IDs in `stored` but absent from `ids` are silently skipped.
 */
export function applyStoredOrder(ids: string[], stored: string[] | undefined): string[] {
  if (!stored || stored.length === 0) return ids;

  const idSet = new Set(ids);
  const ordered: string[] = [];

  // First: ids present in stored, in stored order
  for (const id of stored) {
    if (idSet.has(id)) {
      ordered.push(id);
      idSet.delete(id);
    }
  }

  // Then: remaining ids in their original natural order
  for (const id of ids) {
    if (idSet.has(id)) {
      ordered.push(id);
    }
  }

  return ordered;
}

/**
 * Default slot for a section/chip id that is newer than a stored order.
 *
 * `applyStoredOrder` appends ids unknown to the stored order at the END. For a
 * new id that belongs next to an existing one (garage doors after locks, the
 * garage section where the blinds were) this inserts it into the stored order
 * right after `anchor` — as long as the user has not placed it themselves.
 * Pure; the stored setting itself is not changed (a later drag saves it).
 */
export function withDefaultSlot(stored: string[] | undefined, id: string, anchor: string): string[] | undefined {
  if (!stored || stored.length === 0 || stored.includes(id)) return stored;
  const at = stored.indexOf(anchor);
  if (at < 0) return stored;
  return [...stored.slice(0, at + 1), id, ...stored.slice(at + 1)];
}

/** The entity's name without the room's name in it ("Küche Decke" in the room Küche → "Decke"). */
export function stripRoomName(name: string, roomName: string): string {
  if (!roomName) return name;
  const escaped = roomName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stripped = name
    .replace(new RegExp(`\\b${escaped}\\b`, 'ig'), ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return stripped.length > 0 ? stripped : name;
}

/** The order the room page stores its entity order in (one list for all sections). */
export const ROOM_SECTION_ORDER = [
  'scene',
  'light',
  'climate',
  'media_player',
  'cover',
  'garage', // garage doors / gates, split off the blinds
  'switches',
  'button',
  'vacuum',
  'sensor',
  'binary_sensor',
  'other',
  'nvrCameras', // Sentinel cameras assigned to this room
] as const;

export type RoomSectionKey = (typeof ROOM_SECTION_ORDER)[number];

/** The sections in the order the page shows them without a stored order. */
const DISPLAY_ORDER: RoomSectionKey[] = [
  'scene', 'nvrCameras', 'light', 'climate', 'media_player', 'cover', 'garage', 'switches', 'button', 'vacuum',
  'sensor', 'other',
];

const SWITCH_DOMAINS = new Set(['switch', 'fan', 'input_boolean']);
const CORE_DOMAINS = new Set([
  'scene', 'light', 'climate', 'media_player', 'cover',
  'switch', 'fan', 'input_boolean', 'button', 'vacuum',
  'sensor', 'binary_sensor',
  'humidifier', // in "Klima" (climate)
]);

export interface RoomSection {
  key: RoomSectionKey;
  ids: string[];
  /** sensor tiles instead of entity cards */
  isSensor?: boolean;
}

export interface RoomSectionsInput {
  /** `Room.domains` */
  domains: Record<string, string[]>;
  entities: HassEntityMap;
  hiddenEntities: string[];
  editMode: boolean;
  /** cameras come from Sentinel: HA's camera entities are left out, `cameraIds` fill the camera section */
  sentinel: boolean;
  cameraIds: string[];
  /** `customization.entityOrder[areaId]` */
  storedEntityOrder: string[] | undefined;
  /** `customization.roomSectionOrder[areaId]` */
  storedSectionOrder: string[] | undefined;
  /** the room has a heating plan: "Klima" shows even without thermostats */
  heatingPlan: boolean;
}

export interface RoomSections {
  /** the sections to show, in order */
  sections: RoomSection[];
  /** every section's ids (also empty ones), for saving a new entity order (`combinedEntityOrder`) */
  snapshot: Record<string, string[]>;
}

export function roomSections(input: RoomSectionsInput): RoomSections {
  const { entities, hiddenEntities, editMode } = input;
  const domainMap: Record<string, string[]> = {};
  for (const [domain, ids] of Object.entries(input.domains)) {
    const filtered = editMode
      ? ids.filter((id) => id in entities)
      : ids.filter((id) => !hiddenEntities.includes(id) && id in entities);
    if (filtered.length > 0) domainMap[domain] = filtered;
  }
  if (input.sentinel) delete domainMap['camera'];

  const switchIds: string[] = [];
  const otherIds: string[] = [];
  for (const domain of Object.keys(domainMap)) {
    if (SWITCH_DOMAINS.has(domain)) switchIds.push(...(domainMap[domain] ?? []));
    else if (!CORE_DOMAINS.has(domain)) otherIds.push(...(domainMap[domain] ?? []));
  }

  const stored = input.storedEntityOrder;
  const orderedIds = (raw: string[]) => applyStoredOrder(raw, stored?.filter((id) => raw.includes(id)));
  const covers = domainMap['cover'] ?? [];
  const snapshot: Record<string, string[]> = {
    scene: orderedIds(domainMap['scene'] ?? []),
    light: orderedIds(domainMap['light'] ?? []),
    // dehumidifiers stand in "Klima": one stored order for the section, so dragging between the two works
    climate: orderedIds([...(domainMap['climate'] ?? []), ...(domainMap['humidifier'] ?? [])]),
    media_player: orderedIds(domainMap['media_player'] ?? []),
    cover: orderedIds(covers.filter((id) => !isGarageDoor(entities[id]))),
    garage: orderedIds(covers.filter((id) => isGarageDoor(entities[id]))),
    switches: orderedIds(switchIds),
    button: orderedIds(domainMap['button'] ?? []),
    vacuum: orderedIds(domainMap['vacuum'] ?? []),
    sensor: orderedIds([...(domainMap['sensor'] ?? []), ...(domainMap['binary_sensor'] ?? [])]),
    binary_sensor: [],
    other: orderedIds(otherIds),
  };

  const all: RoomSection[] = DISPLAY_ORDER.map((key) => {
    const ids = key === 'nvrCameras' ? (input.sentinel ? input.cameraIds : []) : (snapshot[key] ?? []);
    return key === 'sensor' ? { key, ids, isSensor: true } : { key, ids };
  });
  // "Klima" also for the plan alone, in edit mode too (keeps its place)
  const active = all.filter((s) => s.ids.length > 0 || (s.key === 'climate' && input.heatingPlan));
  // a stored order predating the garage section: put it where the blinds were
  const storedSections = withDefaultSlot(input.storedSectionOrder, 'garage', 'cover');
  const sections = applyStoredOrder(active.map((s) => s.key), storedSections)
    .map((key) => active.find((s) => s.key === key))
    .filter((s): s is RoomSection => s != null);
  return { sections, snapshot };
}

/** The room's new entity order after one section was rearranged (all sections in `ROOM_SECTION_ORDER`). */
export function combinedEntityOrder(sectionKey: string, newIds: string[], snapshot: Record<string, string[]>): string[] {
  const combined: string[] = [];
  for (const key of ROOM_SECTION_ORDER) {
    if (key === sectionKey) combined.push(...newIds);
    else if (snapshot[key]) combined.push(...snapshot[key]!);
  }
  return combined;
}
