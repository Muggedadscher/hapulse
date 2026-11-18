/**
 * [fork] The charge range in the battery's window (plan glas/energie-neu/umsetzung/PLAN-E4-AKKU.md, E5).
 *
 * `BatteryRangeBar` is the picture: one bar from 0 to 100 % to scale — the reserve's zone, the usable zone in the
 * battery's green, the rest above the charge limit. It only shows.
 *
 * `BatteryLimitSlider` is a row with a name, the value and a slider like the charge limit in the iPhone's settings:
 * a native range input whose positions are the stops of core `batterySlider` (the grid of the entity's range plus
 * Home Assistant's value), so pointer, keys and screen readers move from stop to stop and the value reads as "98 %".
 * Stops the other value blocks (the reserve stays below the limit) cannot be taken: the slider stays at the last free
 * one. Without a slider (no range) the row shows the value only. The same row sets the power of a command or of a
 * plan's time (E5b): its stops are core batteryPowerStops.
 */

import type { CSSProperties } from 'react';
import type { BatterySlider } from '@hapulse/core';

export function BatteryRangeBar({ reserve, chargeLimit }: { reserve: number | null; chargeLimit: number | null }) {
  const low = Math.max(0, Math.min(100, reserve ?? 0));
  const high = Math.max(low, Math.min(100, chargeLimit ?? 100));
  return (
    <div className="en-bat-range" aria-hidden="true">
      {reserve !== null && <span className="en-bat-range__zone en-bat-range__zone--reserve" style={{ width: `${low}%` }} />}
      <span className="en-bat-range__zone en-bat-range__zone--usable" style={{ left: `${low}%`, width: `${high - low}%` }} />
    </div>
  );
}

interface BatteryLimitSliderProps {
  /** the two limits (E5), or the power of a command or a plan's time (E5b: charge green, discharge orange) */
  kind: 'chargeLimit' | 'reserve' | 'charge' | 'discharge';
  label: string;
  /** the value shown (the draft, else Home Assistant's) */
  value: number;
  /** null: the value only, no slider */
  slider: BatterySlider | null;
  disabled?: boolean;
  onChange: (value: number) => void;
  /** a value as text ("10 %") */
  format: (value: number) => string;
}

export function BatteryLimitSlider({ kind, label, value, slider, disabled = false, onChange, format }: BatteryLimitSliderProps) {
  const head = (
    <span className="en-bat-slider__line">
      <span className="en-bat-slider__name">{label}</span>
      <span className="en-bat-slider__value">{format(value)}</span>
    </span>
  );
  if (!slider) return <div className={`en-bat-slider en-bat-slider--${kind}`}>{head}</div>;
  const { stops, first, last } = slider;
  // the value is a stop; should Home Assistant have changed under the draft, the nearest one
  let index = stops.findIndex((s) => Math.abs(s - value) < 1e-6);
  if (index < 0) index = stops.reduce((best, s, i) => (Math.abs(s - value) < Math.abs(stops[best]! - value) ? i : best), 0);
  const max = Math.max(1, stops.length - 1);
  // how far the knob is (0…1); the Glas track fills up to the knob's centre with it
  const style = { '--en-fill': (index / max).toFixed(4) } as CSSProperties;
  return (
    <div className={`en-bat-slider en-bat-slider--${kind}`}>
      {head}
      <input
        type="range"
        className="en-bat-slider__input"
        aria-label={label}
        min={0}
        max={stops.length - 1}
        step={1}
        value={index}
        disabled={disabled || stops.length < 2}
        aria-valuetext={format(stops[index]!)}
        style={style}
        onChange={(e) => {
          const i = Math.min(last, Math.max(first, Number(e.target.value)));
          const next = stops[i];
          if (next !== undefined && Math.abs(next - value) > 1e-9) onChange(next);
        }}
      />
      <span className="en-bat-slider__ends" aria-hidden="true">
        <span>{format(stops[0]!)}</span>
        <span>{format(stops[stops.length - 1]!)}</span>
      </span>
    </div>
  );
}
