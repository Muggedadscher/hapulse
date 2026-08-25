/**
 * [fork] Pool page — a native, HAPulse-styled control surface for the pool
 * pump, replacing the hand-built Lovelace `dashboard-pool`.
 *
 * Layout: a status hero with the mode switch, then a responsive grid of the
 * solar automation, the manual-run countdown, the schedule (with a full
 * in-app editor), and runtime/energy figures. The raw admin controls show only
 * to Home Assistant admins.
 *
 * The whole page self-hides behind a friendly empty state when the expected
 * pool entities aren't present (e.g. demo mode or an install without a pool),
 * so it never renders broken.
 */

import React from 'react';
import { Waves } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { useEntities, useCanEdit } from '../ha/hooks';
import { useT } from '../i18n/useT';
import { PumpHeroCard } from '../components/pool/PumpHeroCard';
import { SolarCard } from '../components/pool/SolarCard';
import { ManualTimerCard } from '../components/pool/ManualTimerCard';
import { ScheduleCard } from '../components/pool/ScheduleCard';
import { PoolDataCard } from '../components/pool/PoolDataCard';
import { PoolAdminCard } from '../components/pool/PoolAdminCard';
import { POOL_REQUIRED_ENTITIES } from '../components/pool/poolConfig';
import './Page.css';
import './Pool.css';

export function Pool() {
  const t = useT();
  const present = useEntities(POOL_REQUIRED_ENTITIES).every(Boolean);
  const canEdit = useCanEdit();

  return (
    <div className="page pool-page stagger-rise">
      <div className="page__header-row">
        <h1 className="page__title">{t('pool.title')}</h1>
        <PageHeaderActions />
      </div>

      {!present ? (
        <EmptyState
          icon={<Waves size={28} strokeWidth={1.75} />}
          title={t('pool.notConfigured.title')}
          description={t('pool.notConfigured.desc')}
        />
      ) : (
        <div className="pool-layout">
          <PumpHeroCard />
          <div className="pool-grid">
            <SolarCard />
            <ManualTimerCard />
            <ScheduleCard />
            <PoolDataCard />
            {canEdit && <PoolAdminCard />}
          </div>
        </div>
      )}
    </div>
  );
}
