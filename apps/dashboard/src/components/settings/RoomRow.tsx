/**
 * RoomRow — single room item in the rooms customization list.
 */

import React from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { IconButton } from '../ui/IconButton';
import type { Room } from '@hapulse/core';

interface RoomRowProps {
  room: Room;
  isFirst: boolean;
  isLast: boolean;
  isHidden: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleHide: () => void;
}

export function RoomRow({
  room,
  isFirst,
  isLast,
  isHidden,
  onMoveUp,
  onMoveDown,
  onToggleHide,
}: RoomRowProps) {
  const t = useT();
  return (
    <div className="room-row">
      <span className={`room-row__name ${isHidden ? 'room-row__name--hidden' : ''}`}>
        {room.name}
      </span>
      <span className="room-row__count data-font">{room.entityIds.length}</span>
      <div className="room-row__controls">
        <IconButton
          label={t('settings.rooms.moveUpAria', { name: room.name })}
          size={36}
          onClick={onMoveUp}
          disabled={isFirst}
          variant="ghost"
        >
          <ChevronUp size={16} strokeWidth={1.75} />
        </IconButton>
        <IconButton
          label={t('settings.rooms.moveDownAria', { name: room.name })}
          size={36}
          onClick={onMoveDown}
          disabled={isLast}
          variant="ghost"
        >
          <ChevronDown size={16} strokeWidth={1.75} />
        </IconButton>
        <IconButton
          label={
            isHidden
              ? t('settings.rooms.showAria', { name: room.name })
              : t('settings.rooms.hideAria', { name: room.name })
          }
          size={36}
          onClick={onToggleHide}
          variant={isHidden ? 'ghost' : 'default'}
        >
          {isHidden
            ? <EyeOff size={16} strokeWidth={1.75} />
            : <Eye size={16} strokeWidth={1.75} />
          }
        </IconButton>
      </div>
    </div>
  );
}
