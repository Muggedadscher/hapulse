/**
 * [fork] NVR overview (`/nvr`) — Sentinel's home + status pages merged into one
 * HAPulse page: hero summary, recent-events strip, camera grid, and the two
 * detail cards (events per hour, storage & retention). Fixed layout (not
 * editable — deliberately lean for upstream merges, like the Pool page).
 */

import React, { useState } from 'react';
import { Cctv, ExternalLink, MapPin, RefreshCw, Settings2, WifiOff } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { IconButton } from '../components/ui/IconButton';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { useT } from '../i18n/useT';
import { useNvrOverview } from './store';
import { NvrSetupCard, NvrSetupModal } from './components/NvrSetup';
import { NvrCameraRoomsModal } from './components/NvrCameraRoomsModal';
import { Hero, EventsStrip, CameraGrid, HistogramCard, StorageCard } from '@sentinel-nvr/web/ui';
import { NvrUi } from './ui';
import { useSettingsLocked } from '../ha/managedHooks';
import './nvr.css';

export function NvrOverviewPage() {
  const t = useT();
  const { cfg, status, cameras, recent, stats, histogram, errorStatus, refresh } = useNvrOverview(10_000);
  const [setupOpen, setSetupOpen] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  // Under global admin management only admins (re)configure Sentinel; the others use the shared access.
  const locked = useSettingsLocked();

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
              {!locked && (
                <IconButton label={t('cameraSource.rooms.title')} variant="ghost" size={40} onClick={() => setRoomsOpen(true)}>
                  <MapPin size={18} strokeWidth={1.75} />
                </IconButton>
              )}
              {!locked && (
                <IconButton label={t('nvr.setup.modalTitle')} variant="ghost" size={40} onClick={() => setSetupOpen(true)}>
                  <Settings2 size={18} strokeWidth={1.75} />
                </IconButton>
              )}
            </>
          )}
          <PageHeaderActions />
        </div>
      </div>

      {!cfg ? (
        locked
          ? <EmptyState icon={<Cctv size={28} strokeWidth={1.75} />} title={t('nvr.title')} description={t('globalSettings.nvr.notSetUp')} />
          : <NvrSetupCard />
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
              {!locked && (
                <button type="button" className="btn btn--primary" onClick={() => setSetupOpen(true)}>
                  <Settings2 size={16} strokeWidth={1.75} />{t('nvr.setup.modalTitle')}
                </button>
              )}
            </div>
          )}
        />
      ) : !stats ? (
        <EmptyState icon={<Cctv size={28} strokeWidth={1.75} />} title={t('nvr.loading')} />
      ) : (
        <NvrUi client={cfg.client}>
          <div className="nvr-layout">
            {errorStatus != null && (
              <p className="nvr-banner" role="status"><WifiOff size={14} strokeWidth={2} />{t('nvr.error.stale')}</p>
            )}
            <Hero cameras={cameras} stats={stats} />
            <EventsStrip events={recent} />
            <CameraGrid cameras={cameras} />
            <div className="nvr-grid">
              <HistogramCard histogram={histogram} />
              <StorageCard stats={stats} />
            </div>
          </div>
        </NvrUi>
      )}

      <NvrSetupModal open={setupOpen} onClose={() => setSetupOpen(false)} />
      {!locked && <NvrCameraRoomsModal open={roomsOpen} onClose={() => setRoomsOpen(false)} cameras={cameras} />}
    </div>
  );
}
