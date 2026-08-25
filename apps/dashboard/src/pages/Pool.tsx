/**
 * [fork] Pool page — native, HAPulse-styled pool-pump control.
 *
 * Laid out as an editable section grid (like Home / Energy / System): in edit
 * mode the pencil lets you reorder, show/hide and resize each card. Sections:
 * pump hero, solar automation, manual timer, schedule, usage tiles, a power
 * history chart, and the admin controls (admins only). The whole page falls
 * back to a friendly empty state when the pool entities aren't present.
 */

import React, { useCallback } from 'react';
import { Waves, Scaling } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { EmptyState } from '../components/ui/EmptyState';
import { EditToggle } from '../components/ui/EditToggle';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { EditBadge } from '../components/ui/EditBadge';
import { SortableGrid } from '../components/ui/SortableGrid';
import { SortableItem } from '../components/ui/SortableItem';
import { HeightHandle, HeightDots, heightClass, getHeightLevel } from '../components/ui/SectionResize';
import { applyStoredOrder } from '../lib/order';
import { useEntityMap, useCanEdit } from '../ha/hooks';
import { useSettingsStore } from '../stores/settingsStore';
import { useUIStore } from '../stores/uiStore';
import { useT, type TKey } from '../i18n/useT';
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

// ---------------------------------------------------------------------------
// Section config
// ---------------------------------------------------------------------------

const SECTION_IDS = ['pool_hero', 'solar', 'manual', 'schedule', 'data', 'chart', 'admin'] as const;
type SectionId = typeof SECTION_IDS[number];

type ToggleKeys = { hide: TKey; show: TKey; hideMobile: TKey; showMobile: TKey };

const SECTION_TOGGLE_KEYS: Record<SectionId, ToggleKeys> = {
  pool_hero: { hide: 'pool.section.hide.poolHero', show: 'pool.section.show.poolHero', hideMobile: 'pool.section.hideMobile.poolHero', showMobile: 'pool.section.showMobile.poolHero' },
  solar:     { hide: 'pool.section.hide.solar',    show: 'pool.section.show.solar',    hideMobile: 'pool.section.hideMobile.solar',    showMobile: 'pool.section.showMobile.solar' },
  manual:    { hide: 'pool.section.hide.manual',   show: 'pool.section.show.manual',   hideMobile: 'pool.section.hideMobile.manual',   showMobile: 'pool.section.showMobile.manual' },
  schedule:  { hide: 'pool.section.hide.schedule', show: 'pool.section.show.schedule', hideMobile: 'pool.section.hideMobile.schedule', showMobile: 'pool.section.showMobile.schedule' },
  data:      { hide: 'pool.section.hide.data',     show: 'pool.section.show.data',     hideMobile: 'pool.section.hideMobile.data',     showMobile: 'pool.section.showMobile.data' },
  chart:     { hide: 'pool.section.hide.chart',    show: 'pool.section.show.chart',    hideMobile: 'pool.section.hideMobile.chart',    showMobile: 'pool.section.showMobile.chart' },
  admin:     { hide: 'pool.section.hide.admin',    show: 'pool.section.show.admin',    hideMobile: 'pool.section.hideMobile.admin',    showMobile: 'pool.section.showMobile.admin' },
};

const MAX_COLS = 4;

const DEFAULT_SPANS: Record<string, number> = {
  pool_hero: 4,
  solar: 2,
  manual: 2,
  schedule: 2,
  data: 2,
  chart: 2,
  admin: 2,
};

function getSpan(id: string, stored: Record<string, number>): number {
  return stored[id] ?? DEFAULT_SPANS[id] ?? 1;
}

function spanClass(span: number): string {
  if (span >= 4) return 'overview-grid__cell--span-4';
  if (span === 3) return 'overview-grid__cell--span-3';
  if (span === 2) return 'overview-grid__cell--span-2';
  return '';
}

// Span dots + resize handle — same pattern as System / Security / Scenes.
function SpanDots({ span }: { span: number }) {
  return (
    <div className="overview-span-dots" aria-hidden="true">
      {Array.from({ length: MAX_COLS }, (_, i) => (
        <span key={i} className={`overview-span-dot${i < span ? ' overview-span-dot--filled' : ''}`} />
      ))}
    </div>
  );
}

