/**
 * [fork] The heating plan card in a room's "Klima" section, after the thermostats (plan:
 * glas/heizung-zeitplan/PLAN.md, Etappe 2a). Head: symbol, "Heizplan", the status line and the switch for the room's
 * automation; under it today as a bar with a mark for now, the comfort and eco temperatures (the one that holds now
 * framed) and the row that opens the window with switch, temperatures and times (HeatingPlanSheet).
 *
 * The switch acts at once. Off switches the whole automation off, its window and frost handling too (decision E1),
 * so switching off asks first and says that; on applies the plan at once (setHeatingPlanOn). Every user can do this
 * without admin rights (docs/HEIZPLAN.md).
 */

import { useCallback, useState } from 'react';
import { CalendarClock, ChevronRight, Grid2x2, Leaf, Sun } from 'lucide-react';
import { heatingWeekday } from '@hapulse/core';
import type { HeatingBlock } from '@hapulse/core';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { useLocale, useT } from '../../i18n/useT';
import { setHeatingPlanOn } from '../../ha/heatingPlan';
import { useHeatingPlan } from './useHeatingPlan';
import type { HeatingHelper, HeatingPlanView } from './useHeatingPlan';
import { HeatingStatus } from './HeatingStatus';
import { HeatingDayBar } from './HeatingDayBar';
import { HeatingSwitch } from './HeatingSwitch';
import { HeatingPlanSheet } from './HeatingPlanSheet';
import { formatHeatingRange, heatingDayName, heatingTempParts } from './heatingFormat';
import './heating.css';

interface HeatingPlanCardProps {
  areaId: string;
  roomName: string;
  roomEntityIds: readonly string[];
}

/** Today's comfort periods as text ("06:00–08:30, 16:30–22:00"). */
export function heatingRangesText(blocks: readonly HeatingBlock[], locale: string): string {
  return blocks.map((b) => formatHeatingRange(b, locale)).join(', ');
}

function TempTile({ kind, helper, active }: { kind: 'comfort' | 'eco'; helper: HeatingHelper | null; active: boolean }) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className={`heating-temp heating-temp--${kind}${active ? ' heating-temp--active' : ''}`}>
      <span className="heating-temp__label">
        {kind === 'comfort' ? <Sun size={14} strokeWidth={1.75} aria-hidden="true" /> : <Leaf size={14} strokeWidth={1.75} aria-hidden="true" />}
        {t(kind === 'comfort' ? 'heatingPlan.phase.comfort' : 'heatingPlan.phase.eco')}
      </span>
      <span className="heating-temp__value">
        {heatingTempParts(helper?.value ?? null, locale)}
        {helper?.value != null && <span className="heating-temp__unit">{helper.unit}</span>}
      </span>
    </div>
  );
}

function OffConfirm({ open, roomName, onCancel, onConfirm }: { open: boolean; roomName: string; onCancel: () => void; onConfirm: () => void }) {
  const t = useT();
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t('heatingPlan.offConfirm.title')}
      icon={<CalendarClock size={18} strokeWidth={1.75} />}
      footer={
        <div className="heating-confirm__actions">
          {/* the focus on the harmless choice: Enter held on the switch must not switch off */}
          <button type="button" className="btn btn--secondary" onClick={onCancel} data-autofocus>
            {t('heatingPlan.cancel')}
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            {t('heatingPlan.offConfirm.action')}
          </button>
        </div>
      }
    >
      <p className="heating-confirm__text">{t('heatingPlan.offConfirm.text', { room: roomName })}</p>
    </Modal>
  );
}

/** Switching from the card: on at once, off after the question. */
export function useHeatingSwitch(view: HeatingPlanView | null, roomName: string) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const automation = view?.plan.automation ?? null;
  const run = useCallback(
    async (on: boolean) => {
      if (!automation) return;
      setBusy(true);
      try {
        await setHeatingPlanOn(automation, on);
      } catch {
        // callService has shown the error; the switch shows HA's state
      } finally {
        setBusy(false);
      }
    },
    [automation],
  );
  const request = useCallback(
    (on: boolean) => {
      if (on) void run(true);
      else setAsking(true);
    },
    [run],
  );
  const dialog = (
    <OffConfirm
      open={asking}
      roomName={roomName}
      onCancel={() => setAsking(false)}
      onConfirm={() => {
        setAsking(false);
        void run(false);
      }}
    />
  );
  return { request, busy, dialog };
}

export function HeatingPlanCard({ areaId, roomName, roomEntityIds }: HeatingPlanCardProps) {
  const t = useT();
  const locale = useLocale();
  const view = useHeatingPlan(areaId, roomEntityIds);
  const toggle = useHeatingSwitch(view, roomName);
  // the window stays mounted after closing (Modal gives the focus back); a new key per opening = fresh drafts
  const [sheet, setSheet] = useState({ key: 0, open: false });
  if (!view) return null;

  const { status, week, now } = view;
  const today = heatingWeekday(now);
  const blocks = week?.[today] ?? [];
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const comfortRuns = status.phase === 'comfort';
  const summary = view.weekFailed
    ? t('heatingPlan.noSchedule')
    : week === null
      ? ''
      : blocks.length === 0
        ? t('heatingPlan.todayEcoOnly')
        : t('heatingPlan.todayComfort', { ranges: heatingRangesText(blocks, locale) });

  return (
    <Card className="heating-card" data-phase={status.phase} data-deviates={view.deviates ? 'true' : undefined}>
      <div className="heating-card__head">
        <div className="icon-chip heating-card__chip" aria-hidden="true">
          {status.phase === 'window' ? <Grid2x2 size={20} strokeWidth={1.75} /> : <CalendarClock size={20} strokeWidth={1.75} />}
        </div>
        <div className="heating-card__titles">
          <div className="heating-card__name">{t('heatingPlan.title')}</div>
          <div className="heating-card__status">
            <HeatingStatus status={status} deviates={view.deviates} />
          </div>
        </div>
        <HeatingSwitch
          on={view.on}
          disabled={!view.switchable || toggle.busy}
          label={t('heatingPlan.switchLabel', { room: roomName })}
          onChange={toggle.request}
        />
      </div>

      <div className="heating-card__today">
        <div className="heating-card__today-row">
          <span className="heating-card__today-day">{t('heatingPlan.today', { day: heatingDayName(today, locale, 'long') })}</span>
          <span className="heating-card__today-sum">{summary}</span>
        </div>
        <HeatingDayBar
          blocks={blocks}
          nowMinute={nowMinute}
          lastTick={t('heatingPlan.bar.lastTick')}
          muted={status.phase === 'off' || status.phase === 'window'}
          label={summary || t('heatingPlan.title')}
        />
      </div>

      <div className="heating-card__temps">
        <TempTile kind="comfort" helper={view.comfort} active={comfortRuns} />
        <TempTile kind="eco" helper={view.eco} active={status.phase === 'eco'} />
      </div>

      <button type="button" className="heating-card__open" onClick={() => setSheet((s) => ({ key: s.key + 1, open: true }))}>
        <span>{t('heatingPlan.open')}</span>
        <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {sheet.key > 0 && (
        <HeatingPlanSheet key={sheet.key} open={sheet.open} view={view} roomName={roomName} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
      )}
      {toggle.dialog}
    </Card>
  );
}

