/**
 * PlayerTile — Compact media player tile for the "other players" grid.
 */

import React, { useCallback } from 'react';
import { Play, Pause, Volume2, Music } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useConnectionStore } from '../../stores/connectionStore';
import { callService } from '../../ha/service';
import { resolveEntityPicture } from '../../lib/media';
import { useArtworkUrl } from '../../lib/useImageFallback';
import { useT, useStateLabel } from '../../i18n/useT';
import { Card } from '../ui/Card';
import type { HassEntity } from '@hapulse/core';
import './PlayerTile.css';

const FEATURE_VOLUME_SET = 4;

function hasFeature(entity: HassEntity, flag: number): boolean {
  const sf = entity.attributes['supported_features'];
  if (typeof sf !== 'number') return false;
  return (sf & flag) !== 0;
}

interface PlayerTileProps {
  entity: HassEntity;
  roomName?: string | undefined;
  selected?: boolean | undefined;
  onSelect: () => void;
}

export function PlayerTile({ entity, roomName, selected, onSelect }: PlayerTileProps) {
  const t = useT();
  const sl = useStateLabel();
  const { url } = useConnectionStore(useShallow((s) => ({ url: s.url })));

  const attrs = entity.attributes;
  const isPlaying = entity.state === 'playing';
  const name = (attrs['friendly_name'] as string | undefined) ?? entity.entity_id;
  const title = attrs['media_title'] as string | undefined;
  const entityPicture = attrs['entity_picture'] as string | null | undefined;
  const { src: artworkUrl, onError: onArtworkError } = useArtworkUrl(
    resolveEntityPicture(entityPicture, url),
  );
  const volumeLevel = (attrs['volume_level'] as number | undefined) ?? 0;

  const target = { entity_id: entity.entity_id };

  const handlePlayPause = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      callService('media_player', isPlaying ? 'media_pause' : 'media_play', {}, target);
    },
    [isPlaying, entity.entity_id]
  );

  const handleVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      callService('media_player', 'volume_set', { volume_level: parseFloat(e.target.value) }, target);
    },
    [entity.entity_id]
  );

  const stateLabel = isPlaying && title ? title : sl('media_player', entity.state);

  return (
    <Card
      className={`player-tile ${selected ? 'player-tile--selected' : ''}`}
      active={isPlaying || !!selected}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); }}}
      aria-pressed={selected}
      aria-label={t('music.player.selectAria', { name })}
    >
      {/* Artwork thumb */}
      <div className="player-tile__artwork">
        {artworkUrl ? (
          <img src={artworkUrl} alt="" className="player-tile__artwork-img" onError={onArtworkError} />
        ) : (
          <div className="player-tile__artwork-fallback" aria-hidden="true">
            <Music size={20} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="player-tile__body">
        <div className="player-tile__header">
          <div className="player-tile__name-col">
            <p className="player-tile__name">{name}</p>
            {roomName && <p className="player-tile__room">{roomName}</p>}
          </div>
          <button
            className="player-tile__playpause"
            onClick={handlePlayPause}
            aria-label={isPlaying ? t('music.control.pause') : t('music.control.play')}
            type="button"
          >
            {isPlaying
              ? <Pause size={18} strokeWidth={1.75} />
              : <Play size={18} strokeWidth={1.75} />
            }
          </button>
        </div>

        <p className="player-tile__state" title={stateLabel}>
          {stateLabel}
        </p>

        {hasFeature(entity, FEATURE_VOLUME_SET) && (
          <div className="player-tile__volume-row">
            <Volume2 size={13} strokeWidth={1.75} className="player-tile__vol-icon" />
            <input
              type="range"
              className="slider player-tile__volume"
              min={0}
              max={1}
              step={0.01}
              value={volumeLevel}
              onChange={handleVolume}
              onClick={(e) => e.stopPropagation()}
              aria-label={t('music.control.volume')}
              style={{ '--progress-pct': `${volumeLevel * 100}%` } as React.CSSProperties}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
