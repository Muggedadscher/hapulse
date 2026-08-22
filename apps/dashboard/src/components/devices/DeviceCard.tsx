/**
 * DeviceCard — one device in the Devices grid/list. Shows icon, name, room and
 * entity count, plus a small live-status dot. Click opens the details modal.
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useEntities } from '../../ha/hooks';
import { DeviceIcon } from './deviceMeta';
import { useT } from '../../i18n/useT';
import type { DeviceModel } from '@hapulse/core';

const ACTIVE_STATES = new Set([
  'on', 'playing', 'open', 'unlocked', 'heat', 'cool', 'heat_cool', 'auto',
  'cleaning', 'home', 'armed_away', 'armed_home', 'armed_night',
]);

interface DeviceCardProps {
  device: DeviceModel;
  view: 'grid' | 'list';
  onSelect: (device: DeviceModel) => void;
  dimHidden?: boolean | undefined;
}

export function DeviceCard({ device, view, onSelect, dimHidden = false }: DeviceCardProps) {
  const t = useT();
  const states = useEntities(device.entities.map((e) => e.entity_id));
  const activeCount = states.filter((e) => e && ACTIVE_STATES.has(e.state)).length;
  const isActive = activeCount > 0;

  const entityLabel = t('devices.card.entityCount', { count: device.entityCount });

  return (
    <button
      type="button"
      className={`device-card device-card--${view}${dimHidden ? ' device-card--hidden' : ''}`}
      onClick={() => onSelect(device)}
      aria-label={`${device.name}${device.areaName ? `, ${device.areaName}` : ''}`}
    >
      <span className="device-card__head">
        <span className={`device-card__icon${isActive ? ' device-card__icon--active' : ''}`} aria-hidden="true">
          <DeviceIcon domain={device.primaryDomain} size={view === 'grid' ? 20 : 18} />
        </span>
        <span className="device-card__body">
          <span className="device-card__name" title={device.name}>{device.name}</span>
          <span className="device-card__room">{device.areaName ?? t('devices.card.unassigned')}</span>
        </span>
      </span>

      <span className="device-card__meta">
        <span className="device-card__count">
          {isActive && <span className="device-card__dot" aria-hidden="true" />}
          {view === 'grid' ? entityLabel : device.entityCount}
        </span>
        <ChevronRight size={16} strokeWidth={2} className="device-card__chevron" />
      </span>
    </button>
  );
}
