/**
 * Domain helpers — pure utilities for HA entity IDs.
 */

import type { HassEntity } from './types.js';
import type { EntityStateLabel } from './entityStates.js';

/**
 * Determines whether a favorited entity should be shown in the favorites strip.
 *
 * The rule set aims to surface entities only when there is something actionable
 * or informative to display:
 *
 * - `unavailable` / `unknown` state → **false** (no useful data)
 * - **Togglable on/off** domains (light, switch, fan, input_boolean, siren,
 *   humidifier) → true only when `state === 'on'`
 * - `binary_sensor` → true only when `state === 'on'`
 * - `cover` → true only when `state === 'open'`
 * - `lock` → true only when `state === 'unlocked'`
 * - `media_player` → true when `state === 'playing' || state === 'paused'`
 * - `climate` → true when `state !== 'off'`
 * - `alarm_control_panel` → true when `state !== 'disarmed'`
 * - `vacuum` → true when `state === 'cleaning' || state === 'returning'`
 * - `sensor`, `number`, `weather`, `sun`, `person` → **always true** (value-type / location)
 * - Default fallback → true unless state is one of the common "inactive" values
 *   (`'off'`, `'idle'`, `'standby'`, `'closed'`, `'locked'`, `'disarmed'`)
 */
export function isFavoriteRelevant(entity: HassEntity): boolean {
  const { state } = entity;

  // Never show unavailable or unknown entities
  if (state === 'unavailable' || state === 'unknown') return false;

  const domain = domainOf(entity.entity_id);

  switch (domain) {
    // Togglable on/off domains — show only when active
    case 'light':
    case 'switch':
    case 'fan':
    case 'input_boolean':
    case 'siren':
    case 'humidifier':
      return state === 'on';

    case 'binary_sensor':
      return state === 'on';

    case 'cover':
      return state === 'open';

    case 'lock':
      return state === 'unlocked';

    case 'media_player':
      return state === 'playing' || state === 'paused';

    case 'climate':
      return state !== 'off';

    case 'alarm_control_panel':
      return state !== 'disarmed';

    case 'vacuum':
      return state === 'cleaning' || state === 'returning';

    // Value-type / location domains — always meaningful
    case 'sensor':
    case 'number':
    case 'weather':
    case 'sun':
    case 'person':
      return true;

    // Default: show unless the state is a common "inactive" value
    default:
      return !['off', 'idle', 'standby', 'closed', 'locked', 'disarmed'].includes(state);
  }
}

/**
 * Extract the domain from an entity ID.
 * e.g. `light.living_room_ceiling` → `"light"`
 */
export function domainOf(entityId: string): string {
  const dot = entityId.indexOf('.');
  return dot === -1 ? entityId : entityId.slice(0, dot);
}

/**
 * Returns true for domains that support toggle (on/off).
 */
export function isToggleable(domain: string): boolean {
  return (
    domain === 'light' ||
    domain === 'switch' ||
    domain === 'fan' ||
    domain === 'input_boolean' ||
    domain === 'media_player'
  );
}

/**
 * Format an entity's state for display.
 *
 * Rules:
 * - `unavailable` | `unknown` → `"unavailable"`
 * - Numeric state with `unit_of_measurement` → rounded to 1 decimal + unit
 * - `device_class: timestamp` → locale-formatted date/time string
 * - Anything else → the raw state string
 *
 * `label` translates the non-numeric cases (see `entityStates.ts`). Omitting it
 * yields the raw English-ish state, which is what a non-UI caller wants.
 */
export function formatEntityState(
  entity: HassEntity,
  locale?: string,
  label?: EntityStateLabel,
): string {
  const { state, attributes } = entity;

  // `unknown` collapses onto `unavailable`: the distinction is not actionable
  // for a dashboard reader.
  if (state === 'unavailable' || state === 'unknown') {
    return label ? label(domainOf(entity.entity_id), 'unavailable') : 'unavailable';
  }

  // Timestamp device class
  if (attributes['device_class'] === 'timestamp' && state) {
    try {
      const date = new Date(state);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString(locale ?? undefined);
      }
    } catch {
      // fall through
    }
  }

  // Numeric + unit
  const unit = attributes['unit_of_measurement'];
  if (unit !== undefined && unit !== null) {
    const num = parseFloat(state);
    if (!isNaN(num)) {
      return `${Math.round(num * 10) / 10} ${unit}`;
    }
  }

  if (!label) return state;
  const deviceClass = attributes['device_class'];
  return label(domainOf(entity.entity_id), state, {
    deviceClass: typeof deviceClass === 'string' ? deviceClass : undefined,
  });
}

/**
 * Map from domain (and optionally device_class) to a Lucide icon name string.
 *
 * Usage: pass entity; the function checks domain + device_class attribute.
 */
export function domainIcon(entity: HassEntity): string {
  const domain = domainOf(entity.entity_id);
  const deviceClass = entity.attributes['device_class'] as string | undefined;

  switch (domain) {
    case 'light':
      return 'lightbulb';

    case 'switch':
      return 'plug';

    case 'fan':
      return 'fan';

    case 'climate':
      return 'thermometer';

    case 'cover':
      return deviceClass === 'blind' || deviceClass === 'curtain'
        ? 'blinds'
        : deviceClass === 'garage'
          ? 'warehouse'
          : 'panel-top';

    case 'media_player':
      return 'speaker';

    case 'camera':
      return 'camera';

    case 'lock':
      return 'lock';

    case 'alarm_control_panel':
      return 'shield';

    case 'weather':
      return 'cloud-sun';

    case 'person':
      return 'user';

    case 'sun':
      return 'sun';

    case 'input_boolean':
      return 'toggle-left';

    case 'script':
      return 'play';

    case 'automation':
      return 'zap';

    case 'scene':
      return 'sparkles';

    case 'binary_sensor':
      return binarySensorIcon(deviceClass);

    case 'sensor':
      return sensorIcon(deviceClass);

    default:
      return 'activity';
  }
}

function binarySensorIcon(deviceClass: string | undefined): string {
  switch (deviceClass) {
    case 'door':
      return 'door-open';
    case 'window':
      return 'app-window';
    case 'motion':
      return 'activity';
    case 'smoke':
      return 'flame';
    case 'moisture':
      return 'droplets';
    case 'lock':
      return 'lock';
    case 'presence':
      return 'user-check';
    case 'opening':
      return 'door-open';
    default:
      return 'circle-dot';
  }
}

function sensorIcon(deviceClass: string | undefined): string {
  switch (deviceClass) {
    case 'temperature':
      return 'thermometer';
    case 'humidity':
      return 'droplets';
    case 'power':
    case 'energy':
      return 'zap';
    case 'illuminance':
      return 'sun';
    case 'battery':
      return 'battery';
    case 'pressure':
      return 'gauge';
    case 'timestamp':
      return 'clock';
    case 'voltage':
      return 'bolt';
    case 'current':
      return 'zap';
    case 'co2':
    case 'carbon_dioxide':
      return 'wind';
    case 'gas':
      return 'flame';
    default:
      return 'activity';
  }
}
