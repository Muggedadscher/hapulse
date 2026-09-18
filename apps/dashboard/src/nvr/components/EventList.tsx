/**
 * [fork] Event list (the "Events" tab of the camera page): newest first over
 * all loaded days, a sticky day header at every day change.
 */

import React, { Fragment } from 'react';
import { sentinelClassOf, type SentinelEvent } from '@sentinel-nvr/web/api';
import type { SentinelClient } from '../api';
import { useT, useLocale } from '../../i18n/useT';
import { fmtDay, fmtTimeSec } from '../format';
import { EventBadges, eventLabel } from './ClassBadge';

export function EventList({ client, camId, events, filterOff, onPick }: {
  client: SentinelClient; camId: string; events: SentinelEvent[]; filterOff: Record<string, boolean>; onPick: (ev: SentinelEvent) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const evs = events.filter((e) => !filterOff[sentinelClassOf(e)]).slice().sort((a, b) => b.timestamp - a.timestamp);
  if (!evs.length) return <p className="nvr-muted nvr-evlist__empty">{t('nvr.events.none')}</p>;
  let lastDay = '';
  return (
    <div className="nvr-evlist">
      {evs.map((ev) => {
        const d = new Date(ev.timestamp).toDateString();
        const head = d !== lastDay;
        lastDay = d;
        return (
          <Fragment key={ev.id}>
            {head && <div className="nvr-evlist__day data-font">{fmtDay(ev.timestamp, locale)}</div>}
            <button type="button" className="nvr-evrow" onClick={() => onPick(ev)}>
              <img className="nvr-evrow__img" src={client.eventThumbUrl(camId, ev.timestamp)} alt="" loading="lazy" />
              <span className="nvr-evrow__text">
                <span className="nvr-evrow__cls"><EventBadges ev={ev} size={16} t={t} /> {eventLabel(t, ev)}</span>
                <span className="nvr-evrow__t data-font">{fmtTimeSec(ev.timestamp, locale)}</span>
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
