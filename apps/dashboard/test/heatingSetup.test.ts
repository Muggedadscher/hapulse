import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HEATING_BLUEPRINT_PATH, HEATING_PLAN_SAVE_AUTOMATION, heatingAutomationConfig } from '@hapulse/core';
import type { EntityRegistryEntry } from '@hapulse/core';

// [fork] Setting up a room's heating plan with one button (ha/heatingSetup.ts, plan glas/heizung-zeitplan/
// PLAN-ETAPPE-4.md): against a small fake Home Assistant — what is created and how it is named and placed, an entity id
// HA had to number, a setup that stopped halfway and is pressed again, no address for REST, the checks before the button
// and "Nicht einrichten".

/** HA's slugify for the ASCII names HAPulse creates with. */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

interface Stored {
  id: string;
  name: string;
  [key: string]: unknown;
}

class FakeHa {
  labels: { label_id: string; name: string }[] = [];
  categories: Record<string, { category_id: string; name: string }[]> = {};
  numbers: Stored[] = [];
  schedules: Stored[] = [];
  entries: EntityRegistryEntry[] = [];
  automations: Record<string, Record<string, unknown>> = {};
  log: string[] = [];
  services: unknown[][] = [];
  /** The automation's registry entry appears only after this many list calls (HA loads it after answering). */
  automationDelay = 0;
  failPost: number | null = null;
  restStatus: number | null = null;
  corsBlocked = false;
  /** Ids HA's id manager already knows (a YAML helper): a new one gets `_2`. */
  reserved = new Set<string>();
  /** A registry update of this entity fails once (the connection dropped). */
  failUpdateOf: string | null = null;
  blueprintError: unknown = null;
  related: Record<string, unknown> = {};
  private pendingAutomation: { entry: EntityRegistryEntry; lists: number } | null = null;

  private register(entity_id: string, platform: string, unique_id: string) {
    let id = entity_id;
    for (let n = 2; this.entries.some((e) => e.entity_id === id); n++) id = `${entity_id}_${n}`;
    const entry: EntityRegistryEntry = {
      entity_id: id, area_id: null, device_id: null, entity_category: null, hidden_by: null, disabled_by: null,
      original_name: null, icon: null, platform, unique_id, labels: [],
    };
    return entry;
  }

  private list(): EntityRegistryEntry[] {
    if (this.pendingAutomation && this.pendingAutomation.lists-- <= 0) {
      this.entries.push(this.pendingAutomation.entry);
      this.pendingAutomation = null;
    }
    return this.entries.map((e) => ({ ...e, labels: [...(e.labels ?? [])] }));
  }

  async send(msg: { type: string; [key: string]: unknown }): Promise<unknown> {
    this.log.push(msg.type);
    switch (msg.type) {
      case 'config/label_registry/list':
        return this.labels;
      case 'config/label_registry/create': {
        const label = { label_id: slug(String(msg['name'])), name: String(msg['name']) };
        this.labels.push(label);
        return label;
      }
      case 'config/category_registry/list':
        return this.categories[String(msg['scope'])] ?? [];
      case 'config/category_registry/create': {
        const scope = String(msg['scope']);
        const c = { category_id: `cat_${scope}`, name: String(msg['name']) };
        (this.categories[scope] ??= []).push(c);
        return c;
      }
      case 'input_number/list':
        return this.numbers.map((n) => ({ ...n }));
      case 'schedule/list':
        return this.schedules.map((n) => ({ ...n }));
      case 'input_number/create':
      case 'schedule/create': {
        const domain = msg.type.split('/')[0]!;
        const { type: _t, ...fields } = msg;
        let id = slug(String(msg['name']));
        for (let n = 2; this.reserved.has(id); n++) id = `${slug(String(msg['name']))}_${n}`;
        const item = { ...fields, id, name: String(msg['name']) } as Stored;
        (domain === 'input_number' ? this.numbers : this.schedules).push(item);
        this.entries.push(this.register(`${domain}.${item.id}`, domain, item.id));
        return item;
      }
      case 'input_number/update':
      case 'schedule/update': {
        const domain = msg.type.split('/')[0]!;
        const list = domain === 'input_number' ? this.numbers : this.schedules;
        const id = String(msg[`${domain}_id`]);
        const i = list.findIndex((x) => x.id === id);
        const { type: _t, [`${domain}_id`]: _id, ...fields } = msg;
        list[i] = { ...fields, id, name: String(msg['name']) } as Stored;
        return list[i];
      }
      case 'config/entity_registry/list':
        return this.list();
      case 'config/entity_registry/update': {
        const e = this.entries.find((x) => x.entity_id === msg['entity_id']);
        if (!e) throw new Error('not found');
        if (this.failUpdateOf === e.entity_id) {
          this.failUpdateOf = null;
          throw { code: 3, message: 'Connection lost' };
        }
        if (typeof msg['new_entity_id'] === 'string') {
          if (this.entries.some((x) => x.entity_id === msg['new_entity_id'])) throw new Error('taken');
          e.entity_id = msg['new_entity_id'];
        }
        if ('area_id' in msg) e.area_id = msg['area_id'] as string | null;
        if (Array.isArray(msg['labels'])) e.labels = msg['labels'] as string[];
        if (msg['categories']) (e as EntityRegistryEntry & { categories?: unknown }).categories = msg['categories'];
        return { entity_entry: e };
      }
      case 'blueprint/list':
        if (this.blueprintError) throw this.blueprintError;
        return { [HEATING_BLUEPRINT_PATH]: { metadata: {} } };
      case 'search/related':
        return this.related[String(msg['item_id'])] ?? {};
    }
    throw new Error(`unexpected ${msg.type}`);
  }

