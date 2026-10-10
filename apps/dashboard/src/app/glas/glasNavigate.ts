/**
 * [fork] Glas page changes as view transitions (plan docs/glas/PLAN-ETAPPE-7.md K107, docs/GLAS-DESIGN.md §6.3).
 *
 * Who calls it: the tab bar, the sidebar and the More menu (`glasLinkClick` on upstream's NavLinks in AppLayout), the
 * camera tiles (`nav.openCamera` without a moment in nvr/ui.tsx, the Glas Home card) and the camera page's back. In
 * Glas, where the browser has `document.startViewTransition`, the old page fades out and the new one in (160 ms) while
 * the new page's sections rise 6 px; a camera tile's picture grows into the camera page's still (540 ms). Klassisch,
 * browsers without the API and every other navigation (status pill, rooms menu, back in a room, events, the browser's
 * back/forward and Safari's swipe) navigate as before. Reduced motion: a 200-ms fade, no rise, no morph (§6.4).
 *
 * Nothing on the frame carries a name: the root's fade keeps equal pixels in place, so tab bar, sidebar and header stay
 * calm, and a named frame would become a backdrop root and lose its glass. The update callback navigates and waits for
 * the new route's commit (GlasRuntime reports it from a layout effect; the page's chunk was requested on the press),
 * then scrolls to the top like ScrollToTop and evaluates GlasRuntime's scroll state at once — requestAnimationFrame
 * does not run while the transition waits. 300 ms at most; after that the transition shows what is there.
 * Looks: styles/glas/motion.css.
 */

import type { MouseEvent } from 'react';
import { peekOrigin } from '../../components/glas/sheet/origin';
import { preloadRoute } from './routeChunks';

export type GlasTransition = 'page' | 'camera' | 'fade';

/** Longest wait inside the update callback: for the new page and for the camera page's still. */
export const VT_CAP_MS = 300;
/** The name the camera tile's picture and the camera page's still share for the morph. */
export const CAMERA_NAME = 'g-cam';
/** The camera page's still once it shows a picture (the package's freeze canvas; `data-src` = where it came from). */
export const CAMERA_STILL = '.nvr-stage__freeze[data-src]';

/** The fields of a click React Router looks at before it turns a link click into a navigation. */
export interface LinkClick {
  button: number;
  metaKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  defaultPrevented: boolean;
}

/** A link click becomes a Glas transition when React Router would navigate (left button, no modifier key, no other
 *  target, not prevented) and the link leads away from the current address. */
export function takesLinkClick(e: LinkClick, target: string | null, from: string, to: string): boolean {
  return (
    e.button === 0 &&
    !(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) &&
    !e.defaultPrevented &&
    (!target || target === '_self') &&
    !samePath(from, to)
  );
}

/** Which transition a navigation gets: none in Klassisch or without the API, only a fade under reduced motion. */
export function transitionFor(
  want: 'page' | 'camera',
  env: { glas: boolean; supported: boolean; reduced: boolean },
): GlasTransition | null {
  if (!env.glas || !env.supported) return null;
  return env.reduced ? 'fade' : want;
}

/** Paths compare without query and hash and decoded (a camera id is percent-encoded in the link). */
export function samePath(a: string, b: string): boolean {
  return decoded(pathOf(a)) === decoded(pathOf(b));
}

