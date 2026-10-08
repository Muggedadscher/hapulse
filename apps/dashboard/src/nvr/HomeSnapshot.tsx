/**
 * [fork] A camera snapshot on the Home NVR card (NvrHomeCard, and its Glas body NvrHomeGlas): the live snapshot, else
 * the newest segment thumbnail, else a camera symbol. The loaded snapshot is also the camera page's poster (drawn at
 * once instead of a grey stage) — crossOrigin keeps the poster canvas untainted, the plugin answers with ACAO *.
 */

import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { rememberTileSnapshot } from '@sentinel-nvr/web/ui';

export function HomeSnapshot({ camId, src, fallback }: { camId: string; src: string; fallback: string | null }) {
  const [failed, setFailed] = useState(0);
  const url = failed === 0 ? src : failed === 1 && fallback ? fallback : null;
  return url ? (
    <img
      className="nvr-home__cam-img"
      src={url}
      alt=""
      crossOrigin="anonymous"
      onLoad={(e) => { if (failed === 0) rememberTileSnapshot(camId, e.currentTarget); }}
      onError={() => setFailed((f) => Math.min(2, f + 1))}
    />
  ) : (
    <span className="nvr-home__cam-img nvr-home__cam-ph" aria-hidden="true"><Camera size={22} strokeWidth={1.5} /></span>
  );
}
