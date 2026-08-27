/**
 * Music Assistant — detection, library types, and demo data (issue #2).
 *
 * HAPulse never talks to the Music Assistant server directly: everything goes
 * through Home Assistant's own APIs, so it works over the one connection the
 * app already holds (OAuth or token) with no extra auth story.
 *
 * - Detection: MA's players carry `platform: "music_assistant"` in the entity
 *   registry, and their registry entries name the config entry id that the
 *   `music_assistant.get_library` / `search` response services require. Both
 *   are in the partial registry dicts HAPulse already fetches (verified
 *   against HA's `config/entity_registry/list`).
 * - Library: `music_assistant.get_library` returns typed items with real
 *   pagination — preferred over `media_player/browse_media`, which returns
 *   an entire, unpaginated level (500 albums in one response on a real
 *   install).
 * - Playback: `music_assistant.play_media` with an `enqueue` mode, targeted
 *   at an MA player entity.
 */

import type { Registries } from './types.js';

/** Library media types get_library accepts, in the order tabs render. */
export const MA_MEDIA_TYPES = ['playlist', 'album', 'artist', 'track', 'radio'] as const;
export type MAMediaType = (typeof MA_MEDIA_TYPES)[number];

/** Enqueue modes of `music_assistant.play_media`. */
export type MAEnqueueMode = 'play' | 'replace' | 'next' | 'replace_next' | 'add';

/** One library item as `get_library` returns it. */
export interface MAMediaItem {
  media_type: string;
  uri: string;
  name: string;
  /** Artwork URL — may be an http:// LAN imageproxy URL, which an https-served
   *  dashboard cannot load (mixed content); render a placeholder on error. */
  image: string | null;
  favorite: boolean;
  /** Album version / artist disambiguator — often empty. */
  version?: string;
  /** Secondary line (artist credits on search results). */
  subtitle?: string;
}

export interface MALibraryPage {
  items: MAMediaItem[];
  limit: number;
  offset: number;
  media_type: string;
}

export interface MusicAssistantInfo {
  /** Config entry id required by the get_library / search services. */
  configEntryId: string;
  /** entity_ids of the MA media players, for playback targeting. */
  playerIds: string[];
}

/**
 * Detect Music Assistant from the entity registry. Returns null when the
 * integration isn't set up — the Music page then keeps its regular layout.
 */
export function findMusicAssistant(registries: Registries | null | undefined): MusicAssistantInfo | null {
  const players: string[] = [];
  let configEntryId: string | null = null;
  for (const re of registries?.entities ?? []) {
    if (re.platform !== 'music_assistant') continue;
    if (!re.entity_id.startsWith('media_player.')) continue;
    players.push(re.entity_id);
    if (configEntryId == null && re.config_entry_id != null) {
      configEntryId = re.config_entry_id;
    }
  }
  if (configEntryId == null || players.length === 0) return null;
  return { configEntryId, playerIds: players.sort() };
}

/** Parse a `get_library` service response defensively. */
export function parseMALibraryPage(response: unknown, fallbackType: string): MALibraryPage {
  const empty: MALibraryPage = { items: [], limit: 0, offset: 0, media_type: fallbackType };
  if (typeof response !== 'object' || response === null) return empty;
  const r = response as Record<string, unknown>;
  const rawItems = Array.isArray(r['items']) ? r['items'] : [];
  const items: MAMediaItem[] = [];
  for (const raw of rawItems) {
    if (typeof raw !== 'object' || raw === null) continue;
    const it = raw as Record<string, unknown>;
    if (typeof it['uri'] !== 'string' || typeof it['name'] !== 'string') continue;
    items.push({
      media_type: typeof it['media_type'] === 'string' ? it['media_type'] : fallbackType,
      uri: it['uri'],
      name: it['name'],
      image: typeof it['image'] === 'string' && it['image'] !== '' ? it['image'] : null,
      favorite: it['favorite'] === true,
      ...(typeof it['version'] === 'string' && it['version'] !== '' ? { version: it['version'] } : {}),
    });
  }
  return {
    items,
    limit: typeof r['limit'] === 'number' ? r['limit'] : items.length,
    offset: typeof r['offset'] === 'number' ? r['offset'] : 0,
    media_type: typeof r['media_type'] === 'string' ? r['media_type'] : fallbackType,
  };
}

