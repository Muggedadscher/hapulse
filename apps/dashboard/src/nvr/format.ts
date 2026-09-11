/**
 * [fork] Locale-aware formatting for the NVR surfaces (Intl, no hand-rolled
 * German strings like Sentinel's own UI).
 */

import type { Locale } from '@hapulse/core';
import type { TFunction } from '../i18n/useT';

const pad = (n: number) => String(n).padStart(2, '0');

/** HH:MM in the viewer's locale (24 h where the locale uses it). */
export function fmtTime(ts: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(ts);
}

/** HH:MM:SS. */
export function fmtTimeSec(ts: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(ts);
}

/** "Mon 8 Sep" style day label. */
export function fmtDay(ts: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(ts);
}

/** Month + year for the date picker header. */
export function fmtMonthYear(ts: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(ts);
}

/** Weekday initials (Monday first) for the date picker grid. */
export function weekdayShorts(locale: Locale): string[] {
  const f = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // 2024-01-01 is a Monday.
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(2024, 0, 1 + i)));
}

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

/** HH:MM string for a time input. */
export function hhmmInput(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
