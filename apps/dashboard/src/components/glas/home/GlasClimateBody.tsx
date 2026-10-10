/**
 * [fork] Body of the overview's climate card in Glas (docs/GLAS-DESIGN.md §7.11, plan docs/glas/PLAN-ETAPPE-4.md K83).
 * The ring shows the chosen room's setpoint in the colour of what the thermostat does (heating orange, cooling blue,
 * auto green, else grey); the desktop adds a marker on the ring for the current temperature. Phone: ring with the
 * setpoint and "Soll", beside it room, current temperature, what it does and − / +. Desktop: a bigger ring with
 * setpoint and action inside, − / + outside below. Then the rooms (GlasRoomPicker). One markup, the layout per width in
 * styles/glas/home-lists.css. The setpoint rules (step, min, max, quick taps) stay in ClimateCard.
 */

import React from 'react';
import { Flame, Minus, Plus, Power, RotateCw, Snowflake } from 'lucide-react';
import { climateTone, formatNumber } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import type { ClimateSetpoint } from '../../home/climateLogic';
import { GlasArc } from './GlasArc';
import { GlasRoomPicker } from './GlasRoomPicker';
import { RollingValue } from '../RollingValue';
import { useLocale, useStateLabel, useT } from '../../../i18n/useT';

export interface GlasClimateRoom {
  name: string;
  entity: HassEntity;
  currentTemp: number | null;
  /** the room sensor's unit; null when `currentTemp` is the thermostat's own reading (in HA's unit) */
  currentUnit: string | null;
}

interface GlasClimateBodyProps {
  room: GlasClimateRoom;
  rooms: readonly GlasClimateRoom[];
  onSelect: (name: string) => void;
  /** The setpoint shown (the value just sent while HA has not answered yet). */
  setpoint: number | null;
  sp: ClimateSetpoint;
  onDown: () => void;
  onUp: () => void;
}

/** Ring scale of the sketches: 10–30 °C (50–86 °F). */
const range = (sp: ClimateSetpoint) => (sp.fahrenheit ? { min: 50, max: 86 } : { min: 10, max: 30 });

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function GlasClimateBody({ room, rooms, onSelect, setpoint, sp, onDown, onUp }: GlasClimateBodyProps) {
  const t = useT();
  const sl = useStateLabel();
  const locale = useLocale();
  const entity = room.entity;
  const off = entity.state === 'off';
  const tone = off ? 'off' : climateTone(entity);
  const hvacAction = entity.attributes.hvac_action as string | undefined;
  // what it does (heating, cooling, idle); off and auto name the mode, like the colour
  const action =
    hvacAction && tone !== 'off' && tone !== 'auto'
      ? sl('climate', hvacAction, { attribute: 'hvac_action' })
      : sl('climate', entity.state);
  // "21,5 °C": a sensor in its own unit, a thermostat in HA's (sp.unit); "21,5°" while HA's unit is not known yet
  const temp = (v: number | null, sensorUnit: string | null) => {
    if (v == null) return '–';
    const n = formatNumber(v, locale, { minDecimals: 1, maxDecimals: 1 });
    const unit = sensorUnit ?? sp.unit;
    return unit ? `${n} ${unit}` : `${n}°`;
  };
  const target =
    setpoint == null ? '–' : `${formatNumber(setpoint, locale, { minDecimals: sp.decimals, maxDecimals: sp.decimals })}°`;
  const { min, max } = range(sp);
  const frac = setpoint == null ? 0 : clamp01((setpoint - min) / (max - min));
  const current = room.currentTemp;
  // the marker on the desktop ring (168 × 168, r 70): the current temperature on the same scale
  const angle = current == null ? null : ((135 + 270 * clamp01((current - min) / (max - min))) * Math.PI) / 180;
  const Icon = off ? Power : tone === 'cool' ? Snowflake : tone === 'auto' ? RotateCw : Flame;

  return (
    <>
      <div className="g-ctl g-ctl--climate" data-tone={tone}>
        <div
          className="g-ctl__gauge"
          role="img"
          aria-label={t('glas.climate.gaugeAria', { room: room.name, target, current: temp(current, room.currentUnit), action })}
        >
          <GlasArc frac={frac} className="g-ctl__arc" />
          <GlasArc frac={frac} big className="g-ctl__arc g-ctl__arc--big" />
          {angle !== null && (
            <span
              className="g-ctl__marker"
              aria-hidden="true"
              style={{ left: 84 + 70 * Math.cos(angle), top: 84 + 70 * Math.sin(angle) }}
            />
          )}
          <span className="g-ctl__center" aria-hidden="true">
            {/* a new room is a new value, not a step: no roll */}
            <RollingValue key={room.name} className="g-ctl__value" text={target} value={setpoint ?? 0} />
            <span className="g-ctl__label">{t('glas.climate.target')}</span>
            <span className="g-ctl__center-sub">{action}</span>
          </span>
        </div>
        <div className="g-ctl__side">
          <span className="g-ctl__title">{room.name}</span>
          <span className="g-ctl__sub">
            {t('cards.climate.current')} {temp(current, room.currentUnit)}
          </span>
          <span className="g-ctl__action">
            <span className="g-ctl__action-circle" aria-hidden="true">
              <Icon size={14} strokeWidth={2.25} />
            </span>
            {action}
          </span>
          <div className="g-ctl__buttons" role="group" aria-label={t('glas.climate.stepAria', { room: room.name })}>
            <button
              type="button"
              className="g-ctl__btn"
              onClick={onDown}
              disabled={off || setpoint == null || setpoint <= sp.min}
              aria-label={t('home.climate.lowerAria')}
            >
              <Minus size={18} strokeWidth={2.25} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="g-ctl__btn"
              onClick={onUp}
              disabled={off || setpoint == null || setpoint >= sp.max}
              aria-label={t('home.climate.raiseAria')}
            >
              <Plus size={18} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <GlasRoomPicker
        label={t('glas.climate.pickAria')}
        selected={room.name}
        onSelect={onSelect}
        rows={rooms.map((r) => {
          const rTone = r.entity.state === 'off' ? 'off' : climateTone(r.entity);
          const rAction = r.entity.attributes.hvac_action as string | undefined;
          return {
            key: r.name,
            name: r.name,
            value: temp(r.currentTemp, r.currentUnit),
            note:
              rTone === 'heat' || rTone === 'cool' ? (
                <span className="g-pick__note" data-tone={rTone}>
                  {sl('climate', rAction ?? r.entity.state, rAction ? { attribute: 'hvac_action' } : undefined)}
                </span>
              ) : undefined,
          };
        })}
      />
    </>
  );
}
