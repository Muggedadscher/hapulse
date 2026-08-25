/**
 * [fork] PoolModal — the pool summary chip's detail modal.
 *
 * A compact glance: pump state, the mode switch, and solar / runtime / manual
 * timer figures, with a footer link through to the full Pool page. Mirrors the
 * other chip modals (e.g. MediaModal) in structure and its "open page" footer.
 */

import React, { useCallback } from 'react';
import { Waves, ArrowRight, Sun, Clock, Timer } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Modal } from '../../ui/Modal';
import { formatEntityState } from '@hapulse/core';
import { useEntity } from '../../../ha/hooks';
import { useLocale, useT } from '../../../i18n/useT';
import { setPoolMode } from '../../../ha/pool';
import { POOL_ENTITIES, poolModeTone } from '../../pool/poolConfig';
import { usePoolTimer, formatCountdown } from '../../pool/usePoolTimer';
import './PoolModal.css';

interface PoolModalProps {
  open: boolean;
  onClose: () => void;
}

export function PoolModal({ open, onClose }: PoolModalProps) {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();

  const pump = useEntity(POOL_ENTITIES.pump);
  const mode = useEntity(POOL_ENTITIES.mode);
  const runtime = useEntity(POOL_ENTITIES.runtimeToday);
  const solarPower = useEntity(POOL_ENTITIES.solarPower);
  const threshold = useEntity(POOL_ENTITIES.solarThreshold);
  const exceeded = useEntity(POOL_ENTITIES.solarExceeded);
  const timerEntity = useEntity(POOL_ENTITIES.manualTimer);
  const timer = usePoolTimer(timerEntity);

  const running = pump?.state === 'on';
  const options = (mode?.attributes['options'] as string[] | undefined) ?? [];
  const activeOption = mode?.state;
  const isExceeded = exceeded?.state === 'on';

  const handleOpenPool = useCallback(() => {
    onClose();
    void navigate('/pool');
  }, [onClose, navigate]);

  const footer = (
    <button className="pool-modal__footer-link" onClick={handleOpenPool} type="button">
      {t('home.chipmodals.pool.footerLink')}
      <ArrowRight size={14} strokeWidth={2} />
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('pool.title')}
      icon={<Waves size={20} strokeWidth={1.75} />}
      footer={footer}
    >
      <div className="pool-modal">
        <div className={`pool-modal__status${running ? ' pool-modal__status--running' : ''}`}>
          <span className="pool-modal__status-icon" aria-hidden="true">
            <Waves size={22} strokeWidth={1.75} />
          </span>
          <div className="pool-modal__status-text">
            <span className="pool-modal__status-label">{t('pool.pump.title')}</span>
            <span className="pool-modal__status-value">
              {running ? t('pool.pump.running') : t('pool.pump.idle')}
            </span>
          </div>
        </div>

        {options.length > 0 && (
          <div className="pool-modal__mode" role="group" aria-label={t('pool.mode.title')}>
            {options.map((opt) => {
              const isActive = opt === activeOption;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`pool-modal__mode-btn pool-modal__mode-btn--${poolModeTone(opt)}${isActive ? ' pool-modal__mode-btn--active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => { if (!isActive) void setPoolMode(POOL_ENTITIES.mode, opt); }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        <div className="pool-modal__glances">
          {solarPower && (
            <div className="pool-modal__glance">
              <span className="pool-modal__glance-icon" aria-hidden="true"><Sun size={15} strokeWidth={1.75} /></span>
              <span className="pool-modal__glance-label">{t('pool.solar.current')}</span>
              <span className={`pool-modal__glance-value${isExceeded ? ' pool-modal__glance-value--positive' : ''}`}>
                {formatEntityState(solarPower, locale)}
                {threshold ? ` / ${Math.round(parseFloat(threshold.state))} ${(threshold.attributes['unit_of_measurement'] as string | undefined) ?? 'W'}` : ''}
              </span>
            </div>
          )}
          {runtime && !isNaN(parseFloat(runtime.state)) && (
            <div className="pool-modal__glance">
              <span className="pool-modal__glance-icon" aria-hidden="true"><Clock size={15} strokeWidth={1.75} /></span>
              <span className="pool-modal__glance-label">{t('pool.data.runtimeToday')}</span>
              <span className="pool-modal__glance-value">{formatEntityState(runtime, locale)}</span>
            </div>
          )}
          {timer.state !== 'idle' && (
            <div className="pool-modal__glance">
              <span className="pool-modal__glance-icon" aria-hidden="true"><Timer size={15} strokeWidth={1.75} /></span>
              <span className="pool-modal__glance-label">{t('pool.manual.remaining')}</span>
              <span className="pool-modal__glance-value data-font">{formatCountdown(timer.remainingSec)}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
