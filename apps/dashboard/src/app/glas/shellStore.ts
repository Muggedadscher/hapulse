/**
 * [fork] Glas frame (stage 2) — small state of the frame, not persisted (plan docs/glas/PLAN-ETAPPE-2.md §2.3):
 *
 * - `editTargets`: how many `EditToggle`s in the icon variant are mounted and would show (K23). The page offers
 *   "Bearbeiten" (desktop capsule, avatar menu) exactly when this is > 0 — no route list.
 * - `tabsMin`: the phone tab bar is minimised. `GlasRuntime` sets it while scrolling; the tab bar's "expand" button
 *   resets it, and `GlasRuntime` then takes the current scroll position as the new anchor.
 */

import { create } from 'zustand';

interface ShellState {
  editTargets: number;
  tabsMin: boolean;
  /** Registers one edit target; returns the function that removes it again (safe to call twice). */
  addEditTarget: () => () => void;
  setTabsMin: (min: boolean) => void;
}

export const useShellStore = create<ShellState>()((set) => ({
  editTargets: 0,
  tabsMin: false,

  addEditTarget() {
    set((s) => ({ editTargets: s.editTargets + 1 }));
    let removed = false;
    return () => {
      if (removed) return;
      removed = true;
      set((s) => ({ editTargets: Math.max(0, s.editTargets - 1) }));
    };
  },

  setTabsMin(min) {
    set((s) => (s.tabsMin === min ? s : { tabsMin: min }));
  },
}));

/** True when the current page offers editing (an `EditToggle` would show, K23). */
export function useCanEditHere(): boolean {
  return useShellStore((s) => s.editTargets > 0);
}
