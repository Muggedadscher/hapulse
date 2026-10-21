/**
 * [fork] Which of the energy page's newer cards (draft v5) exist: "Now" needs a power sensor (`stat_rate`) for every
 * electricity source and each of them as an entity (an external statistic has none), "Battery" a charge sensor
 * (`stat_soc`) that is an entity. The selectors return booleans, so the page does not re-render on every power reading.
 */

import { useMemo } from 'react';
import { energyBatteryIds, energyPowerIds } from '@hapulse/core';
import type { EnergyPreferences } from '@hapulse/core';
import { useEntityStore } from '../../../stores/entityStore';
import { withDefaultSlot } from '../../../lib/defaultSlot';

export function useEnergyLiveSections(prefs: EnergyPreferences | null): { now: boolean; battery: boolean } {
  const nowIds = useMemo(() => {
    const ids = energyPowerIds(prefs);
    return ids ? [...ids.solar, ...ids.grid, ...ids.battery] : null;
  }, [prefs]);
  const socIds = useMemo(() => energyBatteryIds(prefs)?.soc ?? null, [prefs]);
  const now = useEntityStore((s) => !!nowIds && nowIds.every((id) => id in s.entities));
  const battery = useEntityStore((s) => !!socIds && socIds.every((id) => id in s.entities));
  return { now, battery };
}

/** Where a new card goes in a stored order: "Now" after the tafel, "Battery" after "Now". */
export function energyDefaultSlots(stored: string[] | undefined): string[] | undefined {
  return withDefaultSlot(withDefaultSlot(stored, 'now', 'hero'), 'battery', 'now');
}
