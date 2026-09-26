/**
 * LocksList — Lock entities with lock/unlock buttons.
 * locked = positive color, unlocked = warning color.
 */

import React from 'react';
import { Lock, LockOpen } from 'lucide-react';
import type { HassEntity, Room } from '@hapulse/core';
import { getRoomName } from './roomUtils';
import { useT, useStateLabel } from '../../i18n/useT';
import { useLockAction } from './LockConfirm'; // [fork]
import { lockBusy } from './lockLogic';
import './LocksList.css';

interface LockRowProps {
  entity: HassEntity;
  roomName?: string | undefined;
}

function LockRow({ entity, roomName }: LockRowProps) {
  const t = useT();
  const sl = useStateLabel();
  const isLocked = entity.state === 'locked';
  const name = (entity.attributes['friendly_name'] as string | undefined) ?? entity.entity_id;
  // [fork] unlock asks first; no action while the lock moves, is jammed or unreachable
  const { request, dialog } = useLockAction();
  const busy = lockBusy(entity.state);

  return (
    <div className="locks-row">
      <span className={`locks-row__icon ${isLocked ? 'locks-row__icon--locked' : 'locks-row__icon--unlocked'}`}>
        {isLocked ? <Lock size={18} strokeWidth={1.75} /> : <LockOpen size={18} strokeWidth={1.75} />}
      </span>
      <div className="locks-row__name-col">
        <span className="locks-row__name">{name}</span>
        {roomName && <span className="locks-row__room">{roomName}</span>}
      </div>
      <span className={`locks-row__state ${isLocked ? 'locks-row__state--locked' : 'locks-row__state--unlocked'}`}>
        {sl('lock', entity.state)}
      </span>
      <div className="locks-row__actions">
        <button
          className="locks-row__btn locks-row__btn--lock"
          onClick={() => request('lock', [entity])}
          disabled={isLocked || busy}
          aria-label={t('security.locks.lock')}
          type="button"
        >
          <Lock size={15} strokeWidth={1.75} />
          {t('security.locks.lock')}
        </button>
        <button
          className="locks-row__btn locks-row__btn--unlock"
          onClick={() => request('unlock', [entity])}
          disabled={!isLocked || busy}
          aria-label={t('security.locks.unlock')}
          type="button"
        >
          <LockOpen size={15} strokeWidth={1.75} />
          {t('security.locks.unlock')}
        </button>
      </div>
      {dialog}
    </div>
  );
}

interface LocksListProps {
  locks: HassEntity[];
  rooms: Room[];
}

export function LocksList({ locks, rooms }: LocksListProps) {
  return (
    <div className="locks-list">
      {locks.map((lock) => (
        <LockRow
          key={lock.entity_id}
          entity={lock}
          roomName={getRoomName(lock.entity_id, rooms)}
        />
      ))}
    </div>
  );
}
