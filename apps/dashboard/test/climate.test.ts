import { afterEach, describe, expect, it } from 'vitest';
import { climateSetpoint, gaugeRange, stepSetpoint } from '../src/components/home/climateLogic';
import {
  getTemperatureUnit,
  parseTemperatureUnit,
  startDemoTemperatureUnit,
  startTemperatureUnit,
  stopTemperatureUnit,
} from '../src/ha/temperatureUnit';

describe('climate setpoint rules', () => {
  it('°C thermostat: 0.5 steps, clamped to min/max', () => {
    const sp = climateSetpoint({ temperature: 21, min_temp: 7, max_temp: 25 }, '°C');
    expect(sp.step).toBe(0.5);
    expect(stepSetpoint(21, 1, sp)).toBe(21.5);
    expect(stepSetpoint(25, 1, sp)).toBe(25);
    expect(stepSetpoint(21.3, -1, sp)).toBe(21); // back onto the grid
    expect(gaugeRange(sp)).toEqual({ min: 15, max: 30 });
  });
  it('°C thermostat with a maximum of 90 stays Celsius (max_temp is no unit)', () => {
    const sp = climateSetpoint({ temperature: 24, min_temp: 5, max_temp: 90, target_temp_step: 1 }, '°C');
    expect(sp.fahrenheit).toBe(false);
    expect(sp.unit).toBe('°C');
    expect(stepSetpoint(24, 1, sp)).toBe(25);
    expect(gaugeRange(sp)).toEqual({ min: 15, max: 30 });
  });
  it('°F only when Home Assistant is set to °F: 1° steps, °F gauge', () => {
    const sp = climateSetpoint({ temperature: 70, min_temp: 45, max_temp: 95 }, '°F');
    expect(sp.fahrenheit).toBe(true);
    expect(sp.unit).toBe('°F');
    expect(stepSetpoint(70, -1, sp)).toBe(69);
    expect(gaugeRange(sp)).toEqual({ min: 59, max: 86 });
  });
  it('unit not known yet: Celsius defaults, no guess from the values', () => {
    const sp = climateSetpoint({ temperature: 70, min_temp: 45, max_temp: 95 }, null);
    expect(sp.fahrenheit).toBe(false);
    expect(sp.unit).toBeNull();
    expect(sp.step).toBe(0.5);
    expect(climateSetpoint({}, null)).toMatchObject({ min: 7, max: 35 });
    expect(climateSetpoint({}, '°F')).toMatchObject({ min: 45, max: 95, step: 1 });
  });
  it('entity step wins; no single target temperature → value null', () => {
    expect(climateSetpoint({ temperature: 20, target_temp_step: 0.1 }, '°C').decimals).toBe(1);
    expect(climateSetpoint({ target_temp_low: 19, target_temp_high: 24 }, '°C').value).toBeNull();
  });
});

describe('temperature unit of Home Assistant', () => {
  afterEach(() => stopTemperatureUnit());

  it('reads unit_system.temperature, anything else is unknown', () => {
    expect(parseTemperatureUnit('°C')).toBe('°C');
    expect(parseTemperatureUnit('°F')).toBe('°F');
    expect(parseTemperatureUnit('K')).toBeNull();
    expect(parseTemperatureUnit(undefined)).toBeNull();
  });
  it('follows the connection’s config and forgets it when the connection goes', () => {
    let push: ((config: { unit_system: { temperature: string } }) => void) | undefined;
    let unsubscribed = 0;
    const conn = {
      subscribeConfig(cb: (config: { unit_system: { temperature: string } }) => void) {
        push = cb;
        return () => { unsubscribed++; };
      },
    };
    startTemperatureUnit(conn as unknown as Parameters<typeof startTemperatureUnit>[0]);
    expect(getTemperatureUnit()).toBeNull(); // not loaded yet
    push?.({ unit_system: { temperature: '°C' } });
    expect(getTemperatureUnit()).toBe('°C');
    push?.({ unit_system: { temperature: '°F' } }); // unit system changed in HA
    expect(getTemperatureUnit()).toBe('°F');
    stopTemperatureUnit();
    expect(unsubscribed).toBe(1);
    expect(getTemperatureUnit()).toBeNull();
    push?.({ unit_system: { temperature: '°F' } }); // a late delivery after unsubscribing changes nothing
    expect(getTemperatureUnit()).toBeNull();
    startDemoTemperatureUnit();
    push?.({ unit_system: { temperature: '°F' } }); // nor once the demo took over
    expect(getTemperatureUnit()).toBe('°C');
  });
  it('demo data is in °C', () => {
    startDemoTemperatureUnit();
    expect(getTemperatureUnit()).toBe('°C');
  });
});
