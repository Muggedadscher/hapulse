/**
 * useEnergy — loads + computes the Energy dashboard for a given period.
 *
 * Fetches energy preferences, the statistics behind them, and the configured
 * currency, then aggregates everything via core's `computeEnergyDashboard`.
 * Re-runs when the connection (re)establishes or the period changes.
 *
 * Persistent notifications and energy are the two HA data sources that do NOT
 * flow through the entity store — energy lives in long-term statistics, fetched
 * here on demand.
 */

import { useEffect, useState } from 'react';
import {
  computeEnergyDashboard,
  energyStatisticIds,
  energyPeriodRange,
  isEnergyConfigured,
} from '@hapulse/core';
import type { EnergyDashboard, EnergyPeriod, EnergyPreferences } from '@hapulse/core';
import { getEnergyPrefs, getStatistics, getCurrency } from './energy';
import { useConnectionStore } from '../stores/connectionStore';
import { useEntityStore } from '../stores/entityStore';

export type EnergyLoadState = 'loading' | 'not-configured' | 'ready' | 'error';

export interface UseEnergyResult {
  state: EnergyLoadState;
  dashboard: EnergyDashboard | null;
  prefs: EnergyPreferences | null;
  currency: string | null;
  /** [fork] The period `dashboard` was computed for (it lags `period` while the next one loads). */
  loadedPeriod: EnergyPeriod;
  /** Force a re-fetch (e.g. after a manual refresh). */
  reload: () => void;
}

export function useEnergy(period: EnergyPeriod): UseEnergyResult {
  const status = useConnectionStore((s) => s.status);
  const mode = useConnectionStore((s) => s.mode);

  const [state, setState] = useState<EnergyLoadState>('loading');
  const [dashboard, setDashboard] = useState<EnergyDashboard | null>(null);
  const [prefs, setPrefs] = useState<EnergyPreferences | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [loadedPeriod, setLoadedPeriod] = useState<EnergyPeriod>(period); // [fork]

  useEffect(() => {
    if (status !== 'connected') {
      setState('loading');
      return;
    }

    let cancelled = false;
    setState('loading');

    (async () => {
      try {
        const loadedPrefs = await getEnergyPrefs();
        if (cancelled) return;

        if (!isEnergyConfigured(loadedPrefs)) {
          setPrefs(loadedPrefs);
          setDashboard(null);
          setState('not-configured');
          return;
        }

        setPrefs(loadedPrefs);

        const ids = energyStatisticIds(loadedPrefs!);
        const { start, end, bucket } = energyPeriodRange(period);

        const [stats, curr] = await Promise.all([
          getStatistics(ids, bucket, start, end),
          getCurrency(),
        ]);
        if (cancelled) return;

        // Entity map (non-reactive read) supplies units + price-entity states.
        const entities = useEntityStore.getState().entities;
        const computed = computeEnergyDashboard(loadedPrefs!, stats, entities);

        setCurrency(curr);
        setDashboard(computed);
        setLoadedPeriod(period); // [fork]
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        console.warn('[HAPulse] useEnergy failed:', err);
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, mode, period, nonce]);

  return { state, dashboard, prefs, currency, loadedPeriod /* [fork] */, reload: () => setNonce((n) => n + 1) };
}
