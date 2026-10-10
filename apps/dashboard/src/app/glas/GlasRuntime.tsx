/**
 * [fork] Glas frame (stage 2) — runtime of the frame (plan docs/glas/PLAN-ETAPPE-2.md §2.1). Mounted once in
 * AppLayout as a child of `.app-layout`. In Klassisch it renders nothing and listens to nothing; switching back to
 * Klassisch removes everything it wrote.
 *
 * - Scroll (phone): `--g-y` (how far the large title has run under the avatar band) and `--g-edge` (opacity of the
 *   scroll edge) on `.app-main` and `.g-edge` (K22); `data-tabs-min` on the root while the tab bar is minimised.
 *   Desktop: `data-g-scrolled` on the root once the page has scrolled more than 8 px.
 * - The scroll edge `.g-edge` with the small title (phone, K21); none on the camera page.
 * - "Fertig" on the phone, on every route while editing (K24); on the desktop the header capsule shows it.
 * - Arrow keys, Home and End in the upstream rooms and More menus (K42).
 * - Sheen: where a glass surface is pressed (`--gx`/`--gy`).
 * - Windows (stage 3): the pressed control as the origin a window grows out of, and the one Esc listener of all
 *   windows (plan docs/glas/PLAN-ETAPPE-3.md §3.3, K72).
 * - Gestures (stage 3b): the context menu of the entity cards (K58); a route change closes the inspector (K60).
 * - Camera page (stage 6, E13): `data-g-immersive` on the root while the page says it is shown (glasUiStore
 *   `immersive`, plan docs/glas/PLAN-ETAPPE-6.md K104) — shell.css takes the frame away on the phone — and the
 *   browser colour of the dark page (K103).
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useIsGlas } from './useUiStyle';
import { useShellStore } from './shellStore';
import {
  DESKTOP_EDGE_FROM,
  TABS_MIN_INITIAL,
  edgeOpacity,
  edgeTitle,
  hasEdge,
  navEntryFor,
  nextTabsMin,
  roomIdOf,
  titleY,
  type TabsMinState,
} from './glasScroll';
import { nextMenuIndex } from './menuKeys';
import { ContextMenu } from '../../components/glas/ContextMenu';
import { DoneCapsule } from '../../components/glas/DoneCapsule';
import { forgetOrigin, noteOrigin, peekOrigin } from '../../components/glas/sheet/origin';
import { hasInspector, installEscape } from '../../components/glas/sheet/sheetHost';
import { useRooms } from '../../ha/hooks';
import { useUIStore } from '../../stores/uiStore';
import { useGlasUiStore } from '../../stores/glasUiStore';
import { setImmersiveThemeColor } from '../../theme/glasAppearance';
import { useT, type TKey } from '../../i18n/useT';

export interface GlasNavItem {
  to?: string | undefined;
  exact?: boolean | undefined;
  labelKey: TKey;
}

const DESKTOP = '(min-width: 900px)';
/** Upstream menus whose items get arrow keys (K42). */
const UPSTREAM_MENUS = '.rooms-menu--open, .app-more-menu--open';
/** Glass controls that show the sheen where they are pressed: what is pressed → the glass surface that shines
 * (`null` = the pressed element itself). The sidebar is a panel, not a control: no sheen. */
const SHEEN: readonly (readonly [press: string, glass: string | null])[] = [
  ['.app-tabs', '.g-tabs__glass'],
  ['.g-avatar__btn', '.g-avatar__glass'],
  ['.g-back', null],
  ['.header-cluster .notifications-wrap', null],
  ['.g-edit-capsule', null],
];
const MENU_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

export function GlasRuntime({ nav }: { nav: readonly GlasNavItem[] }) {
  return useIsGlas() ? <GlasRuntimeOn nav={nav} /> : null;
}

/** Position of `el` in the document from the offset chain — transforms (entry animation, title scale) do not count. */
function docTop(el: HTMLElement): number {
  let y = 0;
  let cur: HTMLElement | null = el;
  while (cur) {
    y += cur.offsetTop;
    const parent: Element | null = cur.offsetParent;
    if (!(parent instanceof HTMLElement)) break;
    y += parent.clientTop;
    cur = parent;
  }
  return y;
}

