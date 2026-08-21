import React from 'react';
import { Clock, Sparkles } from 'lucide-react';
import { useT } from '../../i18n/useT';
import type { TFunction } from '../../i18n/useT';
import { Card } from '../ui/Card';
import type { HassEntity } from '@hapulse/core';
import './SceneActivityFeed.css';

interface SceneActivityFeedProps {
  scenes: HassEntity[];
  /** area_id → { name } for room name pills. */
  areaMap: Record<string, { name: string; icon: string }>;
  /** entity_id → area_id */
  entityAreaMap: Record<string, string | null>;
}

/** Takes the translator as a parameter: it runs outside any component body. */
function formatRelativeTime(t: TFunction, iso: string | null | undefined): string {
  if (!iso || iso === 'unknown') return t('scenes.time.never');
  try {
    const delta = Date.now() - new Date(iso).getTime();
    if (delta < 60000) return t('scenes.time.justNow');
    if (delta < 3600000) return t('scenes.time.minutesAgo', { count: Math.floor(delta / 60000) });
    if (delta < 86400000) return t('scenes.time.hoursAgo', { count: Math.floor(delta / 3600000) });
    if (delta < 172800000) return t('scenes.time.yesterday');
    return t('scenes.time.daysAgo', { count: Math.floor(delta / 86400000) });
  } catch {
    return t('scenes.time.unknown');
  }
}

function sceneName(e: HassEntity): string {
  return (
    (e.attributes.friendly_name as string | undefined) ??
    e.entity_id.split('.')[1]!.replace(/_/g, ' ')
  );
}

export function SceneActivityFeed({ scenes, areaMap, entityAreaMap }: SceneActivityFeedProps) {
  const t = useT();
  const recent = scenes
    .filter((e) => e.state !== 'unknown')
    .sort((a, b) => {
      try {
        return new Date(b.state).getTime() - new Date(a.state).getTime();
      } catch {
        return 0;
      }
    })
    .slice(0, 8);

  return (
    <Card className="scene-feed-card">
      <div className="scene-feed-card__header">
        <div className="scene-feed-card__title-row">
          <span className="scene-feed-card__icon-chip" aria-hidden="true">
            <Clock size={15} strokeWidth={1.75} />
          </span>
          <span className="scene-feed-card__title">{t('scenes.activity.title')}</span>
        </div>
        <span className="scene-feed-card__sub">
          {t('scenes.activity.usedToday', { count: recent.length })}
        </span>
      </div>

      {recent.length === 0 ? (
        <p className="scene-feed-card__empty">{t('scenes.activity.empty')}</p>
      ) : (
        <ul className="scene-feed-card__list" aria-label={t('scenes.activity.listAria')}>
          {recent.map((entity) => {
            const name   = sceneName(entity);
            const areaId = entityAreaMap[entity.entity_id] ?? null;
            const room   = areaId ? (areaMap[areaId]?.name ?? null) : null;

            return (
              <li key={entity.entity_id} className="scene-feed-row">
                <span className="scene-feed-row__icon" aria-hidden="true">
                  <Sparkles size={14} strokeWidth={1.75} />
                </span>
                <div className="scene-feed-row__info">
                  <span className="scene-feed-row__name">{name}</span>
                  {room && <span className="scene-feed-row__room">{room}</span>}
                </div>
                <span
                  className="scene-feed-row__time"
                  aria-label={t('scenes.activity.activatedAria', {
                    time: formatRelativeTime(t, entity.state),
                  })}
                >
                  {formatRelativeTime(t, entity.state)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
