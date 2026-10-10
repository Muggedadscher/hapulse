import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { AlarmPanelCard } from '../../security/AlarmPanelCard';
import { useEntityStore } from '../../../stores/entityStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { sortAlarmPanels } from '@hapulse/core';
import { useT } from '../../../i18n/useT';
import { useChipWindow } from '../chipLabels'; // [fork] Glas: the chip's label under the title (K97)

interface AlarmModalProps {
  open: boolean;
  onClose: () => void;
}

export function AlarmModal({ open, onClose }: AlarmModalProps) {
  const t = useT();
  const subtitle = useChipWindow('alarm', open); // [fork]
  // All visible panels, most severe first — a home can have a master plus
  // per-area panels (Alarmo), and a hidden panel must not appear here.
  const hiddenEntities = useSettingsStore(
    useShallow((s) => s.customization.hiddenEntities)
  );
  const panels = useEntityStore(
    useShallow((s) =>
      sortAlarmPanels(
        Object.values(s.entities).filter((e) => !hiddenEntities.includes(e.entity_id))
      )
    )
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('home.chipmodals.alarm.title')}
      subtitle={subtitle} // [fork]
      icon={<ShieldAlert size={20} strokeWidth={1.75} />}
    >
      {panels.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert size={32} strokeWidth={1.5} />}
          title={t('home.chipmodals.alarm.emptyTitle')}
          description={t('home.chipmodals.alarm.emptyDescription')}
        />
      ) : (
        <div className="alarm-modal__content">
          {panels.map((panel) => (
            <AlarmPanelCard key={panel.entity_id} entity={panel} />
          ))}
        </div>
      )}
    </Modal>
  );
}