// ---------------------------------------------------------------------------
// Demo library — lets the public demo showcase the browser without an MA.
// All names are invented; no artwork (the UI renders its placeholder).
// ---------------------------------------------------------------------------

function demoItems(type: MAMediaType, names: string[], favorites: number[] = []): MAMediaItem[] {
  return names.map((name, i) => ({
    media_type: type,
    uri: `library://${type}/demo-${i}`,
    name,
    image: null,
    favorite: favorites.includes(i),
  }));
}

export const DEMO_MA_LIBRARY: Record<MAMediaType, MAMediaItem[]> = {
  playlist: demoItems('playlist', [
    'Morning Coffee', 'Deep Focus', 'Friday Night', 'Sunday Slowdown', 'Workout Mix',
    'Dinner Jazz', 'Road Trip', 'Rainy Day', 'Summer 2026', 'Kitchen Karaoke',
    'Study Beats', 'Golden Oldies',
  ], [0, 1, 6]),
  album: demoItems('album', [
    'Midnight Frequencies', 'Paper Planes', 'The Long Way Home', 'Neon Gardens',
    'Static & Bloom', 'Harbour Lights', 'Second Sunrise', 'Glasshouse',
    'Northern Sky', 'Analog Hearts', 'Field Notes', 'Twelve Windows',
  ], [2, 7]),
  artist: demoItems('artist', [
    'The Paper Kites', 'Nova Verde', 'Cassette Club', 'Marlowe & June',
    'Echo Atlas', 'Golden Hour Trio', 'Weekend Static', 'Lumen',
    'The Slow North', 'Violet Fields',
  ], [1]),
  track: demoItems('track', [
    'Open Windows', 'Coastline', 'Small Hours', 'Amber', 'Weightless',
    'Fern Valley', 'Sunprint', 'Night Bus', 'Clover', 'Low Tide',
    'Paper Boats', 'Warm Static', 'Half Moon', 'Ivy',
  ], [0, 4]),
  radio: demoItems('radio', [
    'Smooth FM', 'Jazz24', 'Indie Nation', 'Classical One', 'Night Grooves', 'Radio Paradiso',
  ], [3]),
};

/** Slice the demo library the way get_library paginates the real one. */
export function demoLibraryPage(
  mediaType: MAMediaType,
  opts: { offset?: number; limit?: number; search?: string; favorite?: boolean } = {},
): MALibraryPage {
  const { offset = 0, limit = 60, search, favorite } = opts;
  let items = DEMO_MA_LIBRARY[mediaType];
  if (favorite) items = items.filter((i) => i.favorite);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(q));
  }
  return { items: items.slice(offset, offset + limit), limit, offset, media_type: mediaType };
}

/** Map a singular media type to the plural bucket `search` responds with. */
const SEARCH_BUCKETS: Record<MAMediaType, string> = {
  playlist: 'playlists',
  album: 'albums',
  artist: 'artists',
  track: 'tracks',
  radio: 'radio',
};

/**
 * Parse a `music_assistant.search` response into items of one media type.
 * Search spans every enabled provider (Spotify, local library, …); items carry
 * provider URIs that `play_media` accepts directly, and artist credits become
 * the tile subtitle.
 */
