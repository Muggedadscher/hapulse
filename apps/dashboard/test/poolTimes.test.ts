import { describe, expect, it, vi } from 'vitest';
import type { PoolScheduleModel } from '@hapulse/core';

// [fork] The pool schedule's times page (components/pool/PoolTimesPage.tsx, plan glas/pool-zeiten/PLAN.md): when ✓
// counts as a change and how the run time per day reads.

vi.mock('../src/ha/pool', () => ({ savePoolSchedule: vi.fn() }));

const { poolDayLength, poolTimesChanged } = await import('../src/components/pool/PoolTimesPage');

const model = (over: Partial<PoolScheduleModel> = {}): PoolScheduleModel => ({
  weekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  windows: [{ start: 12 * 60, stop: 13 * 60 + 15 }],
  repeatType: 'repeat',
  ...over,
});

describe('poolTimesChanged', () => {
  it('is false for the schedule as read, days in any order', () => {
    const m = model({ weekdays: ['mon', 'wed'] });
    expect(poolTimesChanged(m, ['wed', 'mon'], [{ from: '12:00', to: '13:15' }])).toBe(false);
  });
  it('is true when a day or a run changes', () => {
    expect(poolTimesChanged(model(), ['mon'], [{ from: '12:00', to: '13:15' }])).toBe(true);
    expect(poolTimesChanged(model(), model().weekdays, [{ from: '12:05', to: '13:15' }])).toBe(true);
    expect(poolTimesChanged(model(), model().weekdays, [])).toBe(true);
  });
  it('compares runs as they would be saved: touching runs are one', () => {
    const m = model({ windows: [{ start: 10 * 60, stop: 14 * 60 }] });
    expect(poolTimesChanged(m, m.weekdays, [{ from: '10:00', to: '12:00' }, { from: '12:00', to: '14:00' }])).toBe(false);
  });
});

describe('poolDayLength', () => {
  it('reads hours and minutes in the UI language', () => {
    const runs = [{ from: '08:00', to: '09:30' }, { from: '12:00', to: '12:45' }];
    expect(poolDayLength(runs, 'de')).toBe('2 Std. 15 Min.');
    expect(poolDayLength(runs, 'en')).toBe('2 hr 15 min');
    expect(poolDayLength([{ from: '12:00', to: '14:00' }], 'de')).toBe('2 Std.');
  });
});
