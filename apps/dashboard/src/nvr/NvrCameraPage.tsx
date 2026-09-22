/**
 * [fork] Camera timeline page (`/nvr/:cameraId`) — the shared `CameraPage` from
 * @sentinel-nvr/web/ui (ONE implementation for HAPulse and the plugin's own UI).
 * This host adds routing, the header row (back + name, "open in Sentinel",
 * page actions) and its Modal around the date picker.
 *
 * Deep link: `?at=<ms>&ev=<eventTs>` (from the events strip / Home card)
 * starts playback at `at` with the event frame as poster.
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
import './nvr.css';

export function NvrCameraPage() {
  const t = useT();
  const navigate = useNavigate();
  const { cameraId: camId = '' } = useParams();
  const [q] = useSearchParams();
  const { cfg, cameras, stats } = useNvrOverview(30_000);
  const cam = cameras.find((c) => c.id === camId);
  const name = cam?.name || camId;
  const startAt = q.get('at') ? Number(q.get('at')) : 0;
  const posterTs = q.get('ev') ? Number(q.get('ev')) : 0;

  if (!cfg) {
    return (
      <div className="page nvr-page">
        <EmptyState title={t('nvr.setup.title')} description={t('nvr.setup.desc')} action={<button type="button" className="btn btn--primary" onClick={() => navigate(NVR_ROOT)}>{t('nvr.back')}</button>} />
      </div>
    );
  }

  const openLink = sentinelTimelineLink(cfg.origin, camId);
  return (
    <NvrUi client={cfg.client}>
      <div className="page nvr-page">
        <CameraPage
          camId={camId} name={name} earliest={stats?.earliest} startAt={startAt} posterTs={posterTs}
          storagePrefix="hapulse-nvr-ar-" // keep the aspect cache key this install already uses
          brand="hapulse"                 // telemetry lines stay distinguishable from Sentinel's own UI
          crossOrigin
          header={
            <CameraTitle name={name} onBack={() => navigate(NVR_ROOT)}>
              <a className="btn btn--ghost nvr-actions__btn" href={openLink} target="_blank" rel="noreferrer noopener">
                <ExternalLink size={16} strokeWidth={1.75} />
                <span className="nvr-actions__label">{t('nvr.open')}</span>
              </a>
              <PageHeaderActions />
            </CameraTitle>
          }
          renderDatePicker={(req) => <DatePickerModal open dayStart={req.dayStart} timeTs={req.timeTs} oldestAllowed={req.oldestAllowed} onGo={req.onGo} onClose={req.onClose} />}
        />
      </div>
    </NvrUi>
  );
}
