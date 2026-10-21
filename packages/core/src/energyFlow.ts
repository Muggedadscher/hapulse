/**
 * [fork] Where the energy came from and went to — the energy page after draft v5 (plan
 * /glas/energie-neu/umsetzung/PLAN.md): the home's consumption by origin (solar, battery, grid), the solar's
 * destinations (home, battery, grid), the power right now from the sources' power sensors, the sentence for "Now" and
 * the battery's state. Everything comes from Home Assistant's own energy preferences (`stat_rate`, `stat_soc`,
 * `capacity`); a part without its data is simply missing. Pure and time-zone aware — tested in scripts/smoke.mjs.
 *
 * One allocation rule for energy (kWh per bar) and power (W now), in Home Assistant's order (`allocateEnergy`). It
 * runs per bar: a day or month bar can differ a little from the sum of its hours, as in Home Assistant.
 */

import type { EnergyPeriod, EnergyPreferences, EnergySeriesPoint } from './energy.js';
import type { HassEntityMap } from './types.js';

// ---------------------------------------------------------------------------
// Allocation
// ---------------------------------------------------------------------------

export interface EnergyAllocation {
  solarHome: number;
  solarBattery: number;
  solarGrid: number;
  batteryHome: number;
  batteryGrid: number;
  gridHome: number;
  gridBattery: number;
  /** What the home used: solarHome + batteryHome + gridHome. */
  home: number;
}

const pos = (v: number): number => (Number.isFinite(v) && v > 0 ? v : 0);

/**
 * Split the flows of one bucket (or of this moment). Sources: solar, battery discharge, grid import; sinks: home,
 * battery charge, grid export. Values below 0 or missing count as 0; any one unit. The order is Home Assistant's
 * (energy distribution): grid import beyond what the home used went into the battery; the battery charges from solar,
 * the solar left over is exported, an export beyond it came from the battery, a charge beyond the solar came from the
 * grid; what the home used comes from solar, then the battery, then the grid.
 */
export function allocateEnergy(
  solar: number,
  batteryOut: number,
  gridIn: number,
  batteryIn: number,
  gridOut: number,
): EnergyAllocation {
  let s = pos(solar);
  let bo = pos(batteryOut);
  let gi = pos(gridIn);
  let bi = pos(batteryIn);
  let go = pos(gridOut);
  let need = Math.max(0, gi + s + bo - go - bi);
  // the grid brought more than the home used: the surplus charged the battery
  let gridBattery = Math.max(0, Math.min(bi, gi - need));
  bi -= gridBattery;
  gi -= gridBattery;
  const solarBattery = Math.min(s, bi);
  bi -= solarBattery;
  s -= solarBattery;
  const solarGrid = Math.min(s, go);
  go -= solarGrid;
  s -= solarGrid;
  const batteryGrid = Math.min(bo, go);
  bo -= batteryGrid;
  const moreFromGrid = Math.min(gi, bi);
  gridBattery += moreFromGrid;
  gi -= moreFromGrid;
  const solarHome = Math.min(need, s);
  need -= solarHome;
  const batteryHome = Math.min(bo, need);
  need -= batteryHome;
  const gridHome = Math.min(need, gi);
  return {
    solarHome,
    solarBattery,
    solarGrid,
    batteryHome,
    batteryGrid,
    gridHome,
    gridBattery,
    home: solarHome + batteryHome + gridHome,
  };
}

// ---------------------------------------------------------------------------
// Windows of the energy page (calendar periods, like energyPeriodRange)
// ---------------------------------------------------------------------------

export interface EnergyPageWindow {
  period: EnergyPeriod;
  /** Bucket boundaries, n + 1 values (epoch ms, local calendar). */
  bounds: number[];
  bucket: 'hour' | 'day' | 'month';
}

/**
 * The page's buckets: today's hours (23/25 on DST days), the days of this week from Monday, the days of this month,
 * the months of this year. Future buckets are part of the window (drawn as stubs).
 */
export function energyPageWindow(period: EnergyPeriod, now: Date): EnergyPageWindow {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const bounds: number[] = [];
  switch (period) {
    case 'today': {
      const start = new Date(y, m, d).getTime();
      const next = new Date(y, m, d + 1).getTime();
      for (let t = start; t < next; t += 3600_000) bounds.push(t);
      bounds.push(next);
      return { period, bounds, bucket: 'hour' };
    }
    case 'week': {
      const monday = d - ((now.getDay() + 6) % 7);
      for (let i = 0; i <= 7; i++) bounds.push(new Date(y, m, monday + i).getTime());
      return { period, bounds, bucket: 'day' };
    }
    case 'month': {
      const days = new Date(y, m + 1, 0).getDate();
      for (let i = 1; i <= days + 1; i++) bounds.push(new Date(y, m, i).getTime());
      return { period, bounds, bucket: 'day' };
    }
    case 'year':
      for (let i = 0; i <= 12; i++) bounds.push(new Date(y, i, 1).getTime());
      return { period, bounds, bucket: 'month' };
  }
}

