/**
 * [fork] Pure rules for lock controls (unit-tested).
 */

import type { HassEntity } from '@hapulse/core';

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
