import { describe, expect, it } from 'vitest';
import type { HassEntity } from '@hapulse/core';
import { automationCategory } from '../src/ha/automationCategories';

const auto = (entity_id: string, attributes: Record<string, unknown> = {}) =>
  ({ entity_id, state: 'on', attributes, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null } }) as HassEntity;

const names = { cat1: 'Heizung Zeitplan', blank: '  ' };

describe('automationCategory', () => {
  it('HA category from the entity registry comes first', () => {
    expect(automationCategory(auto('automation.advanced_heating_bad'), { categories: { automation: 'cat1' } }, names)).toBe('Heizung Zeitplan');
  });
  it('unknown, blank or missing HA category falls back to the upstream grouping', () => {
    expect(automationCategory(auto('automation.advanced_heating_bad'), { categories: { automation: 'gone' } }, names)).toBe('Advanced');
    expect(automationCategory(auto('automation.advanced_heating_bad'), { categories: { automation: 'blank' } }, names)).toBe('Advanced');
    expect(automationCategory(auto('automation.advanced_heating_bad'), { categories: { automation: null } }, names)).toBe('Advanced');
    expect(automationCategory(auto('automation.advanced_heating_bad'), undefined, {})).toBe('Advanced');
    expect(automationCategory(auto('automation.pool_x', { category: 'Garten' }), {}, names)).toBe('Garten');
    expect(automationCategory(auto('automation.x'), undefined, names)).toBe('General');
  });
  it('a category of another scope does not count', () => {
    expect(automationCategory(auto('automation.pool_x'), { categories: { script: 'cat1' } }, names)).toBe('Pool');
  });
});
