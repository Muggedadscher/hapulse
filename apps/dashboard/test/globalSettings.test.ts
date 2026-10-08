import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- a tiny in-memory Home Assistant: frontend/user_data + frontend/system_data ---------------------------
type Cb = (v: unknown) => void;
const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const tick = () => new Promise((r) => setTimeout(r, 0));

function fakeHA(isAdmin: boolean) {
  const system = new Map<string, unknown>();
  const user = new Map<string, unknown>();
  const subsS = new Map<string, Set<Cb>>();
  const subsU = new Map<string, Set<Cb>>();
  const sub = (m: Map<string, Set<Cb>>, key: string, cb: Cb, store: Map<string, unknown>) => {
    if (!m.has(key)) m.set(key, new Set());
    m.get(key)!.add(cb);
    queueMicrotask(() => cb(clone(store.get(key) ?? null)));
    return () => { m.get(key)!.delete(cb); };
  };
  const notify = (m: Map<string, Set<Cb>>, key: string, v: unknown) => m.get(key)?.forEach((cb) => queueMicrotask(() => cb(clone(v))));
  const ha = {
    system, user,
    systemWrites: [] as unknown[],
    userWrites: [] as { key: string; value: unknown }[],
    failSystemRead: false,
    async getSystemDataStrict(key: string) { if (ha.failSystemRead) throw new Error('timeout'); return clone(system.get(key) ?? null); },
    async setSystemData(key: string, value: unknown) {
      if (!isAdmin) throw new Error('unauthorized');
      system.set(key, clone(value)); ha.systemWrites.push(clone(value)); notify(subsS, key, value);
    },
    // HA unreachable: neither the read nor the subscription delivers anything
    subscribeSystemData(key: string, cb: Cb) { return ha.failSystemRead ? () => {} : sub(subsS, key, cb, system); },
    async getUserDataStrict(key: string) { return clone(user.get(key) ?? null); },
    async getUserData(key: string) { return clone(user.get(key) ?? null); },
    async setUserData(key: string, value: unknown) { user.set(key, clone(value)); ha.userWrites.push({ key, value: clone(value) }); notify(subsU, key, value); },
    subscribeUserData(key: string, cb: Cb) { return sub(subsU, key, cb, user); },
    /** Another admin writes the global document. */
    remoteSystem(key: string, value: unknown) { system.set(key, clone(value)); notify(subsS, key, value); },
  };
  return ha;
}

let ha = fakeHA(false);
vi.mock('../src/stores/connectionStore', () => ({
  getLiveConnection: () => ha,
  useConnectionStore: { getState: () => ({ demo: false, mode: 'token', currentUser: null }) },
}));

const { useSettingsStore } = await import('../src/stores/settingsStore');
const { useGlobalSettingsStore, EMPTY_GLOBAL_META } = await import('../src/stores/globalSettingsStore');
const G = await import('../src/ha/globalSettings');
const { startHASettingsSync, stopHASettingsSync } = await import('../src/ha/settingsSync');
const { flushUserSettingsPush, USER_SETTINGS_KEY } = await import('../src/ha/userSettingsSync');
const scope = await import('../src/stores/settingsScope');

const INITIAL = useSettingsStore.getState();
const ADMIN = { id: 'a1', name: 'Jannick', is_owner: false, is_admin: true };
const USER = { id: 'u1', name: 'Georg', is_owner: false, is_admin: false };

function doc(over: Partial<import('../src/stores/settingsScope').GlobalSettingsDoc> = {}) {
  const base = scope.extractGlobal({ ...INITIAL, theme: 'ocean', mode: 'dark', accentHue: 200, appName: 'Schleer' });
  return {
    v: 1 as const, rev: 1,
    activatedAt: '2026-09-26T10:00:00Z', activatedBy: { id: 'a1', name: 'Jannick' },
    updatedAt: '2026-09-26T10:00:00Z', updatedBy: { id: 'a1', name: 'Jannick' },
    settings: { ...base, customization: { ...base.customization, navOrder: ['overview', 'rooms', 'nvr', 'pool'], scryptedUrl: 'https://nvr.example:10443', hiddenEntities: ['light.hidden'] } },
    userDefaults: { favorites: ['light.admin_fav'], language: 'de' as const },
    shareSecrets: true,
    secrets: { scryptedToken: 'SHARED', maToken: null },
    ...over,
  };
}

