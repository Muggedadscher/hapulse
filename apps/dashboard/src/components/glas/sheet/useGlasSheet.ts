/**
 * [fork] Glas sheets (stage 3) — the runtime of one window (plan docs/glas/PLAN-ETAPPE-3.md §3.1–3.6, K47–K55, K65,
 * K66, K69, K70). `Modal` calls it. In Klassisch it returns `on: false` and touches nothing.
 *
 * In Glas, once per opening and in the layout phase (before the first frame): register the window in the stack,
 * decide the presentation (a page when rendered inside another open window, a sheet below 900 px, a dialog from 900),
 * the detent and the material (attributes on backdrop and panel, read by styles/glas/sheets.css), then play the entry
 * and move the focus in. While open it follows the content and the viewport, handles dragging and the grabber. When
 * the window leaves, its ghost (`ghost.ts`) animates it out and the focus goes back to the trigger.
 */

import { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useIsGlas } from '../../../app/glas/useUiStyle';
import { SheetContext, type SheetParent } from './SheetContext';
import { addWindow, batches, handoff, newWindowId, openModals, removeWindow, topPanel, type HandoffNote } from './sheetHost';
import { spawnGhost, takeGhost } from './ghost';
import { originRect, peekOrigin, takeOrigin, type Origin, type OriginRect } from './origin';
import {
  DIALOG_FROM,
  LARGE_TOP,
  dragFrame,
  hasMediumDetent,
  largeHeight,
  mediumMaxHeight,
  morphFrom,
  originVisible,
  pickDetent,
  pickPresentation,
  releaseVelocity,
  scrimOpacity,
  snapAfterDrag,
  type Detent,
  type Presentation,
  type Sample,
} from './sheetMath';
import {
  REDUCED_MS,
  layoutRect,
  play,
  reducedMotion,
  shownRadius,
  spring,
  translateScale,
  visualRectOn,
} from './sheetMotion';

export interface SheetOptions {
  open: boolean;
  onClose: () => void;
  /** false: the sheet never closes by dragging (alarm keypad, K51). */
  swipeToClose?: boolean | undefined;
  /** A new value while open plays the content swap (K70). */
  contentKey?: string | undefined;
  /** Where the focus goes back when the window closes (K55); default: the trigger. */
  returnFocus?: (() => HTMLElement | null) | undefined;
  panelRef: RefObject<HTMLDivElement | null>;
}

export interface GrabberState {
  detent: Detent;
  /** Only one detent (short viewport): the grabber is decoration. */
  single: boolean;
}

export interface GrabberControl {
  get: () => GrabberState;
  subscribe: (listener: () => void) => () => void;
  /** Click on the grabber (pointer or keyboard): medium ↔ large. */
  toggle: () => void;
}

export interface GlasSheet {
  on: boolean;
  /** `on` for effects that must stay silent in Glas without re-running (Modal's focus effect). */
  onRef: { readonly current: boolean };
  /** Rendered inside another open Glas window: a page with "‹ Zurück", no grabber (K48). */
  page: boolean;
  /** For the window's content (`SheetContext`); null in Klassisch. */
  context: SheetParent | null;
  /** On `.modal-backdrop`; stable per window, undefined in Klassisch (K47). */
  backdropRef: ((el: HTMLDivElement | null) => (() => void) | undefined) | undefined;
  grabber: GrabberControl;
}

interface Drag {
  pointer: number;
  y0: number;
  h0: number;
  moved: boolean;
  samples: Sample[];
}

interface Runtime {
  id: number;
  backdrop: HTMLElement | null;
  parent: SheetParent | null;
  registered: boolean;
  /** Was open in the last commit (any style): an effect re-run is no new opening (StrictMode, style switch). */
  wasOpen: boolean;
  pres: Presentation | null;
  detent: Detent | null;
  hasMedium: boolean;
  /** A hand-over made the sheet large: the start detent does not go back to medium. */
  keepLarge: boolean;
  origin: Origin | null;
  trigger: HTMLElement | null;
  /** Closing by a drag: the ghost leaves from the finger's place. */
  dragged: boolean;
  /** The entry movement; while it runs, start detent and morph target follow the content (K50). */
  opening: Animation | null;
  /** The box a morph ends in (null for entries that need no retargeting). */
  target: OriginRect | null;
  /** A height or detent movement of the runtime: size changes meanwhile are its own. */
  sizing: Animation | null;
  /** Last settled height (medium and dialogs follow their content from there). */
  height: number;
  drag: Drag | null;
  suppressClick: boolean;
  grabber: GrabberState;
  listeners: Set<() => void>;
}

