/**
 * [fork] NVR overview (`/nvr`) — Sentinel's home + status pages merged into one
 * HAPulse page: hero summary, recent-events strip, camera grid, and the two
 * detail cards (events per hour, storage & retention). Fixed layout (not
 * editable — deliberately lean for upstream merges, like the Pool page).
 * In Glas the cameras and events take the Home card's look (NvrGlasCameras, NvrGlasEvents): the cameras first as
 * large pictures, the events beside them in a card from 900 px (beside once there is room), on the phone a strip.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Cctv, ExternalLink, MapPin, RefreshCw, Settings2, WifiOff, Zap } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { IconButton } from '../components/ui/IconButton';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { HeaderMenu } from '../components/glas/HeaderMenu';
import { useT } from '../i18n/useT';
import { useNvrOverview } from './store';
import type { SentinelClient } from './api';
import type { SentinelCamera, SentinelRecentEvent } from '@sentinel-nvr/web/api';
import { NvrSetupCard, NvrSetupModal } from './components/NvrSetup';
import { NvrCameraRoomsModal } from './components/NvrCameraRoomsModal';
import { Hero, EventsStrip, CameraGrid, HistogramCard, StorageCard } from '@sentinel-nvr/web/ui';
import { NvrUi } from './ui';
import { NvrHeroGlas } from './NvrHeroGlas';
import { NvrGlasCameras, NvrGlasEvents } from './NvrHomeGlas';
import { useSnapshotTick } from './useSnapshotTick';
import { useSettingsLocked } from '../ha/managedHooks';
import { useIsGlas } from '../app/glas/useUiStyle';
import './nvr.css';

export function NvrOverviewPage() {
  const t = useT();
  const { cfg, status, cameras, recent, stats, histogram, errorStatus, refresh } = useNvrOverview(10_000);
  const [setupOpen, setSetupOpen] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  // Under global admin management only admins (re)configure Sentinel; the others use the shared access.
  const locked = useSettingsLocked();
  const glas = useIsGlas();
  // Glas: the head's actions behind one "⋯" (plan docs/glas/PLAN-ETAPPE-7.md N2). A window opened from its menu gives
  // the focus back to the ⋯ (the menu item is gone by then); opened elsewhere (the error state), to what opened it.
  const menuButton = useRef<HTMLButtonElement>(null);
  const fromMenu = useRef(false);
  const toMenu = useCallback(() => (fromMenu.current ? menuButton.current : null), []);
  const openSetup = (viaMenu: boolean) => {
    fromMenu.current = viaMenu;
    setSetupOpen(true);
  };
  const openRooms = () => {
    fromMenu.current = true;
    setRoomsOpen(true);
  };

  const errorText = errorStatus === 401
    ? t('nvr.error.unauthorized')
    : errorStatus ? t('nvr.error.http', { status: errorStatus }) : t('nvr.error.unreachable');

  return (
    <div className="page nvr-page stagger-rise">
      <div className="page__header-row">
        <h1 className="page__title">{t('nvr.title')}</h1>
        <div className="nvr-actions">
          {cfg && glas && (
            <HeaderMenu
              label={t('glas.headerMenu.label')}
              buttonRef={menuButton}
              items={[
                { key: 'open', label: t('nvr.open'), icon: <ExternalLink size={20} strokeWidth={1.75} />, href: cfg.client.entryUrl },
                ...(locked ? [] : [
                  { key: 'rooms', label: t('glas.nvr.menu.rooms'), icon: <MapPin size={20} strokeWidth={1.75} />, onSelect: openRooms },
                  { key: 'setup', label: t('glas.nvr.menu.setup'), icon: <Settings2 size={20} strokeWidth={1.75} />, onSelect: () => openSetup(true) },
                ]),
              ]}
            />
          )}
          {cfg && !glas && (
            <>
              <a className="btn btn--ghost nvr-actions__btn" href={cfg.client.entryUrl} target="_blank" rel="noreferrer noopener" aria-label={t('nvr.open')} title={t('nvr.open')}>
                <ExternalLink size={16} strokeWidth={1.75} />
                <span className="nvr-actions__label">{t('nvr.open')}</span>
              </a>
              {!locked && (
                <IconButton label={t('cameraSource.rooms.title')} title={t('cameraSource.rooms.title')} variant="ghost" size={40} onClick={() => setRoomsOpen(true)}>
                  <MapPin size={18} strokeWidth={1.75} />
                </IconButton>
              )}
              {!locked && (
                <IconButton label={t('nvr.setup.modalTitle')} title={t('nvr.setup.modalTitle')} variant="ghost" size={40} onClick={() => setSetupOpen(true)}>
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
        // role="alert": screen readers announce the failed load (EmptyState itself is a plain upstream div)
        <div role="alert">
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
                  <button type="button" className="btn btn--primary" onClick={() => openSetup(false)}>
                    <Settings2 size={16} strokeWidth={1.75} />{t('nvr.setup.modalTitle')}
                  </button>
                )}
              </div>
            )}
          />
        </div>
      ) : !stats ? (
        <div role="status" aria-live="polite">
          <EmptyState icon={<Cctv size={28} strokeWidth={1.75} />} title={t('nvr.loading')} />
        </div>
      ) : (
        <NvrUi client={cfg.client}>
          <div className="nvr-layout">
            {errorStatus != null && (
              <p className="nvr-banner" role="status"><WifiOff size={14} strokeWidth={2} />{t('nvr.error.stale')}</p>
            )}
            {/* Glas: a calm hero like security and system (plan docs/glas/PLAN-ETAPPE-7.md N2) */}
            {glas ? <NvrHeroGlas cameras={cameras} stats={stats} /> : <Hero cameras={cameras} stats={stats} />}
            {/* Glas: the Home card's cameras and events (NvrGlasSections below) */}
            {glas ? (
              <NvrGlasSections client={cfg.client} cameras={cameras} recent={recent} />
            ) : (
              <>
                <EventsStrip events={recent} />
                <CameraGrid cameras={cameras} />
              </>
            )}
            <div className="nvr-grid">
              <HistogramCard histogram={histogram} />
              <StorageCard stats={stats} />
            </div>
          </div>
        </NvrUi>
      )}

      <NvrSetupModal open={setupOpen} onClose={() => setSetupOpen(false)} returnFocus={glas ? toMenu : undefined} />
      {!locked && <NvrCameraRoomsModal open={roomsOpen} onClose={() => setRoomsOpen(false)} cameras={cameras} returnFocus={glas ? toMenu : undefined} />}
    </div>
  );
}

