/**
 * [fork] Device-local connection secrets (Sentinel NVR token, Music Assistant token).
 *
 * Settings snapshots (manual export/import, HA settings sync) never carry these
 * tokens. Two rules keep them from leaking:
 *  - a token stays on this device only while its server stays the same: importing a
 *    snapshot that points the NVR / Music Assistant at ANOTHER origin drops the local
 *    token (otherwise the next poll would send it to that host);
 *  - old installs kept the Sentinel token inside the URL (`…?token=`); it is moved
 *    into the token field and removed from the URL, so it cannot ride along in exports.
 */

/** Origin of a user-entered server address (scheme optional, like parseSentinelSetup); null if unusable. */
export function originOf(input: string | null | undefined): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.hostname ? u.origin.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** The address without a `token` query parameter, plus that token (if any). Keeps everything else as typed. */
export function splitUrlToken(input: string): { url: string; token: string | null } {
  const m = /[?&]token=([^&#]*)/.exec(input);
  if (!m) return { url: input, token: null };
  let token: string | null = null;
  try { token = decodeURIComponent(m[1] ?? '').trim() || null; } catch { token = (m[1] ?? '').trim() || null; }
  const url = input
    .replace(/([?&])token=[^&#]*&?/, '$1')
    .replace(/[?&](#|$)/, '$1');
  return { url, token };
}

interface Secrets {
  scryptedUrl: string;
  scryptedToken: string;
  maServerUrl: string | null;
  maToken: string | null;
}

/** Move a token found in the Sentinel URL into the token field (unless one is set) and clean the URL. */
export function migrateUrlToken<T extends Pick<Secrets, 'scryptedUrl' | 'scryptedToken'>>(c: T): T {
  if (typeof c.scryptedUrl !== 'string') return c;
  const { url, token } = splitUrlToken(c.scryptedUrl);
  if (!token) return c;
  return { ...c, scryptedUrl: url, scryptedToken: c.scryptedToken || token };
}

/**
 * Tokens after applying an incoming snapshot: a token the snapshot carries explicitly wins
 * (hand-made files, snapshots from before tokens were stripped); otherwise this device's token
 * is kept only if the server's origin did not change.
 */
export function keepDeviceSecrets(
  cur: Secrets,
  incoming: Partial<Secrets>,
): { scryptedToken: string; maToken: string | null } {
  const inUrl = typeof incoming.scryptedUrl === 'string' ? splitUrlToken(incoming.scryptedUrl) : { url: '', token: null };
  const explicitNvr = (typeof incoming.scryptedToken === 'string' && incoming.scryptedToken) || inUrl.token;
  const scryptedToken = explicitNvr
    ? explicitNvr
    : originOf(inUrl.url) !== null && originOf(inUrl.url) === originOf(cur.scryptedUrl) ? cur.scryptedToken : '';
  const explicitMa = typeof incoming.maToken === 'string' && incoming.maToken ? incoming.maToken : null;
  const maToken = explicitMa
    ? explicitMa
    : originOf(incoming.maServerUrl) !== null && originOf(incoming.maServerUrl) === originOf(cur.maServerUrl) ? cur.maToken : null;
  return { scryptedToken, maToken };
}
