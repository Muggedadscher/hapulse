/**
 * Energy data facade.
 *
 * Routes energy preference / statistics / currency reads to the live HA
 * connection, or to demo data in demo mode. Components must go through here —
 * never touch the HAConnection directly.
 */

import {
  DEMO_ENERGY_PREFS,
  demoEnergyStatistics,
} from '@hapulse/core';
import type {
  EnergyPreferences,
  StatisticsMap,
  StatisticsPeriod,
} from '@hapulse/core';
import { useConnectionStore, getLiveConnection } from '../stores/connectionStore';
import { demoEnergyPrefs, demoEnergyWait } from './demoEnergy'; // [fork] lab checks: energy off, a held load

/** Fetch the Energy dashboard preferences (demo or live). */
export async function getEnergyPrefs(): Promise<EnergyPreferences | null> {
  const { demo } = useConnectionStore.getState();
  if (demo) return demoEnergyPrefs(DEMO_ENERGY_PREFS); // [fork] demoEnergy.ts
  const conn = getLiveConnection();
  return conn ? conn.fetchEnergyPrefs() : null;
}

/** Fetch long-term statistics for the given ids over a range (demo or live). */
export async function getStatistics(
  statisticIds: string[],
  period: StatisticsPeriod,
  start: string,
  end?: string
): Promise<StatisticsMap> {
  const { demo } = useConnectionStore.getState();
  if (demo) {
    await demoEnergyWait(); // [fork] demoEnergy.ts
    return demoEnergyStatistics(statisticIds, period, start, end ?? new Date().toISOString());
  }
  const conn = getLiveConnection();
  return conn ? conn.fetchStatistics(statisticIds, period, start, end) : {};
}

/** Fetch the configured currency (demo returns EUR). */
export async function getCurrency(): Promise<string | null> {
  const { demo } = useConnectionStore.getState();
  if (demo) return 'EUR';
  const conn = getLiveConnection();
  return conn ? conn.fetchCurrency() : null;
}