/**
 * The span the comparison compares: from the period's start to the last full hour, and the same span in the period
 * before (yesterday, last week, last month, last year at the same local wall times; a shorter month before ends at
 * its own end). Both end on a full hour, where Home Assistant's hourly statistics end.
 */
export function energyPageCompare(period: EnergyPeriod, now: Date): {
  current: { start: number; end: number };
  previous: { start: number; end: number };
} {
  const win = energyPageWindow(period, now);
  const start = win.bounds[0]!;
  const endDate = new Date(Math.max(start, Math.floor(now.getTime() / 3600_000) * 3600_000));
  const shifted = (t: Date, days: number, months: number, years: number): number =>
    new Date(t.getFullYear() + years, t.getMonth() + months, t.getDate() + days, t.getHours(), t.getMinutes()).getTime();
  const startDate = new Date(start);
  let prevStart: number;
  let prevEnd: number;
  switch (period) {
    case 'today':
      prevStart = shifted(startDate, -1, 0, 0);
      prevEnd = shifted(endDate, -1, 0, 0);
      break;
    case 'week':
      prevStart = shifted(startDate, -7, 0, 0);
      prevEnd = shifted(endDate, -7, 0, 0);
      break;
    case 'month': {
      prevStart = shifted(startDate, 0, -1, 0);
      // the same day of the month before; past its last day (31 → 30) the month before ends at its end
      const sameDay = new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate(), endDate.getHours(), endDate.getMinutes());
      prevEnd = sameDay.getMonth() === new Date(prevStart).getMonth() ? sameDay.getTime() : start;
      break;
    }
    case 'year': {
      prevStart = shifted(startDate, 0, 0, -1);
      // 29 Feb → the year before ends on 1 Mar 00:00 (its 28 Feb is complete)
      const sameDay = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate(), endDate.getHours(), endDate.getMinutes());
      prevEnd = sameDay.getMonth() === endDate.getMonth() ? sameDay.getTime() : new Date(endDate.getFullYear() - 1, 2, 1).getTime();
      break;
    }
  }
  return { current: { start, end: endDate.getTime() }, previous: { start: prevStart, end: Math.max(prevStart, prevEnd) } };
}

// ---------------------------------------------------------------------------
// Bars and shares
// ---------------------------------------------------------------------------

export interface EnergyOriginBar extends EnergyAllocation {
  start: number;
  end: number;
  /** Solar produced (kWh). */
  produced: number;
  /** A statistics row fell into this bucket. */
  hasData: boolean;
  /** Starts after now: drawn as a stub. */
  future: boolean;
  /** Contains now (still running). */
  current: boolean;
}

/**
 * One bar per bucket of the window; series points add to the bucket that contains their start. Home Assistant forms
 * day and month buckets in its own time zone: in a browser in another zone the buckets do not line up with the local
 * calendar, and a bucket starting before the window is left out (the household's devices share HA's zone).
 */
export function energyOriginBars(
  win: Pick<EnergyPageWindow, 'bounds'>,
  series: readonly EnergySeriesPoint[],
  now: Date,
): EnergyOriginBar[] {
  const { bounds } = win;
  const t = now.getTime();
  const n = bounds.length - 1;
  const raw = Array.from({ length: n }, () => ({ gi: 0, go: 0, s: 0, bi: 0, bo: 0, has: false }));
  for (const p of series) {
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (bounds[mid]! <= p.start) lo = mid;
      else hi = mid - 1;
    }
    if (n === 0 || p.start < bounds[lo]! || p.start >= bounds[lo + 1]!) continue;
    const r = raw[lo]!;
    r.has = true;
    r.gi += pos(p.gridConsumed);
    r.go += pos(p.gridReturned);
    r.s += pos(p.solar);
    r.bi += pos(p.batteryIn);
    r.bo += pos(p.batteryOut);
  }
  return raw.map((r, i) => {
    const start = bounds[i]!;
    const end = bounds[i + 1]!;
    return {
      ...allocateEnergy(r.s, r.bo, r.gi, r.bi, r.go),
      start,
      end,
      produced: r.s,
      hasData: r.has,
      future: start > t,
      current: start <= t && t < end,
    };
  });
}

