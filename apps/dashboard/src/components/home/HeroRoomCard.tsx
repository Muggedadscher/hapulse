/**
 * HeroRoomCard — large hero card spanning 2 columns showing the most active room.
 * Gradient background (no photos), glance chips, frosted device pills.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Lightbulb, Thermometer, Droplets, Wind, Minus, Plus, ChevronRight,
} from 'lucide-react';
import { roomSummary, roomKind } from '@hapulse/core';
import type { Room, HassEntityMap, RoomKind } from '@hapulse/core';
import { callService } from '../../ha/service';
import { useConnectionStore } from '../../stores/connectionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { useT } from '../../i18n/useT';
import './HeroRoomCard.css';

/** Resolve an HA area picture path against the connection URL. */
function resolvePicture(picture: string | null | undefined, baseUrl: string): string | null {
  if (!picture) return null;
  if (picture.startsWith('http://') || picture.startsWith('https://') || picture.startsWith('data:')) return picture;
  if (!baseUrl) return picture;
  return `${baseUrl.replace(/\/+$/, '')}/${picture.replace(/^\/+/, '')}`;
}

interface HeroRoomCardProps {
  rooms: Room[];
  entities: HassEntityMap;
}

/** Pick the "most active" room: most lights on, else first room with devices */
function pickHeroRoom(rooms: Room[], entities: HassEntityMap): Room | null {
  if (rooms.length === 0) return null;
  let best: Room | null = null;
  let bestScore = -1;
  for (const room of rooms) {
    const summary = roomSummary(room, entities);
    const score = summary.lightsOn * 10 + (summary.mediaPlaying ? 5 : 0) + (summary.anyMotion ? 3 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = room;
    }
  }
  return best ?? rooms[0] ?? null;
}

/**
 * Room gradient — a calm tint per kind of room.
 *
 * Keyed on `roomKind()` rather than on the name directly, so a room called
 * "Cuisine" or "Küche" gets the kitchen tint without this file knowing a word
 * of either language. Kinds with no tint of their own take the default warm.
 */
const GRADIENT_BY_KIND: Partial<Record<RoomKind, string>> = {
  living:   'linear-gradient(135deg, rgba(242,148,28,0.18) 0%, rgba(59,130,246,0.1) 100%)',
  bedroom:  'linear-gradient(135deg, rgba(99,77,200,0.18) 0%, rgba(59,130,246,0.08) 100%)',
  kitchen:  'linear-gradient(135deg, rgba(242,148,28,0.14) 0%, rgba(22,163,74,0.1) 100%)',
  bathroom: 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(99,77,200,0.08) 100%)',
  office:   'linear-gradient(135deg, rgba(22,163,74,0.14) 0%, rgba(59,130,246,0.1) 100%)',
  garage:   'linear-gradient(135deg, rgba(22,163,74,0.18) 0%, rgba(229,148,17,0.08) 100%)',
  outdoor:  'linear-gradient(135deg, rgba(22,163,74,0.18) 0%, rgba(229,148,17,0.08) 100%)',
};

const DEFAULT_GRADIENT =
  'linear-gradient(135deg, rgba(242,148,28,0.15) 0%, rgba(59,130,246,0.1) 100%)';

function roomGradient(name: string): string {
  return GRADIENT_BY_KIND[roomKind(name)] ?? DEFAULT_GRADIENT;
}

