/**
 * [fork] Glas edit bar (plan docs/glas/PLAN-ETAPPE-4.md K78): dnd-kit listens for pointer, touch and key presses on
 * the whole card (SortableItem). A press on the bar above a card, or Space / Enter on one of its buttons, belongs to
 * the bar and must not start a drag — Space and Enter would otherwise begin a keyboard drag instead of pressing the
 * button. The bar carries `data-g-nodrag`; the listeners skip events from inside it. Stopping the events on the bar
 * instead would also hide them from the document listeners that close open popovers.
 */

/** dnd-kit's listener map (React event handlers by prop name) with the bar's events left out. */
export function withoutBarDrag<L extends object | undefined>(listeners: L): L {
  if (!listeners) return listeners;
  const out: Record<string, unknown> = {};
  for (const [name, handler] of Object.entries(listeners)) {
    if (typeof handler !== 'function') {
      out[name] = handler;
      continue;
    }
    out[name] = (event: { target: EventTarget | null }) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-g-nodrag]')) return;
      (handler as (e: unknown) => void)(event);
    };
  }
  return out as L;
}
