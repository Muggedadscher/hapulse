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
import { startManualRun } from '../../ha/pool';
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

  const [starting, setStarting] = useState(false);
  const start = () => {
    if (!manualOption || starting) return;
    setStarting(true);
    // sequential (duration before the mode switch); already in Manuell → restart the timer with the new duration.
    // A failed call keeps the dialog open (callService shows the error).
    startManualRun(POOL_ENTITIES.manualDuration, POOL_ENTITIES.mode, manualOption, mode?.state === manualOption,
      POOL_ENTITIES.manualRestartScript, minutes)
      .then(() => onClose())
      .catch(() => { /* toast shown; stay open */ })
      .finally(() => setStarting(false));
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
          disabled={!manualOption || starting}
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