const TAP_SLOP = 4;
const PUSHED = 'data-g-pushed';
const PAGE_SHADOW_REACH = 40;
const DRAG_START = '.g-sheet-grabber, .g-sheet-header';
const DRAG_NOT = 'a, input, select, textarea, label, button:not(.g-sheet-grabber), [role="button"]';

const glasNow = () => document.documentElement.dataset.style === 'glas';
const noop = () => {};

/** Content height the panel would like: its in-flow parts, the body at its full scroll height. */
function naturalHeight(panel: HTMLElement): number {
  let h = 0;
  for (const part of panel.children) {
    if (!(part instanceof HTMLElement)) continue;
    const pos = getComputedStyle(part).position;
    if (pos === 'absolute' || pos === 'fixed') continue;
    h += part.classList.contains('modal-body') ? part.scrollHeight : part.offsetHeight;
  }
  return h;
}

function parts(panel: HTMLElement): HTMLElement[] {
  return [...panel.children].filter(
    (c): c is HTMLElement => c instanceof HTMLElement && !c.classList.contains('g-sheet-grabber'),
  );
}

function setPushed(parent: HTMLElement, on: boolean, animate: boolean): void {
  if (parent.hasAttribute(PUSHED) === on) return;
  if (on) parent.setAttribute(PUSHED, '');
  else parent.removeAttribute(PUSHED);
  if (!animate) return;
  const aside = { transform: 'translateX(-25%)', filter: 'brightness(0.86)' };
  const home = { transform: 'none', filter: 'none' };
  for (const part of parts(parent)) {
    play(part, on ? [home, aside] : [aside, home], { duration: 500, easing: spring('smooth') });
  }
}

function geometry(panel: HTMLElement): Keyframe {
  const cs = getComputedStyle(panel);
  return {
    height: cs.height,
    transform: cs.transform,
    left: cs.left,
    right: cs.right,
    bottom: cs.bottom,
    borderTopLeftRadius: cs.borderTopLeftRadius,
    borderTopRightRadius: cs.borderTopRightRadius,
    borderBottomLeftRadius: cs.borderBottomLeftRadius,
    borderBottomRightRadius: cs.borderBottomRightRadius,
  };
}

