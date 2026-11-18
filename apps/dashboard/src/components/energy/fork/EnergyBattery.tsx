/**
 * [fork] The energy page's card "Battery" after draft v5 (plan glas/energie-neu/umsetzung/PLAN.md): how full the home
 * battery is (ring and figure), what it does right now (charging, with "full at about" when every capacity is known;
 * discharging, full, idle, not reachable) and its charge today. Everything comes from Home Assistant's energy settings
 * (`stat_soc`, `stat_rate`, `capacity` per battery; core `energyBatteryIds`); several batteries count as one, weighted by
 * capacity (core `combinedSoc`). With one battery of a known integration also its charge limit, reserve and mode
 * (plan PLAN-E4-AKKU.md, core `findBatteryDetails` over the entity registry): "full" at the limit, "reserve reached",
 * "lasts until about", a line under the state and the reserve in the chart. The charge and power are read only here
 * (narrow store selectors). Both styles; the look in EnergyBattery.css and styles/glas/energy.css.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Battery, ChevronRight, Zap } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { batteryDetails, batteryStatus, combinedSoc, combinedSocSeries, energyBatteryIds, findBatteryDetails, formatNumber, powerWatts } from '@hapulse/core';
import type { BatteryDetails, BatteryState, BatteryStatus, EnergyBatteryIds, EnergyPreferences, HassEntityMap } from '@hapulse/core';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
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
/** [fork] with a reserve: room for its word in the axis column, and a regular label closer than this (points) is left out */
const AXIS_W_RESERVE = 54;
const RESERVE_TICK_GAP = 12;

export const BATTERY_STATE_KEY: Record<BatteryState, TKey> = {
  charging: 'energy.battery.charging',
  discharging: 'energy.battery.discharging',
  full: 'energy.battery.full',
  reserve: 'energy.battery.reserve',
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

function SocChart({ points, nowSoc, now, reserve }: { points: { t: number; v: number }[]; nowSoc: number | null; now: number; reserve: number | null }) {
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
  // the reserve's label sits in the axis column, which needs a little more room for the word
  const axisW = reserve === null ? AXIS_W : AXIS_W_RESERVE;
  const cw = Math.max(0, width - axisW);
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
      {width > axisW && (
        <svg width={width} height={CHART_H + 22} aria-hidden="true">
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
  /** charge limit, reserve and mode of the one battery, each null when unknown */
  details: BatteryDetails;
  /** combined charge (%), null when a battery's charge is unknown */
  soc: number | null;
  status: BatteryStatus | null;
  /** the state word is certain: there is power to tell it, or the battery is full or at its reserve */
  showState: boolean;
}

/**
 * The batteries right now from Home Assistant's energy settings; null without a charge sensor that is an entity (an
 * external statistic has none), as the energy page decides (sections.ts).
 */
export function useBatteryNow(prefs: EnergyPreferences | null): BatteryNow | null {
  const ids = useMemo(() => energyBatteryIds(prefs), [prefs]);
  const registries = useEntityStore((s) => s.registries);
  const detailIds = useMemo(() => findBatteryDetails(registries, ids?.soc, ids?.power), [registries, ids]);
  const extra = useMemo(() => (detailIds ? [detailIds.chargeLimit, detailIds.reserve, detailIds.mode].filter((id): id is string => !!id) : []), [detailIds]);
  const all = useMemo(() => (ids ? [...ids.soc, ...ids.power, ...extra] : []), [ids, extra]);
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
  const details = batteryDetails(detailIds, map);
  const status = soc === null ? null : batteryStatus(soc, power, capacity, now, { full: details.chargeLimit, reserve: details.reserve });
  // without a power sensor only "full" and "reserve reached" are certain; the card does not claim "idle"
  const showState = !!status && (power !== null || status.state === 'full' || status.state === 'reserve');
  return { ids, details, soc, status, showState };
}

/** The card "Battery"; renders nothing without a charge sensor in Home Assistant's energy settings. */
export function EnergyBatteryCard({ prefs }: { prefs: EnergyPreferences | null }) {
  const t = useT();
  const locale = useLocale();
  const battery = useBatteryNow(prefs);
  const series = useSocToday(battery?.ids.soc ?? [], battery?.ids.capacities ?? null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  if (!battery) return null;
  const { soc, status, showState, details } = battery;
  const now = new Date();
  const time = (ms: number) => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(ms);
  const pct = (v: number) => `${formatNumber(v, locale, { maxDecimals: 0 })} %`;
  const mode = details.mode
    ? details.mode.key === 'auto'
      ? t('energy.battery.modeAuto')
      : details.mode.key === 'manual'
        ? t('energy.battery.modeManual')
        : details.mode.raw
    : null;
  const hasDetails = mode !== null || details.chargeLimit !== null || details.reserve !== null;
  const modeHint =
    details.mode?.key === 'auto' ? t('energy.battery.hintModeAuto') : details.mode?.key === 'manual' ? t('energy.battery.hintModeManual') : null;
  const rows: { key: string; label: string; value: string; hint: string | null }[] = [];
  if (mode !== null) rows.push({ key: 'mode', label: t('energy.battery.rowMode'), value: mode, hint: modeHint });
  if (details.chargeLimit !== null) {
    rows.push({ key: 'limit', label: t('energy.battery.rowChargeLimit'), value: pct(details.chargeLimit), hint: t('energy.battery.hintChargeLimit') });
  }
  if (details.reserve !== null) {
    rows.push({ key: 'reserve', label: t('energy.battery.rowReserve'), value: pct(details.reserve), hint: t('energy.battery.hintReserve') });
  }

  return (
    <Card className="energy-battery en-card en-card--battery">
      <CardHead
        icon={<Battery size={16} strokeWidth={1.75} />}
        title={t('energy.battery.title')}
        action={
          hasDetails ? (
            <button type="button" className="en-bat__more" aria-label={t('energy.battery.detailsAria')} onClick={() => setDetailsOpen(true)}>
              {t('energy.battery.details')}
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          ) : undefined
        }
      />
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
                  {status.until !== null && <> · {t('energy.battery.lastsUntil', { time: time(status.until) })}</>}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <p className="en-bat__label">{t('energy.battery.today')}</p>
      <SocChart points={series ?? []} nowSoc={soc} now={now.getTime()} reserve={details.reserve} />
      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={t('energy.battery.title')}
        icon={<Battery size={18} strokeWidth={1.75} />}
      >
        <div className="en-bat-details">
          <ul className="en-bat-details__list">
            {rows.map((r) => (
              <li key={r.key} className="en-bat-details__row">
                <div className="en-bat-details__line">
                  <span className="en-bat-details__label">{r.label}</span>
                  <span className="en-bat-details__value">{r.value}</span>
                </div>
                {r.hint && <p className="en-bat-details__sub">{r.hint}</p>}
              </li>
            ))}
          </ul>
          <p className="en-bat-details__hint">{t('energy.battery.detailsHint')}</p>
        </div>
      </Modal>
    </Card>
  );
}
