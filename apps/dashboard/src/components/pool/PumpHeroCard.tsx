/**
 * [fork] PumpHeroCard — the Pool page hero.
 *
 * Shows whether the pump is running right now, a segmented control for the
 * operating mode (off / automatic / manual, straight from the input_select's
 * own options), and today's runtime as a glance stat.
 */

import React, { useState } from 'react';
import { Waves, Power, PowerOff, CirclePause, RefreshCw, Hand, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatEntityState } from '@hapulse/core';
import { useEntity } from '../../ha/hooks';
import { useLocale, useT } from '../../i18n/useT';
import type { TKey } from '../../i18n/useT';
import { setPoolMode } from '../../ha/pool';
import { POOL_ENTITIES, poolModeTone } from './poolConfig';
import { PumpManualModal } from './PumpManualModal';
import { poolReason } from './poolPlan';
import type { PoolReasonKey } from './poolPlan';
import { useIsGlas } from '../../app/glas/useUiStyle';
import { POOL_SEGMENT_MAX, PoolModeSegment } from '../glas/PoolModeSegment';

const REASON_KEYS: Record<PoolReasonKey, TKey> = {
  battery: 'pool.reason.battery', sun: 'pool.reason.sun', target: 'pool.reason.target',
  schedule: 'pool.reason.schedule', minRun: 'pool.reason.minRun',
};

function ModeIcon({ option }: { option: string }) {
  const tone = poolModeTone(option);
  const size = 16;
  const sw = 1.75;
  if (tone === 'off') return <PowerOff size={size} strokeWidth={sw} />;
  if (tone === 'auto') return <RefreshCw size={size} strokeWidth={sw} />;
  if (tone === 'manual') return <Hand size={size} strokeWidth={sw} />;
  return <CirclePause size={size} strokeWidth={sw} />;
}

export function PumpHeroCard() {
  const t = useT();
  const locale = useLocale();
  const pump = useEntity(POOL_ENTITIES.pump);
  const mode = useEntity(POOL_ENTITIES.mode);
  const runtime = useEntity(POOL_ENTITIES.runtimeToday);
  const reasonE = useEntity(POOL_ENTITIES.reason);
  const [manualOpen, setManualOpen] = useState(false);
  const glas = useIsGlas(); // Glas: the mode as a segment with a lens (plan docs/glas/PLAN-ETAPPE-5.md K92)

  const running = pump?.state === 'on';
  const options = (mode?.attributes['options'] as string[] | undefined) ?? [];
  const activeOption = mode?.state;
  // why Automatik runs the pump (HA's input_select.poolpumpe_grund) — only then, the other modes say it themselves
  const reason = running && activeOption != null && poolModeTone(activeOption) === 'auto' ? poolReason(reasonE?.state) : null;

  return (
    <Card className={`pool-hero${running ? ' pool-hero--running' : ''}`}>
      <div className="pool-hero__top">
        <span className="pool-hero__icon" aria-hidden="true">
          {running ? <Waves size={26} strokeWidth={1.75} /> : <Power size={26} strokeWidth={1.75} />}
        </span>
        <div className="pool-hero__headings">
          <span className="pool-hero__title">{t('pool.pump.title')}</span>
          <span className="pool-hero__status">
            {running ? t('pool.pump.running') : t('pool.pump.idle')}
          </span>
          {reason && (
            <span className="pool-hero__reason">
              {t('pool.reason.label', { reason: 'key' in reason ? t(REASON_KEYS[reason.key]) : reason.raw })}
            </span>
          )}
        </div>
        {runtime && !isNaN(parseFloat(runtime.state)) && (
          <div className="pool-hero__glance">
            <Clock size={15} strokeWidth={1.75} aria-hidden="true" />
            <span className="pool-hero__glance-value data-font">{formatEntityState(runtime, locale)}</span>
            <span className="pool-hero__glance-label">{t('pool.data.runtimeToday')}</span>
          </div>
        )}
      </div>

      {options.length > 0 && glas && options.length <= POOL_SEGMENT_MAX && (
        <PoolModeSegment options={options} value={activeOption} label={t('pool.mode.title')} onManual={() => setManualOpen(true)} />
      )}

      {options.length > 0 && !(glas && options.length <= POOL_SEGMENT_MAX) && (
        <div className="pool-mode" role="group" aria-label={t('pool.mode.title')}>
          {options.map((opt) => {
            const active = opt === activeOption;
            return (
              <button
                key={opt}
                type="button"
                className={`pool-mode__btn pool-mode__btn--${poolModeTone(opt)}${active ? ' pool-mode__btn--active' : ''}`}
                aria-pressed={active}
                onClick={() => {
                  // Manuell opens the duration popup; the other modes switch directly.
                  if (poolModeTone(opt) === 'manual') { setManualOpen(true); return; }
                  if (!active) void setPoolMode(POOL_ENTITIES.mode, opt);
                }}
              >
                <ModeIcon option={opt} />
                <span className="pool-mode__label">{opt}</span>
              </button>
            );
          })}
        </div>
      )}

      <PumpManualModal open={manualOpen} onClose={() => setManualOpen(false)} />
    </Card>
  );
}
