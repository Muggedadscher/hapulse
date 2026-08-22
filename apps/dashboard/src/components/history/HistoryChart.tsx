/**
 * HistoryChart — a lightweight inline-SVG line/area chart for a numeric
 * entity's history. No charting dependency: it renders a single path plus a
 * soft gradient area, scaled into a fixed viewBox and stretched responsively.
 *
 * When the series changes (e.g. the user picks another time range) the chart
 * MORPHS smoothly from the old shape into the new one instead of snapping:
 * both series are resampled to a fixed point count and tweened per-frame with
 * requestAnimationFrame. Respects `prefers-reduced-motion`.
 *
 * All colours come from the caller (a CSS-variable string like `var(--danger)`)
 * so the chart inherits the active theme automatically.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
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

// Morphing: every series is resampled to this many points so the tween is a
// simple 1:1 interpolation.
const SAMPLES = 100;
const ANIM_MS = 440;

function easeInOut(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

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

/** Resample a series to exactly `n` points, evenly spaced across its own time
 *  range, linearly interpolating the value. Enables a 1:1 morph tween. */
function resample(points: HistoryPoint[], n: number): HistoryPoint[] {
  const len = points.length;
  if (len === 0) return [];
  const first = points[0]!;
  if (len === 1) return Array.from({ length: n }, () => ({ t: first.t, v: first.v }));

  const last = points[len - 1]!;
  const t0 = first.t;
  const span = last.t - t0 || 1;

  const out: HistoryPoint[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const tt = t0 + (span * i) / (n - 1);
    while (j < len - 2 && points[j + 1]!.t < tt) j++;
    const a = points[j]!;
    const b = points[j + 1]!;
    const seg = b.t - a.t || 1;
    const f = Math.min(Math.max((tt - a.t) / seg, 0), 1);
    out.push({ t: tt, v: a.v + (b.v - a.v) * f });
  }
  return out;
}

/** Linear interpolation between two equal-length resampled series. */
function lerpSeries(from: HistoryPoint[], to: HistoryPoint[], p: number): HistoryPoint[] {
  const n = to.length;
  const out: HistoryPoint[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = from[i] ?? to[i]!;
    const b = to[i]!;
    out[i] = { t: a.t + (b.t - a.t) * p, v: a.v + (b.v - a.v) * p };
  }
  return out;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function HistoryChart({ points, color, unit }: HistoryChartProps) {
  const gradientId = useId();

  const target = useMemo(() => resample(points, SAMPLES), [points]);

  const [display, setDisplay] = useState<HistoryPoint[]>(target);
  const displayRef = useRef<HistoryPoint[]>(target);
  const firstRef = useRef(true);

  // Tween `display` from its current shape into every new `target`.
  useEffect(() => {
    // First mount: show immediately, no animation.
    if (firstRef.current) {
      firstRef.current = false;
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const from = displayRef.current;
    // Can't morph across mismatched lengths (e.g. empty ↔ data) — snap instead.
    if (prefersReducedMotion() || from.length !== target.length || target.length === 0) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const startFrom = from;
    let raf = 0;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / ANIM_MS, 1);
      const cur = lerpSeries(startFrom, target, easeInOut(p));
      displayRef.current = cur;
      setDisplay(cur);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const geom = useMemo(() => {
    const first = display[0];
    const last = display[display.length - 1];
    if (first === undefined || last === undefined) return null;

    const tMin = first.t;
    const tMax = last.t;
    const tSpan = Math.max(tMax - tMin, 1);

    let vMin = first.v;
    let vMax = first.v;
    for (const p of display) {
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

    const coords = display.map((p) => ({ px: x(p.t), py: y(p.v) }));

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
  }, [display]);

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
