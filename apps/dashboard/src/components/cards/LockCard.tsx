import React from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Card } from '../ui/Card';
import { useLockAction } from '../security/LockConfirm'; // [fork]
import { lockBusy } from '../security/lockLogic';
import { useT, useStateLabel } from '../../i18n/useT';
import type { HassEntity } from '@hapulse/core';
import './cards.css';

interface LockCardProps {
  entity: HassEntity;
  name: string;
}

export function LockCard({ entity, name }: LockCardProps) {
  const t = useT();
  const sl = useStateLabel();
  const isLocked = entity.state === 'locked';
  // [fork] unlock asks first, code entry when needed, no action while moving/jammed/unavailable
  const { request, dialog } = useLockAction();
  const busy = lockBusy(entity.state);

  return (
    <Card className="lock-card">
      {/* Icon chip — green when locked, amber when unlocked */}
      <div className={`icon-chip lock-card__chip lock-card__chip--${isLocked ? 'locked' : 'unlocked'}`}>
        {isLocked ? <Lock size={20} strokeWidth={1.75} /> : <Unlock size={20} strokeWidth={1.75} />}
      </div>

      <div className="lock-card__info">
        <div className="lock-card__name">{name}</div>
        <div className={`lock-card__state lock-card__state--${isLocked ? 'locked' : 'unlocked'}`}>
          {sl('lock', entity.state)}
        </div>
      </div>

      <button
        type="button"
        className="lock-card__btn"
        onClick={() => request(isLocked ? 'unlock' : 'lock', [entity])}
        disabled={busy}
        aria-label={isLocked ? t('cards.lock.unlock') : t('cards.lock.lock')}
      >
        {isLocked ? t('cards.lock.unlock') : t('cards.lock.lock')}
      </button>
      {dialog}
    </Card>
  );
}
