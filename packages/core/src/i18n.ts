/**
 * i18n — pure translation logic. No React, no DOM.
 *
 * Dictionaries are flat maps of dotted keys to strings, so they stay readable by
 * translation platforms (Weblate, Crowdin) without a conversion step.
 *
 * Plural forms use CLDR categories as key suffixes (`key.one`, `key.other`),
 * selected by the native Intl.PluralRules — no plural rules of our own to maintain.
 */

export type Dict = Record<string, string>;

export const LOCALES = ['en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Language names shown in the language selector, each in its own language. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
};

/** Replaces `{name}` with vars.name. An unprovided variable is left visible on
 *  purpose: a literal `{name}` in the UI reveals the bug, an empty string hides it. */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * Resolve `key` against `dict`, falling back to `fallback`, then to the key itself.
 *
 * When `vars.count` is a number, the plural form is selected first:
 * `${key}.${category}` (e.g. `devices.count.one`), then `${key}.other`, then `key`.
 */
export function translate(
  dict: Dict,
  fallback: Dict,
  locale: string,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const candidates: string[] = [];

  if (typeof vars?.count === 'number') {
    const category = new Intl.PluralRules(locale).select(vars.count);
    candidates.push(`${key}.${category}`, `${key}.other`);
  }
  candidates.push(key);

  for (const candidate of candidates) {
    const hit = dict[candidate] ?? fallback[candidate];
    if (hit !== undefined) return interpolate(hit, vars);
  }
  return key;
}
