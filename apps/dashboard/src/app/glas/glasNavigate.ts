/**
 * [fork] Glas page changes as view transitions (plan docs/glas/PLAN-ETAPPE-7.md K107, docs/GLAS-DESIGN.md §6.3).
 *
 * Who calls it: the tab bar, the sidebar and the More menu (`glasLinkClick` on upstream's NavLinks in AppLayout), the
 * camera tiles and events (`glasOpenCamera`: `nav.openCamera` in nvr/ui.tsx, the Glas Home card) and the camera page's
 * back (`glasCameraBack`). In Glas, where the browser has `document.startViewTransition`, the old page fades out and the
 * new one in (160 ms) while the new page's sections rise 6 px; a camera tile's picture grows into the camera page's
 * still (540 ms), and back the picture shrinks into its tile on the page the camera was opened from (480 ms, K107
 * addendum). Klassisch and every other navigation (status pill, rooms menu, back in a room, the browser's back/forward
 * and Safari's swipe) navigate as before; browsers without the API navigate without a transition (in Glas the camera
 * page's back still leads to where the camera was opened). Reduced motion: a 200-ms fade, no rise, no morph (§6.4).
 *
 * Nothing on the frame carries a name: the root's fade keeps equal pixels in place, so tab bar, sidebar and header stay
 * calm, and a named frame would become a backdrop root and lose its glass. The update callback navigates and waits for
 * the new route's commit (GlasRuntime reports it from a layout effect; the page's chunk was requested on the press),
 * then scrolls like ScrollToTop (to the top, or back to where the page was) and evaluates GlasRuntime's scroll state at
 * once — requestAnimationFrame does not run while the transition waits. 300 ms at most; after that the transition
 * shows what is there.
 * Looks: styles/glas/motion.css.
 */

import type { MouseEvent } from 'react';
import { peekOrigin } from '../../components/glas/sheet/origin';
import { preloadRoute } from './routeChunks';

export type GlasTransition = 'page' | 'camera' | 'back' | 'fade';
/** What a navigation asks for: a page change, a camera opening from its tile, or back from a camera into its tile. */
export type GlasWant = 'page' | 'camera' | 'back';
/** React Router's navigate as these helpers use it. */
export type GlasNavigateFn = (to: string, options?: { state?: unknown }) => unknown;

/** Longest wait inside the update callback: for the new page and for the camera page's still. */
export const VT_CAP_MS = 300;
/** The name the camera tile's picture and the camera page's still share for the morph. */
export const CAMERA_NAME = 'g-cam';
/** The camera page's still once it shows a picture (the package's freeze canvas; `data-src` = where it came from). */
export const CAMERA_STILL = '.nvr-stage__freeze[data-src]';
/** The layers of the camera page's picture, bottom to top: video, MJPEG image, still (the package's stage). */
export const STAGE_LAYERS = '.nvr-stage > .nvr-stage__video';
/** The box that holds a camera tile's picture (the package's tiles from 0.19.2, in Glas also the Home card's since
 *  @sentinel-nvr/web 0.21.0); a tile carries its camera's id as `data-nvr-camera`. */
export const TILE_PICTURE = '.nvr-camtile__pic';
/** The fade of a tile's name, state and shades once the picture has landed in it (motion.css, `data-g-landing`). */
const LAND_FADE_MS = 200;
/** The longest entrance a part of a page plays when it appears (sections rising, energy bars growing in, ~1 s). */
const ENTRANCE_MAX_MS = 1500;
/** How much of a tile's picture must be in sight, across and down, for back to land in it; less, and the picture
 *  would fly under the window's edge or the tab bar — it closes where it is instead. */
const LAND_SHOWN = 0.5;
/** The location state key a navigation keeps the new page's scroll position under (Router.tsx's ScrollToTop). */
export const KEEP_SCROLL = 'glasScrollY';

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
  want: GlasWant,
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

/** The scroll position a navigation asks the new page to keep (`state.glasScrollY`), else null: the top. Only for the
 *  navigation that asked: the browser's back/forward and a reload (`action` POP) reach that history entry again and go
 *  on as on every other page (ScrollToTop, the browser's own scroll restoration). */
export function keptScrollY(state: unknown, action?: string): number | null {
  if (action === 'POP') return null;
  const y = state && typeof state === 'object' ? (state as Record<string, unknown>)[KEEP_SCROLL] : undefined;
  return typeof y === 'number' && Number.isFinite(y) && y >= 0 ? y : null;
}

/** Where a camera page was opened from: the router location (path and query) and how far that page was scrolled. */
export interface CameraWayIn {
  camera: string;
  from: string;
  y: number;
}

/**
 * Where the camera page's back leads: to the page the camera on screen (`here`) was opened from, at the same scroll
 * position; without that way in (a link, a reload, another camera since) to `fallback` at the top.
 */
