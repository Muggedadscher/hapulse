/**
 * [fork] The HAPulse settings model without a store: the customization fields, their defaults, the one-time
 * migrations, the type check for incoming values, and the pure "apply" steps for imports, the global admin
 * document and the per-user document. The web store (`apps/dashboard/src/stores/settingsStore.ts`) and the native
 * iOS app (`apps/ios`) both use these rules, so a snapshot or a global document means the same on every client.
 * Moved here from the dashboard on 2026-11-19 (iOS stage W1); behaviour is unchanged.
 */

import { LOCALES } from './i18n.js';
import type { Locale } from './i18n.js';
import { THEME_NAMES } from './themes.js';
import type { ThemeMode, ThemeName } from './themes.js';
import { keepDeviceSecrets, migrateUrlToken } from './settingsSecrets.js';

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
  /** Music Assistant library: last chosen playback target (entity_id). */
  libraryPlayerId: string | null;
  /** Direct Music Assistant connection (full queue): server URL + API token.
   *  Optional — without it the queue card shows HA's summary only. */
  maServerUrl: string | null;
  maToken: string | null;
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
   * Scrypted origin (e.g. `https://host:10443`) of the Sentinel NVR the
   * native NVR pages talk to. Empty = not configured (the page shows a setup
   * prompt). Any pasted Sentinel URL is normalised by `parseSentinelSetup`.
   */
  scryptedUrl: string;
  /**
   * Sentinel NVR access token (plugin settings → "Sicherheit"). Together
   * with `scryptedUrl` this is the native NVR integration's connection; the
   * browser talks to the plugin's `/public/` endpoint directly (HAPulse has no
   * backend). Stored like `maToken` — per HA user, never sent anywhere else.
   */
  scryptedToken: string;
  /**
   * Last-selected time range in the entity detail modal's history
   * chart (`24h`/`7d`/`30d`). Remembered across entities, per user.
   */
  detailHistoryRange: string;
  /**
   * One-time marker: the pool summary chip has been added to `homeChips`.
   * Lets the chip default ON for existing installs (whose stored homeChips
   * predate it) exactly once, while still allowing it to be hidden afterwards.
   */
  poolChipMigrated: boolean;
  /** Same one-time marker for the garage summary chip (garage doors / gates). */
  garageChipMigrated: boolean;
  /** Same one-time marker for the locks summary chip. */
  locksChipMigrated: boolean;
  /**
   * One-time marker: the waste-collection card has been slotted into a
   * pre-existing `homeSectionOrder`. Gives it a sensible default position (after
   * Security) for installs that had already reordered their Home sections,
   * exactly once — a later manual move is preserved.
   */
  wasteSectionMigrated: boolean;
  /** Same one-time placement for the Sentinel NVR home card (after Waste/Security). */
  nvrSectionMigrated: boolean;
  /** Same one-time placement for the home hints (first). */
  hintsSectionMigrated: boolean;
  /** Glas S/M/L: sections drawn "taller" (L), as `<page>:<section>` (core `tallKey`). Read in Glas ≥ 900 px only. */
  tallSections: string[];
  /** One-time sidebar reorder to Overview, Rooms, NVR, Pool, rest (see `migrateNavOrderV2`). */
  navOrderV2Migrated: boolean;
  /** Sentinel camera id → HA area id (null = no room): room pages show these cameras (nvr/cameraSource.ts). */
  nvrCameraRooms: Record<string, string | null>;
  /**
   * HA area id → entity id the room's temperature comes from (a temperature sensor or a thermostat of the room;
   * core `roomTemperature`). Missing = automatic (first temperature sensor, else the thermostat). GLOBAL.
   */
  roomTemperatureSource: Record<string, string>;
  /**
   * Second style "Glas" (docs/GLAS-PLAN.md): `'classic'` | `'glas'`. Only look and motion change.
   * GLOBAL like every customization field: under admin management the admin sets it for everybody (E1).
   * Read through `resolveAppearance` (theme/glasAppearance.ts), which maps unknown values to `'classic'`.
   */
  uiStyle: string;
  /** Glas: `'clear'` | `'tinted'` | `'opaque'` (unknown → `'clear'`). GLOBAL (E2). */
  glassStrength: string;
  /** Glas: solid surfaces instead of glass, e.g. for older tablets. GLOBAL (E2). */
  reduceTransparency: boolean;
}

