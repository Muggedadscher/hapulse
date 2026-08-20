import React from 'react';
import {
  Sparkles, Sun, Moon, Sunset, Tv,
  PartyPopper, BookOpen, Coffee, Music2,
} from 'lucide-react';
import { useT } from '../../i18n/useT';
import { Card } from '../ui/Card';
import { RoomDisplayIcon } from '../ui/RoomDisplayIcon';
import { callService } from '../../ha/service';
import type { HassEntity } from '@hapulse/core';
import '../../components/home/ScenesCard.css';
import './SceneRoomCard.css';

interface SceneRoomCardProps {
  roomName: string;
  /** Resolved lucide icon name (fallback when no usable HA mdi: icon). */
  roomIcon: string;
  /** Raw HA icon string for the room, e.g. "mdi:sofa" (null for synthetic rooms). */
  roomHaIcon?: string | null | undefined;
  scenes: HassEntity[];
}

const SCENE_ICON_COLORS = [
  { bg: 'var(--accent-soft)',   color: 'var(--accent)' },
  { bg: 'var(--info-soft)',     color: 'var(--info)' },
  { bg: 'var(--positive-soft)', color: 'var(--positive)' },
  { bg: 'var(--warning-soft)',  color: 'var(--warning)' },
] as const;

function sceneIcon(name: string): React.ReactNode {
  const n = name.toLowerCase();
  if (n.includes('morning') || n.includes('sunrise') || n.includes('wake')) return <Sun size={16} strokeWidth={1.75} />;
  if (n.includes('night') || n.includes('sleep') || n.includes('bed')) return <Moon size={16} strokeWidth={1.75} />;
  if (n.includes('relax') || n.includes('chill') || n.includes('calm')) return <Sunset size={16} strokeWidth={1.75} />;
  if (n.includes('movie') || n.includes('cinema') || n.includes('tv')) return <Tv size={16} strokeWidth={1.75} />;
  if (n.includes('music') || n.includes('party')) return <PartyPopper size={16} strokeWidth={1.75} />;
  if (n.includes('read') || n.includes('study') || n.includes('focus')) return <BookOpen size={16} strokeWidth={1.75} />;
  if (n.includes('coffee') || n.includes('breakfast')) return <Coffee size={16} strokeWidth={1.75} />;
  if (n.includes('concert') || n.includes('audio') || n.includes('sound')) return <Music2 size={16} strokeWidth={1.75} />;
  return <Sparkles size={16} strokeWidth={1.75} />;
}

function sceneName(e: HassEntity): string {
  return (
    (e.attributes.friendly_name as string | undefined) ??
    e.entity_id.split('.')[1]!.replace(/_/g, ' ')
  );
}

export function SceneRoomCard({ roomName, roomIcon, roomHaIcon, scenes }: SceneRoomCardProps) {
  const t = useT();
  return (
    <Card className="scene-room-card">
      <div className="scene-room-card__header">
        <div className="scene-room-card__title-row">
          <span className="scene-room-card__icon-chip" aria-hidden="true">
            <RoomDisplayIcon
              roomIcon={roomHaIcon}
              iconName={roomIcon}
              isStatus={false}
              size={14}
            />
          </span>
          <span className="scene-room-card__title">{roomName}</span>
        </div>
        <span
          className="scene-room-card__count"
          aria-label={t('scenes.room.countAria', { count: scenes.length })}
        >
          {scenes.length}
        </span>
      </div>

      <div className="scene-room-card__grid">
        {scenes.map((entity, idx) => {
          const name    = sceneName(entity);
          const palette = SCENE_ICON_COLORS[idx % SCENE_ICON_COLORS.length]!;
          return (
            <button
              key={entity.entity_id}
              type="button"
              className="scene-tile scene-tile--compact"
              onClick={() => void callService('scene', 'turn_on', {}, { entity_id: entity.entity_id })}
              aria-label={t('scenes.room.activateAria', { name })}
            >
              <span
                className="scene-tile__icon"
                style={{ background: palette.bg, color: palette.color }}
                aria-hidden="true"
              >
                {sceneIcon(name)}
              </span>
              <span className="scene-tile__name">{name}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
