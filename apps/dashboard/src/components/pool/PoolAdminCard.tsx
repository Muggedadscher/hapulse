/**
 * [fork] PoolAdminCard — raw controls, gated to Home Assistant admins.
 *
 * Mirrors the original dashboard's admin section: the pump switch and the
 * hardware bypass as direct toggles, plus a guarded device restart. Rendered
 * only for admins (see `useCanEdit`).
 */

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Card } from '../ui/Card';
import { useEntity } from '../../ha/hooks';
import { useT } from '../../i18n/useT';
import { setSwitch, pressButton } from '../../ha/pool';
import { POOL_ENTITIES } from './poolConfig';

function AdminToggle({ entityId, label }: { entityId: string; label: string }) {
  const entity = useEntity(entityId);
  if (!entity) return null;
  const on = entity.state === 'on';
  return (
    <label className="pool-admin__row">
      <span className="pool-admin__row-label">{label}</span>
      <span className="pool-switch">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => void setSwitch(entityId, e.target.checked)}
          aria-label={label}
        />
        <span className="pool-switch__track" aria-hidden="true"><span className="pool-switch__thumb" /></span>
      </span>
    </label>
  );
}

export function PoolAdminCard() {
  const t = useT();
  const restart = useEntity(POOL_ENTITIES.restartButton);

  const handleRestart = () => {
    if (window.confirm(t('pool.admin.restartConfirm'))) {
      void pressButton(POOL_ENTITIES.restartButton);
    }
  };

  return (
    <Card className="pool-card pool-admin">
      <div className="pool-card__head">
        <h2 className="pool-card__title">{t('pool.admin.title')}</h2>
      </div>

      <div className="pool-admin__rows">
        <AdminToggle entityId={POOL_ENTITIES.pump} label={t('pool.admin.pump')} />
        <AdminToggle entityId={POOL_ENTITIES.bypass} label={t('pool.admin.bypass')} />
      </div>

      {restart && (
        <button type="button" className="btn btn--danger pool-admin__restart" onClick={handleRestart}>
          <RotateCcw size={16} strokeWidth={1.75} />
          {t('pool.admin.restart')}
        </button>
      )}
    </Card>
  );
}
