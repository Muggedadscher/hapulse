/**
 * [fork] The rules of the light's brightness control in the Glas detail (docs/GLAS-DESIGN.md §7.22, plan
 * docs/glas/PLAN-ETAPPE-4.md K79), DOM-free: the level a light shows, the level under the pointer, the keys and what
 * is sent when a change ends. Used by LightBrightnessControl.tsx; tests in test/lightLevel.test.ts.
 */

/** A level below this means off (§7.22). */
export const OFF_BELOW = 3;

/** The level 0–100 a light shows: 0 while it is not on, 100 when it is on without a brightness. */
export function lightLevel(state: string, brightness: unknown): number {
  if (state !== 'on') return 0;
  if (typeof brightness !== 'number' || !Number.isFinite(brightness)) return 100;
  return Math.max(1, Math.min(100, Math.round((brightness / 255) * 100)));
}

/** True when the light can be dimmed — the same rule as the embedded LightCard (some mode other than on/off). */
export function lightDimmable(supportedColorModes: unknown): boolean {
  return Array.isArray(supportedColorModes) && supportedColorModes.length > 0
    && !supportedColorModes.every((m) => m === 'onoff');
}

/** The level under a pointer at `y` on a capsule from `top`, `height` high: the bottom is 0, the top 100. */
export function levelAt(y: number, top: number, height: number): number {
  if (!(height > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round(((top + height - y) / height) * 100)));
}

/** The level after a key (↑/→ +10, ↓/← −10, Page up/down ±20, Home 0, End 100); null for every other key. */
export function levelAfterKey(level: number, key: string): number | null {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  switch (key) {
    case 'ArrowUp':
    case 'ArrowRight':
      return clamp(level + 10);
    case 'ArrowDown':
    case 'ArrowLeft':
      return clamp(level - 10);
    case 'PageUp':
      return clamp(level + 20);
    case 'PageDown':
      return clamp(level - 20);
    case 'Home':
      return 0;
    case 'End':
      return 100;
    default:
      return null;
  }
}

export type LightCommand = { service: 'turn_off' } | { service: 'turn_on'; brightness: number };

/**
 * What to send when a change ends at `next`, for a light that is `on` at `level`; null when nothing changes (an off
 * light stays below 3 %, an on light keeps its level). Below 3 % turns the light off, everything else turns it on
 * with the brightness 1–255 for that level.
 */
export function lightCommand(on: boolean, level: number, next: number): LightCommand | null {
  if (next < OFF_BELOW) return on ? { service: 'turn_off' } : null;
  if (on && next === level) return null;
  return { service: 'turn_on', brightness: Math.max(1, Math.min(255, Math.round(next * 2.55))) };
}
