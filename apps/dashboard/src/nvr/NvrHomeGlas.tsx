/**
 * [fork] The Home NVR card's body in Glas (docs/GLAS-DESIGN.md §7.15, plan docs/glas/PLAN-ETAPPE-4.md K83).
 * Per camera a large snapshot: on the phone 220 high with a clear capsule on top (recording dot, name, state) and
 * today's events at the bottom; from 900 px a 16:10 tile with name, state badge and today's events. Several cameras
 * sit side by side (phone: to swipe). Then the latest events — on the phone a strip to the screen edge, from 900 px
 * rows beside the tile — each opens the camera at that moment. Data, refresh and targets are the classic body's in
 * NvrHomeCard; the recording state reads as on the classic tiles (dot only while recording is on, offline and stalled
 * named). A tile opens its camera with the picture growing into the camera page, and the camera page's back shrinks it
 * into the tile again (`data-nvr-camera`, plan docs/glas/PLAN-ETAPPE-7.md K107). Looks in styles/glas/nvr.css.
 *
 * The two halves (`NvrGlasCameras`, `NvrGlasEvents`) are also the NVR page's camera and event sections in Glas
 * (NvrOverviewPage, `.g-nvr-page`): the page takes the card's look, with all cameras and all recent events.
 */

import React from 'react';
import { useNavigate } from 'react-router';
import { fmtDayPrefix, sentinelEventPlayTs, sentinelRecordingState } from '@sentinel-nvr/web/api';
import type { SentinelCamera, SentinelRecentEvent } from '@sentinel-nvr/web/api';
import { eventLabel, tileSnapshotWidth } from '@sentinel-nvr/web/ui';
import type { SentinelClient } from './api';
import { useLocale, useT } from '../i18n/useT';
import { useNvrT } from './ui';
import { fmtRelative, fmtTime } from './format';
import { cameraPath } from './paths';
import { HomeSnapshot } from './HomeSnapshot';
import { glasOpenCamera } from '../app/glas/glasNavigate';

interface NvrGlasCamerasProps {
  client: SentinelClient;
  cameras: SentinelCamera[];
  /** Snapshot refresh stamp and retry counter (useSnapshotTick). */
  tick: number;
  retry: number;
  /** No answer from the NVR yet: an empty tile instead of "no cameras". */
  loading?: boolean;
}

/** The cameras: per camera its snapshot tile, opening the camera page with the picture growing into it. */
export function NvrGlasCameras({ client, cameras, tick, retry, loading = false }: NvrGlasCamerasProps) {
  const t = useT();
  const navigate = useNavigate();
  if (cameras.length === 0) {
    return loading ? (
      <div className="g-nvr__cams" aria-hidden="true">
        <div className="g-nvr__wait" />
      </div>
    ) : (
      <p className="g-nvr__empty">{t('nvr.cameras.none')}</p>
    );
  }
  return (
    <div className="g-nvr__cams" role="list" aria-label={t('nvr.cameras.title')} data-several={cameras.length > 1 ? '' : undefined}>
      {cameras.map((c) => {
        const rec = sentinelRecordingState(c);
        const state =
          rec === 'ok'
            ? t('glas.nvr.live')
            : rec === 'offline'
              ? t('nvr.cameras.offline')
              : rec === 'stalled'
                ? t('nvr.cameras.stalled')
                : null;
        const today = [
          t('nvr.cameras.eventsToday', { count: c.eventsToday }),
          c.lastEventTs ? fmtRelative(c.lastEventTs, t) : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <div key={c.id} role="listitem" className="g-nvr__cam-item">
            <button
              type="button"
              className="g-nvr__cam"
              data-state={rec}
              data-nvr-camera={c.id}
              onClick={() => glasOpenCamera(navigate, cameraPath(c.id), true)}
              aria-label={[c.name, state, today].filter(Boolean).join(', ')}
            >
              <HomeSnapshot
                camId={c.id}
                src={client.snapshotUrl(c.id, tick, tileSnapshotWidth())}
                fallback={c.latestThumbId ? client.segmentThumbUrl(c.latestThumbId) : null}
                retry={retry}
              />
              <span className="g-nvr__shade" aria-hidden="true" />
              <span className="g-nvr__pill g-glass g-glass--clear" aria-hidden="true">
                {rec !== 'off' && <span className="g-nvr__dot" />}
                <span className="g-nvr__pill-text">{state ? `${c.name} · ${state}` : c.name}</span>
              </span>
              <span className="g-nvr__caption" aria-hidden="true">
                <span className="g-nvr__title">
                  <span className="g-nvr__name">{c.name}</span>
                  {state && <span className="g-nvr__badge">{rec === 'ok' ? t('nvr.live') : state}</span>}
                </span>
                <span className="g-nvr__today">{today}</span>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

interface NvrGlasEventsProps {
  client: SentinelClient;
  events: SentinelRecentEvent[];
  /** Name the camera of each event (more than one camera). */
  several: boolean;
}

/** The latest events: picture, time (before today with its day, "gestern 22:10"), classes and camera; each opens the
 *  camera at that moment. */
export function NvrGlasEvents({ client, events, several }: NvrGlasEventsProps) {
  const t = useT();
  const ut = useNvrT();
  const locale = useLocale();
  const navigate = useNavigate();
  if (events.length === 0) return null;
  const now = Date.now();
  return (
    <ul className="g-nvr__events" aria-label={t('nvr.events.title')}>
      {events.map((e) => {
        const day = fmtDayPrefix(e.ts, locale, now);
        const time = fmtTime(e.ts, locale);
        return (
          <li key={`${e.camera}-${e.ts}`} className="g-nvr__ev-item">
            <button
              type="button"
              className="g-nvr__ev"
              onClick={() => glasOpenCamera(navigate, cameraPath(e.camera, sentinelEventPlayTs(e), e.ts), false)}
            >
              <img className="g-nvr__ev-img" src={client.eventThumbUrl(e.camera, e.ts)} alt="" loading="lazy" />
              <span className="g-nvr__ev-text">
                <span className="g-nvr__ev-time">
                  {day && <span className="g-nvr__ev-day">{day} </span>}
                  {time}
                </span>
                <span className="g-nvr__ev-sub">
                  {eventLabel(ut, e)}
                  {several && ` · ${e.cameraName}`}
                  <span className="g-nvr__ev-ago"> · {fmtRelative(e.ts, t)}</span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface NvrHomeGlasProps {
  client: SentinelClient;
  cameras: SentinelCamera[];
  events: SentinelRecentEvent[];
  /** Snapshot refresh stamp and retry counter (NvrHomeCard, every 10 s while visible). */
  tick: number;
  retry: number;
  /** No answer from the NVR yet: an empty tile instead of "no cameras". */
  loading: boolean;
}

export function NvrHomeGlas({ client, cameras, events, tick, retry, loading }: NvrHomeGlasProps) {
  return (
    <div className="g-nvr">
      <NvrGlasCameras client={client} cameras={cameras} tick={tick} retry={retry} loading={loading} />
      <NvrGlasEvents client={client} events={events} several={cameras.length > 1} />
    </div>
  );
}
