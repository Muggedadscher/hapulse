import { describe, expect, it } from 'vitest';
import {
  POOL_FINISH_MAX,
  POOL_FINISH_MIN,
  clockMinutes,
  clockState,
  poolReason,
  poolTargetStatus,
  restMinutes,
  shiftFinishBy,
  surplusSteps,
} from '../src/components/pool/poolPlan';

const now = new Date('2026-11-23T14:00:00Z');

describe('pool daily filter time', () => {
  it('none without a target or figures', () => {
    expect(poolTargetStatus(1, 0, undefined, now)).toEqual({ kind: 'none' });
    expect(poolTargetStatus(NaN, 4, undefined, now)).toEqual({ kind: 'none' });
    expect(poolTargetStatus(1, NaN, undefined, now)).toEqual({ kind: 'none' });
  });

  it('reached once the runtime meets the target', () => {
    expect(poolTargetStatus(4, 4, 'unknown', now)).toEqual({ kind: 'reached' });
    expect(poolTargetStatus(5.47, 4, undefined, now)).toEqual({ kind: 'reached' });
  });

  it('starts by / runs now / missed / rest from the latest-start sensor', () => {
    expect(poolTargetStatus(1, 4, '2026-11-23T14:50:00+00:00', now)).toMatchObject({ kind: 'startsBy', restH: 3 });
    expect(poolTargetStatus(1, 4, '2026-11-23T13:50:00+00:00', now)).toEqual({ kind: 'runningNow', restH: 3 });
    expect(poolTargetStatus(1, 4, 'unknown', now)).toEqual({ kind: 'missed', restH: 3 });
    expect(poolTargetStatus(1, 4, 'unavailable', now)).toEqual({ kind: 'rest', restH: 3 });
    expect(poolTargetStatus(1, 4, undefined, now)).toEqual({ kind: 'rest', restH: 3 });
  });

  it('rest minutes in 5-minute steps, at least 5', () => {
    expect(restMinutes(2.53)).toBe(150);
    expect(restMinutes(0.01)).toBe(5);
    expect(restMinutes(1.5)).toBe(90);
  });

  it('finished by: clock parsing, writing and the 10:00–23:00 window', () => {
    expect(clockMinutes('20:00:00')).toBe(1200);
    expect(clockMinutes('7:30')).toBe(450);
    expect(clockMinutes('unknown')).toBeNaN();
    expect(clockMinutes(undefined)).toBeNaN();
    expect(clockState(1230)).toBe('20:30:00');
    expect(clockState(600)).toBe('10:00:00');
    expect(shiftFinishBy(1200, 30)).toBe(1230);
    expect(shiftFinishBy(POOL_FINISH_MAX, 30)).toBeNull();
    expect(shiftFinishBy(POOL_FINISH_MIN, -30)).toBeNull();
    expect(shiftFinishBy(POOL_FINISH_MAX - 10, 30)).toBe(POOL_FINISH_MAX);
    expect(shiftFinishBy(NaN, 30)).toBeNull();
    // off the grid: onto the next step in the button's direction
    expect(shiftFinishBy(1215, 30)).toBe(1230);
    expect(shiftFinishBy(1215, -30)).toBe(1200);
    // outside the window (set in HA): a button never moves the other way
    expect(shiftFinishBy(540, -30)).toBeNull();
    expect(shiftFinishBy(540, 30)).toBe(600);
    expect(shiftFinishBy(1410, 30)).toBeNull();
    expect(shiftFinishBy(1410, -30)).toBe(1380);
  });
});

describe('pool battery surplus limits', () => {
  const base = { on: 90, off: 80, onMin: 50, onMax: 100, offMin: 30, offMax: 95, onStep: 5, offStep: 5 };

  it('all four buttons work in the middle', () => {
    expect(surplusSteps(base)).toEqual({ onDown: true, onUp: true, offDown: true, offUp: true });
  });

  it('"off" stays at least 5 % under "on"', () => {
    expect(surplusSteps({ ...base, on: 85, off: 80 })).toMatchObject({ onDown: false, offUp: false });
    expect(surplusSteps({ ...base, on: 90, off: 85 })).toMatchObject({ onDown: false, offUp: false, onUp: true, offDown: true });
  });

  it('each limit moves by its own helper\'s step', () => {
    expect(surplusSteps({ ...base, on: 90, off: 84, offStep: 1 })).toMatchObject({ offUp: true, onDown: false });
    expect(surplusSteps({ ...base, on: 90, off: 85, offStep: 1 })).toMatchObject({ offUp: false });
  });

  it('the helpers\' own bounds', () => {
    expect(surplusSteps({ ...base, on: 100 })).toMatchObject({ onUp: false });
    expect(surplusSteps({ ...base, off: 30 })).toMatchObject({ offDown: false });
    expect(surplusSteps({ ...base, on: NaN })).toEqual({ onDown: false, onUp: false, offDown: false, offUp: false });
  });
});

describe('pool reason', () => {
  it('maps HA\'s options, keeps unknown ones, hides "none"', () => {
    expect(poolReason('Akku voll')).toEqual({ key: 'battery' });
    expect(poolReason('Tagesziel')).toEqual({ key: 'target' });
    expect(poolReason('Mindestlaufzeit')).toEqual({ key: 'minRun' });
    expect(poolReason('Frost')).toEqual({ raw: 'Frost' });
    expect(poolReason('Keiner')).toBeNull();
    expect(poolReason('unavailable')).toBeNull();
    expect(poolReason(undefined)).toBeNull();
  });
});
