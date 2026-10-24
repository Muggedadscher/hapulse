/**
 * [fork] The automation groups of the Automations page follow Home Assistant's own categories.
 *
 * HA keeps an automation's category in the entity registry (`categories.automation` = category id) and the names in
 * the category registry (`config/category_registry/list`, scope `automation`) — the same grouping HA's automation
 * list shows. Upstream only read a `category` state attribute (HA never sets one) and otherwise grouped by the first
 * word of the entity id, so seven "Advanced Heating …" automations in the HA category "Heizung Zeitplan" showed up
 * as "Advanced".
 *
 * Order: HA category → `category` attribute → first word of the entity id → "General". Automations without an HA
 * category keep the upstream grouping. Fetched once per connection like the registries (connectionStore); a renamed
 * category shows after the next reload. A failed fetch leaves the map empty: the page then groups as upstream did.
 */

import { create } from 'zustand';
import type { EntityRegistryEntry, HAConnection, HassEntity } from '@hapulse/core';

/** Category id → name for scope `automation`. */
export type CategoryNames = Record<string, string>;

const useCategoryStore = create<{ names: CategoryNames }>()(() => ({ names: {} }));

/** Bumped by every start/stop: a fetch that finishes after the connection changed is dropped. */
let _gen = 0;

export function startAutomationCategories(conn: Pick<HAConnection, 'fetchCategories'>): void {
  stopAutomationCategories();
  const gen = _gen;
  conn.fetchCategories('automation').then(
    (names) => {
      if (gen === _gen) useCategoryStore.setState({ names });
    },
    (err: unknown) => {
      console.warn('[HAPulse] category registry unavailable — automations grouped by name:', err);
    },
  );
}

export function stopAutomationCategories(): void {
  _gen++;
  useCategoryStore.setState({ names: {} });
}

export function useAutomationCategoryNames(): CategoryNames {
  return useCategoryStore((s) => s.names);
}

/** The group an automation belongs to (see the order above). */
export function automationCategory(
  entity: HassEntity,
  registryEntry: Pick<EntityRegistryEntry, 'categories'> | undefined,
  names: CategoryNames,
): string {
  const id = registryEntry?.categories?.automation;
  const haName = id ? names[id]?.trim() : undefined;
  if (haName) return haName;
  const cat = entity.attributes.category as string | undefined;
  if (cat) return cat;
  const suffix = entity.entity_id.slice('automation.'.length);
  const first = suffix.split('_')[0] ?? '';
  return first.length > 1 ? first.charAt(0).toUpperCase() + first.slice(1) : 'General';
}
