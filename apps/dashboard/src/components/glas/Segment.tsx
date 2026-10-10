/**
 * [fork] Segment — the Glas segmented control (docs/GLAS-DESIGN.md §7.27, plans docs/glas/PLAN-ETAPPE-4.md K80 and
 * PLAN-ETAPPE-5.md K92).
 *
 * A track, a lens that slides to the chosen option (`snappy` spring) and equally wide options with text only or
 * symbols only (never mixed). `role="radiogroup"` with `role="radio"` options; only one option is in the tab order.
 * The sizes per use come from a modifier class (`g-seg--energy`, …) in styles/glas/controls.css. `value: null`
 * chooses nothing (no lens, the first option takes the tab stop; the card sizes S/M/L when a size matches no preset,
 * K78).
 *
 * Keys: arrows (wrapping), Home and End. With `activation="auto"` (default) the selection follows the focus — for
 * views (period, grid/list). With `activation="manual"` the keys only move the focus and Space/Enter choose — for
 * segments that write something (settings, the pool mode), so that arrowing across does not set every option on the
 * way. Choosing the chosen option again calls `onReselect` (the pool's "Manuell" reopens its duration picker). An
 * option may carry data attributes (`data`): the style's options keep the hook of the classic buttons
 * (`data-glas-style-option`) that probes use to switch the style.
 *
 * Long labels (an input_select's own options, another language) that do not fit at the segment's size turn the whole
 * segment tight (`data-tight`: 13 px, less padding; controls.css), so a phone shows "Ausgeschalten" whole. On every
 * resize the widest label is measured at the normal size with the chosen weight: the segment stays tight exactly as
 * long as it does not fit. Still too long, a label ends in "…".
 */

import React, { useLayoutEffect, useRef, useState } from 'react';

/** Width of `text` in `font` (one canvas for all segments; 0 where there is no canvas). */
let measureCtx: CanvasRenderingContext2D | null | undefined;
function textWidth(text: string, font: string): number {
  if (measureCtx === undefined) measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return 0;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

export interface SegmentOption<V extends string> {
  value: V;
  /** The visible text; for a symbol option its accessible name (and tooltip). */
  label: string;
  /** Accessible name when the visible label alone is not enough. */
  aria?: string;
  /** A symbol option: shows only this symbol (every option of one segment has one, or none has). */
  icon?: React.ReactNode;
  /** Data attributes for the option's button, e.g. the hook a classic button of the same choice carries. */
  data?: Record<`data-${string}`, string>;
}

interface SegmentProps<V extends string> {
  options: readonly SegmentOption<V>[];
  value: V | null;
  onChange: (value: V) => void;
  /** Accessible name of the group. */
  label: string;
  className?: string;
  /** 'auto' (default): the arrows choose. 'manual': the arrows move the focus, Space/Enter choose. */
  activation?: 'auto' | 'manual';
  /** The chosen option was chosen again (click, Space, Enter). */
  onReselect?: (value: V) => void;
}

export function Segment<V extends string>({
  options,
  value,
  onChange,
  label,
  className,
  activation = 'auto',
  onReselect,
}: SegmentProps<V>) {
  const ref = useRef<HTMLDivElement>(null);
  // manual activation: the option the keys moved to (the tab stop while the focus is inside), null = the chosen one
  const [cursor, setCursor] = useState<number | null>(null);
  const n = options.length;
  const found = options.findIndex((o) => o.value === value);
  const index = Math.max(0, found);
  const stop = cursor !== null && cursor < n ? cursor : index;
  const labels = options.map((o) => (o.icon ? '' : o.label)).join('\n');

  // tight when a label does not fit (see above); data-tight is set here only, never by the render
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !labels.trim()) return;
    let alive = true;
    const fit = () => {
      // measure at the normal size: without the attribute for the moment of reading (the group's size stays)
      el.removeAttribute('data-tight');
      const opts = [...el.querySelectorAll<HTMLElement>('.g-seg__opt:not(.g-seg__opt--icon)')];
      const cs = opts[0] ? getComputedStyle(opts[0]) : null;
      if (!opts[0] || !cs) return;
      const font = `600 ${cs.fontSize} ${cs.fontFamily}`;
      const need = Math.max(...opts.map((o) => textWidth(o.textContent ?? '', font)));
      const room = opts[0].getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      el.toggleAttribute('data-tight', need + 1 > room); // 1 px slack: the canvas and the text may round apart
    };
    fit();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    ro?.observe(el);
    // a web font that arrives later changes the widths
    void document.fonts?.ready.then(() => {
      if (alive) fit();
    });
    return () => {
      alive = false;
      ro?.disconnect();
    };
  }, [labels]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const from = activation === 'manual' ? stop : found;
    let i: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = from < 0 ? 0 : (from + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = from < 0 ? n - 1 : (from - 1 + n) % n;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    const next = i === null ? undefined : options[i];
    if (i === null || !next) return;
    e.preventDefault();
    if (activation === 'manual') setCursor(i);
    else if (next.value !== value) onChange(next.value);
    ref.current?.querySelectorAll<HTMLButtonElement>('.g-seg__opt')[i]?.focus();
  }

  function choose(o: SegmentOption<V>) {
    setCursor(null);
    if (o.value !== value) onChange(o.value);
    else onReselect?.(o.value);
  }

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      className={className ? `g-seg ${className}` : 'g-seg'}
      data-none={found < 0 ? '' : undefined}
      style={{ '--g-seg-n': n, '--g-seg-i': index } as React.CSSProperties}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        // the focus left the group: the tab stop goes back to the chosen option
        if (cursor !== null && !e.currentTarget.contains(e.relatedTarget as Node | null)) setCursor(null);
      }}
    >
      <span className="g-seg__track" aria-hidden="true" />
      <span className="g-seg__lens" aria-hidden="true" />
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={i === found}
          aria-label={o.icon ? (o.aria ?? o.label) : o.aria}
          title={o.icon ? o.label : undefined}
          tabIndex={i === stop ? 0 : -1}
          className={o.icon ? 'g-seg__opt g-seg__opt--icon' : 'g-seg__opt'}
          {...o.data}
          data-value={o.value}
          onClick={() => choose(o)}
        >
          {o.icon ? <span aria-hidden="true">{o.icon}</span> : o.label}
        </button>
      ))}
    </div>
  );
}
