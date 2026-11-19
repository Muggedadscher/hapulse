/**
 * [fork] The battery's window (plan glas/energie-neu/umsetzung/PLAN-E4-AKKU.md, E5), opened by "Details" on the card:
 * what the battery does now (ring, charge, state with power, "full at about" or "lasts until about", the energy
 * stored), its mode (Automatic or Manual, each saying what it does) and its charge range (the picture reserve | usable
 * | above the limit with the usable kWh, a slider each for "charge to" and the reserve). Glas: a sheet, from 900 px a
 * dialog; × discards, ✓ saves, like the heating plan's window. Klassisch: the same parts plainly, Cancel / Save below.
 *
 * Everyone may set the three, not only admins (Jannick, 18.11.2026). ✓ sends only what differs, the limits first and
 * the mode last (core batteryWrites). A new mode asks first: the integration then takes the battery over from its app and clears the
 * times set there (its MODE_REGISTERS). A call can take half a minute (the integration retries), so the window says
 * that it saves and stays. A failed call keeps the window open and says whether a part was saved, with the
 * integration's own hint: the battery's app may hold the battery's only connection.
 *
 * E5b: with the integration's power setpoint the manual mode is HAPulse's steering (EnergyBatteryControl): a permanent
 * command or the daily plan, whose times open as a window on this one (EnergyBatteryTimesPage; its ✓ only takes them
 * here). ✓ then sends the calls of core batterySaveCalls in their order (ha/battery.ts: the plan switched on again
 * when a later call fails, a look once more a moment after). ✓ never closes the window without doing what it shows: it
 * waits while the plan to save is empty or the same power all day, while a steering changed here cannot reach the
 * battery, and while "Send again" or "Switch the plan off" runs (a note says why). Home Assistant's own plan with a
 * time above the integration's bound is saved cut down. While the plan, or another schedule on the setpoint, still runs
 * in the automatic mode, a note says that it switches the battery back to Manual (HAPulse's own one with "Switch off").
 */

import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Battery, Check, CircleAlert, SlidersHorizontal, Sparkles, Zap } from 'lucide-react';
import {
  batteryControlNow,
  batteryControlShown,
  batteryModeKey,
  batteryPlanOffCall,
  batteryPlanOutOfRange,
  batteryPlanProblem,
  batteryPlanRunCall,
  batterySaveCalls,
  batterySaved,
  batterySlider,
  batteryWrites,
  formatNumber,
  sameBatteryControl,
} from '@hapulse/core';
import type { BatteryCall, BatteryControlDraft, BatteryModeKey, BatteryModeOption, BatteryPlanPeriod, BatterySaveDraft } from '@hapulse/core';
import { Modal } from '../../ui/Modal';
import { BatterySaveError, recheckBattery, runBatteryCalls, sendBatteryCall } from '../../../ha/battery';
import { useIsGlas } from '../../../app/glas/useUiStyle';
import { useLocale, useT } from '../../../i18n/useT';
import type { BatteryNow } from './EnergyBattery';
import { BatteryControlSection } from './EnergyBatteryControl';
import type { BatteryKeptControl } from './EnergyBatteryControl';
import { BATTERY_STATE_KEY, BatteryRing, formatBatteryPower, fullAtToday } from './EnergyBatteryParts';
import { BatteryLimitSlider, BatteryRangeBar } from './EnergyBatteryRange';
import { EnergyBatteryTimesPage } from './EnergyBatteryTimesPage';

interface EnergyBatteryWindowProps {
  open: boolean;
  battery: BatteryNow;
  onClose: () => void;
}

const NO_DRAFT: BatterySaveDraft = { mode: null, chargeLimit: null, reserve: null, control: null };

