/**
 * RoomsMenu — popover listing rooms for quick navigation.
 *
 * Desktop: anchored to the RIGHT of the 72px rail, vertically near the trigger button.
 * Mobile:  slides up as a bottom-sheet above the tab bar.
 *
 * Accessibility: button aria-haspopup="menu" / aria-expanded; popover role="menu";
 * rows role="menuitem"; Escape closes + returns focus; first row auto-focused on open.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useRooms, useCustomization } from '../../ha/hooks';
import { RoomDisplayIcon } from '../ui/RoomDisplayIcon';
import { roomIconName } from '@hapulse/core';
import type { Room } from '@hapulse/core';
import { useT } from '../../i18n/useT';
import './RoomsMenu.css';

interface RoomsMenuProps {
  /** Whether the popover is open. */
  open: boolean;
  /** Called to close the popover. */
  onClose: () => void;
  /**
   * Ref to the trigger button — used for focus return on close and for
   * desktop popover positioning (getBoundingClientRect).
   */
  triggerRef: React.RefObject<HTMLElement | null>;
}

/** Mirror of the room-ordering logic used in Home.tsx — no import from pages. */
function applyRoomOrder(rooms: Room[], roomOrder: string[], hiddenRooms: string[]): Room[] {
  const visible = rooms.filter((r) => !hiddenRooms.includes(r.id));

  // Ordered ids come first (by their position in roomOrder)
  const orderedIds = roomOrder.filter((id) => visible.some((r) => r.id === id));
  const rest = visible
    .filter((r) => !orderedIds.includes(r.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const orderedRooms = orderedIds
    .map((id) => visible.find((r) => r.id === id))
    .filter((r): r is Room => r !== undefined);

  return [...orderedRooms, ...rest];
}

export function RoomsMenu({ open, onClose, triggerRef }: RoomsMenuProps) {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const popoverRef = useRef<HTMLDivElement>(null);
  const firstRowRef = useRef<HTMLButtonElement>(null);

  const rooms = useRooms();
  const customization = useCustomization();
  const sortedRooms = applyRoomOrder(rooms, customization.roomOrder, customization.hiddenRooms);

  // Focus first row when open
  useEffect(() => {
    if (open) {
      // Defer one tick so the element is visible before focus
      const id = requestAnimationFrame(() => {
        firstRowRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open]);

  // Close on route change
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Close on Escape and restore focus to trigger
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        triggerRef.current?.focus();
      }
    },
    [onClose, triggerRef],
  );

  // Close on click outside
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    },
    [onClose, triggerRef],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open, handleKeyDown, handlePointerDown]);

  const handleRoomClick = useCallback(
    (id: string) => {
      navigate(`/room/${id}`);
      onClose();
    },
    [navigate, onClose],
  );

  return (
    <div
      ref={popoverRef}
      className={['rooms-menu', open ? 'rooms-menu--open' : ''].filter(Boolean).join(' ')}
      role="menu"
      aria-label={t('nav.rooms')}
      // Prevent mouse-down inside the popover from firing the outside-click handler
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="rooms-menu__inner">
        {sortedRooms.length === 0 ? (
          <p className="rooms-menu__empty">
            {t('rooms.empty')}
          </p>
        ) : (
          sortedRooms.map((room, index) => (
            <button
              key={room.id}
              ref={index === 0 ? firstRowRef : undefined}
              role="menuitem"
              className="rooms-menu__row"
              onClick={() => handleRoomClick(room.id)}
            >
              <RoomDisplayIcon
                roomIcon={room.icon}
                iconName={roomIconName({ name: room.name, icon: room.icon ?? null })}
                isStatus={false}
                size={18}
                className="rooms-menu__row-icon"
              />
              <span className="rooms-menu__row-name">{room.name}</span>
              <ChevronRight size={16} strokeWidth={1.75} className="rooms-menu__row-chevron" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
