/**
 * [fork] Security page section "Sentinel NVR": the NVR's camera tiles (live
 * snapshots, tap → timeline) plus the recent-events strip, next to Home
 * Assistant's own camera grid. Section id `nvr` (reorder / hide / resize like
 * the other Security sections); Security shows it only when the NVR is
 * configured (`useNvrConfigured`).
 */

import React from 'react';
import { useNavigate } from 'react-router';
import { Cctv, ChevronRight, WifiOff } from 'lucide-react';
import { useT } from '../i18n/useT';
import { useNvrOverview } from './store';
import { NvrCameraTiles } from './components/NvrCameraGrid';
import { NvrEventsStrip } from './components/NvrEventsStrip';
import { NVR_ROOT } from './paths';
import './nvr.css';

export function NvrSecuritySection() {
  const t = useT();
  const navigate = useNavigate();
  const { cfg, status, cameras, recent, stats, errorStatus } = useNvrOverview(10_000);
  if (!cfg) return null;
  const offline = cameras.filter((c) => c.recording && !c.online).length;

  return (
    <div className="nvr-sec nvr-page">
      <div className="nvr-sec__head">
        <div className="nvr-home__title-row">
          <span className={`nvr-home__chip${offline ? ' nvr-home__chip--danger' : ''}`} aria-hidden="true">
            <Cctv size={16} strokeWidth={1.75} />
          </span>
          <span className="nvr-home__title">{t('nvr.home.title')}</span>
          {stats && (
            <span className="nvr-sec__meta">
              {t('nvr.hero.eventsToday')}: <b className="data-font">{stats.eventsToday}</b>
              {offline > 0 && <> · <span className="nvr-home__meta--danger">{t('nvr.hero.offline', { count: offline })}</span></>}
            </span>
          )}
        </div>
        <button type="button" className="nvr-home__link" onClick={() => navigate(NVR_ROOT)}>
          {t('nvr.home.viewAll')}
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      {status === 'error' ? (
        <p className="nvr-muted"><WifiOff size={14} strokeWidth={2} />{errorStatus === 401 ? t('nvr.error.unauthorized') : t('nvr.error.unreachable')}</p>
      ) : (
        <>
          <NvrCameraTiles client={cfg.client} cameras={cameras} />
          <NvrEventsStrip client={cfg.client} events={recent.slice(0, 20)} />
        </>
      )}
    </div>
  );
}
