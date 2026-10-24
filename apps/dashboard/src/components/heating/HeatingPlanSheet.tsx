/**
 * [fork] The heating plan's window (plan: glas/heizung-zeitplan/PLAN.md, Etappe 2a; draft LIESMICH.md): the switch,
 * comfort and eco with steppers, and the comfort times grouped by equal days. Glas: a sheet, from 900 px a dialog in
 * two columns (Modal); × discards, ✓ saves, like sheets in iOS 26. Klassisch: Cancel / Save in the foot.
 *
 * Changes wait for ✓, which sets the temperatures and switches in the order of heatingSave.ts. A failed call keeps
 * the window open with "Not saved … Try again" (callService has shown the error). Editing the times follows in
 * Etappe 2b; here they are read only.
 */

import { useRef, useState } from 'react';
import { CalendarClock, Check, CircleAlert, Leaf, Minus, Plus, Sun } from 'lucide-react';
import { HEATING_WEEKDAYS, heatingDayGroupKind, heatingDayGroups } from '@hapulse/core';
import type { HeatingDayGroup } from '@hapulse/core';
import { Modal } from '../ui/Modal';
import { useLocale, useT } from '../../i18n/useT';
import type { TFunction } from '../../i18n/useT';
import { useIsGlas } from '../../app/glas/useUiStyle';
import type { HeatingHelper, HeatingPlanView } from './useHeatingPlan';
import { heatingDraftChanged, saveHeatingDraft, stepHeatingValue } from './heatingSave';
import { HeatingSwitch } from './HeatingSwitch';
import { HeatingDayBar } from './HeatingDayBar';
import { formatHeatingDuration, formatHeatingTime, heatingDayName, heatingTempParts, HEATING_MARK, splitMarked } from './heatingFormat';

interface HeatingPlanSheetProps {
  open: boolean;
  view: HeatingPlanView;
  roomName: string;
  onClose: () => void;
}

