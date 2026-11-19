/**
 * [fork] Which setting belongs to whom under global admin management (GLOBAL / USER / DEVICE / SECRET).
 * The rules live in `@hapulse/core` (`settingsScope.ts`) since 2026-11-19, shared with the iOS app; this module
 * re-exports them so the dashboard's imports stay as they were.
 */
export {
  USER_CUSTOMIZATION_KEYS,
  SECRET_CUSTOMIZATION_KEYS,
  GLOBAL_TOP_KEYS,
  USER_TOP_KEYS,
  DEVICE_TOP_KEYS,
  isGlobalCustomizationKey,
  extractGlobal,
  extractUser,
  extractSecrets,
  diffGlobal,
  hasChanges,
  mergeGlobal,
  isValidGlobalDoc,
  isValidUserPayload,
  applyGlobalSettings,
  applyUserSettings,
  sharedSecretsFor,
} from '@hapulse/core';
export type {
  GlobalCustomization,
  GlobalSettingsPayload,
  UserSettingsPayload,
  SharedSecrets,
  GlobalUserRef,
  GlobalSettingsDoc,
  ScopedPatch,
  ScopedState,
} from '@hapulse/core';
