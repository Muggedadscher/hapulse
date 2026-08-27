/**
 * HA WebSocket connection wrapper.
 * All Home Assistant communication goes through this module.
 */

import {
  createLongLivedTokenAuth,
  createConnection,
  getAuth,
  subscribeEntities as libSubscribeEntities,
  callService as libCallService,
  ERR_INVALID_AUTH,
  ERR_CANNOT_CONNECT,
  ERR_HASS_HOST_REQUIRED,
} from 'home-assistant-js-websocket';
import type { Auth, AuthData, Connection, HassEntities, HassServiceTarget, UnsubscribeFunc } from 'home-assistant-js-websocket';
import { HAAuthError, HAConnectionError } from './errors.js';
import type {
  AreaRegistryEntry,
  DeviceRegistryEntry,
  EntityRegistryEntry,
  Registries,
  ConnectionStatus,
  HAUser,
  PersistentNotification,
} from './types.js';
import type {
  EnergyPreferences,
  StatisticsMap,
  StatisticsPeriod,
} from './energy.js';
import type { StateTranslations } from './entityStates.js';
import { parseHistoryStates, parseLogbookEntries } from './history.js';
import type { HistoryPoint, LogbookEntry } from './history.js';
import type { RawHistoryState } from './sensorHistory.js'; // [fork]

/** Raw payload shape returned by `auth/current_user` WebSocket message. */
interface RawCurrentUser {
  id: string;
  name: string;
  is_owner: boolean;
  is_admin: boolean;
}

/** Options for connectToHA. */
export interface ConnectToHAOptions {
  /** Full URL to Home Assistant, e.g. http://homeassistant.local:8123 */
  url: string;
  /** Long-lived access token */
  token: string;
}

/** Wraps the raw HA Connection with typed helpers. */
export class HAConnection {
  readonly #conn: Connection;
  #auth: Auth | null;
  /** Resume callback for an in-flight suspend() — null when not suspended. */
  #resumeSuspend: (() => void) | null = null;

  constructor(conn: Connection, auth: Auth | null = null) {
    this.#conn = conn;
    this.#auth = auth;
  }