async function startAs(user: typeof ADMIN) {
  await G.startGlobalSettings(ha as never, user, () => { stopHASettingsSync(); startHASettingsSync(); });
  startHASettingsSync();
  await tick(); await tick();
}

beforeEach(() => {
  stopHASettingsSync();
  G.stopGlobalSettings();
  useSettingsStore.setState(INITIAL, true);
  useGlobalSettingsStore.setState({ meta: EMPTY_GLOBAL_META, loaded: false, writeError: false });
});

describe('scope table', () => {
  it('assigns every top-level settings field to exactly one scope', () => {
    const top = Object.entries(INITIAL).filter(([, v]) => typeof v !== 'function').map(([k]) => k).filter((k) => k !== 'customization');
    const scoped = [...scope.GLOBAL_TOP_KEYS, ...scope.USER_TOP_KEYS, ...scope.DEVICE_TOP_KEYS] as string[];
    expect(new Set(scoped).size).toBe(scoped.length);
    expect([...top].sort()).toEqual([...scoped].sort());
  });

  it('knows every customization field — a new (upstream) field must be classified on purpose', () => {
    const KNOWN_GLOBAL = [
      'roomOrder', 'hiddenRooms', 'hiddenEntities', 'entityOverrides', 'homeChips', 'entityOrder', 'maServerUrl', 'weatherEntity',
      'homeSectionOrder', 'hiddenSections', 'roomSectionOrder', 'roomSectionSpans', 'navOrder', 'hiddenNav', 'homeSectionSpans',
      'homeSectionHeights', 'automationSectionOrder', 'hiddenAutomationSections', 'automationSectionSpans', 'automationSectionHeights',
      'sceneSectionOrder', 'hiddenSceneSections', 'sceneSectionSpans', 'sceneSectionHeights', 'musicSectionOrder', 'hiddenMusicSections',
      'musicSectionSpans', 'securitySectionOrder', 'hiddenSecuritySections', 'securitySectionSpans', 'securitySectionHeights',
      'systemSectionOrder', 'hiddenSystemSections', 'systemSectionSpans', 'systemSectionHeights', 'energySectionOrder',
      'hiddenEnergySections', 'energySectionSpans', 'energySectionHeights', 'mobileHiddenSections', 'mobileHiddenAutomationSections',
      'mobileHiddenSceneSections', 'mobileHiddenMusicSections', 'mobileHiddenSecuritySections', 'mobileHiddenSystemSections',
      'mobileHiddenEnergySections', 'scryptedUrl', 'poolChipMigrated', 'wasteSectionMigrated', 'nvrSectionMigrated', 'navOrderV2Migrated',
      'nvrCameraRooms', 'garageChipMigrated', 'locksChipMigrated',
      'uiStyle', 'glassStrength', 'reduceTransparency', // Glas: the admin sets the style for everybody (E1/E2)
      'hintsSectionMigrated', 'tallSections', // Etappe 4: home hints placed once; Glas L sizes (E6) for everybody
    ];
    const all = [...KNOWN_GLOBAL, ...scope.USER_CUSTOMIZATION_KEYS, ...scope.SECRET_CUSTOMIZATION_KEYS].sort();
    expect(Object.keys(INITIAL.customization).sort()).toEqual(all);
    for (const k of KNOWN_GLOBAL) expect(scope.isGlobalCustomizationKey(k)).toBe(true);
    for (const k of [...scope.USER_CUSTOMIZATION_KEYS, ...scope.SECRET_CUSTOMIZATION_KEYS]) expect(scope.isGlobalCustomizationKey(k)).toBe(false);
  });

  it('diff + merge: only what changed is laid over the fresh document', () => {
    const base = doc().settings;
    const cur = { ...base, accentHue: 30, customization: { ...base.customization, hiddenRooms: ['garage'] } };
    const changes = scope.diffGlobal(base, cur);
    expect(changes).toEqual({ accentHue: 30, customization: { hiddenRooms: ['garage'] } });
    const fresh = { ...base, theme: 'forest' as const, customization: { ...base.customization, roomOrder: ['a'] } };
    const merged = scope.mergeGlobal(fresh, changes);
    expect(merged.theme).toBe('forest'); // other admin's change survives
    expect(merged.accentHue).toBe(30);
    expect(merged.customization.roomOrder).toEqual(['a']);
    expect(merged.customization.hiddenRooms).toEqual(['garage']);
  });
});

