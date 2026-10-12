/**
 * [fork] The NVR strips in Glas (cameras and latest events, NvrHomeGlas): from 900 px with a pointer that can hover, a
 * round glass button at each end of a strip that can scroll that way, shown while the pointer is over the strip — as
 * Apple's own strips on the Mac. Touch and trackpads scroll the strip themselves; a mouse wheel cannot scroll
 * sideways. Pointer only (`tabIndex -1`, hidden from screen readers): with the keyboard, focus scrolls each item into
 * view. Looks in styles/glas/nvr.css (`.g-nvr__strip`, `.g-nvr__paddle`).
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NvrStripProps<T extends HTMLElement> {
  className: string;
  /** Changes with the strip's items (their number), so the buttons look again. */
  count: number;
  /** The scrolling element (the strip itself), rendered with the ref. */
  children: (ref: React.RefObject<T | null>) => React.ReactNode;
}

export function NvrStrip<T extends HTMLElement>({ className, count, children }: NvrStripProps<T>) {
  const ref = React.useRef<T | null>(null);
  const [ends, setEnds] = React.useState({ prev: false, next: false });

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const prev = el.scrollLeft > 1;
      const next = el.scrollLeft < max - 1;
      setEnds((o) => (o.prev === prev && o.next === next ? o : { prev, next }));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    // the items' width too (the strip's own size stays when an item grows or shrinks)
    if (ro && el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [count]);

  const go = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
  };

  const paddle = (dir: -1 | 1) => (
    <button
      type="button"
      className="g-nvr__paddle g-glass"
      data-dir={dir < 0 ? 'prev' : 'next'}
      tabIndex={-1}
      aria-hidden="true"
      // a click must not focus a button hidden from screen readers (Chromium focuses it despite tabIndex -1)
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => go(dir)}
    >
      {dir < 0 ? <ChevronLeft size={20} strokeWidth={2.25} /> : <ChevronRight size={20} strokeWidth={2.25} />}
    </button>
  );

  return (
    <div className={`g-nvr__strip ${className}`}>
      {children(ref)}
      {ends.prev && paddle(-1)}
      {ends.next && paddle(1)}
    </div>
  );
}
