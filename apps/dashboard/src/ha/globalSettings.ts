/**
 * [fork] Global admin management: Home Assistant admins set HAPulse up once for everybody.
 *
 * Storage: HA `frontend/system_data`, key `hapulse:global` — every user may read and
 * subscribe, only admins may write (HA enforces `require_admin`). Once an admin has
 * activated it ("Meine Einstellungen für alle übernehmen") it stays on for good; there is
 * no off switch. What belongs to the document is defined in stores/settingsScope.ts.
 *
 * Order on connect (connectionStore.wireConnection): this module reads the document
 * FIRST, then ha/settingsSync.ts starts in the matching mode — otherwise the user's
 * own old snapshot would be applied over the global values (and pushed back).
 *
 * Admin writes are a three-way merge: the change is computed against the last applied
 * global state and laid over a fresh read of the document, so a stale tab only overrides
 * fields it really changed (system_data has no compare-and-set).
 */

import type { HAConnection, HAUser } from '@hapulse/core';
import { useSettingsStore } from '../stores/settingsStore';
import { useGlobalSettingsStore, EMPTY_GLOBAL_META } from '../stores/globalSettingsStore';
import type { GlobalSettingsMeta } from '../stores/globalSettingsStore';
import { applyingRemote, isApplyingRemote } from '../stores/settingsApplyGuard';
import {
  diffGlobal,
  extractGlobal,
  extractSecrets,
  hasChanges,
  isValidGlobalDoc,
  mergeGlobal,
} from '../stores/settingsScope';
import type { GlobalSettingsDoc, GlobalSettingsPayload, GlobalUserRef, SharedSecrets } from '../stores/settingsScope';

export const GLOBAL_KEY = 'hapulse:global';
const DEBOUNCE_MS = 750;

type Conn = Pick<HAConnection, 'getSystemDataStrict' | 'setSystemData' | 'subscribeSystemData'>;

let _conn: Conn | null = null;
let _user: HAUser | null = null;
let _onModeChange: (() => void) | null = null;
/** Last document known to be in HA (read, pushed by HA, or written by us). */
let _doc: GlobalSettingsDoc | null = null;
/** Global settings as last applied/written — the base of the three-way diff. */
let _base: GlobalSettingsPayload | null = null;
let _lastRemoteJson: string | null = null;
let _unsubRemote: (() => void) | null = null;
let _unsubStore: (() => void) | null = null;
let _debounce: ReturnType<typeof setTimeout> | null = null;
let _pushing: Promise<void> | null = null;

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const isAdmin = (): boolean => _user?.is_admin === true;
const userRef = (): GlobalUserRef => ({ id: _user?.id ?? '', name: _user?.name ?? '' });

function metaOf(doc: GlobalSettingsDoc | null): GlobalSettingsMeta {
  if (!doc) return EMPTY_GLOBAL_META;
  return {
    managed: true,
    rev: doc.rev,
    activatedAt: doc.activatedAt,
    activatedBy: doc.activatedBy,
    updatedAt: doc.updatedAt,
    updatedBy: doc.updatedBy,
    shareSecrets: doc.shareSecrets,
  };
}

/** True once an admin has activated the global management (persisted, known before connect). */
export function isGlobalManaged(): boolean {
  return useGlobalSettingsStore.getState().meta.managed;
}

/** The global document as last seen (null before the first read or when not managed). */
export function getGlobalDoc(): GlobalSettingsDoc | null {
  return _doc;
}

/**
 * Apply a document from HA. An admin's not-yet-pushed local changes survive (they are laid
 * over the incoming settings and pushed afterwards) instead of being overwritten.
 */
