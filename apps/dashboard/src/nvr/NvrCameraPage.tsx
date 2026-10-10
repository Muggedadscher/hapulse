/**
 * [fork] Camera timeline page (`/nvr/:cameraId`) — the shared `CameraPage` from
 * @sentinel-nvr/web/ui (ONE implementation for HAPulse and the plugin's own UI).
 * This host adds routing, the header row (back + name, "open in Sentinel",
 * page actions) and its Modal around the date picker.
 *
 * Deep link: `?at=<ms>&ev=<eventTs>` (from the events strip / Home card)
 * starts playback at `at` with the event frame as poster.
 *
 * Glas (docs/glas/PLAN-ETAPPE-6.md K101–K104, E13): the package's immersive appearance. The page says it is shown
 * (`useGlasImmersive`): on the phone the frame goes and the page owns the screen, the content column turns dark
 * (AppLayout). The header carries the name with LIVE or the picture's time and "open in Sentinel" as a round button;
 * no bell or avatar there. Klassisch renders the page as before.
 */

import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ExternalLink } from 'lucide-react';
import { sentinelTimelineLink } from '@sentinel-nvr/web/api';
import { CameraPage, CameraTitle } from '@sentinel-nvr/web/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { useT } from '../i18n/useT';
import { useNvrOverview } from './store';
import { DatePickerModal } from './components/DatePickerModal';
import { NvrUi } from './ui';
import { NVR_ROOT } from './paths';
import { useFitAboveTabs } from './useFitAboveTabs';
import { useIsGlas } from '../app/glas/useUiStyle';
import { useGlasImmersive } from '../app/glas/useGlasImmersive';
import './nvr.css';

/** Build id from vite.config.ts (`define`); undefined outside a vite build (vitest). */
declare const __HAPULSE_BUILD__: string | undefined;
// telemetry lines stay distinguishable from Sentinel's own UI and carry the build, so a report from a phone can be
// matched to the deployed commit (Sentinel's own UI sends its deploy stamp the same way)
const TELEMETRY_BRAND = `hapulse-${typeof __HAPULSE_BUILD__ !== 'undefined' ? __HAPULSE_BUILD__ : 'dev'}`;

// one element for every render: the header below re-renders with the playback position (~4×/s while playing) — the
// same element reference lets React skip the bell/avatar cluster then
const HEADER_ACTIONS = <PageHeaderActions />;

export function NvrCameraPage() {
  const t = useT();
  const navigate = useNavigate();
  const { cameraId: camId = '' } = useParams();
  const [q] = useSearchParams();
  const { cfg, cameras, stats } = useNvrOverview(30_000);
  const glas = useIsGlas();
  const cam = cameras.find((c) => c.id === camId);
  const name = cam?.name || camId;
  const startAt = q.get('at') ? Number(q.get('at')) : 0;
  const posterTs = q.get('ev') ? Number(q.get('ev')) : 0;
  // phones: the body ends above the tab bar (HAPulse's summary chips sit above the page, see useFitAboveTabs); Glas
  // has neither on this page — the package's immersive body is the screen
  const [pageEl, setPageEl] = React.useState<HTMLDivElement | null>(null);
  useFitAboveTabs(glas ? null : pageEl);
  // Glas: the frame goes while the camera page is shown (not for the empty state without a connection)
  useGlasImmersive(glas && !!cfg);

  if (!cfg) {
    return (
      <div className="page nvr-page">
        <EmptyState title={t('nvr.setup.title')} description={t('nvr.setup.desc')} action={<button type="button" className="btn btn--primary" onClick={() => navigate(NVR_ROOT)}>{t('nvr.back')}</button>} />
      </div>
    );
  }

  // "open in Sentinel" continues at the moment on screen (the page passes the playback position; live = none)
  const openLink = (at: number | undefined) => sentinelTimelineLink(cfg.origin, camId, at);
  return (
    <NvrUi client={cfg.client}>
      <div className="page nvr-page" ref={setPageEl}>
        <CameraPage
          camId={camId} name={name} earliest={stats?.earliest} startAt={startAt} posterTs={posterTs}
          storagePrefix="hapulse-nvr-ar-" // keep the aspect cache key this install already uses
          brand={TELEMETRY_BRAND}
          crossOrigin
          appearance={glas ? 'immersive' : 'default'}
          header={(at, info) => glas ? (
            <CameraTitle name={name} onBack={() => navigate(NVR_ROOT)} live={info.live} at={at}>
              <a className="nvr-iconbtn" href={openLink(at)} target="_blank" rel="noreferrer noopener" aria-label={t('nvr.open')} title={t('nvr.open')}>
                <ExternalLink size={20} strokeWidth={1.75} aria-hidden="true" />
              </a>
            </CameraTitle>
          ) : (
            <CameraTitle name={name} onBack={() => navigate(NVR_ROOT)}>
              <a className="btn btn--ghost nvr-actions__btn" href={openLink(at)} target="_blank" rel="noreferrer noopener" aria-label={t('nvr.open')} title={t('nvr.open')}>
                <ExternalLink size={16} strokeWidth={1.75} />
                <span className="nvr-actions__label">{t('nvr.open')}</span>
              </a>
              {HEADER_ACTIONS}
            </CameraTitle>
          )}
          renderDatePicker={(req) => <DatePickerModal open dayStart={req.dayStart} timeTs={req.timeTs} oldestAllowed={req.oldestAllowed} onGo={req.onGo} onClose={req.onClose} />}
          externalUrl={openLink}          // PiP refused in an iPhone Home-Screen app → "open in Safari" (Sentinel, no token, same moment)
        />
      </div>
    </NvrUi>
  );
}