  /**
   * Subscribe to real-time entity state updates.
   * Calls `onChange` immediately with the full entity map, then on every change.
   */
  subscribeEntities(cb: (entities: HassEntities) => void): UnsubscribeFunc {
    return libSubscribeEntities(this.#conn, cb);
  }

  /**
   * Fetch area, device and entity registries in parallel.
   */
  async fetchRegistries(): Promise<Registries> {
    const [areas, devices, entities] = await Promise.all([
      this.#conn.sendMessagePromise<AreaRegistryEntry[]>({
        type: 'config/area_registry/list',
      }),
      this.#conn.sendMessagePromise<DeviceRegistryEntry[]>({
        type: 'config/device_registry/list',
      }),
      this.#conn.sendMessagePromise<EntityRegistryEntry[]>({
        type: 'config/entity_registry/list',
      }),
    ]);
    return { areas, devices, entities };
  }

  /**
   * Call a Home Assistant service.
   */
  async callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: HassServiceTarget
  ): Promise<void> {
    await libCallService(this.#conn, domain, service, data, target);
  }

  /**
   * Fetch the currently signed-in Home Assistant user.
   *
   * Uses the `auth/current_user` WebSocket message which returns the user
   * profile for whichever credentials were used to establish this connection.
   * The `id` field matches the `user_id` attribute on the associated
   * `person.*` entity (when one exists).
   *
   * @throws when the WebSocket message fails (network error, auth error)
   */
  async fetchCurrentUser(): Promise<HAUser> {
    const raw = await this.#conn.sendMessagePromise<RawCurrentUser>({
      type: 'auth/current_user',
    });
    return {
      id: raw.id,
      name: raw.name,
      is_owner: raw.is_owner,
      is_admin: raw.is_admin,
    };
  }

  /**
   * Listen to connection status changes.
   * The callback fires with the current status whenever it changes.
   * Returns an unsubscribe function.
   */
  onStatus(cb: (status: ConnectionStatus) => void): UnsubscribeFunc {
    const onReady = () => cb('connected');
    const onDisconnected = () => cb('reconnecting');
    const onReconnectError = () => cb('disconnected');
    this.#conn.addEventListener('ready', onReady);
    this.#conn.addEventListener('disconnected', onDisconnected);
    this.#conn.addEventListener('reconnect-error', onReconnectError);
    return () => {
      this.#conn.removeEventListener('ready', onReady);
      this.#conn.removeEventListener('disconnected', onDisconnected);
      this.#conn.removeEventListener('reconnect-error', onReconnectError);
    };
  }

  /**
   * Fetch the Energy dashboard preferences (`energy/get_prefs`).
   *
   * Returns `null` when energy is not set up (the integration isn't loaded, so
   * the command errors). An empty-but-present config resolves to a prefs object
   * with empty arrays — use `isEnergyConfigured` to distinguish that.
   */
  async fetchEnergyPrefs(): Promise<EnergyPreferences | null> {
    try {
      const prefs = await this.#conn.sendMessagePromise<EnergyPreferences>({
        type: 'energy/get_prefs',
      });
      return prefs ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch long-term statistics for the given statistic IDs over a time range
   * (`recorder/statistics_during_period`). Returns an empty map when no IDs are
   * requested. `start`/`end` are ISO 8601 strings.
   */
  async fetchStatistics(
    statisticIds: string[],
    period: StatisticsPeriod,
    start: string,
    end?: string
  ): Promise<StatisticsMap> {
    if (statisticIds.length === 0) return {};
    return this.#conn.sendMessagePromise<StatisticsMap>({
      type: 'recorder/statistics_during_period',
      start_time: start,
      ...(end != null ? { end_time: end } : {}),
      statistic_ids: statisticIds,
      period,
      types: ['change', 'sum', 'state'],
    });
  }

  /**
   * Fetch the configured currency from HA core config (`get_config`).
   * Returns null on failure.
   */
  async fetchCurrency(): Promise<string | null> {
    try {
      const cfg = await this.#conn.sendMessagePromise<{ currency?: string }>({
        type: 'get_config',
      });
      return cfg.currency ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch the configured language from HA core config (`get_config`).
   * Returns null on failure.
   *
   * Deliberately a second `get_config` round-trip rather than sharing one with
   * fetchCurrency(): it keeps the diff small and mirrors the existing shape.
   */
  async fetchLanguage(): Promise<string | null> {
    try {
      const cfg = await this.#conn.sendMessagePromise<{ language?: string }>({
        type: 'get_config',
      });
      return cfg.language ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch Home Assistant's entity-state translations for `language`.
   *
   * Category `entity_component` covers every loaded integration's state and
   * state-attribute wording — the vocabulary HAPulse must never maintain by
   * hand. Returns an empty map on failure: callers fall back to humanising the
   * raw state.
   */
  async fetchEntityStateTranslations(language: string): Promise<StateTranslations> {
    try {
      const res = await this.#conn.sendMessagePromise<{ resources?: StateTranslations }>({
        type: 'frontend/get_translations',
        language,
        category: 'entity_component',
      });
      return res.resources ?? {};
    } catch {
      return {};
    }
  }

  /**
   * Fetch an entity's state history over [start, end].
   *
   * Uses `history/history_during_period` with `minimal_response` and
   * `no_attributes` — the detail modal only draws states over time, and the
   * compressed shape keeps a week of a chatty sensor small. Returns an empty
   * series on failure; the modal then shows its empty state.
   */
  async fetchHistory(entityId: string, start: Date, end: Date): Promise<HistoryPoint[]> {
    try {
      const res = await this.#conn.sendMessagePromise<Record<string, unknown[]>>({
        type: 'history/history_during_period',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: [entityId],
        minimal_response: true,
        no_attributes: true,
      });
      return parseHistoryStates(res?.[entityId] ?? []);
    } catch {
      return [];
    }
  }

  /**
   * [fork] Fetch recorder state history for a single entity over a time range
   * as raw compact samples (`history/history_during_period`).
   *
   * Distinct from `fetchHistory` above (which parses into the detail modal's
   * `HistoryPoint` state-interval shape): this returns the raw samples so the
   * Pool runtime chart (`PoolChartCard`) can turn them into `{ t, v }` points
   * via `parseNumericHistory`. `start`/`end` are ISO 8601 strings; returns `[]`
   * when there is no history.
   */
  async fetchSensorHistory(
    entityId: string,
    start: string,
    end?: string
  ): Promise<RawHistoryState[]> {
    const result = await this.#conn.sendMessagePromise<Record<string, RawHistoryState[]>>({
      type: 'history/history_during_period',
      start_time: start,
      ...(end != null ? { end_time: end } : {}),
      entity_ids: [entityId],
      minimal_response: true,
      no_attributes: true,
      significant_changes_only: false,
    });
    return result?.[entityId] ?? [];
  }

  /**
   * Fetch an entity's logbook (activity) entries over [start, end], newest
   * first. Only state-change rows are kept — service-call noise is dropped by
   * the parser. Returns an empty list on failure.
   */
  /**
   * Call a service that returns response data (`SupportsResponse` services,
   * e.g. `music_assistant.get_library`). The plain `callService` wrapper drops
   * the response; this sends the WS `call_service` command with
   * `return_response` and hands the caller the raw response payload.
   * Throws on failure — callers decide their fallback.
   */
  async callServiceWithResponse<T = unknown>(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: { entity_id?: string | string[] },
  ): Promise<T> {
    const result = await this.#conn.sendMessagePromise<{ response?: T }>({
      type: 'call_service',
      domain,
      service,
      ...(serviceData !== undefined ? { service_data: serviceData } : {}),
      ...(target !== undefined ? { target } : {}),
      return_response: true,
    });
    return result?.response as T;
  }

  async fetchLogbook(entityId: string, start: Date, end: Date): Promise<LogbookEntry[]> {
    try {
      const res = await this.#conn.sendMessagePromise<unknown[]>({
        type: 'logbook/get_events',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: [entityId],
      });
      return parseLogbookEntries(Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  }

  /**
   * Subscribe to Home Assistant persistent notifications.
   *
   * Persistent notifications are NOT state-machine entities (so they never
   * appear in `subscribeEntities`). This uses the `persistent_notification/
   * subscribe` WebSocket command, which sends an initial `current` snapshot
   * followed by `added` / `updated` / `removed` deltas. We merge those into a
   * map and invoke `cb` with the full current list on every change.
   *
   * The subscription auto-resubscribes after a reconnect (library default).
   * Returns a synchronous unsubscribe function.
   */
  subscribeNotifications(cb: (list: PersistentNotification[]) => void): UnsubscribeFunc {
    const byId = new Map<string, PersistentNotification>();
    let unsub: (() => void) | null = null;
    let cancelled = false;

    this.#conn
      .subscribeMessage<{ type: string; notifications: Record<string, PersistentNotification> }>(
        (msg) => {
          if (msg.type === 'removed') {
            for (const id of Object.keys(msg.notifications)) byId.delete(id);
          } else {
            // 'current' (initial snapshot), 'added', or 'updated'
            for (const [id, n] of Object.entries(msg.notifications)) byId.set(id, n);
          }
          cb(Array.from(byId.values()));
        },
        { type: 'persistent_notification/subscribe' }
      )
      .then((u) => {
        if (cancelled) u();
        else unsub = u;
      })
      .catch((err: unknown) => {
        console.warn('[HAPulse] persistent_notification subscribe failed:', err);
      });

    return () => {
      cancelled = true;
      unsub?.();
      unsub = null;
    };
  }

  /**
   * Fetch a value previously stored under `key` via `frontend/set_user_data`
   * (`frontend/get_user_data`). Home Assistant returns the value wrapped in a
   * `{ value: ... }` envelope; this unwraps it and returns `null` when the key
   * has never been set (HA responds with `{ value: null }`).
   *
   * Swallows errors (unsupported command on very old core, network hiccup,
   * etc.) and resolves to `null` — like `fetchEnergyPrefs`, a missing/broken
   * frontend storage command must never break app boot.
   */
  async getUserData<T = unknown>(key: string): Promise<T | null> {
    try {
      const result = await this.#conn.sendMessagePromise<{ value: T | null }>({
        type: 'frontend/get_user_data',
        key,
      });
      return result?.value ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Persist a value under `key` via `frontend/set_user_data`, scoped to the
   * signed-in HA user (stored server-side as `frontend.user_data_{user_id}`).
   * `value` must be JSON-serializable (bool/str/int/float/dict/list/null).
   */
  async setUserData(key: string, value: unknown): Promise<void> {
    await this.#conn.sendMessagePromise({
      type: 'frontend/set_user_data',
      key,
      value,
    });
  }

  /**
   * Subscribe to live updates for a `frontend/user_data` key
   * (`frontend/subscribe_user_data`). Mirrors the `subscribeNotifications`
   * pattern: subscribes asynchronously, guards against a `cancelled`
   * unsubscribe racing the subscribe call, and returns a synchronous
   * unsubscribe function immediately.
   */
  subscribeUserData<T = unknown>(key: string, cb: (value: T | null) => void): UnsubscribeFunc {
    let unsub: (() => void) | null = null;
    let cancelled = false;

    this.#conn
      .subscribeMessage<{ value: T | null }>(
        (msg) => {
          cb(msg?.value ?? null);
        },
        { type: 'frontend/subscribe_user_data', key }
      )
      .then((u) => {
        if (cancelled) u();
        else unsub = u;
      })
      .catch((err: unknown) => {
        console.warn('[HAPulse] frontend/subscribe_user_data subscribe failed:', err);
      });

    return () => {
      cancelled = true;
      unsub?.();
      unsub = null;
    };
  }

  /**
   * Revoke the OAuth refresh token and clear stored tokens.
   * Call this on sign-out when using the OAuth / getAuth flow.
   * Best-effort — network errors are caught and logged.
   */
  async revokeAuth(): Promise<void> {
    if (!this.#auth) return;
    try {
      await this.#auth.revoke();
    } catch {
      // Best-effort — don't block sign-out on network failure
    }
  }

  /**
   * Close the underlying WebSocket connection.
   */
  close(): void {
    this.#conn.close();
  }

  /**
   * Suspend the connection for mobile background handling.
   *
   * Closes the socket without tearing the connection down: hajsw's internal
   * close handler (`Connection#_handleClose` in `connection.js`) checks
   * `suspendReconnectPromise` and, when set, `await`s it before reconnecting
   * — so no reconnect attempt happens while suspended, and the eventual
   * reconnect is triggered by hajsw itself once the promise resolves.
   *
   * Verified against hajsw's `connection.js`: `suspendReconnectUntil(promise)`
   * only stores the promise; `suspend()` just closes the socket (and throws
   * if no suspend promise was set first) — the actual `await` + `reconnect(0)`
   * live in the `close` event's `_handleClose` handler. Resolving the promise
   * is therefore sufficient to resume; calling `reconnect(true)` afterwards
   * would trigger a second, redundant reconnect (and tear down the socket
   * hajsw is already reconnecting), so this implementation does NOT do that.
   *
   * Calling `suspend()` again while already suspended is a no-op that
   * returns the same `resume` function, guarding against a double-suspend
   * (which would otherwise throw inside hajsw — `suspend()` requires
   * `suspendReconnectPromise` to still be set — or leak the first promise).
   *
   * @returns a `resume` function; call it to let hajsw reconnect
   */
  suspend(): () => void {
    if (this.#resumeSuspend) {
      return this.#resumeSuspend;
    }

    let resolveSuspend: () => void;
    const suspendPromise = new Promise<void>((resolve) => {
      resolveSuspend = resolve;
    });

    this.#conn.suspendReconnectUntil(suspendPromise);
    this.#conn.suspend();

    const resume = () => {
      if (this.#resumeSuspend !== resume) return;
      this.#resumeSuspend = null;
      resolveSuspend();
    };
    this.#resumeSuspend = resume;
    return resume;
  }
}

/**
 * Connect to a Home Assistant instance using a long-lived access token.
 *
 * @param opts - `url` and `token`
 * @throws {HAAuthError} when the token is rejected
 * @throws {HAConnectionError} when the host is unreachable
 */
export async function connectToHA(opts: ConnectToHAOptions): Promise<HAConnection> {
  // Normalize: strip trailing slash
  const url = opts.url.replace(/\/+$/, '');

  const auth = createLongLivedTokenAuth(url, opts.token);

  try {
    const conn = await createConnection({ auth });
    return new HAConnection(conn, auth);
  } catch (err: unknown) {
    if (err === ERR_INVALID_AUTH) {
      throw new HAAuthError();
    }
    if (err === ERR_CANNOT_CONNECT) {
      throw new HAConnectionError('Cannot connect to Home Assistant. Check the URL and ensure the instance is reachable.');
    }
    // Unknown error — wrap it
    throw new HAConnectionError(
      `Unexpected connection error: ${err instanceof Error ? err.message : String(err)}`,
      err
    );
  }
}

// ---------------------------------------------------------------------------
// OAuth / getAuth flow
// ---------------------------------------------------------------------------

/**
 * Options for the OAuth sign-in functions.
 * The caller (the app) must supply clientId and redirectUrl so that
 * @hapulse/core remains DOM-free (no window/location references here).
 */
export interface HASignInOptions {
  /** Normalised HA URL, e.g. "http://homeassistant.local:8123" (no trailing slash). */
  hassUrl: string;
  /** OAuth client ID — must equal `location.origin + "/"` in the browser. */
  clientId: string;
  /** The URL HA will redirect back to — must equal `location.origin + "/onboarding"`. */
  redirectUrl: string;
  /**
   * Persist tokens. Called by the library when new tokens are obtained.
   * Pass null to signal "sign out / clear tokens".
   */
  saveTokens: (tokens: AuthData | null) => void;
  /** Load previously persisted tokens. Return undefined/null when none stored. */
  loadTokens: () => Promise<AuthData | null | undefined>;
}

/**
 * Options for resuming an existing HA OAuth session (callback leg or boot leg).
 * hassUrl is NOT included — getAuth will load it from stored tokens.
 */
export interface HAResumeOptions {
  clientId: string;
  redirectUrl: string;
  saveTokens: (tokens: AuthData | null) => void;
  loadTokens: () => Promise<AuthData | null | undefined>;
}

/**
 * Initiate the HA OAuth sign-in redirect.
 *
 * This calls getAuth({ hassUrl, ... }) which causes the library to call
 * window.location.assign() to redirect to HA's authorize page — this function
 * therefore **never resolves** (the page navigates away). Call it only when
 * the user has confirmed the HA URL and clicked "sign in".
 *
 * @throws {HAConnectionError} if getAuth rejects before redirecting (bad URL, unreachable host)
 */
export async function startHASignIn(opts: HASignInOptions): Promise<never> {
  const hassUrl = opts.hassUrl.replace(/\/+$/, '');
  try {
    // getAuth with hassUrl triggers the redirect; it should never return here.
    await getAuth({
      hassUrl,
      clientId: opts.clientId,
      redirectUrl: opts.redirectUrl,
      saveTokens: opts.saveTokens,
      loadTokens: opts.loadTokens,
    });
  } catch (err: unknown) {
    if (err === ERR_INVALID_AUTH) {
      throw new HAAuthError('OAuth sign-in failed: invalid auth response from Home Assistant.');
    }
    if (err === ERR_HASS_HOST_REQUIRED) {
      throw new HAConnectionError('Home Assistant URL is required to start sign-in.');
    }
    if (err === ERR_CANNOT_CONNECT) {
      throw new HAConnectionError('Cannot reach Home Assistant. Check the URL and try again.');
    }
    throw new HAConnectionError(
      `Sign-in failed: ${err instanceof Error ? err.message : String(err)}`,
      err
    );
  }
  // Should never reach here — getAuth redirects.
  // TypeScript needs a never return type so callers know this function doesn't complete.
  throw new HAConnectionError('getAuth returned unexpectedly without redirecting.');
}

/**
 * Resume an existing HA OAuth session.
 *
 * Use this on two legs:
 *  - **Callback leg**: when the URL contains `?auth_callback=1` after HA redirects back.
 *    getAuth picks up the `code` param and exchanges it for tokens.
 *  - **Boot leg**: on every app start. If loadTokens returns stored tokens,
 *    getAuth refreshes them if needed and returns the Auth object.
 *
 * Returns `null` when there are no stored tokens and no callback in the URL
 * (i.e. this is a fresh session that needs to go through startHASignIn).
 *
 * @throws {HAAuthError} when stored tokens are invalid/expired and cannot be refreshed
 * @throws {HAConnectionError} when the connection itself fails
 */
export async function resumeHASession(opts: HAResumeOptions): Promise<HAConnection | null> {
  let auth: Auth;
  try {
    auth = await getAuth({
      clientId: opts.clientId,
      redirectUrl: opts.redirectUrl,
      saveTokens: opts.saveTokens,
      loadTokens: opts.loadTokens,
    });
  } catch (err: unknown) {
    if (err === ERR_INVALID_AUTH) {
      throw new HAAuthError('Your Home Assistant session has expired. Please sign in again.');
    }
    if (err === ERR_HASS_HOST_REQUIRED) {
      // No stored tokens and no callback in URL — fresh session
      return null;
    }
    if (err === ERR_CANNOT_CONNECT) {
      throw new HAConnectionError('Cannot connect to Home Assistant. Check the URL and ensure the instance is reachable.');
    }
    throw new HAConnectionError(
      `Session resume failed: ${err instanceof Error ? err.message : String(err)}`,
      err
    );
  }

  try {
    const conn = await createConnection({ auth });
    return new HAConnection(conn, auth);
  } catch (err: unknown) {
    if (err === ERR_INVALID_AUTH) {
      throw new HAAuthError('Your Home Assistant session has expired. Please sign in again.');
    }
    if (err === ERR_CANNOT_CONNECT) {
      throw new HAConnectionError('Cannot connect to Home Assistant. Check the URL and ensure the instance is reachable.');
    }
    throw new HAConnectionError(
      `Unexpected connection error: ${err instanceof Error ? err.message : String(err)}`,
      err
    );
  }
}
