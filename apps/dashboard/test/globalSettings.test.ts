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