function applyDoc(doc: GlobalSettingsDoc): void {
  const prev = _doc;
  const state = useSettingsStore.getState();
  const local = isAdmin() && _base ? diffGlobal(_base, extractGlobal(state)) : {};
  // An admin who just connected Sentinel/MA anew keeps that token until it is pushed.
  const localSecretsPending =
    isAdmin() && prev?.shareSecrets === true && doc.shareSecrets && !same(extractSecrets(state), prev.secrets);

  _doc = doc;
  _lastRemoteJson = JSON.stringify(doc);
  _base = doc.settings;
  applyingRemote(() => {
    const s = useSettingsStore.getState();
    s.applyGlobal(mergeGlobal(doc.settings, local));
    if (!localSecretsPending) s.applySharedSecrets(doc.shareSecrets ? (doc.secrets ?? null) : null, isAdmin());
  });
  useGlobalSettingsStore.getState().setMeta(metaOf(doc));
  if (hasChanges(local) || localSecretsPending) schedulePush();
}

function handleRemote(value: unknown): void {
  const wasManaged = isGlobalManaged();
  if (value == null) {
    // Never activated here (or the key was removed by hand in HA): nothing is managed.
    _doc = null;
    _base = null;
    _lastRemoteJson = null;
    useGlobalSettingsStore.getState().setMeta(EMPTY_GLOBAL_META);
  } else if (isValidGlobalDoc(value)) {
    applyDoc(value);
  } else {
    console.warn('[HAPulse] globalSettings: ignoring malformed hapulse:global document');
    return;
  }
  if (wasManaged !== isGlobalManaged()) _onModeChange?.();
}

// ---------------------------------------------------------------------------
// Admin writes
// ---------------------------------------------------------------------------

/**
 * Read the document fresh, let `mutate` build the next one, write it with rev+1.
 * Throws on failure (read or write); nothing local is lost then — the next change retries.
 */
async function writeDoc(mutate: (remote: GlobalSettingsDoc) => GlobalSettingsDoc): Promise<GlobalSettingsDoc> {
  const conn = _conn;
  if (!conn || !isAdmin()) throw new Error('not allowed');
  const remote = await conn.getSystemDataStrict<unknown>(GLOBAL_KEY);
  if (!isValidGlobalDoc(remote)) throw new Error('global document missing or malformed');
  const next: GlobalSettingsDoc = {
    ...mutate(remote),
    rev: remote.rev + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: userRef(),
  };
  if (!next.shareSecrets) delete next.secrets;
  await conn.setSystemData(GLOBAL_KEY, next);
  return next;
}

async function pushNow(): Promise<void> {
  if (!_doc || !_base || !isAdmin()) return;
  const state = useSettingsStore.getState();
  const changes = diffGlobal(_base, extractGlobal(state));
  const secrets: SharedSecrets = extractSecrets(state);
  const secretsChanged = _doc.shareSecrets && !same(secrets, _doc.secrets);
  if (!hasChanges(changes) && !secretsChanged) return;

  const store = useGlobalSettingsStore.getState();
  try {
    const next = await writeDoc((remote) => ({
      ...remote,
      settings: mergeGlobal(remote.settings, changes),
      ...(remote.shareSecrets ? { secrets: secretsChanged ? secrets : remote.secrets } : {}),
    }));
    // Another admin's newer fields may have come along in the fresh read → apply everything.
    applyDoc(next);
    store.setWriteError(false);
  } catch (err) {
    console.warn('[HAPulse] globalSettings: writing the global settings failed:', err);
    store.setWriteError(true);
  }
}

function schedulePush(): void {
  if (_debounce != null) clearTimeout(_debounce);
  _debounce = setTimeout(() => {
    _debounce = null;
    // Serialise: a push that starts while another is in flight waits for it.
    _pushing = (_pushing ?? Promise.resolve()).then(pushNow).finally(() => { _pushing = null; });
  }, DEBOUNCE_MS);
}

/** Flush a pending debounced push now (tests, and before the admin leaves the settings page). */
export async function flushGlobalPush(): Promise<void> {
  if (_debounce != null) {
    clearTimeout(_debounce);
    _debounce = null;
    await pushNow();
  }
  if (_pushing) await _pushing;
}

