/**
 * [fork] Which setting belongs to whom once an admin manages HAPulse for everybody
 * ("globale Verwaltung", see ha/globalSettings.ts and docs/SYNC.md).
 *
 *  - GLOBAL  — set by Home Assistant admins, stored in HA `frontend/system_data`
 *              (`hapulse:global`), applied on every device of every user.
 *  - USER    — per HA user, `frontend/user_data` (`hapulse:user-settings`).
 *              Favorites + language start from the admin's defaults, the rest from
 *              the user's own previous settings.
 *  - DEVICE  — never synced (only this browser's localStorage).
 *  - SECRET  — connection tokens: shared through the global document only when the
 *              admin opted in, otherwise device-local (settingsSecrets.ts).
 *
 * Moved from the dashboard to core on 2026-11-19 (shared with the iOS app).
 *
 * This table is the single source of truth; test/globalSettings.test.ts fails when a
 * settings field is not assigned to exactly one scope (e.g. a new upstream field).
 */

import type { ThemeMode, ThemeName } from './themes.js';
import type { Locale } from './i18n.js';
import {
  DEFAULT_CUSTOMIZATION,
  isThemeMode,
  migrateCustomization,
  migrateTheme,
  parseLanguagePref,
  sanitizeCustomization,
} from './settingsModel.js';
import type { CustomizationSettings, ScopedState } from './settingsModel.js';

export const USER_CUSTOMIZATION_KEYS = ['favorites', 'libraryPlayerId', 'detailHistoryRange', 'editingEnabled'] as const;
export const SECRET_CUSTOMIZATION_KEYS = ['scryptedToken', 'maToken'] as const;
export const GLOBAL_TOP_KEYS = ['theme', 'mode', 'accentHue', 'appName', 'appIcon', 'appIconHidden'] as const;
export const USER_TOP_KEYS = ['language', 'userName'] as const;
export const DEVICE_TOP_KEYS = ['sidebarCollapsed', 'lastSeenVersion', 'modeOverride', 'lastSeenFork'] as const;

type UserCustomizationKey = (typeof USER_CUSTOMIZATION_KEYS)[number];
type SecretCustomizationKey = (typeof SECRET_CUSTOMIZATION_KEYS)[number];

const NON_GLOBAL_CUSTOMIZATION = new Set<string>([...USER_CUSTOMIZATION_KEYS, ...SECRET_CUSTOMIZATION_KEYS]);

/** Customization keys owned by the global document: everything that is neither USER nor SECRET. */
export function isGlobalCustomizationKey(key: string): boolean {
  return !NON_GLOBAL_CUSTOMIZATION.has(key);
}

export type GlobalCustomization = Omit<CustomizationSettings, UserCustomizationKey | SecretCustomizationKey>;

/**
 * What the admin shares. Unset optional values are `null` (JSON has no `undefined`, and
 * "reset the accent to the theme default" must travel as a value, not as a missing key).
 */
export interface GlobalSettingsPayload {
  theme: ThemeName;
  mode: ThemeMode;
  accentHue: number | null;
  appName: string | null;
  appIcon: string | null;
  appIconHidden: boolean;
  customization: Partial<GlobalCustomization>;
}

export interface UserSettingsPayload {
  v: 1;
  language: Locale | 'auto';
  userName: string | null;
  favorites: string[];
  libraryPlayerId: string | null;
  detailHistoryRange: string;
  editingEnabled: boolean;
}

export interface SharedSecrets {
  scryptedToken: string;
  maToken: string | null;
}

export interface GlobalUserRef {
  id: string;
  name: string;
}

/** The document in HA `frontend/system_data` under `hapulse:global` (admin-only write). */
export interface GlobalSettingsDoc {
  v: 1;
  rev: number;
  activatedAt: string;
  activatedBy: GlobalUserRef;
  updatedAt: string;
  updatedBy: GlobalUserRef;
  settings: GlobalSettingsPayload;
  /** Starting point for users who have no `hapulse:user-settings` yet. */
  userDefaults: { favorites: string[]; language: Locale | 'auto' };
  shareSecrets: boolean;
  /** Present only while `shareSecrets` is on. */
  secrets?: SharedSecrets;
}

