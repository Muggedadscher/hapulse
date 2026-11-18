/**
 * [fork] The steering in the battery's window (plan glas/energie-neu/umsetzung/PLAN-E4-AKKU.md, E5b §2), shown with the
 * manual mode when the integration has a power setpoint: "Permanent | Plan". Permanent is rest, charge or discharge
 * with a power (a slider like "Charge to": 50-W stops up to the integration's bound, a new command starts at 200 W);
 * the plan is the row "Times" with what it does now and a bar of the day, opening the times page
 * (EnergyBatteryTimesPage, a window on the window). Under them the notes: charging also draws from the grid,
 * discharging without a meter feeds what the house does not use into the grid, a plan the window cannot take, one
 * changed outside HAPulse, a time above the bound; and the checks: the battery did not take the running time
 * ("Send again"), another schedule steers the same setpoint, the battery cannot be reached ("Switch the plan off").
 *
 * Only a draft until ✓ of the window (core batterySaveCalls). `BatteryChoice` is the Glas segment, in Klassisch plain
 * radio buttons (Klassisch only works, plan E5 "nur Glas"); `BatteryDayBar` the plan's day.
 */

import type { ReactNode } from 'react';
import { ChevronRight, CircleAlert } from 'lucide-react';
import {
  batteryCommandOf,
  batteryPlanAt,
  batteryPlanOutOfRange,
  batteryPlanProblem,
  batteryPowerStops,
  batteryStartPower,
  periodMinutes,
} from '@hapulse/core';
import type { BatteryCommand, BatteryCommandKind, BatteryControlDraft, BatteryPlanPeriod, BatterySteer } from '@hapulse/core';
import { useIsGlas } from '../../../app/glas/useUiStyle';
import { useLocale, useT } from '../../../i18n/useT';
import type { TFunction } from '../../../i18n/useT';
import { Segment } from '../../glas/Segment';
import { formatPeriodTime } from '../../schedule/scheduleFormat';
import { formatBatteryPower } from './EnergyBatteryParts';
import { BatteryLimitSlider } from './EnergyBatteryRange';

const DAY = 24 * 60;

export interface BatteryChoiceOption<V extends string> {
  value: V;
  label: string;
}

