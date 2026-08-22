/**
 * connectionStore — HA connection lifecycle, demo mode, persistence.
 *
 * The live HAConnection instance is kept in module scope (not in store state)
 * so Zustand doesn't proxy/clone the class instance.
 *
 * Supported modes:
 *  - 'oauth'  — signed in via HA's own login page (recommended, per-user)
 *  - 'token'  — long-lived access token (advanced / self-hosted)
 *  - 'demo'   — local demo data, no HA connection
 */

import { create } from 'zustand';
import {
  connectToHA,
  startHASignIn,
  resumeHASession,
  DEMO_ENTITIES,
  DEMO_REGISTRIES,
  createDemoTicker,
  HAAuthError,
  HAConnectionError,
} from '@hapulse/core';
import type { HAConnection, AuthData, UnsubscribeFunc, HAUser, HassEntityMap } from '@hapulse/core';
import { useEntityStore } from './entityStore';
import { onboardingRedirectUrl } from '../app/basename';
import { startHASettingsSync, stopHASettingsSync } from '../ha/settingsSync';

// ---------------------------------------------------------------------------
// Module-scope connection state (not in Zustand state — mutable references)
// ---------------------------------------------------------------------------

let _conn: HAConnection | null = null;
let _unsubEntities: UnsubscribeFunc | null = null;
let _unsubStatus: UnsubscribeFunc | null = null;
let _stopDemoTicker: (() => void) | null = null;

// ---------------------------------------------------------------------------
// Entity-update coalescing
//
// HA delivers one `state_changed` message per entity. Applying each one
// synchronously triggers a full re-render of every component that reads the
// entity map (Home, Room, SummaryChipsBar, …). After the tab is backgrounded
// (or the machine sleeps) the WebSocket reconnects and HA replays a burst of
// buffered updates; processing them one-by-one pins the main thread and makes
// the UI unresponsive (clicks/navigation never get a turn) while feeds appear
// to "go crazy".
//
// subscribeEntities always hands us the full, up-to-date entity map, so we keep
// only the latest snapshot and flush it to the store at most once per animation
// frame. requestAnimationFrame is paused while the tab is hidden, so a backlog
// collapses into a single flush when the user returns instead of replaying.
// ---------------------------------------------------------------------------

let _pendingEntities: HassEntityMap | null = null;
let _flushHandle: number | null = null;
const _hasRaf = typeof requestAnimationFrame === 'function';

function flushEntities(): void {
  _flushHandle = null;
  const next = _pendingEntities;
  _pendingEntities = null;
  if (next) useEntityStore.getState().setEntities(next);
}

function scheduleEntitiesUpdate(entities: HassEntityMap): void {
  _pendingEntities = entities;
  if (_flushHandle != null) return;
  _flushHandle = _hasRaf
    ? requestAnimationFrame(flushEntities)
    : (setTimeout(flushEntities, 16) as unknown as number);
}

function cancelPendingEntities(): void {
  if (_flushHandle != null) {
    if (_hasRaf) cancelAnimationFrame(_flushHandle);
    else clearTimeout(_flushHandle);
    _flushHandle = null;
  }
  _pendingEntities = null;
}

const PERSIST_KEY = 'hapulse:connection';
const HA_TOKENS_KEY = 'hapulse:ha-tokens';

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

export type ConnectionMode = 'oauth' | 'token' | 'demo';

export type StoreStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

interface PersistedConnection {
  url?: string;
  token?: string;
  demo?: boolean;
  mode?: ConnectionMode;
}

interface ConnectionState {
  url: string;
  token: string;
  demo: boolean;
  mode: ConnectionMode | null;
  status: StoreStatus;
  error?: string | undefined;
  /** The signed-in HA user. Null until fetchCurrentUser resolves, or in demo mode
   *  a synthetic user is set. Reset to null on disconnect. Not persisted. */
  currentUser: HAUser | null;
  /** True once the initial boot-time init() has settled (whether it resumed a
   *  session, found nothing, or failed). The boot gate waits on this to avoid
   *  flashing the login screen while an auto-reconnect is still in flight. */
  booted: boolean;
}

