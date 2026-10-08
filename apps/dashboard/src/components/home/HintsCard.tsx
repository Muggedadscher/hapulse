/**
 * [fork] Home "Hinweise" — only what deviates from normal (docs/GLAS-PLAN.md §2.11, GLAS-DESIGN §7.6, user decisions
 * E3/E4, docs/glas/PLAN-ETAPPE-4.md K76). A normal, hideable Home section in both styles; Home renders it while there
 * is a hint, and always in edit mode (then empty: "nothing deviates"), so it can be hidden and shown again. Every row
 * opens what already exists: the garage, locks, doors or alarm window, the bin, the sensor's detail or the NVR page.
 * The windows live in Home (`HintWindows`), outside the grid: when an action in a window resolves the last hint, the
 * card goes away but the window stays open.
 * Klassisch: a card with rows. Glas: a list card on the phone, a row of capsules from 900 px (styles/glas/home.css).
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell, ChevronRight, Droplets, Flame, Grid2x2, DoorOpen, Lock, LockOpen, ShieldAlert, Cctv, Trash2,
} from 'lucide-react';
import type { Hint, WasteBin } from '@hapulse/core';
import { Card } from '../ui/Card';
import { GarageSummaryIcon } from '../garage/GarageIcon';
import { AlarmModal, DoorsModal, GarageModal, LocksModal } from './chipmodals';
import { WasteBinModal } from '../waste/WasteBinModal';
import { formatWasteDate } from '../waste/wasteDisplay';
import { useEntityMap, useRooms } from '../../ha/hooks';
import { useUIStore } from '../../stores/uiStore';
import { useLocale, useStateLabel, useT } from '../../i18n/useT';
import type { TFunction } from '../../i18n/useT';
import { NVR_ROOT } from '../../nvr/paths';
import './HintsCard.css';

/** The window a hint opens; Home keeps it (`HintWindows`). */
export type HintWindow = { kind: 'alarm' | 'garage' | 'locks' | 'doors' } | { kind: 'bin'; bin: WasteBin };

/** At most three names, then "+N". */
function nameList(names: string[], t: TFunction): string {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length <= 3) return unique.join(', ');
  return `${unique.slice(0, 3).join(', ')} ${t('hints.more', { n: unique.length - 3 })}`;
}

function HintIcon({ kind }: { kind: Hint['kind'] }) {
  const p = { size: 20, strokeWidth: 1.75 };
  switch (kind) {
    case 'alarm-triggered':
    case 'alarm-pending':
      return <ShieldAlert {...p} />;
    case 'leak':
      return <Droplets {...p} />;
    case 'smoke':
      return <Flame {...p} />;
    case 'garage-open':
      return <GarageSummaryIcon tone="open" size={20} />;
    case 'garage-fault':
      return <GarageSummaryIcon tone="unavailable" size={20} />;
    case 'lock-open':
      return <LockOpen {...p} />;
    case 'lock-fault':
      return <Lock {...p} />;
    case 'window-open':
      return <Grid2x2 {...p} />;
    case 'door-open':
      return <DoorOpen {...p} />;
    case 'camera-not-recording':
      return <Cctv {...p} />;
    case 'waste-soon':
      return <Trash2 {...p} />;
  }
}

export interface HintsCardProps {
  hints: Hint[];
  cameraNames: string[];
  /** Opens a hint's window (Home renders it with `HintWindows`). */
  onOpen: (target: HintWindow) => void;
}