describe('not managed', () => {
  it('without a global document everything stays as before (full snapshot sync)', async () => {
    ha = fakeHA(false);
    ha.user.set('hapulse:settings', JSON.parse(useSettingsStore.getState().exportSettings()));
    await startAs(USER);
    expect(G.isGlobalManaged()).toBe(false);
    useSettingsStore.getState().setAccentHue(99);
    await new Promise((r) => setTimeout(r, 800));
    expect(ha.userWrites.some((w) => w.key === 'hapulse:settings')).toBe(true);
    expect(ha.userWrites.some((w) => w.key === USER_SETTINGS_KEY)).toBe(false);
  });
});

describe('managed, non-admin', () => {
  it('applies the global settings, seeds own settings from the admin defaults + own old snapshot, never writes system_data', async () => {
    ha = fakeHA(false);
    ha.system.set(G.GLOBAL_KEY, doc());
    // Georg's old personal snapshot (legacy key) — must NOT override the global values
    ha.user.set('hapulse:settings', {
      theme: 'sunset', mode: 'light', accentHue: 10,
      customization: { navOrder: ['devices'], favorites: ['switch.own'], libraryPlayerId: 'media_player.kitchen', detailHistoryRange: '7d' },
    });
    await startAs(USER);

    const s = useSettingsStore.getState();
    expect(G.isGlobalManaged()).toBe(true);
    expect(s.theme).toBe('ocean');
    expect(s.mode).toBe('dark');
    expect(s.accentHue).toBe(200);
    expect(s.customization.navOrder).toEqual(['overview', 'rooms', 'nvr', 'pool']);
    expect(s.customization.hiddenEntities).toEqual(['light.hidden']);
    expect(s.customization.scryptedToken).toBe('SHARED');
    // USER scope: favorites + language from the admin defaults, the rest from the own old snapshot
    expect(s.customization.favorites).toEqual(['light.admin_fav']);
    expect(s.language).toBe('de');
    expect(s.customization.libraryPlayerId).toBe('media_player.kitchen');
    expect(s.customization.detailHistoryRange).toBe('7d');
    const seeded = ha.user.get(USER_SETTINGS_KEY) as Record<string, unknown>;
    expect(seeded['favorites']).toEqual(['light.admin_fav']);
    expect(ha.systemWrites).toHaveLength(0);
    // the legacy snapshot was not touched
    expect((ha.user.get('hapulse:settings') as { theme: string }).theme).toBe('sunset');
  });

  it('own favorites/language go to hapulse:user-settings; global fields are never pushed anywhere', async () => {
    ha = fakeHA(false);
    ha.system.set(G.GLOBAL_KEY, doc());
    await startAs(USER);
    ha.userWrites.length = 0;
    useSettingsStore.getState().updateCustomization({ favorites: ['light.mine'] });
    useSettingsStore.getState().setLanguage('en');
    useSettingsStore.getState().setAccentHue(1); // UI prevents this; even if it slips through it is not pushed
    await flushUserSettingsPush();
    await G.flushGlobalPush();
    expect(ha.userWrites.map((w) => w.key)).toEqual([USER_SETTINGS_KEY]);
    expect(ha.userWrites[0]!.value).toMatchObject({ favorites: ['light.mine'], language: 'en' });
    expect(ha.systemWrites).toHaveLength(0);
  });

  it('live admin changes arrive without echoing into the user snapshot', async () => {
    ha = fakeHA(false);
    ha.system.set(G.GLOBAL_KEY, doc());
    await startAs(USER);
    ha.userWrites.length = 0;
    ha.remoteSystem(G.GLOBAL_KEY, doc({ rev: 2, settings: { ...doc().settings, theme: 'forest' } }));
    await tick(); await tick();
    expect(useSettingsStore.getState().theme).toBe('forest');
    await flushUserSettingsPush();
    expect(ha.userWrites).toHaveLength(0);
  });

  it('turning sharing off removes the shared token from non-admins', async () => {
    ha = fakeHA(false);
    ha.system.set(G.GLOBAL_KEY, doc());
    await startAs(USER);
    expect(useSettingsStore.getState().customization.scryptedToken).toBe('SHARED');
    const { secrets: _s, ...noSecrets } = doc({ rev: 2, shareSecrets: false });
    void _s;
    ha.remoteSystem(G.GLOBAL_KEY, noSecrets);
    await tick(); await tick();
    expect(useSettingsStore.getState().customization.scryptedToken).toBe('');
  });

  it('a failed read keeps the last known mode and the local values', async () => {
    ha = fakeHA(false);
    useGlobalSettingsStore.getState().setMeta({ ...EMPTY_GLOBAL_META, managed: true, rev: 4 });
    useSettingsStore.getState().setTheme('ocean');
    ha.failSystemRead = true;
    await startAs(USER);
    expect(G.isGlobalManaged()).toBe(true);
    expect(useSettingsStore.getState().theme).toBe('ocean');
  });

  it('switches to managed at runtime when an admin activates it elsewhere', async () => {
    ha = fakeHA(false);
    await startAs(USER);
    expect(G.isGlobalManaged()).toBe(false);
    ha.remoteSystem(G.GLOBAL_KEY, doc());
    await tick(); await tick(); await tick();
    expect(G.isGlobalManaged()).toBe(true);
    expect(useSettingsStore.getState().theme).toBe('ocean');
    expect(ha.user.get(USER_SETTINGS_KEY)).toBeTruthy(); // user sync restarted in managed mode and seeded
  });
});

