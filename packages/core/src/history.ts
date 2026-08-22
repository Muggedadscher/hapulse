/**
 * State history — types, parsing, ranges and demo data for the entity
 * history charts.
 *
 * Framework-agnostic (no DOM / React), like the rest of `@hapulse/core`.
 * The live fetch lives on `HAConnection.fetchHistory` (connection.ts); this
 * module owns the pure data shapes and transforms consumed by the dashboard.
 */

/**
 * A single raw sample as returned by the `history/history_during_period`
 * WebSocket command with `minimal_response` + `no_attributes`.
 *
 * Home Assistant sends a compact object per sample: `s` is the state string,
 * `lu`/`lc` are the last-updated / last-changed timestamps as **Unix epoch
 * seconds** (float). Intermediate samples may omit one of the timestamps.
 */
export interface RawHistoryState {
  /** State value, as HA stores it (string). */
  s?: string;
  /** last_updated — Unix epoch **seconds** (float). */
  lu?: number;
  /** last_changed — Unix epoch **seconds** (float). */
  lc?: number;
}

/** A parsed numeric datapoint ready for charting. */
export interface HistoryPoint {
  /** Unix epoch **milliseconds**. */
  t: number;
  /** Numeric value. */
  v: number;
}

/** Selectable look-back windows for the history chart. */
export type HistoryRange = '1h' | '6h' | '24h' | '7d' | '30d';

export interface HistoryRangeSpec {
  id: HistoryRange;
  /** Short label for the range selector (e.g. "24H"). */
  label: string;
  /** Window length in milliseconds. */
  durationMs: number;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const HISTORY_RANGES: readonly HistoryRangeSpec[] = [
  { id: '1h', label: '1H', durationMs: HOUR },
  { id: '6h', label: '6H', durationMs: 6 * HOUR },
  { id: '24h', label: '24H', durationMs: DAY },
  { id: '7d', label: '7D', durationMs: 7 * DAY },
  { id: '30d', label: '30D', durationMs: 30 * DAY },
];

/** The default range spec used when an unknown range id is passed. */
const DEFAULT_RANGE_SPEC: HistoryRangeSpec = { id: '24h', label: '24H', durationMs: DAY };

/** Look up the spec for a range id, falling back to 24h. */
export function historyRangeSpec(range: HistoryRange): HistoryRangeSpec {
  return HISTORY_RANGES.find((r) => r.id === range) ?? DEFAULT_RANGE_SPEC;
}

/**
 * Convert raw samples into sorted numeric points, dropping any that are
 * non-numeric (`unavailable`, `unknown`, text states) or missing a timestamp.
 */
export function parseNumericHistory(raw: RawHistoryState[]): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  for (const item of raw) {
    if (item == null || item.s == null) continue;
    const v = parseFloat(item.s);
    if (Number.isNaN(v)) continue;
    const epochSec = item.lu ?? item.lc;
    if (epochSec == null || Number.isNaN(epochSec)) continue;
    points.push({ t: Math.round(epochSec * 1000), v });
  }
  points.sort((a, b) => a.t - b.t);
  return points;
}

/** Summary statistics over a series. */
export interface HistorySummary {
  min: number;
  max: number;
  avg: number;
  first: number;
  last: number;
}

/** Compute min / max / avg / first / last, or null for an empty series. */
export function summarizeHistory(points: HistoryPoint[]): HistorySummary | null {
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) return null;

  let min = first.v;
  let max = first.v;
  let sum = 0;
  for (const p of points) {
    if (p.v < min) min = p.v;
    if (p.v > max) max = p.v;
    sum += p.v;
  }
  return { min, max, avg: sum / points.length, first: first.v, last: last.v };
}

/**
 * Generate a smooth, deterministic synthetic series for demo mode so the
 * history chart looks alive without a live Home Assistant connection.
 *
 * The shape is seeded from `entityId`, so a given entity always produces the
 * same-looking curve, and it lands on `currentValue` at the end for continuity
 * with the tile the user just tapped.
 */
export function demoHistory(
  entityId: string,
  startMs: number,
  endMs: number,
  currentValue: number,
  opts?: { min?: number; max?: number },
): HistoryPoint[] {
  const span = Math.max(endMs - startMs, 1);
  const count = 96;

  // Cheap deterministic seed from the entity id.
  let seed = 0;
  for (let i = 0; i < entityId.length; i++) {
    seed = (seed * 31 + entityId.charCodeAt(i)) >>> 0;
  }
  const phase = (seed % 100) / 16;
  const amp = Math.max(Math.abs(currentValue) * 0.08, 1);

  const points: HistoryPoint[] = [];
  for (let i = 0; i <= count; i++) {
    const frac = i / count;
    const t = Math.round(startMs + span * frac);
    const wave = Math.sin(frac * Math.PI * 3 + phase);
    const noise = Math.sin(frac * 37.7 + seed) * 0.2;
    let v = currentValue + amp * (wave + noise - 0.5 * wave * (1 - frac));
    if (opts?.min !== undefined) v = Math.max(v, opts.min);
    if (opts?.max !== undefined) v = Math.min(v, opts.max);
    points.push({ t, v: Math.round(v * 10) / 10 });
  }
  // Land exactly on the current value so the chart is continuous with the tile.
  const lastIdx = points.length - 1;
  const last = points[lastIdx];
  if (last !== undefined) {
    points[lastIdx] = { t: last.t, v: Math.round(currentValue * 10) / 10 };
  }
  return points;
}
