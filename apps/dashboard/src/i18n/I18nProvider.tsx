/**
 * I18nProvider — resolves the display locale and exposes its dictionary.
 *
 * English stays the fallback dictionary: a key missing from a translation shows
 * the English string rather than a raw key.
 */

import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { resolveLanguage, withCase, type Dict, type Locale, type StateTranslations } from '@hapulse/core'; // [fork] withCase
import { useSettingsStore } from '../stores/settingsStore';
import { useConnectionStore } from '../stores/connectionStore';
import { getLanguage, getEntityStateTranslations } from '../ha/config';
import en from '@hapulse/core/locales/en.json';
import de from '@hapulse/core/locales/de.json';
import es from '@hapulse/core/locales/es.json';
import fr from '@hapulse/core/locales/fr.json';
import it from '@hapulse/core/locales/it.json';
import pt from '@hapulse/core/locales/pt.json';
import sv from '@hapulse/core/locales/sv.json';
// [fork] The fork's spelling of upstream texts, laid over each dictionary (docs/glas/PLAN-TEXTE.md)
import enCase from '@hapulse/core/locales/case/en.json';
import deCase from '@hapulse/core/locales/case/de.json';
import esCase from '@hapulse/core/locales/case/es.json';
import frCase from '@hapulse/core/locales/case/fr.json';
import itCase from '@hapulse/core/locales/case/it.json';
import ptCase from '@hapulse/core/locales/case/pt.json';
import svCase from '@hapulse/core/locales/case/sv.json';

/** [fork] English with the fork's spelling: the default and the fallback dictionary. */
const EN: Dict = withCase(en, enCase);

export interface I18nValue {
  locale: Locale;
  dict: Dict;
  fallback: Dict;
  /** HA's own entity-state wording for `locale`; empty until fetched, in demo
   *  mode, or when the connection is down. */
  states: StateTranslations;
}

export const I18nContext = createContext<I18nValue>({
  locale: 'en',
  dict: EN, // [fork]
  fallback: EN, // [fork]
  states: {},
});

/** Dictionaries by locale. */
const DICTS: Record<Locale, Dict> = {
  // [fork] each with the fork's spelling
  en: EN,
  de: withCase(de, deCase),
  es: withCase(es, esCase),
  fr: withCase(fr, frCase),
  it: withCase(it, itCase),
  pt: withCase(pt, ptCase),
  sv: withCase(sv, svCase),
};

/** Entity-state translations, cached per locale for the session: the payload
 *  covers every loaded integration, and HA's state vocabulary does not change
 *  while the dashboard runs. Only non-empty results are cached, so a failed or
 *  demo-mode fetch does not poison a later live one. */
const STATE_CACHE = new Map<Locale, StateTranslations>();

export function I18nProvider({ children }: { children: ReactNode }) {
  const pref = useSettingsStore((s) => s.language);
  const connectionStatus = useConnectionStore((s) => s.status);
  const [haLanguage, setHaLanguage] = useState<string | null>(null);

  // The HA-configured language only matters in 'auto' mode; fetching it is a
  // best-effort round-trip that must never block or break rendering.
  //
  // Also re-run when the connection status changes: on a brand-new sign-in
  // (no persisted credentials), this provider mounts before the connection
  // exists, so the first attempt finds `ha/config.ts` returning null. Without
  // this dependency nothing would retry once the connection actually comes
  // up, and HA's configured language would only take effect after a reload.
  useEffect(() => {
    if (pref !== 'auto') return;
    let cancelled = false;
    void (async () => {
      try {
        const lang = await getLanguage();
        if (!cancelled) setHaLanguage(lang);
      } catch {
        // Language is a comfort, not a dependency: swallow and keep resolving
        // from the browser / default.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pref, connectionStatus]);

  const locale = useMemo(
    () => resolveLanguage(pref, haLanguage, navigator.languages ?? []),
    [pref, haLanguage],
  );

  const [states, setStates] = useState<StateTranslations>(() => STATE_CACHE.get('en') ?? {});

  // Entity states (`sunny`, `fan_only`, `armed_home`) come from HA itself, so
  // they follow the locale chosen here rather than the one configured in HA.
  // Same best-effort contract as the language above: never block rendering,
  // and retry when the connection comes up.
  useEffect(() => {
    const cached = STATE_CACHE.get(locale);
    if (cached) {
      setStates(cached);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await getEntityStateTranslations(locale);
        if (cancelled) return;
        if (Object.keys(res).length > 0) STATE_CACHE.set(locale, res);
        setStates(res);
      } catch {
        // Humanised raw states remain readable: swallow and carry on.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, connectionStatus]);

  const value = useMemo<I18nValue>(
    () => ({ locale, dict: DICTS[locale] ?? EN, fallback: EN, states }), // [fork] EN
    [locale, states],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
