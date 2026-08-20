import React, { useCallback, useState } from 'react';
import { Speaker, Play, Pause } from 'lucide-react';
import { Card } from '../ui/Card';
import { callService } from '../../ha/service';
import { useConnectionStore } from '../../stores/connectionStore';
import { useT } from '../../i18n/useT';
import type { HassEntity } from '@hapulse/core';
import './cards.css';

interface MediaCardProps {
  entity: HassEntity;
  name: string;
}

function resolveEntityPicture(picture: string | null | undefined, baseUrl: string): string | null {
  if (!picture) return null;
  if (picture.startsWith('http://') || picture.startsWith('https://')) return picture;
  return baseUrl ? `${baseUrl}${picture}` : picture;
}

export function MediaCard({ entity, name }: MediaCardProps) {
  const t = useT();
  const entityId = entity.entity_id;
  const isPlaying = entity.state === 'playing';
  const title = entity.attributes.media_title as string | undefined;
  const artist = entity.attributes.media_artist as string | undefined;
  const volumeLevel = entity.attributes.volume_level as number | undefined;
  const rawPicture = entity.attributes.entity_picture as string | undefined;
  const baseUrl = useConnectionStore((s) => s.url);
  const [imgFailed, setImgFailed] = useState(false);

  const pictureUrl = imgFailed ? null : resolveEntityPicture(rawPicture, baseUrl);

  const handlePlayPause = useCallback(() => {
    void callService('media_player', 'media_play_pause', {}, { entity_id: entityId });
  }, [entityId]);

  const handleVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      void callService('media_player', 'volume_set', { volume_level: value }, { entity_id: entityId });
    },
    [entityId]
  );

  const volumePercent = volumeLevel != null ? volumeLevel * 100 : 0;
  const hasMedia = title || artist;

  return (
    <Card active={isPlaying} className="media-card">
      {/* Top row: artwork chip + info */}
      <div className="media-card__top">
        <div className="media-card__art">
          {pictureUrl ? (
            <img
              src={pictureUrl}
              alt=""
              aria-hidden="true"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <Speaker size={20} strokeWidth={1.75} />
          )}
        </div>
        <div className="media-card__info">
          {hasMedia ? (
            <>
              <div className="media-card__title">{title ?? name}</div>
              {artist && <div className="media-card__artist">{artist}</div>}
            </>
          ) : (
            <>
              <div className="media-card__title">{name}</div>
              {entity.state !== 'unavailable' && entity.state !== 'unknown' && (
                <div className="media-card__artist">{entity.state}</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Controls: play/pause + volume slider */}
      <div className="media-card__controls">
        <button
          type="button"
          className="media-card__play-btn"
          onClick={handlePlayPause}
          aria-label={isPlaying ? t('cards.media.pause') : t('cards.media.play')}
        >
          {isPlaying ? <Pause size={16} strokeWidth={2} /> : <Play size={16} strokeWidth={2} />}
        </button>

        {volumeLevel != null && (
          <div className="media-card__volume-wrap">
            <div
              className="media-card__volume-fill"
              style={{ width: `${Math.max(volumePercent, 4)}%` }}
            />
            <input
              type="range"
              className="media-card__volume-input"
              min={0}
              max={1}
              step={0.01}
              value={volumeLevel}
              onChange={handleVolume}
              aria-label={t('cards.media.volumeAria')}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
