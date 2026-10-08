/**
 * [fork] Demo-only control for the lab checks (docs/glas/PLAN-ETAPPE-4.md K84).
 *
 * In demo mode `window.__hapulseDemo.patch(id, { state, attributes, last_changed, last_updated })` changes one
 * entity in the entity store, so a check can make a home hint appear and disappear or mark a scene member as
 * changed. `patch(id, null)` removes the entity again. Outside demo mode the object does not exist.
 */

import type { HassEntity, HassEntityAttributes } from '@hapulse/core';
import { useEntityStore } from '../stores/entityStore';

export interface DemoPatch {
  state?: string;
  attributes?: HassEntityAttributes;
  last_changed?: string;
  last_updated?: string;
}

interface DemoControl {
  patch: (id: string, patch: DemoPatch | null) => HassEntity | null;
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
  };
}

export function stopDemoControl(): void {
  if (typeof window === 'undefined') return;
  delete (window as DemoWindow).__hapulseDemo;
}
