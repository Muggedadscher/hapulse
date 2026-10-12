/**
 * [fork] Tafel — the building blocks of the pages' head cards in Glas (plan docs/glas/PLAN-TAFELN.md,
 * docs/GLAS-DESIGN.md §7.34): the head (symbol in a circle 56, a small line above, the state in its ink), the figures
 * as a grid with hairlines between the cells, rings for gauges and note rows for faults. Colour only for states
 * (GLAS-DESIGN §2.2): a count's symbol stays `label2`. Looks in styles/glas/tafel.css; every page's tafel keeps the
 * facts of its classic hero and only changes how they are shown.
 */

import React from 'react';

/** A state's colour family; `none` = no state (counts, a neutral head). */
export type TafelTone = 'none' | 'ok' | 'warn' | 'danger' | 'solar';

export const TAFEL_ICON = 15;

export interface TafelHeadProps {
  /** the symbol, 28 */
  icon: React.ReactNode;
  tone: TafelTone;
  /** small line above the state */
  kicker?: string | undefined;
  title: React.ReactNode;
  /** a line below the state */
  sub?: React.ReactNode;
  /** native tooltip of the state (e.g. the storage problem's text) */
  titleHint?: string | undefined;
}

export function TafelHead({ icon, tone, kicker, title, sub, titleHint }: TafelHeadProps) {
  return (
    <div className="g-tafel__head">
      <span className="g-tafel__badge" data-tone={tone} aria-hidden="true">
        {icon}
      </span>
      <div className="g-tafel__head-text">
        {kicker && <p className="g-tafel__kicker">{kicker}</p>}
        <p className="g-tafel__title" data-tone={tone} title={titleHint}>
          {title}
        </p>
        {sub && <p className="g-tafel__sub">{sub}</p>}
      </div>
    </div>
  );
}

export interface TafelFigure {
  key: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string | undefined;
  /** `warn` and `danger` tint symbol and value; `solar` the symbol (chart colour, §2.4); `none` = `label2` */
  tone?: TafelTone | undefined;
}

interface TafelGridProps {
  items: TafelFigure[];
  /** `number`: values 28/34 600 (counts, amounts); `text`: 17/22 600 (states as words) */
  kind?: 'number' | 'text';
  /** a cell's minimum width (px) and the most columns in a row; tafel.css knows the two columns' widths for 130 and 140 */
  min?: 130 | 140;
  max?: number;
}

/** The figures as a description list; hairlines between the cells (tafel.css). */
export function TafelGrid({ items, kind = 'number', min = 130, max = 4 }: TafelGridProps) {
  if (items.length === 0) return null;
  return (
    <dl
      className="g-tafel__grid"
      data-kind={kind}
      data-min={min}
      style={{ '--g-tafel-min': `${min}px`, '--g-tafel-max': max } as React.CSSProperties}
    >
      {items.map((f) => (
        <div key={f.key} className="g-tafel__cell" data-tone={f.tone ?? 'none'} data-tafel={f.key}>
          <dt className="g-tafel__label">
            {f.icon}
            <span className="g-tafel__label-text">{f.label}</span>
          </dt>
          <dd className="g-tafel__value">
            {f.value}
            {f.unit && <span className="g-tafel__unit">{` ${f.unit}`}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export interface TafelGauge {
  key: string;
  label: string;
  /** the text in the ring, e.g. "18 %" */
  value: string;
  /** 0–100 */
  pct: number;
  tone: 'ok' | 'warn' | 'danger';
}

const R = 26;
const C = 2 * Math.PI * R;

/** Gauges as rings (like the pool's solar ring): track `fill`, arc in the state's colour. */
export function TafelRings({ items }: { items: TafelGauge[] }) {
  if (items.length === 0) return null;
  return (
    <dl className="g-tafel__rings">
      {items.map((g) => {
        const pct = Math.max(0, Math.min(100, g.pct));
        return (
          <div key={g.key} className="g-tafel__ring" data-tone={g.tone} data-tafel={g.key}>
            {/* the label below the ring (tafel.css `order`); in the list the term comes first */}
            <dt className="g-tafel__ring-label">{g.label}</dt>
            <dd className="g-tafel__ring-pic">
              <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">
                <circle cx="32" cy="32" r={R} className="g-tafel__ring-track" />
                {pct > 0 && (
                  <circle
                    cx="32"
                    cy="32"
                    r={R}
                    className="g-tafel__ring-arc"
                    strokeDasharray={`${(C * pct) / 100} ${C}`}
                    transform="rotate(-90 32 32)"
                  />
                )}
              </svg>
              <span className="g-tafel__ring-value">{g.value}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export interface TafelNote {
  key: string;
  icon: React.ReactNode;
  tone: 'warn' | 'danger';
  text: string;
}

/** Faults below the figures: the symbol in its ink, the text 600 `label`, a hairline above each. */
export function TafelNotes({ items }: { items: TafelNote[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="g-tafel__notes">
      {items.map((n) => (
        <li key={n.key} className="g-tafel__note" data-tone={n.tone} data-tafel={n.key}>
          {n.icon}
          <span>{n.text}</span>
        </li>
      ))}
    </ul>
  );
}
