/**
 * maArtwork — artwork rescue for the hosted dashboard.
 *
 * `entity_picture` covers point at the Home Assistant origin, which the
 * https-hosted dashboard often cannot load (http:// → mixed content). Music
 * Assistant knows a better URL for whatever is playing: the provider's own
 * artwork (Spotify's https CDN), delivered by `player_queues/all` over the
 * optional direct MA connection — the same source that makes the queue card's
 * covers work everywhere.
 *
 * This module keeps a small polled cache of "queue → current title + cover"
 * and resolves an entity two ways:
 *   1. MA players carry their queue id in `attributes.active_queue`.
 *   2. Wrapper players (universal, cast duplicates) don't — but they mirror
 *      the same `media_title`, so a title match recovers the cover.
 *
 * Polling only runs while at least one component subscribes and the direct
 * connection is configured; without it the cache stays empty and callers
 * fall back to their placeholder as before.
 */

import { useSyncExternalStore } from 'react';
import type { HassEntity, MAQueueArtwork } from '@hapulse/core';
import { hasDirectMA, getMAQueuesArtwork } from '../ha/service';

const POLL_MS = 15_000;

let entries: MAQueueArtwork[] = [];
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let fetching = false;

async function refresh(): Promise<void> {
  if (fetching || !hasDirectMA()) return;
  fetching = true;
  try {
    const next = await getMAQueuesArtwork();
    if (next != null) {
      // Only notify when something actually changed — cheap shallow compare.
      const changed =
        next.length !== entries.length ||
        next.some((e, i) => {
          const prev = entries[i];
          return prev == null || prev.queueId !== e.queueId || prev.title !== e.title || prev.image !== e.image;
        });
      if (changed) {
        entries = next;
        for (const l of listeners) l();
      }
    }
  } finally {
    fetching = false;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer == null) {
    void refresh();
    timer = setInterval(() => void refresh(), POLL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer != null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot(): MAQueueArtwork[] {
  return entries;
}

/**
 * The best MA-known artwork URL for what `entity` is playing, or null.
 * Matches by the player's active_queue id first, then by media_title.
 */
export function useMAArtwork(entity: HassEntity | null | undefined): string | null {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (entity == null) return null;

  const queueId = entity.attributes['active_queue'];
  if (typeof queueId === 'string') {
    const byQueue = all.find((e) => e.queueId === queueId);
    if (byQueue?.image != null) return byQueue.image;
  }

  const title = entity.attributes['media_title'];
  if (typeof title === 'string' && title !== '') {
    const byTitle = all.find((e) => e.title === title);
    if (byTitle?.image != null) return byTitle.image;
  }

  return null;
}
