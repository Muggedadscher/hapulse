/**
 * LibraryCard — the Music Assistant library browser (issue #2, phase 1).
 *
 * Rendered on the Music page only when Music Assistant is detected (or in
 * demo mode, against the built-in demo library). Tabs per media type,
 * favourites filter, in-library search, paginated grid, and per-item playback
 * with the enqueue modes `music_assistant.play_media` supports.
 *
 * Artwork caveat: MA serves some covers from its LAN imageproxy over http://,
 * which an https-served dashboard cannot load (mixed content). Every tile
 * therefore falls back to a coloured placeholder when its image fails.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Library, ListMusic, Disc3, MicVocal, Music2, Radio,
  Star, Search, Play, MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { getMALibrary, searchMAMedia, playMAMedia } from '../../ha/service';
import { useMAPlayerTarget } from './useMAPlayerTarget';
import { MA_MEDIA_TYPES } from '@hapulse/core';
import type { MAMediaType, MAMediaItem, MAEnqueueMode, MusicAssistantInfo } from '@hapulse/core';
import { useT, type TKey } from '../../i18n/useT';
import './LibraryCard.css';

const PAGE_SIZE = 36;

const TYPE_META: Record<MAMediaType, { icon: typeof ListMusic; labelKey: TKey }> = {
  playlist: { icon: ListMusic, labelKey: 'music.library.type.playlist' },
  album:    { icon: Disc3,     labelKey: 'music.library.type.album' },
  artist:   { icon: MicVocal,  labelKey: 'music.library.type.artist' },
  track:    { icon: Music2,    labelKey: 'music.library.type.track' },
  radio:    { icon: Radio,     labelKey: 'music.library.type.radio' },
};

/** Deterministic placeholder tint per item, so the grid stays lively without artwork. */
const PLACEHOLDER_TONES = ['accent', 'info', 'positive', 'warning'] as const;
function placeholderTone(uri: string): (typeof PLACEHOLDER_TONES)[number] {
  let h = 0;
  for (let i = 0; i < uri.length; i++) h = (h * 31 + uri.charCodeAt(i)) | 0;
  return PLACEHOLDER_TONES[Math.abs(h) % PLACEHOLDER_TONES.length]!;
}

interface LibraryCardProps {
  ma: MusicAssistantInfo;
}

