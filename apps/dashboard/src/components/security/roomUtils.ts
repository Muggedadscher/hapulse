/**
 * Security page local utilities — room name resolution and entity helpers.
 */

import type { Room } from '@hapulse/core';
import type { TFunction } from '../../i18n/useT';

/** Return the room name for an entity ID, or undefined if not found. */
export function getRoomName(entityId: string, rooms: Room[]): string | undefined {
  return rooms.find((r) => r.entityIds.includes(entityId))?.name;
}

/**
 * Format a relative time string for a last-changed timestamp.
 * e.g. "4m ago", "2h ago", "just now"
 *
 * Takes the translator as a parameter so the strings stay in the dictionary
 * without this module needing a React hook.
 */
export function relativeTime(t: TFunction, isoString: string): string {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 30) return t('common.time.justNow');
  if (diff < 60) return t('common.time.secondsAgo', { count: Math.round(diff) });
  if (diff < 3600) return t('common.time.minutesAgo', { count: Math.floor(diff / 60) });
  if (diff < 86400) return t('common.time.hoursAgo', { count: Math.floor(diff / 3600) });
  return t('common.time.daysAgo', { count: Math.floor(diff / 86400) });
}
