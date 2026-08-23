/**
 * DevicesCard — favorited, currently-active controllable entities.
 * Shows only entities the user has starred that are currently on/playing/cleaning.
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Lightbulb, Plug, Fan, Speaker, Tv, ChevronRight, RefreshCw, Layers, Star,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { domainOf, isToggleable, formatEntityState } from '@hapulse/core';
import type { HassEntityMap, HassEntity, Locale, Room } from '@hapulse/core';
import { callService } from '../../ha/service';
import { useLocale, useT, useStateLabel } from '../../i18n/useT';
import type { StateLabel } from '../../i18n/useT';
import './DevicesCard.css';

interface DevicesCardProps {
  entities: HassEntityMap;
  rooms: Room[];
  favorites: string[];
}

const DEVICE_DOMAINS = ['light', 'switch', 'fan', 'media_player', 'vacuum'];

/** True when a device should be considered "on" / active */
function isActiveState(entity: HassEntity): boolean {
  const { state } = entity;
  if (state === 'unavailable' || state === 'unknown') return false;
  const domain = domainOf(entity.entity_id);
  if (domain === 'media_player') return state === 'playing' || state === 'paused';
  if (domain === 'vacuum') return state === 'cleaning' || state === 'returning';
  return state === 'on';
}

/** Icon chip appearance based on domain and state */
function deviceIconChip(entity: HassEntity): { icon: React.ReactNode; bg: string; color: string } {
  const domain = domainOf(entity.entity_id);
  switch (domain) {
    case 'light':
      return { icon: <Lightbulb size={16} strokeWidth={1.75} />, bg: 'var(--accent-soft)', color: 'var(--accent)' };
    case 'switch':
      return { icon: <Plug size={16} strokeWidth={1.75} />, bg: 'var(--accent-soft)', color: 'var(--accent)' };
    case 'fan':
      return { icon: <Fan size={16} strokeWidth={1.75} />, bg: 'var(--accent-soft)', color: 'var(--accent)' };
    case 'media_player':
      return {
        icon: entity.state === 'playing' ? <Tv size={16} strokeWidth={1.75} /> : <Speaker size={16} strokeWidth={1.75} />,
        bg: 'var(--info-soft)',
        color: 'var(--info)',
      };
    case 'vacuum':
      return { icon: <RefreshCw size={16} strokeWidth={1.75} />, bg: 'var(--positive-soft)', color: 'var(--positive)' };
    default:
      return { icon: <Plug size={16} strokeWidth={1.75} />, bg: 'var(--bg-subtle)', color: 'var(--text-faint)' };
  }
}

function statusLabel(entity: HassEntity, locale: Locale, sl: StateLabel): string {
  return formatEntityState(entity, locale, sl);
}

function findRoomName(entityId: string, rooms: Room[]): string | undefined {
  for (const room of rooms) {
    if (room.entityIds.includes(entityId)) return room.name;
  }
  return undefined;
}

export function DevicesCard({ entities, rooms, favorites }: DevicesCardProps) {
  const navigate = useNavigate();
  const t = useT();
  const sl = useStateLabel();
  const locale = useLocale();

  // All favorited device entities (available, right domain)
  const favDevices = favorites
    .map((id) => entities[id])
    .filter((e): e is HassEntity =>
      !!e && DEVICE_DOMAINS.includes(domainOf(e.entity_id)) && e.state !== 'unavailable'
    );

  // Subset that are currently on/active
  const activeDevices = favDevices.filter(isActiveState);

  const handleToggle = useCallback((entity: HassEntity) => {
    const domain = domainOf(entity.entity_id);
    if (!isToggleable(domain)) return;
    void callService(domain, 'toggle', {}, { entity_id: entity.entity_id });
  }, []);

  const scrollable = activeDevices.length > 5;

  const emptySubText = favDevices.length === 0
    ? t('home.devices.emptyHintNoFavorites')
    : t('home.devices.emptyHintAllOff');

  return (
    <Card className="devices-card">
      <div className="devices-card__header">
        <div className="devices-card__title-row">
          <span className="devices-card__icon-chip" aria-hidden="true">
            <Layers size={16} strokeWidth={1.75} />
          </span>
          <span className="devices-card__title">{t('home.devices.title')}</span>
        </div>
        {activeDevices.length > 0 && (
          <button
            className="devices-card__all-link"
            onClick={() => void navigate('/devices')}
            type="button"
            aria-label={t('home.devices.viewAllAria')}
          >
            {t('home.devices.allDevices')}
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {activeDevices.length === 0 ? (
        <div className="devices-card__empty">
          <Star size={28} strokeWidth={1.5} className="devices-card__empty-icon" />
          <p className="devices-card__empty-text">{t('home.devices.emptyTitle')}</p>
          <p className="devices-card__empty-sub">{emptySubText}</p>
        </div>
      ) : (
        <ul
          className={`devices-card__list card-scroll-body${scrollable ? ' devices-card__list--scrollable' : ''}`}
          aria-label={t('home.devices.listAria')}
        >
          {activeDevices.map((entity) => {
            const chip = deviceIconChip(entity);
            const name = (entity.attributes.friendly_name ?? entity.entity_id.split('.')[1]!).replace(/_/g, ' ');
            const roomName = findRoomName(entity.entity_id, rooms);
            const domain = domainOf(entity.entity_id);
            const toggleable = isToggleable(domain);
            const isOn = isActiveState(entity);

            return (
              <li key={entity.entity_id} className="device-row">
                <span className="device-row__icon" style={{ background: chip.bg, color: chip.color }} aria-hidden="true">
                  {chip.icon}
                </span>
                <div className="device-row__info">
                  <span className="device-row__name">{name}</span>
                  {roomName && <span className="device-row__room">{roomName}</span>}
                </div>
                <div className="device-row__control">
                  {toggleable ? (
                    <button
                      className={`device-toggle${isOn ? ' device-toggle--on' : ''}`}
                      onClick={() => handleToggle(entity)}
                      aria-label={isOn ? t('home.devices.turnOffAria', { name }) : t('home.devices.turnOnAria', { name })}
                      aria-pressed={isOn}
                      role="switch"
                      type="button"
                    >
                      <span className="device-toggle__thumb" />
                    </button>
                  ) : (
                    <span className="device-row__status">{statusLabel(entity, locale, sl)}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
