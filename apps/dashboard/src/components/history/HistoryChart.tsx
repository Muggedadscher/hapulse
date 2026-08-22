/**
 * HistoryChart — a lightweight inline-SVG line/area chart for a numeric
 * entity's history. No charting dependency: it renders a single path plus a
 * soft gradient area, scaled into a fixed viewBox and stretched responsively.
 *
 * All colours come from the caller (a CSS-variable string like `var(--danger)`)
 * so the chart inherits the active theme automatically.
 */

import React, { useId, useMemo } from 'react';
import type { HistoryPoint } from '@hapulse/core';

interface HistoryChartProps {
  points: HistoryPoint[];
  /** Stroke/fill colour — pass a CSS variable, e.g. `var(--danger)`. */
  color: string;
  /** Unit appended to the min/max axis labels (e.g. "°C"). */
  unit?: string | undefined;
}

// viewBox geometry — the SVG stretches to its container width via width=100%.
const VIEW_W = 640;
const VIEW_H = 200;
const PAD_L = 6;
const PAD_R = 44; // room for right-hand value labels
const PAD_T = 12;
const PAD_B = 22; // room for time labels
const PLOT_W = VIEW_W - PAD_L - PAD_R;
const PLOT_H = VIEW_H - PAD_T - PAD_B;

function formatValue(v: number): string {
  return `${Math.round(v * 10) / 10}`;
}

function tickTimeLabel(t: number, spanMs: number): string {
  const d = new Date(t);
  // Windows up to ~36h read as clock time; longer windows read as a date.
  if (spanMs <= 36 * 60 * 60 * 1000) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

export function HistoryChart({ points, color, unit }: HistoryChartProps) {
  const gradientId = useId();

  const geom = useMemo(() => {
    const first = points[0];
    const last = points[points.length - 1];
    if (first === undefined || last === undefined) return null;

    const tMin = first.t;
    const tMax = last.t;
    const tSpan = Math.max(tMax - tMin, 1);

    let vMin = first.v;
    let vMax = first.v;
    for (const p of points) {
      if (p.v < vMin) vMin = p.v;
      if (p.v > vMax) vMax = p.v;
    }
    // Pad the value domain so the line never hugs the top/bottom edge.
    const vRange = vMax - vMin;
    const vPad = vRange === 0 ? Math.max(Math.abs(vMax) * 0.1, 1) : vRange * 0.12;
    const domMin = vMin - vPad;
    const domMax = vMax + vPad;
    const domSpan = Math.max(domMax - domMin, 1e-6);

    const x = (t: number) => PAD_L + ((t - tMin) / tSpan) * PLOT_W;
    const y = (v: number) => PAD_T + (1 - (v - domMin) / domSpan) * PLOT_H;

    const coords = points.map((p) => ({ px: x(p.t), py: y(p.v) }));

    const line = coords
      .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.px.toFixed(2)},${c.py.toFixed(2)}`)
      .join(' ');

    const firstC = coords[0];
    const lastC = coords[coords.length - 1];
    const baseY = PAD_T + PLOT_H;
    const area =
      firstC && lastC
        ? `${line} L${lastC.px.toFixed(2)},${baseY} L${firstC.px.toFixed(2)},${baseY} Z`
        : '';

    // 4 evenly-spaced time ticks along the domain.
    const ticks = [0, 1, 2, 3].map((i) => {
      const frac = i / 3;
      const t = tMin + tSpan * frac;
      return { px: PAD_L + frac * PLOT_W, label: tickTimeLabel(t, tSpan) };
    });

    return { line, area, vMin, vMax, yMin: y(vMin), yMax: y(vMax), ticks };
  }, [points]);

  if (!geom) return null;

  return (
    <svg
      className="history-chart"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label="History chart"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* min / max guide lines */}
      <line
        x1={PAD_L}
        y1={geom.yMax}
        x2={PAD_L + PLOT_W}
        y2={geom.yMax}
        className="history-chart__guide"
      />
      <line
        x1={PAD_L}
        y1={geom.yMin}
        x2={PAD_L + PLOT_W}
        y2={geom.yMin}
        className="history-chart__guide"
      />

      {/* area + line */}
      <path d={geom.area} fill={`url(#${gradientId})`} stroke="none" />
      <path
        d={geom.line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* value labels (max top, min bottom) */}
      <text x={PAD_L + PLOT_W + 6} y={geom.yMax} className="history-chart__vlabel" dominantBaseline="middle">
        {formatValue(geom.vMax)}
        {unit ? ` ${unit}` : ''}
      </text>
      <text x={PAD_L + PLOT_W + 6} y={geom.yMin} className="history-chart__vlabel" dominantBaseline="middle">
        {formatValue(geom.vMin)}
        {unit ? ` ${unit}` : ''}
      </text>

      {/* time ticks */}
      {geom.ticks.map((tick, i) => (
        <text
          key={i}
          x={tick.px}
          y={VIEW_H - 6}
          className="history-chart__tlabel"
          textAnchor={i === 0 ? 'start' : i === geom.ticks.length - 1 ? 'end' : 'middle'}
        >
          {tick.label}
        </text>
      ))}
    </svg>
  );
}
