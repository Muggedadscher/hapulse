import React, { useCallback, useState } from 'react';
import { Scaling } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { GreetingBlock } from '../components/home/GreetingBlock';
import { ScenesCard } from '../components/home/ScenesCard';
import { HeroRoomCard } from '../components/home/HeroRoomCard';
import { EnergyWidget } from '../components/home/EnergyWidget';
import { DevicesCard } from '../components/home/DevicesCard';
import { ClimateCard } from '../components/home/ClimateCard';
import { BlindsCard } from '../components/home/BlindsCard';
import { SecurityCard } from '../components/home/SecurityCard';
import { PoolSummaryCard } from '../components/home/PoolSummaryCard'; // [fork]
import { POOL_REQUIRED_ENTITIES } from '../components/pool/poolConfig'; // [fork]
import { ActivityCard } from '../components/home/ActivityCard';
import { RoomsQuickAccess } from '../components/home/RoomsQuickAccess';
import { SummaryChipsBar } from '../components/home/SummaryChipsBar';
import { ClimateAllModal, BlindsAllModal } from '../components/home/chipmodals';
import { SortableGrid } from '../components/ui/SortableGrid';
import { SortableItem } from '../components/ui/SortableItem';
import { EditBadge } from '../components/ui/EditBadge';
import { HeightHandle, HeightDots, heightClass, getHeightLevel } from '../components/ui/SectionResize';
import { EditToggle } from '../components/ui/EditToggle';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { useT, type TKey } from '../i18n/useT';
import {
  useRooms,
  useEntityMap,
  useDisplayName,
} from '../ha/hooks';
import { useSettingsStore } from '../stores/settingsStore';
import { useUIStore } from '../stores/uiStore';
import { applyStoredOrder } from '../lib/order';
import './Page.css';
import './Home.css';

// ── Card column-span system ───────────────────────────────────────────────────

const MAX_COLS = 4;

