/**
 * Service call facade.
 *
 * Routes calls to the real HA connection OR to applyDemoService when in demo mode.
 * Components must import callService from here — never touch the HAConnection directly.
 */

import {
  applyDemoService,
  DEMO_NOTIFICATIONS,
  generateDemoHistory,
  demoLogbookFromHistory,
  demoLibraryPage,
  parseMALibraryPage,
  parseMASearchResults,
  parseMAQueue,
  demoQueueSnapshot,
  MusicAssistantClient,
  DEMO_MA_LIBRARY,
} from '@hapulse/core';
import type {
  MAQueueSnapshot,
  MAFullQueueItem,
  MAQueueArtwork,
  HistoryPoint,
  LogbookEntry,
  MAEnqueueMode,
  MALibraryPage,
  MAMediaItem,
  MAMediaType,
} from '@hapulse/core';
import type { PersistentNotification, UnsubscribeFunc } from '@hapulse/core';
import { useConnectionStore, getLiveConnection } from '../stores/connectionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useEntityStore } from '../stores/entityStore';

// ---------------------------------------------------------------------------
// Demo persistent notifications — in-memory, since demo mode has no live conn.
// ---------------------------------------------------------------------------

let demoNotifications: PersistentNotification[] = [...DEMO_NOTIFICATIONS];
const demoNotifSubscribers = new Set<(list: PersistentNotification[]) => void>();

function emitDemoNotifications(): void {
  const snapshot = [...demoNotifications];
  for (const cb of demoNotifSubscribers) cb(snapshot);
}

/**
 * Call a Home Assistant service.
 *
 * In demo mode: applies the service mutation locally to entityStore.
 * In live mode: delegates to the HAConnection instance.
 */
export async function callService(
  domain: string,
  service: string,
  data?: Record<string, unknown>,
  target?: { entity_id?: string | string[] }
): Promise<void> {
  const { demo } = useConnectionStore.getState();

  if (demo) {
    // Persistent notifications aren't entities — handle them against the
    // in-memory demo list so dismiss / dismiss-all work in demo mode.
    if (domain === 'persistent_notification') {
      if (service === 'dismiss') {
        const id = data?.['notification_id'];
        demoNotifications = demoNotifications.filter((n) => n.notification_id !== id);
      } else if (service === 'dismiss_all') {
        demoNotifications = [];
      }
      emitDemoNotifications();
      return;
    }

    const { entities } = useEntityStore.getState();
    const updated = applyDemoService(entities, domain, service, data ?? {}, target ?? {});
    useEntityStore.getState().setEntities(updated);
    return;
  }

  const conn = getLiveConnection();
  if (!conn) {
    console.warn('[service] callService called with no active connection');
    return;
  }

  await conn.callService(domain, service, data, target);
}

/**
 * Subscribe to Home Assistant persistent notifications.
 *
 * In demo mode: serves the in-memory demo list (and reflects dismissals).
 * In live mode: delegates to HAConnection.subscribeNotifications, which uses the
 * `persistent_notification/subscribe` WebSocket command. These are NOT entities,
 * so they never come through subscribeEntities / the entity store.
 *
 * `cb` is always invoked at least once with the current list. Returns an
 * unsubscribe function.
 */
export function subscribeNotifications(
  cb: (list: PersistentNotification[]) => void
): UnsubscribeFunc {
  const { demo } = useConnectionStore.getState();

  if (demo) {
    demoNotifSubscribers.add(cb);
    cb([...demoNotifications]);
    return () => {
      demoNotifSubscribers.delete(cb);
    };
  }

  const conn = getLiveConnection();
  if (!conn) {
    cb([]);
    return () => {};
  }

  return conn.subscribeNotifications(cb);
}

// ---------------------------------------------------------------------------
// Entity history + logbook (detail modal)
// ---------------------------------------------------------------------------

/**
 * Fetch an entity's state history for the last `hours`.
 * Demo mode fabricates a deterministic series ending on the current state, so
 * the modal is fully explorable without a Home Assistant.
 */
export async function getEntityHistory(entityId: string, hours: number): Promise<HistoryPoint[]> {
  const end = Date.now();
  const start = end - hours * 3_600_000;
  const { demo } = useConnectionStore.getState();
  if (demo) {
    const entity = useEntityStore.getState().entities[entityId];
    return entity ? generateDemoHistory(entity, start, end) : [];
  }
  const conn = getLiveConnection();
  return conn ? conn.fetchHistory(entityId, new Date(start), new Date(end)) : [];
}

