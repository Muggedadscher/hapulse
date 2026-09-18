/**
 * [fork] Home overview card "Sentinel NVR": camera snapshots (tap → timeline)
 * and the latest events (tap → timeline at the event). Rendered only when the
 * NVR is configured (Home gates the section on `useNvrConfigured()`).
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Cctv, ChevronRight, Camera, WifiOff } from 'lucide-react';
import { sentinelEventPlayTs } from '@sentinel-nvr/web/api';
import { Card } from '../components/ui/Card';
import { useT, useLocale } from '../i18n/useT';
import { useNvrOverview } from './store';
import { fmtTime, fmtRelative } from './format';
import { EventBadges, eventLabel } from './components/ClassBadge';
import { cameraPath, NVR_ROOT } from './paths';
import './nvr.css';

const SNAPSHOT_MS = 10_000;
const MAX_EVENTS = 4;

export function NvrHomeCard() {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const { cfg, status, cameras, recent, stats, errorStatus } = useNvrOverview(15_000);
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') setTick(Date.now()); }, SNAPSHOT_MS);
    return () => clearInterval(id);
  }, []);
  if (!cfg) return null;
  const client = cfg.client;
  const offline = cameras.filter((c) => c.recording && !c.online).length;
  const events = recent.slice(0, MAX_EVENTS);

  return (
    <Card className="nvr-home">
      <div className="nvr-home__header">
        <div className="nvr-home__title-row">
          <span className={`nvr-home__chip${offline ? ' nvr-home__chip--danger' : ''}`} aria-hidden="true">
            <Cctv size={16} strokeWidth={1.75} />
          </span>
          <span className="nvr-home__title">{t('nvr.home.title')}</span>
        </div>
        <button type="button" className="nvr-home__link" onClick={() => navigate(NVR_ROOT)}>
          {t('nvr.home.viewAll')}
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      {status === 'error' ? (
        <p className="nvr-muted nvr-home__error"><WifiOff size={14} strokeWidth={2} />{errorStatus === 401 ? t('nvr.error.unauthorized') : t('nvr.error.unreachable')}</p>
      ) : (
        <>
          <div className="nvr-home__meta">
            <span>{t('nvr.hero.eventsToday')}: <b className="data-font">{stats?.eventsToday ?? '–'}</b></span>
            <span className={offline ? 'nvr-home__meta--danger' : ''}>
              {offline ? t('nvr.hero.offline', { count: offline }) : t('nvr.cameras.count', { count: cameras.length })}
            </span>
          </div>
          {cameras.length > 0 && (
            <div className="nvr-home__cams">
              {cameras.map((c) => (
                <button key={c.id} type="button" className="nvr-home__cam" onClick={() => navigate(cameraPath(c.id))} aria-label={c.name}>
                  <HomeSnapshot src={client.snapshotUrl(c.id, tick)} fallback={c.latestThumbId ? client.segmentThumbUrl(c.latestThumbId) : null} />
                  <span className="nvr-home__cam-name">
                    {c.name}
                    {c.recording && <i className={`nvr-camtile__dot${c.online ? '' : ' nvr-camtile__dot--off'}`} aria-hidden="true" />}
                  </span>
                </button>
              ))}
            </div>
          )}
          {events.length > 0 && (
            <ul className="nvr-home__events">
              {events.map((e) => (
                <li key={`${e.camera}-${e.ts}`}>
                  <button type="button" className="nvr-home__ev" onClick={() => navigate(cameraPath(e.camera, sentinelEventPlayTs(e), e.ts))}>
                    <img className="nvr-home__ev-img" src={client.eventThumbUrl(e.camera, e.ts)} alt="" loading="lazy" />
                    <span className="nvr-home__ev-text">
                      <span className="nvr-home__ev-cls"><EventBadges ev={e} size={16} t={t} /> {eventLabel(t, e)}</span>
                      <span className="nvr-home__ev-sub">{e.cameraName} · {fmtRelative(e.ts, t)}</span>
                    </span>
                    <span className="nvr-home__ev-time data-font">{fmtTime(e.ts, locale)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

function HomeSnapshot({ src, fallback }: { src: string; fallback: string | null }) {
  const [failed, setFailed] = useState(0);
  const url = failed === 0 ? src : failed === 1 && fallback ? fallback : null;
  return url ? (
    <img className="nvr-home__cam-img" src={url} alt="" onError={() => setFailed((f) => Math.min(2, f + 1))} />
  ) : (
    <span className="nvr-home__cam-img nvr-home__cam-ph" aria-hidden="true"><Camera size={22} strokeWidth={1.5} /></span>
  );
}
