/**
 * [fork] What the home summary chips count (docs/glas/PLAN-ETAPPE-5.md K97) — one rule for the chips in both styles
 * and for the subtitles of their windows in Glas ("5 an", "2 offen"), so a window never disagrees with its chip. The
 * rules are the chips' own (`SummaryChips.tsx`), moved here unchanged; the pool's entity ids come from the dashboard.
 * Pure, tested in scripts/smoke.mjs.
 */

import type { HassEntity, HassEntityMap } from './types.js';
import { pickAlarmPanel } from './alarm.js';
import { garageSummary, isGarageDoor } from './garage.js';
import type { GarageSummary } from './garage.js';
import { lockSummary } from './locks.js';
import type { LockSummary } from './locks.js';

export interface ChipCountOptions {
  /** The pool pump (`POOL_ENTITIES.pump`): running = `on`. */
  poolPump: string;
  /** The entities the pool chip needs (`POOL_REQUIRED_ENTITIES`): it shows only when all of them exist. */
  poolRequired: readonly string[];
}

export interface ChipCounts {
  /** `person.*` at home, in map order (the chip shows their avatars). */
  peopleHome: HassEntity[];
  lightsOn: number;
  /** Open door, window, opening and garage door sensors (`binary_sensor.*`). */
  openDoorWindow: number;
  /** The panel the chip shows: the most severe one (`pickAlarmPanel`), undefined without one. */
  alarm: HassEntity | undefined;
  mediaPlaying: number;
  pool: { present: boolean; running: boolean };
  garages: GarageSummary;
  locks: LockSummary;
}

/** The doors chip's classes (the home hints use the same ones). */
const OPENING_CLASSES = new Set(['door', 'window', 'opening', 'garage_door']);

/** Counts over the map the chips get — the caller leaves out hidden entities first. */
export function chipCounts(entities: HassEntityMap, opts: ChipCountOptions): ChipCounts {
  const all = Object.values(entities);
  return {
    peopleHome: all.filter((e) => e.entity_id.startsWith('person.') && e.state === 'home'),
    lightsOn: all.filter((e) => e.entity_id.startsWith('light.') && e.state === 'on').length,
    openDoorWindow: all.filter(
      (e) =>
        e.entity_id.startsWith('binary_sensor.') &&
        OPENING_CLASSES.has(e.attributes.device_class as string) &&
        e.state === 'on',
    ).length,
    alarm: pickAlarmPanel(all),
    mediaPlaying: all.filter((e) => e.entity_id.startsWith('media_player.') && e.state === 'playing').length,
    pool: {
      present: opts.poolRequired.every((id) => entities[id] != null),
      running: entities[opts.poolPump]?.state === 'on',
    },
    garages: garageSummary(all.filter(isGarageDoor)),
    locks: lockSummary(all.filter((e) => e.entity_id.startsWith('lock.'))),
  };
}
