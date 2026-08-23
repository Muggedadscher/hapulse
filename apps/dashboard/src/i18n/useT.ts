import { useContext, useMemo } from 'react';
import {
  translate,
  lookupEntityState,
  humanizeState,
  type Locale,
  type StateLookupOptions,
} from '@hapulse/core';
import { I18nContext } from './I18nProvider';
import type en from '@hapulse/core/locales/en.json';

/** Plural keys are addressed by their base name, whose `.one` / `.other` variants
 *  are what actually live in the JSON. */
type PluralBase<K extends string> = K extends `${infer B}.one` | `${infer B}.other` ? B : never;

/** Every key present in en.json (plus plural base names). A typo or a dead key
 *  fails `npm run typecheck`. */
export type TKey = keyof typeof en | PluralBase<keyof typeof en & string>;

export function useT() {
  const { dict, fallback, locale } = useContext(I18nContext);
  return useMemo(
    () =>
      (key: TKey, vars?: Record<string, string | number>): string =>
        translate(dict, fallback, locale, key, vars),
    [dict, fallback, locale],
  );
}

/** Canonical type for the `t` function returned by `useT()`, for call sites
 *  (helpers, components) that need to accept it as a parameter. */
export type TFunction = ReturnType<typeof useT>;

/** The resolved locale, for Intl.DateTimeFormat / NumberFormat call sites.
 *  Hook: call it in a component body only — utility functions take `locale`
 *  as a parameter instead. */
export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

/** Entity-state label resolver, as returned by `useStateLabel()`. */
export type StateLabel = (domain: string, state: string, opts?: StateLookupOptions) => string;

/**
 * Labels an entity state (or attribute value) for display.
 *
 * Resolution order: Home Assistant's own wording for the current locale, then
 * the few pseudo-states HAPulse names itself, then the humanised raw state.
 * HAPulse never maintains a state vocabulary of its own — see
 * `core/entityStates.ts`.
 *
 *   sl('weather', condition)
 *   sl('climate', hvacAction, { attribute: 'hvac_action' })
 *   sl('binary_sensor', entity.state, { deviceClass: 'motion' })
 */
export function useStateLabel(): StateLabel {
  const { states, dict, fallback } = useContext(I18nContext);
  return useMemo(
    () => (domain, state, opts) => {
      if (!state) return '';
      const ha = lookupEntityState(states, domain, state, opts);
      if (ha !== undefined) return ha;
      // Dynamic key by design: these entries only cover the pseudo-states HA
      // does not ship under `entity_component` (unavailable, unknown).
      const own = dict[`entityState.${state}`] ?? fallback[`entityState.${state}`];
      return own ?? humanizeState(state);
    },
    [states, dict, fallback],
  );
}
