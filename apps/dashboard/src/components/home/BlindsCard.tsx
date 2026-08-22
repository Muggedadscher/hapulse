/**
 * BlindsCard — per-room blind/cover overview with selectable room controls.
 * Structure mirrors ClimateCard: controls for the selected room at top,
 * scrollable room list below.
 */
import React, { useCallback, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronRight, Square, AlignJustify } from 'lucide-react';
import { Card } from '../ui/Card';
import type { HassEntityMap, HassEntity, Room } from '@hapulse/core';
import { callService } from '../../ha/service';
import { useT } from '../../i18n/useT';
import type { TKey } from '../../i18n/useT';
import './BlindsCard.css';

interface BlindsCardProps {
  entities: HassEntityMap;
  rooms: Room[];
  onSeeAll?: (() => void) | undefined;
}

type BlindKey = 'open' | 'partial' | 'closed' | 'moving';

interface BlindRoomEntry {
  name: string;
  entities: HassEntity[];
  avgPosition: number; // 0–100
  anyMoving: boolean;
}

// HA position: 0 = closed, 100 = open.
// We invert so the display shows "% closed": 100 = fully closed, 0 = fully open.
function coverPosition(entity: HassEntity): number {
  const pos = entity.attributes.current_position;
  if (typeof pos === 'number') return 100 - pos;
  return entity.state === 'closed' ? 100 : 0;
}

function blindColorKey(avgPosition: number, anyMoving: boolean): BlindKey {
  if (anyMoving) return 'moving';
  if (avgPosition <= 20) return 'open';    // mostly open (blind raised)
  if (avgPosition >= 70) return 'closed';  // mostly closed (blind drawn)
  return 'partial';
}

/** Chip color based on all rooms' aggregate blind state */
function chipColorKey(entries: BlindRoomEntry[]): BlindKey {
  if (entries.some((r) => r.anyMoving)) return 'moving';
  const avg = entries.reduce((s, r) => s + r.avgPosition, 0) / entries.length;
  return blindColorKey(avg, false);
}

const BLIND_GAUGE_COLOR: Record<BlindKey, string> = {
  open:    'var(--accent)',
  partial: 'var(--warning)',
  closed:  'var(--info)',
  moving:  'var(--positive)',
};

const BLIND_DOT_COLOR: Record<BlindKey, string> = {
  open:    'var(--accent)',
  partial: 'var(--warning)',
  closed:  'var(--info)',
  moving:  'var(--positive)',
};

const BLIND_LABEL_KEY: Record<BlindKey, TKey> = {
  open:    'home.blinds.state.open',
  partial: 'home.blinds.state.partial',
  closed:  'home.blinds.state.closed',
  moving:  'home.blinds.state.moving',
};

// ── Arc Gauge (position %) ────────────────────────────────────────────────────

interface ArcGaugeProps {
  value: number;   // 0–100
  label: string;
  size?: number;
  fillColor?: string;
}

