import React, { useCallback } from 'react';
import { Plug, Fan, ToggleLeft } from 'lucide-react';
import { Card } from '../ui/Card';
import { callService } from '../../ha/service';
import { domainOf, formatEntityState } from '@hapulse/core'; // [fork] formatEntityState
import type { HassEntity } from '@hapulse/core';
import './cards.css';
import { useIsGlas } from '../../app/glas/useUiStyle'; // [fork] Glas tile: the state as text (docs/glas/PLAN-ETAPPE-5.md K91, K95)
import { useLocale, useStateLabel } from '../../i18n/useT'; // [fork]

interface ToggleCardProps {
  entity: HassEntity;
  name: string;
}

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  switch: <Plug size={20} strokeWidth={1.75} />,
  fan: <Fan size={20} strokeWidth={1.75} />,
  input_boolean: <ToggleLeft size={20} strokeWidth={1.75} />,
};

export function ToggleCard({ entity, name }: ToggleCardProps) {
  const entityId = entity.entity_id;
  const domain = domainOf(entityId);
  const isOn = entity.state === 'on';
  const glas = useIsGlas(); // [fork]
  const locale = useLocale(); // [fork]
  const sl = useStateLabel(); // [fork]

  const handleToggle = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
      void callService(domain, 'toggle', {}, { entity_id: entityId });
    },
    [domain, entityId]
  );

  const icon = DOMAIN_ICONS[domain] ?? <Plug size={20} strokeWidth={1.75} />;

  return (
    <Card
      active={isOn}
      className="toggle-card"
      onClick={handleToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggle(e); }}
    >
      {/* Icon chip */}
      <div className={`icon-chip toggle-card__chip${isOn ? ' toggle-card__chip--on' : ''}`}>
        {icon}
      </div>

      <span className="toggle-card__name">{name}</span>
      {glas && <span className="g-tile-state">{formatEntityState(entity, locale, sl)}</span>}{/* [fork] Glas: the pill is hidden, the line names the state */}

      {/* Pill toggle — visual only (click propagates to card) */}
      <label className="pill-toggle" aria-hidden="true" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          readOnly
          checked={isOn}
          tabIndex={-1}
          onChange={() => { /* handled by card onClick */ }}
        />
        <span className="pill-toggle__track">
          <span className="pill-toggle__knob" />
        </span>
      </label>
    </Card>
  );
}
