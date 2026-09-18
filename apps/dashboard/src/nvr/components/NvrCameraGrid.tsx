/**
 * [fork] Camera grid (Scrypted's "CAMERAS"): 16:9 tiles with a fresh snapshot
 * every 5 s, name + recording dot, events-today / last-event meta. Falls back
 * to the newest segment thumbnail when the snapshot fails, then to a
 * placeholder. Tapping opens the camera's timeline (live).
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Camera, WifiOff } from 'lucide-react';
import type { SentinelCamera } from '@sentinel-nvr/web/api';
import type { SentinelClient } from '../api';
import { Card } from '../../components/ui/Card';
import { useT } from '../../i18n/useT';
import { fmtRelative } from '../format';
import { cameraPath } from '../paths';

const SNAPSHOT_MS = 5000;

function CameraTile({ client, cam, tick }: { client: SentinelClient; cam: SentinelCamera; tick: number }) {
  const t = useT();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(0); // 0 ok · 1 snapshot failed · 2 thumb failed
  useEffect(() => { setFailed(0); }, [client]);

  const src = failed === 0
    ? client.snapshotUrl(cam.id, tick)
    : failed === 1 && cam.latestThumbId
      ? client.segmentThumbUrl(cam.latestThumbId)
      : null;

  const open = () => navigate(cameraPath(cam.id));
  const meta = [
    t('nvr.cameras.eventsToday', { count: cam.eventsToday }),
    cam.lastEventTs ? fmtRelative(cam.lastEventTs, t) : null,
  ].filter(Boolean).join(' · ');

  return (
    <Card
      className="nvr-camtile"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
      aria-label={cam.name}
    >
      {src ? (
        <img
          className="nvr-camtile__img"
          src={src}
          alt=""
          onError={() => setFailed((f) => Math.min(2, f + 1))}
        />
      ) : (
        <div className="nvr-camtile__placeholder" aria-hidden="true">
          <Camera size={32} strokeWidth={1.5} />
        </div>
      )}
      <span className="nvr-camtile__name">
        {cam.name}
        {cam.recording && <i className={`nvr-camtile__dot${cam.online ? '' : ' nvr-camtile__dot--off'}`} aria-hidden="true" />}
      </span>
      {cam.recording && !cam.online && (
        <span className="nvr-camtile__offline">
          <WifiOff size={12} strokeWidth={2.25} />
          {t('nvr.cameras.offline')}
        </span>
      )}
      <span className="nvr-camtile__meta data-font">{meta}</span>
    </Card>
  );
}

/** The tile grid alone (shared with the Security page section). */
export function NvrCameraTiles({ client, cameras }: { client: SentinelClient; cameras: SentinelCamera[] }) {
  const t = useT();
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') setTick(Date.now()); }, SNAPSHOT_MS);
    return () => clearInterval(id);
  }, []);
  if (cameras.length === 0) return <p className="nvr-muted">{t('nvr.cameras.none')}</p>;
  return (
    <div className="nvr-camgrid">
      {cameras.map((c) => <CameraTile key={c.id} client={client} cam={c} tick={tick} />)}
    </div>
  );
}

export function NvrCameraGrid({ client, cameras }: { client: SentinelClient; cameras: SentinelCamera[] }) {
  const t = useT();
  return (
    <section className="nvr-section">
      <h2 className="section-label nvr-section__label">{t('nvr.cameras.title')}</h2>
      <NvrCameraTiles client={client} cameras={cameras} />
    </section>
  );
}
