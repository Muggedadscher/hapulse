/**
 * [fork] Home hints ("Hinweise") — only what deviates from normal (docs/GLAS-PLAN.md §2.11, user decision E4).
 *
 * Shown in both styles as a normal, hideable Home section (E3). The counting rules are the ones the chips
 * and the security cards use (`garageSummary`, `lockSummary` via `locks.ts`, `pickAlarmPanel`, the doors
 * chip's door/window classes) so a hint never disagrees with them. Pure rules, no React/DOM — tested in
 * scripts/smoke.mjs.
 */

import type { HassEntity } from './types.js';
import type { WasteBin } from './waste.js';
import { pickAlarmPanel } from './alarm.js';
import { garageStatus, isGarageDoor } from './garage.js';
import { lockHasProblem, lockIsOpen } from './locks.js';

export type HintKind =
  | 'alarm-triggered'
  | 'leak'
  | 'smoke'
  | 'garage-open'
  | 'lock-open'
  | 'garage-fault'
  | 'lock-fault'
  | 'window-open'
  | 'door-open'
  | 'alarm-pending'
  | 'camera-offline'
  | 'waste-soon';

export type HintSeverity = 'critical' | 'warning' | 'info';

export interface Hint {
  /** Stable key: the kind, for waste plus the bin's sensor. */
  id: string;
  kind: HintKind;
  severity: HintSeverity;
  /** How many things deviate (windows open, locks open, cameras offline, …); 1 for waste. */
  count: number;
  /** The entities behind the hint, sorted (room names, targets). Empty for cameras. */
  entityIds: string[];
  /** Waste: the bin (name, date, days). */
  bin?: WasteBin | undefined;
}

export interface HintOptions {
  /** Epoch ms "now" (door minutes). */
  now: number;
  /** Entity ids to ignore — the user's `hiddenEntities`. */
  hidden?: Iterable<string> | undefined;
  /** A door counts once it has been open this many minutes (E4: 10). */
  doorOpenMinutes?: number | undefined;
  /** Detected waste bins (`detectWasteBins`, already hidden-filtered). */
  waste?: readonly WasteBin[] | undefined;
  /** Sentinel cameras that should record but are offline (0 while HA is the camera source). */
  camerasOffline?: number | undefined;
}

export interface HintResult {
  hints: Hint[];
  /** Epoch ms at which the list changes without an entity update (a door reaching its minutes), or null. */
  recheckAt: number | null;
}

export const DOOR_OPEN_MINUTES = 10;

/** Same classes as the doors chip; a window counts at once, the others after `doorOpenMinutes`. */
const WINDOW_CLASSES = new Set(['window']);
const DOOR_CLASSES = new Set(['door', 'opening', 'garage_door']);
const LEAK_CLASSES = new Set(['moisture']);
const SMOKE_CLASSES = new Set(['smoke', 'gas', 'carbon_monoxide']);

const SEVERITY_RANK: Record<HintSeverity, number> = { critical: 0, warning: 1, info: 2 };

/** Order inside one severity (the table in GLAS-PLAN §2.11). */
const KIND_ORDER: readonly HintKind[] = [
  'alarm-triggered', 'leak', 'smoke', 'garage-open', 'lock-open',
  'garage-fault', 'lock-fault', 'window-open', 'door-open', 'alarm-pending', 'camera-offline',
  'waste-soon',
];

const SEVERITY: Record<HintKind, HintSeverity> = {
  'alarm-triggered': 'critical',
  leak: 'critical',
  smoke: 'critical',
  'garage-open': 'critical',
  'lock-open': 'critical',
  'garage-fault': 'warning',
  'lock-fault': 'warning',
  'window-open': 'warning',
  'door-open': 'warning',
  'alarm-pending': 'warning',
  'camera-offline': 'warning',
  'waste-soon': 'info',
};

function deviceClass(e: HassEntity): string | undefined {
  const dc = e.attributes['device_class'];
  return typeof dc === 'string' ? dc : undefined;
}

function binarySensorOn(e: HassEntity, classes: Set<string>): boolean {
  if (!e.entity_id.startsWith('binary_sensor.') || e.state !== 'on') return false;
  const dc = deviceClass(e);
  return dc !== undefined && classes.has(dc);
}

/**
 * Collect the hints for the current entities. Sorted critical → warning → info, inside one severity in the
 * fixed order of GLAS-PLAN §2.11. An empty list means "nothing deviates" — the dashboard then shows no card.
 */
export function collectHints(entities: readonly HassEntity[], opts: HintOptions): HintResult {
  const hidden = new Set(opts.hidden ?? []);
  const visible = entities.filter((e) => !hidden.has(e.entity_id));
  const doorMs = Math.max(0, opts.doorOpenMinutes ?? DOOR_OPEN_MINUTES) * 60_000;
  const found = new Map<HintKind, string[]>();
  const add = (kind: HintKind, id: string) => {
    const list = found.get(kind);
    if (list) list.push(id);
    else found.set(kind, [id]);
  };
  let recheckAt: number | null = null;

  for (const e of visible) {
    if (binarySensorOn(e, LEAK_CLASSES)) add('leak', e.entity_id);
    else if (binarySensorOn(e, SMOKE_CLASSES)) add('smoke', e.entity_id);
    else if (binarySensorOn(e, WINDOW_CLASSES)) add('window-open', e.entity_id);
    else if (binarySensorOn(e, DOOR_CLASSES)) {
      const since = Date.parse(e.last_changed);
      // Unknown opening time: count it (better one hint too many than a door forgotten).
      const due = Number.isFinite(since) ? since + doorMs : opts.now;
      if (due <= opts.now) add('door-open', e.entity_id);
      else if (recheckAt === null || due < recheckAt) recheckAt = due;
    } else if (isGarageDoor(e)) {
      const s = garageStatus(e.state);
      if (s === 'open' || s === 'moving') add('garage-open', e.entity_id);
      else if (s === 'unavailable') add('garage-fault', e.entity_id);
    } else if (e.entity_id.startsWith('lock.')) {
      if (lockIsOpen(e.state)) add('lock-open', e.entity_id);
      else if (lockHasProblem(e.state)) add('lock-fault', e.entity_id);
    }
  }

  // The alarm: the same panel the chip shows (the most severe one).
  const alarm = pickAlarmPanel([...visible]);
  if (alarm?.state === 'triggered') add('alarm-triggered', alarm.entity_id);
  else if (alarm?.state === 'arming' || alarm?.state === 'pending') add('alarm-pending', alarm.entity_id);

  const hints: Hint[] = [];
  for (const [kind, ids] of found) {
    ids.sort();
    hints.push({ id: kind, kind, severity: SEVERITY[kind], count: ids.length, entityIds: ids });
  }
  const offline = opts.camerasOffline ?? 0;
  if (offline > 0) hints.push({ id: 'camera-offline', kind: 'camera-offline', severity: 'warning', count: offline, entityIds: [] });
  for (const bin of opts.waste ?? []) {
    if (hidden.has(bin.entityId) || bin.daysTo === null || bin.daysTo < 0 || bin.daysTo > 1) continue;
    hints.push({ id: `waste-soon:${bin.entityId}`, kind: 'waste-soon', severity: 'info', count: 1, entityIds: [bin.entityId], bin });
  }

  hints.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      (a.bin?.daysTo ?? 0) - (b.bin?.daysTo ?? 0) ||
      a.id.localeCompare(b.id),
  );
  return { hints, recheckAt };
}
