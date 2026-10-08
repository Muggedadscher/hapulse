/**
 * [fork] Glas gestures (stage 3b) — a list row that swipes to the left and reveals one action (plan
 * docs/glas/PLAN-ETAPPE-3.md K59, GLAS-DESIGN §7.24): dismiss a notification, turn a light off, close a garage door,
 * lock a lock. Never unlock or open, and pulling through never runs the action: the row rests open and the action
 * runs on a tap.
 *
 * Wraps exactly one row element and adds to that element: the pointer handlers, the movement and the action as its
 * last child. The row keeps its place among its siblings, so the list's separators and order stay as they are. The
 * action sits still under the row's right end (it counters the row's movement) and shows only where the row has
 * moved away (`clip-path`), so rows on glass need no opaque fill. It is pointer-only (`aria-hidden`, not focusable):
 * every action has a visible twin in the row (×, switch, "Lock", "Close") for keyboards and screen readers.
 *
 * One row is open at a time. A tap on the open row, a press anywhere else and scrolling close it. In Klassisch the
 * row comes back untouched.
 */

import {
  Children,
  cloneElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useIsGlas } from '../../app/glas/useUiStyle';
import { allDone, play, reducedMotion, spring } from './sheet/sheetMotion';
import { swipeAxis, swipeReveal, swipeRest, swipeSpec, type SwipeSpec } from './swipeMath';

export type SwipeTone = 'del' | 'ok' | 'neutral';

interface RowProps {
  children?: ReactNode;
  ref?: React.Ref<HTMLElement>;
  onPointerDown?: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLElement>) => void;
  onLostPointerCapture?: (e: React.PointerEvent<HTMLElement>) => void;
  onClickCapture?: (e: React.MouseEvent<HTMLElement>) => void;
}

export interface SwipeRowProps {
  /** The row: one element (a `div` or `li`), not a component. */
  children: ReactElement<RowProps>;
  /** Text of the action. */
  label: string;
  /** Colour of the action: `actDel` red, `actOk` green, `actNeutral` grey. */
  tone: SwipeTone;
  /** Width of the action on the phone (§7.24); the desktop uses 96 for every list. */
  width: number;
  onAction: () => void;
  /** No action right now (light already off, lock busy …): the row does not swipe and an open row closes. */
  disabled?: boolean | undefined;
}

const DESKTOP = '(min-width: 900px)';
const SETTLE_MS = 350;
/** The click that ends a swipe is swallowed when it comes this soon after letting go (event time, like K51). */
const CLICK_GUARD_MS = 500;
/** Controls whose own drag must win (none in the lists of stage 3b; kept for later rows). */
const OWN_DRAG = 'input[type="range"], [role="slider"], textarea';

/** The open row; opening another one closes it. */
let openRow: { close: () => void } | null = null;

interface Drag {
  id: number;
  x: number;
  y: number;
  /** The reveal when the pointer went down. */
  from: number;
  axis: 'x' | 'y' | null;
  spec: SwipeSpec;
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as React.MutableRefObject<T | null>).current = value;
}

