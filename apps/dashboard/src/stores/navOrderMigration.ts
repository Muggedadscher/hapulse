/**
 * [fork] One-time move of the sidebar order to Overview, Rooms, NVR, Pool, then the rest.
 *
 * `NAV_CONFIG` (AppLayout) already lists the items in that order, but a user who has
 * dragged the nav once stores the full list in `navOrder`, and `applyStoredOrder` puts
 * that stored list first — so the new default would never reach them. This rewrites a
 * non-empty stored order exactly once: the four head items go to the front, everything
 * else keeps its relative order. An empty order already follows `NAV_CONFIG` and stays
 * empty (filling it would freeze today's order against future defaults). Idempotent via
 * the marker, so a later manual reorder is respected.
 */

export const NAV_ORDER_V2_HEAD = ['overview', 'rooms', 'nvr', 'pool'] as const;

interface NavOrderFields {
  navOrder: string[];
  navOrderV2Migrated: boolean;
}

export function migrateNavOrderV2<T extends NavOrderFields>(cust: T): T {
  if (cust.navOrderV2Migrated) return cust;
  let navOrder = cust.navOrder;
  if (navOrder.length > 0) {
    const head: readonly string[] = NAV_ORDER_V2_HEAD;
    navOrder = [...head, ...navOrder.filter((id) => !head.includes(id))];
  }
  return { ...cust, navOrder, navOrderV2Migrated: true };
}
