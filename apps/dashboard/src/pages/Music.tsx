import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Music2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useEntityStore } from '../stores/entityStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useUIStore } from '../stores/uiStore';
import { EmptyState } from '../components/ui/EmptyState';
import { EditToggle } from '../components/ui/EditToggle';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { EditBadge } from '../components/ui/EditBadge';
import { useT, type TKey } from '../i18n/useT';
import { NowPlayingCard } from '../components/music/NowPlayingCard';
import { OtherPlayersCard } from '../components/music/OtherPlayersCard';
import { ZonesCard, type ZoneData } from '../components/music/ZonesCard';
import { roomIconName } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import './Page.css';
import './Music.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickHeroPlayer(players: HassEntity[]): HassEntity | undefined {
  return (
    players.find((p) => p.state === 'playing') ??
    players.find((p) => p.state === 'paused') ??
    players[0]
  );
}

// ── Section IDs ───────────────────────────────────────────────────────────────

const SECTIONS = ['now_playing', 'zones', 'other_players'] as const;
type SectionId = typeof SECTIONS[number];

type ToggleKeys = { hide: TKey; show: TKey; hideMobile: TKey; showMobile: TKey };

const SECTION_TOGGLE_KEYS: Record<SectionId, ToggleKeys> = {
  now_playing: {
    hide: 'music.section.hide.nowPlaying',
    show: 'music.section.show.nowPlaying',
    hideMobile: 'music.section.hideMobile.nowPlaying',
    showMobile: 'music.section.showMobile.nowPlaying',
  },
  zones: {
    hide: 'music.section.hide.zones',
    show: 'music.section.show.zones',
    hideMobile: 'music.section.hideMobile.zones',
    showMobile: 'music.section.showMobile.zones',
  },
  other_players: {
    hide: 'music.section.hide.otherPlayers',
    show: 'music.section.show.otherPlayers',
    hideMobile: 'music.section.hideMobile.otherPlayers',
    showMobile: 'music.section.showMobile.otherPlayers',
  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export function Music() {
  const t = useT();
  const allPlayers = useEntityStore(
    useShallow((s) =>
      Object.values(s.entities).filter((e) => e.entity_id.startsWith('media_player.'))
    )
  );
  const rooms    = useEntityStore((s) => s.rooms);
  const editMode = useUIStore((s) => s.editMode);

  const hiddenEntities      = useSettingsStore((s) => s.customization.hiddenEntities);
  const hiddenMusicSections = useSettingsStore(useShallow((s) => s.customization.hiddenMusicSections));
  const mobileHiddenMusicSections = useSettingsStore(useShallow((s) => s.customization.mobileHiddenMusicSections));
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Callback ref so the ResizeObserver attaches the moment the left column
  // mounts — even if that happens after an async entity load (real HA instance).
  const [leftHeight, setLeftHeight] = useState<number | undefined>(undefined);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const leftColRef = useCallback((el: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h !== undefined) setLeftHeight(h);
    });
    observer.observe(el);
    resizeObserverRef.current = observer;
  }, []);

  const visiblePlayers = allPlayers.filter((p) => !hiddenEntities.includes(p.entity_id));

  const autoPick = pickHeroPlayer(visiblePlayers.length > 0 ? visiblePlayers : allPlayers);
  const hero =
    selectedId != null
      ? (visiblePlayers.find((p) => p.entity_id === selectedId) ?? autoPick)
      : autoPick;

  const otherPlayers = visiblePlayers.filter((p) => p !== hero);

  // Build room-level zones: all rooms that have ≥1 media player (any state)
  const zones = useMemo<ZoneData[]>(() => {
    const playerMap = new Map(visiblePlayers.map((p) => [p.entity_id, p]));
    return rooms
      .map((room) => {
        const players = room.entityIds
          .map((id) => playerMap.get(id))
          .filter((p): p is HassEntity => p !== undefined);
        const iconName = roomIconName({
          name: room.name,
          ...(room.icon != null && { icon: room.icon }),
        });
        return { room, iconName, players };
      })
      .filter((z) => z.players.length > 0);
  }, [rooms, visiblePlayers]);

  const handleToggleHidden = useCallback((id: string) => {
    const next = hiddenMusicSections.includes(id)
      ? hiddenMusicSections.filter((s) => s !== id)
      : [...hiddenMusicSections, id];
    updateCustomization({ hiddenMusicSections: next });
  }, [hiddenMusicSections, updateCustomization]);

  const handleToggleMobileHidden = useCallback((id: string) => {
    const next = mobileHiddenMusicSections.includes(id)
      ? mobileHiddenMusicSections.filter((s) => s !== id)
      : [...mobileHiddenMusicSections, id];
    updateCustomization({ mobileHiddenMusicSections: next });
  }, [mobileHiddenMusicSections, updateCustomization]);

  const handleSelect = useCallback((entityId: string) => {
    setSelectedId((prev) => (prev === entityId ? null : entityId));
  }, []);

  function isHidden(id: string): boolean {
    return hiddenMusicSections.includes(id);
  }

  function wrapSection(id: SectionId, content: React.ReactNode) {
    const hidden = isHidden(id);
    const mobileHidden = mobileHiddenMusicSections.includes(id);
    if (!editMode && hidden) return null;

    if (!editMode) {
      // Mobile-hidden sections still render on desktop; a display:contents
      // wrapper hides them on mobile without altering the desktop column layout.
      return mobileHidden
        ? <div key={id} className="section-mobile-hidden-contents">{content}</div>
        : <React.Fragment key={id}>{content}</React.Fragment>;
    }

    return (
      <div
        key={id}
        className={[
          'edit-entity-wrap',
          'edit-entity-wrap--editing',
          hidden ? 'edit-entity-wrap--hidden' : '',
        ].filter(Boolean).join(' ')}
        style={{ borderRadius: 'var(--radius-card)' }}
      >
        <div className="edit-item-outline" style={{ borderRadius: 'var(--radius-card)' }}>
          {content}
        </div>
        <EditBadge
          hidden={hidden}
          toggleLabel={hidden ? t(SECTION_TOGGLE_KEYS[id].show) : t(SECTION_TOGGLE_KEYS[id].hide)}
          onToggleHidden={() => handleToggleHidden(id)}
          mobileHidden={mobileHidden}
          onToggleMobileHidden={() => handleToggleMobileHidden(id)}
          mobileToggleLabel={
            mobileHidden ? t(SECTION_TOGGLE_KEYS[id].showMobile) : t(SECTION_TOGGLE_KEYS[id].hideMobile)
          }
        />
      </div>
    );
  }

  if (allPlayers.length === 0) {
    return (
      <div className="page music-page stagger-rise">
        <div className="page__header-row">
          <h1 className="page__title">{t('music.title')}</h1>
          <PageHeaderActions />
        </div>
        <EmptyState
          icon={<Music2 size={40} strokeWidth={1.5} />}
          title={t('music.empty.title')}
          description={t('music.empty.description')}
        />
      </div>
    );
  }

  return (
    <div className="page music-page stagger-rise">
      <div className="page__header-row music-page__header">
        <h1 className="page__title">{t('music.title')}</h1>
        <PageHeaderActions><EditToggle /></PageHeaderActions>
      </div>

      <div className="music-page__layout">
        {/* Left column: Now Playing + Zones stacked */}
        <div className="music-page__col-left" ref={leftColRef}>
          {wrapSection('now_playing',
            hero
              ? <NowPlayingCard entity={hero} />
              : <div className="music-page__no-player">{t('music.noPlayer')}</div>
          )}
          {wrapSection('zones', <ZonesCard zones={zones} />)}
        </div>

        {/* Right column: Other Players — capped to the left column's measured height */}
        <div
          className="music-page__col-right"
          style={leftHeight !== undefined ? { maxHeight: leftHeight } : undefined}
        >
          {wrapSection('other_players',
            <OtherPlayersCard
              players={otherPlayers}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
}
