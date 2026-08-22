/**
 * Room icon utilities — pure, no DOM.
 *
 * Two public functions:
 *  - roomIconName(area)         → lucide icon name for a room's identity
 *  - roomStatusIconName(room, entities) → lucide icon name when something notable
 *                               is open/active in the room, or null if nothing notable
 *
 * The CANONICAL_ROOM_ICONS set lists every icon name these functions can ever
 * return. The dashboard RoomIcon component (apps/dashboard/src/components/ui/RoomIcon.tsx)
 * MUST map exactly this set — keep them in sync when adding icons here.
 *
 * @see apps/dashboard/src/components/ui/RoomIcon.tsx (consumer — must mirror CANONICAL_ROOM_ICONS)
 */

import type { Room, HassEntityMap } from './types.js';

// ---------------------------------------------------------------------------
// Canonical icon set
// Every value roomIconName / roomStatusIconName can ever return MUST appear here.
// The dashboard RoomIcon.tsx component maps exactly this set.
// ---------------------------------------------------------------------------

export const CANONICAL_ROOM_ICONS = [
  // Room identity icons
  'sofa',          // living room / lounge / family room
  'utensils',      // kitchen / dining
  'bed',           // bedroom / master / guest
  'baby',          // kids room / nursery
  'bath',          // bathroom / shower / wc / ensuite
  'monitor',       // office / study / desk
  'car',           // garage (also: open garage door status)
  'door-open',     // hallway / entry / foyer / corridor
  'washing-machine', // laundry / utility / mud room
  'trees',         // garden / yard / patio / balcony / terrace / outdoor
  'box',           // basement / cellar / pantry / storage
  'triangle',      // attic / loft
  'dumbbell',      // gym / fitness
  'shirt',         // closet / wardrobe / dressing room
  'waves',         // pool
  'clapperboard',  // theater / cinema / media room
  'gamepad-2',     // playroom / game room
  'house',         // default fallback
  // Status icons (open/active conditions)
  'grid-2x2',      // window / opening sensor open
  'droplets',      // moisture sensor triggered
  'flame',         // smoke sensor triggered
] as const;

export type RoomIconName = (typeof CANONICAL_ROOM_ICONS)[number];

// ---------------------------------------------------------------------------
// MDI → lucide mapping
// Handles HA area icons that use mdi: prefix names.
// Only lucide names confirmed present in lucide-react@0.469 are listed.
// ---------------------------------------------------------------------------

const MDI_TO_LUCIDE: Record<string, string> = {
  // Seating / living
  'sofa': 'sofa',
  'sofa-single': 'sofa',
  'couch': 'sofa',
  // Kitchen / dining
  'silverware-fork-knife': 'utensils',
  'silverware': 'utensils',
  'fridge': 'utensils',
  'fridge-outline': 'utensils',
  'stove': 'utensils',
  // Bedroom
  'bed': 'bed',
  'bed-double': 'bed',
  'bed-single': 'bed',
  // Bathroom
  'shower': 'bath',
  'bathtub': 'bath',
  'toilet': 'bath',
  'shower-head': 'bath',
  // Office / study
  'desk': 'monitor',
  'monitor': 'monitor',
  'desktop-mac': 'monitor',
  'desk-lamp': 'monitor',
  // Garage / car
  'garage': 'car',
  'garage-variant': 'car',
  'garage-open': 'car',
  'car': 'car',
  'car-side': 'car',
  // Hallway / door / stairs
  'stairs': 'door-open',
  'door': 'door-open',
  'door-open': 'door-open',
  // Laundry
  'washing-machine': 'washing-machine',
  // Garden / outdoor
  'tree': 'trees',
  'flower': 'trees',
  'flower-outline': 'trees',
  'pine-tree': 'trees',
  'forest': 'trees',
  // TV / entertainment
  'television': 'monitor',
  'television-play': 'monitor',
  // Books
  'bookshelf': 'box',
  // Baby / kids
  'baby': 'baby',
  'baby-carriage': 'baby',
  'baby-face': 'baby',
  // Gym
  'dumbbell': 'dumbbell',
  'weight-lifter': 'dumbbell',
  // Pool
  'pool': 'waves',
  // Home
  'home': 'house',
  'home-outline': 'house',
  // Attic / loft
  'attic': 'triangle',
  // Basement / storage
  'basement': 'box',
  'wardrobe': 'shirt',
  'hanger': 'shirt',
  'coat-rack': 'shirt',
};

// ---------------------------------------------------------------------------
// Room keyword → icon (ordered: first match wins)
// ---------------------------------------------------------------------------

