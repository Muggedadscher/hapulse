/**
 * entityStore — live HA entity map, registries, and computed rooms.
 */

import { create } from 'zustand';
import { buildRooms } from '@hapulse/core';
import type { HassEntityMap, Registries, Room } from '@hapulse/core';

interface EntityState {
  entities: HassEntityMap;
  registries: Registries | null;
  rooms: Room[];
}

interface EntityActions {
  setEntities: (entities: HassEntityMap) => void;
  setRegistries: (registries: Registries) => void;
  reset: () => void;
}

// [fork] unused EMPTY_REGISTRIES removed (lint)
const initialState: EntityState = {
  entities: {},
  registries: null,
  rooms: [],
};

export const useEntityStore = create<EntityState & EntityActions>()((set, get) => ({
  ...initialState,

  setEntities(entities) {
    const { registries, entities: prevEntities } = get();

    // Recompute rooms only when entity membership changes (set of ids), not every state tick.
    // Cheap check: compare counts, then verify every next id already existed (no sort/join).
    const prevKeys = Object.keys(prevEntities);
    const nextKeys = Object.keys(entities);
    let membershipChanged = prevKeys.length !== nextKeys.length;
    if (!membershipChanged) {
      for (const id of nextKeys) {
        if (!(id in prevEntities)) {
          membershipChanged = true;
          break;
        }
      }
    }

    if (membershipChanged && registries) {
      const rooms = buildRooms(registries, entities);
      set({ entities, rooms });
    } else {
      set({ entities });
    }
  },

  setRegistries(registries) {
    const { entities } = get();
    const rooms = buildRooms(registries, entities);
    set({ registries, rooms });
  },

  reset() {
    set({ ...initialState });
  },
}));
