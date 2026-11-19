/**
 * [fork] iOS app generator. Writes everything the Swift code takes over from the web code, so texts, colours, icons and
 * rules are not maintained twice by hand:
 *
 *   Packages/HAPulseKit/Sources/HAPulseKit/Data/locales/*.json   texts (copy of packages/core/locales)
 *   Packages/HAPulseKit/Sources/HAPulseKit/Data/locales/case/*.json
 *   Packages/HAPulseKit/Sources/HAPulseKit/Data/demo.json        demo home at a fixed clock
 *   Packages/HAPulseKit/Sources/HAPulseKit/Generated/GlasColors.swift  colour table of the style Glas
 *   Packages/HAPulseKit/Sources/HAPulseKit/Data/icons.json       Lucide/MDI icons listed in apps/ios/icons.json
 *   Packages/HAPulseKit/Tests/HAPulseKitTests/Fixtures/*.json         golden cases computed by the TypeScript code
 *
 * Every output is deterministic (sorted keys, fixed clock), so `git diff` after a run shows real changes only.
 * Run: npx vitest run --config apps/ios/tools/export/vitest.config.mts (from the repo root). See apps/ios/README.md.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../../..', import.meta.url));
const IOS = join(ROOT, 'apps/ios');
const KIT = join(IOS, 'Packages/HAPulseKit');
const RES = join(KIT, 'Sources/HAPulseKit/Data');
const GEN = join(KIT, 'Sources/HAPulseKit/Generated');
const FIX = join(KIT, 'Tests/HAPulseKitTests/Fixtures');
const CORE = join(ROOT, 'packages/core');

/** The demo home and every golden case are computed at this instant (Berlin: Monday 15 June 2026, 11:41). */
export const FIXED_NOW = '2026-06-15T09:41:00.000Z';

// ---------------------------------------------------------------------------------------------------------------
// Deterministic JSON
// ---------------------------------------------------------------------------------------------------------------

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) out[k] = sortKeys((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}

function writeJson(path: string, value: unknown, sort = true): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(sort ? sortKeys(value) : value, null, 2) + '\n');
}

function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

/** Removes the files of a generated folder that this run did not write again (a dropped locale, icon list …). */
function resetDir(path: string): void {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

// ---------------------------------------------------------------------------------------------------------------

type Core = typeof import('../../../../packages/core/src/index');
let core: Core;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(FIXED_NOW));
  // imported after the clock is fixed: demo.ts stamps its entities at module load
  core = await import('../../../../packages/core/src/index');
});

afterAll(() => {
  vi.useRealTimers();
});

