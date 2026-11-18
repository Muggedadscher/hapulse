/**
 * [fork] Pieces the battery's card, its window and the overview's battery line share (EnergyBattery.tsx,
 * EnergyBatteryWindow.tsx, EnergyBatteryLine.tsx): the ring with the charge, the state words and the power as text.
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
