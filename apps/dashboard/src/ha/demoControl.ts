/**
 * [fork] Demo-only control for the lab checks (docs/glas/PLAN-ETAPPE-4.md K84).
 *
 * In demo mode `window.__hapulseDemo.patch(id, { state, attributes, last_changed, last_updated })` changes one
 * entity in the entity store, so a check can make a home hint appear and disappear or mark a scene member as
 * changed. `patch(id, null)` removes the entity again. `patchArea(id, { picture })` sets or clears a room picture
 * (the demo itself has none), so a check can see that Glas keeps the main room card plain (E8).
 * `placeEntity(id, areaId)` puts an entity into a room (a registry entry is added when the demo has none), so a check
 * can give a card more rooms than the demo has (climate, blinds). `openDetail(id)` opens an entity's detail the way a
 * tap does, so a check can reach the detail of an entity without a card for it (a light's brightness control).
 * `entity(id)` reads an entity as the store holds it, so a check can see what a control has sent (a light's brightness
 * only after the key is let go). `calls()` returns the service calls of the demo, newest last, and `clearCalls()`
 * empties that list (demoCalls.ts), for the calls the demo does not apply (the pool's mode, threshold and schedule).
 * `energyConfigured(false)` makes the demo's energy "not set up" (demoEnergy.ts) for the pages opened after it,
 * `energyHold(true)` keeps its statistics back until `energyHold(false)` (a period that loads), `energyLoads()` counts
 * its statistics requests (the More menu's figure, K97), and `setUrl(url)` gives
 * the demo connection an HA address (the demo has none), so the energy page's empty state shows its link to the HA
 * energy settings (plan docs/glas/PLAN-ETAPPE-5.md K92, §7.31).
 * Outside demo mode the object does not exist.
 */

import type { AreaRegistryEntry, EntityRegistryEntry, HassEntity, HassEntityAttributes } from '@hapulse/core';
import { useEntityStore } from '../stores/entityStore';
import { useUIStore } from '../stores/uiStore';
import { clearDemoCalls, demoCalls, type DemoCall } from './demoCalls';
import { demoEnergyLoads, setDemoEnergyConfigured, setDemoEnergyHold } from './demoEnergy';

export interface DemoPatch {
  state?: string;
  attributes?: HassEntityAttributes;
  last_changed?: string;
  last_updated?: string;
}

interface DemoControl {
  patch: (id: string, patch: DemoPatch | null) => HassEntity | null;
  patchArea: (id: string, patch: { picture?: string | null }) => AreaRegistryEntry | null;
  placeEntity: (id: string, areaId: string | null) => EntityRegistryEntry | null;
  openDetail: (id: string) => void;
  entity: (id: string) => HassEntity | null;
  calls: () => DemoCall[];
  clearCalls: () => void;
  energyConfigured: (on: boolean) => void;
  energyHold: (on: boolean) => void;
  energyLoads: () => number;
  setUrl: (url: string) => void;
}

type DemoWindow = Window & { __hapulseDemo?: DemoControl };

/** `conn.setUrl` writes the connection's HA address (handed in by connectionStore, which starts the control). */
export function startDemoControl(conn: { setUrl: (url: string) => void }): void {
  if (typeof window === 'undefined') return;
  (window as DemoWindow).__hapulseDemo = {
    patch(id, patch) {
      const { entities, setEntities } = useEntityStore.getState();
      const next = { ...entities };
      if (patch === null) {
        delete next[id];
        setEntities(next);
        return null;
      }
      const now = new Date().toISOString();
      const prev = entities[id];
      const state = patch.state ?? prev?.state ?? 'unknown';
      const entity: HassEntity = {
        entity_id: id,
        state,
        attributes: { ...(prev?.attributes ?? {}), ...(patch.attributes ?? {}) },
        last_changed: patch.last_changed ?? (prev && prev.state === state ? prev.last_changed : now),
        last_updated: patch.last_updated ?? now,
        context: prev?.context ?? { id: 'demo', parent_id: null, user_id: null },
      };
      next[id] = entity;
      setEntities(next);
      return entity;
    },
    patchArea(id, patch) {
      const { registries, setRegistries } = useEntityStore.getState();
      const area = registries?.areas.find((a) => a.area_id === id);
      if (!registries || !area) return null;
      const next: AreaRegistryEntry = { ...area, ...patch };
      setRegistries({ ...registries, areas: registries.areas.map((a) => (a.area_id === id ? next : a)) });
      return next;
    },
    placeEntity(id, areaId) {
      const { registries, setRegistries } = useEntityStore.getState();
      if (!registries) return null;
      const prev = registries.entities.find((e) => e.entity_id === id);
      const blank = { device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: null, icon: null };
      const next: EntityRegistryEntry = prev ? { ...prev, area_id: areaId } : { ...blank, entity_id: id, area_id: areaId };
      const entities = prev
        ? registries.entities.map((e) => (e.entity_id === id ? next : e))
        : [...registries.entities, next];
      setRegistries({ ...registries, entities });
      return next;
    },
    openDetail(id) {
      useUIStore.getState().openEntityDetail(id);
    },
    entity(id) {
      return useEntityStore.getState().entities[id] ?? null;
    },
    calls: demoCalls,
    clearCalls: clearDemoCalls,
    energyConfigured: setDemoEnergyConfigured,
    energyHold: setDemoEnergyHold,
    energyLoads: demoEnergyLoads,
    setUrl: conn.setUrl,
  };
}

export function stopDemoControl(): void {
  if (typeof window === 'undefined') return;
  delete (window as DemoWindow).__hapulseDemo;
}
