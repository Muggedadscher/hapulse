/**
 * [fork] Glas — sidebar groups (docs/GLAS-DESIGN.md §7.2, E10; plan docs/glas/PLAN-ETAPPE-2.md §4.1). The groups are
 * fixed; within a group the entries keep the user's nav order; hidden entries and empty groups are left out; entries
 * the table does not know (a new upstream page) go to "Bereiche".
 */

export type NavGroupId = 'home' | 'areas' | 'system';

export const NAV_GROUP_ORDER: readonly NavGroupId[] = ['home', 'areas', 'system'];

const GROUP_OF: Readonly<Record<string, NavGroupId>> = {
  overview: 'home',
  rooms: 'home',
  scenes: 'home',
  automations: 'home',
  nvr: 'areas',
  pool: 'areas',
  security: 'areas',
  energy: 'areas',
  music: 'areas',
  devices: 'areas',
  system: 'system',
  settings: 'system',
};

export interface NavGroup {
  id: NavGroupId;
  ids: string[];
}

export function navGroups(orderedIds: readonly string[], hidden: readonly string[]): NavGroup[] {
  const hiddenSet = new Set(hidden);
  const byGroup = new Map<NavGroupId, string[]>(NAV_GROUP_ORDER.map((g) => [g, []]));
  for (const id of orderedIds) {
    if (hiddenSet.has(id)) continue;
    byGroup.get(GROUP_OF[id] ?? 'areas')!.push(id);
  }
  return NAV_GROUP_ORDER.map((id) => ({ id, ids: byGroup.get(id)! })).filter((g) => g.ids.length > 0);
}
