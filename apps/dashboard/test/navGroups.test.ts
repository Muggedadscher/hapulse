import { describe, expect, it } from 'vitest';
import { navGroups } from '../src/app/glas/navGroups';

// [fork] Glas: sidebar groups (GLAS-DESIGN §7.2, E10; docs/glas/PLAN-ETAPPE-2.md §4.1).

const DEFAULT = ['overview', 'rooms', 'nvr', 'pool', 'devices', 'automations', 'energy', 'security', 'music', 'scenes', 'system', 'settings'];

describe('navGroups', () => {
  it('splits the default order into Zuhause, Bereiche, System', () => {
    expect(navGroups(DEFAULT, [])).toEqual([
      { id: 'home', ids: ['overview', 'rooms', 'automations', 'scenes'] },
      { id: 'areas', ids: ['nvr', 'pool', 'devices', 'energy', 'security', 'music'] },
      { id: 'system', ids: ['system', 'settings'] },
    ]);
  });

  it("keeps the user's order inside each group; the groups themselves stay fixed", () => {
    const order = ['settings', 'music', 'scenes', 'overview', 'security', 'rooms', 'system'];
    expect(navGroups(order, [])).toEqual([
      { id: 'home', ids: ['scenes', 'overview', 'rooms'] },
      { id: 'areas', ids: ['music', 'security'] },
      { id: 'system', ids: ['settings', 'system'] },
    ]);
  });

  it('leaves hidden entries and empty groups out', () => {
    const groups = navGroups(DEFAULT, ['nvr', 'pool', 'devices', 'energy', 'security', 'music', 'scenes']);
    expect(groups).toEqual([
      { id: 'home', ids: ['overview', 'rooms', 'automations'] },
      { id: 'system', ids: ['system', 'settings'] },
    ]);
  });

  it('puts unknown entries (a new upstream page) into Bereiche', () => {
    expect(navGroups(['overview', 'calendar', 'settings'], [])).toEqual([
      { id: 'home', ids: ['overview'] },
      { id: 'areas', ids: ['calendar'] },
      { id: 'system', ids: ['settings'] },
    ]);
  });

  it('returns no groups for an empty list', () => {
    expect(navGroups([], [])).toEqual([]);
  });
});
