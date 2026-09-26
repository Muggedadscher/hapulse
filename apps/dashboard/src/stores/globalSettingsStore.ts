/**
 * [fork] State of the global admin management for the UI (lock + admin section).
 *
 * The small `meta` part is persisted in localStorage (`hapulse:global-meta`) so a device
 * knows it is managed — and locks the controls — before it has reached Home Assistant,
 * and keeps doing so when HA cannot be read. The documents themselves live in HA.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dynamicJSONStorage } from '../persistence/zustandStorage';
import type { GlobalUserRef } from './settingsScope';

export interface GlobalSettingsMeta {
  managed: boolean;
  rev: number;
  activatedAt: string | null;
  activatedBy: GlobalUserRef | null;
  updatedAt: string | null;
  updatedBy: GlobalUserRef | null;
  shareSecrets: boolean;
}

interface GlobalSettingsState {
  meta: GlobalSettingsMeta;
  /** The HA document was read in this session (false while offline or before connect). */
  loaded: boolean;
  /** Last write to HA failed (admin); shown in the admin section. */
  writeError: boolean;
  setMeta: (meta: GlobalSettingsMeta) => void;
  setLoaded: (loaded: boolean) => void;
  setWriteError: (writeError: boolean) => void;
}

export const EMPTY_GLOBAL_META: GlobalSettingsMeta = {
  managed: false,
  rev: 0,
  activatedAt: null,
  activatedBy: null,
  updatedAt: null,
  updatedBy: null,
  shareSecrets: false,
};

export const useGlobalSettingsStore = create<GlobalSettingsState>()(
  persist(
    (set) => ({
      meta: EMPTY_GLOBAL_META,
      loaded: false,
      writeError: false,
      setMeta: (meta) => set({ meta }),
      setLoaded: (loaded) => set({ loaded }),
      setWriteError: (writeError) => set({ writeError }),
    }),
    {
      name: 'hapulse:global-meta',
      storage: dynamicJSONStorage<GlobalSettingsState>(),
      partialize: (s) => ({ meta: s.meta }) as GlobalSettingsState,
      merge: (persisted, current) => ({
        ...current,
        meta: { ...EMPTY_GLOBAL_META, ...((persisted as Partial<GlobalSettingsState> | undefined)?.meta ?? {}) },
      }),
    },
  ),
);
