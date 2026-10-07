import { describe, expect, it } from 'vitest';
import {
  dragFrame,
  hasMediumDetent,
  largeHeight,
  mediumHeight,
  mediumMaxHeight,
  morphFrom,
  originVisible,
  pickDetent,
  pickPresentation,
  releaseVelocity,
  scrimOpacity,
  snapAfterDrag,
  type SnapInput,
} from '../src/components/glas/sheet/sheetMath';

// [fork] Glas sheets (stage 3): pure window maths (docs/glas/PLAN-ETAPPE-3.md K48, K50–K52, K60).

describe('pickPresentation', () => {
  it('phone sheet below 900, dialog from 900', () => {
    expect(pickPresentation({ viewportW: 390, wantsInspector: false, stacked: false })).toBe('sheet');
    expect(pickPresentation({ viewportW: 899, wantsInspector: false, stacked: false })).toBe('sheet');
    expect(pickPresentation({ viewportW: 900, wantsInspector: false, stacked: false })).toBe('dialog');
  });

  it('inspector only from 1100 and only when asked for', () => {
    expect(pickPresentation({ viewportW: 1099, wantsInspector: true, stacked: false })).toBe('dialog');
    expect(pickPresentation({ viewportW: 1100, wantsInspector: true, stacked: false })).toBe('inspector');
    expect(pickPresentation({ viewportW: 1400, wantsInspector: false, stacked: false })).toBe('dialog');
    expect(pickPresentation({ viewportW: 600, wantsInspector: true, stacked: false })).toBe('sheet');
  });

  it('a window opened over another one is a page, at every width', () => {
    for (const w of [390, 900, 1400]) {
      expect(pickPresentation({ viewportW: w, wantsInspector: false, stacked: true })).toBe('page');
      expect(pickPresentation({ viewportW: w, wantsInspector: true, stacked: true })).toBe('page');
    }
  });
});

describe('detents', () => {
  it('sizes follow GLAS-DESIGN §7.18 (sketch: 700 and 792 of 844)', () => {
    expect(mediumMaxHeight(844)).toBe(700);
    expect(largeHeight(844)).toBe(792);
    expect(mediumHeight(450, 844)).toBe(450);
    expect(mediumHeight(900, 844)).toBe(700);
  });

  it('starts medium when the content fits, large otherwise', () => {
    expect(pickDetent(450, 844)).toBe('medium');
    expect(pickDetent(700, 844)).toBe('medium');
    expect(pickDetent(701, 844)).toBe('large');
  });

  it('short viewports (phone in landscape) only have the large detent', () => {
    expect(hasMediumDetent(559)).toBe(false);
    expect(hasMediumDetent(560)).toBe(true);
    expect(pickDetent(100, 390)).toBe('large');
  });
});

describe('dragFrame', () => {
  const medium = { detent: 'medium' as const, height: 450, largeH: 792, hasMedium: true, canClose: true };
  const large = { detent: 'large' as const, height: 792, largeH: 792, hasMedium: true, canClose: true };

  it('medium grows with the finger up to the large height, then rubber band ×0.2', () => {
    expect(dragFrame({ ...medium, dy: -100 })).toEqual({ height: 550, y: 0 });
    expect(dragFrame({ ...medium, dy: -342 })).toEqual({ height: 792, y: 0 });
    expect(dragFrame({ ...medium, dy: -442 })).toEqual({ height: 792, y: -20 });
  });

  it('downwards the sheet follows the finger', () => {
    expect(dragFrame({ ...medium, dy: 120 })).toEqual({ height: 450, y: 120 });
    expect(dragFrame({ ...large, dy: 120 })).toEqual({ height: 792, y: 120 });
  });

  it('large dragged up is a rubber band', () => {
    expect(dragFrame({ ...large, dy: -100 })).toEqual({ height: 792, y: -20 });
  });

  it('swipeToClose=false: rubber band downwards too, unless large can still go to medium', () => {
    expect(dragFrame({ ...medium, canClose: false, dy: 100 })).toEqual({ height: 450, y: 20 });
    expect(dragFrame({ ...large, canClose: false, dy: 100 })).toEqual({ height: 792, y: 100 });
    expect(dragFrame({ ...large, canClose: false, hasMedium: false, dy: 100 })).toEqual({ height: 792, y: 20 });
  });
});

