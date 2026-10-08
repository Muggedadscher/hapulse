/**
 * [fork] Glas windows (stage 3) — a wrong code shakes what it was typed into: the keypad's dots, the lock code field
 * (plan docs/glas/PLAN-ETAPPE-3.md K56, GLAS-DESIGN §6.3 "Code falsch"): 420 ms, −10/9/−6/4 px. Only in Glas, and
 * never under reduced motion; Klassisch gets neither an attribute nor a key for it.
 */

import { play, reducedMotion } from './sheetMotion';

const STEPS = [0, -10, 9, -6, 4, 0].map((x) => ({ transform: `translateX(${x}px)` }));

export function shake(el: Element | null): void {
  if (!el || document.documentElement.dataset.style !== 'glas' || reducedMotion()) return;
  play(el, STEPS, { duration: 420, easing: 'ease-out' });
}
