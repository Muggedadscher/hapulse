/**
 * [fork] Garage doors and gates — `cover.*` with device_class `garage` or `gate`.
 *
 * They are treated like locks (security relevant) instead of like blinds: one
 * status for every view, "open" only after a confirmation (see the dashboard's
 * GarageConfirm), and only doors that can act right now receive a bulk action.
 * Pure rules, no React/DOM — tested in scripts/smoke.mjs.
 */

import type { HassEntity } from './types.js';

export const GARAGE_DEVICE_CLASSES: readonly string[] = ['garage', 'gate'];

/** HA CoverEntityFeature bits. */
const FEATURE_OPEN = 1;
const FEATURE_CLOSE = 2;
const FEATURE_STOP = 8;

/**
 * closed      → shut
 * open        → open (also `stopped` half way and any unknown non-closed state)
 * moving      → opening / closing (counts as open: the door is not shut)
 * unavailable → unavailable / unknown — neither open nor closed, never "all closed"
 */
export type GarageStatus = 'closed' | 'open' | 'moving' | 'unavailable';

export type GarageService = 'open' | 'close';

export function isGarageDoor(entity: HassEntity | undefined): boolean {
  if (!entity || !entity.entity_id.startsWith('cover.')) return false;
  const dc = entity.attributes['device_class'];
  return typeof dc === 'string' && GARAGE_DEVICE_CLASSES.includes(dc);
}

export function isGate(entity: HassEntity): boolean {
  return entity.attributes['device_class'] === 'gate';
}

export function garageStatus(state: string): GarageStatus {
  switch (state) {
    case 'closed':
      return 'closed';
    case 'opening':
    case 'closing':
      return 'moving';
    case 'unavailable':
    case 'unknown':
      return 'unavailable';
    default:
      return 'open';
  }
}

/** Not shut: open, half open or moving. Unavailable is NOT open (and not closed either). */
export function garageIsOpen(state: string): boolean {
  const s = garageStatus(state);
  return s === 'open' || s === 'moving';
}

/**
 * Whether the door supports a service. A cover without `supported_features`
 * (template covers, old integrations) is assumed to open and close.
 */
export function garageSupports(entity: HassEntity, service: GarageService | 'stop'): boolean {
  const f = entity.attributes['supported_features'];
  if (typeof f !== 'number') return service !== 'stop';
  const bit = service === 'open' ? FEATURE_OPEN : service === 'close' ? FEATURE_CLOSE : FEATURE_STOP;
  return (f & bit) !== 0;
}

/** Stop is offered only while the door moves and the door supports it. */
export function garageCanStop(entity: HassEntity): boolean {
  return garageStatus(entity.state) === 'moving' && garageSupports(entity, 'stop');
}

/** Can this door run `service` right now? (Not while moving or unreachable, not when already there.) */
export function garageCanAct(entity: HassEntity, service: GarageService): boolean {
  if (!garageSupports(entity, service)) return false;
  const s = garageStatus(entity.state);
  return service === 'open' ? s === 'closed' : s === 'open';
}

/** The doors a (bulk) action is sent to — only those that can act right now. */
export function garageTargets(entities: readonly HassEntity[], service: GarageService): HassEntity[] {
  return entities.filter((e) => garageCanAct(e, service));
}

/** Opening always asks first (like unlocking); closing runs at once. */
export function garageNeedsDialog(service: GarageService): boolean {
  return service === 'open';
}

export interface GarageSummary {
  total: number;
  closed: number;
  /** open + moving */
  open: number;
  unavailable: number;
  /** Every door is closed — false as soon as one is open OR unreachable. */
  allClosed: boolean;
}

export function garageSummary(entities: readonly HassEntity[]): GarageSummary {
  let closed = 0;
  let open = 0;
  let unavailable = 0;
  for (const e of entities) {
    const s = garageStatus(e.state);
    if (s === 'closed') closed++;
    else if (s === 'unavailable') unavailable++;
    else open++;
  }
  return { total: entities.length, closed, open, unavailable, allClosed: entities.length > 0 && closed === entities.length };
}

/** MDI icon for the door's current status (rendered via the dashboard's MdiIcon). */
export function garageMdiIcon(entity: HassEntity): string {
  const base = isGate(entity) ? 'mdi:gate' : 'mdi:garage';
  const s = garageStatus(entity.state);
  if (s === 'unavailable') return `${base}-alert`;
  if (s === 'closed') return base;
  return `${base}-open`;
}
