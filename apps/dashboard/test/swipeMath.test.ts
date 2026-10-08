import { describe, expect, it } from 'vitest';
import {
  DESKTOP_SWIPE,
  swipeAxis,
  swipeRest,
  swipeReveal,
  swipeSpec,
} from '../src/components/glas/swipeMath';

// [fork] Glas swipe rows (stage 3b): decision after 8 px, follow up to 36 px past the action, open from 45 % (K59).

describe('swipeSpec', () => {
  it('takes the phone widths of the lists and their thresholds', () => {
    for (const [w, openAt, stop] of [
      [104, 46.8, 140],
      [88, 39.6, 124],
      [112, 50.4, 148],
    ] as const) {
      const spec = swipeSpec(w, false);
      expect(spec.width).toBe(w);
      expect(spec.openAt).toBeCloseTo(openAt, 6);
      expect(spec.stop).toBe(stop);
    }
  });

  it('uses one width on the desktop', () => {
    for (const w of [104, 88, 112]) expect(swipeSpec(w, true)).toEqual({ width: 96, openAt: 48, stop: 128 });
    expect(DESKTOP_SWIPE).toEqual({ width: 96, openAt: 48, stop: 128 });
  });
});

describe('swipeAxis', () => {
  it('waits for 8 px', () => {
    expect(swipeAxis(0, 0)).toBeNull();
    expect(swipeAxis(-7, 0)).toBeNull();
    expect(swipeAxis(-7.9, 7.9)).toBeNull();
    expect(swipeAxis(-8, 0)).toBe('x');
    expect(swipeAxis(8, 0)).toBe('x');
  });

  it('swipes only when the move is more sideways than up or down', () => {
    expect(swipeAxis(-12, 5)).toBe('x');
    expect(swipeAxis(-5, 12)).toBe('y');
    expect(swipeAxis(0, -8)).toBe('y');
  });

  it('lets vertical win a tie', () => {
    expect(swipeAxis(-10, 10)).toBe('y');
    expect(swipeAxis(9, -9)).toBe('y');
  });
});

describe('swipeReveal', () => {
  const spec = swipeSpec(104, false);

  it('follows the finger to the left', () => {
    expect(swipeReveal(0, -30, spec)).toBe(30);
    expect(swipeReveal(0, -104, spec)).toBe(104);
  });

  it('stops 36 px past the action', () => {
    expect(swipeReveal(0, -140, spec)).toBe(140);
    expect(swipeReveal(0, -400, spec)).toBe(140);
    expect(swipeReveal(0, -400, DESKTOP_SWIPE)).toBe(128);
  });

  it('never moves the row to the right of its place', () => {
    expect(swipeReveal(0, 40, spec)).toBe(0);
    expect(swipeReveal(104, 150, spec)).toBe(0);
  });

  it('starts an open row from its open place', () => {
    expect(swipeReveal(104, 30, spec)).toBe(74);
    expect(swipeReveal(104, -10, spec)).toBe(114);
  });
});

describe('swipeRest', () => {
  it('rests open from 45 % of the action width, closed below', () => {
    const spec = swipeSpec(104, false);
    expect(swipeRest(46, spec)).toBe(0);
    expect(swipeRest(46.9, spec)).toBe(104);
    expect(swipeRest(0, spec)).toBe(0);
  });

  it('rests open after pulling through, never beyond the action', () => {
    expect(swipeRest(140, swipeSpec(104, false))).toBe(104);
    expect(swipeRest(128, DESKTOP_SWIPE)).toBe(96);
  });

  it('uses 48 px on the desktop', () => {
    expect(swipeRest(47.9, DESKTOP_SWIPE)).toBe(0);
    expect(swipeRest(48, DESKTOP_SWIPE)).toBe(96);
  });
});
