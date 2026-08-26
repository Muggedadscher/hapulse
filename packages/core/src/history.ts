/**
 * Entity history and logbook — types, response parsing, and demo generators.
 *
 * Feeds the entity detail (more-info) modal: the state timeline / value chart
 * and the activity list. Live data comes over two WebSocket commands
 * (`history/history_during_period` and `logbook/get_events`, wrapped by
 * HAConnection); demo mode fabricates deterministic data here so the modal is
 * fully explorable without a Home Assistant.
 */

import type { HassEntity } from './types.js';

/** One state interval: `state` held from `start` until the next point (ms epoch). */
export interface HistoryPoint {
  state: string;
  start: number;
}

/** One activity row (a state change, newest use is a reverse-sorted list). */
export interface LogbookEntry {
  when: number; // ms epoch
  state: string;
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

/**
 * Parse one entity's series from `history/history_during_period`.
 *
 * The WS command returns a compressed shape — `{ s: state, lu: seconds }` —
 * but REST-shaped rows (`state` / `last_updated` ISO strings) are accepted too
 * so the parser doesn't care which endpoint fed it.
 */
export function parseHistoryStates(rows: unknown[]): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  for (const raw of rows) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const state = typeof r['s'] === 'string' ? r['s'] : typeof r['state'] === 'string' ? r['state'] : null;
    let when: number | null = null;
    if (typeof r['lu'] === 'number') when = r['lu'] * 1000;
    else if (typeof r['last_updated'] === 'string') when = Date.parse(r['last_updated']);
    else if (typeof r['last_changed'] === 'string') when = Date.parse(r['last_changed']);
    if (state == null || when == null || Number.isNaN(when)) continue;
    out.push({ state, start: when });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Parse `logbook/get_events` rows for one entity into state-change entries. */
export function parseLogbookEntries(rows: unknown[]): LogbookEntry[] {
  const out: LogbookEntry[] = [];
  for (const raw of rows) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    if (typeof r['when'] !== 'number' || typeof r['state'] !== 'string') continue;
    out.push({ when: r['when'] * 1000, state: r['state'] });
  }
  return out.sort((a, b) => b.when - a.when);
}

/** True when a history series is numeric (a sensor charting a value). */
export function isNumericHistory(points: HistoryPoint[]): boolean {
  const real = points.filter((p) => p.state !== 'unavailable' && p.state !== 'unknown');
  if (real.length === 0) return false;
  return real.every((p) => p.state !== '' && !Number.isNaN(Number(p.state)));
}

// ---------------------------------------------------------------------------
// Demo generators — deterministic per entity, so reopening the modal shows
// the same past and the series always ends on the entity's current state.
// ---------------------------------------------------------------------------

/** Small deterministic PRNG (mulberry32) seeded from a string. */
function seededRandom(seed: string): () => number {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The state a demo entity toggles to when it isn't in its current one. */
function counterpartState(entity: HassEntity): string {
  const domain = entity.entity_id.split('.')[0]!;
  const cur = entity.state;
  if (domain === 'binary_sensor' || domain === 'switch' || domain === 'light' || domain === 'input_boolean' || domain === 'fan') {
    return cur === 'on' ? 'off' : 'on';
  }
  if (domain === 'lock') return cur === 'locked' ? 'unlocked' : 'locked';
  if (domain === 'cover') return cur === 'open' ? 'closed' : 'open';
  if (domain === 'media_player') return cur === 'playing' ? 'idle' : 'playing';
  if (domain === 'person' || domain === 'device_tracker') return cur === 'home' ? 'not_home' : 'home';
  if (domain === 'climate') return cur === 'heat' ? 'off' : 'heat';
  if (domain === 'alarm_control_panel') return cur === 'disarmed' ? 'armed_home' : 'disarmed';
  return cur; // stateless-ish domains: a flat bar
}

/**
 * Fabricate a plausible history for a demo entity over [start, end] (ms).
 * Numeric sensors get a random walk around their current value; everything
 * else gets alternating intervals that end on the current state.
 */
export function generateDemoHistory(entity: HassEntity, start: number, end: number): HistoryPoint[] {
  const rand = seededRandom(entity.entity_id);
  const numeric = entity.state !== '' && !Number.isNaN(Number(entity.state));

  if (numeric) {
    const current = Number(entity.state);
    // Spread scales with magnitude so a 21° room and a 730 W plug both wander believably.
    const spread = Math.max(Math.abs(current) * 0.15, 1);
    const stepMs = Math.max((end - start) / 96, 5 * 60_000);
    const points: HistoryPoint[] = [];
    let value = current + (rand() - 0.5) * spread;
    for (let ts = start; ts < end; ts += stepMs) {
      value += (rand() - 0.5) * spread * 0.4;
      // Drift back toward current so the series lands where the entity is now.
      value += (current - value) * 0.08;
      points.push({ state: (Math.round(value * 10) / 10).toString(), start: ts });
    }
    points.push({ state: entity.state, start: end - 1000 });
    return points;
  }

  const other = counterpartState(entity);
  if (other === entity.state) {
    return [{ state: entity.state, start }];
  }
  // Build segments backwards from `end` so the last one is the current state.
  const segments: HistoryPoint[] = [];
  let cursor = end;
  let state = entity.state;
  while (cursor > start) {
    const durationMs = (10 + rand() * 110) * 60_000; // 10–120 min
    cursor -= durationMs;
    segments.push({ state, start: Math.max(cursor, start) });
    state = state === entity.state ? other : entity.state;
  }
  return segments.reverse();
}

/** Activity entries derived from a history series (transitions, newest first). */
export function demoLogbookFromHistory(points: HistoryPoint[]): LogbookEntry[] {
  const out: LogbookEntry[] = [];
  let prev: string | null = null;
  for (const p of points) {
    if (p.state !== prev) {
      out.push({ when: p.start, state: p.state });
      prev = p.state;
    }
  }
  return out.reverse();
}
