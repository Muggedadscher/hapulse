/**
 * [fork] The overview energy card's battery line after draft v5 (plan glas/energie-neu/umsetzung/PLAN.md): a small ring,
 * "Battery" and "71 % · charging", below the chart and set apart, because it shows now while the chart shows the
 * period. Both styles (the overview's Glas card and the classic widget); renders nothing without a charge sensor.
 */

import React from 'react';
import { formatNumber } from '@hapulse/core';
import type { EnergyPreferences } from '@hapulse/core';
import { useLocale, useT } from '../../../i18n/useT';
import { BATTERY_STATE_KEY, BatteryRing, useBatteryNow } from './EnergyBattery';
import './EnergyBatteryLine.css';

export function EnergyBatteryLine({ prefs }: { prefs: EnergyPreferences | null }) {
  const t = useT();
  const locale = useLocale();
  const battery = useBatteryNow(prefs);
  if (!battery) return null;
  const { soc, status, showState } = battery;
  return (
    <div className="en-batline">
      <span className="en-batline__ring" aria-hidden="true">
        <BatteryRing value={soc ?? 0} />
      </span>
      <span className="en-batline__name">{t('energy.battery.title')}</span>
      {soc === null ? (
        <span className="en-batline__value">{t('energy.battery.unavailable')}</span>
      ) : (
        <span className="en-batline__value">
          <span className="en-batline__soc">{formatNumber(soc, locale, { maxDecimals: 0 })} %</span>
          {showState && status && (
            <>
              {' · '}
              <span className={`en-batline__state en-batline__state--${status.state}`}>
                {t(BATTERY_STATE_KEY[status.state]!)}
              </span>
            </>
          )}
        </span>
      )}
    </div>
  );
}
