/**
 * [fork] Confirmation (and code entry) for lock actions.
 *
 * Unlocking a door is never a single accidental tap: every unlock — one lock or
 * "unlock all" — asks first; locking asks only when the lock needs a code. The
 * dialog stays open when HA rejects the call (wrong code), the error itself is
 * shown by callService's toast.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import type { HassEntity } from '@hapulse/core';
import { Modal } from '../ui/Modal';
import { callService } from '../../ha/service';
import { useT } from '../../i18n/useT';
import { lockCodeIsNumeric, lockNeedsCode, lockNeedsDialog } from './lockLogic';
import { shake } from '../glas/sheet/shake';
import './LockConfirm.css';

const stopBubble = (e: React.SyntheticEvent) => e.stopPropagation();

interface Request {
  service: 'lock' | 'unlock';
  entities: HassEntity[];
}

function friendlyName(e: HassEntity): string {
  return (e.attributes['friendly_name'] as string | undefined) ?? e.entity_id;
}

function LockConfirmDialog({ request, onClose }: { request: Request; onClose: () => void }) {
  const t = useT();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const { service, entities } = request;
  const withCode = entities.some(lockNeedsCode);
  const numeric = withCode && entities.filter(lockNeedsCode).every(lockCodeIsNumeric);
  const unlock = service === 'unlock';

  const confirm = useCallback(async () => {
    if (busy || (withCode && !code)) return;
    setBusy(true);
    const results = await Promise.allSettled(
      entities.map((e) =>
        callService('lock', service, lockNeedsCode(e) ? { code } : {}, { entity_id: e.entity_id }),
      ),
    );
    setBusy(false);
    if (results.every((r) => r.status === 'fulfilled')) onClose();
    else {
      setCode('');
      shake(codeRef.current); // Glas only: a wrong code shakes the field (docs/glas/PLAN-ETAPPE-3.md K56)
    }
  }, [busy, withCode, code, entities, service, onClose]);

  const question =
    entities.length === 1
      ? t(unlock ? 'security.locks.confirmUnlockOne' : 'security.locks.confirmLockOne', { name: friendlyName(entities[0]!) })
      : t(unlock ? 'security.locks.confirmUnlockAll' : 'security.locks.confirmLockAll', { count: entities.length });

  return (
    <Modal
      open
      onClose={onClose}
      title={unlock ? t('security.locks.unlock') : t('security.locks.lock')}
      icon={unlock ? <LockOpen size={18} strokeWidth={1.75} /> : <Lock size={18} strokeWidth={1.75} />}
      footer={
        <div className="lock-confirm__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            {t('security.locks.cancel')}
          </button>
          <button
            type="button"
            className={`btn ${unlock ? 'btn--danger' : 'btn--primary'}`}
            onClick={() => void confirm()}
            disabled={busy || (withCode && !code)}
          >
            {unlock ? t('security.locks.unlock') : t('security.locks.lock')}
          </button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void confirm();
        }}
        className="lock-confirm"
      >
        <p className="lock-confirm__text">{question}</p>
        {withCode && (
          <input
            type="password"
            className="lock-confirm__code"
            ref={codeRef}
            autoComplete="off"
            autoFocus
            inputMode={numeric ? 'numeric' : 'text'}
            placeholder={t('security.locks.codePlaceholder')}
            aria-label={t('security.locks.codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        )}
      </form>
    </Modal>
  );
}

/**
 * Lock actions with the confirmation rules above.
 * `request(service, entities)` either calls HA directly (plain lock) or opens the dialog;
 * render `dialog` somewhere in the component.
 */
export function useLockAction(): {
  request: (service: 'lock' | 'unlock', entities: HassEntity[]) => void;
  dialog: React.ReactNode;
} {
  const [pending, setPending] = useState<Request | null>(null);
  const request = useCallback((service: 'lock' | 'unlock', entities: HassEntity[]) => {
    if (entities.length === 0) return;
    if (lockNeedsDialog(service, entities)) {
      setPending({ service, entities });
      return;
    }
    for (const e of entities) void callService('lock', service, {}, { entity_id: e.entity_id }).catch(() => {});
  }, []);
  const close = useCallback(() => setPending(null), []);
  // The Modal is a portal, but React events still bubble through the component tree:
  // without this host a click in the dialog (or on its backdrop) also reached a
  // surrounding EntityCard and opened the entity detail on top.
  return {
    request,
    dialog: pending ? (
      <div className="lock-confirm-host" onClick={stopBubble} onPointerDown={stopBubble} onContextMenu={stopBubble}>
        <LockConfirmDialog request={pending} onClose={close} />
      </div>
    ) : null,
  };
}
