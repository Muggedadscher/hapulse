import React, { useCallback, useState } from 'react';
import { Scaling } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import {
  EnergyHeroCard,
  EnergySourcesCard,
  EnergyDevicesCard,
  EnergySolarCard,
  EnergyWaterCard,
  EnergyGasCard,
  EnergyNotConfigured,
} from '../components/energy/EnergyCards';
import { SortableGrid } from '../components/ui/SortableGrid';
import { SortableItem } from '../components/ui/SortableItem';
import { EditBadge } from '../components/ui/EditBadge';
import { HeightHandle, HeightDots, heightClass, getHeightLevel } from '../components/ui/SectionResize';
import { EditToggle } from '../components/ui/EditToggle';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { useT, type TKey } from '../i18n/useT';
import { useEnergy } from '../ha/useEnergy';
import { useConnectionStore } from '../stores/connectionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useUIStore } from '../stores/uiStore';
import { applyStoredOrder } from '../lib/order';
import type { EnergyDashboard, EnergyPeriod } from '@hapulse/core';
import './Page.css';
import './Energy.css';

// ── Column-span system (mirrors Home.tsx / Scenes.tsx) ───────────────────────

const MAX_COLS = 4;

const DEFAULT_SPANS: Record<string, number> = {
  hero:  2,
  usage: 2,
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

function SpanDots({ span }: { span: number }) {
  return (
    <div className="overview-span-dots" aria-hidden="true">
      {Array.from({ length: MAX_COLS }, (_, i) => (
        <span key={i} className={`overview-span-dot${i < span ? ' overview-span-dot--filled' : ''}`} />
      ))}
    </div>
  );
}

function ResizeHandle({
  id,
  span,
  onCommit,
}: {
  id: string;
  span: number;
  onCommit: (id: string, newSpan: number) => void;
}) {
  const t = useT();

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;
    btn.setPointerCapture(e.pointerId);

    const sectionEl = btn.closest('[data-section]') as HTMLElement | null;
    const gridEl    = btn.closest('.overview-grid') as HTMLElement | null;
    if (!sectionEl || !gridEl) return;

    const gridItem  = sectionEl.parentElement as HTMLElement;
    const colWidth  = gridEl.getBoundingClientRect().width / MAX_COLS;
    const startX    = e.clientX;
    const startSpan = span;
    let previewSpan = startSpan;

    function onMove(me: PointerEvent) {
      const delta = Math.round((me.clientX - startX) / colWidth);
      const next  = Math.max(1, Math.min(MAX_COLS, startSpan + delta));
      if (next !== previewSpan) {
        previewSpan = next;
        gridItem.style.gridColumn =
          next >= MAX_COLS ? '1 / -1' : next > 1 ? `span ${next}` : '';
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

// ── Section model ────────────────────────────────────────────────────────────

type ToggleKeys = { hide: TKey; show: TKey; hideMobile: TKey; showMobile: TKey };

const SECTION_TOGGLE_KEYS: Record<string, ToggleKeys> = {
  hero: {
    hide: 'energy.section.hide.hero',
    show: 'energy.section.show.hero',
    hideMobile: 'energy.section.hideMobile.hero',
    showMobile: 'energy.section.showMobile.hero',
  },
  usage: {
    hide: 'energy.section.hide.usage',
    show: 'energy.section.show.usage',
    hideMobile: 'energy.section.hideMobile.usage',
    showMobile: 'energy.section.showMobile.usage',
  },
  solar: {
    hide: 'energy.section.hide.solar',
    show: 'energy.section.show.solar',
    hideMobile: 'energy.section.hideMobile.solar',
    showMobile: 'energy.section.showMobile.solar',
  },
  devices: {
    hide: 'energy.section.hide.devices',
    show: 'energy.section.show.devices',
    hideMobile: 'energy.section.hideMobile.devices',
    showMobile: 'energy.section.showMobile.devices',
  },
  water: {
    hide: 'energy.section.hide.water',
    show: 'energy.section.show.water',
    hideMobile: 'energy.section.hideMobile.water',
    showMobile: 'energy.section.showMobile.water',
  },
  gas: {
    hide: 'energy.section.hide.gas',
    show: 'energy.section.show.gas',
    hideMobile: 'energy.section.hideMobile.gas',
    showMobile: 'energy.section.showMobile.gas',
  },
};

/** Which sections exist depends on what the user configured in HA. */
function availableSections(d: EnergyDashboard): string[] {
  const ids: string[] = ['hero'];
  if (d.hasGrid || d.hasSolar) ids.push('usage');
  if (d.hasSolar) ids.push('solar');
  if (d.devices.length > 0) ids.push('devices');
  if (d.hasWater) ids.push('water');
  if (d.hasGas) ids.push('gas');
  return ids;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Energy() {
  const t = useT();
  const [period, setPeriod] = useState<EnergyPeriod>('today');
  const { state, dashboard, currency } = useEnergy(period);
  const editMode = useUIStore((s) => s.editMode);
  const haUrl = useConnectionStore((s) => s.url);

  const energySectionOrder = useSettingsStore(useShallow((s) => s.customization.energySectionOrder));
  const hiddenEnergySections = useSettingsStore(useShallow((s) => s.customization.hiddenEnergySections));
  const mobileHiddenEnergySections = useSettingsStore(useShallow((s) => s.customization.mobileHiddenEnergySections));
  const energySectionSpans = useSettingsStore(useShallow((s) => s.customization.energySectionSpans));
  const energySectionHeights = useSettingsStore(useShallow((s) => s.customization.energySectionHeights));
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);

  const handleToggleHidden = useCallback(
    (id: string) => {
      const next = hiddenEnergySections.includes(id)
        ? hiddenEnergySections.filter((s) => s !== id)
        : [...hiddenEnergySections, id];
      updateCustomization({ hiddenEnergySections: next });
    },
    [hiddenEnergySections, updateCustomization]
  );

  const handleToggleMobileHidden = useCallback(
    (id: string) => {
      const next = mobileHiddenEnergySections.includes(id)
        ? mobileHiddenEnergySections.filter((s) => s !== id)
        : [...mobileHiddenEnergySections, id];
      updateCustomization({ mobileHiddenEnergySections: next });
    },
    [mobileHiddenEnergySections, updateCustomization]
  );

  const handleSpanChange = useCallback(
    (id: string, newSpan: number) => {
      updateCustomization({ energySectionSpans: { ...energySectionSpans, [id]: newSpan } });
    },
    [energySectionSpans, updateCustomization]
  );

  const handleHeightChange = useCallback(
    (id: string, newLevel: number) => {
      updateCustomization({ energySectionHeights: { ...energySectionHeights, [id]: newLevel } });
    },
    [energySectionHeights, updateCustomization]
  );

  const handleReorder = useCallback(
    (newOrder: string[]) => {
      updateCustomization({ energySectionOrder: newOrder });
    },
    [updateCustomization]
  );

  function renderWidget(id: string, d: EnergyDashboard) {
    switch (id) {
      case 'hero':
        return <EnergyHeroCard dashboard={d} period={period} onPeriodChange={setPeriod} currency={currency} />;
      case 'usage':
        return <EnergySourcesCard dashboard={d} />;
      case 'solar':
        return <EnergySolarCard dashboard={d} />;
      case 'devices':
        return <EnergyDevicesCard dashboard={d} />;
      case 'water':
        return <EnergyWaterCard dashboard={d} />;
      case 'gas':
        return <EnergyGasCard dashboard={d} />;
      default:
        return null;
    }
  }

  // ---- Loading / not-configured / error gates ----
  if (state === 'loading') {
    return (
      <div className="page energy-page stagger-rise">
        <div className="page__header-row energy-page__header">
          <h1 className="page__title">{t('energy.title')}</h1>
          <PageHeaderActions />
        </div>
        <p className="energy-page__loading">{t('energy.loading')}</p>
      </div>
    );
  }

  if (state === 'not-configured') {
    return (
      <div className="page energy-page stagger-rise">
        <div className="page__header-row energy-page__header">
          <h1 className="page__title">{t('energy.title')}</h1>
          <PageHeaderActions />
        </div>
        <EnergyNotConfigured haUrl={haUrl} />
      </div>
    );
  }

  if (state === 'error' || !dashboard) {
    return (
      <div className="page energy-page stagger-rise">
        <div className="page__header-row energy-page__header">
          <h1 className="page__title">{t('energy.title')}</h1>
          <PageHeaderActions />
        </div>
        <p className="energy-page__loading">{t('energy.error')}</p>
      </div>
    );
  }

  // ---- Ready ----
  const allSectionIds = availableSections(dashboard);
  const orderedIds = applyStoredOrder(allSectionIds, energySectionOrder)
    .filter((id) => allSectionIds.includes(id)); // drop stale ids for sources no longer configured
  const visibleIds = editMode
    ? orderedIds
    : orderedIds.filter((id) => !hiddenEnergySections.includes(id));

  return (
    <div className="page energy-page stagger-rise">
      <div className="page__header-row energy-page__header">
        <h1 className="page__title">{t('energy.title')}</h1>
        <PageHeaderActions><EditToggle /></PageHeaderActions>
      </div>

      <SortableGrid
        items={visibleIds}
        onReorder={handleReorder}
        editMode={editMode}
        className="overview-grid"
      >
        {visibleIds.map((id) => {
          const isHidden       = hiddenEnergySections.includes(id);
          const isMobileHidden = mobileHiddenEnergySections.includes(id);
          const currentSpan = getSpan(id, energySectionSpans);
          const sc          = spanClass(currentSpan);
          const currentHeight = getHeightLevel(id, energySectionHeights);
          const hc            = heightClass(currentHeight);
          const widget      = renderWidget(id, dashboard);

          if (!editMode) {
            const cellClass = [
              'overview-grid__cell',
              sc,
              hc,
              isHidden ? 'overview-grid__cell--hidden' : '',
              isMobileHidden ? 'section-mobile-hidden' : '',
            ].filter(Boolean).join(' ');
            return (
              <div key={id} className={cellClass} data-section={id}>
                {widget}
              </div>
            );
          }

          const cellClass = [
            'overview-grid__cell',
            'overview-grid__cell--editing',
            hc,
            isHidden ? 'overview-grid__cell--hidden' : '',
          ].filter(Boolean).join(' ');

          return (
            <SortableItem key={id} id={id} editMode={editMode} className={sc}>
              <div className={cellClass} data-section={id}>
                <div className="edit-section-outline">{widget}</div>
                <EditBadge
                  hidden={isHidden}
                  toggleLabel={isHidden ? t(SECTION_TOGGLE_KEYS[id]!.show) : t(SECTION_TOGGLE_KEYS[id]!.hide)}
                  onToggleHidden={() => handleToggleHidden(id)}
                  mobileHidden={isMobileHidden}
                  onToggleMobileHidden={() => handleToggleMobileHidden(id)}
                  mobileToggleLabel={
                    isMobileHidden ? t(SECTION_TOGGLE_KEYS[id]!.showMobile) : t(SECTION_TOGGLE_KEYS[id]!.hideMobile)
                  }
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
    </div>
  );
}
