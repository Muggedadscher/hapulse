import React, { useCallback, useEffect, useState } from 'react';
import { Thermometer, Flame, Snowflake, Wind, Power, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { callService } from '../../ha/service';
import { useT, useStateLabel } from '../../i18n/useT';
import type { HassEntity } from '@hapulse/core';
import './cards.css';

interface ClimateCardProps {
  entity: HassEntity;
  name: string;
}

const MODE_ICONS: Record<string, React.ReactNode> = {
  heat: <Flame size={12} strokeWidth={1.75} />,
  cool: <Snowflake size={12} strokeWidth={1.75} />,
  auto: <RefreshCw size={12} strokeWidth={1.75} />,
  off: <Power size={12} strokeWidth={1.75} />,
  fan_only: <Wind size={12} strokeWidth={1.75} />,
};

export function ClimateCard({ entity, name }: ClimateCardProps) {
  const t = useT();
  const sl = useStateLabel();
  const entityId = entity.entity_id;
  const currentTemp = entity.attributes.current_temperature as number | undefined;
  const targetTemp = entity.attributes.temperature as number | undefined;
  const hvacModes = entity.attributes.hvac_modes as string[] | undefined ?? [];
  const hvacAction = entity.attributes.hvac_action as string | undefined;
  const currentMode = entity.state;
  const isOff = currentMode === 'off';

  // Optimistic local temperature — updates immediately on step, syncs from entity otherwise
  const [localTemp, setLocalTemp] = useState(targetTemp ?? currentTemp ?? 20);

  useEffect(() => {
    if (targetTemp != null) setLocalTemp(targetTemp);
  }, [targetTemp]);

  const handleMode = useCallback(
    (mode: string) => {
      void callService('climate', 'set_hvac_mode', { hvac_mode: mode }, { entity_id: entityId });
    },
    [entityId]
  );

  const handleTempStep = useCallback(
    (delta: number) => {
      setLocalTemp((prev) => {
        const next = Math.round((prev + delta) * 2) / 2;
        void callService('climate', 'set_temperature', { temperature: next }, { entity_id: entityId });
        return next;
      });
    },
    [entityId]
  );

  const actionLabel = hvacAction
    ? sl('climate', hvacAction, { attribute: 'hvac_action' })
    : sl('climate', currentMode);

  return (
    <Card className="climate-card">
      {/* Header: icon chip + name/action */}
      <div className="climate-card__header">
        <div className="icon-chip climate-card__chip">
          <Thermometer size={20} strokeWidth={1.75} />
        </div>
        <div className="climate-card__header-text">
          <div className="climate-card__name">{name}</div>
          {actionLabel && (
            <div className="climate-card__action">{actionLabel}</div>
          )}
        </div>
      </div>

      {/* Temperatures */}
      <div className="climate-card__temps">
        <div className="climate-card__current">
          <span className="climate-card__current-label">{t('cards.climate.current')}</span>
          <span className="climate-card__current-value">
            {currentTemp != null ? `${currentTemp.toFixed(1)}°` : '—'}
          </span>
        </div>

        {!isOff && (
          <div className="climate-card__target">
            <span className="climate-card__target-label">{t('cards.climate.target')}</span>
            <div className="climate-card__target-control">
              <button
                className="climate-card__step-btn"
                onClick={() => handleTempStep(-0.5)}
                aria-label={t('cards.climate.decreaseAria')}
                type="button"
              >
                −
              </button>
              <span className="climate-card__target-value data-font">
                {localTemp.toFixed(1)}°
              </span>
              <button
                className="climate-card__step-btn"
                onClick={() => handleTempStep(0.5)}
                aria-label={t('cards.climate.increaseAria')}
                type="button"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mode pills */}
      {hvacModes.length > 0 && (
        <div className="climate-card__modes">
          {hvacModes.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`climate-card__mode-pill${mode === currentMode ? ' climate-card__mode-pill--active' : ''}`}
              onClick={() => handleMode(mode)}
              aria-pressed={mode === currentMode}
            >
              {MODE_ICONS[mode] ?? null}
              {sl('climate', mode)}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
