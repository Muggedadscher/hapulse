/**
 * [fork] PoolTargetCard — the daily filter time.
 *
 * A ring shows today's runtime against the daily target, the side what is left and when Home Assistant starts the
 * pump at the latest to make it (`sensor.poolpumpe_pflichtlauf_ab`), the target itself is a stepper. A row below sets
 * the time of day the target should be met by. Only Automatik acts on it; in the other modes the card says so.
 * Shown only when the target helper and the runtime sensor exist (see `usePoolPlanPresent`).
 */

import React, { useEffect, useState } from 'react';
import { Hourglass } from 'lucide-react';
import { formatManualDuration, formatNumber } from '@hapulse/core';
import { Card } from '../ui/Card';
import { useEntity } from '../../ha/hooks';
import { useLocale, useT } from '../../i18n/useT';
import { setPoolNumber, setPoolTime } from '../../ha/pool';
import { POOL_ENTITIES, poolModeTone } from './poolConfig';
import { PoolGauge } from './PoolGauge';
import { PoolStepper } from './PoolStepper';
import {
  POOL_FINISH_STEP,
  clockMinutes,
  clockState,
  poolTargetStatus,
  restMinutes,
  shiftFinishBy,
} from './poolPlan';

export function PoolTargetCard() {
  const t = useT();
  const locale = useLocale();
  const target = useEntity(POOL_ENTITIES.dailyTarget);
  const runtime = useEntity(POOL_ENTITIES.runtimeToday);
  const finishBy = useEntity(POOL_ENTITIES.finishBy);
  const mustRunFrom = useEntity(POOL_ENTITIES.mustRunFrom);
  const mode = useEntity(POOL_ENTITIES.mode);

  const targetH = target ? parseFloat(target.state) : NaN;
  const runtimeH = runtime ? parseFloat(runtime.state) : NaN;
  const min = (target?.attributes['min'] as number | undefined) ?? 0;
  const max = (target?.attributes['max'] as number | undefined) ?? 12;
  const step = (target?.attributes['step'] as number | undefined) ?? 0.5;

  // the latest start passes without a state change: a minute tick turns "starts by 15:50" into "runs now"
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const status = poolTargetStatus(runtimeH, targetH, mustRunFrom?.state, now);
  const reached = status.kind === 'reached';
  const hours = (h: number) => `${formatNumber(h, locale, { maxDecimals: 1 })} h`;
  const clock = (d: Date) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d);

  const chip = status.kind === 'none' ? t('pool.target.none')
    : reached ? t('pool.target.reached')
      : t('pool.target.rest', { duration: formatManualDuration(restMinutes(status.restH), locale) });
  const line = status.kind === 'startsBy' ? t('pool.target.startsBy', { time: clock(status.at) })
    : status.kind === 'runningNow' ? t('pool.target.runningNow')
      : status.kind === 'missed' ? t('pool.target.missed')
        : null;

  const finishMin = clockMinutes(finishBy?.state);
  const finishText = Number.isFinite(finishMin) ? clock(new Date(2000, 0, 1, Math.floor(finishMin / 60), finishMin % 60)) : '—';
  const moveFinish = (delta: number) => {
    const next = shiftFinishBy(finishMin, delta);
    if (next != null) void setPoolTime(POOL_ENTITIES.finishBy, clockState(next));
  };

  const adjust = (delta: number) => {
    if (isNaN(targetH)) return;
    const next = Math.min(max, Math.max(min, Math.round((targetH + delta) / step) * step));
    if (next !== targetH) void setPoolNumber(POOL_ENTITIES.dailyTarget, next);
  };

  const auto = mode ? poolModeTone(mode.state) === 'auto' : true;
  const fraction = targetH > 0 && !isNaN(runtimeH) ? runtimeH / targetH : 0;

  return (
    <Card className="pool-card pool-card--split pool-target">
      <div className="pool-card__head">
        <span className="pool-card__icon" aria-hidden="true">
          <Hourglass size={16} strokeWidth={1.75} />
        </span>
        <h2 className="pool-card__title">{t('pool.target.title')}</h2>
      </div>

      <div className="pool-split">
        <PoolGauge
          value={fraction}
          color={reached ? 'var(--positive)' : 'var(--info)'}
          primary={<>{isNaN(runtimeH) ? '—' : formatNumber(runtimeH, locale, { maxDecimals: 1 })}<span className="pool-gauge__unit"> h</span></>}
          secondary={isNaN(targetH) ? undefined : `/ ${hours(targetH)}`}
        />

        <div className="pool-split__side">
          <span className={`pool-chip pool-chip--${reached ? 'positive' : 'muted'}`}>{chip}</span>
          {line && <span className="pool-split__line">{line}</span>}
          <PoolStepper
            label={t('pool.target.goal')}
            value={isNaN(targetH) ? '—' : hours(targetH)}
            stepText={hours(step)}
            canDown={!isNaN(targetH) && targetH > min}
            canUp={!isNaN(targetH) && targetH < max}
            onDown={() => adjust(-step)}
            onUp={() => adjust(step)}
          />
        </div>
      </div>

      {finishBy && (
        <div className="pool-row">
          <div className="pool-row__text">
            <span className="pool-row__label">{t('pool.target.finishBy')}</span>
            <span className="pool-row__desc">{t('pool.target.finishByDesc')}</span>
          </div>
          <PoolStepper
            bare
            label={t('pool.target.finishBy')}
            value={finishText}
            stepText={`${POOL_FINISH_STEP} min`}
            canDown={shiftFinishBy(finishMin, -POOL_FINISH_STEP) != null}
            canUp={shiftFinishBy(finishMin, POOL_FINISH_STEP) != null}
            onDown={() => moveFinish(-POOL_FINISH_STEP)}
            onUp={() => moveFinish(POOL_FINISH_STEP)}
          />
        </div>
      )}

      {!auto && <p className="pool-hint">{t('pool.target.onlyAuto')}</p>}
    </Card>
  );
}
