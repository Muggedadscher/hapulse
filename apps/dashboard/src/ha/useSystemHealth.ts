/**
 * useSystemHealth — derives the overall "Home Status" shown in the Devices hero.
 *
 * Note: this is NOT a shared source of truth today — AppLayout.tsx recomputes
 * the same status independently for the sidebar pill, and SystemHeroCard
 * doesn't call this hook at all. Unifying those is a refactor of its own.
 *
 * Health from System Monitor CPU/RAM/disk thresholds, plus low batteries and
 * unavailable entities (respecting hiddenEntities).
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { indexSystemMonitor, pickSystemMetrics } from '@hapulse/core';
import { useEntityStore } from '../stores/entityStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { TKey } from '../i18n/useT';

export type SystemHealth = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface SystemHealthInfo {
  health: SystemHealth;
  /** i18n key for the status label; consumer calls t(titleKey, { count: titleCount }). */
  titleKey: TKey;
  /** Present only for the pluralized branches (unavailable / lowBattery). */
  titleCount?: number | undefined;
}

export function useSystemHealth(): SystemHealthInfo {
  const { entities, registries } = useEntityStore(
    useShallow((s) => ({ entities: s.entities, registries: s.registries })),
  );
  const hiddenEntities = useSettingsStore(useShallow((s) => s.customization.hiddenEntities));

  return useMemo(() => {
    const index = indexSystemMonitor(registries);
    const all = Object.values(entities);
    const sys = all.filter((e) => index.ids.has(e.entity_id));

    const { cpu, memory: mem, disk } = pickSystemMetrics(sys, index);

    const cpuVal = cpu ? parseFloat(cpu.state) : NaN;
    const memVal = mem ? parseFloat(mem.state) : NaN;
    const diskVal = disk ? parseFloat(disk.state) : NaN;
    const hasMetrics = !isNaN(cpuVal) || !isNaN(memVal) || !isNaN(diskVal);

    const metricsCrit =
      (!isNaN(cpuVal) && cpuVal > 90) ||
      (!isNaN(memVal) && memVal > 90) ||
      (!isNaN(diskVal) && diskVal > 90);
    const metricsWarn =
      (!isNaN(cpuVal) && cpuVal > 75) ||
      (!isNaN(memVal) && memVal > 80) ||
      (!isNaN(diskVal) && diskVal > 80);

    const hidden = new Set(hiddenEntities);
    const lowBatteries = all.filter(
      (e) =>
        e.entity_id.startsWith('sensor.') &&
        (e.attributes.device_class as string | undefined) === 'battery' &&
        !hidden.has(e.entity_id) &&
        parseFloat(e.state) <= 20,
    ).length;
    const unavailable = all.filter(
      (e) => e.state === 'unavailable' && !hidden.has(e.entity_id),
    ).length;

    const health: SystemHealth =
      metricsCrit ? 'critical' :
      metricsWarn || unavailable > 0 || lowBatteries > 0 ? 'warning' :
      hasMetrics ? 'healthy' : 'unknown';

    const titleKey: TKey =
      metricsCrit ? 'nav.systemStatus.critical' :
      metricsWarn ? 'nav.systemStatus.warning' :
      unavailable > 0 ? 'nav.systemStatus.unavailable' :
      lowBatteries > 0 ? 'nav.systemStatus.lowBattery' :
      hasMetrics ? 'nav.systemStatus.healthy' : 'nav.systemStatus.unknown';
    const titleCount =
      unavailable > 0 ? unavailable :
      lowBatteries > 0 ? lowBatteries : undefined;

    return { health, titleKey, titleCount };
  }, [entities, registries, hiddenEntities]);
}
