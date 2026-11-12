/**
 * [fork] Card for a humidifier or dehumidifier (`humidifier.*`, e.g. a generic hygrostat on a plug).
 *
 * Built like the ClimateCard and with its classes, so both styles show it like a thermostat: the device's name, below
 * it what it does in HA's own words (attribute `action`, German: "Entfeuchtung" while it runs, "Leerlauf" while it waits because
 * the room is dry enough, "Aus"), the current and the target humidity with −/+, and On/Off. In Glas the card is
 * tinted while the device works (`data-tone="cool"`, like a cooling thermostat). Rules in core `humidifier.ts`.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Droplets, Power } from 'lucide-react';
import { Card } from '../ui/Card';
import { callService } from '../../ha/service';
import { useLocale, useStateLabel, useT } from '../../i18n/useT';
import { currentHumidity, humidifierTone, humiditySetpoint, stepHumidity } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import './cards.css';
import { useIsGlas } from '../../app/glas/useUiStyle';

interface HumidifierCardProps {
  entity: HassEntity;
  name: string;
}

const GLAS_TONE = { active: 'cool', idle: 'idle', off: 'off' } as const;

export function HumidifierCard({ entity, name }: HumidifierCardProps) {
  const t = useT();
  const locale = useLocale();
  const sl = useStateLabel();
  const glas = useIsGlas();
  const entityId = entity.entity_id;
  const isOn = entity.state === 'on';
  const deviceClass = typeof entity.attributes['device_class'] === 'string' ? (entity.attributes['device_class'] as string) : undefined;
  const action = typeof entity.attributes['action'] === 'string' ? (entity.attributes['action'] as string) : undefined;
  const modes = Array.isArray(entity.attributes['available_modes']) ? (entity.attributes['available_modes'] as string[]) : [];
  const mode = typeof entity.attributes['mode'] === 'string' ? (entity.attributes['mode'] as string) : undefined;
  const current = currentHumidity(entity);
  const sp = humiditySetpoint(entity.attributes as Record<string, unknown>);

  // Optimistic target, synced from the entity (as in ClimateCard); the call stays outside the state updater
  const [localTarget, setLocalTarget] = useState(sp.value);
  useEffect(() => { setLocalTarget(sp.value); }, [sp.value]);
  const localRef = useRef(localTarget);
  localRef.current = localTarget;

  const handleStep = useCallback(
    (dir: 1 | -1) => {
      const from = localRef.current;
      if (from == null) return;
      const next = stepHumidity(from, dir, sp);
      if (next === from) return;
      localRef.current = next;
      setLocalTarget(next);
      void callService('humidifier', 'set_humidity', { humidity: next }, { entity_id: entityId }).catch(() => {
        // not set: back to what HA holds
        localRef.current = sp.value;
        setLocalTarget(sp.value);
      });
    },
    [entityId, sp]
  );

  const setPower = useCallback(
    (on: boolean) => { void callService('humidifier', on ? 'turn_on' : 'turn_off', {}, { entity_id: entityId }); },
    [entityId]
  );

  const setMode = useCallback(
    (next: string) => { void callService('humidifier', 'set_mode', { mode: next }, { entity_id: entityId }); },
    [entityId]
  );

  const actionLabel = action
    ? sl('humidifier', action, { attribute: 'action', deviceClass })
    : sl('humidifier', entity.state, { deviceClass });
  // the language's own percent (de "60 %", en "60%")
  const pct = (v: number) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(v / 100);

  return (
    <Card className="climate-card humidifier-card" data-tone={glas ? GLAS_TONE[humidifierTone(entity)] : undefined}>
      <div className="climate-card__header">
        <div className="icon-chip climate-card__chip">
          <Droplets size={20} strokeWidth={1.75} />
        </div>
        <div className="climate-card__header-text">
          <div className="climate-card__name">{name}</div>
          {actionLabel && <div className="climate-card__action">{actionLabel}</div>}
        </div>
      </div>

      <div className="climate-card__temps">
        <div className="climate-card__current">
          <span className="climate-card__current-label">{t('cards.climate.current')}</span>
          <span className="climate-card__current-value">{current != null ? pct(current) : '—'}</span>
        </div>

        {isOn && localTarget != null && (
          <div className="climate-card__target">
            <span className="climate-card__target-label">{t('cards.climate.target')}</span>
            <div className="climate-card__target-control">
              <button
                className="climate-card__step-btn"
                onClick={() => handleStep(-1)}
                aria-label={t('cards.humidifier.decreaseAria')}
                type="button"
              >
                −
              </button>
              <span className="climate-card__target-value data-font">{pct(localTarget)}</span>
              <button
                className="climate-card__step-btn"
                onClick={() => handleStep(1)}
                aria-label={t('cards.humidifier.increaseAria')}
                type="button"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="climate-card__modes">
        {(['on', 'off'] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={`climate-card__mode-pill${entity.state === s ? ' climate-card__mode-pill--active' : ''}`}
            onClick={() => setPower(s === 'on')}
            aria-pressed={entity.state === s}
          >
            {s === 'off' ? <Power size={12} strokeWidth={1.75} /> : <Droplets size={12} strokeWidth={1.75} />}
            {sl('humidifier', s, { deviceClass })}
          </button>
        ))}
        {isOn && modes.map((m) => (
          <button
            key={`mode-${m}`}
            type="button"
            className={`climate-card__mode-pill${m === mode ? ' climate-card__mode-pill--active' : ''}`}
            onClick={() => setMode(m)}
            aria-pressed={m === mode}
          >
            {sl('humidifier', m, { attribute: 'mode', deviceClass })}
          </button>
        ))}
      </div>
    </Card>
  );
}
