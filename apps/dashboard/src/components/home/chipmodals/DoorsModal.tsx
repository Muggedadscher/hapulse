import React from 'react';
import { DoorOpen, Grid2x2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { useEntityStore } from '../../../stores/entityStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import type { HassEntity } from '@hapulse/core';
import { useT } from '../../../i18n/useT';
import './chipmodals.css';

const DOOR_CLASSES = new Set(['door', 'garage_door', 'opening']);

interface DoorsModalProps {
  open: boolean;
  onClose: () => void;
}

function SensorRow({ sensor }: { sensor: HassEntity }) {
  const t = useT();
  const isOpen = sensor.state === 'on';
  const name =
    (sensor.attributes.friendly_name as string | undefined) ??
    sensor.entity_id.split('.')[1] ??
    sensor.entity_id;

  return (
    <div className="doors-modal__row">
      <span className="doors-modal__row-name">{name}</span>
      <span
        className={[
          'doors-modal__pill',
          isOpen ? 'doors-modal__pill--open' : 'doors-modal__pill--closed',
        ].join(' ')}
      >
        {isOpen && <span className="doors-modal__dot" aria-hidden="true" />}
        {isOpen ? t('home.chipmodals.doors.open') : t('home.chipmodals.doors.closed')}
      </span>
    </div>
  );
}

interface SectionProps {
  icon: React.ReactNode;
  label: string;
  openCount: number;
  total: number;
  sensors: HassEntity[];
}

function Section({ icon, label, openCount, total, sensors }: SectionProps) {
  return (
    <div className="doors-modal__group">
      <div className="doors-modal__group-header">
        <span className="doors-modal__group-icon">{icon}</span>
        <span className="doors-modal__group-label">{label}</span>
        <span
          className={[
            'doors-modal__group-count',
            openCount > 0 ? 'doors-modal__group-count--alert' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {openCount}/{total}
        </span>
      </div>
      <div className="doors-modal__list">
        {sensors.map((s) => (
          <SensorRow key={s.entity_id} sensor={s} />
        ))}
      </div>
    </div>
  );
}

export function DoorsModal({ open, onClose }: DoorsModalProps) {
  const t = useT();
  const hiddenEntities = useSettingsStore(
    useShallow((s) => s.customization.hiddenEntities)
  );

  const sensors = useEntityStore(
    useShallow((s) =>
      Object.values(s.entities).filter((e) => {
        if (hiddenEntities.includes(e.entity_id)) return false;
        if (!e.entity_id.startsWith('binary_sensor.')) return false;
        const dc = e.attributes.device_class as string | undefined;
        return (
          dc === 'door' ||
          dc === 'window' ||
          dc === 'opening' ||
          dc === 'garage_door'
        );
      })
    )
  );

  const byOpen = (a: HassEntity, b: HassEntity) =>
    (a.state === 'on' ? 0 : 1) - (b.state === 'on' ? 0 : 1);

  const doors = [...sensors]
    .filter((e) => DOOR_CLASSES.has((e.attributes.device_class as string) ?? ''))
    .sort(byOpen);

  const windows = [...sensors]
    .filter((e) => (e.attributes.device_class as string | undefined) === 'window')
    .sort(byOpen);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('home.chipmodals.doors.title')}
      icon={<DoorOpen size={20} strokeWidth={1.75} />}
    >
      {sensors.length === 0 ? (
        <EmptyState
          icon={<DoorOpen size={32} strokeWidth={1.5} />}
          title={t('home.chipmodals.doors.emptyTitle')}
          description={t('home.chipmodals.doors.emptyDescription')}
        />
      ) : (
        <div className="doors-modal">
          {doors.length > 0 && (
            <Section
              icon={<DoorOpen size={14} strokeWidth={1.75} />}
              label={t('home.chipmodals.doors.doorsLabel')}
              openCount={doors.filter((e) => e.state === 'on').length}
              total={doors.length}
              sensors={doors}
            />
          )}
          {windows.length > 0 && (
            <Section
              icon={<Grid2x2 size={14} strokeWidth={1.75} />}
              label={t('home.chipmodals.doors.windowsLabel')}
              openCount={windows.filter((e) => e.state === 'on').length}
              total={windows.length}
              sensors={windows}
            />
          )}
        </div>
      )}
    </Modal>
  );
}
