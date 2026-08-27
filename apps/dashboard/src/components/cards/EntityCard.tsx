import React, { useCallback } from 'react';
import { domainOf } from '@hapulse/core';
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
import { useLongPress } from '../../lib/useLongPress';
import { useUIStore } from '../../stores/uiStore';

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
  const longPress = useLongPress(openDetail);

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
      className={`entity-card-press${tapOpens ? ' entity-card-press--tappable' : ''}`}
      {...longPress}
      onClick={handleClick}
    >
      <CardForDomain entity={entity} name={name} />
    </div>
  );
}
