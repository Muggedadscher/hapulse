/**
 * [fork] The Home Assistant label that marks a room's heating plan entries: its "Advanced Heating" automation, its
 * schedule and its two temperature helpers (heatingPlan.ts). A module of its own so that both rooms.ts and
 * heatingPlan.ts can use it without importing each other.
 */

import { domainOf } from './domain.js';
import type { EntityRegistryEntry } from './types.js';

/** Label id (`labels` in the entity registry) of the heating plan entries. */
export const HEATING_PLAN_LABEL = 'heizplan';

/** The domains of a plan's entries; the label on anything else (a thermostat, say) changes nothing. */
const PLAN_DOMAINS = new Set(['automation', 'schedule', 'input_number']);

export function isHeatingPlanEntry(entry: Pick<EntityRegistryEntry, 'entity_id' | 'labels'>): boolean {
  return (entry.labels?.includes(HEATING_PLAN_LABEL) ?? false) && PLAN_DOMAINS.has(domainOf(entry.entity_id));
}
