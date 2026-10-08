/**
 * [fork] "Active" scene — a heuristic (docs/GLAS-PLAN.md §2.12, user decision E5).
 *
 * Home Assistant has no "active" state for scenes: a `scene.*` entity's state is the time of its last
 * activation. A scene counts as active when
 *   1. it was activated, and not longer ago than `maxAgeMs` (12 h);
 *   2. no other scene that shares a member was activated after it;
 *   3. it lists its members (`attributes.entity_id`) and none of them changed since — `last_updated` at
 *      most `graceMs` (15 s) after the activation, and none is unavailable.
 * Scenes without a member list (some integration scenes) are never active. Limits: a member that HA
 * rewrites without a real change (an attribute tick) ends "active"; a scene re-applied with identical
 * values keeps its old activation time only until HA writes the new timestamp. Pure, tested in
 * scripts/smoke.mjs.
 */

import type { HassEntity, HassEntityMap } from './types.js';

export interface ActiveSceneOptions {
  /** Members may still change this long after the activation (transitions, slow devices). */
  graceMs?: number | undefined;
  /** An activation older than this is no longer "active". */
  maxAgeMs?: number | undefined;
}

export const ACTIVE_SCENE_GRACE_MS = 15_000;
export const ACTIVE_SCENE_MAX_AGE_MS = 12 * 3600_000;

/** The member entity ids a scene lists, or an empty list. */
export function sceneMembers(scene: HassEntity): string[] {
  const raw = scene.attributes['entity_id'];
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.length > 0);
}

function activatedAt(scene: HassEntity): number | null {
  const t = Date.parse(scene.state);
  return Number.isFinite(t) ? t : null;
}

export function activeSceneIds(
  scenes: readonly HassEntity[],
  states: HassEntityMap,
  now: number,
  opts: ActiveSceneOptions = {},
): Set<string> {
  const grace = opts.graceMs ?? ACTIVE_SCENE_GRACE_MS;
  const maxAge = opts.maxAgeMs ?? ACTIVE_SCENE_MAX_AGE_MS;
  const all = scenes
    .filter((s) => s.entity_id.startsWith('scene.'))
    .map((s) => ({ id: s.entity_id, at: activatedAt(s), members: sceneMembers(s) }));
  const active = new Set<string>();

  for (const s of all) {
    if (s.at === null || s.members.length === 0 || now - s.at > maxAge || s.at > now + grace) continue;
    const at = s.at;
    // 2. A later scene that shares a member took over.
    const overruled = all.some(
      (o) => o.id !== s.id && o.at !== null && o.at > at && o.members.some((m) => s.members.includes(m)),
    );
    if (overruled) continue;
    // 3. No member changed since the activation.
    let untouched = true;
    let seen = 0;
    for (const m of s.members) {
      const e = states[m];
      if (!e) continue; // a removed member does not decide anything
      seen++;
      if (e.state === 'unavailable') { untouched = false; break; }
      const updated = Date.parse(e.last_updated);
      if (Number.isFinite(updated) && updated > at + grace) { untouched = false; break; }
    }
    if (untouched && seen > 0) active.add(s.id);
  }
  return active;
}
