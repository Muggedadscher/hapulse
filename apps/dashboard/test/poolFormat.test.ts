import { describe, expect, it } from 'vitest';
import { formatPoolValue, formatRingCountdown, formatUntil } from '../src/components/pool/poolFormat';
import type { HassEntity } from '@hapulse/core';

const ent = (state: string, unit?: string) =>
  ({ entity_id: 'sensor.x', state, attributes: unit ? { unit_of_measurement: unit } : {} }) as unknown as HassEntity;

describe('pool formatting', () => {
  it('ring countdown: min:ss under an hour, h:mm from an hour on (fits the ring)', () => {
    expect(formatRingCountdown(29 * 60 + 59)).toEqual({ value: '29:59', unit: 'min' });
    expect(formatRingCountdown(5)).toEqual({ value: '0:05', unit: 'min' });
    expect(formatRingCountdown(3600)).toEqual({ value: '1:00', unit: 'h' });
    expect(formatRingCountdown(23 * 3600 + 59 * 60 + 46)).toEqual({ value: '23:59', unit: 'h' }); // the 24 h run
    expect(formatRingCountdown(-3)).toEqual({ value: '0:00', unit: 'min' });
  });

  it('until: today / tomorrow / weekday', () => {
    const now = new Date(2026, 8, 26, 15, 11, 30);
    expect(formatUntil(new Date(2026, 8, 26, 15, 54), now, 'de')).toEqual({ kind: 'today', time: '15:54' });
    expect(formatUntil(new Date(2026, 8, 27, 15, 11), now, 'de')).toEqual({ kind: 'tomorrow', time: '15:11' });
    expect(formatUntil(new Date(2026, 8, 28, 9, 0), now, 'de')).toMatchObject({ kind: 'day', time: '09:00' });
    // just after midnight is "tomorrow", not "today"
    expect(formatUntil(new Date(2026, 8, 27, 0, 5), new Date(2026, 8, 26, 23, 50), 'de').kind).toBe('tomorrow');
  });

  it('values use the locale decimal separator (like the runtime chart)', () => {
    expect(formatPoolValue(ent('5.47', 'h'), 'de')).toBe('5,5 h');
    expect(formatPoolValue(ent('5.47', 'h'), 'en')).toBe('5.5 h');
    expect(formatPoolValue(ent('67.1248', 'kWh'), 'de')).toBe('67,1 kWh');
    expect(formatPoolValue(ent('1240.0754', 'kWh'), 'de')).toBe('1.240,1 kWh');
    expect(formatPoolValue(ent('unavailable', 'h'), 'de')).toBeNull();
  });
});
