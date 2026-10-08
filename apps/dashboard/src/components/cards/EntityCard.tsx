import React, { useCallback, useRef } from 'react'; // [fork] useRef
import { domainOf, isGarageDoor } from '@hapulse/core'; // [fork] isGarageDoor
import type { HassEntity } from '@hapulse/core';
import { LightCard } from './LightCard';
import { ClimateCard } from './ClimateCard';
import { MediaCard } from './MediaCard';
import { CoverCard } from './CoverCard';
import { ToggleCard } from './ToggleCard';
import { SensorTile } from './SensorTile';
import { LockCard } from './LockCard';
import { CameraCard } from './CameraCard';
import { ButtonCard } from './ButtonCard';
import { VacuumCard } from './VacuumCard';
import { GarageCard } from '../garage/GarageCard'; // [fork]
import { useLongPress } from '../../lib/useLongPress';
import { useUIStore } from '../../stores/uiStore';
import { useIsGlas } from '../../app/glas/useUiStyle'; // [fork] Glas context menu (docs/glas/PLAN-ETAPPE-3.md K58)
import { useGlasUiStore } from '../../stores/glasUiStore'; // [fork]

interface EntityCardProps {
  entity: HassEntity;
  /** Override name from customization.entityOverrides */
  name?: string;
  /**
   * Entity-detail press behaviour (issue #14): interactive cards open the
   * detail modal on a long press, read-only cards (sensors) on a plain tap.
   * The modal's own embedded control card turns this off so a press inside
   * the modal doesn't re-open it.
   */
  detailPress?: boolean;
}

/**
 * Domains whose TAP is itself the action (a toggle, a button press): detail
 * opens on long press only. Cards whose controls are discrete buttons inside
 * the card (media, climate, cover, lock, vacuum, camera) open the detail on a
 * plain tap of the card body too — a tap there had no meaning before.
 */
const TAP_IS_ACTION_DOMAINS = new Set([
  'light', 'switch', 'fan', 'input_boolean', 'button', 'input_button', 'scene', 'script',
]);

/** Elements whose own tap must never open the detail modal. */
const INTERACTIVE_CHILD_SELECTOR = 'input, button, select, textarea, a, [role="slider"], label';

function resolveName(entity: HassEntity, override?: string): string {
  return override ?? entity.attributes.friendly_name ?? entity.entity_id;
}

function CardForDomain({ entity, name }: { entity: HassEntity; name: string }) {
  switch (domainOf(entity.entity_id)) {
    case 'light':
      return <LightCard entity={entity} name={name} />;
    case 'climate':
      return <ClimateCard entity={entity} name={name} />;
    case 'media_player':
      return <MediaCard entity={entity} name={name} />;
    case 'cover':
      // [fork] garage doors / gates are handled like locks, not like blinds
      if (isGarageDoor(entity)) return <GarageCard entity={entity} name={name} />;
      return <CoverCard entity={entity} name={name} />;
    case 'switch':
    case 'fan':
    case 'input_boolean':
      return <ToggleCard entity={entity} name={name} />;
    case 'sensor':
    case 'binary_sensor':
      return <SensorTile entity={entity} name={name} />;
    case 'lock':
      return <LockCard entity={entity} name={name} />;
    case 'camera':
      return <CameraCard entity={entity} name={name} />;
    case 'button':
    case 'input_button':
      return <ButtonCard entity={entity} name={name} />;
    case 'vacuum':
      return <VacuumCard entity={entity} name={name} />;
    default:
      return <SensorTile entity={entity} name={name} />;
  }
}

export function EntityCard({ entity, name: nameOverride, detailPress = true }: EntityCardProps) {
  const name = resolveName(entity, nameOverride);
  const openEntityDetail = useUIStore((s) => s.openEntityDetail);
  const tapOpens = !TAP_IS_ACTION_DOMAINS.has(domainOf(entity.entity_id));

  const openDetail = useCallback(
    () => openEntityDetail(entity.entity_id),
    [openEntityDetail, entity.entity_id],
  );
  // [fork] Glas: a long press, a right click and the context-menu key open the context menu instead (K58); the edit
  // mode keeps the detail (dragging there starts with a press, too)
  const editMode = useUIStore((s) => s.editMode); // [fork]
  const glasMenu = useIsGlas() && !editMode; // [fork]
  const openContextMenu = useGlasUiStore((s) => s.openContextMenu); // [fork]
  const pressRef = useRef<HTMLDivElement>(null); // [fork]
  const openMenu = useCallback( // [fork]
    (pressing: boolean) => {
      if (pressRef.current) openContextMenu({ entityId: entity.entity_id, el: pressRef.current, name, pressing });
    },
    [openContextMenu, entity.entity_id, name],
  );
  const heldRef = useRef(false); // [fork] this press opened the menu: its click is swallowed (below)
  const openMenuOnHold = useCallback(() => { // [fork]
    heldRef.current = true;
    openMenu(true);
  }, [openMenu]);
  const longPress = useLongPress(glasMenu ? openMenuOnHold : openDetail); // [fork] Glas: menu
  // [fork] Glas: the click after the hold lands on the menu's layer, never here; useLongPress's own flag would then
  // swallow the next tap on a control of the card. Every press starts fresh, the swallowing is this one.
  const glasPressStart = useCallback(() => { heldRef.current = false; }, []); // [fork]
  const glasClickCapture = useCallback((e: React.MouseEvent) => { // [fork]
    if (!heldRef.current) return;
    heldRef.current = false;
    e.stopPropagation();
    e.preventDefault();
  }, []);
  const openMenuOnContext = useCallback( // [fork] Android also fires this for a long press: opening is idempotent
    (e: React.MouseEvent) => {
      e.preventDefault();
      openMenu((e.nativeEvent as PointerEvent).pointerType === 'touch');
    },
    [openMenu],
  );

  // Tap opens the detail unless it landed on one of the card's own controls
  // (a slider, a play button, …) — those keep their action.
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!tapOpens) return;
      if (e.target instanceof Element && e.target.closest(INTERACTIVE_CHILD_SELECTOR) != null) return;
      openDetail();
    },
    [tapOpens, openDetail],
  );

  if (!detailPress) {
    return <CardForDomain entity={entity} name={name} />;
  }

  return (
    <div
      ref={pressRef} // [fork]
      className={`entity-card-press${tapOpens ? ' entity-card-press--tappable' : ''}`}
      {...longPress}
      onPointerDownCapture={glasMenu ? glasPressStart : undefined} // [fork]
      onClickCapture={glasMenu ? glasClickCapture : longPress.onClickCapture} // [fork]
      onContextMenu={glasMenu ? openMenuOnContext : longPress.onContextMenu} // [fork]
      onClick={handleClick}
    >
      <CardForDomain entity={entity} name={name} />
    </div>
  );
}
