/**
 * [fork] A camera snapshot on the Home NVR card (NvrHomeCard, and its Glas body NvrHomeGlas): the live snapshot, else
 * the newest segment thumbnail, else a camera symbol. The loaded snapshot is also the camera page's poster (drawn at
 * once instead of a grey stage) — crossOrigin keeps the poster canvas untainted, the plugin answers with ACAO *.
 *
 * The picture sits in one box (`.nvr-home__cam-pic`), like the package's tiles from 0.19.2: back on the card (the
 * snapshot is `no-store`, a new image loads again) the box shows the camera's last picture at once (a canvas,
 * `.nvr-home__cam-img--last`, drawn by the package from the image a tile remembered or its copy), until its own snapshot
 * is decoded — and in Glas the camera page's picture lands in that box (app/glas/glasNavigate.ts).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { drawLastTileSnapshot, hasLastTileSnapshot, rememberTileSnapshot } from '@sentinel-nvr/web/ui';

export function HomeSnapshot({ camId, src, fallback, retry = 0 }: {
  camId: string;
  src: string;
  fallback: string | null;
  /** Changes when a failed snapshot is to be tried again (useSnapshotTick). */
  retry?: number;
}) {
  const [failed, setFailed] = useState(0);
  // a failed snapshot is tried again in the background: the tile keeps its fallback (or symbol) and switches back to
  // the snapshot only once one has loaded — no broken picture in between
  const now = useRef({ failed, src });
  now.current = { failed, src };
  useEffect(() => {
    if (now.current.failed === 0) return;
    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = () => setFailed(0);
    probe.src = now.current.src;
    return () => {
      probe.onload = null;
    };
  }, [retry]);
  const [last, setLast] = useState(() => hasLastTileSnapshot(camId));
  const drawLast = useCallback((canvas: HTMLCanvasElement | null) => void (canvas && drawLastTileSnapshot(camId, canvas)), [camId]);
  const url = failed === 0 ? src : failed === 1 && fallback ? fallback : null;
  return url ? (
    <span className="nvr-home__cam-pic">
      {last && <canvas className="nvr-home__cam-img nvr-home__cam-img--last" ref={drawLast} aria-hidden="true" />}
      <img
        className="nvr-home__cam-img"
        src={url}
        alt=""
        crossOrigin="anonymous"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (failed === 0) rememberTileSnapshot(camId, img);
          if (!last) return;
          // the last picture goes once this one can be shown without a gap
          const drop = () => setLast(false);
          if (typeof img.decode === 'function') img.decode().then(drop, drop);
          else drop();
        }}
        onError={() => {
          // the placeholder comes next: the last picture goes with it
          if (failed > 0 || !fallback) setLast(false);
          setFailed((f) => Math.min(2, f + 1));
        }}
      />
    </span>
  ) : (
    <span className="nvr-home__cam-img nvr-home__cam-ph" aria-hidden="true"><Camera size={22} strokeWidth={1.5} /></span>
  );
}