export function LibraryCard({ ma }: LibraryCardProps) {
  const t = useT();
  const { players: availablePlayers, target, setTarget, nameOf } = useMAPlayerTarget(ma);

  const [mediaType, setMediaType] = useState<MAMediaType>('playlist');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<MAMediaItem[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [menuUri, setMenuUri] = useState<string | null>(null);

  // Debounced search so typing doesn't fire a service call per keystroke.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (searchTimer.current != null) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => {
      if (searchTimer.current != null) clearTimeout(searchTimer.current);
    };
  }, [search]);
  useEffect(() => setPage(0), [mediaType, debouncedSearch, favoritesOnly]);

  // (Re)load whenever the query or page changes. A non-empty search runs the
  // GLOBAL music_assistant.search — every provider MA has enabled (Spotify,
  // local library, radio) — while empty search browses the library paginated.
  const searching = debouncedSearch !== '';
  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setLoadFailed(false);
    setHasMore(false);
    const request = searching
      ? searchMAMedia(ma.configEntryId, debouncedSearch, mediaType).then(
          (results) => results && { items: results, more: false },
        )
      : getMALibrary(ma.configEntryId, mediaType, {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          ...(favoritesOnly ? { favorite: true } : {}),
        }).then((res) => res && { items: res.items, more: res.items.length >= PAGE_SIZE });
    void request.then((result) => {
      if (cancelled) return;
      if (result == null) {
        setLoadFailed(true);
        setItems([]);
        return;
      }
      setItems(result.items);
      setHasMore(result.more);
    });
    return () => {
      cancelled = true;
    };
  }, [ma.configEntryId, mediaType, searching, debouncedSearch, favoritesOnly, page]);

  const play = useCallback(
    (item: MAMediaItem, enqueue: MAEnqueueMode) => {
      setMenuUri(null);
      if (target) void playMAMedia(target, item, enqueue);
    },
    [target],
  );

  // Close the enqueue menu on any outside pointer press.
  useEffect(() => {
    if (menuUri == null) return;
    const close = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest('.library-tile__menu, .library-tile__more') == null) {
        setMenuUri(null);
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuUri]);

  return (
    <Card className="library-card">
      {/* ── Header: title + playback target ── */}
      <div className="library-card__header">
        <div className="library-card__title-wrap">
          <span className="library-card__title-icon" aria-hidden="true">
            <Library size={16} strokeWidth={1.75} />
          </span>
          <h2 className="library-card__title">{t('music.library.title')}</h2>
        </div>
        {availablePlayers.length > 0 && target && (
          <div className="library-card__player-select">
            <select
              className="library-card__player-native"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label={t('music.library.playerAria')}
            >
              {availablePlayers.map((p) => (
                <option key={p.entity_id} value={p.entity_id}>
                  {nameOf(p.entity_id)}
                </option>
              ))}
            </select>
            <ChevronDown size={13} strokeWidth={2} className="library-card__player-chevron" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* ── Toolbar: type tabs, favourites, search ── */}
      <div className="library-card__toolbar">
        <div className="library-card__tabs" role="tablist" aria-label={t('music.library.title')}>
          {MA_MEDIA_TYPES.map((type) => {
            const { icon: Icon, labelKey } = TYPE_META[type];
            const active = mediaType === type;
            return (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={active}
                className={`library-card__tab${active ? ' library-card__tab--active' : ''}`}
                onClick={() => setMediaType(type)}
              >
                <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
                {t(labelKey)}
              </button>
            );
          })}
        </div>
        <div className="library-card__filters">
          {!searching && (
          <button
            type="button"
            className={`library-card__fav-toggle${favoritesOnly ? ' library-card__fav-toggle--active' : ''}`}
            onClick={() => setFavoritesOnly((v) => !v)}
            aria-pressed={favoritesOnly}
            aria-label={t('music.library.favoritesAria')}
            title={t('music.library.favoritesAria')}
          >
            <Star size={15} strokeWidth={1.75} />
          </button>
          )}
          <div className="library-card__search">
            <Search size={14} strokeWidth={1.75} className="library-card__search-icon" aria-hidden="true" />
            <input
              type="search"
              className="library-card__search-input"
              placeholder={t('music.library.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t('music.library.searchPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      {items == null ? (
        <div className="library-card__status">{t('common.loading')}</div>
      ) : items.length === 0 ? (
        <div className="library-card__status">
          {loadFailed
            ? t('music.library.error')
            : debouncedSearch || favoritesOnly
              ? t('music.library.emptySearch')
              : t('music.library.empty')}
        </div>
      ) : (
        <>
          <div className="library-card__grid">
            {items.map((item) => (
              <LibraryTile
                key={item.uri}
                item={item}
                menuOpen={menuUri === item.uri}
                onPlay={() => play(item, 'play')}
                onToggleMenu={() => setMenuUri((cur) => (cur === item.uri ? null : item.uri))}
                onEnqueue={(mode) => play(item, mode)}
              />
            ))}
          </div>
          {!searching && (page > 0 || hasMore) && (
            <div className="library-card__pager">
              <button
                type="button"
                className="library-card__pager-btn"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label={t('music.library.prevPage')}
              >
                <ChevronLeft size={15} strokeWidth={2} />
              </button>
              <span className="library-card__pager-label">
                {t('music.library.page', { page: page + 1 })}
              </span>
              <button
                type="button"
                className="library-card__pager-btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                aria-label={t('music.library.nextPage')}
              >
                <ChevronRight size={15} strokeWidth={2} />
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------

function LibraryTile({ item, menuOpen, onPlay, onToggleMenu, onEnqueue }: {
  item: MAMediaItem;
  menuOpen: boolean;
  onPlay: () => void;
  onToggleMenu: () => void;
  onEnqueue: (mode: MAEnqueueMode) => void;
}) {
  const t = useT();
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [item.image]);

  const TypeIcon = TYPE_META[(item.media_type as MAMediaType)]?.icon ?? Music2;
  const showImage = item.image != null && !imgFailed;
  const round = item.media_type === 'artist';

  const ENQUEUE_OPTIONS: { mode: MAEnqueueMode; labelKey: TKey }[] = [
    { mode: 'next', labelKey: 'music.library.playNext' },
    { mode: 'add', labelKey: 'music.library.addQueue' },
    { mode: 'replace', labelKey: 'music.library.replaceQueue' },
  ];

  return (
    <div className="library-tile">
      <div className={`library-tile__art${round ? ' library-tile__art--round' : ''}`}>
        {showImage ? (
          <img
            src={item.image!}
            alt=""
            loading="lazy"
            className="library-tile__img"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span
            className={`library-tile__placeholder library-tile__placeholder--${placeholderTone(item.uri)}`}
            aria-hidden="true"
          >
            <TypeIcon size={22} strokeWidth={1.5} />
          </span>
        )}

        <button
          type="button"
          className="library-tile__play"
          onClick={onPlay}
          aria-label={t('music.library.playAria', { name: item.name })}
        >
          <Play size={16} strokeWidth={2} fill="currentColor" />
        </button>
        <button
          type="button"
          className="library-tile__more"
          onClick={onToggleMenu}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={t('music.library.itemMenuAria', { name: item.name })}
        >
          <MoreHorizontal size={15} strokeWidth={2} />
        </button>

        {item.favorite && (
          <span className="library-tile__fav" aria-hidden="true">
            <Star size={11} strokeWidth={2} fill="currentColor" />
          </span>
        )}

        {menuOpen && (
          <div className="library-tile__menu" role="menu">
            {ENQUEUE_OPTIONS.map(({ mode, labelKey }) => (
              <button
                key={mode}
                type="button"
                role="menuitem"
                className="library-tile__menu-item"
                onClick={() => onEnqueue(mode)}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="library-tile__name" title={item.name}>{item.name}</span>
      {(item.subtitle ?? item.version) && (
        <span className="library-tile__sub">{item.subtitle ?? item.version}</span>
      )}
    </div>
  );
}
