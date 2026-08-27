/**
 * useHistory — loads numeric state history for one entity over a range.
 *
 * Fetches on demand (only when `entityId` is non-null, i.e. the modal is
 * open), re-fetching when the entity or range changes. Mirrors the
 * fetch-on-demand pattern of `useEnergy` — history lives in the recorder, not
 * the entity store.
 *
 * Crucially, a range change does NOT clear the previous points: they stay
 * visible while the new range loads, so the chart can animate smoothly from
 * the old series into the new one instead of blanking out.
 */

import { useEffect, useState } from 'react';
import { historyRangeSpec, summarizeHistory } from '@hapulse/core';
import type { SensorHistoryPoint, HistoryRange, HistorySummary } from '@hapulse/core';
import { getHistory } from './history';

export interface UseHistoryResult {
  /** A fetch is in flight (initial load or a range switch). */
  loading: boolean;
  /** The last fetch failed. */
  error: boolean;
  /** A fetch finished with zero points. */
  empty: boolean;
  /** Most recently loaded series (kept during a refetch). */
  points: SensorHistoryPoint[];
  summary: HistorySummary | null;
}

/**
 * @param entityId - entity to load, or `null` to stay idle (e.g. modal closed)
 * @param range    - look-back window
 */
export function useHistory(entityId: string | null, range: HistoryRange): UseHistoryResult {
  const [points, setPoints] = useState<SensorHistoryPoint[]>([]);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (!entityId) {
      setPoints([]);
      setSummary(null);
      setLoading(false);
      setError(false);
      setLoadedOnce(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const now = Date.now();
        const startMs = now - historyRangeSpec(range).durationMs;
        const pts = await getHistory(entityId, startMs, now);
        if (cancelled) return;

        // Replace points only when the new series has arrived — the old one
        // stayed on screen until now, enabling a smooth morph.
        setPoints(pts);
        setSummary(summarizeHistory(pts));
        setLoadedOnce(true);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.warn('[HAPulse] useHistory failed:', err);
        setError(true);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entityId, range]);

  const empty = loadedOnce && !loading && points.length === 0;

  return { loading, error, empty, points, summary };
}
