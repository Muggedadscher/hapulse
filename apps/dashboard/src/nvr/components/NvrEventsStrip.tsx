/**
 * [fork] Recent-events filmstrip (Scrypted's "EVENTS" row): newest first,
 * object crops with class badges, time below. Tapping opens the camera's
 * timeline at the event.
 */

import React from 'react';
import { useNavigate } from 'react-router';
import { sentinelEventPlayTs } from '@sentinel-nvr/web/api';
import type { SentinelRecentEvent } from '@sentinel-nvr/web/api';
import type { SentinelClient } from '../api';
import { useT, useLocale } from '../../i18n/useT';
import { fmtTime } from '../format';
import { EventBadges, eventLabel } from './ClassBadge';
import { cameraPath } from '../paths';

export function NvrEventsStrip({ client, events }: { client: SentinelClient; events: SentinelRecentEvent[] }) {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  if (!events.length) return null;
  return (
    <section className="nvr-section">
      <h2 className="section-label nvr-section__label">{t('nvr.events.title')}</h2>
      <div className="nvr-strip" role="list">
        {events.map((e) => (
          <button
            key={`${e.camera}-${e.ts}`}
            type="button"
            role="listitem"
            className="nvr-strip__item"
            onClick={() => navigate(cameraPath(e.camera, sentinelEventPlayTs(e), e.ts))}
            aria-label={`${eventLabel(t, e)} · ${e.cameraName} · ${fmtTime(e.ts, locale)}`}
            title={e.cameraName}
          >
            <span className="nvr-strip__img">
              <img src={client.eventThumbUrl(e.camera, e.ts)} alt="" loading="lazy" />
              <span className="nvr-strip__badges"><EventBadges ev={e} t={t} /></span>
            </span>
            <span className="nvr-strip__time data-font">{fmtTime(e.ts, locale)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
