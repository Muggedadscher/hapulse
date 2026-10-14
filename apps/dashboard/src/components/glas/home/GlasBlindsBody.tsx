/**
 * [fork] Body of the overview's blinds card in Glas (docs/GLAS-DESIGN.md §7.12, plan docs/glas/PLAN-ETAPPE-4.md K83).
 * Phone: a little window whose blind is drawn down as far as the chosen room's covers are closed (like the blinds on
 * the room page and in "Alle anzeigen", and like Apple's Home), beside it the room, its one state ("Offen",
 * "Geschlossen", "40 % offen", "In Bewegung") and Zu / Stopp / Auf, then the rooms (GlasRoomPicker) when there are two
 * or more. Desktop: a row per room with a bar for how far it is open, its state and an Auf / Stopp / Zu capsule, then
 * "Alle öffnen" / "Alle schließen" for every cover of the card. Both
 * markups are rendered and the width shows one (styles/glas/home-lists.css). The rooms and their positions are
 * BlindsCard's (avgPosition = % closed; garage doors and unavailable covers are already left out there).
 */

import React, { useMemo } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp } from 'lucide-react';
import type { HassEntity } from '@hapulse/core';
import { callService } from '../../../ha/service';
import { GlasRoomPicker } from './GlasRoomPicker';
import { useLocale, useT } from '../../../i18n/useT';

export interface GlasBlindsRoom {
  name: string;
  entities: readonly HassEntity[];
  /** 0–100: how far the room's covers are closed on average. */
  avgPosition: number;
  anyMoving: boolean;
}

interface GlasBlindsBodyProps {
  room: GlasBlindsRoom;
  rooms: readonly GlasBlindsRoom[];
  onSelect: (name: string) => void;
}

type CoverService = 'open_cover' | 'stop_cover' | 'close_cover';

function act(entities: readonly HassEntity[], service: CoverService) {
  if (entities.length === 0) return;
  void callService('cover', service, {}, { entity_id: entities.map((e) => e.entity_id) });
}

/** The filled stop square of the sketches. */
function StopGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="5" y="5" width="14" height="14" rx="2.5" />
    </svg>
  );
}

export function GlasBlindsBody({ room, rooms, onSelect }: GlasBlindsBodyProps) {
  const t = useT();
  const locale = useLocale();
  const pct = useMemo(() => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }), [locale]);
  const closedOf = (r: GlasBlindsRoom) => Math.max(0, Math.min(100, Math.round(r.avgPosition)));
  /** One state, counted as open like everywhere else in Glas: "Offen", "Geschlossen", "40 % offen", "In Bewegung". */
  const stateOf = (r: GlasBlindsRoom) => {
    const open = 100 - closedOf(r);
    if (r.anyMoving) return t('home.blinds.state.moving');
    if (open >= 100) return t('home.blinds.state.open');
    if (open <= 0) return t('home.blinds.state.closed');
    return t('glas.blinds.openPercent', { percent: pct.format(open / 100) });
  };
  const closed = closedOf(room);
  const state = stateOf(room);
  const all = rooms.flatMap((r) => r.entities);

  return (
    <>
      <div className="g-blinds__phone">
        <div className="g-ctl g-ctl--blinds">
          <span className="g-blind" aria-hidden="true">
            <span className="g-blind__shade" style={{ '--g-closed': closed } as React.CSSProperties} />
          </span>
          <div className="g-ctl__side">
            <span className="g-ctl__title">{room.name}</span>
            <span className="g-ctl__sub">{state}</span>
            <div className="g-ctl__buttons" role="group" aria-label={t('glas.blinds.roomAria', { room: room.name })}>
              <button
                type="button"
                className="g-ctl__btn"
                onClick={() => act(room.entities, 'close_cover')}
                aria-label={t('home.blinds.closeAria')}
              >
                <ArrowDown size={18} strokeWidth={2.25} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="g-ctl__btn"
                onClick={() => act(room.entities, 'stop_cover')}
                aria-label={t('home.blinds.stopAria')}
              >
                <StopGlyph />
              </button>
              <button
                type="button"
                className="g-ctl__btn"
                onClick={() => act(room.entities, 'open_cover')}
                aria-label={t('home.blinds.openAria')}
              >
                <ArrowUp size={18} strokeWidth={2.25} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        {/* one room has nothing to choose: the list would only repeat it */}
        {rooms.length > 1 && (
          <GlasRoomPicker
            label={t('glas.blinds.pickAria')}
            selected={room.name}
            onSelect={onSelect}
            rows={rooms.map((r) => ({ key: r.name, name: r.name, value: stateOf(r) }))}
          />
        )}
      </div>
      <div className="g-blinds__desk">
        <ul className="g-blinds__rows" aria-label={t('home.blinds.roomsAria')}>
          {rooms.map((r) => {
            const open = 100 - closedOf(r);
            return (
              <li key={r.name} className="g-blinds__row">
                <span className="g-blinds__info">
                  <span className="g-blinds__name">{r.name}</span>
                  <span className="g-blinds__meta">
                    <span className="g-blinds__bar" aria-hidden="true">
                      <span className="g-blinds__fill" style={{ transform: `scaleX(${open / 100})` }} />
                    </span>
                    <span className="g-blinds__state">{stateOf(r)}</span>
                  </span>
                </span>
                <span className="g-blinds__caps" role="group" aria-label={t('glas.blinds.roomAria', { room: r.name })}>
                  <button
                    type="button"
                    className="g-blinds__btn"
                    onClick={() => act(r.entities, 'open_cover')}
                    aria-label={t('cards.cover.open')}
                    title={t('cards.cover.open')}
                  >
                    <ChevronUp size={18} strokeWidth={2.25} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="g-blinds__btn"
                    onClick={() => act(r.entities, 'stop_cover')}
                    aria-label={t('cards.cover.stop')}
                    title={t('cards.cover.stop')}
                  >
                    <StopGlyph />
                  </button>
                  <button
                    type="button"
                    className="g-blinds__btn"
                    onClick={() => act(r.entities, 'close_cover')}
                    aria-label={t('cards.cover.close')}
                    title={t('cards.cover.close')}
                  >
                    <ChevronDown size={18} strokeWidth={2.25} aria-hidden="true" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="g-blinds__all">
          <button type="button" className="g-blinds__all-btn" onClick={() => act(all, 'open_cover')}>
            {t('glas.blinds.openAll')}
          </button>
          <button type="button" className="g-blinds__all-btn" onClick={() => act(all, 'close_cover')}>
            {t('glas.blinds.closeAll')}
          </button>
        </div>
      </div>
    </>
  );
}
