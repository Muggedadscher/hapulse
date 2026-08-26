/**
 * Demo mode data — realistic mock home for dev, screenshots and the landing page.
 *
 * Exports:
 *  - DEMO_REGISTRIES: Registries
 *  - DEMO_ENTITIES: HassEntityMap
 *  - createDemoTicker(onChange): starts simulated state updates, returns stop fn
 *  - applyDemoService(entities, domain, service, data, target): returns updated entity map
 */

import type {
  Registries,
  HassEntity,
  HassEntityMap,
  HassEntityAttributes,
  PersistentNotification,
  EntityRegistryEntry,
  DeviceRegistryEntry,
} from './types.js';

/** Plausible manufacturer/model per demo device, keyed by name keyword. */
function withDemoDeviceMeta(d: DeviceRegistryEntry): DeviceRegistryEntry {
  if (d.manufacturer) return d;
  const n = (d.name ?? '').toLowerCase();
  let manufacturer = 'Home Assistant';
  let model = 'Generic';
  if (n.includes('light') || n.includes('lamp')) { manufacturer = 'Philips Hue'; model = 'Hue Bulb'; }
  else if (n.includes('thermostat') || n.includes('climate')) { manufacturer = 'Google Nest'; model = 'Learning Thermostat'; }
  else if (n.includes('tv')) { manufacturer = 'LG'; model = 'OLED C3'; }
  else if (n.includes('speaker')) { manufacturer = 'Sonos'; model = 'One SL'; }
  else if (n.includes('lock')) { manufacturer = 'Yale'; model = 'Assure Lock 2'; }
  else if (n.includes('camera')) { manufacturer = 'Reolink'; model = 'RLC-810A'; }
  else if (n.includes('motion')) { manufacturer = 'Aqara'; model = 'Motion Sensor P1'; }
  else if (n.includes('door')) { manufacturer = 'Aqara'; model = 'Door & Window Sensor'; }
  else if (n.includes('sensor')) { manufacturer = 'Aqara'; model = 'Temp & Humidity'; }
  else if (n.includes('blind') || n.includes('cover')) { manufacturer = 'IKEA'; model = 'FYRTUR'; }
  else if (n.includes('coffee') || n.includes('switch') || n.includes('machine')) { manufacturer = 'TP-Link'; model = 'Kasa Smart Plug'; }
  else if (n.includes('monitor')) { manufacturer = 'System Monitor'; model = 'Glances'; }
  else if (n.includes('alarm')) { manufacturer = 'Home Assistant'; model = 'Manual Alarm'; }
  return { ...d, manufacturer, model };
}

/**
 * Plausible integration (platform) per domain, used to give demo entities a
 * realistic `platform` so the Devices page shows several integrations. Real HA
 * registries always carry `platform`, so this only fills the demo gap.
 */
const DEMO_PLATFORM_BY_DOMAIN: Record<string, string> = {
  light: 'hue',
  switch: 'tplink',
  fan: 'tplink',
  climate: 'nest',
  cover: 'zwave_js',
  lock: 'zwave_js',
  media_player: 'cast',
  camera: 'generic',
  sensor: 'zha',
  binary_sensor: 'zha',
  alarm_control_panel: 'manual_alarm',
  scene: 'homeassistant',
  person: 'person',
  weather: 'met',
  sun: 'sun',
  vacuum: 'roborock',
};

function withDemoPlatform(e: EntityRegistryEntry): EntityRegistryEntry {
  if (e.platform) return e;
  const domain = e.entity_id.split('.')[0] ?? '';
  return { ...e, platform: DEMO_PLATFORM_BY_DOMAIN[domain] ?? 'homeassistant' };
}

// ---------------------------------------------------------------------------
// Persistent notifications (not entities — see PersistentNotification docs)
// ---------------------------------------------------------------------------

export const DEMO_NOTIFICATIONS: PersistentNotification[] = [
  {
    notification_id: 'hapulse_welcome',
    title: 'Welcome to HAPulse',
    message: 'You are exploring the demo home. Connect your own Home Assistant to control real devices.',
    created_at: '2026-06-15T08:00:00+00:00',
    status: 'unread',
  },
  {
    notification_id: 'update_available',
    title: 'Update available',
    message: 'Home Assistant Core 2026.6.2 is available. [Open Settings](/config/updates).',
    created_at: '2026-06-15T07:30:00+00:00',
    status: 'unread',
  },
  {
    notification_id: 'backup_complete',
    title: 'Backup complete',
    message: 'Automatic backup finished successfully (1.2 GB).',
    created_at: '2026-06-14T03:00:00+00:00',
    status: 'unread',
  },
];

// ---------------------------------------------------------------------------
// Registries
// ---------------------------------------------------------------------------

