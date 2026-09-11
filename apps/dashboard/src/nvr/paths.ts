/** [fork] Route helpers for the native NVR pages (`/nvr`, `/nvr/:cameraId`). */

export const NVR_ROOT = '/nvr';

/** Camera timeline route; `at` = playback start, `ev` = event trigger time (poster). */
export function cameraPath(cameraId: string, atMs?: number, eventTs?: number): string {
  const q = new URLSearchParams();
  if (atMs) q.set('at', String(Math.round(atMs)));
  if (eventTs) q.set('ev', String(Math.round(eventTs)));
  const s = q.toString();
  return `${NVR_ROOT}/${encodeURIComponent(cameraId)}${s ? `?${s}` : ''}`;
}
