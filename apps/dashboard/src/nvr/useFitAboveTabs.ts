/**
 * [fork] Phones: the shared CameraPage sizes its body for Sentinel's own page (100dvh − its 64-px tab bar − its
 * 120-px header). HAPulse puts the summary chips above the page as well, so that body reached under the tab bar
 * (in-app Safari 393×659: "Create clip" and the date chip behind it; Home-Screen app 393×852: 26 px).
 *
 * This hook measures the real room instead: from the body's top down to the tab bar, minus the gap `.app-main`
 * keeps above the bar (its bottom padding beyond the bar's own height, safe area included). The result goes to
 * `--nvr-cam-h` on the page together with the class `nvr-page--fit`; nvr.css applies it below 900 px. Without a
 * visible tab bar (desktop) nothing is set and the package's own sizes stay.
 */

import { useLayoutEffect } from 'react';

const FIT_CLASS = 'nvr-page--fit';

/** `page` = the `.nvr-page` element (a callback ref's state, so a page that mounts later is still seen). */
export function useFitAboveTabs(page: HTMLElement | null) {
  useLayoutEffect(() => {
    if (!page) return;
    let raf = 0;
    const clear = () => {
      page.classList.remove(FIT_CLASS);
      page.style.removeProperty('--nvr-cam-h');
    };
    const fit = () => {
      raf = 0;
      const body = page.querySelector<HTMLElement>('.nvr-cam__body');
      const tabs = document.querySelector<HTMLElement>('.app-tabs');
      const main = page.closest<HTMLElement>('.app-main');
      const bar = tabs?.getBoundingClientRect();
      if (!body || !main || !bar || bar.height <= 0) return clear();
      const gap = Math.max(0, parseFloat(getComputedStyle(main).paddingBottom) - bar.height);
      // document coordinates: the bar is fixed (its viewport top), the body scrolls with the page
      const top = body.getBoundingClientRect().top + window.scrollY;
      const h = Math.floor(bar.top - gap - top);
      if (h <= 0) return clear();
      const v = `${h}px`;
      if (page.style.getPropertyValue('--nvr-cam-h') !== v) page.style.setProperty('--nvr-cam-h', v);
      page.classList.add(FIT_CLASS);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(fit); };
    fit();
    // what moves the body or the bar: the page itself (header, body mounting), the column above it (summary chips
    // loading, the connection banner), the bar, the viewport (rotation, Safari's toolbar)
    const ro = new ResizeObserver(schedule);
    ro.observe(page);
    const content = page.closest('.app-content');
    if (content) ro.observe(content);
    const tabs = document.querySelector('.app-tabs');
    if (tabs) ro.observe(tabs);
    window.addEventListener('resize', schedule);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', schedule);
      if (raf) cancelAnimationFrame(raf);
      clear();
    };
  }, [page]);
}
