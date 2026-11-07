/**
 * [fork] The times page of the heating plan's window (plan glas/heizung-zeitplan/PLAN.md Etappe 2b; draft
 * handy-zeiten-*.png): the days as round chips, the 24-hour ring, "Komfort ab" / "Eco ab" for each period, another
 * period, deleting the times. It opens from a group of days in the window (or from "add another time") as a window of
 * its own: in Glas a page on the window with a round back button and ✓, in Klassisch a dialog with Cancel / Save.
 *
 * The chosen period (tinted; chosen by its fields or a tap on its arc) can be removed while there are more. The chosen
 * days get the periods shown; days left out keep theirs. ✓ saves at once through "Heizplan speichern"
 * (saveHeatingWeek reads back and compares) and closes; the window under it shows the schedule as read back. When HA
 * does not take it, the page stays with "Not saved … Try again". Back and Cancel discard.
 */

import { useRef, useState } from 'react';
import { Check, Leaf, Sun } from 'lucide-react';
import { addHeatingBlock, HEATING_WEEKDAYS, heatingChangedDays, heatingWeekWith } from '@hapulse/core';
import type { HeatingBlock, HeatingWeek, HeatingWeekday } from '@hapulse/core';
import { Modal } from '../ui/Modal';
import { useLocale, useT } from '../../i18n/useT';
import { useIsGlas } from '../../app/glas/useUiStyle';
import { saveHeatingWeek } from '../../ha/heatingPlan';
import { ScheduleTimes } from '../schedule/ScheduleTimes';
import type { ScheduleTimesLabels } from '../schedule/ScheduleTimes';
import { heatingChipName, heatingDayName, heatingDaysName, heatingDaySpan } from './heatingFormat';
import { toggleHeatingDay } from './heatingTimes';
import type { HeatingTimesDraft } from './heatingTimes';

interface HeatingTimesPageProps {
  open: boolean;
  scheduleId: string;
  /** The schedule as HAPulse knows it now; null while it cannot be read (✓ waits). */
  week: HeatingWeek | null;
  start: HeatingTimesDraft;
  /** Where the focus goes when the page closes (the opener may be gone after a save). */
  returnFocus: () => HTMLElement | null;
  onSaved: (week: HeatingWeek) => void;
  onClose: () => void;
}

export function HeatingTimesPage({ open, scheduleId, week, start, returnFocus, onSaved, onClose }: HeatingTimesPageProps) {
  const t = useT();
  const locale = useLocale();
  const glas = useIsGlas();
  const [days, setDays] = useState<HeatingWeekday[]>(start.days);
  const [blocks, setBlocks] = useState<HeatingBlock[]>(start.blocks);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // While ✓ runs, the page stays: back would not undo the save already sent, and a refusal must stay visible
  const busyRef = useRef(false);
  const close = () => {
    if (!busyRef.current) onClose();
  };

  const changedDays = week ? heatingChangedDays(week, days, blocks) : [];
  const changed = changedDays.length > 0;
  const canSave = !busy && week !== null && days.length > 0;
  const title = days.length ? heatingDaysName(t, locale, days) : t('heatingPlan.times.title');

  async function save() {
    if (busyRef.current || !week || days.length === 0) return;
    if (!changed) {
      onClose();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const result = await saveHeatingWeek(scheduleId, heatingWeekWith(week, days, blocks), changedDays);
      if (result.week) onSaved(result.week);
      if (result.ok) onClose();
      else setFailed(true);
    } catch {
      setFailed(true); // invalid periods cannot be made here; HA's errors have been shown by callService
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const edit = (next: HeatingBlock[]) => {
    setBlocks(next);
    setFailed(false);
  };
  const labels: ScheduleTimesLabels = {
    ring: t('heatingPlan.times.ring'),
    from: t('heatingPlan.times.comfortFrom'),
    to: t('heatingPlan.times.ecoFrom'),
    fromIcon: Sun,
    toIcon: Leaf,
    nth: (label, n) => t('heatingPlan.times.nth', { label, n }),
    caption: t('heatingPlan.phase.comfort'),
    empty: t('heatingPlan.sheet.ecoAllDay'),
    days: t('heatingPlan.times.days'),
    pickDays: t('heatingPlan.times.pickDays'),
    hint: t('heatingPlan.times.hint'),
    add: (count) => t(count === 0 ? 'heatingPlan.times.addFirst' : count === 1 ? 'heatingPlan.times.addSecond' : 'heatingPlan.times.addMore'),
    remove: (range) => t('heatingPlan.times.remove', { range }),
    clear: days.length ? t('heatingPlan.times.clear', { days: heatingDaySpan(days, locale) }) : t('heatingPlan.times.clearAll'),
    notSaved: t('heatingPlan.sheet.notSaved'),
    retry: t('heatingPlan.sheet.retry'),
  };

  const body = (
    <ScheduleTimes
      tone="heat"
      days={HEATING_WEEKDAYS.map((d) => ({ short: heatingChipName(d, locale), long: heatingDayName(d, locale, 'long'), on: days.includes(d) }))}
      onToggleDay={(i) => {
        setDays((cur) => toggleHeatingDay(cur, HEATING_WEEKDAYS[i]!));
        setFailed(false);
      }}
      periods={blocks}
      onChange={edit}
      addTo={addHeatingBlock}
      busy={busy}
      failed={failed}
      onRetry={() => void save()}
      labels={labels}
    />
  );

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      className="heating-times-panel"
      returnFocus={returnFocus}
      swipeToClose={!changed && !busy}
      trailing={
        glas ? (
          <button type="button" className="g-sched-done" aria-label={t('heatingPlan.save')} disabled={!canSave} onClick={() => void save()}>
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
              {t('heatingPlan.cancel')}
            </button>
            <button type="button" className="btn btn--primary" disabled={!canSave} onClick={() => void save()}>
              {t('heatingPlan.save')}
            </button>
          </div>
        )
      }
    >
      {body}
    </Modal>
  );
}
