import React, { useCallback } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { callService } from '../../ha/service';
import { useT } from '../../i18n/useT';
import { Card } from '../ui/Card';
import { LocksList } from './LocksList';
import type { HassEntity, Room } from '@hapulse/core';
import './LocksSectionCard.css';

interface LocksSectionCardProps {
  locks: HassEntity[];
  rooms: Room[];
}

export function LocksSectionCard({ locks, rooms }: LocksSectionCardProps) {
  const t = useT();
  const lockedCount = locks.filter((l) => l.state === 'locked').length;
  const allLocked = lockedCount === locks.length;
  const allUnlocked = lockedCount === 0;

  const lockAll = useCallback(() => {
    locks.forEach((l) => callService('lock', 'lock', {}, { entity_id: l.entity_id }));
  }, [locks]);

  const unlockAll = useCallback(() => {
    locks.forEach((l) => callService('lock', 'unlock', {}, { entity_id: l.entity_id }));
  }, [locks]);

  return (
    <Card className="locks-section-card">
      {/* Header */}
      <div className="locks-section-card__header">
        <div className="locks-section-card__title-row">
          <span className={`locks-section-card__icon-chip${allLocked ? ' locks-section-card__icon-chip--locked' : ' locks-section-card__icon-chip--unlocked'}`}>
            {allLocked
              ? <Lock size={16} strokeWidth={1.75} />
              : <LockOpen size={16} strokeWidth={1.75} />}
          </span>
          <span className="locks-section-card__title">{t('security.locks.title')}</span>
          <span className="locks-section-card__count">
            {t('security.locks.count', { locked: lockedCount, total: locks.length })}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="locks-section-card__controls">
        <button
          type="button"
          className="locks-section-card__ctrl-btn locks-section-card__ctrl-btn--lock"
          onClick={lockAll}
          disabled={allLocked}
        >
          <Lock size={15} strokeWidth={1.75} />
          {t('security.locks.lockAll')}
        </button>
        <button
          type="button"
          className="locks-section-card__ctrl-btn locks-section-card__ctrl-btn--unlock"
          onClick={unlockAll}
          disabled={allUnlocked}
        >
          <LockOpen size={15} strokeWidth={1.75} />
          {t('security.locks.unlockAll')}
        </button>
      </div>

      <div className="locks-section-card__divider" aria-hidden="true" />

      {/* Individual lock rows */}
      <LocksList locks={locks} rooms={rooms} />
    </Card>
  );
}