export function extractGlobal(s: ScopedState): GlobalSettingsPayload {
  const customization: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s.customization)) {
    if (isGlobalCustomizationKey(k)) customization[k] = v;
  }
  return {
    theme: s.theme,
    mode: s.mode,
    accentHue: s.accentHue ?? null,
    appName: s.appName ?? null,
    appIcon: s.appIcon ?? null,
    appIconHidden: s.appIconHidden,
    customization: customization as Partial<GlobalCustomization>,
  };
}

export function extractUser(s: ScopedState): UserSettingsPayload {
  const c = s.customization;
  return {
    v: 1,
    language: s.language,
    userName: s.userName ?? null,
    favorites: c.favorites,
    libraryPlayerId: c.libraryPlayerId,
    detailHistoryRange: c.detailHistoryRange,
    editingEnabled: c.editingEnabled,
  };
}

export function extractSecrets(s: ScopedState): SharedSecrets {
  return { scryptedToken: s.customization.scryptedToken, maToken: s.customization.maToken };
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** What changed from `base` to `cur`, per top-level key and per customization key. Empty object = nothing. */
export function diffGlobal(base: GlobalSettingsPayload, cur: GlobalSettingsPayload): Partial<GlobalSettingsPayload> {
  const out: Record<string, unknown> = {};
  for (const k of GLOBAL_TOP_KEYS) {
    if (!same(base[k], cur[k])) out[k] = cur[k];
  }
  const baseC = base.customization as Record<string, unknown>;
  const curC = cur.customization as Record<string, unknown>;
  const changedC: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(baseC), ...Object.keys(curC)])) {
    if (!same(baseC[k], curC[k])) changedC[k] = curC[k];
  }
  if (Object.keys(changedC).length > 0) out['customization'] = changedC;
  return out as Partial<GlobalSettingsPayload>;
}

export function hasChanges(d: Partial<GlobalSettingsPayload>): boolean {
  return Object.keys(d).length > 0;
}

