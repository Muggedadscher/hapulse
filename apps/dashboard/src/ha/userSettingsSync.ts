/**
 * [fork] The user's own settings while HAPulse is managed globally by an admin.
 *
 * Only the USER scope (stores/settingsScope.ts) is synced, under its own key
 * `hapulse:user-settings` in HA `frontend/user_data`. The old full snapshot
 * (`hapulse:settings`, ha/settingsSync.ts) is left untouched: older tabs may still write
 * it, and it seeds the user's own values once. Favorites + language start from the
 * admin's defaults in the global document.
 */

import type { HAConnection } from '@hapulse/core';
import { useSettingsStore } from '../stores/settingsStore';
import { applyingRemote, isApplyingRemote } from '../stores/settingsApplyGuard';
import { extractUser, isValidUserPayload } from '../stores/settingsScope';
import type { UserSettingsPayload } from '../stores/settingsScope';
import { getGlobalDoc } from './globalSettings';

export const USER_SETTINGS_KEY = 'hapulse:user-settings';
const LEGACY_KEY = 'hapulse:settings';
const DEBOUNCE_MS = 750;

type Conn = Pick<HAConnection, 'getUserDataStrict' | 'getUserData' | 'setUserData' | 'subscribeUserData'>;

let _conn: Conn | null = null;
let _lastJson: string | null = null;
let _unsubRemote: (() => void) | null = null;
let _unsubStore: (() => void) | null = null;
let _debounce: ReturnType<typeof setTimeout> | null = null;

function apply(payload: UserSettingsPayload): void {
  applyingRemote(() => useSettingsStore.getState().applyUser(payload));
  _lastJson = JSON.stringify(extractUser(useSettingsStore.getState()));
}

/** First start for this user: admin defaults for favorites/language, own old values for the rest. */
async function seed(conn: Conn): Promise<void> {
  const state = useSettingsStore.getState();
  const defaults = getGlobalDoc()?.userDefaults;
  const legacy = await conn.getUserData<{ userName?: unknown; customization?: Record<string, unknown> }>(LEGACY_KEY);
  const lc = legacy?.customization ?? {};
  const own = extractUser(state);
  const payload: UserSettingsPayload = {
    v: 1,
    language: defaults?.language ?? own.language,
    favorites: defaults?.favorites ?? own.favorites,
    userName: typeof legacy?.userName === 'string' ? legacy.userName : own.userName,
    libraryPlayerId: typeof lc['libraryPlayerId'] === 'string' ? lc['libraryPlayerId'] : own.libraryPlayerId,
    detailHistoryRange: typeof lc['detailHistoryRange'] === 'string' ? lc['detailHistoryRange'] : own.detailHistoryRange,
    editingEnabled: typeof lc['editingEnabled'] === 'boolean' ? lc['editingEnabled'] : own.editingEnabled,
  };
  apply(payload);
  await conn.setUserData(USER_SETTINGS_KEY, extractUser(useSettingsStore.getState()));
}

async function adopt(conn: Conn): Promise<void> {
  try {
    const remote = await conn.getUserDataStrict<unknown>(USER_SETTINGS_KEY);
    if (remote != null && isValidUserPayload(remote)) apply(remote);
    else await seed(conn);
  } catch (err) {
    // A failed read must not look like "nothing stored" (that would overwrite it with defaults).
    console.warn('[HAPulse] userSettingsSync: reading the user settings failed, keeping local values:', err);
  }
}

async function push(): Promise<void> {
  const conn = _conn;
  if (!conn) return;
  const payload = extractUser(useSettingsStore.getState());
  const json = JSON.stringify(payload);
  if (json === _lastJson) return;
  _lastJson = json;
  try {
    await conn.setUserData(USER_SETTINGS_KEY, payload);
  } catch (err) {
    console.warn('[HAPulse] userSettingsSync: writing the user settings failed:', err);
    _lastJson = null; // retry with the next change
  }
}

export function startUserSettingsSync(conn: Conn): void {
  stopUserSettingsSync();
  _conn = conn;
  void adopt(conn);

  _unsubRemote = conn.subscribeUserData<unknown>(USER_SETTINGS_KEY, (value) => {
    if (value == null || !isValidUserPayload(value)) return;
    if (JSON.stringify(value) === _lastJson) return; // our own write echoing back
    apply(value);
  });

  _unsubStore = useSettingsStore.subscribe(() => {
    if (isApplyingRemote()) return;
    if (JSON.stringify(extractUser(useSettingsStore.getState())) === _lastJson) return;
    if (_debounce != null) clearTimeout(_debounce);
    _debounce = setTimeout(() => {
      _debounce = null;
      void push();
    }, DEBOUNCE_MS);
  });
}

export function stopUserSettingsSync(): void {
  _unsubRemote?.();
  _unsubRemote = null;
  _unsubStore?.();
  _unsubStore = null;
  if (_debounce != null) clearTimeout(_debounce);
  _debounce = null;
  _conn = null;
  _lastJson = null;
}

/** Flush a pending push (tests). */
export async function flushUserSettingsPush(): Promise<void> {
  if (_debounce != null) {
    clearTimeout(_debounce);
    _debounce = null;
    await push();
  }
}
