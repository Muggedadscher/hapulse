/**
 * History data facade.
 *
 * Routes entity state-history reads to the live HA connection, or to a
 * synthetic demo series in demo mode. Components must go through here — never
 * touch the HAConnection directly (mirrors `ha/energy.ts`).
 */

import { parseNumericHistory, demoHistory, demoBatterySoc } from '@hapulse/core';
import type { SensorHistoryPoint } from '@hapulse/core';
import { useConnectionStore, getLiveConnection } from '../stores/connectionStore';
import { useEntityStore } from '../stores/entityStore';

/**
 * Fetch numeric history for a single entity between `startMs` and `endMs`
 * (Unix epoch milliseconds). Returns sorted numeric points, or `[]` when
 * there is no connection / no data.
 */
export async function getHistory(
  entityId: string,
  startMs: number,
  endMs: number
): Promise<SensorHistoryPoint[]> {
  const { demo } = useConnectionStore.getState();

  if (demo) {
    const entity = useEntityStore.getState().entities[entityId];
    const current = entity ? parseFloat(entity.state) : NaN;
    // [fork] the demo's home battery: a charge day like draft v5 (down overnight, charging with the sun)
    if (entityId === 'sensor.demo_battery_soc') {
      const d = new Date(startMs);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      return demoBatterySoc(day, endMs, Number.isNaN(current) ? 71 : current).filter((p) => p.t >= startMs);
    }
    return demoHistory(entityId, startMs, endMs, Number.isNaN(current) ? 20 : current);
  }

  const conn = getLiveConnection();
  if (!conn) return [];

  const raw = await conn.fetchSensorHistory(
    entityId,
    new Date(startMs).toISOString(),
    new Date(endMs).toISOString()
  );
  return parseNumericHistory(raw);
}
