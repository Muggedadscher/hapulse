/**
 * [fork] Glas sheets (stage 3) — the element a window opens from (plan docs/glas/PLAN-ETAPPE-3.md §3.3, K55).
 * `GlasRuntime` reports every pointerdown and every Enter/Space keydown (capture phase). A window that opens within
 * 1.5 s takes the element once: it grows out of it, shrinks back into it and returns the focus to it. Windows that open
 * without a gesture ("Was ist neu" from an effect) find nothing. iOS gives buttons no focus on a tap, so the focused
 * element alone would not do.
 */

const ORIGIN = 'button, a, [role="button"], [role="menuitem"], .card, [data-morph-origin]';
const MAX_AGE_MS = 1500;

export interface OriginRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Origin {
  el: HTMLElement;
  /** Where the element was when it was pressed (it may be gone when the window opens: a menu item). */
  rect: OriginRect;
  at: number;
}

let last: Origin | null = null;

export function rectOf(el: Element): OriginRect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/** Called by GlasRuntime for pointerdown and Enter/Space. A press on nothing that could open a window forgets it. */
export function noteOrigin(target: EventTarget | null): void {
  const el = target instanceof Element ? target.closest<HTMLElement>(ORIGIN) : null;
  last = el ? { el, rect: rectOf(el), at: performance.now() } : null;
}

/** The last pressed element if it is recent enough, without using it up (safe during render). */
export function peekOrigin(): Origin | null {
  if (last && performance.now() - last.at > MAX_AGE_MS) last = null;
  return last;
}

/** The last pressed element, once: the next window that opens without a new press gets nothing. */
export function takeOrigin(): Origin | null {
  const o = peekOrigin();
  last = null;
  return o;
}

/** The rectangle to morph from or into: live while the element is in the document, else where it was. */
export function originRect(o: Origin): OriginRect {
  return o.el.isConnected ? rectOf(o.el) : o.rect;
}
