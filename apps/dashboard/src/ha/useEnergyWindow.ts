/**
 * [fork] useEnergyWindow — the data of the Glas energy card (docs/GLAS-DESIGN.md §7.9, docs/glas/PLAN-ETAPPE-4.md
 * K75, variant V4).
 *
 * One period at a time: today hourly, the last 7 days or the last 30 days (core `glasEnergyWindow`), one bar per
 * hour or day of what the home used, and the change against the period before, both up to the last full hour
 * (`glasEnergyCompare`). Period and comparison are fetched together. Results are remembered per period until the
 * next full hour (plus 90 s: Home Assistant writes an hour's statistics row shortly after the hour), so switching
 * back to a period shows it at once; while a period loads for the first time, the result on screen stays there
 * (`stale`), so the card keeps its place and the focus stays in the segment. A failed load keeps what is shown and
 * tries again after 30 s. Energy lives in long-term statistics, not in the entity store (like `useEnergy`). A result
 * belongs to its window: after midnight (today, the last 7 or 30 days start a day later) the day before's result is
 * no longer remembered and, while the new one loads, shows as `stale`. The phone's More menu mounts its figure only
 * while it is open (docs/glas/PLAN-ETAPPE-5.md K97), so it fetches only then.
 */

import { useEffect, useState } from 'react';
import {
  computeEnergyDashboard,
  energyChange,
  energyStatisticIds,
  glasEnergyBars,
  glasEnergyCompare,
  glasEnergyWindow,
  isEnergyConfigured,
  trimStatistics,
} from '@hapulse/core';
import type { EnergyDashboard, GlasEnergyBar, GlasEnergyPeriod, GlasEnergyWindow } from '@hapulse/core';
import { getEnergyPrefs, getStatistics } from './energy';
import { useConnectionStore } from '../stores/connectionStore';
import { useEntityStore } from '../stores/entityStore';

export interface EnergyWindowData {
  period: GlasEnergyPeriod;
  window: GlasEnergyWindow;
  /** The moment the bars were computed for (epoch ms). */
  now: number;
  dashboard: EnergyDashboard;
  bars: GlasEnergyBar[];
  /** Consumption against the period before in whole percent; null when there is nothing to compare with. */
  change: number | null;
}

export type EnergyWindowState = 'loading' | 'not-configured' | 'ready' | 'error';

export interface UseEnergyWindowResult {
  state: EnergyWindowState;
  /** The result on screen; while another period loads, the previous one (`stale`). */
  data: EnergyWindowData | null;
  stale: boolean;
}

type Result = { state: 'not-configured' } | { state: 'ready'; data: EnergyWindowData };

const HOUR = 3600_000;
/** Home Assistant writes an hour's statistics row shortly after the hour. */
const ROW_LAG_MS = 90_000;
const RETRY_MS = 30_000;

/** A result stays valid within its slot: from 90 s after a full hour to 90 s after the next one. */
const slotOf = (t: number): number => Math.floor((t - ROW_LAG_MS) / HOUR);

/** The result still belongs to the period's window as of now (a day's result is yesterday's after midnight). */
const current = (result: Result, period: GlasEnergyPeriod): boolean =>
  result.state !== 'ready' || result.data.window.bounds[0] === glasEnergyWindow(period, new Date()).bounds[0];

/** Remembered results of the current connection, per period. */
const cache = new Map<GlasEnergyPeriod, { result: Result; slot: number }>();
let cacheOwner = '';

async function load(period: GlasEnergyPeriod): Promise<Result> {
  const prefs = await getEnergyPrefs();
  if (!prefs || !isEnergyConfigured(prefs)) return { state: 'not-configured' };
  const ids = energyStatisticIds(prefs);
  const now = new Date();
  const win = glasEnergyWindow(period, now);
  const cmp = glasEnergyCompare(win, now);
  const iso = (t: number) => new Date(t).toISOString();
  const [stats, before] = await Promise.all([
    getStatistics(ids, win.bucket, iso(win.bounds[0]!), now.toISOString()),
    cmp.previous.end > cmp.previous.start
      ? getStatistics(ids, win.bucket, iso(cmp.previous.start), iso(cmp.previous.end))
      : Promise.resolve(null),
  ]);
  // Entity map (non-reactive read) supplies units, like useEnergy.
  const entities = useEntityStore.getState().entities;
  const dashboard = computeEnergyDashboard(prefs, stats, entities);
  const change = before
    ? energyChange(
        computeEnergyDashboard(prefs, trimStatistics(stats, cmp.current.end), entities).homeConsumption,
        computeEnergyDashboard(prefs, trimStatistics(before, cmp.previous.end), entities).homeConsumption,
      )
    : null;
  const bars = glasEnergyBars(win, dashboard.series, now);
  return { state: 'ready', data: { period, window: win, now: now.getTime(), dashboard, bars, change } };
}

export function useEnergyWindow(period: GlasEnergyPeriod): UseEnergyWindowResult {
  const status = useConnectionStore((s) => s.status);
  const owner = useConnectionStore((s) => (s.demo ? 'demo' : s.url));
  const remembered = (p: GlasEnergyPeriod) => {
    const hit = cacheOwner === owner ? cache.get(p) : undefined;
    return hit && current(hit.result, p) ? hit.result : undefined;
  };
  const [shown, setShown] = useState<{ result: Result | null; failed: boolean }>(() => ({
    result: remembered(period) ?? null,
    failed: false,
  }));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (status !== 'connected') return undefined;
    if (cacheOwner !== owner) {
      cache.clear();
      cacheOwner = owner;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const later = (ms: number) => {
      timer = setTimeout(() => setTick((n) => n + 1), ms);
    };
    const untilNextSlot = () => Math.max(1000, (slotOf(Date.now()) + 1) * HOUR + ROW_LAG_MS - Date.now());
    const found = cache.get(period);
    const hit = found && current(found.result, period) ? found : undefined;
    if (hit) setShown({ result: hit.result, failed: false });
    if (hit && hit.slot === slotOf(Date.now())) {
      later(untilNextSlot());
    } else {
      const slot = slotOf(Date.now());
      load(period).then(
        (result) => {
          // remembered also when the period changed meanwhile: switching back needs no second fetch
          if (cacheOwner === owner) cache.set(period, { result, slot });
          if (cancelled) return;
          setShown({ result, failed: false });
          // a load that ran across the boundary may miss the newest hour: fetch again right away
          later(slotOf(Date.now()) === slot ? untilNextSlot() : 0);
        },
        (err: unknown) => {
          if (cancelled) return;
          console.warn('[HAPulse] useEnergyWindow failed:', err);
          setShown((s) => ({ result: s.result, failed: true }));
          later(RETRY_MS);
        },
      );
    }
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [status, owner, period, tick]);

  // The period's own result wins as soon as it exists (no frame with the previous one after switching back).
  const result = remembered(period) ?? shown.result;
  if (!result) return { state: shown.failed ? 'error' : 'loading', data: null, stale: false };
  if (result.state === 'not-configured') return { state: 'not-configured', data: null, stale: false };
  return { state: 'ready', data: result.data, stale: result.data.period !== period || !current(result, period) };
}
