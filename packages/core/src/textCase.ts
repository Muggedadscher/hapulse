/**
 * [fork] The fork's spelling of upstream texts (docs/glas/PLAN-TEXTE.md). Upstream writes many texts in lower case
 * ("türen & fenster", "keine räume — bereiche in home assistant festlegen"). The corrections live per language in
 * `locales/case/<lang>.json`, holding only the keys that change, so upstream's locale files stay untouched and upstream
 * merges stay free of conflicts. The fork's own keys are written correctly in the locale files themselves.
 *
 * A correction changes nothing but the case: a lower-case letter becomes its capital, placeholders and wording stay
 * character for character (checked by the dashboard's `textCase.test.ts`, which also reports a key upstream dropped or
 * a text upstream reworded since).
 */

import type { Dict } from './i18n.js';

/** `dict` with the corrections of `fix` laid over it; a key `dict` does not have is left out. */
export function withCase(dict: Dict, fix: Readonly<Dict>): Dict {
  const out: Dict = { ...dict };
  for (const [key, text] of Object.entries(fix)) if (key in dict) out[key] = text;
  return out;
}