function TempRow({
  kind,
  helper,
  value,
  onChange,
}: {
  kind: 'comfort' | 'eco';
  helper: HeatingHelper;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const name = t(kind === 'comfort' ? 'heatingPlan.phase.comfort' : 'heatingPlan.phase.eco');
  const current = value ?? helper.min;
  return (
    <div className={`heating-sheet__row heating-sheet__temp heating-sheet__temp--${kind}`}>
      <span className="heating-sheet__temp-icon" aria-hidden="true">
        {kind === 'comfort' ? <Sun size={18} strokeWidth={1.75} /> : <Leaf size={18} strokeWidth={1.75} />}
      </span>
      <span className="heating-sheet__temp-text">
        <span className="heating-sheet__temp-name">{name}</span>
        <span className="heating-sheet__temp-hint">{t(kind === 'comfort' ? 'heatingPlan.sheet.comfortHint' : 'heatingPlan.sheet.ecoHint')}</span>
      </span>
      <span className="heating-stepper">
        <button
          type="button"
          className="heating-stepper__btn"
          aria-label={t('heatingPlan.sheet.lower', { name })}
          disabled={value !== null && value <= helper.min}
          onClick={() => onChange(stepHeatingValue(current, -1, helper))}
        >
          <Minus size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        <span className="heating-stepper__value" aria-live="polite">
          {heatingTempParts(value, locale)} {helper.unit}
        </span>
        <button
          type="button"
          className="heating-stepper__btn"
          aria-label={t('heatingPlan.sheet.raise', { name })}
          disabled={value !== null && value >= helper.max}
          onClick={() => onChange(stepHeatingValue(current, 1, helper))}
        >
          <Plus size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

function groupName(t: TFunction, locale: string, group: HeatingDayGroup): string {
  const kind = heatingDayGroupKind(group.days);
  if (kind === 'daily') return t('heatingPlan.group.daily');
  if (kind === 'weekdays') return t('heatingPlan.group.weekdays');
  if (kind === 'weekend') return t('heatingPlan.group.weekend');
  if (group.days.length === 1) return heatingDayName(group.days[0]!, locale, 'long');
  return group.days.map((d) => heatingDayName(d, locale, 'short')).join(', ');
}

function DayGroup({ group }: { group: HeatingDayGroup }) {
  const t = useT();
  const locale = useLocale();
  const name = groupName(t, locale, group);
  return (
    <div className="heating-group">
      <div className="heating-group__head">
        <span className="heating-group__name">{name}</span>
        <span className="heating-days" role="img" aria-label={group.days.map((d) => heatingDayName(d, locale, 'long')).join(', ')}>
          {HEATING_WEEKDAYS.map((d) => (
            <span key={d} className={`heating-days__day${group.days.includes(d) ? ' heating-days__day--on' : ''}`}>
              {heatingDayName(d, locale, 'narrow')}
            </span>
          ))}
        </span>
      </div>
      {group.blocks.length === 0 ? (
        <div className="heating-group__none">{t('heatingPlan.sheet.ecoAllDay')}</div>
      ) : (
        group.blocks.map((b) => (
          <div key={`${b.from}-${b.to}`} className="heating-period">
            <span className="heating-period__range">
              {splitMarked(t('heatingPlan.sheet.range', { from: HEATING_MARK[0], to: HEATING_MARK[1] })).map((p, i) =>
                p.mark === null ? (
                  <span key={i} className="heating-period__word">
                    {p.text}
                  </span>
                ) : (
                  <span key={i} className="heating-period__time">
                    {formatHeatingTime(p.mark === 0 ? b.from : b.to, locale)}
                  </span>
                ),
              )}
            </span>
            <span className="heating-period__len">{formatHeatingDuration(b, locale)}</span>
          </div>
        ))
      )}
      {group.blocks.length > 0 && <HeatingDayBar thin blocks={group.blocks} label={name} />}
    </div>
  );
}

export function HeatingPlanSheet({ open, view, roomName, onClose }: HeatingPlanSheetProps) {
  const t = useT();
  const glas = useIsGlas();
  // Drafts: what the window shows until ✓; null = not touched (shows HA's value)
  const [on, setOn] = useState<boolean | null>(null);
  const [comfort, setComfort] = useState<number | null>(null);
  const [eco, setEco] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // While ✓ runs, the window stays: × would not undo the calls already sent, and a refusal must stay visible
  const busyRef = useRef(false);
  const close = () => {
    if (!busyRef.current) onClose();
  };

  const shownOn = on ?? view.on;
  const shownComfort = comfort ?? view.comfort?.value ?? null;
  const shownEco = eco ?? view.eco?.value ?? null;
  const changed = heatingDraftChanged(view, { on, comfort, eco });

  async function save() {
    if (busyRef.current) return;
    if (!changed) {
      onClose();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await saveHeatingDraft(view, { on, comfort, eco });
      onClose();
    } catch {
      setFailed(true); // callService has shown HA's error
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const groups = view.week ? heatingDayGroups(view.week) : [];
  const noTimes = groups.every((g) => g.blocks.length === 0);
  const whole = [view.comfort, view.eco].every((h) => !h || h.step >= 1);

  const body = (
    <div className="heating-sheet">
      <div className="heating-sheet__col">
        <div className="heating-sheet__list">
          <div className="heating-sheet__row heating-sheet__switch-row">
            <span className="heating-sheet__row-label">{t('heatingPlan.title')}</span>
            <HeatingSwitch on={shownOn} disabled={!view.switchable || busy} label={t('heatingPlan.switchLabel', { room: roomName })} onChange={setOn} />
          </div>
        </div>
        <p className="heating-sheet__note">{t('heatingPlan.sheet.switchHint')}</p>

        {(view.comfort || view.eco) && (
          <>
            <h3 className="heating-sheet__title">{t('heatingPlan.sheet.temperatures')}</h3>
            <div className="heating-sheet__list">
              {view.comfort && <TempRow kind="comfort" helper={view.comfort} value={shownComfort} onChange={setComfort} />}
              {view.eco && <TempRow kind="eco" helper={view.eco} value={shownEco} onChange={setEco} />}
            </div>
            {whole && <p className="heating-sheet__note">{t('heatingPlan.sheet.wholeDegrees')}</p>}
          </>
        )}
      </div>

      <div className="heating-sheet__col">
        <h3 className="heating-sheet__title">{t('heatingPlan.sheet.schedule')}</h3>
        <div className="heating-sheet__list heating-sheet__groups">
          {view.weekFailed ? (
            <div className="heating-group__none">{t('heatingPlan.noSchedule')}</div>
          ) : view.week === null ? (
            <div className="heating-group__none">{t('heatingPlan.sheet.loading')}</div>
          ) : noTimes ? (
            <div className="heating-group__none">{t('heatingPlan.sheet.noTimes')}</div>
          ) : (
            groups.map((g) => <DayGroup key={g.days.join()} group={g} />)
          )}
        </div>
        <p className="heating-sheet__note">{t('heatingPlan.sheet.scheduleHint')}</p>
      </div>

      {failed && (
        <p className="heating-sheet__error" role="alert">
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>
            {t('heatingPlan.sheet.notSaved')}{' '}
            <button type="button" className="heating-sheet__retry" onClick={() => void save()}>
              {t('heatingPlan.sheet.retry')}
            </button>
          </span>
        </p>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={close}
      title={glas ? t('heatingPlan.title') : t('heatingPlan.sheet.titleRoom', { room: roomName })}
      subtitle={roomName}
      icon={<CalendarClock size={18} strokeWidth={1.75} />}
      className="modal-panel--wide heating-sheet-panel"
      swipeToClose={!changed && !busy}
      trailing={
        glas ? (
          <button type="button" className="g-heating-done" aria-label={t('heatingPlan.save')} disabled={busy} onClick={() => void save()}>
            <span className="g-heating-done__circle" aria-hidden="true">
              <Check size={18} strokeWidth={2.5} />
            </span>
          </button>
        ) : undefined
      }
      footer={
        glas ? undefined : (
          <div className="heating-confirm__actions">
            <button type="button" className="btn btn--secondary" disabled={busy} onClick={close}>
              {t('heatingPlan.cancel')}
            </button>
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void save()}>
              {t('heatingPlan.save')}
            </button>
          </div>
        )
      }
    >
      {body}
    </Modal>
  );
}
