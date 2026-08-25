/**
 * [fork] ScheduleEditorModal — edit the pump schedule inside HAPulse.
 *
 * Rebuilds the essence of the scheduler-card for this one on/off schedule:
 * pick the weekdays, add/remove/adjust "run" time windows, and save. On save
 * the windows are normalized (overlaps merged) and converted to the
 * scheduler-component timeslot partition via `savePoolSchedule`, so what we
 * write stays compatible with the original card.
 */

import React, { useEffect, useState } from 'react';
import { CalendarClock, Plus, Trash2, Check } from 'lucide-react';
import {
  minutesToHHMM,
  hhmmToMinutes,
  normalizeWindows,
  scheduleOnMinutes,
  POOL_WEEKDAYS,
  POOL_DAY_MINUTES,
} from '@hapulse/core';
import type { PoolScheduleModel, PoolWeekday, PoolWindow } from '@hapulse/core';
import { Modal } from '../ui/Modal';
import { useT } from '../../i18n/useT';
import type { TKey } from '../../i18n/useT';
import { savePoolSchedule } from '../../ha/pool';
import { POOL_ENTITIES } from './poolConfig';

const WEEKDAY_KEYS: Record<PoolWeekday, TKey> = {
  mon: 'pool.weekday.mon', tue: 'pool.weekday.tue', wed: 'pool.weekday.wed',
  thu: 'pool.weekday.thu', fri: 'pool.weekday.fri', sat: 'pool.weekday.sat', sun: 'pool.weekday.sun',
};

interface ScheduleEditorModalProps {
  open: boolean;
  onClose: () => void;
  initial: PoolScheduleModel;
}

/** Convert a time-input value to minutes; a stop of 00:00 means end-of-day. */
function stopFromInput(value: string): number {
  const min = hhmmToMinutes(value);
  if (min == null) return POOL_DAY_MINUTES;
  return min === 0 ? POOL_DAY_MINUTES : min;
}

export function ScheduleEditorModal({ open, onClose, initial }: ScheduleEditorModalProps) {
  const t = useT();
  const [weekdays, setWeekdays] = useState<PoolWeekday[]>(initial.weekdays);
  const [windows, setWindows] = useState<PoolWindow[]>(initial.windows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  // Seed local state from the current schedule each time the editor opens.
  useEffect(() => {
    if (open) {
      setWeekdays(initial.weekdays);
      setWindows(initial.windows.length > 0 ? initial.windows : []);
      setSaving(false);
      setError(false);
    }
  }, [open, initial]);

  const toggleDay = (d: PoolWeekday) => {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const addWindow = () => {
    setWindows((prev) => [...prev, { start: 8 * 60, stop: 10 * 60 }]);
  };

  const removeWindow = (idx: number) => {
    setWindows((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateWindow = (idx: number, patch: Partial<PoolWindow>) => {
    setWindows((prev) => prev.map((w, i) => (i === idx ? { ...w, ...patch } : w)));
  };

  const noWeekdays = weekdays.length === 0;
  const onHours = scheduleOnMinutes(windows) / 60;

  const save = async () => {
    if (noWeekdays) return;
    setSaving(true);
    setError(false);
    try {
      const model: PoolScheduleModel = {
        weekdays,
        windows: normalizeWindows(windows),
        repeatType: initial.repeatType,
      };
      await savePoolSchedule(POOL_ENTITIES.scheduleSwitch, POOL_ENTITIES.scheduleBoolean, model);
      onClose();
    } catch (err) {
      console.warn('[HAPulse] savePoolSchedule failed:', err);
      setError(true);
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('pool.schedule.editor.title')}
      icon={<CalendarClock size={18} strokeWidth={1.75} />}
      className="modal-panel--wide"
      footer={
        <div className="pool-editor__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('pool.schedule.editor.cancel')}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void save()} disabled={saving || noWeekdays}>
            <Check size={16} strokeWidth={2} />
            {saving ? t('pool.schedule.editor.saving') : t('pool.schedule.editor.save')}
          </button>
        </div>
      }
    >
      <div className="pool-editor">
        <section className="pool-editor__section">
          <h3 className="pool-editor__label">{t('pool.schedule.editor.weekdays')}</h3>
          <div className="pool-editor__days">
            {POOL_WEEKDAYS.map((d) => (
              <button
                key={d}
                type="button"
                className={`pool-daytoggle${weekdays.includes(d) ? ' pool-daytoggle--active' : ''}`}
                aria-pressed={weekdays.includes(d)}
                onClick={() => toggleDay(d)}
              >
                {t(WEEKDAY_KEYS[d])}
              </button>
            ))}
          </div>
          {noWeekdays && <p className="pool-editor__hint pool-editor__hint--warn">{t('pool.schedule.editor.noWeekdays')}</p>}
        </section>

        <section className="pool-editor__section">
          <div className="pool-editor__section-head">
            <h3 className="pool-editor__label">{t('pool.schedule.editor.windows')}</h3>
            {windows.length > 0 && (
              <span className="pool-editor__total data-font">{Math.round(onHours * 10) / 10} h</span>
            )}
          </div>

          {windows.length === 0 ? (
            <p className="pool-editor__hint">{t('pool.schedule.editor.empty')}</p>
          ) : (
            <ul className="pool-editor__windows">
              {windows.map((w, i) => (
                <li key={i} className="pool-editor__window">
                  <input
                    type="time"
                    className="pool-time-input"
                    value={minutesToHHMM(w.start)}
                    onChange={(e) => updateWindow(i, { start: hhmmToMinutes(e.target.value) ?? w.start })}
                    aria-label={`${t('pool.schedule.editor.windows')} ${i + 1} — ${t('pool.pump.running')}`}
                  />
                  <span className="pool-editor__window-dash" aria-hidden="true">–</span>
                  <input
                    type="time"
                    className="pool-time-input"
                    value={minutesToHHMM(w.stop)}
                    onChange={(e) => updateWindow(i, { stop: stopFromInput(e.target.value) })}
                    aria-label={`${t('pool.schedule.editor.windows')} ${i + 1} — ${t('pool.pump.idle')}`}
                  />
                  <button
                    type="button"
                    className="pool-editor__remove"
                    onClick={() => removeWindow(i)}
                    aria-label={t('pool.schedule.editor.remove')}
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button type="button" className="btn btn--secondary pool-editor__add" onClick={addWindow}>
            <Plus size={16} strokeWidth={2} />
            {t('pool.schedule.editor.addWindow')}
          </button>
          <p className="pool-editor__hint">{t('pool.schedule.editor.overlapHint')}</p>
          {error && <p className="pool-editor__hint pool-editor__hint--warn">{t('pool.schedule.editor.error')}</p>}
        </section>
      </div>
    </Modal>
  );
}
