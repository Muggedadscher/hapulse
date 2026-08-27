import React, { useCallback } from 'react';
import { Music, Play, Pause, Radio } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useConnectionStore } from '../../stores/connectionStore';
import { callService } from '../../ha/service';
import { resolveEntityPicture } from '../../lib/media';
import { useArtworkUrl } from '../../lib/useImageFallback';
import { useMAArtwork } from '../../lib/maArtwork';
import { useT, useStateLabel } from '../../i18n/useT';
import { Card } from '../ui/Card';
import type { HassEntity } from '@hapulse/core';
import './OtherPlayersCard.css';

interface OtherPlayersCardProps {
  players: HassEntity[];
  selectedId: string | null;
  onSelect: (entityId: string) => void;
}

interface PlayerRowProps {
  entity: HassEntity;
  selected: boolean;
  onSelect: () => void;
  baseUrl: string | null;
}

function PlayerRow({ entity, selected, onSelect, baseUrl }: PlayerRowProps) {
  const t          = useT();
  const sl         = useStateLabel();
  const attrs      = entity.attributes;
  const isPlaying  = entity.state === 'playing';
  const name       = (attrs['friendly_name'] as string | undefined) ?? entity.entity_id;
  const title      = attrs['media_title'] as string | undefined;
  const entityPic  = attrs['entity_picture'] as string | null | undefined;
  const { src: artworkUrl, onError: onArtworkError } = useArtworkUrl(
    resolveEntityPicture(entityPic, baseUrl),
    useMAArtwork(entity),
  );
  const stateLabel = isPlaying && title ? title : sl('media_player', entity.state);

  const handlePlayPause = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      callService('media_player', isPlaying ? 'media_pause' : 'media_play', {}, { entity_id: entity.entity_id });
    },
    [isPlaying, entity.entity_id]
  );

  return (
    <li
      className={`other-player-row${selected ? ' other-player-row--selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      aria-pressed={selected}
      aria-label={t('music.player.selectAria', { name })}
    >
      <div className="other-player-row__art">
        {artworkUrl ? (
          <img src={artworkUrl} alt="" className="other-player-row__art-img" onError={onArtworkError} />
        ) : (
          <div className="other-player-row__art-fallback" aria-hidden="true">
            <Music size={16} strokeWidth={1.5} />
          </div>
        )}
        {isPlaying && <span className="other-player-row__playing-dot" aria-hidden="true" />}
      </div>

      <div className="other-player-row__info">
        <span className="other-player-row__name">{name}</span>
        <span className="other-player-row__state">{stateLabel}</span>
      </div>

      <button
        type="button"
        className="other-player-row__pp"
        onClick={handlePlayPause}
        aria-label={
          isPlaying
            ? t('music.player.pauseNamed', { name })
            : t('music.player.playNamed', { name })
        }
      >
        {isPlaying
          ? <Pause size={14} strokeWidth={2} />
          : <Play size={14} strokeWidth={2} />
        }
      </button>
    </li>
  );
}

export function OtherPlayersCard({ players, selectedId, onSelect }: OtherPlayersCardProps) {
  const t = useT();
  const { url } = useConnectionStore(useShallow((s) => ({ url: s.url })));

  return (
    <Card className="other-players-card">
      <div className="other-players-card__header">
        <div className="other-players-card__title-row">
          <span className="other-players-card__icon-chip" aria-hidden="true">
            <Radio size={14} strokeWidth={1.75} />
          </span>
          <span className="other-players-card__title">{t('music.players.title')}</span>
        </div>
        <span className="other-players-card__count">{players.length}</span>
      </div>

      {players.length === 0 ? (
        <p className="other-players-card__empty">{t('music.players.empty')}</p>
      ) : (
        <ul className="other-players-card__list" aria-label={t('music.players.listAria')}>
          {players.map((p) => (
            <PlayerRow
              key={p.entity_id}
              entity={p}
              selected={selectedId === p.entity_id}
              onSelect={() => onSelect(p.entity_id)}
              baseUrl={url}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
