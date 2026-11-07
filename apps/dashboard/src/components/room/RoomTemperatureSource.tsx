/**
 * [fork] Where the room's temperature comes from (plan /mnt/project-files/raumtemperatur/PLAN.md). On the room page in
 * edit mode, for admins: a row with the current source and a window to choose "Automatisch" or one of the room's
 * temperature sensors and thermostats (core `roomTemperatureSources`). The choice is GLOBAL
 * (`customization.roomTemperatureSource`), so under the admin management everybody sees the same temperature on the
 * room cards, the hero and the climate card.
 *
 * A choice saves at once and the window stays open (the check moves along), so arrow keys in the radio group never
 * close it; × or Esc closes. Only shown with at least two sources — with one there is nothing to choose.
 * Glas lists the choice like the climate card's rooms (GlasRoomPicker); Klassisch has its own plain radio list.
 */

import React, { useRef, useState } from 'react';
import { Check, ChevronRight, Thermometer } from 'lucide-react';
import {
  automaticRoomTemperature,
  formatNumber,
  isRoomTemperatureSource,
  roomTemperature,
  roomTemperatureSources,
} from '@hapulse/core';
import type { HassEntityMap, Room } from '@hapulse/core';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { GlasRoomPicker } from '../glas/home/GlasRoomPicker';
import { useIsGlas } from '../../app/glas/useUiStyle';
import { useCanEdit } from '../../ha/hooks';
import { useTemperatureUnit } from '../../ha/temperatureUnit';
import { useSettingsStore } from '../../stores/settingsStore';
import { useRoomTemperatureSources } from '../../lib/roomTemperatureSource';
import { useLocale, useT } from '../../i18n/useT';
import './RoomTemperatureSource.css';

const AUTO = '';
/** Never a row key: lets a tap on "Automatisch" through while a stale choice is stored. */
const STALE = '\u0000stale';

interface RoomTemperatureSourceProps {
  room: Room;
  entities: HassEntityMap;
  /** The name the room page shows for an entity (override, else friendly name without the room's name). */
  nameOf: (entityId: string) => string;
}

export function RoomTemperatureSource({ room, entities, nameOf }: RoomTemperatureSourceProps) {
  const t = useT();
  const locale = useLocale();
  const glas = useIsGlas();
  const canEdit = useCanEdit();
  const haUnit = useTemperatureUnit();
  const stored = useRoomTemperatureSources();
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);
  const [open, setOpen] = useState(false);
  const rowRef = useRef<HTMLButtonElement>(null);

  const sources = roomTemperatureSources(room, entities);
  if (!canEdit || sources.length < 2) return null;

  const chosen = stored[room.id];
  const valid = isRoomTemperatureSource(room, entities, chosen);
  // a stale choice (no longer in the room) shows "Automatisch" checked, but choosing it must still clear the entry
  const selected = chosen === undefined ? AUTO : valid ? chosen : STALE;

  const valueText = (value: number | null, unit: string | null) =>
    value === null ? t('roomTemp.noValue') : `${formatNumber(value, locale, { minDecimals: 1, maxDecimals: 1 })} ${unit ?? haUnit ?? '°'}`;
  const auto = automaticRoomTemperature(room, entities);
  const autoText = auto ? `${nameOf(auto.entityId)} · ${valueText(auto.value, auto.unit)}` : t('roomTemp.noValue');

  let status: string;
  if (valid) {
    const now = roomTemperature(room, entities, chosen);
    status = `${nameOf(chosen)} · ${now ? valueText(now.value, now.unit) : t('roomTemp.noValue')}`;
  } else if (chosen !== undefined) status = t('roomTemp.gone');
  else status = `${t('roomTemp.auto')} · ${autoText}`;

  const choose = (key: string) => {
    const next = { ...stored };
    if (key === AUTO) delete next[room.id];
    else next[room.id] = key;
    updateCustomization({ roomTemperatureSource: next });
  };

  const rows = [
    { key: AUTO, name: t('roomTemp.auto'), value: autoText },
    ...sources.map((s) => ({ key: s.entityId, name: nameOf(s.entityId), value: valueText(s.value, s.unit) })),
  ];

  return (
    <>
      <Card className="room-temp-source">
        <button
          ref={rowRef}
          type="button"
          className="room-temp-source__row"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <span className="icon-chip room-temp-source__chip" aria-hidden="true">
            <Thermometer size={20} strokeWidth={1.75} />
          </span>
          <span className="room-temp-source__titles">
            <span className="room-temp-source__name">{t('roomTemp.label')}</span>
            <span className="room-temp-source__status">{status}</span>
          </span>
          <ChevronRight className="room-temp-source__chevron" size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </Card>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        returnFocus={() => rowRef.current}
        title={t('roomTemp.title')}
        icon={<Thermometer size={18} strokeWidth={1.75} />}
        subtitle={room.name}
      >
        <p className="room-temp-source__desc">{t('roomTemp.desc')}</p>
        {glas ? (
          <GlasRoomPicker rows={rows} selected={selected} onSelect={choose} label={t('roomTemp.listAria')} />
        ) : (
          <ClassicPicker rows={rows} selected={selected} onSelect={choose} label={t('roomTemp.listAria')} />
        )}
      </Modal>
    </>
  );
}

interface PickerRow {
  key: string;
  name: string;
  value: string;
}

/** Klassisch: radios in a list, arrow keys / Home / End choose and move the focus (like GlasRoomPicker). */
function ClassicPicker({ rows, selected, onSelect, label }: { rows: readonly PickerRow[]; selected: string; onSelect: (key: string) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const n = rows.length;
  const index = Math.max(0, rows.findIndex((r) => r.key === selected));

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    let i: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') i = (index + 1) % n;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') i = (index - 1 + n) % n;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    const next = i === null ? undefined : rows[i];
    if (i === null || !next) return;
    e.preventDefault();
    if (next.key !== selected) onSelect(next.key);
    ref.current?.querySelectorAll<HTMLButtonElement>('.room-temp-pick__row')[i]?.focus();
  }

  return (
    <div ref={ref} role="radiogroup" aria-label={label} className="room-temp-pick" onKeyDown={onKeyDown}>
      {rows.map((r, i) => (
        <button
          key={r.key}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          className="room-temp-pick__row"
          onClick={() => {
            if (r.key !== selected) onSelect(r.key);
          }}
        >
          <span className="room-temp-pick__name">{r.name}</span>
          <span className="room-temp-pick__value">{r.value}</span>
          <Check className="room-temp-pick__check" size={18} strokeWidth={2.5} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