interface ConnectionActions {
  connect: (url: string, token: string) => Promise<void>;
  signInWithHomeAssistant: (url: string) => Promise<void>;
  /** Enter demo mode. `persist` (default true) writes the demo connection to
   *  localStorage; pass false for an ephemeral demo (e.g. the public /demo page)
   *  so it doesn't leak a demo connection into a real session. */
  startDemo: (persist?: boolean) => void;
  disconnect: () => void;
  init: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function persistConnection(data: PersistedConnection): void {
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

function loadPersistedConnection(): PersistedConnection | null {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedConnection;
  } catch {
    return null;
  }
}

function clearPersistedConnection(): void {
  try {
    localStorage.removeItem(PERSIST_KEY);
  } catch {
    // ignore
  }
}

function clearHATokens(): void {
  try {
    localStorage.removeItem(HA_TOKENS_KEY);
  } catch {
    // ignore
  }
}

/** saveTokens callback passed to getAuth — persists OAuth tokens to localStorage. */
function saveHATokens(tokens: AuthData | null): void {
  try {
    if (tokens === null) {
      localStorage.removeItem(HA_TOKENS_KEY);
    } else {
      localStorage.setItem(HA_TOKENS_KEY, JSON.stringify(tokens));
    }
  } catch {
    // ignore quota errors
  }
}

/** loadTokens callback passed to getAuth — reads OAuth tokens from localStorage. */
async function loadHATokens(): Promise<AuthData | null | undefined> {
  try {
    const raw = localStorage.getItem(HA_TOKENS_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as AuthData;
  } catch {
    return undefined;
  }
}

function teardown(): void {
  cancelPendingEntities();

  stopHASettingsSync();

  _unsubEntities?.();
  _unsubEntities = null;

  _unsubStatus?.();
  _unsubStatus = null;

  _stopDemoTicker?.();
  _stopDemoTicker = null;

  _conn?.close();
  _conn = null;
}

/**
 * Wire up a live HAConnection: subscribe to entities, status, fetch registries.
 * Extracted so the oauth and token paths share the same setup.
 */
async function wireConnection(
  conn: HAConnection,
  set: (partial: Partial<ConnectionState>) => void
): Promise<void> {
  _conn = conn;

  _unsubEntities = conn.subscribeEntities((entities) => {
    scheduleEntitiesUpdate(entities);
  });

  _unsubStatus = conn.onStatus((status) => {
    if (status === 'connected') {
      set({ status: 'connected' });
    } else if (status === 'reconnecting') {
      set({ status: 'reconnecting' });
    } else {
      set({ status: 'disconnected' });
    }
  });

  const registries = await conn.fetchRegistries();
  useEntityStore.getState().setRegistries(registries);

  // Fetch the signed-in user — non-fatal; leave null on failure
  try {
    const currentUser = await conn.fetchCurrentUser();
    set({ currentUser });
  } catch (err) {
    console.warn('[HAPulse] fetchCurrentUser failed — user identity unavailable:', err);
  }

  // Open-source only (no-ops under a hosted persistence adapter or in demo
  // mode): adopt/seed settings from HA and keep them in sync across devices.
  // Runs on every path that reaches a live connection — fresh connect, OAuth
  // callback, and boot-time session resume — since they all funnel through
  // this shared setup helper.
  startHASettingsSync();
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useConnectionStore = create<ConnectionState & ConnectionActions>()(
  (set, _get) => ({
    url: '',
    token: '',
    demo: false,
    mode: null,
    status: 'idle',
    error: undefined,
    currentUser: null,
    booted: false,

    // ---- LLAT (token) connect ----
    async connect(url: string, token: string) {
      teardown();
      set({ status: 'connecting', error: undefined, demo: false, mode: null });

      try {
        const conn = await connectToHA({ url, token });

        await wireConnection(conn, set);

        set({ url, token, mode: 'token', status: 'connected', error: undefined });
        persistConnection({ url, token, mode: 'token' });
      } catch (err) {
        teardown();
        let errorMsg = 'Connection failed';
        if (err instanceof HAAuthError) {
          errorMsg = 'Token rejected — create a long-lived access token in your HA profile → security';
        } else if (err instanceof HAConnectionError) {
          errorMsg = err.message;
        } else if (err instanceof Error) {
          errorMsg = err.message;
        }
        set({ status: 'error', error: errorMsg, mode: null });
        throw err;
      }
    },

    // ---- OAuth: initiate redirect to HA login page ----
    async signInWithHomeAssistant(url: string) {
      const normalised = url.replace(/\/+$/, '');
      teardown();
      // Clear stale tokens first: getAuth resolves WITHOUT redirecting when
      // loadTokens returns saved tokens, which startHASignIn treats as an error.
      clearHATokens();
      // Persist mode + url BEFORE the redirect so the callback leg can read them.
      persistConnection({ url: normalised, mode: 'oauth' });

      // clientId must be `location.origin + "/"` per HA spec.
      const clientId = `${window.location.origin}/`;
      // Basename-aware: `/onboarding` (OSS) or `/app/onboarding` (hosted).
      const redirectUrl = onboardingRedirectUrl();

      set({ status: 'connecting', error: undefined });

      try {
        // startHASignIn triggers window.location.assign → page navigates away.
        // This call never resolves; it either throws (bad URL) or the page unloads.
        await startHASignIn({
          hassUrl: normalised,
          clientId,
          redirectUrl,
          saveTokens: saveHATokens,
          loadTokens: loadHATokens,
        });
      } catch (err) {
        // Only reaches here if getAuth throws before redirecting (bad URL etc.)
        clearPersistedConnection();
        let errorMsg = 'Could not start sign-in';
        if (err instanceof HAAuthError) {
          errorMsg = 'Sign-in failed: invalid response from Home Assistant.';
        } else if (err instanceof HAConnectionError) {
          errorMsg = err.message;
        } else if (err instanceof Error) {
          errorMsg = err.message;
        }
        set({ status: 'error', error: errorMsg });
        throw err;
      }
    },

    // ---- Demo mode ----
    startDemo(persist = true) {
      teardown();
      useEntityStore.getState().setRegistries(DEMO_REGISTRIES);
      useEntityStore.getState().setEntities(DEMO_ENTITIES);

      _stopDemoTicker = createDemoTicker(
        (entities) => {
          useEntityStore.getState().setEntities(entities);
        },
        () => useEntityStore.getState().entities
      );

      // Demo user maps to person.alice (user_id: 'user_alice') in DEMO_ENTITIES
      const demoUser: HAUser = {
        id: 'user_alice',
        name: 'Alice',
        is_owner: true,
        is_admin: true,
      };

      set({ demo: true, mode: 'demo', status: 'connected', error: undefined, url: '', token: '', currentUser: demoUser });
      if (persist) persistConnection({ demo: true, mode: 'demo' });
    },

    // ---- Disconnect ----
    disconnect() {
      const mode = _get().mode;

      // Best-effort: revoke OAuth refresh token before disconnecting
      if (mode === 'oauth' && _conn) {
        _conn.revokeAuth().catch(() => {/* ignore */});
      }

      teardown();
      clearPersistedConnection();
      clearHATokens();
      useEntityStore.getState().reset();
      set({ url: '', token: '', demo: false, mode: null, status: 'idle', error: undefined, currentUser: null });
    },

    // ---- Init on app start ----
    async init() {
      // `booted` is flipped true once this initial attempt settles (any path),
      // so the boot gate can release. Wrapped in try/finally so every early
      // return below still marks boot complete.
      try {
        const persisted = loadPersistedConnection();
        if (!persisted) return;

        // Backward-compat: existing `{url, token}` blobs without mode → token mode
        // `{demo: true}` blobs → demo mode
        const mode: ConnectionMode | null =
          persisted.mode ??
          (persisted.demo ? 'demo' : persisted.url && persisted.token ? 'token' : null);

        if (mode === 'demo') {
          useConnectionStore.getState().startDemo();
          return;
        }

        if (mode === 'token' && persisted.url && persisted.token) {
          try {
            await useConnectionStore.getState().connect(persisted.url, persisted.token);
          } catch {
            // Silent failure — the route guard will redirect to /onboarding
          }
          return;
        }

        // OAuth: resume on callback leg (?auth_callback=1) OR boot leg (stored tokens)
        if (mode === 'oauth') {
          const clientId = `${window.location.origin}/`;
          const redirectUrl = onboardingRedirectUrl();

          set({ status: 'connecting', error: undefined, url: persisted.url ?? '' });

          try {
            const conn = await resumeHASession({
              clientId,
              redirectUrl,
              saveTokens: saveHATokens,
              loadTokens: loadHATokens,
            });

            if (conn === null) {
              // No stored tokens and no callback — need fresh sign-in
              clearPersistedConnection();
              set({ status: 'idle', error: undefined });
              return;
            }

            await wireConnection(conn, set);

            set({
              url: persisted.url ?? '',
              mode: 'oauth',
              status: 'connected',
              error: undefined,
            });

            // Strip auth_callback query params from URL without triggering a navigation
            if (window.location.search.includes('auth_callback')) {
              const clean = window.location.pathname + window.location.hash;
              window.history.replaceState(null, '', clean);
            }
          } catch (err) {
            teardown();

            // Only an auth failure means the stored tokens are actually
            // unusable. Clearing them for a mere connection failure — HA
            // restarting, a network blip, a reverse-proxy hiccup during page
            // load — permanently destroys a perfectly valid session and forces
            // a full re-authentication. core draws this distinction for us:
            // resumeHASession throws HAAuthError for bad tokens and
            // HAConnectionError when it simply could not reach HA.
            if (err instanceof HAAuthError) {
              clearHATokens();
              set({ status: 'error', error: err.message, mode: null });
            } else {
              // Keep the tokens and stay in oauth mode: the session survives,
              // the layout shows its "can't reach Home Assistant" banner, and
              // a reload (or HA coming back) resumes without signing in again.
              set({
                status: 'disconnected',
                error: err instanceof Error ? err.message : 'cannot reach home assistant',
                mode: 'oauth',
                url: persisted.url ?? '',
              });
            }
            // Don't rethrow — init failure is handled by the route guard
          }
        }
      } finally {
        set({ booted: true });
      }
    },
  })
);

/**
 * Returns the current live HAConnection, or null if not connected.
 * Used by the service facade.
 */
export function getLiveConnection(): HAConnection | null {
  return _conn;
}

/**
 * True when boot-time init() will attempt to resume a session — i.e. there is a
 * persisted connection (demo, token, or oauth) or we're on the OAuth callback
 * leg. The boot gate uses this to decide whether to show the loading animation
 * (vs. going straight to onboarding for a brand-new user with no credentials).
 */
export function hasResumableConnection(): boolean {
  if (typeof window !== 'undefined' && window.location.search.includes('auth_callback')) {
    return true;
  }
  const persisted = loadPersistedConnection();
  if (!persisted) return false;
  return (
    persisted.demo === true ||
    persisted.mode === 'oauth' ||
    persisted.mode === 'token' ||
    (!!persisted.url && !!persisted.token)
  );
}
