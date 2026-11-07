/**
 * [fork] What ✓ in the heating plan's window does (HeatingPlanSheet), without React so it can be tested: the
 * stepper's next value and the save order.
 *
 * When the plan goes on, the temperatures first, so that switching on applies the new ones at once; when it goes
 * off, the switch first, so that the automation no longer sets the thermostat. A failed call rejects (callService
 * has shown the error) and stops the steps after it.
 */

import { setHeatingPlanOn, setHeatingTemperature } from '../../ha/heatingPlan';
import type { HeatingHelper, HeatingPlanView } from './useHeatingPlan';

/** The window's drafts; null = not touched (the window shows HA's value). */
export interface HeatingDraft {
  on: boolean | null;
  comfort: number | null;
  eco: number | null;
}

type DraftView = Pick<HeatingPlanView, 'plan' | 'on' | 'comfort' | 'eco'>;

/** A stepper value on the helper's grid, within its range. */
export function stepHeatingValue(value: number, delta: number, h: HeatingHelper): number {
  const next = Math.round((value + delta * h.step) / h.step) * h.step;
  return Math.min(h.max, Math.max(h.min, Number(next.toFixed(2))));
}

const tempChanged = (draft: number | null, helper: HeatingHelper | null): helper is HeatingHelper =>
  helper !== null && draft !== null && draft !== helper.value;

/** The drafts differ from what HA holds. */
export function heatingDraftChanged(view: DraftView, draft: HeatingDraft): boolean {
  return (draft.on !== null && draft.on !== view.on) || tempChanged(draft.comfort, view.comfort) || tempChanged(draft.eco, view.eco);
}

/** Sends the changed values to HA in the order above. */
export async function saveHeatingDraft(view: DraftView, draft: HeatingDraft): Promise<void> {
  const temps = async () => {
    if (tempChanged(draft.comfort, view.comfort)) await setHeatingTemperature(view.comfort.id, draft.comfort!);
    if (tempChanged(draft.eco, view.eco)) await setHeatingTemperature(view.eco.id, draft.eco!);
  };
  const toggle = async () => {
    if (draft.on !== null && draft.on !== view.on) await setHeatingPlanOn(view.plan.automation, draft.on);
  };
  if (draft.on === false) {
    await toggle();
    await temps();
  } else {
    await temps();
    await toggle();
  }
}
