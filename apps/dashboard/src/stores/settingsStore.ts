/**
 * settingsStore — theme, accent, customization.
 * Persisted under key `hapulse:settings` via the swappable persistence seam
 * (localStorage by default; the SaaS build injects a Supabase-backed adapter).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeName, ThemeMode } from '../theme/themes';
import { dynamicJSONStorage } from '../persistence/zustandStorage';
import { CURRENT_VERSION } from '@hapulse/core';
import { CURRENT_FORK_VERSION } from '@hapulse/core'; // [fork]
import type { Locale } from '@hapulse/core';
// [fork] The settings model (fields, defaults, migrations, type check, apply steps) lives in @hapulse/core since
// 2026-11-19 so the iOS app reads snapshots and global documents the same way (iOS W1).
import {
  DEFAULT_CUSTOMIZATION,
  applyGlobalSettings,
  applyUserSettings,
  hydrateCustomization,
  importedCustomization,
  isThemeMode,
  migrateTheme,
  parseLanguagePref,
  sharedSecretsFor,
  splitUrlToken,
} from '@hapulse/core';
import type { CustomizationSettings, GlobalSettingsPayload, SharedSecrets, UserSettingsPayload } from '@hapulse/core';
export type { CustomizationSettings } from '@hapulse/core';
export { migrateGarageChip, migrateLocksChip, migrateHintsSection } from '@hapulse/core';

interface SettingsState {
  /** Color identity (aurora/sunset/ocean/forest). */
  theme: ThemeName;
  /** Appearance mode: light | dark | auto (follows OS). */
  mode: ThemeMode;
  accentHue?: number | undefined;
  customization: CustomizationSettings;
  userName?: string | undefined;
  /** Custom sidebar wordmark, shown instead of "HAPulse" when set. */
  appName?: string | undefined;
  /** Sidebar logo glyph id (see PulseLogo's APP_ICON_IDS). Undefined/unrecognised → the default heartbeat. */
  appIcon?: string | undefined;
  /** If true, the sidebar logo glyph is omitted (wordmark only). */
  appIconHidden: boolean;
  /** Desktop sidebar collapsed to an icon-only rail. */
  sidebarCollapsed: boolean;
  /** Display language. 'auto' resolves from Home Assistant, then the browser. */
  language: Locale | 'auto';
  /**
   * Newest release whose notes this user has already seen. Drives the What's
   * New modal, which shows exactly the releases newer than this.
   *
   * A fresh install starts at CURRENT_VERSION — someone opening HAPulse for the
   * first time should not be greeted by a changelog. An install that predates
   * this field is backfilled to '1.0.0' in `merge` below, so upgrading users DO
   * get the notes. `null` means "show nothing", and is only reachable through a
   * hand-edited import.
   */
  lastSeenVersion: string | null;
  /**
   * [fork] Light/dark on THIS device only (global admin management: the admin's `mode` is the
   * default, a device may deviate, e.g. a wall tablet). null = follow `mode`. Never synced/exported.
   */
  modeOverride: ThemeMode | null;
  /**
   * [fork] Newest FORK release (F<n>, forkChangelog.ts) this device has seen — the What's New modal shows upstream
   * releases newer than `lastSeenVersion` AND fork releases newer than this. Device-only (never exported/synced);
   * a fresh install starts at CURRENT_FORK_VERSION, an install from before this field at 0 (sees all once).
   */
  lastSeenFork: number;
}

