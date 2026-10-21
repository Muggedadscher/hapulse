/**
 * [fork] The energy page's card "Now" after draft v5 (plan glas/energie-neu/umsetzung/PLAN.md): one sentence on what
 * happens right now and the flow below it — on the left where the power comes from (solar, battery, grid), on the
 * right where it goes (home, battery, grid); a band's width is its power. The scale stays fixed for the session until
 * a new highest total (a cloud does not make the bands jump), with a minimum width so small flows stay visible. Every
 * node says its name, its power and what it does. The power comes from the `stat_rate` sensors of Home Assistant's
 * energy settings (core `energyPowerIds`, `energyPowerNow`), read only here (a narrow store selector). Both styles; the
 * look in EnergyNow.css and styles/glas/energy.css.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Battery, Gauge, House, Sun, UtilityPole } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { energyNowSentence, energyPowerIds, energyPowerNow, formatNumber, POWER_FLOW_MIN } from '@hapulse/core';
import type { EnergyAllocation, EnergyPreferences, HassEntityMap } from '@hapulse/core';
import { Card } from '../../ui/Card';
import { useEntityStore } from '../../../stores/entityStore';
import { useLocale, useT, type TKey } from '../../../i18n/useT';
import { CardHead } from './EnergyOrigin';
import './EnergyNow.css';

type Source = 'solar' | 'battery' | 'grid';
type Sink = 'home' | 'battery' | 'grid';

interface Link {
  from: Source;
  to: Sink;
  /** W */
  w: number;
}

/** The flows of `allocateEnergy` as links, the small ones left out. */
export function nowLinks(f: EnergyAllocation): Link[] {
  const all: Link[] = [
    { from: 'solar', to: 'home', w: f.solarHome },
    { from: 'solar', to: 'battery', w: f.solarBattery },
    { from: 'solar', to: 'grid', w: f.solarGrid },
    { from: 'battery', to: 'home', w: f.batteryHome },
    { from: 'battery', to: 'grid', w: f.batteryGrid },
    { from: 'grid', to: 'home', w: f.gridHome },
    { from: 'grid', to: 'battery', w: f.gridBattery },
  ];
  return all.filter((l) => l.w >= POWER_FLOW_MIN);
}

const LEFT: Source[] = ['solar', 'battery', 'grid'];
const RIGHT: Sink[] = ['home', 'battery', 'grid'];
const LABEL_H = 58;
const GAP = 10;
const BAR_W = 8;
const LABEL_W = 84;
const PAD = 8;
/** below this the bands would be too short to read: the nodes as two columns of text instead */
const MIN_FLOW_W = 2 * (LABEL_W + PAD + BAR_W) + 60;
/** px per kW at most (the draft's scale), and the least a band gets */
const MAX_K = 56;
const MIN_BAND = 4;

/** The highest total seen today (W): the scale only grows during a day and starts afresh the next. */
const peak = { day: '', max: 0 };
function dayPeak(total: number): number {
  const d = new Date();
  const day = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  if (peak.day !== day) {
    peak.day = day;
    peak.max = 0;
  }
  if (total > peak.max) peak.max = total;
  return peak.max;
}

interface Node {
  key: Source | Sink;
  side: 'l' | 'r';
  w: number;
  h: number;
  top: number;
}

interface Band {
  from: Source;
  to: Sink;
  ya: number;
  yb: number;
  h: number;
}

