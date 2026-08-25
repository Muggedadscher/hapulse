/**
 * [fork] PoolSummaryCard — compact pool glance on the Home overview.
 *
 * Shows the pump's current state, mode and today's runtime, and links through
 * to the full Pool page. Renders nothing when the pool entities are absent, so
 * it's invisible on installs without a pool (and in demo mode).
 */

import React from 'react';
import { NavLink } from 'react-router';
import { Waves, ChevronRight } from 'lucide-react';
import { formatEntityState } from '@hapulse/core';
import { useEntity, useEntities } from '../../ha/hooks';
import { useLocale, useT } from '../../i18n/useT';
import { POOL_ENTITIES, POOL_REQUIRED_ENTITIES } from '../pool/poolConfig';
import './PoolSummaryCard.css';

export function PoolSummaryCard() {
  const t = useT();
  const locale = useLocale();
  const present = useEntities(POOL_REQUIRED_ENTITIES).every(Boolean);
  const pump = useEntity(POOL_ENTITIES.pump);
  const mode = useEntity(POOL_ENTITIES.mode);
  const runtime = useEntity(POOL_ENTITIES.runtimeToday);

  if (!present) return null;

  const running = pump?.state === 'on';

  return (
    <NavLink to="/pool" className={`card pool-summary${running ? ' pool-summary--running' : ''}`} aria-label={t('pool.summary.viewAll')}>
      <span className="pool-summary__icon" aria-hidden="true">
        <Waves size={20} strokeWidth={1.75} />
      </span>
      <div className="pool-summary__text">
        <span className="pool-summary__title">{t('pool.title')}</span>
        <span className="pool-summary__sub">
          {running ? t('pool.pump.running') : t('pool.pump.idle')}
          {mode?.state ? ` · ${mode.state}` : ''}
        </span>
      </div>
      {runtime && !isNaN(parseFloat(runtime.state)) && (
        <span className="pool-summary__runtime data-font">{formatEntityState(runtime, locale)}</span>
      )}
      <ChevronRight size={18} strokeWidth={1.75} className="pool-summary__chevron" aria-hidden="true" />
    </NavLink>
  );
}
