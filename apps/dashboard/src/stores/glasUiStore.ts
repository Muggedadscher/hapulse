/**
 * [fork] Glas gestures (stage 3b) — state of the Glas-only overlays, not persisted (plan docs/glas/PLAN-ETAPPE-3.md
 * §4.1). `contextMenu`: the entity card whose context menu is open (`components/glas/ContextMenu.tsx`, hosted by
 * `GlasRuntime`); opening is idempotent, because Android fires `contextmenu` on top of the long press.
 */

import { create } from 'zustand';

export interface ContextMenuTarget {
  entityId: string;
  /** The pressed card (the `.entity-card-press` wrapper): lifted and shown through the hole of the dim layer. */
  el: HTMLElement;
  /** The card's name, for the menu's label. */
  name: string;
  /** Opened while a finger or button is still down (long press): its release must not close the menu. */
  pressing: boolean;
}

interface GlasUiState {
  contextMenu: ContextMenuTarget | null;
  openContextMenu: (target: ContextMenuTarget) => void;
  closeContextMenu: () => void;
}

export const useGlasUiStore = create<GlasUiState>()((set) => ({
  contextMenu: null,

  openContextMenu(target) {
    set((s) => (s.contextMenu?.el === target.el && s.contextMenu.entityId === target.entityId ? s : { contextMenu: target }));
  },

  closeContextMenu() {
    set((s) => (s.contextMenu ? { contextMenu: null } : s));
  },
}));
