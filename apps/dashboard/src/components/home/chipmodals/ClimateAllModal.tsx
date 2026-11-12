import React from 'react';
import { Thermometer } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { ClimateCard } from '../../cards/ClimateCard';
import { useEntityStore } from '../../../stores/entityStore';
import { useT, useLocale } from '../../../i18n/useT';
import './all-modal.css';
import { useRooms } from '../../../ha/hooks'; // [fork]
import { useHeatingPlanAreas } from '../../heating/useHeatingPlan'; // [fork] the room's heating plan under its thermostat
import { HeatingPlanStrip } from '../../heating/HeatingPlanStrip'; // [fork]
import { HumidifierCard } from '../../cards/HumidifierCard'; // [fork] the dehumidifiers after the thermostats

interface ClimateAllModalProps {
  open: boolean;
  onClose: () => void;
}

export function ClimateAllModal({ open, onClose }: ClimateAllModalProps) {
  const t = useT();
  const locale = useLocale();
  const planAreas = useHeatingPlanAreas(); // [fork]
  const rooms = useRooms(); // [fork]
  // [fork] Klassisch: every open Modal hears Esc; while a heating plan's window is open above, its Esc is not ours
  const [planOpen, setPlanOpen] = React.useState(false);
  const close = React.useCallback(() => {
    if (!planOpen) onClose();
  }, [planOpen, onClose]);
  const climateEntities = useEntityStore(
    useShallow((s) =>
      Object.values(s.entities)
        .filter((e) => e.entity_id.startsWith('climate.'))
        .sort((a, b) => {
          const na = (a.attributes.friendly_name as string | undefined) ?? a.entity_id;
          const nb = (b.attributes.friendly_name as string | undefined) ?? b.entity_id;
          return na.localeCompare(nb, locale);
        })
    )
  );

  // [fork] the humidifiers (dehumidifiers) with a room, after the thermostats, like on the room page
  const humidifierEntities = useEntityStore(
    useShallow((s) => {
      const ids = new Set(rooms.flatMap((r) => r.domains['humidifier'] ?? []));
      return Object.values(s.entities)
        .filter((e) => ids.has(e.entity_id))
        .sort((a, b) => {
          const na = (a.attributes.friendly_name as string | undefined) ?? a.entity_id;
          const nb = (b.attributes.friendly_name as string | undefined) ?? b.entity_id;
          return na.localeCompare(nb, locale);
        });
    })
  );
  const nameOf = (e: { entity_id: string; attributes: Record<string, unknown> }) =>
    (e.attributes['friendly_name'] as string | undefined) ?? e.entity_id; // [fork]

  return (
    <Modal
      open={open}
      onClose={close /* [fork] */}
      title={t('home.chipmodals.climateAll.title')}
      icon={<Thermometer size={20} strokeWidth={1.75} />}
    >
      {climateEntities.length === 0 && humidifierEntities.length === 0 /* [fork] */ ? (
        <EmptyState
          icon={<Thermometer size={32} strokeWidth={1.5} />}
          title={t('home.chipmodals.climateAll.emptyTitle')}
          description={t('home.chipmodals.climateAll.emptyDescription')}
        />
      ) : (
        <div className="all-modal__grid">
          {climateEntities.map((entity) => {
            const name =
              (entity.attributes.friendly_name as string | undefined) ??
              entity.entity_id.split('.')[1]?.replace(/_/g, ' ') ??
              entity.entity_id;
            const room = rooms.find((r) => r.id === planAreas.get(entity.entity_id)); // [fork]
            return (
              <ClimateCard key={entity.entity_id} entity={entity} name={name}>{/* [fork] with the room's heating plan */}
                {room && <HeatingPlanStrip areaId={room.id} roomName={room.name} roomEntityIds={room.entityIds} onSheetChange={setPlanOpen} />}{/* [fork] */}
              </ClimateCard>
            );
          })}
          {humidifierEntities.map((entity) => <HumidifierCard key={entity.entity_id} entity={entity} name={nameOf(entity)} />)}{/* [fork] */}
        </div>
      )}
    </Modal>
  );
}
