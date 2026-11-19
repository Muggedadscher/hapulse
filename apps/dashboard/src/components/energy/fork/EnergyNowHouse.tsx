/**
 * [fork] The card "Now" in Glas: the house model (rules and geometry in energyHouse.ts). A matte model, lit from the
 * top left, colour only where power flows; the battery's slot shows its charge without a figure (the percentage is the
 * card "Battery"'s). Four labels in the corners (name, power, what it does), idle ones dimmed. Objects of sources that
 * are not configured are left out. Below HOUSE_MIN_W the host's compact text form (`fallback`). The look only in
 * styles/glas/energy.css (colours `--g-house-*`, wires `--g-chart-*`); this file renders only in Glas.
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import { Battery, House, Sun, UtilityPole } from 'lucide-react';
import { formatNumber } from '@hapulse/core';
import { useLocale, useT, type TKey } from '../../../i18n/useT';
import {
  BATTERY,
  HOUSE,
  HOUSE_MIN_W,
  MAST,
  PLATE,
  WIRE_BATTERY,
  WIRE_GRID,
  houseNodes,
  houseScale,
  houseWires,
  iso,
  pointAlong,
  roundRoute,
  type HouseKey,
  type HouseLink,
  type HouseNode,
  type HouseView,
  type Wire,
} from './energyHouse';

type P3 = [number, number, number];

const ICON: Record<HouseKey, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  solar: Sun,
  battery: Battery,
  grid: UtilityPole,
  home: House,
};
const NAME_KEY: Record<HouseKey, TKey> = {
  solar: 'energy.now.solar',
  battery: 'energy.now.battery',
  grid: 'energy.now.grid',
  home: 'energy.now.home',
};
const CORNER: Record<HouseKey, string> = { solar: 'tl', grid: 'tr', battery: 'bl', home: 'br' };

const f1 = (n: number) => n.toFixed(1);

/** The plate's outline: a rounded square (9 points per corner). */
function plateOutline(): [number, number][] {
  const { R } = PLATE;
  const out: [number, number][] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 8; i++) {
      const a = a0 + (i / 8) * (Math.PI / 2);
      out.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
    }
  };
  corner(100 - R, R, -Math.PI / 2);
  corner(100 - R, 100 - R, 0);
  corner(R, 100 - R, Math.PI / 2);
  corner(R, R, Math.PI);
  return out;
}
const PLATE_OUTLINE = plateOutline();

/** The moving dots of the active wires: a layer of its own above the still scene (no filters under it repaint). */
export function wireDots(v: HouseView, wires: { battery: Wire; grid: Wire }, hasBattery: boolean) {
  const out: { key: string; d: string; toHouse: boolean; width: number }[] = [];
  const add = (key: string, route: [number, number][], wire: Wire) => {
    if (!wire.color) return;
    const sp = roundRoute(route).map(([x, y]) => iso(v, x, y, 0));
    out.push({ key, d: `M${sp.map(([x, y]) => `${f1(x)},${f1(y)}`).join('L')}`, toHouse: wire.toHouse, width: 1.5 * v.k });
  };
  if (hasBattery) add('battery', WIRE_BATTERY, wires.battery);
  add('grid', WIRE_GRID, wires.grid);
  return out;
}

