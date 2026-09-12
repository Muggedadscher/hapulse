/**
 * [fork] NVR overview (`/nvr`) — Sentinel's home + status pages merged into one
 * HAPulse page: hero summary, recent-events strip, camera grid, and the two
 * detail cards (events per hour, storage & retention). Fixed layout (not
 * editable — deliberately lean for upstream merges, like the Pool page).
 */

import React, { useState } from 'react';
import { Cctv, ExternalLink, RefreshCw, Settings2, WifiOff } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { IconButton } from '../components/ui/IconButton';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { useT } from '../i18n/useT';
import { useNvrOverview } from './store';
import { NvrSetupCard, NvrSetupModal } from './components/NvrSetup';
import { NvrHero } from './components/NvrHero';
import { NvrEventsStrip } from './components/NvrEventsStrip';
import { NvrCameraGrid } from './components/NvrCameraGrid';
import { NvrHistogramCard, NvrStorageCard } from './components/NvrStatsCards';
import './nvr.css';

export function NvrOverviewPage() {
  const t = useT();
  const { cfg, status, cameras, recent, stats, histogram, errorStatus, refresh } = useNvrOverview(10_000);
  const [setupOpen, setSetupOpen] = useState(false);

  const errorText = errorStatus === 401
    ? t('nvr.error.unauthorized')
    : errorStatus ? t('nvr.error.http', { status: errorStatus }) : t('nvr.error.unreachable');

  return (
    <div className="page nvr-page stagger-rise">
      <div className="page__header-row">
        <h1 className="page__title">{t('nvr.title')}</h1>
        <div className="nvr-actions">
          {cfg && (
            <>
              <a className="btn btn--ghost nvr-actions__btn" href={cfg.client.entryUrl} target="_blank" rel="noreferrer noopener">
                <ExternalLink size={16} strokeWidth={1.75} />
                <span className="nvr-actions__label">{t('nvr.open')}</span>
              </a>
              <IconButton label={t('nvr.setup.modalTitle')} variant="ghost" size={40} onClick={() => setSetupOpen(true)}>
                <Settings2 size={18} strokeWidth={1.75} />
              </IconButton>
            </>
          )}
          <PageHeaderActions />
        </div>
      </div>

      {!cfg ? (
        <NvrSetupCard />
      ) : status === 'error' ? (
        <EmptyState
          icon={<WifiOff size={28} strokeWidth={1.75} />}
          title={t('nvr.error.title')}
          description={errorText}
          action={(
            <div className="nvr-setup__actions">
              <button type="button" className="btn btn--ghost" onClick={() => void refresh(cfg.client)}>
                <RefreshCw size={16} strokeWidth={1.75} />{t('nvr.error.retry')}
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setSetupOpen(true)}>
                <Settings2 size={16} strokeWidth={1.75} />{t('nvr.setup.modalTitle')}
              </button>
            </div>
          )}
        />
      ) : !stats ? (
        <EmptyState icon={<Cctv size={28} strokeWidth={1.75} />} title={t('nvr.loading')} />
      ) : (
        <div className="nvr-layout">
          {errorStatus != null && (
            <p className="nvr-banner" role="status"><WifiOff size={14} strokeWidth={2} />{t('nvr.error.stale')}</p>
          )}
          <NvrHero cameras={cameras} stats={stats} />
          <NvrEventsStrip client={cfg.client} events={recent} />
          <NvrCameraGrid client={cfg.client} cameras={cameras} />
          <div className="nvr-grid">
            <NvrHistogramCard histogram={histogram} />
            <NvrStorageCard stats={stats} />
          </div>
        </div>
      )}

      <NvrSetupModal open={setupOpen} onClose={() => setSetupOpen(false)} />
    </div>
  );
}
