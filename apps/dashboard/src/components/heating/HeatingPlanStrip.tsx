/**
 * [fork] The heating plan as one line at the foot of a thermostat card in "Klima – Alle anzeigen" (Home): the status
 * line ("Heizplan · Komfort bis 22:00") and today as a thin bar with a mark for now. A tap opens the plan's window
 * (HeatingPlanSheet, with switch, temperatures and times). Nothing for a room without a plan.
 */

import { useState } from 'react';
import { CalendarClock, ChevronRight, Grid2x2 } from 'lucide-react';
import { heatingWeekday } from '@hapulse/core';
import { useLocale, useT } from '../../i18n/useT';
import { useHeatingPlan } from './useHeatingPlan';
import { HeatingStatus } from './HeatingStatus';
import { HeatingDayBar } from './HeatingDayBar';
import { HeatingPlanSheet } from './HeatingPlanSheet';
import { heatingRangesText } from './HeatingPlanCard';
import './heating.css';

interface HeatingPlanStripProps {
  areaId: string;
  roomName: string;
  roomEntityIds: readonly string[];
}

export function HeatingPlanStrip({ areaId, roomName, roomEntityIds }: HeatingPlanStripProps) {
  const t = useT();
  const locale = useLocale();
  const view = useHeatingPlan(areaId, roomEntityIds);
  // as on the card: the window stays mounted after closing, a new key per opening = fresh drafts
  const [sheet, setSheet] = useState({ key: 0, open: false });
  if (!view) return null;

  const { status, week, now } = view;
  const blocks = week?.[heatingWeekday(now)] ?? [];
  const summary = view.weekFailed
    ? t('heatingPlan.noSchedule')
    : blocks.length === 0
      ? t('heatingPlan.todayEcoOnly')
      : t('heatingPlan.todayComfort', { ranges: heatingRangesText(blocks, locale) });

  return (
    <>
      <button
        type="button"
        className="heating-strip"
        data-phase={status.phase}
        onClick={() => setSheet((s) => ({ key: s.key + 1, open: true }))}
      >
        <span className="heating-strip__line">
          <span className="heating-strip__icon" aria-hidden="true">
            {status.phase === 'window' ? <Grid2x2 size={14} strokeWidth={1.75} /> : <CalendarClock size={14} strokeWidth={1.75} />}
          </span>
          <span className="heating-strip__name">{t('heatingPlan.title')}</span>
          <span className="heating-strip__status">
            <HeatingStatus status={status} deviates={view.deviates} />
          </span>
          <ChevronRight className="heating-strip__chev" size={16} strokeWidth={1.75} aria-hidden="true" />
        </span>
        {week !== null && (
          <HeatingDayBar
            thin
            blocks={blocks}
            nowMinute={now.getHours() * 60 + now.getMinutes()}
            muted={status.phase === 'off' || status.phase === 'window'}
            label={summary}
          />
        )}
      </button>
      {sheet.key > 0 && (
        <HeatingPlanSheet key={sheet.key} open={sheet.open} view={view} roomName={roomName} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
      )}
    </>
  );
}
