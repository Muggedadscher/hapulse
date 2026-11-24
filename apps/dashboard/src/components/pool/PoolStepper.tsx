/**
 * [fork] PoolStepper — the pool page's − value + control (classes `pool-stepper*`, Glas: round 44 buttons in
 * controls.css). With `label` it is the labelled column of the solar card, without it the bare row for a settings row
 * (`pool-row`, like the Siri duration).
 */

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface PoolStepperProps {
  /** Shown above the row and used for the buttons' names. */
  label: string;
  /** Hide the label above the row (a settings row names it on its left). */
  bare?: boolean;
  value: React.ReactNode;
  /** The step as the buttons announce it, e.g. "5 %" → "An ab −5 %". */
  stepText: string;
  canDown: boolean;
  canUp: boolean;
  onDown: () => void;
  onUp: () => void;
}

export function PoolStepper({ label, bare, value, stepText, canDown, canUp, onDown, onUp }: PoolStepperProps) {
  const controls = (
    <div className="pool-stepper__controls">
      <button type="button" className="pool-stepper__btn" aria-label={`${label} −${stepText}`} onClick={onDown} disabled={!canDown}>
        <Minus size={16} strokeWidth={2} />
      </button>
      <span className="pool-stepper__value data-font">{value}</span>
      <button type="button" className="pool-stepper__btn" aria-label={`${label} +${stepText}`} onClick={onUp} disabled={!canUp}>
        <Plus size={16} strokeWidth={2} />
      </button>
    </div>
  );
  if (bare) return controls;
  return (
    <div className="pool-stepper">
      <span className="pool-stepper__label">{label}</span>
      {controls}
    </div>
  );
}
