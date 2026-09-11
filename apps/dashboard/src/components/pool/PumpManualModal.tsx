/**
 * [fork] PumpManualModal — "start a manual run" dialog.
 *
 * Opened from the pump hero's Manuell button (and the manual card). Lets the
 * user pick a run length, then starts the manual run: it writes the chosen
 * minutes into the manual-duration input_number and flips the mode to Manuell —
 * the HA automation does the rest (timer + pump, revert to Automatik on end).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Hand, Play } from 'lucide-react';
import { clampManualMinutes } from '@hapulse/core';
import { Modal } from '../ui/Modal';
import { useEntity } from '../../ha/hooks';
import { useT } from '../../i18n/useT';
import { POOL_ENTITIES, poolModeTone } from './poolConfig';
import { setDurationMinutes, setPoolMode } from '../../ha/pool';
import { PoolDurationPicker } from './PoolDurationPicker';

interface PumpManualModalProps {
  open: boolean;
  onClose: () => void;
}

export function PumpManualModal({ open, onClose }: PumpManualModalProps) {
  const t = useT();
  const mode = useEntity(POOL_ENTITIES.mode);
  const manualDur = useEntity(POOL_ENTITIES.manualDuration);

  const options = (mode?.attributes['options'] as string[] | undefined) ?? [];
  const manualOption = options.find((o) => poolModeTone(o) === 'manual');

  // Seed the picker from the current stored duration, but only when the modal
  // opens — so an in-flight pick isn't reset by a background state update.
  const stored = manualDur ? clampManualMinutes(parseFloat(manualDur.state)) : 30;
  const [minutes, setMinutes] = useState(stored);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) setMinutes(stored);
    wasOpen.current = open;
  }, [open, stored]);

  const start = () => {
    if (!manualOption) return;
    void setDurationMinutes(POOL_ENTITIES.manualDuration, minutes);
    void setPoolMode(POOL_ENTITIES.mode, manualOption);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('pool.manual.startTitle')}
      icon={<Hand size={18} strokeWidth={1.75} />}
      className="pool-manual-modal"
      footer={
        <button
          type="button"
          className="btn btn--primary pool-manual__action"
          onClick={start}
          disabled={!manualOption}
        >
          <Play size={16} strokeWidth={2} />
          {t('pool.manual.start')}
        </button>
      }
    >
      <PoolDurationPicker minutes={minutes} onChange={setMinutes} label={t('pool.manual.durationTitle')} />
    </Modal>
  );
}
