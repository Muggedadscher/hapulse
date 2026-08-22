import React from 'react';
import { Clock, Workflow } from 'lucide-react';
import { useT } from '../../i18n/useT';
import type { TKey } from '../../i18n/useT';
import { Card } from '../ui/Card';
import type { HassEntity } from '@hapulse/core';
import './AutomationActivityFeed.css';

interface AutomationActivityFeedProps {
  automations: HassEntity[];
}

type T = (key: TKey, vars?: Record<string, string | number>) => string;

/** Takes the translator as a parameter: it runs outside any component body. */
function formatRelativeTime(t: T, iso: string | null | undefined): string {
  if (!iso) return t('automations.time.never');
  try {
    const delta = Date.now() - new Date(iso).getTime();
    if (delta < 60000) return t('automations.time.justNow');
    if (delta < 3600000) return t('automations.time.minutesAgo', { count: Math.floor(delta / 60000) });
    if (delta < 86400000) return t('automations.time.hoursAgo', { count: Math.floor(delta / 3600000) });
    if (delta < 172800000) return t('automations.time.yesterday');
    return t('automations.time.daysAgo', { count: Math.floor(delta / 86400000) });
  } catch {
    return t('automations.time.unknown');
  }
}

function entityName(e: HassEntity): string {
  return (
    (e.attributes.friendly_name as string | undefined) ??
    e.entity_id.split('.')[1]!.replace(/_/g, ' ')
  );
}

export function AutomationActivityFeed({ automations }: AutomationActivityFeedProps) {
  const t = useT();
  const recent = automations
    .filter((e) => e.attributes.last_triggered != null)
    .sort((a, b) => {
      const at = new Date(a.attributes.last_triggered as string).getTime();
      const bt = new Date(b.attributes.last_triggered as string).getTime();
      return bt - at;
    })
    .slice(0, 8);

  return (
    <Card className="auto-feed-card">
      <div className="auto-feed-card__header">
        <div className="auto-feed-card__title-row">
          <span className="auto-feed-card__icon-chip" aria-hidden="true">
            <Clock size={15} strokeWidth={1.75} />
          </span>
          <span className="auto-feed-card__title">{t('automations.activity.title')}</span>
        </div>
        <span className="auto-feed-card__sub">
          {t('automations.activity.ranToday', { count: recent.length })}
        </span>
      </div>

      {recent.length === 0 ? (
        <p className="auto-feed-card__empty">{t('automations.activity.empty')}</p>
      ) : (
        <ul className="auto-feed-card__list" aria-label={t('automations.activity.listAria')}>
          {recent.map((entity) => {
            const name          = entityName(entity);
            const category      = entity.attributes.category as string | undefined;
            const lastTriggered = entity.attributes.last_triggered as string;
            const isOn          = entity.state === 'on';

            return (
              <li key={entity.entity_id} className="auto-feed-row">
                <span
                  className={`auto-feed-row__icon${isOn ? ' auto-feed-row__icon--on' : ''}`}
                  aria-hidden="true"
                >
                  <Workflow size={14} strokeWidth={1.75} />
                </span>
                <div className="auto-feed-row__info">
                  <span className="auto-feed-row__name">{name}</span>
                  {category && (
                    <span className="auto-feed-row__cat">{category}</span>
                  )}
                </div>
                <span
                  className="auto-feed-row__time"
                  aria-label={t('automations.activity.ranAria', {
                    time: formatRelativeTime(t, lastTriggered),
                  })}
                >
                  {formatRelativeTime(t, lastTriggered)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
