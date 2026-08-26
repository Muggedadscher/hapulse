/**
 * NowPlayingCard — Hero card for the active media player.
 * Shows artwork, title, artist, progress bar, transport controls, volume, source.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume1,
  Volume2,
  VolumeX,
  Music,
  ChevronDown,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useConnectionStore } from '../../stores/connectionStore';
import { callService } from '../../ha/service';
import { resolveEntityPicture } from '../../lib/media';
import { useArtworkUrl } from '../../lib/useImageFallback';
import { useT, useStateLabel } from '../../i18n/useT';
import { Card } from '../ui/Card';
import type { HassEntity } from '@hapulse/core';
import './NowPlayingCard.css';

// ---------------------------------------------------------------------------
// Supported features bitmask constants
// ---------------------------------------------------------------------------
const FEATURE_PAUSE        = 1;
const FEATURE_SEEK         = 2;
const FEATURE_VOLUME_SET   = 4;
const FEATURE_PREVIOUS     = 16;
const FEATURE_NEXT         = 32;
const FEATURE_SHUFFLE      = 32768;
const FEATURE_REPEAT       = 262144;
const FEATURE_SELECT_SOURCE = 2048;

function hasFeature(entity: HassEntity, flag: number): boolean {
  const sf = entity.attributes['supported_features'];
  if (typeof sf !== 'number') return false;
  return (sf & flag) !== 0;
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatRemaining(position: number, duration: number): string {
  const remaining = Math.max(0, duration - position);
  return `−${formatTime(remaining)}`;
}

/** Compute current playback position accounting for elapsed time since last update. */
function computePosition(entity: HassEntity): number {
  const pos = entity.attributes['media_position'];
  const updatedAt = entity.attributes['media_position_updated_at'];
  if (pos == null) return 0;
  if (entity.state === 'playing' && updatedAt) {
    const elapsed = (Date.now() - new Date(updatedAt as string).getTime()) / 1000;
    return (pos as number) + elapsed;
  }
  return pos as number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NowPlayingCardProps {
  entity: HassEntity;
  roomName?: string | undefined;
}

export function NowPlayingCard({ entity, roomName }: NowPlayingCardProps) {
  const t = useT();
  const sl = useStateLabel();
  const { url } = useConnectionStore(useShallow((s) => ({ url: s.url })));

  const attrs = entity.attributes;
  const isPlaying = entity.state === 'playing';
  const duration = (attrs['media_duration'] as number | undefined) ?? 0;

  // ---- Progress tracking ----
  const [position, setPosition] = useState(() => computePosition(entity));
  const lastEntityRef = useRef(entity);

  useEffect(() => {
    lastEntityRef.current = entity;
    setPosition(computePosition(entity));
  }, [entity]);

  // 500ms interval is plenty for a seconds-granularity progress bar; rAF would
  // re-render the card every frame.
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPosition(computePosition(lastEntityRef.current));
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // ---- Artwork URL ----
  const entityPicture = attrs['entity_picture'] as string | null | undefined;
  const { src: artworkUrl, onError: onArtworkError } = useArtworkUrl(
    resolveEntityPicture(entityPicture, url),
  );

  // ---- Source dropdown ----
  const sourceList = attrs['source_list'] as string[] | undefined;
  const currentSource = attrs['source'] as string | undefined;
  const canSelectSource = hasFeature(entity, FEATURE_SELECT_SOURCE) && sourceList && sourceList.length > 0;

  // ---- Repeat state ----
  const repeatMode = (attrs['repeat'] as string | undefined) ?? 'off';
  const shuffleMode = (attrs['shuffle'] as boolean | undefined) ?? false;
  const isMuted = (attrs['is_volume_muted'] as boolean | undefined) ?? false;
  const volumeLevel = (attrs['volume_level'] as number | undefined) ?? 0;

  // ---- Service calls ----
  const target = { entity_id: entity.entity_id };

  const handlePlayPause = useCallback(() => {
    callService('media_player', isPlaying ? 'media_pause' : 'media_play', {}, target);
  }, [isPlaying, entity.entity_id]);

  const handlePrevious = useCallback(() => {
    callService('media_player', 'media_previous_track', {}, target);
  }, [entity.entity_id]);

  const handleNext = useCallback(() => {
    callService('media_player', 'media_next_track', {}, target);
  }, [entity.entity_id]);

  const handleShuffle = useCallback(() => {
    callService('media_player', 'shuffle_set', { shuffle: !shuffleMode }, target);
  }, [shuffleMode, entity.entity_id]);

  const handleRepeat = useCallback(() => {
    const next = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    callService('media_player', 'repeat_set', { repeat: next }, target);
  }, [repeatMode, entity.entity_id]);

  const handleMute = useCallback(() => {
    callService('media_player', 'volume_mute', { is_volume_muted: !isMuted }, target);
  }, [isMuted, entity.entity_id]);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    callService('media_player', 'volume_set', { volume_level: parseFloat(e.target.value) }, target);
  }, [entity.entity_id]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    callService('media_player', 'media_seek', { seek_position: parseFloat(e.target.value) }, target);
  }, [entity.entity_id]);

  const handleSource = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    callService('media_player', 'select_source', { source: e.target.value }, target);
  }, [entity.entity_id]);

  const clampedPosition = Math.min(position, duration);
  const progressPct = duration > 0 ? Math.min((clampedPosition / duration) * 100, 100) : 0;
  const name = (attrs['friendly_name'] as string | undefined) ?? entity.entity_id;
  const title = attrs['media_title'] as string | undefined;
  const artist = attrs['media_artist'] as string | undefined;
  const album = attrs['media_album_name'] as string | undefined;

  const effectiveVolume = isMuted ? 0 : volumeLevel;

  const hasBackdrop = Boolean(artworkUrl && isPlaying);

  return (
    <Card
      className={`now-playing-card${hasBackdrop ? ' now-playing-card--backdrop' : ' now-playing-card--gradient'}`}
    >
      {hasBackdrop && (
        <div className="now-playing-card__bg" aria-hidden="true">
          <img src={artworkUrl!} alt="" onError={onArtworkError} />
        </div>
      )}
      <div className="now-playing-card__inner">

        {/* Artwork */}
        <div className="now-playing-card__artwork-wrap">
          {artworkUrl ? (
            <img
              className="now-playing-card__artwork"
              src={artworkUrl}
              alt={title ?? name}
              onError={onArtworkError}
            />
          ) : (
            <div className="now-playing-card__artwork-fallback" aria-hidden="true">
              <Music size={56} strokeWidth={1.25} />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="now-playing-card__controls">

          {/* Room / player name label */}
          <p className="now-playing-card__room-label">
            {[name, roomName].filter(Boolean).join(' · ')}
          </p>

          {/* Track info */}
          <div className="now-playing-card__meta">
            {title ? (
              <>
                <p className="now-playing-card__title">{title}</p>
                {(artist || album) && (
                  <p className="now-playing-card__artist">
                    {[artist, album].filter(Boolean).join(' · ')}
                  </p>
                )}
              </>
            ) : (
              <p className="now-playing-card__title now-playing-card__title--state">
                {sl('media_player', entity.state)}
              </p>
            )}
          </div>

          {/* Progress / scrubber */}
          {duration > 0 && (
            <div className="now-playing-card__progress-wrap">
              <input
                type="range"
                className="slider now-playing-card__progress"
                min={0}
                max={duration}
                value={clampedPosition}
                step={1}
                onChange={handleSeek}
                disabled={!hasFeature(entity, FEATURE_SEEK)}
                aria-label={t('music.control.seek')}
                style={{ '--progress-pct': `${progressPct}%` } as React.CSSProperties}
              />
              <div className="now-playing-card__time-row">
                <span className="data-font now-playing-card__time-elapsed">
                  {formatTime(clampedPosition)}
                </span>
                <span className="data-font now-playing-card__time-remaining">
                  {formatRemaining(clampedPosition, duration)}
                </span>
              </div>
            </div>
          )}

          {/* Transport */}
          <div className="now-playing-card__transport">
            {hasFeature(entity, FEATURE_SHUFFLE) && (
              <button
                className={`now-playing-card__transport-btn${shuffleMode ? ' now-playing-card__transport-btn--active' : ''}`}
                onClick={handleShuffle}
                aria-label={t('music.control.shuffle')}
                type="button"
              >
                <Shuffle size={18} strokeWidth={1.75} />
              </button>
            )}
            {hasFeature(entity, FEATURE_PREVIOUS) && (
              <button
                className="now-playing-card__transport-btn"
                onClick={handlePrevious}
                aria-label={t('music.control.previous')}
                type="button"
              >
                <SkipBack size={22} strokeWidth={1.75} />
              </button>
            )}
            <button
              className="now-playing-card__play-btn"
              onClick={handlePlayPause}
              aria-label={isPlaying ? t('music.control.pause') : t('music.control.play')}
              type="button"
            >
              {isPlaying
                ? <Pause size={28} strokeWidth={1.75} fill="currentColor" />
                : <Play size={28} strokeWidth={1.75} fill="currentColor" />
              }
            </button>
            {hasFeature(entity, FEATURE_NEXT) && (
              <button
                className="now-playing-card__transport-btn"
                onClick={handleNext}
                aria-label={t('music.control.next')}
                type="button"
              >
                <SkipForward size={22} strokeWidth={1.75} />
              </button>
            )}
            {hasFeature(entity, FEATURE_REPEAT) && (
              <button
                className={`now-playing-card__transport-btn${repeatMode !== 'off' ? ' now-playing-card__transport-btn--active' : ''}`}
                onClick={handleRepeat}
                aria-label={t('music.control.repeatAria', { mode: repeatMode })}
                type="button"
              >
                {repeatMode === 'one'
                  ? <Repeat1 size={18} strokeWidth={1.75} />
                  : <Repeat size={18} strokeWidth={1.75} />
                }
              </button>
            )}
          </div>

          {/* Volume */}
          {hasFeature(entity, FEATURE_VOLUME_SET) && (
            <div className="now-playing-card__volume-row">
              <button
                className="now-playing-card__mute-btn"
                onClick={handleMute}
                aria-label={isMuted ? t('music.control.unmute') : t('music.control.mute')}
                type="button"
              >
                {isMuted
                  ? <VolumeX size={18} strokeWidth={1.75} />
                  : <Volume1 size={18} strokeWidth={1.75} />
                }
              </button>
              <input
                type="range"
                className="slider now-playing-card__volume-slider"
                min={0}
                max={1}
                value={effectiveVolume}
                step={0.01}
                onChange={handleVolume}
                aria-label={t('music.control.volume')}
                style={{ '--progress-pct': `${effectiveVolume * 100}%` } as React.CSSProperties}
              />
              <Volume2 size={18} strokeWidth={1.75} className="now-playing-card__vol-high" aria-hidden="true" />
            </div>
          )}

          {/* Source selector */}
          {canSelectSource && (
            <div className="now-playing-card__source-wrap">
              <select
                className="now-playing-card__source-select"
                value={currentSource ?? ''}
                onChange={handleSource}
                aria-label={t('music.control.source')}
              >
                {sourceList!.map((src) => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
              <ChevronDown size={14} strokeWidth={1.75} className="now-playing-card__source-chevron" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
