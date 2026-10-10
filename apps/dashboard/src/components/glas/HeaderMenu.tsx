/**
 * [fork] Glas — a page head's "⋯" menu (plan docs/glas/PLAN-ETAPPE-7.md N2): the head's further actions behind one
 * button, as iOS puts a bar's extra actions behind "ellipsis.circle". Phone: a glass circle 40 (hit area 44) fixed
 * next to the avatar; the menu hangs under it over the avatar menu's dim layer. From 900 px: a filled circle 44 in the
 * head row (K32); the menu a glass popover under it, no dim layer. The menu's right edge meets the circle's (UIKit
 * anchors a bar button's menu at its edge nearer the screen's), at least 16 from the viewport's edges, and it grows
 * out of the circle. An item: its text, its symbol on the right; with `href` a link that opens a new tab. Keys, focus
 * and closing as the avatar menu (useGlasMenu); the menu follows its button when the page scrolls (from 900 px the
 * button scrolls with the head row) or the window changes size. A single item is no menu: the circle shows its symbol
 * and is that action. Looks: the circle in styles/glas/shell.css, the menu in menus.css.
 */

import { useCallback, useEffect, useLayoutEffect, useSyncExternalStore } from 'react';
import type { ReactNode, RefObject } from 'react';
import ReactDOM from 'react-dom';
import { Ellipsis } from 'lucide-react';
import { useGlasMenu } from '../../app/glas/useGlasMenu';

const DESKTOP = '(min-width: 900px)';
/** Between the circle and the menu (the avatar menu's gap). */
const GAP = 8;
/** The menu keeps this far from the viewport's edges. */
const EDGE = 16;

export interface HeaderMenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  /** a link: opens in a new tab */
  href?: string | undefined;
  onSelect?: (() => void) | undefined;
}

interface HeaderMenuProps {
  /** the button's and the menu's name ("Weitere Aktionen") */
  label: string;
  items: HeaderMenuItem[];
  /** the ⋯ button, for a window an item opens to give the focus back to (Modal `returnFocus`) */
  buttonRef?: RefObject<HTMLButtonElement | null> | undefined;
}

const subscribeDesktop = (onChange: () => void) => {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const isDesktop = () => window.matchMedia(DESKTOP).matches;

export function HeaderMenu({ label, items, buttonRef: outerRef }: HeaderMenuProps) {
  const menu = useGlasMenu();
  const { phase, open, close, dismiss, buttonRef, menuRef } = menu;
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop);

  const setButton = useCallback(
    (el: HTMLButtonElement | null) => {
      buttonRef.current = el;
      if (outerRef) outerRef.current = el;
    },
    [buttonRef, outerRef],
  );

  // where the menu hangs: under the circle, its right edge on the circle's
  const place = useCallback(() => {
    const btn = buttonRef.current;
    const panel = menuRef.current;
    if (!btn || !panel) return;
    const circle = btn.querySelector<HTMLElement>('.g-hmenu__glass') ?? btn;
    const r = circle.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const top = Math.round(r.bottom + GAP);
    const right = Math.max(EDGE, Math.round(vw - r.right));
    panel.style.top = `${top}px`;
    panel.style.right = `${right}px`;
    // it grows out of the circle's centre
    panel.style.transformOrigin = `calc(100% - ${Math.round(vw - right - r.right + r.width / 2)}px) ${-Math.round(GAP + r.height / 2)}px`;
    const content = panel.firstElementChild as HTMLElement | null;
    if (content) content.style.maxHeight = `calc(100dvh - ${top + EDGE}px - env(safe-area-inset-bottom, 0px))`;
  }, [buttonRef, menuRef]);

  // before the first paint of the open menu
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  // a change between phone and desktop (an iPad turned) changes the button: the menu goes at once
  useEffect(() => {
    dismiss();
  }, [desktop, dismiss]);

  // the menu follows its button (once per frame)
  useEffect(() => {
    if (!open) return undefined;
    let raf = 0;
    const follow = () => {
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          place();
        });
      }
    };
    window.addEventListener('scroll', follow, { capture: true, passive: true });
    window.addEventListener('resize', follow);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', follow, { capture: true });
      window.removeEventListener('resize', follow);
    };
  }, [open, place]);

  // The focus goes back to the button first: after a link the page continues there, and a window an item opens takes
  // it back there when it closes (the item is gone by then).
  const choose = (item: HeaderMenuItem) => {
    close(true);
    item.onSelect?.();
  };

  // One action needs no menu: the circle is that action (UIKit puts a single action in the bar, a menu only for more).
  if (items.length === 1) {
    const item = items[0]!;
    const face = desktop ? item.icon : <span className="g-hmenu__glass" aria-hidden="true">{item.icon}</span>;
    return (
      <div className="g-hmenu">
        {item.href ? (
          <a className="g-hmenu__btn" href={item.href} target="_blank" rel="noreferrer noopener" aria-label={item.label}
            title={desktop ? item.label : undefined}>
            {face}
          </a>
        ) : (
          <button ref={setButton} type="button" className="g-hmenu__btn" aria-label={item.label} title={desktop ? item.label : undefined}
            onClick={item.onSelect}>
            {face}
          </button>
        )}
      </div>
    );
  }

  const closing = phase === 'closing';
  const body = (item: HeaderMenuItem) => (
    <>
      <span className="g-hmenu__text">{item.label}</span>
      <span className="g-hmenu__icon" aria-hidden="true">
        {item.icon}
      </span>
    </>
  );

  return (
    <div className="g-hmenu">
      <button
        ref={setButton}
        type="button"
        className="g-hmenu__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={desktop ? label : undefined}
        onClick={menu.toggle}
        onKeyDown={menu.onButtonKeyDown}
      >
        {desktop ? (
          <Ellipsis size={20} strokeWidth={2} aria-hidden="true" />
        ) : (
          <span className="g-hmenu__glass" aria-hidden="true">
            <Ellipsis size={20} strokeWidth={2} />
          </span>
        )}
      </button>

      {phase !== 'closed' &&
        ReactDOM.createPortal(
          <>
            {!desktop && <div className={`g-hmenu__dim${closing ? ' g-hmenu__dim--closing' : ''}`} aria-hidden="true" />}
            <div
              ref={menuRef}
              className={`g-hmenu__menu${closing ? ' g-hmenu__menu--closing' : ''}`}
              role="menu"
              aria-label={label}
              onKeyDown={menu.onMenuKeyDown}
              onAnimationEnd={menu.onMenuAnimationEnd}
            >
              <div className="g-hmenu__content">
                {items.map((item) =>
                  item.href ? (
                    <a
                      key={item.key}
                      role="menuitem"
                      className="g-hmenu__item"
                      href={item.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={() => choose(item)}
                    >
                      {body(item)}
                    </a>
                  ) : (
                    <button key={item.key} type="button" role="menuitem" className="g-hmenu__item" onClick={() => choose(item)}>
                      {body(item)}
                    </button>
                  ),
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
