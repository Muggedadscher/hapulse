import React from 'react';
import { AlignJustify } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { CoverCard } from '../../cards/CoverCard';
import { useEntityStore } from '../../../stores/entityStore';
import { useT, useLocale } from '../../../i18n/useT';
import './all-modal.css';

interface BlindsAllModalProps {
  open: boolean;
  onClose: () => void;
}

export function BlindsAllModal({ open, onClose }: BlindsAllModalProps) {
  const t = useT();
  const locale = useLocale();
  const coverEntities = useEntityStore(
    useShallow((s) =>
      Object.values(s.entities)
        .filter(
          (e) =>
            e.entity_id.startsWith('cover.') &&
            e.state !== 'unavailable'
        )
        .sort((a, b) => {
          const na = (a.attributes.friendly_name as string | undefined) ?? a.entity_id;
          const nb = (b.attributes.friendly_name as string | undefined) ?? b.entity_id;
          return na.localeCompare(nb, locale);
        })
    )
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('home.chipmodals.blindsAll.title')}
      icon={<AlignJustify size={20} strokeWidth={1.75} />}
    >
      {coverEntities.length === 0 ? (
        <EmptyState
          icon={<AlignJustify size={32} strokeWidth={1.5} />}
          title={t('home.chipmodals.blindsAll.emptyTitle')}
          description={t('home.chipmodals.blindsAll.emptyDescription')}
        />
      ) : (
        <div className="all-modal__grid">
          {coverEntities.map((entity) => {
            const name =
              (entity.attributes.friendly_name as string | undefined) ??
              entity.entity_id.split('.')[1]?.replace(/_/g, ' ') ??
              entity.entity_id;
            return (
              <CoverCard key={entity.entity_id} entity={entity} name={name} />
            );
          })}
        </div>
      )}
    </Modal>
  );
}
