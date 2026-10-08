import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'; // [fork] useLayoutEffect, useRef
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
import { ActivityCard } from '../components/home/ActivityCard';
import { RoomsQuickAccess } from '../components/home/RoomsQuickAccess';
import { WasteCard } from '../components/waste/WasteCard'; // [fork]
import { NvrHomeCard } from '../nvr/NvrHomeCard'; // [fork]
import { useNvrConfigured } from '../nvr/config'; // [fork]
import { useCameraSource, withoutHaCameras } from '../nvr/cameraSource'; // [fork]
import { HintsCard, HintWindows } from '../components/home/HintsCard'; // [fork] Glas Etappe 4, K76
import type { HintWindow } from '../components/home/HintsCard'; // [fork]
import { useHints } from '../components/home/useHints'; // [fork]
import { EnergyGlas } from '../components/glas/home/EnergyGlas'; // [fork] Glas Etappe 4, K75
import { useIsGlas } from '../app/glas/useUiStyle'; // [fork]
import { SizeBar } from '../components/glas/home/SizeBar'; // [fork] Glas edit bar (K78)
import { SizeSheet } from '../components/glas/home/SizeSheet'; // [fork]
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
import { detectWasteBins, sizeOfPreset, tallKey, withTall, type SizePreset } from '@hapulse/core'; // [fork] waste; Glas sizes (K78)
import { useSettingsStore } from '../stores/settingsStore';
import { useUIStore } from '../stores/uiStore';
import { applyStoredOrder } from '../lib/order';
import './Page.css';
import './Home.css';

// ── Card column-span system ───────────────────────────────────────────────────

const MAX_COLS = 4;

/** Sections that default to more than 1 column when no stored span exists. */
const DEFAULT_SPANS: Partial<Record<string, number>> = {
  hints: 4, // [fork] a full row
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
  'hints', // [fork] first: only what deviates from normal
  'scenes',
  'hero',
  'energy',
  'devices',
  'climate',
  'blinds',
  'security',
  'waste', // [fork]
  'nvr', // [fork]
  'activity',
  'rooms',
] as const;

type SectionId = (typeof SECTION_IDS)[number];

type ToggleKeys = { hide: TKey; show: TKey; hideMobile: TKey; showMobile: TKey };

