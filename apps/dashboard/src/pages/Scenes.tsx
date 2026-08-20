import React, { useCallback, useMemo } from 'react';
import { Scaling } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { SceneHeroCard } from '../components/scenes/SceneHeroCard';
import { SceneActivityFeed } from '../components/scenes/SceneActivityFeed';
import { SceneRoomCard } from '../components/scenes/SceneRoomCard';
import { SortableGrid } from '../components/ui/SortableGrid';
import { SortableItem } from '../components/ui/SortableItem';
import { EditBadge } from '../components/ui/EditBadge';
import { HeightHandle, HeightDots, heightClass, getHeightLevel } from '../components/ui/SectionResize';
import { EditToggle } from '../components/ui/EditToggle';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { useT } from '../i18n/useT';
import { useEntitiesByDomain } from '../ha/hooks';
import { useEntityStore } from '../stores/entityStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useUIStore } from '../stores/uiStore';
import { applyStoredOrder } from '../lib/order';
import { roomIconName } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import './Page.css';
import './Scenes.css';

// ── Room area helpers ─────────────────────────────────────────────────────────

function areaIdToSectionId(areaId: string): string {
  return `room_${areaId}`;
}

function sectionIdToAreaId(sectionId: string): string {
  return sectionId.slice('room_'.length);
}

// ── Column-span system (mirrors Home.tsx / Automations.tsx) ──────────────────

const MAX_COLS = 4;

