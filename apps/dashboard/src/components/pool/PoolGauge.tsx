/**
 * [fork] PoolGauge — a small radial progress ring (inline SVG, no deps).
 *
 * Shared by the solar card (current vs threshold) and the manual-timer card
 * (remaining vs duration). Colour comes in as a CSS token so it themes with the
 * rest of the app; the sweep animates via CSS (disabled under reduced motion).
 */

import React from 'react';

interface PoolGaugeProps {
  /** Progress fraction, 0..1. */
  value: number;
  /** Accent colour — pass a CSS variable, e.g. `var(--accent)`. */
  color: string;
  /** Big centre text (value). */
  primary: React.ReactNode;
  /** Small centre text under the value. */
  secondary?: React.ReactNode;
  /** Diameter in px. */
  size?: number;
  /** Stroke width in px. */
  stroke?: number;
}

export function PoolGauge({ value, color, primary, secondary, size = 132, stroke = 12 }: PoolGaugeProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = clamped * c;

  return (
    <div className="pool-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="pool-gauge__track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="pool-gauge__value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="pool-gauge__center">
        <span className="pool-gauge__primary" style={{ color }}>{primary}</span>
        {secondary != null && <span className="pool-gauge__secondary">{secondary}</span>}
      </div>
    </div>
  );
}
