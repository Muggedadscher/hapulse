import React, { useEffect, useState } from 'react';
import { DoorOpen, DoorClosed, Grid2x2 } from 'lucide-react';
import type { HassEntity, Room } from '@hapulse/core';
import { useT } from '../../i18n/useT';
import { getRoomName, relativeTime } from './roomUtils';
import './MotionList.css'; // shares the same list row styles

function SensorIcon({ entity }: { entity: HassEntity }) {
  const dc = entity.attributes['device_class'] as string | undefined;
  const isOpen = entity.state === 'on';
  if (dc === 'window' || dc === 'opening') {
    return <Grid2x2 size={18} strokeWidth={1.75} />;
  }
  return isOpen
    ? <DoorOpen size={18} strokeWidth={1.75} />
    : <DoorClosed size={18} strokeWidth={1.75} />;
}

function isWindowClass(entity: HassEntity): boolean {
  const dc = entity.attributes['device_class'] as string | undefined;
  return dc === 'window' || dc === 'opening';
}

interface DoorWindowListProps {
  sensors: HassEntity[];
  rooms: Room[];
}

export function DoorWindowList({ sensors, rooms }: DoorWindowListProps) {
  const t = useT();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const sorted = [...sensors].sort((a, b) => {
    const aOpen = a.state === 'on' ? 0 : 1;
    const bOpen = b.state === 'on' ? 0 : 1;
    return aOpen - bOpen;
  });

  return (
    <div className="motion-list">
      {sorted.map((sensor) => {
        const isOpen = sensor.state === 'on';
        const isWin  = isWindowClass(sensor);
        // doors open → danger (red); windows open → warning (amber)
        const alertClass = isWin ? 'active' : 'danger';
        const name = (sensor.attributes['friendly_name'] as string | undefined) ?? sensor.entity_id;
        const roomName = getRoomName(sensor.entity_id, rooms);
        void tick;

        return (
          <div key={sensor.entity_id} className="motion-list__row">
            <span className={`motion-list__icon${isOpen ? ` motion-list__icon--${alertClass}` : ''}`}>
              <SensorIcon entity={sensor} />
            </span>
            <div className="motion-list__name-col">
              <span className="motion-list__name">{name}</span>
              {roomName && <span className="motion-list__room">{roomName}</span>}
            </div>
            <div className="motion-list__right">
              <span className={`motion-list__pill${isOpen ? ` motion-list__pill--${alertClass}` : ' motion-list__pill--clear'}`}>
                {isOpen && <span className="motion-list__dot" aria-hidden="true" />}
                {isOpen ? t('security.sensor.open') : t('security.sensor.closed')}
              </span>
              <span className="motion-list__time">{relativeTime(t, sensor.last_changed)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