/** A choice of two or three: the Glas segment, in Klassisch radio buttons. */
export function BatteryChoice<V extends string>({
  options,
  value,
  onChange,
  label,
  disabled = false,
  className,
}: {
  options: readonly BatteryChoiceOption<V>[];
  value: V;
  onChange: (value: V) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const glas = useIsGlas();
  if (glas) {
    return (
      <Segment
        options={options}
        value={value}
        onChange={onChange}
        label={label}
        disabled={disabled}
        className={className ? `g-seg--battery ${className}` : 'g-seg--battery'}
      />
    );
  }
  return (
    <div role="radiogroup" aria-label={label} className={className ? `en-bat-choice ${className}` : 'en-bat-choice'}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          disabled={disabled}
          className="en-bat-choice__opt"
          data-value={o.value}
          onClick={() => {
            if (o.value !== value) onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** "Entladen 200 W", "Laden 1,2 kW", "Ruhen". */
export function batteryCommandText(t: TFunction, setpoint: number, locale: string): string {
  const { kind, watts } = batteryCommandOf(setpoint);
  if (kind === 'idle') return t('energy.battery.cmdIdle');
  const command = t(kind === 'charge' ? 'energy.battery.cmdCharge' : 'energy.battery.cmdDischarge');
  return t('energy.battery.commandPower', { command, power: formatBatteryPower(watts, locale) });
}

/** The power slider of one way: the stops up to the bound, Home Assistant's power kept reachable. */
export function BatteryPowerSlider({
  kind,
  watts,
  most,
  keep,
  disabled,
  onChange,
}: {
  kind: 'charge' | 'discharge';
  watts: number;
  most: number;
  keep: number | null;
  disabled: boolean;
  onChange: (watts: number) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const stops = batteryPowerStops(most, keep ?? (watts <= most ? watts : null));
  const slider = stops.length > 0 ? { stops, first: 0, last: stops.length - 1 } : null;
  return (
    <BatteryLimitSlider
      kind={kind}
      label={t('energy.battery.power')}
      value={watts}
      slider={slider}
      disabled={disabled}
      format={(w) => formatBatteryPower(w, locale)}
      onChange={onChange}
    />
  );
}

/** The plan's day as a bar: charging green, discharging orange, now as a mark. */
export function BatteryDayBar({ periods, nowMinute, label }: { periods: readonly BatteryPlanPeriod[]; nowMinute: number; label: string }) {
  const pct = (m: number) => `${(Math.min(Math.max(m, 0), DAY) / DAY) * 100}%`;
  return (
    <div className="en-bat-day">
      <div className="en-bat-day__track" role="img" aria-label={label}>
        {periods.map((p) => {
          const from = periodMinutes(p.from);
          const to = periodMinutes(p.to);
          return (
            <span
              key={`${p.from}-${p.to}`}
              className={`en-bat-day__part en-bat-day__part--${p.setpoint > 0 ? 'charge' : 'discharge'}`}
              style={{ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})` }}
            />
          );
        })}
        <span className="en-bat-day__now" style={{ left: pct(nowMinute) }} />
      </div>
      <div className="en-bat-day__ticks" aria-hidden="true">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
}

/** A warning with a button beside its text ("Send again", "Switch the plan off"). */
function Alert({ text, action, busy, onAction }: { text: string; action?: string; busy?: boolean; onAction?: () => void }) {
  return (
    <div className="en-bat-win__alert" role="status">
      <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
      <span>
        {text}
        {action && onAction && (
          <>
            {' '}
            <button type="button" className="en-bat-win__retry" disabled={busy} onClick={onAction}>
              {action}
            </button>
          </>
        )}
      </span>
    </div>
  );
}

const localMinute = (d: Date) => d.getHours() * 60 + d.getMinutes();

interface BatteryControlSectionProps {
  steer: BatterySteer;
  /** what the window shows: its draft, else what Home Assistant does now */
  control: BatteryControlDraft;
  /** the plan shown is Home Assistant's (not changed in the window): only then "changed outside HAPulse" */
  planFromHa: boolean;
  /** while ✓ runs, or while the battery cannot be reached */
  disabled: boolean;
  /** the battery has not taken the running time for a while (EnergyBatteryCard) */
  mismatch: boolean;
  /** the names of other schedules that set the same setpoint */
  rivalNames: string[];
  /** a call of its own runs ("Send again", "Switch the plan off") */
  quickBusy: boolean;
  onControl: (control: BatteryControlDraft) => void;
  onOpenTimes: (from: HTMLElement) => void;
  onSendAgain: () => void;
  onPlanOff: () => void;
}

export function BatteryControlSection({
  steer,
  control,
  planFromHa,
  disabled,
  mismatch,
  rivalNames,
  quickBusy,
  onControl,
  onOpenTimes,
  onSendAgain,
  onPlanOff,
}: BatteryControlSectionProps) {
  const t = useT();
  const locale = useLocale();
  const { setpoint, plan } = steer;
  const reachable = setpoint.value !== null;
  const now = batteryCommandOf(setpoint.value ?? 0);
  const most = (kind: BatteryCommandKind) => (kind === 'charge' ? setpoint.maxCharge : kind === 'discharge' ? setpoint.maxDischarge : 0);

  /** A command of a way: Home Assistant's power when it goes that way, else the start power. */
  const commandOf = (kind: BatteryCommandKind): BatteryCommand =>
    kind === 'idle' ? { kind, watts: 0 } : { kind, watts: now.kind === kind ? now.watts : batteryStartPower(most(kind)) };

  const kinds: { value: BatteryCommandKind; label: string }[] = [
    { value: 'idle', label: t('energy.battery.cmdIdle') },
    ...(setpoint.maxCharge > 0 ? [{ value: 'charge' as const, label: t('energy.battery.cmdCharge') }] : []),
    ...(setpoint.maxDischarge > 0 ? [{ value: 'discharge' as const, label: t('energy.battery.cmdDischarge') }] : []),
  ];

  const nowMinute = localMinute(new Date());
  let body: ReactNode;
  if (control.kind === 'command') {
    const cmd = control.command;
    body = (
      <>
        <div className="en-bat-win__group en-bat-ctl">
          <div className="en-bat-ctl__kind">
            <BatteryChoice
              options={kinds}
              value={cmd.kind}
              label={t('energy.battery.commandLabel')}
              disabled={disabled}
              onChange={(kind) => onControl({ kind: 'command', command: commandOf(kind) })}
            />
          </div>
          {cmd.kind !== 'idle' && (
            <BatteryPowerSlider
              kind={cmd.kind}
              watts={cmd.watts}
              most={most(cmd.kind)}
              keep={now.kind === cmd.kind ? now.watts : null}
              disabled={disabled}
              onChange={(watts) => onControl({ kind: 'command', command: { kind: cmd.kind, watts } })}
            />
          )}
        </div>
        {cmd.kind === 'discharge' && <p className="en-bat-win__note en-bat-win__note--warn">{t('energy.battery.dischargeNote')}</p>}
        {cmd.kind === 'charge' && <p className="en-bat-win__note">{t('energy.battery.chargeNote')}</p>}
      </>
    );
  } else {
    const periods = control.periods;
    const problem = batteryPlanProblem(periods);
    const at = batteryPlanAt(periods, nowMinute);
    const count = periods.length === 0 ? t('energy.battery.timesNone') : t('energy.battery.timesCount', { count: periods.length });
    const until = formatPeriodTime(at.until, locale);
    const watts = formatBatteryPower(Math.abs(at.setpoint), locale);
    const nowText =
      at.setpoint === 0
        ? t('energy.battery.planNowIdle', { time: until })
        : t(at.setpoint > 0 ? 'energy.battery.planNowCharge' : 'energy.battery.planNowDischarge', { power: watts, time: until });
    const summary = periods.length === 0 ? count : `${count} · ${nowText}`;
    body = (
      <>
        <div className="en-bat-win__group en-bat-ctl en-bat-ctl--plan">
          <button type="button" className="en-bat-ctl__times" disabled={disabled} onClick={(e) => onOpenTimes(e.currentTarget)}>
            <span className="en-bat-ctl__times-text">
              <span className="en-bat-ctl__times-name">{t('energy.battery.times')}</span>
              <span className="en-bat-ctl__times-sum">{summary}</span>
            </span>
            <ChevronRight className="en-bat-ctl__chevron" size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          {periods.length > 0 && (
            <div className="en-bat-ctl__day">
              <BatteryDayBar periods={periods} nowMinute={nowMinute} label={summary} />
            </div>
          )}
        </div>
        <p className="en-bat-win__note">{t('energy.battery.planNote')}</p>
        {problem === 'empty' && <p className="en-bat-win__note">{t('energy.battery.planEmpty')}</p>}
        {problem === 'allDay' && <p className="en-bat-win__note en-bat-win__note--warn">{t('energy.battery.planAllDay')}</p>}
        {planFromHa && plan?.foreign && <p className="en-bat-win__note en-bat-win__note--warn">{t('energy.battery.planForeign')}</p>}
        {batteryPlanOutOfRange(periods, setpoint) && <p className="en-bat-win__note en-bat-win__note--warn">{t('energy.battery.planOutOfRange')}</p>}
        {periods.some((p) => p.setpoint < 0) && <p className="en-bat-win__note en-bat-win__note--warn">{t('energy.battery.dischargeNote')}</p>}
        {periods.some((p) => p.setpoint > 0) && <p className="en-bat-win__note">{t('energy.battery.chargeNote')}</p>}
      </>
    );
  }

  return (
    <>
      <h3 className="en-bat-win__title">{t('energy.battery.controlTitle')}</h3>
      <div className="en-bat-ctl__how">
        <BatteryChoice
          options={[
            { value: 'command', label: t('energy.battery.controlCommand') },
            { value: 'plan', label: t('energy.battery.controlPlan') },
          ]}
          value={control.kind}
          label={t('energy.battery.controlTitle')}
          disabled={disabled}
          onChange={(kind) =>
            onControl(kind === 'plan' ? { kind: 'plan', periods: plan?.periods ?? [] } : { kind: 'command', command: commandOf(now.kind) })
          }
        />
      </div>
      {body}
      {mismatch && <Alert text={t('energy.battery.mismatch')} action={t('energy.battery.sendAgain')} busy={quickBusy} onAction={onSendAgain} />}
      {rivalNames.length > 0 && (
        <p className="en-bat-win__note en-bat-win__note--warn">{t('energy.battery.rivals', { count: rivalNames.length, names: rivalNames.join(', ') })}</p>
      )}
      {!reachable && (
        <Alert
          text={t('energy.battery.setpointUnavailable')}
          {...(plan?.on ? { action: t('energy.battery.planOff'), busy: quickBusy, onAction: onPlanOff } : {})}
        />
      )}
    </>
  );
}