describe('managed, admin', () => {
  it('activation writes the admin\'s settings, defaults and (optionally) the shared tokens', async () => {
    ha = fakeHA(true);
    await startAs(ADMIN);
    const st = useSettingsStore.getState();
    st.setTheme('forest');
    st.updateCustomization({ favorites: ['light.a'], scryptedUrl: 'https://nvr:10443', scryptedToken: 'TOK' });
    expect(await G.activateGlobalSettings({ shareSecrets: true })).toBe('activated');
    const d = ha.system.get(G.GLOBAL_KEY) as import('../src/stores/settingsScope').GlobalSettingsDoc;
    expect(d.rev).toBe(1);
    expect(d.settings.theme).toBe('forest');
    expect(d.userDefaults.favorites).toEqual(['light.a']);
    expect(d.secrets).toEqual({ scryptedToken: 'TOK', maToken: null });
    expect(JSON.stringify(d.settings)).not.toContain('TOK');
    expect(G.isGlobalManaged()).toBe(true);
    // a second activation (another admin) does not overwrite it
    expect(await G.activateGlobalSettings({ shareSecrets: false })).toBe('exists');
  });

  it('three-way merge: a stale admin tab only overrides what it changed', async () => {
    ha = fakeHA(true);
    ha.system.set(G.GLOBAL_KEY, doc());
    await startAs(ADMIN);
    // another admin changes the theme; this tab does not see it yet (no notification)
    ha.system.set(G.GLOBAL_KEY, doc({ rev: 2, settings: { ...doc().settings, theme: 'forest' } }));
    useSettingsStore.getState().setAccentHue(42);
    await G.flushGlobalPush();
    const d = ha.system.get(G.GLOBAL_KEY) as import('../src/stores/settingsScope').GlobalSettingsDoc;
    expect(d.rev).toBe(3);
    expect(d.settings.theme).toBe('forest');
    expect(d.settings.accentHue).toBe(42);
    expect(d.updatedBy).toEqual({ id: 'a1', name: 'Jannick' });
    expect(useSettingsStore.getState().theme).toBe('forest'); // applied locally too
  });

  it('a new Sentinel token of the admin is shared on the next push; USER fields never go global', async () => {
    ha = fakeHA(true);
    ha.system.set(G.GLOBAL_KEY, doc());
    await startAs(ADMIN);
    useSettingsStore.getState().updateCustomization({ scryptedToken: 'ROTATED', favorites: ['x.y'] });
    await G.flushGlobalPush();
    const d = ha.system.get(G.GLOBAL_KEY) as import('../src/stores/settingsScope').GlobalSettingsDoc;
    expect(d.secrets?.scryptedToken).toBe('ROTATED');
    expect(JSON.stringify(d.settings)).not.toContain('x.y');
  });

  it('with sharing off an admin keeps the own device token', async () => {
    ha = fakeHA(true);
    const { secrets: _s, ...d } = doc({ shareSecrets: false });
    void _s;
    ha.system.set(G.GLOBAL_KEY, d);
    useSettingsStore.getState().updateCustomization({ scryptedUrl: 'https://nvr.example:10443', scryptedToken: 'OWN' });
    await startAs(ADMIN);
    expect(useSettingsStore.getState().customization.scryptedToken).toBe('OWN');
  });
});