export const DEMO_REGISTRIES: Registries = {
  areas: [
    { area_id: 'living_room', name: 'Living Room', icon: 'mdi:sofa' },
    { area_id: 'kitchen', name: 'Kitchen', icon: 'mdi:silverware-fork-knife' },
    { area_id: 'bedroom', name: 'Bedroom', icon: 'mdi:bed' },
    { area_id: 'office', name: 'Office', icon: 'mdi:desk' },
    { area_id: 'bathroom', name: 'Bathroom', icon: 'mdi:shower' },
    { area_id: 'hallway', name: 'Hallway', icon: 'mdi:door' },
  ],
  devices: ([
    // Living Room
    { id: 'dev_lr_lights', area_id: 'living_room', name: 'Living Room Lights' },
    { id: 'dev_lr_climate', area_id: 'living_room', name: 'Living Room Thermostat' },
    { id: 'dev_lr_tv', area_id: 'living_room', name: 'Living Room TV' },
    { id: 'dev_lr_sensor', area_id: 'living_room', name: 'Living Room Sensor' },
    // Kitchen
    { id: 'dev_kt_lights', area_id: 'kitchen', name: 'Kitchen Lights' },
    { id: 'dev_kt_sensor', area_id: 'kitchen', name: 'Kitchen Sensor' },
    { id: 'dev_kt_switch', area_id: 'kitchen', name: 'Coffee Machine' },
    // Bedroom
    { id: 'dev_br_lights', area_id: 'bedroom', name: 'Bedroom Lights' },
    { id: 'dev_br_climate', area_id: 'bedroom', name: 'Bedroom Thermostat' },
    { id: 'dev_br_cover', area_id: 'bedroom', name: 'Bedroom Blinds' },
    { id: 'dev_br_sensor', area_id: 'bedroom', name: 'Bedroom Sensor' },
    { id: 'dev_br_speaker', area_id: 'bedroom', name: 'Bedroom Speaker' },
    // Office
    { id: 'dev_of_lights', area_id: 'office', name: 'Office Lights' },
    { id: 'dev_of_sensor', area_id: 'office', name: 'Office Sensor' },
    { id: 'dev_of_switch', area_id: 'office', name: 'Office Desk Switch' },
    // Bathroom
    { id: 'dev_ba_lights', area_id: 'bathroom', name: 'Bathroom Lights' },
    { id: 'dev_ba_sensor', area_id: 'bathroom', name: 'Bathroom Sensor' },
    // Hallway
    { id: 'dev_ha_lights', area_id: 'hallway', name: 'Hallway Light' },
    { id: 'dev_ha_motion', area_id: 'hallway', name: 'Hallway Motion Sensor' },
    { id: 'dev_ha_door', area_id: 'hallway', name: 'Front Door Sensor' },
    { id: 'dev_ha_lock', area_id: 'hallway', name: 'Front Door Lock' },
    { id: 'dev_ha_camera', area_id: 'hallway', name: 'Hallway Camera' },
    // Other devices
    { id: 'dev_outdoor_camera', area_id: null, name: 'Outdoor Camera' },
    { id: 'dev_alarm', area_id: null, name: 'Alarm Panel' },
    { id: 'dev_system_monitor', area_id: null, name: 'System Monitor' },
  ] as DeviceRegistryEntry[]).map(withDemoDeviceMeta),
  entities: ([
    // --- Living Room ---
    { entity_id: 'light.living_room_ceiling', area_id: null, device_id: 'dev_lr_lights', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Ceiling Light', icon: null },
    { entity_id: 'light.living_room_floor_lamp', area_id: null, device_id: 'dev_lr_lights', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Floor Lamp', icon: null },
    { entity_id: 'light.living_room_shelf', area_id: null, device_id: 'dev_lr_lights', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Shelf Light', icon: null },
    { entity_id: 'climate.living_room', area_id: null, device_id: 'dev_lr_climate', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Thermostat', icon: null },
    { entity_id: 'media_player.living_room_tv', area_id: null, device_id: 'dev_lr_tv', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Living Room TV', icon: null },
    { entity_id: 'sensor.living_room_temperature', area_id: null, device_id: 'dev_lr_sensor', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Temperature', icon: null },
    { entity_id: 'sensor.living_room_humidity', area_id: null, device_id: 'dev_lr_sensor', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Humidity', icon: null },
    { entity_id: 'binary_sensor.living_room_motion', area_id: null, device_id: 'dev_lr_sensor', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Motion', icon: null },
    // --- Kitchen ---
    { entity_id: 'light.kitchen_ceiling', area_id: null, device_id: 'dev_kt_lights', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Kitchen Ceiling', icon: null },
    { entity_id: 'light.kitchen_counter', area_id: null, device_id: 'dev_kt_lights', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Counter Light', icon: null },
    { entity_id: 'sensor.kitchen_temperature', area_id: null, device_id: 'dev_kt_sensor', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Temperature', icon: null },
    { entity_id: 'sensor.kitchen_humidity', area_id: null, device_id: 'dev_kt_sensor', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Humidity', icon: null },
    { entity_id: 'switch.coffee_machine', area_id: null, device_id: 'dev_kt_switch', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Coffee Machine', icon: null },
    // --- Bedroom ---
    { entity_id: 'light.bedroom_ceiling', area_id: null, device_id: 'dev_br_lights', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Bedroom Ceiling', icon: null },
    { entity_id: 'light.bedroom_nightstand', area_id: null, device_id: 'dev_br_lights', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Nightstand Light', icon: null },
    { entity_id: 'climate.bedroom', area_id: null, device_id: 'dev_br_climate', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Bedroom Thermostat', icon: null },
    { entity_id: 'cover.bedroom_blinds', area_id: null, device_id: 'dev_br_cover', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Bedroom Blinds', icon: null },
    { entity_id: 'sensor.bedroom_temperature', area_id: null, device_id: 'dev_br_sensor', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Temperature', icon: null },
    { entity_id: 'sensor.bedroom_humidity', area_id: null, device_id: 'dev_br_sensor', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Humidity', icon: null },
    { entity_id: 'media_player.bedroom_speaker', area_id: null, device_id: 'dev_br_speaker', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Bedroom Speaker', icon: null },
    { entity_id: 'media_player.kitchen_speaker', area_id: 'kitchen', device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Kitchen Speaker', icon: null },
    { entity_id: 'binary_sensor.bedroom_window', area_id: null, device_id: 'dev_br_sensor', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Bedroom Window', icon: null },
    // --- Office ---
    { entity_id: 'light.office_ceiling', area_id: null, device_id: 'dev_of_lights', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Office Ceiling', icon: null },
    { entity_id: 'light.office_desk', area_id: null, device_id: 'dev_of_lights', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Desk Light', icon: null },
    { entity_id: 'sensor.office_temperature', area_id: null, device_id: 'dev_of_sensor', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Temperature', icon: null },
    { entity_id: 'sensor.office_humidity', area_id: null, device_id: 'dev_of_sensor', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Humidity', icon: null },
    { entity_id: 'switch.office_desk', area_id: null, device_id: 'dev_of_switch', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Desk Switch', icon: null },
    // --- Home-wide ---
    { entity_id: 'sensor.energy_today', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Energy Today', icon: null },
    // --- Bathroom ---
    { entity_id: 'light.bathroom_ceiling', area_id: null, device_id: 'dev_ba_lights', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Bathroom Light', icon: null },
    { entity_id: 'light.bathroom_mirror', area_id: null, device_id: 'dev_ba_lights', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Mirror Light', icon: null },
    { entity_id: 'sensor.bathroom_temperature', area_id: null, device_id: 'dev_ba_sensor', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Temperature', icon: null },
    { entity_id: 'sensor.bathroom_humidity', area_id: null, device_id: 'dev_ba_sensor', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Humidity', icon: null },
    // --- Hallway ---
    { entity_id: 'light.hallway', area_id: null, device_id: 'dev_ha_lights', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Hallway Light', icon: null },
    { entity_id: 'binary_sensor.hallway_motion', area_id: null, device_id: 'dev_ha_motion', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Hallway Motion', icon: null },
    { entity_id: 'binary_sensor.front_door', area_id: null, device_id: 'dev_ha_door', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Front Door', icon: null },
    { entity_id: 'lock.front_door', area_id: null, device_id: 'dev_ha_lock', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Front Door Lock', icon: null },
    { entity_id: 'camera.hallway', area_id: null, device_id: 'dev_ha_camera', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Hallway Camera', icon: null },
    // --- Global (no area) ---
    { entity_id: 'camera.outdoor', area_id: null, device_id: 'dev_outdoor_camera', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Outdoor Camera', icon: null },
    { entity_id: 'alarm_control_panel.home', area_id: null, device_id: 'dev_alarm', entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Home Alarm', icon: null },
    { entity_id: 'weather.home', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Home Weather', icon: null },
    { entity_id: 'sun.sun', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Sun', icon: null },
    { entity_id: 'person.alice', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Alice', icon: null },
    { entity_id: 'person.bob', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Bob', icon: null },
    // --- Automations ---
    { entity_id: 'automation.morning_wake_up', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Wake Up', icon: null },
    { entity_id: 'automation.morning_coffee', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Coffee Machine', icon: null },
    { entity_id: 'automation.morning_lights', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Morning Lights', icon: null },
    { entity_id: 'automation.evening_lights', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Evening Lights', icon: null },
    { entity_id: 'automation.evening_shutters', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Close Shutters', icon: null },
    { entity_id: 'automation.evening_downtime', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Downtime Mode', icon: null },
    { entity_id: 'automation.security_front_door', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Front Door Alert', icon: null },
    { entity_id: 'automation.security_motion', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Motion Alert', icon: null },
    { entity_id: 'automation.security_alarm', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Alarm Notification', icon: null },
    { entity_id: 'automation.comfort_temperature', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Temperature Control', icon: null },
    { entity_id: 'automation.comfort_humidity', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Humidity Alert', icon: null },
    { entity_id: 'automation.away_mode', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Away Mode', icon: null },
    { entity_id: 'automation.arrival_home', area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Arrival Home', icon: null },
    // --- Scenes ---
    { entity_id: 'scene.living_room_movie', area_id: 'living_room', device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Movie Night', icon: null },
    { entity_id: 'scene.living_room_bright', area_id: 'living_room', device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Bright Mode', icon: null },
    { entity_id: 'scene.living_room_relax', area_id: 'living_room', device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Relax Mode', icon: null },
    { entity_id: 'scene.bedroom_sleep', area_id: 'bedroom', device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Sleep', icon: null },
    { entity_id: 'scene.bedroom_wake', area_id: 'bedroom', device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Wake Up', icon: null },
    { entity_id: 'scene.kitchen_cooking', area_id: 'kitchen', device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Cooking Mode', icon: null },
    { entity_id: 'scene.kitchen_morning', area_id: 'kitchen', device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Morning Coffee', icon: null },
    { entity_id: 'scene.office_focus', area_id: 'office', device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Focus Mode', icon: null },
    { entity_id: 'scene.office_meeting', area_id: 'office', device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Meeting', icon: null },
    { entity_id: 'scene.hallway_away', area_id: 'hallway', device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Away Mode', icon: null },
    { entity_id: 'scene.hallway_welcome', area_id: 'hallway', device_id: null, entity_category: null, hidden_by: null, disabled_by: null, original_name: 'Welcome Home', icon: null },
    // --- System Monitor (platform: systemmonitor) ---
    { entity_id: 'sensor.processor_use', area_id: null, device_id: 'dev_system_monitor', entity_category: 'diagnostic', hidden_by: null, disabled_by: null, original_name: 'Processor use', icon: null, platform: 'systemmonitor' },
    { entity_id: 'sensor.processor_temperature', area_id: null, device_id: 'dev_system_monitor', entity_category: 'diagnostic', hidden_by: null, disabled_by: null, original_name: 'Processor temperature', icon: null, platform: 'systemmonitor' },
    { entity_id: 'sensor.memory_use_percent', area_id: null, device_id: 'dev_system_monitor', entity_category: 'diagnostic', hidden_by: null, disabled_by: null, original_name: 'Memory use', icon: null, platform: 'systemmonitor' },
    { entity_id: 'sensor.memory_free', area_id: null, device_id: 'dev_system_monitor', entity_category: 'diagnostic', hidden_by: null, disabled_by: null, original_name: 'Memory free', icon: null, platform: 'systemmonitor' },
    { entity_id: 'sensor.disk_use_percent', area_id: null, device_id: 'dev_system_monitor', entity_category: 'diagnostic', hidden_by: null, disabled_by: null, original_name: 'Disk use (/)', icon: null, platform: 'systemmonitor' },
    { entity_id: 'sensor.disk_free', area_id: null, device_id: 'dev_system_monitor', entity_category: 'diagnostic', hidden_by: null, disabled_by: null, original_name: 'Disk free (/)', icon: null, platform: 'systemmonitor' },
    { entity_id: 'sensor.network_throughput_in_eth0', area_id: null, device_id: 'dev_system_monitor', entity_category: 'diagnostic', hidden_by: null, disabled_by: null, original_name: 'Network throughput in eth0', icon: null, platform: 'systemmonitor' },
    { entity_id: 'sensor.network_throughput_out_eth0', area_id: null, device_id: 'dev_system_monitor', entity_category: 'diagnostic', hidden_by: null, disabled_by: null, original_name: 'Network throughput out eth0', icon: null, platform: 'systemmonitor' },
    { entity_id: 'sensor.last_boot', area_id: null, device_id: 'dev_system_monitor', entity_category: 'diagnostic', hidden_by: null, disabled_by: null, original_name: 'Last boot', icon: null, platform: 'systemmonitor' },
    // --- Battery sensors (device_class: battery) ---
    { entity_id: 'sensor.front_door_lock_battery', area_id: null, device_id: 'dev_ha_lock', entity_category: 'diagnostic', hidden_by: null, disabled_by: null, original_name: 'Front Door Lock Battery', icon: null },
    { entity_id: 'sensor.hallway_motion_battery', area_id: null, device_id: 'dev_ha_motion', entity_category: 'diagnostic', hidden_by: null, disabled_by: null, original_name: 'Hallway Motion Battery', icon: null },
    { entity_id: 'sensor.bedroom_sensor_battery', area_id: null, device_id: 'dev_br_sensor', entity_category: 'diagnostic', hidden_by: null, disabled_by: null, original_name: 'Bedroom Sensor Battery', icon: null },
  ] as EntityRegistryEntry[]).map(withDemoPlatform),
};

// ---------------------------------------------------------------------------
// Helpers for building demo entities
// ---------------------------------------------------------------------------

const NOW = new Date().toISOString();

function makeEntity(
  entity_id: string,
  state: string,
  attributes: HassEntityAttributes
): HassEntity {
  return {
    entity_id,
    state,
    attributes,
    last_changed: NOW,
    last_updated: NOW,
    context: { id: 'demo', parent_id: null, user_id: null },
  };
}

// ---------------------------------------------------------------------------
// Demo entities
// ---------------------------------------------------------------------------

export const DEMO_ENTITIES: HassEntityMap = {
  // --- Lights ---
  'light.living_room_ceiling': makeEntity('light.living_room_ceiling', 'on', {
    friendly_name: 'Ceiling Light',
    brightness: 200,
    color_temp: 350,
    color_temp_kelvin: 2857,
    min_color_temp_kelvin: 2200,
    max_color_temp_kelvin: 6500,
    supported_color_modes: ['color_temp', 'xy'],
    color_mode: 'color_temp',
  }),
  'light.living_room_floor_lamp': makeEntity('light.living_room_floor_lamp', 'on', {
    friendly_name: 'Floor Lamp',
    brightness: 120,
    color_temp: 400,
    color_temp_kelvin: 2500,
    min_color_temp_kelvin: 2200,
    max_color_temp_kelvin: 6500,
    supported_color_modes: ['color_temp'],
    color_mode: 'color_temp',
  }),
  'light.living_room_shelf': makeEntity('light.living_room_shelf', 'off', {
    friendly_name: 'Shelf Light',
    supported_color_modes: ['onoff'],
    color_mode: 'onoff',
  }),
  'light.kitchen_ceiling': makeEntity('light.kitchen_ceiling', 'on', {
    friendly_name: 'Kitchen Ceiling',
    brightness: 255,
    color_temp: 300,
    color_temp_kelvin: 3333,
    min_color_temp_kelvin: 2700,
    max_color_temp_kelvin: 6500,
    supported_color_modes: ['color_temp'],
    color_mode: 'color_temp',
  }),
  'light.kitchen_counter': makeEntity('light.kitchen_counter', 'off', {
    friendly_name: 'Counter Light',
    supported_color_modes: ['brightness'],
    color_mode: 'brightness',
  }),
  'light.bedroom_ceiling': makeEntity('light.bedroom_ceiling', 'off', {
    friendly_name: 'Bedroom Ceiling',
    brightness: 0,
    supported_color_modes: ['brightness'],
    color_mode: 'brightness',
  }),
  'light.bedroom_nightstand': makeEntity('light.bedroom_nightstand', 'on', {
    friendly_name: 'Nightstand Light',
    brightness: 40,
    color_temp: 500,
    color_temp_kelvin: 2000,
    min_color_temp_kelvin: 1800,
    max_color_temp_kelvin: 5000,
    supported_color_modes: ['color_temp'],
    color_mode: 'color_temp',
  }),
  'light.office_ceiling': makeEntity('light.office_ceiling', 'on', {
    friendly_name: 'Office Ceiling',
    brightness: 220,
    color_temp: 250,
    color_temp_kelvin: 4000,
    min_color_temp_kelvin: 2700,
    max_color_temp_kelvin: 6500,
    supported_color_modes: ['color_temp'],
    color_mode: 'color_temp',
  }),
  'light.office_desk': makeEntity('light.office_desk', 'on', {
    friendly_name: 'Desk Light',
    brightness: 180,
    color_temp: 220,
    color_temp_kelvin: 4545,
    supported_color_modes: ['color_temp'],
    color_mode: 'color_temp',
    min_color_temp_kelvin: 2700,
    max_color_temp_kelvin: 6500,
  }),
  'light.bathroom_ceiling': makeEntity('light.bathroom_ceiling', 'off', {
    friendly_name: 'Bathroom Light',
    supported_color_modes: ['brightness'],
    color_mode: 'brightness',
  }),
  'light.bathroom_mirror': makeEntity('light.bathroom_mirror', 'off', {
    friendly_name: 'Mirror Light',
    supported_color_modes: ['color_temp'],
    color_mode: 'color_temp',
    min_color_temp_kelvin: 2700,
    max_color_temp_kelvin: 6500,
  }),
  'light.hallway': makeEntity('light.hallway', 'off', {
    friendly_name: 'Hallway Light',
    supported_color_modes: ['brightness'],
    color_mode: 'brightness',
  }),

  // --- Climate ---
  'climate.living_room': makeEntity('climate.living_room', 'heat', {
    friendly_name: 'Living Room Thermostat',
    current_temperature: 21.4,
    temperature: 22.0,
    hvac_modes: ['off', 'cool', 'heat', 'auto'],
    hvac_action: 'heating',
    preset_modes: ['eco', 'comfort', 'boost'],
    preset_mode: 'comfort',
    fan_modes: ['auto', 'low', 'medium', 'high'],
    fan_mode: 'auto',
  }),
  'climate.bedroom': makeEntity('climate.bedroom', 'off', {
    friendly_name: 'Bedroom Thermostat',
    current_temperature: 19.8,
    temperature: 18.0,
    hvac_modes: ['off', 'cool', 'heat', 'auto'],
    hvac_action: 'idle',
    preset_mode: 'eco',
  }),

  // --- Sensors ---
  'sensor.living_room_temperature': makeEntity('sensor.living_room_temperature', '21.4', {
    friendly_name: 'Living Room Temperature',
    device_class: 'temperature',
    unit_of_measurement: '°C',
    state_class: 'measurement',
  }),
  'sensor.living_room_humidity': makeEntity('sensor.living_room_humidity', '48', {
    friendly_name: 'Living Room Humidity',
    device_class: 'humidity',
    unit_of_measurement: '%',
    state_class: 'measurement',
  }),
  'sensor.kitchen_temperature': makeEntity('sensor.kitchen_temperature', '22.1', {
    friendly_name: 'Kitchen Temperature',
    device_class: 'temperature',
    unit_of_measurement: '°C',
    state_class: 'measurement',
  }),
  'sensor.kitchen_humidity': makeEntity('sensor.kitchen_humidity', '52', {
    friendly_name: 'Kitchen Humidity',
    device_class: 'humidity',
    unit_of_measurement: '%',
    state_class: 'measurement',
  }),
  'sensor.bedroom_temperature': makeEntity('sensor.bedroom_temperature', '19.8', {
    friendly_name: 'Bedroom Temperature',
    device_class: 'temperature',
    unit_of_measurement: '°C',
    state_class: 'measurement',
  }),
  'sensor.bedroom_humidity': makeEntity('sensor.bedroom_humidity', '55', {
    friendly_name: 'Bedroom Humidity',
    device_class: 'humidity',
    unit_of_measurement: '%',
    state_class: 'measurement',
  }),
  'sensor.office_temperature': makeEntity('sensor.office_temperature', '23.0', {
    friendly_name: 'Office Temperature',
    device_class: 'temperature',
    unit_of_measurement: '°C',
    state_class: 'measurement',
  }),
  'sensor.office_humidity': makeEntity('sensor.office_humidity', '45', {
    friendly_name: 'Office Humidity',
    device_class: 'humidity',
    unit_of_measurement: '%',
    state_class: 'measurement',
  }),
  'sensor.energy_today': makeEntity('sensor.energy_today', '18.4', {
    friendly_name: 'Energy Today',
    device_class: 'energy',
    unit_of_measurement: 'kWh',
    state_class: 'total_increasing',
  }),
  'sensor.bathroom_temperature': makeEntity('sensor.bathroom_temperature', '20.5', {
    friendly_name: 'Bathroom Temperature',
    device_class: 'temperature',
    unit_of_measurement: '°C',
    state_class: 'measurement',
  }),
  'sensor.bathroom_humidity': makeEntity('sensor.bathroom_humidity', '70', {
    friendly_name: 'Bathroom Humidity',
    device_class: 'humidity',
    unit_of_measurement: '%',
    state_class: 'measurement',
  }),

  // --- Binary sensors ---
  'binary_sensor.living_room_motion': makeEntity('binary_sensor.living_room_motion', 'on', {
    friendly_name: 'Living Room Motion',
    device_class: 'motion',
  }),
  'binary_sensor.bedroom_window': makeEntity('binary_sensor.bedroom_window', 'off', {
    friendly_name: 'Bedroom Window',
    device_class: 'window',
  }),
  'binary_sensor.hallway_motion': makeEntity('binary_sensor.hallway_motion', 'off', {
    friendly_name: 'Hallway Motion',
    device_class: 'motion',
  }),
  'binary_sensor.front_door': makeEntity('binary_sensor.front_door', 'off', {
    friendly_name: 'Front Door',
    device_class: 'door',
  }),

  // --- Switches ---
  'switch.coffee_machine': makeEntity('switch.coffee_machine', 'off', {
    friendly_name: 'Coffee Machine',
  }),
  'switch.office_desk': makeEntity('switch.office_desk', 'on', {
    friendly_name: 'Desk Switch',
  }),

  // --- Media players ---
  'media_player.living_room_tv': makeEntity('media_player.living_room_tv', 'playing', {
    friendly_name: 'Living Room TV',
    media_title: 'Blade Runner 2049',
    media_artist: 'Denis Villeneuve',
    media_album_name: 'Blade Runner 2049',
    entity_picture: null,
    volume_level: 0.35,
    is_volume_muted: false,
    media_duration: 9720,
    media_position: 2400,
    media_position_updated_at: NOW,
    source: 'Netflix',
    source_list: ['Netflix', 'YouTube', 'Spotify', 'HDMI 1', 'HDMI 2'],
    // PAUSE|SEEK|VOLUME_SET|VOLUME_MUTE|PREV|NEXT|SELECT_SOURCE|PLAY
    supported_features: 1 | 2 | 4 | 8 | 16 | 32 | 2048 | 16384,
  }),
  'media_player.bedroom_speaker': makeEntity('media_player.bedroom_speaker', 'paused', {
    friendly_name: 'Bedroom Speaker',
    media_title: 'Midnight Rain',
    media_artist: 'Taylor Swift',
    media_album_name: 'Midnights',
    entity_picture: null,
    volume_level: 0.2,
    is_volume_muted: false,
    source: 'Spotify',
    source_list: ['Spotify', 'AirPlay', 'Bluetooth'],
    group_members: [],
    // PAUSE|VOLUME_SET|VOLUME_MUTE|PREV|NEXT|SELECT_SOURCE|PLAY|SHUFFLE|REPEAT|GROUPING
    supported_features: 1 | 4 | 8 | 16 | 32 | 2048 | 16384 | 32768 | 262144 | 524288,
  }),
  'media_player.kitchen_speaker': makeEntity('media_player.kitchen_speaker', 'idle', {
    friendly_name: 'Kitchen Speaker',
    entity_picture: null,
    volume_level: 0.3,
    is_volume_muted: false,
    source: 'Spotify',
    source_list: ['Spotify', 'AirPlay'],
    group_members: [],
    // Same speaker family as the bedroom one — groupable with it.
    supported_features: 1 | 4 | 8 | 16 | 32 | 2048 | 16384 | 32768 | 262144 | 524288,
  }),

  // --- Covers ---
  'cover.bedroom_blinds': makeEntity('cover.bedroom_blinds', 'closed', {
    friendly_name: 'Bedroom Blinds',
    device_class: 'blind',
    current_position: 0,
  }),

  // --- Lock ---
  'lock.front_door': makeEntity('lock.front_door', 'locked', {
    friendly_name: 'Front Door Lock',
    changed_by: null,
  }),

  // --- Cameras ---
  'camera.hallway': makeEntity('camera.hallway', 'idle', {
    friendly_name: 'Hallway Camera',
    entity_picture: null,
  }),
  'camera.outdoor': makeEntity('camera.outdoor', 'idle', {
    friendly_name: 'Outdoor Camera',
    entity_picture: null,
  }),

  // --- Alarm ---
  'alarm_control_panel.home': makeEntity('alarm_control_panel.home', 'disarmed', {
    friendly_name: 'Home Alarm',
    code_format: 'number',
    changed_by: null,
  }),

  // --- Weather ---
  'weather.home': makeEntity('weather.home', 'sunny', {
    friendly_name: 'Home',
    temperature: 18.5,
    temperature_unit: '°C',
    humidity: 62,
    wind_speed: 12,
    condition: 'sunny',
    forecast: [
      { datetime: new Date(Date.now() + 86400000).toISOString(), temperature: 20, templow: 12, condition: 'partlycloudy', precipitation: 0 },
      { datetime: new Date(Date.now() + 172800000).toISOString(), temperature: 17, templow: 10, condition: 'rainy', precipitation: 8 },
      { datetime: new Date(Date.now() + 259200000).toISOString(), temperature: 15, templow: 9, condition: 'cloudy', precipitation: 2 },
      { datetime: new Date(Date.now() + 345600000).toISOString(), temperature: 19, templow: 11, condition: 'sunny', precipitation: 0 },
      { datetime: new Date(Date.now() + 432000000).toISOString(), temperature: 22, templow: 14, condition: 'sunny', precipitation: 0 },
    ],
  }),

  // --- Sun ---
  'sun.sun': makeEntity('sun.sun', 'above_horizon', {
    friendly_name: 'Sun',
    next_rising: new Date(Date.now() + 50000000).toISOString(),
    next_setting: new Date(Date.now() + 25000000).toISOString(),
    elevation: 42.3,
    azimuth: 220.5,
    rising: false,
  }),

  // --- Automations ---
  'automation.morning_wake_up': makeEntity('automation.morning_wake_up', 'on', {
    friendly_name: 'Wake Up',
    last_triggered: new Date(Date.now() - 6 * 3600000).toISOString(),
    current: 0, mode: 'single', category: 'Morning', icon: 'mdi:alarm',
  }),
  'automation.morning_coffee': makeEntity('automation.morning_coffee', 'on', {
    friendly_name: 'Coffee Machine',
    last_triggered: new Date(Date.now() - 6.5 * 3600000).toISOString(),
    current: 0, mode: 'single', category: 'Morning', icon: 'mdi:coffee',
  }),
  'automation.morning_lights': makeEntity('automation.morning_lights', 'on', {
    friendly_name: 'Morning Lights',
    last_triggered: new Date(Date.now() - 5.8 * 3600000).toISOString(),
    current: 0, mode: 'single', category: 'Morning', icon: 'mdi:weather-sunset-up',
  }),
  'automation.evening_lights': makeEntity('automation.evening_lights', 'on', {
    friendly_name: 'Evening Lights',
    last_triggered: new Date(Date.now() - 1 * 3600000).toISOString(),
    current: 0, mode: 'single', category: 'Evening', icon: 'mdi:weather-sunset-down',
  }),
  'automation.evening_shutters': makeEntity('automation.evening_shutters', 'on', {
    friendly_name: 'Close Shutters',
    last_triggered: new Date(Date.now() - 1.2 * 3600000).toISOString(),
    current: 0, mode: 'single', category: 'Evening', icon: 'mdi:blinds',
  }),
  'automation.evening_downtime': makeEntity('automation.evening_downtime', 'on', {
    friendly_name: 'Downtime Mode',
    last_triggered: new Date(Date.now() - 1.5 * 3600000).toISOString(),
    current: 0, mode: 'single', category: 'Evening', icon: 'mdi:sofa',
  }),
  'automation.security_front_door': makeEntity('automation.security_front_door', 'on', {
    friendly_name: 'Front Door Alert',
    last_triggered: new Date(Date.now() - 30 * 60000).toISOString(),
    current: 0, mode: 'single', category: 'Security', icon: 'mdi:door-alert',
  }),
  'automation.security_motion': makeEntity('automation.security_motion', 'on', {
    friendly_name: 'Motion Alert',
    last_triggered: new Date(Date.now() - 45 * 60000).toISOString(),
    current: 0, mode: 'single', category: 'Security', icon: 'mdi:motion-sensor',
  }),
  'automation.security_alarm': makeEntity('automation.security_alarm', 'off', {
    friendly_name: 'Alarm Notification',
    last_triggered: null,
    current: 0, mode: 'single', category: 'Security', icon: 'mdi:alarm-light',
  }),
  'automation.comfort_temperature': makeEntity('automation.comfort_temperature', 'on', {
    friendly_name: 'Temperature Control',
    last_triggered: new Date(Date.now() - 2 * 3600000).toISOString(),
    current: 0, mode: 'single', category: 'Comfort', icon: 'mdi:thermometer',
  }),
  'automation.comfort_humidity': makeEntity('automation.comfort_humidity', 'off', {
    friendly_name: 'Humidity Alert',
    last_triggered: new Date(Date.now() - 3 * 3600000).toISOString(),
    current: 0, mode: 'single', category: 'Comfort', icon: 'mdi:water-percent',
  }),
  'automation.away_mode': makeEntity('automation.away_mode', 'on', {
    friendly_name: 'Away Mode',
    last_triggered: null,
    current: 0, mode: 'single', category: 'Away', icon: 'mdi:home-export-outline',
  }),
  'automation.arrival_home': makeEntity('automation.arrival_home', 'on', {
    friendly_name: 'Arrival Home',
    last_triggered: new Date(Date.now() - 8 * 3600000).toISOString(),
    current: 0, mode: 'single', category: 'Away', icon: 'mdi:home-import-outline',
  }),

  // --- Scenes ---
  'scene.living_room_movie':  makeEntity('scene.living_room_movie',  new Date(Date.now() - 2 * 3600000).toISOString(),   { friendly_name: 'Movie Night' }),
  'scene.living_room_bright': makeEntity('scene.living_room_bright', new Date(Date.now() - 3 * 3600000).toISOString(),   { friendly_name: 'Bright Mode' }),
  'scene.living_room_relax':  makeEntity('scene.living_room_relax',  'unknown',                                           { friendly_name: 'Relax Mode' }),
  'scene.bedroom_sleep':      makeEntity('scene.bedroom_sleep',      new Date(Date.now() - 8 * 3600000).toISOString(),   { friendly_name: 'Sleep' }),
  'scene.bedroom_wake':       makeEntity('scene.bedroom_wake',       new Date(Date.now() - 5.5 * 3600000).toISOString(), { friendly_name: 'Wake Up' }),
  'scene.kitchen_cooking':    makeEntity('scene.kitchen_cooking',    new Date(Date.now() - 1 * 3600000).toISOString(),   { friendly_name: 'Cooking Mode' }),
  'scene.kitchen_morning':    makeEntity('scene.kitchen_morning',    new Date(Date.now() - 6 * 3600000).toISOString(),   { friendly_name: 'Morning Coffee' }),
  'scene.office_focus':       makeEntity('scene.office_focus',       new Date(Date.now() - 2.5 * 3600000).toISOString(), { friendly_name: 'Focus Mode' }),
  'scene.office_meeting':     makeEntity('scene.office_meeting',     'unknown',                                           { friendly_name: 'Meeting' }),
  'scene.hallway_away':       makeEntity('scene.hallway_away',       'unknown',                                           { friendly_name: 'Away Mode' }),
  'scene.hallway_welcome':    makeEntity('scene.hallway_welcome',    new Date(Date.now() - 4 * 3600000).toISOString(),   { friendly_name: 'Welcome Home' }),

  // --- Persons ---
  'person.alice': makeEntity('person.alice', 'home', {
    friendly_name: 'Alice',
    entity_picture: null,
    user_id: 'user_alice',
    source_type: 'gps',
  }),
  'person.bob': makeEntity('person.bob', 'not_home', {
    friendly_name: 'Bob',
    entity_picture: null,
    user_id: 'user_bob',
    source_type: 'gps',
  }),

  // --- System Monitor ---
  'sensor.processor_use': makeEntity('sensor.processor_use', '18', {
    friendly_name: 'Processor use', unit_of_measurement: '%', icon: 'mdi:cpu-64-bit', state_class: 'measurement',
  }),
  'sensor.processor_temperature': makeEntity('sensor.processor_temperature', '47.2', {
    friendly_name: 'Processor temperature', unit_of_measurement: '°C', device_class: 'temperature', state_class: 'measurement',
  }),
  'sensor.memory_use_percent': makeEntity('sensor.memory_use_percent', '54', {
    friendly_name: 'Memory use', unit_of_measurement: '%', icon: 'mdi:memory', state_class: 'measurement',
  }),
  'sensor.memory_free': makeEntity('sensor.memory_free', '3624', {
    friendly_name: 'Memory free', unit_of_measurement: 'MiB', icon: 'mdi:memory', state_class: 'measurement',
  }),
  'sensor.disk_use_percent': makeEntity('sensor.disk_use_percent', '61', {
    friendly_name: 'Disk use (/)', unit_of_measurement: '%', icon: 'mdi:harddisk', state_class: 'measurement',
  }),
  'sensor.disk_free': makeEntity('sensor.disk_free', '24.8', {
    friendly_name: 'Disk free (/)', unit_of_measurement: 'GiB', icon: 'mdi:harddisk', state_class: 'measurement',
  }),
  'sensor.network_throughput_in_eth0': makeEntity('sensor.network_throughput_in_eth0', '1.42', {
    friendly_name: 'Network throughput in eth0', unit_of_measurement: 'MB/s', icon: 'mdi:download-network', state_class: 'measurement',
  }),
  'sensor.network_throughput_out_eth0': makeEntity('sensor.network_throughput_out_eth0', '0.38', {
    friendly_name: 'Network throughput out eth0', unit_of_measurement: 'MB/s', icon: 'mdi:upload-network', state_class: 'measurement',
  }),
  'sensor.last_boot': makeEntity('sensor.last_boot', new Date(Date.now() - 6 * 86400000 - 5 * 3600000).toISOString(), {
    friendly_name: 'Last boot', device_class: 'timestamp',
  }),

  // --- Battery sensors ---
  'sensor.front_door_lock_battery': makeEntity('sensor.front_door_lock_battery', '88', {
    friendly_name: 'Front Door Lock Battery', unit_of_measurement: '%', device_class: 'battery', state_class: 'measurement',
  }),
  'sensor.hallway_motion_battery': makeEntity('sensor.hallway_motion_battery', '24', {
    friendly_name: 'Hallway Motion Battery', unit_of_measurement: '%', device_class: 'battery', state_class: 'measurement',
  }),
  'sensor.bedroom_sensor_battery': makeEntity('sensor.bedroom_sensor_battery', '64', {
    friendly_name: 'Bedroom Sensor Battery', unit_of_measurement: '%', device_class: 'battery', state_class: 'measurement',
  }),
};

// ---------------------------------------------------------------------------
// Demo ticker — simulates live state changes
// ---------------------------------------------------------------------------

/**
 * Start a ticker that calls `onChange` with a mutated entity map every few seconds.
 *
 * Pass `getCurrent` to make each tick start from the caller's latest entity map
 * (e.g. the app store) so external mutations from `applyDemoService` are not
 * overwritten by the ticker's own copy.
 */
export function createDemoTicker(
  onChange: (entities: HassEntityMap) => void,
  getCurrent?: () => HassEntityMap
): () => void {
  let current: HassEntityMap = deepCloneEntities(DEMO_ENTITIES);
  let active = true;

  const step = (): void => {
    if (!active) return;

    current = deepCloneEntities(getCurrent?.() ?? current);
    const now = new Date().toISOString();

    // Temperature drift (±0.1°C)
    const tempSensors = [
      'sensor.living_room_temperature',
      'sensor.kitchen_temperature',
      'sensor.bedroom_temperature',
      'sensor.office_temperature',
      'sensor.bathroom_temperature',
    ] as const;

    for (const id of tempSensors) {
      const e = current[id];
      if (!e) continue;
      const cur = parseFloat(e.state);
      if (!isNaN(cur)) {
        const next = Math.round((cur + (Math.random() - 0.5) * 0.2) * 10) / 10;
        current[id] = { ...e, state: String(next), last_updated: now };
      }
    }

    // Occasional living room motion toggle
    if (Math.random() < 0.15) {
      const m = current['binary_sensor.living_room_motion'];
      if (m) {
        current['binary_sensor.living_room_motion'] = {
          ...m,
          state: m.state === 'on' ? 'off' : 'on',
          last_updated: now,
          last_changed: now,
        };
      }
    }

    // Hallway motion brief burst
    if (Math.random() < 0.08) {
      const hm = current['binary_sensor.hallway_motion'];
      if (hm) {
        current['binary_sensor.hallway_motion'] = { ...hm, state: 'on', last_changed: now, last_updated: now };
        // Turn off after 3s
        setTimeout(() => {
          if (!active) return;
          current = deepCloneEntities(current);
          const e = current['binary_sensor.hallway_motion'];
          if (e) {
            current['binary_sensor.hallway_motion'] = { ...e, state: 'off', last_changed: new Date().toISOString(), last_updated: new Date().toISOString() };
            onChange(current);
          }
        }, 3000);
      }
    }

    // TV media position advance
    const tv = current['media_player.living_room_tv'];
    if (tv?.state === 'playing') {
      const pos = (tv.attributes['media_position'] as number | undefined) ?? 0;
      current['media_player.living_room_tv'] = {
        ...tv,
        attributes: { ...tv.attributes, media_position: pos + 5, media_position_updated_at: now },
        last_updated: now,
      };
    }

    onChange(current);
    const delay = 4000 + Math.random() * 3000;
    setTimeout(step, delay);
  };

  // First tick after short delay
  setTimeout(step, 2000);

  return () => { active = false; };
}

// ---------------------------------------------------------------------------
// Demo service application
// ---------------------------------------------------------------------------

/**
 * Apply a simulated service call to demo entities.
 * Returns a new entity map reflecting the change.
 */
export function applyDemoService(
  entities: HassEntityMap,
  domain: string,
  service: string,
  data: Record<string, unknown> = {},
  target: { entity_id?: string | string[] } = {}
): HassEntityMap {
  const updated = deepCloneEntities(entities);
  const now = new Date().toISOString();

  const targetIds: string[] = Array.isArray(target.entity_id)
    ? target.entity_id
    : target.entity_id
      ? [target.entity_id]
      : Object.keys(entities).filter((id) => id.startsWith(domain + '.'));

  // Speaker grouping mutates SEVERAL entities (leader and members all carry
  // the group in group_members), so it is handled before per-entity dispatch.
  if (domain === 'media_player' && (service === 'join' || service === 'unjoin')) {
    return applyGroupingService(updated, service, data, targetIds, now);
  }

  for (const entityId of targetIds) {
    const entity = updated[entityId];
    if (!entity) continue;

    switch (domain) {
      case 'light':
        updated[entityId] = applyLightService(entity, service, data, now);
        break;
      case 'switch':
      case 'input_boolean':
      case 'fan':
        updated[entityId] = applyToggleService(entity, service, now);
        break;
      case 'media_player':
        updated[entityId] = applyMediaService(entity, service, data, now);
        break;
      case 'climate':
        updated[entityId] = applyClimateService(entity, service, data, now);
        break;
      case 'cover':
        updated[entityId] = applyCoverService(entity, service, data, now);
        break;
      case 'lock':
        updated[entityId] = applyLockService(entity, service, now);
        break;
      case 'alarm_control_panel':
        updated[entityId] = applyAlarmService(entity, service, now);
        break;
      case 'automation':
        updated[entityId] = applyAutomationService(entity, service, now);
        break;
      case 'scene':
        updated[entityId] = applySceneService(entity, now);
        break;
    }
  }

  return updated;
}

// --- Service helpers ---

function applyLightService(
  entity: HassEntity,
  service: string,
  data: Record<string, unknown>,
  now: string
): HassEntity {
  const attrs = { ...entity.attributes };
  let state = entity.state;

  switch (service) {
    case 'turn_on':
      state = 'on';
      if (typeof data['brightness'] === 'number') attrs['brightness'] = data['brightness'];
      if (typeof data['color_temp'] === 'number') attrs['color_temp'] = data['color_temp'];
      if (typeof data['brightness_pct'] === 'number') {
        attrs['brightness'] = Math.round((data['brightness_pct'] as number) * 2.55);
      }
      break;
    case 'turn_off':
      state = 'off';
      break;
    case 'toggle':
      state = entity.state === 'on' ? 'off' : 'on';
      break;
  }

  return { ...entity, state, attributes: attrs, last_updated: now, last_changed: entity.state !== state ? now : entity.last_changed };
}

function applyToggleService(entity: HassEntity, service: string, now: string): HassEntity {
  let state = entity.state;
  switch (service) {
    case 'turn_on': state = 'on'; break;
    case 'turn_off': state = 'off'; break;
    case 'toggle': state = entity.state === 'on' ? 'off' : 'on'; break;
  }
  return { ...entity, state, last_updated: now, last_changed: entity.state !== state ? now : entity.last_changed };
}

function applyMediaService(
  entity: HassEntity,
  service: string,
  data: Record<string, unknown>,
  now: string
): HassEntity {
  const attrs = { ...entity.attributes };
  let state = entity.state;

  switch (service) {
    case 'media_play': state = 'playing'; break;
    case 'media_pause': state = 'paused'; break;
    case 'media_stop': state = 'idle'; break;
    case 'media_play_pause':
      state = entity.state === 'playing' ? 'paused' : 'playing';
      break;
    case 'media_next_track': break;
    case 'media_previous_track': break;
    case 'volume_set':
      if (typeof data['volume_level'] === 'number') attrs['volume_level'] = data['volume_level'];
      break;
    case 'volume_mute':
      if (typeof data['is_volume_muted'] === 'boolean') attrs['is_volume_muted'] = data['is_volume_muted'];
      break;
    case 'turn_on': state = 'idle'; break;
    case 'turn_off': state = 'off'; break;
  }

  return { ...entity, state, attributes: attrs, last_updated: now, last_changed: entity.state !== state ? now : entity.last_changed };
}

function applyClimateService(
  entity: HassEntity,
  service: string,
  data: Record<string, unknown>,
  now: string
): HassEntity {
  const attrs = { ...entity.attributes };
  let state = entity.state;

  switch (service) {
    case 'set_temperature':
      if (typeof data['temperature'] === 'number') attrs['temperature'] = data['temperature'];
      break;
    case 'set_hvac_mode':
      if (typeof data['hvac_mode'] === 'string') state = data['hvac_mode'];
      break;
    case 'set_preset_mode':
      if (typeof data['preset_mode'] === 'string') attrs['preset_mode'] = data['preset_mode'];
      break;
    case 'turn_off': state = 'off'; break;
    case 'turn_on': state = 'heat'; break;
  }

  return { ...entity, state, attributes: attrs, last_updated: now, last_changed: entity.state !== state ? now : entity.last_changed };
}

function applyCoverService(
  entity: HassEntity,
  service: string,
  data: Record<string, unknown>,
  now: string
): HassEntity {
  const attrs = { ...entity.attributes };
  let state = entity.state;

  switch (service) {
    case 'open_cover':
      state = 'open';
      attrs['current_position'] = 100;
      break;
    case 'close_cover':
      state = 'closed';
      attrs['current_position'] = 0;
      break;
    case 'stop_cover':
      state = 'stopped';
      break;
    case 'set_cover_position':
      if (typeof data['position'] === 'number') {
        const pos = data['position'];
        attrs['current_position'] = pos;
        state = pos === 0 ? 'closed' : pos === 100 ? 'open' : 'open';
      }
      break;
  }

  return { ...entity, state, attributes: attrs, last_updated: now, last_changed: entity.state !== state ? now : entity.last_changed };
}

function applyAutomationService(entity: HassEntity, service: string, now: string): HassEntity {
  switch (service) {
    case 'turn_on':
      return { ...entity, state: 'on', last_updated: now, last_changed: entity.state !== 'on' ? now : entity.last_changed };
    case 'turn_off':
      return { ...entity, state: 'off', last_updated: now, last_changed: entity.state !== 'off' ? now : entity.last_changed };
    case 'trigger':
      return { ...entity, last_updated: now, attributes: { ...entity.attributes, last_triggered: now } };
  }
  return entity;
}

function applySceneService(entity: HassEntity, now: string): HassEntity {
  return { ...entity, state: now, last_updated: now, last_changed: now };
}

function applyLockService(entity: HassEntity, service: string, now: string): HassEntity {
  let state = entity.state;
  switch (service) {
    case 'lock': state = 'locked'; break;
    case 'unlock': state = 'unlocked'; break;
  }
  return { ...entity, state, last_updated: now, last_changed: entity.state !== state ? now : entity.last_changed };
}

function applyAlarmService(entity: HassEntity, service: string, now: string): HassEntity {
  let state = entity.state;
  switch (service) {
    case 'alarm_disarm': state = 'disarmed'; break;
    case 'alarm_arm_home': state = 'armed_home'; break;
    case 'alarm_arm_away': state = 'armed_away'; break;
    case 'alarm_arm_night': state = 'armed_night'; break;
  }
  return { ...entity, state, last_updated: now, last_changed: entity.state !== state ? now : entity.last_changed };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function deepCloneEntities(entities: HassEntityMap): HassEntityMap {
  const out: HassEntityMap = {};
  for (const [id, entity] of Object.entries(entities)) {
    out[id] = { ...entity, attributes: { ...entity.attributes } };
  }
  return out;
}

/** Demo simulation of media_player.join / unjoin — mirrors HA's convention:
 *  every group member's `group_members` lists the leader first. */
function applyGroupingService(
  updated: HassEntityMap,
  service: string,
  data: Record<string, unknown>,
  targetIds: string[],
  now: string,
): HassEntityMap {
  const touch = (id: string, groupMembers: string[]) => {
    const e = updated[id];
    if (!e) return;
    updated[id] = {
      ...e,
      attributes: { ...e.attributes, group_members: groupMembers },
      last_changed: now,
      last_updated: now,
    };
  };

  if (service === 'join') {
    const leader = targetIds[0];
    if (!leader) return updated;
    const raw = data['group_members'];
    const members = Array.isArray(raw) ? raw.filter((m): m is string => typeof m === 'string') : [];
    const group = [leader, ...members.filter((m) => m !== leader)];
    for (const id of group) touch(id, group);
    return updated;
  }

  // unjoin: remove each target from whatever group it is in.
  for (const id of targetIds) {
    const current = updated[id]?.attributes['group_members'];
    const group = Array.isArray(current) ? (current as string[]) : [];
    const remaining = group.filter((m) => m !== id);
    touch(id, []);
    // A group of one is no group at all.
    for (const m of remaining) touch(m, remaining.length > 1 ? remaining : []);
  }
  return updated;
}
