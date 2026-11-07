/**
 * [fork] ScheduleCard — the pump schedule at a glance, plus the editor entry.
 *
 * Reads the scheduler-component switch into an editable model (weekdays +
 * on-windows), shows the next action and the day's run windows, and lets the
 * user enable/disable the whole schedule or open the full editor.
 */

import React, { useMemo, useState } from 'react';
import { CalendarClock, Pencil } from 'lucide-react';
import { Card } from '../ui/Card';
import {
  parseScheduleAttributes,
  minutesToHHMM,
  POOL_WEEKDAYS,
  poolWindowsToPeriods,
} from '@hapulse/core';
import { useEntity } from '../../ha/hooks';
import { useLocale, useT } from '../../i18n/useT';
import { setSwitch } from '../../ha/pool';
import { POOL_ENTITIES, POOL_WEEKDAY_KEYS } from './poolConfig';
import { PoolTimesPage, poolDayLength } from './PoolTimesPage';
import { useIsGlas } from '../../app/glas/useUiStyle';

export function ScheduleCard() {
  const t = useT();
  const locale = useLocale();
  const isGlas = useIsGlas();
  const scheduleSwitch = useEntity(POOL_ENTITIES.scheduleSwitch);
  const [editorOpen, setEditorOpen] = useState(false);
  // A fresh draft every time the page opens (PoolTimesPage takes its start once)
  const [opened, setOpened] = useState(0);

  const enabled = scheduleSwitch?.state === 'on';
  const model = useMemo(
    () => parseScheduleAttributes(scheduleSwitch?.attributes ?? {}),
    [scheduleSwitch?.attributes],
  );

  // Saving needs the scheduler's own timeslots: without them the model is "every day, no run" and ✓ would write that
  const readable = Array.isArray(scheduleSwitch?.attributes?.['timeslots']);

  // Next action, derived from the scheduler entity's own next_trigger/next_slot.
  const nextAction = useMemo(() => {
    const attrs = scheduleSwitch?.attributes;
    if (!attrs || !enabled) return null;
    const nextTrigger = attrs['next_trigger'] as string | undefined;
    const nextSlot = attrs['next_slot'] as number | undefined;
    const actions = attrs['actions'] as { service?: string }[] | undefined;
    if (!nextTrigger) return null;
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(nextTrigger));
    const service = typeof nextSlot === 'number' ? actions?.[nextSlot]?.service : undefined;
    const turnsOn = typeof service === 'string' ? /turn_on$/.test(service) : null;
    return { time, turnsOn };
  }, [scheduleSwitch?.attributes, enabled, locale]);

  // Klassisch names the switch by its state; in Glas the row's fixed label names it and the switch shows the state
  const switchLabel = isGlas || enabled ? t('pool.schedule.on') : t('pool.schedule.off');
  const scheduleToggle = (
    <label className="pool-switch" title={isGlas ? undefined : switchLabel}>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => void setSwitch(POOL_ENTITIES.scheduleSwitch, e.target.checked)}
        aria-label={switchLabel}
      />
      <span className="pool-switch__track" aria-hidden="true"><span className="pool-switch__thumb" /></span>
    </label>
  );

  return (
    <Card className="pool-card pool-schedule">
      <div className="pool-card__head">
        <span className="pool-card__icon" aria-hidden="true">
          <CalendarClock size={16} strokeWidth={1.75} />
        </span>
        <h2 className="pool-card__title">{t('pool.schedule.title')}</h2>
        {!isGlas && scheduleToggle}
      </div>

      {/* Glas: the title stands above the surface like the other pool cards, the switch is the surface's first row
          (as in iOS lists, a section title carries no control) */}
      {isGlas && (
        <div className="g-pool-toggle">
          <span className="g-pool-toggle__label" aria-hidden="true">{t('pool.schedule.on')}</span>
          {scheduleToggle}
        </div>
      )}

      <div className={`pool-schedule__body${enabled ? '' : ' pool-schedule__body--disabled'}`}>
        {nextAction && (
          <div className="pool-schedule__next">
            <span className="pool-schedule__next-label">{t('pool.schedule.nextAction')}</span>
            <span className="pool-schedule__next-value">
              <strong className="data-font">{nextAction.time}</strong>
              {nextAction.turnsOn != null && (
                <span className="pool-schedule__next-action">
                  {nextAction.turnsOn ? t('pool.schedule.turnsOn') : t('pool.schedule.turnsOff')}
                </span>
              )}
            </span>
          </div>
        )}

        <div className="pool-weekchips" aria-label={t('pool.schedule.editor.weekdays')}>
          {POOL_WEEKDAYS.map((d) => (
            <span
              key={d}
              className={`pool-weekchip${model.weekdays.includes(d) ? ' pool-weekchip--active' : ''}`}
            >
              {t(POOL_WEEKDAY_KEYS[d])}
            </span>
          ))}
        </div>

        {model.windows.length > 0 ? (
          <div className="pool-windows">
            {model.windows.map((w, i) => (
              <span key={`${w.start}-${w.stop}-${i}`} className="pool-window-chip data-font">
                {minutesToHHMM(w.start)}–{minutesToHHMM(w.stop)}
              </span>
            ))}
            <span className="pool-schedule__perday">{t('pool.times.perDay', { duration: poolDayLength(poolWindowsToPeriods(model.windows), locale) })}</span>
          </div>
        ) : (
          <p className="pool-schedule__empty">{t('pool.schedule.noWindows')}</p>
        )}
      </div>

      <button type="button" className="btn btn--ghost pool-schedule__edit" onClick={() => {
          setOpened((n) => n + 1);
          setEditorOpen(true);
        }}>
        <Pencil size={16} strokeWidth={1.75} />
        {t('pool.schedule.edit')}
      </button>

      {opened > 0 && (
        <PoolTimesPage key={opened} open={editorOpen} onClose={() => setEditorOpen(false)} initial={model} readable={readable} />
      )}
    </Card>
  );
}