function ArcGauge({ value, size = 120, label, fillColor = 'var(--accent)' }: ArcGaugeProps) {
  const t = useT();
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const strokeW = size * 0.075;
  const startAngle = 160;
  const totalDeg = 220;
  const pct = Math.max(0, Math.min(1, value / 100));
  const fillDeg = pct * totalDeg;

  function polarToXY(angleDeg: number, radius: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arcPath(startDeg: number, endDeg: number, radius: number) {
    const start = polarToXY(startDeg, radius);
    const end = polarToXY(endDeg, radius);
    const sweep = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${sweep} 1 ${end.x} ${end.y}`;
  }

  const trackPath = arcPath(startAngle, startAngle + totalDeg, r);
  const fillPath = fillDeg > 2 ? arcPath(startAngle, startAngle + fillDeg, r) : '';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={t('home.blinds.gaugeAria', { percent: Math.round(value), label })}
      role="img"
    >
      <path d={trackPath} fill="none" stroke="var(--border)" strokeWidth={strokeW} strokeLinecap="round" />
      {fillPath && (
        <path d={fillPath} fill="none" stroke={fillColor} strokeWidth={strokeW} strokeLinecap="round" />
      )}
      <text
        x={cx} y={cy - 4}
        textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.22, fontWeight: 700, fill: 'var(--text)', letterSpacing: '-0.03em' }}
      >
        {Math.round(value)}%
      </text>
      <text
        x={cx} y={cy + size * 0.14}
        textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: 'var(--font-body)', fontSize: size * 0.1, fill: 'var(--text-faint)' }}
      >
        {label}
      </text>
    </svg>
  );
}

// ── BlindsCard ────────────────────────────────────────────────────────────────

export function BlindsCard({ entities, rooms, onSeeAll }: BlindsCardProps) {
  const t = useT();
  const [selectedRoomName, setSelectedRoomName] = useState<string | null>(null);

  const blindRooms: BlindRoomEntry[] = rooms.flatMap((room) => {
    const coverIds = room.domains['cover'] ?? [];
    if (coverIds.length === 0) return [];
    const roomEntities = coverIds
      .map((id) => entities[id])
      .filter((e): e is HassEntity => !!e && e.state !== 'unavailable');
    if (roomEntities.length === 0) return [];

    const avgPosition =
      roomEntities.reduce((s, e) => s + coverPosition(e), 0) / roomEntities.length;
    const anyMoving = roomEntities.some(
      (e) => e.state === 'opening' || e.state === 'closing'
    );

    return [{ name: room.name, entities: roomEntities, avgPosition, anyMoving }];
  });

  // All hooks must run before any conditional return (Rules of Hooks). The
  // cover set can transition between empty and non-empty across renders — e.g.
  // entities momentarily flash to `unavailable` during an HA reconnect — so the
  // early return below MUST come after these useCallbacks, never before, or the
  // hook count changes between renders and React throws error #310.
  const activeRoom =
    blindRooms.find((r) => r.name === selectedRoomName) ?? blindRooms[0];

  const handleOpen = useCallback(() => {
    for (const e of activeRoom?.entities ?? []) {
      void callService('cover', 'open_cover', {}, { entity_id: e.entity_id });
    }
  }, [activeRoom]);

  const handleStop = useCallback(() => {
    for (const e of activeRoom?.entities ?? []) {
      void callService('cover', 'stop_cover', {}, { entity_id: e.entity_id });
    }
  }, [activeRoom]);

  const handleClose = useCallback(() => {
    for (const e of activeRoom?.entities ?? []) {
      void callService('cover', 'close_cover', {}, { entity_id: e.entity_id });
    }
  }, [activeRoom]);

  if (blindRooms.length === 0 || !activeRoom) {
    return (
      <Card className="blinds-card">
        <div className="blinds-card__header">
          <div className="blinds-card__title-row">
            <span className="blinds-card__icon-chip" aria-hidden="true">
              <AlignJustify size={16} strokeWidth={1.75} />
            </span>
            <span className="blinds-card__title">{t('home.blinds.title')}</span>
          </div>
          {onSeeAll && (
            <button
              className="blinds-card__link"
              type="button"
              onClick={onSeeAll}
              aria-label={t('home.blinds.seeAllAria')}
            >
              {t('home.blinds.seeAll')}
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          )}
        </div>
        <div className="blinds-card__empty">
          <AlignJustify size={28} strokeWidth={1.5} className="blinds-card__empty-icon" />
          <p className="blinds-card__empty-text">{t('home.blinds.emptyTitle')}</p>
          <p className="blinds-card__empty-sub">
            {t('home.blinds.emptyDescription')}
          </p>
        </div>
      </Card>
    );
  }

  const colorKey = blindColorKey(activeRoom.avgPosition, activeRoom.anyMoving);
  const gaugeColor = BLIND_GAUGE_COLOR[colorKey];
  const chipKey = chipColorKey(blindRooms);

  return (
    <Card className="blinds-card">
      {/* Header */}
      <div className="blinds-card__header">
        <div className="blinds-card__title-row">
          <span className={`blinds-card__icon-chip blinds-card__icon-chip--${chipKey}`} aria-hidden="true">
            <AlignJustify size={16} strokeWidth={1.75} />
          </span>
          <span className="blinds-card__title">{t('home.blinds.title')}</span>
        </div>
        {onSeeAll && (
          <button
            className="blinds-card__link"
            type="button"
            onClick={onSeeAll}
            aria-label={t('home.blinds.seeAllAria')}
          >
            {t('home.blinds.seeAll')}
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Controls — top, reflect selected room */}
      <div className="blinds-card__gauge-wrap" data-blind={colorKey}>
        <ArcGauge
          value={activeRoom.avgPosition}
          label={t(BLIND_LABEL_KEY[colorKey])}
          size={128}
          fillColor={gaugeColor}
        />
        <div className="blinds-card__controls">
          <button
            className="blinds-card__ctrl-btn"
            onClick={handleClose}
            aria-label={t('home.blinds.closeAria')}
            type="button"
          >
            <ChevronDown size={16} strokeWidth={2} />
          </button>
          <button
            className="blinds-card__ctrl-btn blinds-card__ctrl-btn--stop"
            onClick={handleStop}
            aria-label={t('home.blinds.stopAria')}
            type="button"
          >
            <Square size={12} strokeWidth={2} />
          </button>
          <button
            className="blinds-card__ctrl-btn"
            onClick={handleOpen}
            aria-label={t('home.blinds.openAria')}
            type="button"
          >
            <ChevronUp size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Room list — scrollable when it exceeds cap */}
      <ul className="blinds-card__rooms" aria-label={t('home.blinds.roomsAria')}>
        {blindRooms.map((entry) => {
          const entryKey = blindColorKey(entry.avgPosition, entry.anyMoving);
          const isSelected = entry.name === activeRoom.name;
          const posLabel = entry.anyMoving
            ? t('home.blinds.state.moving')
            : `${Math.round(entry.avgPosition)}%`;

          return (
            <li
              key={entry.name}
              className={`blinds-card__room-row${isSelected ? ' blinds-card__room-row--selected' : ''}`}
              onClick={() => setSelectedRoomName(entry.name)}
            >
              <span
                className="blinds-card__room-dot"
                style={{ background: BLIND_DOT_COLOR[entryKey] }}
                aria-hidden="true"
              />
              <span className="blinds-card__room-name">{entry.name}</span>
              <span className="blinds-card__room-pos">{posLabel}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
