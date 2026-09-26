import { describe, expect, it } from 'vitest';
import { climateSetpoint, gaugeRange, stepSetpoint } from '../src/components/home/climateLogic';

describe('climate setpoint rules', () => {
  it('°C thermostat: 0.5 steps, clamped to min/max', () => {
    const sp = climateSetpoint({ temperature: 21, min_temp: 7, max_temp: 25 });
    expect(sp.step).toBe(0.5);
    expect(stepSetpoint(21, 1, sp)).toBe(21.5);
    expect(stepSetpoint(25, 1, sp)).toBe(25);
    expect(stepSetpoint(21.3, -1, sp)).toBe(21); // back onto the grid
    expect(gaugeRange(sp)).toEqual({ min: 15, max: 30 });
  });
  it('°F thermostat: 1° steps, °F gauge', () => {
    const sp = climateSetpoint({ temperature: 70, min_temp: 45, max_temp: 95 });
    expect(sp.fahrenheit).toBe(true);
    expect(stepSetpoint(70, -1, sp)).toBe(69);
    expect(gaugeRange(sp)).toEqual({ min: 59, max: 86 });
  });
  it('entity step wins; no single target temperature → value null', () => {
    expect(climateSetpoint({ temperature: 20, target_temp_step: 0.1 }).decimals).toBe(1);
    expect(climateSetpoint({ target_temp_low: 19, target_temp_high: 24 }).value).toBeNull();
  });
});