// Glas (docs/GLAS-PLAN.md §7.3 E1/E2): the style, its strength and "reduce transparency" are the admin's, for all
describe('Glas style', () => {
  it('an admin switching to Glas reaches a managed non-admin; light/dark stays per device', async () => {
    ha = fakeHA(true);
    ha.system.set(G.GLOBAL_KEY, doc());
    await startAs(ADMIN);
    useSettingsStore.getState().updateCustomization({ uiStyle: 'glas', glassStrength: 'tinted', reduceTransparency: true });
    await G.flushGlobalPush();
    const pushed = ha.system.get(G.GLOBAL_KEY) as import('../src/stores/settingsScope').GlobalSettingsDoc;
    expect(pushed.settings.customization).toMatchObject({ uiStyle: 'glas', glassStrength: 'tinted', reduceTransparency: true });

    // the same document on Georg's device, which keeps its own light/dark
    stopHASettingsSync();
    G.stopGlobalSettings();
    useSettingsStore.setState(INITIAL, true);
    useSettingsStore.getState().setModeOverride('light');
    const system = ha.system;
    ha = fakeHA(false);
    ha.system.set(G.GLOBAL_KEY, system.get(G.GLOBAL_KEY));
    await startAs(USER);
    const s = useSettingsStore.getState();
    expect(s.customization).toMatchObject({ uiStyle: 'glas', glassStrength: 'tinted', reduceTransparency: true });
    expect(s.mode).toBe('dark'); // the admin's shared mode …
    expect(s.modeOverride).toBe('light'); // … and this device's own choice, untouched
    const { resolveAppearance } = await import('../src/theme/glasAppearance');
    expect(resolveAppearance(s)).toMatchObject({ mode: 'light', uiStyle: 'glas', glassStrength: 'tinted', reduceTransparency: true });
    await flushUserSettingsPush();
    expect(ha.systemWrites).toHaveLength(0);
    expect(JSON.stringify(ha.userWrites)).not.toContain('uiStyle'); // never part of the user snapshot
  });

  /** A global document written before the style existed. */
  function preGlasDoc(rev = 1) {
    const base = doc().settings;
    const { uiStyle: _u, glassStrength: _g, reduceTransparency: _r, ...cust } = base.customization;
    void _u; void _g; void _r;
    return doc({ rev, settings: { ...base, customization: cust as typeof base.customization } });
  }

  it('a document from before Glas means Klassisch: a managed non-admin is never stuck in a style nobody chose', async () => {
    ha = fakeHA(false);
    ha.system.set(G.GLOBAL_KEY, preGlasDoc());
    // e.g. left over from importing an admin's export before the management started
    useSettingsStore.getState().updateCustomization({ uiStyle: 'glas', glassStrength: 'opaque', reduceTransparency: true });
    await startAs(USER);
    expect(useSettingsStore.getState().customization).toMatchObject({ uiStyle: 'classic', glassStrength: 'clear', reduceTransparency: false });
  });

  it("an admin's Glas that is not pushed yet survives another admin's document without the style", async () => {
    ha = fakeHA(true);
    ha.system.set(G.GLOBAL_KEY, preGlasDoc(1));
    await startAs(ADMIN);
    useSettingsStore.getState().updateCustomization({ uiStyle: 'glas' });
    ha.remoteSystem(G.GLOBAL_KEY, { ...preGlasDoc(2), updatedBy: { id: 'a2', name: 'Admin 2' } });
    await tick(); await tick();
    expect(useSettingsStore.getState().customization.uiStyle).toBe('glas');
    await G.flushGlobalPush();
    const pushed = ha.system.get(G.GLOBAL_KEY) as import('../src/stores/settingsScope').GlobalSettingsDoc;
    expect(pushed.settings.customization).toMatchObject({ uiStyle: 'glas' });
  });

  it('rides along in export/import; wrong types fall back, unknown words read as Klassisch, an older file means Klassisch', async () => {
    const { resolveAppearance } = await import('../src/theme/glasAppearance');
    const s = () => useSettingsStore.getState();
    s().updateCustomization({ uiStyle: 'glas', glassStrength: 'tinted', reduceTransparency: true });
    const exported = JSON.parse(s().exportSettings()) as { customization: Record<string, unknown> };
    expect(exported.customization).toMatchObject({ uiStyle: 'glas', glassStrength: 'tinted', reduceTransparency: true });

    const withStyle = (c: Record<string, unknown>) => JSON.stringify({ ...exported, customization: { ...exported.customization, ...c } });
    s().importSettings(withStyle({ uiStyle: 42, glassStrength: null, reduceTransparency: 'yes' }));
    expect(s().customization).toMatchObject({ uiStyle: 'classic', glassStrength: 'clear', reduceTransparency: false });

    s().importSettings(withStyle({ uiStyle: 'Glass', glassStrength: 'milky' }));
    expect(resolveAppearance(s())).toMatchObject({ uiStyle: 'classic', glassStrength: 'clear' });

    s().importSettings(withStyle({ uiStyle: 'glas' }));
    const { uiStyle: _u, glassStrength: _g, reduceTransparency: _r, ...older } = exported.customization;
    void _u; void _g; void _r;
    s().importSettings(JSON.stringify({ ...exported, customization: older }));
    expect(resolveAppearance(s())).toMatchObject({ uiStyle: 'classic', glassStrength: 'clear', reduceTransparency: false });
  });
});