export const DEFAULT_CUSTOMIZATION: CustomizationSettings = {
  roomOrder: [],
  hiddenRooms: [],
  hiddenEntities: [],
  entityOverrides: {},
  homeChips: ['people', 'lights', 'doors', 'alarm', 'media', 'pool', 'garage', 'locks'],
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
  scryptedUrl: '',
  scryptedToken: '',
  detailHistoryRange: '24h',
  poolChipMigrated: false,
  garageChipMigrated: false,
  locksChipMigrated: false,
  wasteSectionMigrated: false,
  nvrSectionMigrated: false,
  hintsSectionMigrated: false,
  tallSections: [],
  navOrderV2Migrated: false,
  nvrCameraRooms: {},
  roomTemperatureSource: {},
  uiStyle: 'classic',
  glassStrength: 'clear',
  reduceTransparency: false,
  libraryPlayerId: null,
  maServerUrl: null,
  maToken: null,
};

// ---- theme, mode, language -------------------------------------------------

/**
 * Migrate a pre-v0.5 theme value (dusk/dawn/midnight/sage — which encoded both
 * identity AND light/dark) to the new { theme, mode } model. New-style values
 * pass through. Returns undefined for unknown input.
 */
export function migrateTheme(value: unknown): { theme: ThemeName; mode: ThemeMode } | undefined {
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

export const isThemeMode = (v: unknown): v is ThemeMode => v === 'light' || v === 'dark' || v === 'auto';

/** A stored language preference, or `fallback` when the value is not `auto` or one of the UI languages. */
export function parseLanguagePref(v: unknown, fallback: Locale | 'auto'): Locale | 'auto' {
  return v === 'auto' || (LOCALES as readonly string[]).includes(v as string) ? (v as Locale | 'auto') : fallback;
}

// ---- type check -----------------------------------------------------------

/**
 * Type check for imported / synced customization values.
 *
 * `importSettings` (manual import and the HA settings sync) spread the incoming customization over the
 * defaults without checking types: `scryptedUrl: 123` or a string where a list belongs made a component
 * throw while rendering — a white screen that the sync then carried to every device. Values whose type
 * does not match the default's are dropped (the default applies); keys the defaults don't know pass.
 */
export function sanitizeCustomization<T extends object>(incoming: unknown, defaults: T): Partial<T> {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return {};
  const out: Record<string, unknown> = {};
  const def = defaults as Record<string, unknown>;
  for (const [k, v] of Object.entries(incoming as Record<string, unknown>)) {
    if (!(k in def)) { out[k] = v; continue; }
    const d = def[k];
    if (d === null || d === undefined) {
      // nullable fields (e.g. a URL that is unset by default): null or a primitive of any kind
      if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = v;
      continue;
    }
    if (Array.isArray(d)) { if (Array.isArray(v)) out[k] = v; continue; }
    if (typeof d === 'object') { if (v !== null && typeof v === 'object' && !Array.isArray(v)) out[k] = v; continue; }
    if (typeof v === typeof d) out[k] = v;
  }
  return out as Partial<T>;
}

// ---- one-time migrations ----------------------------------------------------

/**
 * Ensure the pool summary chip is enabled by default the first time an
 * install with pre-existing homeChips is loaded. Idempotent via the marker, so
 * a user who later hides the chip keeps it hidden.
 */
export function migratePoolChip(cust: CustomizationSettings): CustomizationSettings {
  if (cust.poolChipMigrated) return cust;
  // An empty list means "all chips" — appending would leave ONLY this chip.
  const homeChips = cust.homeChips.length === 0 || cust.homeChips.includes('pool') ? cust.homeChips : [...cust.homeChips, 'pool'];
  return { ...cust, homeChips, poolChipMigrated: true };
}

/**
 * Same for the garage chip: stored homeChips predating it would otherwise
 * read as a subset (SummaryChipsBar compares against ALL_CHIPS.length) and hide
 * the new chip. Empty = "all" stays empty. Idempotent via the marker.
 */
export function migrateGarageChip(cust: CustomizationSettings): CustomizationSettings {
  if (cust.garageChipMigrated) return cust;
  const homeChips =
    cust.homeChips.length === 0 || cust.homeChips.includes('garage') ? cust.homeChips : [...cust.homeChips, 'garage'];
  return { ...cust, homeChips, garageChipMigrated: true };
}

/** Same for the locks chip. Empty = "all" stays empty. Idempotent via the marker. */
export function migrateLocksChip(cust: CustomizationSettings): CustomizationSettings {
  if (cust.locksChipMigrated) return cust;
  const homeChips =
    cust.homeChips.length === 0 || cust.homeChips.includes('locks') ? cust.homeChips : [...cust.homeChips, 'locks'];
  return { ...cust, homeChips, locksChipMigrated: true };
}

/**
 * Give the waste-collection card a good default slot (right after
 * Security) for installs that already have an explicit `homeSectionOrder`
 * predating it. An empty order needs no help — the natural SECTION_IDS position
 * already applies — so this only touches a non-empty, waste-less order.
 * Idempotent via the marker; a later manual reorder is respected.
 */
export function migrateWasteSection(cust: CustomizationSettings): CustomizationSettings {
  if (cust.wasteSectionMigrated) return cust;
  let homeSectionOrder = cust.homeSectionOrder;
  if (homeSectionOrder.length > 0 && !homeSectionOrder.includes('waste')) {
    const anchor = homeSectionOrder.indexOf('security');
    const insertAt = anchor >= 0 ? anchor + 1 : homeSectionOrder.length;
    homeSectionOrder = [...homeSectionOrder.slice(0, insertAt), 'waste', ...homeSectionOrder.slice(insertAt)];
  }
  return { ...cust, homeSectionOrder, wasteSectionMigrated: true };
}

/**
 * Home hints (docs/glas/PLAN-ETAPPE-4.md K76): an explicit `homeSectionOrder` from before the section existed
 * would append it LAST; hints belong at the top, once. Idempotent via the marker; a later move is kept.
 */
export function migrateHintsSection(cust: CustomizationSettings): CustomizationSettings {
  if (cust.hintsSectionMigrated) return cust;
  const homeSectionOrder =
    cust.homeSectionOrder.length > 0 && !cust.homeSectionOrder.includes('hints') ? ['hints', ...cust.homeSectionOrder] : cust.homeSectionOrder;
  return { ...cust, homeSectionOrder, hintsSectionMigrated: true };
}

/**
 * Same for the Sentinel NVR home card: an install with an explicit
 * `homeSectionOrder` from before the card existed would otherwise append it LAST
 * (below Rooms, especially visible on mobile). Place it right after Waste/Security once.
 */
export function migrateNvrSection(cust: CustomizationSettings): CustomizationSettings {
  if (cust.nvrSectionMigrated) return cust;
  let homeSectionOrder = cust.homeSectionOrder;
  if (homeSectionOrder.length > 0 && !homeSectionOrder.includes('nvr')) {
    const anchor = Math.max(homeSectionOrder.indexOf('waste'), homeSectionOrder.indexOf('security'));
    const insertAt = anchor >= 0 ? anchor + 1 : homeSectionOrder.length;
    homeSectionOrder = [...homeSectionOrder.slice(0, insertAt), 'nvr', ...homeSectionOrder.slice(insertAt)];
  }
  return { ...cust, homeSectionOrder, nvrSectionMigrated: true };
}

/**
 * One-time move of the sidebar order to Overview, Rooms, NVR, Pool, then the rest.
 *
 * `NAV_CONFIG` (AppLayout) already lists the items in that order, but a user who has
 * dragged the nav once stores the full list in `navOrder`, and `applyStoredOrder` puts
 * that stored list first — so the new default would never reach them. This rewrites a
 * non-empty stored order exactly once: the four head items go to the front, everything
 * else keeps its relative order. An empty order already follows `NAV_CONFIG` and stays
 * empty (filling it would freeze today's order against future defaults). Idempotent via
 * the marker, so a later manual reorder is respected.
 */
export const NAV_ORDER_V2_HEAD = ['overview', 'rooms', 'nvr', 'pool'] as const;

export function migrateNavOrderV2<T extends { navOrder: string[]; navOrderV2Migrated: boolean }>(cust: T): T {
  if (cust.navOrderV2Migrated) return cust;
  let navOrder = cust.navOrder;
  if (navOrder.length > 0) {
    const head: readonly string[] = NAV_ORDER_V2_HEAD;
    navOrder = [...head, ...navOrder.filter((id) => !head.includes(id))];
  }
  return { ...cust, navOrder, navOrderV2Migrated: true };
}

/**
 * All one-time migrations in their fixed order. `urlToken` also moves a token out of the Sentinel URL
 * (`migrateUrlToken`); the global document never carries one, so applying it skips that step.
 */
export function migrateCustomization(cust: CustomizationSettings, opts: { urlToken: boolean }): CustomizationSettings {
  const sections = migrateHintsSection(migrateNvrSection(migrateWasteSection(migrateLocksChip(migrateGarageChip(migratePoolChip(cust))))));
  return migrateNavOrderV2(opts.urlToken ? migrateUrlToken(sections) : sections);
}

// ---- apply steps ------------------------------------------------------------

/** Customization after loading a persisted state (defaults for missing keys, then the migrations). */
export function hydrateCustomization(persisted: unknown): CustomizationSettings {
  const p = persisted && typeof persisted === 'object' && !Array.isArray(persisted) ? (persisted as Partial<CustomizationSettings>) : {};
  return migrateCustomization({ ...DEFAULT_CUSTOMIZATION, ...p }, { urlToken: true });
}

/**
 * Customization after importing a snapshot (manual import or the HA settings sync): type-checked against the
 * defaults, `entityOrder` and `favorites` validated, connection tokens kept on this device unless the server
 * changed (see settingsSecrets.ts), then the migrations. Everything the snapshot lacks resets to the default.
 */
export function importedCustomization(cur: CustomizationSettings, raw: unknown): CustomizationSettings {
  const incoming: Partial<CustomizationSettings> = sanitizeCustomization(raw ?? {}, DEFAULT_CUSTOMIZATION);

  // entityOrder: an object whose values are string arrays
  const entityOrder: Record<string, string[]> = {};
  if (incoming.entityOrder != null && typeof incoming.entityOrder === 'object' && !Array.isArray(incoming.entityOrder)) {
    for (const [k, v] of Object.entries(incoming.entityOrder)) {
      if (Array.isArray(v) && v.every((x) => typeof x === 'string')) entityOrder[k] = v;
    }
  }
  // favorites: a string array
  const favorites: string[] =
    Array.isArray(incoming.favorites) && incoming.favorites.every((x) => typeof x === 'string') ? incoming.favorites : [];

  // Connection secrets are device-local: exportSettings() strips them, so every snapshot arrives without them.
  // Keep what THIS device has unless the snapshot carries a value — but only while the server stays the same.
  const { scryptedToken, maToken } = keepDeviceSecrets(cur, incoming);

  return migrateCustomization(
    { ...DEFAULT_CUSTOMIZATION, ...incoming, scryptedToken, maToken, entityOrder, favorites },
    { urlToken: true },
  );
}

/** The slice of the settings state the scope rules and the apply steps read and write. */
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
