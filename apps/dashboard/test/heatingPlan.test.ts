import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_ENTITIES, DEMO_HEATING, emptyHeatingWeek, HEATING_PLAN_SAVE_AUTOMATION } from '@hapulse/core';
import type { HeatingWeek } from '@hapulse/core';

const calls: unknown[][] = [];
let failService = false;
vi.mock('../src/ha/service', () => ({
  callService: vi.fn(async (...args: unknown[]) => {
    calls.push(args);
    if (failService) throw new Error('rejected');
  }),
}));

let demo = false;
const responses: unknown[] = [];
const conn = {
  callServiceWithResponse: vi.fn(async () => {
    const next = responses.length > 1 ? responses.shift() : responses[0];
    if (next instanceof Error) throw next;
    return next;
  }),
};
let connected = true;
vi.mock('../src/stores/connectionStore', () => ({
  useConnectionStore: { getState: () => ({ demo }) },
  getLiveConnection: () => (connected ? conn : null),
}));
vi.mock('../src/stores/entityStore', () => ({
  useEntityStore: { getState: () => ({ entities: DEMO_ENTITIES }) },
}));

const { getHeatingWeek, saveHeatingWeek, setHeatingPlanOn, setHeatingTemperature } = await import('../src/ha/heatingPlan');

const SCHEDULE = 'schedule.zeitplan_heizung_kueche';
/** A get_schedule answer as HA sends it: seconds, end of day as 23:59:59.999999. */
const answer = (monday: { from: string; to: string }[]) => ({ [SCHEDULE]: { monday, tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] } });
const week = (monday: { from: string; to: string }[]): HeatingWeek => ({ ...emptyHeatingWeek(), monday });

beforeEach(() => {
  calls.length = 0;
  responses.length = 0;
  conn.callServiceWithResponse.mockClear();
  failService = false;
  demo = false;
  connected = true;
});

describe('setHeatingPlanOn', () => {
  it('on: switches the automation on, then starts it once so the plan applies at once', async () => {
    await setHeatingPlanOn('automation.advanced_heating_kueche', true);
    expect(calls).toEqual([
      ['automation', 'turn_on', undefined, { entity_id: 'automation.advanced_heating_kueche' }],
      ['automation', 'trigger', undefined, { entity_id: 'automation.advanced_heating_kueche' }],
    ]);
  });
  it('off: only switches it off', async () => {
    await setHeatingPlanOn('automation.advanced_heating_kueche', false);
    expect(calls).toEqual([['automation', 'turn_off', undefined, { entity_id: 'automation.advanced_heating_kueche' }]]);
  });
  it('a failed switch-on does not start the automation', async () => {
    failService = true;
    await expect(setHeatingPlanOn('automation.advanced_heating_kueche', true)).rejects.toThrow();
    expect(calls).toHaveLength(1);
  });
});

describe('setHeatingTemperature', () => {
  it('sets the helper', async () => {
    await setHeatingTemperature('input_number.heizplan_kueche_eco', 17.5);
    expect(calls).toEqual([['input_number', 'set_value', { value: 17.5 }, { entity_id: 'input_number.heizplan_kueche_eco' }]]);
  });
});

describe('getHeatingWeek', () => {
  it('live: get_schedule on the entity, normalised', async () => {
    responses.push(answer([{ from: '17:00:00', to: '23:59:59.999999' }, { from: '06:00:00', to: '08:00:00' }]));
    expect((await getHeatingWeek(SCHEDULE))?.monday).toEqual([{ from: '06:00', to: '08:00' }, { from: '17:00', to: '24:00' }]);
    expect(conn.callServiceWithResponse).toHaveBeenCalledWith('schedule', 'get_schedule', undefined, { entity_id: SCHEDULE });
  });
  it('live: a failed call or no connection → null', async () => {
    responses.push(new Error('boom'));
    expect(await getHeatingWeek(SCHEDULE)).toBeNull();
    connected = false;
    expect(await getHeatingWeek(SCHEDULE)).toBeNull();
  });
  it('demo: the demo schedule', async () => {
    demo = true;
    expect((await getHeatingWeek(DEMO_HEATING.schedule))?.monday).toHaveLength(2);
    expect(conn.callServiceWithResponse).not.toHaveBeenCalled();
  });
});

describe('saveHeatingWeek', () => {
  const wanted = week([{ from: '17:00', to: '24:00' }, { from: '06:00', to: '08:00' }]);

  it('one start of the save automation with all days, then read back: ok', async () => {
    responses.push(answer([{ from: '06:00:00', to: '08:00:00' }, { from: '17:00:00', to: '23:59:59.999999' }]));
    const result = await saveHeatingWeek(SCHEDULE, wanted, ['tuesday', 'monday'], 0);
    expect(calls).toEqual([
      [
        'automation',
        'trigger',
        {
          variables: {
            zeitplan: SCHEDULE,
            tage: [
              { tag: 'monday', bloecke: [{ from: '06:00', to: '08:00' }, { from: '17:00', to: '24:00' }] },
              { tag: 'tuesday', bloecke: [] },
            ],
          },
        },
        { entity_id: HEATING_PLAN_SAVE_AUTOMATION },
      ],
    ]);
    expect(result.ok).toBe(true);
    expect(result.week?.monday).toEqual([{ from: '06:00', to: '08:00' }, { from: '17:00', to: '24:00' }]);
    expect(conn.callServiceWithResponse).toHaveBeenCalledTimes(1);
  });

  it('refused by HA (old schedule read back twice): not ok, with the schedule as it is', async () => {
    responses.push(answer([{ from: '05:30:00', to: '20:00:00' }]));
    const result = await saveHeatingWeek(SCHEDULE, wanted, ['monday'], 0);
    expect(result.ok).toBe(false);
    expect(result.week?.monday).toEqual([{ from: '05:30', to: '20:00' }]);
    expect(conn.callServiceWithResponse).toHaveBeenCalledTimes(2);
  });

  it('matching only on the second read: ok', async () => {
    responses.push(answer([]), answer([{ from: '06:00:00', to: '08:00:00' }, { from: '17:00:00', to: '24:00:00' }]));
    expect((await saveHeatingWeek(SCHEDULE, wanted, ['monday'], 0)).ok).toBe(true);
  });

  it('the call fails: not ok, read once', async () => {
    failService = true;
    responses.push(answer([]));
    const result = await saveHeatingWeek(SCHEDULE, wanted, ['monday'], 0);
    expect(result).toEqual({ ok: false, week: week([]) });
    expect(conn.callServiceWithResponse).toHaveBeenCalledTimes(1);
  });

  it('cannot read back: not ok, week null', async () => {
    responses.push(new Error('boom'));
    expect(await saveHeatingWeek(SCHEDULE, wanted, ['monday'], 0)).toEqual({ ok: false, week: null });
  });

  it('invalid periods: throws before calling HA', async () => {
    await expect(saveHeatingWeek(SCHEDULE, week([{ from: '09:00', to: '08:00' }]), ['monday'], 0)).rejects.toThrow();
    await expect(saveHeatingWeek(SCHEDULE, week([{ from: '06:00', to: '08:00' }, { from: '07:00', to: '09:00' }]), ['monday'], 0)).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
});
