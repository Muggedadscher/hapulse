/**
 * [fork] Pure rules for lock controls (unit-tested).
 */

import type { HassEntity, LockSummary } from '@hapulse/core';
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

/** The summary rule itself lives in core (`locks.ts`) so the home hints count locks like the chip. */
export { lockSummary, lockTone } from '@hapulse/core';
export type { LockSummary, LockTone } from '@hapulse/core';

/** Status text; `allLocked` lets each place keep its own wording for the calm case. */
export function lockSummaryText(t: TFunction, s: LockSummary, allLocked: string): string {
  if (s.open > 0) return t('home.security.unlockedCount', { count: s.open });
  if (s.problem > 0) return t('locks.problemCount', { count: s.problem });
  return allLocked;
}
