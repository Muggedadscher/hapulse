/**
 * [fork] The 270° ring of the Glas climate and blinds cards (docs/GLAS-DESIGN.md §7.11, §7.12, plan
 * docs/glas/PLAN-ETAPPE-4.md K83): a track and the value from the bottom left, clockwise. The value is a dash moved by
 * its offset, so a change sweeps (CSS transition in styles/glas/home-lists.css). `big` = the desktop gauge (168, r 70,
 * stroke 12), else the phone ring (116, r 48, stroke 10). Decoration only: the card names the value in text.
 */

import React from 'react';

interface GlasArcProps {
  /** 0–1 of the ring. */
  frac: number;
  big?: boolean;
  className?: string;
}

export function GlasArc({ frac, big = false, className }: GlasArcProps) {
  const size = big ? 168 : 116;
  const r = big ? 70 : 48;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * 0.75;
  const f = Math.max(0, Math.min(1, frac));
  const common = {
    cx: c,
    cy: c,
    r,
    fill: 'none',
    strokeWidth: big ? 12 : 10,
    strokeLinecap: 'round' as const,
    strokeDasharray: `${arc.toFixed(2)} ${circumference.toFixed(2)}`,
    transform: `rotate(135 ${c} ${c})`,
  };
  return (
    <svg
      className={className ? `g-arc ${className}` : 'g-arc'}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle className="g-arc__track" {...common} />
      {/* an empty dash would still draw its round cap as a dot */}
      <circle
        className="g-arc__value"
        {...common}
        style={{ strokeDashoffset: (arc * (1 - f)).toFixed(2), opacity: f > 0 ? 1 : 0 }}
      />
    </svg>
  );
}
