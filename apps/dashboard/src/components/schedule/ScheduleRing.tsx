/**
 * [fork] The 24-hour ring of the period editor (plan glas/pool-zeiten/PLAN.md; first built for the heating plan,
 * glas/heizung-zeitplan/PLAN.md Etappe 2b, draft handy-zeiten-*.png, like the sleep schedule of the Health app):
 * midnight at the top, clockwise, the periods as arcs on the track. The chosen period has two knobs, one where it
 * starts and one where it ends (the heating plan: sun and leaf, the pool: on and off); each is a slider (pointer and
 * keys, steps of five minutes, never across its other end or a neighbour: @hapulse/core timePeriods.ts). A tap on
 * another arc chooses that period. The middle shows how long the chosen period lasts.
 *
 * The drawing is SVG; the knobs and the middle are HTML on top, so they take the focus ring and the shadow of the
 * style. The arcs are for the pointer only: the time fields under the ring choose and set the same periods by keys.
 * Where both knobs lie on each other (a whole day, a few minutes), the first move of a drag picks the knob
 * (ringOverlapEdge).
 */

import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { movePeriodEdge, periodEdgeRange, periodMinutes, periodRingMinutes } from '@hapulse/core';
import type { PeriodEdge, TimePeriod } from '@hapulse/core';
import { useLocale } from '../../i18n/useT';
import { formatPeriodTime, periodDurationParts } from './scheduleFormat';
import { ringArcPath, ringKeyValue, ringOverlapEdge, ringPointerAngle, ringPoint, ringTurn } from './scheduleRing';

const SIZE = 310;
const C = SIZE / 2;
const R = 120;
const DAY = 24 * 60;
/** How far a drag that starts on both knobs turns before it picks one, in degrees. */
const PICK_TURN = 1.5;

/** What the ring says and shows; the texts are translated by the page that uses it. */
export interface ScheduleRingText {
  /** The group's name ("Komfortzeiten am Tag"). */
  ring: string;
  /** The knobs' names ("Komfort ab", "Eco ab") and symbols. */
  from: string;
  to: string;
  fromIcon: LucideIcon;
  toIcon: LucideIcon;
  /** A knob's name with the number of its period, when there are more ("Komfort ab, Zeit 2"). */
  nth: (label: string, n: number) => string;
  /** Under the length of the chosen period ("Komfort"), and in the middle without any period ("Eco den ganzen Tag"). */
  caption: string;
  empty: string;
}

interface ScheduleRingProps {
  periods: readonly TimePeriod[];
  /** The period with the knobs. */
  selected: number;
  onSelect: (index: number) => void;
  onChange: (periods: TimePeriod[]) => void;
  text: ScheduleRingText;
  /** While a save runs: shown, not moved. */
  disabled?: boolean;
}

/** Ticks every half hour, longer every hour, the longest at 0, 6, 12 and 18. */
const TICKS = Array.from({ length: 48 }, (_, i) => {
  const kind = i % 12 === 0 ? 'major' : i % 2 === 0 ? 'hour' : 'half';
  const [x1, y1] = ringPoint(i * 30, C, 90);
  const [x2, y2] = ringPoint(i * 30, C, kind === 'major' ? 82 : kind === 'hour' ? 85 : 87);
  return { key: i, kind, x1, y1, x2, y2 };
});
const LABELS = [0, 6, 12, 18].map((h) => {
  const [x, y] = ringPoint(h * 60, C, 68);
  return { h, x, y };
});

