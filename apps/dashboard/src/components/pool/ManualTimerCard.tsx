/**
 * [fork] ManualTimerCard — manual-run control + live countdown.
 *
 * Idle: pick a run length (presets 30 min … 24 h, or a free ± stepper) and
 * start a manual run. Active: the live countdown ring with the end-of-run clock
 * and a Stop button. A row below sets how long a start via Siri / the
 * Apple-Home switch runs — its own duration, independent of the UI pick.
 *
 * HAPulse only writes the chosen minutes into the manual/Siri input_numbers and
 * flips the mode input_select; the HA automations start/stop the pump + timer
 * and revert to Automatik when the timer ends (see docs/POOL-MANUELL-DAUER-PLAN.md).
 */

import React, { useState } from 'react';
import { Timer, Play, Square, Minus, Plus } from 'lucide-react';
import {
  POOL_MANUAL_PRESETS_MIN,
  POOL_MANUAL_MIN_MINUTES,
  POOL_MANUAL_MAX_MINUTES,
  clampManualMinutes,
  formatManualDuration,
} from '@hapulse/core';
import { Card } from '../ui/Card';
import { useEntity } from '../../ha/hooks';
import { useLocale, useT } from '../../i18n/useT';
import { POOL_ENTITIES, poolModeTone } from './poolConfig';
import { setDurationMinutes, setPoolMode } from '../../ha/pool';
import { PoolGauge } from './PoolGauge';
import { usePoolTimer, formatCountdown } from './usePoolTimer';

/** ± step for the free duration + Siri steppers, matching the HA input_number. */
const STEP = 5;

export function ManualTimerCard() {
  const t = useT();
  const locale = useLocale();
  const timer = useEntity(POOL_ENTITIES.manualTimer);
  const mode = useEntity(POOL_ENTITIES.mode);
  const manualDur = useEntity(POOL_ENTITIES.manualDuration);
  const siriDur = useEntity(POOL_ENTITIES.siriDuration);
  const info = usePoolTimer(timer);

  const active = info.state !== 'idle';

  // Resolve the input_select's own option strings by semantic tone, so we never
  // hard-code the German labels ("Manuell"/"Automatik").
  const options = (mode?.attributes['options'] as string[] | undefined) ?? [];
  const manualOption = options.find((o) => poolModeTone(o) === 'manual');
  const autoOption = options.find((o) => poolModeTone(o) === 'auto');

  // Local pick for the next manual run, seeded from the HA input_number until
  // the user touches a preset/stepper.
  const storedMinutes = manualDur ? clampManualMinutes(parseFloat(manualDur.state)) : 30;
  const [pick, setPick] = useState<number | null>(null);
  const minutes = pick ?? storedMinutes;

  const endLabel = info.finishesAt
    ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(info.finishesAt)
    : null;

  const start = () => {
    if (!manualOption) return;
    void setDurationMinutes(POOL_ENTITIES.manualDuration, minutes);
    void setPoolMode(POOL_ENTITIES.mode, manualOption);
    setPick(null);
  };
  const stop = () => {
    if (autoOption) void setPoolMode(POOL_ENTITIES.mode, autoOption);
  };
  const nudge = (delta: number) => setPick(clampManualMinutes(minutes + delta));

  const siriMinutes = siriDur ? clampManualMinutes(parseFloat(siriDur.state)) : 30;
  const nudgeSiri = (delta: number) => {
    const next = clampManualMinutes(siriMinutes + delta);
    if (next !== siriMinutes) void setDurationMinutes(POOL_ENTITIES.siriDuration, next);
  };

  return (
    <Card className="pool-card pool-manual">
      <div className="pool-card__head">
        <span className="pool-card__icon" aria-hidden="true">
          <Timer size={16} strokeWidth={1.75} />
        </span>
        <h2 className="pool-card__title">{t('pool.manual.title')}</h2>
      </div>

      <div className="pool-manual__body">
        {active ? (
          <>
            <PoolGauge
              value={info.fraction}
              color="var(--info)"
              primary={<span className="data-font">{formatCountdown(info.remainingSec)}</span>}
              secondary={t('pool.manual.remaining')}
            />
            {endLabel && (
              <p className="pool-manual__until">{t('pool.manual.runsUntil', { time: endLabel })}</p>
            )}
            <button type="button" className="btn btn--ghost pool-manual__action" onClick={stop} disabled={!autoOption}>
              <Square size={15} strokeWidth={2} />
              {t('pool.manual.stop')}
            </button>
          </>
        ) : (
          <div className="pool-manual__setup">
            <span className="pool-manual__label">{t('pool.manual.durationTitle')}</span>
            <div className="pool-manual__presets" role="group" aria-label={t('pool.manual.durationTitle')}>
              {POOL_MANUAL_PRESETS_MIN.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`pool-manual__preset${minutes === p ? ' pool-manual__preset--active' : ''}`}
                  aria-pressed={minutes === p}
                  onClick={() => setPick(p)}
                >
                  {formatManualDuration(p)}
                </button>
              ))}
            </div>
            <div className="pool-manual__custom">
              <button
                type="button"
                className="pool-stepper__btn"
                aria-label={`${t('pool.manual.durationTitle')} −${STEP} min`}
                onClick={() => nudge(-STEP)}
                disabled={minutes <= POOL_MANUAL_MIN_MINUTES}
              >
                <Minus size={16} strokeWidth={2} />
              </button>
              <span className="pool-manual__custom-value data-font">{formatManualDuration(minutes)}</span>
              <button
                type="button"
                className="pool-stepper__btn"
                aria-label={`${t('pool.manual.durationTitle')} +${STEP} min`}
                onClick={() => nudge(STEP)}
                disabled={minutes >= POOL_MANUAL_MAX_MINUTES}
              >
                <Plus size={16} strokeWidth={2} />
              </button>
            </div>
            <button type="button" className="btn btn--primary pool-manual__action" onClick={start} disabled={!manualOption}>
              <Play size={16} strokeWidth={2} />
              {t('pool.manual.start')}
            </button>
          </div>
        )}

        {/* Siri / Apple-Home start duration — its own persistent setting. */}
        <div className="pool-manual__siri">
          <div className="pool-manual__siri-text">
            <span className="pool-manual__siri-label">{t('pool.manual.siriLabel')}</span>
            <span className="pool-manual__siri-desc">{t('pool.manual.siriDesc')}</span>
          </div>
          <div className="pool-stepper__controls">
            <button
              type="button"
              className="pool-stepper__btn"
              aria-label={`${t('pool.manual.siriLabel')} −${STEP} min`}
              onClick={() => nudgeSiri(-STEP)}
              disabled={siriMinutes <= POOL_MANUAL_MIN_MINUTES}
            >
              <Minus size={16} strokeWidth={2} />
            </button>
            <span className="pool-stepper__value data-font">{formatManualDuration(siriMinutes)}</span>
            <button
              type="button"
              className="pool-stepper__btn"
              aria-label={`${t('pool.manual.siriLabel')} +${STEP} min`}
              onClick={() => nudgeSiri(STEP)}
              disabled={siriMinutes >= POOL_MANUAL_MAX_MINUTES}
            >
              <Plus size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
