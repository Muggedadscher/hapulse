/**
 * [fork] Glas frame (stage 2) — pure scroll maths: how far the large title has run under the scroll edge, the edge's
 * opacity, when the phone tab bar minimises, the minimised bar's geometry and the edge's small title.
 * Values: docs/GLAS-DESIGN.md §3.5, §6.3, §7.1; plan docs/glas/PLAN-ETAPPE-2.md §2.2 (K21, K22).
 */

/** Largest `--g-y` the CSS needs: title gone at 40, scale done at 48, small title fully in at 52. */
export const TITLE_Y_MAX = 64;
const TITLE_Y_STEP = 4;

/**
 * `--g-y`: px the large title has run under the band at the top (avatar band 60, with banner 120), 0–64 in 4-px steps.
 * `titleTop` = the title's top edge in the document; without a title (`null`) it follows `scrollY`.
 */
export function titleY(scrollY: number, titleTop: number | null, band: number): number {
  const raw = titleTop === null ? scrollY : scrollY - (titleTop - band);
  const clamped = Math.min(TITLE_Y_MAX, Math.max(0, raw));
  return Math.round(clamped / TITLE_Y_STEP) * TITLE_Y_STEP;
}

/** `--g-edge`: opacity of the phone's scroll edge, `scrollY / 40` in tenths (0…1). */
export function edgeOpacity(scrollY: number): number {
  return Math.round(Math.min(1, Math.max(0, scrollY / 40)) * 10) / 10;
}

/** Desktop: the edge fades in (.25 s) once the page has scrolled more than this. */
export const DESKTOP_EDGE_FROM = 8;

export interface TabsMinState {
  min: boolean;
  /** Turning point: the lowest scroll position while expanded, the highest while minimised. */
  anchor: number;
}

export const TABS_MIN_INITIAL: TabsMinState = { min: false, anchor: 0 };

const TABS_HYSTERESIS = 24;
const TABS_TOP_ZONE = 40;

/**
 * Phone tab bar: down by more than 24 px from the anchor → minimised; up by more than 24 px, near the top (≤ 40) or at
 * the page end → expanded. Rubber band (y < 0 or y > maxY) changes nothing. The anchor follows the opposite direction,
 * so a long scroll down while minimised needs only 24 px up to expand again (and the other way round).
 */
export function nextTabsMin(state: TabsMinState, y: number, maxY: number): TabsMinState {
  if (y < 0 || y > maxY) return state;
  if (y <= TABS_TOP_ZONE || y >= maxY - 2) {
    return !state.min && state.anchor === y ? state : { min: false, anchor: y };
  }
  if (state.min) {
    if (y < state.anchor - TABS_HYSTERESIS) return { min: false, anchor: y };
    return y > state.anchor ? { min: true, anchor: y } : state;
  }
  if (y > state.anchor + TABS_HYSTERESIS) return { min: true, anchor: y };
  return y < state.anchor ? { min: false, anchor: y } : state;
}

export const TAB_BAR_HEIGHT = 62;
export const TAB_MIN_SIZE = 52;

export interface TabMinGeometry {
  /** scale of the glass (origin bottom left) */
  sx: number;
  sy: number;
  /** horizontal radius before scaling, so the scaled shape is a circle: `rx / 31px` */
  rx: number;
  /** horizontal shift of the active symbol into the circle */
  dx: number;
}

/**
 * The minimised bar: the glass shrinks to a 52-px circle at any width (GLAS-DESIGN §7.1 gives the values for 358 px:
 * `scale(.1453, .8387)`, radius `179px / 31px`). `activeCenter` = the active symbol's centre from the bar's left edge.
 */
export function tabMinGeometry(width: number, activeCenter: number): TabMinGeometry {
  const w = Math.max(TAB_MIN_SIZE, width);
  return { sx: TAB_MIN_SIZE / w, sy: TAB_MIN_SIZE / TAB_BAR_HEIGHT, rx: w / 2, dx: TAB_MIN_SIZE / 2 - activeCenter };
}

export interface NavRoute {
  to?: string | undefined;
  exact?: boolean | undefined;
}

/** The nav entry a path belongs to: exact match for entries marked `exact` ("/"), otherwise the path or below it. */
export function navEntryFor<T extends NavRoute>(pathname: string, nav: readonly T[]): T | undefined {
  return nav.find((item) => {
    if (!item.to) return false;
    if (item.exact) return pathname === item.to;
    return pathname === item.to || pathname.startsWith(item.to + '/');
  });
}

/** Whether `pathname` belongs to one of `paths`: "/" only exactly, a path ending in "/" as a prefix (rooms: "/room/"),
 * any other path itself or below it. */
export function pathIn(pathname: string, paths: readonly string[]): boolean {
  return paths.some((p) => {
    if (p === '/') return pathname === '/';
    if (p.endsWith('/')) return pathname.startsWith(p);
    return pathname === p || pathname.startsWith(p + '/');
  });
}

/** Pages with their own top have no scroll edge at all: the camera page (GLAS-DESIGN §3.5). */
export function hasEdge(pathname: string): boolean {
  return !/^\/nvr\/[^/]+/.test(pathname);
}

export interface EdgeTitleInput {
  pathname: string;
  /** label of the nav entry of the route (`navEntryFor`), if any */
  navLabel: string | null;
  /** name of the room on `/room/:id` */
  roomName: string | null;
  /** text of the first `main h1` */
  h1: string | null;
}

/**
 * Small title in the phone's scroll edge (K21): the room's name on a room page (it has no `h1`), otherwise the label
 * of the route's nav entry (the overview's `h1` is the greeting, the sketch shows "Übersicht"), else the first `h1`.
 */
export function edgeTitle({ pathname, navLabel, roomName, h1 }: EdgeTitleInput): string {
  if (pathname.startsWith('/room/')) return roomName ?? h1 ?? '';
  return navLabel ?? h1 ?? '';
}
