/**
 * [fork] A room's state in Glas (docs/GLAS-DESIGN.md §7.17): what needs attention comes first (`roomStatusIconName`:
 * an open window or door is a warning; an open gate, water or smoke an alarm), then lights on (yellow). One rule for the
 * overview's room tiles and the rooms menu (docs/glas/PLAN-ETAPPE-5.md K97).
 */

import type { TFunction } from '../../../i18n/useT';

export type RoomTone = 'on' | 'warn' | 'alarm';

/** How loud roomStatusIconName's statuses are (packages/core/src/roomIcons.ts). */
const STATUS_TONE: Record<string, 'warn' | 'alarm'> = {
  'grid-2x2': 'warn',
  'door-open': 'warn',
  car: 'alarm',
  droplets: 'alarm',
  flame: 'alarm',
};

export function roomTone(iconName: string, isStatus: boolean, lightsOn: number): RoomTone | undefined {
  return isStatus ? (STATUS_TONE[iconName] ?? 'warn') : lightsOn > 0 ? 'on' : undefined;
}

/** The status in words ("Fenster offen"), null without one. */
export function roomStatusText(t: TFunction, iconName: string, isStatus: boolean): string | null {
  if (!isStatus) return null;
  switch (iconName) {
    case 'grid-2x2':
      return t('hints.windowOpen', { count: 1 });
    case 'door-open':
      return t('hints.doorOpen', { count: 1 });
    case 'car':
      return t('hints.garageOpen', { count: 1 });
    case 'droplets':
      return t('hints.leak');
    case 'flame':
      return t('hints.smoke');
    default:
      return null;
  }
}
