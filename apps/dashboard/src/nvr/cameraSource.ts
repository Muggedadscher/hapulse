/**
 * [fork] Where HAPulse takes cameras from. As soon as Sentinel NVR is usable (URL + token),
 * EVERYTHING camera-related comes from Sentinel: Home Assistant's `camera.*` entities are
 * left out everywhere (Security, Home counter, rooms, favorites, devices, detail modal).
 *
 * The decision follows the configuration, not whether Sentinel answers right now — an
 * offline NVR shows its offline state instead of flipping back to the HA cameras.
 */

import { useShallow } from 'zustand/react/shallow';
import type { SentinelCamera } from '@sentinel-nvr/web/api';
import { useSettingsStore } from '../stores/settingsStore';
import { nvrUsable, useNvrConfig } from './config';
import type { NvrConfig } from './config';
import { useNvrPolling, useNvrStore } from './store';
import type { NvrStatus } from './store';

export type CameraSource = 'sentinel' | 'ha';

export function cameraSourceFor(cfg: NvrConfig | null): CameraSource {
  return nvrUsable(cfg) ? 'sentinel' : 'ha';
}

export function useCameraSource(): CameraSource {
  return cameraSourceFor(useNvrConfig());
}

export function isHaCameraEntity(entityId: string): boolean {
  return entityId.startsWith('camera.');
}

/** Drop HA camera entities from a list while Sentinel is the camera source. */
export function withoutHaCameras(ids: string[], source: CameraSource): string[] {
  return source === 'sentinel' ? ids.filter((id) => !isHaCameraEntity(id)) : ids;
}

/**
 * Sentinel's camera list for counters and room tiles, or null while HA is the source.
 * Subscribes the shared poller in its light `cameras` scope (one request per interval).
 */
export function useSentinelCameras(intervalMs = 30_000): { cameras: SentinelCamera[]; status: NvrStatus } | null {
  const cfg = useNvrConfig();
  const usable = nvrUsable(cfg);
  useNvrPolling(usable ? cfg.client : null, intervalMs, 'cameras');
  const state = useNvrStore(useShallow((s) => ({ cameras: s.cameras, status: s.status })));
  return usable ? state : null;
}

/** Sentinel camera ids an admin has assigned to this HA area (Settings: NVR → rooms). */
export function camerasForArea(map: Record<string, string | null>, areaId: string, cameras: SentinelCamera[]): SentinelCamera[] {
  return cameras.filter((c) => map[c.id] === areaId);
}

export function useAreaCameraIds(areaId: string): string[] {
  const map = useSettingsStore((s) => s.customization.nvrCameraRooms);
  return Object.entries(map).filter(([, a]) => a === areaId).map(([id]) => id);
}

const norm = (s: string): string =>
  s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss') // German spelling: "Buero" = "Büro"
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Suggest an area for a camera by name: the longest area name contained in the camera name
 * ("Kamera Pool" → "Pool", "Garten Nord" → "Garten"), or the other way round. null = no idea.
 */
export function suggestArea(cameraName: string, areas: { id: string; name: string }[]): string | null {
  const camNorm = norm(cameraName);
  const cam = ` ${camNorm} `;
  // 1. an area name contained (as whole words) in the camera name — the longest wins
  let best: { id: string; len: number } | null = null;
  for (const a of areas) {
    const n = norm(a.name);
    if (n && cam.includes(` ${n} `) && (!best || n.length > best.len)) best = { id: a.id, len: n.length };
  }
  if (best) return best.id;
  // 2. the camera name contained in exactly one area name ("Nord" → "Garten Nord"); ambiguous → no guess
  if (camNorm.length < 3) return null;
  const hits = areas.filter((a) => ` ${norm(a.name)} `.includes(cam));
  return hits.length === 1 ? hits[0]!.id : null;
}

/**
 * Camera numbers for the security counters: Sentinel's cameras (online = "active") while it
 * is the source, otherwise Home Assistant's camera entities as before.
 */
export function useCameraCount(haCameraCount: number): { total: number; active: number; source: CameraSource } {
  const sentinel = useSentinelCameras();
  if (!sentinel) return { total: haCameraCount, active: haCameraCount, source: 'ha' };
  return { total: sentinel.cameras.length, active: sentinel.cameras.filter((c) => c.online).length, source: 'sentinel' };
}
