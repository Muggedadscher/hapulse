/**
 * [fork] Locale-aware formatting for the NVR surfaces. The translation-free Intl
 * formatters come from the shared package; the word-dependent ones (relative
 * time, "N days") use HAPulse's i18n and stay here.
 */

import type { TFunction } from '../i18n/useT';

export { fmtTime, fmtTimeSec, fmtDay, fmtMonthYear, weekdayShorts, hhmmInput } from '@sentinel-nvr/web/api';

/** Relative "just now / 5 min ago / 2 h ago / 3 d ago". */
export function fmtRelative(ts: number, t: TFunction, nowMs = Date.now()): string {
  const s = Math.max(0, (nowMs - ts) / 1000);
  if (s < 60) return t('nvr.time.justNow');
  if (s < 3600) return t('nvr.time.minAgo', { n: Math.round(s / 60) });
  if (s < 86400) return t('nvr.time.hAgo', { n: Math.round(s / 3600) });
  return t('nvr.time.dAgo', { n: Math.round(s / 86400) });
}

/** "<1 day" / "1 day" / "12 days". */
export function fmtDays(d: number, t: TFunction): string {
  if (d < 1) return t('nvr.time.lessThanDay');
  const n = Math.round(d);
  return t('nvr.time.days', { count: n });
}