/**
 * Activate the global management with this admin's current settings. Refuses when a
 * document already exists (another admin was faster) — that one is applied instead.
 */
export async function activateGlobalSettings(opts: { shareSecrets: boolean }): Promise<'activated' | 'exists'> {
  const conn = _conn;
  if (!conn || !isAdmin()) throw new Error('not allowed');
  const existing = await conn.getSystemDataStrict<unknown>(GLOBAL_KEY);
  if (existing != null) {
    handleRemote(existing);
    return 'exists';
  }
  const state = useSettingsStore.getState();
  const now = new Date().toISOString();
  const doc: GlobalSettingsDoc = {
    v: 1,
    rev: 1,
    activatedAt: now,
    activatedBy: userRef(),
    updatedAt: now,
    updatedBy: userRef(),
    settings: extractGlobal(state),
    userDefaults: { favorites: state.customization.favorites, language: state.language },
    shareSecrets: opts.shareSecrets,
    ...(opts.shareSecrets ? { secrets: extractSecrets(state) } : {}),
  };
  await conn.setSystemData(GLOBAL_KEY, doc);
  handleRemote(doc);
  return 'activated';
}

/** Share (or stop sharing) this admin's Sentinel / Music Assistant access with everybody. */
export async function setShareSecrets(share: boolean): Promise<void> {
  await flushGlobalPush();
  const secrets = extractSecrets(useSettingsStore.getState());
  const next = await writeDoc((remote) => ({ ...remote, shareSecrets: share, ...(share ? { secrets } : {}) }));
  applyDoc(next);
}

/** Make this admin's current favorites + language the starting point for users without own settings yet. */
export async function updateUserDefaults(): Promise<void> {
  const s = useSettingsStore.getState();
  const next = await writeDoc((remote) => ({
    ...remote,
    userDefaults: { favorites: s.customization.favorites, language: s.language },
  }));
  applyDoc(next);
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

function onStoreChange(): void {
  if (isApplyingRemote() || !isAdmin() || !_doc) return;
  schedulePush();
}

/**
 * Read the global document and keep it applied. Must finish BEFORE ha/settingsSync.ts
 * starts. `onModeChange` fires when the managed state flips at runtime (activation by an
 * admin elsewhere) so the caller can restart the user sync in the right mode.
 */
export async function startGlobalSettings(conn: Conn, user: HAUser | null, onModeChange: () => void): Promise<void> {
  stopGlobalSettings();
  _conn = conn;
  _user = user;
  _onModeChange = onModeChange;

  try {
    const value = await conn.getSystemDataStrict<unknown>(GLOBAL_KEY);
    _onModeChange = null; // the caller starts the user sync right after this; no restart needed
    handleRemote(value);
    _onModeChange = onModeChange;
    useGlobalSettingsStore.getState().setLoaded(true);
  } catch (err) {
    // Keep the last known mode (persisted meta) and the local values — never reset anything.
    console.warn('[HAPulse] globalSettings: reading hapulse:global failed, keeping the local state:', err);
  }

  _unsubRemote = conn.subscribeSystemData<unknown>(GLOBAL_KEY, (value) => {
    const json = value == null ? null : JSON.stringify(value);
    if (json !== null && json === _lastRemoteJson) return; // our own write echoing back
    handleRemote(value);
    useGlobalSettingsStore.getState().setLoaded(true);
  });
  _unsubStore = useSettingsStore.subscribe(onStoreChange);
}

export function stopGlobalSettings(): void {
  _unsubRemote?.();
  _unsubRemote = null;
  _unsubStore?.();
  _unsubStore = null;
  if (_debounce != null) clearTimeout(_debounce);
  _debounce = null;
  _conn = null;
  _user = null;
  _onModeChange = null;
  _doc = null;
  _base = null;
  _lastRemoteJson = null;
  useGlobalSettingsStore.getState().setLoaded(false);
}
