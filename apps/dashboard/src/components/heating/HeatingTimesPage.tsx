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
import type { KeyboardEvent } from 'react';
import { Check, CircleAlert, Leaf, Plus, Sun } from 'lucide-react';
import {
  addHeatingBlock,
  HEATING_WEEKDAYS,
  heatingChangedDays,
  heatingFieldMinutes,
  heatingFieldValue,
  heatingWeekWith,
  moveHeatingEdge,
  removeHeatingBlock,
} from '@hapulse/core';
import type { HeatingBlock, HeatingEdge, HeatingWeek, HeatingWeekday } from '@hapulse/core';
import { Modal } from '../ui/Modal';
import { useLocale, useT } from '../../i18n/useT';
import { useIsGlas } from '../../app/glas/useUiStyle';
import { saveHeatingWeek } from '../../ha/heatingPlan';
import { HeatingRing } from './HeatingRing';
import { formatHeatingRange, heatingChipName, heatingDayName, heatingDaysName, heatingDaySpan } from './heatingFormat';
import { heatingAddedIndex, toggleHeatingDay } from './heatingTimes';
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
  edge: HeatingEdge;
  label: string;
  readOnly: boolean;
  onCommit: (minutes: number) => void;
  onFocus: () => void;
}) {
  const [typed, setTyped] = useState<string | null>(null);
  const commit = () => {
    if (typed === null) return;
    const minutes = heatingFieldMinutes(typed, edge);
    if (minutes !== null) onCommit(minutes);
    setTyped(null);
  };
  return (
    <input
      type="time"
      className="heating-times__input"
      step={300}
      aria-label={label}
      readOnly={readOnly}
      value={typed ?? heatingFieldValue(time)}
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

export function HeatingTimesPage({ open, scheduleId, week, start, returnFocus, onSaved, onClose }: HeatingTimesPageProps) {
  const t = useT();
  const locale = useLocale();
  const glas = useIsGlas();
  const [days, setDays] = useState<HeatingWeekday[]>(start.days);
  const [blocks, setBlocks] = useState<HeatingBlock[]>(start.blocks);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // While ✓ runs, the page stays: back would not undo the save already sent, and a refusal must stay visible
  const busyRef = useRef(false);
  const close = () => {
    if (!busyRef.current) onClose();
  };

  const sel = Math.min(selected, Math.max(0, blocks.length - 1));

  const changedDays = week ? heatingChangedDays(week, days, blocks) : [];
  const changed = changedDays.length > 0;
  const canSave = !busy && week !== null && days.length > 0;
  const added = addHeatingBlock(blocks);
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
  // With more than one period, the fields say which one they set
  const fieldLabel = (key: 'heatingPlan.times.comfortFrom' | 'heatingPlan.times.ecoFrom', i: number) =>
    blocks.length > 1 ? t('heatingPlan.times.nth', { label: t(key), n: i + 1 }) : t(key);

  const body = (
    <div className="heating-times">
      <div className="heating-times__days" role="group" aria-label={t('heatingPlan.times.days')}>
        {HEATING_WEEKDAYS.map((d) => (
          <button
            key={d}
            type="button"
            className="heating-times__day"
            aria-pressed={days.includes(d)}
            aria-label={heatingDayName(d, locale, 'long')}
            disabled={busy}
            onClick={() => {
              setDays((cur) => toggleHeatingDay(cur, d));
              setFailed(false);
            }}
          >
            {heatingChipName(d, locale)}
          </button>
        ))}
      </div>
      {days.length === 0 && <p className="heating-sheet__note heating-times__pick">{t('heatingPlan.times.pickDays')}</p>}

      <HeatingRing blocks={blocks} selected={sel} disabled={busy} onSelect={setSelected} onChange={edit} />

      {blocks.length > 0 && (
        <>
          <div className="heating-sheet__list heating-times__periods">
            {blocks.map((b, i) => (
              <div
                key={i}
                className={`heating-times__period${blocks.length > 1 && i === sel ? ' heating-times__period--selected' : ''}`}
                onPointerDown={() => setSelected(i)}
              >
                <label className="heating-times__field">
                  <span className="heating-times__label">
                    <Sun size={14} strokeWidth={1.75} aria-hidden="true" />
                    {t('heatingPlan.times.comfortFrom')}
                  </span>
                  <TimeField
                    time={b.from}
                    edge="from"
                    label={fieldLabel('heatingPlan.times.comfortFrom', i)}
                    readOnly={busy}
                    onFocus={() => setSelected(i)}
                    onCommit={(m) => edit(moveHeatingEdge(blocks, i, 'from', m))}
                  />
                </label>
                <label className="heating-times__field heating-times__field--eco">
                  <span className="heating-times__label">
                    <Leaf size={14} strokeWidth={1.75} aria-hidden="true" />
                    {t('heatingPlan.times.ecoFrom')}
                  </span>
                  <TimeField
                    time={b.to}
                    edge="to"
                    label={fieldLabel('heatingPlan.times.ecoFrom', i)}
                    readOnly={busy}
                    onFocus={() => setSelected(i)}
                    onCommit={(m) => edit(moveHeatingEdge(blocks, i, 'to', m))}
                  />
                </label>
              </div>
            ))}
          </div>
          <p className="heating-sheet__note">{t('heatingPlan.times.hint')}</p>
        </>
      )}

      {added && (
        <div className="heating-sheet__list heating-times__actions">
          <button
            type="button"
            className="heating-sheet__row heating-add"
            disabled={busy}
            onClick={() => {
              edit(added);
              setSelected(Math.max(0, heatingAddedIndex(blocks, added)));
            }}
          >
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            <span>
              {t(blocks.length === 0 ? 'heatingPlan.times.addFirst' : blocks.length === 1 ? 'heatingPlan.times.addSecond' : 'heatingPlan.times.addMore')}
            </span>
          </button>
        </div>
      )}

      {blocks.length > 0 && (
        <div className="heating-sheet__list heating-times__actions">
          {blocks.length > 1 && blocks[sel] && (
            <button
              type="button"
              className="heating-sheet__row heating-times__clear"
              disabled={busy}
              onClick={() => {
                edit(removeHeatingBlock(blocks, sel));
                setSelected(Math.max(0, sel - 1));
              }}
            >
              {t('heatingPlan.times.remove', { range: formatHeatingRange(blocks[sel], locale) })}
            </button>
          )}
          <button type="button" className="heating-sheet__row heating-times__clear" disabled={busy} onClick={() => edit([])}>
            {days.length ? t('heatingPlan.times.clear', { days: heatingDaySpan(days, locale) }) : t('heatingPlan.times.clearAll')}
          </button>
        </div>
      )}

      {failed && (
        <p className="heating-sheet__error" role="alert">
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>
            {t('heatingPlan.sheet.notSaved')}{' '}
            <button type="button" className="heating-sheet__retry" onClick={() => void save()}>
              {t('heatingPlan.sheet.retry')}
            </button>
          </span>
        </p>
      )}
    </div>
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
          <button type="button" className="g-heating-done" aria-label={t('heatingPlan.save')} disabled={!canSave} onClick={() => void save()}>
            <span className="g-heating-done__circle" aria-hidden="true">
              <Check size={18} strokeWidth={2.5} />
            </span>
          </button>
        ) : undefined
      }
      footer={
        glas ? undefined : (
          <div className="heating-confirm__actions">
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
