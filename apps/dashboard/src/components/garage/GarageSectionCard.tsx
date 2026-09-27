/**
 * [fork] GarageSectionCard — the Security page section for garage doors / gates,
 * built like LocksSectionCard: "x/y closed", Close All (direct) and Open All
 * (asks first; only doors that can act right now), then the rows.
 */

import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { garageSummary, garageTargets } from '@hapulse/core';
import type { HassEntity, Room } from '@hapulse/core';
import { Card } from '../ui/Card';
import { useT } from '../../i18n/useT';
import { GarageList } from './GarageList';
import { useGarageAction } from './GarageConfirm';
import { GarageSummaryIcon } from './GarageIcon';
import { summaryTone } from './garageText';
import './garage.css';

interface GarageSectionCardProps {
  garages: HassEntity[];
  rooms: Room[];
}

export function GarageSectionCard({ garages, rooms }: GarageSectionCardProps) {
  const t = useT();
  const { request, dialog } = useGarageAction();
  const summary = garageSummary(garages);
  const tone = summaryTone(summary);

  return (
    <Card className="garage-section-card">
      <div className="garage-section-card__title-row">
        <span className={`garage-section-card__icon-chip garage--${tone}`} aria-hidden="true">
          <GarageSummaryIcon tone={tone} size={16} />
        </span>
        <span className="garage-section-card__title">{t('garage.title')}</span>
        <span className="garage-section-card__count">
          {t('garage.count', { closed: summary.closed, total: summary.total })}
        </span>
      </div>

      <div className="garage-section-card__controls">
        <button
          type="button"
          className="garage-section-card__ctrl-btn garage-section-card__ctrl-btn--close"
          onClick={() => request('close', garages)}
          disabled={garageTargets(garages, 'close').length === 0}
        >
          <ArrowDown size={15} strokeWidth={1.75} />
          {t('garage.closeAll')}
        </button>
        <button
          type="button"
          className="garage-section-card__ctrl-btn garage-section-card__ctrl-btn--open"
          onClick={() => request('open', garages)}
          disabled={garageTargets(garages, 'open').length === 0}
        >
          <ArrowUp size={15} strokeWidth={1.75} />
          {t('garage.openAll')}
        </button>
      </div>

      <div className="garage-section-card__divider" aria-hidden="true" />

      <GarageList garages={garages} rooms={rooms} />
      {dialog}
    </Card>
  );
}
