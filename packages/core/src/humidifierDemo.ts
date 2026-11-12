/**
 * [fork] A dehumidifier in the demo bathroom (humidifier.ts), like a generic hygrostat in HA: target 60 %, on above
 * the target plus 3 %, off below the target minus 3 %. The demo bathroom reads 70 %, so it starts drying. Its
 * service calls change the entity the way the hygrostat would; the humidity itself does not move in the demo.
 */

import type { EntityRegistryEntry, HassEntity, HassEntityMap } from './types.js';

export const DEMO_DEHUMIDIFIER = 'humidifier.bathroom_dehumidifier';
const DEMO_HUMIDITY_SENSOR = 'sensor.bathroom_humidity';
const TOLERANCE = 3;

function demoAction(on: boolean, current: number | null, target: number, previous: unknown): string {
  if (!on) return 'off';
  if (current == null) return 'idle';
  if (current >= target + TOLERANCE) return 'drying';
  if (current <= target - TOLERANCE) return 'idle';
  return previous === 'drying' ? 'drying' : 'idle'; // between the two edges it keeps what it does
}

function currentOf(entities: HassEntityMap): number | null {
  const v = parseFloat(entities[DEMO_HUMIDITY_SENSOR]?.state ?? '');
  return Number.isFinite(v) ? v : null;
}

export function demoHumidifierEntities(): HassEntityMap {
  const now = new Date().toISOString();
  const entity: HassEntity = {
    entity_id: DEMO_DEHUMIDIFIER,
    state: 'on',
    attributes: {
      friendly_name: 'Bathroom Dehumidifier',
      device_class: 'dehumidifier',
      action: 'drying',
      current_humidity: 70,
      humidity: 60,
      min_humidity: 0,
      max_humidity: 100,
      supported_features: 0,
    },
    last_changed: now,
    last_updated: now,
    context: { id: 'demo', parent_id: null, user_id: null },
  };
  return { [DEMO_DEHUMIDIFIER]: entity };
}

export function demoHumidifierRegistryEntries(): EntityRegistryEntry[] {
  return [{
    entity_id: DEMO_DEHUMIDIFIER, area_id: 'bathroom', device_id: null, entity_category: null, hidden_by: null,
    disabled_by: null, original_name: null, icon: null, platform: 'generic_hygrostat',
  }];
}

/** `humidifier.turn_on/turn_off/toggle/set_humidity` on the demo dehumidifier; null for any other call. */
export function applyDemoHumidifierService(
  entities: HassEntityMap,
  domain: string,
  service: string,
  data: Record<string, unknown>,
  targetIds: string[],
  now: string,
): HassEntityMap | null {
  if (domain !== 'humidifier') return null;
  let changed = false;
  for (const id of targetIds) {
    const entity = entities[id];
    if (!entity) continue;
    let on = entity.state === 'on';
    let target = typeof entity.attributes['humidity'] === 'number' ? (entity.attributes['humidity'] as number) : 60;
    if (service === 'turn_on') on = true;
    else if (service === 'turn_off') on = false;
    else if (service === 'toggle') on = !on;
    else if (service === 'set_humidity') {
      const v = Number(data['humidity']);
      if (!Number.isFinite(v)) continue;
      target = v;
    } else continue;
    const current = currentOf(entities);
    const state = on ? 'on' : 'off';
    entities[id] = {
      ...entity,
      state,
      attributes: { ...entity.attributes, humidity: target, current_humidity: current ?? entity.attributes['current_humidity'], action: demoAction(on, current, target, entity.attributes['action']) },
      last_updated: now,
      last_changed: entity.state !== state ? now : entity.last_changed,
    };
    changed = true;
  }
  return changed ? entities : null;
}
