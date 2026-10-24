/**
 * [fork] Heating plan: how times, durations and days read in the UI language (rules: @hapulse/core heatingPlan.ts).
 *
 * Times come from Home Assistant as `HH:MM`, the end of a day as `24:00`. They are shown with the locale's clock
 * (Intl); a 24-hour locale keeps `24:00` for the end of a day ("bis 24:00"), a 12-hour one shows midnight.
 */

import { HEATING_WEEKDAYS, heatingDayGroupKind, heatingMinutes } from '@hapulse/core';
import type { HeatingBlock, HeatingWeekday } from '@hapulse/core';
import type { TFunction } from '../../i18n/useT';

/** A Monday, for the weekday names (Intl has no "name of weekday n"). */
const MONDAY = new Date(2026, 0, 5);

function dayDate(day: HeatingWeekday): Date {
  const d = new Date(MONDAY);
  d.setDate(MONDAY.getDate() + HEATING_WEEKDAYS.indexOf(day));
  return d;
}

/** "Montag" (long), "Mo." (short), "M" (narrow). */
export function heatingDayName(day: HeatingWeekday, locale: string, width: 'long' | 'short' | 'narrow'): string {
  return new Intl.DateTimeFormat(locale, { weekday: width }).format(dayDate(day));
}

export function formatHeatingTime(time: string, locale: string): string {
  const minutes = heatingMinutes(time);
  const fmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const text = fmt.format(new Date(2026, 0, 5, Math.floor(minutes / 60) % 24, minutes % 60));
  if (minutes < 24 * 60 || fmt.resolvedOptions().hourCycle !== 'h23') return text;
  return text.replace(/^00/, '24');
}

/** "06:00–08:30" */
export function formatHeatingRange(block: HeatingBlock, locale: string): string {
  return `${formatHeatingTime(block.from, locale)}–${formatHeatingTime(block.to, locale)}`;
}

/**
 * Length of a period as its hours and its minutes with the units of the locale (["14 Std.", "30 Min."]); a part that
 * is zero is left out, except the minutes of a period under an hour.
 */
export function heatingDurationParts(block: HeatingBlock, locale: string): string[] {
  const total = heatingMinutes(block.to) - heatingMinutes(block.from);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const unit = (value: number, u: 'hour' | 'minute') =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: u, unitDisplay: 'short' }).format(value);
  if (hours === 0) return [unit(minutes, 'minute')];
  return minutes === 0 ? [unit(hours, 'hour')] : [unit(hours, 'hour'), unit(minutes, 'minute')];
}

/** Length of a period with the units of the locale ("14 Std. 30 Min.", "14 hr 30 min"). */
export function formatHeatingDuration(block: HeatingBlock, locale: string): string {
  return heatingDurationParts(block, locale).join(' ');
}

/** The name of a group of days: "Täglich", "Werktags", "Wochenende", one long day name or short ones in a list. */
export function heatingDaysName(t: TFunction, locale: string, days: readonly HeatingWeekday[]): string {
  const kind = heatingDayGroupKind(days);
  if (kind === 'daily') return t('heatingPlan.group.daily');
  if (kind === 'weekdays') return t('heatingPlan.group.weekdays');
  if (kind === 'weekend') return t('heatingPlan.group.weekend');
  if (days.length === 1) return heatingDayName(days[0]!, locale, 'long');
  return days.map((d) => heatingDayName(d, locale, 'short')).join(', ');
}

/** Days with short names, three and more in a row as a span ("Mo–Fr", "Sa, So", "Mo, Mi–Fr"), in week order. */
export function heatingDaySpan(days: readonly HeatingWeekday[], locale: string): string {
  const idx = HEATING_WEEKDAYS.map((d, i) => (days.includes(d) ? i : -1)).filter((i) => i >= 0);
  const runs: number[][] = [];
  for (const i of idx) {
    const run = runs[runs.length - 1];
    if (run && run[run.length - 1] === i - 1) run.push(i);
    else runs.push([i]);
  }
  const name = (i: number) => heatingDayName(HEATING_WEEKDAYS[i]!, locale, 'short');
  return runs
    .map((run) => (run.length >= 3 ? `${name(run[0]!)}–${name(run[run.length - 1]!)}` : run.map(name).join(', ')))
    .join(', ');
}

/** The short day name for a round day chip, without an abbreviation dot ("lun." → "lun"). */
export function heatingChipName(day: HeatingWeekday, locale: string): string {
  return heatingDayName(day, locale, 'short').replace(/\.$/u, '');
}

/** Temperature of a helper: whole degrees without a decimal, halves with one ("21", "20,5"). */
export function heatingTempParts(value: number | null, locale: string): string {
  if (value === null) return '—';
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(value);
}

/**
 * `text` split at the `marker` characters that stand for `parts` (in order), for translated texts with a part in
 * another style: t('…', { phase: MARK_A }) → [before, part, after].
 */
export const HEATING_MARK = ['\u0001', '\u0002'] as const;

export function splitMarked(text: string): { text: string; mark: number | null }[] {
  const out: { text: string; mark: number | null }[] = [];
  let cur = '';
  for (const ch of text) {
    const mark = HEATING_MARK.indexOf(ch as (typeof HEATING_MARK)[number]);
    if (mark < 0) {
      cur += ch;
      continue;
    }
    if (cur) out.push({ text: cur, mark: null });
    out.push({ text: '', mark });
    cur = '';
  }
  if (cur) out.push({ text: cur, mark: null });
  return out;
}
