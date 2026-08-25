/**
 * [fork] ScheduleEditorModal — graphical pump-schedule editor.
 *
 * The day is shown as a horizontal timeline of on/off segments. Tapping a
 * segment flips it between "pump schedule on" (accent) and "off" (muted); the
 * list below gives each switch point a precise time and an explicit on/off
 * choice. On save the segments collapse back into the scheduler-component
 * on-window model (`daySlotsToWindows` → `savePoolSchedule`), so the result
 * stays compatible with the original scheduler-card.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Plus, Trash2, Check } from 'lucide-react';
import {
  minutesToHHMM,
  hhmmToMinutes,
  windowsToDaySlots,
  daySlotsToWindows,
  tidyDaySlots,
  scheduleOnMinutes,
  POOL_WEEKDAYS,
  POOL_DAY_MINUTES,
} from '@hapulse/core';
import type { PoolScheduleModel, PoolWeekday, PoolDaySlot } from '@hapulse/core';
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

const SNAP = 15;      // minute granularity for added boundaries
const SNAP_DRAG = 5;  // finer snap while dragging a boundary
const MIN_GAP = 5;    // keep segments at least this many minutes wide

export function ScheduleEditorModal({ open, onClose, initial }: ScheduleEditorModalProps) {
  const t = useT();
  const [weekdays, setWeekdays] = useState<PoolWeekday[]>(initial.weekdays);
  const [slots, setSlots] = useState<PoolDaySlot[]>(() => windowsToDaySlots(initial.windows));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Seed ONLY on the transition from closed → open. Reseeding whenever `initial`
  // changes would wipe the user's in-progress edits every time the underlying
  // scheduler entity pushes an update (its next_trigger/current_slot change over
  // time), which is exactly what made the on/off toggles appear to do nothing.
  useEffect(() => {
    if (open && !wasOpen.current) {
      setWeekdays(initial.weekdays);
      setSlots(windowsToDaySlots(initial.windows));
      setSaving(false);
      setError(false);
    }
    wasOpen.current = open;
  }, [open, initial]);

  const setSlotsNorm = (next: PoolDaySlot[]) => setSlots(tidyDaySlots(next));

  const toggleDay = (d: PoolWeekday) =>
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const slotEnd = (i: number) => (i + 1 < slots.length ? slots[i + 1]!.start : POOL_DAY_MINUTES);

  const setAction = (i: number, action: 'on' | 'off') =>
    setSlotsNorm(slots.map((s, idx) => (idx === i ? { ...s, action } : s)));

  const setStart = (i: number, minutes: number) => {
    if (i === 0) return; // first slot is anchored at 00:00
    const lo = slots[i - 1]!.start + 1;
    const hi = slotEnd(i) - 1;
    const clamped = Math.max(lo, Math.min(hi, minutes));
    setSlotsNorm(slots.map((s, idx) => (idx === i ? { ...s, start: clamped } : s)));
  };

  const removeSlot = (i: number) => {
    if (i === 0) return;
    setSlotsNorm(slots.filter((_, idx) => idx !== i));
  };

  /**
   * Move boundary `j` (the start of slot j, j>0) to `rawMinute`, clamped between
   * its neighbours. Uses a functional update so a touch drag stays correct as
   * state changes, and does NOT normalize mid-drag (that could merge/reindex
   * slots and drop the handle being dragged).
   */
  const moveBoundary = (j: number, rawMinute: number) => {
    setSlots((prev) => {
      if (j <= 0 || j >= prev.length) return prev;
      const lo = prev[j - 1]!.start + MIN_GAP;
      const hi = (j + 1 < prev.length ? prev[j + 1]!.start : POOL_DAY_MINUTES) - MIN_GAP;
      const snapped = Math.round(rawMinute / SNAP_DRAG) * SNAP_DRAG;
      const clamped = Math.max(lo, Math.min(hi, snapped));
      if (clamped === prev[j]!.start) return prev;
      return prev.map((s, idx) => (idx === j ? { ...s, start: clamped } : s));
    });
  };

  const minuteFromClientX = (clientX: number): number => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return frac * POOL_DAY_MINUTES;
  };

  const onHandleDown = (e: React.PointerEvent, j: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(j);
  };

  const onHandleMove = (e: React.PointerEvent, j: number) => {
    if (dragging !== j) return;
    moveBoundary(j, minuteFromClientX(e.clientX));
  };

  const onHandleUp = (e: React.PointerEvent) => {
    if (dragging == null) return;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    setDragging(null);
    setSlots((prev) => tidyDaySlots(prev));
  };

  const addBoundary = () => {
    // Split the widest segment at its (snapped) midpoint, flipping its action.
    let widest = 0;
    let widestLen = -1;
    for (let i = 0; i < slots.length; i++) {
      const len = slotEnd(i) - slots[i]!.start;
      if (len > widestLen) { widestLen = len; widest = i; }
    }
    const start = slots[widest]!.start;
    const end = slotEnd(widest);
    const mid = Math.round((start + end) / 2 / SNAP) * SNAP;
    const safeMid = Math.max(start + SNAP, Math.min(end - SNAP, mid));
    if (safeMid <= start || safeMid >= end) return; // too narrow to split
    setSlotsNorm([...slots, { start: safeMid, action: slots[widest]!.action === 'on' ? 'off' : 'on' }]);
  };

  const noWeekdays = weekdays.length === 0;
  const onHours = useMemo(() => scheduleOnMinutes(daySlotsToWindows(slots)) / 60, [slots]);

  const save = async () => {
    if (noWeekdays) return;
    setSaving(true);
    setError(false);
    try {
      const model: PoolScheduleModel = {
        weekdays,
        windows: daySlotsToWindows(slots),
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
        {/* Weekdays */}
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

        {/* Graphical timeline */}
        <section className="pool-editor__section">
          <div className="pool-editor__section-head">
            <h3 className="pool-editor__label">{t('pool.schedule.editor.windows')}</h3>
            <span className="pool-editor__total data-font">{Math.round(onHours * 10) / 10} h</span>
          </div>

          <div className="pool-timeline" role="group" aria-label={t('pool.schedule.editor.windows')}>
            <div className={`pool-timeline__bar${dragging != null ? ' pool-timeline__bar--dragging' : ''}`} ref={barRef}>
              {slots.map((s, i) => {
                const widthPct = ((slotEnd(i) - s.start) / POOL_DAY_MINUTES) * 100;
                return (
                  <button
                    key={`${s.start}-${i}`}
                    type="button"
                    className={`pool-timeline__seg pool-timeline__seg--${s.action}`}
                    style={{ width: `${widthPct}%` }}
                    onClick={() => setAction(i, s.action === 'on' ? 'off' : 'on')}
                    title={`${minutesToHHMM(s.start)}–${minutesToHHMM(slotEnd(i))} · ${s.action === 'on' ? t('pool.schedule.editor.on') : t('pool.schedule.editor.off')}`}
                    aria-label={`${minutesToHHMM(s.start)}–${minutesToHHMM(slotEnd(i))} · ${s.action === 'on' ? t('pool.schedule.editor.on') : t('pool.schedule.editor.off')}`}
                  >
                    {widthPct > 14 && <span className="pool-timeline__seg-label">{minutesToHHMM(s.start)}</span>}
                  </button>
                );
              })}

              {/* Draggable boundary handles (touch-friendly) — one per internal boundary. */}
              {slots.map((s, i) =>
                i === 0 ? null : (
                  <div
                    key={`handle-${i}`}
                    className={`pool-timeline__handle${dragging === i ? ' pool-timeline__handle--active' : ''}`}
                    style={{ left: `${(s.start / POOL_DAY_MINUTES) * 100}%` }}
                    role="slider"
                    tabIndex={0}
                    aria-label={`${t('pool.schedule.editor.windows')} ${i + 1}`}
                    aria-valuemin={0}
                    aria-valuemax={24 * 60}
                    aria-valuenow={s.start}
                    aria-valuetext={minutesToHHMM(s.start)}
                    onPointerDown={(e) => onHandleDown(e, i)}
                    onPointerMove={(e) => onHandleMove(e, i)}
                    onPointerUp={onHandleUp}
                    onPointerCancel={onHandleUp}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') { e.preventDefault(); moveBoundary(i, s.start - SNAP_DRAG); setSlots((p) => tidyDaySlots(p)); }
                      else if (e.key === 'ArrowRight') { e.preventDefault(); moveBoundary(i, s.start + SNAP_DRAG); setSlots((p) => tidyDaySlots(p)); }
                    }}
                  >
                    <span className="pool-timeline__handle-grip" aria-hidden="true" />
                    <span className="pool-timeline__handle-time data-font">{minutesToHHMM(s.start)}</span>
                  </div>
                )
              )}
            </div>
            <div className="pool-timeline__scale" aria-hidden="true">
              {[0, 6, 12, 18, 24].map((h) => (
                <span key={h} className="pool-timeline__tick">{String(h).padStart(2, '0')}</span>
              ))}
            </div>
          </div>

          <p className="pool-editor__hint">{t('pool.schedule.editor.timelineHint')}</p>

          {/* Precise switch points */}
          <ul className="pool-editor__slots">
            {slots.map((s, i) => (
              <li key={`row-${s.start}-${i}`} className="pool-editor__slot">
                {i === 0 ? (
                  <span className="pool-editor__slot-time pool-editor__slot-time--fixed data-font">00:00</span>
                ) : (
                  <input
                    type="time"
                    className="pool-time-input pool-editor__slot-time"
                    value={minutesToHHMM(s.start)}
                    onChange={(e) => setStart(i, hhmmToMinutes(e.target.value) ?? s.start)}
                    aria-label={`${t('pool.schedule.editor.windows')} ${i + 1}`}
                  />
                )}

                <div className="pool-slotaction" role="group">
                  <button
                    type="button"
                    className={`pool-slotaction__btn${s.action === 'on' ? ' pool-slotaction__btn--on' : ''}`}
                    aria-pressed={s.action === 'on'}
                    onClick={() => setAction(i, 'on')}
                  >
                    {t('pool.schedule.editor.on')}
                  </button>
                  <button
                    type="button"
                    className={`pool-slotaction__btn${s.action === 'off' ? ' pool-slotaction__btn--off' : ''}`}
                    aria-pressed={s.action === 'off'}
                    onClick={() => setAction(i, 'off')}
                  >
                    {t('pool.schedule.editor.off')}
                  </button>
                </div>

                {i === 0 ? (
                  <span className="pool-editor__slot-spacer" aria-hidden="true" />
                ) : (
                  <button
                    type="button"
                    className="pool-editor__remove"
                    onClick={() => removeSlot(i)}
                    aria-label={t('pool.schedule.editor.remove')}
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <button type="button" className="btn btn--secondary pool-editor__add" onClick={addBoundary}>
            <Plus size={16} strokeWidth={2} />
            {t('pool.schedule.editor.addWindow')}
          </button>
          {error && <p className="pool-editor__hint pool-editor__hint--warn">{t('pool.schedule.editor.error')}</p>}
        </section>
      </div>
    </Modal>
  );
}