const SECTION_TOGGLE_KEYS: Record<SectionId, ToggleKeys> = {
  // [fork] Home hints.
  hints: {
    hide: 'home.section.hide.hints',
    show: 'home.section.show.hints',
    hideMobile: 'home.section.hideMobile.hints',
    showMobile: 'home.section.showMobile.hints',
  },
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
  // [fork] Waste collection card.
  waste: {
    hide: 'home.section.hide.waste',
    show: 'home.section.show.waste',
    hideMobile: 'home.section.hideMobile.waste',
    showMobile: 'home.section.showMobile.waste',
  },
  // [fork] Sentinel NVR card.
  nvr: {
    hide: 'home.section.hide.nvr',
    show: 'home.section.show.nvr',
    hideMobile: 'home.section.hideMobile.nvr',
    showMobile: 'home.section.showMobile.nvr',
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

// [fork] Glas edit bar (K78): the card's name for the bar's group and the size window
const SECTION_NAME_KEYS: Record<SectionId, TKey> = {
  hints: 'glas.edit.card.hints',
  scenes: 'glas.edit.card.scenes',
  hero: 'glas.edit.card.hero',
  energy: 'glas.edit.card.energy',
  devices: 'glas.edit.card.devices',
  climate: 'glas.edit.card.climate',
  blinds: 'glas.edit.card.blinds',
  security: 'glas.edit.card.security',
  waste: 'glas.edit.card.waste',
  nvr: 'glas.edit.card.nvr',
  activity: 'glas.edit.card.activity',
  rooms: 'glas.edit.card.rooms',
};

/** [fork] Cards without S / M / L in Glas: the hints and the rooms keep their width (K78). */
const NO_SIZE_PRESETS: ReadonlySet<string> = new Set(['hints', 'rooms']);

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
  const favoritesRaw = useSettingsStore(
    useShallow((s) => s.customization.favorites)
  );
  const cameraSource = useCameraSource(); // [fork] no HA camera favorites while Sentinel is the source
  const favorites = useMemo(() => withoutHaCameras(favoritesRaw, cameraSource), [favoritesRaw, cameraSource]); // [fork]
  const homeSectionSpans = useSettingsStore(
    useShallow((s) => s.customization.homeSectionSpans)
  );
  const homeSectionHeights = useSettingsStore(
    useShallow((s) => s.customization.homeSectionHeights)
  );
  const tallSections = useSettingsStore(useShallow((s) => s.customization.tallSections)); // [fork] Glas L (K78)
  const roomOrder = useSettingsStore(
    useShallow((s) => s.customization.roomOrder)
  );
  // [fork] Waste card respects the user's hidden-entities list (its escape hatch
  // for suppressing a single detected bin sensor).
  const hiddenEntities = useSettingsStore(
    useShallow((s) => s.customization.hiddenEntities)
  );
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);

  const editMode = useUIStore((s) => s.editMode);

  const [climateModalOpen, setClimateModalOpen] = useState(false);
  const [blindsModalOpen, setBlindsModalOpen] = useState(false);
  const [hintWindow, setHintWindow] = useState<HintWindow | null>(null); // [fork] outlives the hints card (K76)
  const [sizeSheetFor, setSizeSheetFor] = useState<SectionId | null>(null); // [fork] Glas "⋯" (K78)
  const moveFocus = useRef<{ id: string; dir: -1 | 1 } | null>(null); // [fork] Glas ‹ ›: the button keeps the focus

  // Rooms that have domains (real devices), in the user's stored order
  const roomsWithDevices = applyStoredOrder(
    rooms.filter((r) => Object.keys(r.domains).length > 0).map((r) => r.id),
    roomOrder
  )
    .map((id) => rooms.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r != null);

  // [fork] Auto-detected waste bins — also gates whether the waste section shows.
  const wasteBins = useMemo(
    () => detectWasteBins(entities, { hidden: hiddenEntities, nowMs: Date.now() }),
    [entities, hiddenEntities]
  );
  const hasWaste = wasteBins.length > 0;
  const hasNvr = useNvrConfigured(); // [fork] NVR card only when a Sentinel connection is configured
  const { hints, cameraNames } = useHints(); // [fork] the hints card renders only while there is one
  const isGlas = useIsGlas(); // [fork]
  if (sizeSheetFor !== null && !(editMode && isGlas)) setSizeSheetFor(null); // [fork] leaving edit mode or Glas closes "⋯"

  // Compute display order from stored order
  const orderedIds = applyStoredOrder([...SECTION_IDS], homeSectionOrder);

  // In non-edit mode, filter hidden + non-rendering sections.
  // Energy always renders: the widget self-manages its states (ready / prompt /
  // loading) — when energy isn't configured in HA it prompts the user to set it up.
  const visibleIds = (editMode
    ? orderedIds
    : orderedIds.filter((id) => {
        if (hiddenSections.includes(id)) return false;
        if (id === 'rooms' && roomsWithDevices.length === 0) return false;
        return true;
      })
  ).filter((id) => id !== 'waste' || hasWaste) // [fork] hide the waste card when no bins exist
   .filter((id) => id !== 'nvr' || hasNvr) // [fork] hide the NVR card without a connection
   .filter((id) => id !== 'hints' || editMode || hints.length > 0); // [fork] no hints card while nothing deviates (edit mode: empty card)

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

  // ── [fork] Glas edit bar (docs/glas/PLAN-ETAPPE-4.md K78) ──────────────────
  // S / M / L write the classic span and height plus the Glas-only "taller" entry, in one change.
  function handlePreset(id: string, preset: SizePreset) {
    const size = sizeOfPreset(preset);
    updateCustomization({
      homeSectionSpans: { ...homeSectionSpans, [id]: size.span },
      homeSectionHeights: { ...homeSectionHeights, [id]: size.height },
      tallSections: withTall(tallSections, tallKey('home', id), size.tall),
    });
  }

  // "⋯": a height cap sets the height itself, so it leaves "taller".
  function handleSheetHeight(id: string, level: number) {
    updateCustomization({
      homeSectionHeights: { ...homeSectionHeights, [id]: level },
      ...(level > 0 ? { tallSections: withTall(tallSections, tallKey('home', id), false) } : {}),
    });
  }

  // ‹ ›: one place earlier or later among the cards shown in edit mode.
  function handleMove(id: string, dir: -1 | 1, keepFocus: boolean) {
    const from = visibleIds.indexOf(id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= visibleIds.length) return;
    const next = [...visibleIds];
    next.splice(from, 1);
    next.splice(to, 0, id);
    moveFocus.current = keepFocus ? { id, dir } : null;
    handleReorder(next);
  }

  // A moved card's DOM node can be re-inserted, which drops the focus: give it back (the other arrow at an end).
  useLayoutEffect(() => {
    const pending = moveFocus.current;
    if (!pending) return;
    moveFocus.current = null;
    const bar = document.querySelector(`.home-page [data-section="${pending.id}"] .g-size-bar`);
    const same = bar?.querySelector<HTMLButtonElement>(`[data-move="${pending.dir}"]`);
    const other = bar?.querySelector<HTMLButtonElement>(`[data-move="${-pending.dir}"]`);
    const target = same && !same.disabled ? same : other;
    if (!target || document.activeElement === target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest' });
  });

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
        return isGlas ? <EnergyGlas /> : <EnergyWidget />; // [fork] Glas: own card, variant V4 (K75)
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
      case 'waste': // [fork]
        return <WasteCard bins={wasteBins} />;
      case 'nvr': // [fork]
        return <NvrHomeCard />;
      case 'hints': // [fork]
        return <HintsCard hints={hints} cameraNames={cameraNames} onOpen={setHintWindow} />;
      case 'activity':
        return <ActivityCard entities={entities} />;
      case 'rooms':
        return (
          <RoomsQuickAccess rooms={roomsWithDevices} entities={entities} />
        );
    }
  }

  // [fork] Glas renders the chips after the greeting, so the tab order follows the page (K86).
  const chipsBar = (
    <SummaryChipsBar
      className={`home-chips-mobile${editMode ? ' home-chips-mobile--edit' : ''}`}
      editMode={editMode}
    />
  );

  return (
    <div className="page home-page stagger-rise">
      {/* Summary chips: mobile-only normally; --edit makes it visible on desktop in edit mode
          (HeaderCluster suppresses its own chips when editMode is true to avoid duplication). */}
      {!isGlas && chipsBar}{/* [fork] */}

      {/* Greeting row: text + (mobile) bell/avatar + edit toggle.
          Uses the shared PageHeaderActions so the placement matches every other page. */}
      <div className="home-page__header">
        <GreetingBlock userName={displayName} />
        <PageHeaderActions>
          <EditToggle className="home-page__edit-toggle" />
        </PageHeaderActions>
      </div>
      {isGlas && chipsBar}{/* [fork] */}

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
          // [fork] Glas L: taller from 900 px (K78); a height cap (set in Klassisch) wins
          const tall = isGlas && currentHeight === 0 && tallSections.includes(tallKey('home', id));

          const widget = renderWidget(id as SectionId);

          if (!editMode) {
            // In non-edit mode the cell IS the direct grid child — span + height classes go here
            const cellClass = [
              'overview-grid__cell',
              sc,
              hc,
              isHidden ? 'overview-grid__cell--hidden' : '',
              isMobileHidden ? 'section-mobile-hidden' : '',
              tall ? 'g-tall' : '', // [fork]
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
            <SortableItem key={id} id={id} editMode={editMode} className={tall ? `${sc} g-tall` : sc}>{/* [fork] g-tall */}
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
                {isGlas && ( // [fork] Glas: one bar instead of the badges and handles above (K78)
                  <SizeBar
                    name={t(SECTION_NAME_KEYS[id as SectionId])}
                    index={visibleIds.indexOf(id)}
                    size={NO_SIZE_PRESETS.has(id) ? undefined : { span: currentSpan, height: currentHeight, tall }}
                    onPreset={(preset) => handlePreset(id, preset)}
                    first={visibleIds.indexOf(id) === 0}
                    last={visibleIds.indexOf(id) === visibleIds.length - 1}
                    onMove={(dir, keepFocus) => handleMove(id, dir, keepFocus)}
                    hidden={isHidden}
                    hideLabel={t(SECTION_TOGGLE_KEYS[id as SectionId].hide)}
                    onToggleHidden={() => handleToggleHidden(id)}
                    mobileHidden={isMobileHidden}
                    mobileLabel={t(SECTION_TOGGLE_KEYS[id as SectionId].hideMobile)}
                    onToggleMobileHidden={() => handleToggleMobileHidden(id)}
                    onCustomize={() => setSizeSheetFor(id as SectionId)}
                  />
                )}
              </div>
            </SortableItem>
          );
        })}
      </SortableGrid>

      <ClimateAllModal open={climateModalOpen} onClose={() => setClimateModalOpen(false)} />
      <BlindsAllModal open={blindsModalOpen} onClose={() => setBlindsModalOpen(false)} />
      <HintWindows target={hintWindow} onClose={() => setHintWindow(null)} />{/* [fork] */}
      {isGlas && ( // [fork] Glas "⋯": the classic values of one card (K78)
        <SizeSheet
          open={editMode && sizeSheetFor !== null}
          onClose={() => setSizeSheetFor(null)}
          name={sizeSheetFor ? t(SECTION_NAME_KEYS[sizeSheetFor]) : ''}
          span={sizeSheetFor ? getSpan(sizeSheetFor, homeSectionSpans) : 1}
          height={sizeSheetFor ? getHeightLevel(sizeSheetFor, homeSectionHeights) : 0}
          onSpan={(span) => sizeSheetFor && handleSpanChange(sizeSheetFor, span)}
          onHeight={(level) => sizeSheetFor && handleSheetHeight(sizeSheetFor, level)}
        />
      )}
    </div>
  );
}
