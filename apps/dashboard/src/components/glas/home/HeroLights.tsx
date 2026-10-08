/**
 * [fork] HeroLights — the lights of the main room as circles in Glas from 900 px (docs/GLAS-DESIGN.md §7.8, user
 * decision E8, plan docs/glas/PLAN-ETAPPE-4.md K83). The circle switches the light (and pulses), the name below opens
 * its detail; 5 columns when the card is wide (M/L), 3 when narrow (S), a container query in
 * styles/glas/home-cards.css. The same lights as the card's light pill (the room's lights without the hidden ones).
 * Clicks and keys stay here: the card around them opens the room. Switching tells the card (`onAct`), which then
 * keeps its room although another one may now be more active.
 */

import React, { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { formatEntityState, formatNumber, lightPercent } from '@hapulse/core';
import type { HassEntity, HassEntityMap } from '@hapulse/core';
import { callService } from '../../../ha/service';
import { useUIStore } from '../../../stores/uiStore';
import { useLocale, useStateLabel, useT } from '../../../i18n/useT';

interface HeroLightsProps {
  ids: readonly string[];
  entities: HassEntityMap;
  roomName: string;
  /** A light was switched here. */
  onAct: () => void;
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export function HeroLights({ ids, entities, roomName, onAct }: HeroLightsProps) {
  const t = useT();
  const sl = useStateLabel();
  const locale = useLocale();
  const openEntityDetail = useUIStore((s) => s.openEntityDetail);
  // the light switched last pulses; a/b starts the animation again on every tap
  const [pulse, setPulse] = useState<{ id: string; n: number } | null>(null);
  const lights = ids.map((id) => entities[id]).filter((e): e is HassEntity => e != null);
  if (lights.length === 0) return null;

  return (
    <div className="g-hero-lights" role="group" aria-label={t('glas.hero.lightsAria', { name: roomName })} onClick={stop} onKeyDown={stop}>
      {lights.map((entity) => {
        const id = entity.entity_id;
        const on = entity.state === 'on';
        const name = entity.attributes.friendly_name ?? id;
        const pct = lightPercent(entity);
        const state = pct !== null ? `${formatNumber(pct, locale)} %` : formatEntityState(entity, locale, sl);
        return (
          <div
            key={id}
            className="g-hero-light"
            data-on={on || undefined}
            data-pulse={pulse?.id === id ? (pulse.n % 2 ? 'a' : 'b') : undefined}
          >
            <button
              type="button"
              className="g-hero-light__toggle"
              aria-pressed={on}
              aria-label={name}
              disabled={entity.state === 'unavailable'}
              onClick={() => {
                setPulse((p) => ({ id, n: (p?.n ?? 0) + 1 }));
                onAct();
                void callService('light', 'toggle', {}, { entity_id: id });
              }}
            >
              <span className="g-hero-light__circle" aria-hidden="true">
                <Lightbulb size={22} strokeWidth={1.75} />
              </span>
            </button>
            <button
              type="button"
              className="g-hero-light__open"
              aria-haspopup="dialog"
              aria-label={t('glas.home.detailAria', { name, state })}
              onClick={() => openEntityDetail(id)}
            >
              <span className="g-hero-light__name">{name}</span>
              <span className="g-hero-light__state">{state}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
