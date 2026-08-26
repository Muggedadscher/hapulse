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
} from '@hapulse/core';
import type { HistoryPoint, LogbookEntry } from '@hapulse/core';
import type { PersistentNotification, UnsubscribeFunc } from '@hapulse/core';
import { useConnectionStore, getLiveConnection } from '../stores/connectionStore';
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
