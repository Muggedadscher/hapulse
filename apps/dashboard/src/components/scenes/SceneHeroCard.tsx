import React from 'react';
import { Sparkles, LayoutGrid } from 'lucide-react';
import { useT } from '../../i18n/useT';
import type { TKey } from '../../i18n/useT';
import { Card } from '../ui/Card';
import type { HassEntity } from '@hapulse/core';
import './SceneHeroCard.css';

interface SceneHeroCardProps {
  scenes: HassEntity[];
  roomCount: number;
}

type T = (key: TKey, vars?: Record<string, string | number>) => string;

/** Takes the translator as a parameter: it runs outside any component body. */
function formatRelativeTime(t: T, iso: string | null | undefined): string {
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

export function SceneHeroCard({ scenes, roomCount }: SceneHeroCardProps) {
  const t = useT();
  const total = scenes.length;

  const activated = scenes.filter((e) => e.state !== 'unknown');
  const activatedToday = activated.filter((e) => {
    try {
      const d = new Date(e.state);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    } catch {
      return false;
    }
  });

  const lastUsed = activated.sort((a, b) => {
    try {
      return new Date(b.state).getTime() - new Date(a.state).getTime();
    } catch {
      return 0;
    }
  })[0];

  const lastUsedName = lastUsed ? sceneName(lastUsed) : null;
  const lastUsedTime = lastUsed?.state;

  return (
    <Card className="scene-hero-card">
      <div className="scene-hero-card__bg" aria-hidden="true" />

      <div className="scene-hero-card__content">
        <div className="scene-hero-card__top">
          <div>
            <div className="scene-hero-card__eyebrow-row">
              <span className="scene-hero-card__icon-chip" aria-hidden="true">
                <Sparkles size={16} strokeWidth={1.75} />
              </span>
              <span className="scene-hero-card__eyebrow">{t('scenes.title')}</span>
            </div>
            <div
              className="scene-hero-card__total"
              aria-label={t('scenes.hero.totalAria', { count: total })}
            >
              {total}
            </div>
            <div className="scene-hero-card__sub">{t('scenes.hero.totalLabel')}</div>
          </div>

          {lastUsedName && (
            <div
              className="scene-hero-card__last-used"
              aria-label={t('scenes.hero.lastUsedAria', { name: lastUsedName })}
            >
              <div className="scene-hero-card__last-used-label">{t('scenes.hero.lastUsed')}</div>
              <div className="scene-hero-card__last-used-name">{lastUsedName}</div>
              {lastUsedTime && (
                <div className="scene-hero-card__last-used-time">
                  {formatRelativeTime(t, lastUsedTime)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="scene-hero-card__stats" role="list" aria-label={t('scenes.hero.statsAria')}>
          <div className="scene-hero-card__stat scene-hero-card__stat--activated" role="listitem">
            <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
            <span className="scene-hero-card__stat-value">{activatedToday.length}</span>
            <span className="scene-hero-card__stat-label">{t('scenes.hero.statUsedToday')}</span>
          </div>
          <div className="scene-hero-card__stat-divider" aria-hidden="true" />
          <div className="scene-hero-card__stat scene-hero-card__stat--rooms" role="listitem">
            <LayoutGrid size={14} strokeWidth={2} aria-hidden="true" />
            <span className="scene-hero-card__stat-value">{roomCount}</span>
            <span className="scene-hero-card__stat-label">
              {t('scenes.hero.roomLabel', { count: roomCount })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
