/**
 * [fork] Demo-only switches for the lab checks (docs/glas/PLAN-ETAPPE-5.md K92, §7.31): the energy page "not set up"
 * and a held load.
 *
 * In demo mode `getEnergyPrefs` (energy.ts) hands the demo's preferences through `demoEnergyPrefs`, which answers
 * `null` (= not configured) after `window.__hapulseDemo.energyConfigured(false)` (demoControl.ts). The energy page and
 * the overview's energy card read the preferences when they mount, so a check switches first and opens the page then.
 * `energyHold(true)` keeps the demo's statistics back until `energyHold(false)`: the demo answers at once, a real HA
 * takes a moment, and a check needs that moment to see what the page shows while a period loads. `energyLoads()`
 * counts the statistics requests, so a check can see that the phone's More menu asks for today's figure only while it
 * is open (K97).
 */

import type { EnergyPreferences } from '@hapulse/core';

let configured = true;
let held: Promise<void> | null = null;
let release: (() => void) | null = null;
let loads = 0;

export function setDemoEnergyConfigured(on: boolean): void {
  configured = on;
}

export function demoEnergyPrefs(prefs: EnergyPreferences): EnergyPreferences | null {
  return configured ? prefs : null;
}

export function setDemoEnergyHold(on: boolean): void {
  if (on && !held) {
    held = new Promise((resolve) => {
      release = resolve;
    });
  } else if (!on && release) {
    release();
    held = null;
    release = null;
  }
}

/** Resolves at once, or when a check lets a held load go. Called once per statistics request. */
export function demoEnergyWait(): Promise<void> {
  loads++;
  return held ?? Promise.resolve();
}

export function demoEnergyLoads(): number {
  return loads;
}
