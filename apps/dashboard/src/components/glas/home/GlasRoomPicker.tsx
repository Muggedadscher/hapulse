/**
 * [fork] The room list under the Glas climate and blinds controls (docs/GLAS-DESIGN.md §7.11, §7.12, plan
 * docs/glas/PLAN-ETAPPE-4.md K83): a row per room with its value and a check on the chosen one; choosing a row moves
 * the controls above to that room. Klassisch's rows were plain list items for the mouse only; here they are radios
 * (`role="radiogroup"`): arrow keys, Home and End choose and move the focus like the segment (components/glas/Segment.tsx),
 * only the chosen row is in the tab order. `note` is a short coloured word the desktop shows before the value
 * ("Heizen"); the phone hides it.
 */

import React, { useRef } from 'react';
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export interface GlasRoomPickerRow {
  key: string;
  name: string;
  value: string;
  note?: ReactNode;
}

interface GlasRoomPickerProps {
  rows: readonly GlasRoomPickerRow[];
  selected: string;
  onSelect: (key: string) => void;
  /** Accessible name of the group. */
  label: string;
}

export function GlasRoomPicker({ rows, selected, onSelect, label }: GlasRoomPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const n = rows.length;
  const index = Math.max(0, rows.findIndex((r) => r.key === selected));

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    let i: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') i = (index + 1) % n;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') i = (index - 1 + n) % n;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    const next = i === null ? undefined : rows[i];
    if (i === null || !next) return;
    e.preventDefault();
    if (next.key !== selected) onSelect(next.key);
    ref.current?.querySelectorAll<HTMLButtonElement>('.g-pick__row')[i]?.focus();
  }

  return (
    <div ref={ref} role="radiogroup" aria-label={label} className="g-pick" onKeyDown={onKeyDown}>
      {rows.map((r, i) => (
        <button
          key={r.key}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          className="g-pick__row"
          onClick={() => {
            if (r.key !== selected) onSelect(r.key);
          }}
        >
          <span className="g-pick__line">
            <span className="g-pick__name">{r.name}</span>
            {r.note}
            <span className="g-pick__value">{r.value}</span>
            <Check className="g-pick__check" size={18} strokeWidth={2.5} aria-hidden="true" />
          </span>
        </button>
      ))}
    </div>
  );
}
