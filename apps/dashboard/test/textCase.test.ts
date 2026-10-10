// [fork] The fork's spelling of upstream texts (docs/glas/PLAN-TEXTE.md): the overlays in core `locales/case/<lang>.json`
// change nothing but the case (T5), and with them laid over, no text starts or begins a sentence in lower case and no
// name is written small, except the texts in keep-lower.json for their languages (T4 g/h). A text upstream adds or
// rewords in lower case fails here on the next merge: correct it in the overlay of its language.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LOCALES, withCase } from '@hapulse/core';
import type { Dict, Locale } from '@hapulse/core';
import keepLower from './keep-lower.json';

const LOCALE_DIR = new URL('../../../packages/core/locales/', import.meta.url);
const read = (file: string): Dict => JSON.parse(readFileSync(new URL(file, LOCALE_DIR), 'utf8')) as Dict;

/** A key (or the stem of a plural pair) whose lower-case start is right in these languages, and why. */
interface KeepLower {
  langs: 'all' | Locale[];
  reason: string;
}
const KEEP = keepLower as Record<string, KeepLower>;

const stem = (key: string) => key.replace(/\.(one|other)$/, '');
const kept = (key: string, lang: Locale) => {
  const entry = KEEP[key] ?? KEEP[stem(key)];
  return !!entry && (entry.langs === 'all' || entry.langs.includes(lang));
};

/** Abbreviations a sentence does not end with; a single letter with a full stop ("p. ej.", "z. B.") is one too. */
const ABBREVIATIONS: Record<Locale, string[]> = {
  en: ['e.g.', 'i.e.', 'vs.'],
  de: ['z. B.', 'd. h.', 'bzw.', 'ca.', 'ggü.', 'Min.', 'Std.'],
  es: ['p. ej.', 'Temp.'],
  fr: ['p. ex.'],
  it: ['ad es.', 'Temp.'],
  pt: ['p. ex.', 'Temp.'],
  sv: ['t.ex.', 'bl.a.'],
};
const NAMES = ['Home Assistant', 'Home-Assistant', 'HAPulse', 'Music Assistant', 'Music-Assistant'];

/** Index ranges of the placeholders (`{count}`) in `text`. */
const placeholders = (text: string) => [...text.matchAll(/\{[^}]*\}/g)].map((m) => [m.index, m.index + m[0].length]);

/** What breaks T5 in `fixed` against `original` (null: only lower-case letters became capitals). */
function caseOnly(original: string, fixed: string, lang: Locale): string | null {
  if (fixed === original) return 'changes nothing';
  if (fixed.length !== original.length) return 'changes the length';
  const inPlaceholder = (i: number) => placeholders(original).some(([from, to]) => i >= from && i < to);
  for (let i = 0; i < original.length; i++) {
    const a = original[i]!;
    const b = fixed[i]!;
    if (a === b) continue;
    if (inPlaceholder(i)) return `changes a placeholder at ${i}`;
    if (!/\p{Ll}/u.test(a) || a.toLocaleUpperCase(lang) !== b) return `changes "${a}" to "${b}" at ${i}`;
  }
  return null;
}

/** `text` with each placeholder replaced by as many private-use characters (no letter, no digit, same positions). */
const mask = (text: string) => text.replace(/\{[^}]*\}/g, (m) => '\uE000'.repeat(m.length));
const STARTS_SMALL = /^[^\p{L}\p{N}\uE000]*\p{Ll}/u;

/** What is written small in `text` that should not be (none: an empty list). */
function smallStarts(text: string, lang: Locale): string[] {
  const found: string[] = [];
  const masked = mask(text);
  if (STARTS_SMALL.test(masked)) found.push('starts small');
  // a sentence also begins after a closing quote or bracket, and with an opening quote or ¿ ¡
  for (const m of masked.matchAll(/[.!?]["”“»)]?\s+[¿¡«"“„]?\p{Ll}/gu)) {
    const before = masked.slice(0, m.index + 1);
    const abbreviation =
      ABBREVIATIONS[lang].some((a) => before.endsWith(a)) || /(^|[^\p{L}])\p{L}\.$/u.test(before);
    if (!abbreviation) found.push(`sentence starts small at ${m.index + m[0].length - 1}`);
  }
  for (const m of masked.matchAll(/\b(?:home[ -]assistant|hapulse|music[ -]assistant)/giu)) {
    if (!NAMES.includes(m[0])) found.push(`name "${m[0]}"`);
  }
  return found;
}

describe.each([...LOCALES])('%s', (lang) => {
  const dict = read(`${lang}.json`);
  const fix = read(`case/${lang}.json`);

  it('the overlay names only keys of this language, none of the camera package (nvr.*)', () => {
    expect(Object.keys(fix).filter((k) => !(k in dict) || k.startsWith('nvr.'))).toEqual([]);
  });

  it('the overlay changes nothing but the case: lower-case letters become capitals, placeholders stay (T5)', () => {
    const broken = Object.entries(fix)
      .filter(([k]) => k in dict)
      .map(([k, text]) => [k, caseOnly(dict[k]!, text, lang)])
      .filter(([, why]) => why)
      .map(([k, why]) => `${k}: ${why}`);
    expect(broken).toEqual([]);
  });

  it('with the overlay, no text starts or begins a sentence small and names are written as names (T4)', () => {
    const all = withCase(dict, fix);
    const small = Object.entries(all)
      .filter(([k]) => !k.startsWith('nvr.') && !kept(k, lang))
      .flatMap(([k, text]) => smallStarts(text, lang).map((why) => `${k}: ${why} — "${text}"`));
    expect(small).toEqual([]);
  });

  it('the texts kept small (keep-lower.json) do start small in this language', () => {
    const all = withCase(dict, fix);
    const stale = Object.keys(all)
      .filter((k) => kept(k, lang) && !STARTS_SMALL.test(mask(all[k]!)))
      .map((k) => `${k}: "${all[k]}"`);
    expect(stale).toEqual([]);
  });
});

describe('keep-lower.json', () => {
  const en = read('en.json');
  it.each(Object.entries(KEEP))('%s names a key, its languages and a reason', (key, entry) => {
    expect(key in en || (`${key}.one` in en && `${key}.other` in en)).toBe(true);
    if (entry.langs !== 'all') {
      expect(entry.langs.length).toBeGreaterThan(0);
      for (const l of entry.langs) expect(LOCALES).toContain(l);
    }
    expect(entry.reason.trim()).not.toBe('');
  });
});
