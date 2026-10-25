/**
 * [fork] The pool schedule's times (plan glas/pool-zeiten/PLAN.md): the same editor as the heating plan's times —
 * the days as round chips, the 24-hour ring, "An ab" / "Aus ab" for each run, another run, deleting runs
 * (components/schedule/ScheduleTimes). It opens from "Bearbeiten" on the schedule card: in Glas a sheet with × and ✓,
 * in Klassisch a dialog with Cancel / Save.
 *
 * The scheduler behind it (switch.schedule_zeitplan_poolpumpe) holds ONE set of runs for all chosen days; on a day
 * left out it does not switch at all. ✓ writes days and runs with `scheduler.edit` (savePoolSchedule: contiguous
 * timeslots, repeat_type kept) and closes; runs that touch become one. Without a change ✓ only closes; while the
 * scheduler entity cannot be read ✓ stays off (saving would write "off all day"). When HA refuses, the page stays with
 * "Not saved … Try again". × and Cancel discard. The draft is taken once per opening (the card renders the page with a
 * new key each time): the entity's next_trigger moves while the page is open and must not reset the edit.
 */

import { useRef, useState } from 'react';
import { Check, Power, PowerOff } from 'lucide-react';
import {
  addPeriod,
  periodLength,
  POOL_FIRST_PERIOD,
  POOL_MAX_PERIODS,
  POOL_WEEKDAYS,
  poolPeriodsToWindows,
  poolWindowsToPeriods,
  samePeriods,
  sortWeekdays,
} from '@hapulse/core';
import type { PoolScheduleModel, PoolWeekday, TimePeriod } from '@hapulse/core';
import { Modal } from '../ui/Modal';
import { useLocale, useT } from '../../i18n/useT';
import { useIsGlas } from '../../app/glas/useUiStyle';
import { savePoolSchedule } from '../../ha/pool';
import { ScheduleTimes } from '../schedule/ScheduleTimes';
import type { ScheduleTimesLabels } from '../schedule/ScheduleTimes';
import { minutesParts, scheduleChipName, scheduleDayName } from '../schedule/scheduleFormat';
import { POOL_ENTITIES } from './poolConfig';

interface PoolTimesPageProps {
  open: boolean;
  /** The schedule as the card read it when the page opened. */
  initial: PoolScheduleModel;
  /** False while the scheduler entity is missing or has no timeslots: ✓ stays off. */
  readable: boolean;
  onClose: () => void;
}

/** "2 Std. 15 Min." for the minutes the runs take a day. */
export function poolDayLength(periods: readonly TimePeriod[], locale: string): string {
  return minutesParts(
    periods.reduce((sum, p) => sum + periodLength(p), 0),
    locale,
  ).join(' ');
}

/** True when days or runs differ from the schedule as read (runs compared as they would be saved). */
export function poolTimesChanged(initial: PoolScheduleModel, days: readonly PoolWeekday[], periods: readonly TimePeriod[]): boolean {
  const before = sortWeekdays([...initial.weekdays]);
  const after = sortWeekdays([...days]);
  if (before.join() !== after.join()) return true;
  return !samePeriods(poolWindowsToPeriods(initial.windows), poolWindowsToPeriods(poolPeriodsToWindows(periods)));
}

const addRun = (periods: readonly TimePeriod[]) => addPeriod(periods, { max: POOL_MAX_PERIODS, first: POOL_FIRST_PERIOD });

export function PoolTimesPage({ open, initial, readable, onClose }: PoolTimesPageProps) {
  const t = useT();
  const locale = useLocale();
  const glas = useIsGlas();
  const [days, setDays] = useState<PoolWeekday[]>(() => sortWeekdays([...initial.weekdays]));
  const [periods, setPeriods] = useState<TimePeriod[]>(() => poolWindowsToPeriods(initial.windows));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // While ✓ runs, the page stays: closing would not undo the save already sent, and a refusal must stay visible
  const busyRef = useRef(false);
  const close = () => {
    if (!busyRef.current) onClose();
  };

  const changed = poolTimesChanged(initial, days, periods);
  const canSave = !busy && readable && days.length > 0;

  async function save() {
    if (busyRef.current || !readable || days.length === 0) return;
    if (!changed) {
      onClose();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await savePoolSchedule(POOL_ENTITIES.scheduleSwitch, POOL_ENTITIES.scheduleBoolean, {
        weekdays: days,
        windows: poolPeriodsToWindows(periods),
        repeatType: initial.repeatType,
      });
      onClose();
    } catch (err) {
      console.warn('[HAPulse] savePoolSchedule failed:', err);
      setFailed(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const edit = (next: TimePeriod[]) => {
    setPeriods(next);
    setFailed(false);
  };
  const labels: ScheduleTimesLabels = {
    ring: t('pool.times.ring'),
    from: t('pool.times.from'),
    to: t('pool.times.to'),
    fromIcon: Power,
    toIcon: PowerOff,
    nth: (label, n) => t('pool.times.nth', { label, n }),
    caption: t('pool.times.caption'),
    empty: t('pool.times.empty'),
    days: t('pool.schedule.editor.weekdays'),
    pickDays: t('pool.schedule.editor.noWeekdays'),
    daysNote: t('pool.times.daysNote'),
    summary: periods.length > 1 ? t('pool.times.perDay', { duration: poolDayLength(periods, locale) }) : undefined,
    hint: t('pool.times.hint'),
    add: (count) => t(count === 0 ? 'pool.times.addFirst' : count === 1 ? 'pool.times.addSecond' : 'pool.times.addMore'),
    remove: (range) => t('pool.times.remove', { range }),
    clear: t('pool.times.clear'),
    notSaved: t('pool.times.notSaved'),
    retry: t('pool.times.retry'),
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('pool.schedule.editor.title')}
      className="pool-times-panel"
      swipeToClose={!changed && !busy}
      trailing={
        glas ? (
          <button type="button" className="g-sched-done" aria-label={t('pool.schedule.editor.save')} disabled={!canSave} onClick={() => void save()}>
            <span className="g-sched-done__circle" aria-hidden="true">
              <Check size={18} strokeWidth={2.5} />
            </span>
          </button>
        ) : undefined
      }
      footer={
        glas ? undefined : (
          <div className="sched-footer">
            <button type="button" className="btn btn--secondary" disabled={busy} onClick={close}>
              {t('pool.schedule.editor.cancel')}
            </button>
            <button type="button" className="btn btn--primary" disabled={!canSave} onClick={() => void save()}>
              {t('pool.schedule.editor.save')}
            </button>
          </div>
        )
      }
    >
      <ScheduleTimes
        tone="pool"
        days={POOL_WEEKDAYS.map((d, i) => ({ short: scheduleChipName(i, locale), long: scheduleDayName(i, locale, 'long'), on: days.includes(d) }))}
        onToggleDay={(i) => {
          const day = POOL_WEEKDAYS[i]!;
          setDays((cur) => sortWeekdays(cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day]));
          setFailed(false);
        }}
        periods={periods}
        onChange={edit}
        addTo={addRun}
        busy={busy}
        failed={failed}
        onRetry={() => void save()}
        labels={labels}
      />
    </Modal>
  );
}
