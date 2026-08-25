/**
 * [fork] Pool page — native, HAPulse-styled pool-pump control.
 *
 * A fixed layout: a full-width pump status hero, then a grid of cards that flow
 * and wrap at their natural height (solar automation, manual timer, schedule,
 * usage tiles, a runtime-per-day chart, and admin controls for HA admins).
 * Falls back to a friendly empty state when the pool entities aren't present.
 */

import React from 'react';
import { Waves } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { useEntityMap, useCanEdit } from '../ha/hooks';
import { useT } from '../i18n/useT';
import { PumpHeroCard } from '../components/pool/PumpHeroCard';
import { SolarCard } from '../components/pool/SolarCard';
import { ManualTimerCard } from '../components/pool/ManualTimerCard';
import { ScheduleCard } from '../components/pool/ScheduleCard';
import { PoolDataCard } from '../components/pool/PoolDataCard';
import { PoolChartCard } from '../components/pool/PoolChartCard';
import { PoolAdminCard } from '../components/pool/PoolAdminCard';
import { POOL_ENTITIES, POOL_REQUIRED_ENTITIES } from '../components/pool/poolConfig';
import './Page.css';
import './Pool.css';

export function Pool() {
  const t = useT();
  const entities = useEntityMap();
  const canEdit = useCanEdit();

  const present = POOL_REQUIRED_ENTITIES.every((id) => entities[id] != null);
  const hasRuntime = entities[POOL_ENTITIES.runtimeToday] != null;

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
            {hasRuntime && <PoolChartCard />}
            {canEdit && <PoolAdminCard />}
          </div>
        </div>
      )}
    </div>
  );
}
