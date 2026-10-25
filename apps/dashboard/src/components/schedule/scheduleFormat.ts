/**
 * [fork] How the periods of the ring editor read in the UI language (shared by the heating plan and the pool
 * schedule; plan glas/pool-zeiten/PLAN.md). Times are `HH:MM`, the end of a day `24:00`, shown with the locale's
 * clock (Intl): a 24-hour locale keeps `24:00` for the end of a day ("bis 24:00"), a 12-hour one shows midnight.
 */

import { periodLength, periodMinutes } from '@hapulse/core';
import type { TimePeriod } from '@hapulse/core';

/** A Monday, for the weekday names (Intl has no "name of weekday n"). */
const MONDAY = new Date(2026, 0, 5);

/** Weekday `index` (0 = Monday) as "Montag" (long), "Mo." (short), "M" (narrow). */
export function scheduleDayName(index: number, locale: string, width: 'long' | 'short' | 'narrow'): string {
  const d = new Date(MONDAY);
  d.setDate(MONDAY.getDate() + index);
  return new Intl.DateTimeFormat(locale, { weekday: width }).format(d);
}

/** The short day name for a round day chip, without an abbreviation dot ("lun." → "lun"). */
export function scheduleChipName(index: number, locale: string): string {
  return scheduleDayName(index, locale, 'short').replace(/\.$/u, '');
}

export function formatPeriodTime(time: string, locale: string): string {
  const minutes = periodMinutes(time);
  const fmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const text = fmt.format(new Date(2026, 0, 5, Math.floor(minutes / 60) % 24, minutes % 60));
  if (minutes < 24 * 60 || fmt.resolvedOptions().hourCycle !== 'h23') return text;
  return text.replace(/^00/, '24');
}

/** "06:00–08:30" */
export function formatPeriodRange(period: TimePeriod, locale: string): string {
  return `${formatPeriodTime(period.from, locale)}–${formatPeriodTime(period.to, locale)}`;
}

/**
 * A length in minutes as its hours and its minutes with the units of the locale (["14 Std.", "30 Min."]); a part that
 * is zero is left out, except the minutes of a length under an hour.
 */
export function minutesParts(total: number, locale: string): string[] {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const unit = (value: number, u: 'hour' | 'minute') =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: u, unitDisplay: 'short' }).format(value);
  if (hours === 0) return [unit(minutes, 'minute')];
  return minutes === 0 ? [unit(hours, 'hour')] : [unit(hours, 'hour'), unit(minutes, 'minute')];
}

/** Length of a period as its parts (minutesParts). */
export function periodDurationParts(period: TimePeriod, locale: string): string[] {
  return minutesParts(periodLength(period), locale);
}
