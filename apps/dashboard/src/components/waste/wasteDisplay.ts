/**
 * [fork] Waste card — presentation helpers.
 *
 * Pure, DOM-free display glue that the card and the bin modal share: mapping a
 * bin to a semantic colour tone, and formatting an ISO date for the current
 * locale. The data model itself lives in `@hapulse/core` (`waste.ts`).
 */

import type { Locale } from '@hapulse/core';
import type { TFunction } from '../../i18n/useT';

/** Semantic tone → maps onto the design-system `--<tone>` / `--<tone>-soft` tokens. */
export type WasteTone = 'info' | 'warning' | 'positive' | 'danger' | 'neutral';

/**
 * Best-effort colour tone for a bin, from its name and icon. Auto-detected bins
 * carry arbitrary integration wording, so this is a keyword heuristic across
 * the common German + English waste types; anything unrecognised falls back to
 * a neutral chip. Colour is a cue, never load-bearing.
 */
export function wasteTone(name: string, icon?: string | undefined): WasteTone {
  const s = `${name} ${icon ?? ''}`.toLowerCase();
  if (/schadstoff|sonderm|hazard|problem|gift|toxic|batter|elektro|electro/.test(s)) return 'danger';
  if (/papier|paper|karton|cardboard|zeitung/.test(s)) return 'info';
  if (/bio|kompost|compost|garten|garden|gr(?:ü|u)n|green|organ|laub|leaf|grass/.test(s)) return 'positive';
  if (/gelb|yellow|recycl|plastik|plastic|sack|verpack|packaging|wertstoff|dsd|dose|leichtstoff/.test(s)) return 'warning';
  return 'neutral';
}

/** CSS custom-property names for a tone's chip background + foreground. */
export function toneVars(tone: WasteTone): { bg: string; color: string } {
  if (tone === 'neutral') return { bg: 'var(--bg-subtle)', color: 'var(--text-dim)' };
  return { bg: `var(--${tone}-soft)`, color: `var(--${tone})` };
}

/**
 * Human countdown for a bin: "Today" / "Tomorrow" / "in N days", or null when
 * the day count is unknown. A past-or-zero count reads as "Today" — a pickup
 * that hasn't rolled over yet is still the thing you act on now.
 */
export function countdownLabel(daysTo: number | null, t: TFunction): string | null {
  if (daysTo == null) return null;
  if (daysTo <= 0) return t('waste.today');
  if (daysTo === 1) return t('waste.tomorrow');
  return t('waste.inDays', { count: daysTo });
}

/** True when a pickup is due today or tomorrow — used to accent the countdown. */
export function isWasteSoon(daysTo: number | null): boolean {
  return daysTo != null && daysTo <= 1;
}

/** Parse an ISO `YYYY-MM-DD` date into a local-midnight Date, or null. */
function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Format an ISO date as a short, localized "weekday, day month" label
 * (e.g. "Fri, 11 Sep" / "Fr., 11. Sept."). The year is appended only when it
 * differs from `refYear` (the year the app is showing "now"), so far-off dates
 * stay unambiguous without cluttering the common near-term case.
 */
export function formatWasteDate(iso: string, locale: Locale, refYear?: number): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  const showYear = refYear != null && d.getFullYear() !== refYear;
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(showYear ? { year: 'numeric' } : {}),
  }).format(d);
}
