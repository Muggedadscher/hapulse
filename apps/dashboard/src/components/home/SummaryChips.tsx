import React from 'react';
import {
  Users, Lightbulb, DoorOpen, ShieldAlert, Music2, Waves,
} from 'lucide-react';
import { EditBadge } from '../ui/EditBadge';
import { chipLabels, summaryCounts } from './chipLabels'; // [fork] the counts and labels the chips share with their windows (K97)
import { GarageSummaryIcon } from '../garage/GarageIcon'; // [fork]
import { summaryTone } from '../garage/garageText'; // [fork]
import { Lock, LockOpen } from 'lucide-react'; // [fork] locks chip
import { lockTone } from '../security/lockLogic'; // [fork]
import { useIsGlas } from '../../app/glas/useUiStyle'; // [fork]
import { SortableGrid } from '../ui/SortableGrid';
import { SortableItem } from '../ui/SortableItem';
import { applyStoredOrder } from '../../lib/order';
import { useConnectionStore } from '../../stores/connectionStore';
import { useShallow } from 'zustand/react/shallow';
import type { HassEntityMap } from '@hapulse/core';
import { useT, useStateLabel } from '../../i18n/useT';
import './home.css';

type ChipId = 'people' | 'lights' | 'doors' | 'alarm' | 'media' | 'pool' | 'garage' | 'locks'; // [fork] pool + garage + locks chips; plain union (lint: const was type-only)

interface SummaryChipsProps {
  entities: HassEntityMap;
  enabledChips: string[];
  /** Edit mode: show all chips + eye badges + drag-to-reorder */
  editMode?: boolean | undefined;
  onToggleChip?: ((chipId: string) => void) | undefined;
  /** Non-edit mode: called when user clicks a chip to open its modal */
  onChipClick?: ((chipId: ChipId) => void) | undefined;
  /** Stored chip display order (chip ids). */
  order?: string[] | undefined;
  /** Called with the new chip-id order after a drag. */
  onReorder?: ((ids: string[]) => void) | undefined;
}

