import React from 'react';
import { useNavigate } from 'react-router';
import { Lightbulb } from 'lucide-react';
import { Card } from '../ui/Card';
import { EditBadge } from '../ui/EditBadge';
import { RoomIcon } from '../ui/RoomIcon';
import { roomDisplayIcon } from '../../lib/roomIcon';
import { roomSummary } from '@hapulse/core';
import type { Room, HassEntityMap } from '@hapulse/core';
import { useT } from '../../i18n/useT';
import './home.css';

interface RoomCardProps {
  room: Room;
  entities: HassEntityMap;
  /** Edit mode: show hide badge + reorder arrows */
  editMode?: boolean;
  /** Whether this room is currently hidden */
  hidden?: boolean;
  onToggleHidden?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  moveLeftDisabled?: boolean;
  moveRightDisabled?: boolean;
}

export function RoomCard({
  room,
  entities,
  editMode = false,
  hidden = false,
  onToggleHidden,
  onMoveLeft,
  onMoveRight,
  moveLeftDisabled = false,
  moveRightDisabled = false,
}: RoomCardProps) {
  const navigate = useNavigate();
  const t = useT();
  const summary = roomSummary(room, entities);
  const anyLightsOn = summary.lightsOn > 0;
  const { iconName, isStatus } = roomDisplayIcon(room, entities);

  const handleClick = () => {
    if (editMode) return; // disable navigation while editing
    void navigate(`/room/${room.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editMode) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void navigate(`/room/${room.id}`);
    }
  };

  return (
    <div
      className={[
        'room-card-wrap',
        editMode ? 'room-card-wrap--editing' : '',
        hidden ? 'room-card-wrap--hidden' : '',
      ].filter(Boolean).join(' ')}
    >
      <Card
        active={anyLightsOn && !hidden}
        className={[
          'room-card',
          editMode ? 'edit-item-outline' : '',
        ].filter(Boolean).join(' ')}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role={editMode ? 'presentation' : 'button'}
        tabIndex={editMode ? -1 : 0}
        aria-label={editMode ? undefined : t('home.roomCard.roomAria', { name: room.name })}
      >
        <div className="room-card__head">
          <RoomIcon
            name={iconName}
            size={20}
            className={`room-card__icon${isStatus ? ' room-card__icon--status' : ''}`}
          />
          <div className="room-card__name">{room.name}</div>
        </div>

        {summary.temperature != null && (
          <div className="room-card__temp">
            {summary.temperature.toFixed(1)}°
          </div>
        )}

        <div className="room-card__footer">
          {summary.lightsTotal > 0 && (
            <div className={`room-card__lights${anyLightsOn ? ' room-card__lights--on' : ''}`}>
              <Lightbulb
                size={14}
                strokeWidth={1.75}
                className={anyLightsOn ? 'room-card__lights-icon--on' : ''}
              />
              <span>{summary.lightsOn}/{summary.lightsTotal}</span>
            </div>
          )}

          <div className="room-card__dots">
            {summary.mediaPlaying && (
              <div className="room-card__dot room-card__dot--media" title={t('home.roomCard.mediaPlayingTitle')} />
            )}
            {summary.anyMotion && (
              <div className="room-card__dot room-card__dot--motion" title={t('home.roomCard.motionTitle')} />
            )}
          </div>
        </div>
      </Card>

      {/* Edit mode badge overlay */}
      {editMode && onToggleHidden && (
        <EditBadge
          hidden={hidden}
          toggleLabel={t(hidden ? 'editBadge.show' : 'editBadge.hide', { label: room.name })}
          onToggleHidden={onToggleHidden}
          onMoveLeft={onMoveLeft}
          onMoveRight={onMoveRight}
          moveLeftDisabled={moveLeftDisabled}
          moveRightDisabled={moveRightDisabled}
        />
      )}
    </div>
  );
}