const ROOM_KEYWORDS: Array<{ keyword: string; icon: string }> = [
  // Living areas
  { keyword: 'living', icon: 'sofa' },
  { keyword: 'lounge', icon: 'sofa' },
  { keyword: 'family', icon: 'sofa' },
  { keyword: 'sitting', icon: 'sofa' },
  // Kitchen / dining
  { keyword: 'kitchen', icon: 'utensils' },
  { keyword: 'dining', icon: 'utensils' },
  { keyword: 'pantry', icon: 'box' },
  // Bedroom
  { keyword: 'master', icon: 'bed' },
  { keyword: 'bedroom', icon: 'bed' },
  { keyword: 'guest', icon: 'bed' },
  // Kids / nursery
  { keyword: 'nursery', icon: 'baby' },
  { keyword: 'child', icon: 'baby' },
  { keyword: 'kid', icon: 'baby' },
  { keyword: 'baby', icon: 'baby' },
  // Bathroom
  { keyword: 'bath', icon: 'bath' },
  { keyword: 'shower', icon: 'bath' },
  { keyword: 'toilet', icon: 'bath' },
  { keyword: 'wc', icon: 'bath' },
  { keyword: 'ensuite', icon: 'bath' },
  // Office / work
  { keyword: 'office', icon: 'monitor' },
  { keyword: 'study', icon: 'monitor' },
  { keyword: 'work', icon: 'monitor' },
  { keyword: 'desk', icon: 'monitor' },
  // Garage
  { keyword: 'garage', icon: 'car' },
  // Entry / hallway
  { keyword: 'hall', icon: 'door-open' },
  { keyword: 'entry', icon: 'door-open' },
  { keyword: 'foyer', icon: 'door-open' },
  { keyword: 'corridor', icon: 'door-open' },
  { keyword: 'landing', icon: 'door-open' },
  { keyword: 'stair', icon: 'door-open' },
  // Laundry / utility
  { keyword: 'laundry', icon: 'washing-machine' },
  { keyword: 'utility', icon: 'washing-machine' },
  { keyword: 'mud', icon: 'washing-machine' },
  // Garden / outdoor
  { keyword: 'garden', icon: 'trees' },
  { keyword: 'yard', icon: 'trees' },
  { keyword: 'patio', icon: 'trees' },
  { keyword: 'balcony', icon: 'trees' },
  { keyword: 'terrace', icon: 'trees' },
  { keyword: 'outdoor', icon: 'trees' },
  { keyword: 'outside', icon: 'trees' },
  { keyword: 'porch', icon: 'trees' },
  { keyword: 'deck', icon: 'trees' },
  // Basement / cellar / storage
  { keyword: 'basement', icon: 'box' },
  { keyword: 'cellar', icon: 'box' },
  { keyword: 'storage', icon: 'box' },
  { keyword: 'shed', icon: 'box' },
  // Attic / loft
  { keyword: 'attic', icon: 'triangle' },
  { keyword: 'loft', icon: 'triangle' },
  // Gym / fitness
  { keyword: 'gym', icon: 'dumbbell' },
  { keyword: 'fitness', icon: 'dumbbell' },
  { keyword: 'exercise', icon: 'dumbbell' },
  // Closet / wardrobe / dressing
  { keyword: 'closet', icon: 'shirt' },
  { keyword: 'wardrobe', icon: 'shirt' },
  { keyword: 'dressing', icon: 'shirt' },
  // Pool
  { keyword: 'pool', icon: 'waves' },
  // Theater / media
  { keyword: 'theater', icon: 'clapperboard' },
  { keyword: 'theatre', icon: 'clapperboard' },
  { keyword: 'cinema', icon: 'clapperboard' },
  { keyword: 'media', icon: 'clapperboard' },
  // Playroom / game
  { keyword: 'play', icon: 'gamepad-2' },
  { keyword: 'game', icon: 'gamepad-2' },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a lucide icon name for a room/area.
 *
 * Resolution order:
 * 1. If area.icon is set: strip leading "mdi:" if present.
 *    a. If the result is already in CANONICAL_ROOM_ICONS → return it directly
 *       (handles demo data icons like 'sofa', 'bed', 'door-open').
 *    b. Else map via MDI_TO_LUCIDE.
 *    c. If still no match → fall through to keyword matching.
 * 2. Keyword-match area.name.toLowerCase() (first match wins).
 * 3. Default → 'house'.
 */
export function roomIconName(area: { name: string; icon?: string | null }): string {
  if (area.icon) {
    // Strip mdi: prefix
    const raw = area.icon.startsWith('mdi:') ? area.icon.slice(4) : area.icon;

    // Direct passthrough: already one of our canonical names
    if ((CANONICAL_ROOM_ICONS as readonly string[]).includes(raw)) {
      return raw;
    }

    // MDI lookup
    const mapped = MDI_TO_LUCIDE[raw];
    if (mapped) return mapped;

    // Unknown icon — fall through to keyword matching
  }

  // Keyword matching on room name
  const lower = area.name.toLowerCase();
  for (const { keyword, icon } of ROOM_KEYWORDS) {
    if (lower.includes(keyword)) return icon;
  }

  return 'house';
}

/**
 * Returns a lucide status icon name when something notable is open/active
 * in the room, else null. Checks only entities in room.entityIds.
 *
 * Priority (first match wins):
 * 1. binary_sensor device_class 'door'                 state 'on' → 'door-open'
 * 2. binary_sensor device_class 'garage_door'          state 'on' → 'car'
 * 3. binary_sensor device_class 'window'|'opening'     state 'on' → 'grid-2x2'
 * 4. binary_sensor device_class 'moisture'             state 'on' → 'droplets'
 * 5. binary_sensor device_class 'smoke'                state 'on' → 'flame'
 *
 * All returned values are members of CANONICAL_ROOM_ICONS.
 */
export function roomStatusIconName(room: Room, entities: HassEntityMap): string | null {
  let hasOpenWindow = false;
  let hasMoisture = false;
  let hasSmoke = false;

  for (const entityId of room.entityIds) {
    const entity = entities[entityId];
    if (!entity) continue;
    if (!entityId.startsWith('binary_sensor.')) continue;
    if (entity.state !== 'on') continue;

    const dc = entity.attributes['device_class'] as string | undefined;

    // Priority 1: open door
    if (dc === 'door') return 'door-open';

    // Priority 2: open garage door
    if (dc === 'garage_door') return 'car';

    // Priority 3 (defer until after higher-priority checks in same entity list)
    if (dc === 'window' || dc === 'opening') hasOpenWindow = true;

    // Priority 4
    if (dc === 'moisture') hasMoisture = true;

    // Priority 5
    if (dc === 'smoke') hasSmoke = true;
  }

  if (hasOpenWindow) return 'grid-2x2';
  if (hasMoisture) return 'droplets';
  if (hasSmoke) return 'flame';

  return null;
}
