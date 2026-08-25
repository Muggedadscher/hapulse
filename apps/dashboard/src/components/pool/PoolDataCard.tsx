/**
 * [fork] PoolDataCard — runtime & energy figures.
 *
 * Four numeric tiles (runtime today, energy today / this week / this month).
 * Each numeric tile opens the shared HistoryModal on tap, reusing the fork's
 * sensor-history feature so the pump's trend is one click away.
 */

import React, { useState } from 'react';
import { Clock, Zap } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatEntityState } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import { useEntity } from '../../ha/hooks';
import { useLocale, useT } from '../../i18n/useT';
import { HistoryModal } from '../history/HistoryModal';
import { POOL_ENTITIES } from './poolConfig';

interface DataTileProps {
  entity: HassEntity | undefined;
  label: string;
  icon: React.ReactNode;
  color: string;
}

function DataTile({ entity, label, icon, color }: DataTileProps) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  if (!entity) return null;

  const value = formatEntityState(entity, locale);
  const numeric = !isNaN(parseFloat(entity.state));

  const inner = (
    <>
      <span className="pool-tile__icon icon-chip" aria-hidden="true">{icon}</span>
      <span className="pool-tile__value data-font">{value}</span>
      <span className="pool-tile__label">{label}</span>
    </>
  );

  if (!numeric) return <div className="pool-tile">{inner}</div>;

  return (
    <>
      <div
        className="pool-tile pool-tile--clickable"
        role="button"
        tabIndex={0}
        aria-label={`${label} — ${value}`}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {inner}
      </div>
      <HistoryModal open={open} onClose={() => setOpen(false)} entity={entity} name={label} color={color} />
    </>
  );
}

export function PoolDataCard() {
  const t = useT();
  const runtime = useEntity(POOL_ENTITIES.runtimeToday);
  const today = useEntity(POOL_ENTITIES.consumptionToday);
  const week = useEntity(POOL_ENTITIES.consumptionWeek);
  const month = useEntity(POOL_ENTITIES.consumptionMonth);

  return (
    <Card className="pool-card pool-data">
      <div className="pool-card__head">
        <span className="pool-card__icon icon-chip" aria-hidden="true">
          <Zap size={16} strokeWidth={1.75} />
        </span>
        <h2 className="pool-card__title">{t('pool.data.title')}</h2>
      </div>

      <div className="pool-tiles">
        <DataTile entity={runtime} label={t('pool.data.runtimeToday')} icon={<Clock size={16} strokeWidth={1.75} />} color="var(--info)" />
        <DataTile entity={today} label={t('pool.data.consumptionToday')} icon={<Zap size={16} strokeWidth={1.75} />} color="var(--accent)" />
        <DataTile entity={week} label={t('pool.data.consumptionWeek')} icon={<Zap size={16} strokeWidth={1.75} />} color="var(--accent)" />
        <DataTile entity={month} label={t('pool.data.consumptionMonth')} icon={<Zap size={16} strokeWidth={1.75} />} color="var(--accent)" />
      </div>
    </Card>
  );
}