describe('device light/dark', () => {
  it('modeOverride wins over the shared mode and is never exported', async () => {
    const { effectiveMode } = await import('../src/stores/settingsStore');
    useSettingsStore.getState().setMode('light');
    useSettingsStore.getState().setModeOverride('dark');
    expect(effectiveMode(useSettingsStore.getState())).toBe('dark');
    expect(useSettingsStore.getState().exportSettings()).not.toContain('modeOverride');
    useSettingsStore.getState().setModeOverride(null);
    expect(effectiveMode(useSettingsStore.getState())).toBe('light');
  });
});

// [fork] Garage chip (garage doors / gates): a new chip must not vanish for existing installs
describe('garage chip migration', () => {
  const OLD_CHIPS = ['people', 'lights', 'doors', 'alarm', 'media', 'pool'];
  function oldDoc(homeChips: string[]) {
    const base = doc().settings;
    const { garageChipMigrated: _g, ...cust } = base.customization;
    void _g;
    return doc({ settings: { ...base, customization: { ...cust, homeChips } as typeof base.customization } });
  }

  it('pure: appends once, keeps a hidden chip hidden afterwards, empty stays "all"', async () => {
    const { migrateGarageChip } = await import('../src/stores/settingsStore');
    const cust = INITIAL.customization;
    const old = { ...cust, homeChips: OLD_CHIPS, garageChipMigrated: false };
    expect(migrateGarageChip(old).homeChips).toEqual([...OLD_CHIPS, 'garage']);
    const subset = { ...cust, homeChips: ['people', 'doors'], garageChipMigrated: false };
    expect(migrateGarageChip(subset).homeChips).toEqual(['people', 'doors', 'garage']);
    const empty = { ...cust, homeChips: [], garageChipMigrated: false };
    expect(migrateGarageChip(empty).homeChips).toEqual([]);
    const hiddenLater = { ...cust, homeChips: OLD_CHIPS, garageChipMigrated: true };
    expect(migrateGarageChip(hiddenLater).homeChips).toEqual(OLD_CHIPS);
  });

  it('non-admin: a global document from before the chip still shows it, nothing is written', async () => {
    ha = fakeHA(false);
    ha.system.set(G.GLOBAL_KEY, oldDoc(OLD_CHIPS));
    await startAs(USER);
    expect(useSettingsStore.getState().customization.homeChips).toContain('garage');
    expect(ha.systemWrites).toHaveLength(0);
  });

  it('non-admin: a chip the admin hid (marker set) stays hidden', async () => {
    ha = fakeHA(false);
    const base = doc().settings;
    ha.system.set(G.GLOBAL_KEY, doc({ settings: { ...base, customization: { ...base.customization, homeChips: OLD_CHIPS, garageChipMigrated: true } } }));
    await startAs(USER);
    expect(useSettingsStore.getState().customization.homeChips).not.toContain('garage');
  });

  it('admin: the migration settles in one write at most — no ping-pong', async () => {
    ha = fakeHA(true);
    ha.system.set(G.GLOBAL_KEY, oldDoc(OLD_CHIPS));
    await startAs(ADMIN);
    await G.flushGlobalPush();
    await G.flushGlobalPush();
    expect(ha.systemWrites.length).toBeLessThanOrEqual(1);
    const writes = ha.systemWrites.length;
    useSettingsStore.getState().setAccentHue(7);
    await G.flushGlobalPush();
    await G.flushGlobalPush();
    expect(ha.systemWrites.length).toBe(writes + 1);
    expect(useSettingsStore.getState().customization.homeChips).toContain('garage');
  });
});

