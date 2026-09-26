/**
 * [fork] Sentinel NVR connection config — derived from the (HA-synced)
 * customization settings: `scryptedUrl` (any Scrypted/Sentinel URL the user
 * pasted) + `scryptedToken`. A token embedded in the pasted URL (the plugin's
 * embed URL carries `?token=`) is honoured when no explicit token is set, so
 * installs of the former iframe page keep working without re-entry.
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { parseSentinelSetup, sentinelPublicBase } from '@sentinel-nvr/web/api';
import { useSettingsStore } from '../stores/settingsStore';
import { SentinelClient } from './api';

export interface NvrConfig {
  origin: string;
  token: string;
  /** reverse-proxy path prefix in front of Scrypted's /endpoint/ ('' without one) */
  prefix: string;
  client: SentinelClient;
}

let _client: SentinelClient | null = null;

/** A client for origin + token (+ proxy prefix: the request base keeps the path in front of /endpoint/). */
export function clientFor(origin: string, token: string, prefix = ''): SentinelClient {
  const base = sentinelPublicBase(origin, prefix);
  if (!_client || _client.origin !== origin || _client.token !== token || _client.base !== base) {
    _client = new SentinelClient(origin, token, prefix ? { base } : {});
  }
  return _client;
}

/** What to store as the NVR address: the origin — or, behind a reverse-proxy prefix, the full public base
 *  (the prefix is only recognised in front of /endpoint/, a bare origin would lose it). */
export function storedNvrUrl(origin: string, prefix: string): string {
  return prefix ? sentinelPublicBase(origin, prefix) : origin;
}

/** Resolve a config from raw setting values (null when no URL is configured). */
export function resolveNvrConfig(scryptedUrl: string, scryptedToken: string): NvrConfig | null {
  const setup = parseSentinelSetup(scryptedUrl);
  if (!setup) return null;
  const token = (scryptedToken || '').trim() || setup.token || '';
  const prefix = setup.prefix ?? '';
  return { origin: setup.origin, token, prefix, client: clientFor(setup.origin, token, prefix) };
}

/** Current config outside React (player, telemetry). */
export function getNvrConfig(): NvrConfig | null {
  const c = useSettingsStore.getState().customization;
  return resolveNvrConfig(c.scryptedUrl, c.scryptedToken);
}

/** Reactive config — re-resolves when the settings change. */
export function useNvrConfig(): NvrConfig | null {
  const { scryptedUrl, scryptedToken } = useSettingsStore(
    useShallow((s) => ({ scryptedUrl: s.customization.scryptedUrl, scryptedToken: s.customization.scryptedToken })),
  );
  return useMemo(() => resolveNvrConfig(scryptedUrl, scryptedToken), [scryptedUrl, scryptedToken]);
}

/**
 * True when the NVR is usable here: URL AND access token present. Gates the Home card, the
 * Security section and the camera source (nvr/cameraSource.ts). A URL alone happens under
 * global admin management when the admin does not share the token — those users would only
 * ever see 401s, so for them HAPulse behaves as if no NVR were configured.
 */
export function nvrUsable(cfg: NvrConfig | null): cfg is NvrConfig {
  return cfg != null && cfg.token !== '';
}

export function useNvrConfigured(): boolean {
  return nvrUsable(useNvrConfig());
}
