/**
 * [fork] Setting up a room's heating plan with one button (rules: @hapulse/core heatingSetup.ts; plan
 * glas/heizung-zeitplan/PLAN-ETAPPE-4.md in the project files; docs/HEIZPLAN.md).
 *
 * Admins only: helpers, schedules, labels, categories and the entity registry are written over the WebSocket, the
 * automation over REST (`POST /api/config/automation/config/<id>`, HA has no WebSocket command for it). A browser may
 * call HA's REST API only from an allowed CORS origin (HA ≥ 2026.8: Settings → System → Network → HTTP server; before,
 * `http: cors_allowed_origins` in configuration.yaml); `checkHeatingSetup` tries a harmless GET
 * first, so a setup without it never leaves half an entry behind. Every step looks first whether its entry exists:
 * a setup that stopped halfway finishes on the next press without doubles (fixed automation id per area, helpers by
 * their storage id). Saving an automation makes HA send `automation_reloaded`, and every room's automation sets its
 * plan value again; the window says so.
 *
 * In demo mode the setup creates the entries locally (demoHeatingSetup).
 */

import {
  demoHeatingSetup,
  findHeatingPlans,
  HEATING_AUTOMATION_CATEGORY,
  HEATING_BLUEPRINT_PATH,
  HEATING_HELPER_CATEGORY,
  HEATING_PLAN_LABEL,
  HEATING_PLAN_LABEL_NAME,
  HEATING_PLAN_SAVE_AUTOMATION,
  HEATING_SKIP_LABEL,
  HEATING_SKIP_LABEL_NAME,
  heatingAutomationConfig,
  heatingCoveredThermostats,
  heatingRelatedIds,
  heatingRoomSlug,
  heatingSetupAutomationId,
  heatingSetupIds,
  heatingSuffixedEntityId,
} from '@hapulse/core';
import type { EntityRegistryEntry, HAConnection, HeatingSetupIds, HeatingStoredItem, Registries } from '@hapulse/core';
import { getLiveConnection, useConnectionStore } from '../stores/connectionStore';
import { useEntityStore } from '../stores/entityStore';

/** Why the window cannot offer the button. */
export type HeatingSetupProblem = 'cors' | 'blueprint' | 'saver' | 'denied' | 'offline';

/** The steps of a setup, for the progress line and the error. */
export type HeatingSetupStep = 'prepare' | 'helpers' | 'schedule' | 'automation' | 'finish';

export class HeatingSetupError extends Error {
  constructor(
    readonly step: HeatingSetupStep,
    readonly problem: HeatingSetupProblem | null = null,
    cause?: unknown,
  ) {
    super(`heating setup failed at ${step}`, { cause });
  }
}

export interface HeatingSetupRequest {
  areaId: string;
  roomName: string;
  thermostats: string[];
  contacts: string[];
  comfort: number;
  eco: number;
  min: number;
  max: number;
  step: number;
  /** The automation's description (in the UI language, with the thermostats' state before). */
  description: string;
}

/** How long to wait for HA to add a new entry to the entity registry (an automation loads after the POST answers). */
const REGISTRY_WAIT_MS = 15_000;
const REGISTRY_POLL_MS = 400;

const isDemo = () => useConnectionStore.getState().demo;

function liveConnection(): HAConnection {
  const conn = getLiveConnection();
  if (!conn) throw new HeatingSetupError('prepare', 'offline');
  return conn;
}

// ---------------------------------------------------------------------------
// Which thermostats a plan controls
// ---------------------------------------------------------------------------

/**
 * The thermostats an automation from the blueprint uses: one `search/related` for the blueprint, one per automation
 * (every user may ask). Null when HA does not answer, then no room counts as missing a plan.
 */
