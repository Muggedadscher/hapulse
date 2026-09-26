/**
 * [fork] ManualTimerCard — manual-run status + controls.
 *
 * Active: the live countdown ring with the end-of-run clock and a Stop button.
 * Idle: a calm prompt with a "start manual run" button that opens the duration
 * popup ({@link PumpManualModal}). A row below sets how long a start via Siri /
 * the Apple-Home switch runs — its own duration, independent of the UI pick.
 *
 * The actual start lives in the popup; HAPulse only writes the chosen minutes
 * and flips the mode, the HA automations drive the pump + timer (see
 * docs/POOL-MANUELL-DAUER-PLAN.md).
 */

import React, { useState } from 'react';
import { Timer, Play, Square, Minus, Plus } from 'lucide-react';
import {
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
import { usePoolTimer } from './usePoolTimer';
import { formatRingCountdown, formatUntil } from './poolFormat';
import { PumpManualModal } from './PumpManualModal';

/** ± step for the Siri-duration stepper, matching the HA input_number. */
const STEP = 5;

export function ManualTimerCard() {
  const t = useT();
  const locale = useLocale();
  const timer = useEntity(POOL_ENTITIES.manualTimer);
  const mode = useEntity(POOL_ENTITIES.mode);
  const siriDur = useEntity(POOL_ENTITIES.siriDuration);
  const info = usePoolTimer(timer);
  const [manualOpen, setManualOpen] = useState(false);

  const active = info.state !== 'idle';

  const options = (mode?.attributes['options'] as string[] | undefined) ?? [];
  const autoOption = options.find((o) => poolModeTone(o) === 'auto');

  // "tomorrow" / weekday when the run does not end today (a 24 h run read at 15:11 said "until 15:11")
  const until = info.finishesAt ? formatUntil(info.finishesAt, new Date(), locale) : null;
  const endLabel = !until ? null
    : until.kind === 'today' ? t('pool.manual.runsUntil', { time: until.time })
      : until.kind === 'tomorrow' ? t('pool.manual.runsUntilTomorrow', { time: until.time })
        : t('pool.manual.runsUntilDay', { day: until.day, time: until.time });
  const ring = formatRingCountdown(info.remainingSec);

  const stop = () => {
    if (autoOption) void setPoolMode(POOL_ENTITIES.mode, autoOption);
  };

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
              primary={<span className="data-font">{ring.value}<span className="pool-gauge__unit"> {ring.unit}</span></span>}
              secondary={t('pool.manual.remaining')}
            />
            {endLabel && (
              <p className="pool-manual__until">{endLabel}</p>
            )}
            <button type="button" className="btn btn--ghost pool-manual__action" onClick={stop} disabled={!autoOption}>
              <Square size={15} strokeWidth={2} />
              {t('pool.manual.stop')}
            </button>
          </>
        ) : (
          <div className="pool-manual__idle">
            <Timer size={30} strokeWidth={1.5} aria-hidden="true" />
            <p>{t('pool.manual.idle')}</p>
            <button type="button" className="btn btn--primary pool-manual__action" onClick={() => setManualOpen(true)}>
              <Play size={16} strokeWidth={2} />
              {t('pool.manual.startTitle')}
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

      <PumpManualModal open={manualOpen} onClose={() => setManualOpen(false)} />
    </Card>
  );
}
