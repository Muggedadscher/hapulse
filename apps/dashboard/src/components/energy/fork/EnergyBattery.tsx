/**
 * [fork] The energy page's card "Battery" after draft v5 (plan glas/energie-neu/umsetzung/PLAN.md): how full the home
 * battery is (ring and figure), what it does right now (charging, with "full at about" when every capacity is known;
 * discharging, full, idle, not reachable) and its charge today. Everything comes from Home Assistant's energy settings
 * (`stat_soc`, `stat_rate`, `capacity` per battery; core `energyBatteryIds`); several batteries count as one, weighted by
 * capacity (core `combinedSoc`). With one battery of a known integration also its charge limit, reserve and mode
 * (plan PLAN-E4-AKKU.md, core `findBatteryDetails` over the entity registry): "full" at the limit, "reserve reached",
 * "lasts until about" and the reserve in the chart; "Details" opens the battery's window, where everyone can also set the
 * three (E5, EnergyBatteryWindow.tsx). The chart takes the card's free height, so a card beside a taller one has no
 * empty space under it; the line leaves out the sensors' whole-percent steps, which a tall chart would show as teeth.
 * The charge and power are read only here (narrow store selectors). The look in
 * EnergyBattery.css and styles/glas/energy.css.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Battery, ChevronRight, CircleAlert, Zap } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import {
  batteryControls,
  batteryDetails,
  batteryPlanMismatch,
  batteryStatus,
  batterySteer,
  combinedSoc,
  combinedSocSeries,
  energyBatteryIds,
  findBatteryDetails,
  formatNumber,
  powerWatts,
  simplifyLine,
} from '@hapulse/core';
import type {
  BatteryControls,
  BatteryDetailIds,
  BatteryDetails,
  BatteryStatus,
  BatterySteer,
  EnergyBatteryIds,
  EnergyPreferences,
  HassEntityMap,
} from '@hapulse/core';
import { Card } from '../../ui/Card';
import { useEntityStore } from '../../../stores/entityStore';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getHistory } from '../../../ha/history';
import { useLocale, useT } from '../../../i18n/useT';
import { CardHead } from './EnergyOrigin';
import { BATTERY_STATE_KEY, BatteryRing } from './EnergyBatteryParts';
import { EnergyBatteryWindow } from './EnergyBatteryWindow';
import './EnergyNow.css';
import './EnergyBattery.css';

const STEP = 5 * 60_000;
const RELOAD = 5 * 60_000;
/** the chart's least height (without the hour labels); it grows with the card */
const CHART_H = 96;
const LABELS_H = 22;
/** the line leaves out readings within this many percentage points of it: the sensors' whole-percent steps (core simplifyLine) */
const LINE_TOLERANCE = 1.5;
const AXIS_W = 44;
/** [fork] with a reserve: room for its word in the axis column, and a regular label closer than this (points) is left out */
const AXIS_W_RESERVE = 54;
const RESERVE_TICK_GAP = 12;

/** Local midnight today and tomorrow (23 or 25 hours apart on a DST day). */
function dayBounds(now: Date): [number, number] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  return [new Date(y, m, d).getTime(), new Date(y, m, d + 1).getTime()];
}

type Point = { t: number; v: number };

/**
 * Today's combined charge: the day's history on mount, then every 5 minutes only what came since (a charge sensor can
 * write every few seconds), from scratch at midnight and when the batteries change.
 */
function useSocToday(soc: string[], capacities: number[] | null): Point[] | null {
  const status = useConnectionStore((s) => s.status);
  const [series, setSeries] = useState<Point[] | null>(null);
  const [tick, setTick] = useState(0);
  const loaded = useRef<{ key: string; start: number; until: number; raw: Point[][] } | null>(null);
  const key = soc.join(',');
  useEffect(() => {
    if (status !== 'connected') return undefined;
    let cancelled = false;
    const now = Date.now();
    const [start, end] = dayBounds(new Date(now));
    const prev = loaded.current && loaded.current.key === key && loaded.current.start === start ? loaded.current : null;
    const from = prev ? prev.until : start;
    Promise.all(soc.map((id) => getHistory(id, from, now))).then(
      (fresh) => {
        if (cancelled) return;
        const raw = fresh.map((pts, i) => [...(prev?.raw[i] ?? []), ...pts]);
        loaded.current = { key, start, until: now, raw };
        setSeries(combinedSocSeries(raw, capacities, start, now, STEP));
      },
      (err: unknown) => console.warn('[HAPulse] battery history failed:', err),
    );
    // the next load in 5 minutes, or just after midnight for the new day
    const timer = window.setTimeout(() => setTick((n) => n + 1), Math.min(RELOAD, end - now + 1000));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // the ids by value; capacities belong to them
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, key, tick]);
  return series;
}

