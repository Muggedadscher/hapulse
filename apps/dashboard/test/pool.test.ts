import { describe, expect, it, vi } from 'vitest';

const calls: unknown[][] = [];
vi.mock('../src/ha/service', () => ({
  callService: vi.fn(async (...args: unknown[]) => {
    calls.push(args);
    if (args[0] === 'input_number' && (args[2] as { value: number }).value === 999) throw new Error('rejected');
  }),
}));
const { startManualRun } = await import('../src/ha/pool');

describe('startManualRun', () => {
  it('writes the duration BEFORE switching the mode to Manuell', async () => {
    calls.length = 0;
    await startManualRun('input_number.d', 'input_select.m', 'Manuell', false, 'script.restart', 90);
    expect(calls.map((c) => `${c[0]}.${c[1]}`)).toEqual(['input_number.set_value', 'input_select.select_option']);
  });
  it('already in Manuell: restarts the timer script instead of re-selecting the option (a no-op in HA)', async () => {
    calls.length = 0;
    await startManualRun('input_number.d', 'input_select.m', 'Manuell', true, 'script.restart', 45);
    expect(calls.map((c) => `${c[0]}.${c[1]}`)).toEqual(['input_number.set_value', 'script.turn_on']);
    expect(calls[1]![3]).toEqual({ entity_id: 'script.restart' });
  });
  it('a failed duration write stops before the mode switch and rejects', async () => {
    calls.length = 0;
    await expect(startManualRun('input_number.d', 'input_select.m', 'Manuell', false, 'script.restart', 999)).rejects.toThrow();
    expect(calls).toHaveLength(1);
  });
});
