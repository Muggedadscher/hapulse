/**
 * ActivityCard — feed of the 5 most recently changed notable entities.
 */
import React from 'react';
import {
  Lightbulb, Plug, Fan, Speaker, Lock, Thermometer, Activity,
  DoorOpen, ShieldAlert, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card } from '../ui/Card';
import { domainOf } from '@hapulse/core';
import type { HassEntityMap, HassEntity } from '@hapulse/core';
import { useT } from '../../i18n/useT';
import './ActivityCard.css';

type TFunction = ReturnType<typeof useT>;

interface ActivityCardProps {
  entities: HassEntityMap;
  hideSeeAll?: boolean;
}

const NOTABLE_DOMAINS = new Set([
  'light', 'switch', 'fan', 'media_player', 'lock', 'climate',
  'cover', 'alarm_control_panel', 'vacuum', 'binary_sensor',
]);

function activityIcon(entity: HassEntity): React.ReactNode {
  const domain = domainOf(entity.entity_id);
  const dc = entity.attributes.device_class as string | undefined;
  switch (domain) {
    case 'light': return <Lightbulb size={15} strokeWidth={1.75} />;
    case 'switch': return <Plug size={15} strokeWidth={1.75} />;
    case 'fan': return <Fan size={15} strokeWidth={1.75} />;
    case 'media_player': return <Speaker size={15} strokeWidth={1.75} />;
    case 'lock': return <Lock size={15} strokeWidth={1.75} />;
    case 'climate': return <Thermometer size={15} strokeWidth={1.75} />;
    case 'alarm_control_panel': return <ShieldAlert size={15} strokeWidth={1.75} />;
    case 'binary_sensor':
      if (dc === 'door' || dc === 'window') return <DoorOpen size={15} strokeWidth={1.75} />;
      if (dc === 'motion') return <Activity size={15} strokeWidth={1.75} />;
      return <Activity size={15} strokeWidth={1.75} />;
    default: return <Activity size={15} strokeWidth={1.75} />;
  }
}

function activityChipStyle(entity: HassEntity): { bg: string; color: string } {
  const domain = domainOf(entity.entity_id);
  switch (domain) {
    case 'light':
    case 'switch':
    case 'fan':
      return { bg: 'var(--accent-soft)', color: 'var(--accent)' };
    case 'media_player':
    case 'climate':
      return { bg: 'var(--info-soft)', color: 'var(--info)' };
    case 'lock':
    case 'alarm_control_panel':
      return {
        bg: entity.state === 'locked' || entity.state === 'disarmed'
          ? 'var(--positive-soft)'
          : 'var(--danger-soft)',
        color: entity.state === 'locked' || entity.state === 'disarmed'
          ? 'var(--positive)'
          : 'var(--danger)',
      };
    case 'binary_sensor':
      return entity.state === 'on'
        ? { bg: 'var(--warning-soft)', color: 'var(--warning)' }
        : { bg: 'var(--bg-subtle)', color: 'var(--text-faint)' };
    default:
      return { bg: 'var(--bg-subtle)', color: 'var(--text-faint)' };
  }
}

function shortActivityDescription(entity: HassEntity, t: TFunction): string {
  const domain = domainOf(entity.entity_id);
  const state = entity.state;
  switch (domain) {
    case 'light': return state === 'on' ? t('home.activity.lightOn') : t('home.activity.lightOff');
    case 'switch': return state === 'on' ? t('home.activity.switchOn') : t('home.activity.switchOff');
    case 'fan': return state === 'on' ? t('home.activity.fanOn') : t('home.activity.fanOff');
    case 'media_player':
      if (state === 'playing') return t('home.activity.playing');
      if (state === 'paused') return t('home.activity.paused');
      return state;
    case 'lock': return state === 'locked' ? t('home.activity.locked') : t('home.activity.unlocked');
    case 'climate': {
      const temp = entity.attributes.temperature;
      if (temp != null) return t('home.activity.setTo', { temp: Math.round(temp as number) });
      return state;
    }
    case 'alarm_control_panel': return state.replace(/_/g, ' ');
    case 'binary_sensor': {
      const dc = entity.attributes.device_class as string | undefined;
      if (dc === 'motion') return state === 'on' ? t('home.activity.motionDetected') : t('home.activity.noMotion');
      if (dc === 'door') return state === 'on' ? t('home.activity.doorOpened') : t('home.activity.doorClosed');
      if (dc === 'window') return state === 'on' ? t('home.activity.windowOpened') : t('home.activity.windowClosed');
      return state;
    }
    default: return state;
  }
}

function formatActivityTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  } catch {
    return '';
  }
}

export function ActivityCard({ entities, hideSeeAll = false }: ActivityCardProps) {
  const navigate = useNavigate();
  const t = useT();
  const recent = Object.values(entities)
    .filter((e) => {
      if (e.state === 'unavailable' || e.state === 'unknown') return false;
      if (e.attributes.entity_category != null) return false;
      return NOTABLE_DOMAINS.has(domainOf(e.entity_id));
    })
    .sort((a, b) => {
      const at = new Date(a.last_changed).getTime();
      const bt = new Date(b.last_changed).getTime();
      return bt - at;
    })
    .slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <Card className="activity-card">
      <div className="activity-card__header">
        <div className="activity-card__title-row">
          <span className="activity-card__icon-chip" aria-hidden="true">
            <Activity size={16} strokeWidth={1.75} />
          </span>
          <span className="activity-card__title">{t('home.activity.title')}</span>
        </div>
        {!hideSeeAll && (
          <button
            className="activity-card__see-all"
            type="button"
            aria-label={t('home.activity.detailsAria')}
            onClick={() => void navigate('/system')}
          >
            {t('home.activity.details')}
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      <ul className="activity-card__list card-scroll-body" aria-label={t('home.activity.listAria')}>
        {recent.map((entity) => {
          const chip = activityChipStyle(entity);
          const name = (entity.attributes.friendly_name ?? entity.entity_id.split('.')[1]!).replace(/_/g, ' ');
          const desc = shortActivityDescription(entity, t);
          const time = formatActivityTime(entity.last_changed);

          return (
            <li key={entity.entity_id} className="activity-row">
              <span
                className="activity-row__icon"
                style={{ background: chip.bg, color: chip.color }}
                aria-hidden="true"
              >
                {activityIcon(entity)}
              </span>
              <div className="activity-row__info">
                <span className="activity-row__name">{name}</span>
                <span className="activity-row__desc">{desc}</span>
              </div>
              <span className="activity-row__time" aria-label={t('home.activity.atTimeAria', { time })}>{time}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
