import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ChevronLeft, GripVertical, Scaling,
  Sparkles, Sun, Moon, Coffee, Tv, Music2, Sunset, PartyPopper, BookOpen,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SectionLabel } from '../components/ui/SectionLabel';
import { IconButton } from '../components/ui/IconButton';
import { EditToggle } from '../components/ui/EditToggle';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { EditBadge } from '../components/ui/EditBadge';
import { SortableGrid } from '../components/ui/SortableGrid';
import { SortableItem } from '../components/ui/SortableItem';
import { EntityCard } from '../components/cards/EntityCard';
import { HeroRoomCard } from '../components/home/HeroRoomCard';
import { callService } from '../ha/service';
import { useRoom, useEntityMap, useCustomization } from '../ha/hooks';
import { useUIStore } from '../stores/uiStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useT, type TKey } from '../i18n/useT';
import './Page.css';
import './Room.css';
import { useAreaCameraIds, useCameraSource } from '../nvr/cameraSource'; // [fork]
import { NvrRoomCameras } from '../nvr/NvrRoomCameras'; // [fork]
import { roomSections, combinedEntityOrder, stripRoomName, type RoomSectionKey } from '@hapulse/core'; // [fork] room page rules
import { useIsGlas } from '../app/glas/useUiStyle'; // [fork] Glas: back as a glass circle 44 (docs/glas/PLAN-ETAPPE-2.md K41)
import { glasSceneTone } from '../components/glas/home/sceneTone'; // [fork] Glas: scene tiles like the overview (K95)
import { HeatingPlanCard } from '../components/heating/HeatingPlanCard'; // [fork] heating plan per room (docs/HEIZPLAN.md)
import { useAreaHasHeatingPlan } from '../components/heating/useHeatingPlan'; // [fork]
import { HeatingSetupCard } from '../components/heating/HeatingSetupCard'; // [fork] set up a plan with one button (docs/HEIZPLAN.md)
import { RoomTemperatureSource } from '../components/room/RoomTemperatureSource'; // [fork] where the room's temperature comes from

// ── Scene helpers ─────────────────────────────────────────────────────────────