/** Lay `changes` (from diffGlobal) over `onto` — a stale tab only overrides what it changed itself. */
export function mergeGlobal(onto: GlobalSettingsPayload, changes: Partial<GlobalSettingsPayload>): GlobalSettingsPayload {
  const { customization: changedC, ...top } = changes;
  return {
    ...onto,
    ...top,
    customization: { ...onto.customization, ...(changedC ?? {}) },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isRef = (v: unknown): v is GlobalUserRef => isObj(v) && typeof v['id'] === 'string' && typeof v['name'] === 'string';

/** Structural check of a document read from HA. Field-level validation happens when it is applied. */
export function isValidGlobalDoc(v: unknown): v is GlobalSettingsDoc {
  if (!isObj(v) || v['v'] !== 1) return false;
  if (typeof v['rev'] !== 'number' || !isRef(v['activatedBy']) || !isRef(v['updatedBy'])) return false;
  if (typeof v['activatedAt'] !== 'string' || typeof v['updatedAt'] !== 'string') return false;
  const s = v['settings'];
  if (!isObj(s) || typeof s['theme'] !== 'string' || typeof s['mode'] !== 'string' || !isObj(s['customization'])) return false;
  const d = v['userDefaults'];
  if (!isObj(d) || !Array.isArray(d['favorites']) || typeof d['language'] !== 'string') return false;
  if (typeof v['shareSecrets'] !== 'boolean') return false;
  if (v['secrets'] !== undefined && !isObj(v['secrets'])) return false;
  return true;
}

export function isValidUserPayload(v: unknown): v is UserSettingsPayload {
  return isObj(v) && v['v'] === 1 && Array.isArray(v['favorites']) && typeof v['language'] === 'string';
}

// ---- apply steps (the store's applyGlobal / applyUser / applySharedSecrets without the store) ----

/** The fields `applyGlobalSettings` / `applyUserSettings` change. */
export type ScopedPatch = Pick<
  ScopedState,
  'theme' | 'mode' | 'accentHue' | 'appName' | 'appIcon' | 'appIconHidden' | 'customization'
>;

/**
 * State after applying the admin's global document: only GLOBAL customization keys are taken, type-checked,
 * the one-time markers reset where the document carries the list they belong to, then the migrations.
 */
export function applyGlobalSettings(cur: ScopedState, payload: GlobalSettingsPayload): ScopedPatch {
  const picked: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload.customization ?? {})) {
    if (isGlobalCustomizationKey(k)) picked[k] = v;
  }
  const incoming = sanitizeCustomization(picked, DEFAULT_CUSTOMIZATION);
  // A chip marker belongs to the homeChips list it came with. A global document written before a chip existed
  // carries its list but no marker — without this, the marker this device already set would skip the migration
  // and the admin's older list would hide the new chip for everyone.
  if (incoming.homeChips) {
    incoming.poolChipMigrated ??= false;
    incoming.garageChipMigrated ??= false;
    incoming.locksChipMigrated ??= false;
  }
  // Same for the hints section marker and the section order it belongs to (Glas Etappe 4, K76).
  if (incoming.homeSectionOrder) incoming.hintsSectionMigrated ??= false;
  // Glas: a document written before the style existed carries none — the admin's choice is then Klassisch,
  // not a style this device happened to keep (e.g. from an imported export).
  incoming.uiStyle ??= DEFAULT_CUSTOMIZATION.uiStyle;
  incoming.glassStrength ??= DEFAULT_CUSTOMIZATION.glassStrength;
  incoming.reduceTransparency ??= DEFAULT_CUSTOMIZATION.reduceTransparency;
  const migrated = migrateTheme(payload.theme);
  return {
    theme: migrated?.theme ?? cur.theme,
    mode: isThemeMode(payload.mode) ? payload.mode : cur.mode,
    accentHue: typeof payload.accentHue === 'number' ? payload.accentHue : undefined,
    appName: typeof payload.appName === 'string' ? payload.appName : undefined,
    appIcon: typeof payload.appIcon === 'string' ? payload.appIcon : undefined,
    appIconHidden: typeof payload.appIconHidden === 'boolean' ? payload.appIconHidden : false,
    customization: migrateCustomization({ ...cur.customization, ...incoming }, { urlToken: false }),
  };
}

/** State after applying the user's own document (`hapulse:user-settings`): USER keys, language and name. */
export function applyUserSettings(
  cur: ScopedState,
  payload: Partial<UserSettingsPayload>,
): Pick<ScopedState, 'language' | 'userName' | 'customization'> {
  const picked: Record<string, unknown> = {};
  for (const k of USER_CUSTOMIZATION_KEYS) {
    if (payload[k] !== undefined) picked[k] = payload[k];
  }
  const incoming = sanitizeCustomization(picked, DEFAULT_CUSTOMIZATION);
  const favorites = Array.isArray(incoming.favorites) && incoming.favorites.every((x) => typeof x === 'string')
    ? incoming.favorites
    : cur.customization.favorites;
  return {
    language: parseLanguagePref(payload.language, cur.language),
    userName: typeof payload.userName === 'string' ? payload.userName : payload.userName === null ? undefined : cur.userName,
    customization: { ...cur.customization, ...incoming, favorites },
  };
}

/**
 * Tokens after the global document was read: the shared ones when the admin shares them, otherwise this device's
 * own (`keepOwn`) or none.
 */
export function sharedSecretsFor(
  cur: Pick<CustomizationSettings, 'scryptedToken' | 'maToken'>,
  secrets: SharedSecrets | null | undefined,
  keepOwn: boolean,
): { scryptedToken: string; maToken: string | null } {
  if (secrets) {
    return {
      scryptedToken: typeof secrets.scryptedToken === 'string' ? secrets.scryptedToken : '',
      maToken: typeof secrets.maToken === 'string' ? secrets.maToken : null,
    };
  }
  return keepOwn ? { scryptedToken: cur.scryptedToken, maToken: cur.maToken } : { scryptedToken: '', maToken: null };
}
