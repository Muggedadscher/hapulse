/**
 * [fork] Glas sheets (stage 3) — what an open Glas window gives its content (plan docs/glas/PLAN-ETAPPE-3.md K48).
 * React context flows through portals: a window rendered inside it is a page in that window (same rectangle, slides
 * in from the right, "‹ Zurück"). In Klassisch and while closed the value is null.
 */

import { createContext } from 'react';

export interface SheetParent {
  /** Stack id of the window. */
  id: number;
  /** 0 = the window is not rendered inside another one. */
  depth: number;
  /** The window's panel: a page pushes its content aside. */
  panel: () => HTMLElement | null;
  /** The panel of the outermost window: a page takes its rectangle. */
  rootPanel: () => HTMLElement | null;
}

export const SheetContext = createContext<SheetParent | null>(null);