function pathOf(to: string): string {
  return to.split(/[?#]/)[0] ?? to;
}

function decoded(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

interface ViewTransitionLike {
  ready: Promise<unknown>;
  finished: Promise<unknown>;
  updateCallbackDone: Promise<unknown>;
}

type StartViewTransition = (update: () => Promise<void>) => ViewTransitionLike;

let waiter: { path: string; done: () => void } | null = null;
let scrollFlush: (() => void) | null = null;
/** The transition whose look `data-g-vt` shows (a newer one replaces it; the browser skips the older). */
let current: object | null = null;

/** GlasRuntime, from a layout effect: the route with this pathname is committed. */
export function noteRouteCommit(pathname: string): void {
  const w = waiter;
  if (w && samePath(w.path, pathname)) {
    waiter = null;
    w.done();
  }
}

/** GlasRuntime: evaluates its scroll state now instead of in the next frame (null when it goes). */
export function setScrollFlush(fn: (() => void) | null): void {
  scrollFlush = fn;
}

function waitForCommit(path: string, deadline: number): Promise<boolean> {
  return new Promise((resolve) => {
    let timer = 0;
    const w = {
      path,
      done: () => {
        window.clearTimeout(timer);
        resolve(true);
      },
    };
    timer = window.setTimeout(() => {
      if (waiter === w) waiter = null;
      resolve(false);
    }, Math.max(0, deadline - performance.now()));
    waiter = w;
  });
}

function waitForStill(deadline: number): Promise<HTMLElement | null> {
  const find = () => document.querySelector<HTMLElement>(CAMERA_STILL);
  const now = find();
  if (now) return Promise.resolve(now);
  return new Promise((resolve) => {
    let timer = 0;
    const mo = new MutationObserver(() => {
      const el = find();
      if (el) finish(el);
    });
    function finish(el: HTMLElement | null): void {
      mo.disconnect();
      window.clearTimeout(timer);
      resolve(el);
    }
    timer = window.setTimeout(() => finish(null), Math.max(0, deadline - performance.now()));
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-src'] });
  });
}

function radiusOf(el: Element | null): number {
  return el ? parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0 : 0;
}

/** The picture of the pressed camera tile, when it shows one (no morph from a placeholder or an unloaded image). */
function tilePicture(): { img: HTMLImageElement; radius: number } | null {
  const tile = peekOrigin()?.el;
  const img = tile?.querySelector('img');
  if (!tile || !img || !img.complete || !img.naturalWidth || img.getClientRects().length === 0) return null;
  return { img, radius: Math.max(radiusOf(img), radiusOf(tile)) };
}

/**
 * Navigates to `to` as a Glas view transition of the kind `want`. Returns false and does nothing when no transition
 * applies (Klassisch, no API), so the link's own handling or a plain `navigate` takes over.
 */
export function glasNavigate(navigate: (to: string) => unknown, to: string, want: 'page' | 'camera'): boolean {
  const root = document.documentElement;
  const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
  const kind = transitionFor(want, {
    glas: root.getAttribute('data-style') === 'glas',
    supported: typeof start === 'function',
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
  if (!kind || !start) return false;

  const path = pathOf(to);
  void preloadRoute(path);
  const named: HTMLElement[] = [];
  const name = (el: HTMLElement) => {
    el.style.setProperty('view-transition-name', CAMERA_NAME);
    named.push(el);
  };
  const unname = () => {
    for (const el of named.splice(0)) el.style.removeProperty('view-transition-name');
  };
  const tile = kind === 'camera' ? tilePicture() : null;
  if (tile) {
    name(tile.img);
    root.style.setProperty('--g-vt-r0', `${tile.radius}px`);
  }
  const token = {};
  current = token;
  root.setAttribute('data-g-vt', kind);

  const vt = start.call(document, async () => {
    const deadline = performance.now() + VT_CAP_MS;
    // the old picture is taken: the tile lets go of the name before the camera page's still takes it
    unname();
    const committed = waitForCommit(path, deadline);
    void navigate(to);
    if (!(await committed)) return;
    (document.scrollingElement ?? root).scrollTop = 0;
    scrollFlush?.();
    if (kind === 'page') document.querySelector('.app-main > .stagger-rise')?.setAttribute('data-g-entry', '');
    if (tile) {
      const still = await waitForStill(deadline);
      if (still) {
        name(still);
        root.style.setProperty('--g-vt-r1', `${Math.max(radiusOf(still), radiusOf(still.closest('.nvr-stage')))}px`);
      }
    }
  });
  const end = () => {
    unname();
    if (current !== token) return;
    current = null;
    root.removeAttribute('data-g-vt');
    root.style.removeProperty('--g-vt-r0');
    root.style.removeProperty('--g-vt-r1');
  };
  // a skipped transition rejects `ready` — nothing to report, the navigation happened all the same
  vt.ready.catch(() => {});
  vt.updateCallbackDone.catch(() => {});
  vt.finished.then(end, end);
  return true;
}

/** Navigates to `to`; in Glas as the transition `want` (see glasNavigate). */
export function glasGo(navigate: (to: string) => unknown, to: string, want: 'page' | 'camera'): void {
  if (!glasNavigate(navigate, to, want)) void navigate(to);
}

/** onClick of an upstream NavLink (AppLayout): in Glas the page transition instead of the link's own navigation. */
export function glasLinkClick(
  e: MouseEvent<HTMLAnchorElement>,
  navigate: (to: string) => unknown,
  to: string,
  from: string,
): void {
  if (!takesLinkClick(e, e.currentTarget.getAttribute('target'), from, to)) return;
  if (glasNavigate(navigate, to, 'page')) e.preventDefault();
}