const SCENE_ICON_COLORS = [
  { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  { bg: 'var(--info-soft)', color: 'var(--info)' },
  { bg: 'var(--positive-soft)', color: 'var(--positive)' },
  { bg: 'var(--warning-soft)', color: 'var(--warning)' },
] as const;

function sceneIcon(name: string): React.ReactNode {
  const n = name.toLowerCase();
  if (n.includes('morning') || n.includes('sunrise') || n.includes('wake')) return <Sun size={16} strokeWidth={1.75} />;
  if (n.includes('night') || n.includes('sleep') || n.includes('bed')) return <Moon size={16} strokeWidth={1.75} />;
  if (n.includes('relax') || n.includes('chill') || n.includes('calm')) return <Sunset size={16} strokeWidth={1.75} />;
  if (n.includes('movie') || n.includes('cinema') || n.includes('tv')) return <Tv size={16} strokeWidth={1.75} />;
  if (n.includes('music') || n.includes('party')) return <PartyPopper size={16} strokeWidth={1.75} />;
  if (n.includes('read') || n.includes('study') || n.includes('focus')) return <BookOpen size={16} strokeWidth={1.75} />;
  if (n.includes('coffee') || n.includes('breakfast')) return <Coffee size={16} strokeWidth={1.75} />;
  if (n.includes('concert') || n.includes('audio') || n.includes('sound')) return <Music2 size={16} strokeWidth={1.75} />;
  return <Sparkles size={16} strokeWidth={1.75} />;
}

// ── Section width (2-column grid) ─────────────────────────────────────────────

const ROOM_MAX_COLS = 2;

/** Stored room-section spans are keyed `${areaId}:${sectionKey}`. Default 2 (full). */
function roomSpanKey(areaId: string, sectionKey: string): string {
  return `${areaId}:${sectionKey}`;
}

function getRoomSpan(areaId: string, sectionKey: string, stored: Record<string, number>): number {
  const v = stored[roomSpanKey(areaId, sectionKey)] ?? ROOM_MAX_COLS;
  return Math.max(1, Math.min(ROOM_MAX_COLS, v));
}

function roomSpanClass(span: number): string {
  return span >= ROOM_MAX_COLS ? 'room-page__section--span-2' : 'room-page__section--span-1';
}

/** Two-block indicator of the section's current width (edit mode). */
function RoomSpanDots({ span }: { span: number }) {
  return (
    <div className="room-section__span-dots" aria-hidden="true">
      {Array.from({ length: ROOM_MAX_COLS }, (_, i) => (
        <span
          key={i}
          className={`room-section__span-dot${i < span ? ' room-section__span-dot--filled' : ''}`}
        />
      ))}
    </div>
  );
}

/** Drag left/right to change a room section between half and full width. */
function RoomResizeHandle({
  span,
  onCommit,
}: {
  span: number;
  onCommit: (newSpan: number) => void;
}) {
  const t = useT();

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation(); // don't start a section drag

    const btn = e.currentTarget;
    btn.setPointerCapture(e.pointerId);

    const sectionEl = btn.closest('.room-page__section') as HTMLElement | null;
    const gridEl = btn.closest('.room-page__sections') as HTMLElement | null;
    if (!sectionEl || !gridEl) return;

    const colWidth = gridEl.getBoundingClientRect().width / ROOM_MAX_COLS;
    const startX = e.clientX;
    const startSpan = span;
    let previewSpan = startSpan;

    function onMove(me: PointerEvent) {
      const delta = Math.round((me.clientX - startX) / colWidth);
      const next = Math.max(1, Math.min(ROOM_MAX_COLS, startSpan + delta));
      if (next !== previewSpan) {
        previewSpan = next;
        sectionEl!.style.gridColumn = next >= ROOM_MAX_COLS ? '1 / -1' : 'span 1';
      }
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      sectionEl!.style.gridColumn = ''; // class takes over after re-render
      onCommit(previewSpan);
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  return (
    <button
      type="button"
      className="room-section__resize-handle"
      onPointerDown={handlePointerDown}
      aria-label={t('columnResize.ariaLabel', { span, max: ROOM_MAX_COLS })}
      title={t('columnResize.title', { span, max: ROOM_MAX_COLS })}
    >
      <Scaling size={12} strokeWidth={2.5} />
    </button>
  );
}

// ── Sortable section wrapper ──────────────────────────────────────────────────

const DRAG_REORDER_KEYS: Record<SectionKey, TKey> = {
  scene: 'room.section.dragReorder.scene',
  light: 'room.section.dragReorder.light',
  climate: 'room.section.dragReorder.climate',
  media_player: 'room.section.dragReorder.mediaPlayer',
  cover: 'room.section.dragReorder.cover',
  garage: 'room.section.dragReorder.garage', // [fork]
  switches: 'room.section.dragReorder.switches',
  button: 'room.section.dragReorder.button',
  vacuum: 'room.section.dragReorder.vacuum',
  sensor: 'room.section.dragReorder.sensor',
  binary_sensor: 'room.section.dragReorder.sensor',
  other: 'room.section.dragReorder.misc',
  nvrCameras: 'cameraSource.room.dragReorder', // [fork]
};

function SortableSectionInner({
  id,
  label,
  span,
  onCommitSpan,
  children,
}: {
  id: SectionKey;
  label: string;
  span: number;
  onCommitSpan: (newSpan: number) => void;
  children: React.ReactNode;
}) {
  const t = useT();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <section
      ref={setNodeRef}
      className={[
        'room-page__section',
        roomSpanClass(span),
        isDragging ? 'room-page__section--dragging' : '',
      ].filter(Boolean).join(' ')}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
        zIndex: isDragging ? 10 : undefined,
        position: 'relative',
      }}
      {...attributes}
    >
      <div className="room-section__label-row">
        <button
          ref={setActivatorNodeRef}
          className="room-section__grip"
          type="button"
          aria-label={t(DRAG_REORDER_KEYS[id])}
          {...listeners}
        >
          <GripVertical size={14} strokeWidth={1.75} />
        </button>
        <SectionLabel>{label}</SectionLabel>
      </div>
      {children}
      <RoomSpanDots span={span} />
      <RoomResizeHandle span={span} onCommit={onCommitSpan} />
    </section>
  );
}