export function parseMASearchResults(response: unknown, mediaType: MAMediaType): MAMediaItem[] {
  if (typeof response !== 'object' || response === null) return [];
  const bucket = (response as Record<string, unknown>)[SEARCH_BUCKETS[mediaType]];
  if (!Array.isArray(bucket)) return [];
  const items: MAMediaItem[] = [];
  for (const raw of bucket) {
    if (typeof raw !== 'object' || raw === null) continue;
    const it = raw as Record<string, unknown>;
    if (typeof it['uri'] !== 'string' || typeof it['name'] !== 'string') continue;
    const artists = Array.isArray(it['artists'])
      ? (it['artists'] as unknown[])
          .map((a) => (typeof a === 'object' && a !== null ? (a as Record<string, unknown>)['name'] : null))
          .filter((n): n is string => typeof n === 'string')
      : [];
    items.push({
      media_type: typeof it['media_type'] === 'string' ? it['media_type'] : mediaType,
      uri: it['uri'],
      name: it['name'],
      image: typeof it['image'] === 'string' && it['image'] !== '' ? it['image'] : null,
      favorite: it['favorite'] === true,
      ...(typeof it['version'] === 'string' && it['version'] !== '' ? { version: it['version'] } : {}),
      ...(artists.length > 0 ? { subtitle: artists.join(', ') } : {}),
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Queue (music_assistant.get_queue)
// ---------------------------------------------------------------------------

/** One queue entry, reduced to what the queue card renders. */
export interface MAQueueItem {
  name: string;
  image: string | null;
  artist: string | null;
}

export interface MAQueueSnapshot {
  /** MA's queue id — addresses the queue on the direct MA API. */
  queueId: string | null;
  /** Total items in the queue. */
  items: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  /** 1-based position of the playing item, when known. */
  position: number | null;
  current: MAQueueItem | null;
  next: MAQueueItem | null;
}

/** Extract a queue item's display fields from whichever nesting MA used. */
function parseQueueItem(raw: unknown): MAQueueItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const it = raw as Record<string, unknown>;
  const media = typeof it['media_item'] === 'object' && it['media_item'] !== null
    ? (it['media_item'] as Record<string, unknown>)
    : {};
  const name = typeof it['name'] === 'string' ? it['name']
    : typeof media['name'] === 'string' ? media['name'] : null;
  if (name == null) return null;
  const image = typeof media['image'] === 'string' && media['image'] !== '' ? media['image']
    : typeof it['image'] === 'string' && it['image'] !== '' ? it['image'] : null;
  const artists = Array.isArray(media['artists'])
    ? (media['artists'] as unknown[])
        .map((a) => (typeof a === 'object' && a !== null ? (a as Record<string, unknown>)['name'] : null))
        .filter((n): n is string => typeof n === 'string')
    : [];
  return { name, image, artist: artists.length > 0 ? artists.join(', ') : null };
}

/**
 * Parse a `get_queue` response. The service responds keyed by entity_id:
 * `{ "media_player.x": { queue_id, items, shuffle_enabled, repeat_mode,
 * current_index, current_item, next_item, … } }` (shape captured live).
 */
export function parseMAQueue(response: unknown, entityId: string): MAQueueSnapshot | null {
  if (typeof response !== 'object' || response === null) return null;
  const q = (response as Record<string, unknown>)[entityId];
  if (typeof q !== 'object' || q === null) return null;
  const r = q as Record<string, unknown>;
  const repeatRaw = r['repeat_mode'];
  const repeat = repeatRaw === 'all' || repeatRaw === 'one' ? repeatRaw : 'off';
  const index = typeof r['current_index'] === 'number' ? r['current_index'] : null;
  return {
    queueId: typeof r['queue_id'] === 'string' ? r['queue_id'] : null,
    items: typeof r['items'] === 'number' ? r['items'] : 0,
    shuffle: r['shuffle_enabled'] === true,
    repeat,
    position: index != null ? index + 1 : null,
    current: parseQueueItem(r['current_item']),
    next: parseQueueItem(r['next_item']),
  };
}

/** Fabricated queue for demo mode, derived from what the player shows. */
export function demoQueueSnapshot(playerAttributes: Record<string, unknown>): MAQueueSnapshot {
  const title = typeof playerAttributes['media_title'] === 'string' ? playerAttributes['media_title'] : null;
  const artist = typeof playerAttributes['media_artist'] === 'string' ? playerAttributes['media_artist'] : null;
  const tracks = DEMO_MA_LIBRARY.track;
  const next = tracks[(title?.length ?? 0) % tracks.length]!;
  return {
    queueId: 'demo-queue',
    items: title != null ? 14 : 0,
    shuffle: false,
    repeat: 'off',
    position: title != null ? 3 : null,
    current: title != null ? { name: title, image: null, artist } : null,
    next: title != null ? { name: next.name, image: null, artist: 'Demo Library' } : null,
  };
}
