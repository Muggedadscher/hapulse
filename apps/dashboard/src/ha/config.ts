/**
 * HA configuration facade (language, and future config reads).
 *
 * Routes reads to the live HA connection, or to demo data in demo mode.
 * Components must go through here — never touch the HAConnection directly.
 */

import { useConnectionStore, getLiveConnection } from '../stores/connectionStore';

/** Fetch the language configured in Home Assistant (demo returns null: the
 *  resolution chain then falls back to the browser, then 'en'). */
export async function getLanguage(): Promise<string | null> {
  const { demo } = useConnectionStore.getState();
  if (demo) return null;
  const conn = getLiveConnection();
  return conn ? conn.fetchLanguage() : null;
}
