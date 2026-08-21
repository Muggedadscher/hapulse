/**
 * Room icon utilities — pure, no DOM.
 *
 * Three public functions:
 *  - roomKind(name)             → the kind of room a name denotes ('kitchen', …)
 *  - roomIconName(area)         → lucide icon name for a room's identity
 *  - roomStatusIconName(room, entities) → lucide icon name when something notable
 *                               is open/active in the room, or null if nothing notable
 *
 * `roomKind` is the single place room names are classified. Anything that
 * derives a look from a room's name — its icon here, its gradient in the
 * dashboard — goes through it, so a new language is one list to extend rather
 * than one per consumer.
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
// Room kinds
//
// A kind is what a room *is*, independent of how it is rendered. Icons map from
// it here; the dashboard maps gradients from it. Adding a look means adding a
// map, not a second list of names to keep in sync.
// ---------------------------------------------------------------------------

export const ROOM_KINDS = [
  'living', 'kitchen', 'bedroom', 'kids', 'bathroom', 'office', 'garage',
  'hallway', 'laundry', 'outdoor', 'storage', 'attic', 'gym', 'closet',
  'pool', 'media', 'play', 'other',
] as const;

export type RoomKind = (typeof ROOM_KINDS)[number];

const ICON_BY_KIND: Record<RoomKind, RoomIconName> = {
  living: 'sofa',
  kitchen: 'utensils',
  bedroom: 'bed',
  kids: 'baby',
  bathroom: 'bath',
  office: 'monitor',
  garage: 'car',
  hallway: 'door-open',
  laundry: 'washing-machine',
  outdoor: 'trees',
  storage: 'box',
  attic: 'triangle',
  gym: 'dumbbell',
  closet: 'shirt',
  pool: 'waves',
  media: 'clapperboard',
  play: 'gamepad-2',
  other: 'house',
};

// ---------------------------------------------------------------------------
// Room name → kind (ordered: first match wins)
//
// Room names come from Home Assistant in whatever language the household
// speaks, which has nothing to do with the display language chosen in HAPulse.
// So this list is multilingual all at once, never per-locale: a French
// household reading the dashboard in English still has a room called "Cuisine".
//
// Matching is on the normalised name (see `normalizeRoomName`), so keywords are
// written without accents and with spaces where the name may use an accent, a
// hyphen or an apostrophe: `salle d eau` matches "Salle d'eau" and "Salle
// d’eau" alike.
//
// Keywords are substrings, so within a language the specific must precede the
// generic — `enfant` before `chambre`, or a child's bedroom reads as a bedroom.
// Avoid keywords short enough to appear inside an unrelated word.
// ---------------------------------------------------------------------------

const ROOM_KEYWORDS: Array<{ keyword: string; kind: RoomKind }> = [
  // -- English ------------------------------------------------------------
  // Living areas
  { keyword: 'living', kind: 'living' },
  { keyword: 'lounge', kind: 'living' },
  { keyword: 'family', kind: 'living' },
  { keyword: 'sitting', kind: 'living' },
  // Kitchen / dining
  { keyword: 'kitchen', kind: 'kitchen' },
  { keyword: 'dining', kind: 'kitchen' },
  { keyword: 'pantry', kind: 'storage' },
  // Bedroom
  { keyword: 'master', kind: 'bedroom' },
  { keyword: 'bedroom', kind: 'bedroom' },
  { keyword: 'guest', kind: 'bedroom' },
  { keyword: 'sleep', kind: 'bedroom' },
  // Kids / nursery
  { keyword: 'nursery', kind: 'kids' },
  { keyword: 'child', kind: 'kids' },
  { keyword: 'kid', kind: 'kids' },
  { keyword: 'baby', kind: 'kids' },
  // Bathroom
  { keyword: 'bath', kind: 'bathroom' },
  { keyword: 'shower', kind: 'bathroom' },
  { keyword: 'toilet', kind: 'bathroom' },
  { keyword: 'wc', kind: 'bathroom' },
  { keyword: 'ensuite', kind: 'bathroom' },
  // Office / work
  { keyword: 'office', kind: 'office' },
  { keyword: 'study', kind: 'office' },
  { keyword: 'work', kind: 'office' },
  { keyword: 'desk', kind: 'office' },
  // Garage
  { keyword: 'garage', kind: 'garage' },
  // Entry / hallway
  { keyword: 'hall', kind: 'hallway' },
  { keyword: 'entry', kind: 'hallway' },
  { keyword: 'foyer', kind: 'hallway' },
  { keyword: 'corridor', kind: 'hallway' },
  { keyword: 'landing', kind: 'hallway' },
  { keyword: 'stair', kind: 'hallway' },
  // Laundry / utility
  { keyword: 'laundry', kind: 'laundry' },
  { keyword: 'utility', kind: 'laundry' },
  { keyword: 'mud', kind: 'laundry' },
  // Garden / outdoor
  { keyword: 'garden', kind: 'outdoor' },
  { keyword: 'yard', kind: 'outdoor' },
  { keyword: 'patio', kind: 'outdoor' },
  { keyword: 'balcony', kind: 'outdoor' },
  { keyword: 'terrace', kind: 'outdoor' },
  { keyword: 'outdoor', kind: 'outdoor' },
  { keyword: 'outside', kind: 'outdoor' },
  { keyword: 'porch', kind: 'outdoor' },
  { keyword: 'deck', kind: 'outdoor' },
  // Basement / cellar / storage
  { keyword: 'basement', kind: 'storage' },
  { keyword: 'cellar', kind: 'storage' },
  { keyword: 'storage', kind: 'storage' },
  { keyword: 'shed', kind: 'storage' },
  // Attic / loft
  { keyword: 'attic', kind: 'attic' },
  { keyword: 'loft', kind: 'attic' },
  // Gym / fitness
  { keyword: 'gym', kind: 'gym' },
  { keyword: 'fitness', kind: 'gym' },
  { keyword: 'exercise', kind: 'gym' },
  // Closet / wardrobe / dressing
  { keyword: 'closet', kind: 'closet' },
  { keyword: 'wardrobe', kind: 'closet' },
  { keyword: 'dressing', kind: 'closet' },
  // Pool
  { keyword: 'pool', kind: 'pool' },
  // Theater / media
  { keyword: 'theater', kind: 'media' },
  { keyword: 'theatre', kind: 'media' },
  { keyword: 'cinema', kind: 'media' },
  { keyword: 'media', kind: 'media' },
  // Playroom / game
  { keyword: 'play', kind: 'play' },
  { keyword: 'game', kind: 'play' },

  // -- French -------------------------------------------------------------
  // Kids before bedroom: "Chambre d'enfant" is a child's room, not a bedroom.
  { keyword: 'enfant', kind: 'kids' },
  { keyword: 'bebe', kind: 'kids' },
  { keyword: 'nurserie', kind: 'kids' },
  // Bedroom
  { keyword: 'chambre', kind: 'bedroom' },
  { keyword: 'parentale', kind: 'bedroom' },
  // Living
  { keyword: 'salon', kind: 'living' },
  { keyword: 'sejour', kind: 'living' },
  // Kitchen / dining. `salle a manger` before the bathroom's `salle de bain`
  // is not required (neither contains the other), but keeping the room's
  // full phrase avoids ever introducing a bare `salle` keyword.
  { keyword: 'cuisine', kind: 'kitchen' },
  { keyword: 'salle a manger', kind: 'kitchen' },
  { keyword: 'garde manger', kind: 'storage' },
  // Bathroom
  { keyword: 'salle de bain', kind: 'bathroom' },
  { keyword: 'salle d eau', kind: 'bathroom' },
  { keyword: 'sdb', kind: 'bathroom' },
  { keyword: 'douche', kind: 'bathroom' },
  { keyword: 'toilette', kind: 'bathroom' },
  // Office
  { keyword: 'bureau', kind: 'office' },
  // Entry / hallway
  { keyword: 'entree', kind: 'hallway' },
  { keyword: 'couloir', kind: 'hallway' },
  { keyword: 'palier', kind: 'hallway' },
  { keyword: 'vestibule', kind: 'hallway' },
  { keyword: 'escalier', kind: 'hallway' },
  // Laundry / utility
  { keyword: 'buanderie', kind: 'laundry' },
  { keyword: 'lingerie', kind: 'laundry' },
  { keyword: 'laverie', kind: 'laundry' },
  // Garden / outdoor
  { keyword: 'jardin', kind: 'outdoor' },
  { keyword: 'terrasse', kind: 'outdoor' },
  { keyword: 'balcon', kind: 'outdoor' },
  { keyword: 'veranda', kind: 'outdoor' },
  { keyword: 'exterieur', kind: 'outdoor' },
  // Basement / cellar / storage
  { keyword: 'sous sol', kind: 'storage' },
  { keyword: 'cave', kind: 'storage' },
  { keyword: 'cellier', kind: 'storage' },
  { keyword: 'debarras', kind: 'storage' },
  { keyword: 'rangement', kind: 'storage' },
  { keyword: 'remise', kind: 'storage' },
  // Attic
  { keyword: 'grenier', kind: 'attic' },
  { keyword: 'combles', kind: 'attic' },
  { keyword: 'mansarde', kind: 'attic' },
  // Gym
  { keyword: 'salle de sport', kind: 'gym' },
  { keyword: 'musculation', kind: 'gym' },
  // Closet / dressing
  { keyword: 'placard', kind: 'closet' },
  { keyword: 'penderie', kind: 'closet' },
  // Pool
  { keyword: 'piscine', kind: 'pool' },
  // Play
  { keyword: 'jeux', kind: 'play' },
];

/**
 * Lowercases, strips diacritics, and flattens every run of non-alphanumerics to
 * a single space, so accents, hyphens and both apostrophe characters stop
 * mattering: "Salle d’Eau", "salle-d-eau" and "SALLE D EAU" all normalise to
 * `salle d eau`.
 */
function normalizeRoomName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Classifies a room name. Returns `'other'` when nothing matches — the caller
 * decides what a room of unknown kind looks like.
 */
export function roomKind(name: string): RoomKind {
  const normalized = normalizeRoomName(name);
  for (const { keyword, kind } of ROOM_KEYWORDS) {
    if (normalized.includes(keyword)) return kind;
  }
  return 'other';
}

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
 * 2. Classify area.name with roomKind() and take that kind's icon.
 *    An unrecognised name is kind 'other', whose icon is 'house'.
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

  // Name matching, via the shared classifier
  return ICON_BY_KIND[roomKind(area.name)];
}

/**
 * Returns a lucide status icon name when something notable is open/active
 * in the room, else null. Checks only entities in room.entityIds.
 *
 * Priority (first match wins):
 * 1. binary_sensor device_class 'door'                 state 'on' → 'door-open'
 * 2. binary_sensor device_class 'garage_door'          state 'on' → 'car'
 * 3. binary_sensor device_class 'window'|'opening'     state 'on' → 'air-vent'
 *    (AirVent chosen: reads clearly as airflow through an open window)
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