// [fork] Locks chip: same guarantees as the garage chip
describe('locks chip migration', () => {
  const OLD_CHIPS = ['people', 'lights', 'doors', 'alarm', 'media', 'pool', 'garage'];
  function oldDoc(homeChips: string[]) {
    const base = doc().settings;
    const { locksChipMigrated: _l, ...cust } = base.customization;
    void _l;
    return doc({ settings: { ...base, customization: { ...cust, homeChips } as typeof base.customization } });
  }

  it('pure: appends once, keeps a hidden chip hidden afterwards, empty stays "all"', async () => {
    const { migrateLocksChip } = await import('../src/stores/settingsStore');
    const cust = INITIAL.customization;
    expect(migrateLocksChip({ ...cust, homeChips: OLD_CHIPS, locksChipMigrated: false }).homeChips).toEqual([...OLD_CHIPS, 'locks']);
    expect(migrateLocksChip({ ...cust, homeChips: ['people'], locksChipMigrated: false }).homeChips).toEqual(['people', 'locks']);
    expect(migrateLocksChip({ ...cust, homeChips: [], locksChipMigrated: false }).homeChips).toEqual([]);
    expect(migrateLocksChip({ ...cust, homeChips: OLD_CHIPS, locksChipMigrated: true }).homeChips).toEqual(OLD_CHIPS);
  });

  it('non-admin: a global document from before the chip still shows it, nothing is written', async () => {
    ha = fakeHA(false);
    ha.system.set(G.GLOBAL_KEY, oldDoc(OLD_CHIPS));
    await startAs(USER);
    expect(useSettingsStore.getState().customization.homeChips).toContain('locks');
    expect(ha.systemWrites).toHaveLength(0);
  });

  it('non-admin: a chip the admin hid (marker set) stays hidden', async () => {
    ha = fakeHA(false);
    const base = doc().settings;
    ha.system.set(G.GLOBAL_KEY, doc({ settings: { ...base, customization: { ...base.customization, homeChips: OLD_CHIPS, locksChipMigrated: true } } }));
    await startAs(USER);
    expect(useSettingsStore.getState().customization.homeChips).not.toContain('locks');
  });

  it('admin: the migration settles in one write at most — no ping-pong', async () => {
    ha = fakeHA(true);
    ha.system.set(G.GLOBAL_KEY, oldDoc(OLD_CHIPS));
    await startAs(ADMIN);
    await G.flushGlobalPush();
    await G.flushGlobalPush();
    expect(ha.systemWrites.length).toBeLessThanOrEqual(1);
    expect(useSettingsStore.getState().customization.homeChips).toContain('locks');
  });
});

