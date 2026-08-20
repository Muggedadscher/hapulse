import React from 'react';
import { Battery, BatteryLow, BatteryMedium, BatteryFull, BatteryWarning } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { Card } from '../ui/Card';
import type { HassEntity } from '@hapulse/core';
import './BatteriesCard.css';

interface BatteriesCardProps {
  batteries: HassEntity[];
}

function batteryLevel(entity: HassEntity): number {
  return Math.min(100, Math.max(0, Math.round(parseFloat(entity.state))));
}

function batteryColorClass(pct: number): string {
  if (pct <= 10)  return 'bat-row__bar-fill--critical';
  if (pct <= 25)  return 'bat-row__bar-fill--low';
  if (pct <= 50)  return 'bat-row__bar-fill--medium';
  return 'bat-row__bar-fill--ok';
}

function batteryTextClass(pct: number): string {
  if (pct <= 10)  return 'bat-row__pct--critical';
  if (pct <= 25)  return 'bat-row__pct--low';
  return '';
}

function BatteryIcon({ pct }: { pct: number }) {
  const props = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const;
  if (pct <= 10)  return <BatteryWarning {...props} />;
  if (pct <= 25)  return <BatteryLow {...props} />;
  if (pct <= 60)  return <BatteryMedium {...props} />;
  return <BatteryFull {...props} />;
}

export function BatteriesCard({ batteries }: BatteriesCardProps) {
  const t = useT();
  if (batteries.length === 0) return null;

  const lowCount = batteries.filter((e) => batteryLevel(e) <= 20).length;

  return (
    <Card className="batteries-card">
      <div className="batteries-card__header">
        <div className="batteries-card__title-row">
          <span
            className={`batteries-card__icon-chip${lowCount > 0 ? ' batteries-card__icon-chip--warn' : ''}`}
            aria-hidden="true"
          >
            <Battery size={16} strokeWidth={1.75} />
          </span>
          <span className="batteries-card__title">{t('system.batteries.title')}</span>
        </div>
        {lowCount > 0 && (
          <span className="batteries-card__low-badge">
            {t('system.batteries.lowCount', { count: lowCount })}
          </span>
        )}
      </div>

      <ul className="bat-list" aria-label={t('system.batteries.listAria')}>
        {batteries.map((entity) => {
          const pct  = batteryLevel(entity);
          const name = (entity.attributes.friendly_name ?? entity.entity_id.split('.')[1]!)
            .replace(/_/g, ' ')
            .replace(/\bbattery\b/gi, '')
            .trim() || entity.entity_id.split('.')[1]!;

          return (
            <li key={entity.entity_id} className="bat-row">
              <span
                className={`bat-row__icon${pct <= 25 ? ' bat-row__icon--warn' : ' bat-row__icon--ok'}`}
                aria-hidden="true"
              >
                <BatteryIcon pct={pct} />
              </span>
              <span className="bat-row__name" title={name}>{name}</span>
              <div className="bat-row__bar" aria-hidden="true">
                <div
                  className={`bat-row__bar-fill ${batteryColorClass(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`bat-row__pct ${batteryTextClass(pct)}`}>{pct}%</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
