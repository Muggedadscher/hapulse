/**
 * [fork] The energy page's card "Battery" after draft v5 (plan glas/energie-neu/umsetzung/PLAN.md): how full the home
 * battery is (ring and figure), what it does right now (charging, with "full at about" when every capacity is known;
 * discharging, full, idle, not reachable) and its charge today. Everything comes from Home Assistant's energy settings
 * (`stat_soc`, `stat_rate`, `capacity` per battery; core `energyBatteryIds`); several batteries count as one, weighted by
 * capacity (core `combinedSoc`). Reserve, mode and charge limits are left open until a battery integration is known
 * (plan §7). The charge and power are read only here (narrow store selectors). Both styles; the look in
 * EnergyBattery.css and styles/glas/energy.css.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Battery, Zap } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { batteryStatus, combinedSoc, combinedSocSeries, energyBatteryIds, formatNumber, powerWatts } from '@hapulse/core';
import type { BatteryStatus, EnergyBatteryIds, EnergyPreferences, HassEntityMap } from '@hapulse/core';
import { Card } from '../../ui/Card';
import { useEntityStore } from '../../../stores/entityStore';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getHistory } from '../../../ha/history';
import { useLocale, useT, type TKey } from '../../../i18n/useT';
import { CardHead } from './EnergyOrigin';
import './EnergyNow.css';
import './EnergyBattery.css';

const STEP = 5 * 60_000;
const RELOAD = 5 * 60_000;
const CHART_H = 96;
const AXIS_W = 44;

export const BATTERY_STATE_KEY: Record<string, TKey> = {
  charging: 'energy.battery.charging',
  discharging: 'energy.battery.discharging',
  full: 'energy.battery.full',
  idle: 'energy.battery.idle',
};

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

function Ring({ value, size, stroke }: { value: number; size: number; stroke: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const m = size / 2;
  const p = Math.max(0, Math.min(100, value));
  return (
    <svg className="en-bat__ring-svg" width={size} height={size} aria-hidden="true">
      <circle className="en-bat__ring-track" cx={m} cy={m} r={r} fill="none" strokeWidth={stroke} />
      {p > 0 && (
        <circle
          className="en-bat__ring-fill"
          cx={m}
          cy={m}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * p) / 100} ${c}`}
          transform={`rotate(-90 ${m} ${m})`}
        />
      )}
    </svg>
  );
}

/** The battery's ring for other places (the overview's battery line). */
export function BatteryRing({ value, size = 20, stroke = 3 }: { value: number; size?: number; stroke?: number }) {
  return <Ring value={value} size={size} stroke={stroke} />;
}

function SocChart({ points, nowSoc, now }: { points: { t: number; v: number }[]; nowSoc: number | null; now: number }) {
  const t = useT();
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const read = () => setWidth(el.clientWidth);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [start, end] = dayBounds(new Date(now));
  // today only: after midnight the last load is yesterday's until the next one
  const today = points.filter((p) => p.t >= start && p.t < now);
  const all = nowSoc === null ? today : [...today, { t: now, v: nowSoc }];
  const cw = Math.max(0, width - AXIS_W);
  const x = (ms: number) => ((ms - start) / (end - start)) * cw;
  const y = (v: number) => CHART_H - (Math.max(0, Math.min(100, v)) / 100) * CHART_H;
  const pct = (v: number) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(v / 100);
  const hour = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
  const day = new Date(start);
  const ticks = [0, 6, 12, 18].map((h) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h).getTime());
  const last = all[all.length - 1];
  const line = all.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`);
  const label = last ? t('energy.battery.chartAria', { value: pct(last.v) }) : t('energy.battery.noData');
  return (
    <div ref={box} className="en-bat__chart" role="img" aria-label={label}>
      {width > AXIS_W && (
        <svg width={width} height={CHART_H + 22} aria-hidden="true">
          {[0, 50, 100].map((p) => (
            <g key={p}>
              <line className={p ? 'en-bat__rule' : 'en-bat__rule en-bat__rule--base'} x1={0} x2={cw} y1={y(p)} y2={y(p)} />
              {p > 0 && (
                <text className="en-bat__tick" x={cw + 6} y={y(p) + 4}>
                  {pct(p)}
                </text>
              )}
            </g>
          ))}
          {last && line.length > 1 && (
            <>
              <path className="en-bat__area" d={`M${x(all[0]!.t)},${CHART_H}L${line.join('L')}L${x(last.t)},${CHART_H}Z`} />
              <path className="en-bat__line" d={`M${line.join('L')}`} />
            </>
          )}
          {last && x(last.t) + 4 < cw && (
            <line className="en-bat__rest" x1={x(last.t) + 4} x2={cw} y1={CHART_H - 1.5} y2={CHART_H - 1.5} />
          )}
          {last && <circle className="en-bat__dot" cx={x(last.t)} cy={y(last.v)} r={4} />}
          {ticks.map((ms) => (
            <text key={ms} className="en-bat__tick" x={x(ms)} y={CHART_H + 18}>
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
  /** combined charge (%), null when a battery's charge is unknown */
  soc: number | null;
  status: BatteryStatus | null;
  /** the state word is certain: there is power to tell it, or the battery is full */
  showState: boolean;
}

/**
 * The batteries right now from Home Assistant's energy settings; null without a charge sensor that is an entity (an
 * external statistic has none), as the energy page decides (sections.ts).
 */
export function useBatteryNow(prefs: EnergyPreferences | null): BatteryNow | null {
  const ids = useMemo(() => energyBatteryIds(prefs), [prefs]);
  const all = useMemo(() => (ids ? [...ids.soc, ...ids.power] : []), [ids]);
  const states = useEntityStore(useShallow((s) => all.map((id) => s.entities[id])));
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
  const status = soc === null ? null : batteryStatus(soc, power, capacity, now);
  // without a power sensor only "full" is certain; the card does not claim "idle"
  const showState = !!status && (power !== null || status.state === 'full');
  return { ids, soc, status, showState };
}

/** The card "Battery"; renders nothing without a charge sensor in Home Assistant's energy settings. */
export function EnergyBatteryCard({ prefs }: { prefs: EnergyPreferences | null }) {
  const t = useT();
  const locale = useLocale();
  const battery = useBatteryNow(prefs);
  const series = useSocToday(battery?.ids.soc ?? [], battery?.ids.capacities ?? null);
  if (!battery) return null;
  const { soc, status, showState } = battery;
  const now = new Date();
  const time = (ms: number) => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(ms);

  return (
    <Card className="energy-battery en-card en-card--battery">
      <CardHead icon={<Battery size={16} strokeWidth={1.75} />} title={t('energy.battery.title')} />
      <div className="en-bat__head">
        <div className="en-bat__ring">
          <Ring value={soc ?? 0} size={64} stroke={7} />
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
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <p className="en-bat__label">{t('energy.battery.today')}</p>
      <SocChart points={series ?? []} nowSoc={soc} now={now.getTime()} />
    </Card>
  );
}
