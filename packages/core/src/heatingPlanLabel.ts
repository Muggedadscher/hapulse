/**
 * [fork] The Home Assistant label that marks a room's heating plan entries: its "Advanced Heating" automation, its
 * schedule and its two temperature helpers (heatingPlan.ts). A module of its own so that both rooms.ts and
 * heatingPlan.ts can use it without importing each other.
 */

import type { EntityRegistryEntry } from './types.js';

/** Label id (`labels` in the entity registry) of the heating plan entries. */
export const HEATING_PLAN_LABEL = 'heizplan';

export function isHeatingPlanEntry(entry: Pick<EntityRegistryEntry, 'labels'>): boolean {
  return entry.labels?.includes(HEATING_PLAN_LABEL) ?? false;
}