// ── Section config ────────────────────────────────────────────────────────────

type SectionKey = RoomSectionKey; // [fork] from @hapulse/core (roomSections.ts)

const SECTION_LABEL_KEYS: Record<string, TKey> = {
  scene:        'room.section.label.scene',
  light:        'room.section.label.light',
  climate:      'room.section.label.climate',
  media_player: 'room.section.label.mediaPlayer',
  cover:        'room.section.label.cover',
  garage:       'room.section.label.garage', // [fork]
  switches:     'room.section.label.switches',
  button:       'room.section.label.button',
  vacuum:       'room.section.label.vacuum',
  sensor:       'room.section.label.sensor',
  binary_sensor:'room.section.label.sensor',
  other:        'room.section.label.misc',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function Room() {
  const t = useT();
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  const room = useRoom(areaId ?? '');
  const entities = useEntityMap();
  const customization = useCustomization();
  const editMode = useUIStore((s) => s.editMode);
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);
  const { hiddenEntities, entityOverrides, entityOrder, favorites, roomSectionOrder, roomSectionSpans } = customization;

  // [fork] hooks before the early return (rules-of-hooks, React #310)
  const cameraSource = useCameraSource(); // [fork] Sentinel replaces HA's camera entities
  const areaCameraIds = useAreaCameraIds(areaId ?? ''); // [fork]
  const glas = useIsGlas(); // [fork]
  const heatingPlan = useAreaHasHeatingPlan(areaId ?? ''); // [fork] the plan card stands in "Klima" (not while arranging)
  const handleReorderSections = useCallback(
    (newKeys: string[]) => {
      if (!areaId) return;
      updateCustomization({
        roomSectionOrder: { ...roomSectionOrder, [areaId]: newKeys },
      });
    },
    [areaId, roomSectionOrder, updateCustomization]
  );

  const handleSectionSpanChange = useCallback(
    (sectionKey: string, newSpan: number) => {
      if (!areaId) return;
      updateCustomization({
        roomSectionSpans: { ...roomSectionSpans, [roomSpanKey(areaId, sectionKey)]: newSpan },
      });
    },
    [areaId, roomSectionSpans, updateCustomization]
  );

  if (!areaId || !room) {
    return (
      <div className="page room-page stagger-rise">
        <div className="room-page__not-found">
          <div className="room-page__not-found-title">{t('room.notFound.title')}</div>
          <button
            type="button"
            className="room-page__not-found-link"
            onClick={() => void navigate('/')}
          >
            {t('room.backToHome')}
          </button>
        </div>
      </div>
    );
  }

  function handleToggleEntity(entityId: string) {
    const next = hiddenEntities.includes(entityId)
      ? hiddenEntities.filter((id) => id !== entityId)
      : [...hiddenEntities, entityId];
    updateCustomization({ hiddenEntities: next });
  }

  function handleToggleFavorite(entityId: string) {
    const next = favorites.includes(entityId)
      ? favorites.filter((id) => id !== entityId)
      : [...favorites, entityId];
    updateCustomization({ favorites: next });
  }

  function handleReorderSection(
    sectionKey: string,
    newSectionIds: string[],
    sectionsSnap: Record<string, string[]>
  ) {
    if (!areaId) return;
    // [fork] rule in @hapulse/core (combinedEntityOrder)
    updateCustomization({ entityOrder: { ...entityOrder, [areaId]: combinedEntityOrder(sectionKey, newSectionIds, sectionsSnap) } });
  }

  // [fork] which entity stands in which section, and the order: @hapulse/core (roomSections.ts), shared with the iOS app
  const { sections: coreSections, snapshot: sectionsSnap } = roomSections({
    domains: room.domains,
    entities,
    hiddenEntities,
    editMode,
    sentinel: cameraSource === 'sentinel',
    cameraIds: areaCameraIds,
    storedEntityOrder: entityOrder[areaId],
    storedSectionOrder: roomSectionOrder[areaId],
    heatingPlan,
  });

  function getEntityName(entityId: string): string {
    const override = entityOverrides[entityId];
    if (override?.name) return override.name;
    const friendly = entities[entityId]?.attributes?.friendly_name as string | undefined;
    if (friendly) return stripRoomName(friendly, room?.name ?? '');
    return entityId;
  }

  // ── Card renderer ───────────────────────────────────────────────────────────

  function renderCard(key: SectionKey, entityId: string, isSensor: boolean, idx: number) {
    const entity = entities[entityId];
    if (!entity) return null;
    const name = getEntityName(entityId);
    const isHidden = hiddenEntities.includes(entityId);

    const cardNode: React.ReactNode = (() => {
      // All domain cards render through EntityCard, which adds the detail
      // press behaviour (tap on read-only cards, long press on interactive
      // ones — issue #14). Scene tiles stay bespoke: their tap activates.
      if (isSensor) return <EntityCard key={entityId} entity={entity} name={name} />;
      if (key === 'scene') {
        const palette = SCENE_ICON_COLORS[idx % SCENE_ICON_COLORS.length]!;
        const displayName = name.replace(/_/g, ' ');
        return (
          <button
            key={entityId}
            className={['scene-tile', 'scene-tile--compact', isHidden && editMode ? 'scene-tile--hidden' : ''].filter(Boolean).join(' ')}
            onClick={() => void callService('scene', 'turn_on', {}, { entity_id: entityId })}
            aria-label={t('room.scene.activate', { name: displayName })}
            data-tone={glas ? glasSceneTone(sceneIcon(displayName), idx) : undefined /* [fork] the overview's look (K88, K95) */}
            type="button"
          >
            <span
              className="scene-tile__icon"
              style={glas ? undefined : { background: palette.bg, color: palette.color } /* [fork] Glas: CSS */}
              aria-hidden="true"
            >
              {sceneIcon(displayName)}
            </span>
            <span className="scene-tile__name">{displayName}</span>
          </button>
        );
      }
      return <EntityCard key={entityId} entity={entity} name={name} />;
    })();

    const isUnavailable = entity.state === 'unavailable';
    const finalNode = isUnavailable
      ? <div key={entityId} className="entity-unavailable">{cardNode}</div>
      : cardNode;

    if (!editMode) return finalNode;

    return (
      <SortableItem key={entityId} id={entityId} editMode={editMode}>
        <div
          className={[
            'edit-entity-wrap',
            'edit-entity-wrap--editing',
            isHidden ? 'edit-entity-wrap--hidden' : '',
            isUnavailable ? 'edit-entity-wrap--unavailable' : '',
          ].filter(Boolean).join(' ')}
        >
          <div className="edit-item-outline" style={{ borderRadius: 'var(--radius-card)' }}>
            {cardNode}
          </div>
          <EditBadge
            hidden={isHidden}
            toggleLabel={isHidden ? t('editBadge.show', { label: name }) : t('editBadge.hide', { label: name })}
            onToggleHidden={() => handleToggleEntity(entityId)}
            favorite={favorites.includes(entityId)}
            onToggleFavorite={() => handleToggleFavorite(entityId)}
            entityName={name}
          />
        </div>
      </SortableItem>
    );
  }

  // ── Section data ────────────────────────────────────────────────────────────

  type SectionDef = {
    key: SectionKey;
    label: string;
    ids: string[];
    isSensor?: boolean;
  };

  const sectionLabel = (key: SectionKey): string =>
    key === 'nvrCameras' ? t('cameraSource.room.title') : t(SECTION_LABEL_KEYS[key]!); // [fork]
  const orderedSectionDefs: SectionDef[] = coreSections.map((s) => ({ ...s, label: sectionLabel(s.key) })); // [fork]
  // ── Section content renderer ────────────────────────────────────────────────

  function renderSectionContent(s: SectionDef): React.ReactNode {
    const { key, ids, isSensor } = s;
    if (key === 'nvrCameras') return <NvrRoomCameras cameraIds={ids} />; // [fork]
    const gridClass = isSensor
      ? 'room-page__sensor-grid'
      : key === 'scene'
      ? 'room-page__scene-grid'
      : key === 'climate' || key === 'vacuum'
      ? 'room-page__wide-card-grid'
      : 'room-page__card-grid';

    return (
      <SortableGrid
        items={ids}
        onReorder={(newIds) => handleReorderSection(key, newIds, sectionsSnap)}
        editMode={editMode}
        className={gridClass}
      >
        {/* [fork] "Klima" outside edit mode: thermostats, the heating plan cards, then the humidifiers */}
        {(key === 'climate' && !editMode ? ids.filter((id) => !id.startsWith('humidifier.')) : ids).map((entityId, idx) => renderCard(key, entityId, isSensor ?? false, idx))}
        {key === 'climate' && heatingPlan && !editMode && room && <HeatingPlanCard areaId={room.id} roomName={room.name} roomEntityIds={room.entityIds} />}{/* [fork] after the thermostats */}
        {key === 'climate' && !editMode && room && <HeatingSetupCard areaId={room.id} roomEntityIds={room.entityIds} />}{/* [fork] admins: a thermostat without plan (Etappe 4) */}
        {key === 'climate' && !editMode && ids.filter((id) => id.startsWith('humidifier.')).map((entityId, idx) => renderCard(key, entityId, false, idx))}{/* [fork] */}
      </SortableGrid>
    );
  }

  const isEmpty = orderedSectionDefs.length === 0;

  return (
    <div className="page room-page stagger-rise">
      {/* Mobile-only top bar: back + edit toggle (desktop uses AppLayout header) */}
      <div className="room-page__header">
        <IconButton
          label={t('common.back')}
          size={glas ? 44 : 40} // [fork] Glas: 44
          variant="ghost"
          className={glas ? 'g-back' : ''} // [fork] Glas: fixed glass circle
          onClick={() => void navigate(-1)}
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </IconButton>
        <PageHeaderActions>
          <EditToggle className="room-page__edit-toggle" />
        </PageHeaderActions>
      </div>

      {/* Hero room card */}
      <HeroRoomCard rooms={[room]} entities={entities} />
      {editMode && <RoomTemperatureSource room={room} entities={entities} nameOf={getEntityName} />}{/* [fork] admins choose the room's temperature source */}

      {/* Sections */}
      {isEmpty ? (
        <div className="room-page__not-found">
          <div className="room-page__not-found-title">{t('room.empty.title')}</div>
          <button
            type="button"
            className="room-page__not-found-link"
            onClick={() => void navigate('/')}
          >
            {t('room.backToHome')}
          </button>
        </div>
      ) : editMode ? (
        <SortableGrid
          items={orderedSectionDefs.map((s) => s.key)}
          onReorder={handleReorderSections}
          editMode={editMode}
          className="room-page__sections"
        >
          {orderedSectionDefs.map((s) => (
            <SortableSectionInner
              key={s.key}
              id={s.key}
              label={s.label}
              span={getRoomSpan(areaId, s.key, roomSectionSpans)}
              onCommitSpan={(newSpan) => handleSectionSpanChange(s.key, newSpan)}
            >
              {renderSectionContent(s)}
            </SortableSectionInner>
          ))}
        </SortableGrid>
      ) : (
        <div className="room-page__sections">
          {orderedSectionDefs.map((s) => (
            <section
              key={s.key}
              className={['room-page__section', roomSpanClass(getRoomSpan(areaId, s.key, roomSectionSpans))].join(' ')}
            >
              <SectionLabel>{s.label}</SectionLabel>
              {renderSectionContent(s)}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
