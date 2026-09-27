/**
 * [fork] GarageCard — a garage door / gate as an entity card, built like LockCard:
 * status chip (green closed, red open/moving, amber unreachable), HA's own
 * state wording and ONE button — Open (asks first) or Close. While the door
 * moves the button becomes Stop if the door supports it, otherwise it is off.
 */

import React from 'react';
import { garageCanAct, garageCanStop, garageStatus } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import { Card } from '../ui/Card';
import { useT, useStateLabel } from '../../i18n/useT';
import { GarageIcon, garageTone } from './GarageIcon';
import { useGarageAction } from './GarageConfirm';
import './garage.css';

interface GarageCardProps {
  entity: HassEntity;
  name: string;
}

export function GarageCard({ entity, name }: GarageCardProps) {
  const t = useT();
  const sl = useStateLabel();
  const { request, stop, dialog } = useGarageAction();
  const tone = garageTone(entity.state);
  const deviceClass = entity.attributes['device_class'] as string | undefined;
  const canStop = garageCanStop(entity);
  // Next logical action: a closed (or closing) door opens, everything else closes.
  const service = garageStatus(entity.state) === 'closed' || entity.state === 'closing' ? 'open' : 'close';
  const label = canStop ? t('garage.stop') : service === 'open' ? t('garage.open') : t('garage.close');

  return (
    <Card className="garage-card">
      <div className={`icon-chip garage-card__chip garage--${tone}`}>
        <GarageIcon entity={entity} size={20} />
      </div>

      <div className="garage-card__info">
        <div className="garage-card__name">{name}</div>
        <div className={`garage-card__state garage-text--${tone}`}>
          {sl('cover', entity.state, { deviceClass })}
        </div>
      </div>

      <button
        type="button"
        className="garage-card__btn"
        onClick={() => {
          if (canStop) stop(entity);
          else request(service, [entity]);
        }}
        disabled={!canStop && !garageCanAct(entity, service)}
        aria-label={`${label}: ${name}`}
      >
        {label}
      </button>
      {dialog}
    </Card>
  );
}