/** Glas: the cameras first, then the events, both as on the Home card; the section titles carry their symbol (plan E7
 *  N2). The tiles refresh like the package's (CameraGrid, every 5 s). Looks in styles/glas/nvr.css (`.g-nvr-page`). */
function NvrGlasSections({ client, cameras, recent }: {
  client: SentinelClient;
  cameras: SentinelCamera[];
  recent: SentinelRecentEvent[];
}) {
  const t = useT();
  const { tick, retry } = useSnapshotTick(5_000);
  return (
    <div className="g-nvr-page">
      <section className="nvr-section g-nvr-page__cams">
        <h2 className="nvr-section__label">
          <span className="nvr-section__icon" aria-hidden="true"><Cctv size={18} strokeWidth={2} /></span>
          {t('nvr.cameras.title')}
        </h2>
        <NvrGlasCameras client={client} cameras={cameras} tick={tick} retry={retry} />
      </section>
      {recent.length > 0 && (
        <section className="nvr-section g-nvr-page__events">
          <h2 className="nvr-section__label">
            <span className="nvr-section__icon" aria-hidden="true"><Zap size={18} strokeWidth={2} /></span>
            {t('nvr.events.title')}
          </h2>
          <div className="g-nvr-page__list">
            <NvrGlasEvents client={client} events={recent} several={cameras.length > 1} />
          </div>
        </section>
      )}
    </div>
  );
}
