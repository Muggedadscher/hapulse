/**
 * [fork] Sentinel NVR overview store — cameras, recent events, stats and the
 * hourly histogram, polled by whichever page/card needs them (like Sentinel's
 * own `nvrStore`). One shared poller: the first subscriber starts it, the last
 * stops it; the interval is the smallest requested.
 */

import { useEffect } from 'react';
import { create } from 'zustand';
import type { SentinelCamera, SentinelRecentEvent, SentinelStats } from '@sentinel-nvr/web/api';
import type { SentinelClient } from './api';
import { useNvrConfig } from './config';

export type NvrStatus = 'idle' | 'loading' | 'ready' | 'error';

interface NvrState {
  /** Client key the data belongs to — a config change resets everything. */
  key: string | null;
  status: NvrStatus;
  cameras: SentinelCamera[];
  recent: SentinelRecentEvent[];
  stats: SentinelStats | null;
  histogram: number[];
  loadedAt: number;
  /** HTTP status (401 = bad token, 0 = unreachable) or null. */
  errorStatus: number | null;
  refresh: (client: SentinelClient) => Promise<void>;
  reset: () => void;
}

export const useNvrStore = create<NvrState>()((set, get) => ({
  key: null,
  status: 'idle',
  cameras: [],
  recent: [],
  stats: null,
  histogram: [],
  loadedAt: 0,
  errorStatus: null,

  async refresh(client) {
    if (get().key !== client.key) {
      set({ key: client.key, status: 'loading', cameras: [], recent: [], stats: null, histogram: [], loadedAt: 0, errorStatus: null });
    }
    try {
      const [cameras, recent, stats, hist] = await Promise.all([
        client.getJson<SentinelCamera[]>('api/cameras'),
        client.getJson<SentinelRecentEvent[]>('api/recent-events?limit=40'),
        client.getJson<SentinelStats>('api/stats'),
        // optional (older plugins have no histogram): its failure must not empty everything else
        client.getJson<{ buckets: number[] }>('api/events-histogram').catch(() => ({ buckets: [] as number[] })),
      ]);
      if (get().key !== client.key) return; // config changed mid-flight
      set({ status: 'ready', cameras, recent, stats, histogram: hist.buckets ?? [], loadedAt: Date.now(), errorStatus: null });
    } catch (e) {
      if (get().key !== client.key) return;
      const status = typeof (e as { status?: unknown })?.status === 'number' ? (e as { status: number }).status : 0;
      // Keep stale data visible on a transient failure; flip to error when we have nothing — or when access is
      // gone (401/403: token rotated, token access off): old cameras/events must not pose as current forever.
      set((s) => ({ status: s.loadedAt && status !== 401 && status !== 403 ? s.status : 'error', errorStatus: status }));
    }
  },

  reset() {
    set({ key: null, status: 'idle', cameras: [], recent: [], stats: null, histogram: [], loadedAt: 0, errorStatus: null });
  },
}));

// ---------------------------------------------------------------------------
// Shared poller
// ---------------------------------------------------------------------------

const subscribers = new Map<symbol, number>();
let timer: ReturnType<typeof setInterval> | null = null;
let timerMs = 0;

function restartTimer(): void {
  if (timer) { clearInterval(timer); timer = null; }
  if (subscribers.size === 0) return;
  timerMs = Math.min(...subscribers.values());
  timer = setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    const cfg = currentClient();
    if (cfg) void useNvrStore.getState().refresh(cfg);
  }, timerMs);
}

let currentClient: () => SentinelClient | null = () => null;

/**
 * Keep the overview data fresh while mounted. Refreshes immediately on mount
 * and whenever the tab becomes visible again.
 */
export function useNvrPolling(client: SentinelClient | null, intervalMs = 10_000): void {
  useEffect(() => {
    if (!client) return;
    currentClient = () => client;
    const id = Symbol('nvr-poll');
    subscribers.set(id, intervalMs);
    restartTimer();
    void useNvrStore.getState().refresh(client);
    const vis = () => { if (document.visibilityState === 'visible') void useNvrStore.getState().refresh(client); };
    document.addEventListener('visibilitychange', vis);
    return () => {
      subscribers.delete(id);
      document.removeEventListener('visibilitychange', vis);
      restartTimer();
    };
  }, [client, intervalMs]);
}

/** Convenience: config + polling in one call. */
export function useNvrOverview(intervalMs = 10_000) {
  const cfg = useNvrConfig();
  useNvrPolling(cfg?.client ?? null, intervalMs);
  const state = useNvrStore();
  return { cfg, ...state };
}
