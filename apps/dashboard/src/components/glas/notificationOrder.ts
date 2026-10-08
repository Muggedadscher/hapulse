/**
 * [fork] Glas notifications sheet (stage 3, plan docs/glas/PLAN-ETAPPE-3.md §3.9, K57): the order of the rows and
 * which times count. DOM-free, tested in `test/notificationOrder.test.ts`.
 */

export interface Timed {
  createdAt?: string | undefined;
}

/** Milliseconds of `createdAt`, or null when HA sent none or nothing `Date.parse` understands. */
export function createdMs(n: Timed): number | null {
  if (!n.createdAt) return null;
  const ms = Date.parse(n.createdAt);
  return Number.isNaN(ms) ? null : ms;
}

/** Newest first; notifications without a valid time follow at the end, in the order HA sent them. */
export function newestFirst<T extends Timed>(list: readonly T[]): T[] {
  return list
    .map((n, i) => ({ n, i, ms: createdMs(n) }))
    .sort((a, b) => {
      if (a.ms === null || b.ms === null) return a.ms === b.ms ? a.i - b.i : a.ms === null ? 1 : -1;
      return b.ms - a.ms || a.i - b.i;
    })
    .map((e) => e.n);
}