export function useGlasSheet(o: SheetOptions): GlasSheet {
  const glas = useIsGlas();
  const parent = useContext(SheetContext);
  const optsRef = useRef(o);
  optsRef.current = o;
  const onRef = useRef(glas);
  onRef.current = glas;
  const [st] = useState<Runtime>(() => ({
    id: newWindowId(),
    backdrop: null,
    parent: null,
    registered: false,
    wasOpen: false,
    pres: null,
    detent: null,
    hasMedium: true,
    keepLarge: false,
    origin: null,
    trigger: null,
    dragged: false,
    opening: null,
    target: null,
    sizing: null,
    height: 0,
    drag: null,
    suppressClick: false,
    grabber: { detent: 'medium', single: false },
    listeners: new Set(),
  }));

  // The trigger is taken before the commit: React's autoFocus (layout phase) would already have moved the focus (K55).
  if (glas && o.open && !st.registered) {
    const active = document.activeElement;
    st.trigger = peekOrigin()?.el ?? (active instanceof HTMLElement && active !== document.body ? active : null);
  }

  const backdropRef = useCallback((el: HTMLDivElement | null) => {
    st.backdrop = el;
    if (!el) return undefined;
    return () => {
      st.backdrop = null;
      spawnGhost(el, {
        id: st.id,
        parentId: st.parent?.id ?? null,
        pres: st.pres ?? 'sheet',
        detent: st.detent,
        origin: st.origin,
        trigger: st.trigger,
        dragged: st.dragged,
      });
    };
  }, [st]);

  const grabber = useMemo<GrabberControl>(() => {
    const control: GrabberControl = {
      get: () => st.grabber,
      subscribe: (listener) => {
        st.listeners.add(listener);
        return () => st.listeners.delete(listener);
      },
      toggle: noop,
    };
    return control;
  }, [st]);

  const context = useMemo<SheetParent>(
    () => ({
      id: st.id,
      depth: parent ? parent.depth + 1 : 0,
      panel: () => optsRef.current.panelRef.current,
      rootPanel: parent ? parent.rootPanel : () => optsRef.current.panelRef.current,
    }),
    [st, parent],
  );

  // ---- one opening ----
  useLayoutEffect(() => {
    const backdrop = st.backdrop;
    const panel = optsRef.current.panelRef.current;
    if (!glas || !o.open || !backdrop || !panel) return;
    const scrim = backdrop.querySelector<HTMLElement>(':scope > .g-sheet-scrim');
    const fresh = !st.wasOpen;

    const setGrabber = (next: GrabberState) => {
      if (next.detent === st.grabber.detent && next.single === st.grabber.single) return;
      st.grabber = next;
      st.listeners.forEach((l) => l());
    };
    const setDetent = (detent: Detent, material: 'auto' | 'glass' = 'auto') => {
      st.detent = detent;
      panel.setAttribute('data-g-sheet', detent);
      panel.setAttribute('data-g-mat', material === 'glass' || detent === 'medium' ? 'glass' : 'solid');
      setGrabber({ detent, single: !st.hasMedium });
    };
    /** Medium if the content fits (K50); measured at the medium width. */
    const startDetent = (): Detent => {
      st.hasMedium = hasMediumDetent(window.innerHeight);
      if (st.keepLarge || !st.hasMedium) return 'large';
      panel.setAttribute('data-g-sheet', 'medium');
      return pickDetent(naturalHeight(panel), window.innerHeight);
    };

    /** A page takes the rectangle of the outermost window and grows upwards when it needs more height (K48). */
    const placePage = () => {
      const root = st.parent?.rootPanel();
      if (!root || !root.isConnected) return;
      const r = layoutRect(root);
      const radius = getComputedStyle(root).borderRadius;
      Object.assign(panel.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: '', borderRadius: radius });
      const natural = naturalHeight(panel);
      const vh = window.innerHeight;
      let y = r.y;
      let h = r.h;
      if (natural > r.h + 0.5) {
        if (window.innerWidth >= DIALOG_FROM) {
          h = Math.min(natural, Math.min(vh - 64, 900));
          y = Math.max(32, r.y + r.h / 2 - h / 2);
        } else {
          const bottom = r.y + r.h;
          h = natural <= mediumMaxHeight(vh) ? natural : bottom - LARGE_TOP;
          y = bottom - h;
        }
      }
      panel.style.top = `${y}px`;
      panel.style.height = `${h}px`;
    };

    /** Attributes for the presentation (sheets.css draws from them). */
    const place = () => {
      backdrop.setAttribute('data-g-pres', st.pres!);
      if (st.pres === 'page') {
        panel.setAttribute('data-g-sheet', 'page');
        panel.setAttribute('data-g-mat', 'solid');
        st.detent = null;
        placePage();
        return;
      }
      if (st.pres === 'dialog') {
        panel.setAttribute('data-g-sheet', 'dialog');
        panel.setAttribute('data-g-mat', 'glass');
        st.detent = null;
        setGrabber({ detent: 'medium', single: true });
        return;
      }
      setDetent(startDetent());
    };

    const track = (a: Animation | null, target: OriginRect | null) => {
      st.opening = a;
      st.target = a ? target : null;
      if (!a) {
        st.height = panel.offsetHeight;
        return;
      }
      a.finished.then(
        () => {
          if (st.opening !== a) return;
          st.opening = null;
          st.target = null;
          st.height = panel.offsetHeight;
        },
        noop,
      );
    };

    const fadeParts = (delay: number, duration: number) => {
      for (const part of parts(panel)) {
        play(part, [{ opacity: 0 }, { opacity: 1 }], { duration, delay, easing: 'ease', fill: 'backwards' });
      }
    };

    /** Grow out of `from` (origin, or the ghost of this window still leaving). */
    const morphIn = (from: OriginRect) => {
      const box = layoutRect(panel);
      const dialog = st.pres === 'dialog';
      const duration = dialog ? 520 : 500;
      const m = morphFrom(from, box);
      track(
        play(
          panel,
          [
            { transform: translateScale(m.x, m.y, m.sx, m.sy), borderRadius: `${m.rx}px / ${m.ry}px` },
            { transform: 'none', borderRadius: getComputedStyle(panel).borderRadius },
          ],
          { duration, easing: spring('smooth') },
        ),
        box,
      );
      if (dialog) play(panel, [{ opacity: 0 }, { opacity: 1, offset: 0.18 }, { opacity: 1 }], { duration, easing: 'linear' });
      fadeParts(dialog ? duration * 0.4 : 120, 240);
    };

    const enter = (note: HandoffNote | null, ghostRect: OriginRect | null) => {
      if (reducedMotion()) {
        track(play(panel, [{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_MS, easing: 'ease' }), null);
        if (scrim && !note && st.pres !== 'page') play(scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_MS, easing: 'ease' });
        return;
      }
      if (st.pres === 'page') {
        const w = panel.offsetWidth;
        const radius = panel.style.borderRadius || '0px';
        const shadow = getComputedStyle(document.documentElement).getPropertyValue('--g-shadow-pushed-screen').trim() || 'none';
        track(
          play(
            panel,
            [
              { transform: `translateX(${w}px)`, clipPath: `inset(0 ${w}px 0 -${PAGE_SHADOW_REACH}px round ${radius})`, boxShadow: shadow },
              { transform: 'none', clipPath: `inset(0 0 0 -${PAGE_SHADOW_REACH}px round ${radius})`, boxShadow: 'none' },
            ],
            { duration: 500, easing: spring('smooth') },
          ),
          null,
        );
        return;
      }
      if (note) {
        // Hand-over (K49): stay where the closing window was; grow from its edges where this one is bigger.
        const box = panel.getBoundingClientRect();
        const old = note.rect;
        const inset = [
          Math.max(0, old.y - box.top),
          Math.max(0, box.right - (old.x + old.w)),
          Math.max(0, box.bottom - (old.y + old.h)),
          Math.max(0, old.x - box.left),
        ];
        const radius = getComputedStyle(panel).borderRadius;
        const grow = inset.some((v) => v > 0.5)
          ? play(
              panel,
              [
                { clipPath: `inset(${inset.map((v) => `${v}px`).join(' ')} round ${radius})` },
                { clipPath: `inset(0px 0px 0px 0px round ${radius})` },
              ],
              { duration: 350, easing: spring('snappy') },
            )
          : null;
        track(grow, null);
        for (const part of parts(panel)) {
          play(part, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], {
            duration: 300,
            easing: spring('smooth'),
          });
        }
        return;
      }
      if (scrim) play(scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease' });
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const origin = st.origin ? originRect(st.origin) : null;
      const from = ghostRect ?? (origin && originVisible(origin, vw, vh) ? origin : null);
      if (from) {
        morphIn(from);
        return;
      }
      if (st.pres === 'dialog') {
        const w = panel.offsetWidth;
        const h = panel.offsetHeight;
        track(
          play(
            panel,
            [
              { transform: `translate(${w * 0.02}px, ${h * 0.02}px) scale(0.96)`, opacity: 0 },
              { transform: 'none', opacity: 1 },
            ],
            { duration: 500, easing: spring('smooth') },
          ),
          null,
        );
        return;
      }
      track(
        play(panel, [{ transform: 'translateY(calc(100% + 16px))' }, { transform: 'none' }], {
          duration: 500,
          easing: spring('smooth'),
        }),
        null,
      );
    };

    /** Detent change (grabber, drag): height, inset and radius `snappy` .35 s; solid only once large (K66). */
    const settle = (next: Detent) => {
      const before = geometry(panel);
      const scrimFrom = scrim ? Number(getComputedStyle(scrim).opacity) : 1;
      panel.style.removeProperty('height');
      panel.style.removeProperty('max-height');
      panel.style.removeProperty('transform');
      scrim?.style.removeProperty('opacity');
      st.sizing?.cancel();
      const reduce = reducedMotion();
      // medium → large stays glass while it moves, large → medium is glass from the start (K66)
      setDetent(next, !reduce && st.detent === 'medium' && next === 'large' ? 'glass' : 'auto');
      if (reduce) {
        st.height = panel.offsetHeight;
        return;
      }
      const a = play(panel, [before, geometry(panel)], { duration: 350, easing: spring('snappy') });
      if (scrim && scrimFrom < 1) play(scrim, [{ opacity: scrimFrom }, { opacity: 1 }], { duration: 350, easing: 'ease' });
      st.sizing = a;
      const done = () => {
        if (st.sizing !== a) return;
        st.sizing = null;
        if (st.registered && st.detent) panel.setAttribute('data-g-mat', st.detent === 'large' ? 'solid' : 'glass');
        st.height = panel.offsetHeight;
      };
      if (a) a.finished.then(done, noop);
      else done();
    };

    /** Medium sheets and dialogs follow their content after the entry (K50): `snappy` from 8 px, never large. */
    const follow = () => {
      const h = panel.offsetHeight;
      const old = st.height;
      st.height = h;
      if (!old || Math.abs(h - old) < 8 || reducedMotion()) return;
      const a = play(panel, [{ height: `${old}px` }, { height: `${h}px` }], { duration: 350, easing: spring('snappy') });
      st.sizing = a;
      a?.finished.then(
        () => {
          if (st.sizing !== a) return;
          st.sizing = null;
          if (st.registered) follow(); // the content may have changed again meanwhile
        },
        noop,
      );
    };

    /** The entry still runs: the start detent and the morph target follow the content (K50). */
    const retarget = () => {
      const a = st.opening;
      const oldBox = st.target;
      // what is on screen right now: the running transform on the box it was computed for
      const shown = a && oldBox ? visualRectOn(panel, oldBox) : null;
      const radius = shown ? shownRadius(panel) : 0;
      if (st.pres === 'sheet' && !st.keepLarge) setDetent(startDetent());
      if (!a || !oldBox || !shown) return;
      const box = panel.getBoundingClientRect();
      if (Math.abs(box.height - oldBox.h) < 0.5 && Math.abs(box.top - oldBox.y) < 0.5) return;
      const timing = a.effect?.getTiming();
      const total = typeof timing?.duration === 'number' ? timing.duration : 500;
      const left = Math.max(200, total - (Number(a.currentTime) || 0));
      a.cancel();
      const next = { x: box.left, y: box.top, w: box.width, h: box.height };
      const m = morphFrom(shown, next, radius);
      track(
        play(
          panel,
          [
            { transform: translateScale(m.x, m.y, m.sx, m.sy), borderRadius: `${m.rx}px / ${m.ry}px` },
            { transform: 'none', borderRadius: getComputedStyle(panel).borderRadius },
          ],
          { duration: left, easing: spring('smooth') },
        ),
        next,
      );
    };

    const onContentResize = () => {
      if (!st.registered || st.drag || st.sizing) return;
      if (st.pres === 'page') {
        placePage();
        return;
      }
      if (st.opening) {
        retarget();
        return;
      }
      if (st.pres === 'dialog' || st.detent === 'medium') follow();
      else st.height = panel.offsetHeight;
    };

    /** The iOS keyboard only shrinks the visual viewport: windows keep their bottom edge above it (sheets.css). */
    const onKeyboard = () => {
      const vv = window.visualViewport;
      const covered = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
      if (covered > 0) backdrop.style.setProperty('--g-kb', `${covered}px`);
      else backdrop.style.removeProperty('--g-kb');
      onViewport();
    };

    const onViewport = () => {
      if (!st.registered || st.drag) return;
      if (st.pres === 'page') {
        placePage();
        return;
      }
      const pres = pickPresentation({ viewportW: window.innerWidth, wantsInspector: false, nested: false, othersOpen: false });
      if (pres !== st.pres) {
        st.pres = pres;
        place();
      } else if (pres === 'sheet') {
        st.hasMedium = hasMediumDetent(window.innerHeight);
        if (!st.hasMedium && st.detent === 'medium') setDetent('large');
        else setGrabber({ detent: st.detent ?? 'medium', single: !st.hasMedium });
      }
      st.height = panel.offsetHeight;
    };

    // ---- dragging (K51): grabber and header, below 900 px, sheets only ----
    const onPointerDown = (e: PointerEvent) => {
      st.suppressClick = false;
      if (st.pres !== 'sheet' || st.drag || !e.isPrimary || e.button !== 0) return;
      const t = e.target instanceof Element ? e.target : null;
      if (!t?.closest(DRAG_START) || t.closest(DRAG_NOT)) return;
      st.drag = { pointer: e.pointerId, y0: e.clientY, h0: panel.offsetHeight, moved: false, samples: [{ t: e.timeStamp, y: e.clientY }] };
    };
    const onPointerMove = (e: PointerEvent) => {
      const d = st.drag;
      if (!d || e.pointerId !== d.pointer || !st.detent) return;
      const dy = e.clientY - d.y0;
      d.samples.push({ t: e.timeStamp, y: e.clientY });
      if (d.samples.length > 24) d.samples.shift();
      if (!d.moved) {
        if (Math.abs(dy) < TAP_SLOP) return;
        d.moved = true;
        try {
          panel.setPointerCapture(e.pointerId);
        } catch {
          // the pointer is already gone
        }
        st.opening?.finish();
        st.sizing?.finish();
        d.h0 = panel.offsetHeight;
      }
      const frame = dragFrame({
        detent: st.detent,
        dy,
        height: d.h0,
        largeH: largeHeight(window.innerHeight),
        hasMedium: st.hasMedium,
        canClose: optsRef.current.swipeToClose !== false,
      });
      if (frame.height !== d.h0) {
        panel.style.height = `${frame.height}px`;
        panel.style.maxHeight = 'none';
      } else {
        panel.style.removeProperty('height');
        panel.style.removeProperty('max-height');
      }
      panel.style.transform = frame.y ? `translateY(${frame.y}px)` : '';
      if (scrim) scrim.style.opacity = String(scrimOpacity(dy));
    };
    const onPointerEnd = (e: PointerEvent) => {
      const d = st.drag;
      if (!d || e.pointerId !== d.pointer) return;
      st.drag = null;
      if (!d.moved || !st.detent) return; // a tap: the grabber's click handles it
      st.suppressClick = true;
      const dy = e.clientY - d.y0;
      const snap =
        e.type === 'pointercancel'
          ? 'stay'
          : snapAfterDrag({
              detent: st.detent,
              dy,
              vy: releaseVelocity(d.samples),
              height: d.h0,
              hasMedium: st.hasMedium,
              canClose: optsRef.current.swipeToClose !== false,
            });
      if (snap === 'close') {
        st.dragged = true;
        optsRef.current.onClose();
        // onClose may refuse (a window that is still working): React has committed a discrete update by then
        queueMicrotask(() => {
          if (!st.registered) return;
          st.dragged = false;
          settle(st.detent ?? 'medium');
        });
        return;
      }
      settle(snap === 'stay' ? st.detent : snap);
    };
    grabber.toggle = () => {
      if (st.suppressClick) {
        st.suppressClick = false;
        return;
      }
      if (!st.registered || st.pres !== 'sheet' || !st.hasMedium || !st.detent) return;
      settle(st.detent === 'large' ? 'medium' : 'large');
    };

    // ---- register (once per opening) and present ----
    st.parent = parent;
    st.registered = true;
    const othersOpen = openModals() > 0;
    addWindow(
      { id: st.id, kind: 'modal', batch: batches.now(), depth: parent ? parent.depth + 1 : 0 },
      {
        backdrop,
        panel,
        close: () => {
          st.dragged = false;
          optsRef.current.onClose();
        },
      },
    );
    st.pres = pickPresentation({ viewportW: window.innerWidth, wantsInspector: false, nested: parent !== null, othersOpen });
    const note = fresh && st.pres !== 'page' ? handoff.take() : null;
    if (note) note.taken = true;
    if (fresh) {
      const pressed = takeOrigin();
      st.origin = note ? note.origin : pressed;
      if (note?.trigger) st.trigger = note.trigger;
      st.keepLarge = note?.detent === 'large';
      st.dragged = false;
    }
    place();
    const parentPanel = st.pres === 'page' ? (st.parent?.panel() ?? null) : null;
    if (parentPanel && !reducedMotion()) setPushed(parentPanel, true, fresh);
    if (fresh) {
      enter(note, st.pres === 'page' ? null : takeGhost(st.id, st.origin?.el ?? null));
      const active = document.activeElement;
      if (!(active && panel.contains(active))) {
        const initial = panel.querySelector<HTMLElement>('[data-autofocus]');
        (initial ?? panel).focus({ preventScroll: true });
      }
    } else {
      st.height = panel.offsetHeight;
    }

    const ro = new ResizeObserver(onContentResize);
    for (const part of parts(panel)) ro.observe(part);
    const root = st.pres === 'page' ? st.parent?.rootPanel() : null;
    if (root) ro.observe(root);
    window.addEventListener('resize', onViewport);
    window.visualViewport?.addEventListener('resize', onKeyboard);
    window.visualViewport?.addEventListener('scroll', onKeyboard);
    panel.addEventListener('pointerdown', onPointerDown);
    panel.addEventListener('pointermove', onPointerMove);
    panel.addEventListener('pointerup', onPointerEnd);
    panel.addEventListener('pointercancel', onPointerEnd);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onViewport);
      window.visualViewport?.removeEventListener('resize', onKeyboard);
      window.visualViewport?.removeEventListener('scroll', onKeyboard);
      panel.removeEventListener('pointerdown', onPointerDown);
      panel.removeEventListener('pointermove', onPointerMove);
      panel.removeEventListener('pointerup', onPointerEnd);
      panel.removeEventListener('pointercancel', onPointerEnd);
      grabber.toggle = noop;
      st.registered = false;
      st.drag = null;
      removeWindow(st.id);
      const trigger = st.trigger;
      const returnFocus = optsRef.current.returnFocus;
      queueMicrotask(() => {
        if (panel.isConnected) {
          // The window stays (StrictMode, Suspense) — or it is Klassisch now: leave it as Klassisch draws it.
          if (!glasNow()) {
            backdrop.removeAttribute('data-g-pres');
            backdrop.style.removeProperty('--g-kb');
            for (const attr of ['data-g-sheet', 'data-g-mat', PUSHED]) panel.removeAttribute(attr);
            for (const prop of ['left', 'top', 'width', 'height', 'max-height', 'transform', 'border-radius']) {
              panel.style.removeProperty(prop);
            }
          }
          return;
        }
        // The window left: the focus goes back to its trigger unless it already went somewhere (K55).
        const active = document.activeElement;
        if (active && active !== document.body) return;
        const target = returnFocus?.() ?? trigger;
        if (target?.isConnected && !target.closest('[inert]')) target.focus({ preventScroll: true });
        else topPanel()?.focus({ preventScroll: true });
      });
      if (parentPanel) {
        // After the ghost decided (it is queued in the same commit, before or after this): the window below gets its
        // content back, moving when the page slides out on its own.
        queueMicrotask(() =>
          queueMicrotask(() => {
            if (panel.isConnected && glasNow()) return;
            const animate = !panel.isConnected && glasNow() && !reducedMotion() && parentPanel.isConnected;
            setPushed(parentPanel, false, animate);
          }),
        );
      }
    };
    // `o.open` and `glas` decide an opening; everything else is read through refs (K48: once per opening).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glas, o.open]);

  // ---- content swap (K70): a new key while open; the window stays ----
  const keyRef = useRef(o.contentKey);
  useLayoutEffect(() => {
    const prev = keyRef.current;
    keyRef.current = o.contentKey;
    const panel = optsRef.current.panelRef.current;
    if (!glas || !o.open || !st.registered || prev === o.contentKey || !panel) return;
    const reduce = reducedMotion();
    for (const part of parts(panel)) {
      play(
        part,
        reduce ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: reduce ? REDUCED_MS : 300, easing: reduce ? 'ease' : spring('smooth') },
      );
    }
  }, [glas, o.open, o.contentKey, st]);

  // Last: remembers whether the window was open in this commit, for the next run of the effects above.
  useLayoutEffect(() => {
    st.wasOpen = o.open;
  });

  return {
    on: glas,
    onRef,
    page: glas && parent !== null,
    context: glas ? context : null,
    backdropRef: glas ? backdropRef : undefined,
    grabber,
  };
}
