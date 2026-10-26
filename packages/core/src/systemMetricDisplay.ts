/**
 * [fork] How the System page's monitor card names and sizes a System Monitor metric. DOM-free.
 *
 * NAMES: Home Assistant composes `friendly_name` from the device's name and the entity's own name
 * ("System Monitor Prozessornutzung"). On a card that already says "Systemmonitor" the prefix only pushes the part that
 * tells the metrics apart out of the row, so it is dropped. A name the user gave the entity without that prefix is kept
 * as it is.
 *
 * SIZES: System Monitor reports memory and disk space in binary units (MiB, GiB). Apple shows storage in decimal units
 * with a short number ("3,3 GB", like ByteCountFormatter's file style), so the Glas style converts them.
 */

import type { HassEntity, Registries } from './types.js';
import { formatNumber } from './numberFormat.js';

/** Returns the display name of a System Monitor entity, without its device's name in front. */
export function systemMetricNamer(registries: Registries | null | undefined): (entity: HassEntity) => string {
  const deviceNames = new Map<string, string>();
  for (const d of registries?.devices ?? []) {
    const name = d.name_by_user || d.name;
    if (name) deviceNames.set(d.id, name);
  }
  const prefixOf = new Map<string, string>();
  for (const e of registries?.entities ?? []) {
    const name = e.device_id ? deviceNames.get(e.device_id) : undefined;
    if (name) prefixOf.set(e.entity_id, `${name.replace(/_/g, ' ')} `);
  }

  return (entity) => {
    const full = (
      (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id.split('.')[1] ?? entity.entity_id
    ).replace(/_/g, ' ');
    const prefix = prefixOf.get(entity.entity_id);
    if (prefix && full.startsWith(prefix) && full.length > prefix.length) return full.slice(prefix.length).trim() || full;
    return full;
  };
}

const BYTES_PER_UNIT: Record<string, number> = {
  B: 1,
  kB: 1e3,
  KB: 1e3,
  MB: 1e6,
  GB: 1e9,
  TB: 1e12,
  KiB: 1024,
  MiB: 1024 ** 2,
  GiB: 1024 ** 3,
  TiB: 1024 ** 4,
};

/** The entity's value in bytes, when it is a data size (not a rate) with a known unit; otherwise null. */
export function dataSizeBytes(entity: HassEntity): number | null {
  const unit = entity.attributes.unit_of_measurement as string | undefined;
  const factor = unit ? BYTES_PER_UNIT[unit] : undefined;
  if (factor === undefined) return null;
  const value = parseFloat(entity.state);
  return Number.isFinite(value) ? value * factor : null;
}

/** A byte count in decimal units: one decimal below 100 GB/TB ("3,3 GB"), whole numbers otherwise ("512 MB"). */
export function formatDataSize(bytes: number, locale?: string): string {
  const steps: [number, string][] = [
    [1e12, 'TB'],
    [1e9, 'GB'],
    [1e6, 'MB'],
    [1e3, 'kB'],
  ];
  for (const [size, unit] of steps) {
    // the next unit starts where the smaller one would round to 1000 ("999,6 MB" → "1,0 GB", not "1000 MB")
    if (Math.abs(bytes) >= size * 0.9995) {
      const v = bytes / size;
      const decimals = size >= 1e9 && Math.abs(Math.round(v * 10) / 10) < 100 ? 1 : 0;
      return `${formatNumber(v, locale, { minDecimals: decimals, maxDecimals: decimals })} ${unit}`;
    }
  }
  return `${formatNumber(bytes, locale, { maxDecimals: 0 })} B`;
}
