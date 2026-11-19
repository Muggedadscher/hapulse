/**
 * [fork] The card "Now" in Glas as a matte isometric house (draft glas/energie-neu/haus/3d, chosen 2026-11-19): the
 * same flows as the bands of Klassisch, drawn as a plate with the house (panels on the roof), the home battery in front
 * and the grid's mast behind. Two wires run in grooves on the plate: battery ↔ house and mast ↔ house; a wire takes the
 * colour of where its power comes from (solar yellow, battery green, grid grey) and its dots move the way the power
 * flows. Pure (no DOM): the geometry in world units (plate 0..100, z up) and the decisions, tested in
 * test/energyHouse.test.ts; the drawing in EnergyNowHouse.tsx.
 */

import { POWER_FLOW_MIN } from '@hapulse/core';

export type HouseKey = 'solar' | 'battery' | 'grid' | 'home';
/** What a node does, as the suffix of `energy.now.<does>` (`idle` = `energy.battery.idle`). */
export type HouseDoes = 'produces' | 'charges' | 'discharges' | 'idle' | 'imports' | 'exports' | 'uses';
// `idle` (battery or grid, nothing flows) reads "Ruht"

export interface HouseLink {
  from: 'solar' | 'battery' | 'grid';
  to: 'home' | 'battery' | 'grid';
  /** W */
  w: number;
}

export interface HouseNode {
  key: HouseKey;
  /** W */
  w: number;
  active: boolean;
  does: HouseDoes;
}

/** Where a wire's power comes from (its colour); null = nothing flows (the groove stays empty). */
export type WireColor = 'solar' | 'battery' | 'grid' | null;

export interface Wire {
  color: WireColor;
  /** true = the power flows towards the house (battery discharging, grid import) */
  toHouse: boolean;
}

const sum = (links: HouseLink[], pick: (l: HouseLink) => boolean) => links.filter(pick).reduce((a, l) => a + l.w, 0);
const on = (w: number) => w >= POWER_FLOW_MIN;

/** The four nodes from the links (`nowLinks`: small flows already left out). An idle node is shown dimmed. */
export function houseNodes(links: HouseLink[]): Record<HouseKey, HouseNode> {
  const solar = sum(links, (l) => l.from === 'solar');
  const home = sum(links, (l) => l.to === 'home');
  const charge = sum(links, (l) => l.to === 'battery');
  const discharge = sum(links, (l) => l.from === 'battery');
  const imp = sum(links, (l) => l.from === 'grid');
  const exp = sum(links, (l) => l.to === 'grid');
  return {
    solar: { key: 'solar', w: solar, active: on(solar), does: 'produces' },
    home: { key: 'home', w: home, active: on(home), does: 'uses' },
    battery: on(charge)
      ? { key: 'battery', w: charge, active: true, does: 'charges' }
      : on(discharge)
        ? { key: 'battery', w: discharge, active: true, does: 'discharges' }
        : { key: 'battery', w: 0, active: false, does: 'idle' },
    grid: on(exp)
      ? { key: 'grid', w: exp, active: true, does: 'exports' }
      : on(imp)
        ? { key: 'grid', w: imp, active: true, does: 'imports' }
        : { key: 'grid', w: 0, active: false, does: 'idle' },
  };
}

/** The two wires: colour = the larger source of what flows in it, direction = the way it flows. */
export function houseWires(links: HouseLink[]): { battery: Wire; grid: Wire } {
  const w = (from: HouseLink['from'], to: HouseLink['to']) => sum(links, (l) => l.from === from && l.to === to);
  const solarBattery = w('solar', 'battery');
  const gridBattery = w('grid', 'battery');
  const batteryOut = w('battery', 'home') + w('battery', 'grid');
  const solarGrid = w('solar', 'grid');
  const batteryGrid = w('battery', 'grid');
  const gridIn = w('grid', 'home') + gridBattery;
  const battery: Wire = on(solarBattery + gridBattery)
    ? { color: solarBattery >= gridBattery ? 'solar' : 'grid', toHouse: false }
    : on(batteryOut)
      ? { color: 'battery', toHouse: true }
      : { color: null, toHouse: false };
  const grid: Wire = on(solarGrid + batteryGrid)
    ? { color: solarGrid >= batteryGrid ? 'solar' : 'battery', toHouse: false }
    : on(gridIn)
      ? { color: 'grid', toHouse: true }
      : { color: null, toHouse: false };
  return { battery, grid };
}

// ---- Geometry (world units; the draft's numbers)

