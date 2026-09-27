/**
 * [fork] Default slot for a section/chip id that is newer than a stored order.
 *
 * `applyStoredOrder` appends ids unknown to the stored order at the END. For a
 * new id that belongs next to an existing one (garage doors after locks, the
 * garage section where the blinds were) this inserts it into the stored order
 * right after `anchor` — as long as the user has not placed it themselves.
 * Pure; the stored setting itself is not changed (a later drag saves it).
 */
export function withDefaultSlot(stored: string[] | undefined, id: string, anchor: string): string[] | undefined {
  if (!stored || stored.length === 0 || stored.includes(id)) return stored;
  const at = stored.indexOf(anchor);
  if (at < 0) return stored;
  return [...stored.slice(0, at + 1), id, ...stored.slice(at + 1)];
}
