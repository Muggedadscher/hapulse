/**
 * Energy dashboard model — framework-agnostic.
 *
 * Mirrors Home Assistant's Energy dashboard:
 *  - `EnergyPreferences` is the shape returned by the `energy/get_prefs` WS command.
 *  - `StatisticsMap` is the shape returned by `recorder/statistics_during_period`.
 *  - `computeEnergyDashboard` aggregates prefs + statistics into the figures the
 *    user recognises from HA (grid consumed/returned, solar, battery, gas, water,
 *    per-device consumption, home consumption, cost, and an hourly/daily series).
 *
 * Persistent NOTE: energy data does NOT come through entities. Grid/solar/etc.
 * are long-term statistics fetched on demand, not state-machine entities.
 */

import type { HassEntityMap } from './types.js';

// ---------------------------------------------------------------------------
// Preferences (energy/get_prefs)
// ---------------------------------------------------------------------------

export interface FlowFromGridSourceEnergy {
  stat_energy_from: string;
  stat_cost?: string | null;
  entity_energy_price?: string | null;
  number_energy_price?: number | null;
}

export interface FlowToGridSourceEnergy {
  stat_energy_to: string;
  stat_compensation?: string | null;
  entity_energy_price?: string | null;
  number_energy_price?: number | null;
}

export interface GridSource {
  type: 'grid';
  flow_from?: FlowFromGridSourceEnergy[];
  flow_to?: FlowToGridSourceEnergy[];
  cost_adjustment_day?: number;
  // Some HA responses (and our MCP tooling) flatten the first flow into the
  // source itself — tolerate that shape too.
  stat_energy_from?: string;
  stat_energy_to?: string | null;
  stat_cost?: string | null;
  entity_energy_price?: string | null;
  number_energy_price?: number | null;
  // [fork] Home Assistant's current grid format: one flat object per grid connection, the export's compensation
  // beside it (frontend src/data/energy.ts GridSourceTypeEnergyPreference)
  stat_compensation?: string | null;
  entity_energy_price_export?: string | null;
  number_energy_price_export?: number | null;
  /** [fork] Power sensor (W), positive = import. HA sets it also when only `power_config` is given. */
  stat_rate?: string;
  power_config?: PowerConfig;
  name?: string;
}

/** [fork] How a power sensor is wired (HA 2025.12+); HA resolves it into the source's `stat_rate`. */
export interface PowerConfig {
  stat_rate?: string;
  stat_rate_inverted?: string;
  stat_rate_from?: string;
  stat_rate_to?: string;
}

export interface SolarSource {
  type: 'solar';
  stat_energy_from: string;
  config_entry_solar_forecast?: string[] | null;
  stat_rate?: string; // [fork] power sensor (W)
  name?: string; // [fork]
}

export interface BatterySource {
  type: 'battery';
  stat_energy_from: string;
  stat_energy_to: string;
  /** [fork] Power sensor (W), positive = discharging. */
  stat_rate?: string;
  power_config?: PowerConfig; // [fork]
  /** [fork] State of charge sensor (%). */
  stat_soc?: string;
  /** [fork] Usable capacity (kWh). */
  capacity?: number;
  name?: string; // [fork]
}

export interface GasSource {
  type: 'gas';
  stat_energy_from: string;
  stat_cost?: string | null;
  entity_energy_price?: string | null;
  number_energy_price?: number | null;
  unit_of_measurement?: string;
}

export interface WaterSource {
  type: 'water';
  stat_energy_from: string;
  stat_cost?: string | null;
  entity_energy_price?: string | null;
  number_energy_price?: number | null;
}

export type EnergySource =
  | GridSource
  | SolarSource
  | BatterySource
  | GasSource
  | WaterSource;

export interface DeviceConsumption {
  stat_consumption: string;
  name?: string;
  included_in_stat?: string;
}

export interface EnergyPreferences {
  energy_sources: EnergySource[];
  device_consumption: DeviceConsumption[];
  device_consumption_water?: DeviceConsumption[];
}

/** True when prefs exist but nothing is configured yet. */
export function isEnergyConfigured(prefs: EnergyPreferences | null | undefined): boolean {
  if (!prefs) return false;
  return (
    (prefs.energy_sources?.length ?? 0) > 0 ||
    (prefs.device_consumption?.length ?? 0) > 0
  );
}

// ---------------------------------------------------------------------------
// Statistics (recorder/statistics_during_period)
// ---------------------------------------------------------------------------

export interface StatisticValue {
  start: number;
  end: number;
  change?: number | null;
  sum?: number | null;
  state?: number | null;
}

export type StatisticsMap = Record<string, StatisticValue[]>;

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