/** Whole percents of `values` that add up to exactly 100 (largest remainder); all 0 when the total is 0. */
export function sharePercents(values: readonly number[]): number[] {
  const v = values.map(pos);
  const total = v.reduce((a, b) => a + b, 0);
  if (total <= 0) return v.map(() => 0);
  const exact = v.map((x) => (x / total) * 100);
  const out = exact.map(Math.floor);
  let rest = 100 - out.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) {
    if (rest <= 0) break;
    out[i] = out[i]! + 1;
    rest--;
  }
  return out;
}

export interface EnergyShares {
  /** Home consumption (kWh) and its origins. */
  home: number;
  fromSolar: number;
  fromBattery: number;
  fromGrid: number;
  /** Whole percents of the origins (solar, battery, grid), adding up to 100; own = solar + battery. */
  homePct: { solar: number; battery: number; grid: number; own: number };
  /** Solar produced (kWh) and its destinations. */
  produced: number;
  toHome: number;
  toBattery: number;
  toGrid: number;
  /** Whole percents of the destinations (home, battery, grid), adding up to 100; self = home + battery. */
  solarPct: { home: number; battery: number; grid: number; self: number };
}

/** The period's shares: the sums over its bars. */
export function energyShares(bars: readonly EnergyAllocation[]): EnergyShares {
  const sum = (k: keyof EnergyAllocation) => bars.reduce((a, b) => a + b[k], 0);
  const fromSolar = sum('solarHome');
  const fromBattery = sum('batteryHome');
  const fromGrid = sum('gridHome');
  const toBattery = sum('solarBattery');
  const toGrid = sum('solarGrid');
  const [hs, hb, hg] = sharePercents([fromSolar, fromBattery, fromGrid]) as [number, number, number];
  const [sh, sb, sg] = sharePercents([fromSolar, toBattery, toGrid]) as [number, number, number];
  return {
    home: fromSolar + fromBattery + fromGrid,
    fromSolar,
    fromBattery,
    fromGrid,
    homePct: { solar: hs, battery: hb, grid: hg, own: hs + hb },
    produced: fromSolar + toBattery + toGrid,
    toHome: fromSolar,
    toBattery,
    toGrid,
    solarPct: { home: sh, battery: sb, grid: sg, self: sh + sb },
  };
}

// ---------------------------------------------------------------------------
// Power now
// ---------------------------------------------------------------------------

export interface EnergyPowerIds {
  solar: string[];
  /** Positive = import. */
  grid: string[];
  /** Positive = discharging. */
  battery: string[];
}

/**
 * The power sensors of the configured sources, or null when the home's power cannot be computed: a solar or battery
 * source without one, or no grid source with one. Grid sources without a sensor are left out when another grid source
 * has one: Home Assistant turns a two-tariff meter (two import flows) into two grid sources and gives the connection's
 * power sensor only to the first. Without any grid source (off grid) there is no "Now". Gas and water are not part of
 * it.
 */
export function energyPowerIds(prefs: EnergyPreferences | null | undefined): EnergyPowerIds | null {
  if (!prefs) return null;
  const ids: EnergyPowerIds = { solar: [], grid: [], battery: [] };
  for (const src of prefs.energy_sources) {
    if (src.type !== 'grid' && src.type !== 'solar' && src.type !== 'battery') continue;
    if (src.stat_rate) ids[src.type].push(src.stat_rate);
    else if (src.type !== 'grid') return null;
  }
  return ids.grid.length > 0 ? ids : null;
}

const POWER_FACTOR: Record<string, number> = { W: 1, kW: 1000, MW: 1_000_000, GW: 1_000_000_000, mW: 0.001 };

/** A power entity's value in W, or null when it is missing, unavailable or in an unknown unit. */
export function powerWatts(entities: HassEntityMap | undefined, id: string): number | null {
  const e = entities?.[id];
  if (!e) return null;
  const v = parseFloat(e.state);
  if (!Number.isFinite(v)) return null;
  const unit = e.attributes?.unit_of_measurement;
  const f = typeof unit === 'string' ? POWER_FACTOR[unit] : 1;
  return f === undefined ? null : v * f;
}

export interface EnergyPowerNow {
  /** W, each ≥ 0. */
  solar: number;
  home: number;
  batteryCharge: number;
  batteryDischarge: number;
  gridImport: number;
  gridExport: number;
  flows: EnergyAllocation;
  hasSolar: boolean;
  hasBattery: boolean;
}

