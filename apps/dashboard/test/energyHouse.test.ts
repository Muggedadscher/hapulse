import { describe, expect, it } from 'vitest';
import {
  HOUSE_MIN_W,
  houseNodes,
  houseScale,
  houseWires,
  iso,
  pointAlong,
  polyLength,
  roundRoute,
  BATTERY,
  WIRE_BATTERY,
  WIRE_BATTERY_DOTS,
  WIRE_GRID,
  type HouseLink,
} from '../src/components/energy/fork/energyHouse';

const L = (from: HouseLink['from'], to: HouseLink['to'], w: number): HouseLink => ({ from, to, w });

describe('energyHouse: nodes', () => {
  it('sunny afternoon: solar to the home and into the battery, grid idle', () => {
    const n = houseNodes([L('solar', 'home', 600), L('solar', 'battery', 1200), L('solar', 'grid', 300)]);
    expect(n.solar).toMatchObject({ w: 2100, active: true, does: 'produces' });
    expect(n.home).toMatchObject({ w: 600, active: true, does: 'uses' });
    expect(n.battery).toMatchObject({ w: 1200, active: true, does: 'charges' });
    expect(n.grid).toMatchObject({ w: 300, active: true, does: 'exports' });
  });
  it('evening: battery and grid feed the home', () => {
    const n = houseNodes([L('battery', 'home', 400), L('grid', 'home', 200)]);
    expect(n.solar).toMatchObject({ w: 0, active: false });
    expect(n.battery).toMatchObject({ w: 400, does: 'discharges' });
    expect(n.grid).toMatchObject({ w: 200, does: 'imports' });
    expect(n.home.w).toBe(600);
  });
  it('idle: everything dimmed, battery and grid rest', () => {
    const n = houseNodes([]);
    expect(Object.values(n).every((x) => !x.active)).toBe(true);
    expect(n.battery.does).toBe('idle');
    expect(n.grid.does).toBe('idle');
  });
});

describe('energyHouse: wires', () => {
  it('colour = where it comes from, direction = where it goes', () => {
    expect(houseWires([L('solar', 'battery', 800)])).toEqual({
      battery: { color: 'solar', toHouse: false },
      grid: { color: null, toHouse: false },
    });
    expect(houseWires([L('grid', 'battery', 900), L('solar', 'battery', 100)]).battery).toEqual({ color: 'grid', toHouse: false });
    expect(houseWires([L('battery', 'home', 500)]).battery).toEqual({ color: 'battery', toHouse: true });
    expect(houseWires([L('battery', 'grid', 500)])).toEqual({
      battery: { color: 'battery', toHouse: true },
      grid: { color: 'battery', toHouse: false },
    });
    expect(houseWires([L('solar', 'grid', 700)]).grid).toEqual({ color: 'solar', toHouse: false });
    expect(houseWires([L('grid', 'home', 300)]).grid).toEqual({ color: 'grid', toHouse: true });
    // grid into the battery runs through the house: grey on both wires, in from the mast, out to the battery
    expect(houseWires([L('grid', 'battery', 1000)])).toEqual({
      battery: { color: 'grid', toHouse: false },
      grid: { color: 'grid', toHouse: true },
    });
  });
  it('nothing flows: empty grooves', () => {
    expect(houseWires([])).toEqual({ battery: { color: null, toHouse: false }, grid: { color: null, toHouse: false } });
  });
});

describe('energyHouse: geometry', () => {
  it('fits the phone card and the plate stays inside the box', () => {
    const w = 326;
    const h = 270;
    const v = houseScale(w, h);
    expect(v.k).toBeGreaterThan(1.5);
    for (const [x, y] of [[0, 0], [100, 0], [0, 100], [100, 100]] as const) {
      const [sx, sy] = iso(v, x, y, 0);
      expect(sx).toBeGreaterThanOrEqual(0);
      expect(sx).toBeLessThanOrEqual(w);
      expect(sy).toBeGreaterThanOrEqual(0);
      expect(sy).toBeLessThanOrEqual(h);
    }
    expect(HOUSE_MIN_W).toBeLessThan(w);
  });
  it('the moving dots start outside the battery (its front ellipse would show them)', () => {
    const v = houseScale(326, 270);
    const [cx, cy] = iso(v, BATTERY.BX, BATTERY.BY, 0);
    const [x, y] = iso(v, WIRE_BATTERY_DOTS[0]![0], WIRE_BATTERY_DOTS[0]![1], 0);
    const rx = BATTERY.BR * 1.2247 * v.k;
    const ry = BATTERY.BR * 0.7071 * v.k;
    expect(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2).toBeGreaterThan(1);
  });
  it('wires start at the battery or mast and end at the house, rounded corners', () => {
    for (const route of [WIRE_BATTERY, WIRE_GRID]) {
      const r = roundRoute(route);
      expect(r[0]).toEqual(route[0]);
      expect(r[r.length - 1]).toEqual(route[route.length - 1]);
      expect(r.length).toBe(2 + 7 * (route.length - 2));
    }
  });
  it('pointAlong walks the polyline', () => {
    const p: [number, number][] = [[0, 0], [10, 0], [10, 10]];
    expect(polyLength(p)).toBe(20);
    expect(pointAlong(p, 0.25)).toEqual([5, 0]);
    expect(pointAlong(p, 0.75)).toEqual([10, 5]);
    expect(pointAlong(p, 2)).toEqual([10, 10]);
  });
});
