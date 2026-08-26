/**
 * Type definitions for @hapulse/core.
 * These mirror the shapes returned by the Home Assistant WebSocket API.
 */

// ---------------------------------------------------------------------------
// Home Assistant entity types (from home-assistant-js-websocket)
// ---------------------------------------------------------------------------

/** A single entity's state as returned by HA subscribeEntities. */
export interface HassEntityAttributes {
  friendly_name?: string;
  unit_of_measurement?: string;
  device_class?: string;
  entity_category?: string | null;
  icon?: string;
  // State-specific
  brightness?: number;
  color_temp?: number;
  color_temp_kelvin?: number;
  min_color_temp_kelvin?: number;
  max_color_temp_kelvin?: number;
  supported_color_modes?: string[];
  color_mode?: string;
  rgb_color?: [number, number, number];
  // Climate
  current_temperature?: number;
  temperature?: number;
  target_temp_high?: number;
  target_temp_low?: number;
  hvac_modes?: string[];
  hvac_action?: string;
  preset_modes?: string[];
  preset_mode?: string;
  fan_mode?: string;
  fan_modes?: string[];
  // Media player
  media_title?: string;
  media_artist?: string;
  media_album_name?: string;
  entity_picture?: string | null;
  volume_level?: number;
  is_volume_muted?: boolean;
  media_duration?: number;
  media_position?: number;
  media_position_updated_at?: string;
  source?: string;
  source_list?: string[];
  // Cover
  current_position?: number;
  // Weather
  temperature_unit?: string;
  forecast?: WeatherForecast[];
  humidity?: number;
  wind_speed?: number;
  condition?: string;
  // Person
  user_id?: string;
  latitude?: number;
  longitude?: number;
  gps_accuracy?: number;
  source_type?: string;
  // Alarm
  code_format?: string;
  changed_by?: string | null;
  // Sensor / binary sensor
  state_class?: string;
  // Sun
  next_rising?: string;
  next_setting?: string;
  elevation?: number;
  azimuth?: number;
  rising?: boolean;
  [key: string]: unknown;
}

export interface WeatherForecast {
  datetime: string;
  temperature: number;
  templow?: number;
  condition: string;
  precipitation?: number;
  wind_speed?: number;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: HassEntityAttributes;
  last_changed: string;
  last_updated: string;
  context: { id: string; parent_id: string | null; user_id: string | null };
}

export type HassEntityMap = Record<string, HassEntity>;

// ---------------------------------------------------------------------------
// Registry entry types
// ---------------------------------------------------------------------------

export interface AreaRegistryEntry {
  area_id: string;
  name: string;
  picture?: string | null;
  icon?: string | null;
}

export interface DeviceRegistryEntry {
  id: string;
  area_id: string | null;
  name: string | null;
  name_by_user?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  config_entries?: string[];
}

export interface EntityRegistryEntry {
  entity_id: string;
  area_id: string | null;
  device_id: string | null;
  entity_category: 'config' | 'diagnostic' | null;
  hidden_by: string | null;
  disabled_by: string | null;
  original_name: string | null;
  icon: string | null;
  platform?: string;
  /** Integration-set, never translated — the stable way to identify a sensor. */
  translation_key?: string | null;
  unique_id?: string | null;
  /** Config entry the entity belongs to — resolves an integration's services
   *  (e.g. Music Assistant's get_library) without an admin-only lookup. */
  config_entry_id?: string | null;
}

export interface Registries {
  areas: AreaRegistryEntry[];
  devices: DeviceRegistryEntry[];
  entities: EntityRegistryEntry[];
}

// ---------------------------------------------------------------------------
// Room types
// ---------------------------------------------------------------------------

/** A resolved room built from area + device + entity registries. */
export interface Room {
  /** The HA area_id */
  id: string;
  name: string;
  icon?: string | null;
  /** Area picture path/URL from the HA area registry, if set. */
  picture?: string | null;
  /** All entity IDs assigned to this room (including diagnostic/config category) */
  entityIds: string[];
  /**
   * domain → entityId[] map.
   * Excludes entities with entity_category (config/diagnostic) — summary/card only.
   */
  domains: Record<string, string[]>;
}

/** A quick summary for a room card on the home screen. */
export interface RoomSummary {
  temperature?: number;
  humidity?: number;
  lightsOn: number;
  lightsTotal: number;
  mediaPlaying: boolean;
  anyMotion: boolean;
  climateState?: string;
}

// ---------------------------------------------------------------------------
// Connection status
// ---------------------------------------------------------------------------

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export type UnsubscribeFunc = () => void;

// ---------------------------------------------------------------------------
// HA current user
// ---------------------------------------------------------------------------

/**
 * The Home Assistant user currently signed in to HAPulse.
 * Returned by HAConnection.fetchCurrentUser() via `auth/current_user`.
 */
export interface HAUser {
  /** Unique user ID — matches `person.*` entity `attributes.user_id`. */
  id: string;
  /** Display name configured in HA. */
  name: string;
  /** True when this user is the Home Assistant owner account. */
  is_owner: boolean;
  /** True when this user has administrator rights. */
  is_admin: boolean;
}

// ---------------------------------------------------------------------------
// Persistent notifications
// ---------------------------------------------------------------------------

/**
 * A Home Assistant persistent notification.
 *
 * NOTE: persistent notifications are **not** state-machine entities — the old
 * `persistent_notification.*` entities were removed from HA core. They are only
 * available via the `persistent_notification/subscribe` WebSocket command.
 */
export interface PersistentNotification {
  notification_id: string;
  title?: string;
  message: string;
  created_at?: string;
  status?: string;
}
