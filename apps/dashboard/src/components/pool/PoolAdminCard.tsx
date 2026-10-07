/**
 * [fork] PoolAdminCard — raw controls, gated to Home Assistant admins.
 *
 * Mirrors the original dashboard's admin section: the pump switch and the
 * hardware bypass as direct toggles, plus a guarded device restart. Rendered
 * only for admins (see `useCanEdit`).
 *
 * The restart asks with the browser dialog; in Glas with a confirmation sheet
 * instead, which a style can lay out (docs/glas/PLAN-ETAPPE-3.md K68).
 */

import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { useIsGlas } from '../../app/glas/useUiStyle';
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
  const glas = useIsGlas();
  const [confirming, setConfirming] = useState(false);

  const handleRestart = () => {
    if (glas) {
      setConfirming(true);
      return;
    }
    if (window.confirm(t('pool.admin.restartConfirm'))) {
      void pressButton(POOL_ENTITIES.restartButton);
    }
  };

  const confirmRestart = () => {
    setConfirming(false);
    void pressButton(POOL_ENTITIES.restartButton);
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

      {glas && (
        <Modal
          open={confirming}
          onClose={() => setConfirming(false)}
          title={t('pool.admin.restart')}
          icon={<RotateCcw size={18} strokeWidth={1.75} />}
          footer={
            <div className="g-confirm__actions">
              <button type="button" className="btn btn--secondary" onClick={() => setConfirming(false)}>
                {t('glas.sheet.cancel')}
              </button>
              <button type="button" className="btn btn--danger" onClick={confirmRestart}>
                {t('glas.pool.restartAction')}
              </button>
            </div>
          }
        >
          <p className="g-confirm__text">{t('pool.admin.restartConfirm')}</p>
        </Modal>
      )}
    </Card>
  );
}
