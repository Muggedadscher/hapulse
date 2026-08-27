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

interface AlarmModalProps {
  open: boolean;
  onClose: () => void;
}

export function AlarmModal({ open, onClose }: AlarmModalProps) {
  const t = useT();
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
