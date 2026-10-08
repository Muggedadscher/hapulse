import { describe, expect, it } from 'vitest';
import {
  OFF_BELOW,
  levelAfterKey,
  levelAt,
  lightCommand,
  lightDimmable,
  lightLevel,
} from '../src/components/glas/detail/lightLevel';

// [fork] Glas detail (stage 4): the vertical brightness control of a light (GLAS-DESIGN §7.22, PLAN-ETAPPE-4 K79).

describe('lightLevel', () => {
  it('is 0 while the light is not on', () => {
    expect(lightLevel('off', 200)).toBe(0);
    expect(lightLevel('unavailable', 200)).toBe(0);
  });

  it('turns the brightness into a percentage, at least 1 while on', () => {
    expect(lightLevel('on', 255)).toBe(100);
    expect(lightLevel('on', 204)).toBe(80);
    expect(lightLevel('on', 0)).toBe(1);
    expect(lightLevel('on', 300)).toBe(100);
  });

  it('is 100 for a light that is on without a brightness', () => {
    expect(lightLevel('on', undefined)).toBe(100);
    expect(lightLevel('on', null)).toBe(100);
    expect(lightLevel('on', Number.NaN)).toBe(100);
  });
});

describe('lightDimmable', () => {
  it('follows the embedded card: some mode other than on/off', () => {
    expect(lightDimmable(['brightness'])).toBe(true);
    expect(lightDimmable(['color_temp', 'xy'])).toBe(true);
    expect(lightDimmable(['onoff'])).toBe(false);
    expect(lightDimmable([])).toBe(false);
    expect(lightDimmable(undefined)).toBe(false);
  });
});

describe('levelAt', () => {
  it('is 0 at the bottom and 100 at the top', () => {
    expect(levelAt(380, 100, 280)).toBe(0);
    expect(levelAt(100, 100, 280)).toBe(100);
    expect(levelAt(240, 100, 280)).toBe(50);
  });

  it('stays within 0–100 outside the capsule', () => {
    expect(levelAt(500, 100, 280)).toBe(0);
    expect(levelAt(0, 100, 280)).toBe(100);
    expect(levelAt(200, 100, 0)).toBe(0);
  });
});

describe('levelAfterKey', () => {
  it('moves by 10 with the arrows and by 20 with Page up/down', () => {
    expect(levelAfterKey(50, 'ArrowUp')).toBe(60);
    expect(levelAfterKey(50, 'ArrowRight')).toBe(60);
    expect(levelAfterKey(50, 'ArrowDown')).toBe(40);
    expect(levelAfterKey(50, 'ArrowLeft')).toBe(40);
    expect(levelAfterKey(50, 'PageUp')).toBe(70);
    expect(levelAfterKey(50, 'PageDown')).toBe(30);
  });

  it('goes to 0 and 100 with Home and End and stops at the ends', () => {
    expect(levelAfterKey(50, 'Home')).toBe(0);
    expect(levelAfterKey(50, 'End')).toBe(100);
    expect(levelAfterKey(95, 'ArrowUp')).toBe(100);
    expect(levelAfterKey(5, 'PageDown')).toBe(0);
  });

  it('ignores other keys', () => {
    expect(levelAfterKey(50, 'Enter')).toBeNull();
    expect(levelAfterKey(50, ' ')).toBeNull();
    expect(levelAfterKey(50, 'Tab')).toBeNull();
  });
});

describe('lightCommand', () => {
  it('turns the light off below 3 %', () => {
    expect(OFF_BELOW).toBe(3);
    expect(lightCommand(true, 80, 2)).toEqual({ service: 'turn_off' });
    expect(lightCommand(true, 80, 0)).toEqual({ service: 'turn_off' });
  });

  it('sends nothing when nothing changes', () => {
    expect(lightCommand(false, 0, 0)).toBeNull();
    expect(lightCommand(false, 0, 2)).toBeNull();
    expect(lightCommand(true, 80, 80)).toBeNull();
  });

  it('turns the light on with the brightness for the level', () => {
    expect(lightCommand(true, 80, 60)).toEqual({ service: 'turn_on', brightness: 153 });
    expect(lightCommand(false, 0, 3)).toEqual({ service: 'turn_on', brightness: 8 });
    expect(lightCommand(false, 0, 100)).toEqual({ service: 'turn_on', brightness: 255 });
    expect(lightCommand(true, 100, 100)).toBeNull();
  });
});
