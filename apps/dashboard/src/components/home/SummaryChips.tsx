import React from 'react';
import {
  Users, Lightbulb, DoorOpen, ShieldAlert, Music2,
} from 'lucide-react';
import { EditBadge } from '../ui/EditBadge';
import { SortableGrid } from '../ui/SortableGrid';
import { SortableItem } from '../ui/SortableItem';
import { applyStoredOrder } from '../../lib/order';
import { useConnectionStore } from '../../stores/connectionStore';
import { useShallow } from 'zustand/react/shallow';
import type { HassEntityMap } from '@hapulse/core';
import { useT, useStateLabel } from '../../i18n/useT';
import './home.css';

const ALL_CHIP_IDS = ['people', 'lights', 'doors', 'alarm', 'media'] as const;
type ChipId = (typeof ALL_CHIP_IDS)[number];

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
  const allEntities = Object.values(entities);
  const { url: haUrl } = useConnectionStore(useShallow((s) => ({ url: s.url })));

  // People home
  const peopleHome = allEntities.filter(
    (e) => e.entity_id.startsWith('person.') && e.state === 'home'
  );
  const peopleAvatars = peopleHome.map((e) => {
    const name = (e.attributes.friendly_name as string | undefined) ?? e.entity_id.split('.')[1] ?? e.entity_id;
    const pic = e.attributes.entity_picture as string | null | undefined;
    const avatarUrl = pic
      ? pic.startsWith('http') ? pic : haUrl ? `${haUrl}${pic}` : null
      : null;
    return { name, avatarUrl };
  });

  // Lights on
  const lightsOn = allEntities.filter(
    (e) => e.entity_id.startsWith('light.') && e.state === 'on'
  ).length;

  // Open doors/windows
  const openDoorWindow = allEntities.filter((e) => {
    if (!e.entity_id.startsWith('binary_sensor.')) return false;
    const dc = e.attributes.device_class as string | undefined;
    return (
      (dc === 'door' || dc === 'window' || dc === 'opening' || dc === 'garage_door') &&
      e.state === 'on'
    );
  }).length;

  // Alarm
  const alarm = allEntities.find((e) => e.entity_id.startsWith('alarm_control_panel.'));
  const alarmState = alarm?.state ?? null;

  // Media playing
  const mediaPlaying = allEntities.filter(
    (e) => e.entity_id.startsWith('media_player.') && e.state === 'playing'
  ).length;

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
      label: peopleHome.length > 0 ? t('home.summaryChips.peopleCount', { count: peopleHome.length }) : t('home.summaryChips.nobodyHome'),
      active: peopleHome.length > 0,
      ...(peopleHome.length > 0 ? { avatars: peopleAvatars } : {}),
    },
    {
      id: 'lights',
      icon: <Lightbulb size={16} strokeWidth={1.75} />,
      label: lightsOn > 0 ? t('home.summaryChips.lightsCount', { count: lightsOn }) : t('home.summaryChips.allOff'),
      active: lightsOn > 0,
    },
    {
      id: 'doors',
      icon: <DoorOpen size={16} strokeWidth={1.75} />,
      label: openDoorWindow > 0 ? t('home.summaryChips.openCount', { count: openDoorWindow }) : t('home.summaryChips.allClosed'),
      active: openDoorWindow > 0,
      alert: openDoorWindow > 0,
    },
    {
      id: 'alarm',
      icon: <ShieldAlert size={16} strokeWidth={1.75} />,
      label: alarmState ? sl('alarm_control_panel', alarmState) : t('home.summaryChips.unknown'),
      active: alarmState != null && alarmState !== 'disarmed',
      alert: alarmState != null && alarmState !== 'disarmed',
    },
    {
      id: 'media',
      icon: <Music2 size={16} strokeWidth={1.75} />,
      label: mediaPlaying > 0 ? t('home.summaryChips.mediaCount', { count: mediaPlaying }) : t('home.summaryChips.nothingPlaying'),
      active: mediaPlaying > 0,
    },
  ];

  // In edit mode: show all chip defs; otherwise filter to enabledChips,
  // and skip alarm chip when no alarm entity exists (matches original behavior).
  const visibleDefs = editMode
    ? chipDefs
    : chipDefs.filter((c) => {
        if (!enabledChips.includes(c.id)) return false;
        if (c.id === 'alarm' && !alarm) return false;
        return true;
      });

  if (visibleDefs.length === 0) return null;

  // Apply the stored chip order (in both edit and normal mode).
  const orderedDefs = applyStoredOrder(
    visibleDefs.map((d) => d.id),
    order
  )
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
