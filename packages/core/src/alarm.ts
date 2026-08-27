/**
 * Alarm panel selection.
 *
 * A home can expose several alarm_control_panel entities — Alarmo creates a
 * master plus one per area, and other integrations add their own. Every
 * summary surface (header chip, home security card, security page hero, chip
 * modal) used to pick a panel with `entities.find(...)`, some from the
 * hidden-filtered list and some from the raw one, so with more than one panel
 * they could disagree: the chip said "Disarmed" while the security page said
 * "Armed night" (issue #16).
 *
 * `pickAlarmPanel` gives every surface the same answer: the panel in the most
 * severe state wins, ties broken by entity_id so the choice is deterministic.
 * Severity ordering means a summary reads "armed" whenever ANY panel is armed
 * — the question a glanceable chip answers is "is my house armed?", not "what
 * does the first panel HA happened to list say?".
 *
 * Callers pass an already visibility-filtered list (hiddenEntities is the
 * dashboard's concern, per the entity-visibility rule).
 */

import type { HassEntity } from './types.js';

/** Higher = more urgent to surface. Unknown states rank lowest. */
const STATE_SEVERITY: Record<string, number> = {
  triggered: 7,
  pending: 6,
  arming: 5,
  armed_away: 4,
  armed_vacation: 4,
  armed_night: 4,
  armed_home: 4,
  armed_custom_bypass: 4,
  disarmed: 2,
  unavailable: 1,
  unknown: 1,
};

function severity(state: string): number {
  return STATE_SEVERITY[state] ?? 0;
}

/** All alarm panels in the list, most severe first (deterministic). */
export function sortAlarmPanels(entities: HassEntity[]): HassEntity[] {
  return entities
    .filter((e) => e.entity_id.startsWith('alarm_control_panel.'))
    .sort(
      (a, b) =>
        severity(b.state) - severity(a.state) ||
        a.entity_id.localeCompare(b.entity_id),
    );
}

/**
 * The panel a summary surface should represent: the most severe one.
 * Undefined when the list has no alarm panels.
 */
export function pickAlarmPanel(entities: HassEntity[]): HassEntity | undefined {
  return sortAlarmPanels(entities)[0];
}
