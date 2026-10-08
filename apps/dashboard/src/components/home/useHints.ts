/**
 * [fork] Home hints (docs/GLAS-PLAN.md §2.11, docs/glas/PLAN-ETAPPE-4.md K76): collects the inputs — the entities
 * without the hidden ones, the waste bins, the Sentinel cameras that should record but don't (only while Sentinel is
 * the camera source) — and asks core's `collectHints`. A door that is not yet open long enough re-evaluates itself
 * when it gets there, a bin's "today"/"tomorrow" at local midnight.
 */

import { useEffect, useMemo, useState } from 'react';
import { collectHints, detectWasteBins } from '@hapulse/core';
import type { Hint } from '@hapulse/core';
import { sentinelRecordingState } from '@sentinel-nvr/web/api';
import { useCustomization, useEntityMap } from '../../ha/hooks';
import { useSentinelCameras } from '../../nvr/cameraSource';

export interface HomeHints {
  hints: Hint[];
  /** Names of the cameras that do not record (the camera hint's second line). */
  cameraNames: string[];
}

export function useHints(): HomeHints {
  const entities = useEntityMap();
  const { hiddenEntities } = useCustomization();
  const sentinel = useSentinelCameras();
  // the time of the last scheduled re-evaluation; the time itself is read fresh on every run
  const [now, setNow] = useState(() => Date.now());

  // Offline or stalled; a camera whose recording is switched off is not a deviation.
  const notRecording = useMemo(
    () =>
      sentinel
        ? sentinel.cameras
            .filter((c) => {
              const s = sentinelRecordingState(c);
              return s === 'offline' || s === 'stalled';
            })
            .map((c) => c.name)
        : [],
    [sentinel],
  );
  const camerasKey = notRecording.join('\n');

  const result = useMemo(() => {
    const at = Math.max(now, Date.now());
    const waste = detectWasteBins(entities, { hidden: hiddenEntities, nowMs: at });
    const r = collectHints(Object.values(entities), {
      now: at,
      hidden: hiddenEntities,
      waste,
      camerasNotRecording: camerasKey ? camerasKey.split('\n').length : 0,
    });
    // a bin's day moves at local midnight, also without an entity update (a sensor without its own `daysTo`)
    const midnight = waste.length > 0 ? new Date(at).setHours(24, 0, 0, 0) : null;
    const recheckAt = r.recheckAt === null ? midnight : midnight === null ? r.recheckAt : Math.min(r.recheckAt, midnight);
    return { hints: r.hints, recheckAt };
  }, [entities, hiddenEntities, now, camerasKey]);

  useEffect(() => {
    if (result.recheckAt === null) return undefined;
    const id = setTimeout(() => setNow(Date.now()), Math.max(0, result.recheckAt - Date.now()) + 50);
    return () => clearTimeout(id);
  }, [result.recheckAt]);

  return useMemo(() => ({ hints: result.hints, cameraNames: camerasKey ? camerasKey.split('\n') : [] }), [result.hints, camerasKey]);
}
