/**
 * [fork] SolarCard — the solar automation.
 *
 * A ring shows current solar production against the switch-on threshold, so
 * it's obvious at a glance whether there's enough sun for the pump to run. The
 * threshold itself is editable with a − / + stepper (bounded by the
 * input_number's own min/max/step).
 */

import React from 'react';
import { Sun, Minus, Plus } from 'lucide-react';
import { Card } from '../ui/Card';
import { useEntity } from '../../ha/hooks';
import { useT } from '../../i18n/useT';
import { setSolarThreshold } from '../../ha/pool';
import { POOL_ENTITIES } from './poolConfig';
import { PoolGauge } from './PoolGauge';

export function SolarCard() {
  const t = useT();
  const power = useEntity(POOL_ENTITIES.solarPower);
  const threshold = useEntity(POOL_ENTITIES.solarThreshold);
  const exceeded = useEntity(POOL_ENTITIES.solarExceeded);

  const powerW = power ? parseFloat(power.state) : NaN;
  const thresholdW = threshold ? parseFloat(threshold.state) : NaN;
  const isExceeded = exceeded?.state === 'on';

  const min = (threshold?.attributes['min'] as number | undefined) ?? 0;
  const max = (threshold?.attributes['max'] as number | undefined) ?? 1000;
  const step = (threshold?.attributes['step'] as number | undefined) ?? 50;
  const unit = (threshold?.attributes['unit_of_measurement'] as string | undefined) ?? 'W';

  const fraction = !isNaN(powerW) && !isNaN(thresholdW) && thresholdW > 0 ? powerW / thresholdW : 0;
  const gaugeColor = isExceeded ? 'var(--positive)' : 'var(--accent)';

  const adjust = (delta: number) => {
    if (isNaN(thresholdW)) return;
    const next = Math.min(max, Math.max(min, thresholdW + delta));
    if (next !== thresholdW) void setSolarThreshold(POOL_ENTITIES.solarThreshold, next);
  };

  return (
    <Card className="pool-card pool-solar">
      <div className="pool-card__head">
        <span className="pool-card__icon icon-chip" aria-hidden="true">
          <Sun size={16} strokeWidth={1.75} />
        </span>
        <h2 className="pool-card__title">{t('pool.solar.title')}</h2>
      </div>

      <div className="pool-solar__body">
        <PoolGauge
          value={fraction}
          color={gaugeColor}
          primary={<>{isNaN(powerW) ? '—' : Math.round(powerW)}<span className="pool-gauge__unit"> {unit}</span></>}
          secondary={isNaN(thresholdW) ? undefined : `/ ${Math.round(thresholdW)} ${unit}`}
        />

        <div className="pool-solar__side">
          <span className={`pool-chip pool-chip--${isExceeded ? 'positive' : 'muted'}`}>
            {isExceeded ? t('pool.solar.exceeded') : t('pool.solar.below')}
          </span>

          <div className="pool-stepper">
            <span className="pool-stepper__label">{t('pool.solar.threshold')}</span>
            <div className="pool-stepper__controls">
              <button
                type="button"
                className="pool-stepper__btn"
                aria-label={`${t('pool.solar.threshold')} −${step}${unit}`}
                onClick={() => adjust(-step)}
                disabled={isNaN(thresholdW) || thresholdW <= min}
              >
                <Minus size={16} strokeWidth={2} />
              </button>
              <span className="pool-stepper__value data-font">
                {isNaN(thresholdW) ? '—' : Math.round(thresholdW)}<span className="pool-stepper__unit"> {unit}</span>
              </span>
              <button
                type="button"
                className="pool-stepper__btn"
                aria-label={`${t('pool.solar.threshold')} +${step}${unit}`}
                onClick={() => adjust(step)}
                disabled={isNaN(thresholdW) || thresholdW >= max}
              >
                <Plus size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