/** Nodes and bands for a flow box `width` × `height`. Pure. */
export function nowLayout(links: Link[], width: number, height: number, maxTotal: number) {
  const total = links.reduce((s, l) => s + l.w, 0);
  let k = Math.min(MAX_K / 1000, (height - 70) / Math.max(maxTotal, total, 1));
  // every node takes at least its label's height: smaller bands until both sides fit the box
  const need = (keys: (Source | Sink)[], pick: (l: Link) => Source | Sink) => {
    const used = keys
      .map((key) => links.filter((l) => pick(l) === key).reduce((a, l) => a + Math.max(l.w * k, MIN_BAND), 0))
      .filter((h) => h > 0);
    return used.reduce((a, h) => a + Math.max(h, LABEL_H), 0) + GAP * Math.max(0, used.length - 1);
  };
  for (let i = 0; i < 40 && Math.max(need(LEFT, (l) => l.from), need(RIGHT, (l) => l.to)) > height; i++) k *= 0.9;
  const bandH = (w: number) => Math.max(w * k, MIN_BAND);
  const side = <K extends Source | Sink>(keys: K[], pick: (l: Link) => K, s: 'l' | 'r'): Node[] => {
    const nodes = keys
      .map((key) => {
        const mine = links.filter((l) => pick(l) === key);
        return { key, side: s, w: mine.reduce((a, l) => a + l.w, 0), h: mine.reduce((a, l) => a + bandH(l.w), 0), top: 0 };
      })
      .filter((n) => n.w > 0);
    const slots = nodes.map((n) => Math.max(n.h, LABEL_H));
    let y = (height - (slots.reduce((a, b) => a + b, 0) + GAP * (nodes.length - 1))) / 2;
    nodes.forEach((n, i) => {
      n.top = y + (slots[i]! - n.h) / 2;
      y += slots[i]! + GAP;
    });
    return nodes;
  };
  const left = side(LEFT, (l) => l.from, 'l');
  const right = side(RIGHT, (l) => l.to, 'r');
  const cur = new Map<string, number>([...left, ...right].map((n) => [`${n.side}${n.key}`, n.top]));
  const sorted = [...links].sort(
    (a, b) => LEFT.indexOf(a.from) - LEFT.indexOf(b.from) || RIGHT.indexOf(a.to) - RIGHT.indexOf(b.to),
  );
  const bands: Band[] = sorted.map((l) => {
    const h = bandH(l.w);
    const ya = cur.get(`l${l.from}`)!;
    const yb = cur.get(`r${l.to}`)!;
    cur.set(`l${l.from}`, ya + h);
    cur.set(`r${l.to}`, yb + h);
    return { from: l.from, to: l.to, ya, yb, h };
  });
  const xL = LABEL_W + PAD;
  const xR = width - LABEL_W - PAD - BAR_W;
  return { left, right, bands, xL, xR };
}

/** The clock in the title: re-renders at each new minute. */
function useMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer = 0;
    const arm = () => {
      timer = window.setTimeout(() => {
        setNow(new Date());
        arm();
      }, 60_000 - (Date.now() % 60_000) + 50);
    };
    arm();
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

const ICON: Record<Source | Sink, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  solar: Sun,
  battery: Battery,
  grid: UtilityPole,
  home: House,
};

const NAME_KEY: Record<Source | Sink, TKey> = {
  solar: 'energy.now.solar',
  battery: 'energy.now.battery',
  grid: 'energy.now.grid',
  home: 'energy.now.home',
};

const DOES_KEY: Record<string, TKey> = {
  'l:solar': 'energy.now.produces',
  'l:battery': 'energy.now.discharges',
  'l:grid': 'energy.now.imports',
  'r:home': 'energy.now.uses',
  'r:battery': 'energy.now.charges',
  'r:grid': 'energy.now.exports',
};

