/**
 * [fork] Type check for imported / synced customization values.
 *
 * `importSettings` (manual import and the HA settings sync) spread the incoming customization over the
 * defaults without checking types: `scryptedUrl: 123` or a string where a list belongs made a component
 * throw while rendering — a white screen that the sync then carried to every device. Values whose type
 * does not match the default's are dropped (the default applies); keys the defaults don't know pass.
 */
export function sanitizeCustomization<T extends object>(incoming: unknown, defaults: T): Partial<T> {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return {};
  const out: Record<string, unknown> = {};
  const def = defaults as Record<string, unknown>;
  for (const [k, v] of Object.entries(incoming as Record<string, unknown>)) {
    if (!(k in def)) { out[k] = v; continue; }
    const d = def[k];
    if (d === null || d === undefined) {
      // nullable fields (e.g. a URL that is unset by default): null or a primitive of any kind
      if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = v;
      continue;
    }
    if (Array.isArray(d)) { if (Array.isArray(v)) out[k] = v; continue; }
    if (typeof d === 'object') { if (v !== null && typeof v === 'object' && !Array.isArray(v)) out[k] = v; continue; }
    if (typeof v === typeof d) out[k] = v;
  }
  return out as Partial<T>;
}