export function cameraBackTarget(way: CameraWayIn | null, here: string | null, fallback: string): { to: string; y: number } {
  if (way && here && samePath(way.camera, here) && !samePath(way.from, here)) return { to: way.from, y: way.y };
  return { to: fallback, y: 0 };
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
/** The route on screen as GlasRuntime last committed it (router path and query; null outside Glas). */
let here: string | null = null;
/** How the camera page on screen was opened (glasOpenCamera); spent when another page is committed. */
let wayIn: CameraWayIn | null = null;
/** The camera page a back is leaving, until the next route is committed: a second tap on back meanwhile is no second
 *  navigation. */
let leaving: string | null = null;

/** GlasRuntime, from a layout effect: the route with this pathname (and query) is committed. */
export function noteRouteCommit(pathname: string, search = ''): void {
  here = pathname + search;
  leaving = null;
  if (wayIn && !samePath(wayIn.camera, pathname)) wayIn = null;
  const w = waiter;
  if (w && samePath(w.path, pathname)) {
    waiter = null;
    w.done();
  }
}

/** GlasRuntime goes (Klassisch): no route on screen, no way in. */
export function forgetRoute(): void {
  here = null;
  wayIn = null;
  leaving = null;
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

function loaded(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0;
}

/** A camera tile's picture when it shows one: its picture box (with the camera's last picture or a loaded image), on
 *  older tiles the image; no morph from or into a placeholder or an image still loading. */
function pictureOf(tile: Element): HTMLElement | null {
  const box = tile.querySelector<HTMLElement>(TILE_PICTURE);
  if (box) return box.querySelector('canvas') || [...box.querySelectorAll('img')].some(loaded) ? box : null;
  const img = tile.querySelector('img');
  return img && loaded(img) ? img : null;
}

/** The picture of the pressed camera tile, when it shows one. */
function tilePicture(): { el: HTMLElement; radius: number } | null {
  const tile = peekOrigin()?.el;
  const pic = tile ? pictureOf(tile) : null;
  if (!tile || !pic || pic.getClientRects().length === 0) return null;
  return { el: pic, radius: Math.max(radiusOf(pic), radiusOf(tile)) };
}

/** The camera page's picture as it is on screen: the top shown layer of the stage (a still that is going counts as
 *  gone). The stage itself is not named: its control capsule is glass. */
function stagePicture(): { el: HTMLElement; radius: number } | null {
  const layers = [...document.querySelectorAll<HTMLElement>(STAGE_LAYERS)].filter(
    (el) => !el.classList.contains('hidden') && !el.classList.contains('nvr-stage__freeze--fade') && el.getClientRects().length > 0,
  );
  const el = layers[layers.length - 1];
  return el ? { el, radius: Math.max(radiusOf(el), radiusOf(el.closest('.nvr-stage'))) } : null;
}

/** Brings `el` into view inside a row that scrolls sideways (the Home card's cameras), as Photos scrolls to the photo
 *  it closes into: the row starts at the tile when the tile is not wholly in it. */
function revealInRow(el: HTMLElement): void {
  for (let row = el.parentElement; row && row !== document.body; row = row.parentElement) {
    const cs = getComputedStyle(row);
    if ((cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') || row.scrollWidth <= row.clientWidth) continue;
    const r = el.getBoundingClientRect();
    const box = row.getBoundingClientRect();
    const pad = parseFloat(cs.scrollPaddingInlineStart) || 0;
    if (r.left < box.left + pad - 1 || r.right > box.right + 1) {
      row.scrollTo({ left: row.scrollLeft + r.left - box.left - pad, behavior: 'instant' });
    }
    return;
  }
}

/** The part of `el` in sight, across and down (0–1): inside the window and above the tab bar (phone). */
function inSight(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return { x: 0, y: 0 };
  const bar = document.querySelector('.app-tabs')?.getBoundingClientRect();
  const bottom = bar && bar.height > 0 ? Math.min(window.innerHeight, bar.top) : window.innerHeight;
  return {
    x: Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0)) / r.width,
    y: Math.max(0, Math.min(r.bottom, bottom) - Math.max(r.top, 0)) / r.height,
  };
}

/** Where the camera's picture lands on the new page: the picture box of its first tile that shows a picture in sight
 *  (`LAND_SHOWN`); a row that scrolls sideways is moved to the tile first, but only for a tile in sight up and down. */
function landing(camId: string): { tile: HTMLElement; el: HTMLElement; radius: number } | null {
  for (const tile of document.querySelectorAll<HTMLElement>(`[data-nvr-camera="${CSS.escape(camId)}"]`)) {
    const pic = pictureOf(tile);
    if (!pic || inSight(pic).y < LAND_SHOWN) continue;
    revealInRow(tile);
    const seen = inSight(pic);
    if (seen.x * seen.y >= LAND_SHOWN) return { tile, el: pic, radius: Math.max(radiusOf(pic), radiusOf(tile)) };
  }
  return null;
}

/** Options of a transition. */
export interface GlasNavigateOptions {
  /** 'back': the camera whose picture shrinks into its tile on the new page. */
  camId?: string | undefined;
  /** Where the new page is scrolled (default: the top); also kept in the location state for ScrollToTop. */
  scrollY?: number | undefined;
}

/** Back from a camera: the page is there as it was left — what its parts play when they appear (the sections' rise,
 *  energy bars growing in, a pill rising) is at its end at once. Endless animations (a pulsing dot) and long ones keep
 *  running. */
function finishEntrances(): void {
  const main = document.querySelector('.app-main');
  if (!main) return;
  for (const a of document.getAnimations()) {
    const target = a.effect instanceof KeyframeEffect ? a.effect.target : null;
    const end = a.effect?.getComputedTiming().endTime;
    if (!target || !main.contains(target) || typeof end !== 'number' || end > ENTRANCE_MAX_MS) continue;
    try {
      a.finish();
    } catch {
      // a paused one (playback rate 0) cannot finish: it stays as it is, the landing goes on
    }
  }
}

/** The tile's name, state and shades fade in once the picture is in it, then the tile is as before. */
function landed(tile: HTMLElement): void {
  tile.setAttribute('data-g-landing', 'in');
  window.setTimeout(() => {
    if (tile.getAttribute('data-g-landing') === 'in') tile.removeAttribute('data-g-landing');
  }, LAND_FADE_MS + 60);
}

/**
 * Navigates to `to` as a Glas view transition of the kind `want`. Returns false and does nothing when no transition
 * applies (Klassisch, no API), so the link's own handling or a plain `navigate` takes over.
 */
export function glasNavigate(navigate: GlasNavigateFn, to: string, want: GlasWant, opts: GlasNavigateOptions = {}): boolean {
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
  const keep = opts.scrollY;
  const named: HTMLElement[] = [];
  const name = (el: HTMLElement) => {
    el.style.setProperty('view-transition-name', CAMERA_NAME);
    named.push(el);
  };
  const unname = () => {
    for (const el of named.splice(0)) el.style.removeProperty('view-transition-name');
  };
  // the picture that moves: the pressed tile's (camera) or the camera page's (back)
  const pic = kind === 'camera' ? tilePicture() : kind === 'back' && opts.camId ? stagePicture() : null;
  if (pic) {
    name(pic.el);
    root.style.setProperty('--g-vt-r0', `${pic.radius}px`);
    // back, until a tile to land in is found: the picture closes where it is (no corners to round, motion.css)
    if (kind === 'back') {
      root.style.setProperty('--g-vt-r1', `${pic.radius}px`);
      root.style.setProperty('--g-vt-d', '0s');
    }
  }
  let land: HTMLElement | null = null;
  const token = {};
  current = token;
  root.setAttribute('data-g-vt', kind);

  const vt = start.call(document, async () => {
    const deadline = performance.now() + VT_CAP_MS;
    // the old picture is taken: it lets go of the name before the new page's picture takes it
    unname();
    const committed = waitForCommit(path, deadline);
    void (keep == null ? navigate(to) : navigate(to, { state: { [KEEP_SCROLL]: keep } }));
    if (!(await committed)) return;
    // instant: the app scrolls smoothly (global.css), a smooth reset would still be at the old page's place when the
    // scroll state is flushed next and the new page would glide after the fade
    window.scrollTo({ top: keep ?? 0, left: 0, behavior: 'instant' });
    scrollFlush?.();
    // the new page: a page change's sections rise 6 px, back from a camera finds the page as it was
    if (kind === 'page') document.querySelector('.app-main > .stagger-rise')?.setAttribute('data-g-entry', '');
    if (kind === 'back') finishEntrances();
    if (pic && kind === 'camera') {
      const still = await waitForStill(deadline);
      if (still) {
        name(still);
        root.style.setProperty('--g-vt-r1', `${Math.max(radiusOf(still), radiusOf(still.closest('.nvr-stage')))}px`);
      }
    }
    if (pic && kind === 'back' && opts.camId) {
      const at = landing(opts.camId);
      if (at) {
        name(at.el);
        land = at.tile;
        land.setAttribute('data-g-landing', '');
        root.style.setProperty('--g-vt-r1', `${at.radius}px`);
        root.style.removeProperty('--g-vt-d');
      }
    }
  });
  const end = () => {
    unname();
    if (land) landed(land);
    land = null;
    if (current !== token) return;
    current = null;
    root.removeAttribute('data-g-vt');
    root.style.removeProperty('--g-vt-r0');
    root.style.removeProperty('--g-vt-r1');
    root.style.removeProperty('--g-vt-d');
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

/** Opens a camera page — from its tile with `morph` (in Glas its picture grows into the page), from an event plainly —
 *  and remembers the way in for the page's back. */
export function glasOpenCamera(navigate: GlasNavigateFn, to: string, morph: boolean): void {
  wayIn = here && !samePath(here, to) ? { camera: to, from: here, y: window.scrollY } : null;
  if (morph) glasGo(navigate, to, 'camera');
  else void navigate(to);
}

/** The camera page's back in Glas: to the page the camera was opened from (cameraBackTarget), at the same place, the
 *  picture shrinking into its tile there. */
export function glasCameraBack(navigate: GlasNavigateFn, camId: string, fallback: string): void {
  if (leaving != null && leaving === here) return;
  const { to, y } = cameraBackTarget(wayIn, here, fallback);
  leaving = here;
  if (!glasNavigate(navigate, to, 'back', { camId, scrollY: y })) void navigate(to, { state: { [KEEP_SCROLL]: y } });
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
