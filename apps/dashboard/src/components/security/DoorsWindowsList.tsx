/**
 * DoorsWindowsList — binary_sensor list for door/window/opening/garage_door device classes.
 * Open sensors sort first; state pill colored with glow dot.
 */

import React from 'react';
import { DoorOpen, AppWindow } from 'lucide-react';
import type { HassEntity, Room } from '@hapulse/core';
import { useT } from '../../i18n/useT';
import { getRoomName } from './roomUtils';
import './DoorsWindowsList.css';

function entityIcon(entity: HassEntity) {
  const dc = entity.attributes['device_class'] as string | undefined;
  if (dc === 'window') return <AppWindow size={18} strokeWidth={1.75} />;
  return <DoorOpen size={18} strokeWidth={1.75} />;
}

interface DoorsWindowsListProps {
  sensors: HassEntity[];
  rooms: Room[];
}

export function DoorsWindowsList({ sensors, rooms }: DoorsWindowsListProps) {
  const t = useT();
  const sorted = [...sensors].sort((a, b) => {
    const aOpen = a.state === 'on' ? 0 : 1;
    const bOpen = b.state === 'on' ? 0 : 1;
    return aOpen - bOpen;
  });

  return (
    <div className="doors-list">
      {sorted.map((sensor) => {
        const isOpen = sensor.state === 'on';
        const name = (sensor.attributes['friendly_name'] as string | undefined) ?? sensor.entity_id;
        const roomName = getRoomName(sensor.entity_id, rooms);

        return (
          <div key={sensor.entity_id} className="doors-list__row">
            <span className={`doors-list__icon ${isOpen ? 'doors-list__icon--open' : 'doors-list__icon--closed'}`}>
              {entityIcon(sensor)}
            </span>
            <div className="doors-list__name-col">
              <span className="doors-list__name">{name}</span>
              {roomName && <span className="doors-list__room">{roomName}</span>}
            </div>
            <span className={`doors-list__pill ${isOpen ? 'doors-list__pill--open' : 'doors-list__pill--closed'}`}>
              {isOpen && <span className="doors-list__dot" aria-hidden="true" />}
              {isOpen ? t('security.sensor.open') : t('security.sensor.closed')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
