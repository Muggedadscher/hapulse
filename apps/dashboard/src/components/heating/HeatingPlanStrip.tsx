/**
 * [fork] The heating plan as one line at the foot of a thermostat card in "Klima – Alle anzeigen" (Home): the status
 * line ("Heizplan · Komfort bis 22:00") and today as a thin bar with a mark for now. A tap anywhere on the foot opens
 * the plan's window (HeatingPlanSheet, with switch, temperatures and times). Nothing for a room without a plan.
 *
 * The foot is the hit area; the line in it is the button (keyboard, name with the room), its click bubbles to the
 * foot. The bar stays outside the button (a button holds phrasing content only) and keeps its place while the periods
 * load, so the cards do not jump.
 */

import { useEffect, useRef, useState } from 'react';
import { CalendarClock, ChevronRight, Grid2x2 } from 'lucide-react';
import { heatingWeekday } from '@hapulse/core';
import { useLocale, useT } from '../../i18n/useT';
import { useHeatingPlan } from './useHeatingPlan';
import { HeatingStatus, heatingStatusText } from './HeatingStatus';
import { HeatingDayBar } from './HeatingDayBar';
import { HeatingPlanSheet } from './HeatingPlanSheet';
import { heatingRangesText } from './HeatingPlanCard';
import { HEATING_MARK } from './heatingFormat';
import './heating.css';

interface HeatingPlanStripProps {
  areaId: string;
  roomName: string;
  roomEntityIds: readonly string[];
  /** The plan's window opened or closed (Klassisch: the outer window must not close on the same Esc). */
  onSheetChange?: ((open: boolean) => void) | undefined;
}

export function HeatingPlanStrip({ areaId, roomName, roomEntityIds, onSheetChange }: HeatingPlanStripProps) {
  const t = useT();
  const locale = useLocale();
  const view = useHeatingPlan(areaId, roomEntityIds);
  // as on the card: the window stays mounted after closing, a new key per opening = fresh drafts
  const [sheet, setSheet] = useState({ key: 0, open: false });
  // only this strip's own openings count: another strip mounting must not report "closed" for an open window
  const reported = useRef(false);
  useEffect(() => {
    if (reported.current === sheet.open) return;
    reported.current = sheet.open;
    onSheetChange?.(sheet.open);
  }, [sheet.open, onSheetChange]);
  useEffect(
    () => () => {
      if (reported.current) onSheetChange?.(false);
    },
    [onSheetChange],
  );
  if (!view) return null;

  const { status, week, now } = view;
  const blocks = week?.[heatingWeekday(now)] ?? [];
  const summary = view.weekFailed
    ? t('heatingPlan.noSchedule')
    : blocks.length === 0
      ? t('heatingPlan.todayEcoOnly')
      : t('heatingPlan.todayComfort', { ranges: heatingRangesText(blocks, locale) });
  const statusText = heatingStatusText(t, locale, status, view.deviates).replace(HEATING_MARK[0], t(`heatingPlan.phase.${status.phase}`));

  return (
    <div className="heating-strip-slot">
      <div className="heating-strip" data-phase={status.phase} onClick={() => setSheet((s) => ({ key: s.key + 1, open: true }))}>
        <button
          type="button"
          className="heating-strip__line"
          aria-label={`${t('heatingPlan.switchLabel', { room: roomName })}: ${statusText}`}
          aria-haspopup="dialog"
        >
          <span className="heating-strip__icon" aria-hidden="true">
            {status.phase === 'window' ? <Grid2x2 size={14} strokeWidth={1.75} /> : <CalendarClock size={14} strokeWidth={1.75} />}
          </span>
          <span className="heating-strip__name">{t('heatingPlan.title')}</span>
          <span className="heating-strip__status">
            <HeatingStatus status={status} deviates={view.deviates} />
          </span>
          <ChevronRight className="heating-strip__chev" size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <div className={`heating-strip__bar${week === null ? ' heating-strip__bar--waiting' : ''}`}>
          <HeatingDayBar
            thin
            blocks={blocks}
            nowMinute={now.getHours() * 60 + now.getMinutes()}
            muted={status.phase === 'off' || status.phase === 'window'}
            label={week === null ? t('heatingPlan.title') : summary}
          />
        </div>
      </div>
      {sheet.key > 0 && (
        <HeatingPlanSheet key={sheet.key} open={sheet.open} view={view} roomName={roomName} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
      )}
    </div>
  );
}
