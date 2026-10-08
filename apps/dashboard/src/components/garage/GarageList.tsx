/**
 * [fork] GarageList — garage door / gate rows with Open (asks first) and Close,
 * plus Stop while a door that supports it is moving. Built like LocksList.
 * Glas: a row swipes to the left to "Close" (never to open; docs/glas/PLAN-ETAPPE-3.md K59).
 */

import React from 'react';
import { ArrowDown, ArrowUp, Square } from 'lucide-react';
import { garageCanAct, garageCanStop } from '@hapulse/core';
import type { HassEntity, Room } from '@hapulse/core';
import { getRoomName } from '../security/roomUtils';
import { useT, useStateLabel } from '../../i18n/useT';
import { GarageIcon, garageTone } from './GarageIcon';
import { useGarageAction } from './GarageConfirm';
import { SwipeRow } from '../glas/SwipeRow';
import './garage.css';

interface GarageRowProps {
  entity: HassEntity;
  roomName?: string | undefined;
  onOpen: (e: HassEntity) => void;
  onClose: (e: HassEntity) => void;
  onStop: (e: HassEntity) => void;
}

function GarageRow({ entity, roomName, onOpen, onClose, onStop }: GarageRowProps) {
  const t = useT();
  const sl = useStateLabel();
  const tone = garageTone(entity.state);
  const name = (entity.attributes['friendly_name'] as string | undefined) ?? entity.entity_id;
  const deviceClass = entity.attributes['device_class'] as string | undefined;

  return (
    <SwipeRow
      label={t('garage.close')}
      tone="ok"
      width={104}
      disabled={!garageCanAct(entity, 'close')}
      onAction={() => onClose(entity)}
    >
      <div className="garage-row">
        <span className={`garage-row__icon garage--${tone}`}>
          <GarageIcon entity={entity} size={18} />
        </span>
        <div className="garage-row__name-col">
          <span className="garage-row__name">{name}</span>
          {roomName && <span className="garage-row__room">{roomName}</span>}
        </div>
        <span className={`garage-row__state garage--${tone}`}>
          {sl('cover', entity.state, { deviceClass })}
        </span>
        <div className="garage-row__actions">
          {garageCanStop(entity) && (
            <button
              className="garage-row__btn"
              onClick={() => onStop(entity)}
              aria-label={`${t('garage.stop')}: ${name}`}
              type="button"
            >
              <Square size={13} strokeWidth={1.75} />
              {t('garage.stop')}
            </button>
          )}
          <button
            className="garage-row__btn garage-row__btn--close"
            onClick={() => onClose(entity)}
            disabled={!garageCanAct(entity, 'close')}
            aria-label={`${t('garage.close')}: ${name}`}
            type="button"
          >
            <ArrowDown size={15} strokeWidth={1.75} />
            {t('garage.close')}
          </button>
          <button
            className="garage-row__btn garage-row__btn--open"
            onClick={() => onOpen(entity)}
            disabled={!garageCanAct(entity, 'open')}
            aria-label={`${t('garage.open')}: ${name}`}
            type="button"
          >
            <ArrowUp size={15} strokeWidth={1.75} />
            {t('garage.open')}
          </button>
        </div>
      </div>
    </SwipeRow>
  );
}

interface GarageListProps {
  garages: HassEntity[];
  rooms: Room[];
}

export function GarageList({ garages, rooms }: GarageListProps) {
  const { request, stop, dialog } = useGarageAction();
  return (
    <div className="garage-list">
      {garages.map((g) => (
        <GarageRow
          key={g.entity_id}
          entity={g}
          roomName={getRoomName(g.entity_id, rooms)}
          onOpen={(e) => request('open', [e])}
          onClose={(e) => request('close', [e])}
          onStop={stop}
        />
      ))}
      {dialog}
    </div>
  );
}
