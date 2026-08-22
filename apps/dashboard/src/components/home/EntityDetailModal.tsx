/**
 * EntityDetailModal — opened from a (non-toggleable) favorite tile.
 *
 * Shows the entity's interactive control card (via EntityCard) plus a readable
 * list of its attributes. Stays live via useEntity.
 */

import React from 'react';
import { Modal } from '../ui/Modal';
import { EntityCard } from '../cards/EntityCard';
import { useEntity } from '../../ha/hooks';
import { useSettingsStore } from '../../stores/settingsStore';
import { useT } from '../../i18n/useT';
import './EntityDetailModal.css';

interface EntityDetailModalProps {
  /** The entity to show; null means closed. */
  entityId: string | null;
  onClose: () => void;
}

/** Attribute keys that are internal/noise and shouldn't be listed. */
const SKIP_ATTRS = new Set([
  'friendly_name',
  'icon',
  'entity_picture',
  'supported_features',
  'attribution',
  'hidden_by',
  'assumed_state',
  'editable',
  'restored',
]);

/** Humanize an attribute key: "current_temperature" → "Current temperature". */
function humanizeKey(key: string): string {
  const spaced = key.replace(/_/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Render an attribute value compactly for display. */
function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (Array.isArray(value)) {
    return value.length ? value.map((v) => formatValue(v)).join(', ') : '—';
  }
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  }
  return String(value);
}

export function EntityDetailModal({ entityId, onClose }: EntityDetailModalProps) {
  const t = useT();
  const entity = useEntity(entityId ?? '');
  const entityOverrides = useSettingsStore((s) => s.customization.entityOverrides);

  if (!entityId || !entity) {
    // Modal closed (or entity vanished) — render nothing.
    return null;
  }

  const override = entityOverrides[entity.entity_id];
  const name =
    override?.name ??
    (entity.attributes.friendly_name as string | undefined) ??
    entity.entity_id;

  const attrRows = Object.entries(entity.attributes).filter(
    ([key]) => !SKIP_ATTRS.has(key) && !key.startsWith('_')
  );

  return (
    <Modal open={entityId != null} onClose={onClose} title={name}>
      <div className="entity-detail">
        <div className="entity-detail__control">
          <EntityCard entity={entity} name={name} />
        </div>

        <div className="entity-detail__attrs">
          <div className="entity-detail__attrs-label">{t('home.entityDetail.attributesLabel')}</div>
          {attrRows.length > 0 ? (
            <dl className="entity-detail__attr-list">
              {attrRows.map(([key, value]) => (
                <div key={key} className="entity-detail__attr-row">
                  <dt className="entity-detail__attr-key">{humanizeKey(key)}</dt>
                  <dd className="entity-detail__attr-value">{formatValue(value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="entity-detail__attr-empty">{t('home.entityDetail.emptyAttrs')}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
