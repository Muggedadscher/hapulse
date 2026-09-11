/**
 * [fork] PoolDurationPicker — manual-run duration selector.
 *
 * Presentational: preset chips (30 min … 24 h) plus a free ± stepper. The
 * parent owns the value; both the "start manual" modal and the manual card
 * reuse this so there is a single picker. Pure UI — no HA I/O.
 */

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  POOL_MANUAL_PRESETS_MIN,
  POOL_MANUAL_MIN_MINUTES,
  POOL_MANUAL_MAX_MINUTES,
  clampManualMinutes,
  formatManualDuration,
} from '@hapulse/core';

/** ± step, matching the HA input_number. */
const STEP = 5;

interface PoolDurationPickerProps {
  minutes: number;
  onChange: (minutes: number) => void;
  label?: string | undefined;
}

export function PoolDurationPicker({ minutes, onChange, label }: PoolDurationPickerProps) {
  return (
    <div className="pool-duration">
      {label && <span className="pool-manual__label">{label}</span>}
      <div className="pool-manual__presets" role="group" aria-label={label}>
        {POOL_MANUAL_PRESETS_MIN.map((p) => (
          <button
            key={p}
            type="button"
            className={`pool-manual__preset${minutes === p ? ' pool-manual__preset--active' : ''}`}
            aria-pressed={minutes === p}
            onClick={() => onChange(p)}
          >
            {formatManualDuration(p)}
          </button>
        ))}
      </div>
      <div className="pool-manual__custom">
        <button
          type="button"
          className="pool-stepper__btn"
          aria-label={`−${STEP} min`}
          onClick={() => onChange(clampManualMinutes(minutes - STEP))}
          disabled={minutes <= POOL_MANUAL_MIN_MINUTES}
        >
          <Minus size={16} strokeWidth={2} />
        </button>
        <span className="pool-manual__custom-value data-font">{formatManualDuration(minutes)}</span>
        <button
          type="button"
          className="pool-stepper__btn"
          aria-label={`+${STEP} min`}
          onClick={() => onChange(clampManualMinutes(minutes + STEP))}
          disabled={minutes >= POOL_MANUAL_MAX_MINUTES}
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
