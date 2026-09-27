/**
 * [fork] Shared summary wording/tone for groups of garage doors, so the chip,
 * the home security card, the hero and the section never disagree:
 * one open door → red; otherwise one unreachable door → amber (never "all closed");
 * only when every door is closed → green.
 */

import type { GarageSummary } from '@hapulse/core';
import type { TFunction } from '../../i18n/useT';
import type { GarageTone } from './GarageIcon';

export function summaryTone(s: GarageSummary): GarageTone {
  if (s.open > 0) return 'open';
  if (s.unavailable > 0) return 'unavailable';
  return 'closed';
}

/**
 * Status text. `allClosed` lets each place keep its own wording for the calm
 * case (chip: "all closed", hero: "Garage closed", …).
 */
export function summaryText(t: TFunction, s: GarageSummary, allClosed: string): string {
  if (s.open > 0) return t('garage.openCount', { count: s.open });
  if (s.unavailable > 0) return t('garage.unavailableCount', { count: s.unavailable });
  return allClosed;
}
