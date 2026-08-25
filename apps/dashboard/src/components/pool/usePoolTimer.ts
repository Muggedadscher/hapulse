/**
 * [fork] usePoolTimer — live countdown state for a `timer.*` entity.
 *
 * Home Assistant timers expose `duration` always, `finishes_at` while active,
 * and `remaining` while paused. This hook turns that into a ticking remaining
 * time + progress fraction the manual-run card can render as a ring, updating
 * once a second only while the timer is actually active (no idle intervals).
 */

import { useEffect, useState } from 'react';
import type { HassEntity } from '@hapulse/core';

export type PoolTimerState = 'idle' | 'active' | 'paused';

export interface PoolTimerInfo {
  state: PoolTimerState;
  /** Seconds left (0 when idle). */
  remainingSec: number;
  /** Configured duration in seconds (0 if unparseable). */
  durationSec: number;
  /** remaining / duration, clamped 0..1. */
  fraction: number;
  /** Wall-clock end time while active, else null. */
  finishesAt: Date | null;
}

/** Parse an "H:MM:SS" (or "HH:MM:SS") duration string into seconds. */
function parseDuration(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const m = /^(\d+):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export function usePoolTimer(entity: HassEntity | undefined): PoolTimerInfo {
  const rawState = entity?.state;
  const state: PoolTimerState =
    rawState === 'active' || rawState === 'paused' ? rawState : 'idle';

  const finishesAtStr = entity?.attributes['finishes_at'] as string | undefined;
  const finishesAt = state === 'active' && finishesAtStr ? new Date(finishesAtStr) : null;

  const durationSec = parseDuration(entity?.attributes['duration']);

  // A ticking clock, but only while the timer is counting down.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (state !== 'active') return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state, finishesAtStr]);

  let remainingSec = 0;
  if (state === 'active' && finishesAt) {
    remainingSec = Math.max(0, Math.round((finishesAt.getTime() - now) / 1000));
  } else if (state === 'paused') {
    remainingSec = parseDuration(entity?.attributes['remaining']);
  }

  const fraction = durationSec > 0 ? Math.min(1, Math.max(0, remainingSec / durationSec)) : 0;

  return { state, remainingSec, durationSec, fraction, finishesAt };
}

/** Format a whole number of seconds as "M:SS" or "H:MM:SS". */
export function formatCountdown(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}