export function SwipeRow({ children, label, tone, width, onAction, disabled = false }: SwipeRowProps) {
  const glas = useIsGlas();
  const rowRef = useRef<HTMLElement | null>(null);
  const actRef = useRef<HTMLDivElement | null>(null);
  /** How far the row has moved to the left now, and where it rests (0 = closed). */
  const reveal = useRef(0);
  const rest = useRef(0);
  const spec = useRef<SwipeSpec>(swipeSpec(width, false));
  const drag = useRef<Drag | null>(null);
  const guardUntil = useRef(-Infinity);
  const anims = useRef<(Animation | null)[]>([]);
  /** Removes the listeners of the open row. */
  const unlisten = useRef<(() => void) | null>(null);
  const me = useRef<{ close: () => void }>({ close: () => {} });
  /** The action is in the document while the row is away from its place. */
  const [shown, setShown] = useState(false);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  const paint = useCallback((r: number) => {
    const row = rowRef.current;
    const act = actRef.current;
    if (row) row.style.transform = r > 0 ? `translateX(${-r}px)` : '';
    if (act) {
      act.style.setProperty('--g-swipe-w', `${spec.current.width}px`);
      act.style.transform = `translateX(${r}px)`;
      act.style.clipPath = `inset(0 0 0 calc(100% - ${r}px))`;
    }
  }, []);

  const stopAnims = useCallback(() => {
    for (const a of anims.current) a?.cancel();
    anims.current = [];
  }, []);

  /** The reveal on screen, also in the middle of a settle animation. */
  const current = useCallback((): number => {
    const row = rowRef.current;
    if (!row || anims.current.length === 0) return reveal.current;
    const t = getComputedStyle(row).transform;
    return t && t !== 'none' ? Math.max(0, -new DOMMatrixReadOnly(t).e) : 0;
  }, []);

  const settle = useCallback(
    (to: number) => {
      const from = current();
      stopAnims();
      reveal.current = to;
      rest.current = to;
      rowRef.current?.setAttribute('data-g-swipe-state', to > 0 ? 'open' : 'closed');
      paint(to);
      if (to > 0) {
        if (openRow && openRow !== me.current) openRow.close();
        openRow = me.current;
        if (!unlisten.current) {
          // a press anywhere else and any scrolling close the open row
          const onDown = (e: PointerEvent) => {
            if (!(e.target instanceof Node) || !rowRef.current?.contains(e.target)) me.current.close();
          };
          const onScroll = () => me.current.close();
          document.addEventListener('pointerdown', onDown, { capture: true, passive: true });
          document.addEventListener('scroll', onScroll, { capture: true, passive: true });
          unlisten.current = () => {
            document.removeEventListener('pointerdown', onDown, { capture: true });
            document.removeEventListener('scroll', onScroll, { capture: true });
          };
        }
      } else {
        if (openRow === me.current) openRow = null;
        unlisten.current?.();
        unlisten.current = null;
      }
      const row = rowRef.current;
      const act = actRef.current;
      const done = () => {
        if (rest.current === 0 && !drag.current) setShown(false);
      };
      if (!row || !act || Math.abs(from - to) < 0.5 || reducedMotion()) {
        done();
        return;
      }
      const opts: KeyframeAnimationOptions = { duration: SETTLE_MS, easing: spring('snappy') };
      anims.current = [
        play(row, [{ transform: `translateX(${-from}px)` }, { transform: `translateX(${-to}px)` }], opts),
        play(
          act,
          [
            { transform: `translateX(${from}px)`, clipPath: `inset(0 0 0 calc(100% - ${from}px))` },
            { transform: `translateX(${to}px)`, clipPath: `inset(0 0 0 calc(100% - ${to}px))` },
          ],
          opts,
        ),
      ];
      const mine = anims.current;
      void allDone(mine).then(() => {
        if (anims.current !== mine) return;
        anims.current = [];
        done();
      });
    },
    [current, paint, stopAnims],
  );

  me.current.close = () => {
    if (rest.current > 0 || reveal.current > 0) settle(0);
  };

  // An action that is not possible any more (the light went off, the lock moves) closes the row.
  useEffect(() => {
    if (disabled && !drag.current && (rest.current > 0 || reveal.current > 0)) settle(0);
  }, [disabled, settle]);

  // Glas → Klassisch, unmount: nothing stays behind.
  useEffect(() => {
    if (glas) return;
    stopAnims();
    drag.current = null;
    reveal.current = 0;
    rest.current = 0;
    unlisten.current?.();
    unlisten.current = null;
    if (openRow === me.current) openRow = null;
    setShown(false);
  }, [glas, stopAnims]);

  useEffect(
    () => () => {
      for (const a of anims.current) a?.cancel();
      unlisten.current?.();
      unlisten.current = null;
      if (openRow === me.current) openRow = null;
    },
    [],
  );

  // The action mounts at the start of a swipe: it takes the current position right away.
  useLayoutEffect(() => {
    if (shown) paint(reveal.current);
  }, [shown, paint]);

  const own = children.props;
  const ownRef = own.ref;
  const setRow = useCallback(
    (el: HTMLElement | null) => {
      rowRef.current = el;
      setRef(ownRef, el);
    },
    [ownRef],
  );

  if (!glas) return children;

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    own.onPointerDown?.(e);
    const row = rowRef.current;
    // events of portaled children (a lock's confirmation) bubble through the React tree, not through the row
    if (!row || !(e.target instanceof Node) || !row.contains(e.target)) return;
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (disabled && rest.current === 0) return;
    if (e.target instanceof Element && e.target.closest(OWN_DRAG)) return;
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      from: current(),
      axis: null,
      spec: swipeSpec(width, window.matchMedia(DESKTOP).matches),
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    own.onPointerMove?.(e);
    const d = drag.current;
    const row = rowRef.current;
    if (!d || e.pointerId !== d.id || !row) return;
    const dx = e.clientX - d.x;
    if (d.axis === null) {
      d.axis = swipeAxis(dx, e.clientY - d.y);
      if (d.axis === 'y') {
        drag.current = null;
        return;
      }
      if (d.axis === null) return;
      // the swipe starts: it takes over from a settling movement, and the other open row closes
      d.from = current();
      stopAnims();
      if (openRow && openRow !== me.current) openRow.close();
      spec.current = d.spec;
      try {
        row.setPointerCapture(e.pointerId);
      } catch {
        // the pointer is gone already; the move still applies
      }
      row.setAttribute('data-g-swipe-state', 'moving');
      window.getSelection()?.removeAllRanges();
      setShown(true);
    }
    reveal.current = swipeReveal(d.from, dx, d.spec);
    paint(reveal.current);
  };

  const end = (e: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (d.axis !== 'x') return; // a tap: the click decides
    guardUntil.current = e.timeStamp + CLICK_GUARD_MS;
    settle(disabled ? 0 : swipeRest(cancelled ? d.from : reveal.current, d.spec));
  };

  const onClickCapture = (e: React.MouseEvent<HTMLElement>) => {
    const row = rowRef.current;
    const onAction = e.target instanceof Node && actRef.current?.contains(e.target);
    if (row && !onAction && e.target instanceof Node && row.contains(e.target)) {
      // Neither the click that ends a swipe (a mouse's; it leaves the row where the swipe left it) nor a tap on the open
      // row (it closes the row) reaches the row's own control. Clicks from the keyboard (detail 0) always do: the twin
      // control has to work.
      const pointer = e.detail > 0;
      if (pointer && (e.timeStamp <= guardUntil.current || rest.current > 0)) {
        const ending = e.timeStamp <= guardUntil.current;
        guardUntil.current = -Infinity;
        e.preventDefault();
        e.stopPropagation();
        if (!ending) settle(0);
        return;
      }
      if (rest.current > 0) settle(0);
    }
    own.onClickCapture?.(e);
  };

  const runAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    settle(0);
    onActionRef.current();
  };

  return cloneElement(
    children,
    {
      ref: setRow,
      'data-g-swipe': '',
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
        own.onPointerUp?.(e);
        end(e, false);
      },
      onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
        own.onPointerCancel?.(e);
        end(e, true);
      },
      onLostPointerCapture: (e: React.PointerEvent<HTMLElement>) => {
        own.onLostPointerCapture?.(e);
        // only the row's own capture: a touch starts captured to the pressed child, which loses it to the row
        if (e.target === rowRef.current) end(e, true);
      },
      onClickCapture,
    } as Partial<RowProps>,
    // keyed, so that the action coming and going never remounts the row's own children
    ...Children.toArray(own.children),
    shown ? (
      <div
        key="g-swipe-act"
        ref={actRef}
        className={`g-swipe-act g-swipe-act--${tone}`}
        aria-hidden="true"
        onClick={runAction}
      >
        <span className="g-swipe-act__label">{label}</span>
      </div>
    ) : null,
  );
}