export function HintsCard({ hints, cameraNames, onOpen }: HintsCardProps) {
  const t = useT();
  const sl = useStateLabel();
  const locale = useLocale();
  const navigate = useNavigate();
  const entities = useEntityMap();
  const rooms = useRooms();
  const openEntityDetail = useUIStore((s) => s.openEntityDetail);
  const editMode = useUIStore((s) => s.editMode);

  // entity → room name, for "2 windows open · Bedroom, Bath"
  const roomOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rooms) for (const id of r.entityIds) m.set(id, r.name);
    return m;
  }, [rooms]);
  const placeOf = (id: string): string =>
    roomOf.get(id) ?? String(entities[id]?.attributes.friendly_name ?? id.split('.')[1] ?? id);
  const nameOf = (id: string): string => String(entities[id]?.attributes.friendly_name ?? id.split('.')[1] ?? id);

  const text = (h: Hint): { title: string; sub: string } => {
    const places = nameList(h.entityIds.map(placeOf), t);
    const names = nameList(h.entityIds.map(nameOf), t);
    switch (h.kind) {
      case 'alarm-triggered':
      case 'alarm-pending': {
        const id = h.entityIds[0] ?? '';
        return { title: t('hints.alarm', { state: sl('alarm_control_panel', entities[id]?.state ?? '') }), sub: nameOf(id) };
      }
      case 'leak':
        return { title: t('hints.leak'), sub: places };
      case 'smoke':
        return { title: t('hints.smoke'), sub: places };
      case 'garage-open':
        return { title: t('hints.garageOpen', { count: h.count }), sub: t('hints.tapToClose') };
      case 'garage-fault':
        return { title: t('hints.garageFault', { count: h.count }), sub: names };
      case 'lock-open':
        return { title: t('hints.lockOpen', { count: h.count }), sub: t('hints.tapToLock') };
      case 'lock-fault':
        return { title: t('hints.lockFault', { count: h.count }), sub: names };
      case 'window-open':
        return { title: t('hints.windowOpen', { count: h.count }), sub: places };
      case 'door-open':
        return { title: t('hints.doorOpen', { count: h.count }), sub: places };
      case 'camera-not-recording':
        return { title: t('hints.cameraNotRecording', { count: h.count }), sub: nameList(cameraNames, t) };
      case 'waste-soon': {
        const b = h.bin;
        const name = b?.name ?? '';
        return {
          title: b?.daysTo === 0 ? t('hints.wasteToday', { name }) : t('hints.wasteTomorrow', { name }),
          sub: b?.nextDate ? formatWasteDate(b.nextDate, locale, new Date().getFullYear()) : '',
        };
      }
    }
  };

  const act = (h: Hint) => {
    switch (h.kind) {
      case 'alarm-triggered':
      case 'alarm-pending':
        onOpen({ kind: 'alarm' });
        break;
      case 'garage-open':
      case 'garage-fault':
        onOpen({ kind: 'garage' });
        break;
      case 'lock-open':
      case 'lock-fault':
        onOpen({ kind: 'locks' });
        break;
      case 'window-open':
      case 'door-open':
        onOpen({ kind: 'doors' });
        break;
      case 'leak':
      case 'smoke':
        if (h.entityIds[0]) openEntityDetail(h.entityIds[0]);
        break;
      case 'camera-not-recording':
        void navigate(NVR_ROOT);
        break;
      case 'waste-soon':
        if (h.bin) onOpen({ kind: 'bin', bin: h.bin });
        break;
    }
  };

  return (
    <Card className={`hints-card${editMode ? ' hints-card--edit' : ''}`}>
      <div className="hints-card__header">
        <span className="hints-card__icon-chip" aria-hidden="true">
          <Bell size={16} strokeWidth={1.75} />
        </span>
        <span className="hints-card__title" id="hints-card-title">{t('hints.title')}</span>
      </div>
      {hints.length === 0 ? (
        <p className="hints-card__empty">{t('hints.empty')}</p>
      ) : (
        <ul className="hints-card__list" aria-labelledby="hints-card-title">
          {hints.map((h) => {
            const { title, sub } = text(h);
            return (
              <li key={h.id} className="hints-card__item">
                <button
                  type="button"
                  className={`hint-row hint-row--${h.severity}`}
                  data-kind={h.kind}
                  onClick={() => act(h)}
                  aria-haspopup={h.kind === 'camera-not-recording' ? undefined : 'dialog'}
                >
                  <span className="hint-row__icon" aria-hidden="true"><HintIcon kind={h.kind} /></span>
                  <span className="hint-row__text">
                    <span className="hint-row__title">{title}</span>
                    {sub && <span className="hint-row__sub">{sub}</span>}
                  </span>
                  <ChevronRight className="hint-row__chev" size={16} strokeWidth={2} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** The windows the hints open, kept by Home outside the grid so they outlive the card. */
export function HintWindows({ target, onClose }: { target: HintWindow | null; onClose: () => void }) {
  const kind = target?.kind ?? null;
  return (
    <>
      <AlarmModal open={kind === 'alarm'} onClose={onClose} />
      <GarageModal open={kind === 'garage'} onClose={onClose} />
      <LocksModal open={kind === 'locks'} onClose={onClose} />
      <DoorsModal open={kind === 'doors'} onClose={onClose} />
      <WasteBinModal bin={target?.kind === 'bin' ? target.bin : null} onClose={onClose} />
    </>
  );
}
