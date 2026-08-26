import React, { useCallback, useState } from 'react';
import { Volume2, VolumeX, LayoutGrid, LayoutList } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useConnectionStore } from '../../stores/connectionStore';
import { callService } from '../../ha/service';
import { resolveEntityPicture } from '../../lib/media';
import { useArtworkUrl } from '../../lib/useImageFallback';
import { useT } from '../../i18n/useT';
import type { TFunction } from '../../i18n/useT';
import { Card } from '../ui/Card';
import { RoomIcon } from '../ui/RoomIcon';
import type { HassEntity, Room } from '@hapulse/core';
import './ZonesCard.css';

const FEATURE_VOLUME_SET = 4;

function hasFeature(entity: HassEntity, flag: number): boolean {
  const sf = entity.attributes['supported_features'];
  return typeof sf === 'number' && (sf & flag) !== 0;
}

export interface ZoneData {
  room: Room;
  iconName: string;
  /** All media players in this room (any state). */
  players: HassEntity[];
}

/** Takes the translator as a parameter: it runs outside any component body. */
function getZoneState(players: HassEntity[], t: TFunction) {
  const playingPlayers = players.filter((p) => p.state === 'playing');
  const isActive = playingPlayers.length > 0;
  const volPlayers = playingPlayers.filter((p) => hasFeature(p, FEATURE_VOLUME_SET));
  const avgVolume =
    volPlayers.length > 0
      ? volPlayers.reduce((s, p) => s + ((p.attributes['volume_level'] as number | undefined) ?? 0), 0) /
        volPlayers.length
      : 0;
  const allMuted =
    volPlayers.length > 0 &&
    volPlayers.every((p) => (p.attributes['is_volume_muted'] as boolean | undefined) ?? false);
  const effectiveVol = allMuted ? 0 : avgVolume;

  const titles = [
    ...new Set(
      playingPlayers
        .map((p) => p.attributes['media_title'] as string | undefined)
        .filter((t): t is string => Boolean(t))
    ),
  ];
  const subline = isActive
    ? titles.length === 1
      ? titles[0]!
      : t('music.zones.playingCount', { count: playingPlayers.length })
    : (players[0]?.state ?? 'idle');

  const firstActive = playingPlayers[0] ?? players[0];
  const entityPic = (firstActive?.attributes['entity_picture'] as string | null | undefined) ?? null;

  return {
    playingPlayers,
    isActive,
    volPlayers,
    effectiveVol,
    allMuted,
    canVolume: volPlayers.length > 0,
    subline,
    entityPic,
  };
}

// ── List view row ─────────────────────────────────────────────────────────────

interface ZoneRowProps {
  zone: ZoneData;
  baseUrl: string | null;
}

