/**
 * @hapulse/core — Public API
 *
 * Pure TypeScript, zero React/DOM dependencies.
 * All Home Assistant interaction goes through this module.
 */

// Connection
export { connectToHA, startHASignIn, resumeHASession, HAConnection } from './connection.js';
export type { ConnectToHAOptions, HASignInOptions, HAResumeOptions } from './connection.js';

// Re-export AuthData so callers can type the saveTokens/loadTokens callbacks
export type { AuthData } from 'home-assistant-js-websocket';

// Errors
export { HAAuthError, HAConnectionError } from './errors.js';

// OAuth (mobile-friendly authorization-code flow helpers)
export { buildHAAuthorizeUrl, exchangeHAAuthCode, connectWithAuthData } from './oauth.js';

// Themes
export {
  THEMES,
  THEME_NAMES,
  THEME_LABELS,
  resolveThemeMode,
  accentOverride,
} from './themes.js';
export type { ThemeName, ThemeMode, ResolvedMode, ThemeTokens } from './themes.js';

// i18n
export { LOCALES, LOCALE_LABELS, translate, resolveLanguage } from './i18n.js';
export type { Dict, Locale } from './i18n.js';
export { lookupEntityState, humanizeState } from './entityStates.js';
export type { StateTranslations, StateLookupOptions, EntityStateLabel } from './entityStates.js';

export { RELEASES, CURRENT_VERSION, CHANGE_KINDS, releasesSince, compareVersions } from './changelog.js';
export type { Release, ReleaseSection, ChangeKind } from './changelog.js';

// Rooms
export { buildRooms, roomSummary, resolveEntityAreaId, buildDeviceAreaMap } from './rooms.js';
export type { DeviceAreaMap } from './rooms.js';

// System Monitor metric identification
// Music Assistant (library browsing — issue #2)
export {
  MA_MEDIA_TYPES,
  findMusicAssistant,
  parseMALibraryPage,
  parseMASearchResults,
  parseMAQueue,
  demoQueueSnapshot,
  DEMO_MA_LIBRARY,
  demoLibraryPage,
} from './musicAssistant.js';
export { MusicAssistantClient, parseMAFullQueueItems, parseMAQueuesArtwork } from './maClient.js';
export type { MAFullQueueItem, MAQueueArtwork } from './maClient.js';

export type {
  MAQueueItem,
  MAQueueSnapshot,
  MAMediaType,
  MAEnqueueMode,
  MAMediaItem,
  MALibraryPage,
  MusicAssistantInfo,
} from './musicAssistant.js';

// Alarm panel selection
export { pickAlarmPanel, sortAlarmPanels } from './alarm.js';

// Entity history + logbook (detail modal)
export {
  parseHistoryStates,
  parseLogbookEntries,
  isNumericHistory,
  generateDemoHistory,
  demoLogbookFromHistory,
} from './history.js';
export type { HistoryPoint, LogbookEntry } from './history.js';

export { indexSystemMonitor, pickSystemMetrics } from './systemMonitor.js';
export type { SystemMonitorIndex, SystemMetricFamily, SystemMetrics } from './systemMonitor.js';

// Domain helpers
export { domainOf, isToggleable, formatEntityState, domainIcon, isFavoriteRelevant } from './domain.js';

// Room icon utilities
export { roomIconName, roomStatusIconName, roomKind, CANONICAL_ROOM_ICONS, ROOM_KINDS } from './roomIcons.js';
export type { RoomIconName, RoomKind } from './roomIcons.js';

// HA icon string → @mdi/js export name converter
export { mdiIconExportName } from './mdiIcon.js';

// Types
export type {
  HassEntity,
  HassEntityAttributes,
  HassEntityMap,
  WeatherForecast,
  AreaRegistryEntry,
  DeviceRegistryEntry,
  EntityRegistryEntry,
  Registries,
  Room,
  RoomSummary,
  ConnectionStatus,
  UnsubscribeFunc,
  HAUser,
  PersistentNotification,
} from './types.js';

// Demo data
export {
  DEMO_ENTITIES,
  DEMO_REGISTRIES,
  DEMO_NOTIFICATIONS,
  createDemoTicker,
  applyDemoService,
} from './demo.js';

// Devices
export {
  buildDeviceModels,
  summarizeDevices,
  deviceEntityCategory,
} from './devices.js';
export type {
  DeviceModel,
  DeviceEntityRef,
  DeviceEntityCategory,
  DevicesSummary,
} from './devices.js';

// Energy
export {
  computeEnergyDashboard,
  energyStatisticIds,
  energyPeriodRange,
  isEnergyConfigured,
  DEMO_ENERGY_PREFS,
  demoEnergyStatistics,
} from './energy.js';
export type {
  EnergyPreferences,
  EnergySource,
  GridSource,
  SolarSource,
  BatterySource,
  GasSource,
  WaterSource,
  DeviceConsumption,
  StatisticValue,
  StatisticsMap,
  StatisticsPeriod,
  EnergyPeriod,
  EnergyRange,
  EnergyDashboard,
  EnergyDeviceUsage,
  EnergyWaterUsage,
  EnergySeriesPoint,
} from './energy.js';

// [fork] Sensor history — numeric value charts for the reusable HistoryModal
// (Pool page). Distinct from upstream's history.ts (entity detail modal).
export {
  HISTORY_RANGES,
  historyRangeSpec,
  parseNumericHistory,
  summarizeHistory,
  demoHistory,
} from './sensorHistory.js';
export type {
  RawHistoryState,
  SensorHistoryPoint,
  HistoryRange,
  HistoryRangeSpec,
  HistorySummary,
} from './sensorHistory.js';

// [fork] Pool pump — schedule model + timeslot conversion (DOM-free)
export {
  POOL_DAY_MINUTES,
  POOL_WEEKDAYS,
  hhmmToMinutes,
  minutesToHHMM,
  normalizeWindows,
  sortWeekdays,
  parseWeekdays,
  weekdaysToScheduler,
  parseScheduleAttributes,
  buildScheduleTimeslots,
  scheduleOnMinutes,
  tidyDaySlots,
  normalizeDaySlots,
  windowsToDaySlots,
  daySlotsToWindows,
  dailyRuntimeBars,
} from './pool.js';
export type {
  PoolWeekday,
  PoolWindow,
  PoolScheduleModel,
  PoolScheduleAction,
  PoolTimeslot,
  RawScheduleAttributes,
  BuildTimeslotsOptions,
  PoolDaySlot,
  PoolDayRuntime,
} from './pool.js';