/** Fetch an entity's activity (state changes) for the last `hours`, newest first. */
export async function getEntityLogbook(entityId: string, hours: number): Promise<LogbookEntry[]> {
  const end = Date.now();
  const start = end - hours * 3_600_000;
  const { demo } = useConnectionStore.getState();
  if (demo) {
    const entity = useEntityStore.getState().entities[entityId];
    return entity ? demoLogbookFromHistory(generateDemoHistory(entity, start, end)) : [];
  }
  const conn = getLiveConnection();
  return conn ? conn.fetchLogbook(entityId, new Date(start), new Date(end)) : [];
}

// ---------------------------------------------------------------------------
// Music Assistant library (issue #2)
// ---------------------------------------------------------------------------

export interface MALibraryQuery {
  offset?: number;
  limit?: number;
  search?: string;
  favorite?: boolean;
}

/**
 * Fetch one page of the Music Assistant library, or null when the call fails —
 * the card shows a "couldn't load" state then, never a misleading "empty".
 * Pagination is FLAT limit/offset: a nested `pagination` object is rejected
 * with a 400 (verified against a live MA install).
 */
export async function getMALibrary(
  configEntryId: string,
  mediaType: MAMediaType,
  query: MALibraryQuery = {},
): Promise<MALibraryPage | null> {
  const { demo } = useConnectionStore.getState();
  if (demo) return demoLibraryPage(mediaType, query);

  const conn = getLiveConnection();
  if (!conn) return null;
  try {
    const response = await conn.callServiceWithResponse('music_assistant', 'get_library', {
      config_entry_id: configEntryId,
      media_type: mediaType,
      ...(query.search ? { search: query.search } : {}),
      ...(query.favorite ? { favorite: true } : {}),
      limit: query.limit ?? 60,
      offset: query.offset ?? 0,
    });
    return parseMALibraryPage(response, mediaType);
  } catch (err) {
    console.warn('[HAPulse] music assistant: get_library failed:', err);
    return null;
  }
}

/**
 * Play (or enqueue) a library item on a Music Assistant player.
 * Demo mode plays it pretend-style: the target player starts "playing" the
 * item so the whole flow is demonstrable.
 */
export async function playMAMedia(
  playerEntityId: string,
  item: MAMediaItem,
  enqueue: MAEnqueueMode = 'play',
): Promise<void> {
  const { demo } = useConnectionStore.getState();
  if (demo) {
    if (enqueue !== 'play' && enqueue !== 'replace') return; // queueing has no visible demo effect
    const store = useEntityStore.getState();
    const player = store.entities[playerEntityId];
    if (!player) return;
    store.setEntities({
      ...store.entities,
      [playerEntityId]: {
        ...player,
        state: 'playing',
        attributes: {
          ...player.attributes,
          media_title: item.name,
          media_artist: item.media_type === 'artist' ? item.name : 'Demo Library',
          entity_picture: null,
        },
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      },
    });
    return;
  }

  const conn = getLiveConnection();
  if (!conn) return;
  await conn.callService(
    'music_assistant',
    'play_media',
    { media_id: item.uri, media_type: item.media_type, enqueue },
    { entity_id: playerEntityId },
  );
}

/**
 * Global music search across every provider Music Assistant has enabled
 * (Spotify, local library, radio, …) via the `music_assistant.search`
 * response service. `limit` is flat here too. Null on failure.
 */
export async function searchMAMedia(
  configEntryId: string,
  name: string,
  mediaType: MAMediaType,
  limit = 40,
): Promise<MAMediaItem[] | null> {
  const { demo } = useConnectionStore.getState();
  if (demo) return demoLibraryPage(mediaType, { search: name, limit }).items;

  const conn = getLiveConnection();
  if (!conn) return null;
  try {
    const response = await conn.callServiceWithResponse('music_assistant', 'search', {
      config_entry_id: configEntryId,
      name,
      media_type: [mediaType],
      limit,
    });
    return parseMASearchResults(response, mediaType);
  } catch (err) {
    console.warn('[HAPulse] music assistant: search failed:', err);
    return null;
  }
}

/**
 * Snapshot of a Music Assistant player's queue (count, shuffle/repeat,
 * current and next item). Null on failure or when the player has no queue.
 */
export async function getMAQueue(playerEntityId: string): Promise<MAQueueSnapshot | null> {
  const { demo } = useConnectionStore.getState();
  if (demo) {
    const player = useEntityStore.getState().entities[playerEntityId];
    return player ? demoQueueSnapshot(player.attributes) : null;
  }
  const conn = getLiveConnection();
  if (!conn) return null;
  try {
    const response = await conn.callServiceWithResponse(
      'music_assistant',
      'get_queue',
      undefined,
      { entity_id: playerEntityId },
    );
    return parseMAQueue(response, playerEntityId);
  } catch (err) {
    console.warn('[HAPulse] music assistant: get_queue failed:', err);
    return null;
  }
}

