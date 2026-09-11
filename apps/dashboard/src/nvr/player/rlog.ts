/**
 * [fork] Client telemetry → Sentinel's `api/clientlog` → its server log as
 * `[client]` lines (phones have no console; this is how playback problems on a
 * device get diagnosed). Tagged `b:hapulse` so lines from the native
 * integration are distinguishable from Sentinel's own web UI.
 */

import type { SentinelClient } from '../api';

let client: SentinelClient | null = null;

export function setRlogClient(c: SentinelClient | null): void {
  client = c;
}

export function rlog(tag: string, data?: Record<string, unknown>): void {
  if (!client) return;
  let line: string;
  try {
    line = JSON.stringify({ tag, b: 'hapulse', d: data ?? null, ua: navigator.userAgent.slice(0, 80) });
  } catch {
    line = JSON.stringify({ tag, b: 'hapulse' });
  }
  client.postText('api/clientlog', line);
}
