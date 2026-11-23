/**
 * [fork] PoolBatteryCard — sun and the home battery's surplus.
 *
 * A ring shows the battery's charge. Home Assistant lets the pump run from the battery while it is full: from "on
 * from" on until it drops below "off below" (input_boolean.poolpumpe_akku_uberschuss_aktiv holds that state between the
 * two). The two limits are steppers here; "off below" always stays at least 5 % under "on from". A row below sets the
 * sun threshold (the pump may also run on sun while the daily filter time is not met yet).
 *
 * Until a grid meter makes the battery feed the house (input_boolean.poolpumpe_nulleinspeisung_aktiv), HA does not
 * start the pump on a full battery — it would draw from the grid — and the card says so. It also warns when "on from"
 * lies above the battery's own charge limit, which the charge then never reaches.
 */

import React from 'react';
import { BatteryCharging } from 'lucide-react';
import { formatNumber } from '@hapulse/core';
import { Card } from '../ui/Card';
import { useEntity } from '../../ha/hooks';
import { useLocale, useT } from '../../i18n/useT';
import { setPoolNumber, setSolarThreshold } from '../../ha/pool';
import { POOL_ENTITIES } from './poolConfig';
import { PoolGauge } from './PoolGauge';
import { PoolStepper } from './PoolStepper';
import { surplusSteps } from './poolPlan';

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

export function PoolBatteryCard() {
  const t = useT();
  const locale = useLocale();
  const soc = useEntity(POOL_ENTITIES.batterySoc);
  const limit = useEntity(POOL_ENTITIES.batteryChargeLimit);
  const onE = useEntity(POOL_ENTITIES.surplusOn);
  const offE = useEntity(POOL_ENTITIES.surplusOff);
  const active = useEntity(POOL_ENTITIES.surplusActive);
  const zeroFeedIn = useEntity(POOL_ENTITIES.zeroFeedIn);
  const power = useEntity(POOL_ENTITIES.solarPower);
  const threshold = useEntity(POOL_ENTITIES.solarThreshold);

  const socPct = soc ? parseFloat(soc.state) : NaN;
  const on = onE ? parseFloat(onE.state) : NaN;
  const off = offE ? parseFloat(offE.state) : NaN;
  const step = num(onE?.attributes['step'], 5);
  const steps = surplusSteps({
    on,
    off,
    step,
    onMin: num(onE?.attributes['min'], 0),
    onMax: num(onE?.attributes['max'], 100),
    offMin: num(offE?.attributes['min'], 0),
    offMax: num(offE?.attributes['max'], 100),
  });
  const pct = (v: number) => (isNaN(v) ? '—' : `${formatNumber(v, locale, { maxDecimals: 0 })} %`);

  // "the pump may run from the battery" needs both: the surplus state and the zero feed-in (no meter → grid)
  const surplus = active?.state === 'on';
  const freeRun = surplus && zeroFeedIn?.state === 'on';
  const limitPct = limit ? parseFloat(limit.state) : NaN;
  const overLimit = !isNaN(limitPct) && !isNaN(on) && on > limitPct;

  const powerW = power ? parseFloat(power.state) : NaN;
  const thresholdW = threshold ? parseFloat(threshold.state) : NaN;
  const tMin = num(threshold?.attributes['min'], 0);
  const tMax = num(threshold?.attributes['max'], 1000);
  const tStep = num(threshold?.attributes['step'], 50);
  const unit = (threshold?.attributes['unit_of_measurement'] as string | undefined) ?? 'W';
  const watts = (v: number) => (isNaN(v) ? '—' : `${formatNumber(v, locale, { maxDecimals: 0 })} ${unit}`);
  const moveThreshold = (delta: number) => {
    if (isNaN(thresholdW)) return;
    const next = Math.min(tMax, Math.max(tMin, thresholdW + delta));
    if (next !== thresholdW) void setSolarThreshold(POOL_ENTITIES.solarThreshold, next);
  };

  return (
    <Card className="pool-card pool-card--split pool-battery">
      <div className="pool-card__head">
        <span className="pool-card__icon" aria-hidden="true">
          <BatteryCharging size={16} strokeWidth={1.75} />
        </span>
        <h2 className="pool-card__title">{t('pool.battery.title')}</h2>
      </div>

      <div className="pool-split">
        <PoolGauge
          value={isNaN(socPct) ? 0 : socPct / 100}
          color={freeRun ? 'var(--positive)' : 'var(--accent)'}
          primary={<>{isNaN(socPct) ? '—' : formatNumber(socPct, locale, { maxDecimals: 0 })}<span className="pool-gauge__unit"> %</span></>}
          secondary={t('pool.battery.soc')}
        />

        <div className="pool-split__side">
          <span className={`pool-chip pool-chip--${freeRun ? 'positive' : 'muted'}`}>
            {freeRun ? t('pool.battery.surplus') : surplus ? t('pool.battery.full') : t('pool.battery.noSurplus')}
          </span>
          <PoolStepper
            label={t('pool.battery.on')}
            value={pct(on)}
            stepText={`${step} %`}
            canDown={steps.onDown}
            canUp={steps.onUp}
            onDown={() => void setPoolNumber(POOL_ENTITIES.surplusOn, on - step)}
            onUp={() => void setPoolNumber(POOL_ENTITIES.surplusOn, on + step)}
          />
          <PoolStepper
            label={t('pool.battery.off')}
            value={pct(off)}
            stepText={`${step} %`}
            canDown={steps.offDown}
            canUp={steps.offUp}
            onDown={() => void setPoolNumber(POOL_ENTITIES.surplusOff, off - step)}
            onUp={() => void setPoolNumber(POOL_ENTITIES.surplusOff, off + step)}
          />
        </div>
      </div>

      {threshold && (
        <div className="pool-row">
          <div className="pool-row__text">
            <span className="pool-row__label">{t('pool.battery.sun')}</span>
            <span className="pool-row__desc">{t('pool.battery.sunNow', { power: watts(powerW) })}</span>
          </div>
          <PoolStepper
            bare
            label={t('pool.battery.sun')}
            value={watts(thresholdW)}
            stepText={`${tStep} ${unit}`}
            canDown={!isNaN(thresholdW) && thresholdW > tMin}
            canUp={!isNaN(thresholdW) && thresholdW < tMax}
            onDown={() => moveThreshold(-tStep)}
            onUp={() => moveThreshold(tStep)}
          />
        </div>
      )}

      {zeroFeedIn && zeroFeedIn.state !== 'on' && <p className="pool-hint">{t('pool.battery.noMeter')}</p>}
      {overLimit && <p className="pool-hint pool-hint--warn">{t('pool.battery.overLimit', { limit: pct(limitPct) })}</p>}
    </Card>
  );
}
