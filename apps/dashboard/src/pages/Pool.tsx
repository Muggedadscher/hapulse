/**
 * [fork] Pool page — native, HAPulse-styled pool-pump control.
 *
 * A fixed layout: a full-width pump status hero, then a grid of cards that flow
 * and wrap at their natural height (daily filter time, sun & battery — or the solar automation on older HA setups —
 * manual timer, schedule,
 * usage tiles, a runtime-per-day chart, and admin controls for HA admins).
 * Falls back to a friendly empty state when the pool entities aren't present.
 */

import React, { useState } from 'react';
import { Waves, ChevronDown } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { useCanEdit } from '../ha/hooks';
import { useShallow } from 'zustand/react/shallow';
import { useEntityStore } from '../stores/entityStore';
import { useT } from '../i18n/useT';
import { PumpHeroCard } from '../components/pool/PumpHeroCard';
import { SolarCard } from '../components/pool/SolarCard';
import { PoolTargetCard } from '../components/pool/PoolTargetCard';
import { PoolBatteryCard } from '../components/pool/PoolBatteryCard';
import { ManualTimerCard } from '../components/pool/ManualTimerCard';
import { ScheduleCard } from '../components/pool/ScheduleCard';
import { PoolDataCard } from '../components/pool/PoolDataCard';
import { PoolChartCard } from '../components/pool/PoolChartCard';
import { PoolAdminCard } from '../components/pool/PoolAdminCard';
import { POOL_BATTERY_ENTITIES, POOL_ENTITIES, POOL_REQUIRED_ENTITIES, POOL_TARGET_ENTITIES } from '../components/pool/poolConfig';
import './Page.css';
import './Pool.css';

/** Whether "Erweitert" (sun & battery, schedule) is open — per device, a convenience only. */
const ADVANCED_KEY = 'hapulse:pool-advanced';
function readAdvanced(): boolean {
  try { return localStorage.getItem(ADVANCED_KEY) === '1'; } catch { return false; }
}
function writeAdvanced(open: boolean): void {
  try { localStorage.setItem(ADVANCED_KEY, open ? '1' : '0'); } catch { /* private mode: stays for this visit */ }
}

export function Pool() {
  const t = useT();
  const canEdit = useCanEdit();
  const [advanced, setAdvanced] = useState(readAdvanced);
  const toggleAdvanced = () => setAdvanced((v) => { writeAdvanced(!v); return !v; });

  // only the two presence checks — not the whole entity map (every state change re-rendered the page)
  const { present, hasRuntime, hasTarget, hasBattery } = useEntityStore(
    useShallow((s) => ({
      present: POOL_REQUIRED_ENTITIES.every((id) => s.entities[id] != null),
      hasRuntime: s.entities[POOL_ENTITIES.runtimeToday] != null,
      // the daily filter time and the battery surplus (HA helpers since 23.11.2026); without them the old solar card
      hasTarget: POOL_TARGET_ENTITIES.every((id) => s.entities[id] != null),
      hasBattery: POOL_BATTERY_ENTITIES.every((id) => s.entities[id] != null),
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
          {hasTarget ? (
            // With the daily filter time only it needs setting day to day; sun & battery and the schedule are start values
            // that rarely change (Jannick 23.11.2026: "alles etwas überfordernd") — folded away under "Erweitert".
            <>
              <div className="pool-grid">
                <PoolTargetCard />
                <ManualTimerCard />
                <PoolDataCard />
                {hasRuntime && <PoolChartCard />}
                {canEdit && <PoolAdminCard />}
              </div>
              <button type="button" className="pool-more" aria-expanded={advanced} aria-controls="pool-advanced" onClick={toggleAdvanced}>
                <span className="pool-more__text">
                  <span className="pool-more__title">{t('pool.more.title')}</span>
                  <span className="pool-more__desc">{t('pool.more.desc')}</span>
                </span>
                <ChevronDown className="pool-more__chevron" size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
              {advanced && (
                <div className="pool-grid" id="pool-advanced">
                  {hasBattery ? <PoolBatteryCard /> : <SolarCard />}
                  <ScheduleCard />
                </div>
              )}
            </>
          ) : (
            <div className="pool-grid">
              {hasBattery ? <PoolBatteryCard /> : <SolarCard />}
              <ManualTimerCard />
              <ScheduleCard />
              <PoolDataCard />
              {hasRuntime && <PoolChartCard />}
              {canEdit && <PoolAdminCard />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
