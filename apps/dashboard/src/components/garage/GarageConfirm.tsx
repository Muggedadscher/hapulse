/**
 * [fork] Garage door / gate actions with a confirmation for opening.
 *
 * Opening (one door or "open all") always asks first — like unlocking a lock;
 * closing runs at once. Only doors that can act right now are sent
 * (`garageTargets`: not while moving or unreachable, not when already there).
 * The dialog stays open when HA rejects the call; the error itself is shown by
 * callService's toast.
 */

import React, { useCallback, useState } from 'react';
import { garageNeedsDialog, garageTargets } from '@hapulse/core';
import type { GarageService, HassEntity } from '@hapulse/core';
import { Modal } from '../ui/Modal';
import { callService } from '../../ha/service';
import { useT } from '../../i18n/useT';
import { GarageIcon } from './GarageIcon';
import './garage.css';

const stopBubble = (e: React.SyntheticEvent) => e.stopPropagation();

const COVER_SERVICE: Record<GarageService, string> = { open: 'open_cover', close: 'close_cover' };

function friendlyName(e: HassEntity): string {
  return (e.attributes['friendly_name'] as string | undefined) ?? e.entity_id;
}

function send(service: GarageService, entities: HassEntity[]): Promise<PromiseSettledResult<unknown>[]> {
  return Promise.allSettled(
    entities.map((e) => callService('cover', COVER_SERVICE[service], {}, { entity_id: e.entity_id })),
  );
}

function GarageOpenDialog({ entities, onClose }: { entities: HassEntity[]; onClose: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  const confirm = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const results = await send('open', entities);
    setBusy(false);
    if (results.every((r) => r.status === 'fulfilled')) onClose();
  }, [busy, entities, onClose]);

  const question =
    entities.length === 1
      ? t('garage.confirmOpenOne', { name: friendlyName(entities[0]!) })
      : t('garage.confirmOpenAll', { count: entities.length });

  return (
    <Modal
      open
      onClose={onClose}
      title={t('garage.open')}
      icon={<GarageIcon entity={{ ...entities[0]!, state: 'open' }} size={18} />}
      footer={
        <div className="garage-confirm__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            {t('garage.cancel')}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => void confirm()}
            disabled={busy}
          >
            {t('garage.open')}
          </button>
        </div>
      }
    >
      <p className="garage-confirm__text">{question}</p>
    </Modal>
  );
}

/**
 * `request(service, entities)` closes directly or opens the confirmation for
 * opening; `stop(entity)` stops a moving door. Render `dialog` in the component.
 */
export function useGarageAction(): {
  request: (service: GarageService, entities: HassEntity[]) => void;
  stop: (entity: HassEntity) => void;
  dialog: React.ReactNode;
} {
  const [pending, setPending] = useState<HassEntity[] | null>(null);
  const request = useCallback((service: GarageService, entities: HassEntity[]) => {
    const targets = garageTargets(entities, service);
    if (targets.length === 0) return;
    if (garageNeedsDialog(service)) {
      setPending(targets);
      return;
    }
    void send(service, targets);
  }, []);
  const stop = useCallback((entity: HassEntity) => {
    void callService('cover', 'stop_cover', {}, { entity_id: entity.entity_id }).catch(() => {});
  }, []);
  const close = useCallback(() => setPending(null), []);
  return {
    request,
    stop,
    // The Modal is a portal, but React events still bubble through the component
    // tree: without this host a click in the dialog (or on its backdrop) would
    // reach a surrounding EntityCard and open the entity detail as well.
    dialog: pending ? (
      <div className="garage-dialog-host" onClick={stopBubble} onPointerDown={stopBubble} onContextMenu={stopBubble}>
        <GarageOpenDialog entities={pending} onClose={close} />
      </div>
    ) : null,
  };
}
