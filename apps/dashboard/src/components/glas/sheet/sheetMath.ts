/**
 * [fork] Glas sheets (stage 3) — pure maths for windows: which presentation a window gets, its start detent, where a
 * drag puts it, where it snaps on release and the transform that morphs it out of its origin.
 * Values: docs/GLAS-DESIGN.md §6.3, §7.18–7.20; plan docs/glas/PLAN-ETAPPE-3.md K48, K50–K52, K60.
 */

export type Detent = 'medium' | 'large';
export type Presentation = 'sheet' | 'dialog' | 'inspector' | 'page';

/** Phone sheets below this width, desktop dialogs from it (GLAS-DESIGN §7.18/§7.19). */
export const DIALOG_FROM = 900;
/** The inspector needs this much width (GLAS-DESIGN §7.20). */
export const INSPECTOR_FROM = 1100;
/** Medium: inset 8 on the left, right and bottom; at most `100dvh − 144px` tall. */
export const MEDIUM_INSET = 8;
export const MEDIUM_TOP_GAP = 144;
/** Large: docked at the bottom, `100dvh − 52px` tall. */
export const LARGE_TOP = 52;
/** Below this viewport height only the large detent exists (390 px landscape would leave 246 px for medium). */
export const LARGE_ONLY_BELOW = 560;

export const RUBBER = 0.2;
/** Medium → large when dragged up by more than this (sketch: −50). */
export const UP_TO_LARGE = 50;
/** Large → medium when dragged down by more than this (sketch: 80). */
export const DOWN_TO_MEDIUM = 80;
/** Closing: medium (or a large-only sheet) from 25 % of its height, large from 45 % (sketch 110 of 450, 360 of 792). */
export const CLOSE_MEDIUM = 0.25;
export const CLOSE_LARGE = 0.45;
/** A fling faster than this (px/ms) decides on its own. */
export const FLING = 0.8;
/** The scrim is gone after this many px downwards. */
export const SCRIM_FADE = 500;
/** Smallest morph scale per axis (a 1-px origin would otherwise divide by almost nothing). */
export const MIN_SCALE = 0.05;
/** Radius the morph starts with, as seen on screen (tiles and chips are around 22). */
export const ORIGIN_RADIUS = 22;

export interface PresentationInput {
  viewportW: number;
  /** The caller asked for the inspector (`EntityDetailModal`, stage 3b). */
  wantsInspector: boolean;
  /** Rendered inside an open Glas window's content (`SheetContext`): a page in that window (K48). */
  nested: boolean;
  /** Another modal window is open: the inspector then opens as a dialog above it (K60). */
  othersOpen: boolean;
}

export function pickPresentation({ viewportW, wantsInspector, nested, othersOpen }: PresentationInput): Presentation {
  if (nested) return 'page';
  if (wantsInspector && !othersOpen && viewportW >= INSPECTOR_FROM) return 'inspector';
  return viewportW >= DIALOG_FROM ? 'dialog' : 'sheet';
}

export function hasMediumDetent(viewportH: number): boolean {
  return viewportH >= LARGE_ONLY_BELOW;
}

export function mediumMaxHeight(viewportH: number): number {
  return Math.max(0, viewportH - MEDIUM_TOP_GAP);
}

export function largeHeight(viewportH: number): number {
  return Math.max(0, viewportH - LARGE_TOP);
}

/** Start detent: medium if the content fits, otherwise (and on short viewports) large. */
export function pickDetent(contentH: number, viewportH: number): Detent {
  if (!hasMediumDetent(viewportH)) return 'large';
  return contentH <= mediumMaxHeight(viewportH) ? 'medium' : 'large';
}

/** Height of the medium sheet for its content. */
export function mediumHeight(contentH: number, viewportH: number): number {
  return Math.min(Math.max(0, contentH), mediumMaxHeight(viewportH));
}

export interface DragInput {
  detent: Detent;
  /** Finger travel since the press, px; negative = up. */
  dy: number;
  /** Current sheet height (medium: content height; large: `largeHeight`). */
  height: number;
  largeH: number;
  hasMedium: boolean;
  /** `swipeToClose !== false` and the sheet may close by dragging. */
  canClose: boolean;
}

