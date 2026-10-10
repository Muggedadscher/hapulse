import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { Card } from '../ui/Card';
import { callService } from '../../ha/service';
import { useT, useLocale, useStateLabel } from '../../i18n/useT'; // [fork] useLocale, useStateLabel
import { formatEntityState, formatNumber } from '@hapulse/core'; // [fork]
import type { HassEntity } from '@hapulse/core';
import './cards.css';
import { useIsGlas } from '../../app/glas/useUiStyle'; // [fork] Glas tile: the state as text (docs/glas/PLAN-ETAPPE-5.md K91, K95)

/** Color modes that mean "this light has an adjustable RGB/hue color", as
 *  opposed to 'color_temp' (white-only warmth) or 'onoff'/'brightness'. */
const COLOR_MODES = ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'];

interface LightCardProps {
  entity: HassEntity;
  name: string;
  /** [fork] Glas detail: only colour temperature and colour under its own brightness control — no head, the card
   *  itself does not switch, nothing while the light is off (docs/glas/PLAN-ETAPPE-4.md K79). */
  colorOnly?: boolean;
}

export function LightCard({ entity, name, colorOnly }: LightCardProps) { // [fork] colorOnly
  const t = useT();
  const glas = useIsGlas(); // [fork]
  const locale = useLocale(); // [fork]
  const sl = useStateLabel(); // [fork]
  const isOn = entity.state === 'on';
  const brightness = entity.attributes.brightness as number | undefined;
  const colorTempKelvin = entity.attributes.color_temp_kelvin as number | undefined;
  const minKelvin = entity.attributes.min_color_temp_kelvin as number | undefined ?? 2200;
  const maxKelvin = entity.attributes.max_color_temp_kelvin as number | undefined ?? 6500;
  // HA normalizes whatever native color mode a light reports (rgb/rgbw/rgbww/xy)
  // into hs_color, so hue/saturation is the one representation that works
  // regardless of which of those modes the light actually uses.
  const hsColor = entity.attributes.hs_color as [number, number] | undefined;
  const supportedModes = entity.attributes.supported_color_modes as string[] | undefined ?? [];
  const supportsColorTemp = supportedModes.includes('color_temp');
  const supportsColor = supportedModes.some((m) => COLOR_MODES.includes(m));
  const supportsBrightness =
    supportedModes.length > 0 &&
    !supportedModes.every((m) => m === 'onoff');

  const entityId = entity.entity_id;

  // Optimistic local state — updates immediately on drag, syncs from entity when not dragging
  const [localBrightness, setLocalBrightness] = useState(brightness ?? 128);
  const [localColorTemp, setLocalColorTemp] = useState(colorTempKelvin ?? Math.round((minKelvin + maxKelvin) / 2));
  const [localHue, setLocalHue] = useState(hsColor?.[0] ?? 0);
  const brightnessDragging = useRef(false);
  const colorTempDragging = useRef(false);
  const hueDragging = useRef(false);

  useEffect(() => {
    if (!brightnessDragging.current && brightness != null) setLocalBrightness(brightness);
  }, [brightness]);

  useEffect(() => {
    if (!colorTempDragging.current && colorTempKelvin != null) setLocalColorTemp(colorTempKelvin);
  }, [colorTempKelvin]);

  useEffect(() => {
    if (!hueDragging.current && hsColor?.[0] != null) setLocalHue(hsColor[0]);
  }, [hsColor]);

  const handleToggle = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      void callService('light', isOn ? 'turn_off' : 'turn_on', {}, { entity_id: entityId });
    },
    [isOn, entityId]
  );

  const handleBrightnessChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    brightnessDragging.current = true;
    setLocalBrightness(parseInt(e.target.value, 10));
  }, []);

  // [fork] also on key up / blur (keyboard changes were never sent and the ref stayed 'dragging'); nothing without a change
  const handleBrightnessCommit = useCallback((e: React.SyntheticEvent<HTMLInputElement>) => {
    if (!brightnessDragging.current) return;
    brightnessDragging.current = false;
    void callService('light', 'turn_on', { brightness: parseInt((e.target as HTMLInputElement).value, 10) }, { entity_id: entityId });
  }, [entityId]);

  const handleColorTempChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    colorTempDragging.current = true;
    setLocalColorTemp(parseInt(e.target.value, 10));
  }, []);

  // [fork] also on key up / blur (keyboard changes were never sent and the ref stayed 'dragging'); nothing without a change
  const handleColorTempCommit = useCallback((e: React.SyntheticEvent<HTMLInputElement>) => {
    if (!colorTempDragging.current) return;
    colorTempDragging.current = false;
    void callService('light', 'turn_on', { color_temp_kelvin: parseInt((e.target as HTMLInputElement).value, 10) }, { entity_id: entityId });
  }, [entityId]);

  // Saturation isn't user-adjustable here (a single hue slider, not a full
  // color wheel) — the drag only moves hue, preserving whatever saturation
  // the light already reports (falling back to fully saturated for a light
  // that has never reported a color yet).
  const currentSaturation = hsColor?.[1] ?? 100;

  const handleHueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    hueDragging.current = true;
    setLocalHue(parseInt(e.target.value, 10));
  }, []);

  // [fork] also on key up / blur (keyboard changes were never sent and the ref stayed 'dragging'); nothing without a change
  const handleHueCommit = useCallback((e: React.SyntheticEvent<HTMLInputElement>) => {
    if (!hueDragging.current) return;
    hueDragging.current = false;
    const hue = parseInt((e.target as HTMLInputElement).value, 10);
    void callService('light', 'turn_on', { hs_color: [hue, currentSaturation] }, { entity_id: entityId });
  }, [entityId, currentSaturation]);

  const brightnessPercent = Math.round((localBrightness / 255) * 100);
  const brightnessRatio = localBrightness / 255;
  const colorTempRatio = (localColorTemp - minKelvin) / (maxKelvin - minKelvin);

  if (colorOnly && !(isOn && (supportsColorTemp || supportsColor))) return null; // [fork]

  return (
    <Card
      active={isOn}
      className="light-card"
      onClick={colorOnly ? undefined : handleToggle} // [fork] colorOnly
      role={colorOnly ? undefined : 'button'} // [fork]
      tabIndex={colorOnly ? undefined : 0} // [fork]
      onKeyDown={(e) => {
        if (colorOnly) return; // [fork]
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle(e);
        }
      }}
    >
      {/* ── Header row ── */}
      {!colorOnly && ( // [fork]
      <div className="light-card__header">
        {/* Icon chip */}
        <div className={`icon-chip light-card__chip${isOn ? ' light-card__chip--on' : ''}`}>
          <Lightbulb size={20} strokeWidth={1.75} />
        </div>

        {/* Name + brightness subtitle */}
        <div className="light-card__text">
          <span className="light-card__name">{name}</span>
          {glas ? ( // [fork] Glas: its switch is hidden, so the line always names the state ("An · 78 %", "Aus")
            <span className="light-card__subtitle">
              {formatEntityState(entity, locale, sl)}
              {isOn && supportsBrightness && ` · ${formatNumber(brightnessPercent, locale)} %`}
            </span>
          ) : isOn && supportsBrightness && (
            <span className="light-card__subtitle">{brightnessPercent}%</span>
          )}

        </div>

        {/* Pill toggle */}
        <label className="pill-toggle" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isOn}
            onChange={(e) => {
              e.stopPropagation();
              void callService('light', isOn ? 'turn_off' : 'turn_on', {}, { entity_id: entityId });
            }}
            aria-label={t('cards.light.toggleAria', { name })}
          />
          <span className="pill-toggle__track">
            <span className="pill-toggle__knob" />
          </span>
        </label>
      </div>
      )}{/* [fork] */}

      {/* ── Sliders (brightness + color temp + color) ── */}
      {isOn && ((supportsBrightness && !colorOnly) || supportsColorTemp || supportsColor) && ( // [fork] colorOnly
        <div className="light-card__sliders" onClick={(e) => e.stopPropagation()}>
          {supportsBrightness && !colorOnly && ( // [fork] colorOnly
            <div className="light-card__slider-row">
              <span className="light-card__slider-label">{t('cards.light.brightness')}</span>
              <div className="light-card__track">
                <div
                  className="light-card__fill"
                  style={{ width: `${Math.max(brightnessRatio * 100, 4)}%` }}
                />
                <input
                  type="range"
                  className="light-card__range"
                  min={1}
                  max={255}
                  value={localBrightness}
                  onChange={handleBrightnessChange}
                  onPointerUp={handleBrightnessCommit}
                  onKeyUp={handleBrightnessCommit}
                  onBlur={handleBrightnessCommit}
                  aria-label={t('cards.light.brightness')}
                />
              </div>
            </div>
          )}
          {supportsColorTemp && (
            <div className="light-card__slider-row">
              <span className="light-card__slider-label">{t('cards.light.colorTemp')}</span>
              <div className="light-card__track">
                <div
                  className="light-card__fill light-card__fill--temp"
                  style={{ width: `${Math.max(colorTempRatio * 100, 4)}%` }}
                />
                <input
                  type="range"
                  className="light-card__range"
                  min={minKelvin}
                  max={maxKelvin}
                  value={localColorTemp}
                  onChange={handleColorTempChange}
                  onPointerUp={handleColorTempCommit}
                  onKeyUp={handleColorTempCommit}
                  onBlur={handleColorTempCommit}
                  aria-label={t('cards.light.colorTemperatureAria')}
                />
              </div>
            </div>
          )}
          {supportsColor && (
            <div className="light-card__slider-row">
              <span className="light-card__slider-label">{t('cards.light.color')}</span>
              <input
                type="range"
                className="light-card__hue-range"
                min={0}
                max={360}
                value={localHue}
                onChange={handleHueChange}
                onPointerUp={handleHueCommit}
                  onKeyUp={handleHueCommit}
                  onBlur={handleHueCommit}
                aria-label={t('cards.light.color')}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