function ResizeHandle({ id, span, onCommit }: { id: string; span: number; onCommit: (id: string, newSpan: number) => void }) {
  const t = useT();
  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget;
    btn.setPointerCapture(e.pointerId);
    const sectionEl = btn.closest('[data-section]') as HTMLElement | null;
    const gridEl = btn.closest('.overview-grid') as HTMLElement | null;
    if (!sectionEl || !gridEl) return;
    const gridItem = sectionEl.parentElement as HTMLElement;
    const colWidth = gridEl.getBoundingClientRect().width / MAX_COLS;
    const startX = e.clientX;
    const startSpan = span;
    let previewSpan = startSpan;
    function onMove(me: PointerEvent) {
      const delta = Math.round((me.clientX - startX) / colWidth);
      const next = Math.max(1, Math.min(MAX_COLS, startSpan + delta));
      if (next !== previewSpan) {
        previewSpan = next;
        gridItem.style.gridColumn = next >= MAX_COLS ? '1 / -1' : next > 1 ? `span ${next}` : '';
      }
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      gridItem.style.gridColumn = '';
      onCommit(id, previewSpan);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }
  return (
    <button
      type="button"
      className="overview-resize-handle"
      onPointerDown={handlePointerDown}
      aria-label={t('columnResize.ariaLabel', { span, max: MAX_COLS })}
      title={t('columnResize.title', { span, max: MAX_COLS })}
    >
      <Scaling size={12} strokeWidth={2.5} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function Pool() {
  const t = useT();
  const entities = useEntityMap();
  const canEdit = useCanEdit();

  const poolSectionOrder = useSettingsStore(useShallow((s) => s.customization.poolSectionOrder));
  const hiddenPoolSections = useSettingsStore(useShallow((s) => s.customization.hiddenPoolSections));
  const mobileHiddenPoolSections = useSettingsStore(useShallow((s) => s.customization.mobileHiddenPoolSections));
  const poolSectionSpans = useSettingsStore(useShallow((s) => s.customization.poolSectionSpans));
  const poolSectionHeights = useSettingsStore(useShallow((s) => s.customization.poolSectionHeights));
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);
  const editMode = useUIStore((s) => s.editMode);

  const present = POOL_REQUIRED_ENTITIES.every((id) => entities[id] != null);

  const sectionExists: Record<SectionId, boolean> = {
    pool_hero: true,
    solar: true,
    manual: true,
    schedule: true,
    data: true,
    chart: entities[POOL_ENTITIES.power] != null,
    admin: canEdit,
  };

  const allSectionIds = SECTION_IDS.filter((id) => sectionExists[id]) as SectionId[];
  const orderedIds = applyStoredOrder(allSectionIds, poolSectionOrder) as SectionId[];
  const visibleIds = (
    editMode ? orderedIds : orderedIds.filter((id) => !hiddenPoolSections.includes(id))
  ) as SectionId[];

  const handleToggleHidden = useCallback((id: string) => {
    const next = hiddenPoolSections.includes(id) ? hiddenPoolSections.filter((s) => s !== id) : [...hiddenPoolSections, id];
    updateCustomization({ hiddenPoolSections: next });
  }, [hiddenPoolSections, updateCustomization]);

  const handleToggleMobileHidden = useCallback((id: string) => {
    const next = mobileHiddenPoolSections.includes(id) ? mobileHiddenPoolSections.filter((s) => s !== id) : [...mobileHiddenPoolSections, id];
    updateCustomization({ mobileHiddenPoolSections: next });
  }, [mobileHiddenPoolSections, updateCustomization]);

  const handleSpanChange = useCallback((id: string, newSpan: number) => {
    updateCustomization({ poolSectionSpans: { ...poolSectionSpans, [id]: newSpan } });
  }, [poolSectionSpans, updateCustomization]);

  const handleHeightChange = useCallback((id: string, newLevel: number) => {
    updateCustomization({ poolSectionHeights: { ...poolSectionHeights, [id]: newLevel } });
  }, [poolSectionHeights, updateCustomization]);

  const handleReorder = useCallback((newOrder: string[]) => {
    updateCustomization({ poolSectionOrder: newOrder });
  }, [updateCustomization]);

  function renderWidget(id: SectionId): React.ReactNode {
    switch (id) {
      case 'pool_hero': return <PumpHeroCard />;
      case 'solar':     return <SolarCard />;
      case 'manual':    return <ManualTimerCard />;
      case 'schedule':  return <ScheduleCard />;
      case 'data':      return <PoolDataCard />;
      case 'chart':     return <PoolChartCard />;
      case 'admin':     return <PoolAdminCard />;
    }
  }

  return (
    <div className="page pool-page stagger-rise">
      <div className="page__header-row">
        <h1 className="page__title">{t('pool.title')}</h1>
        <PageHeaderActions>{present && <EditToggle />}</PageHeaderActions>
      </div>

      {!present ? (
        <EmptyState
          icon={<Waves size={28} strokeWidth={1.75} />}
          title={t('pool.notConfigured.title')}
          description={t('pool.notConfigured.desc')}
        />
      ) : (
        <SortableGrid items={visibleIds} onReorder={handleReorder} editMode={editMode} className="overview-grid">
          {visibleIds.map((id) => {
            const isHidden = hiddenPoolSections.includes(id);
            const isMobileHidden = mobileHiddenPoolSections.includes(id);
            const currentSpan = getSpan(id, poolSectionSpans);
            const sc = spanClass(currentSpan);
            const currentHeight = getHeightLevel(id, poolSectionHeights);
            const hc = heightClass(currentHeight);
            const widget = renderWidget(id);
            if (!widget) return null;

            if (!editMode) {
              return (
                <div
                  key={id}
                  className={['overview-grid__cell', sc, hc, isMobileHidden ? 'section-mobile-hidden' : ''].filter(Boolean).join(' ')}
                  data-section={id}
                >
                  {widget}
                </div>
              );
            }

            return (
              <SortableItem key={id} id={id} editMode={editMode} className={sc}>
                <div
                  className={['overview-grid__cell', 'overview-grid__cell--editing', hc, isHidden ? 'overview-grid__cell--hidden' : ''].filter(Boolean).join(' ')}
                  data-section={id}
                >
                  <div className="edit-section-outline">{widget}</div>
                  <EditBadge
                    hidden={isHidden}
                    toggleLabel={isHidden ? t(SECTION_TOGGLE_KEYS[id].show) : t(SECTION_TOGGLE_KEYS[id].hide)}
                    onToggleHidden={() => handleToggleHidden(id)}
                    mobileHidden={isMobileHidden}
                    onToggleMobileHidden={() => handleToggleMobileHidden(id)}
                    mobileToggleLabel={isMobileHidden ? t(SECTION_TOGGLE_KEYS[id].showMobile) : t(SECTION_TOGGLE_KEYS[id].hideMobile)}
                  />
                  <SpanDots span={currentSpan} />
                  <ResizeHandle id={id} span={currentSpan} onCommit={handleSpanChange} />
                  <HeightDots level={currentHeight} />
                  <HeightHandle id={id} level={currentHeight} onCommit={handleHeightChange} />
                </div>
              </SortableItem>
            );
          })}
        </SortableGrid>
      )}
    </div>
  );
}
