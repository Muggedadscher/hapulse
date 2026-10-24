/**
 * [fork] Heating plan of one room for the card and its window: the entities (label `heizplan` + the room's area,
 * @hapulse/core findHeatingPlans), the schedule's periods (read with schedule.get_schedule, again whenever the
 * schedule entity changes or the connection is back, or taken from a save that read them back), the status line and
 * whether the thermostat follows.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { findHeatingPlans, heatingPlanStatus, heatingThermostatDeviates, heatingWindowSensors } from '@hapulse/core';
import type { HassEntity, HeatingPlanEntities, HeatingPlanStatus, HeatingWeek, Registries } from '@hapulse/core';
import { useEntityStore } from '../../stores/entityStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { getHeatingWeek } from '../../ha/heatingPlan';

export interface HeatingHelper {
  id: string;
  value: number | null;
  min: number;
  max: number;
  step: number;
  unit: string;
}

export interface HeatingPlanView {
  plan: HeatingPlanEntities;
  /** The room's automation is on (= the plan runs). */
  on: boolean;
  /** The automation can be switched (not unavailable). */
  switchable: boolean;
  comfort: HeatingHelper | null;
  eco: HeatingHelper | null;
  /** The schedule's periods; null while loading or when they cannot be read. */
  week: HeatingWeek | null;
  /** The periods could not be read (no schedule, error). */
  weekFailed: boolean;
  /** Take the periods a save has read back; a read still under way no longer overwrites them. */
  adoptWeek: (week: HeatingWeek) => void;
  status: HeatingPlanStatus;
  /** The thermostat does not hold what the plan wants (heatingThermostatDeviates). */
  deviates: boolean;
  now: Date;
}

/** Re-renders at each new minute (the status line and the "now" mark). */
function useMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer = 0;
    const arm = () => {
      timer = window.setTimeout(() => {
        setNow(new Date());
        arm();
      }, 60_000 - (Date.now() % 60_000) + 50);
    };
    arm();
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

function helper(id: string | null, entity: HassEntity | undefined): HeatingHelper | null {
  if (!id || !entity) return null;
  const num = (key: string, fallback: number) => {
    const v = Number(entity.attributes[key]);
    return Number.isFinite(v) ? v : fallback;
  };
  const value = parseFloat(entity.state);
  const unit = entity.attributes['unit_of_measurement'];
  return {
    id,
    value: Number.isFinite(value) ? value : null,
    min: num('min', 5),
    max: num('max', 30),
    step: num('step', 0.5),
    unit: typeof unit === 'string' && unit ? unit : '°C',
  };
}

const changedMs = (e: HassEntity | undefined) => (e ? Date.parse(e.last_changed) || 0 : 0);

/** The plans per area, once per registry snapshot (the room page and each card ask). */
const plansCache = new WeakMap<Registries, Record<string, HeatingPlanEntities>>();
function heatingPlansOf(registries: Registries): Record<string, HeatingPlanEntities> {
  let plans = plansCache.get(registries);
  if (!plans) {
    plans = findHeatingPlans(registries);
    plansCache.set(registries, plans);
  }
  return plans;
}

/** The room has a heating plan whose automation HA knows (the room page shows "Klima" for it). */
export function useAreaHasHeatingPlan(areaId: string): boolean {
  const registries = useEntityStore((s) => s.registries);
  const plan = registries ? heatingPlansOf(registries)[areaId] : undefined;
  return useEntityStore((s) => plan !== undefined && s.entities[plan.automation] !== undefined);
}

/** The heating plan of `areaId`, or null when the room has none. */
export function useHeatingPlan(areaId: string, roomEntityIds: readonly string[]): HeatingPlanView | null {
  const registries = useEntityStore((s) => s.registries);
  const plan = (registries ? heatingPlansOf(registries)[areaId] : undefined) ?? null;
  const demo = useConnectionStore((s) => s.demo);
  const connected = useConnectionStore((s) => s.status === 'connected');

  const windowIds = useEntityStore(useShallow((s) => heatingWindowSensors(roomEntityIds, s.entities)));
  const ids = useMemo(
    () => (plan ? [plan.automation, plan.schedule, plan.comfort, plan.eco, ...plan.thermostats, ...windowIds] : []),
    [plan, windowIds],
  );
  const watched = useEntityStore(useShallow((s) => ids.map((id) => (id ? s.entities[id] : undefined))));
  const now = useMinute();

  const [automation, schedule, comfortEntity, ecoEntity] = watched;
  const thermostats = plan ? watched.slice(4, 4 + plan.thermostats.length) : [];
  const windows = plan ? watched.slice(4 + plan.thermostats.length) : [];

  // The periods: read once and again on every change of the schedule entity (a save, a period starting or ending) and
  // when the connection is back: a read during a reconnect fails, and the entity may not change again for hours.
  const scheduleId = plan?.schedule ?? null;
  const scheduleStamp = schedule?.last_updated ?? '';
  const [loaded, setLoaded] = useState<{ id: string; week: HeatingWeek | null } | null>(null);
  // Each read and each adopted save counts up; a read whose answer comes after a newer one is dropped
  const generation = useRef(0);
  useEffect(() => {
    if (!scheduleId || !connected) return;
    const mine = ++generation.current;
    let live = true;
    void getHeatingWeek(scheduleId).then((week) => {
      if (live && generation.current === mine) setLoaded({ id: scheduleId, week });
    });
    return () => {
      live = false;
    };
  }, [scheduleId, scheduleStamp, connected]);
  const adoptWeek = useCallback(
    (week: HeatingWeek) => {
      if (!scheduleId) return;
      generation.current++;
      setLoaded({ id: scheduleId, week });
    },
    [scheduleId],
  );

  if (!plan || !automation) return null;

  const week = loaded && loaded.id === scheduleId ? loaded.week : null;
  const weekFailed = !scheduleId || (loaded?.id === scheduleId && loaded.week === null);
  const on = automation.state === 'on';
  const scheduleOn = schedule && (schedule.state === 'on' || schedule.state === 'off') ? schedule.state === 'on' : null;
  const windowOpen = windows.some((w) => w?.state === 'on');
  const status = heatingPlanStatus({
    automationOn: on,
    scheduleOn,
    windowOpen,
    week,
    nextEvent: (schedule?.attributes['next_event'] as string | null | undefined) ?? null,
    now,
  });
  const comfort = helper(plan.comfort, comfortEntity);
  const eco = helper(plan.eco, ecoEntity);
  const expected = status.phase === 'comfort' ? (comfort?.value ?? null) : status.phase === 'eco' ? (eco?.value ?? null) : null;
  // The demo's thermostat does not follow the plan (heatingPlanDemo.ts): no hint there.
  const deviates =
    !demo &&
    heatingThermostatDeviates({
      phase: status.phase,
      expected,
      thermostats,
      changedAt: Math.max(...[automation, schedule, comfortEntity, ecoEntity, ...windows].map(changedMs)),
      now: now.getTime(),
    });

  return {
    plan,
    on,
    switchable: automation.state === 'on' || automation.state === 'off',
    comfort,
    eco,
    week,
    weekFailed,
    adoptWeek,
    status,
    deviates,
    now,
  };
}
