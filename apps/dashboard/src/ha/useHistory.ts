/**
 * useHistory — loads numeric state history for one entity over a range.
 *
 * Fetches on demand (only when `entityId` is non-null, i.e. the modal is
 * open), re-fetching when the entity or range changes. Mirrors the
 * fetch-on-demand pattern of `useEnergy` — history lives in the recorder, not
 * the entity store.
 */

import { useEffect, useState } from 'react';
import { historyRangeSpec, summarizeHistory } from '@hapulse/core';
import type { HistoryPoint, HistoryRange, HistorySummary } from '@hapulse/core';
import { getHistory } from './history';

export type HistoryLoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

export interface UseHistoryResult {
  state: HistoryLoadState;
  points: HistoryPoint[];
  summary: HistorySummary | null;
}

/**
 * @param entityId - entity to load, or `null` to stay idle (e.g. modal closed)
 * @param range    - look-back window
 */
export function useHistory(entityId: string | null, range: HistoryRange): UseHistoryResult {
  const [state, setState] = useState<HistoryLoadState>('idle');
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [summary, setSummary] = useState<HistorySummary | null>(null);

  useEffect(() => {
    if (!entityId) {
      setState('idle');
      setPoints([]);
      setSummary(null);
      return;
    }

    let cancelled = false;
    setState('loading');

    (async () => {
      try {
        const now = Date.now();
        const startMs = now - historyRangeSpec(range).durationMs;
        const pts = await getHistory(entityId, startMs, now);
        if (cancelled) return;

        setPoints(pts);
        setSummary(summarizeHistory(pts));
        setState(pts.length === 0 ? 'empty' : 'ready');
      } catch (err) {
        if (cancelled) return;
        console.warn('[HAPulse] useHistory failed:', err);
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entityId, range]);

  return { state, points, summary };
}
