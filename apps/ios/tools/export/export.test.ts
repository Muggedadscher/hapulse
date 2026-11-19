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

  it('golden: rooms', () => {
    // the demo home, plus a small registry with every rule of buildRooms in it
    const demo = core.buildRooms(core.DEMO_REGISTRIES, core.DEMO_ENTITIES);
    const ent = (entity_id: string, extra: Record<string, unknown> = {}) => ({
      entity_id, area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null,
      original_name: null, icon: null, ...extra,
    });
    const registries = {
      areas: [
        { area_id: 'kueche', name: 'Küche', icon: 'mdi:stove' },
        { area_id: 'bad', name: 'bad', picture: '/api/image/bad.png' },
        { area_id: 'arbeit', name: 'Arbeitszimmer' },
        { area_id: 'zebra', name: 'Zimmer 10' },
        { area_id: 'zebra2', name: 'Zimmer 9' },
        { area_id: 'leer', name: 'Ärger' },
      ],
      devices: [
        { id: 'd1', area_id: 'kueche', name: 'Hue' },
        { id: 'd2', area_id: null, name: 'Zone' },
      ],
      entities: [
        ent('light.a', { area_id: 'kueche' }),
        ent('light.b', { device_id: 'd1' }),
        ent('light.c', { device_id: 'd1', area_id: 'bad' }),
        ent('light.d', { device_id: 'd2' }),
        ent('light.hidden', { area_id: 'kueche', hidden_by: 'user' }),
        ent('light.disabled', { area_id: 'kueche', disabled_by: 'integration' }),
        ent('sensor.diag', { area_id: 'kueche', entity_category: 'diagnostic' }),
        ent('sensor.t', { area_id: 'kueche' }),
        ent('sensor.h', { area_id: 'kueche' }),
        ent('climate.k', { area_id: 'kueche' }),
        ent('automation.plan', { area_id: 'kueche', labels: ['heizplan'] }),
        ent('switch.plan', { area_id: 'kueche', labels: ['heizplan'] }),
        ent('media_player.m', { area_id: 'bad' }),
        ent('binary_sensor.motion', { area_id: 'bad' }),
        ent('sensor.nostate', { area_id: 'bad' }),
        ent('light.ghost', { area_id: 'gone' }),
      ],
    };
    const st = (state: string, attributes: Record<string, unknown> = {}) => ({ state, attributes });
    const states: Record<string, unknown> = {
      'light.a': st('on'), 'light.b': st('off'), 'light.c': st('on'), 'light.d': st('on'),
      'light.hidden': st('on'), 'light.disabled': st('on'), 'sensor.diag': st('1'),
      'sensor.t': st('21.5', { device_class: 'temperature' }), 'sensor.h': st('n/a', { device_class: 'humidity' }),
      'climate.k': st('heat', { current_temperature: 19, hvac_action: 'heating' }),
      'automation.plan': st('on'), 'switch.plan': st('on'),
      'media_player.m': st('playing'), 'binary_sensor.motion': st('on', { device_class: 'motion' }),
    };
    const rooms = core.buildRooms(registries, states);
    const summaries = (list: { id: string }[], map: Record<string, unknown>) =>
      Object.fromEntries(list.map((r) => [r.id, core.roomSummary(r, map)]));
    // the fixture's keys get sorted: keep the order the room page iterates the domains in
    const domainOrders = (list: { id: string; domains: Record<string, string[]> }[]) =>
      Object.fromEntries(list.map((r) => [r.id, Object.keys(r.domains)]));
    writeJson(join(FIX, 'rooms.json'), {
      cases: { registries, states, rooms, summaries: summaries(rooms, states), domainOrders: domainOrders(rooms) },
      demo: { rooms: demo, summaries: summaries(demo, core.DEMO_ENTITIES), domainOrders: domainOrders(demo) },
    });
  });

  it('golden: room sections', () => {
    // random rooms with every domain the page groups, hidden/stored/edit variants, garage covers
    let seed = 7;
    const r = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    const DOM = ['scene', 'light', 'climate', 'humidifier', 'media_player', 'cover', 'switch', 'fan', 'input_boolean',
      'button', 'vacuum', 'sensor', 'binary_sensor', 'camera', 'lock', 'weather', 'number'];
    const KEYS = [...core.ROOM_SECTION_ORDER, 'bogus'];
    const sections = [];
    for (let t = 0; t < 300; t++) {
      const domains: Record<string, string[]> = {};
      const entities: Record<string, unknown> = {};
      const all: string[] = [];
      const nd = r(8);
      for (let d = 0; d < nd; d++) {
        const dom = DOM[r(DOM.length)]!;
        const ids: string[] = [];
        for (let k = 0; k < 1 + r(4); k++) {
          const id = `${dom}.e${r(6)}`;
          if (ids.includes(id)) continue;
          ids.push(id);
          all.push(id);
          const attributes = dom === 'cover' && r(2) ? { device_class: ['garage', 'gate', 'blind'][r(3)] } : {};
          if (r(5)) entities[id] = { entity_id: id, state: 'on', attributes };
        }
        domains[dom] = ids;
      }
      const pick = () => all.filter(() => r(3) === 0).sort(() => r(3) - 1);
      const input = {
        domains, entities, hiddenEntities: pick(), editMode: !!r(2), sentinel: !!r(2),
        cameraIds: r(2) ? ['cam1', 'cam2'].slice(0, r(3)) : [],
        storedEntityOrder: r(3) ? pick() : undefined,
        storedSectionOrder: r(3) ? KEYS.filter(() => r(2)).sort(() => r(3) - 1) : undefined,
        heatingPlan: !!r(2),
      };
      const out = core.roomSections(input as Parameters<typeof core.roomSections>[0]);
      // the fixture's keys get sorted: keep the order the page iterates the domains in
      Object.assign(input, { domainOrder: Object.keys(domains) });
      const key = KEYS[r(KEYS.length)]!;
      const moved = pick();
      sections.push({ input, out, combined: { key, ids: moved, result: core.combinedEntityOrder(key, moved, out.snapshot) } });
    }
    const names: [string, string][] = [
      ['Küche Decke', 'Küche'], ['Küche', 'Küche'], ['Deckenlicht Küche links', 'küche'], ['Bad Spiegel (bad)', 'bad'],
      ['Ärger Lampe', 'Ärger'], ['Lampe Ärger', 'Ärger'], ['Badezimmer Licht', 'Bad'], ['Licht', ''],
      ['Zimmer 9 Licht', 'Zimmer 9'], ['A.B Licht', 'A.B'], ['AxB Licht', 'A.B'], ['Wohnzimmer  Stehlampe  Wohnzimmer', 'Wohnzimmer'],
      ['Tür (Flur)', 'Flur'], ['Flur-Licht', 'Flur'], ['Flur_Licht', 'Flur'], ['Café Licht', 'Café'], ['Licht Café', 'Café'],
      ['STUDIO lamp', 'studio'], ['Kinderzimmer Nachtlicht', 'Kinder'], ['Licht (x)', '(x)'], ['Licht x)', 'x)'],
    ];
    const strip = names.map(([name, room]) => ({ name, room, result: core.stripRoomName(name, room) }));
    writeJson(join(FIX, 'roomSections.json'), { sections, strip });
  });

  it('room look: tables and golden cases', () => {
    // the tables the app reads (keyword order matters: first match wins)
    writeJson(join(RES, 'roomIcons.json'), {
      keywords: core.ROOM_KEYWORDS, mdi: core.MDI_TO_LUCIDE, iconByKind: core.ICON_BY_KIND,
      canonical: core.CANONICAL_ROOM_ICONS,
    });
    const variants = (k: string) => [k, k.toUpperCase(), `Mein ${k}-Raum`, k.replace(/ /g, '-'), k.replace(/ /g, '’')];
    const names = [
      ...core.ROOM_KEYWORDS.flatMap((k) => variants(k.keyword)),
      'Küche', 'Wohnzimmer', 'Schlafzimmer', 'Bad', 'Gäste-WC', 'Salle d’Eau', 'Séjour', 'Entrée', 'Chambre d’enfant',
      'Sous-sol', 'Garde-manger', 'Dépendance', 'Living Room', 'STUDY', 'Kid’s room', 'Hallway 2', 'Büro', '', '   ',
      'Ærøskøbing', 'ﬁtness', 'İstanbul', 'Straße', 'cafe\u0301', 'Wcfoo', 'Ötztal',
    ];
    const icons = [
      undefined, null, '', ...Object.keys(core.MDI_TO_LUCIDE).flatMap((k) => [k, `mdi:${k}`]),
      ...core.CANONICAL_ROOM_ICONS.flatMap((k) => [k, `mdi:${k}`]), 'mdi:unknown-thing', 'hass:sofa', 'MDI:sofa',
    ];
    const kinds = names.map((name) => ({ name, kind: core.roomKind(name) }));
    const iconCases = [
      ...icons.map((icon) => ({ name: 'Küche', icon, result: core.roomIconName({ name: 'Küche', icon }) })),
      ...icons.slice(0, 8).map((icon) => ({ name: 'Kitchen', icon, result: core.roomIconName({ name: 'Kitchen', icon }) })),
      ...names.map((name) => ({ name, icon: null, result: core.roomIconName({ name, icon: null }) })),
    ];

    // rooms with temperature/humidity sensors, thermostats, openings and garage doors
    const st = (state: string, attributes: Record<string, unknown> = {}) => ({ state, attributes });
    const entities: Record<string, unknown> = {
      'sensor.oven': st('180', { device_class: 'temperature', unit_of_measurement: '°C' }),
      'sensor.t': st('21.5', { device_class: 'temperature', unit_of_measurement: '°C' }),
      'sensor.t_bad': st('unavailable', { device_class: 'temperature', unit_of_measurement: '°C' }),
      'sensor.t_nounit': st('19.25abc', { device_class: 'temperature', unit_of_measurement: '' }),
      'sensor.h': st('48', { device_class: 'humidity', unit_of_measurement: '%' }),
      'sensor.h2': st('n/a', { device_class: 'humidity' }),
      'sensor.h3': st('55.5', { device_class: 'humidity', unit_of_measurement: '%' }),
      'sensor.power': st('12', { device_class: 'power' }),
      'climate.a': st('heat', { current_temperature: 20.5, hvac_action: 'heating' }),
      'climate.b': st('off', { current_temperature: null }),
      'climate.c': st('auto', {}),
      'climate.d': st('heat_cool', { hvac_action: 'cooling', current_temperature: 23 }),
      'climate.e': st('unavailable', { hvac_action: 'idle' }),
      'binary_sensor.door': st('on', { device_class: 'door' }),
      'binary_sensor.door_off': st('off', { device_class: 'door' }),
      'binary_sensor.gd': st('on', { device_class: 'garage_door' }),
      'binary_sensor.win': st('on', { device_class: 'window' }),
      'binary_sensor.opening': st('on', { device_class: 'opening' }),
      'binary_sensor.wet': st('on', { device_class: 'moisture' }),
      'binary_sensor.smoke': st('on', { device_class: 'smoke' }),
      'cover.garage': st('opening', { device_class: 'garage' }),
      'cover.gate': st('closed', { device_class: 'gate' }),
      'cover.gate_unknown': st('unknown', { device_class: 'gate' }),
      'cover.blind': st('open', { device_class: 'blind' }),
      'light.dim': st('on', { brightness: 128 }),
      'light.min': st('on', { brightness: 1 }),
      'light.max': st('on', { brightness: 255 }),
      'light.over': st('on', { brightness: 300 }),
      'light.nob': st('on', {}),
      'light.off': st('off', { brightness: 200 }),
      'light.str': st('on', { brightness: '128' }),
      'light.half': st('on', { brightness: 1.275 }),
    };
    for (const [id, e] of Object.entries(entities)) Object.assign(e as object, { entity_id: id });
    const room = (id: string, domains: Record<string, string[]>, extra: string[] = []) => ({
      id, name: id, icon: null, picture: null, entityIds: [...Object.values(domains).flat(), ...extra], domains,
    });
    const rooms = [
      room('kitchen', { sensor: ['sensor.oven', 'sensor.t', 'sensor.h'], climate: ['climate.a'] }),
      room('bad', { sensor: ['sensor.t_bad', 'sensor.h2', 'sensor.h3'], climate: ['climate.b', 'climate.a'] }),
      room('nounit', { sensor: ['sensor.t_nounit', 'sensor.power'] }),
      room('missing', { sensor: ['sensor.gone', 'sensor.t'], climate: ['climate.gone', 'climate.d'] }),
      room('empty', {}),
      room('open', { binary_sensor: ['binary_sensor.win', 'binary_sensor.wet', 'binary_sensor.door'] }),
      room('garage', { binary_sensor: ['binary_sensor.smoke'], cover: ['cover.gate', 'cover.garage'] }),
      room('quiet', { binary_sensor: ['binary_sensor.door_off', 'binary_sensor.opening', 'binary_sensor.smoke'],
        cover: ['cover.blind', 'cover.gate_unknown'] }),
      room('gd', { binary_sensor: ['binary_sensor.wet', 'binary_sensor.gd'] }),
      room('diag', {}, ['binary_sensor.door', 'sensor.t']),
    ];
    const sources: unknown[] = [undefined, null, 42, 'sensor.oven', 'sensor.t', 'sensor.t_bad', 'sensor.h', 'sensor.power',
      'climate.a', 'climate.b', 'climate.d', 'sensor.gone', 'climate.gone', 'sensor.elsewhere'];
    const temps = rooms.map((r) => {
      const summary = core.roomSummary(r, entities as never);
      return {
        room: r,
        sources: core.roomTemperatureSources(r, entities as never),
        status: core.roomStatusIconName(r, entities as never),
        bySource: sources.map((source) => ({
          source: source === undefined ? '__undefined__' : source,
          temperature: core.roomTemperature(r, entities as never, source),
          glances: core.roomGlances(r, entities as never, source),
          summary: core.withRoomTemperature(summary, r, entities as never, source),
        })),
      };
    });
    const ids = Object.keys(entities);
    const lights = ids.filter((id) => id.startsWith('light.')).map((id) => ({ id, percent: core.lightPercent(entities[id] as never) }));
    const tones = ids.filter((id) => id.startsWith('climate.')).map((id) => ({ id, tone: core.climateTone(entities[id] as never) }));
    writeJson(join(FIX, 'roomLook.json'), { kinds, icons: iconCases, entities, temps, lights, tones });
  });

  it('golden: entity display', () => {
    const st = (entity_id: string, state: string, attributes: Record<string, unknown> = {}) =>
      ({ entity_id, state, attributes, last_changed: FIXED_NOW, last_updated: FIXED_NOW, context: { id: 'x', parent_id: null, user_id: null } });
    const classes: Record<string, (string | undefined)[]> = {
      binary_sensor: [undefined, 'door', 'window', 'motion', 'smoke', 'moisture', 'lock', 'presence', 'opening', 'garage_door', 'foo'],
      sensor: [undefined, 'temperature', 'humidity', 'power', 'energy', 'illuminance', 'battery', 'pressure', 'timestamp',
        'voltage', 'current', 'co2', 'carbon_dioxide', 'gas', 'foo'],
      cover: [undefined, 'blind', 'curtain', 'garage', 'gate', 'shutter'],
    };
    const domains = ['light', 'switch', 'fan', 'climate', 'humidifier', 'cover', 'media_player', 'camera', 'lock',
      'alarm_control_panel', 'weather', 'person', 'sun', 'input_boolean', 'script', 'automation', 'scene', 'binary_sensor',
      'sensor', 'number', 'input_number', 'counter', 'siren', 'vacuum', 'select', 'update', 'xyz'];
    const states = ['on', 'off', 'unavailable', 'unknown', 'open', 'closed', 'unlocked', 'locked', 'playing', 'paused',
      'idle', 'standby', 'disarmed', 'armed_home', 'cleaning', 'returning', 'heat', 'fan_only', 'clear-night', '',
      '21.5', '-3.5', ' 7 ', '1e3', '12abc', '-0.004', '1234567.891', '.5', '5.', '__x__', 'élan', 'ßtraße', '😀 smile',
      '2026-06-15T09:41:00+00:00', '2026-06-15', 'not a date'];
    const units: unknown[] = [undefined, null, '°C', '', 0, 'kWh'];
    const entities = [];
    let n = 0;
    for (const d of domains) for (const dc of classes[d] ?? [undefined]) for (const s of states) {
      const unit = units[n++ % units.length];
      const attributes: Record<string, unknown> = {};
      if (dc !== undefined) attributes['device_class'] = dc;
      if (unit !== undefined) attributes['unit_of_measurement'] = unit;
      entities.push(st(`${d}.e${n}`, s, attributes));
    }
    // a few of Home Assistant's own state words, and the web's fallback chain (`useStateLabel`)
    const res: Record<string, string> = {
      'component.light.entity_component._.state.on': 'An',
      'component.binary_sensor.entity_component._.state.on': 'Ein',
      'component.binary_sensor.entity_component.door.state.on': 'Offen',
      'component.climate.entity_component._.state.fan_only': 'Nur Lüfter',
      'component.climate.entity_component._.state_attributes.hvac_action.state.heating': 'Heizt',
      'component.weather.entity_component._.state.clear-night': 'Klare Nacht',
    };
    const out: Record<string, unknown> = {};
    for (const locale of core.LOCALES) {
      const dict = JSON.parse(readFileSync(join(ROOT, 'packages/core/locales', `${locale}.json`), 'utf8')) as Record<string, string>;
      const fallback = JSON.parse(readFileSync(join(ROOT, 'packages/core/locales', 'en.json'), 'utf8')) as Record<string, string>;
      const label = (domain: string, state: string, opts?: { deviceClass?: string | undefined; attribute?: string | undefined }) => {
        if (!state) return '';
        const ha = core.lookupEntityState(res, domain, state, opts);
        if (ha !== undefined) return ha;
        return dict[`entityState.${state}`] ?? fallback[`entityState.${state}`] ?? core.humanizeState(state);
      };
      out[locale] = entities.map((e) => [core.formatEntityState(e as never, locale, label), core.formatEntityState(e as never, locale)]);
    }
    const meta = entities.map((e) => ({ icon: core.domainIcon(e as never), favorite: core.isFavoriteRelevant(e as never) }));
    const humanize = states.map((s) => [s, core.humanizeState(s)]);
    const attr = [['climate', 'heating', 'hvac_action'], ['climate', 'cooling', 'hvac_action'], ['light', 'on', undefined]]
      .map(([d, s, a]) => [d, s, a ?? null, core.lookupEntityState(res, d!, s!, { attribute: a })]);
    writeJson(join(FIX, 'entityDisplay.json'), { entities, res, formatted: out, meta, humanize, attr });
  });

  it('golden: sentinel', async () => {
    const api = await import('@sentinel-nvr/web/api');
    const inputs = ['', '   ', 'nvr.example.com', 'https://NVR.Example.com:443/', 'http://192.0.2.10:10443',
      'https://192.0.2.10:10443/endpoint/@local/sentinel-nvr/public/?token=abc&embed=1',
      'https://proxy.example/scrypted/endpoint/@local/sentinel-nvr/', 'https://h/a//endpoint/x?token=%20t%2Fx%20',
      'https://h/?token=a+b', 'https://h/?token=', 'not a url', 'ftp://x.example'];
    const setup = inputs.map((input) => ({ input, out: api.parseSentinelSetup(input) }));
    const urls = [
      { origin: 'https://h:10443', prefix: '', token: 'tok', path: 'api/cameras' },
      { origin: 'https://h:10443/', prefix: '/scrypted/', token: 'a b/ü+&', path: 'api/snapshot?camera=33' },
      { origin: 'https://h', prefix: '', token: '', path: 'api/stats' },
    ].map((c) => ({
      ...c,
      publicBase: api.sentinelPublicBase(c.origin, c.prefix),
      loginBase: api.sentinelLoginBase(c.origin, c.prefix),
      url: api.sentinelUrl(api.sentinelPublicBase(c.origin, c.prefix), c.token, c.path),
      timeline: api.sentinelTimelineLink(c.origin, 'cam 3/ä', 1781516460123.6, c.prefix),
      timelineNow: api.sentinelTimelineLink(c.origin, '33', undefined, c.prefix),
    }));
    const client = new api.SentinelClient('https://h:10443', 't/k n', { prefix: '/p' });
    const clientUrls = {
      base: client.base, entry: client.entryUrl,
      snapshot: client.snapshotUrl('33'), snapshotW: client.snapshotUrl('a b', 1781516460123, 640.4),
      evthumb: client.eventThumbUrl('33', 1781516460123.5), evframe: client.eventFrameUrl('33', 17), thumb: client.segmentThumbUrl('x/y'),
      signaling: client.signalingUrl('33'), signalingParams: client.signalingUrl('3 3', { compat: '1', noaudio: 'a&b' }),
    };
    const states = [
      { recording: false, online: true }, { recording: true, online: false, stalled: true },
      { recording: true, online: false }, { recording: true, online: true }, { recording: true, online: true, stalled: false },
    ].map((cam) => ({ cam, out: api.sentinelRecordingState(cam) }));
    writeJson(join(FIX, 'sentinel.json'), { setup, urls, client: clientUrls, states });
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
    // the tables the Swift port reads at run time (so defaults and scopes are never maintained twice)
    writeJson(join(RES, 'settings.json'), {
      customization: D, themes: core.THEME_NAMES, locales: core.LOCALES, navOrderV2Head: core.NAV_ORDER_V2_HEAD,
      userKeys: core.USER_CUSTOMIZATION_KEYS, secretKeys: core.SECRET_CUSTOMIZATION_KEYS,
      globalTop: core.GLOBAL_TOP_KEYS, userTop: core.USER_TOP_KEYS, deviceTop: core.DEVICE_TOP_KEYS,
    });
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
