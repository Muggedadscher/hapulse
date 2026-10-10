/**
 * [fork] Glas — the mechanics of a menu behind a button: the avatar menu (plan docs/glas/PLAN-ETAPPE-2.md §3.3) and a
 * page head's "⋯" menu (docs/glas/PLAN-ETAPPE-7.md N2). Phases closed → open → closing (the menu stays mounted for
 * its closing animation, a fallback unmounts it when `animationend` never comes). Opening focuses the first item (the
 * last after ArrowUp on the button); arrows, Home and End move the focus (menuKeys); Escape and Tab close the menu and
 * give the focus back to the button; a press outside the menu and the button, or a new route, closes it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnimationEvent as ReactAnimationEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useLocation } from 'react-router';
import { nextMenuIndex } from './menuKeys';

/** Longest closing animation (280 ms, reduced 200 ms) plus a margin, in case `animationend` never comes. */
const CLOSE_FALLBACK_MS = 400;
const FOCUSABLE = '[role="menuitem"], a[href], button:not([disabled])';

export type GlasMenuPhase = 'closed' | 'open' | 'closing';

export function useGlasMenu() {
  const { pathname } = useLocation();
  const [phase, setPhase] = useState<GlasMenuPhase>('closed');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /** Which item gets the focus once the menu is open: first or last. */
  const focusEnd = useRef<'first' | 'last'>('first');
  const open = phase === 'open';

  const items = () => [...(menuRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];

  const close = useCallback((focusButton: boolean) => {
    setPhase((p) => (p === 'open' ? 'closing' : p));
    if (focusButton) buttonRef.current?.focus();
  }, []);

  /** Closes at once, without the closing animation (the button changed under the menu); the focus goes back to the
   *  button when it was in the menu. */
  const dismiss = useCallback(() => {
    if (menuRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
    setPhase('closed');
  }, []);

  // closing: unmount after the animation (or the fallback)
  useEffect(() => {
    if (phase !== 'closing') return undefined;
    const id = window.setTimeout(() => setPhase('closed'), CLOSE_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  // open: focus the first (or last) item
  useEffect(() => {
    if (!open) return;
    const list = items();
    (focusEnd.current === 'last' ? list[list.length - 1] : list[0])?.focus();
  }, [open]);

  // a new route closes the menu
  useEffect(() => {
    setPhase((p) => (p === 'open' ? 'closing' : p));
  }, [pathname]);

  // a press outside (also on a dim layer)
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, close]);

  const toggle = useCallback(() => {
    focusEnd.current = 'first';
    setPhase((p) => (p === 'open' ? 'closing' : 'open'));
  }, []);

  /** On the button: ArrowDown opens on the first item, ArrowUp on the last. */
  const onButtonKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    focusEnd.current = e.key === 'ArrowUp' ? 'last' : 'first';
    if (open) {
      const list = items();
      (e.key === 'ArrowUp' ? list[list.length - 1] : list[0])?.focus();
    } else {
      setPhase('open');
    }
  };

  const onMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      close(true);
      return;
    }
    const list = items();
    const next = nextMenuIndex(e.key, list.indexOf(document.activeElement as HTMLElement), list.length);
    if (next === null) return;
    e.preventDefault();
    list[next]!.focus();
  };

  /** On the menu element: its own closing animation ended. */
  const onMenuAnimationEnd = (e: ReactAnimationEvent<HTMLDivElement>) => {
    if (phase === 'closing' && e.target === e.currentTarget) setPhase('closed');
  };

  return { phase, open, buttonRef, menuRef, toggle, close, dismiss, onButtonKeyDown, onMenuKeyDown, onMenuAnimationEnd };
}