export type EnergyPeriod = 'today' | 'week' | 'month' | 'year';

/** Statistics bucket granularity used for each dashboard period. */
export type StatisticsPeriod = '5minute' | 'hour' | 'day' | 'week' | 'month';

export interface EnergyRange {
  /** ISO 8601 start (inclusive). */
  start: string;
  /** ISO 8601 end (exclusive, = now). */
  end: string;
  /** Statistics bucket size to request. */
  bucket: StatisticsPeriod;
}

/**
 * Resolve a dashboard period into a concrete time range + bucket size,
 * relative to `now` (defaults to current time). Uses local time boundaries.
 */
export function energyPeriodRange(period: EnergyPeriod, now: Date = new Date()): EnergyRange {
  const end = now.toISOString();
  const start = new Date(now);
  let bucket: StatisticsPeriod;

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      bucket = 'hour';
      break;
    case 'week': {
      // ISO-ish week starting Monday
      const day = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      bucket = 'day';
      break;
    }
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      bucket = 'day';
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      bucket = 'month';
      break;
  }

  return { start: start.toISOString(), end, bucket };
}

// ---------------------------------------------------------------------------
// Source-id extraction
// ---------------------------------------------------------------------------

function gridFlowFromIds(g: GridSource): string[] {
  if (g.flow_from && g.flow_from.length) {
    return g.flow_from.map((f) => f.stat_energy_from).filter(Boolean);
  }
  return g.stat_energy_from ? [g.stat_energy_from] : [];
}

function gridFlowToIds(g: GridSource): string[] {
  if (g.flow_to && g.flow_to.length) {
    return g.flow_to.map((f) => f.stat_energy_to).filter(Boolean);
  }
  return g.stat_energy_to ? [g.stat_energy_to] : [];
}

/** [fork] The export legs: the old `flow_to` list, or the flat format's export with its compensation. */
function gridFlowToLegs(g: GridSource): FlowToGridSourceEnergy[] {
  if (g.flow_to && g.flow_to.length) return g.flow_to;
  if (!g.stat_energy_to) return [];
  return [{
    stat_energy_to: g.stat_energy_to,
    stat_compensation: g.stat_compensation ?? null,
    entity_energy_price: g.entity_energy_price_export ?? null,
    number_energy_price: g.number_energy_price_export ?? null,
  }];
}

