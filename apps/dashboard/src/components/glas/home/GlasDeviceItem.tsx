/**
 * [fork] One favourite in the overview's devices card in Glas (docs/GLAS-DESIGN.md §7.10, GLAS-PLAN §2.17, plan
 * docs/glas/PLAN-ETAPPE-4.md K81, K83). Switching and the detail are separate: on the phone a tile whose circle
 * switches and whose text opens the detail, on the desktop a row that opens the detail with a switch on the right.
 * One markup for both, the layout per width in styles/glas/home-cards.css (the control of the other width is not
 * displayed, so neither a screen reader nor Tab reaches it). Switched off here, the device stays in the card as
 * "Aus" until the page is reloaded (stores/keptOffStore.ts); a long press opens the context menu.
 */

import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { domainOf, formatEntityState, formatNumber, lightPercent } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import { GlasMenuTarget } from '../GlasMenuTarget';
import { useKeptOffStore } from '../../../stores/keptOffStore';
import { useUIStore } from '../../../stores/uiStore';
import { useLocale, useStateLabel, useT } from '../../../i18n/useT';

interface GlasDeviceItemProps {
  entity: HassEntity;
  name: string;
  roomName: string | undefined;
  /** The card's symbol for the device (lucide). */
  icon: ReactNode;
  on: boolean;
  /** No switch for devices HAPulse cannot toggle (a vacuum): the tile only opens the detail. */
  toggleable: boolean;
  onToggle: () => void;
}

const TONE: Record<string, string> = { light: 'yellow', switch: 'yellow', input_boolean: 'yellow', fan: 'teal', media_player: 'blue', vacuum: 'green' };

export function GlasDeviceItem({ entity, name, roomName, icon, on, toggleable, onToggle }: GlasDeviceItemProps) {
  const t = useT();
  const sl = useStateLabel();
  const locale = useLocale();
  const openEntityDetail = useUIStore((s) => s.openEntityDetail);
  const keep = useKeptOffStore((s) => s.keep);
  const release = useKeptOffStore((s) => s.release);
  // a/b starts the pulse again on every tap
  const [pulse, setPulse] = useState(0);
  const id = entity.entity_id;
  const pct = lightPercent(entity);
  const base = formatEntityState(entity, locale, sl);
  const state = pct !== null ? `${base} · ${formatNumber(pct, locale)} %` : base;
  const toggleAria = on ? t('home.devices.turnOffAria', { name }) : t('home.devices.turnOnAria', { name });

  const toggle = () => {
    setPulse((n) => n + 1);
    if (on) keep(id);
    else release(id);
    onToggle();
  };

  return (
    <GlasMenuTarget entityId={id} name={name}>
      <li
        className="g-device"
        data-on={on || undefined}
        data-tone={TONE[domainOf(id)] ?? 'yellow'}
        data-pulse={pulse ? (pulse % 2 ? 'a' : 'b') : undefined}
        data-switch={toggleable || undefined}
      >
        {toggleable && (
          <button type="button" className="g-device__toggle" aria-pressed={on} aria-label={toggleAria} onClick={toggle}>
            <span className="g-device__circle" aria-hidden="true">
              {icon}
            </span>
          </button>
        )}
        <button
          type="button"
          className="g-device__open"
          aria-haspopup="dialog"
          aria-label={
            roomName
              ? t('glas.devices.detailAria', { name, room: roomName, state })
              : t('glas.home.detailAria', { name, state })
          }
          onClick={() => openEntityDetail(id)}
        >
          <span className="g-device__circle g-device__circle--lead" aria-hidden="true">
            {icon}
          </span>
          <span className="g-device__text">
            {roomName && <span className="g-device__room">{roomName}</span>}
            <span className="g-device__name">{name}</span>
            <span className="g-device__state">{state}</span>
            <span className="g-device__sub">{roomName ? `${roomName} · ${state}` : state}</span>
          </span>
        </button>
        {toggleable && (
          <button type="button" role="switch" className="g-device__switch" aria-checked={on} aria-label={toggleAria} onClick={toggle}>
            <span className="g-switch" aria-hidden="true" />
          </button>
        )}
      </li>
    </GlasMenuTarget>
  );
}
