/**
 * [fork] Glas devices card (docs/GLAS-DESIGN.md §7.10, plan docs/glas/PLAN-ETAPPE-4.md K83): a favourite switched off
 * in the overview's devices card stays there as "Aus" until the page is reloaded, so a tap by mistake can be undone
 * where it happened. Switching it on there again lets it go. Session only, never stored; Klassisch does not read it.
 */

import { create } from 'zustand';

interface KeptOffState {
  ids: readonly string[];
  keep: (id: string) => void;
  release: (id: string) => void;
}

export const useKeptOffStore = create<KeptOffState>()((set) => ({
  ids: [],

  keep(id) {
    set((s) => (s.ids.includes(id) ? s : { ids: [...s.ids, id] }));
  },

  release(id) {
    set((s) => (s.ids.includes(id) ? { ids: s.ids.filter((x) => x !== id) } : s));
  },
}));