/** The mode's rows: a radio group like the iOS settings' lists (arrows choose; only a draft until ✓). */
function ModePicker({
  rows,
  selected,
  settable,
  disabled,
  label,
  nameOf,
  hintOf,
  onSelect,
}: {
  rows: readonly BatteryModeOption[];
  selected: string;
  settable: boolean;
  disabled: boolean;
  label: string;
  nameOf: (o: BatteryModeOption) => string;
  hintOf: (key: BatteryModeKey | null) => string | null;
  onSelect: (raw: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const n = rows.length;
  const index = Math.max(0, rows.findIndex((r) => r.raw === selected));
  const off = !settable || disabled;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (off) return;
    let i: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') i = (index + 1) % n;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') i = (index - 1 + n) % n;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    const next = i === null ? undefined : rows[i];
    if (i === null || !next) return;
    e.preventDefault();
    if (next.raw !== selected) onSelect(next.raw);
    ref.current?.querySelectorAll<HTMLButtonElement>('.en-bat-win__mode')[i]?.focus();
  }

  return (
    <div ref={ref} role="radiogroup" aria-label={label} aria-disabled={off || undefined} className="en-bat-win__group en-bat-win__modes" onKeyDown={onKeyDown}>
      {rows.map((r, i) => {
        const hint = hintOf(r.key);
        return (
          <button
            key={r.raw}
            type="button"
            role="radio"
            aria-checked={i === index}
            aria-disabled={off || undefined}
            tabIndex={i === index ? 0 : -1}
            className={`en-bat-win__mode en-bat-win__mode--${r.key ?? 'other'}`}
            onClick={() => {
              if (!off && r.raw !== selected) onSelect(r.raw);
            }}
          >
            <span className="en-bat-win__mode-icon" aria-hidden="true">
              {r.key === 'manual' ? <SlidersHorizontal size={17} strokeWidth={2} /> : <Sparkles size={17} strokeWidth={2} />}
            </span>
            <span className="en-bat-win__mode-text">
              <span className="en-bat-win__mode-name">{nameOf(r)}</span>
              {hint && <span className="en-bat-win__mode-hint">{hint}</span>}
            </span>
            <Check className="en-bat-win__check" size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

export function EnergyBatteryWindow({ open, battery, onClose }: EnergyBatteryWindowProps) {
  const t = useT();
  const locale = useLocale();
  const glas = useIsGlas();
  const { controls, detailIds, steer, soc, status, showState, power, capacity } = battery;
  const [draft, setDraft] = useState<BatterySaveDraft>(NO_DRAFT);
  const [busy, setBusy] = useState(false);
  // a failed ✓: nothing saved, or the first calls went through and a later one failed
  const [failed, setFailed] = useState<'none' | 'part' | null>(null);
  const [asking, setAsking] = useState(false);
  // "Send again" or "Switch the plan off" runs (a call of its own, outside ✓)
  const [quickBusy, setQuickBusy] = useState(false);
  // While ✓ runs, the window stays: × would not undo the calls already sent, and a refusal must stay visible
  const busyRef = useRef(false);
  // In Klassisch every open dialog listens for Esc: the one that closes the question must not close this window too.
  // Cleared only after that event (the listeners run in either order).
  const askingRef = useRef(false);
  // [fork] E5b: the plan's times on this window; kept after closing (open false) so its window can leave animated
  const [times, setTimes] = useState<{ key: number; open: boolean; start: BatteryPlanPeriod[] } | null>(null);
  const timesOpen = useRef(false);
  const winRef = useRef<HTMLDivElement>(null);
  const timesFrom = useRef<HTMLElement | null>(null);

  const pct = (v: number) => `${formatNumber(v, locale, { maxDecimals: 1 })} %`;
  const kwh = (v: number) => formatNumber(v, locale, { minDecimals: 1, maxDecimals: 2 });
  const time = (ms: number) => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(ms);

  const { mode, chargeLimit, reserve } = controls;
  const modeSettable = !!mode && mode.options.length > 0;
  let modeRows: BatteryModeOption[] = [];
  if (mode) {
    modeRows = mode.options.length > 0 ? [...mode.options] : [];
    // the mode now is always a row, also when the select's options do not name it
    if (!modeRows.some((o) => o.raw === mode.raw)) modeRows.push({ raw: mode.raw, key: mode.key });
  }
  const shownMode = draft.mode ?? mode?.raw ?? '';
  const newMode = mode && draft.mode !== null && draft.mode !== mode.raw ? modeRows.find((o) => o.raw === draft.mode) ?? null : null;
  // [fork] E5b: the steering with the manual mode, and without a mode entity to show (it cannot be read now)
  const shownKey = mode ? (newMode ? newMode.key : mode.key) : null;
  const steering = !!steer && (shownKey === 'manual' || !mode);
  // it can be changed while the setpoint can be reached (else it is shown, not changed: plan §2.3)
  const reachable = !!steer && steer.setpoint.value !== null;
  const controlNow = steer ? batteryControlNow(steer, batteryModeKey(controls)) : null;
  const shownControl = steer ? batteryControlShown(controls, steer, draft) : null;
  // a steering set back to what Home Assistant does counts as untouched
  const controlChanged = draft.control !== null && controlNow !== null && !sameBatteryControl(draft.control, controlNow);
  // Home Assistant's own plan with a time above the integration's bound: ✓ saves it cut down, as its note says
  const planCut =
    steering && reachable && !controlChanged && shownControl?.kind === 'plan' && !!steer?.plan && batteryPlanOutOfRange(shownControl.periods, steer.setpoint);
  const saveControl = !reachable ? null : controlChanged ? draft.control : planCut ? shownControl : null;
  const saveDraft: BatterySaveDraft = { ...draft, control: saveControl };
  // what was changed here (swiping the window away would lose it)
  const changed = batteryWrites(controls, draft).length > 0 || controlChanged;
  const calls = changed || saveControl !== null ? batterySaveCalls(controls, steer, saveDraft) : [];
  // ✓ waits, so that it never closes the window without doing what it shows: a plan that cannot be saved (none, or
  // the same power all day; its note says why) while the save writes the steering, a steering changed here or Manual
  // chosen while the battery cannot be reached (the note says so), and a call of the window's own that still runs
  const savesSteering = steering && (saveControl !== null || newMode?.key === 'manual');
  const planProblem = savesSteering && shownControl?.kind === 'plan' ? batteryPlanProblem(shownControl.periods) : null;
  const steerWaits = !!steer && !reachable && (controlChanged || newMode?.key === 'manual');
  const blocked = !!planProblem || steerWaits || quickBusy;
  const canSet = modeSettable || !!chargeLimit?.range || !!reserve?.range || reachable;

  const close = () => {
    if (!busyRef.current && !askingRef.current && !timesOpen.current) onClose();
  };

  async function run() {
    if (calls.length === 0) {
      onClose();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setFailed(null);
    try {
      await runBatteryCalls(calls, steer?.setpoint.entityId ?? null);
      // a command of the plan already on its way can land after the save: one more look a moment later
      if (steer) recheckBattery(detailIds, batterySaved(controls, steer, saveDraft));
      onClose();
    } catch (e) {
      // callService has shown Home Assistant's error
      setFailed(e instanceof BatterySaveError && e.kept > 0 ? 'part' : 'none');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  // ---- mode ----
  const nameOf = (o: { key: BatteryModeKey | null; raw: string }) =>
    o.key === 'auto' ? t('energy.battery.modeAuto') : o.key === 'manual' ? t('energy.battery.modeManual') : o.raw;
  const hintOf = (key: BatteryModeKey | null) =>
    key === 'auto'
      ? t('energy.battery.hintModeAuto')
      : key === 'manual'
        ? t(steer ? 'energy.battery.hintModeSteer' : 'energy.battery.hintModeManual')
        : null;
  // the automatic mode while the plan still runs: its next time switches the battery back to Manual
  const planStillOn = !!steer?.plan?.on && !!mode && mode.key !== 'manual' && !newMode;
  // other schedules that set the setpoint do the same in the automatic mode (HAPulse leaves them alone)
  const rivalsAuto = !!steer && steer.rivals.length > 0 && !!mode && shownKey !== 'manual';

  function save() {
    if (busyRef.current || blocked) return;
    // only a new mode asks: a Manual save writes the mode each time (core batterySaveCalls)
    if (newMode) {
      askingRef.current = true;
      setAsking(true);
      return;
    }
    void run();
  }

  const endAsk = () => {
    setAsking(false);
    window.setTimeout(() => {
      askingRef.current = false;
    }, 0);
  };

  // ---- the steering's own calls and the times page ----
  // the steering each way as last set here: switching Permanent ⇄ Plan keeps what was set before
  const [kept, setKept] = useState<BatteryKeptControl>({ command: null, plan: null });
  const setControl = (control: BatteryControlDraft) => {
    setKept((k) => (control.kind === 'plan' ? { ...k, plan: control.periods } : { ...k, command: control.command }));
    setDraft((d) => ({ ...d, control }));
  };
  async function quick(call: BatteryCall) {
    if (quickBusy || busyRef.current) return;
    setQuickBusy(true);
    try {
      await sendBatteryCall(call);
    } catch {
      // shown by callService
    } finally {
      setQuickBusy(false);
    }
  }
  const timesReturn = () => {
    const from = timesFrom.current;
    if (from?.isConnected) return from;
    return winRef.current?.querySelector<HTMLElement>('.en-bat-ctl__times') ?? null;
  };
  const openTimes = (from: HTMLElement) => {
    if (!steer || busyRef.current || shownControl?.kind !== 'plan') return;
    timesOpen.current = true;
    timesFrom.current = from;
    const start = shownControl.periods;
    setTimes((cur) => ({ key: (cur?.key ?? 0) + 1, open: true, start }));
  };
  const closeTimes = () => {
    setTimes((cur) => (cur ? { ...cur, open: false } : cur));
    window.setTimeout(() => {
      timesOpen.current = false;
      // Klassisch gives the focus back to the opener only while it is there (Glas asks timesReturn itself)
      const active = document.activeElement;
      if (!active || active === document.body) timesReturn()?.focus({ preventScroll: true });
    }, 0);
  };

  // ---- now ----
  const stored = soc !== null && capacity !== null ? (soc / 100) * capacity : null;
  const moving = status && (status.state === 'charging' || status.state === 'discharging') && power !== null;
  const fullAt = status ? fullAtToday(status.at, new Date()) : null;

  // ---- range ----
  const limitValue = draft.chargeLimit ?? chargeLimit?.value ?? null;
  const reserveValue = draft.reserve ?? reserve?.value ?? null;
  const limitSlider = chargeLimit?.range ? batterySlider('chargeLimit', chargeLimit.range, chargeLimit.value, reserveValue) : null;
  const reserveSlider = reserve?.range ? batterySlider('reserve', reserve.range, reserve.value, limitValue) : null;
  const hasRange = limitValue !== null || reserveValue !== null;
  const usable = capacity !== null && hasRange ? (((limitValue ?? 100) - (reserveValue ?? 0)) / 100) * capacity : null;

  const body = (
    <div className="en-bat-win" ref={winRef}>
      <section className="en-bat-win__group en-bat-win__hero" aria-label={t('energy.battery.nowAria')}>
        <div className="en-bat-win__ring">
          <BatteryRing value={soc ?? 0} size={76} stroke={8} />
          <span className="en-bat-win__glyph" aria-hidden="true">
            <Zap size={28} strokeWidth={2} />
          </span>
        </div>
        <div className="en-bat-win__now">
          {soc === null ? (
            <p className="en-bat-win__state">{t('energy.battery.unavailable')}</p>
          ) : (
            <>
              <p className="en-bat-win__pct">
                <span className="en-bat-win__num">{formatNumber(soc, locale, { maxDecimals: 0 })}</span>
                <span className="en-bat-win__unit">%</span>
              </p>
              {showState && status && (
                <p className="en-bat-win__state">
                  <span className={`en-bat__state en-bat__state--${status.state}`}>{t(BATTERY_STATE_KEY[status.state]!)}</span>
                  {moving && <> · {formatBatteryPower(power, locale)}</>}
                  {fullAt !== null && <> · {t('energy.battery.fullAt', { time: time(fullAt) })}</>}
                  {status.until !== null && <> · {t('energy.battery.lastsUntil', { time: time(status.until) })}</>}
                </p>
              )}
              {stored !== null && capacity !== null && (
                <p className="en-bat-win__stored">{t('energy.battery.stored', { stored: kwh(stored), capacity: kwh(capacity) })}</p>
              )}
            </>
          )}
        </div>
      </section>

      {mode && (
        <>
          <h3 className="en-bat-win__title">{t('energy.battery.modeTitle')}</h3>
          <ModePicker
            rows={modeRows}
            selected={shownMode}
            settable={modeSettable}
            disabled={busy}
            label={t('energy.battery.modeTitle')}
            nameOf={nameOf}
            hintOf={hintOf}
            onSelect={(raw) => setDraft((d) => ({ ...d, mode: raw }))}
          />
          {newMode && <p className="en-bat-win__note en-bat-win__note--warn">{t('energy.battery.modeChangeNote')}</p>}
          {planStillOn && steer?.plan && (
            <div className="en-bat-win__alert" role="status">
              <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>
                {t('energy.battery.planStillOn')}{' '}
                <button type="button" className="en-bat-win__retry" disabled={quickBusy || busy} onClick={() => void quick(batteryPlanOffCall(steer.plan!.entityId))}>
                  {t('energy.battery.planOff')}
                </button>
              </span>
            </div>
          )}
          {rivalsAuto && (
            <p className="en-bat-win__note en-bat-win__note--warn">
              {t('energy.battery.rivalsAuto', { count: battery.rivalNames.length, names: battery.rivalNames.join(', ') })}
            </p>
          )}
        </>
      )}

      {steering && steer && shownControl && (
        <BatteryControlSection
          steer={steer}
          control={shownControl}
          kept={kept}
          disabled={busy || !reachable}
          mismatch={battery.mismatch}
          rivalNames={battery.rivalNames}
          quickBusy={quickBusy}
          onControl={setControl}
          onOpenTimes={openTimes}
          onSendAgain={() => steer.plan && void quick(batteryPlanRunCall(steer.plan.entityId))}
          onPlanOff={() => steer.plan && void quick(batteryPlanOffCall(steer.plan.entityId))}
        />
      )}

      {hasRange && (
        <>
          <h3 className="en-bat-win__title">{t('energy.battery.rangeTitle')}</h3>
          <div className="en-bat-win__group en-bat-win__range">
            <div className="en-bat-win__usable">
              <span className="en-bat-win__usable-line">
                <span className="en-bat-win__usable-name">{t('energy.battery.usable')}</span>
                {usable !== null && <span className="en-bat-win__usable-value">{kwh(usable)} kWh</span>}
              </span>
              <BatteryRangeBar reserve={reserveValue} chargeLimit={limitValue} />
            </div>
            {chargeLimit && limitValue !== null && (
              <BatteryLimitSlider
                kind="chargeLimit"
                label={t('energy.battery.limitLabel')}
                value={limitValue}
                slider={limitSlider}
                disabled={busy}
                format={pct}
                onChange={(v) => setDraft((d) => ({ ...d, chargeLimit: v }))}
              />
            )}
            {reserve && reserveValue !== null && (
              <BatteryLimitSlider
                kind="reserve"
                label={t('energy.battery.reserveLabel')}
                value={reserveValue}
                slider={reserveSlider}
                disabled={busy}
                format={pct}
                onChange={(v) => setDraft((d) => ({ ...d, reserve: v }))}
              />
            )}
          </div>
          <p className="en-bat-win__note">{t('energy.battery.rangeNote')}</p>
        </>
      )}

      {busy && (
        <p className="en-bat-win__status" role="status">
          {t('energy.battery.saving')}
        </p>
      )}
      {failed && !busy && (
        <div className="en-bat-win__error" role="alert">
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>
            {t(failed === 'part' ? 'energy.battery.savedPart' : 'energy.battery.notSaved')} {t('energy.battery.appHint')}{' '}
            <button type="button" className="en-bat-win__retry" onClick={save}>
              {t('energy.battery.retry')}
            </button>
          </span>
        </div>
      )}

      {times && steer && (
        <EnergyBatteryTimesPage
          key={times.key}
          open={times.open}
          start={times.start}
          setpoint={steer.setpoint}
          returnFocus={timesReturn}
          onDone={(periods) => {
            setControl({ kind: 'plan', periods });
            setFailed(null);
            closeTimes();
          }}
          onClose={closeTimes}
        />
      )}
    </div>
  );

  return (
    <>
      <Modal
        open={open}
        onClose={close}
        title={t('energy.battery.title')}
        icon={<Battery size={18} strokeWidth={1.75} />}
        className="en-bat-win-panel"
        swipeToClose={!changed && !busy}
        trailing={
          glas && canSet ? (
            <button type="button" className="g-sched-done" aria-label={t('energy.battery.save')} disabled={busy || blocked} onClick={save}>
              <span className="g-sched-done__circle" aria-hidden="true">
                <Check size={18} strokeWidth={2.5} />
              </span>
            </button>
          ) : undefined
        }
        footer={
          glas || !canSet ? undefined : (
            <div className="g-confirm__actions en-bat-win__actions">
              <button type="button" className="btn btn--secondary" disabled={busy} onClick={close}>
                {t('glas.sheet.cancel')}
              </button>
              <button type="button" className="btn btn--primary" disabled={busy || blocked} onClick={save}>
                {t('energy.battery.save')}
              </button>
            </div>
          )
        }
      >
        {body}
      </Modal>
      <Modal
        open={asking}
        onClose={endAsk}
        title={t('energy.battery.modeConfirmTitle')}
        icon={<Battery size={18} strokeWidth={1.75} />}
        footer={
          <div className="g-confirm__actions en-bat-win__actions">
            {/* the focus on the harmless choice */}
            <button type="button" className="btn btn--secondary" onClick={endAsk} data-autofocus>
              {t('glas.sheet.cancel')}
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                endAsk();
                void run();
              }}
            >
              {t('energy.battery.modeConfirmAction')}
            </button>
          </div>
        }
      >
        <p className="en-bat-win__confirm">{t('energy.battery.modeConfirmText', { mode: newMode ? nameOf(newMode) : '' })}</p>
      </Modal>
    </>
  );
}