// [fork] Home hints section (Glas Etappe 4, K76): placed first once, a later move is kept
describe('hints section migration', () => {
  const OLD_ORDER = ['scenes', 'hero', 'energy', 'devices', 'security', 'rooms'];
  function oldDoc(homeSectionOrder: string[]) {
    const base = doc().settings;
    const { hintsSectionMigrated: _h, ...cust } = base.customization;
    void _h;
    return doc({ settings: { ...base, customization: { ...cust, homeSectionOrder } as typeof base.customization } });
  }

  it('pure: puts hints first once, keeps a later move, an empty order stays the default', async () => {
    const { migrateHintsSection } = await import('../src/stores/settingsStore');
    const cust = INITIAL.customization;
    expect(migrateHintsSection({ ...cust, homeSectionOrder: OLD_ORDER, hintsSectionMigrated: false }).homeSectionOrder).toEqual(['hints', ...OLD_ORDER]);
    expect(migrateHintsSection({ ...cust, homeSectionOrder: [], hintsSectionMigrated: false }).homeSectionOrder).toEqual([]);
    const moved = [...OLD_ORDER, 'hints'];
    expect(migrateHintsSection({ ...cust, homeSectionOrder: moved, hintsSectionMigrated: false }).homeSectionOrder).toEqual(moved);
    expect(migrateHintsSection({ ...cust, homeSectionOrder: OLD_ORDER, hintsSectionMigrated: true }).homeSectionOrder).toEqual(OLD_ORDER);
    expect(migrateHintsSection({ ...cust, homeSectionOrder: OLD_ORDER, hintsSectionMigrated: false }).hintsSectionMigrated).toBe(true);
  });

  it('non-admin: a global order from before the section puts hints first, nothing is written', async () => {
    ha = fakeHA(false);
    ha.system.set(G.GLOBAL_KEY, oldDoc(OLD_ORDER));
    await startAs(USER);
    expect(useSettingsStore.getState().customization.homeSectionOrder[0]).toBe('hints');
    expect(ha.systemWrites).toHaveLength(0);
  });

  it('non-admin: hints the admin moved (marker set) stay where the admin put them', async () => {
    ha = fakeHA(false);
    const base = doc().settings;
    const moved = [...OLD_ORDER, 'hints'];
    ha.system.set(G.GLOBAL_KEY, doc({ settings: { ...base, customization: { ...base.customization, homeSectionOrder: moved, hintsSectionMigrated: true } } }));
    await startAs(USER);
    expect(useSettingsStore.getState().customization.homeSectionOrder).toEqual(moved);
  });

  it('admin: the migration settles in one write at most — no ping-pong', async () => {
    ha = fakeHA(true);
    ha.system.set(G.GLOBAL_KEY, oldDoc(OLD_ORDER));
    await startAs(ADMIN);
    await G.flushGlobalPush();
    await G.flushGlobalPush();
    expect(ha.systemWrites.length).toBeLessThanOrEqual(1);
    expect(useSettingsStore.getState().customization.homeSectionOrder[0]).toBe('hints');
  });
});
