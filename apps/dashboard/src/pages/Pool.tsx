/**
 * [fork] Pool page — native, HAPulse-styled pool-pump control.
 *
 * A fixed layout: a full-width pump status hero, then a grid of cards that flow
 * and wrap at their natural height (daily filter time with sun & battery and the schedule in its details window,
 * manual timer, usage tiles, a runtime-per-day chart, and admin controls for HA admins).
 * Falls back to a friendly empty state when the pool entities aren't present.
 */

import React from 'react';
import { Waves } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { useCanEdit } from '../ha/hooks';
import { useShallow } from 'zustand/react/shallow';
import { useEntityStore } from '../stores/entityStore';
import { useT } from '../i18n/useT';
import { PumpHeroCard } from '../components/pool/PumpHeroCard';
import { PoolTargetCard } from '../components/pool/PoolTargetCard';
import { PoolBatteryCard } from '../components/pool/PoolBatteryCard';
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
  const canEdit = useCanEdit();

  // only the two presence checks — not the whole entity map (every state change re-rendered the page)
  const { present, hasRuntime } = useEntityStore(
    useShallow((s) => ({
      present: POOL_REQUIRED_ENTITIES.every((id) => s.entities[id] != null),
      hasRuntime: s.entities[POOL_ENTITIES.runtimeToday] != null,
    })),
  );

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
          {/* With the daily filter time only it needs setting day to day; sun & battery and the schedule are start values
              that rarely change (Jannick 23./24.11.2026: "alles etwas überfordernd", "eher als Details von der Karte
              Filterzeit") — they open as the filter time card's details window (PoolTargetCard). The older solar card
              and the layout without the filter time were removed on 24.11.2026 (the battery is always there). */}
          <div className="pool-grid">
            <PoolTargetCard details={<><PoolBatteryCard /><ScheduleCard /></>} />
            <ManualTimerCard />
            <PoolDataCard />
            {hasRuntime && <PoolChartCard />}
            {canEdit && <PoolAdminCard />}
          </div>
        </div>
      )}
    </div>
  );
}
