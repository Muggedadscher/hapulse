/**
 * [fork] ManualTimerCard — the manual-run countdown.
 *
 * While the pump runs in manual mode a Home Assistant timer counts down; this
 * card renders it as a live ring with the remaining time and end-of-run clock.
 * When no timer is running it shows a calm idle state instead.
 */

import React from 'react';
import { Timer } from 'lucide-react';
import { Card } from '../ui/Card';
import { useEntity } from '../../ha/hooks';
import { useLocale, useT } from '../../i18n/useT';
import { POOL_ENTITIES } from './poolConfig';
import { PoolGauge } from './PoolGauge';
import { usePoolTimer, formatCountdown } from './usePoolTimer';

export function ManualTimerCard() {
  const t = useT();
  const locale = useLocale();
  const timer = useEntity(POOL_ENTITIES.manualTimer);
  const info = usePoolTimer(timer);

  const active = info.state !== 'idle';
  const endLabel = info.finishesAt
    ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(info.finishesAt)
    : null;

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
          </>
        ) : (
          <div className="pool-manual__idle">
            <Timer size={30} strokeWidth={1.5} aria-hidden="true" />
            <p>{t('pool.manual.idle')}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
