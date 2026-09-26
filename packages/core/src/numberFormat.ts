/**
 * [fork] Locale-aware number formatting — the one place HAPulse turns a number into display text.
 *
 * Upstream rendered numbers with `${n}` / `toFixed`, i.e. always with a decimal POINT ("5.5 h")
 * even in a German UI. Everything user-visible goes through `formatNumber` now: decimal comma
 * where the language uses one, and CLDR digit grouping for large values (de "1.250", fr "1 250",
 * es "1250" — Intl decides, including the minimum-grouping rules).
 *
 * Without a locale the result is English on purpose (not the runtime's default locale), so
 * non-UI callers and tests stay deterministic. Pure, no DOM.
 */

export interface NumberFormatOptions {
  /** Maximum fraction digits (default 1). */
  maxDecimals?: number;
  /** Minimum fraction digits (default 0) — e.g. 1 for temperatures ("21,0°"). */
  minDecimals?: number;
}

const cache = new Map<string, Intl.NumberFormat>();

function formatter(locale: string, min: number, max: number): Intl.NumberFormat {
  const key = `${locale}|${min}|${max}`;
  let f = cache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale, { minimumFractionDigits: min, maximumFractionDigits: max });
    } catch {
      f = new Intl.NumberFormat('en', { minimumFractionDigits: min, maximumFractionDigits: max });
    }
    cache.set(key, f);
  }
  return f;
}

export function formatNumber(value: number, locale: string = 'en', opts: NumberFormatOptions = {}): string {
  if (!Number.isFinite(value)) return String(value);
  const max = Math.max(0, opts.maxDecimals ?? 1);
  const min = Math.min(max, Math.max(0, opts.minDecimals ?? 0));
  const out = formatter(locale || 'en', min, max).format(value);
  // Rounding a tiny negative to zero must not show "-0".
  return out.replace(/^[-\u2212](?=0(?:[.,\u00a0\u202f ]?0*)?$)/, '');
}
