/**
 * System Monitor metric identification.
 *
 * Home Assistant builds an entity_id from the *translated* entity name, so the
 * same sensor is `sensor.system_monitor_processor_use` on an English install and
 * `sensor.system_monitor_utilisation_du_processeur` on a French one. Matching
 * metrics with an English slug regex therefore only ever worked in English.
 *
 * The entity registry carries `translation_key` and `unique_id`, both set by the
 * integration and never translated — `config/entity_registry/list` returns them
 * (HA's `RegistryEntry.as_partial_dict`), so key off those.
 *
 * Both are needed, they are not redundant: most System Monitor sensors set a
 * translation_key, but the ones that take their name from a device_class do not
 * — `last_boot` is named through `device_class: uptime` and has translation_key
 * null, unique_id "last_boot". The entity_id is the last resort, for registries
 * that carry neither (demo data).
 */

import type { HassEntity, Registries } from './types.js';

export type SystemMetricFamily =
  | 'processor'
  | 'memory'
  | 'disk'
  | 'network'
  | 'system'
  | 'other';

export interface SystemMonitorIndex {
  /** entity_ids belonging to the systemmonitor platform. */
  ids: Set<string>;
  /** Language-independent key for an entity_id (falls back to the entity_id). */
  keyOf(entityId: string): string;
  /** Which metric family an entity belongs to. */
  familyOf(entityId: string): SystemMetricFamily;
}

function familyOfKey(key: string): SystemMetricFamily {
  if (/processor|^cpu_/.test(key)) return 'processor';
  if (/memory|swap/.test(key)) return 'memory';
  // PSI pressure metrics are grouped with the resource they stall on:
  // cpu_pressure_* → processor (above), memory_pressure_* → memory, io → disk.
  if (/disk|io_pressure/.test(key)) return 'disk';
  if (/network|throughput|packets|ipv4|ipv6/.test(key)) return 'network';
  if (/last_boot|uptime|load_/.test(key)) return 'system';
  return 'other';
}

export function indexSystemMonitor(
  registries: Registries | null | undefined,
): SystemMonitorIndex {
  const keys = new Map<string, string>();
  for (const re of registries?.entities ?? []) {
    if (re.platform !== 'systemmonitor') continue;
    keys.set(re.entity_id, re.translation_key ?? re.unique_id ?? re.entity_id);
  }
  const keyOf = (entityId: string) => keys.get(entityId) ?? entityId;
  return {
    ids: new Set(keys.keys()),
    keyOf,
    familyOf: (entityId) => familyOfKey(keyOf(entityId)),
  };
}

export interface SystemMetrics {
  cpu: HassEntity | undefined;
  memory: HassEntity | undefined;
  disk: HassEntity | undefined;
}

/**
 * The three metrics the health indicator runs on. Disk exists once per mount
 * point; the shortest entity_id is the root mount (others carry a suffix).
 */
export function pickSystemMetrics(
  entities: HassEntity[],
  index: SystemMonitorIndex,
): SystemMetrics {
  const byKey = (want: string) =>
    entities
      .filter((e) => index.keyOf(e.entity_id) === want)
      .sort((a, b) => a.entity_id.length - b.entity_id.length)[0];

  return {
    // The regex arms cover registries without translation_key/unique_id, where
    // keyOf() degrades to the entity_id.
    cpu:
      byKey('processor_use') ??
      entities.find((e) => /processor_use/.test(e.entity_id) && !/nice/.test(e.entity_id)),
    memory:
      byKey('memory_use_percent') ??
      entities.find((e) => /memory_use_percent/.test(e.entity_id)),
    disk:
      byKey('disk_use_percent') ??
      entities.find((e) => /disk_use_percent/.test(e.entity_id)),
  };
}
