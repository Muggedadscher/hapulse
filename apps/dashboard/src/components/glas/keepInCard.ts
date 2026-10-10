/** How far a popover keeps from its card's edges. */
const INSET = 8;

/**
 * [fork] Glas: a popover that would leave its card (or come closer than 8 px to its edge) opens from the other side —
 * as a ref callback it measures once when the popover mounts, before the first paint, and sets `data-g-flip`; each
 * popover's CSS says what the other side is (music.css: the library's item menu, the queue's group menu). Too wide for
 * either side, it keeps its anchor.
 */
export function keepInCard(el: HTMLElement | null): void {
  if (!el) return;
  const card = el.closest('.card')?.getBoundingClientRect();
  if (!card) return;
  const out = () => {
    const r = el.getBoundingClientRect();
    return r.left < card.left + INSET || r.right > card.right - INSET;
  };
  if (!out()) return;
  el.dataset.gFlip = '';
  if (out()) delete el.dataset.gFlip;
}