interface SettingsActions {
  setTheme: (theme: ThemeName) => void;
  setMode: (mode: ThemeMode) => void;
  setAccentHue: (hue: number | undefined) => void;
  setUserName: (name: string) => void;
  setAppName: (name: string) => void;
  setAppIcon: (icon: string | undefined) => void;
  setAppIconHidden: (hidden: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  updateCustomization: (patch: Partial<CustomizationSettings>) => void;
  exportSettings: () => string;
  importSettings: (json: string) => void;
  setLanguage(language: Locale | 'auto'): void;
  /** Record that the user has seen the notes up to the running version. */
  markVersionSeen: () => void;
  /** [fork] Device-only light/dark override (null = follow the shared mode). */
  setModeOverride: (mode: ThemeMode | null) => void;
  /** [fork] Apply the admin-managed (GLOBAL) settings; USER/DEVICE fields and tokens stay untouched. */
  applyGlobal: (payload: GlobalSettingsPayload) => void;
  /** [fork] Apply this user's own (USER-scope) settings from `hapulse:user-settings`. */
  applyUser: (payload: Partial<UserSettingsPayload>) => void;
  /** [fork] Tokens shared by the admin (null = not shared: keep this device's own only if `keepOwn`). */
  applySharedSecrets: (secrets: SharedSecrets | null, keepOwn: boolean) => void;
}

/** [fork] The light/dark mode actually shown on this device. */
export function effectiveMode(s: { mode: ThemeMode; modeOverride?: ThemeMode | null }): ThemeMode {
  return s.modeOverride ?? s.mode;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      theme: 'aurora',
      mode: 'light',
      accentHue: undefined,
      customization: DEFAULT_CUSTOMIZATION,
      userName: undefined,
      appName: undefined,
      appIcon: undefined,
      appIconHidden: false,
      sidebarCollapsed: false,
      language: 'auto',
      lastSeenVersion: CURRENT_VERSION,
      modeOverride: null, // [fork]
      lastSeenFork: CURRENT_FORK_VERSION, // [fork]

      setTheme(theme) {
        set({ theme });
      },

      setMode(mode) {
        set({ mode });
      },

      setLanguage(language) {
        set({ language });
      },

      markVersionSeen() {
        set({ lastSeenVersion: CURRENT_VERSION, lastSeenFork: CURRENT_FORK_VERSION }); // [fork] + lastSeenFork
      },

      // [fork] ---- global admin management (ha/globalSettings.ts) ----
      setModeOverride(modeOverride) {
        set({ modeOverride });
      },

      applyGlobal(payload) {
        set(applyGlobalSettings(get(), payload)); // [fork] rules in core settingsScope.ts
      },

      applyUser(payload) {
        set(applyUserSettings(get(), payload)); // [fork] rules in core settingsScope.ts
      },

      applySharedSecrets(secrets, keepOwn) {
        const c = get().customization;
        const next = sharedSecretsFor(c, secrets, keepOwn);
        if (next.scryptedToken === c.scryptedToken && next.maToken === c.maToken) return;
        set({ customization: { ...c, ...next } });
      },

      setAccentHue(accentHue) {
        set({ accentHue });
      },

      setUserName(userName) {
        set({ userName });
      },

      setAppName(appName) {
        set({ appName });
      },

      setAppIcon(appIcon) {
        set({ appIcon });
      },

      setAppIconHidden(appIconHidden) {
        set({ appIconHidden });
      },

      setSidebarCollapsed(sidebarCollapsed) {
        set({ sidebarCollapsed });
      },

      updateCustomization(patch) {
        set((s) => ({
          customization: { ...s.customization, ...patch },
        }));
      },

      exportSettings() {
        const { theme, mode, accentHue, customization, userName, appName, appIcon, appIconHidden, sidebarCollapsed, language, lastSeenVersion } = get();
        // Never let connection secrets ride along in a shared/exported settings
        // file. scryptedToken and maToken grant full access to the NVR / Music
        // Assistant; the importer re-enters them. URLs are kept.
        const { scryptedToken: _st, maToken: _mt, ...rest } = customization;
        void _st; void _mt;
        // [fork] …and no token hidden in the NVR URL either (old installs kept it there)
        const safeCustomization = { ...rest, scryptedUrl: splitUrlToken(rest.scryptedUrl ?? '').url };
        return JSON.stringify(
          { theme, mode, accentHue, customization: safeCustomization, userName, appName, appIcon, appIconHidden, sidebarCollapsed, language, lastSeenVersion },
          null,
          2
        );
      },

      importSettings(json) {
        try {
          const data = JSON.parse(json) as Partial<SettingsState>;
          const migrated = migrateTheme(data.theme) ?? { theme: 'aurora' as ThemeName, mode: 'light' as ThemeMode };
          const mode: ThemeMode =
            data.mode === 'light' || data.mode === 'dark' || data.mode === 'auto'
              ? data.mode
              : migrated.mode;

          const language: Locale | 'auto' = parseLanguagePref(data.language, 'auto');

          // Adopted so dismissing What's New on one device settles it on the
          // others too (this same path applies snapshots arriving from Home
          // Assistant). A snapshot without the field leaves the local value
          // alone rather than resetting it.
          const lastSeenVersion =
            typeof data.lastSeenVersion === 'string' && /^\d+\.\d+\.\d+$/.test(data.lastSeenVersion)
              ? data.lastSeenVersion
              : get().lastSeenVersion;

          set({
            theme: migrated.theme,
            mode,
            accentHue: data.accentHue,
            // [fork] type check, entityOrder/favorites, device-local tokens and the migrations: core importedCustomization
            customization: importedCustomization(get().customization, data.customization),
            userName: data.userName,
            appName: data.appName,
            appIcon: data.appIcon,
            appIconHidden: typeof data.appIconHidden === 'boolean' ? data.appIconHidden : false,
            sidebarCollapsed: typeof data.sidebarCollapsed === 'boolean' ? data.sidebarCollapsed : false,
            language,
            lastSeenVersion,
          });
        } catch {
          console.error('[settingsStore] importSettings: invalid JSON');
        }
      },
    }),
    {
      name: 'hapulse:settings',
      // Persist through the swappable adapter seam. Stays synchronous when the
      // active adapter is synchronous (localStorage), so open-source hydration
      // is unchanged; an async adapter (SaaS/Supabase) hydrates asynchronously.
      storage: dynamicJSONStorage<SettingsState & SettingsActions>(),
      // Deep-merge persisted state over defaults so settings saved by an OLDER
      // version (missing newer customization keys like entityOrder) hydrate with
      // the default for any absent key instead of leaving it undefined.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState> & { theme?: unknown };
        // Migrate pre-v0.5 theme values (dusk/dawn/midnight/sage) → { theme, mode }.
        const migrated = migrateTheme(p.theme);
        const mode: ThemeMode =
          p.mode === 'light' || p.mode === 'dark' || p.mode === 'auto'
            ? p.mode
            : (migrated?.mode ?? current.mode);
        // An install saved before this field existed is an UPGRADE, not a fresh
        // start: backfill it to the last release that shipped without a
        // changelog so the What's New modal has something to show. A fresh
        // install never reaches `merge` (there is nothing persisted) and keeps
        // the CURRENT_VERSION default instead.
        // [fork] …except zustand's persist DOES call `merge` with `undefined` when nothing is stored, so a fresh
        // install got 1.1.0–1.3.2 as "new" on its first start (lab probe hp-changelog-test.cjs); keep the default there.
        const lastSeenVersion = persisted == null ? current.lastSeenVersion // [fork]
          : typeof p.lastSeenVersion === 'string' ? p.lastSeenVersion : '1.0.0';
        return {
          ...current,
          ...p,
          lastSeenVersion,
          theme: migrated?.theme ?? current.theme,
          mode,
          modeOverride: isThemeMode(p.modeOverride) ? p.modeOverride : null, // [fork]
          // [fork] Nothing persisted = fresh install → nothing to catch up on; a persisted state without the field
          // predates the fork changelog → 0 (its notes show once).
          lastSeenFork: persisted == null
            ? current.lastSeenFork
            : Number.isInteger(p.lastSeenFork) && (p.lastSeenFork as number) >= 0 ? (p.lastSeenFork as number) : 0,
          customization: hydrateCustomization(p.customization), // [fork] defaults + migrations (core)
        };
      },
    }
  )
);