/** Sections that default to more than 1 column when no stored span exists. */
const DEFAULT_SPANS: Partial<Record<string, number>> = {
  hero: 2,
  rooms: 4,
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

// ── Span dots — shows current column count as filled/empty blocks ─────────────

function SpanDots({ span }: { span: number }) {
  return (
    <div className="overview-span-dots" aria-hidden="true">
      {Array.from({ length: MAX_COLS }, (_, i) => (
        <span key={i} className={`overview-span-dot${i < span ? ' overview-span-dot--filled' : ''}`} />
      ))}
    </div>
  );
}

// ── Resize handle — drag right/left to change column span ────────────────────

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
    e.stopPropagation(); // prevent DnD kit from activating

    const btn = e.currentTarget;
    btn.setPointerCapture(e.pointerId);

    // In edit mode the [data-section] cell is inside the SortableItem wrapper div,
    // which is the actual CSS grid child — that's what we update during preview.
    const sectionEl = btn.closest('[data-section]') as HTMLElement | null;
    const gridEl    = btn.closest('.overview-grid') as HTMLElement | null;
    if (!sectionEl || !gridEl) return;

    const gridItem = sectionEl.parentElement as HTMLElement;
    const colWidth  = gridEl.getBoundingClientRect().width / MAX_COLS;
    const startX    = e.clientX;
    const startSpan = span;
    let previewSpan = startSpan;

    function onMove(me: PointerEvent) {
      const delta = Math.round((me.clientX - startX) / colWidth);
      const next  = Math.max(1, Math.min(MAX_COLS, startSpan + delta));
      if (next !== previewSpan) {
        previewSpan = next;
        // Direct DOM update — no React re-render during drag
        gridItem.style.gridColumn =
          next >= MAX_COLS ? '1 / -1' : next > 1 ? `span ${next}` : '';
      }
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      gridItem.style.gridColumn = ''; // class takes over after re-render
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

/** Canonical Home section ids in default display order. */
const SECTION_IDS = [
  'scenes',
  'hero',
  'energy',
  'devices',
  'climate',
  'blinds',
  'security',
  'pool', // [fork]
  'activity',
  'rooms',
] as const;

type SectionId = (typeof SECTION_IDS)[number];

type ToggleKeys = { hide: TKey; show: TKey; hideMobile: TKey; showMobile: TKey };

const SECTION_TOGGLE_KEYS: Record<SectionId, ToggleKeys> = {
  scenes: {
    hide: 'home.section.hide.scenes',
    show: 'home.section.show.scenes',
    hideMobile: 'home.section.hideMobile.scenes',
    showMobile: 'home.section.showMobile.scenes',
  },
  hero: {
    hide: 'home.section.hide.hero',
    show: 'home.section.show.hero',
    hideMobile: 'home.section.hideMobile.hero',
    showMobile: 'home.section.showMobile.hero',
  },
  energy: {
    hide: 'home.section.hide.energy',
    show: 'home.section.show.energy',
    hideMobile: 'home.section.hideMobile.energy',
    showMobile: 'home.section.showMobile.energy',
  },
  devices: {
    hide: 'home.section.hide.devices',
    show: 'home.section.show.devices',
    hideMobile: 'home.section.hideMobile.devices',
    showMobile: 'home.section.showMobile.devices',
  },
  climate: {
    hide: 'home.section.hide.climate',
    show: 'home.section.show.climate',
    hideMobile: 'home.section.hideMobile.climate',
    showMobile: 'home.section.showMobile.climate',
  },
  blinds: {
    hide: 'home.section.hide.blinds',
    show: 'home.section.show.blinds',
    hideMobile: 'home.section.hideMobile.blinds',
    showMobile: 'home.section.showMobile.blinds',
  },
  security: {
    hide: 'home.section.hide.security',
    show: 'home.section.show.security',
    hideMobile: 'home.section.hideMobile.security',
    showMobile: 'home.section.showMobile.security',
  },
  // [fork] Pool summary section
  pool: {
    hide: 'home.section.hide.pool',
    show: 'home.section.show.pool',
    hideMobile: 'home.section.hideMobile.pool',
    showMobile: 'home.section.showMobile.pool',
  },
  activity: {
    hide: 'home.section.hide.activity',
    show: 'home.section.show.activity',
    hideMobile: 'home.section.hideMobile.activity',
    showMobile: 'home.section.showMobile.activity',
  },
  rooms: {
    hide: 'home.section.hide.rooms',
    show: 'home.section.show.rooms',
    hideMobile: 'home.section.hideMobile.rooms',
    showMobile: 'home.section.showMobile.rooms',
  },
};

export function Home() {
  const t = useT();
  const rooms = useRooms();
  const entities = useEntityMap();
  const displayName = useDisplayName();

  // Select customization fields individually to avoid object-literal selector
  const homeSectionOrder = useSettingsStore(
    useShallow((s) => s.customization.homeSectionOrder)
  );
  const hiddenSections = useSettingsStore(
    useShallow((s) => s.customization.hiddenSections)
  );
  const mobileHiddenSections = useSettingsStore(
    useShallow((s) => s.customization.mobileHiddenSections)
  );
  const favorites = useSettingsStore(
    useShallow((s) => s.customization.favorites)
  );
  const homeSectionSpans = useSettingsStore(
    useShallow((s) => s.customization.homeSectionSpans)
  );
  const homeSectionHeights = useSettingsStore(
    useShallow((s) => s.customization.homeSectionHeights)
  );
  const roomOrder = useSettingsStore(
    useShallow((s) => s.customization.roomOrder)
  );
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);

  const editMode = useUIStore((s) => s.editMode);

  const [climateModalOpen, setClimateModalOpen] = useState(false);
  const [blindsModalOpen, setBlindsModalOpen] = useState(false);

  // Rooms that have domains (real devices), in the user's stored order
  const roomsWithDevices = applyStoredOrder(
    rooms.filter((r) => Object.keys(r.domains).length > 0).map((r) => r.id),
    roomOrder
  )
    .map((id) => rooms.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r != null);

  // [fork] The Pool section only exists when the pool entities are present, so
  // installs without a pool never see it (even in edit mode).
  const poolPresent = POOL_REQUIRED_ENTITIES.every((id) => entities[id] != null);

  // Compute display order from stored order
  const orderedIds = applyStoredOrder([...SECTION_IDS], homeSectionOrder)
    .filter((id) => id !== 'pool' || poolPresent); // [fork]

  // In non-edit mode, filter hidden + non-rendering sections.
  // Energy always renders: the widget self-manages its states (ready / prompt /
  // loading) — when energy isn't configured in HA it prompts the user to set it up.
  const visibleIds = editMode
    ? orderedIds
    : orderedIds.filter((id) => {
        if (hiddenSections.includes(id)) return false;
        if (id === 'rooms' && roomsWithDevices.length === 0) return false;
        return true;
      });

  /** Toggle a section's hidden state. */
  function handleToggleHidden(id: string) {
    const next = hiddenSections.includes(id)
      ? hiddenSections.filter((s) => s !== id)
      : [...hiddenSections, id];
    updateCustomization({ hiddenSections: next });
  }

  /** Toggle a section's mobile-only hidden state. */
  function handleToggleMobileHidden(id: string) {
    const next = mobileHiddenSections.includes(id)
      ? mobileHiddenSections.filter((s) => s !== id)
      : [...mobileHiddenSections, id];
    updateCustomization({ mobileHiddenSections: next });
  }

  /** Persist a new column span for a section. */
  const handleSpanChange = useCallback(
    (id: string, newSpan: number) => {
      updateCustomization({
        homeSectionSpans: { ...homeSectionSpans, [id]: newSpan },
      });
    },
    [homeSectionSpans, updateCustomization]
  );

  /** Persist a new max-height level for a section. */
  const handleHeightChange = useCallback(
    (id: string, newLevel: number) => {
      updateCustomization({
        homeSectionHeights: { ...homeSectionHeights, [id]: newLevel },
      });
    },
    [homeSectionHeights, updateCustomization]
  );

  /**
   * After a DnD reorder of visibleIds, merge back into the full SECTION_IDS list
   * preserving positions of hidden sections as best as possible — mirrors the
   * Room.tsx sectionsSnap merge pattern but for a single flat list.
   *
   * Strategy: walk the original full ordered list; for each hidden id, insert it
   * at the nearest relative position to its surrounding visible neighbours.
   */
  const handleReorder = useCallback(
    (newVisibleIds: string[]) => {
      // Build a new full order: start with newVisibleIds and re-insert hidden ids
      // at their previous relative positions (between the same visible neighbours).
      const hiddenIds = SECTION_IDS.filter(
        (id) => !newVisibleIds.includes(id)
      );

      // Build the new full list: hidden items slot back at their orderedIds positions
      const result: string[] = [...newVisibleIds];
      for (const hid of hiddenIds) {
        const prevIdx = orderedIds.indexOf(hid);
        // Find the first visible id that came after hid in the OLD order
        const nextVisible = orderedIds
          .slice(prevIdx + 1)
          .find((id) => newVisibleIds.includes(id));
        if (nextVisible) {
          const insertAt = result.indexOf(nextVisible);
          result.splice(insertAt, 0, hid);
        } else {
          result.push(hid);
        }
      }

      updateCustomization({ homeSectionOrder: result });
    },
    [orderedIds, updateCustomization]
  );

  /** Render the widget for a section id. */
  function renderWidget(id: SectionId) {
    switch (id) {
      case 'scenes':
        return <ScenesCard entities={entities} />;
      case 'hero':
        return (
          <HeroRoomCard rooms={roomsWithDevices} entities={entities} />
        );
      case 'energy':
        return <EnergyWidget />;
      case 'devices':
        return (
          <DevicesCard
            entities={entities}
            rooms={rooms}
            favorites={favorites}
          />
        );
      case 'climate':
        return (
          <ClimateCard
            entities={entities}
            rooms={roomsWithDevices}
            onSeeAll={() => setClimateModalOpen(true)}
          />
        );
      case 'blinds':
        return (
          <BlindsCard
            entities={entities}
            rooms={rooms}
            onSeeAll={() => setBlindsModalOpen(true)}
          />
        );
      case 'security':
        return <SecurityCard entities={entities} />;
      case 'pool': // [fork]
        return <PoolSummaryCard />;
      case 'activity':
        return <ActivityCard entities={entities} />;
      case 'rooms':
        return (
          <RoomsQuickAccess rooms={roomsWithDevices} entities={entities} />
        );
    }
  }

  return (
    <div className="page home-page stagger-rise">
      {/* Summary chips: mobile-only normally; --edit makes it visible on desktop in edit mode
          (HeaderCluster suppresses its own chips when editMode is true to avoid duplication). */}
      <SummaryChipsBar
        className={`home-chips-mobile${editMode ? ' home-chips-mobile--edit' : ''}`}
        editMode={editMode}
      />

      {/* Greeting row: text + (mobile) bell/avatar + edit toggle.
          Uses the shared PageHeaderActions so the placement matches every other page. */}
      <div className="home-page__header">
        <GreetingBlock userName={displayName} />
        <PageHeaderActions>
          <EditToggle className="home-page__edit-toggle" />
        </PageHeaderActions>
      </div>

      {/* Sortable overview grid */}
      <SortableGrid
        items={visibleIds}
        onReorder={handleReorder}
        editMode={editMode}
        className="overview-grid"
      >
        {visibleIds.map((id) => {
          const isHidden = hiddenSections.includes(id);
          const isMobileHidden = mobileHiddenSections.includes(id);
          const currentSpan = getSpan(id, homeSectionSpans);
          const sc = spanClass(currentSpan);
          const currentHeight = getHeightLevel(id, homeSectionHeights);
          const hc = heightClass(currentHeight);

          const widget = renderWidget(id as SectionId);

          if (!editMode) {
            // In non-edit mode the cell IS the direct grid child — span + height classes go here
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

          // Edit mode: SortableItem wrapper IS the direct grid child — span class goes there.
          // The inner cell div holds the content + edit overlays; the height class caps
          // the inner outline (see Page.css) so the overlays aren't clipped.
          const cellClass = [
            'overview-grid__cell',
            'overview-grid__cell--editing',
            hc,
            isHidden ? 'overview-grid__cell--hidden' : '',
          ].filter(Boolean).join(' ');

          return (
            <SortableItem key={id} id={id} editMode={editMode} className={sc}>
              <div className={cellClass} data-section={id}>
                <div className="edit-section-outline">
                  {widget}
                </div>
                <EditBadge
                  hidden={isHidden}
                  toggleLabel={
                    isHidden
                      ? t(SECTION_TOGGLE_KEYS[id as SectionId].show)
                      : t(SECTION_TOGGLE_KEYS[id as SectionId].hide)
                  }
                  onToggleHidden={() => handleToggleHidden(id)}
                  mobileHidden={isMobileHidden}
                  onToggleMobileHidden={() => handleToggleMobileHidden(id)}
                  mobileToggleLabel={
                    isMobileHidden
                      ? t(SECTION_TOGGLE_KEYS[id as SectionId].showMobile)
                      : t(SECTION_TOGGLE_KEYS[id as SectionId].hideMobile)
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

      <ClimateAllModal open={climateModalOpen} onClose={() => setClimateModalOpen(false)} />
      <BlindsAllModal open={blindsModalOpen} onClose={() => setBlindsModalOpen(false)} />
    </div>
  );
}