export function HeroRoomCard({ rooms, entities }: HeroRoomCardProps) {
  const t = useT();
  const navigate = useNavigate();
  const baseUrl = useConnectionStore((s) => s.url);
  const hiddenEntities = useSettingsStore(
    useShallow((s) => s.customization.hiddenEntities)
  );
  const [imgFailed, setImgFailed] = useState(false);
  const room = pickHeroRoom(rooms, entities);

  // The photo renders as a CSS background (::before), not an <img> child —
  // a child element is caught by the capped-section sticky-header rules in
  // Page.css (`> :first-child`), which override its absolute positioning and
  // break the card (issue #17). A pseudo-element cannot be selected there.
  // Load failures are detected by preloading, replacing <img onError>.
  const candidateUrl = resolvePicture(room?.picture, baseUrl);
  useEffect(() => {
    setImgFailed(false);
    if (!candidateUrl) return;
    const probe = new Image();
    probe.onerror = () => setImgFailed(true);
    probe.src = candidateUrl;
    return () => {
      probe.onerror = null;
    };
  }, [candidateUrl]);

  const handleNavigate = useCallback(() => {
    if (room) void navigate(`/room/${room.id}`);
  }, [navigate, room]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigate();
    }
  }, [handleNavigate]);

  if (!room) {
    return (
      <div className="hero-room-card hero-room-card--empty card">
        <p className="hero-room-card__empty-text">{t('home.hero.emptyText')}</p>
      </div>
    );
  }

  const summary = roomSummary(room, entities);
  const gradient = roomGradient(room.name);
  const photoUrl = imgFailed ? null : candidateUrl;
  const hasPhoto = photoUrl != null;

  // Device counts for subtitle
  const totalDevices = Object.values(room.domains).flat().length;

  // Top glance chips: temperature, humidity
  const glanceChips: { icon: React.ReactNode; label: string }[] = [];
  if (summary.temperature != null) {
    glanceChips.push({
      icon: <Thermometer size={13} strokeWidth={1.75} />,
      label: `${Math.round(summary.temperature)}°`,
    });
  }
  if (summary.humidity != null) {
    glanceChips.push({
      icon: <Droplets size={13} strokeWidth={1.75} />,
      label: `${Math.round(summary.humidity)}%`,
    });
  }

  // Climate pill — first visible climate entity (excluding user-hidden entities)
  const climateIds = (room.domains['climate'] ?? []).filter((id) => !hiddenEntities.includes(id));
  const climateEntity = climateIds.map((id) => entities[id]).find((e) => e != null);

  // Lights pill — exclude user-hidden entities from count and toggle
  const visibleLightIds = (room.domains['light'] ?? []).filter(
    (id) => !hiddenEntities.includes(id)
  );
  const visibleLightsOnCount = visibleLightIds.filter(
    (id) => entities[id]?.state === 'on'
  ).length;
  const hasLights = visibleLightIds.length > 0;
  const lightsOn = visibleLightsOnCount > 0;

  // Media pill — first playing media entity
  const mediaIds = room.domains['media_player'] ?? [];
  const playingMedia = mediaIds.map((id) => entities[id]).find((e) => e?.state === 'playing');

  const handleLightsToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (visibleLightIds.length === 0) return;
    const service = lightsOn ? 'turn_off' : 'turn_on';
    void callService('light', service, {}, { entity_id: visibleLightIds });
  }, [visibleLightIds, lightsOn]);

  const handleClimateDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!climateEntity) return;
    const cur = (climateEntity.attributes.temperature as number | undefined) ?? 20;
    void callService('climate', 'set_temperature', { temperature: cur - 1 }, { entity_id: climateEntity.entity_id });
  }, [climateEntity]);

  const handleClimateUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!climateEntity) return;
    const cur = (climateEntity.attributes.temperature as number | undefined) ?? 20;
    void callService('climate', 'set_temperature', { temperature: cur + 1 }, { entity_id: climateEntity.entity_id });
  }, [climateEntity]);

  const handleMediaToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playingMedia) return;
    void callService('media_player', 'media_play_pause', {}, { entity_id: playingMedia.entity_id });
  }, [playingMedia]);

  const climateTemp = climateEntity
    ? ((climateEntity.attributes.temperature as number | undefined) ?? (climateEntity.attributes.current_temperature as number | undefined))
    : undefined;

  return (
    <div
      className={`hero-room-card card${hasPhoto ? ' hero-room-card--photo' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={t('home.hero.roomAria', { name: room.name })}
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
      style={{
        '--hero-gradient': gradient,
        ...(hasPhoto ? { '--hero-photo': `url("${photoUrl.replace(/"/g, '%22')}")` } : {}),
      } as React.CSSProperties}
    >
      {/* Backdrop (photo or gradient) is pure CSS — see the ::before/::after
          rules. The title row below is deliberately the card's first CHILD so
          the capped-section header rules in Page.css act on the right element. */}

      {/* Content */}
      <div className="hero-room-card__top">
        <div>
          <h2 className="hero-room-card__name">{room.name}</h2>
          <p className="hero-room-card__sub">{t('home.hero.deviceCount', { count: totalDevices })}</p>
        </div>
        {glanceChips.length > 0 && (
          <div className="hero-room-card__glance" role="list" aria-label={t('home.hero.conditionsAria')}>
            {glanceChips.map((chip, i) => (
              <span key={i} className="hero-room-card__glance-chip" role="listitem">
                {chip.icon}
                {chip.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom control pills */}
      <div className="hero-room-card__pills">
        {hasLights && (
          <button
            className={`hero-pill hero-pill--lights${lightsOn ? ' hero-pill--lights-on' : ''}`}
            onClick={handleLightsToggle}
            aria-label={lightsOn ? t('home.hero.lightsOffAria') : t('home.hero.lightsOnAria')}
            aria-pressed={lightsOn}
            type="button"
          >
            <Lightbulb size={15} strokeWidth={1.75} aria-hidden="true" />
            <span>{t('home.hero.lightsLabel')}</span>
            <span className="hero-pill__state">{lightsOn ? t('home.hero.onCount', { count: visibleLightsOnCount }) : t('home.hero.off')}</span>
          </button>
        )}

        {climateEntity && (
          <div className="hero-pill hero-pill--climate">
            <Thermometer size={15} strokeWidth={1.75} aria-hidden="true" />
            <span>{climateTemp != null ? `${Math.round(climateTemp)}°` : t('home.hero.climateFallback')}</span>
            <div className="hero-pill__stepper" onClick={(e) => e.stopPropagation()}>
              <button
                className="hero-pill__step-btn"
                onClick={handleClimateDown}
                aria-label={t('home.hero.lowerTempAria')}
                type="button"
              >
                <Minus size={11} strokeWidth={2.5} />
              </button>
              <button
                className="hero-pill__step-btn"
                onClick={handleClimateUp}
                aria-label={t('home.hero.raiseTempAria')}
                type="button"
              >
                <Plus size={11} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {playingMedia && (
          <button
            className="hero-pill hero-pill--media"
            onClick={handleMediaToggle}
            aria-label={t('home.hero.toggleMediaAria')}
            type="button"
          >
            <Wind size={15} strokeWidth={1.75} aria-hidden="true" />
            <span>{t('home.hero.playing')}</span>
          </button>
        )}

        <button
          className="hero-pill hero-pill--nav"
          onClick={(e) => { e.stopPropagation(); handleNavigate(); }}
          aria-label={t('home.hero.goToRoomAria', { name: room.name })}
          type="button"
        >
          <ChevronRight size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