export async function loadHeatingCoverage(): Promise<Set<string> | null> {
  if (isDemo()) {
    const registries = useEntityStore.getState().registries;
    if (!registries) return null;
    const plans = findHeatingPlans(registries);
    return new Set(Object.values(plans).flatMap((p) => p.thermostats));
  }
  const conn = getLiveConnection();
  if (!conn) return null;
  try {
    const blueprint = await conn.sendMessage({ type: 'search/related', item_type: 'automation_blueprint', item_id: HEATING_BLUEPRINT_PATH });
    const automations = heatingRelatedIds(blueprint, 'automation');
    const related = await Promise.all(
      automations.map((id) => conn.sendMessage({ type: 'search/related', item_type: 'automation', item_id: id })),
    );
    return heatingCoveredThermostats(related);
  } catch (err) {
    console.warn('[HAPulse] heating setup: search/related failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// REST
// ---------------------------------------------------------------------------

async function rest(conn: HAConnection, method: 'GET' | 'POST', path: string, body?: unknown): Promise<Response> {
  const auth = await conn.restAuth();
  if (!auth) throw new HeatingSetupError('prepare', 'cors');
  const headers: Record<string, string> = { Authorization: `Bearer ${auth.accessToken}` };
  if (body === undefined) return fetch(`${auth.hassUrl}${path}`, { method, headers });
  headers['Content-Type'] = 'application/json';
  return fetch(`${auth.hassUrl}${path}`, { method, headers, body: JSON.stringify(body) });
}

const automationPath = (areaId: string) => `/api/config/automation/config/${encodeURIComponent(heatingSetupAutomationId(areaId))}`;

/** A GET on the room's automation config: 200 or 404 = REST works; a network error with a live WebSocket = CORS. */
async function probeRest(conn: HAConnection, areaId: string): Promise<HeatingSetupProblem | null> {
  let res: Response;
  try {
    res = await rest(conn, 'GET', automationPath(areaId));
  } catch (err) {
    if (err instanceof HeatingSetupError) return err.problem;
    return 'cors';
  }
  if (res.status === 401 || res.status === 403) return 'denied';
  return res.ok || res.status === 404 ? null : 'cors';
}

/** What keeps the window from offering the button; empty = ready. */
export async function checkHeatingSetup(areaId: string): Promise<HeatingSetupProblem[]> {
  if (isDemo()) return [];
  const conn = getLiveConnection();
  if (!conn) return ['offline'];
  const problems: HeatingSetupProblem[] = [];
  if (!useEntityStore.getState().entities[HEATING_PLAN_SAVE_AUTOMATION]) problems.push('saver');
  try {
    const blueprints = await conn.sendMessage<Record<string, { error?: unknown }>>({ type: 'blueprint/list', domain: 'automation' });
    const entry = blueprints?.[HEATING_BLUEPRINT_PATH];
    if (!entry || entry.error !== undefined) problems.push('blueprint');
  } catch {
    problems.push('denied');
  }
  const restProblem = await probeRest(conn, areaId);
  if (restProblem && !problems.includes(restProblem)) problems.push(restProblem);
  return problems;
}

// ---------------------------------------------------------------------------
// The setup
// ---------------------------------------------------------------------------

interface NamedEntry {
  id: string;
  name: string;
}

async function ensureLabel(conn: HAConnection, id: string, name: string): Promise<string> {
  const labels = await conn.sendMessage<{ label_id: string }[]>({ type: 'config/label_registry/list' });
  if (labels.some((l) => l.label_id === id)) return id;
  const created = await conn.sendMessage<{ label_id: string }>({ type: 'config/label_registry/create', name });
  return created.label_id;
}

async function ensureCategory(conn: HAConnection, scope: string, name: string): Promise<string> {
  const list = await conn.sendMessage<{ category_id: string; name: string }[]>({ type: 'config/category_registry/list', scope });
  const found = list.find((c) => c.name === name);
  if (found) return found.category_id;
  const created = await conn.sendMessage<{ category_id: string }>({ type: 'config/category_registry/create', scope, name });
  return created.category_id;
}

const entityList = (conn: HAConnection) => conn.sendMessage<EntityRegistryEntry[]>({ type: 'config/entity_registry/list' });

function storedItems(items: NamedEntry[], platform: string, entries: readonly EntityRegistryEntry[]): HeatingStoredItem[] {
  return items.map((item) => ({
    id: item.id,
    areaId: entries.find((e) => e.platform === platform && e.unique_id === item.id)?.area_id ?? null,
  }));
}

/** The registry entry of `platform`/`uniqueId`; waits while HA is still adding it. */
async function waitForEntry(conn: HAConnection, platform: string, uniqueId: string): Promise<EntityRegistryEntry> {
  const until = Date.now() + REGISTRY_WAIT_MS;
  for (;;) {
    const entry = (await entityList(conn)).find((e) => e.platform === platform && e.unique_id === uniqueId);
    if (entry) return entry;
    if (Date.now() > until) throw new Error(`no registry entry for ${platform} ${uniqueId}`);
    await new Promise((resolve) => setTimeout(resolve, REGISTRY_POLL_MS));
  }
}

/** Area, label and category of a new entry; labels are added to the ones it has. */
async function placeEntry(conn: HAConnection, entry: EntityRegistryEntry, areaId: string, label: string, scope: string, category: string) {
  const labels = [...new Set([...(entry.labels ?? []), label])];
  await conn.sendMessage({ type: 'config/entity_registry/update', entity_id: entry.entity_id, area_id: areaId, labels, categories: { [scope]: category } });
}

async function step<T>(name: HeatingSetupStep, onStep: ((s: HeatingSetupStep) => void) | undefined, run: () => Promise<T>): Promise<T> {
  onStep?.(name);
  try {
    return await run();
  } catch (err) {
    if (err instanceof HeatingSetupError) throw err;
    console.warn(`[HAPulse] heating setup: ${name} failed:`, err);
    throw new HeatingSetupError(name, null, err);
  }
}

const displayName = (kind: 'comfort' | 'eco' | 'schedule', room: string) =>
  kind === 'schedule' ? `Zeitplan Heizung ${room}` : `Heizplan ${room} ${kind === 'comfort' ? 'Komfort' : 'Eco'}`;

/**
 * Create what the room's plan needs (heatingSetup.ts) and refresh the registries, so the room shows its plan card.
 * Throws HeatingSetupError with the step that failed; pressing again continues there.
 */
export async function runHeatingSetup(req: HeatingSetupRequest, onStep?: (s: HeatingSetupStep) => void): Promise<void> {
  if (isDemo()) {
    runDemoSetup(req);
    return;
  }
  const conn = liveConnection();
  const slug = heatingRoomSlug(req.roomName);

  const prep = await step('prepare', onStep, async () => {
    const problem = await probeRest(conn, req.areaId);
    if (problem) throw new HeatingSetupError('prepare', problem);
    const label = await ensureLabel(conn, HEATING_PLAN_LABEL, HEATING_PLAN_LABEL_NAME);
    const automationCategory = await ensureCategory(conn, 'automation', HEATING_AUTOMATION_CATEGORY);
    const helperCategory = await ensureCategory(conn, 'helpers', HEATING_HELPER_CATEGORY);
    const [numbers, schedules, entries] = await Promise.all([
      conn.sendMessage<NamedEntry[]>({ type: 'input_number/list' }),
      conn.sendMessage<NamedEntry[]>({ type: 'schedule/list' }),
      entityList(conn),
    ]);
    const ids: HeatingSetupIds = heatingSetupIds(slug, req.areaId, storedItems(numbers, 'input_number', entries), storedItems(schedules, 'schedule', entries));
    return { label, automationCategory, helperCategory, ids, numbers: new Map(numbers.map((n) => [n.id, n])), schedules: new Map(schedules.map((s) => [s.id, s])) };
  });

  // Helpers: created with the id as name (umlauts as ae/…), then named; a value only for a new one
  const helperIds = await step('helpers', onStep, async () => {
    const out: Record<'comfort' | 'eco', string> = { comfort: '', eco: '' };
    for (const kind of ['comfort', 'eco'] as const) {
      const id = prep.ids[kind];
      const fields = { min: req.min, max: req.max, step: req.step, mode: 'slider', unit_of_measurement: '°C', icon: kind === 'comfort' ? 'mdi:sun-thermometer' : 'mdi:leaf' };
      const existing = prep.numbers.get(id);
      const created = !existing;
      // still named by its id: an earlier setup stopped before naming it
      if (!existing || existing.name === id) {
        const item = existing ?? (await conn.sendMessage<NamedEntry>({ type: 'input_number/create', name: id, ...fields }));
        await conn.sendMessage({ type: 'input_number/update', input_number_id: item.id, name: displayName(kind, req.roomName), ...fields });
      }
      let entry = await waitForEntry(conn, 'input_number', id);
      const suffix = kind === 'comfort' ? '_komfort' : '_eco';
      // also the states: a YAML entity has no registry entry but holds its id
      const taken = new Set([...(await entityList(conn)).map((e) => e.entity_id), ...Object.keys(useEntityStore.getState().entities)]);
      const rename = heatingSuffixedEntityId(entry.entity_id, suffix, taken);
      if (rename) {
        await conn.sendMessage({ type: 'config/entity_registry/update', entity_id: entry.entity_id, new_entity_id: rename });
        entry = { ...entry, entity_id: rename };
      }
      await placeEntry(conn, entry, req.areaId, prep.label, 'helpers', prep.helperCategory);
      if (created) await conn.callService('input_number', 'set_value', { value: kind === 'comfort' ? req.comfort : req.eco }, { entity_id: entry.entity_id });
      out[kind] = entry.entity_id;
    }
    return out;
  });

  const scheduleId = await step('schedule', onStep, async () => {
    const id = prep.ids.schedule;
    const existing = prep.schedules.get(id);
    if (!existing || existing.name === id) {
      const item = existing ?? (await conn.sendMessage<NamedEntry>({ type: 'schedule/create', name: id, icon: 'mdi:calendar-clock' }));
      // a schedule's update takes the whole schedule (missing days become empty): its periods go along
      const { id: _id, name: _name, ...periods } = item as NamedEntry & Record<string, unknown>;
      await conn.sendMessage({ type: 'schedule/update', ...periods, schedule_id: item.id, name: displayName('schedule', req.roomName), icon: 'mdi:calendar-clock' });
    }
    const entry = await waitForEntry(conn, 'schedule', id);
    await placeEntry(conn, entry, req.areaId, prep.label, 'helpers', prep.helperCategory);
    return entry.entity_id;
  });

  await step('automation', onStep, async () => {
    const config = heatingAutomationConfig({
      roomName: req.roomName,
      description: req.description,
      thermostats: req.thermostats,
      contacts: req.contacts,
      schedule: scheduleId,
      comfort: helperIds.comfort,
      eco: helperIds.eco,
      comfortValue: req.comfort,
      ecoValue: req.eco,
    });
    const res = await rest(conn, 'POST', automationPath(req.areaId), config);
    if (res.status === 401 || res.status === 403) throw new HeatingSetupError('automation', 'denied');
    if (!res.ok) throw new Error(`automation config: HTTP ${res.status} ${await res.text().catch(() => '')}`);
    const entry = await waitForEntry(conn, 'automation', heatingSetupAutomationId(req.areaId));
    await placeEntry(conn, entry, req.areaId, prep.label, 'automation', prep.automationCategory);
    // the room holds its value at once instead of at the next change
    await conn.callService('automation', 'trigger', undefined, { entity_id: entry.entity_id });
  });

  await step('finish', onStep, async () => {
    const entries = await entityList(conn);
    for (const id of req.thermostats) {
      const entry = entries.find((e) => e.entity_id === id);
      if (entry?.labels?.includes(HEATING_SKIP_LABEL)) {
        await conn.sendMessage({ type: 'config/entity_registry/update', entity_id: id, labels: entry.labels.filter((l) => l !== HEATING_SKIP_LABEL) });
      }
    }
    await refreshRegistries(conn);
  });
}

/** "Nicht einrichten" (skip = true) or its undo: the label "Ohne Heizplan" on the room's thermostats. */
export async function setHeatingSetupSkipped(thermostats: readonly string[], skip: boolean): Promise<void> {
  if (isDemo()) {
    const { registries, setRegistries } = useEntityStore.getState();
    if (!registries) return;
    setRegistries({ ...registries, entities: registries.entities.map((e) => (thermostats.includes(e.entity_id) ? withLabel(e, skip) : e)) });
    return;
  }
  const conn = liveConnection();
  const label = skip ? await ensureLabel(conn, HEATING_SKIP_LABEL, HEATING_SKIP_LABEL_NAME) : HEATING_SKIP_LABEL;
  const entries = await entityList(conn);
  for (const id of thermostats) {
    const entry = entries.find((e) => e.entity_id === id);
    if (!entry) continue;
    const labels = skip ? [...new Set([...(entry.labels ?? []), label])] : (entry.labels ?? []).filter((l) => l !== label);
    await conn.sendMessage({ type: 'config/entity_registry/update', entity_id: id, labels });
  }
  await refreshRegistries(conn);
}

function withLabel(entry: EntityRegistryEntry, on: boolean): EntityRegistryEntry {
  const labels = (entry.labels ?? []).filter((l) => l !== HEATING_SKIP_LABEL);
  return { ...entry, labels: on ? [...labels, HEATING_SKIP_LABEL] : labels };
}

/** The registries are read once per connection; after a setup HAPulse needs the new entries. */
async function refreshRegistries(conn: HAConnection): Promise<void> {
  const registries: Registries = await conn.fetchRegistries();
  useEntityStore.getState().setRegistries(registries);
}

function runDemoSetup(req: HeatingSetupRequest): void {
  const { entities, registries, setEntities, setRegistries } = useEntityStore.getState();
  if (!registries) return;
  const slug = heatingRoomSlug(req.roomName);
  const stored = (platform: string) =>
    registries.entities.filter((e) => e.platform === platform).map((e) => ({ id: e.entity_id.split('.')[1] ?? '', areaId: e.area_id }));
  const ids = heatingSetupIds(slug, req.areaId, stored('input_number'), stored('schedule'));
  const next = demoHeatingSetup(
    entities,
    registries.entities.map((e) => (req.thermostats.includes(e.entity_id) ? withLabel(e, false) : e)),
    {
      areaId: req.areaId,
      roomName: req.roomName,
      automation: `automation.advanced_heating_${slug}`,
      schedule: `schedule.${ids.schedule}`,
      comfort: `input_number.${ids.comfort}`,
      eco: `input_number.${ids.eco}`,
      comfortValue: req.comfort,
      ecoValue: req.eco,
      min: req.min,
      max: req.max,
      step: req.step,
    },
    new Date(),
  );
  setEntities(next.entities);
  setRegistries({ ...registries, entities: next.entries });
}