function setVar(el: HTMLElement | null, name: string, value: string): void {
  if (el && el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
}

function setFlag(el: HTMLElement, name: string, on: boolean): void {
  if (on !== el.hasAttribute(name)) {
    if (on) el.setAttribute(name, '');
    else el.removeAttribute(name);
  }
}

function GlasRuntimeOn({ nav }: { nav: readonly GlasNavItem[] }) {
  const t = useT();
  const { pathname } = useLocation();
  const rooms = useRooms();
  const editMode = useUIStore((s) => s.editMode);
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP).matches);
  const [h1, setH1] = useState<string | null>(null);
  const edgeRef = useRef<HTMLDivElement>(null);
  /** Top of the large title in the document (null = page without h1) and the band it runs under (px). */
  const titleRef = useRef<{ top: number | null; band: number }>({ top: null, band: 60 });
  const tabsRef = useRef<TabsMinState>(TABS_MIN_INITIAL);
  /** Re-runs the scroll evaluation in the next frame (set by the scroll effect). */
  const scheduleRef = useRef<() => void>(() => {});

  // Breakpoint
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const onChange = () => setDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Scroll: one passive listener, evaluated in requestAnimationFrame, writes only on change.
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;

    const update = () => {
      raf = 0;
      const scroller = document.scrollingElement ?? root;
      const y = scroller.scrollTop;
      const main = document.querySelector<HTMLElement>('.app-main');
      const edge = edgeRef.current;
      if (desktop) {
        setFlag(root, 'data-g-scrolled', y > DESKTOP_EDGE_FROM);
        return;
      }
      const gy = String(titleY(y, titleRef.current.top, titleRef.current.band));
      const ge = String(edgeOpacity(y));
      setVar(main, '--g-y', gy);
      setVar(edge, '--g-y', gy);
      setVar(main, '--g-edge', ge);
      setVar(edge, '--g-edge', ge);

      const prev = tabsRef.current;
      let next = nextTabsMin(prev, y, scroller.scrollHeight - window.innerHeight);
      // a keyboard user in the tab bar keeps it expanded
      const focused = document.activeElement;
      if (next.min && !prev.min && focused?.closest('.app-tabs') && focused.matches(':focus-visible')) next = prev;
      tabsRef.current = next;
      if (next.min !== prev.min) useShellStore.getState().setTabsMin(next.min);
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    scheduleRef.current = schedule;
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      scheduleRef.current = () => {};
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      root.removeAttribute('data-g-scrolled');
      // the edge comes and goes with the route: clean the one that is there now
      for (const el of document.querySelectorAll<HTMLElement>('.app-main, .g-edge')) {
        el?.style.removeProperty('--g-y');
        el?.style.removeProperty('--g-edge');
      }
      tabsRef.current = TABS_MIN_INITIAL;
      useShellStore.getState().setTabsMin(false);
    };
  }, [desktop]);

  // The tab bar's state on the root; the "expand" button resets it from outside → new anchor at the current position.
  useEffect(() => {
    const root = document.documentElement;
    const apply = (min: boolean) => {
      setFlag(root, 'data-tabs-min', min);
      if (min !== tabsRef.current.min) tabsRef.current = { min, anchor: window.scrollY };
    };
    apply(useShellStore.getState().tabsMin);
    const unsub = useShellStore.subscribe((s, prev) => {
      if (s.tabsMin !== prev.tabsMin) apply(s.tabsMin);
    });
    return () => {
      unsub();
      root.removeAttribute('data-tabs-min');
    };
  }, []);

  // Title position: on every route, when the content or the band changes size (lazy page, banner, fonts, rotation).
  useLayoutEffect(() => {
    const measure = () => {
      const content = document.querySelector<HTMLElement>('.app-content');
      const band = content ? parseFloat(getComputedStyle(content).paddingTop) || 0 : 0;
      const title = document.querySelector<HTMLElement>('main h1');
      titleRef.current = { top: title ? docTop(title) : null, band };
      setH1(title?.textContent?.trim() || null);
      scheduleRef.current();
    };
    // a new page starts expanded (ScrollToTop jumps to 0; if the page already was at the top no scroll event comes)
    tabsRef.current = { min: false, anchor: window.scrollY };
    useShellStore.getState().setTabsMin(false);
    measure();
    const ro = new ResizeObserver(measure);
    const main = document.querySelector('.app-main');
    const content = document.querySelector('.app-content');
    if (main) ro.observe(main);
    if (content) ro.observe(content, { box: 'border-box' });
    return () => ro.disconnect();
  }, [pathname]);

  // The camera page (E13, K104): its own flag on the root before the first paint, so its frame never shows.
  const immersive = useGlasUiStore((s) => s.immersive);
  useLayoutEffect(() => {
    setFlag(document.documentElement, 'data-g-immersive', immersive);
    setImmersiveThemeColor(immersive);
  }, [immersive]);
  useEffect(() => () => {
    document.documentElement.removeAttribute('data-g-immersive');
    setImmersiveThemeColor(false);
  }, []);

  // The inspector belongs to the page beside it: another route closes it (K60). Modal windows stay as in Klassisch.
  const routeRef = useRef(pathname);
  useEffect(() => {
    if (routeRef.current === pathname) return;
    routeRef.current = pathname;
    if (hasInspector()) useUIStore.getState().closeEntityDetail();
  }, [pathname]);

  // Arrow keys, Home and End in the upstream menus (K42); from an open menu's trigger, down/up go to the first/last item.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!MENU_KEYS.has(e.key) || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return;
      const inMenu = active.getAttribute('role') === 'menuitem' ? active.closest<HTMLElement>(UPSTREAM_MENUS) : null;
      const fromTrigger = !inMenu && (e.key === 'ArrowDown' || e.key === 'ArrowUp')
        && active.getAttribute('aria-haspopup') === 'menu' && active.getAttribute('aria-expanded') === 'true';
      const menu = inMenu ?? (fromTrigger ? document.querySelector<HTMLElement>(UPSTREAM_MENUS) : null);
      if (!menu) return;
      const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
      const next = nextMenuIndex(e.key, inMenu ? items.indexOf(active) : -1, items.length);
      if (next === null) return;
      e.preventDefault();
      items[next]!.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Sheen from the touch point. Capture phase: the upstream menus stop pointerdown on their way up.
  useEffect(() => {
    const touched = new Set<HTMLElement>();
    const onDown = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      let el: HTMLElement | null = null;
      for (const [press, glass] of SHEEN) {
        const host = target?.closest<HTMLElement>(press);
        if (host) {
          el = glass ? host.querySelector<HTMLElement>(glass) : host;
          break;
        }
      }
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--gx', `${Math.round(e.clientX - r.left)}px`);
      el.style.setProperty('--gy', `${Math.round(e.clientY - r.top)}px`);
      // surfaces that come and go with the route (avatar, back, edit capsule) are not kept after they left the page
      for (const old of touched) if (!old.isConnected) touched.delete(old);
      touched.add(el);
    };
    document.addEventListener('pointerdown', onDown, { capture: true, passive: true });
    return () => {
      document.removeEventListener('pointerdown', onDown, { capture: true });
      for (const el of touched) {
        el.style.removeProperty('--gx');
        el.style.removeProperty('--gy');
      }
    };
  }, []);

  // Windows: the Esc listener before later ones (the package's camera page listens too), and the origin of every press
  // and every Enter/Space. Capture phase: the upstream menus stop events on their way up. A window opens in the task of
  // its click (React commits a click's update before the task ends), so the origin is forgotten one task after the
  // click: a window that opens later from an effect or a reply does not grow out of an unrelated button.
  useLayoutEffect(() => {
    installEscape();
    const onDown = (e: PointerEvent) => noteOrigin(e.target);
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) noteOrigin(e.target);
    };
    const timers = new Set<number>();
    const onClick = () => {
      const o = peekOrigin();
      if (!o) return;
      const id = window.setTimeout(() => {
        timers.delete(id);
        forgetOrigin(o);
      }, 0);
      timers.add(id);
    };
    document.addEventListener('pointerdown', onDown, { capture: true, passive: true });
    document.addEventListener('keydown', onKey, { capture: true });
    document.addEventListener('click', onClick, { capture: true, passive: true });
    return () => {
      document.removeEventListener('pointerdown', onDown, { capture: true });
      document.removeEventListener('keydown', onKey, { capture: true });
      document.removeEventListener('click', onClick, { capture: true });
      for (const id of timers) window.clearTimeout(id);
    };
  }, []);

  const showEdge = hasEdge(pathname);
  const entry = navEntryFor(pathname, nav);
  const roomId = roomIdOf(pathname);
  const title = edgeTitle({
    pathname,
    navLabel: entry ? t(entry.labelKey) : null,
    roomName: roomId ? (rooms.find((r) => r.id === roomId)?.name ?? null) : null,
    h1,
  });

  return (
    <>
      {showEdge && (
        <div ref={edgeRef} className="g-edge" aria-hidden="true">
          {!desktop && title && <span className="g-edge__title">{title}</span>}
        </div>
      )}
      {editMode && !desktop && <DoneCapsule />}
      <ContextMenu />
    </>
  );
}
