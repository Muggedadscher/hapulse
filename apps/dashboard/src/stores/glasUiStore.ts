/**
 * [fork] Glas gestures (stage 3b) — state of the Glas-only overlays, not persisted (plan docs/glas/PLAN-ETAPPE-3.md
 * §4.1). `contextMenu`: the entity card whose context menu is open (`components/glas/ContextMenu.tsx`, hosted by
 * `GlasRuntime`); opening is idempotent, because Android fires `contextmenu` on top of the long press.
 * `immersive` (stage 6, E13): the camera page is shown — held by the page (`app/glas/useGlasImmersive.ts`), read by
 * `GlasRuntime` (root flag) and `AppLayout` (dark content column) (plan docs/glas/PLAN-ETAPPE-6.md K103, K104).
 */

import { create } from 'zustand';

export interface ContextMenuTarget {
  entityId: string;
  /** The pressed card (the `.entity-card-press` wrapper): lifted and shown through the hole of the dim layer. */
  el: HTMLElement;
  /** The visible card when it is not the wrapper's first child (a scene tile, a device row: the element itself). */
  card?: HTMLElement | undefined;
  /** The card's name, for the menu's label. */
  name: string;
  /** Opened while a finger or button is still down (long press): its release must not close the menu. */
  pressing: boolean;
  /** Called when the menu switches the entity on (true) or off: the devices card keeps a device it turned off (K83). */
  onSwitch?: ((on: boolean) => void) | undefined;
}

interface GlasUiState {
  contextMenu: ContextMenuTarget | null;
  openContextMenu: (target: ContextMenuTarget) => void;
  closeContextMenu: () => void;
  /** True while at least one page holds it. */
  immersive: boolean;
  /** Holds `immersive` until the returned release is called (a second call does nothing). Counted, so a camera page
   *  that replaces another — both mounted for a moment while the route changes — never clears it in between. */
  holdImmersive: () => () => void;
}

export const useGlasUiStore = create<GlasUiState>()((set) => {
  let holders = 0;
  return {
    contextMenu: null,

    openContextMenu(target) {
      set((s) => (s.contextMenu?.el === target.el && s.contextMenu.entityId === target.entityId ? s : { contextMenu: target }));
    },

    closeContextMenu() {
      set((s) => (s.contextMenu ? { contextMenu: null } : s));
    },

    immersive: false,

    holdImmersive() {
      holders++;
      set((s) => (s.immersive ? s : { immersive: true }));
      let held = true;
      return () => {
        if (!held) return;
        held = false;
        holders--;
        if (holders === 0) set((s) => (s.immersive ? { immersive: false } : s));
      };
    },
  };
});
