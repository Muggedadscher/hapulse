/**
 * LightsModal — lights grouped by room, toggle per light, "turn all off" header action.
 * Respects hiddenEntities from settingsStore.
 */

import React, { useCallback } from 'react';
import { Lightbulb } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { useEntityStore } from '../../../stores/entityStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { callService } from '../../../ha/service';
import { applyStoredOrder } from '../../../lib/order';
import { useT } from '../../../i18n/useT';
import './chipmodals.css';

interface LightsModalProps {
  open: boolean;
  onClose: () => void;
}

export function LightsModal({ open, onClose }: LightsModalProps) {
  const t = useT();
  const rooms = useEntityStore((s) => s.rooms);
  const entities = useEntityStore(
    useShallow((s) => s.entities)
  );
  const hiddenEntities = useSettingsStore(
    useShallow((s) => s.customization.hiddenEntities)
  );
  const roomOrder = useSettingsStore(
    useShallow((s) => s.customization.roomOrder)
  );

  // All light entities, not hidden
  const allLights = Object.values(entities).filter(
    (e) => e.entity_id.startsWith('light.') && !hiddenEntities.includes(e.entity_id)
  );

  const lightsOn = allLights.filter((l) => l.state === 'on');
  const anyOn = lightsOn.length > 0;

  // Group by room — apply user's room order before iterating
  type LightGroup = { roomName: string; entityIds: string[] };
  const groups: LightGroup[] = [];
  const assignedIds = new Set<string>();

  const orderedRooms = applyStoredOrder(rooms.map((r) => r.id), roomOrder)
    .map((id) => rooms.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r != null);

  for (const room of orderedRooms) {
    const roomLightIds = (room.domains['light'] ?? []).filter(
      (id) => !hiddenEntities.includes(id) && entities[id] !== undefined
    );
    if (roomLightIds.length > 0) {
      groups.push({ roomName: room.name, entityIds: roomLightIds });
      roomLightIds.forEach((id) => assignedIds.add(id));
    }
  }

  // "Other" — lights not in any room
  const otherLightIds = allLights
    .map((l) => l.entity_id)
    .filter((id) => !assignedIds.has(id));
  if (otherLightIds.length > 0) {
    groups.push({ roomName: 'other', entityIds: otherLightIds });
  }

  const handleTurnAllOff = useCallback(() => {
    const onIds = lightsOn.map((l) => l.entity_id);
    if (onIds.length > 0) {
      void callService('light', 'turn_off', {}, { entity_id: onIds });
    }
  }, [lightsOn]);

  const handleToggle = useCallback((entityId: string, isOn: boolean) => {
    void callService('light', isOn ? 'turn_off' : 'turn_on', {}, { entity_id: entityId });
  }, []);

  const headerAction = anyOn ? (
    <div className="lights-modal__header-action">
      <button
        className="btn btn--ghost"
        onClick={handleTurnAllOff}
        type="button"
        style={{ fontSize: '0.8125rem', padding: '0.375rem 0.875rem', minHeight: '36px' }}
      >
        {t('home.chipmodals.lights.turnAllOff')}
      </button>
    </div>
  ) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('home.chipmodals.lights.title')}
      icon={<Lightbulb size={20} strokeWidth={1.75} />}
    >
      {allLights.length === 0 ? (
        <EmptyState
          icon={<Lightbulb size={32} strokeWidth={1.5} />}
          title={t('home.chipmodals.lights.emptyTitle')}
          description={t('home.chipmodals.lights.emptyDescription')}
        />
      ) : (
        <>
          {headerAction}
          {groups.map((group) => (
            <div key={group.roomName} className="lights-modal__group">
              <div className="lights-modal__group-label">
                {group.roomName === 'other' ? t('home.chipmodals.lights.otherLabel') : group.roomName}
              </div>
              <div className="lights-modal__list">
                {group.entityIds.map((id) => {
                  const entity = entities[id];
                  if (!entity) return null;
                  const isOn = entity.state === 'on';
                  const name =
                    (entity.attributes.friendly_name as string | undefined) ??
                    id.split('.')[1] ??
                    id;
                  const brightness = entity.attributes.brightness as number | undefined;
                  const brightnessPercent =
                    brightness != null ? Math.round((brightness / 255) * 100) : null;

                  return (
                    <div
                      key={id}
                      className="lights-modal__row"
                      onClick={() => handleToggle(id, isOn)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggle(id, isOn);
                        }
                      }}
                      aria-label={
                        isOn
                          ? t('home.chipmodals.lights.rowAriaOn', { name })
                          : t('home.chipmodals.lights.rowAriaOff', { name })
                      }
                    >
                      <span
                        className={`lights-modal__icon ${
                          isOn ? 'lights-modal__icon--on' : 'lights-modal__icon--off'
                        }`}
                        aria-hidden="true"
                      >
                        <Lightbulb size={16} strokeWidth={1.75} />
                      </span>

                      <div className="lights-modal__name-col">
                        <span className="lights-modal__name">{name}</span>
                        {isOn && brightnessPercent != null && (
                          <span
                            className={`lights-modal__state lights-modal__state--on`}
                          >
                            {brightnessPercent}%
                          </span>
                        )}
                        {!isOn && (
                          <span className="lights-modal__state">{t('home.chipmodals.lights.offState')}</span>
                        )}
                      </div>

                      {/* Toggle switch */}
                      <label
                        className="lights-modal__toggle"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t('home.chipmodals.lights.toggleAria', { name })}
                      >
                        <input
                          type="checkbox"
                          checked={isOn}
                          onChange={() => handleToggle(id, isOn)}
                        />
                        <span className="lights-modal__toggle-track" aria-hidden="true" />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </Modal>
  );
}