function ZoneRow({ zone, baseUrl }: ZoneRowProps) {
  const t = useT();
  const { room, iconName, players } = zone;
  const { playingPlayers, isActive, allMuted, effectiveVol, canVolume, subline, entityPic } =
    getZoneState(players, t);

  const { src: artworkUrl, onError: onArtworkError } = useArtworkUrl(
    isActive ? resolveEntityPicture(entityPic, baseUrl) : null,
  );

  const handleMute = useCallback(() => {
    playingPlayers.forEach((p) =>
      callService('media_player', 'volume_mute', { is_volume_muted: !allMuted }, { entity_id: p.entity_id })
    );
  }, [allMuted, playingPlayers]);

  const handleVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const level = parseFloat(e.target.value);
      playingPlayers.forEach((p) =>
        callService('media_player', 'volume_set', { volume_level: level }, { entity_id: p.entity_id })
      );
    },
    [playingPlayers]
  );

  return (
    <li className={`zone-row${isActive ? '' : ' zone-row--inactive'}`}>
      <div className="zone-row__art">
        {artworkUrl ? (
          <img src={artworkUrl} alt="" className="zone-row__art-img" onError={onArtworkError} />
        ) : (
          <div className="zone-row__art-fallback" aria-hidden="true">
            <RoomIcon name={iconName} size={18} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="zone-row__info">
        <div className="zone-row__name-row">
          <span className="zone-row__icon" aria-hidden="true">
            <RoomIcon name={iconName} size={13} strokeWidth={1.75} />
          </span>
          <span className="zone-row__name">{room.name}</span>
          {playingPlayers.length > 1 && (
            <span className="zone-row__badge">{playingPlayers.length}</span>
          )}
        </div>
        <span className="zone-row__sub">{subline}</span>
      </div>

      {isActive && canVolume && (
        <div className="zone-row__volume">
          <button
            type="button"
            className="zone-row__mute"
            onClick={handleMute}
            aria-label={
              allMuted
                ? t('music.zones.unmuteRoom', { room: room.name })
                : t('music.zones.muteRoom', { room: room.name })
            }
          >
            {allMuted ? (
              <VolumeX size={15} strokeWidth={1.75} />
            ) : (
              <Volume2 size={15} strokeWidth={1.75} />
            )}
          </button>
          <input
            type="range"
            className="slider zone-row__slider"
            min={0}
            max={1}
            step={0.01}
            value={effectiveVol}
            onChange={handleVolume}
            aria-label={t('music.zones.roomVolume', { room: room.name })}
            style={{ '--progress-pct': `${effectiveVol * 100}%` } as React.CSSProperties}
          />
        </div>
      )}
    </li>
  );
}

// ── Grid view card ────────────────────────────────────────────────────────────

interface ZoneGridCardProps {
  zone: ZoneData;
  baseUrl: string | null;
}

function ZoneGridCard({ zone, baseUrl }: ZoneGridCardProps) {
  const t = useT();
  const { room, iconName, players } = zone;
  const { playingPlayers, isActive, allMuted, effectiveVol, canVolume, subline, entityPic } =
    getZoneState(players, t);

  const { src: artworkUrl, onError: onArtworkError } = useArtworkUrl(
    isActive ? resolveEntityPicture(entityPic, baseUrl) : null,
  );

  const handleMute = useCallback(() => {
    playingPlayers.forEach((p) =>
      callService('media_player', 'volume_mute', { is_volume_muted: !allMuted }, { entity_id: p.entity_id })
    );
  }, [allMuted, playingPlayers]);

  const handleVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const level = parseFloat(e.target.value);
      playingPlayers.forEach((p) =>
        callService('media_player', 'volume_set', { volume_level: level }, { entity_id: p.entity_id })
      );
    },
    [playingPlayers]
  );

  return (
    <div className={`zone-grid-card${isActive ? '' : ' zone-grid-card--inactive'}`}>
      <div className="zone-grid-card__top">
        <div className="zone-grid-card__art">
          {artworkUrl ? (
            <img src={artworkUrl} alt="" className="zone-grid-card__art-img" onError={onArtworkError} />
          ) : (
            <div className="zone-grid-card__art-fallback" aria-hidden="true">
              <RoomIcon name={iconName} size={18} strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="zone-grid-card__info">
          <div className="zone-grid-card__name-row">
            <span className="zone-grid-card__room-icon" aria-hidden="true">
              <RoomIcon name={iconName} size={12} strokeWidth={1.75} />
            </span>
            <span className="zone-grid-card__name">{room.name}</span>
            {playingPlayers.length > 1 && (
              <span className="zone-grid-card__badge">{playingPlayers.length}</span>
            )}
          </div>
          <span className="zone-grid-card__sub">{subline}</span>
        </div>
      </div>

      {isActive && canVolume && (
        <div className="zone-grid-card__volume">
          <button
            type="button"
            className="zone-grid-card__mute"
            onClick={handleMute}
            aria-label={
              allMuted
                ? t('music.zones.unmuteRoom', { room: room.name })
                : t('music.zones.muteRoom', { room: room.name })
            }
          >
            {allMuted ? (
              <VolumeX size={13} strokeWidth={1.75} />
            ) : (
              <Volume2 size={13} strokeWidth={1.75} />
            )}
          </button>
          <input
            type="range"
            className="slider zone-grid-card__slider"
            min={0}
            max={1}
            step={0.01}
            value={effectiveVol}
            onChange={handleVolume}
            aria-label={t('music.zones.roomVolume', { room: room.name })}
            style={{ '--progress-pct': `${effectiveVol * 100}%` } as React.CSSProperties}
          />
        </div>
      )}
    </div>
  );
}

// ── ZonesCard ────────────────────────────────────────────────────────────────

interface ZonesCardProps {
  zones: ZoneData[];
}

export function ZonesCard({ zones }: ZonesCardProps) {
  const t = useT();
  const { url } = useConnectionStore(useShallow((s) => ({ url: s.url })));
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  const activeCount = zones.filter((z) => z.players.some((p) => p.state === 'playing')).length;

  return (
    <Card className="zones-card">
      <div className="zones-card__header">
        <div className="zones-card__title-row">
          <span className="zones-card__icon-chip" aria-hidden="true">
            <LayoutGrid size={14} strokeWidth={1.75} />
          </span>
          <span className="zones-card__title">{t('music.zones.title')}</span>
        </div>

        <div className="zones-card__header-right">
          <span className="zones-card__count">
            {t('music.zones.count', { active: activeCount, total: zones.length })}
          </span>
          <div className="zones-card__view-toggle" role="group" aria-label={t('music.zones.viewModeAria')}>
            <button
              type="button"
              className={`zones-card__view-btn${viewMode === 'list' ? ' zones-card__view-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label={t('music.zones.listView')}
              aria-pressed={viewMode === 'list'}
            >
              <LayoutList size={14} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className={`zones-card__view-btn${viewMode === 'grid' ? ' zones-card__view-btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label={t('music.zones.gridView')}
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {zones.length === 0 ? (
        <p className="zones-card__empty">{t('music.zones.empty')}</p>
      ) : viewMode === 'list' ? (
        <ul className="zones-card__list" aria-label={t('music.zones.listAria')}>
          {zones.map((z) => (
            <ZoneRow key={z.room.id} zone={z} baseUrl={url} />
          ))}
        </ul>
      ) : (
        <div className="zones-card__grid">
          {zones.map((z) => (
            <ZoneGridCard key={z.room.id} zone={z} baseUrl={url} />
          ))}
        </div>
      )}
    </Card>
  );
}