export interface DragFrame {
  /** Height the sheet shows while dragged. */
  height: number;
  /** `translateY` in px (positive = down). */
  y: number;
}

/**
 * Where the sheet is while the finger moves. Medium grows with the finger up to the large height, beyond that it
 * follows with a rubber band (×0.2); large dragged up is a rubber band too. Downwards the sheet follows the finger,
 * unless it can neither close nor go down a detent: then rubber band.
 */
export function dragFrame({ detent, dy, height, largeH, hasMedium, canClose }: DragInput): DragFrame {
  if (dy < 0) {
    if (detent === 'medium') {
      const grown = height - dy;
      if (grown <= largeH) return { height: grown, y: 0 };
      return { height: largeH, y: -(grown - largeH) * RUBBER };
    }
    return { height, y: dy * RUBBER };
  }
  const canGoDown = canClose || (detent === 'large' && hasMedium);
  return { height, y: canGoDown ? dy : dy * RUBBER };
}

export interface SnapInput {
  detent: Detent;
  dy: number;
  /** Release speed, px/ms; negative = up. */
  vy: number;
  height: number;
  hasMedium: boolean;
  canClose: boolean;
}

export type Snap = Detent | 'close' | 'stay';

/** What happens on release (GLAS-DESIGN §7.18 "Ziehen", plan K51). */
export function snapAfterDrag({ detent, dy, vy, height, hasMedium, canClose }: SnapInput): Snap {
  const flingUp = vy < -FLING && dy < 0;
  const flingDown = vy > FLING && dy > 0;
  if (detent === 'medium') {
    if (dy < -UP_TO_LARGE || flingUp) return 'large';
    if (canClose && (dy > height * CLOSE_MEDIUM || flingDown)) return 'close';
    return 'stay';
  }
  if (!hasMedium) {
    if (canClose && (dy > height * CLOSE_MEDIUM || flingDown)) return 'close';
    return 'stay';
  }
  if (canClose && dy > height * CLOSE_LARGE) return 'close';
  if (dy > DOWN_TO_MEDIUM || flingDown) return 'medium';
  return 'stay';
}

/** Scrim opacity while dragging: fades out over the first 500 px downwards. */
export function scrimOpacity(dy: number): number {
  return Math.min(1, Math.max(0, 1 - Math.max(0, dy) / SCRIM_FADE));
}

export interface Sample {
  t: number;
  y: number;
}

/** Release speed from the pointer samples of the last `windowMs` (px/ms, negative = up); 0 with fewer than two. */
export function releaseVelocity(samples: readonly Sample[], windowMs = 80): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1]!;
  let first = last;
  for (let i = samples.length - 2; i >= 0; i--) {
    const s = samples[i]!;
    if (last.t - s.t > windowMs) break;
    first = s;
  }
  const dt = last.t - first.t;
  return dt > 0 ? (last.y - first.y) / dt : 0;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Morph {
  x: number;
  y: number;
  sx: number;
  sy: number;
  /** Border radius in the panel's own (unscaled) coordinates, so that it looks like `ORIGIN_RADIUS` once scaled. */
  rx: number;
  ry: number;
}

/**
 * Transform (origin top left) that lays the panel's end rectangle `target` over the origin element `origin`:
 * `translate(x, y) scale(sx, sy)` with `border-radius: rx / ry`.
 */
export function morphFrom(origin: Rect, target: Rect, originRadius = ORIGIN_RADIUS): Morph {
  const sx = Math.max(MIN_SCALE, target.w > 0 ? origin.w / target.w : 1);
  const sy = Math.max(MIN_SCALE, target.h > 0 ? origin.h / target.h : 1);
  return {
    x: origin.x - target.x,
    y: origin.y - target.y,
    sx,
    sy,
    rx: originRadius / sx,
    ry: originRadius / sy,
  };
}

/** The origin only counts while it is on screen (a closed chip row or a scrolled-away tile morphs nothing). */
export function originVisible(origin: Rect, viewportW: number, viewportH: number): boolean {
  if (origin.w <= 0 || origin.h <= 0) return false;
  return origin.x < viewportW && origin.y < viewportH && origin.x + origin.w > 0 && origin.y + origin.h > 0;
}
