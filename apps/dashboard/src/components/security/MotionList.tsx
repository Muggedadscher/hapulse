import React, { useEffect, useState } from 'react';
import { Activity, UserCheck } from 'lucide-react';
import type { HassEntity, Room } from '@hapulse/core';
import { useT } from '../../i18n/useT';
import { getRoomName, relativeTime } from './roomUtils';
import './MotionList.css';

function MotionIcon({ entity }: { entity: HassEntity }) {
  const dc = entity.attributes['device_class'] as string | undefined;
  if (dc === 'presence' || dc === 'occupancy') {
    return <UserCheck size={18} strokeWidth={1.75} />;
  }
  return <Activity size={18} strokeWidth={1.75} />;
}

interface MotionListProps {
  sensors: HassEntity[];
  rooms: Room[];
}

export function MotionList({ sensors, rooms }: MotionListProps) {
  const t = useT();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const sorted = [...sensors].sort((a, b) => {
    const aActive = a.state === 'on' ? 0 : 1;
    const bActive = b.state === 'on' ? 0 : 1;
    return aActive - bActive;
  });

  return (
    <div className="motion-list">
      {sorted.map((sensor) => {
        const isActive = sensor.state === 'on';
        const name = (sensor.attributes['friendly_name'] as string | undefined) ?? sensor.entity_id;
        const roomName = getRoomName(sensor.entity_id, rooms);
        void tick;

        return (
          <div key={sensor.entity_id} className="motion-list__row">
            <span className={`motion-list__icon${isActive ? ' motion-list__icon--active' : ''}`}>
              <MotionIcon entity={sensor} />
            </span>
            <div className="motion-list__name-col">
              <span className="motion-list__name">{name}</span>
              {roomName && <span className="motion-list__room">{roomName}</span>}
            </div>
            <div className="motion-list__right">
              <span className={`motion-list__pill${isActive ? ' motion-list__pill--active' : ' motion-list__pill--clear'}`}>
                {isActive && <span className="motion-list__dot" aria-hidden="true" />}
                {isActive ? t('security.sensor.motion') : t('security.sensor.clear')}
              </span>
              <span className="motion-list__time">{relativeTime(t, sensor.last_changed)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
