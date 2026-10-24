import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HeatingPlanStatus } from '@hapulse/core';

// [fork] Heating plan card and window (components/heating/*, plan glas/heizung-zeitplan/PLAN.md Etappe 2a): how times,
// durations and the status line read, the stepper and the order in which ✓ saves.

const calls: string[] = [];
let failOn: string | null = null;
vi.mock('../src/ha/heatingPlan', () => ({
  setHeatingPlanOn: vi.fn(async (automation: string, on: boolean) => {
    const call = `switch ${automation} ${on ? 'on' : 'off'}`;
    calls.push(call);
    if (failOn === call) throw new Error('rejected');
  }),
  setHeatingTemperature: vi.fn(async (id: string, value: number) => {
    const call = `set ${id} ${value}`;
    calls.push(call);
    if (failOn === call) throw new Error('rejected');
  }),
}));

const { formatHeatingDuration, formatHeatingRange, formatHeatingTime, heatingDayName, heatingTempParts, HEATING_MARK, splitMarked } =
  await import('../src/components/heating/heatingFormat');
const { heatingDraftChanged, saveHeatingDraft, stepHeatingValue } = await import('../src/components/heating/heatingSave');
const { heatingStatusText } = await import('../src/components/heating/HeatingStatus');

const helper = (id: string, value: number | null, step = 0.5) => ({ id, value, min: 5, max: 30, step, unit: '°C' });
const PLAN = {
  areaId: 'kueche',
  automation: 'automation.advanced_heating_kueche',
  schedule: 'schedule.zeitplan_heizung_kueche',
  comfort: 'input_number.heizplan_kueche_komfort',
  eco: 'input_number.heizplan_kueche_eco',
  thermostats: ['climate.kueche'],
};
const view = (on: boolean) => ({ plan: PLAN, on, comfort: helper(PLAN.comfort, 21), eco: helper(PLAN.eco, 18) });

beforeEach(() => {
  calls.length = 0;
  failOn = null;
});

describe('heating plan texts', () => {
  it('times in the locale clock, the end of a day as 24:00 in a 24-hour locale', () => {
    expect(formatHeatingTime('06:00', 'de')).toBe('06:00');
    expect(formatHeatingTime('24:00', 'de')).toBe('24:00');
    expect(formatHeatingTime('24:00', 'sv')).toBe('24:00');
    expect(formatHeatingTime('24:00', 'en')).toBe('12:00 AM');
    expect(formatHeatingRange({ from: '05:30', to: '20:00' }, 'de')).toBe('05:30–20:00');
  });

  it('durations with the units of the locale', () => {
    expect(formatHeatingDuration({ from: '05:30', to: '20:00' }, 'de')).toBe('14 Std. 30 Min.');
    expect(formatHeatingDuration({ from: '07:00', to: '20:00' }, 'de')).toBe('13 Std.');
    expect(formatHeatingDuration({ from: '06:00', to: '06:45' }, 'en')).toBe('45 min');
    expect(formatHeatingDuration({ from: '17:00', to: '24:00' }, 'fr').replace(/\s/gu, ' ')).toBe('7 h');
  });

  it('day names from Monday, temperatures with the decimal sign of the locale', () => {
    expect(heatingDayName('monday', 'de', 'long')).toBe('Montag');
    expect(heatingDayName('sunday', 'en', 'short')).toBe('Sun');
    expect(heatingTempParts(21, 'de')).toBe('21');
    expect(heatingTempParts(20.5, 'de')).toBe('20,5');
    expect(heatingTempParts(20.5, 'en')).toBe('20.5');
    expect(heatingTempParts(null, 'de')).toBe('—');
  });

  it('splits a translated text at its marks', () => {
    expect(splitMarked(`${HEATING_MARK[0]} bis ${HEATING_MARK[1]}`)).toEqual([
      { text: '', mark: 0 },
      { text: ' bis ', mark: null },
      { text: '', mark: 1 },
    ]);
    expect(splitMarked('plain')).toEqual([{ text: 'plain', mark: null }]);
  });

  it('the status line: until when, or why not', () => {
    const t = ((key: string, vars?: Record<string, string>) =>
      vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${v === HEATING_MARK[0] ? '*' : v}`).join(',')})` : key) as never;
    const status = (phase: HeatingPlanStatus['phase'], until: HeatingPlanStatus['until'] = null): HeatingPlanStatus => ({ phase, until });
    expect(heatingStatusText(t, 'de', status('comfort', { time: '20:00', dayOffset: 0, weekday: 'monday' }), false)).toBe(
      'heatingPlan.status.until(phase=*,time=20:00)',
    );
    expect(heatingStatusText(t, 'de', status('eco', { time: '05:30', dayOffset: 1, weekday: 'tuesday' }), false)).toBe(
      'heatingPlan.status.untilTomorrow(phase=*,time=05:30)',
    );
    expect(heatingStatusText(t, 'de', status('eco', { time: '07:00', dayOffset: 3, weekday: 'saturday' }), false)).toBe(
      'heatingPlan.status.untilDay(phase=*,time=07:00,day=Sa)',
    );
    expect(heatingStatusText(t, 'de', status('window'), false)).toBe('heatingPlan.status.with(phase=*,detail=heatingPlan.detail.window)');
    expect(heatingStatusText(t, 'de', status('off'), true)).toBe('heatingPlan.status.with(phase=*,detail=heatingPlan.detail.off)');
    expect(heatingStatusText(t, 'de', status('comfort', { time: '20:00', dayOffset: 0, weekday: 'monday' }), true)).toBe(
      'heatingPlan.status.with(phase=*,detail=heatingPlan.detail.deviates)',
    );
    expect(heatingStatusText(t, 'de', status('unknown'), false)).toBe(HEATING_MARK[0]);
  });
});

