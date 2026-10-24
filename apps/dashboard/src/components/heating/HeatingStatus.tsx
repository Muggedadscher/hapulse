/**
 * [fork] The heating plan's status line: the phase in bold and in its colour, then until when or why
 * ("Komfort bis 20:00", "Eco bis morgen 05:30", "Fenster offen · Heizung aus", "Aus · Thermostat von Hand",
 * "Komfort · Thermostat folgt dem Plan nicht").
 */

import type { HeatingPlanStatus } from '@hapulse/core';
import { useLocale, useT } from '../../i18n/useT';
import type { TFunction } from '../../i18n/useT';
import { formatHeatingTime, heatingDayName, HEATING_MARK, splitMarked } from './heatingFormat';

const PHASE_KEY = {
  comfort: 'heatingPlan.phase.comfort',
  eco: 'heatingPlan.phase.eco',
  window: 'heatingPlan.phase.window',
  off: 'heatingPlan.phase.off',
  unknown: 'heatingPlan.phase.unknown',
} as const;

/** The line as text with the phase marked (HEATING_MARK[0]). */
export function heatingStatusText(t: TFunction, locale: string, status: HeatingPlanStatus, deviates: boolean): string {
  const phase = HEATING_MARK[0];
  if (status.phase === 'off') return t('heatingPlan.status.with', { phase, detail: t('heatingPlan.detail.off') });
  if (status.phase === 'window') return t('heatingPlan.status.with', { phase, detail: t('heatingPlan.detail.window') });
  if (deviates) return t('heatingPlan.status.with', { phase, detail: t('heatingPlan.detail.deviates') });
  const until = status.until;
  if (!until) return phase;
  const time = formatHeatingTime(until.time, locale);
  if (until.dayOffset === 0) return t('heatingPlan.status.until', { phase, time });
  if (until.dayOffset === 1) return t('heatingPlan.status.untilTomorrow', { phase, time });
  return t('heatingPlan.status.untilDay', { phase, time, day: heatingDayName(until.weekday, locale, 'short') });
}

export function HeatingStatus({ status, deviates }: { status: HeatingPlanStatus; deviates: boolean }) {
  const t = useT();
  const locale = useLocale();
  const parts = splitMarked(heatingStatusText(t, locale, status, deviates));
  return (
    <span className={`heating-status heating-status--${status.phase}${deviates ? ' heating-status--deviates' : ''}`}>
      {parts.map((p, i) =>
        p.mark === 0 ? (
          <strong key={i} className="heating-status__phase">
            {t(PHASE_KEY[status.phase])}
          </strong>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </span>
  );
}
