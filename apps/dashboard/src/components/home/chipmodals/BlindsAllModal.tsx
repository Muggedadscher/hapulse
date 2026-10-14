import React from 'react';
import { AlignJustify, Blinds } from 'lucide-react'; // [fork] Blinds: Glas symbol
import { useIsGlas } from '../../../app/glas/useUiStyle'; // [fork]
import { useShallow } from 'zustand/react/shallow';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { CoverCard } from '../../cards/CoverCard';
import { isGarageDoor } from '@hapulse/core'; // [fork]
import { useEntityStore } from '../../../stores/entityStore';
import { useT, useLocale } from '../../../i18n/useT';
import './all-modal.css';

interface BlindsAllModalProps {
  open: boolean;
  onClose: () => void;
  /** [fork] Only this room's covers, titled with its name (Glas: a tap on the blinds card's picture or room). */
  room?: { name: string; entityIds: readonly string[] } | undefined;
}

export function BlindsAllModal({ open, onClose, room }: BlindsAllModalProps) { // [fork] room
  const t = useT();
  const locale = useLocale();
  const Icon = useIsGlas() ? Blinds : AlignJustify; // [fork] Glas: the blind symbol, "≡" read as a menu button
  const coverEntities = useEntityStore(
    useShallow((s) =>
      Object.values(s.entities)
        .filter(
          (e) =>
            e.entity_id.startsWith('cover.') &&
            e.state !== 'unavailable' &&
            !isGarageDoor(e) && // [fork] garage doors have their own views
            (!room || room.entityIds.includes(e.entity_id)) // [fork] one room
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
      title={room ? room.name : t('home.chipmodals.blindsAll.title') /* [fork] */}
      icon={<Icon size={20} strokeWidth={1.75} /* [fork] */ />}
    >
      {coverEntities.length === 0 ? (
        <EmptyState
          icon={<Icon size={32} strokeWidth={1.5} /* [fork] */ />}
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
