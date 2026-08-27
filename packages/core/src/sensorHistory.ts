/**
 * Sensor history — raw sample types, numeric parsing and demo data.
 *
 * [fork] Feeds the Pool runtime chart (`PoolChartCard` → `getHistory` →
 * `dailyRuntimeBars`). Renamed from `history.ts` to coexist with upstream's own
 * `history.ts` (which feeds the entity detail modal). Framework-agnostic
 * (no DOM / React), like the rest of `@hapulse/core`. The live fetch lives on
 * `HAConnection.fetchSensorHistory` (connection.ts).
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
export interface SensorHistoryPoint {
  /** Unix epoch **milliseconds**. */
  t: number;
  /** Numeric value. */
  v: number;
}

/**
 * Convert raw samples into sorted numeric points, dropping any that are
 * non-numeric (`unavailable`, `unknown`, text states) or missing a timestamp.
 */
export function parseNumericHistory(raw: RawHistoryState[]): SensorHistoryPoint[] {
  const points: SensorHistoryPoint[] = [];
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
): SensorHistoryPoint[] {
  const span = Math.max(endMs - startMs, 1);
  const count = 96;

  // Cheap deterministic seed from the entity id.
  let seed = 0;
  for (let i = 0; i < entityId.length; i++) {
    seed = (seed * 31 + entityId.charCodeAt(i)) >>> 0;
  }
  const phase = (seed % 100) / 16;
  const amp = Math.max(Math.abs(currentValue) * 0.08, 1);

  const points: SensorHistoryPoint[] = [];
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
