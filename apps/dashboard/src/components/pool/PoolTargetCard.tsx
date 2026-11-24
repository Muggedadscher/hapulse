/**
 * [fork] PoolTargetCard — the daily filter time.
 *
 * A ring shows today's runtime against the daily target, the side what is left and when Home Assistant starts the
 * pump at the latest to make it (`sensor.poolpumpe_pflichtlauf_ab`), the target itself is a stepper. A row below sets
 * the time of day the target should be met by. Only Automatik acts on it; in the other modes the card says so.
 * Shown only when the target helper and the runtime sensor exist (see `usePoolPlanPresent`).
 */

import React, { useEffect, useState } from 'react';
import { Hourglass, ChevronRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
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

interface PoolTargetCardProps {
  /** The settings that rarely change (sun & battery, the schedule): "Details" next to the title opens them in a window, as on the energy page. */
  details?: React.ReactNode;
}

export function PoolTargetCard({ details }: PoolTargetCardProps) {
  const t = useT();
  const locale = useLocale();
  const target = useEntity(POOL_ENTITIES.dailyTarget);
  const runtime = useEntity(POOL_ENTITIES.runtimeToday);
  const finishBy = useEntity(POOL_ENTITIES.finishBy);
  const mustRunFrom = useEntity(POOL_ENTITIES.mustRunFrom);
  const mode = useEntity(POOL_ENTITIES.mode);
  const pump = useEntity(POOL_ENTITIES.pump);

  const targetH = target ? parseFloat(target.state) : NaN;
  const runtimeH = runtime ? parseFloat(runtime.state) : NaN;
  const min = (target?.attributes['min'] as number | undefined) ?? 0;
  const max = (target?.attributes['max'] as number | undefined) ?? 12;
  const step = (target?.attributes['step'] as number | undefined) ?? 0.5;

  // the latest start passes without a state change: a minute tick re-renders ("starts by 15:50" → "runs now"); the
  // status reads the clock on every render, so a page waking up after throttled timers is right at once
  const [, setTick] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const status = poolTargetStatus(runtimeH, targetH, mustRunFrom?.state, new Date());
  const reached = status.kind === 'reached';
  const hours = (h: number) => `${formatNumber(h, locale, { maxDecimals: 1 })} h`;
  const clock = (d: Date) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d);

  const chip = status.kind === 'none' ? t('pool.target.none')
    : reached ? t('pool.target.reached')
      : t('pool.target.rest', { duration: formatManualDuration(restMinutes(status.restH), locale) });
  // only Automatik acts on the target: the other modes get the note at the foot instead of a start time
  const auto = mode ? poolModeTone(mode.state) === 'auto' : true;
  const running = pump?.state === 'on';
  const line = !auto ? null
    : status.kind === 'startsBy' ? t('pool.target.startsBy', { time: clock(status.at) })
      : status.kind === 'runningNow' ? (running ? t('pool.target.runningNow') : null)
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

  const fraction = targetH > 0 && !isNaN(runtimeH) ? runtimeH / targetH : 0;

  return (
    <Card className="pool-card pool-target">
      <div className="pool-card__head">
        <span className="pool-card__icon" aria-hidden="true">
          <Hourglass size={16} strokeWidth={1.75} />
        </span>
        <h2 className="pool-card__title">{t('pool.target.title')}</h2>
        {details != null && (
          <button
            type="button"
            className="pool-card__link"
            aria-haspopup="dialog"
            aria-label={t('pool.details.aria')}
            onClick={() => setDetailsOpen(true)}
          >
            {t('pool.details.title')}
            <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
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
            stepText={formatManualDuration(POOL_FINISH_STEP, locale)}
            canDown={shiftFinishBy(finishMin, -POOL_FINISH_STEP) != null}
            canUp={shiftFinishBy(finishMin, POOL_FINISH_STEP) != null}
            onDown={() => moveFinish(-POOL_FINISH_STEP)}
            onUp={() => moveFinish(POOL_FINISH_STEP)}
          />
        </div>
      )}

      <p className="pool-hint">{auto ? t('pool.target.how', { time: finishText }) : t('pool.target.onlyAuto')}</p>

      {details != null && (
        <Modal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          title={t('pool.details.window')}
          icon={<Hourglass size={20} strokeWidth={1.75} />}
          className="pool-details"
        >
          <div className="pool-details__cards">{details}</div>
        </Modal>
      )}
    </Card>
  );
}
