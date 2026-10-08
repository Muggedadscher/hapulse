/**
 * [fork] HeroGlance — the main room's temperature and humidity as capsules in Glas (docs/GLAS-DESIGN.md §7.8, plan
 * docs/glas/PLAN-ETAPPE-4.md K83). The values `roomSummary` shows (core `roomGlances`), each a button that opens the
 * detail of the entity it comes from. Klassisch keeps its plain chips. Clicks and keys stay here: the card around
 * them opens the room.
 */

import React from 'react';
import { Droplet, Thermometer } from 'lucide-react';
import { formatNumber, roomGlances } from '@hapulse/core';
import type { HassEntityMap, Room } from '@hapulse/core';
import { useUIStore } from '../../../stores/uiStore';
import { useLocale, useT } from '../../../i18n/useT';

interface HeroGlanceProps {
  room: Room;
  entities: HassEntityMap;
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export function HeroGlance({ room, entities }: HeroGlanceProps) {
  const t = useT();
  const locale = useLocale();
  const openEntityDetail = useUIStore((s) => s.openEntityDetail);
  const glances = roomGlances(room, entities);
  if (glances.length === 0) return null;

  return (
    <div className="hero-room-card__glance" role="group" aria-label={t('home.hero.conditionsAria')} onClick={stop} onKeyDown={stop}>
      {glances.map((g) => {
        const text =
          g.kind === 'temperature'
            ? `${formatNumber(g.value, locale, { minDecimals: 1, maxDecimals: 1 })} ${g.unit ?? '°'}`
            : `${formatNumber(g.value, locale, { maxDecimals: 0 })} %`;
        return (
          <button
            key={g.kind}
            type="button"
            className="hero-room-card__glance-chip"
            aria-haspopup="dialog"
            aria-label={t(g.kind === 'temperature' ? 'glas.hero.temperatureAria' : 'glas.hero.humidityAria', { value: text })}
            onClick={() => openEntityDetail(g.entityId)}
          >
            {g.kind === 'temperature' ? (
              <Thermometer size={14} strokeWidth={2.25} aria-hidden="true" />
            ) : (
              <Droplet size={14} strokeWidth={2.25} aria-hidden="true" />
            )}
            {text}
          </button>
        );
      })}
    </div>
  );
}