  async fetch(url: string, init: { method: string; body?: string }): Promise<{ ok: boolean; status: number; text: () => Promise<string> }> {
    if (this.corsBlocked) throw new TypeError('Failed to fetch');
    const id = decodeURIComponent(url.split('/').pop()!);
    const res = (status: number) => ({ ok: status >= 200 && status < 300, status, text: async () => '' });
    if (this.restStatus !== null) return res(this.restStatus);
    if (init.method === 'GET') return res(this.automations[id] ? 200 : 404);
    this.log.push('POST automation');
    if (this.failPost !== null) return res(this.failPost);
    const config = JSON.parse(init.body!) as Record<string, unknown>;
    const isNew = !this.automations[id];
    this.automations[id] = config;
    if (isNew) {
      const entry = this.register(`automation.${slug(String(config['alias']).replace(/ü/g, 'u'))}`, 'automation', id);
      if (this.automationDelay > 0) this.pendingAutomation = { entry, lists: this.automationDelay };
      else this.entries.push(entry);
    }
    return res(200);
  }
}

let ha = new FakeHa();
let demo = false;
let connected = true;
let entities: Record<string, { entity_id: string; state: string; attributes: Record<string, unknown> }> = {};
let restAuthFails = false;
const setRegistries = vi.fn();

const conn = {
  sendMessage: (msg: { type: string }) => ha.send(msg),
  callService: vi.fn(async (...args: unknown[]) => {
    ha.services.push(args);
  }),
  restAuth: async () => {
    if (restAuthFails) throw new Error('refresh failed');
    return { hassUrl: 'http://ha.test', accessToken: 'token' };
  },
  fetchRegistries: async () => ({ areas: [], devices: [], entities: ha.entries }),
};

vi.mock('../src/stores/connectionStore', () => ({
  useConnectionStore: { getState: () => ({ demo }) },
  getLiveConnection: () => (connected ? conn : null),
}));
vi.mock('../src/stores/entityStore', () => ({
  useEntityStore: { getState: () => ({ entities, registries: null, setRegistries }) },
}));
vi.stubGlobal('fetch', (url: string, init: { method: string; body?: string }) => ha.fetch(url, init));

const { checkHeatingSetup, HeatingSetupError, loadHeatingCoverage, runHeatingSetup, setHeatingSetupSkipped } = await import('../src/ha/heatingSetup');

const REQUEST = {
  areaId: 'k1',
  roomName: 'Küche',
  thermostats: ['climate.kueche'],
  contacts: ['binary_sensor.kueche_fenster'],
  comfort: 20,
  eco: 20,
  min: 5,
  max: 30,
  step: 0.5,
  description: 'Heizplan Küche: … Vorher: TRV Küche Aus 5 °C.',
};

const entry = (id: string) => ha.entries.find((e) => e.entity_id === id) as (EntityRegistryEntry & { categories?: Record<string, string> }) | undefined;

