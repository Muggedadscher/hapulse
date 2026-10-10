/**
 * [fork] LocksModal — opened by the "Locks" summary chip: every visible lock with Lock / Unlock, open ones first.
 * Same rows as the Security page (LocksList): unlocking always asks, locking only when the lock needs a code.
 */

import React from 'react';
import { Lock } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import type { HassEntity } from '@hapulse/core';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { useEntityStore } from '../../../stores/entityStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useT } from '../../../i18n/useT';
import { useChipSubtitle } from '../chipLabels';
import { LocksList } from '../../security/LocksList';

interface LocksModalProps {
  open: boolean;
  onClose: () => void;
}

const isOpen = (e: HassEntity) => e.state !== 'locked';

const byOpenThenName = (a: HassEntity, b: HassEntity) =>
  Number(isOpen(b)) - Number(isOpen(a)) ||
  String(a.attributes['friendly_name'] ?? a.entity_id).localeCompare(String(b.attributes['friendly_name'] ?? b.entity_id));

export function LocksModal({ open, onClose }: LocksModalProps) {
  const t = useT();
  const subtitle = useChipSubtitle('locks', open);
  const hiddenEntities = useSettingsStore(useShallow((s) => s.customization.hiddenEntities));
  const rooms = useEntityStore((s) => s.rooms);
  const locks = useEntityStore(
    useShallow((s) =>
      Object.values(s.entities).filter((e) => e.entity_id.startsWith('lock.') && !hiddenEntities.includes(e.entity_id)),
    ),
  );

  return (
    <Modal open={open} onClose={onClose} title={t('security.locks.title')} subtitle={subtitle} className="g-chip-window" icon={<Lock size={20} strokeWidth={1.75} />}>
      {locks.length === 0 ? (
        <EmptyState
          icon={<Lock size={32} strokeWidth={1.5} />}
          title={t('locks.emptyTitle')}
          description={t('locks.emptyDescription')}
        />
      ) : (
        <LocksList locks={[...locks].sort(byOpenThenName)} rooms={rooms} />
      )}
    </Modal>
  );
}
