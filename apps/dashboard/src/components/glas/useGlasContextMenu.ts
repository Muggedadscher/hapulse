/**
 * [fork] The Glas context menu on a tile or row (stage 4, docs/glas/PLAN-ETAPPE-4.md K81): scene tiles and the
 * device card get what `EntityCard` does since stage 3b (K58) — a long press (550 ms), a right click or the
 * context-menu key opens the menu, the click that ends a hold is swallowed. The element itself is the card the
 * menu lifts. In Klassisch and in the edit mode it returns no handlers, so nothing changes there.
 */

import React, { useCallback, useRef } from 'react';
import { useIsGlas } from '../../app/glas/useUiStyle';
import { useLongPress } from '../../lib/useLongPress';
import { useGlasUiStore } from '../../stores/glasUiStore';
import { useUIStore } from '../../stores/uiStore';

export type GlasMenuHandlers = Pick<
  React.HTMLAttributes<HTMLElement>,
  | 'onPointerDown'
  | 'onPointerMove'
  | 'onPointerUp'
  | 'onPointerLeave'
  | 'onPointerCancel'
  | 'onPointerDownCapture'
  | 'onClickCapture'
  | 'onContextMenu'
>;

export function useGlasContextMenu(
  ref: React.RefObject<HTMLElement | null>,
  entityId: string,
  name: string,
  onSwitch?: (on: boolean) => void,
): GlasMenuHandlers {
  const editMode = useUIStore((s) => s.editMode);
  const on = useIsGlas() && !editMode;
  const openContextMenu = useGlasUiStore((s) => s.openContextMenu);
  const heldRef = useRef(false);
  const open = useCallback(
    (pressing: boolean) => {
      const el = ref.current;
      if (el) openContextMenu({ entityId, el, card: el, name, pressing, onSwitch });
    },
    [ref, openContextMenu, entityId, name, onSwitch],
  );
  const onHold = useCallback(() => {
    heldRef.current = true;
    open(true);
  }, [open]);
  // the tile is a button itself: a press on it must arm the hold
  const longPress = useLongPress(onHold, { ignoreInteractiveChildren: false });
  const onPointerDownCapture = useCallback(() => {
    heldRef.current = false;
  }, []);
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (!heldRef.current) return;
    heldRef.current = false;
    e.stopPropagation();
    e.preventDefault();
  }, []);
  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      open((e.nativeEvent as PointerEvent).pointerType === 'touch');
    },
    [open],
  );
  if (!on) return {};
  return {
    onPointerDown: longPress.onPointerDown,
    onPointerMove: longPress.onPointerMove,
    onPointerUp: longPress.onPointerUp,
    onPointerLeave: longPress.onPointerLeave,
    onPointerCancel: longPress.onPointerCancel,
    onPointerDownCapture,
    onClickCapture,
    onContextMenu,
  };
}
