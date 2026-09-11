/**
 * [fork] Date + time picker for the camera timeline (Monday-first month grid,
 * no future days, optional time) in HAPulse's Modal primitive.
 */

import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { useT, useLocale } from '../../i18n/useT';
import { fmtMonthYear, hhmmInput, weekdayShorts } from '../format';

export function DatePickerModal({ open, dayStart, timeTs, oldestAllowed, onGo, onClose }: {
  open: boolean;
  dayStart: number;
  timeTs: number;
  /** Local midnight of the oldest selectable day (retention floor), or -Infinity. */
  oldestAllowed: number;
  onGo: (dayStart: number, time: string | null) => void;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const base = new Date(dayStart);
  const [view, setView] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const [sel, setSel] = useState(new Date(base.getFullYear(), base.getMonth(), base.getDate()));
  const [time, setTime] = useState(hhmmInput(timeTs));

  const y = view.getFullYear(), m = view.getMonth();
  const startIdx = (new Date(y, m, 1).getDay() + 6) % 7;
  const dim = new Date(y, m + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const dnum = i - startIdx + 1;
    const d = new Date(y, m, dnum);
    return {
      d,
      out: dnum < 1 || dnum > dim,
      off: d.getTime() > today.getTime() || d.getTime() < oldestAllowed,
      isToday: d.getTime() === today.getTime(),
      sel: d.getFullYear() === sel.getFullYear() && d.getMonth() === sel.getMonth() && d.getDate() === sel.getDate(),
    };
  });
  const submit = () => { const ok = /^(\d{1,2}):(\d{2})$/.test(time); onGo(sel.getTime(), ok ? time : null); };
  const goToday = () => { const n = new Date(); setView(new Date(n.getFullYear(), n.getMonth(), 1)); setSel(new Date(n.getFullYear(), n.getMonth(), n.getDate())); };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('nvr.date.title')}
      icon={<Calendar size={18} strokeWidth={1.75} />}
      footer={(
        <div className="nvr-dt__foot">
          <button type="button" className="btn btn--ghost" onClick={goToday}>{t('nvr.date.today')}</button>
          <input className="nvr-input nvr-dt__time data-font" type="time" value={time} onChange={(e) => setTime(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} aria-label={t('nvr.date.time')} />
          <button type="button" className="btn btn--primary" onClick={submit}>{t('nvr.date.go')}</button>
        </div>
      )}
    >
      <div className="nvr-dt__head">
        <button type="button" className="nvr-dt__nav" onClick={() => setView(new Date(y, m - 1, 1))} aria-label={t('nvr.date.prevMonth')}><ChevronLeft size={18} /></button>
        <span className="nvr-dt__month">{fmtMonthYear(view.getTime(), locale)}</span>
        <button type="button" className="nvr-dt__nav" onClick={() => setView(new Date(y, m + 1, 1))} aria-label={t('nvr.date.nextMonth')}><ChevronRight size={18} /></button>
      </div>
      <div className="nvr-dt__grid">
        {weekdayShorts(locale).map((w) => <span key={w} className="nvr-dt__wd">{w}</span>)}
        {cells.map((c, i) => (
          <button
            key={i}
            type="button"
            disabled={c.out || c.off}
            className={'nvr-dt__d data-font' + (c.out ? ' nvr-dt__d--dim' : '') + (c.off ? ' nvr-dt__d--off' : '') + (c.isToday && !c.out ? ' nvr-dt__d--today' : '') + (c.sel && !c.out ? ' nvr-dt__d--sel' : '')}
            onClick={() => setSel(c.d)}
          >
            {c.d.getDate()}
          </button>
        ))}
      </div>
    </Modal>
  );
}