export function SummaryChips({
  entities,
  enabledChips,
  editMode = false,
  onToggleChip,
  onChipClick,
  order,
  onReorder,
}: SummaryChipsProps) {
  const t = useT();
  const sl = useStateLabel();
  const isGlas = useIsGlas(); // [fork] Glas colours each chip's glyph by its kind (K87)
  // [fork] The counts come from core (chipCounts.ts, rules unchanged) so the chips' windows show the same (K97).
  const counts = summaryCounts(entities);
  const labels = chipLabels(counts, t, sl);
  const { url: haUrl } = useConnectionStore(useShallow((s) => ({ url: s.url })));

  // People home
  const peopleHome = counts.peopleHome; // [fork]
  const peopleAvatars = peopleHome.map((e) => {
    const name = (e.attributes.friendly_name as string | undefined) ?? e.entity_id.split('.')[1] ?? e.entity_id;
    const pic = e.attributes.entity_picture as string | null | undefined;
    const avatarUrl = pic
      ? pic.startsWith('http') ? pic : haUrl ? `${haUrl}${pic}` : null
      : null;
    return { name, avatarUrl };
  });

  // Lights on
  const lightsOn = counts.lightsOn; // [fork]

  // Open doors/windows
  const openDoorWindow = counts.openDoorWindow; // [fork]

  // Alarm
  // Severity-picked so the chip agrees with the security page when several
  // panels exist (issue #16) — see pickAlarmPanel in core.
  const alarm = counts.alarm; // [fork]
  const alarmState = alarm?.state ?? null;
  // [fork] Glas: armed is green, triggered red; arming, pending and the rest stay a warning (K87).
  const alarmTone = alarmState === 'triggered' ? 'triggered' : alarmState?.startsWith('armed') ? 'armed' : undefined;

  // Media playing
  const mediaPlaying = counts.mediaPlaying; // [fork]

  // [fork] Pool pump — chip shown only when the pool entities exist.
  const poolPresent = counts.pool.present;
  const poolRunning = counts.pool.running;

  // [fork] Garage doors / gates — chip shown only when there is at least one.
  const garages = counts.garages;
  const garageTone = summaryTone(garages);

  // [fork] Locks — chip shown only when there is at least one (hidden ones are already filtered out by the bar).
  const locks = counts.locks;
  const locksTone = lockTone(locks);

  type ChipDef = {
    id: ChipId;
    icon: React.ReactNode;
    label: string;
    active: boolean;
    alert?: boolean;
    danger?: boolean;
    avatars?: Array<{ name: string; avatarUrl: string | null }>;
  };

  const chipDefs: ChipDef[] = [
    {
      id: 'people',
      icon: <Users size={16} strokeWidth={1.75} />,
      label: labels.people, // [fork]
      active: peopleHome.length > 0,
      ...(peopleHome.length > 0 ? { avatars: peopleAvatars } : {}),
    },
    {
      id: 'lights',
      icon: <Lightbulb size={16} strokeWidth={1.75} />,
      label: labels.lights, // [fork]
      active: lightsOn > 0,
    },
    {
      id: 'doors',
      icon: <DoorOpen size={16} strokeWidth={1.75} />,
      label: labels.doors, // [fork]
      active: openDoorWindow > 0,
      alert: openDoorWindow > 0,
    },
    {
      id: 'alarm',
      icon: <ShieldAlert size={16} strokeWidth={1.75} />,
      label: labels.alarm, // [fork]
      active: alarmState != null && alarmState !== 'disarmed',
      alert: alarmState != null && alarmState !== 'disarmed',
    },
    {
      id: 'media',
      icon: <Music2 size={16} strokeWidth={1.75} />,
      label: labels.media, // [fork]
      active: mediaPlaying > 0,
    },
    // [fork] Pool chip — dimmed when the pump is off, like the media chip.
    {
      id: 'pool',
      icon: <Waves size={16} strokeWidth={1.75} />,
      label: labels.pool,
      active: poolRunning,
    },
    // [fork] Garage chip — red when a door is open, amber when one is unreachable.
    {
      id: 'garage',
      icon: <GarageSummaryIcon tone={garageTone} size={16} />,
      label: labels.garage,
      active: garageTone !== 'closed',
      alert: garageTone === 'unavailable',
      danger: garageTone === 'open',
    },
    // [fork] Locks chip — red when a lock is open, amber when one is jammed or unreachable (same rule as the cards).
    {
      id: 'locks',
      icon: locksTone === 'open' ? <LockOpen size={16} strokeWidth={1.75} /> : <Lock size={16} strokeWidth={1.75} />,
      label: labels.locks,
      active: locksTone !== 'locked',
      alert: locksTone === 'problem',
      danger: locksTone === 'open',
    },
  ];

  // In edit mode: show all chip defs; otherwise filter to enabledChips,
  // and skip alarm chip when no alarm entity exists (matches original behavior).
  const visibleDefs = editMode
    ? chipDefs.filter((c) => (c.id !== 'pool' || poolPresent) && (c.id !== 'garage' || garages.total > 0) && (c.id !== 'locks' || locks.total > 0)) // [fork] hide phantom pool/garage/locks chips
    : chipDefs.filter((c) => {
        if (!enabledChips.includes(c.id)) return false;
        if (c.id === 'alarm' && !alarm) return false;
        if (c.id === 'pool' && !poolPresent) return false; // [fork]
        if (c.id === 'garage' && garages.total === 0) return false; // [fork]
        if (c.id === 'locks' && locks.total === 0) return false; // [fork]
        return true;
      });

  if (visibleDefs.length === 0) return null;

  // Apply the stored chip order (in both edit and normal mode).
  const orderedIds = applyStoredOrder(visibleDefs.map((d) => d.id), order);

  // [fork] Default placement for a pool chip the user hasn't explicitly ordered:
  // just before the media chip. Once the user drags chips (so `order` includes
  // 'pool'), their arrangement is respected instead.
  if (orderedIds.includes('pool') && orderedIds.includes('media') && !order?.includes('pool')) {
    const withoutPool = orderedIds.filter((id) => id !== 'pool');
    withoutPool.splice(withoutPool.indexOf('media'), 0, 'pool');
    orderedIds.splice(0, orderedIds.length, ...withoutPool);
  }
  // [fork] Same for the garage chip: right after the doors chip until the user moves it.
  if (orderedIds.includes('garage') && orderedIds.includes('doors') && !order?.includes('garage')) {
    const withoutGarage = orderedIds.filter((id) => id !== 'garage');
    withoutGarage.splice(withoutGarage.indexOf('doors') + 1, 0, 'garage');
    orderedIds.splice(0, orderedIds.length, ...withoutGarage);
  }
  // [fork] And the locks chip: after the garage chip (else after doors) until the user moves it.
  const locksAnchor = orderedIds.includes('garage') ? 'garage' : 'doors';
  if (orderedIds.includes('locks') && orderedIds.includes(locksAnchor) && !order?.includes('locks')) {
    const withoutLocks = orderedIds.filter((id) => id !== 'locks');
    withoutLocks.splice(withoutLocks.indexOf(locksAnchor) + 1, 0, 'locks');
    orderedIds.splice(0, orderedIds.length, ...withoutLocks);
  }

  const orderedDefs = orderedIds
    .map((id) => visibleDefs.find((d) => d.id === id))
    .filter((d): d is ChipDef => d != null);

  return (
    <SortableGrid
      items={orderedDefs.map((d) => d.id)}
      onReorder={(ids) => onReorder?.(ids)}
      editMode={editMode}
      className="summary-chips"
    >
      {orderedDefs.map((chip) => {
        const isEnabled = enabledChips.includes(chip.id);
        const isHidden = !isEnabled; // in edit mode, "hidden" means not in enabledChips

        return (
          <SortableItem key={chip.id} id={chip.id} editMode={editMode}>
          <div
            className={[
              'summary-chip-wrap',
              editMode ? 'summary-chip-wrap--editing' : '',
            ].filter(Boolean).join(' ')}
          >
            {editMode ? (
              <div
                data-chip={isGlas ? chip.id : undefined} // [fork]
                data-tone={isGlas && chip.id === 'alarm' ? alarmTone : undefined} // [fork]
                className={[
                  'summary-chip',
                  'edit-item-outline',
                  isHidden ? 'summary-chip--edit-hidden' : '',
                  chip.active && !isHidden ? 'summary-chip--active' : '',
                  chip.alert && !isHidden ? 'summary-chip--alert' : '',
                  chip.danger && !isHidden ? 'summary-chip--danger' : '',
                ].filter(Boolean).join(' ')}
              >
                <span className="summary-chip__icon">{chip.icon}</span>
                <span className="summary-chip__count">{chip.label}</span>
                {chip.avatars && chip.avatars.length > 0 && (
                  <div className="summary-chip__avatars">
                    {chip.avatars.map(({ name, avatarUrl }) => (
                      <div key={name} className="summary-chip__avatar" title={name}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={name} />
                        ) : (
                          <span>{name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                data-chip={isGlas ? chip.id : undefined} // [fork]
                data-tone={isGlas && chip.id === 'alarm' ? alarmTone : undefined} // [fork]
                className={[
                  'summary-chip',
                  'summary-chip--clickable',
                  !chip.active ? 'summary-chip--dimmed' : '',
                  chip.active ? 'summary-chip--active' : '',
                  chip.alert ? 'summary-chip--alert' : '',
                  chip.danger ? 'summary-chip--danger' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onChipClick?.(chip.id)}
                aria-haspopup="dialog"
                aria-label={t('home.summaryChips.chipAria', { id: chip.id, label: chip.label })}
              >
                <span className="summary-chip__icon">{chip.icon}</span>
                <span className="summary-chip__count">{chip.label}</span>
                {chip.avatars && chip.avatars.length > 0 && (
                  <div className="summary-chip__avatars">
                    {chip.avatars.map(({ name, avatarUrl }) => (
                      <div key={name} className="summary-chip__avatar" title={name}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={name} />
                        ) : (
                          <span>{name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            )}

            {editMode && onToggleChip && (
              <EditBadge
                hidden={isHidden}
                toggleLabel={isHidden ? t('home.summaryChips.showChipAria', { id: chip.id }) : t('home.summaryChips.hideChipAria', { id: chip.id })}
                onToggleHidden={() => onToggleChip(chip.id)}
              />
            )}
          </div>
          </SortableItem>
        );
      })}
    </SortableGrid>
  );
}
