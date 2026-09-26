import { describe, expect, it } from 'vitest';
import { migrateNavOrderV2 } from '../src/stores/navOrderMigration';
import { applyStoredOrder } from '../src/lib/order';

const NAV = ['overview', 'rooms', 'nvr', 'pool', 'devices', 'automations', 'energy', 'security', 'music', 'scenes', 'system', 'settings'];

describe('migrateNavOrderV2', () => {
  it('leaves an empty order empty (it already follows NAV_CONFIG) and sets the marker', () => {
    const out = migrateNavOrderV2({ navOrder: [], navOrderV2Migrated: false });
    expect(out).toEqual({ navOrder: [], navOrderV2Migrated: true });
  });

  it('moves Overview, Rooms, NVR, Pool to the front and keeps the rest in the user\'s order', () => {
    const stored = ['security', 'overview', 'music', 'devices', 'rooms', 'automations', 'energy', 'nvr', 'pool', 'scenes', 'system', 'settings'];
    const out = migrateNavOrderV2({ navOrder: stored, navOrderV2Migrated: false });
    expect(out.navOrder).toEqual(['overview', 'rooms', 'nvr', 'pool', 'security', 'music', 'devices', 'automations', 'energy', 'scenes', 'system', 'settings']);
  });

  it('handles an old order without NVR/Pool: the resolved sidebar still starts with the four', () => {
    const stored = ['overview', 'rooms', 'devices', 'security', 'settings', 'music'];
    const out = migrateNavOrderV2({ navOrder: stored, navOrderV2Migrated: false });
    expect(applyStoredOrder(NAV, out.navOrder).slice(0, 4)).toEqual(['overview', 'rooms', 'nvr', 'pool']);
    // unknown/foreign ids are kept (applyStoredOrder skips them later)
    expect(migrateNavOrderV2({ navOrder: ['x', 'rooms'], navOrderV2Migrated: false }).navOrder).toContain('x');
  });

  it('runs once: a later manual reorder is respected', () => {
    const manual = { navOrder: ['pool', 'overview', 'rooms', 'nvr'], navOrderV2Migrated: true };
    expect(migrateNavOrderV2(manual)).toBe(manual);
  });

  it('keeps other fields untouched', () => {
    const out = migrateNavOrderV2({ navOrder: ['devices'], navOrderV2Migrated: false, hiddenNav: ['nvr'] });
    expect(out.hiddenNav).toEqual(['nvr']);
  });
});
