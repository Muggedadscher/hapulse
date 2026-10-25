/**
 * [fork] Rooms with a thermostat but no heating plan, for admins (rules: @hapulse/core findHeatingSetupRooms; calls:
 * ha/heatingSetup.ts). Which thermostats a plan controls is asked once per registry snapshot (Home and the room page
 * share the answer); a setup refreshes the registries and so asks again.
 */

import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { domainOf, findHeatingPlans, findHeatingSetupRooms, heatingCanHeat } from '@hapulse/core';
import type { HeatingSetupRoom, Registries } from '@hapulse/core';
import { useEntityStore } from '../../stores/entityStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { loadHeatingCoverage } from '../../ha/heatingSetup';

const coverageCache = new WeakMap<Registries, Promise<Set<string> | null>>();

function coverageOf(registries: Registries): Promise<Set<string> | null> {
  let p = coverageCache.get(registries);
  if (!p) {
    p = loadHeatingCoverage();
    coverageCache.set(registries, p);
  }
  return p;
}

/** The thermostats a plan controls; null for users without admin rights, while loading or when HA does not answer. */
function useHeatingCoverage(registries: Registries | null): Set<string> | null {
  const admin = useConnectionStore((s) => s.currentUser?.is_admin === true);
  const connected = useConnectionStore((s) => s.status === 'connected' || s.demo);
  const [loaded, setLoaded] = useState<{ registries: Registries; covered: Set<string> | null } | null>(null);
  useEffect(() => {
    if (!admin || !connected || !registries) return;
    let live = true;
    void coverageOf(registries).then((covered) => {
      if (live) setLoaded({ registries, covered });
    });
    return () => {
      live = false;
    };
  }, [admin, connected, registries]);
  return admin && registries && loaded?.registries === registries ? loaded.covered : null;
}

/** All rooms without a plan (also the skipped ones), sorted by name; empty for users without admin rights. */
export function useHeatingSetupRooms(): HeatingSetupRoom[] {
  const registries = useEntityStore((s) => s.registries);
  const covered = useHeatingCoverage(registries);
  // only the thermostats' reachability and modes matter, not every state tick
  const key = useEntityStore(
    useShallow((s) =>
      registries
        ? registries.entities
            .filter((e) => domainOf(e.entity_id) === 'climate')
            .map((e) => {
              const st = s.entities[e.entity_id];
              return `${e.entity_id}:${st ? (st.state === 'unavailable' || st.state === 'unknown' ? 'x' : heatingCanHeat(st) ? 'h' : '-') : 'x'}`;
            })
        : [],
    ),
  );
  return useMemo(() => {
    if (!registries || !covered) return [];
    const entities = useEntityStore.getState().entities;
    return findHeatingSetupRooms({ registries, entities, plans: findHeatingPlans(registries), covered });
    // `key` stands for the climate states read above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registries, covered, key.join('|')]);
}

/** The room `areaId` when it has a thermostat but no plan (admins only), else null. */
export function useHeatingSetupRoom(areaId: string): HeatingSetupRoom | null {
  const rooms = useHeatingSetupRooms();
  return rooms.find((r) => r.areaId === areaId) ?? null;
}
