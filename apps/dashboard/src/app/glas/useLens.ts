/**
 * [fork] Glas frame (stage 2) — the lens: a highlight that glides to the active entry (tab bar, sidebar; plan
 * docs/glas/PLAN-ETAPPE-2.md §2.4). Measures the active element inside `box` and writes `--g-lens-x/-y/-w/-h` (px)
 * on `box`; CSS places the lens element with them. `data-g-lens` on `box`:
 * - absent: nothing active (lens hidden),
 * - "0": shown without a move (first paint, coming back after nothing was active) — the lens appears in place,
 * - "a"/"b": moved to another entry — the value flips on every move, so CSS can glide and restart the stretch.
 * A size change of the same entry (rotation, sidebar collapse) keeps the value.
 *
 * Re-measures after every render of the host, when `box` changes size and when a `class`/`aria-expanded` below it
 * changes. The state survives re-renders, so a route change glides. Offsets come from offsetLeft/offsetTop, so a
 * pressed entry's `scale` does not move the lens. `onChange` gets every change (also "nothing active").
 */

import { useLayoutEffect, useRef, type RefObject } from 'react';

const VARS = ['--g-lens-x', '--g-lens-y', '--g-lens-w', '--g-lens-h'] as const;

/** Offset of `el` inside `box` (sum of offsetLeft/Top up the offsetParent chain), or null if `box` is not on it. */
export function offsetWithin(el: HTMLElement, box: HTMLElement): { x: number; y: number } | null {
  let x = 0;
  let y = 0;
  let cur: HTMLElement | null = el;
  while (cur && cur !== box) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    const parent: Element | null = cur.offsetParent;
    if (!(parent instanceof HTMLElement)) return null;
    // an offsetParent below box: its own border is not part of offsetLeft
    if (parent !== box) {
      x += parent.clientLeft;
      y += parent.clientTop;
    }
    cur = parent;
  }
  return cur === box ? { x, y } : null;
}

export interface LensOptions {
  /** Active element inside `box`, or null when nothing in it is active. */
  pick: (box: HTMLElement) => HTMLElement | null;
  /** px taken off at the top and bottom (sidebar: the 44-px hit area shows a 40-px capsule). */
  insetY?: number;
  enabled: boolean;
  /** After every change: the element the lens shows (null = none) — also when only its size changed. */
  onChange?: (el: HTMLElement | null, box: HTMLElement) => void;
}

export function useLens(boxRef: RefObject<HTMLElement | null>, options: LensOptions): void {
  const optionsRef = useRef(options);
  const measureRef = useRef<() => void>(() => undefined);
  const { enabled } = options;

  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!enabled || !box) return undefined;
    let shown: HTMLElement | null = null;
    let key: string | null = null; // null = not measured yet
    let flip = false;

    const measure = () => {
      const { pick, insetY = 0, onChange } = optionsRef.current;
      const picked = pick(box);
      const pos = picked && picked.offsetWidth > 0 ? offsetWithin(picked, box) : null;
      const el = pos ? picked : null;
      const geo = el && pos ? [pos.x, pos.y + insetY, el.offsetWidth, Math.max(0, el.offsetHeight - 2 * insetY)] : [];
      const nextKey = geo.join(',');
      if (nextKey === key && el === shown) return;
      if (!el) {
        box.removeAttribute('data-g-lens');
      } else {
        geo.forEach((v, i) => box.style.setProperty(VARS[i]!, `${v}px`));
        if (!shown) {
          box.setAttribute('data-g-lens', '0');
        } else if (el !== shown) {
          flip = !flip;
          box.setAttribute('data-g-lens', flip ? 'b' : 'a');
        }
      }
      shown = el;
      key = nextKey;
      onChange?.(el, box);
    };

    measureRef.current = measure;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    const mo = new MutationObserver(measure);
    mo.observe(box, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-expanded'] });

    return () => {
      measureRef.current = () => undefined;
      ro.disconnect();
      mo.disconnect();
      VARS.forEach((v) => box.style.removeProperty(v));
      box.removeAttribute('data-g-lens');
    };
  }, [boxRef, enabled]);

  // after every render: the route (or what `pick` depends on) may have changed
  useLayoutEffect(() => {
    measureRef.current();
  });
}
