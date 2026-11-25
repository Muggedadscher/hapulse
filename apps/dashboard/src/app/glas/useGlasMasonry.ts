// [fork] Glas: the overview's cards keep their own height and close up below each other ("masonry") from 900 px, outside
// edit mode. CSS grid places the cards as before (order, widths, `dense`); this hook only tells each cell how many of the
// grid's small rows (--g-mas-row) it covers, measured from its content. Order and widths as before; placement is sparse
// (home.css), so a card never moves above one that comes before it. Without the hook (Klassisch, edit mode, phone) the
// grid stays the classic one with rows of equal height.
import { useLayoutEffect, type RefObject } from 'react';

const ROW = 4; // px, must match --g-mas-row in styles/glas/home.css

/** Rows of `row` px a cell of height `h` covers, its gap to the next card included; an empty cell (0) takes one row. */
export function masonrySpan(h: number, gap: number, row = ROW): number {
  return h > 0 ? Math.max(1, Math.ceil((h + gap) / row)) : 1;
}

export function useGlasMasonry(root: RefObject<HTMLElement | null>, on: boolean, deps: unknown[]): void {
  useLayoutEffect(() => {
    const host = root.current;
    const grid = host?.querySelector<HTMLElement>('.overview-grid');
    if (!on || !grid) return undefined;
    const wide = window.matchMedia('(min-width: 900px)');
    let frame = 0;
    const cells = () => Array.from(grid.children) as HTMLElement[];
    const clear = () => {
      grid.removeAttribute('data-g-masonry');
      for (const c of cells()) c.style.removeProperty('grid-row-end');
    };
    const layout = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (!wide.matches) return clear();
      grid.setAttribute('data-g-masonry', '');
      const gap = parseFloat(getComputedStyle(grid).getPropertyValue('--g-mas-gap')) || 0;
      // all reads first, then all writes: one layout, not one per cell
      // offsetHeight = layout height: the entrance animation's transform must not count
      const measured = cells().map((c) => [c, `span ${masonrySpan(c.offsetHeight, gap)}`] as const);
      for (const [c, v] of measured) if (c.style.gridRowEnd !== v) c.style.gridRowEnd = v;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(layout);
    };
    // Only the cells (a column change resizes their widths, so it arrives here too; a span never changes a cell's own
    // size, align-self: start). Laid out in the next frame, not inside the callback: new spans change the grid's height
    // and so its ancestors', and other observers on an ancestor (GlasRuntime on .app-content) would then end in a
    // "ResizeObserver loop" error. The first layout and a changed set of cells still apply at once.
    const ro = new ResizeObserver(schedule);
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
    wide.addEventListener('change', layout);
    layout();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      ro.disconnect();
      mo.disconnect();
      wide.removeEventListener('change', layout);
      clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, ...deps]);
}
