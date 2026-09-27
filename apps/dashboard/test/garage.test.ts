// [fork] Garage doors / gates: shared summary wording/tone and the default slot of the new sections.
import { describe, expect, it } from 'vitest';
import { garageSummary } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import { summaryText, summaryTone } from '../src/components/garage/garageText';
import { withDefaultSlot } from '../src/lib/defaultSlot';

const door = (id: string, state: string): HassEntity => ({
  entity_id: `cover.${id}`, state, last_changed: '', last_updated: '',
  context: { id: '', parent_id: null, user_id: null },
  attributes: { device_class: 'garage', supported_features: 3 },
});
const t = ((key: string, vars?: Record<string, unknown>) => `${key}${vars ? JSON.stringify(vars) : ''}`) as never;

describe('garage summary', () => {
  it('all closed → green with the caller\'s calm wording', () => {
    const s = garageSummary([door('a', 'closed'), door('b', 'closed')]);
    expect(summaryTone(s)).toBe('closed');
    expect(summaryText(t, s, 'ALL CLOSED')).toBe('ALL CLOSED');
  });
  it('an open or moving door wins → red, counted', () => {
    const s = garageSummary([door('a', 'opening'), door('b', 'unavailable'), door('c', 'closed')]);
    expect(summaryTone(s)).toBe('open');
    expect(summaryText(t, s, 'x')).toBe('garage.openCount{"count":1}');
  });
  it('an unreachable door is never "all closed" → amber', () => {
    const s = garageSummary([door('a', 'unavailable'), door('b', 'closed')]);
    expect(summaryTone(s)).toBe('unavailable');
    expect(summaryText(t, s, 'x')).toBe('garage.unavailableCount{"count":1}');
  });
});

describe('withDefaultSlot', () => {
  it('puts a new id right after its anchor in an older stored order', () => {
    expect(withDefaultSlot(['hero', 'locks', 'doors'], 'garage', 'locks')).toEqual(['hero', 'locks', 'garage', 'doors']);
  });
  it('respects a position the user chose', () => {
    expect(withDefaultSlot(['garage', 'hero', 'locks'], 'garage', 'locks')).toEqual(['garage', 'hero', 'locks']);
  });
  it('leaves empty/missing orders and orders without the anchor alone', () => {
    expect(withDefaultSlot(undefined, 'garage', 'locks')).toBeUndefined();
    expect(withDefaultSlot([], 'garage', 'locks')).toEqual([]);
    expect(withDefaultSlot(['hero', 'doors'], 'garage', 'locks')).toEqual(['hero', 'doors']);
  });
});
