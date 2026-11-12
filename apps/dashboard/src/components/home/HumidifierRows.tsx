/**
 * [fork] The dehumidifiers (and humidifiers) of the rooms under the overview's climate card: a short heading
 * „Luftfeuchte“, then a row per device with its name, what it does in HA's own words („Entfeuchtung“, „Leerlauf“,
 * „Aus“; core humidifier.ts) and the current humidity. A tap opens the device's detail, whose control is the
 * HumidifierCard (target −/+, On/Off). Only devices with a room (HA area or the device's area), like the thermostats.
 * Klassisch uses the card's room rows (HumidifierRows.css), Glas the rows of the room choice (styles/glas/humidifier.css).
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { currentHumidity, humidifierTone } from '@hapulse/core';
import type { HassEntity, HassEntityMap, Room } from '@hapulse/core';
import { useLocale, useStateLabel, useT } from '../../i18n/useT';
import { useUIStore } from '../../stores/uiStore';
import './HumidifierRows.css';

/** The rooms' humidifier entities, in room order. */
export function roomHumidifiers(rooms: readonly Room[], entities: HassEntityMap): HassEntity[] {
  const seen = new Set<string>();
  const out: HassEntity[] = [];
  for (const room of rooms) {
    for (const id of room.domains['humidifier'] ?? []) {
      const entity = entities[id];
      if (!entity || seen.has(id)) continue;
      seen.add(id);
      out.push(entity);
    }
  }
  return out;
}

interface HumidifierRowsProps {
  humidifiers: readonly HassEntity[];
  glas: boolean;
}

export function HumidifierRows({ humidifiers, glas }: HumidifierRowsProps) {
  const t = useT();
  const sl = useStateLabel();
  const locale = useLocale();
  const openEntityDetail = useUIStore((s) => s.openEntityDetail);
  if (humidifiers.length === 0) return null;

  const pct = (v: number | null) =>
    v == null ? '—' : new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(v / 100);

  const rows = humidifiers.map((entity) => {
    const deviceClass = typeof entity.attributes['device_class'] === 'string' ? (entity.attributes['device_class'] as string) : undefined;
    const action = typeof entity.attributes['action'] === 'string' ? (entity.attributes['action'] as string) : undefined;
    const label = action
      ? sl('humidifier', action, { attribute: 'action', deviceClass })
      : sl('humidifier', entity.state, { deviceClass });
    const name = (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;
    return { id: entity.entity_id, name, label, tone: humidifierTone(entity), value: pct(currentHumidity(entity)) };
  });

  const title = t('home.climate.humidity');

  if (glas) {
    return (
      <div className="g-humid">
        <h3 className="g-humid__title">{title}</h3>
        <div className="g-pick g-pick--humid" role="list" aria-label={title}>
          {rows.map((r) => (
            <div key={r.id} role="listitem">
              <button type="button" className="g-pick__row" onClick={() => openEntityDetail(r.id)}>
                <span className="g-pick__line">
                  <span className="g-pick__name">{r.name}</span>
                  <span className="g-pick__note g-humid__state" data-tone={r.tone}>{r.label}</span>
                  <span className="g-pick__value">{r.value}</span>
                  <ChevronRight className="g-humid__chev" size={16} strokeWidth={2.25} aria-hidden="true" />
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="climate-card__humid">
      <h3 className="climate-card__humid-title">{title}</h3>
      <ul className="climate-card__rooms" aria-label={title}>
        {rows.map((r) => (
          <li key={r.id} className="climate-card__room-row climate-card__humid-row">
            <button type="button" className="climate-card__humid-btn" onClick={() => openEntityDetail(r.id)}>
              <span className="climate-card__room-dot climate-card__humid-dot" data-tone={r.tone} aria-hidden="true" />
              <span className="climate-card__room-name">{r.name}</span>
              <span className="climate-card__humid-state" data-tone={r.tone}>{r.label}</span>
              <span className="climate-card__room-temp">{r.value}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
