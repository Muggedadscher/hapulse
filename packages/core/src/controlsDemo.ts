/**
 * [fork] The demo's number and select entities, so the battery's window can set its charge limit, reserve and mode
 * in the demo (plan glas/energie-neu/umsetzung/PLAN-E4-AKKU.md, E5). `number.set_value` takes a value within the
 * entity's `min` and `max`, `select.select_option` one of its `options`; anything else changes nothing, as Home
 * Assistant refuses it. Not a model of the battery: its charge and power stay as the demo has them.
 */

import type { HassEntityMap } from './types.js';

export function applyDemoControlService(
  entities: HassEntityMap,
  domain: string,
  service: string,
  data: Record<string, unknown>,
  targetIds: string[],
  now: string,
): HassEntityMap | null {
  const number = domain === 'number' && service === 'set_value';
  const select = domain === 'select' && service === 'select_option';
  if (!number && !select) return null;
  for (const id of targetIds) {
    const entity = entities[id];
    if (!entity) continue;
    const a = entity.attributes;
    let state: string;
    if (number) {
      const v = Number(data['value']);
      const min = typeof a['min'] === 'number' ? a['min'] : -Infinity;
      const max = typeof a['max'] === 'number' ? a['max'] : Infinity;
      if (!Number.isFinite(v) || v < min || v > max) continue;
      state = String(v);
    } else {
      const option = data['option'];
      const options = Array.isArray(a['options']) ? a['options'] : [];
      if (typeof option !== 'string' || !options.includes(option)) continue;
      state = option;
    }
    entities[id] = { ...entity, state, last_updated: now, last_changed: entity.state !== state ? now : entity.last_changed };
  }
  return entities;
}
