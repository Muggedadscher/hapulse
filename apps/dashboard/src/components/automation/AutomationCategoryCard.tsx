import React, { useCallback } from 'react';
import { Workflow } from 'lucide-react';
import { useT } from '../../i18n/useT';
import type { TFunction } from '../../i18n/useT';
import { Card } from '../ui/Card';
import { callService } from '../../ha/service';
import type { HassEntity } from '@hapulse/core';
import './AutomationCategoryCard.css';

interface AutomationCategoryCardProps {
  category: string;
  automations: HassEntity[];
}

function entityName(e: HassEntity): string {
  return (
    (e.attributes.friendly_name as string | undefined) ??
    e.entity_id.split('.')[1]!.replace(/_/g, ' ')
  );
}

/** Takes the translator as a parameter: it runs outside any component body. */
function formatRelativeTime(t: TFunction, iso: string | null | undefined): string {
  if (!iso) return t('automations.time.never');
  try {
    const delta = Date.now() - new Date(iso).getTime();
    if (delta < 60000) return t('automations.time.justNow');
    if (delta < 3600000) return t('automations.time.minutesAgo', { count: Math.floor(delta / 60000) });
    if (delta < 86400000) return t('automations.time.hoursAgo', { count: Math.floor(delta / 3600000) });
    if (delta < 172800000) return t('automations.time.yesterday');
    return t('automations.time.daysAgo', { count: Math.floor(delta / 86400000) });
  } catch {
    return t('automations.time.unknown');
  }
}

function sortAutomations(automations: HassEntity[]): HassEntity[] {
  return [...automations].sort((a, b) => {
    const at = a.attributes.last_triggered as string | null | undefined;
    const bt = b.attributes.last_triggered as string | null | undefined;
    if (at && bt) return new Date(bt).getTime() - new Date(at).getTime();
    if (at) return -1;
    if (bt) return 1;
    return entityName(a).localeCompare(entityName(b));
  });
}

interface AutomationRowProps {
  entity: HassEntity;
}

function AutomationRow({ entity }: AutomationRowProps) {
  const t             = useT();
  const entityId      = entity.entity_id;
  const isOn          = entity.state === 'on';
  const name          = entityName(entity);
  const lastTriggered = entity.attributes.last_triggered as string | null | undefined;

  const handleToggle = useCallback(() => {
    void callService(
      'automation',
      isOn ? 'turn_off' : 'turn_on',
      {},
      { entity_id: entityId }
    );
  }, [entityId, isOn]);

  return (
    <li className={`auto-cat-row${!isOn ? ' auto-cat-row--disabled' : ''}`}>
      <span
        className={`auto-cat-row__icon${isOn ? ' auto-cat-row__icon--on' : ''}`}
        aria-hidden="true"
      >
        <Workflow size={13} strokeWidth={1.75} />
      </span>
      <div className="auto-cat-row__info">
        <span className="auto-cat-row__name">{name}</span>
        <span className="auto-cat-row__time">{formatRelativeTime(t, lastTriggered)}</span>
      </div>
      <label
        className="auto-row-toggle"
        aria-label={
          isOn
            ? t('automations.row.enabledAria', { name })
            : t('automations.row.disabledAria', { name })
        }
      >
        <input type="checkbox" checked={isOn} onChange={handleToggle} />
        <span className="auto-row-toggle__track" aria-hidden="true">
          <span className="auto-row-toggle__knob" />
        </span>
      </label>
    </li>
  );
}

export function AutomationCategoryCard({ category, automations }: AutomationCategoryCardProps) {
  const t           = useT();
  const sorted      = sortAutomations(automations);
  const activeCount = automations.filter((e) => e.state === 'on').length;

  return (
    <Card className="auto-cat-card">
      <div className="auto-cat-card__header">
        <div className="auto-cat-card__title-row">
          <span className="auto-cat-card__icon-chip" aria-hidden="true">
            <Workflow size={14} strokeWidth={1.75} />
          </span>
          <span className="auto-cat-card__title">{category}</span>
        </div>
        <span
          className="auto-cat-card__count"
          aria-label={t('automations.category.countAria', {
            active: activeCount,
            total: automations.length,
          })}
        >
          {activeCount}/{automations.length}
        </span>
      </div>

      <ul className="auto-cat-card__list" aria-label={t('automations.category.listAria', { category })}>
        {sorted.map((entity) => (
          <AutomationRow key={entity.entity_id} entity={entity} />
        ))}
      </ul>
    </Card>
  );
}
