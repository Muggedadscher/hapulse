/**
 * useDevices — builds the device view models for the Devices page.
 *
 * Device structure depends on the registries + hidden list (not live states), so
 * it's memoised and only rebuilt when those change — live states are read by the
 * cards/modal at render time. A short, animated "loading" phase backs the page's
 * progress bar: registries can take a while to arrive on large installs, and the
 * one-time build/first-render of many devices is non-trivial.
 */

import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { buildDeviceModels, summarizeDevices } from '@hapulse/core';
import type { DeviceModel, DevicesSummary } from '@hapulse/core';
import { useEntityStore } from '../stores/entityStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useEditingEnabled } from './managedHooks'; // [fork]
import { isHaCameraEntity, useCameraSource } from '../nvr/cameraSource'; // [fork]

const EMPTY_SUMMARY: DevicesSummary = { integrations: 0, devices: 0, entities: 0, rooms: 0 };

export interface UseDevicesResult {
  state: 'loading' | 'ready';
  /** 0–100 for the loading bar. */
  progress: number;
  devices: DeviceModel[];
  summary: DevicesSummary;
}

export function useDevices(): UseDevicesResult {
  const registries = useEntityStore((s) => s.registries);
  const hiddenEntities = useSettingsStore(useShallow((s) => s.customization.hiddenEntities));
  const editingEnabled = useEditingEnabled(); // [fork] admins only under global management
  const cameraSource = useCameraSource(); // [fork] HA camera entities are left out while Sentinel is the source

  const devices = useMemo(
    () =>
      registries
        ? buildDeviceModels(registries, useEntityStore.getState().entities, [ // [fork] + camera.* with Sentinel
            ...(editingEnabled ? [] : hiddenEntities),
            ...(cameraSource === 'sentinel' ? registries.entities.map((e) => e.entity_id).filter(isHaCameraEntity) : []),
          ])
        : [],
    [registries, hiddenEntities, editingEnabled, cameraSource],
  );

  const summary = useMemo(() => summarizeDevices(devices), [devices]);

  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Registries not loaded yet — stay at the start of the bar.
    if (registries == null) {
      setReady(false);
      setProgress(0);
      return;
    }
    setReady(false);
    setProgress(12);
    const t1 = setTimeout(() => setProgress(64), 90);
    const t2 = setTimeout(() => setProgress(100), 240);
    const t3 = setTimeout(() => setReady(true), 440);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [registries, hiddenEntities, editingEnabled, devices.length]);

  return {
    state: ready ? 'ready' : 'loading',
    progress,
    devices,
    summary: registries ? summary : EMPTY_SUMMARY,
  };
}
