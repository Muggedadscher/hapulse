/**
 * [fork] The 24-hour ring of the times page (plan glas/heizung-zeitplan/PLAN.md Etappe 2b; draft handy-zeiten-*.png,
 * like the sleep schedule of the Health app): midnight at the top, clockwise, the comfort periods as arcs on the track.
 * The chosen period has two knobs, the sun where comfort starts and the leaf where eco starts again; each is a slider
 * (pointer and keys, steps of five minutes, never across its other end or a neighbour: heatingEdit.ts). A tap on
 * another arc chooses that period. The middle shows how long the chosen period lasts.
 *
 * The drawing is SVG; the knobs and the middle are HTML on top, so they take the focus ring and the shadow of the
 * style. The arcs are for the pointer only: the time fields under the ring choose and set the same periods by keys.
 */

import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { Leaf, Sun } from 'lucide-react';
import { heatingEdgeRange, heatingMinutes, heatingRingMinutes, moveHeatingEdge } from '@hapulse/core';
import type { HeatingBlock, HeatingEdge } from '@hapulse/core';
import { useLocale, useT } from '../../i18n/useT';
import { formatHeatingTime, heatingDurationParts } from './heatingFormat';
import { heatingArcPath, heatingKeyValue, heatingPointerAngle, heatingRingPoint } from './heatingTimes';

const SIZE = 310;
const C = SIZE / 2;
const R = 120;
const DAY = 24 * 60;

interface HeatingRingProps {
  blocks: readonly HeatingBlock[];
  /** The period with the knobs. */
  selected: number;
  onSelect: (index: number) => void;
  onChange: (blocks: HeatingBlock[]) => void;
}

/** Ticks every half hour, longer every hour, the longest at 0, 6, 12 and 18. */
const TICKS = Array.from({ length: 48 }, (_, i) => {
  const kind = i % 12 === 0 ? 'major' : i % 2 === 0 ? 'hour' : 'half';
  const [x1, y1] = heatingRingPoint(i * 30, C, 90);
  const [x2, y2] = heatingRingPoint(i * 30, C, kind === 'major' ? 82 : kind === 'hour' ? 85 : 87);
  return { key: i, kind, x1, y1, x2, y2 };
});
const LABELS = [0, 6, 12, 18].map((h) => {
  const [x, y] = heatingRingPoint(h * 60, C, 68);
  return { h, x, y };
});

export function HeatingRing({ blocks, selected, onSelect, onChange }: HeatingRingProps) {
  const t = useT();
  const locale = useLocale();
  const ringRef = useRef<HTMLDivElement>(null);
  const block = blocks[selected];

  const setEdge = (edge: HeatingEdge, minutes: number) => {
    const next = moveHeatingEdge(blocks, selected, edge, minutes);
    if (next[selected]![edge] !== blocks[selected]![edge]) onChange(next);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || e.button !== 0) return;
    e.preventDefault(); // no text selection, no scrolling; the focus moves by hand
    e.currentTarget.focus({ preventScroll: true });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // the pointer is already gone
    }
  };

  const onPointerMove = (edge: HeatingEdge) => (e: PointerEvent<HTMLDivElement>) => {
    if (!block || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const box = ringRef.current?.getBoundingClientRect();
    if (!box) return;
    const angle = heatingPointerAngle(e.clientX, e.clientY, box.left + box.width / 2, box.top + box.height / 2);
    setEdge(edge, heatingRingMinutes(angle, heatingMinutes(block[edge])));
  };

  const onKeyDown = (edge: HeatingEdge) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (!block) return;
    const value = heatingKeyValue(e.key, heatingMinutes(block[edge]), heatingEdgeRange(blocks, selected, edge));
    if (value === null) return;
    e.preventDefault();
    setEdge(edge, value);
  };

  const knob = (edge: HeatingEdge) => {
    if (!block) return null;
    const minutes = heatingMinutes(block[edge]);
    const range = heatingEdgeRange(blocks, selected, edge);
    const [x, y] = heatingRingPoint(minutes, C, R);
    return (
      <div
        key={edge}
        className={`heating-ring__knob heating-ring__knob--${edge}`}
        role="slider"
        tabIndex={0}
        aria-label={t(edge === 'from' ? 'heatingPlan.times.comfortFrom' : 'heatingPlan.times.ecoFrom')}
        aria-valuemin={range.min}
        aria-valuemax={range.max}
        aria-valuenow={minutes}
        aria-valuetext={formatHeatingTime(block[edge], locale)}
        style={{ left: `${(x / SIZE) * 100}%`, top: `${(y / SIZE) * 100}%` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove(edge)}
        onKeyDown={onKeyDown(edge)}
      >
        {edge === 'from' ? <Sun size={18} strokeWidth={2.2} aria-hidden="true" /> : <Leaf size={18} strokeWidth={2.2} aria-hidden="true" />}
      </div>
    );
  };

  const duration = block ? heatingDurationParts(block, locale) : [];

  return (
    <div className="heating-ring" ref={ringRef} role="group" aria-label={t('heatingPlan.times.ring')}>
      <svg className="heating-ring__svg" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle className="heating-ring__track" cx={C} cy={C} r={R} />
        {blocks.map((b, i) => {
          const from = heatingMinutes(b.from);
          const to = heatingMinutes(b.to);
          return (
            <path
              key={`${b.from}-${b.to}`}
              className={`heating-ring__arc${i === selected ? ' heating-ring__arc--selected' : ''}`}
              d={heatingArcPath(from, Math.min(to, DAY), C, R)}
              onClick={i === selected ? undefined : () => onSelect(i)}
            />
          );
        })}
        {TICKS.map((tk) => (
          <line key={tk.key} className={`heating-ring__tick heating-ring__tick--${tk.kind}`} x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} />
        ))}
        {LABELS.map((l) => (
          <text key={l.h} className="heating-ring__hour" x={l.x} y={l.y} textAnchor="middle" dominantBaseline="central">
            {l.h}
          </text>
        ))}
      </svg>
      <div className="heating-ring__center" aria-hidden="true">
        {block ? (
          <>
            <span className="heating-ring__len">{duration[0]}</span>
            {duration[1] && <span className="heating-ring__len2">{duration[1]}</span>}
            <span className="heating-ring__caption">{t('heatingPlan.phase.comfort')}</span>
          </>
        ) : (
          <span className="heating-ring__caption">{t('heatingPlan.sheet.ecoAllDay')}</span>
        )}
      </div>
      {knob('to')}
      {knob('from')}
    </div>
  );
}
