/**
 * [fork] Glas frame (stage 2) — the floating tab bar's own layers (GLAS-DESIGN §7.1, plan docs/glas/PLAN-ETAPPE-2.md
 * §3.1, K20). Rendered as the first child of upstream's `<nav className="app-tabs">`; in Klassisch it renders nothing.
 *
 * - `.g-tabs__glass`: the glass surface. Minimised it shrinks to a 52-px circle (`--g-tab-*` from `tabMinGeometry`).
 * - `.g-tabs__lens`: glides to the shown entry (`useLens`); on a route behind "Mehr" it sits on "Mehr".
 * - `.g-tabs__expand`: the only focusable thing while minimised ("Tab-Leiste einblenden"); afterwards the focus goes to
 *   the shown entry, since the button itself disappears.
 * The upstream entries stay as they are; CSS restyles them. The shown entry carries `data-g-tab-pick` (ink, the symbol
 * that stays in the minimised circle), a newly shown one `data-g-pop` (its symbol pops once, GLAS-DESIGN §6.3).
 */

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useLocation } from 'react-router';
import { ChevronUp } from 'lucide-react';
import { useIsGlas } from './useUiStyle';
import { useShellStore } from './shellStore';
import { useLens } from './useLens';
import { pathIn, tabMinGeometry } from './glasScroll';
import { useT } from '../../i18n/useT';

export interface GlasTabBarProps {
  /** Routes of the entries behind "Mehr"; a path ending in "/" is a prefix (rooms: "/room/"). */
  morePaths: readonly string[];
  moreOpen: boolean;
  moreRef: RefObject<HTMLButtonElement | null>;
}

const MIN_VARS = ['--g-tab-sx', '--g-tab-sy', '--g-tab-rx', '--g-tab-dx'] as const;

export function GlasTabBar(props: GlasTabBarProps) {
  return useIsGlas() ? <GlasTabBarOn {...props} /> : null;
}

function GlasTabBarOn({ morePaths, moreOpen, moreRef }: GlasTabBarProps) {
  const t = useT();
  const { pathname } = useLocation();
  const tabsMin = useShellStore((s) => s.tabsMin);
  const setTabsMin = useShellStore((s) => s.setTabsMin);
  const glassRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const inMore = pathIn(pathname, morePaths);

  /** The entry the lens and the minimised circle show: the active entry, else "Mehr" for a route behind it. */
  const pick = useCallback(
    (nav: HTMLElement): HTMLElement | null => {
      const more = moreRef.current;
      const active = [...nav.querySelectorAll<HTMLElement>(':scope > .app-tabs__item--active')].filter((el) => el !== more);
      // an open rooms menu marks "Räume" active as well: the route's own entry wins
      return active.find((el) => el.getAttribute('aria-expanded') !== 'true') ?? active[0] ?? (inMore && more ? more : null);
    },
    [moreRef, inMore],
  );

  /** After every lens change: mark the shown entry, pop a new one, and the geometry of the minimised circle. */
  const onChange = useCallback((el: HTMLElement | null, nav: HTMLElement) => {
    const prev = nav.querySelector<HTMLElement>(':scope > [data-g-tab-pick]');
    if (prev !== el) {
      prev?.removeAttribute('data-g-tab-pick');
      el?.setAttribute('data-g-tab-pick', '');
      nav.querySelectorAll(':scope > [data-g-pop]').forEach((p) => p.removeAttribute('data-g-pop'));
      if (prev && el) el.setAttribute('data-g-pop', ''); // not on the first paint
    }
    const g = tabMinGeometry(nav.clientWidth, el ? el.offsetLeft + el.offsetWidth / 2 : 26);
    nav.style.setProperty('--g-tab-sx', String(g.sx));
    nav.style.setProperty('--g-tab-sy', String(g.sy));
    nav.style.setProperty('--g-tab-rx', `${g.rx}px`);
    nav.style.setProperty('--g-tab-dx', `${g.dx}px`);
    nav.toggleAttribute('data-g-tab-empty', !el);
  }, []);

  // the nav is upstream's element; the glass layer is its first child
  useLayoutEffect(() => {
    navRef.current = glassRef.current?.parentElement ?? null;
  });

  useLens(navRef, { pick, onChange, enabled: true });

  // back to Klassisch: nothing of ours stays on upstream's elements
  useLayoutEffect(() => {
    const nav = navRef.current;
    return () => {
      if (!nav) return;
      MIN_VARS.forEach((v) => nav.style.removeProperty(v));
      nav.removeAttribute('data-g-tab-empty');
      nav.querySelectorAll('[data-g-tab-pick], [data-g-pop]').forEach((el) => {
        el.removeAttribute('data-g-tab-pick');
        el.removeAttribute('data-g-pop');
      });
    };
  }, []);

  // The More menu takes the focus on its first entry when it opens (like the rooms menu, K42).
  useEffect(() => {
    if (!moreOpen) return undefined;
    const id = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('.app-more-menu--open [role="menuitem"]')?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [moreOpen]);

  const expand = () => {
    setTabsMin(false); // removes data-tabs-min at once (store subscription in GlasRuntime) → entries focusable again
    const nav = navRef.current;
    (nav && pick(nav))?.focus();
  };

  return (
    <>
      <div ref={glassRef} className="g-tabs__glass" aria-hidden="true" />
      <div className="g-tabs__lens" aria-hidden="true" />
      {tabsMin && (
        <button type="button" className="g-tabs__expand" aria-label={t('glas.tabs.expand')} onClick={expand}>
          <ChevronUp className="g-tabs__expand-icon" size={24} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
