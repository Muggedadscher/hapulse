/**
 * [fork] Saving the battery's window (plan glas/energie-neu/umsetzung/PLAN-E4-AKKU.md, E5b §3).
 *
 * `runBatteryCalls` sends the calls of core batterySaveCalls one after the other and waits for each (Home Assistant
 * answers once the integration has written to the battery, which can take half a minute). After `scheduler.add`, which
 * answers without the new entity, it waits until the schedule with HAPulse's tag is there, so the next save edits it
 * instead of adding another. When a call fails after the plan was switched off, the plan is switched on again (it runs
 * its current slot anew), so the last command does not run on without anyone changing it; the error says how many
 * calls still hold. `recheckBattery` looks once more a moment after a save and sends what Home Assistant does not show
 * (core batteryRecheck: a command of the plan that was already on its way can land after the save).
 */

import { batteryControls, batteryPlanState, batteryRecheck, batterySteer } from '@hapulse/core';
import type { BatteryCall, BatteryDetailIds, BatterySaved } from '@hapulse/core';
import { useEntityStore } from '../stores/entityStore';
import { callService } from './service';

/** How long a new plan may take to appear, and when a save is checked again. */
const PLAN_WAIT_MS = 10_000;
const RECHECK_MS = 2000;

/** A save that broke off: `kept` calls hold (0 = nothing changed in the end). */
export class BatterySaveError extends Error {
  constructor(readonly kept: number) {
    super('battery: save failed');
  }
}

const send = (c: BatteryCall) => callService(c.domain, c.service, c.data, c.target ? { entity_id: c.target } : undefined);

/** Resolves true once the store has HAPulse's plan for this setpoint, false after `ms`. */
function waitForPlan(setpointId: string, ms: number): Promise<boolean> {
  const has = () => !!batteryPlanState(useEntityStore.getState().entities, setpointId);
  if (has()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const finish = (found: boolean) => {
      unsubscribe();
      window.clearTimeout(timer);
      resolve(found);
    };
    const unsubscribe = useEntityStore.subscribe(() => {
      if (has()) finish(true);
    });
    const timer = window.setTimeout(() => finish(false), ms);
  });
}

/** Sends the calls in order; throws BatterySaveError when one fails (callService has shown Home Assistant's error). */
export async function runBatteryCalls(calls: readonly BatteryCall[], setpointId: string | null): Promise<void> {
  const undo: BatteryCall[] = [];
  let kept = 0;
  for (const c of calls) {
    try {
      await send(c);
    } catch {
      for (const u of undo.reverse()) {
        try {
          await send(u);
          kept--;
        } catch {
          // shown by callService; the window says that only a part was saved
        }
      }
      throw new BatterySaveError(Math.max(0, kept));
    }
    kept++;
    if (c.undo) undo.push(c.undo);
    if (c.part === 'planAdd' && setpointId && !(await waitForPlan(setpointId, PLAN_WAIT_MS))) {
      console.warn('[HAPulse] battery: the new plan has not appeared yet');
    }
  }
}

/** One more look a moment after a save; what differs is sent once more. */
export function recheckBattery(ids: BatteryDetailIds | null, saved: BatterySaved): void {
  window.setTimeout(() => {
    const entities = useEntityStore.getState().entities;
    const again = batteryRecheck(batteryControls(ids, entities), batterySteer(ids?.setpoint ?? null, entities), saved);
    if (again.length === 0) return;
    console.info('[HAPulse] battery: sent again after saving:', again.map((c) => c.part).join(', '));
    void (async () => {
      for (const c of again) {
        try {
          await send(c);
        } catch {
          return; // shown by callService
        }
      }
    })();
  }, RECHECK_MS);
}

/** A single call of the window outside ✓ ("Send again", "Switch the plan off"). */
export function sendBatteryCall(c: BatteryCall): Promise<void> {
  return send(c);
}
