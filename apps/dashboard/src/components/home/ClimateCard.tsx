/**
 * ClimateCard — per-room climate overview with selectable room controls.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Minus, Plus, Thermometer, ChevronRight } from 'lucide-react';
import { Card } from '../ui/Card';
import type { HassEntityMap, HassEntity, Room } from '@hapulse/core';
import { callService } from '../../ha/service';
import { useT, useStateLabel } from '../../i18n/useT';
import './ClimateCard.css';
import { climateSetpoint, gaugeRange, stepSetpoint } from './climateLogic'; // [fork]

interface ClimateCardProps {
  entities: HassEntityMap;
  rooms: Room[];
  onSeeAll?: (() => void) | undefined;
}

type HvacKey = 'heating' | 'cooling' | 'auto' | 'off';

interface ClimateRoomEntry {
  name: string;
  entity: HassEntity;
  currentTemp: number | null;
}

/** Map hvac_action → colour key; fall back to mode when idle/unknown */
function hvacColorKey(entity: HassEntity): HvacKey {
  const action = entity.attributes.hvac_action as string | undefined;
  if (action === 'heating') return 'heating';
  if (action === 'cooling') return 'cooling';
  const mode = entity.state;
  if (mode === 'auto' || mode === 'heat_cool') return 'auto';
  return 'off';
}

/** Aggregate colour for the header chip across all climate rooms */
function chipColorKey(entries: ClimateRoomEntry[]): HvacKey {
  const keys = entries.map((r) => hvacColorKey(r.entity));
  if (keys.some((k) => k === 'heating')) return 'heating';
  if (keys.some((k) => k === 'cooling')) return 'cooling';
  if (keys.filter((k) => k === 'auto').length > keys.length / 2) return 'auto';
  return 'off';
}

/** Gauge arc fill color per hvac key */
const HVAC_GAUGE_COLOR: Record<HvacKey, string> = {
  heating: 'var(--danger)',
  cooling: 'var(--info)',
  auto:    'var(--positive)',
  off:     'var(--border)',
};

/** Row dot color per hvac key */
const HVAC_DOT_COLOR: Record<HvacKey, string> = {
  heating: 'var(--danger)',
  cooling: 'var(--info)',
  auto:    'var(--positive)',
  off:     'var(--text-faint)',
};

// ── Arc Gauge ─────────────────────────────────────────────────────────────────

interface ArcGaugeProps {
  value: number | null; // [fork] null = no reading (was drawn as 20°)
  min?: number;
  max?: number;
  label: string;
  size?: number;
  fillColor?: string;
}

function ArcGauge({ value, min = 15, max = 30, size = 120, label, fillColor = 'var(--info)' }: ArcGaugeProps) {
  const t = useT();
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const strokeW = size * 0.075;
  const startAngle = 160;
  const totalDeg = 220;
  const pct = value == null ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));
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
      aria-label={t('home.climate.gaugeAria', { value: value == null ? '–' : Math.round(value), label })}
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
        {value == null ? '–' : `${Math.round(value)}°`}
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

// ── ClimateCard ───────────────────────────────────────────────────────────────

