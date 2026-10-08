/**
 * [fork] A room tile of the overview in Glas (docs/GLAS-DESIGN.md §7.17, plan docs/glas/PLAN-ETAPPE-4.md K83).
 * On top the room's name, below a circle with its symbol and two short lines: temperature and humidity (else how many
 * devices), then what needs attention (open window or door, open gate, water, smoke) or its lights. The status symbol
 * replaces the room's own as in Klassisch (roomDisplayIcon); the circle turns warning or alarm, or yellow while a light
 * is on. RoomsQuickAccess works out the values, the tile only lays them out (styles/glas/home-lists.css).
 */

import React, { useMemo } from 'react';
import { formatNumber } from '@hapulse/core';
import type { Room } from '@hapulse/core';
import { RoomDisplayIcon } from '../../ui/RoomDisplayIcon';
import { useLocale, useT } from '../../../i18n/useT';

/** How loud roomStatusIconName's statuses are (packages/core/src/roomIcons.ts). */
const STATUS_TONE: Record<string, 'warn' | 'alarm'> = {
  'grid-2x2': 'warn',
  'door-open': 'warn',
  car: 'alarm',
  droplets: 'alarm',
  flame: 'alarm',
};

interface GlasRoomTileProps {
  room: Room;
  iconName: string;
  isStatus: boolean;
  temperature: number | null | undefined;
  humidity: number | null | undefined;
  /** The room's visible lights, and how many of them are on. */
  lights: number;
  lightsOn: number;
  devices: number;
  onOpen: () => void;
}

export function GlasRoomTile({
  room,
  iconName,
  isStatus,
  temperature,
  humidity,
  lights,
  lightsOn,
  devices,
  onOpen,
}: GlasRoomTileProps) {
  const t = useT();
  const locale = useLocale();
  const pct = useMemo(() => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }), [locale]);

  const statusText = (): string | null => {
    if (!isStatus) return null;
    switch (iconName) {
      case 'grid-2x2':
        return t('hints.windowOpen', { count: 1 });
      case 'door-open':
        return t('hints.doorOpen', { count: 1 });
      case 'car':
        return t('hints.garageOpen', { count: 1 });
      case 'droplets':
        return t('hints.leak');
      case 'flame':
        return t('hints.smoke');
      default:
        return null;
    }
  };

  const climate = [
    temperature != null ? `${formatNumber(temperature, locale, { minDecimals: 1, maxDecimals: 1 })}°` : null,
    humidity != null ? pct.format(humidity / 100) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const deviceLine = t('home.hero.deviceCount', { count: devices });
  const status = statusText();
  const lightLine =
    lights > 0 ? (lightsOn > 0 ? t('glas.hero.lightsOn', { count: lightsOn }) : t('glas.hero.lightsOff')) : null;
  const line1 = climate || deviceLine;
  const line2 = status ?? lightLine ?? (climate ? deviceLine : null);
  const tone = isStatus ? (STATUS_TONE[iconName] ?? 'warn') : lightsOn > 0 ? 'on' : undefined;
  const label = [t('home.roomsQuickAccess.roomAria', { name: room.name }), line1, line2].filter(Boolean).join(', ');

  return (
    <div role="listitem" className="g-room-item">
      <button
        type="button"
        className="g-room"
        data-tone={tone}
        data-status={status ? '' : undefined}
        onClick={onOpen}
        aria-label={label}
      >
        <span className="g-room__name">{room.name}</span>
        <span className="g-room__info">
          <span className="g-room__circle" aria-hidden="true">
            <RoomDisplayIcon roomIcon={room.icon} iconName={iconName} isStatus={isStatus} size={20} />
          </span>
          <span className="g-room__lines">
            <span className="g-room__line">{line1}</span>
            {line2 && <span className="g-room__line g-room__line--2">{line2}</span>}
          </span>
        </span>
      </button>
    </div>
  );
}