function Flow({ links }: { links: Link[] }) {
  const t = useT();
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const total = links.reduce((s, l) => s + l.w, 0);
  const maxTotal = dayPeak(total);
  const kw = (w: number) => `${formatNumber(w / 1000, locale, { minDecimals: 1, maxDecimals: 1 })} kW`;
  const ids = `en-now${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  let body: React.ReactNode = null;
  const node = (side: 'l' | 'r', key: Source | Sink, w: number, style?: React.CSSProperties) => {
    const Icon = ICON[key];
    return (
      <div key={`${side}${key}`} className={`en-now__node en-now__node--${side}`} style={style}>
        <span className={`en-now__name en-now__name--${key}`}>
          <Icon size={15} strokeWidth={2} />
          {t(NAME_KEY[key])}
        </span>
        <span className="en-now__kw">{kw(w)}</span>
        <span className="en-now__does">{t(DOES_KEY[`${side}:${key}`]!)}</span>
      </div>
    );
  };
  if (size && size.w < MIN_FLOW_W) {
    const sum = (key: Source | Sink, pick: (l: Link) => Source | Sink) =>
      links.filter((l) => pick(l) === key).reduce((a, l) => a + l.w, 0);
    body = (
      <div className="en-now__compact">
        <div className="en-now__col">
          {LEFT.filter((k) => sum(k, (l) => l.from) > 0).map((k) => node('l', k, sum(k, (l) => l.from)))}
        </div>
        <div className="en-now__col">
          {RIGHT.filter((k) => sum(k, (l) => l.to) > 0).map((k) => node('r', k, sum(k, (l) => l.to)))}
        </div>
      </div>
    );
  } else if (size) {
    const { left, right, bands, xL, xR } = nowLayout(links, size.w, size.h, maxTotal);
    const x0 = xL + BAR_W;
    const x1 = xR;
    const mx = (x0 + x1) / 2;
    const curve = (y0: number, y1: number) => `C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
    // the home's column takes the colours of what flows into it
    const into = (key: Sink) => bands.filter((b) => b.to === key);
    body = (
      <>
        <svg className="en-now__svg" width={size.w} height={size.h} aria-hidden="true">
          <defs>
            {bands.map((b, i) => (
              <linearGradient key={i} id={`${ids}-${i}`} gradientUnits="userSpaceOnUse" x1={x0} x2={x1} y1={0} y2={0}>
                <stop offset="0" className={`en-now__stop--${b.from}`} />
                <stop offset="1" className={`en-now__stop--${b.to === 'home' ? b.from : b.to}`} />
              </linearGradient>
            ))}
          </defs>
          {bands.map((b, i) => (
            <path
              key={i}
              className="en-now__band"
              d={`M${x0},${b.ya}${curve(b.ya, b.yb)}V${b.yb + b.h}C${mx},${b.yb + b.h} ${mx},${b.ya + b.h} ${x0},${b.ya + b.h}Z`}
              fill={`url(#${ids}-${i})`}
            />
          ))}
          {left.map((n) => (
            <rect key={`l${n.key}`} className={`en-now__bar en-now__bar--${n.key}`} x={xL} y={n.top} width={BAR_W} height={n.h} rx={Math.min(4, n.h / 2)} />
          ))}
          {right.map((n) =>
            n.key === 'home' ? (
              <g key="rhome">
                {into('home').map((b, i) => (
                  <rect key={i} className={`en-now__bar en-now__bar--${b.from}`} x={xR} y={b.yb} width={BAR_W} height={b.h} />
                ))}
              </g>
            ) : (
              <rect key={`r${n.key}`} className={`en-now__bar en-now__bar--${n.key}`} x={xR} y={n.top} width={BAR_W} height={n.h} rx={Math.min(4, n.h / 2)} />
            ),
          )}
        </svg>
        {[...left, ...right].map((n) =>
          node(
            n.side,
            n.key,
            n.w,
            n.side === 'l'
              ? { right: size.w - xL + PAD, top: n.top + n.h / 2 - LABEL_H / 2 }
              : { left: xR + BAR_W + PAD, top: n.top + n.h / 2 - LABEL_H / 2 },
          ),
        )}
      </>
    );
  }
  return (
    <div ref={box} className="en-now__flow">
      {body}
    </div>
  );
}

/** The card "Now"; renders nothing without power sensors in Home Assistant's energy settings. */
export function EnergyNowCard({ prefs }: { prefs: EnergyPreferences | null }) {
  const t = useT();
  const locale = useLocale();
  const ids = useMemo(() => energyPowerIds(prefs), [prefs]);
  const all = useMemo(() => (ids ? [...ids.solar, ...ids.grid, ...ids.battery] : []), [ids]);
  const states = useEntityStore(useShallow((s) => all.map((id) => s.entities[id])));
  const now = useMinute();
  if (!ids) return null;
  const map: HassEntityMap = {};
  all.forEach((id, i) => {
    const e = states[i];
    if (e) map[id] = e;
  });
  const power = energyPowerNow(ids, map);
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(now);
  const links = power ? nowLinks(power.flows) : [];
  const total = links.reduce((s, l) => s + l.w, 0);
  const sentence = power ? energyNowSentence(power.flows) : null;
  const label = links
    .map((l) => t('energy.now.linkAria', { from: t(NAME_KEY[l.from]), to: t(NAME_KEY[l.to]), value: formatNumber(l.w / 1000, locale, { minDecimals: 1, maxDecimals: 1 }) }))
    .join('; ');
  return (
    <Card className="energy-now en-card en-card--now">
      <CardHead icon={<Gauge size={16} strokeWidth={1.75} />} title={t('energy.now.title')} scope={time} />
      {!power ? (
        <p className="energy-empty">{t('energy.now.unavailable')}</p>
      ) : (
        <>
          <p className="en-now__say">{t(`energy.now.say.${sentence}` as TKey)}</p>
          {total > 0 && (
            <div role="img" aria-label={label} className="en-now__wrap">
              <Flow links={links} />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