export function ClimateCard({ entities, rooms, onSeeAll }: ClimateCardProps) {
  const t = useT();
  const sl = useStateLabel();
  const [selectedRoomName, setSelectedRoomName] = useState<string | null>(null);

  // Build list of rooms that have at least one climate entity
  const climateRooms: ClimateRoomEntry[] = rooms.flatMap((room) => {
    const climateIds = room.domains['climate'] ?? [];
    if (climateIds.length === 0) return [];
    const entity = entities[climateIds[0]!];
    if (!entity) return [];

    // Prefer room temperature sensor; fall back to climate.current_temperature
    let currentTemp: number | null = null;
    for (const id of room.domains['sensor'] ?? []) {
      const e = entities[id];
      if (e?.attributes.device_class === 'temperature') {
        const v = parseFloat(e.state);
        if (!isNaN(v)) { currentTemp = v; break; }
      }
    }
    if (currentTemp === null) {
      const cur = entity.attributes.current_temperature;
      if (typeof cur === 'number') currentTemp = cur;
    }

    return [{ name: room.name, entity, currentTemp }];
  });

  // All hooks must run before any conditional return (Rules of Hooks). The
  // climate set can flip between empty and non-empty across renders — entities
  // momentarily flash to `unavailable` during an HA reconnect — so these
  // useCallbacks (and the values they close over) must be computed before the
  // early return below; otherwise the hook count changes between renders and
  // React throws error #310.
  const activeRoom =
    climateRooms.find((r) => r.name === selectedRoomName) ?? climateRooms[0];
  const activeEntity = activeRoom?.entity;

  // Temperatures
  // [fork] no invented 20° reading, no current temperature as a setpoint; step/min/max from the entity; quick
  // taps build on the value just sent until HA reports it (two taps = two steps, not the same value twice)
  const currentTemp: number | null =
    activeRoom?.currentTemp ??
    (activeEntity?.attributes.current_temperature as number | undefined) ??
    null;
  const sp = climateSetpoint((activeEntity?.attributes ?? {}) as Record<string, unknown>);
  // the last value sent, synchronously (a ref: two taps before a re-render must still be two steps) + state to re-render
  const pendingRef = useRef<{ entity: string; value: number; at: number } | null>(null);
  const [, setPendingTick] = useState(0);
  const pendingValid = (e: string | undefined) => {
    const pd = pendingRef.current;
    return pd && pd.entity === e && Date.now() - pd.at < 4000 ? pd : null;
  };
  const shownPending = pendingValid(activeEntity?.entity_id);
  const setpointTemp = shownPending && shownPending.value !== sp.value ? shownPending.value : sp.value;

  const stepBy = useCallback((dir: 1 | -1) => {
    if (!activeEntity) return;
    const pd = pendingValid(activeEntity.entity_id);
    const base = pd ? pd.value : sp.value;
    if (base == null) return;
    const next = stepSetpoint(base, dir, sp);
    if (next === base) return;
    pendingRef.current = { entity: activeEntity.entity_id, value: next, at: Date.now() };
    setPendingTick((n) => n + 1);
    void callService('climate', 'set_temperature', { temperature: next }, { entity_id: activeEntity.entity_id })
      .catch(() => { pendingRef.current = null; setPendingTick((n) => n + 1); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntity, sp.value, sp.step, sp.min, sp.max]);
  const handleDown = useCallback(() => stepBy(-1), [stepBy]);
  const handleUp = useCallback(() => stepBy(1), [stepBy]);

  // No climate entities found — show the card with a prompt to hide it
  if (climateRooms.length === 0 || !activeRoom || !activeEntity) {
    return (
      <Card className="climate-card">
        <div className="climate-card__header">
          <div className="climate-card__title-row">
            <span className="climate-card__icon-chip" aria-hidden="true">
              <Thermometer size={16} strokeWidth={1.75} />
            </span>
            <span className="climate-card__title">{t('home.climate.title')}</span>
          </div>
        </div>
        <div className="climate-card__empty">
          <Thermometer size={28} strokeWidth={1.5} className="climate-card__empty-icon" />
          <p className="climate-card__empty-text">{t('home.climate.emptyTitle')}</p>
          <p className="climate-card__empty-sub">
            {t('home.climate.emptyDescription')}
          </p>
        </div>
      </Card>
    );
  }

  const colorKey = hvacColorKey(activeEntity);
  const gaugeColor = HVAC_GAUGE_COLOR[colorKey];
  const chipKey = chipColorKey(climateRooms);

  // Gauge centre label — what the unit is currently doing
  const hvacAction = activeEntity.attributes.hvac_action as string | undefined;
  const gaugeLabel = hvacAction
    ? sl('climate', hvacAction, { attribute: 'hvac_action' })
    : sl('climate', activeEntity.state);

  const isOff = activeEntity.state === 'off';

  return (
    <Card className="climate-card">
      {/* Header */}
      <div className="climate-card__header">
        <div className="climate-card__title-row">
          <span className={`climate-card__icon-chip climate-card__icon-chip--${chipKey}`} aria-hidden="true">
            <Thermometer size={16} strokeWidth={1.75} />
          </span>
          <span className="climate-card__title">{t('home.climate.title')}</span>
        </div>
        {onSeeAll && (
          <button
            className="climate-card__link"
            type="button"
            onClick={onSeeAll}
            aria-label={t('home.climate.seeAllAria')}
          >
            {t('home.climate.seeAll')}
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="card-scroll-body card-scroll-wrap">
      {/* Controls — top, reflect selected room */}
      <div className="climate-card__gauge-wrap" data-hvac={colorKey}>
        <ArcGauge value={currentTemp} label={gaugeLabel} size={128} fillColor={gaugeColor} {...gaugeRange(sp)} />
        <div className="climate-card__controls">
          <button
            className="climate-card__step-btn"
            onClick={handleDown}
            disabled={isOff || setpointTemp == null || setpointTemp <= sp.min}
            aria-label={t('home.climate.lowerAria')}
            type="button"
          >
            <Minus size={14} strokeWidth={2.5} />
          </button>
          <span className="climate-card__setpoint">
            {setpointTemp == null ? '–' : `${setpointTemp.toFixed(sp.decimals)}°`}
          </span>
          <button
            className="climate-card__step-btn"
            onClick={handleUp}
            disabled={isOff || setpointTemp == null || setpointTemp >= sp.max}
            aria-label={t('home.climate.raiseAria')}
            type="button"
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Room list — scrollable when it exceeds the cap */}
      <ul className="climate-card__rooms" aria-label={t('home.climate.roomsAria')}>
        {climateRooms.map((entry) => {
          const entryKey = hvacColorKey(entry.entity);
          const isSelected = entry.name === activeRoom.name;
          const temp = entry.currentTemp != null
            ? `${entry.currentTemp.toFixed(1)}°`
            : '—';

          return (
            <li
              key={entry.name}
              className={`climate-card__room-row${isSelected ? ' climate-card__room-row--selected' : ''}`}
              onClick={() => setSelectedRoomName(entry.name)}
            >
              <span
                className="climate-card__room-dot"
                style={{ background: HVAC_DOT_COLOR[entryKey] }}
                aria-hidden="true"
              />
              <span className="climate-card__room-name">{entry.name}</span>
              <span className="climate-card__room-temp">{temp}</span>
            </li>
          );
        })}
      </ul>
      </div>
    </Card>
  );
}
