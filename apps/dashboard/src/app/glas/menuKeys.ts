/**
 * [fork] Glas — arrow keys in menus (plan docs/glas/PLAN-ETAPPE-2.md K42): the next item for ArrowDown/ArrowUp
 * (wrapping), Home and End. `index` = the focused item, −1 when the focus is on none (e.g. on the trigger).
 * `null` for any other key or an empty menu.
 */
export function nextMenuIndex(key: string, index: number, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowDown':
      return index < 0 ? 0 : (index + 1) % count;
    case 'ArrowUp':
      return index < 0 ? count - 1 : (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
