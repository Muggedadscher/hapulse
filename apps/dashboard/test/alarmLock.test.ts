import { describe, expect, it, vi } from 'vitest';
import type { HassEntity } from '@hapulse/core';
import { isAlarmActionDisabled, isAlarmActionSupported } from '../src/components/security/alarmLogic';
import { lockBusy, lockCodeIsNumeric, lockNeedsCode, lockNeedsDialog, lockSummary, lockSummaryText, lockTone } from '../src/components/security/lockLogic';
import { useToastStore } from '../src/stores/toastStore';

const lock = (state: string, attributes: Record<string, unknown> = {}): HassEntity =>
  ({ entity_id: 'lock.front', state, attributes, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null } }) as HassEntity;

describe('alarm panel buttons', () => {
  it('during the entry delay (pending) and while arming only DISARM is usable', () => {
    for (const state of ['pending', 'arming']) {
      expect(isAlarmActionDisabled(state, 'disarm', 'disarmed')).toBe(false);
      expect(isAlarmActionDisabled(state, 'arm_away', 'armed_away')).toBe(true);
      expect(isAlarmActionDisabled(state, 'arm_home', 'armed_home')).toBe(true);
    }
  });
  it('the current state and an unreachable panel disable the button', () => {
    expect(isAlarmActionDisabled('armed_away', 'arm_away', 'armed_away')).toBe(true);
    expect(isAlarmActionDisabled('disarmed', 'disarm', 'disarmed')).toBe(true);
    expect(isAlarmActionDisabled('unavailable', 'disarm', 'disarmed')).toBe(true);
    expect(isAlarmActionDisabled('triggered', 'disarm', 'disarmed')).toBe(false);
    expect(isAlarmActionDisabled('armed_away', 'disarm', 'disarmed')).toBe(false);
  });
  it('arm modes follow supported_features; without the attribute everything is offered', () => {
    expect(isAlarmActionSupported('arm_night', 1 | 2)).toBe(false);
    expect(isAlarmActionSupported('arm_away', 1 | 2)).toBe(true);
    expect(isAlarmActionSupported('arm_vacation', 32)).toBe(true);
    expect(isAlarmActionSupported('disarm', 0)).toBe(true);
    expect(isAlarmActionSupported('arm_night', undefined)).toBe(true);
  });
});

describe('lock rules', () => {
  it('busy while moving, jammed or unreachable', () => {
    for (const s of ['locking', 'unlocking', 'opening', 'jammed', 'unavailable', 'unknown']) expect(lockBusy(s)).toBe(true);
    for (const s of ['locked', 'unlocked', 'open']) expect(lockBusy(s)).toBe(false);
  });
  it('unlock always asks; lock asks only when a code is needed', () => {
    expect(lockNeedsDialog('unlock', [lock('locked')])).toBe(true);
    expect(lockNeedsDialog('lock', [lock('unlocked')])).toBe(false);
    expect(lockNeedsDialog('lock', [lock('unlocked', { code_format: '^\\d{4,6}$' })])).toBe(true);
  });
  it('code format', () => {
    expect(lockNeedsCode(lock('locked', { code_format: '^\\d{4}$' }))).toBe(true);
    expect(lockNeedsCode(lock('locked', { code_format: null }))).toBe(false);
    expect(lockCodeIsNumeric(lock('locked', { code_format: '^\\d{4,6}$' }))).toBe(true);
    expect(lockCodeIsNumeric(lock('locked', { code_format: '.+' }))).toBe(false);
  });
});

describe('toast store', () => {
  it('keeps at most 3, drops identical duplicates, expires after 6 s', () => {
    vi.useFakeTimers();
    const s = useToastStore.getState();
    s.push('toast.notConnected');
    s.push('toast.notConnected');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    for (let i = 0; i < 4; i++) s.push('toast.serviceFailed', { domain: 'lock', service: 'unlock', message: String(i) });
    expect(useToastStore.getState().toasts).toHaveLength(3);
    vi.advanceTimersByTime(6001);
    expect(useToastStore.getState().toasts).toHaveLength(0);
    vi.useRealTimers();
  });
});

describe('lock summary (chip, home card, hero)', () => {
  const t = ((k: string, p?: Record<string, unknown>) => (p ? `${k}:${String(p['count'])}` : k)) as never;
  it('open beats problem beats locked; moving states count as open', () => {
    const s = lockSummary([lock('locked'), lock('unlocking'), lock('jammed')]);
    expect(s).toEqual({ total: 3, locked: 1, open: 1, problem: 1 });
    expect(lockTone(s)).toBe('open');
    expect(lockSummaryText(t, s, 'ALL')).toBe('home.security.unlockedCount:1');
  });
  it('a jammed or unreachable lock is never "all locked"', () => {
    for (const st of ['jammed', 'unavailable', 'unknown']) {
      const s = lockSummary([lock('locked'), lock(st)]);
      expect(lockTone(s)).toBe('problem');
      expect(lockSummaryText(t, s, 'ALL')).toBe('locks.problemCount:1');
    }
  });
  it('all locked is calm; open/unlocked/opening/locking count as open', () => {
    expect(lockTone(lockSummary([lock('locked'), lock('locked')]))).toBe('locked');
    expect(lockSummaryText(t, lockSummary([lock('locked')]), 'ALL')).toBe('ALL');
    expect(lockSummary(['open', 'unlocked', 'opening', 'locking'].map((st) => lock(st))).open).toBe(4);
  });
});
