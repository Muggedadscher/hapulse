/**
 * [fork] Pieces the battery's card, its window and the overview's battery line share (EnergyBattery.tsx,
 * EnergyBatteryWindow.tsx, EnergyBatteryLine.tsx): the ring with the charge, the state words, the power as text and
 * the "full at about" and "lasts until about" times.
 */

import type { BatteryState } from '@hapulse/core';
import { formatNumber } from '@hapulse/core';
import type { TKey } from '../../../i18n/useT';

export const BATTERY_STATE_KEY: Record<BatteryState, TKey> = {
  charging: 'energy.battery.charging',
  discharging: 'energy.battery.discharging',
  full: 'energy.battery.full',
  reserve: 'energy.battery.reserve',
  idle: 'energy.battery.idle',
};

/** The charge as a ring: the track and, from the top clockwise, the filled share. */
export function BatteryRing({ value, size = 20, stroke = 3 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const m = size / 2;
  const p = Math.max(0, Math.min(100, value));
  return (
    <svg className="en-bat__ring-svg" width={size} height={size} aria-hidden="true">
      <circle className="en-bat__ring-track" cx={m} cy={m} r={r} fill="none" strokeWidth={stroke} />
      {p > 0 && (
        <circle
          className="en-bat__ring-fill"
          cx={m}
          cy={m}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * p) / 100} ${c}`}
          transform={`rotate(-90 ${m} ${m})`}
        />
      )}
    </svg>
  );
}

/** A battery's power without its sign: watts below 1 kW ("420 W"), else kW with one decimal ("1,2 kW"). */
export function formatBatteryPower(watts: number, locale: string): string {
  const w = Math.abs(watts);
  return Math.round(w) < 1000 ? `${formatNumber(Math.round(w), locale, { maxDecimals: 0 })} W` : `${formatNumber(w / 1000, locale, { minDecimals: 1, maxDecimals: 1 })} kW`;
}

/**
 * "Full at about" only when that is still today: the forecast assumes the power stays as it is, and charging from the
 * panels stops at dusk, so a time tomorrow would be a guess. Null otherwise (also when core gave no time).
 */
export function fullAtToday(at: number | null, now: Date): number | null {
  if (at === null) return null;
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return at < midnight.getTime() ? at : null;
}

/** A forecast's clock time in the UI language ("8:00", "8:00 AM"); German adds "Uhr" in its texts. */
export function formatBatteryTime(at: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(at);
}

/**
 * "Lasts until about", with "tomorrow" when the time is on the next calendar day. Core's forecast reaches up to 24 h
 * plus the rounding to the quarter hour, which on a short day (DST) or just before midnight can land on the day after
 * tomorrow; that edge gets no text (null) rather than a wrong "tomorrow". The key and its time, for `t`.
 */
export function lastsUntilText(until: number, now: Date, locale: string): { key: TKey; time: string } | null {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const nextMidnight = new Date(now);
  nextMidnight.setHours(48, 0, 0, 0);
  if (until >= nextMidnight.getTime()) return null;
  const key: TKey = until < midnight.getTime() ? 'energy.battery.lastsUntil' : 'energy.battery.lastsUntilTomorrow';
  return { key, time: formatBatteryTime(until, locale) };
}
