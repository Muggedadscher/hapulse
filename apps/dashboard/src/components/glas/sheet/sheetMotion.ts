/**
 * [fork] Glas sheets (stage 3) — helpers for the window animations (plan docs/glas/PLAN-ETAPPE-3.md K65, K69).
 * Movements with measured rectangles run through the Web Animations API; the curves come from the springs that
 * `applyAppearance` writes on :root (`--g-spring-*`: `linear()` or the cubic-bezier fallback, GLAS-DESIGN §6.1).
 */

import { GLAS_SPRINGS } from '@hapulse/core';
import type { OriginRect } from './origin';

export type SpringName = keyof typeof GLAS_SPRINGS;

/** Accelerating curve for windows that leave without an origin (GLAS-DESIGN §6.3). */
export const EASE_IN = 'cubic-bezier(.4,0,1,1)';
/** Closing curve of the desktop dialog (GLAS-DESIGN §6.3). */
export const DIALOG_OUT = 'cubic-bezier(.32,.72,0,1)';
/** Every movement becomes a cross-fade of this length under reduced motion (GLAS-DESIGN §6.4, K65). */
export const REDUCED_MS = 200;

export function spring(name: SpringName): string {
  return document.documentElement.style.getPropertyValue(`--g-spring-${name}`).trim() || GLAS_SPRINGS[name].fallback;
}

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** `element.animate` that never throws: a curve the engine does not know falls back to `ease`, no API to nothing. */
export function play(el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | null {
  if (typeof el.animate !== 'function') return null;
  try {
    return el.animate(keyframes, options);
  } catch {
    try {
      return el.animate(keyframes, { ...options, easing: 'ease' });
    } catch {
      return null;
    }
  }
}

/** Settles when every given animation has ended or was cancelled. */
export function allDone(animations: readonly (Animation | null)[]): Promise<void> {
  return Promise.all(animations.map((a) => (a ? a.finished.then(noop, noop) : undefined))).then(noop);
}

function noop(): void {}

/**
 * The element's box without its transform. Panels in Glas transform from their top left corner (`transform-origin:
 * 0 0`, sheets.css), so the corner sits at the box corner plus the translation.
 */
export function layoutRect(el: HTMLElement): OriginRect {
  const r = el.getBoundingClientRect();
  const t = getComputedStyle(el).transform;
  if (!t || t === 'none') return { x: r.left, y: r.top, w: r.width, h: r.height };
  const m = new DOMMatrixReadOnly(t);
  return { x: r.left - m.e, y: r.top - m.f, w: el.offsetWidth, h: el.offsetHeight };
}

/** Where the element is on screen if its current transform sat on the box `box` (used when the box just changed). */
export function visualRectOn(el: HTMLElement, box: OriginRect): OriginRect {
  const t = getComputedStyle(el).transform;
  if (!t || t === 'none') return box;
  const m = new DOMMatrixReadOnly(t);
  return { x: box.x + m.e, y: box.y + m.f, w: box.w * m.a, h: box.h * m.d };
}

/** The radius of the top left corner as it shows on screen (horizontal, scaled by the current transform). */
export function shownRadius(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  const r = parseFloat(cs.borderTopLeftRadius) || 0;
  const t = cs.transform;
  return t && t !== 'none' ? r * new DOMMatrixReadOnly(t).a : r;
}

export function translateScale(x: number, y: number, sx: number, sy: number): string {
  return `translate(${x}px, ${y}px) scale(${sx}, ${sy})`;
}
