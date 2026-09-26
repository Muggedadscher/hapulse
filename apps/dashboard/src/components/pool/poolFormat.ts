/**
 * [fork] Display formatting for the Pool page (pure, tested in test/poolFormat.test.ts).
 */

import type { HassEntity } from '@hapulse/core';

/**
 * Remaining time for the manual-run ring. Under an hour "29:59" + "min"; from an hour on
 * "23:59" + "h" — seconds tick uselessly on long runs, and "23:59:46" does not fit the ring.
 */
export function formatRingCountdown(totalSec: number): { value: string; unit: 'h' | 'min' } {
  const s = Math.max(0, Math.round(totalSec));
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return { value: `${h}:${String(m).padStart(2, '0')}`, unit: 'h' };
  }
  const m = Math.floor(s / 60);
  return { value: `${m}:${String(s % 60).padStart(2, '0')}`, unit: 'min' };
}

export type UntilLabel =
  | { kind: 'today'; time: string }
  | { kind: 'tomorrow'; time: string }
  | { kind: 'day'; time: string; day: string };

/** "until 15:11" — says "tomorrow" / the weekday when the end is not today (a 24 h run read at 15:11). */
export function formatUntil(end: Date, now: Date, locale: string): UntilLabel {
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(end);
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((dayStart(end) - dayStart(now)) / 86_400_000);
  if (days <= 0) return { kind: 'today', time };
  if (days === 1) return { kind: 'tomorrow', time };
  return { kind: 'day', time, day: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(end) };
}

/** Numeric state + unit with the locale's decimal separator ("5,5 h"), like the runtime chart. */
export function formatPoolValue(entity: HassEntity, locale: string): string | null {
  const num = parseFloat(entity.state);
  if (!Number.isFinite(num)) return null;
  const unit = entity.attributes['unit_of_measurement'];
  const value = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(num);
  return typeof unit === 'string' && unit ? `${value} ${unit}` : value;
}
