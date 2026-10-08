/**
 * [fork] Segment — the Glas segmented control (docs/GLAS-DESIGN.md §7.27, plan docs/glas/PLAN-ETAPPE-4.md K80).
 *
 * A track, a lens that slides to the chosen option (`snappy` spring) and equally wide options with text only.
 * `role="radiogroup"` with `role="radio"` options; arrow keys, Home and End choose and move the focus (selection
 * follows focus, the arrows wrap), only the chosen option is in the tab order. The sizes per use come from a
 * modifier class (`g-seg--energy`, …) in styles/glas/controls.css.
 */

import React, { useRef } from 'react';

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  /** Accessible name when the visible label alone is not enough. */
  aria?: string;
}

interface SegmentProps<V extends string> {
  options: readonly SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Accessible name of the group. */
  label: string;
  className?: string;
}

export function Segment<V extends string>({ options, value, onChange, label, className }: SegmentProps<V>) {
  const ref = useRef<HTMLDivElement>(null);
  const n = options.length;
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    let i: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = (index + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = (index - 1 + n) % n;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    const next = i === null ? undefined : options[i];
    if (i === null || !next) return;
    e.preventDefault();
    if (next.value !== value) onChange(next.value);
    ref.current?.querySelectorAll<HTMLButtonElement>('.g-seg__opt')[i]?.focus();
  }

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      className={className ? `g-seg ${className}` : 'g-seg'}
      style={{ '--g-seg-n': n, '--g-seg-i': index } as React.CSSProperties}
      onKeyDown={onKeyDown}
    >
      <span className="g-seg__track" aria-hidden="true" />
      <span className="g-seg__lens" aria-hidden="true" />
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={i === index}
          aria-label={o.aria}
          tabIndex={i === index ? 0 : -1}
          className="g-seg__opt"
          onClick={() => {
            if (o.value !== value) onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