/** Power right now, or null when a sensor has no number. */
export function energyPowerNow(ids: EnergyPowerIds, entities: HassEntityMap | undefined): EnergyPowerNow | null {
  const total = (list: string[]): number | null => {
    let s = 0;
    for (const id of list) {
      const w = powerWatts(entities, id);
      if (w === null) return null;
      s += w;
    }
    return s;
  };
  const solar = total(ids.solar);
  const grid = total(ids.grid);
  const battery = total(ids.battery);
  if (solar === null || grid === null || battery === null) return null;
  const s = Math.max(0, solar);
  const flows = allocateEnergy(s, Math.max(0, battery), Math.max(0, grid), Math.max(0, -battery), Math.max(0, -grid));
  return {
    solar: s,
    home: flows.home,
    batteryCharge: Math.max(0, -battery),
    batteryDischarge: Math.max(0, battery),
    gridImport: Math.max(0, grid),
    gridExport: Math.max(0, -grid),
    flows,
    hasSolar: ids.solar.length > 0,
    hasBattery: ids.battery.length > 0,
  };
}

/** Below this, a flow counts as none (W). */
export const POWER_FLOW_MIN = 50;

export type EnergyNowSentence =
  | 'idle'
  | 'sun'
  | 'sunExport'
  | 'sunBattery'
  | 'sunAndBattery'
  | 'sunAndGrid'
  | 'battery'
  | 'batteryAndGrid'
  | 'grid'
  | 'gridBattery'
  | 'sunChargesOnly'
  | 'sunExportsOnly'
  | 'gridChargesOnly';

/**
 * Which sentence "Now" says: what feeds the home, and what the solar does besides. Sun, battery and grid together
 * say "sunAndGrid" (the sun is not enough, the rest comes from outside); the flow shows the battery's part.
 */
export function energyNowSentence(f: EnergyAllocation): EnergyNowSentence {
  const on = (v: number) => v >= POWER_FLOW_MIN;
  const sun = on(f.solarHome);
  const bat = on(f.batteryHome);
  const grid = on(f.gridHome);
  if (sun && grid) return 'sunAndGrid';
  if (sun && bat) return 'sunAndBattery';
  if (sun) return on(f.solarBattery) ? 'sunBattery' : on(f.solarGrid) ? 'sunExport' : 'sun';
  if (bat) return grid ? 'batteryAndGrid' : 'battery';
  if (grid) return on(f.gridBattery) ? 'gridBattery' : 'grid';
  if (on(f.solarBattery)) return 'sunChargesOnly';
  if (on(f.solarGrid)) return 'sunExportsOnly';
  if (on(f.gridBattery)) return 'gridChargesOnly';
  return 'idle';
}

// ---------------------------------------------------------------------------
// Battery
// ---------------------------------------------------------------------------

export type BatteryState = 'charging' | 'discharging' | 'full' | 'idle';

export interface BatteryStatus {
  state: BatteryState;
  /** When it is about full (charging), rounded to the quarter hour; null when unknown or more than 24 h away. */
  at: number | null;
}

/**
 * The battery's state from its charge (%) and power (W, positive = discharging). "Full" from 99.5 %, unless it
 * discharges. The time needs the usable capacity (kWh) and at least 50 W of charging. No time while discharging:
 * Home Assistant knows no reserve, and a battery stops at its own discharge limit, so "lasts until" would be late.
 */
export function batteryStatus(soc: number, powerW: number | null, capacityKWh: number | null | undefined, now: Date): BatteryStatus {
  const p = powerW ?? 0;
  const charging = p <= -POWER_FLOW_MIN;
  const discharging = p >= POWER_FLOW_MIN;
  if (!discharging && soc >= 99.5) return { state: 'full', at: null };
  if (!charging && !discharging) return { state: 'idle', at: null };
  let at: number | null = null;
  if (charging && capacityKWh && capacityKWh > 0) {
    const kwh = ((100 - soc) / 100) * capacityKWh;
    const hours = kwh / (Math.abs(p) / 1000);
    // to the quarter hour on the epoch: every time zone's offset is a multiple of 15 min, and a repeated hour
    // (DST end) keeps its instant
    if (hours >= 0 && hours <= 24) at = Math.round((now.getTime() + hours * 3600_000) / 900_000) * 900_000;
  }
  return { state: charging ? 'charging' : 'discharging', at };
}
