import { describe, expect, it } from 'vitest';
import { formatBatteryPower, fullAtToday } from '../src/components/energy/fork/EnergyBatteryParts';

// [fork] The battery card's state line (EnergyBattery.tsx, EnergyBatteryWindow.tsx): "full at about" only while that is
// still today, and the power as text. Local time, so the runs in other time zones check the midnight rule there too.

describe('battery card: full at', () => {
  const now = new Date(2026, 10, 19, 12, 3);
  const at = (h: number, m = 0, day = 19) => new Date(2026, 10, day, h, m).getTime();

  it('keeps a time later today', () => {
    expect(fullAtToday(at(15, 30), now)).toBe(at(15, 30));
    expect(fullAtToday(at(23, 45), now)).toBe(at(23, 45));
  });

  it('drops a time at or after midnight', () => {
    expect(fullAtToday(at(0, 0, 20), now)).toBeNull();
    expect(fullAtToday(at(9, 15, 20), now)).toBeNull();
  });

  it('stays null without a time', () => {
    expect(fullAtToday(null, now)).toBeNull();
  });
});

describe('battery card: power', () => {
  it('reads like the window', () => {
    expect(formatBatteryPower(-130.4, 'de')).toBe('130 W');
    expect(formatBatteryPower(1240, 'de')).toBe('1,2 kW');
    expect(formatBatteryPower(1240, 'en')).toBe('1.2 kW');
  });
});