describe('iOS export', () => {
  it('texts', () => {
    const out = join(RES, 'locales');
    resetDir(out);
    const src = join(CORE, 'locales');
    for (const f of readdirSync(src).filter((n) => n.endsWith('.json'))) {
      writeJson(join(out, f), JSON.parse(readFileSync(join(src, f), 'utf8')));
    }
    for (const f of readdirSync(join(src, 'case')).filter((n) => n.endsWith('.json'))) {
      writeJson(join(out, 'case', f), JSON.parse(readFileSync(join(src, 'case', f), 'utf8')));
    }
    expect(readdirSync(out).length).toBeGreaterThan(core.LOCALES.length);
  });

  it('demo home', () => {
    writeJson(join(RES, 'demo.json'), {
      now: FIXED_NOW,
      registries: core.DEMO_REGISTRIES,
      entities: core.DEMO_ENTITIES,
      notifications: core.DEMO_NOTIFICATIONS,
    });
  });

  it('glas colours', () => {
    const modes = ['light', 'dark'] as const;
    const keys = Object.keys(core.GLAS_COLORS.light).sort();
    const skipped: string[] = [];
    const rows: string[] = [];
    const table: Record<string, Record<string, [number, number, number, number]>> = { light: {}, dark: {} };
    for (const key of keys) {
      const vals = modes.map((m) => {
        const raw = core.GLAS_COLORS[m][key as keyof typeof core.GLAS_COLORS.light];
        const plain = raw.startsWith('color-mix(') ? core.resolveMix(raw) : raw;
        return core.parseColor(plain);
      });
      if (vals.some((v) => v === null)) { skipped.push(key); continue; }
      modes.forEach((m, i) => {
        const c = vals[i]!;
        table[m]![key] = [c.r, c.g, c.b, c.a];
      });
      rows.push(key);
    }
    const num = (n: number) => (Number.isInteger(n) ? `${n}` : `${n}`);
    const lit = (c: [number, number, number, number]) => `RGBA(${num(c[0])}, ${num(c[1])}, ${num(c[2])}, ${num(c[3])})`;
    const swift = [
      '// Generated by apps/ios/tools/export (glasTokens.ts → GLAS_COLORS). Do not edit.',
      '// Values that are not plain colours (shadows) are left out: ' + (skipped.join(', ') || 'none') + '.',
      '',
      '/// The colour names of the style Glas, as in `packages/core/src/glasTokens.ts`.',
      'public enum GlasColor: String, CaseIterable, Sendable {',
      ...rows.map((k) => `    case ${k}`),
      '}',
      '',
      'extension GlasColor {',
      '    /// Light and dark value, 0…255 per channel, alpha 0…1.',
      '    public var values: (light: RGBA, dark: RGBA) {',
      '        switch self {',
      ...rows.map((k) => `        case .${k}: return (${lit(table.light![k]!)}, ${lit(table.dark![k]!)})`),
      '        }',
      '    }',
      '}',
      '',
    ].join('\n');
    writeText(join(GEN, 'GlasColors.swift'), swift);
    expect(rows.length).toBeGreaterThan(80);
  });

  it('icons', async () => {
    const list = JSON.parse(readFileSync(join(IOS, 'icons.json'), 'utf8')) as { lucide: string[]; mdi: string[] };
    const require = createRequire(join(ROOT, 'apps/dashboard/package.json'));
    const lucideDir = join(dirname(require.resolve('lucide-react/package.json')), 'dist/esm/icons');
    const mdi = (await import(join(dirname(require.resolve('@mdi/js/package.json')), 'mdi.js'))) as Record<string, string>;
    const icons: Record<string, { kind: 'stroke' | 'fill'; paths: string[] }> = {};
    for (const name of [...new Set(list.lucide)].sort()) {
      const mod = (await import(join(lucideDir, `${name}.mjs`))) as { __iconData: { node: [string, Record<string, string>][] } };
      icons[`lucide.${name}`] = { kind: 'stroke', paths: mod.__iconData.node.map(([tag, a]) => toPath(tag, a)) };
    }
    for (const name of [...new Set(list.mdi)].sort()) {
      const d = mdi[name];
      if (typeof d !== 'string') throw new Error(`unknown MDI icon ${name}`);
      icons[`mdi.${name}`] = { kind: 'fill', paths: [d] };
    }
    writeJson(join(RES, 'icons.json'), icons);
    expect(Object.keys(icons).length).toBe(new Set(list.lucide).size + new Set(list.mdi).size);
  });

  it('golden: number format', () => {
    const values = [0, 1, -1, 0.5, 1.5, -0.04, -0.05, 2.25, 2.35, 1.005, 12.345, 999.95, 1000, 1250, 1250.5, 9999, 10000,
      12345.678, 1234567.891, -1234.5, 0.125, 21, 21.04, 1e9];
    const opts = [{}, { maxDecimals: 0 }, { maxDecimals: 2 }, { minDecimals: 1 }, { minDecimals: 1, maxDecimals: 1 },
      { maxDecimals: 3 }, { minDecimals: 2, maxDecimals: 2 }];
    const cases = [];
    for (const locale of core.LOCALES) for (const value of values) for (const o of opts) {
      cases.push({ locale, value, opts: o, out: core.formatNumber(value, locale, o) });
    }
    writeJson(join(FIX, 'numberFormat.json'), cases, false);
  });

  it('golden: plural categories', () => {
    const values = [0, 1, 2, 3, 5, 11, 21, 100, 101, 1000, 1000000, 2000000, 1000001, 0.5, 1.5, 2.5];
    const cases = [];
    for (const locale of core.LOCALES) for (const value of values) {
      cases.push({ locale, value, category: new Intl.PluralRules(locale).select(value) });
    }
    writeJson(join(FIX, 'plural.json'), cases, false);
  });

  it('golden: translate', () => {
    const dicts: Record<string, Record<string, string>> = {};
    for (const l of core.LOCALES) {
      const base = JSON.parse(readFileSync(join(CORE, 'locales', `${l}.json`), 'utf8')) as Record<string, string>;
      const fix = JSON.parse(readFileSync(join(CORE, 'locales/case', `${l}.json`), 'utf8')) as Record<string, string>;
      dicts[l] = core.withCase(base, fix);
    }
    const en = dicts.en!;
    // keys with variables and plural forms, picked by shape so the list follows the locale files
    const all = Object.keys(en).sort();
    const pluralKeys = [...new Set(all.filter((k) => /\.(one|other)$/.test(k)).map((k) => k.replace(/\.(one|other)$/, '')))].slice(0, 25);
    const varKeys = all.filter((k) => /\{\w+\}/.test(en[k]!) && !/\.(one|other|few|many|zero|two)$/.test(k)).slice(0, 25);
    const plainKeys = all.filter((k) => !/\{\w+\}/.test(en[k]!)).filter((_, i) => i % 97 === 0);
    const varsOf = (k: string): Record<string, string | number> => {
      const out: Record<string, string | number> = {};
      for (const m of (en[k] ?? '').matchAll(/\{(\w+)\}/g)) out[m[1]!] = m[1] === 'count' ? 3 : 2.5;
      return out;
    };
    const cases = [];
    for (const l of core.LOCALES) {
      const dict = dicts[l]!;
      for (const key of plainKeys) cases.push({ locale: l, key, out: core.translate(dict, en, l, key) });
      for (const key of varKeys) cases.push({ locale: l, key, vars: varsOf(key), out: core.translate(dict, en, l, key, varsOf(key)) });
      for (const key of pluralKeys) for (const count of [0, 1, 2, 5, 1000000]) {
        cases.push({ locale: l, key, vars: { count }, out: core.translate(dict, en, l, key, { count }) });
      }
      cases.push({ locale: l, key: 'ios.does.not.exist', out: core.translate(dict, en, l, 'ios.does.not.exist') });
      cases.push({ locale: l, key: varKeys[0]!, vars: {}, out: core.translate(dict, en, l, varKeys[0]!, {}) });
    }
    writeJson(join(FIX, 'translate.json'), cases, false);
  });

  it('golden: language choice', () => {
    const prefs = ['auto', 'de', 'fr', 'en'] as const;
    const has = [null, 'de', 'de-AT', 'nl', 'fr-CA', ''];
    const navs = [[], ['de-DE'], ['nl-NL', 'sv-SE'], ['pt-BR', 'en']];
    const cases = [];
    for (const pref of prefs) for (const ha of has) for (const nav of navs) {
      cases.push({ pref, ha, nav, out: core.resolveLanguage(pref, ha, nav) });
    }
    writeJson(join(FIX, 'resolveLanguage.json'), cases, false);
  });

  it('golden: accent', () => {
    const hues: (number | null)[] = [null];
    for (let h = 0; h < 360; h += 1) hues.push(h);
    hues.push(-30, 400, 12.5, 359.6);
    const cases = [];
    for (const mode of ['light', 'dark'] as const) for (const hue of hues) {
      cases.push({ mode, hue, out: core.glasAccent(hue ?? undefined, mode) });
    }
    writeJson(join(FIX, 'glasAccent.json'), cases, false);
  });

  it('golden: subscribe_entities', async () => {
    // The library's own reducer (home-assistant-js-websocket processEvent) behind a fake connection: the Swift
    // EntityStore must turn the same compressed messages into the same states.
    const { subscribeEntities } = await import('home-assistant-js-websocket');
    let push: ((ev: unknown) => void) | undefined;
    const conn = {
      haVersion: '2026.11.0',
      connected: true,
      addEventListener() {},
      removeEventListener() {},
      subscribeMessage: async (cb: (ev: unknown) => void) => {
        push = cb;
        return () => {};
      },
    };
    let last: unknown = null;
    subscribeEntities(conn as never, (e) => (last = e));
    await Promise.resolve();
    const events: unknown[] = [
      {
        a: {
          'light.kitchen': { s: 'on', a: { brightness: 180, friendly_name: 'Küche' }, c: 'ctx1', lc: 1781516460.123456 },
          'sensor.power': { s: '412.5', a: { unit_of_measurement: 'W' }, c: { id: 'ctx2', parent_id: 'p', user_id: null }, lc: 1781516400, lu: 1781516455.5 },
          'switch.pump': { s: 'off', a: {}, c: 'ctx3', lc: 1781510000.999 },
        },
      },
      { c: { 'light.kitchen': { '+': { s: 'off', lc: 1781516470.25, c: 'ctx4', a: { brightness: null } } } } },
      { c: { 'sensor.power': { '+': { s: '415', lu: 1781516480.75 } } } },
      { c: { 'light.kitchen': { '-': { a: ['brightness'] } }, 'switch.pump': { '+': { c: { user_id: 'u1' } } } } },
      { c: { 'climate.unknown': { '+': { s: 'heat' } } } },
      { r: ['switch.pump'], a: { 'cover.garage': { s: 'closed', a: { device_class: 'garage' }, c: 'ctx5', lc: 1781516490 } } },
      { c: { 'cover.garage': { '+': { s: 'opening', a: { current_position: 10 }, lc: 1781516500.0005 }, '-': { a: ['device_class'] } } } },
    ];
    const cases = [];
    for (const ev of events) {
      push!(ev);
      cases.push({ event: ev, state: JSON.parse(JSON.stringify(last)) });
    }
    writeJson(join(FIX, 'entities.json'), cases);
  });

  it('golden: settings', () => {
    const D = core.DEFAULT_CUSTOMIZATION;
    const OLD_CHIPS = ['people', 'lights', 'doors', 'alarm', 'media'];
    const OLD_ORDER = ['hero', 'scenes', 'security', 'rooms'];
    const base: core.ScopedState = {
      theme: 'aurora', mode: 'light', appIconHidden: false, language: 'auto', customization: D,
    };
    const synced = { ...D, scryptedUrl: 'https://nvr.example.com', scryptedToken: 'tok-device', maServerUrl: 'http://ma.local:8095', maToken: 'ma-device' };
    const migrated = { ...D, poolChipMigrated: true, garageChipMigrated: true, locksChipMigrated: true, wasteSectionMigrated: true,
      nvrSectionMigrated: true, hintsSectionMigrated: true, navOrderV2Migrated: true };

    const hydrate = [
      undefined,
      {},
      { homeChips: OLD_CHIPS, homeSectionOrder: OLD_ORDER, navOrder: ['energy', 'pool', 'overview', 'music'] },
      { homeChips: [], homeSectionOrder: [], navOrder: [] },
      { scryptedUrl: 'https://nvr.example.com/endpoint/x/public/?token=abc&x=1', scryptedToken: '' },
      { ...migrated, homeChips: ['people'], homeSectionOrder: ['rooms'] },
      { favorites: ['light.a'], uiStyle: 'glas', unknownKey: 5 },
    ].map((input) => ({ input: input ?? null, out: core.hydrateCustomization(input) }));

    const imports = [
      { cur: synced, raw: { scryptedUrl: 'https://nvr.example.com/', maServerUrl: 'http://ma.local:8095' } },
      { cur: synced, raw: { scryptedUrl: 'https://other.example.com', maServerUrl: 'http://other:8095' } },
      { cur: synced, raw: { scryptedUrl: 'https://other.example.com?token=fromurl', maToken: 'ma-explicit' } },
      { cur: D, raw: { favorites: ['a', 2], entityOrder: { k: ['x', 'y'], bad: [1], worse: 'no' }, roomOrder: 'nope', hiddenRooms: ['r1'] } },
      { cur: D, raw: { scryptedUrl: 123, weatherEntity: null, libraryPlayerId: 7, uiStyle: ['glas'], reduceTransparency: 'yes' } },
      { cur: D, raw: { homeChips: OLD_CHIPS, homeSectionOrder: ['hero', 'security'], navOrder: ['music', 'rooms'] } },
      { cur: D, raw: null },
    ].map((c) => ({ ...c, out: core.importedCustomization(c.cur, c.raw) }));

    const g = (customization: Record<string, unknown>, top: Partial<core.GlobalSettingsPayload> = {}): core.GlobalSettingsPayload => ({
      theme: 'ocean', mode: 'dark', accentHue: 210, appName: 'Haus', appIcon: 'zap', appIconHidden: false,
      customization: customization as core.GlobalSettingsPayload['customization'], ...top,
    });
    const curMigrated: core.ScopedState = { ...base, accentHue: 40, appName: 'Alt', customization: { ...migrated, favorites: ['light.mine'], scryptedToken: 'tok' } };
    const globals = [
      { cur: base, payload: g({ uiStyle: 'glas', glassStrength: 'tinted' }) },
      { cur: curMigrated, payload: g({ homeChips: OLD_CHIPS, homeSectionOrder: OLD_ORDER }) },
      { cur: curMigrated, payload: g({ favorites: ['light.admin'], scryptedToken: 'leak', maToken: 'leak', hiddenRooms: ['x'] }) },
      { cur: curMigrated, payload: g({}, { theme: 'dusk' as never, mode: 'bogus' as never, accentHue: null, appName: null, appIcon: null }) },
      { cur: { ...curMigrated, customization: { ...curMigrated.customization, uiStyle: 'glas' } }, payload: g({ roomOrder: 'bad', navOrder: ['pool'] }) },
    ].map((c) => ({ ...c, out: core.applyGlobalSettings(c.cur, c.payload) }));

    const users = [
      { cur: base, payload: { v: 1, language: 'de', userName: 'Jan', favorites: ['light.a'], libraryPlayerId: 'media_player.k', detailHistoryRange: '7d', editingEnabled: false } },
      { cur: { ...base, userName: 'Alt', language: 'fr' as const }, payload: { language: 'xx', userName: null, favorites: [1, 2] } },
      { cur: { ...base, userName: 'Alt' }, payload: { favorites: 'nope', detailHistoryRange: 30 } },
    ].map((c) => ({ ...c, out: core.applyUserSettings(c.cur, c.payload as Partial<core.UserSettingsPayload>) }));

    const secretsCur = { scryptedToken: 'own', maToken: 'ownma' };
    const shared = [
      { secrets: { scryptedToken: 'shared', maToken: null }, keepOwn: false },
      { secrets: { scryptedToken: 5, maToken: 'm' }, keepOwn: true },
      { secrets: null, keepOwn: true },
      { secrets: null, keepOwn: false },
    ].map((c) => ({ cur: secretsCur, ...c, out: core.sharedSecretsFor(secretsCur, c.secrets as core.SharedSecrets | null, c.keepOwn) }));

    const urls = ['', 'nvr.example.com', 'https://NVR.Example.com:10443/x?token=a', 'http://192.0.2.4:8095', 'not a url', '  https://a.b  ',
      'https://h/p?token=abc', 'https://h/p?x=1&token=a%20b&y=2#frag', 'https://h/p?token=&y=1', 'https://h/?a=1&token=t'];
    const secrets = urls.map((u) => ({ input: u, origin: core.originOf(u), split: core.splitUrlToken(u) }));

    const st: core.ScopedState = { ...curMigrated, userName: 'Jan', language: 'de', customization: { ...curMigrated.customization, maToken: 'm' } };
    const ex = core.extractGlobal(st);
    const changed = { ...ex, accentHue: 300, customization: { ...ex.customization, uiStyle: 'glas', hiddenRooms: ['a'] } };
    const diff = core.diffGlobal(ex, changed);
    const scope = {
      userKeys: core.USER_CUSTOMIZATION_KEYS, secretKeys: core.SECRET_CUSTOMIZATION_KEYS,
      globalTop: core.GLOBAL_TOP_KEYS, userTop: core.USER_TOP_KEYS, deviceTop: core.DEVICE_TOP_KEYS,
      state: st, extractGlobal: ex, extractUser: core.extractUser(st), extractSecrets: core.extractSecrets(st),
      changed, diff, hasChanges: core.hasChanges(diff), noChanges: core.hasChanges(core.diffGlobal(ex, ex)),
      merged: core.mergeGlobal({ ...ex, mode: 'auto' }, diff),
      validDoc: [
        { doc: { v: 1, rev: 3, activatedAt: 'a', updatedAt: 'b', activatedBy: { id: 'i', name: 'n' }, updatedBy: { id: 'i', name: 'n' },
          settings: ex, userDefaults: { favorites: [], language: 'auto' }, shareSecrets: false }, ok: true },
        { doc: { v: 2 }, ok: false },
        { doc: { v: 1, rev: '3' }, ok: false },
      ].map((c) => ({ doc: c.doc, out: core.isValidGlobalDoc(c.doc) })),
      validUser: [{ v: 1, favorites: [], language: 'de' }, { v: 1, favorites: 'x', language: 'de' }, null]
        .map((doc) => ({ doc, out: core.isValidUserPayload(doc) })),
    };

    const themes = ['aurora', 'sunset', 'ocean', 'forest', 'dusk', 'dawn', 'midnight', 'sage', 'nope', 5, null]
      .map((input) => ({ input, out: core.migrateTheme(input) ?? null }));

    writeJson(join(FIX, 'settings.json'), { defaults: D, hydrate, imports, globals, users, shared, secrets, scope, themes });
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Lucide nodes → SVG path data (so Swift needs one path parser only)
// ---------------------------------------------------------------------------------------------------------------

function n(a: Record<string, string>, k: string): number {
  const v = Number(a[k] ?? 0);
  if (!Number.isFinite(v)) throw new Error(`bad ${k}`);
  return v;
}

function toPath(tag: string, a: Record<string, string>): string {
  switch (tag) {
    case 'path':
      return a.d ?? '';
    case 'line':
      return `M${n(a, 'x1')} ${n(a, 'y1')}L${n(a, 'x2')} ${n(a, 'y2')}`;
    case 'polyline':
    case 'polygon': {
      const pts = (a.points ?? '').trim().split(/[\s,]+/).map(Number);
      let d = '';
      for (let i = 0; i + 1 < pts.length; i += 2) d += `${i === 0 ? 'M' : 'L'}${pts[i]} ${pts[i + 1]}`;
      return tag === 'polygon' ? d + 'Z' : d;
    }
    case 'circle': {
      const cx = n(a, 'cx'), cy = n(a, 'cy'), r = n(a, 'r');
      return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
    }
    case 'ellipse': {
      const cx = n(a, 'cx'), cy = n(a, 'cy'), rx = n(a, 'rx'), ry = n(a, 'ry');
      return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
    }
    case 'rect': {
      const x = n(a, 'x'), y = n(a, 'y'), w = n(a, 'width'), h = n(a, 'height');
      const rx = Math.min(a.rx !== undefined ? n(a, 'rx') : a.ry !== undefined ? n(a, 'ry') : 0, w / 2);
      const ry = Math.min(a.ry !== undefined ? n(a, 'ry') : rx, h / 2);
      if (rx === 0 || ry === 0) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}`
        + `H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
    }
    default:
      throw new Error(`unsupported Lucide element <${tag}>`);
  }
}
