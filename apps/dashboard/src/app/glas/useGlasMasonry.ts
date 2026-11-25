// [fork] Glas: the overview's cards keep their own height and close up below each other ("masonry") from 900 px, outside
// edit mode. CSS grid places the cards as before (order, widths); this hook only tells each cell how many of the
// grid's small rows (--g-mas-row) it covers, measured from its content. Order and widths as before; placement is sparse
// (home.css), so a card never moves above one that comes before it. Without the hook (Klassisch, edit mode, phone) the
// grid stays the classic one with rows of equal height.
import { useLayoutEffect, type RefObject } from "react";

const ROW = 4; // px, must match --g-mas-row in styles/glas/home.css

/** Rows of `row` px a cell of height `h` covers, its gap to the next card included; an empty cell (0) takes one row. */
export function masonrySpan(h: number, gap: number, row = ROW): number {
  return h > 0 ? Math.max(1, Math.ceil((h + gap) / row)) : 1;
}

export function useGlasMasonry(
  root: RefObject<HTMLElement | null>,
  on: boolean,
  deps: unknown[],
): void {
  useLayoutEffect(() => {
    const host = root.current;
    const grid = host?.querySelector<HTMLElement>(".overview-grid");
    if (!on || !grid) return undefined;
    const wide = window.matchMedia("(min-width: 900px)");
    let pinned = 0;
    const cells = () => Array.from(grid.children) as HTMLElement[];
    const unpin = () => {
      pinned = 0;
      grid.style.removeProperty("height");
    };
    const clear = () => {
      if (pinned) cancelAnimationFrame(pinned);
      unpin();
      grid.removeAttribute("data-g-masonry");
      for (const c of cells()) c.style.removeProperty("grid-row-end");
    };
    /** `observed`: called from the ResizeObserver, see there. */
    const layout = (observed = false) => {
      // below 900 px the media query's change event (before the observers in a frame) already cleared: nothing changes here
      if (!wide.matches) return clear();
      grid.setAttribute("data-g-masonry", "");
      const cs = getComputedStyle(grid);
      const gap = parseFloat(cs.getPropertyValue("--g-mas-gap")) || 0;
      // all reads first, then all writes: one layout, not one per cell
      // offsetHeight = layout height: the entrance animation's transform must not count
      const measured = cells().map(
        (c) => [c, `span ${masonrySpan(c.offsetHeight, gap)}`] as const,
      );
      const changed = measured.filter(([c, v]) => c.style.gridRowEnd !== v);
      if (!changed.length) return;
      if (observed && !pinned) {
        // New spans change the grid's height and so its ancestors'. Inside a ResizeObserver callback that would end in a
        // "ResizeObserver loop" error for other observers on an ancestor (GlasRuntime on .app-content), so the grid keeps
        // its current height until the next frame (the cards may overflow it meanwhile, nothing below them moves).
        grid.style.height = cs.height;
        pinned = requestAnimationFrame(unpin);
      }
      for (const [c, v] of changed) c.style.gridRowEnd = v;
    };
    // Only the cells (a column change resizes their widths, so it arrives here too; a span never changes a cell's own
    // size, align-self: start). Applied inside the callback, before paint: no frame where a grown card covers the next.
    const ro = new ResizeObserver(() => layout(true));
    const watch = () => {
      ro.disconnect();
      for (const c of cells()) ro.observe(c);
    };
    const mo = new MutationObserver(() => {
      watch();
      layout();
    });
    mo.observe(grid, { childList: true });
    watch();
    const onWide = () => layout();
    wide.addEventListener("change", onWide);
    layout();
    return () => {
      ro.disconnect();
      mo.disconnect();
      wide.removeEventListener("change", onWide);
      clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, ...deps]);
}
