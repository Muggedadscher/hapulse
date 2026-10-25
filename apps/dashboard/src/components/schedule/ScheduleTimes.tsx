/**
 * [fork] The body of a times page (plan glas/pool-zeiten/PLAN.md; first built for the heating plan,
 * glas/heizung-zeitplan/PLAN.md Etappe 2b, draft handy-zeiten-*.png): the days as round chips, the 24-hour ring, the
 * start and end of each period as time fields, another period, removing the chosen one, deleting all. The heating
 * plan (HeatingTimesPage) and the pool schedule (PoolTimesPage) use it; their window, head, saving and closing stay
 * with them, and so do the texts (`labels`, translated by the page).
 *
 * The chosen period (tinted; chosen by its fields or a tap on its arc) can be removed while there are more. A time
 * field keeps what is typed until it is left or Enter is pressed (scheduleRing.ts, @hapulse/core timePeriods.ts).
 * `tone` picks the colour of the arcs, the chosen period and the start knob: the heating plan's warm comfort tone or
 * the pool's run tone (CSS schedule.css, styles/glas/schedule.css).
 */

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { CircleAlert, Plus } from 'lucide-react';
import { movePeriodEdge, periodFieldMinutes, periodFieldValue, removePeriod } from '@hapulse/core';
import type { PeriodEdge, TimePeriod } from '@hapulse/core';
import { useLocale } from '../../i18n/useT';
import { ScheduleRing } from './ScheduleRing';
import type { ScheduleRingText } from './ScheduleRing';
import { formatPeriodRange } from './scheduleFormat';
import { addedPeriodIndex } from './scheduleRing';
import './schedule.css';

/** The texts of the body, translated by the page. */
export interface ScheduleTimesLabels extends ScheduleRingText {
  /** The group of day chips. */
  days: string;
  /** Under the chips while no day is chosen. */
  pickDays: string;
  /** Under the chips always (the pool: what a day left out means); none for the heating plan. */
  daysNote?: string;
  /** Under the time fields. */
  hint: string;
  /** "Add" with the number of periods there are (0, 1, more). */
  add: (count: number) => string;
  /** Removing the chosen period, with its range. */
  remove: (range: string) => string;
  /** Deleting all periods (of the chosen days). */
  clear: string;
  notSaved: string;
  retry: string;
}

/** One round day chip, Monday first. */
export interface ScheduleDayChip {
  /** The chip's text ("Mo") and its full name for screen readers ("Montag"). */
  short: string;
  long: string;
  on: boolean;
}

interface ScheduleTimesProps {
  tone: 'heat' | 'pool';
  days: readonly ScheduleDayChip[];
  onToggleDay: (index: number) => void;
  periods: TimePeriod[];
  onChange: (periods: TimePeriod[]) => void;
  /** The periods with one more, or null when no more fit (addPeriod with the page's limits). */
  addTo: (periods: readonly TimePeriod[]) => TimePeriod[] | null;
  /** While ✓ runs: shown, not changed. */
  busy: boolean;
  /** The last save did not reach HA: shown with "try again". */
  failed: boolean;
  onRetry: () => void;
  labels: ScheduleTimesLabels;
}

/**
 * A time field for one end of a period. It keeps what is typed until the field is left or Enter is pressed, then the
 * period takes it within its limits (a value the limits refuse snaps back): a field that took every keystroke would
 * jump while the hours are typed.
 */
