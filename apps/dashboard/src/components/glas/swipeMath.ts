/**
 * [fork] Glas gestures (stage 3b) — the numbers of a swipe row (plan docs/glas/PLAN-ETAPPE-3.md K59, GLAS-DESIGN
 * §7.24). Pure. `reveal` is how far a row has moved to the left, i.e. how much of its action shows (px, ≥ 0).
 *
 * The gesture decides after 8 px: horizontal swipes the row, vertical scrolls the page (and wins a tie). The row follows
 * the finger up to 36 px past its action, rests open from 45 % of the action's width and never runs the action by
 * being pulled through — on locks and garage doors that would have real effects.
 */

/** Movement after which the gesture decides between swiping and scrolling. */
export const SWIPE_DECIDE_PX = 8;
/** How far a row follows the finger past its action. */
export const SWIPE_OVERDRAG = 36;
/** Share of the action's width a row has to be pulled to stay open. */
export const SWIPE_OPEN_SHARE = 0.45;

export interface SwipeSpec {
  /** Width of the action, where an open row rests. */
  width: number;
  /** Pulled at least this far, the row rests open. */
  openAt: number;
  /** The row follows the finger up to here. */
  stop: number;
}

/** Desktop (from 900 px): one width for every list (desktop sketch). */
export const DESKTOP_SWIPE: SwipeSpec = { width: 96, openAt: 48, stop: 128 };

/** The numbers for a list whose action is `phoneWidth` wide on the phone (§7.24: 104, 88, 104, 112). */
export function swipeSpec(phoneWidth: number, desktop: boolean): SwipeSpec {
  if (desktop) return { ...DESKTOP_SWIPE };
  return { width: phoneWidth, openAt: phoneWidth * SWIPE_OPEN_SHARE, stop: phoneWidth + SWIPE_OVERDRAG };
}

/** null until the pointer has moved 8 px; then 'x' (swipe) only when it moved more sideways than up or down. */
export function swipeAxis(dx: number, dy: number): 'x' | 'y' | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < SWIPE_DECIDE_PX) return null;
  return ax > ay ? 'x' : 'y';
}

/** The reveal while the pointer is `dx` px right of where it went down (`from` = the reveal at that moment). */
export function swipeReveal(from: number, dx: number, spec: SwipeSpec): number {
  return Math.min(spec.stop, Math.max(0, from - dx));
}

/** Where a row rests after letting go at `reveal`: open (the action's width) or closed (0). */
export function swipeRest(reveal: number, spec: SwipeSpec): number {
  return reveal >= spec.openAt ? spec.width : 0;
}
