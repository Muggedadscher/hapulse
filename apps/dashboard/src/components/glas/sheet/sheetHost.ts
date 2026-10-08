/**
 * [fork] Glas sheets (stage 3) — the open windows in the document (plan docs/glas/PLAN-ETAPPE-3.md §3.6, K48, K60, K63,
 * K64, K72). Applies what the pure stack (`sheetStack.ts`) decides: only the window on top is not `inert`, the windows
 * lie in stack order (z-index 1000 + place, under the toasts at 1100; the inspector at 400, under the context menu),
 * `data-g-sheets` on :root while a modal window is open (scroll lock and tab bar by CSS), `data-g-inspector` while the
 * inspector is open (the page makes room, gestures.css), and one Esc listener for all windows. Only Glas windows are
 * here; switching to Klassisch removes every window and with it everything written here.
 */

import {
  Batches,
  Handoff,
  insertEntry,
  modalCount,
  moveEntry,
  removeEntry,
  rootModalAbove,
  topEntry,
  type StackEntry,
  type StackKind,
} from './sheetStack';
import type { Detent } from './sheetMath';
import type { Origin, OriginRect } from './origin';

export interface HostWindow {
  backdrop: HTMLElement;
  panel: HTMLElement;
  /** Closes the window the way Esc does (the caller's `onClose`, read when it is needed). */
  close: () => void;
}

/** What a window that closes in a commit leaves for a window that opens in the same commit (K49). */
export interface HandoffNote {
  /** The closing panel on screen. */
  rect: OriginRect;
  pres: 'sheet' | 'dialog';
  detent: Detent | null;
  origin: Origin | null;
  trigger: HTMLElement | null;
  /** Set by the window that takes over; the ghost then only fades out. */
  taken: boolean;
}

const BASE_Z = 1000;
const INSPECTOR_Z = 400;
const defer = (fn: () => void) => queueMicrotask(fn);

export const batches = new Batches(defer);
export const handoff = new Handoff<HandoffNote>(defer);

let stack: StackEntry[] = [];
const windows = new Map<number, HostWindow>();
let lastId = 0;

export function newWindowId(): number {
  return ++lastId;
}

function setFlag(name: string, on: boolean): void {
  const root = document.documentElement;
  if (on === root.hasAttribute(name)) return;
  if (on) root.setAttribute(name, '');
  else root.removeAttribute(name);
}

function sync(): void {
  const top = topEntry(stack);
  stack.forEach((entry, i) => {
    const win = windows.get(entry.id);
    if (!win) return;
    win.backdrop.inert = entry !== top;
    win.backdrop.style.zIndex = String(entry.kind === 'inspector' ? INSPECTOR_Z : BASE_Z + i);
  });
  setFlag('data-g-sheets', modalCount(stack) > 0);
  setFlag('data-g-inspector', hasInspector());
}

/** A window opened (layout phase). Registering the same id again changes nothing. */
export function addWindow(entry: StackEntry, win: HostWindow): void {
  installEscape();
  windows.set(entry.id, win);
  stack = insertEntry(stack, entry);
  sync();
}

/** A window closed, left Glas or left the document. */
export function removeWindow(id: number): void {
  const win = windows.get(id);
  windows.delete(id);
  stack = removeEntry(stack, id);
  if (win) {
    win.backdrop.inert = false;
    win.backdrop.style.removeProperty('z-index');
  }
  sync();
}

/** The window changes its kind (the inspector turns into a dialog in a narrower window and back) or goes on top as a
 *  modal window with the current batch (asked for again while another window lies above it). */
export function moveWindow(id: number, change: { kind?: StackKind; batch?: number }): void {
  const next = moveEntry(stack, id, change);
  if (next === stack) return;
  stack = next;
  sync();
}

/** Modal windows open right now. */
export function openModals(): number {
  return modalCount(stack);
}

/** The inspector is open (GlasRuntime closes it when the route changes). */
export function hasInspector(): boolean {
  return stack.some((e) => e.kind === 'inspector');
}

/** A window of its own lies above `id` (not a page inside it). */
export function windowAbove(id: number): boolean {
  return rootModalAbove(stack, id);
}

/** The panel of the window on top (focus goes there when a trigger is gone). */
export function topPanel(): HTMLElement | null {
  const top = topEntry(stack);
  return (top && windows.get(top.id)?.panel) || null;
}

/** The panel of the modal window on top, if one is open (the inspector does not hold the focus). */
export function topModalPanel(): HTMLElement | null {
  const top = topEntry(stack);
  return (top?.kind === 'modal' && windows.get(top.id)?.panel) || null;
}

// ---- Esc (K72): one listener for every window; the window on top closes ----

/** A popup the page opened beside the inspector (the bell's panel, the avatar's or the rooms menu: its trigger says
 *  `aria-expanded`). It lies above the inspector and closes with its own Esc listener. */
function pagePopupOpen(win: HostWindow): boolean {
  for (const el of document.querySelectorAll('[aria-haspopup][aria-expanded="true"]')) {
    if (!win.backdrop.contains(el)) return true;
  }
  return false;
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
  const top = topEntry(stack);
  const win = top ? windows.get(top.id) : undefined;
  if (!top || !win) return;
  // the inspector is not modal: a popup of the page beside it takes this Esc
  if (top.kind === 'inspector' && pagePopupOpen(win)) return;
  e.preventDefault();
  win.close();
}

let escapeInstalled = false;

/** Installed when GlasRuntime starts (before later listeners such as the package's camera page) and with the first
 * window; once is enough. Without an open window it does nothing. */
export function installEscape(): void {
  if (escapeInstalled) return;
  escapeInstalled = true;
  document.addEventListener('keydown', onKeyDown);
}
