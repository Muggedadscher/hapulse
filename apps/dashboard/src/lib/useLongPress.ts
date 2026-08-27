/**
 * useLongPress — press-and-hold detection for mouse, touch and pen.
 *
 * Built on Pointer Events so one implementation covers every input. The hold
 * fires after `holdMs` unless the pointer lifts, leaves, is cancelled, or
 * moves more than `moveTolerance` px — the tolerance is what keeps scrolling
 * and slider drags from being mistaken for a hold.
 *
 * After a hold fires, the click that the browser synthesises on pointer-up is
 * swallowed (capture-phase, stopPropagation + preventDefault) so the card's
 * normal tap action doesn't ALSO run. On touch, the native context menu /
 * text-selection callout is suppressed for the same reason; a mouse
 * right-click keeps its context menu.
 *
 * Spread the returned handlers onto the pressable element:
 *   <div {...longPress}>…</div>
 */

import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  /** Hold duration before firing (default 550ms, matching HA's own cards). */
  holdMs?: number;
  /** Movement in px that cancels the hold (default 10). */
  moveTolerance?: number;
  /** Skip arming when the press starts on an interactive child (default true). */
  ignoreInteractiveChildren?: boolean;
}

/** Elements whose own press behaviour must win over a hold. */
const INTERACTIVE_SELECTOR = 'input, button, select, textarea, a, [role="slider"]';

export function useLongPress(
  onLongPress: () => void,
  { holdMs = 550, moveTolerance = 10, ignoreInteractiveChildren = true }: UseLongPressOptions = {},
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);
  const touchRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    originRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only the primary button/contact arms a hold.
      if (e.button !== 0) return;
      if (
        ignoreInteractiveChildren &&
        e.target instanceof Element &&
        e.target.closest(INTERACTIVE_SELECTOR) != null
      ) {
        return;
      }
      firedRef.current = false;
      touchRef.current = e.pointerType !== 'mouse';
      originRef.current = { x: e.clientX, y: e.clientY };
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        firedRef.current = true;
        onLongPress();
      }, holdMs);
    },
    [onLongPress, holdMs, ignoreInteractiveChildren],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const origin = originRef.current;
      if (origin == null) return;
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;
      if (dx * dx + dy * dy > moveTolerance * moveTolerance) clear();
    },
    [clear, moveTolerance],
  );

  const onPointerUp = useCallback(() => clear(), [clear]);
  const onPointerLeave = useCallback(() => clear(), [clear]);
  const onPointerCancel = useCallback(() => clear(), [clear]);

  /** Capture-phase: swallow the tap that follows a fired hold. */
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (firedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      firedRef.current = false;
    }
  }, []);

  /** Touch long-press must not open the browser context menu. */
  const onContextMenu = useCallback((e: React.MouseEvent) => {
    if (touchRef.current) e.preventDefault();
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onClickCapture,
    onContextMenu,
  };
}
