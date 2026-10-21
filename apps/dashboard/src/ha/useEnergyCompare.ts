/**
 * [fork] useEnergyCompare — the energy page's comparison with the period before (plan glas/energie-neu/umsetzung/PLAN.md
 * §6): the home's consumption from the period's start up to the last full hour against the same span of the period
 * before (core `energyPageCompare`). Hourly statistics for today, the week and the month; the year compares whole
 * days (up to today 00:00 against the same date a year earlier), so it needs no 8 760 rows. Only the electricity
 * sources are fetched (the home's consumption needs no devices, water or gas). The hour counts as finished 90 s after
 * it ends, when Home Assistant has written its row; results are shared per connection, period and hour, a failed load
 * is tried again on the next render cycle. Returns the change in whole percent, or null while loading, without data or
 * without anything to compare with.
 */

import { useEffect, useState } from 'react';
import {
  computeEnergyDashboard,
  energyChange,
  energyPageCompare,
  energyPageWindow,
  energyStatisticIds,
  isEnergyConfigured,
} from '@hapulse/core';
import type { EnergyPeriod, EnergyPreferences } from '@hapulse/core';
import { getEnergyPrefs, getStatistics } from './energy';
import { useConnectionStore } from '../stores/connectionStore';
import { useEntityStore } from '../stores/entityStore';

const HOUR = 3600_000;
const ROW_LAG_MS = 90_000;
const slotOf = (t: number): number => Math.floor((t - ROW_LAG_MS) / HOUR);

/** Loads by key `<period>|<slot>`, for one connection at a time (`cacheOwner`). */
const cache = new Map<string, Promise<number | null>>();
let cacheOwner: string | null = null;

/** Local midnight at or before `t`. */
const midnight = (t: number): number => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** The sources the home's consumption comes from. */
const electricity = (prefs: EnergyPreferences): EnergyPreferences => ({
  energy_sources: prefs.energy_sources.filter((s) => s.type === 'grid' || s.type === 'solar' || s.type === 'battery'),
  device_consumption: [],
});

async function load(period: EnergyPeriod): Promise<number | null> {
  const all = await getEnergyPrefs();
  if (!all || !isEnergyConfigured(all)) return null;
  const prefs = electricity(all);
  // the last hour whose row is written: `energyPageCompare` cuts at the full hour before `now`
  const now = new Date(Date.now() - ROW_LAG_MS);
  // in the first 90 s of a period nothing of it is written yet
  if (now.getTime() < energyPageWindow(period, new Date()).bounds[0]!) return null;
  const { current, previous } = energyPageCompare(period, now);
  let cur = current;
  let prev = previous;
  if (period === 'year') {
    cur = { start: current.start, end: midnight(current.end) };
    prev = { start: previous.start, end: midnight(previous.end) };
  }
  if (cur.end <= cur.start || prev.end <= prev.start) return null;
  const bucket = period === 'year' ? 'day' : 'hour';
  const ids = energyStatisticIds(prefs);
  if (ids.length === 0) return null;
  const iso = (t: number) => new Date(t).toISOString();
  const [a, b] = await Promise.all([
    getStatistics(ids, bucket, iso(cur.start), iso(cur.end)),
    getStatistics(ids, bucket, iso(prev.start), iso(prev.end)),
  ]);
  const entities = useEntityStore.getState().entities;
  return energyChange(
    computeEnergyDashboard(prefs, a, entities).homeConsumption,
    computeEnergyDashboard(prefs, b, entities).homeConsumption,
  );
}

function loadShared(owner: string, period: EnergyPeriod, slot: number): Promise<number | null> {
  if (cacheOwner !== owner) {
    cache.clear();
    cacheOwner = owner;
  }
  const key = `${period}|${slot}`;
  let p = cache.get(key);
  if (!p) {
    p = load(period);
    cache.set(key, p);
    // keep one hour per period; a failure is forgotten, so the next mount or hour tries again
    for (const k of cache.keys()) if (k.startsWith(`${period}|`) && k !== key) cache.delete(k);
    p.catch(() => {
      if (cache.get(key) === p) cache.delete(key);
    });
  }
  return p;
}

export function useEnergyCompare(period: EnergyPeriod): number | null {
  const status = useConnectionStore((s) => s.status);
  const owner = useConnectionStore((s) => (s.demo ? 'demo' : s.url));
  const [shown, setShown] = useState<{ key: string; value: number | null } | null>(null);
  const [tick, setTick] = useState(0);
  const keyOf = (slot: number) => `${owner}|${period}|${slot}`;

  useEffect(() => {
    if (status !== 'connected') return undefined;
    let cancelled = false;
    const slot = slotOf(Date.now());
    const key = keyOf(slot);
    const untilNext = Math.max(1000, (slot + 1) * HOUR + ROW_LAG_MS - Date.now());
    const timer = setTimeout(() => setTick((n) => n + 1), untilNext);
    loadShared(String(owner), period, slot).then(
      (value) => {
        if (!cancelled) setShown({ key, value });
      },
      (err: unknown) => {
        console.warn('[HAPulse] useEnergyCompare failed:', err);
      },
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // keyOf reads owner and period; tick re-runs it at the next full hour
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, owner, period, tick]);

  // the last result of this connection and period, also while the next hour loads
  return shown && shown.key.startsWith(`${owner}|${period}|`) ? shown.value : null;
}
