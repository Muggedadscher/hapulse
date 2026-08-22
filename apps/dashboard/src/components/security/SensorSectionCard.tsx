import React from 'react';
import { useT } from '../../i18n/useT';
import { Card } from '../ui/Card';
import { DoorWindowList } from './DoorWindowList';
import { MotionList } from './MotionList';
import type { HassEntity, Room } from '@hapulse/core';
import './SensorSectionCard.css';

interface SensorSectionCardProps {
  title: string;
  icon: React.ReactNode;
  sensors: HassEntity[];
  rooms: Room[];
  type: 'door' | 'window' | 'motion';
  alertCount: number;
}

export function SensorSectionCard({
  title,
  icon,
  sensors,
  rooms,
  type,
  alertCount,
}: SensorSectionCardProps) {
  const t = useT();
  const chipClass =
    type === 'motion'
      ? alertCount > 0 ? 'sensor-section-card__icon-chip--warn' : 'sensor-section-card__icon-chip--muted'
      : alertCount > 0 ? 'sensor-section-card__icon-chip--danger' : 'sensor-section-card__icon-chip--ok';

  return (
    <Card className="sensor-section-card">
      <div className="sensor-section-card__header">
        <div className="sensor-section-card__title-row">
          <span className={`sensor-section-card__icon-chip ${chipClass}`}>{icon}</span>
          <span className="sensor-section-card__title">{title}</span>
          <span className="sensor-section-card__count">
            {alertCount > 0
              ? type === 'motion'
                ? t('security.sensorSection.detected', { count: alertCount })
                : t('security.sensorSection.open', { count: alertCount })
              : t('security.sensorSection.total', { count: sensors.length })}
          </span>
        </div>
      </div>
      <div className="sensor-section-card__body">
        {type === 'motion'
          ? <MotionList sensors={sensors} rooms={rooms} />
          : <DoorWindowList sensors={sensors} rooms={rooms} />}
      </div>
    </Card>
  );
}
