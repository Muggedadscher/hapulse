/**
 * [fork] The refresh of camera snapshots on the NVR tiles of the Home card and, in Glas, the NVR page (NvrHomeGlas):
 * `tick` changes every `ms` while the page is visible (a new snapshot URL), `retry` every 30 s — a tile whose snapshot
 * failed (a camera offline, the plugin restarting) tries it again then, as the package's tiles do.
 */

import { useEffect, useState } from 'react';

const RETRY_MS = 30_000;

export function useSnapshotTick(ms: number): { tick: number; retry: number } {
  const [tick, setTick] = useState(() => Date.now());
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setTick(Date.now());
      setCount((n) => n + 1);
    }, ms);
    return () => clearInterval(id);
  }, [ms]);
  return { tick, retry: Math.floor((count * ms) / RETRY_MS) };
}
