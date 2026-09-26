/**
 * [fork] OAuth callback guard (login CSRF).
 *
 * On the callback leg home-assistant-js-websocket takes the HA URL from the `state`
 * query parameter. Without a check a crafted link (`?auth_callback=1&code=…&state=<other HA>`)
 * would swap this dashboard's session for another Home Assistant — and seed that instance
 * with the local settings. The callback must name the instance the sign-in was started for.
 */

/** Origin of an HA URL (scheme optional), lower-case; null if unusable. */
function originOf(u: string | undefined | null): string | null {
  if (!u) return null;
  try {
    return new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * True unless `search` is an OAuth callback (`auth_callback`) whose `state.hassUrl` points at a
 * different origin than `expectedUrl` (the URL persisted when the sign-in was started).
 */
export function oauthCallbackMatches(search: string, expectedUrl: string | undefined | null): boolean {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (!q.has('auth_callback')) return true;
  const expected = originOf(expectedUrl);
  if (!expected) return false;
  try {
    const state = JSON.parse(atob(q.get('state') ?? '')) as { hassUrl?: unknown };
    return typeof state.hassUrl === 'string' && originOf(state.hassUrl) === expected;
  } catch {
    return false;
  }
}
