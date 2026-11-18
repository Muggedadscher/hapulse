/**
 * [fork] The times of the battery's plan (plan glas/energie-neu/umsetzung/PLAN-E4-AKKU.md, E5b §2), a window on the
 * battery's window like the heating plan's times page: the 24-hour ring and the time fields of components/schedule/
 * (no days: the plan holds every day), under the chosen time its way (charge | discharge) and power with the same
 * notes as the permanent command. Charging times are green on the ring, discharging ones orange; outside the times the
 * battery rests. In Glas a page on the window with a round back button and ✓, in Klassisch a dialog with
 * Cancel / Apply.
 *
 * ✓ only takes the times into the window's draft (`onDone`); the window's own ✓ saves them with the mode and the
 * limits in one go. Back and Cancel discard. A new time takes the way of the chosen one (discharging for the first,
 * when the battery may), with the start power of a new command.
 */

import { useState } from 'react';
import { Check, Zap, ZapOff } from 'lucide-react';
import { addBatteryPeriod, batteryPlanOutOfRange, batteryStartPower } from '@hapulse/core';
import type { BatteryPlanPeriod, BatterySetpointControl } from '@hapulse/core';
import { Modal } from '../../ui/Modal';
import { useIsGlas } from '../../../app/glas/useUiStyle';
import { useLocale, useT } from '../../../i18n/useT';
import { ScheduleTimes } from '../../schedule/ScheduleTimes';
import type { ScheduleTimesLabels } from '../../schedule/ScheduleTimes';
import { BatteryChoice, batteryCommandText, BatteryPowerSlider } from './EnergyBatteryControl';

type Way = 'charge' | 'discharge';

interface EnergyBatteryTimesPageProps {
  open: boolean;
  /** the times the window shows now (its draft, else Home Assistant's) */
  start: readonly BatteryPlanPeriod[];
  setpoint: BatterySetpointControl;
  /** where the focus goes when the page closes */
  returnFocus: () => HTMLElement | null;
  onDone: (periods: BatteryPlanPeriod[]) => void;
  onClose: () => void;
}

const wayOf = (setpoint: number): Way => (setpoint > 0 ? 'charge' : 'discharge');

export function EnergyBatteryTimesPage({ open, start, setpoint, returnFocus, onDone, onClose }: EnergyBatteryTimesPageProps) {
  const t = useT();
  const locale = useLocale();
  const glas = useIsGlas();
  const [periods, setPeriods] = useState<BatteryPlanPeriod[]>(() => start.map((p) => ({ ...p })));
  const [selected, setSelected] = useState(0);

  const most = (way: Way) => (way === 'charge' ? setpoint.maxCharge : setpoint.maxDischarge);
  const wayOpen = (way: Way) => most(way) > 0;
  // the way of a first time: discharging in the evening, when the battery may discharge
  const firstWay: Way = wayOpen('discharge') ? 'discharge' : 'charge';
  const sel = Math.min(selected, Math.max(0, periods.length - 1));
  const chosen = periods[sel];
  const chosenWay = chosen ? wayOf(chosen.setpoint) : firstWay;
  const signed = (way: Way, watts: number) => (way === 'charge' ? watts : -watts);
  const changed = JSON.stringify(periods) !== JSON.stringify(start);

  const setChosen = (setpointValue: number) =>
    setPeriods((cur) => cur.map((p, i) => (i === Math.min(sel, cur.length - 1) ? { ...p, setpoint: setpointValue } : p)));

  const labels: ScheduleTimesLabels = {
    ring: t('energy.battery.timesRing'),
    from: t('energy.battery.timesFrom'),
    to: t('energy.battery.timesTo'),
    fromIcon: Zap,
    toIcon: ZapOff,
    nth: (label, n) => t('energy.battery.timesNth', { label, n }),
    caption: chosen ? batteryCommandText(t, chosen.setpoint, locale) : t('energy.battery.cmdIdle'),
    empty: t('energy.battery.timesEmpty'),
    hint: t('energy.battery.timesHint'),
    add: (count) => t(count === 0 ? 'energy.battery.timesAddFirst' : count === 1 ? 'energy.battery.timesAddSecond' : 'energy.battery.timesAddMore'),
    remove: (range) => t('energy.battery.timesRemove', { range }),
    clear: t('energy.battery.timesClear'),
    notSaved: t('energy.battery.notSaved'),
    retry: t('energy.battery.retry'),
  };

  const ways = [
    ...(wayOpen('charge') ? [{ value: 'charge' as const, label: t('energy.battery.cmdCharge') }] : []),
    ...(wayOpen('discharge') ? [{ value: 'discharge' as const, label: t('energy.battery.cmdDischarge') }] : []),
  ];

  const extra = chosen ? (
    <>
      <div className="sched__list en-bat-times__extra">
        {ways.length > 1 && (
          <div className="en-bat-ctl__kind">
            <BatteryChoice
              options={ways}
              value={chosenWay}
              label={t('energy.battery.directionLabel')}
              onChange={(way) => setChosen(signed(way, batteryStartPower(most(way))))}
            />
          </div>
        )}
        <BatteryPowerSlider
          kind={chosenWay}
          watts={Math.abs(chosen.setpoint)}
          most={most(chosenWay)}
          keep={null}
          disabled={false}
          onChange={(watts) => setChosen(signed(chosenWay, watts))}
        />
      </div>
      {chosenWay === 'discharge' ? (
        <p className="sched__note en-bat-times__note en-bat-times__note--warn">{t('energy.battery.dischargeNote')}</p>
      ) : (
        <p className="sched__note en-bat-times__note">{t('energy.battery.chargeNote')}</p>
      )}
      {batteryPlanOutOfRange(periods, setpoint) && (
        <p className="sched__note en-bat-times__note en-bat-times__note--warn">{t('energy.battery.planOutOfRange')}</p>
      )}
    </>
  ) : null;

  const done = () => onDone(periods.map((p) => ({ ...p })));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('energy.battery.timesTitle')}
      className="en-bat-times-panel"
      returnFocus={returnFocus}
      swipeToClose={!changed}
      trailing={
        glas ? (
          <button type="button" className="g-sched-done" aria-label={t('energy.battery.timesDone')} onClick={done}>
            <span className="g-sched-done__circle" aria-hidden="true">
              <Check size={18} strokeWidth={2.5} />
            </span>
          </button>
        ) : undefined
      }
      footer={
        glas ? undefined : (
          <div className="sched-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              {t('glas.sheet.cancel')}
            </button>
            <button type="button" className="btn btn--primary" onClick={done}>
              {t('energy.battery.timesDone')}
            </button>
          </div>
        )
      }
    >
      <ScheduleTimes
        tone={chosenWay}
        periods={periods}
        onChange={setPeriods}
        addTo={(ps) => addBatteryPeriod(ps, signed(chosenWay, batteryStartPower(most(chosenWay))))}
        selected={sel}
        onSelect={setSelected}
        arcClass={(i) => {
          const p = periods[i];
          return p ? `sched-ring__arc--${wayOf(p.setpoint)}` : undefined;
        }}
        chosenExtra={extra}
        busy={false}
        failed={false}
        onRetry={() => undefined}
        labels={labels}
      />
    </Modal>
  );
}