export function ScheduleRing({ periods: blocks, selected, onSelect, onChange, text, disabled = false }: ScheduleRingProps) {
  const locale = useLocale();
  const ringRef = useRef<HTMLDivElement>(null);
  const knobRefs = useRef<Record<PeriodEdge, HTMLDivElement | null>>({ from: null, to: null });
  // The drag in progress: its pointer, the knob it moves (null until the first move picks one) and where it started
  const drag = useRef<{ id: number; edge: PeriodEdge | null; angle: number } | null>(null);
  const block = blocks[selected];

  const setEdge = (edge: PeriodEdge, minutes: number) => {
    const next = movePeriodEdge(blocks, selected, edge, minutes);
    if (next[selected]![edge] !== blocks[selected]![edge]) onChange(next);
  };

  const pointerAngle = (e: PointerEvent<HTMLDivElement>): number | null => {
    const box = ringRef.current?.getBoundingClientRect();
    if (!box) return null;
    return ringPointerAngle(e.clientX, e.clientY, box.left + box.width / 2, box.top + box.height / 2);
  };

  /** Whether the pointer also lies on the other knob, so the press alone does not say which one is meant. */
  const onBoth = (e: PointerEvent<HTMLDivElement>, edge: PeriodEdge): boolean => {
    const other = knobRefs.current[edge === 'from' ? 'to' : 'from'];
    if (!other) return false;
    const box = other.getBoundingClientRect();
    const reach = box.width / 2 + 4; // the knob and its wider touch area (::after)
    return Math.hypot(e.clientX - (box.left + box.width / 2), e.clientY - (box.top + box.height / 2)) <= reach;
  };

  const onPointerDown = (edge: PeriodEdge) => (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || !block || !e.isPrimary || e.button !== 0) return;
    e.preventDefault(); // no text selection, no scrolling; the focus moves by hand
    e.currentTarget.focus({ preventScroll: true });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // the pointer is already gone
    }
    drag.current = { id: e.pointerId, edge: onBoth(e, edge) ? null : edge, angle: pointerAngle(e) ?? 0 };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!block || !d || d.id !== e.pointerId) return;
    const angle = pointerAngle(e);
    if (angle === null) return;
    if (!d.edge) {
      const turn = ringTurn(d.angle, angle);
      if (Math.abs(turn) < PICK_TURN) return;
      d.edge = ringOverlapEdge(blocks, selected, turn > 0);
      knobRefs.current[d.edge]?.focus({ preventScroll: true });
    }
    setEdge(d.edge, periodRingMinutes(angle, periodMinutes(block[d.edge])));
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  const onKeyDown = (edge: PeriodEdge) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !block) return;
    const value = ringKeyValue(e.key, periodMinutes(block[edge]), periodEdgeRange(blocks, selected, edge));
    if (value === null) return;
    e.preventDefault();
    setEdge(edge, value);
  };

  const knob = (edge: PeriodEdge) => {
    if (!block) return null;
    const minutes = periodMinutes(block[edge]);
    const range = periodEdgeRange(blocks, selected, edge);
    const [x, y] = ringPoint(minutes, C, R);
    const label = edge === 'from' ? text.from : text.to;
    const Icon = edge === 'from' ? text.fromIcon : text.toIcon;
    return (
      <div
        key={edge}
        ref={(el) => {
          knobRefs.current[edge] = el;
        }}
        className={`sched-ring__knob sched-ring__knob--${edge}`}
        role="slider"
        tabIndex={0}
        aria-label={blocks.length > 1 ? text.nth(label, selected + 1) : label}
        aria-valuemin={range.min}
        aria-valuemax={range.max}
        aria-valuenow={minutes}
        aria-valuetext={formatPeriodTime(block[edge], locale)}
        aria-disabled={disabled || undefined}
        style={{ left: `${(x / SIZE) * 100}%`, top: `${(y / SIZE) * 100}%` }}
        onPointerDown={onPointerDown(edge)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={onPointerEnd}
        onKeyDown={onKeyDown(edge)}
      >
        <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
      </div>
    );
  };

  const duration = block ? periodDurationParts(block, locale) : [];

  return (
    <div className="sched-ring" ref={ringRef} role="group" aria-label={text.ring}>
      <svg className="sched-ring__svg" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle className="sched-ring__track" cx={C} cy={C} r={R} />
        {blocks.map((b, i) => {
          const from = periodMinutes(b.from);
          const to = periodMinutes(b.to);
          return (
            <path
              key={`${b.from}-${b.to}`}
              className={`sched-ring__arc${i === selected ? ' sched-ring__arc--selected' : ''}`}
              d={ringArcPath(from, Math.min(to, DAY), C, R)}
              onClick={i === selected || disabled ? undefined : () => onSelect(i)}
            />
          );
        })}
        {TICKS.map((tk) => (
          <line key={tk.key} className={`sched-ring__tick sched-ring__tick--${tk.kind}`} x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} />
        ))}
        {LABELS.map((l) => (
          <text key={l.h} className="sched-ring__hour" x={l.x} y={l.y} textAnchor="middle" dominantBaseline="central">
            {l.h}
          </text>
        ))}
      </svg>
      <div className="sched-ring__center" aria-hidden="true">
        {block ? (
          <>
            <span className="sched-ring__len">{duration[0]}</span>
            {duration[1] && <span className="sched-ring__len2">{duration[1]}</span>}
            <span className="sched-ring__caption">{text.caption}</span>
          </>
        ) : (
          <span className="sched-ring__caption">{text.empty}</span>
        )}
      </div>
      {knob('to')}
      {knob('from')}
    </div>
  );
}
