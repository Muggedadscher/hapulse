/**
 * [fork] Lock summary — the one rule the chip, the security cards and the home hints share.
 *
 * Moved here from the dashboard's `components/security/lockLogic.ts` (which re-exports it) so the
 * DOM-free hints (`hints.ts`) count locks exactly like the chip does. Tested in scripts/smoke.mjs and
 * in the dashboard's alarmLock.test.ts.
 */

import type { HassEntity } from './types.js';

/** States that mean "not ready" rather than open: stuck or not reachable. */
const PROBLEM = new Set(['jammed', 'unavailable', 'unknown']);

export interface LockSummary {
  total: number;
  locked: number;
  /** Not locked and not a problem: unlocked, open, and the moving states (locking/unlocking/opening). */
  open: number;
  /** jammed, unavailable or unknown */
  problem: number;
}

export function lockSummary(locks: readonly HassEntity[]): LockSummary {
  let locked = 0;
  let open = 0;
  let problem = 0;
  for (const l of locks) {
    if (l.state === 'locked') locked++;
    else if (PROBLEM.has(l.state)) problem++;
    else open++;
  }
  return { total: locks.length, locked, open, problem };
}

/** Shared tone so the chip, the home security card and the hero never disagree (like garageText.ts):
 *  one open lock → red; otherwise one stuck/unreachable lock → amber (never "all locked"); all locked → calm. */
export type LockTone = 'locked' | 'open' | 'problem';

export function lockTone(s: LockSummary): LockTone {
  if (s.open > 0) return 'open';
  if (s.problem > 0) return 'problem';
  return 'locked';
}

/** Whether a lock is still open (unlocked, open or moving) — the entities behind `LockSummary.open`. */
export function lockIsOpen(state: string): boolean {
  return state !== 'locked' && !PROBLEM.has(state);
}

/** Whether a lock is stuck or not reachable — the entities behind `LockSummary.problem`. */
export function lockHasProblem(state: string): boolean {
  return PROBLEM.has(state);
}
