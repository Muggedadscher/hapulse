/**
 * [fork] Pure rules for the alarm panel buttons (unit-tested).
 */

export type AlarmAction = 'disarm' | 'arm_home' | 'arm_away' | 'arm_night' | 'arm_vacation';

/** HA AlarmControlPanelEntityFeature bits for the arm modes. */
const FEATURE_BIT: Partial<Record<AlarmAction, number>> = {
  arm_home: 1,
  arm_away: 2,
  arm_night: 4,
  arm_vacation: 32,
};

/** Arm modes the panel does not support are hidden (disarm always exists). Without the
 *  attribute (old integrations, demo) every action is offered, as before. */
export function isAlarmActionSupported(action: AlarmAction, supportedFeatures: unknown): boolean {
  const bit = FEATURE_BIT[action];
  if (bit === undefined || typeof supportedFeatures !== 'number') return true;
  return (supportedFeatures & bit) !== 0;
}

/**
 * Button disabled?
 * - the panel is already in the action's target state
 * - the panel is unavailable/unknown (nothing to send to)
 * - while arming / pending (entry delay) only DISARM stays usable — cancelling the exit
 *   delay or disarming during the entry delay is exactly what the panel is for
 */
export function isAlarmActionDisabled(state: string, action: AlarmAction, targetState: string): boolean {
  if (state === targetState) return true;
  if (state === 'unavailable' || state === 'unknown') return true;
  if ((state === 'arming' || state === 'pending') && action !== 'disarm') return true;
  return false;
}
