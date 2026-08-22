/**
 * MotionGrid — Compact tiles for motion/occupancy/presence binary sensors.
 * Active = accent glow + "motion" label; inactive = "clear" dimmed.
 * Last-changed relative time, refreshed every 30s.
 */

import React, { useEffect, useState } from 'react';
import { Activity, UserCheck } from 'lucide-react';
import type { HassEntity, Room } from '@hapulse/core';
import { useT } from '../../i18n/useT';
import { getRoomName, relativeTime } from './roomUtils';
import { Card } from '../ui/Card';
import './MotionGrid.css';

function MotionIcon({ entity }: { entity: HassEntity }) {
  const dc = entity.attributes['device_class'] as string | undefined;
  if (dc === 'presence' || dc === 'occupancy') {
    return <UserCheck size={20} strokeWidth={1.75} />;
  }
  return <Activity size={20} strokeWidth={1.75} />;
}

interface MotionTileProps {
  entity: HassEntity;
  roomName?: string | undefined;
  tick: number; // increments every 30s to force re-render for relative time
}

function MotionTile({ entity, roomName, tick }: MotionTileProps) {
  const t = useT();
  const isActive = entity.state === 'on';
  const name = (entity.attributes['friendly_name'] as string | undefined) ?? entity.entity_id;
  const lastChanged = entity.last_changed;
  // tick is used to trigger re-render for relative time update
  void tick;

  return (
    <Card className={`motion-tile ${isActive ? 'motion-tile--active' : ''}`} active={isActive}>
      <div className="motion-tile__inner">
        <div className={`motion-tile__icon-wrap ${isActive ? 'motion-tile__icon-wrap--active' : ''}`}>
          <MotionIcon entity={entity} />
        </div>
        <div className="motion-tile__body">
          <p className="motion-tile__name">{name}</p>
          {roomName && <p className="motion-tile__room">{roomName}</p>}
          <p className={`motion-tile__state ${isActive ? 'motion-tile__state--active' : ''}`}>
            {isActive ? t('security.sensor.motion') : t('security.sensor.clear')}
          </p>
          <p className="motion-tile__time">{relativeTime(t, lastChanged)}</p>
        </div>
      </div>
    </Card>
  );
}

interface MotionGridProps {
  sensors: HassEntity[];
  rooms: Room[];
}

export function MotionGrid({ sensors, rooms }: MotionGridProps) {
  // Tick every 30s to refresh relative times
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="motion-grid">
      {sensors.map((sensor) => {
        const roomName = getRoomName(sensor.entity_id, rooms);
        return (
          <MotionTile
            key={sensor.entity_id}
            entity={sensor}
            roomName={roomName}
            tick={tick}
          />
        );
      })}
    </div>
  );
}
