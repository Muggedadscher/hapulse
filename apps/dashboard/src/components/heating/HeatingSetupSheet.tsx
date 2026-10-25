/**
 * [fork] The window "Heizplan einrichten" (plan: glas/heizung-zeitplan/PLAN-ETAPPE-4.md; calls: ha/heatingSetup.ts):
 * the room's thermostats and contacts to choose, comfort and eco to start with, what happens, and the button. Before
 * the button it asks Home Assistant whether the setup can work at all (blueprint, "Heizplan speichern", REST from this
 * address) and shows what is missing instead. A setup that fails names its step; pressing again continues there.
 * Glas: a sheet, from 900 px a dialog (Modal); both styles end with Cancel / Set up in the foot.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Check, CircleAlert } from 'lucide-react';
import { heatingCanCool, heatingPriorStates, heatingSetupContacts, heatingSetupTemps, heatingSnapTemp } from '@hapulse/core';
import type { HassEntity, HeatingSetupRoom } from '@hapulse/core';
import { Modal } from '../ui/Modal';
import { useLocale, useStateLabel, useT } from '../../i18n/useT';
import { useEntityStore } from '../../stores/entityStore';
import { checkHeatingSetup, HeatingSetupError, runHeatingSetup } from '../../ha/heatingSetup';
import type { HeatingSetupProblem, HeatingSetupStep } from '../../ha/heatingSetup';
import { TempRow } from './HeatingPlanSheet';
import { heatingTempParts } from './heatingFormat';

interface HeatingSetupSheetProps {
  open: boolean;
  room: HeatingSetupRoom;
  roomEntityIds: readonly string[];
  onClose: () => void;
}

const nameOf = (e: HassEntity | undefined, id: string) => String(e?.attributes['friendly_name'] ?? id);

function CheckRow({ checked, label, sub, disabled, onToggle }: { checked: boolean; label: string; sub?: string; disabled: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} className="heating-sheet__row heating-setup__check" disabled={disabled} onClick={onToggle}>
      <span className={`heating-setup__box${checked ? ' heating-setup__box--on' : ''}`} aria-hidden="true">
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
      <span className="heating-setup__check-text">
        <span className="heating-setup__check-name">{label}</span>
        {sub && <span className="heating-setup__check-sub">{sub}</span>}
      </span>
    </button>
  );
}

export function HeatingSetupSheet({ open, room, roomEntityIds, onClose }: HeatingSetupSheetProps) {
  const t = useT();
  const sl = useStateLabel();
  const locale = useLocale();
  const entities = useEntityStore((s) => s.entities);

  const [problems, setProblems] = useState<HeatingSetupProblem[] | null>(null);
  const [thermostats, setThermostats] = useState<string[]>(() => room.thermostats.filter((id) => !heatingCanCool(useEntityStore.getState().entities[id])));
  const contacts = useMemo(() => heatingSetupContacts(roomEntityIds, entities), [roomEntityIds, entities]);
  const [chosenContacts, setChosenContacts] = useState<string[]>(() => contacts.filter((c) => c.preselected).map((c) => c.id));
  const [comfort, setComfort] = useState<number | null>(null);
  const [eco, setEco] = useState<number | null>(null);
  const [running, setRunning] = useState<HeatingSetupStep | null>(null);
  const [failed, setFailed] = useState<HeatingSetupStep | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let live = true;
    void checkHeatingSetup(room.areaId).then((p) => {
      if (live) setProblems(p);
    });
    return () => {
      live = false;
    };
  }, [room.areaId]);

  const temps = heatingSetupTemps(thermostats.map((id) => entities[id]));
  const helper = (id: string) => ({ id, value: null, min: temps.min, max: temps.max, step: temps.step, unit: '°C' });
  const shownComfort = heatingSnapTemp(comfort ?? temps.comfort, temps);
  const shownEco = heatingSnapTemp(eco ?? temps.eco, temps);
  const ready = problems !== null && problems.length === 0 && thermostats.length > 0;

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const close = () => {
    if (!busy.current) onClose();
  };

  async function setUp() {
    if (busy.current || !ready) return;
    busy.current = true;
    setFailed(null);
    const prior = heatingPriorStates(thermostats.map((id) => entities[id]))
      .map((p) => `${p.name} ${sl('climate', p.mode)}${p.temperature === null ? '' : ` ${heatingTempParts(p.temperature, locale)} °C`}`)
      .join(', ');
    try {
      await runHeatingSetup(
        {
          areaId: room.areaId,
          roomName: room.name,
          thermostats,
          contacts: chosenContacts,
          comfort: shownComfort,
          eco: shownEco,
          min: temps.min,
          max: temps.max,
          step: temps.step,
          description: t('heatingSetup.description', { room: room.name, prior }),
        },
        setRunning,
      );
      busy.current = false;
      setRunning(null);
      onClose();
    } catch (err) {
      busy.current = false;
      setRunning(null);
      if (err instanceof HeatingSetupError && err.problem) setProblems([err.problem]);
      setFailed(err instanceof HeatingSetupError ? err.step : 'prepare');
    }
  }

  const problemText = (p: HeatingSetupProblem) => t(`heatingSetup.problem.${p}`);
  const working = running !== null;

  const body = (
    <div className="heating-sheet heating-setup">
      <div className="heating-sheet__col">
        <p className="heating-sheet__note heating-setup__intro">{t('heatingSetup.intro', { room: room.name })}</p>

        <h3 className="heating-sheet__title">{t('heatingSetup.thermostats')}</h3>
        <div className="heating-sheet__list">
          {room.thermostats.map((id) => {
            const e = entities[id];
            const state = e ? `${sl('climate', e.state)}${typeof e.attributes['temperature'] === 'number' && e.state !== 'off' ? ` · ${heatingTempParts(e.attributes['temperature'] as number, locale)} °C` : ''}` : '';
            const sub = heatingCanCool(e) ? `${state} · ${t('heatingSetup.cools')}` : state;
            return (
              <CheckRow key={id} checked={thermostats.includes(id)} label={nameOf(e, id)} sub={sub} disabled={working} onToggle={() => setThermostats((l) => toggle(l, id))} />
            );
          })}
        </div>
        {thermostats.length === 0 && <p className="heating-sheet__note">{t('heatingSetup.pickThermostat')}</p>}

        <h3 className="heating-sheet__title">{t('heatingSetup.contacts')}</h3>
        {contacts.length === 0 ? (
          <p className="heating-sheet__note">{t('heatingSetup.noContacts')}</p>
        ) : (
          <>
            <div className="heating-sheet__list">
              {contacts.map((c) => (
                <CheckRow
                  key={c.id}
                  checked={chosenContacts.includes(c.id)}
                  label={nameOf(entities[c.id], c.id)}
                  disabled={working}
                  onToggle={() => setChosenContacts((l) => toggle(l, c.id))}
                />
              ))}
            </div>
            <p className="heating-sheet__note">{t('heatingSetup.contactsHint')}</p>
          </>
        )}
      </div>

      <div className="heating-sheet__col">
        <h3 className="heating-sheet__title">{t('heatingPlan.sheet.temperatures')}</h3>
        <div className="heating-sheet__list">
          <TempRow kind="comfort" helper={helper('comfort')} value={shownComfort} onChange={setComfort} />
          <TempRow kind="eco" helper={helper('eco')} value={shownEco} onChange={setEco} />
        </div>
        <p className="heating-sheet__note">{t('heatingSetup.tempsHint')}</p>

        <p className="heating-setup__effect">{t('heatingSetup.effect')}</p>

        {problems === null ? (
          <p className="heating-sheet__note" role="status">{t('heatingSetup.checking')}</p>
        ) : (
          problems.map((p) => (
            <div key={p} className="heating-setup__problem" role="alert">
              <p className="heating-sheet__error">
                <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>{problemText(p)}</span>
              </p>
              {p === 'cors' && <code className="heating-setup__origin">{window.location.origin}</code>}
            </div>
          ))
        )}

        {working && (
          <p className="heating-sheet__note" role="status">
            {t('heatingSetup.running', { step: t(`heatingSetup.step.${running}`) })}
          </p>
        )}
        {failed && !working && (
          <p className="heating-sheet__error" role="alert">
            <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>
              {t('heatingSetup.failed', { step: t(`heatingSetup.step.${failed}`) })}{' '}
              {ready && (
                <button type="button" className="heating-sheet__retry" onClick={() => void setUp()}>
                  {t('heatingPlan.sheet.retry')}
                </button>
              )}
            </span>
          </p>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('heatingSetup.title')}
      subtitle={room.name}
      icon={<CalendarClock size={18} strokeWidth={1.75} />}
      className="modal-panel--wide heating-sheet-panel heating-setup-panel"
      swipeToClose={!working}
      footer={
        <div className="heating-confirm__actions">
          <button type="button" className="btn btn--secondary" disabled={working} onClick={close}>
            {t('heatingPlan.cancel')}
          </button>
          <button type="button" className="btn btn--primary heating-setup__go" disabled={!ready || working} onClick={() => void setUp()}>
            {t('heatingSetup.action')}
          </button>
        </div>
      }
    >
      {body}
    </Modal>
  );
}