describe('snapAfterDrag', () => {
  const m: SnapInput = { detent: 'medium', dy: 0, vy: 0, height: 450, hasMedium: true, canClose: true };
  const l: SnapInput = { detent: 'large', dy: 0, vy: 0, height: 792, hasMedium: true, canClose: true };

  it('medium: up by more than 50 or an upward fling → large', () => {
    expect(snapAfterDrag({ ...m, dy: -51 })).toBe('large');
    expect(snapAfterDrag({ ...m, dy: -50 })).toBe('stay');
    expect(snapAfterDrag({ ...m, dy: -20, vy: -0.9 })).toBe('large');
    expect(snapAfterDrag({ ...m, dy: -20, vy: -0.7 })).toBe('stay');
  });

  it('medium: closes from 25 % of its height or with a downward fling', () => {
    expect(snapAfterDrag({ ...m, dy: 113 })).toBe('close');
    expect(snapAfterDrag({ ...m, dy: 112 })).toBe('stay');
    expect(snapAfterDrag({ ...m, dy: 30, vy: 0.9 })).toBe('close');
    expect(snapAfterDrag({ ...m, dy: 30, vy: 0.8 })).toBe('stay');
  });

  it('a fling only counts in the direction of the drag', () => {
    expect(snapAfterDrag({ ...m, dy: 30, vy: -2 })).toBe('stay');
    expect(snapAfterDrag({ ...m, dy: -30, vy: 2 })).toBe('stay');
  });

  it('large: down by more than 80 or a fling → medium, beyond 45 % → close', () => {
    expect(snapAfterDrag({ ...l, dy: 81 })).toBe('medium');
    expect(snapAfterDrag({ ...l, dy: 80 })).toBe('stay');
    expect(snapAfterDrag({ ...l, dy: 40, vy: 1 })).toBe('medium');
    expect(snapAfterDrag({ ...l, dy: 357 })).toBe('close');
    expect(snapAfterDrag({ ...l, dy: 356 })).toBe('medium');
    expect(snapAfterDrag({ ...l, dy: -100, vy: -2 })).toBe('stay');
  });

  it('large-only sheets close like medium ones', () => {
    const only: SnapInput = { ...l, hasMedium: false, height: 338 };
    expect(snapAfterDrag({ ...only, dy: 85 })).toBe('close');
    expect(snapAfterDrag({ ...only, dy: 84 })).toBe('stay');
    expect(snapAfterDrag({ ...only, dy: 20, vy: 1 })).toBe('close');
  });

  it('never closes when it may not (alarm keypad), detents still change', () => {
    expect(snapAfterDrag({ ...m, canClose: false, dy: 400, vy: 3 })).toBe('stay');
    expect(snapAfterDrag({ ...m, canClose: false, dy: -60 })).toBe('large');
    expect(snapAfterDrag({ ...l, canClose: false, dy: 700 })).toBe('medium');
    expect(snapAfterDrag({ ...l, canClose: false, hasMedium: false, dy: 700 })).toBe('stay');
  });
});

describe('scrimOpacity', () => {
  it('fades over 500 px downwards and never goes up', () => {
    expect(scrimOpacity(-80)).toBe(1);
    expect(scrimOpacity(0)).toBe(1);
    expect(scrimOpacity(250)).toBe(0.5);
    expect(scrimOpacity(600)).toBe(0);
  });
});

describe('releaseVelocity', () => {
  it('uses only the samples of the last 80 ms', () => {
    const samples = [
      { t: 0, y: 0 },
      { t: 100, y: 0 },
      { t: 140, y: 20 },
      { t: 180, y: 60 },
    ];
    expect(releaseVelocity(samples)).toBeCloseTo(60 / 80);
  });

  it('is 0 with fewer than two samples or no elapsed time', () => {
    expect(releaseVelocity([])).toBe(0);
    expect(releaseVelocity([{ t: 5, y: 9 }])).toBe(0);
    expect(releaseVelocity([{ t: 5, y: 9 }, { t: 5, y: 30 }])).toBe(0);
  });

  it('is negative upwards', () => {
    expect(releaseVelocity([{ t: 0, y: 100 }, { t: 50, y: 40 }])).toBeCloseTo(-1.2);
  });
});

describe('morphFrom', () => {
  it('lays the end rectangle over the origin (origin top left) and keeps the radius at 22 on screen', () => {
    const r = morphFrom({ x: 16, y: 120, w: 187, h: 40 }, { x: 8, y: 386, w: 374, h: 450 });
    expect(r.x).toBe(8);
    expect(r.y).toBe(-266);
    expect(r.sx).toBeCloseTo(0.5);
    expect(r.sy).toBeCloseTo(40 / 450);
    expect(r.rx).toBeCloseTo(44);
    expect(r.ry).toBeCloseTo(22 / (40 / 450));
  });

  it('never scales below 0.05', () => {
    const r = morphFrom({ x: 0, y: 0, w: 1, h: 1 }, { x: 0, y: 0, w: 400, h: 600 });
    expect(r.sx).toBe(0.05);
    expect(r.sy).toBe(0.05);
    expect(r.rx).toBeCloseTo(440);
  });

  it('takes another radius when asked', () => {
    expect(morphFrom({ x: 0, y: 0, w: 100, h: 50 }, { x: 0, y: 0, w: 200, h: 100 }, 10).rx).toBeCloseTo(20);
  });
});

describe('originVisible', () => {
  it('needs a size and an overlap with the viewport', () => {
    expect(originVisible({ x: 10, y: 10, w: 40, h: 40 }, 390, 844)).toBe(true);
    expect(originVisible({ x: 10, y: 10, w: 0, h: 40 }, 390, 844)).toBe(false);
    expect(originVisible({ x: 10, y: -60, w: 40, h: 40 }, 390, 844)).toBe(false);
    expect(originVisible({ x: 10, y: 900, w: 40, h: 40 }, 390, 844)).toBe(false);
  });
});
