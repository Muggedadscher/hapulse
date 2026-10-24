import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HeatingPlanStatus } from '@hapulse/core';

// [fork] Heating plan card and window (components/heating/*, plan glas/heizung-zeitplan/PLAN.md Etappe 2a/2b): how
// times, durations, days and the status line read, the stepper, the order in which ✓ saves, and the times page's start,
// keys and ring.

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

const {
  formatHeatingDuration,
  formatHeatingRange,
  formatHeatingTime,
  heatingChipName,
  heatingDayName,
  heatingDaysName,
  heatingDaySpan,
  heatingDurationParts,
  heatingTempParts,
  HEATING_MARK,
  splitMarked,
} = await import('../src/components/heating/heatingFormat');
const {
  heatingAddedIndex,
  heatingArcPath,
  heatingKeyValue,
  heatingOverlapEdge,
  heatingPointerAngle,
  heatingRingPoint,
  heatingTimesDraft,
  heatingTurn,
  toggleHeatingDay,
} = await import('../src/components/heating/heatingTimes');
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

describe('heating plan times page', () => {
  const W = { from: '05:30', to: '20:00' };
  const E = { from: '07:00', to: '20:00' };
  const week = { monday: [W], tuesday: [W], wednesday: [W], thursday: [W], friday: [W], saturday: [E], sunday: [] };

  it('names days: groups, one long name, short names; spans of three and more', () => {
    const t = ((key: string) => key) as never;
    expect(heatingDaysName(t, 'de', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])).toBe('heatingPlan.group.weekdays');
    expect(heatingDaysName(t, 'de', ['saturday'])).toBe('Samstag');
    expect(heatingDaysName(t, 'de', ['monday', 'wednesday'])).toMatch(/^Mo\.?, Mi\.?$/u);
    expect(heatingDaySpan(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], 'en')).toBe('Mon–Fri');
    expect(heatingDaySpan(['saturday', 'sunday'], 'en')).toBe('Sat, Sun');
    expect(heatingDaySpan(['monday', 'wednesday', 'thursday', 'friday', 'sunday'], 'en')).toBe('Mon, Wed–Fri, Sun');
    expect(heatingChipName('monday', 'fr')).toBe('lun');
  });

  it('a duration in its parts', () => {
    expect(heatingDurationParts(W, 'de')).toEqual(['14 Std.', '30 Min.']);
    expect(heatingDurationParts(E, 'en')).toEqual(['13 hr']);
    expect(heatingDurationParts({ from: '06:00', to: '06:05' }, 'en')).toEqual(['5 min']);
  });

  it('starts with a group, or for another time with the days that have none', () => {
    expect(heatingTimesDraft(week, { days: ['saturday'], blocks: [E] })).toEqual({ days: ['saturday'], blocks: [E] });
    expect(heatingTimesDraft(week, null)).toEqual({ days: ['sunday'], blocks: [{ from: '06:00', to: '22:00' }] });
    const full = { ...week, sunday: [E] };
    expect(heatingTimesDraft(full, null).days).toEqual([]);
  });

  it('toggles a day and keeps the week order', () => {
    expect(toggleHeatingDay(['friday', 'monday'], 'wednesday')).toEqual(['monday', 'wednesday', 'friday']);
    expect(toggleHeatingDay(['monday', 'wednesday'], 'monday')).toEqual(['wednesday']);
  });

  it('keys move a knob like a slider, within its range', () => {
    const range = { min: 0, max: 1195 };
    expect(heatingKeyValue('ArrowRight', 330, range)).toBe(335);
    expect(heatingKeyValue('ArrowDown', 330, range)).toBe(325);
    expect(heatingKeyValue('PageUp', 1180, range)).toBe(1195);
    expect(heatingKeyValue('PageDown', 30, range)).toBe(0);
    expect(heatingKeyValue('Home', 330, range)).toBe(0);
    expect(heatingKeyValue('End', 330, range)).toBe(1195);
    expect(heatingKeyValue('Tab', 330, range)).toBeNull();
  });

  it('the ring: midnight at the top, clockwise; a whole day closes', () => {
    expect(heatingPointerAngle(100, 0, 100, 100)).toBeCloseTo(0);
    expect(heatingPointerAngle(200, 100, 100, 100)).toBeCloseTo(90);
    expect(heatingPointerAngle(100, 200, 100, 100)).toBeCloseTo(180);
    expect(heatingPointerAngle(0, 100, 100, 100)).toBeCloseTo(270);
    const [x, y] = heatingRingPoint(360, 155, 120);
    expect([Math.round(x), Math.round(y)]).toEqual([275, 155]);
    expect(heatingArcPath(330, 1200, 155, 120)).toMatch(/ 0 1 1 /u);
    expect(heatingArcPath(360, 720, 155, 120)).toMatch(/ 0 0 1 /u);
    expect(heatingArcPath(0, 1440, 155, 120).match(/A /gu)).toHaveLength(2);
  });

  it('finds the period that was added', () => {
    expect(heatingAddedIndex([W], [{ from: '01:00', to: '03:00' }, W])).toBe(0);
    expect(heatingAddedIndex([W], [W])).toBe(-1);
  });

  it('knobs on each other: the drag direction picks the end that can still move', () => {
    const day = [{ from: '00:00', to: '24:00' }];
    expect(heatingOverlapEdge(day, 0, true)).toBe('from');
    expect(heatingOverlapEdge(day, 0, false)).toBe('to');
    const short = [{ from: '06:00', to: '06:05' }];
    expect(heatingOverlapEdge(short, 0, true)).toBe('to');
    expect(heatingOverlapEdge(short, 0, false)).toBe('from');
    expect(heatingTurn(350, 10)).toBeCloseTo(20);
    expect(heatingTurn(10, 350)).toBeCloseTo(-20);
    expect(heatingTurn(90, 89)).toBeCloseTo(-1);
  });
});