describe('heating plan window', () => {
  it('steps on the helper grid within its range', () => {
    expect(stepHeatingValue(21, 1, helper('x', 21))).toBe(21.5);
    expect(stepHeatingValue(21, -1, helper('x', 21, 1))).toBe(20);
    expect(stepHeatingValue(20.3, 1, helper('x', 20.3))).toBe(21);
    expect(stepHeatingValue(30, 1, helper('x', 30))).toBe(30);
    expect(stepHeatingValue(5, -1, helper('x', 5))).toBe(5);
  });

  it('knows whether anything changed', () => {
    expect(heatingDraftChanged(view(true), { on: null, comfort: null, eco: null })).toBe(false);
    expect(heatingDraftChanged(view(true), { on: true, comfort: 21, eco: 18 })).toBe(false);
    expect(heatingDraftChanged(view(true), { on: false, comfort: null, eco: null })).toBe(true);
    expect(heatingDraftChanged(view(true), { on: null, comfort: null, eco: 17 })).toBe(true);
  });

  it('switching on: the temperatures first, so switching on applies them', async () => {
    await saveHeatingDraft(view(false), { on: true, comfort: 22, eco: 17 });
    expect(calls).toEqual([`set ${PLAN.comfort} 22`, `set ${PLAN.eco} 17`, `switch ${PLAN.automation} on`]);
  });

  it('switching off: the switch first, so the automation no longer sets the thermostat', async () => {
    await saveHeatingDraft(view(true), { on: false, comfort: 22, eco: null });
    expect(calls).toEqual([`switch ${PLAN.automation} off`, `set ${PLAN.comfort} 22`]);
  });

  it('sends only what changed', async () => {
    await saveHeatingDraft(view(true), { on: true, comfort: 21, eco: 17.5 });
    expect(calls).toEqual([`set ${PLAN.eco} 17.5`]);
  });

  it('a refused call stops the steps after it and rejects', async () => {
    failOn = `set ${PLAN.comfort} 22`;
    await expect(saveHeatingDraft(view(false), { on: true, comfort: 22, eco: 17 })).rejects.toThrow('rejected');
    expect(calls).toEqual([`set ${PLAN.comfort} 22`]);
  });
});
