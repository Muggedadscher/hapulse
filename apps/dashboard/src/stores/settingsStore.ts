/**
 * settingsStore — theme, accent, customization.
 * Persisted under key `hapulse:settings` via the swappable persistence seam
 * (localStorage by default; the SaaS build injects a Supabase-backed adapter).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEME_NAMES } from '../theme/themes';
import type { ThemeName, ThemeMode } from '../theme/themes';
import { dynamicJSONStorage } from '../persistence/zustandStorage';
import { LOCALES, CURRENT_VERSION } from '@hapulse/core';
import type { Locale } from '@hapulse/core';

/**
 * Migrate a pre-v0.5 theme value (dusk/dawn/midnight/sage — which encoded both
 * identity AND light/dark) to the new { theme, mode } model. New-style values
 * pass through. Returns undefined for unknown input.
 */
function migrateTheme(value: unknown): { theme: ThemeName; mode: ThemeMode } | undefined {
  if (typeof value !== 'string') return undefined;
  if ((THEME_NAMES as readonly string[]).includes(value)) {
    return { theme: value as ThemeName, mode: 'light' };
  }
  switch (value) {
    case 'dusk': return { theme: 'sunset', mode: 'dark' };
    case 'dawn': return { theme: 'sunset', mode: 'light' };
    case 'midnight': return { theme: 'ocean', mode: 'dark' };
    case 'sage': return { theme: 'forest', mode: 'light' };
    default: return undefined;
  }
}

export interface CustomizationSettings {
  roomOrder: string[];
  hiddenRooms: string[];
  hiddenEntities: string[];
  entityOverrides: Record<string, { name?: string; icon?: string }>;
  homeChips: string[];
  /** areaId → ordered entity_ids within that room */
  entityOrder: Record<string, string[]>;
  /** Entity IDs pinned to the favorites strip on the Home page */
  favorites: string[];
  /** Chosen weather.* entity id for the header glance + weather modal. Empty = auto (first weather entity). */
  weatherEntity: string;
  /** Ordered Home Overview section ids (e.g. scenes/hero/energy/...). */
  homeSectionOrder: string[];
  /** Home Overview section ids that are hidden. */
  hiddenSections: string[];
  /** Per-room section display order: areaId → ordered section keys */
  roomSectionOrder: Record<string, string[]>;
  /**
   * Per-room section column span on the room page's 2-column grid, keyed by
   * `${areaId}:${sectionKey}`. 1 = half width, 2 = full width (the default when
   * unset). Lets a user narrow individual room sections like the other pages.
   */
  roomSectionSpans: Record<string, number>;
  /** Ordered navigation item ids (sidebar + mobile tabs). */
  navOrder: string[];
  /** Navigation item ids that are hidden. */
  hiddenNav: string[];
  /** Per-section column span overrides on the home overview grid (1–4). */
  homeSectionSpans: Record<string, number>;
  /** Per-section max-height level on the home overview grid (0 = no cap, 1–4). */
  homeSectionHeights: Record<string, number>;
  /** Ordered Automations section ids (hero, activity, cat_*). */
  automationSectionOrder: string[];
  /** Automation section ids that are hidden. */
  hiddenAutomationSections: string[];
  /** Per-section column span overrides on the automations grid (1–4). */
  automationSectionSpans: Record<string, number>;
  /** Per-section max-height level on the automations grid (0 = no cap, 1–4). */
  automationSectionHeights: Record<string, number>;
  /** Ordered Scenes section ids (hero, activity, room_*). */
  sceneSectionOrder: string[];
  /** Scene section ids that are hidden. */
  hiddenSceneSections: string[];
  /** Per-section column span overrides on the scenes grid (1–4). */
  sceneSectionSpans: Record<string, number>;
  /** Per-section max-height level on the scenes grid (0 = no cap, 1–4). */
  sceneSectionHeights: Record<string, number>;
  /** Ordered Music page section ids (now_playing, other_players, zones). */
  musicSectionOrder: string[];
  /** Music section ids that are hidden. */
  hiddenMusicSections: string[];
  /** Per-section column span overrides on the music grid (1–4). */
  musicSectionSpans: Record<string, number>;
  /** Ordered Security page section ids. */
  securitySectionOrder: string[];
  /** Security section ids that are hidden. */
  hiddenSecuritySections: string[];
  /** Per-section column span overrides on the security grid (1–4). */
  securitySectionSpans: Record<string, number>;
  /** Per-section max-height level on the security grid (0 = no cap, 1–4). */
  securitySectionHeights: Record<string, number>;
  /** Whether admin editing controls (edit buttons on pages, rooms in settings) are shown. */
  editingEnabled: boolean;
  /** Ordered System page section ids. */
  systemSectionOrder: string[];
  /** System section ids that are hidden. */
  hiddenSystemSections: string[];
  /** Per-section column span overrides on the system grid (1–4). */
  systemSectionSpans: Record<string, number>;
  /** Per-section max-height level on the system grid (0 = no cap, 1–4). */
  systemSectionHeights: Record<string, number>;
  /** Ordered Energy page section ids (hero, usage, devices, solar, water, gas). */
  energySectionOrder: string[];
  /** Energy section ids that are hidden. */
  hiddenEnergySections: string[];
  /** Per-section column span overrides on the energy grid (1–4). */
  energySectionSpans: Record<string, number>;
  /** Per-section max-height level on the energy grid (0 = no cap, 1–4). */
  energySectionHeights: Record<string, number>;
  /**
   * Section ids hidden on MOBILE ONLY (still shown on desktop/larger screens),
   * one list per page. These are independent of the full hidden* lists above:
   * a section in a mobile-hidden list renders on desktop but is suppressed on
   * the mobile layout. (Edit mode always shows them so they stay togglable.)
   */
  mobileHiddenSections: string[];
  mobileHiddenAutomationSections: string[];
  mobileHiddenSceneSections: string[];
  mobileHiddenMusicSections: string[];
  mobileHiddenSecuritySections: string[];
  mobileHiddenSystemSections: string[];
  mobileHiddenEnergySections: string[];
  /**
   * [fork] Base URL of the Scrypted (NVR) web interface, embedded on the NVR
   * page. Empty = not configured (the page shows a setup prompt).
   */
  scryptedUrl: string;
  /**
   * [fork] Last-selected time range in the sensor history modal
   * (`1h`/`6h`/`24h`/`7d`/`30d`). Remembered across sensors, per user.
   */
  historyRange: string;
  /**
   * [fork] One-time marker: the pool summary chip has been added to `homeChips`.
   * Lets the chip default ON for existing installs (whose stored homeChips
   * predate it) exactly once, while still allowing it to be hidden afterwards.
   */
  poolChipMigrated: boolean;
}