/** Plate 0..100 × 0..100, corner radius, thickness. */
export const PLATE = { R: 12, T: 6 };
/** House: x X0..X1 (gable at X1), y Y0..Y1 (long wall at Y1), wall height HW, ridge HR at YM; roof overhang O (front
 *  and sides), OB (back: in this view the back face is almost an edge), roof thickness TH. */
export const HOUSE = { X0: 38, X1: 78, Y0: 30, Y1: 60, HW: 24, HR: 38, YM: 45, O: 3, OB: 1.2, TH: 2 };
/** Battery: a cylinder at (BX, BY), radius BR, height BH. */
export const BATTERY = { BX: 22, BY: 82, BR: 6.5, BH: 22 };
/** Mast at (MX, MY), height MH. */
export const MAST = { MX: 90, MY: 22, MH: 46 };
/** The wires' corner points: from the battery / the mast to the house (the battery's starts inside the cylinder, hidden
 *  behind it; the moving dots start at its edge, WIRE_BATTERY_DOTS). */
export const WIRE_BATTERY: [number, number][] = [
  [BATTERY.BX + BATTERY.BR - 1, BATTERY.BY],
  [52, BATTERY.BY],
  [52, HOUSE.Y1],
];
export const WIRE_BATTERY_DOTS: [number, number][] = [[BATTERY.BX + BATTERY.BR + 1.5, BATTERY.BY], ...WIRE_BATTERY.slice(1)];
export const WIRE_GRID: [number, number][] = [
  [MAST.MX, MAST.MY + 3],
  [MAST.MX, 46],
  [HOUSE.X1, 46],
];
/** The labels sit in the box's corners, LABEL_H high; they may overlap the drawing's empty corners by LABEL_OVER. */
export const LABEL_H = 58;
export const LABEL_OVER = 30;
/** Below this width the house gets too small to read: the compact text form instead. */
export const HOUSE_MIN_W = 280;
/** The drawing's extent in world units × k: width 100·2·cos 30°, height (plate 100 + the tallest object). */
const EXT_W = 173.2;
const EXT_H = 112;
const COS30 = Math.cos(Math.PI / 6);

export interface HouseView {
  /** px per world unit */
  k: number;
  ox: number;
  oy: number;
}

/** Scale and origin for a box `w` × `h` (px): as large as fits between the label rows. */
export function houseScale(w: number, h: number): HouseView {
  const top = LABEL_H - LABEL_OVER;
  const availH = Math.max(1, h - 2 * top);
  const k = Math.max(0.1, Math.min((w - 8) / EXT_W, availH / EXT_H));
  return { k, ox: w / 2, oy: top + (availH - EXT_H * k) / 2 + 6 * k };
}

/** World → screen (isometric, 30°). */
export function iso(v: HouseView, x: number, y: number, z = 0): [number, number] {
  return [v.ox + (x - y) * COS30 * v.k, v.oy + ((x + y) * 0.5 - z) * v.k];
}

/** A polyline (world, z = 0) with its inner corners rounded by `r` (7 points per arc). */
export function roundRoute(pts: [number, number][], r = 5): [number, number][] {
  const out: [number, number][] = [pts[0]!];
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i]!;
    const [ax, ay] = pts[i - 1]!;
    const [bx, by] = pts[i + 1]!;
    const la = Math.hypot(px - ax, py - ay);
    const lb = Math.hypot(bx - px, by - py);
    const a = [(px - ax) / la, (py - ay) / la] as const;
    const b = [(bx - px) / lb, (by - py) / lb] as const;
    const c = [px - a[0] * r + b[0] * r, py - a[1] * r + b[1] * r] as const;
    for (let j = 0; j <= 6; j++) {
      const t = (j / 6) * (Math.PI / 2);
      out.push([c[0] + (-b[0] * Math.cos(t) + a[0] * Math.sin(t)) * r, c[1] + (-b[1] * Math.cos(t) + a[1] * Math.sin(t)) * r]);
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

/** Length of a screen polyline. */
export function polyLength(pts: [number, number][]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  return l;
}

/** The point at fraction `f` (0..1) of a screen polyline's length. */
export function pointAlong(pts: [number, number][], f: number): [number, number] {
  let t = Math.min(1, Math.max(0, f)) * polyLength(pts);
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]!;
    const [bx, by] = pts[i]!;
    const l = Math.hypot(bx - ax, by - ay);
    if (t <= l && l > 0) return [ax + ((bx - ax) * t) / l, ay + ((by - ay) * t) / l];
    t -= l;
  }
  return pts[pts.length - 1]!;
}