/** Group `memberIds` onto `leaderId` (media_player.join — works for MA, Sonos, …). */
export async function joinPlayers(leaderId: string, memberIds: string[]): Promise<void> {
  await callService('media_player', 'join', { group_members: memberIds }, { entity_id: leaderId });
}

/** Remove a player from whatever speaker group it is in. */
export async function unjoinPlayer(entityId: string): Promise<void> {
  await callService('media_player', 'unjoin', {}, { entity_id: entityId });
}

/** Move a Music Assistant queue from one player to another and keep playing. */
export async function transferMAQueue(sourceId: string, targetId: string): Promise<void> {
  await callService(
    'music_assistant',
    'transfer_queue',
    { source_player: sourceId, auto_play: true },
    { entity_id: targetId },
  );
}

// ---------------------------------------------------------------------------
// Full queue — direct Music Assistant connection (optional upgrade)
// ---------------------------------------------------------------------------

let _maClient: MusicAssistantClient | null = null;
let _maClientKey = '';

/** Demo full queue, mutable so reorder/delete are demonstrable. */
let _demoQueue: MAFullQueueItem[] | null = null;
function demoFullQueue(): MAFullQueueItem[] {
  if (_demoQueue == null) {
    _demoQueue = DEMO_MA_LIBRARY.track.map((t, i) => ({
      queueItemId: `demo-item-${i}`,
      name: t.name,
      artist: 'Demo Library',
      image: null,
      durationSeconds: 180 + (i % 5) * 37,
    }));
  }
  return _demoQueue;
}

/** True when the full-queue upgrade can work (demo, or URL+token configured). */
export function hasDirectMA(): boolean {
  const { demo } = useConnectionStore.getState();
  if (demo) return true;
  const { maServerUrl, maToken } = useSettingsStore.getState().customization;
  return maServerUrl != null && maServerUrl !== '' && maToken != null && maToken !== '';
}

function directClient(): MusicAssistantClient | null {
  const { maServerUrl, maToken } = useSettingsStore.getState().customization;
  if (!maServerUrl || !maToken) return null;
  const key = `${maServerUrl}\u0000${maToken}`;
  if (_maClient == null || _maClientKey !== key) {
    _maClient?.close();
    _maClient = new MusicAssistantClient(maServerUrl, maToken);
    _maClientKey = key;
  }
  return _maClient;
}

/** The queue's full item list, or null when unavailable/failed. */
export async function getMAQueueItems(queueId: string): Promise<MAFullQueueItem[] | null> {
  const { demo } = useConnectionStore.getState();
  if (demo) return [...demoFullQueue()];
  const client = directClient();
  if (!client) return null;
  try {
    return await client.queueItems(queueId);
  } catch (err) {
    console.warn('[HAPulse] music assistant: queue items failed:', err);
    return null;
  }
}

/** Move a queue item from one index to another. Throws on failure. */
export async function moveMAQueueItem(
  queueId: string,
  queueItemId: string,
  fromIndex: number,
  toIndex: number,
): Promise<void> {
  const { demo } = useConnectionStore.getState();
  if (demo) {
    const q = demoFullQueue();
    const [moved] = q.splice(fromIndex, 1);
    if (moved) q.splice(toIndex, 0, moved);
    return;
  }
  const client = directClient();
  if (!client) return;
  await client.moveItem(queueId, queueItemId, toIndex - fromIndex);
}

/** Remove an item from the queue. Throws on failure. */
export async function deleteMAQueueItem(queueId: string, queueItemId: string): Promise<void> {
  const { demo } = useConnectionStore.getState();
  if (demo) {
    _demoQueue = demoFullQueue().filter((i) => i.queueItemId !== queueItemId);
    return;
  }
  const client = directClient();
  if (!client) return;
  await client.deleteItem(queueId, queueItemId);
}

/** Artwork for every active queue — feeds the players/zones artwork fallback. */
export async function getMAQueuesArtwork(): Promise<MAQueueArtwork[] | null> {
  const { demo } = useConnectionStore.getState();
  if (demo) return [];
  const client = directClient();
  if (!client) return null;
  try {
    return await client.queuesArtwork();
  } catch (err) {
    console.warn('[HAPulse] music assistant: queues artwork failed:', err);
    return null;
  }
}