const DEFAULT_SPANS: Record<string, number> = {
  hero:     2,
  activity: 2,
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

// ── Span dots ─────────────────────────────────────────────────────────────────

function SpanDots({ span }: { span: number }) {
  return (
    <div className="overview-span-dots" aria-hidden="true">
      {Array.from({ length: MAX_COLS }, (_, i) => (
        <span
          key={i}
          className={`overview-span-dot${i < span ? ' overview-span-dot--filled' : ''}`}
        />
      ))}
    </div>
  );
}

// ── Resize handle ─────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export function Scenes() {
  const t = useT();
  const scenes      = useEntitiesByDomain('scene');
  const editMode    = useUIStore((s) => s.editMode);
  const registries  = useEntityStore((s) => s.registries);

  const sceneSectionOrder = useSettingsStore(
    useShallow((s) => s.customization.sceneSectionOrder)
  );
  const hiddenSceneSections = useSettingsStore(
    useShallow((s) => s.customization.hiddenSceneSections)
  );
  const mobileHiddenSceneSections = useSettingsStore(
    useShallow((s) => s.customization.mobileHiddenSceneSections)
  );
  const sceneSectionSpans = useSettingsStore(
    useShallow((s) => s.customization.sceneSectionSpans)
  );
  const sceneSectionHeights = useSettingsStore(
    useShallow((s) => s.customization.sceneSectionHeights)
  );
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);

  // Build area map and entity→area map from registries
  const { areaMap, entityAreaMap } = useMemo(() => {
    const am: Record<string, { name: string; icon: string; haIcon: string | null }> = {};
    for (const area of registries?.areas ?? []) {
      am[area.area_id] = {
        name: area.name,
        // Resolved lucide name (fallback) + the raw HA icon (for MDI rendering)
        icon: roomIconName({ name: area.name, ...(area.icon != null && { icon: area.icon }) }),
        haIcon: area.icon ?? null,
      };
    }
    const em: Record<string, string | null> = {};
    for (const entry of registries?.entities ?? []) {
      em[entry.entity_id] = entry.area_id;
    }
    return { areaMap: am, entityAreaMap: em };
  }, [registries]);

  function getSceneAreaId(entity: HassEntity): string {
    return entityAreaMap[entity.entity_id] ?? 'general';
  }

  // Unique area IDs with scenes — named rooms first (alphabetical), general last
  const areaIds = useMemo(() => {
    const ids = [...new Set(scenes.map(getSceneAreaId))];
    return ids.sort((a, b) => {
      if (a === 'general') return 1;
      if (b === 'general') return -1;
      return (areaMap[a]?.name ?? a).localeCompare(areaMap[b]?.name ?? b);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, areaMap]);

  const roomSectionIds = areaIds.map(areaIdToSectionId);
  const allSectionIds  = ['hero', 'activity', ...roomSectionIds];
  const orderedIds     = applyStoredOrder(allSectionIds, sceneSectionOrder);
  const visibleIds     = editMode
    ? orderedIds
    : orderedIds.filter((id) => !hiddenSceneSections.includes(id));

  function handleToggleHidden(id: string) {
    const next = hiddenSceneSections.includes(id)
      ? hiddenSceneSections.filter((s) => s !== id)
      : [...hiddenSceneSections, id];
    updateCustomization({ hiddenSceneSections: next });
  }

  function handleToggleMobileHidden(id: string) {
    const next = mobileHiddenSceneSections.includes(id)
      ? mobileHiddenSceneSections.filter((s) => s !== id)
      : [...mobileHiddenSceneSections, id];
    updateCustomization({ mobileHiddenSceneSections: next });
  }

  const handleSpanChange = useCallback(
    (id: string, newSpan: number) => {
      updateCustomization({
        sceneSectionSpans: { ...sceneSectionSpans, [id]: newSpan },
      });
    },
    [sceneSectionSpans, updateCustomization]
  );

  const handleHeightChange = useCallback(
    (id: string, newLevel: number) => {
      updateCustomization({
        sceneSectionHeights: { ...sceneSectionHeights, [id]: newLevel },
      });
    },
    [sceneSectionHeights, updateCustomization]
  );

  const handleReorder = useCallback(
    (newOrder: string[]) => {
      updateCustomization({ sceneSectionOrder: newOrder });
    },
    [updateCustomization]
  );

  function getToggleLabels(id: string) {
    if (id === 'hero') {
      return {
        hide: t('scenes.section.hide.hero'),
        show: t('scenes.section.show.hero'),
        hideMobile: t('scenes.section.hideMobile.hero'),
        showMobile: t('scenes.section.showMobile.hero'),
      };
    }
    if (id === 'activity') {
      return {
        hide: t('scenes.section.hide.activity'),
        show: t('scenes.section.show.activity'),
        hideMobile: t('scenes.section.hideMobile.activity'),
        showMobile: t('scenes.section.showMobile.activity'),
      };
    }
    const areaId = sectionIdToAreaId(id);
    const label = areaId === 'general' ? t('scenes.section.generalLabel') : (areaMap[areaId]?.name ?? areaId);
    return {
      hide: t('scenes.section.hideRoom', { label }),
      show: t('scenes.section.showRoom', { label }),
      hideMobile: t('scenes.section.hideMobileRoom', { label }),
      showMobile: t('scenes.section.showMobileRoom', { label }),
    };
  }

  const namedRoomCount = areaIds.filter((a) => a !== 'general').length;

  function renderWidget(id: string) {
    if (id === 'hero') {
      return <SceneHeroCard scenes={scenes} roomCount={namedRoomCount} />;
    }
    if (id === 'activity') {
      return (
        <SceneActivityFeed
          scenes={scenes}
          areaMap={areaMap}
          entityAreaMap={entityAreaMap}
        />
      );
    }
    const areaId   = sectionIdToAreaId(id);
    const roomName = areaId === 'general' ? t('scenes.section.generalLabel') : (areaMap[areaId]?.name ?? areaId);
    const roomIcon = areaId === 'general' ? 'house' : (areaMap[areaId]?.icon ?? 'house');
    const roomHaIcon = areaId === 'general' ? null : (areaMap[areaId]?.haIcon ?? null);
    const roomScenes = scenes.filter((e) => getSceneAreaId(e) === areaId);
    return (
      <SceneRoomCard
        roomName={roomName}
        roomIcon={roomIcon}
        roomHaIcon={roomHaIcon}
        scenes={roomScenes}
      />
    );
  }

  return (
    <div className="page scenes-page stagger-rise">
      <div className="page__header-row scenes-page__header">
        <h1 className="page__title">{t('scenes.title')}</h1>
        <PageHeaderActions><EditToggle /></PageHeaderActions>
      </div>

      <SortableGrid
        items={visibleIds}
        onReorder={handleReorder}
        editMode={editMode}
        className="overview-grid"
      >
        {visibleIds.map((id) => {
          const isHidden       = hiddenSceneSections.includes(id);
          const isMobileHidden = mobileHiddenSceneSections.includes(id);
          const currentSpan = getSpan(id, sceneSectionSpans);
          const sc          = spanClass(currentSpan);
          const currentHeight = getHeightLevel(id, sceneSectionHeights);
          const hc            = heightClass(currentHeight);
          const widget      = renderWidget(id);

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
                  toggleLabel={isHidden ? getToggleLabels(id).show : getToggleLabels(id).hide}
                  onToggleHidden={() => handleToggleHidden(id)}
                  mobileHidden={isMobileHidden}
                  onToggleMobileHidden={() => handleToggleMobileHidden(id)}
                  mobileToggleLabel={
                    isMobileHidden ? getToggleLabels(id).showMobile : getToggleLabels(id).hideMobile
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