beforeEach(() => {
  ha = new FakeHa();
  ha.labels.push({ label_id: 'heizplan', name: 'Heizplan' });
  ha.categories['automation'] = [{ category_id: 'cat_heizung', name: 'Heizung Zeitplan' }];
  ha.entries.push({
    entity_id: 'climate.kueche', area_id: null, device_id: 'dk', entity_category: null, hidden_by: null, disabled_by: null,
    original_name: null, icon: null, platform: 'zha', labels: ['ohne_heizplan'],
  });
  demo = false;
  connected = true;
  restAuthFails = false;
  entities = { [HEATING_PLAN_SAVE_AUTOMATION]: { entity_id: HEATING_PLAN_SAVE_AUTOMATION, state: 'on', attributes: {} } };
  setRegistries.mockClear();
  conn.callService.mockClear();
});

describe('runHeatingSetup', () => {
  it('creates the helpers, the schedule and the automation, named, in the room, with label and category', async () => {
    const steps: string[] = [];
    await runHeatingSetup(REQUEST, (s) => steps.push(s));
    expect(steps).toEqual(['prepare', 'helpers', 'schedule', 'automation', 'finish']);

    expect(ha.numbers.map((n) => [n.id, n.name, n['min'], n['max'], n['step'], n['mode'], n['unit_of_measurement']])).toEqual([
      ['heizplan_kueche_komfort', 'Heizplan Küche Komfort', 5, 30, 0.5, 'slider', '°C'],
      ['heizplan_kueche_eco', 'Heizplan Küche Eco', 5, 30, 0.5, 'slider', '°C'],
    ]);
    expect(ha.numbers.every((n) => !('initial' in n))).toBe(true);
    expect(ha.schedules.map((s) => [s.id, s.name])).toEqual([['zeitplan_heizung_kueche', 'Zeitplan Heizung Küche']]);

    for (const id of ['input_number.heizplan_kueche_komfort', 'input_number.heizplan_kueche_eco', 'schedule.zeitplan_heizung_kueche']) {
      expect(entry(id)).toMatchObject({ area_id: 'k1', labels: ['heizplan'], categories: { helpers: 'cat_helpers' } });
    }
    expect(ha.categories['helpers']).toEqual([{ category_id: 'cat_helpers', name: 'Zeitplan' }]);
    expect(entry('automation.advanced_heating_kuche')).toMatchObject({ area_id: 'k1', labels: ['heizplan'], categories: { automation: 'cat_heizung' } });

    expect(ha.automations['heizplan_k1']).toEqual(
      heatingAutomationConfig({
        roomName: 'Küche',
        description: REQUEST.description,
        thermostats: ['climate.kueche'],
        contacts: ['binary_sensor.kueche_fenster'],
        schedule: 'schedule.zeitplan_heizung_kueche',
        comfort: 'input_number.heizplan_kueche_komfort',
        eco: 'input_number.heizplan_kueche_eco',
        comfortValue: 20,
        ecoValue: 20,
      }),
    );
    expect(ha.services).toEqual([
      ['input_number', 'set_value', { value: 20 }, { entity_id: 'input_number.heizplan_kueche_komfort' }],
      ['input_number', 'set_value', { value: 20 }, { entity_id: 'input_number.heizplan_kueche_eco' }],
      ['automation', 'trigger', undefined, { entity_id: 'automation.advanced_heating_kuche' }],
    ]);
    // "Nicht einrichten" goes, the registries are read again
    expect(entry('climate.kueche')?.labels).toEqual([]);
    expect(setRegistries).toHaveBeenCalledTimes(1);
  });

  it('waits for the automation to appear in the registry', async () => {
    ha.automationDelay = 1;
    await runHeatingSetup(REQUEST);
    expect(entry('automation.advanced_heating_kuche')?.area_id).toBe('k1');
  });

  it('renames an entity id HA had to number, so it still ends with _komfort', async () => {
    ha.entries.push({
      entity_id: 'input_number.heizplan_kueche_komfort', area_id: null, device_id: null, entity_category: null, hidden_by: null,
      disabled_by: null, original_name: null, icon: null, platform: 'template', labels: [],
    });
    await runHeatingSetup(REQUEST);
    expect(entry('input_number.heizplan_kueche_2_komfort')).toMatchObject({ platform: 'input_number', unique_id: 'heizplan_kueche_komfort', area_id: 'k1' });
    expect((ha.automations['heizplan_k1']!['use_blueprint'] as { input: Record<string, unknown> }).input['input_temperature_comfort']).toBe(
      'input_number.heizplan_kueche_2_komfort',
    );
  });

  it('a setup that stopped before saving the automation continues there without doubles, with the window\'s values', async () => {
    ha.failPost = 500;
    const err = await runHeatingSetup(REQUEST).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HeatingSetupError);
    expect((err as InstanceType<typeof HeatingSetupError>).step).toBe('automation');
    expect(Object.keys(ha.automations)).toEqual([]);

    ha.failPost = null;
    ha.services.length = 0;
    await runHeatingSetup({ ...REQUEST, comfort: 22 });
    expect(ha.numbers.map((n) => n.id)).toEqual(['heizplan_kueche_komfort', 'heizplan_kueche_eco']);
    expect(ha.schedules).toHaveLength(1);
    expect(ha.log.filter((t) => t === 'input_number/create')).toHaveLength(2);
    // nothing reads the helpers before the automation is saved: they take the values of this attempt
    expect(ha.services).toEqual([
      ['input_number', 'set_value', { value: 22 }, { entity_id: 'input_number.heizplan_kueche_komfort' }],
      ['input_number', 'set_value', { value: 20 }, { entity_id: 'input_number.heizplan_kueche_eco' }],
      ['automation', 'trigger', undefined, { entity_id: 'automation.advanced_heating_kuche' }],
    ]);
    expect(ha.entries.filter((e) => e.platform === 'automation')).toHaveLength(1);
  });

  it('a setup that stopped after saving the automation places it without touching the values', async () => {
    // the automation's entry appears with the POST; its first registry update fails
    const post = ha.fetch.bind(ha);
    let posts = 0;
    ha.fetch = async (url, init) => {
      const res = await post(url, init);
      if (init.method === 'POST' && posts++ === 0) ha.failUpdateOf = 'automation.advanced_heating_kuche';
      return res;
    };
    const err = (await runHeatingSetup(REQUEST).catch((e: unknown) => e)) as InstanceType<typeof HeatingSetupError>;
    expect(err.step).toBe('automation');
    expect(entry('automation.advanced_heating_kuche')?.area_id).toBeNull();

    ha.services.length = 0;
    await runHeatingSetup({ ...REQUEST, comfort: 22 });
    expect(entry('automation.advanced_heating_kuche')).toMatchObject({ area_id: 'k1', labels: ['heizplan'] });
    expect(ha.services).toEqual([['automation', 'trigger', undefined, { entity_id: 'automation.advanced_heating_kuche' }]]);
    expect(ha.entries.filter((e) => e.platform === 'automation')).toHaveLength(1);
  });

  it('a helper still named by its id (stopped before naming it) gets its name', async () => {
    ha.numbers.push({ id: 'heizplan_kueche_komfort', name: 'heizplan_kueche_komfort', min: 5, max: 30, step: 0.5 });
    ha.entries.push({
      entity_id: 'input_number.heizplan_kueche_komfort', area_id: null, device_id: null, entity_category: null, hidden_by: null,
      disabled_by: null, original_name: null, icon: null, platform: 'input_number', unique_id: 'heizplan_kueche_komfort', labels: [],
    });
    await runHeatingSetup(REQUEST);
    expect(ha.numbers.find((n) => n.id === 'heizplan_kueche_komfort')?.name).toBe('Heizplan Küche Komfort');
    expect(ha.log.filter((t) => t === 'input_number/create')).toHaveLength(1);
    // created without `initial`, it would start at its minimum
    expect(ha.services).toContainEqual(['input_number', 'set_value', { value: 20 }, { entity_id: 'input_number.heizplan_kueche_komfort' }]);
  });

  it('a helper from YAML with the same id is left alone, the room takes the next ids', async () => {
    ha.entries.push({
      entity_id: 'input_number.heizplan_kueche_komfort', area_id: null, device_id: null, entity_category: null, hidden_by: null,
      disabled_by: null, original_name: null, icon: null, platform: 'input_number', unique_id: 'heizplan_kueche_komfort', labels: [],
    });
    await runHeatingSetup(REQUEST);
    expect(ha.numbers.map((n) => n.id)).toEqual(['heizplan_kueche_2_komfort', 'heizplan_kueche_2_eco']);
    expect(ha.schedules.map((x) => x.id)).toEqual(['zeitplan_heizung_kueche_2']);
    expect(entry('input_number.heizplan_kueche_komfort')).toMatchObject({ area_id: null, labels: [] });
  });

  it('follows the id HA stored when its id manager gave a number', async () => {
    ha.reserved.add('heizplan_kueche_komfort');
    await runHeatingSetup(REQUEST);
    expect(ha.numbers.map((n) => n.id)).toEqual(['heizplan_kueche_komfort_2', 'heizplan_kueche_eco']);
    expect(entry('input_number.heizplan_kueche_2_komfort')).toMatchObject({ unique_id: 'heizplan_kueche_komfort_2', area_id: 'k1' });
  });

  it('without REST from this address nothing is created', async () => {
    ha.corsBlocked = true;
    const err = (await runHeatingSetup(REQUEST).catch((e: unknown) => e)) as InstanceType<typeof HeatingSetupError>;
    expect(err.step).toBe('prepare');
    expect(err.problem).toBe('cors');
    expect(ha.log.some((t) => t.endsWith('/create'))).toBe(false);
  });

  it('a refused automation save names the problem', async () => {
    ha.failPost = 401;
    const err = (await runHeatingSetup(REQUEST).catch((e: unknown) => e)) as InstanceType<typeof HeatingSetupError>;
    expect([err.step, err.problem]).toEqual(['automation', 'denied']);
  });
});