function SocChart({ points, nowSoc, now, reserve }: { points: { t: number; v: number }[]; nowSoc: number | null; now: number; reserve: number | null }) {
  const t = useT();
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    // the box takes the card's free height (CSS); the drawing sits on it, so it never makes the box grow
    const read = () => setSize((cur) => (cur.width === el.clientWidth && cur.height === el.clientHeight ? cur : { width: el.clientWidth, height: el.clientHeight }));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { width } = size;
  const chartH = Math.max(CHART_H, size.height - LABELS_H);
  const [start, end] = dayBounds(new Date(now));
  // today only: after midnight the last load is yesterday's until the next one
  const today = points.filter((p) => p.t >= start && p.t < now);
  const all = nowSoc === null ? today : [...today, { t: now, v: nowSoc }];
  // the reserve's label sits in the axis column, which needs a little more room for the word
  const axisW = reserve === null ? AXIS_W : AXIS_W_RESERVE;
  const cw = Math.max(0, width - axisW);
  const x = (ms: number) => ((ms - start) / (end - start)) * cw;
  const y = (v: number) => chartH - (Math.max(0, Math.min(100, v)) / 100) * chartH;
  const pct = (v: number) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(v / 100);
  const hour = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
  const day = new Date(start);
  const ticks = [0, 6, 12, 18].map((h) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h).getTime());
  const last = all[all.length - 1];
  const drawn = simplifyLine(all, LINE_TOLERANCE);
  const line = drawn.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`);
  const label = last ? t('energy.battery.chartAria', { value: pct(last.v) }) : t('energy.battery.noData');
  return (
    <div ref={box} className="en-bat__chart" role="img" aria-label={label}>
      {width > axisW && (
        <svg width={width} height={chartH + LABELS_H} aria-hidden="true">
          {[0, 50, 100].map((p) => (
            <g key={p}>
              <line className={p ? 'en-bat__rule' : 'en-bat__rule en-bat__rule--base'} x1={0} x2={cw} y1={y(p)} y2={y(p)} />
              {p > 0 && (reserve === null || Math.abs(p - reserve) >= RESERVE_TICK_GAP) && (
                <text className="en-bat__tick" x={cw + 6} y={y(p) + 4}>
                  {pct(p)}
                </text>
              )}
            </g>
          ))}
          {reserve !== null && (
            <g className="en-bat__reserve">
              <line className="en-bat__reserve-line" x1={0} x2={cw} y1={y(reserve)} y2={y(reserve)} />
              {/* in the axis column like the other lines' labels */}
              <text className="en-bat__reserve-label" x={cw + 6} y={y(reserve) + 4}>
                {t('energy.battery.reserveLine')}
              </text>
            </g>
          )}
          {last && line.length > 1 && (
            <>
              <path className="en-bat__area" d={`M${x(drawn[0]!.t)},${chartH}L${line.join('L')}L${x(last.t)},${chartH}Z`} />
              <path className="en-bat__line" d={`M${line.join('L')}`} />
            </>
          )}
          {last && x(last.t) + 4 < cw && (
            <line className="en-bat__rest" x1={x(last.t) + 4} x2={cw} y1={chartH - 1.5} y2={chartH - 1.5} />
          )}
          {last && <circle className="en-bat__dot" cx={x(last.t)} cy={y(last.v)} r={4} />}
          {ticks.map((ms) => (
            <text key={ms} className="en-bat__tick" x={x(ms)} y={chartH + 18}>
              {hour.format(ms)}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}

export interface BatteryNow {
  ids: EnergyBatteryIds;
  /** the one battery's entities of a known integration (core findBatteryDetails), null without */
  detailIds: BatteryDetailIds | null;
  /** charge limit, reserve and mode of the one battery, each null when unknown */
  details: BatteryDetails;
  /** the same three with what the window needs to set them */
  controls: BatteryControls;
  /** combined charge (%), null when a battery's charge is unknown */
  soc: number | null;
  /** combined power (W, + = discharging), null without a reading of every battery */
  power: number | null;
  /** combined capacity (kWh), null unless every battery names one */
  capacity: number | null;
  status: BatteryStatus | null;
  /** the state word is certain: there is power to tell it, or the battery is full or at its reserve */
  showState: boolean;
  /** [fork] E5b: the power setpoint and HAPulse's plan, null without a setpoint entity */
  steer: BatterySteer | null;
  /** the names of other schedules that set the same setpoint */
  rivalNames: string[];
  /** the plan runs and the setpoint has not had the running time's value for a while (MISMATCH_MS) */
  mismatch: boolean;
}

/** How long the setpoint may differ from the running time before the card and the window say so: the battery takes a
 *  new value within seconds, the integration retries a failed write for up to half a minute. */
const MISMATCH_MS = 45_000;

const NO_SCHEDULES: HassEntityMap = {};

/** The scheduler's schedules (`switch.schedule_*`): HAPulse's plan and other schedules that may set the setpoint. */
function scheduleEntities(entities: HassEntityMap): HassEntityMap {
  const out: HassEntityMap = {};
  for (const id in entities) if (id.startsWith('switch.schedule_')) out[id] = entities[id]!;
  return out;
}

/** True once `flag` has held MISMATCH_MS after `since` (ms); renders again when that time comes. */
function useLastingSince(flag: boolean, since: number): boolean {
  const [, setTick] = useState(0);
  const left = since + MISMATCH_MS - Date.now();
  const waiting = flag && left > 0;
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = window.setTimeout(() => setTick((n) => n + 1), left + 100);
    return () => window.clearTimeout(timer);
    // `left` only while waiting: a new render must not restart the timer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, since]);
  return flag && !waiting;
}

/**
 * The batteries right now from Home Assistant's energy settings; null without a charge sensor that is an entity (an
 * external statistic has none), as the energy page decides (sections.ts).
 */
export function useBatteryNow(prefs: EnergyPreferences | null): BatteryNow | null {
  const ids = useMemo(() => energyBatteryIds(prefs), [prefs]);
  const registries = useEntityStore((s) => s.registries);
  const detailIds = useMemo(() => findBatteryDetails(registries, ids?.soc, ids?.power), [registries, ids]);
  const extra = useMemo(
    () => (detailIds ? [detailIds.chargeLimit, detailIds.reserve, detailIds.mode, detailIds.setpoint].filter((id): id is string => !!id) : []),
    [detailIds],
  );
  const all = useMemo(() => (ids ? [...ids.soc, ...ids.power, ...extra] : []), [ids, extra]);
  const states = useEntityStore(useShallow((s) => all.map((id) => s.entities[id])));
  // [fork] E5b: the schedules only with a setpoint to steer (a shallow map: a change elsewhere renders nothing)
  const setpointId = detailIds?.setpoint ?? null;
  const schedules = useEntityStore(useShallow((s) => (setpointId ? scheduleEntities(s.entities) : NO_SCHEDULES)));
  const steerMap = useMemo(() => {
    const m: HassEntityMap = { ...schedules };
    all.forEach((id, i) => {
      const e = states[i];
      if (e) m[id] = e;
    });
    return m;
  }, [schedules, all, states]);
  const steer = useMemo(() => batterySteer(setpointId, steerMap), [setpointId, steerMap]);
  // the mismatch counts from the later change of the setpoint and the plan (a new slot), so it shows at once when the
  // window opens long after
  const planEntity = steer?.plan ? steerMap[steer.plan.entityId] : undefined;
  const setpointEntity = setpointId ? steerMap[setpointId] : undefined;
  const since = Math.max(Date.parse(setpointEntity?.last_updated ?? '') || 0, Date.parse(planEntity?.last_updated ?? '') || 0);
  const mismatch = useLastingSince(batteryPlanMismatch(steer), since);
  if (!ids || ids.soc.some((_, i) => !states[i])) return null;
  const map: HassEntityMap = {};
  all.forEach((id, i) => {
    const e = states[i];
    if (e) map[id] = e;
  });
  const socs = ids.soc.map((id) => {
    const v = parseFloat(map[id]?.state ?? '');
    return Number.isFinite(v) ? v : null;
  });
  const soc = combinedSoc(socs, ids.capacities);
  const powers = ids.power.map((id) => powerWatts(map, id));
  const power = powers.length > 0 && powers.every((p) => p !== null) ? (powers as number[]).reduce((a, b) => a + b, 0) : null;
  const now = new Date();
  const capacity = ids.capacities ? ids.capacities.reduce((a, b) => a + b, 0) : null;
  const details = batteryDetails(detailIds, map);
  const controls = batteryControls(detailIds, map);
  const status = soc === null ? null : batteryStatus(soc, power, capacity, now, { full: details.chargeLimit, reserve: details.reserve });
  // without a power sensor only "full" and "reserve reached" are certain; the card does not claim "idle"
  const showState = !!status && (power !== null || status.state === 'full' || status.state === 'reserve');
  const rivalNames = (steer?.rivals ?? []).map((id) => {
    const name = steerMap[id]?.attributes['friendly_name'];
    return typeof name === 'string' && name ? name : id;
  });
  return { ids, detailIds, details, controls, soc, power, capacity, status, showState, steer, rivalNames, mismatch };
}

/** The card "Battery"; renders nothing without a charge sensor in Home Assistant's energy settings. */
export function EnergyBatteryCard({ prefs }: { prefs: EnergyPreferences | null }) {
  const t = useT();
  const locale = useLocale();
  const battery = useBatteryNow(prefs);
  const series = useSocToday(battery?.ids.soc ?? [], battery?.ids.capacities ?? null);
  // the window; a new key per opening starts its drafts from Home Assistant's values, `open` lets it leave animated
  const [win, setWin] = useState({ key: 0, open: false });
  if (!battery) return null;
  const { soc, status, showState, details, controls, steer, mismatch } = battery;
  const now = new Date();
  const time = (ms: number) => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(ms);
  const hasDetails = !!(controls.mode || controls.chargeLimit || controls.reserve || steer);
  const openWindow = () => setWin((w) => ({ key: w.key + 1, open: true }));

  return (
    <Card className="energy-battery en-card en-card--battery">
      <CardHead
        icon={<Battery size={16} strokeWidth={1.75} />}
        title={t('energy.battery.title')}
        action={
          hasDetails ? (
            <button type="button" className="en-bat__more" aria-label={t('energy.battery.detailsAria')} onClick={openWindow}>
              {t('energy.battery.details')}
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          ) : undefined
        }
      />
      <div className="en-bat__head">
        <div className="en-bat__ring">
          <BatteryRing value={soc ?? 0} size={64} stroke={7} />
          <span className="en-bat__glyph" aria-hidden="true">
            <Zap size={24} strokeWidth={2} />
          </span>
        </div>
        <div className="en-bat__text">
          {soc === null ? (
            <p className="en-bat__sub">{t('energy.battery.unavailable')}</p>
          ) : (
            <>
              <p className="en-big">
                <span className="en-big__num">{formatNumber(soc, locale, { maxDecimals: 0 })}</span>
                <span className="en-big__unit">%</span>
              </p>
              {showState && status && (
                <p className="en-bat__sub">
                  <span className={`en-bat__state en-bat__state--${status.state}`}>{t(BATTERY_STATE_KEY[status.state]!)}</span>
                  {status.at !== null && <> · {t('energy.battery.fullAt', { time: time(status.at) })}</>}
                  {status.until !== null && <> · {t('energy.battery.lastsUntil', { time: time(status.until) })}</>}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      {/* [fork] E5b: the battery has not taken the plan's running time; the window says more and can send it again */}
      {mismatch && hasDetails && (
        <button type="button" className="en-bat__alert" onClick={openWindow}>
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>{t('energy.battery.mismatch')}</span>
          <ChevronRight className="en-bat__alert-chevron" size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
      <p className="en-bat__label">{t('energy.battery.today')}</p>
      <SocChart points={series ?? []} nowSoc={soc} now={now.getTime()} reserve={details.reserve} />
      {win.key > 0 && <EnergyBatteryWindow key={win.key} open={win.open} battery={battery} onClose={() => setWin((w) => ({ ...w, open: false }))} />}
    </Card>
  );
}
