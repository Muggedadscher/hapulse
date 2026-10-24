/**
 * [fork] Thermostat +/− shared by the climate card and the room hero card.
 *
 * A tap sends the next setpoint on the thermostat's step grid within its min/max (climateLogic.ts). Until HA reports
 * the new value — a Zigbee thermostat takes seconds — the value just sent is shown and the next tap builds on it, so
 * three quick taps send 6, 7, 8 and not 6 three times. The value sent is kept in a ref, read when a tap lands: two
 * taps before a re-render must still be two steps. A failed call drops it, after PENDING_MS HA's value counts again.
 */

import { useCallback, useRef, useState } from 'react';
import { callService } from '../../ha/service';
import { stepSetpoint, type ClimateSetpoint } from './climateLogic';

const PENDING_MS = 4000;

interface Pending {
  entity: string;
  value: number;
  at: number;
}

export interface ClimateStepper {
  /** The setpoint to show: the value just sent while HA has not reported it yet, otherwise HA's. */
  shownSetpoint: (entityId: string | undefined, sp: ClimateSetpoint) => number | null;
  /** One step up/down; sends set_temperature. False when nothing was sent (no single setpoint, at min/max). */
  step: (entityId: string, sp: ClimateSetpoint, dir: 1 | -1) => boolean;
}

export function useClimateStepper(): ClimateStepper {
  const pendingRef = useRef<Pending | null>(null);
  const [, setTick] = useState(0);

  const pendingFor = (entityId: string | undefined): Pending | null => {
    const pd = pendingRef.current;
    return pd && entityId && pd.entity === entityId && Date.now() - pd.at < PENDING_MS ? pd : null;
  };

  const shownSetpoint = useCallback((entityId: string | undefined, sp: ClimateSetpoint): number | null => {
    const pd = pendingFor(entityId);
    return pd && pd.value !== sp.value ? pd.value : sp.value;
  }, []);

  const step = useCallback((entityId: string, sp: ClimateSetpoint, dir: 1 | -1): boolean => {
    const pd = pendingFor(entityId);
    const base = pd ? pd.value : sp.value;
    if (base == null) return false;
    const next = stepSetpoint(base, dir, sp);
    if (next === base) return false;
    pendingRef.current = { entity: entityId, value: next, at: Date.now() };
    setTick((n) => n + 1);
    void callService('climate', 'set_temperature', { temperature: next }, { entity_id: entityId })
      .catch(() => { pendingRef.current = null; setTick((n) => n + 1); });
    return true;
  }, []);

  return { shownSetpoint, step };
}