describe('checkHeatingSetup', () => {
  it('ready when blueprint, save automation and REST are there', async () => {
    expect(await checkHeatingSetup('k1')).toEqual([]);
  });
  it('names what is missing', async () => {
    entities = {};
    ha.corsBlocked = true;
    expect(await checkHeatingSetup('k1')).toEqual(['saver', 'cors']);
  });
  it('a refused token is not CORS', async () => {
    ha.restStatus = 401;
    expect(await checkHeatingSetup('k1')).toEqual(['denied']);
  });
  it('any other answer means REST works (the save names its own error)', async () => {
    ha.restStatus = 500;
    expect(await checkHeatingSetup('k1')).toEqual([]);
  });
  it('a token that cannot be refreshed and a dropped connection are no connection, not CORS or rights', async () => {
    restAuthFails = true;
    ha.blueprintError = { code: 3, message: 'Connection lost' };
    expect(await checkHeatingSetup('k1')).toEqual(['offline']);
  });
  it('blueprint/list refused = no admin', async () => {
    ha.blueprintError = { code: 'unauthorized', message: 'Unauthorized' };
    expect(await checkHeatingSetup('k1')).toEqual(['denied']);
  });
  it('offline without a connection', async () => {
    connected = false;
    expect(await checkHeatingSetup('k1')).toEqual(['offline']);
  });
});

