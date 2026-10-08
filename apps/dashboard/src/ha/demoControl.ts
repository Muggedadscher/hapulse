/**
 * [fork] Demo-only control for the lab checks (docs/glas/PLAN-ETAPPE-4.md K84).
 *
 * In demo mode `window.__hapulseDemo.patch(id, { state, attributes, last_changed, last_updated })` changes one
 * entity in the entity store, so a check can make a home hint appear and disappear or mark a scene member as
 * changed. `patch(id, null)` removes the entity again. `patchArea(id, { picture })` sets or clears a room picture
 * (the demo itself has none), so a check can see that Glas keeps the main room card plain (E8).
 * `placeEntity(id, areaId)` puts an entity into a room (a registry entry is added when the demo has none), so a check
 * can give a card more rooms than the demo has (climate, blinds). Outside demo mode the object does not exist.
 */

import type { AreaRegistryEntry, EntityRegistryEntry, HassEntity, HassEntityAttributes } from '@hapulse/core';
import { useEntityStore } from '../stores/entityStore';

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
}

type DemoWindow = Window & { __hapulseDemo?: DemoControl };

export function startDemoControl(): void {
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
  };
}

export function stopDemoControl(): void {
  if (typeof window === 'undefined') return;
  delete (window as DemoWindow).__hapulseDemo;
}
