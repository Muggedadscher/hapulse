/**
 * [fork] Pure rules for lock controls (unit-tested).
 */

import type { HassEntity } from '@hapulse/core';
import type { TFunction } from '../../i18n/useT';

/** States in which lock/unlock buttons are disabled: moving, stuck or not reachable. */
const BUSY = new Set(['locking', 'unlocking', 'opening', 'jammed', 'unavailable', 'unknown']);

export function lockBusy(state: string): boolean {
  return BUSY.has(state);
}

/** The lock expects a code for lock/unlock (HA exposes a code_format regex). */
export function lockNeedsCode(entity: HassEntity): boolean {
  const f = entity.attributes['code_format'];
  return typeof f === 'string' && f.length > 0;
}

/** Numeric keypad hint for the code field (HA's code_format is a regex; digits-only is the common case). */
export function lockCodeIsNumeric(entity: HassEntity): boolean {
  const f = entity.attributes['code_format'];
  return typeof f === 'string' && /^\^?\\d[+*{]/.test(f);
}

/** Unlocking always asks for confirmation; locking only when a code is needed. */
export function lockNeedsDialog(service: 'lock' | 'unlock', entities: HassEntity[]): boolean {
  return service === 'unlock' || entities.some(lockNeedsCode);
}

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

/** Status text; `allLocked` lets each place keep its own wording for the calm case. */
export function lockSummaryText(t: TFunction, s: LockSummary, allLocked: string): string {
  if (s.open > 0) return t('home.security.unlockedCount', { count: s.open });
  if (s.problem > 0) return t('locks.problemCount', { count: s.problem });
  return allLocked;
}