/**
 * [fork] Ensure the pool summary chip is enabled by default the first time an
 * install with pre-existing homeChips is loaded. Idempotent via the marker, so
 * a user who later hides the chip keeps it hidden.
 */
function migratePoolChip(cust: CustomizationSettings): CustomizationSettings {
  if (cust.poolChipMigrated) return cust;
  const homeChips = cust.homeChips.includes('pool') ? cust.homeChips : [...cust.homeChips, 'pool'];
  return { ...cust, homeChips, poolChipMigrated: true };
}

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
}

const DEFAULT_CUSTOMIZATION: CustomizationSettings = {
  roomOrder: [],
  hiddenRooms: [],
  hiddenEntities: [],
  entityOverrides: {},
  homeChips: ['people', 'lights', 'doors', 'alarm', 'media', 'pool'], // [fork] pool chip
  entityOrder: {},
  favorites: [],
  weatherEntity: '',
  homeSectionOrder: [],
  hiddenSections: ['blinds'],
  roomSectionOrder: {},
  roomSectionSpans: {},
  navOrder: [],
  hiddenNav: [],
  homeSectionSpans: {},
  homeSectionHeights: {},
  automationSectionOrder: [],
  hiddenAutomationSections: [],
  automationSectionSpans: {},
  automationSectionHeights: {},
  sceneSectionOrder: [],
  hiddenSceneSections: [],
  sceneSectionSpans: {},
  sceneSectionHeights: {},
  musicSectionOrder: [],
  hiddenMusicSections: [],
  musicSectionSpans: {},
  securitySectionOrder: [],
  hiddenSecuritySections: [],
  securitySectionSpans: {},
  securitySectionHeights: {},
  editingEnabled: true,
  systemSectionOrder: [],
  hiddenSystemSections: [],
  systemSectionSpans: {},
  systemSectionHeights: {},
  energySectionOrder: [],
  hiddenEnergySections: [],
  energySectionSpans: {},
  energySectionHeights: {},
  mobileHiddenSections: [],
  mobileHiddenAutomationSections: [],
  mobileHiddenSceneSections: [],
  mobileHiddenMusicSections: [],
  mobileHiddenSecuritySections: [],
  mobileHiddenSystemSections: [],
  mobileHiddenEnergySections: [],
  scryptedUrl: '', // [fork]
  historyRange: '24h', // [fork]
  poolChipMigrated: false, // [fork]
};

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
        set({ lastSeenVersion: CURRENT_VERSION });
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
        return JSON.stringify(
          { theme, mode, accentHue, customization, userName, appName, appIcon, appIconHidden, sidebarCollapsed, language, lastSeenVersion },
          null,
          2
        );
      },

      importSettings(json) {
        try {
          const data = JSON.parse(json) as Partial<SettingsState>;
          const incoming: Partial<CustomizationSettings> = data.customization ?? {};

          // Validate entityOrder: must be an object whose values are string arrays
          let entityOrder: Record<string, string[]> = {};
          if (
            incoming.entityOrder != null &&
            typeof incoming.entityOrder === 'object' &&
            !Array.isArray(incoming.entityOrder)
          ) {
            for (const [k, v] of Object.entries(incoming.entityOrder)) {
              if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
                entityOrder[k] = v;
              }
            }
          }

          // Validate favorites: must be a string array
          const favorites: string[] =
            Array.isArray(incoming.favorites) &&
            incoming.favorites.every((x) => typeof x === 'string')
              ? (incoming.favorites as string[])
              : [];

          const migrated = migrateTheme(data.theme) ?? { theme: 'aurora' as ThemeName, mode: 'light' as ThemeMode };
          const mode: ThemeMode =
            data.mode === 'light' || data.mode === 'dark' || data.mode === 'auto'
              ? data.mode
              : migrated.mode;

          const language: Locale | 'auto' =
            data.language === 'auto' || (LOCALES as readonly string[]).includes(data.language as string)
              ? (data.language as Locale | 'auto')
              : 'auto';

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
            customization: migratePoolChip({
              ...DEFAULT_CUSTOMIZATION,
              ...incoming,
              entityOrder,
              favorites,
            }),
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
        const lastSeenVersion =
          typeof p.lastSeenVersion === 'string' ? p.lastSeenVersion : '1.0.0';
        return {
          ...current,
          ...p,
          lastSeenVersion,
          theme: migrated?.theme ?? current.theme,
          mode,
          customization: migratePoolChip({
            ...DEFAULT_CUSTOMIZATION,
            ...(p.customization ?? {}),
          }),
        };
      },
    }
  )
);