describe('loadHeatingCoverage', () => {
  it('the thermostats of the blueprint\'s automations, but not a room\'s own unfinished setup automation', async () => {
    const registries = {
      areas: [{ area_id: 'k1', name: 'Küche' }],
      devices: [{ id: 'dk', area_id: 'k1' }],
      entities: [
        ...ha.entries,
        { ...ha.entries[0]!, entity_id: 'climate.bad', device_id: null, area_id: 'b1' },
        { ...ha.entries[0]!, entity_id: 'automation.advanced_heating_kuche', platform: 'automation', unique_id: 'heizplan_k1' },
        { ...ha.entries[0]!, entity_id: 'automation.advanced_heating_bad', platform: 'automation', unique_id: '1700000000000' },
      ],
    } as unknown as Parameters<typeof loadHeatingCoverage>[0];
    ha.related = {
      [HEATING_BLUEPRINT_PATH]: { automation: ['automation.advanced_heating_kuche', 'automation.advanced_heating_bad'] },
      'automation.advanced_heating_kuche': { entity: ['climate.kueche', 'schedule.zeitplan_heizung_kueche'] },
      'automation.advanced_heating_bad': { entity: ['climate.bad'] },
    };
    expect([...((await loadHeatingCoverage(registries)) ?? [])]).toEqual(['climate.bad']);
  });
});

describe('setHeatingSetupSkipped', () => {
  it('puts the label on and takes it off again, other labels stay', async () => {
    ha.entries[0]!.labels = ['wohnen'];
    await setHeatingSetupSkipped(['climate.kueche'], true);
    expect(ha.labels.map((l) => l.label_id)).toContain('ohne_heizplan');
    expect(entry('climate.kueche')?.labels).toEqual(['wohnen', 'ohne_heizplan']);
    await setHeatingSetupSkipped(['climate.kueche'], false);
    expect(entry('climate.kueche')?.labels).toEqual(['wohnen']);
    expect(setRegistries).toHaveBeenCalledTimes(2);
  });
});