/** All statistic IDs referenced by the prefs — used to drive the stats fetch. */
export function energyStatisticIds(prefs: EnergyPreferences): string[] {
  const ids = new Set<string>();
  for (const src of prefs.energy_sources) {
    if (src.type === 'grid') {
      for (const id of gridFlowFromIds(src)) ids.add(id);
      for (const id of gridFlowToIds(src)) ids.add(id);
      // cost statistics
      for (const f of src.flow_from ?? []) if (f.stat_cost) ids.add(f.stat_cost);
      for (const f of gridFlowToLegs(src)) if (f.stat_compensation) ids.add(f.stat_compensation); // [fork] flat format
      if (src.stat_cost) ids.add(src.stat_cost);
    } else if (src.type === 'solar') {
      ids.add(src.stat_energy_from);
    } else if (src.type === 'battery') {
      ids.add(src.stat_energy_from);
      ids.add(src.stat_energy_to);
    } else if (src.type === 'gas' || src.type === 'water') {
      ids.add(src.stat_energy_from);
      if (src.stat_cost) ids.add(src.stat_cost);
    }
  }
  for (const d of prefs.device_consumption) ids.add(d.stat_consumption);
  for (const d of prefs.device_consumption_water ?? []) ids.add(d.stat_consumption);
  return [...ids];
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

function sumChange(stats: StatisticsMap, id: string): number {
  const arr = stats[id];
  if (!arr) return 0;
  let total = 0;
  for (const v of arr) total += v.change ?? 0;
  return total;
}

function sumChangeMany(stats: StatisticsMap, ids: string[]): number {
  let total = 0;
  for (const id of ids) total += sumChange(stats, id);
  return total;
}

/** Per-bucket change summed across `ids`, keyed by bucket start (epoch ms). */
function seriesSum(stats: StatisticsMap, ids: string[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const id of ids) {
    const arr = stats[id];
    if (!arr) continue;
    for (const v of arr) {
      out.set(v.start, (out.get(v.start) ?? 0) + (v.change ?? 0));
    }
  }
  return out;
}

function entityUnit(entities: HassEntityMap | undefined, statId: string, fallback: string): string {
  const e = entities?.[statId];
  const unit = e?.attributes?.unit_of_measurement;
  return typeof unit === 'string' && unit.length > 0 ? unit : fallback;
}

function priceFromEntity(entities: HassEntityMap | undefined, entityId: string | null | undefined): number | null {
  if (!entityId) return null;
  const e = entities?.[entityId];
  if (!e) return null;
  const v = parseFloat(e.state);
  return Number.isFinite(v) ? v : null;
}

/** Friendly device name: explicit pref name → entity friendly_name → id tail. */
function deviceName(
  entities: HassEntityMap | undefined,
  device: DeviceConsumption,
): string {
  if (device.name && device.name.trim()) return device.name;
  const e = entities?.[device.stat_consumption];
  const fn = e?.attributes?.friendly_name;
  if (typeof fn === 'string' && fn.length > 0) return fn;
  const tail = device.stat_consumption.split('.')[1] ?? device.stat_consumption;
  return tail.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Computed dashboard
// ---------------------------------------------------------------------------

export interface EnergyDeviceUsage {
  id: string;
  name: string;
  consumed: number;
}

export interface EnergySeriesPoint {
  /** Bucket start (epoch ms). */
  start: number;
  gridConsumed: number;
  gridReturned: number;
  solar: number;
  batteryIn: number; // [fork] charged (kWh)
  batteryOut: number; // [fork] discharged (kWh)
}

export interface EnergyWaterUsage {
  id: string;
  consumed: number;
}

export interface EnergyDashboard {
  hasGrid: boolean;
  gridConsumed: number;
  gridReturned: number;

  hasSolar: boolean;
  solarProduced: number;
  /** Solar that stayed in the home (produced − exported), clamped ≥ 0. */
  solarSelfConsumed: number;

  hasBattery: boolean;
  batteryIn: number;
  batteryOut: number;

  hasGas: boolean;
  gasConsumed: number;
  gasUnit: string;

  hasWater: boolean;
  water: EnergyWaterUsage[];
  waterConsumed: number;
  waterUnit: string;

  devices: EnergyDeviceUsage[];
  devicesTotal: number;

  /** Total energy the home used (kWh). */
  homeConsumption: number;

  /** Electricity cost over the period, or null when not computable. */
  cost: number | null;

  series: EnergySeriesPoint[];
}

/**
 * Aggregate energy preferences + statistics into the dashboard figures.
 *
 * `entities` (optional) is used only for unit-of-measurement and price-entity
 * lookups; the computation is otherwise pure.
 */
export function computeEnergyDashboard(
  prefs: EnergyPreferences,
  stats: StatisticsMap,
  entities?: HassEntityMap,
): EnergyDashboard {
  const gridSources = prefs.energy_sources.filter((s): s is GridSource => s.type === 'grid');
  const solarSources = prefs.energy_sources.filter((s): s is SolarSource => s.type === 'solar');
  const batterySources = prefs.energy_sources.filter((s): s is BatterySource => s.type === 'battery');
  const gasSources = prefs.energy_sources.filter((s): s is GasSource => s.type === 'gas');
  const waterSources = prefs.energy_sources.filter((s): s is WaterSource => s.type === 'water');

  const fromIds = gridSources.flatMap(gridFlowFromIds);
  const toIds = gridSources.flatMap(gridFlowToIds);

  const gridConsumed = sumChangeMany(stats, fromIds);
  const gridReturned = sumChangeMany(stats, toIds);

  const solarProduced = sumChangeMany(stats, solarSources.map((s) => s.stat_energy_from));
  const batteryOut = sumChangeMany(stats, batterySources.map((s) => s.stat_energy_from));
  const batteryIn = sumChangeMany(stats, batterySources.map((s) => s.stat_energy_to));

  const gasConsumed = sumChangeMany(stats, gasSources.map((s) => s.stat_energy_from));
  const gasUnit = gasSources.length
    ? (gasSources[0]!.unit_of_measurement ?? entityUnit(entities, gasSources[0]!.stat_energy_from, 'm³'))
    : 'm³';

  const water: EnergyWaterUsage[] = waterSources.map((s) => ({
    id: s.stat_energy_from,
    consumed: sumChange(stats, s.stat_energy_from),
  }));
  const waterConsumed = water.reduce((sum, w) => sum + w.consumed, 0);
  const waterUnit = waterSources.length
    ? entityUnit(entities, waterSources[0]!.stat_energy_from, 'm³')
    : 'm³';

  const devices: EnergyDeviceUsage[] = prefs.device_consumption
    .map((d) => ({
      id: d.stat_consumption,
      name: deviceName(entities, d),
      consumed: sumChange(stats, d.stat_consumption),
    }))
    .sort((a, b) => b.consumed - a.consumed);
  const devicesTotal = devices.reduce((sum, d) => sum + d.consumed, 0);

  const homeConsumption =
    gridConsumed + solarProduced + batteryOut - gridReturned - batteryIn;
  const solarSelfConsumed = Math.max(0, solarProduced - gridReturned);

  // ---- Cost (electricity only, best-effort) ----
  let cost: number | null = null;
  for (const g of gridSources) {
    // import legs
    const fromLegs = g.flow_from && g.flow_from.length
      ? g.flow_from
      : g.stat_energy_from
        ? [{
            stat_energy_from: g.stat_energy_from,
            stat_cost: g.stat_cost ?? null,
            entity_energy_price: g.entity_energy_price ?? null,
            number_energy_price: g.number_energy_price ?? null,
          } as FlowFromGridSourceEnergy]
        : [];
    for (const leg of fromLegs) {
      if (leg.stat_cost) {
        cost = (cost ?? 0) + sumChange(stats, leg.stat_cost);
      } else {
        const price = leg.number_energy_price ?? priceFromEntity(entities, leg.entity_energy_price);
        if (price != null) cost = (cost ?? 0) + sumChange(stats, leg.stat_energy_from) * price;
      }
    }
    // export legs (compensation reduces cost)
    const toLegs = gridFlowToLegs(g); // [fork] also the flat format (was g.flow_to ?? [])
    for (const leg of toLegs) {
      if (leg.stat_compensation) {
        cost = (cost ?? 0) - sumChange(stats, leg.stat_compensation);
      } else {
        const price = leg.number_energy_price ?? priceFromEntity(entities, leg.entity_energy_price);
        if (price != null) cost = (cost ?? 0) - sumChange(stats, leg.stat_energy_to) * price;
      }
    }
  }

  // ---- Series (aligned by bucket start) ----
  const fromSeries = seriesSum(stats, fromIds);
  const toSeries = seriesSum(stats, toIds);
  const solarSeries = seriesSum(stats, solarSources.map((s) => s.stat_energy_from));
  const batInSeries = seriesSum(stats, batterySources.map((s) => s.stat_energy_to)); // [fork]
  const batOutSeries = seriesSum(stats, batterySources.map((s) => s.stat_energy_from)); // [fork]
  const starts = new Set<number>([
    ...fromSeries.keys(),
    ...toSeries.keys(),
    ...solarSeries.keys(),
    ...batInSeries.keys(), // [fork]
    ...batOutSeries.keys(), // [fork]
  ]);
  const series: EnergySeriesPoint[] = [...starts]
    .sort((a, b) => a - b)
    .map((start) => ({
      start,
      gridConsumed: fromSeries.get(start) ?? 0,
      gridReturned: toSeries.get(start) ?? 0,
      solar: solarSeries.get(start) ?? 0,
      batteryIn: batInSeries.get(start) ?? 0, // [fork]
      batteryOut: batOutSeries.get(start) ?? 0, // [fork]
    }));

  return {
    hasGrid: gridSources.length > 0,
    gridConsumed,
    gridReturned,
    hasSolar: solarSources.length > 0,
    solarProduced,
    solarSelfConsumed,
    hasBattery: batterySources.length > 0,
    batteryIn,
    batteryOut,
    hasGas: gasSources.length > 0,
    gasConsumed,
    gasUnit,
    hasWater: waterSources.length > 0,
    water,
    waterConsumed,
    waterUnit,
    devices,
    devicesTotal,
    homeConsumption,
    cost,
    series,
  };
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

export const DEMO_ENERGY_PREFS: EnergyPreferences = {
  energy_sources: [
    {
      type: 'grid',
      cost_adjustment_day: 0,
      flow_from: [
        {
          stat_energy_from: 'sensor.demo_grid_consumption',
          stat_cost: null,
          entity_energy_price: null,
          number_energy_price: 0.32,
        },
      ],
      flow_to: [
        {
          stat_energy_to: 'sensor.demo_grid_return',
          stat_compensation: null,
          entity_energy_price: null,
          number_energy_price: 0.08,
        },
      ],
      stat_rate: 'sensor.demo_grid_power', // [fork] power now (demo.ts demoEnergyEntities)
    },
    { type: 'solar', stat_energy_from: 'sensor.demo_solar_production', config_entry_solar_forecast: null, stat_rate: 'sensor.demo_solar_power' }, // [fork] stat_rate
    {
      type: 'battery',
      stat_energy_from: 'sensor.demo_battery_out',
      stat_energy_to: 'sensor.demo_battery_in',
      // [fork] power, charge and usable capacity
      stat_rate: 'sensor.demo_battery_power',
      stat_soc: 'sensor.demo_battery_soc',
      capacity: 5.12,
    },
    { type: 'water', stat_energy_from: 'sensor.demo_water', number_energy_price: 0.004 },
  ],
  device_consumption: [
    { stat_consumption: 'sensor.demo_dev_dishwasher', name: 'Dishwasher' },
    { stat_consumption: 'sensor.demo_dev_washer', name: 'Washing Machine' },
    { stat_consumption: 'sensor.demo_dev_fridge', name: 'Refrigerator' },
    { stat_consumption: 'sensor.demo_dev_oven', name: 'Oven' },
    { stat_consumption: 'sensor.demo_dev_ev', name: 'EV Charger' },
  ],
  device_consumption_water: [],
};

/** Deterministic pseudo-random in [0,1) from an integer seed. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Shape of a daily load curve at hour h (0..23): morning + evening peaks. */
function dayCurve(h: number): number {
  return (
    0.25 +
    0.6 * Math.exp(-(((h - 8) / 2) ** 2)) + // morning
    0.9 * Math.exp(-(((h - 19) / 2.5) ** 2)) // evening
  );
}

/** Solar bell curve centred on midday. */
function solarCurve(h: number): number {
  return Math.max(0, Math.exp(-(((h - 13) / 3.2) ** 2)));
}

/** Per-bucket base value (kWh-ish) for a given statistic id at a given hour. */
function demoValueFor(id: string, hour: number, seed: number): number {
  const jitter = 0.85 + rand(seed) * 0.3;
  if (id.includes('solar')) return solarCurve(hour) * 1.6 * jitter;
  if (id.includes('grid_return')) return solarCurve(hour) * 0.5 * jitter;
  if (id.includes('grid_consumption')) return Math.max(0, dayCurve(hour) - solarCurve(hour) * 0.7) * 0.9 * jitter;
  if (id.includes('battery_in')) return solarCurve(hour) * 0.4 * jitter;
  if (id.includes('battery_out')) return (hour >= 18 || hour < 7 ? 0.4 : 0.05) * jitter;
  if (id.includes('water')) return (dayCurve(hour) * 0.02 + 0.005) * jitter;
  if (id.includes('dishwasher')) return (hour === 20 ? 0.6 : 0.01) * jitter;
  if (id.includes('washer')) return (hour === 10 ? 0.5 : 0.01) * jitter;
  if (id.includes('fridge')) return 0.06 * jitter;
  if (id.includes('oven')) return (hour === 18 ? 0.8 : 0.0) * jitter;
  if (id.includes('ev')) return (hour >= 1 && hour < 5 ? 2.2 : 0.0) * jitter;
  return dayCurve(hour) * 0.1 * jitter;
}

/**
 * Generate plausible demo statistics for the requested ids over a range.
 *
 * Produces one bucket per `bucket` step between `start` and `end`. For day/month
 * buckets the per-hour values are aggregated to keep totals realistic.
 */
export function demoEnergyStatistics(
  ids: string[],
  bucket: StatisticsPeriod,
  start: string,
  end: string,
): StatisticsMap {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const out: StatisticsMap = {};

  const stepMs =
    bucket === 'hour' ? 3600_000 :
    bucket === 'day' ? 86_400_000 :
    bucket === 'month' ? 30 * 86_400_000 :
    bucket === 'week' ? 7 * 86_400_000 :
    300_000;

  for (const id of ids) {
    const values: StatisticValue[] = [];
    let bStart = startMs;
    let i = 0;
    while (bStart < endMs) {
      // [fork] month buckets end at the next calendar month, like Home Assistant's (was bStart + 30 days)
      const bNext = bucket === 'month'
        ? new Date(new Date(bStart).getFullYear(), new Date(bStart).getMonth() + 1, 1).getTime()
        : bStart + stepMs;
      const bEnd = Math.min(bNext, endMs);
      let change = 0;
      if (bucket === 'hour') {
        const hour = new Date(bStart).getHours();
        change = demoValueFor(id, hour, bStart / 3600_000);
      } else {
        // Aggregate a representative day (or fraction for the current bucket).
        const hoursInBucket = Math.min(24 * (stepMs / 86_400_000), (bEnd - bStart) / 3600_000);
        for (let h = 0; h < Math.round(hoursInBucket); h++) {
          change += demoValueFor(id, h % 24, bStart / 3600_000 + h);
        }
      }
      values.push({ start: bStart, end: bEnd, change: Math.round(change * 1000) / 1000 });
      bStart = bEnd;
      i++;
      if (i > 5000) break; // safety
    }
    out[id] = values;
  }

  return out;
}