function TimeField({
  time,
  edge,
  label,
  readOnly,
  onCommit,
  onFocus,
}: {
  time: string;
  edge: PeriodEdge;
  label: string;
  readOnly: boolean;
  onCommit: (minutes: number) => void;
  onFocus: () => void;
}) {
  const [typed, setTyped] = useState<string | null>(null);
  const commit = () => {
    if (typed === null) return;
    const minutes = periodFieldMinutes(typed, edge);
    if (minutes !== null) onCommit(minutes);
    setTyped(null);
  };
  return (
    <input
      type="time"
      className="sched__input"
      step={300}
      aria-label={label}
      readOnly={readOnly}
      value={typed ?? periodFieldValue(time)}
      onChange={(e) => setTyped(e.target.value)}
      onFocus={onFocus}
      onBlur={commit}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}

export function ScheduleTimes({ tone, days, onToggleDay, periods, onChange, addTo, busy, failed, onRetry, labels }: ScheduleTimesProps) {
  const locale = useLocale();
  const [selected, setSelected] = useState(0);
  const sel = Math.min(selected, Math.max(0, periods.length - 1));
  const added = addTo(periods);
  const noDays = !days.some((d) => d.on);
  // With more than one period, the fields say which one they set
  const fieldLabel = (label: string, i: number) => (periods.length > 1 ? labels.nth(label, i + 1) : label);

  return (
    <div className={`sched sched--${tone}`}>
      <div className="sched__days" role="group" aria-label={labels.days}>
        {days.map((d, i) => (
          <button
            key={i}
            type="button"
            className="sched__day"
            aria-pressed={d.on}
            aria-label={d.long}
            disabled={busy}
            onClick={() => onToggleDay(i)}
          >
            {d.short}
          </button>
        ))}
      </div>
      {labels.daysNote && <p className="sched__note sched__pick">{labels.daysNote}</p>}
      {noDays && <p className="sched__note sched__pick">{labels.pickDays}</p>}

      <ScheduleRing periods={periods} selected={sel} disabled={busy} onSelect={setSelected} onChange={onChange} text={labels} />

      {periods.length > 0 && (
        <>
          <div className="sched__list sched__periods">
            {periods.map((p, i) => (
              <div
                key={i}
                className={`sched__period${periods.length > 1 && i === sel ? ' sched__period--selected' : ''}`}
                onPointerDown={() => setSelected(i)}
              >
                <label className="sched__field">
                  <span className="sched__label">
                    <labels.fromIcon size={14} strokeWidth={1.75} aria-hidden="true" />
                    {labels.from}
                  </span>
                  <TimeField
                    time={p.from}
                    edge="from"
                    label={fieldLabel(labels.from, i)}
                    readOnly={busy}
                    onFocus={() => setSelected(i)}
                    onCommit={(m) => onChange(movePeriodEdge(periods, i, 'from', m))}
                  />
                </label>
                <label className="sched__field sched__field--to">
                  <span className="sched__label">
                    <labels.toIcon size={14} strokeWidth={1.75} aria-hidden="true" />
                    {labels.to}
                  </span>
                  <TimeField
                    time={p.to}
                    edge="to"
                    label={fieldLabel(labels.to, i)}
                    readOnly={busy}
                    onFocus={() => setSelected(i)}
                    onCommit={(m) => onChange(movePeriodEdge(periods, i, 'to', m))}
                  />
                </label>
              </div>
            ))}
          </div>
          <p className="sched__note">{labels.hint}</p>
        </>
      )}

      {added && (
        <div className="sched__list sched__actions">
          <button
            type="button"
            className="sched__row sched__add"
            disabled={busy}
            onClick={() => {
              onChange(added);
              setSelected(Math.max(0, addedPeriodIndex(periods, added)));
            }}
          >
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            <span>{labels.add(periods.length)}</span>
          </button>
        </div>
      )}

      {periods.length > 0 && (
        <div className="sched__list sched__actions">
          {periods.length > 1 && periods[sel] && (
            <button
              type="button"
              className="sched__row sched__clear"
              disabled={busy}
              onClick={() => {
                onChange(removePeriod(periods, sel));
                setSelected(Math.max(0, sel - 1));
              }}
            >
              {labels.remove(formatPeriodRange(periods[sel], locale))}
            </button>
          )}
          <button type="button" className="sched__row sched__clear" disabled={busy} onClick={() => onChange([])}>
            {labels.clear}
          </button>
        </div>
      )}

      {failed && (
        <p className="sched__error" role="alert">
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>
            {labels.notSaved}{' '}
            <button type="button" className="sched__retry" onClick={onRetry}>
              {labels.retry}
            </button>
          </span>
        </p>
      )}
    </div>
  );
}
