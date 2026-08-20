/**
 * DeviceDetailsModal — full device info: name + area at the top, then entities
 * grouped by category as interactive list rows.
 *
 * When editing is enabled (Settings → Editing), each entity row additionally
 * shows favorite + hide buttons alongside its normal control, and the toolbar
 * shows a hide-all / show-all toggle for the whole device. When editing is off,
 * those affordances are hidden and the modal is just the interactive controls.
 *
 * The entity list is computed from the registry (not the filtered DeviceModel)
 * so hidden entities are still available to unhide while editing.
 */

import React, { useMemo } from 'react';
import { MapPin, Boxes, Eye, EyeOff } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Modal } from '../ui/Modal';
import { DeviceEntityRow } from './DeviceEntityRow';
import { useEntities } from '../../ha/hooks';
import { useEntityStore } from '../../stores/entityStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { DeviceIcon, integrationLabel } from './deviceMeta';
import { useT } from '../../i18n/useT';
import type { TKey } from '../../i18n/useT';
import { domainOf, deviceEntityCategory } from '@hapulse/core';
import type { DeviceModel, DeviceEntityCategory } from '@hapulse/core';
import './DeviceDetailsModal.css';

const CATEGORY_ORDER: DeviceEntityCategory[] = ['controls', 'sensors', 'config', 'diagnostic'];
const CATEGORY_LABEL_KEY: Record<DeviceEntityCategory, TKey> = {
  controls: 'devices.modal.category.controls',
  sensors: 'devices.modal.category.sensors',
  config: 'devices.modal.category.config',
  diagnostic: 'devices.modal.category.diagnostic',
};

function prettyTail(entityId: string): string {
  const tail = entityId.split('.')[1] ?? entityId;
  return tail.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface DeviceDetailsModalProps {
  device: DeviceModel | null;
  open: boolean;
  onClose: () => void;
}

interface Ref {
  entity_id: string;
  domain: string;
  name: string;
  category: DeviceEntityCategory;
  hidden: boolean;
}

export function DeviceDetailsModal({ device, open, onClose }: DeviceDetailsModalProps) {
  const t = useT();
  const registries = useEntityStore((s) => s.registries);
  const editable = useSettingsStore((s) => s.customization.editingEnabled);
  const favorites = useSettingsStore(useShallow((s) => s.customization.favorites));
  const hiddenEntities = useSettingsStore(useShallow((s) => s.customization.hiddenEntities));
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);

  // All registry entries for this device (stable; includes hidden ones).
  const regEntries = useMemo(
    () =>
      device && registries
        ? registries.entities.filter((re) => re.device_id === device.id && !re.disabled_by)
        : [],
    [device, registries],
  );

  const ids = regEntries.map((re) => re.entity_id);
  const liveList = useEntities(ids);

  if (!device) return null;

  const hiddenSet = new Set(hiddenEntities);
  const favSet = new Set(favorites);
  const refs: Ref[] = regEntries
    .map((re, i) => {
      const live = liveList[i];
      if (!live) return null;
      const domain = domainOf(re.entity_id);
      return {
        entity_id: re.entity_id,
        domain,
        name: (live.attributes.friendly_name as string | undefined) ?? re.original_name ?? prettyTail(re.entity_id),
        category: deviceEntityCategory(domain, re.entity_category),
        hidden: hiddenSet.has(re.entity_id),
      };
    })
    .filter((r): r is Ref => r !== null);

  const liveById = new Map(ids.map((id, i) => [id, liveList[i]]));

  // When editing, show hidden entities (dimmed) so they can be unhidden too.
  const displayRefs = editable ? refs : refs.filter((r) => !r.hidden);

  const groups = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: t(CATEGORY_LABEL_KEY[cat]),
    entities: displayRefs.filter((r) => r.category === cat),
  })).filter((g) => g.entities.length > 0);

  function toggleFavorite(entityId: string) {
    const next = favSet.has(entityId)
      ? favorites.filter((id) => id !== entityId)
      : [...favorites, entityId];
    updateCustomization({ favorites: next });
  }

  function toggleHide(entityId: string) {
    const next = hiddenSet.has(entityId)
      ? hiddenEntities.filter((id) => id !== entityId)
      : [...hiddenEntities, entityId];
    updateCustomization({ hiddenEntities: next });
  }

  const allIds = refs.map((r) => r.entity_id);
  const allHidden = allIds.length > 0 && allIds.every((id) => hiddenSet.has(id));

  function toggleHideAll() {
    if (allHidden) {
      updateCustomization({ hiddenEntities: hiddenEntities.filter((id) => !allIds.includes(id)) });
    } else {
      const set = new Set(hiddenEntities);
      for (const id of allIds) set.add(id);
      updateCustomization({ hiddenEntities: [...set] });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={device.name}
      icon={<DeviceIcon domain={device.primaryDomain} size={20} />}
      className="modal-panel--wide"
    >
      <div className="device-modal">
        <div className="device-modal__meta">
          {device.areaName && (
            <span className="device-modal__chip">
              <MapPin size={13} strokeWidth={2} aria-hidden="true" />
              {device.areaName}
            </span>
          )}
          <span className="device-modal__chip">
            <Boxes size={13} strokeWidth={2} aria-hidden="true" />
            {integrationLabel(t, device.integration)}
          </span>
          {(device.manufacturer || device.model) && (
            <span className="device-modal__chip device-modal__chip--muted">
              {[device.manufacturer, device.model].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>

        {editable && (
          <div className="device-modal__toolbar">
            <button type="button" className="device-modal__hide-all" onClick={toggleHideAll}>
              {allHidden ? <Eye size={15} strokeWidth={2} /> : <EyeOff size={15} strokeWidth={2} />}
              {allHidden ? t('devices.modal.showAllEntities') : t('devices.modal.hideAllEntities')}
            </button>
          </div>
        )}

        {groups.map((group) => (
          <section key={group.category} className="device-modal__section">
            <div className="device-modal__section-label">
              {group.label}
              <span className="device-modal__section-count">{group.entities.length}</span>
            </div>
            <div className="device-modal__list">
              {group.entities.map((ref) => {
                const live = liveById.get(ref.entity_id);
                if (!live) return null;
                return (
                  <DeviceEntityRow
                    key={ref.entity_id}
                    entity={live}
                    name={ref.name}
                    editable={editable}
                    isFavorite={favSet.has(ref.entity_id)}
                    onToggleFavorite={() => toggleFavorite(ref.entity_id)}
                    isHidden={ref.hidden}
                    onToggleHide={() => toggleHide(ref.entity_id)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
