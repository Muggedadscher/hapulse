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
 * way. Choosing the chosen option again calls `onReselect` (the pool's "Manuell" reopens its duration picker).
 */

import React, { useRef, useState } from 'react';

export interface SegmentOption<V extends string> {
  value: V;
  /** The visible text; for a symbol option its accessible name (and tooltip). */
  label: string;
  /** Accessible name when the visible label alone is not enough. */
  aria?: string;
  /** A symbol option: shows only this symbol (every option of one segment has one, or none has). */
  icon?: React.ReactNode;
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
          data-value={o.value}
          onClick={() => choose(o)}
        >
          {o.icon ? <span aria-hidden="true">{o.icon}</span> : o.label}
        </button>
      ))}
    </div>
  );
}
