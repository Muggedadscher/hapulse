/**
 * [fork] GarageModal — opened by the "Garage" summary chip: every visible garage
 * door / gate with Open (asks first) and Close, open doors first.
 */

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { garageIsOpen, isGarageDoor } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { useEntityStore } from '../../../stores/entityStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useT } from '../../../i18n/useT';
import { useChipWindow } from '../chipLabels';
import { GarageList } from '../../garage/GarageList';
import { GarageSummaryIcon } from '../../garage/GarageIcon';

interface GarageModalProps {
  open: boolean;
  onClose: () => void;
}

const byOpenThenName = (a: HassEntity, b: HassEntity) =>
  Number(garageIsOpen(b.state)) - Number(garageIsOpen(a.state)) ||
  String(a.attributes['friendly_name'] ?? a.entity_id).localeCompare(String(b.attributes['friendly_name'] ?? b.entity_id));

export function GarageModal({ open, onClose }: GarageModalProps) {
  const t = useT();
  const { subtitle, windowClass } = useChipWindow('garage', open);
  const hiddenEntities = useSettingsStore(useShallow((s) => s.customization.hiddenEntities));
  const rooms = useEntityStore((s) => s.rooms);
  const garages = useEntityStore(
    useShallow((s) =>
      Object.values(s.entities).filter((e) => isGarageDoor(e) && !hiddenEntities.includes(e.entity_id)),
    ),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('garage.title')}
      subtitle={subtitle}
      className={windowClass}
      icon={<GarageSummaryIcon tone="closed" size={20} />}
    >
      {garages.length === 0 ? (
        <EmptyState
          icon={<GarageSummaryIcon tone="closed" size={32} />}
          title={t('garage.emptyTitle')}
          description={t('garage.emptyDescription')}
        />
      ) : (
        <GarageList garages={[...garages].sort(byOpenThenName)} rooms={rooms} />
      )}
    </Modal>
  );
}
