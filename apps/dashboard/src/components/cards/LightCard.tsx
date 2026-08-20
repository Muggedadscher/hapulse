import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { Card } from '../ui/Card';
import { callService } from '../../ha/service';
import { useT } from '../../i18n/useT';
import type { HassEntity } from '@hapulse/core';
import './cards.css';

interface LightCardProps {
  entity: HassEntity;
  name: string;
}

export function LightCard({ entity, name }: LightCardProps) {
  const t = useT();
  const isOn = entity.state === 'on';
  const brightness = entity.attributes.brightness as number | undefined;
  const colorTempKelvin = entity.attributes.color_temp_kelvin as number | undefined;
  const minKelvin = entity.attributes.min_color_temp_kelvin as number | undefined ?? 2200;
  const maxKelvin = entity.attributes.max_color_temp_kelvin as number | undefined ?? 6500;
  const supportedModes = entity.attributes.supported_color_modes as string[] | undefined ?? [];
  const supportsColorTempOnly = supportedModes.includes('color_temp');
  const supportsBrightness =
    supportedModes.length > 0 &&
    !supportedModes.every((m) => m === 'onoff');

  const entityId = entity.entity_id;

  // Optimistic local state — updates immediately on drag, syncs from entity when not dragging
  const [localBrightness, setLocalBrightness] = useState(brightness ?? 128);
  const [localColorTemp, setLocalColorTemp] = useState(colorTempKelvin ?? Math.round((minKelvin + maxKelvin) / 2));
  const brightnessDragging = useRef(false);
  const colorTempDragging = useRef(false);

  useEffect(() => {
    if (!brightnessDragging.current && brightness != null) setLocalBrightness(brightness);
  }, [brightness]);

  useEffect(() => {
    if (!colorTempDragging.current && colorTempKelvin != null) setLocalColorTemp(colorTempKelvin);
  }, [colorTempKelvin]);

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

  const handleBrightnessCommit = useCallback((e: React.PointerEvent<HTMLInputElement>) => {
    brightnessDragging.current = false;
    void callService('light', 'turn_on', { brightness: parseInt((e.target as HTMLInputElement).value, 10) }, { entity_id: entityId });
  }, [entityId]);

  const handleColorTempChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    colorTempDragging.current = true;
    setLocalColorTemp(parseInt(e.target.value, 10));
  }, []);

  const handleColorTempCommit = useCallback((e: React.PointerEvent<HTMLInputElement>) => {
    colorTempDragging.current = false;
    void callService('light', 'turn_on', { color_temp_kelvin: parseInt((e.target as HTMLInputElement).value, 10) }, { entity_id: entityId });
  }, [entityId]);

  const brightnessPercent = Math.round((localBrightness / 255) * 100);
  const brightnessRatio = localBrightness / 255;
  const colorTempRatio = (localColorTemp - minKelvin) / (maxKelvin - minKelvin);

  return (
    <Card
      active={isOn}
      className="light-card"
      onClick={handleToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle(e);
        }
      }}
    >
      {/* ── Header row ── */}
      <div className="light-card__header">
        {/* Icon chip */}
        <div className={`icon-chip light-card__chip${isOn ? ' light-card__chip--on' : ''}`}>
          <Lightbulb size={20} strokeWidth={1.75} />
        </div>

        {/* Name + brightness subtitle */}
        <div className="light-card__text">
          <span className="light-card__name">{name}</span>
          {isOn && supportsBrightness && (
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

      {/* ── Sliders (brightness + color temp) ── */}
      {isOn && (supportsBrightness || supportsColorTempOnly) && (
        <div className="light-card__sliders" onClick={(e) => e.stopPropagation()}>
          {supportsBrightness && (
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
                  aria-label={t('cards.light.brightness')}
                />
              </div>
            </div>
          )}
          {isOn && supportsColorTempOnly && (
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
                  aria-label={t('cards.light.colorTemperatureAria')}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
