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
 * This table is the single source of truth; test/globalSettings.test.ts fails when a
 * settings field is not assigned to exactly one scope (e.g. a new upstream field).
 */

import type { ThemeMode, ThemeName } from '../theme/themes';
import type { Locale } from '@hapulse/core';
import type { CustomizationSettings } from './settingsStore';

export const USER_CUSTOMIZATION_KEYS = ['favorites', 'libraryPlayerId', 'detailHistoryRange', 'editingEnabled'] as const;
export const SECRET_CUSTOMIZATION_KEYS = ['scryptedToken', 'maToken'] as const;
export const GLOBAL_TOP_KEYS = ['theme', 'mode', 'accentHue', 'appName', 'appIcon', 'appIconHidden'] as const;
export const USER_TOP_KEYS = ['language', 'userName'] as const;
export const DEVICE_TOP_KEYS = ['sidebarCollapsed', 'lastSeenVersion', 'modeOverride'] as const;

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

/** The slice of the settings store the scope helpers read. */
export interface ScopedState {
  theme: ThemeName;
  mode: ThemeMode;
  accentHue?: number | undefined;
  appName?: string | undefined;
  appIcon?: string | undefined;
  appIconHidden: boolean;
  language: Locale | 'auto';
  userName?: string | undefined;
  customization: CustomizationSettings;
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