function Scene({
  v,
  w,
  h,
  nodes,
  wires,
  hasSolar,
  hasBattery,
  soc,
}: {
  v: HouseView;
  w: number;
  h: number;
  nodes: Record<HouseKey, HouseNode>;
  wires: { battery: Wire; grid: Wire };
  hasSolar: boolean;
  hasBattery: boolean;
  soc: number | null;
}) {
  const uid = `g-house${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { k } = v;
  const P = (x: number, y: number, z = 0) => iso(v, x, y, z);
  const pts = (list: P3[]) => list.map(([x, y, z]) => P(x, y, z).map(f1).join(',')).join(' ');
  const outline = (z: number, dy = 0) =>
    PLATE_OUTLINE.map(([x, y]) => {
      const [a, b] = P(x, y, z);
      return `${f1(a)},${f1(b + dy)}`;
    }).join(' ');
  const d = (sp: [number, number][]) => `M${sp.map(([x, y]) => `${f1(x)},${f1(y)}`).join('L')}`;

  const groove = (key: 'battery' | 'grid', route: [number, number][], wire: Wire) => {
    const sp = route.map(([x, y]) => P(x, y, 0));
    const path = d(sp);
    const head = (f: number) => pointAlong(sp, wire.toHouse ? f : 1 - f);
    return (
      <g key={key} className={`g-house__wire-${key}`}>
        <path className="g-house__groove-hi" d={path} transform={`translate(0,${f1(0.8 * k)})`} strokeWidth={4.6 * k} />
        <path className="g-house__groove" d={path} strokeWidth={4.6 * k} />
        {wire.color && (
          <>
            {wire.color !== 'grid' && (
              <path className={`g-house__glow g-house__line--${wire.color}`} d={path} strokeWidth={3.4 * k} filter={`url(#${uid}gw)`} />
            )}
            <path className={`g-house__wire g-house__line--${wire.color}`} d={path} strokeWidth={2.9 * k} />
            <g className="g-house__still">
              {[0.3, 0.55, 0.8].map((f, i) => {
                const [x, y] = head(f);
                return <circle key={f} cx={f1(x)} cy={f1(y)} r={f1(0.75 * k)} opacity={[0.45, 0.7, 1][i]} />;
              })}
            </g>
          </>
        )}
      </g>
    );
  };

  // house
  const { X0, X1, Y0, Y1, HW, HR, YM, O, OB, TH } = HOUSE;
  const ZE = HW - (O * (HR - HW)) / (Y1 - YM);
  const ZB = HW - (OB * (HR - HW)) / (YM - Y0);
  const up = (p: P3): P3 => [p[0], p[1], p[2] + TH];
  const ridgeA: P3 = [X0 - O, YM, HR];
  const ridgeB: P3 = [X1 + O, YM, HR];
  const backA: P3 = [X0 - O, Y0 - OB, ZB];
  const backB: P3 = [X1 + O, Y0 - OB, ZB];
  const frontA: P3 = [X0 - O, Y1 + O, ZE];
  const frontB: P3 = [X1 + O, Y1 + O, ZE];
  const door: P3[] = (() => {
    const dy0 = 49;
    const dy1 = 56;
    const dz = 13;
    const rr = (dy1 - dy0) / 2;
    const out: P3[] = [[X1 + 0.05, dy0, 0]];
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI - (i / 10) * Math.PI;
      out.push([X1 + 0.05, (dy0 + dy1) / 2 + Math.cos(a) * rr, dz + Math.sin(a) * rr * 0.9]);
    }
    out.push([X1 + 0.05, dy1, 0]);
    return out;
  })();
  const win = (x0: number, x1: number): P3[] => [
    [x0, Y1 + 0.05, 9],
    [x1, Y1 + 0.05, 9],
    [x1, Y1 + 0.05, 17],
    [x0, Y1 + 0.05, 17],
  ];

  // panels: 2 × 4 on the front roof face (bilinear on the face)
  const onRoof = (u: number, t: number): P3 => {
    const a = up(ridgeA);
    const b = up(ridgeB);
    const e = up(frontA);
    return [a[0] + (b[0] - a[0]) * u, a[1] + (e[1] - a[1]) * t, a[2] + (e[2] - a[2]) * t + 0.05];
  };
  const lit = nodes.solar.active;
  const panels: React.ReactNode[] = [];
  if (hasSolar) {
    const ROWS = 2;
    const COLS = 4;
    const gu = 0.02;
    const gv = 0.05;
    const [u0, u1, v0, v1] = [0.07, 0.93, 0.1, 0.9];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const ua = u0 + ((u1 - u0) * c) / COLS + (c ? gu / 2 : 0);
        const ub = u0 + ((u1 - u0) * (c + 1)) / COLS - (c < COLS - 1 ? gu / 2 : 0);
        const va = v0 + ((v1 - v0) * r) / ROWS + (r ? gv / 2 : 0);
        const vb = v0 + ((v1 - v0) * (r + 1)) / ROWS - (r < ROWS - 1 ? gv / 2 : 0);
        const line = (p: P3, q: P3, i: number) => {
          const [a1, b1] = P(...p);
          const [a2, b2] = P(...q);
          return <path key={i} d={`M${f1(a1)},${f1(b1)}L${f1(a2)},${f1(b2)}`} />;
        };
        const cells: React.ReactNode[] = [];
        for (let j = 1; j < 3; j++) {
          const t = va + ((vb - va) * j) / 3;
          cells.push(line(onRoof(ua, t), onRoof(ub, t), j));
          const u = ua + ((ub - ua) * j) / 3;
          cells.push(line(onRoof(u, va), onRoof(u, vb), j + 10));
        }
        panels.push(
          <g key={`${r}${c}`}>
            <polygon
              className={lit ? 'g-house__panel g-house__panel--lit' : 'g-house__panel'}
              points={pts([onRoof(ua, va), onRoof(ub, va), onRoof(ub, vb), onRoof(ua, vb)])}
              fill={`url(#${uid}${lit ? 'pvy' : 'pv'})`}
            />
            <g className={lit ? 'g-house__cells g-house__cells--lit' : 'g-house__cells'}>{cells}</g>
            <polygon className="g-house__sheen" points={pts([onRoof(ua, va), onRoof(ua + (ub - ua) * 0.5, va), onRoof(ua, va + (vb - va) * 0.55)])} />
          </g>,
        );
      }
  }

  // battery: a soft cylinder, in front a slot with the charge
  let battery: React.ReactNode = null;
  if (hasBattery) {
    const { BX, BY, BR, BH } = BATTERY;
    const rx = BR * 1.2247 * k;
    const ry = BR * 0.7071 * k;
    const [cx, yb] = P(BX, BY, 0);
    const [, yt] = P(BX, BY, BH);
    const sw = 2.6 * k;
    const s0 = yt + ry + 2.4 * k;
    const s1 = yb + ry - 3.2 * k;
    const sh = s1 - s0;
    const fh = soc === null ? 0 : (sh * Math.min(100, Math.max(0, soc))) / 100;
    battery = (
      <g className="g-house__battery">
        <path
          d={`M${f1(cx - rx)},${f1(yt)}L${f1(cx - rx)},${f1(yb)}A${f1(rx)},${f1(ry)} 0 0 0 ${f1(cx + rx)},${f1(yb)}L${f1(cx + rx)},${f1(yt)}Z`}
          fill={`url(#${uid}bt)`}
        />
        <ellipse className="g-house__battery-top" cx={f1(cx)} cy={f1(yt)} rx={f1(rx)} ry={f1(ry)} />
        <rect className="g-house__slot" x={f1(cx - sw / 2)} y={f1(s0)} width={f1(sw)} height={f1(sh)} rx={f1(sw / 2)} />
        {fh > 0 && nodes.battery.active && (
          <rect className="g-house__soc g-house__soc--glow" x={f1(cx - sw / 2)} y={f1(s1 - fh)} width={f1(sw)} height={f1(fh)} rx={f1(sw / 2)} filter={`url(#${uid}gw)`} />
        )}
        {fh > 0 && (
          <rect className="g-house__soc" x={f1(cx - sw / 2)} y={f1(s1 - Math.max(fh, sw))} width={f1(sw)} height={f1(Math.max(fh, sw))} rx={f1(sw / 2)} />
        )}
      </g>
    );
  }

  // mast (behind on the right, drawn before the house)
  const mast = (() => {
    const { MX, MY, MH } = MAST;
    const [bx, by] = P(MX, MY, 0);
    const [tx, ty] = P(MX, MY, MH);
    const mw = 1.5 * k;
    const arm = (z: number, half: number) => {
      const [a1, b1] = P(MX - half, MY, z);
      const [a2, b2] = P(MX + half, MY, z);
      return (
        <g key={z}>
          <path className="g-house__arm" d={`M${f1(a1)},${f1(b1)}L${f1(a2)},${f1(b2)}`} strokeWidth={1.3 * k} />
          <circle className="g-house__knob" cx={f1(a1)} cy={f1(b1 - 1.2 * k)} r={f1(0.9 * k)} />
          <circle className="g-house__knob" cx={f1(a2)} cy={f1(b2 - 1.2 * k)} r={f1(0.9 * k)} />
        </g>
      );
    };
    return (
      <g className="g-house__mast">
        <path d={`M${f1(bx - mw)},${f1(by)}L${f1(tx - mw * 0.7)},${f1(ty)}L${f1(tx + mw * 0.7)},${f1(ty)}L${f1(bx + mw)},${f1(by)}Z`} fill={`url(#${uid}ms)`} />
        {arm(MH - 4, 7)}
        {arm(MH - 10, 5)}
      </g>
    );
  })();

  const grad = (id: string, x2: number, y2: number, stops: [number, string][]) => (
    <linearGradient id={`${uid}${id}`} x1="0" y1="0" x2={x2} y2={y2}>
      {stops.map(([o, c]) => (
        <stop key={o} offset={o} className={`g-house__stop--${c}`} />
      ))}
    </linearGradient>
  );
  const shadowAt = (x: number, y: number, rx: number, ry: number) => {
    const [cx, cy] = P(x, y, 0);
    return <ellipse className="g-house__shadow" cx={f1(cx)} cy={f1(cy)} rx={f1(rx * k)} ry={f1(ry * k)} filter={`url(#${uid}cs)`} />;
  };

  return (
    <svg className="g-house__svg" width={w} height={h} aria-hidden="true">
      <defs>
        {grad('pt', 0, 1, [[0, 'plate1'], [1, 'plate2']])}
        {grad('wl', 0, 1, [[0, 'wall-light1'], [1, 'wall-light2']])}
        {grad('wr', 0, 1, [[0, 'wall-shade1'], [1, 'wall-shade2']])}
        {grad('pv', 1, 1, [[0, 'panel1'], [1, 'panel2']])}
        {grad('pvy', 1, 1, [[0, 'panel-lit1'], [1, 'panel-lit2']])}
        {grad('gl', 1, 1, [[0, 'window1'], [1, 'window2']])}
        {grad('bt', 1, 0, [[0, 'battery1'], [0.45, 'battery1'], [1, 'battery2']])}
        {grad('ms', 1, 0, [[0, 'mast1'], [1, 'mast2']])}
        <filter id={`${uid}sh`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={f1(5 * k)} />
        </filter>
        <filter id={`${uid}cs`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={f1(1.6 * k)} />
        </filter>
        <filter id={`${uid}gw`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={f1(1.4 * k)} />
        </filter>
      </defs>
      <polygon className="g-house__shadow" points={outline(0, (PLATE.T + 7) * k)} filter={`url(#${uid}sh)`} />
      <polygon className="g-house__plate-side" points={outline(-PLATE.T)} />
      <polygon points={outline(0)} fill={`url(#${uid}pt)`} />
      {hasBattery && groove('battery', roundRoute(WIRE_BATTERY), wires.battery)}
      {groove('grid', roundRoute(WIRE_GRID), wires.grid)}
      <polygon
        className="g-house__shadow g-house__shadow--contact"
        points={pts([
          [X0 - 0.5, Y0 - 0.5, 0],
          [X1 + 1.8, Y0 - 0.5, 0],
          [X1 + 1.8, Y1 + 1.8, 0],
          [X0 - 0.5, Y1 + 1.8, 0],
        ])}
        filter={`url(#${uid}cs)`}
      />
      {hasBattery && shadowAt(BATTERY.BX + 1.2, BATTERY.BY + 1.2, BATTERY.BR * 1.2247 + 1, BATTERY.BR * 0.7071 + 0.8)}
      {shadowAt(MAST.MX + 0.8, MAST.MY + 0.8, 2.6, 1.5)}
      {mast}
      <polygon points={pts([[X1, Y0, 0], [X1, Y1, 0], [X1, Y1, HW], [X1, YM, HR], [X1, Y0, HW]])} fill={`url(#${uid}wr)`} />
      <polygon points={pts([[X0, Y1, 0], [X1, Y1, 0], [X1, Y1, HW], [X0, Y1, HW]])} fill={`url(#${uid}wl)`} />
      <polygon className="g-house__door" points={pts(door)} />
      <polygon className="g-house__window" points={pts(win(43, 50))} fill={`url(#${uid}gl)`} />
      <polygon className="g-house__window" points={pts(win(64, 71))} fill={`url(#${uid}gl)`} />
      <polygon className="g-house__roof-back" points={pts([up(ridgeA), up(ridgeB), up(backB), up(backA)])} />
      <polygon className="g-house__roof-edge" points={pts([backB, up(backB), up(ridgeB), ridgeB])} />
      <polygon className="g-house__roof-edge" points={pts([ridgeB, up(ridgeB), up(frontB), frontB])} />
      <polygon className="g-house__roof-edge" points={pts([frontA, frontB, up(frontB), up(frontA)])} />
      <polygon className="g-house__roof-top" points={pts([up(ridgeA), up(ridgeB), up(frontB), up(frontA)])} />
      {panels}
      {battery}
    </svg>
  );
}

/** The house with its labels; `fallback` (the compact text form) below HOUSE_MIN_W. */
export function EnergyNowHouse({
  links,
  hasSolar,
  hasBattery,
  soc,
  fallback,
}: {
  links: HouseLink[];
  hasSolar: boolean;
  hasBattery: boolean;
  /** the batteries' charge (%), null = unknown (the slot stays empty) */
  soc: number | null;
  fallback: React.ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    // the dots stand still while the card is off screen (a paint per frame for nobody)
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting));
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);
  const nodes = houseNodes(links);
  const wires = houseWires(links);
  const kw = (w: number) => `${formatNumber(w / 1000, locale, { minDecimals: 1, maxDecimals: 1 })} kW`;
  const does = (n: HouseNode) => t(n.does === 'idle' ? 'energy.battery.idle' : (`energy.now.${n.does}` as TKey));
  const shown = [hasSolar && nodes.solar, nodes.grid, hasBattery && nodes.battery, nodes.home].filter(
    (n): n is HouseNode => !!n,
  );
  // the picture's name: every shown node (idle ones too), as the labels say it
  const aria = shown.map((n) => `${t(NAME_KEY[n.key])} ${kw(n.w)} ${does(n)}`).join('; ');
  const label = (n: HouseNode) => {
    const Icon = ICON[n.key];
    return (
      <div key={n.key} className={`en-now__node g-house__lbl g-house__lbl--${CORNER[n.key]}${n.active ? '' : ' g-house__lbl--off'}`}>
        <span className={`en-now__name en-now__name--${n.key}`}>
          <Icon size={15} strokeWidth={2} />
          {t(NAME_KEY[n.key])}
        </span>
        <span className="en-now__kw">{kw(n.w)}</span>
        <span className="en-now__does">{does(n)}</span>
      </div>
    );
  };
  const narrow = !!size && size.w < HOUSE_MIN_W;
  const v = size ? houseScale(size.w, size.h) : null;
  const cls = `g-house${narrow ? ' g-house--narrow' : ''}${visible ? '' : ' g-house--paused'}`;
  return (
    <div ref={box} className={cls} {...(narrow ? {} : { role: 'img', 'aria-label': aria })}>
      {narrow
        ? fallback
        : size &&
          v && (
            <>
              <Scene
                v={v}
                w={size.w}
                h={size.h}
                nodes={nodes}
                wires={wires}
                hasSolar={hasSolar}
                hasBattery={hasBattery}
                soc={soc}
              />
              <svg className="g-house__svg g-house__moving" width={size.w} height={size.h} aria-hidden="true">
                {wireDots(v, wires, hasBattery).map((w) => (
                  <path key={w.key} className={`g-house__dots g-house__dots--${w.toHouse ? 'in' : 'out'}`} d={w.d} strokeWidth={w.width} />
                ))}
              </svg>
              {hasSolar && label(nodes.solar)}
              {label(nodes.grid)}
              {hasBattery && label(nodes.battery)}
              {label(nodes.home)}
            </>
          )}
    </div>
  );
}
