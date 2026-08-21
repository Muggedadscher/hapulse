/**
 * Entity state labels, sourced from Home Assistant's own translations.
 *
 * HAPulse never maintains a dictionary of entity states: `sunny`, `fan_only`,
 * `armed_home` and their hundreds of siblings are Home Assistant's vocabulary,
 * already translated in every language HA ships. They are fetched over the
 * `frontend/get_translations` WebSocket command (category `entity_component`)
 * and looked up here.
 *
 * Key shape, as flattened by `homeassistant/helpers/translation.py`:
 *
 *   component.{domain}.entity_component.{device_class}.state.{state}
 *   component.{domain}.entity_component.{device_class}.state_attributes.{attr}.state.{value}
 *
 * `_` is the device-class-less bucket, and the fallback for a device class HA
 * has no specific wording for.
 */

/** Flattened `resources` map returned by `frontend/get_translations`. */
export type StateTranslations = Record<string, string>;

export interface StateLookupOptions {
  /** `device_class` attribute — picks the domain's more specific wording
   *  (`binary_sensor` + `motion` → "Detected" rather than "On"). */
  deviceClass?: string | undefined;
  /** Translate an attribute's value instead of the entity's state
   *  (`climate` + `hvac_action` → "Heating"). */
  attribute?: string | undefined;
}

/**
 * Resolves a state to its display label, falling back as the UI layer decides.
 * Implemented by the dashboard's `useStateLabel()`; taken as a parameter by
 * React-free helpers such as `formatEntityState()`.
 */
export type EntityStateLabel = (
  domain: string,
  state: string,
  opts?: StateLookupOptions,
) => string;

/**
 * Look up a state (or attribute value) in HA's translations.
 * Returns undefined when HA has no wording for it — the caller decides the
 * fallback.
 */
export function lookupEntityState(
  res: StateTranslations,
  domain: string,
  state: string,
  opts: StateLookupOptions = {},
): string | undefined {
  if (!domain || !state) return undefined;
  const { deviceClass, attribute } = opts;
  const buckets = deviceClass ? [deviceClass, '_'] : ['_'];
  for (const bucket of buckets) {
    const base = `component.${domain}.entity_component.${bucket}`;
    const key = attribute
      ? `${base}.state_attributes.${attribute}.state.${state}`
      : `${base}.state.${state}`;
    const hit = res[key];
    if (hit !== undefined) return hit;
  }
  return undefined;
}

/**
 * Presentable form of a raw HA state, for when no translation exists: demo
 * mode, an offline connection, or a state HA itself does not translate.
 * `fan_only` → `Fan only`, `clear-night` → `Clear night`.
 */
export function humanizeState(state: string): string {
  const spaced = state.replace(/[-_]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
