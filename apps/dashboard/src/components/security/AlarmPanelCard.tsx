import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Shield, ShieldCheck, ShieldAlert, ShieldOff, Delete } from 'lucide-react';
import { callService } from '../../ha/service';
import { useT, useStateLabel } from '../../i18n/useT';
import type { TKey } from '../../i18n/useT';
import { Card } from '../ui/Card';
import type { HassEntity } from '@hapulse/core';
import { isAlarmActionDisabled, isAlarmActionSupported, type AlarmAction } from './alarmLogic'; // [fork]
import './AlarmPanelCard.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionDef {
  id: AlarmAction;
  labelKey: TKey;
  targetState: string;
  colorClass: string;
}

const ACTIONS: ActionDef[] = [
  { id: 'arm_home',    labelKey: 'security.alarmPanel.action.armHome',  targetState: 'armed_home',    colorClass: 'alarm-btn--home' },
  { id: 'arm_away',   labelKey: 'security.alarmPanel.action.armAway',   targetState: 'armed_away',    colorClass: 'alarm-btn--away' },
  { id: 'arm_night',  labelKey: 'security.alarmPanel.action.armNight',  targetState: 'armed_night',   colorClass: 'alarm-btn--night' },
  { id: 'arm_vacation', labelKey: 'security.alarmPanel.action.vacation', targetState: 'armed_vacation', colorClass: 'alarm-btn--vacation' },
  { id: 'disarm',     labelKey: 'security.alarmPanel.action.disarm',    targetState: 'disarmed',      colorClass: 'alarm-btn--disarm' },
];

// ---------------------------------------------------------------------------
// Numpad modal
// ---------------------------------------------------------------------------

interface NumpadModalProps {
  actionLabel: string;
  /** [fork] resolves true when HA accepted the code; on false the pad stays open and clears */
  onConfirm: (code: string) => Promise<boolean>;
  onCancel: () => void;
}

function NumpadModal({ actionLabel, onConfirm, onCancel }: NumpadModalProps) {
  const t = useT();
  const [digits, setDigits] = useState('');
  const [sending, setSending] = useState(false);

  const addDigit = useCallback((d: string) => {
    setDigits((prev) => (prev.length >= 8 ? prev : prev + d));
  }, []);

  const removeDigit = useCallback(() => {
    setDigits((prev) => prev.slice(0, -1));
  }, []);

  const confirm = useCallback(() => {
    if (digits.length === 0 || sending) return;
    setSending(true);
    void onConfirm(digits).then((ok) => {
      // accepted → the parent closes the pad; rejected (wrong code) → stay open, start over
      if (!ok) {
        setDigits('');
        setSending(false);
      }
    });
  }, [digits, onConfirm, sending]);

  const KEYS = ['1','2','3','4','5','6','7','8','9'];

  return (
    <div className="numpad-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-label={t('security.alarmPanel.numpad.dialogAria')}>
      <div className="numpad-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="numpad-modal__title">{actionLabel}</h3>
        <p className="numpad-modal__subtitle">{t('security.alarmPanel.numpad.subtitle')}</p>

        {/* Pin dots display */}
        <div
          className="numpad-modal__display"
          aria-label={t('security.alarmPanel.numpad.digitsEntered', { count: digits.length })}
        >
          {Array.from({ length: Math.max(4, digits.length) }, (_, i) => (
            <span
              key={i}
              className={`numpad-modal__dot${i < digits.length ? ' numpad-modal__dot--filled' : ''}`}
            />
          ))}
        </div>

        {/* Grid: 1–9, backspace, 0, confirm */}
        <div className="numpad-modal__grid">
          {KEYS.map((d) => (
            <button
              key={d}
              type="button"
              className="numpad-key"
              onClick={() => addDigit(d)}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            className="numpad-key numpad-key--action"
            onClick={removeDigit}
            aria-label={t('security.alarmPanel.numpad.backspace')}
            disabled={digits.length === 0}
          >
            <Delete size={18} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="numpad-key"
            onClick={() => addDigit('0')}
          >
            0
          </button>
          <button
            type="button"
            className="numpad-key numpad-key--confirm"
            onClick={confirm}
            aria-label={t('security.alarmPanel.numpad.confirm')}
            disabled={digits.length === 0 || sending}
          >
            ✓
          </button>
        </div>

        <button type="button" className="numpad-modal__cancel" onClick={onCancel}>
          {t('security.alarmPanel.numpad.cancel')}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// State icon
// ---------------------------------------------------------------------------

function StateIcon({ state }: { state: string }) {
  const size = 40;
  const sw = 1.5;
  if (state === 'disarmed') return <ShieldOff size={size} strokeWidth={sw} />;
  if (state === 'triggered') return <ShieldAlert size={size} strokeWidth={sw} />;
  if (state.startsWith('armed_')) return <ShieldCheck size={size} strokeWidth={sw} />;
  return <Shield size={size} strokeWidth={sw} />;
}

function stateColorClass(state: string): string {
  if (state === 'disarmed') return 'alarm-panel-card__state--disarmed';
  if (state === 'armed_home') return 'alarm-panel-card__state--home';
  if (state === 'armed_night') return 'alarm-panel-card__state--night';
  if (state.startsWith('armed_')) return 'alarm-panel-card__state--away';
  if (state === 'arming' || state === 'pending') return 'alarm-panel-card__state--warning';
  if (state === 'triggered') return 'alarm-panel-card__state--triggered';
  return '';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AlarmPanelCardProps {
  entity: HassEntity;
}

export function AlarmPanelCard({ entity }: AlarmPanelCardProps) {
  const t = useT();
  const sl = useStateLabel();
  const state = entity.state;
  const name =
    (entity.attributes['friendly_name'] as string | undefined) ?? t('security.alarmPanel.fallbackName');
  const codeFormat = entity.attributes['code_format'] as string | undefined;
  const requiresCode = !!codeFormat;

  // [fork] the pad remembers WHICH panel it was opened for: the page may show another
  // (more severe) panel in this card meanwhile, and the code must not go there
  const [pendingAction, setPendingAction] = useState<{ action: ActionDef; entityId: string } | null>(null);

  /** Sends the action; true when HA accepted it (a failure is shown as a toast by callService). */
  async function dispatchAction(action: AlarmAction, entityId: string, code?: string): Promise<boolean> {
    const serviceData = code ? { code } : {};
    const service = `alarm_${action}`;
    try {
      await callService('alarm_control_panel', service, serviceData, { entity_id: entityId });
      return true;
    } catch {
      return false;
    }
  }

  function handleButtonClick(action: ActionDef) {
    if (requiresCode) {
      setPendingAction({ action, entityId: entity.entity_id });
    } else {
      void dispatchAction(action.id, entity.entity_id);
    }
  }

  async function handleNumpadConfirm(code: string): Promise<boolean> {
    if (!pendingAction) return false;
    const ok = await dispatchAction(pendingAction.action.id, pendingAction.entityId, code);
    if (ok) setPendingAction(null);
    return ok;
  }

  const supportedFeatures = entity.attributes['supported_features'];
  const isTransitioning = state === 'arming' || state === 'pending';
  const isTriggered = state === 'triggered';

  return (
    <>
      <Card className={`alarm-panel-card${isTriggered ? ' alarm-panel-card--triggered' : ''}`}>
        <div className="alarm-panel-card__inner">

          {/* State display */}
          <div className={`alarm-panel-card__state-section ${stateColorClass(state)}`}>
            <div className={`alarm-panel-card__state-icon${isTriggered ? ' alarm-panel-card__state-icon--pulse' : ''}`}>
              <StateIcon state={state} />
            </div>
            <div>
              <p className="alarm-panel-card__name">{name}</p>
              <p className="alarm-panel-card__state-label">
                {sl('alarm_control_panel', state)}
                {isTransitioning && <span className="alarm-panel-card__dots" aria-hidden="true" />}
              </p>
            </div>
          </div>

          <div className="alarm-panel-card__divider" aria-hidden="true" />

          {/* Action buttons */}
          <div className="alarm-panel-card__actions">
            {ACTIONS.filter((action) => isAlarmActionSupported(action.id, supportedFeatures)).map((action) => {
              const isActive = state === action.targetState;
              return (
                <button
                  key={action.id}
                  type="button"
                  className={`alarm-btn ${action.colorClass}${isActive ? ' alarm-btn--active' : ''}`}
                  onClick={() => handleButtonClick(action)}
                  disabled={isAlarmActionDisabled(state, action.id, action.targetState)}
                  aria-pressed={isActive}
                >
                  {t(action.labelKey)}
                </button>
              );
            })}
          </div>

        </div>
      </Card>

      {pendingAction && ReactDOM.createPortal(
        <NumpadModal
          actionLabel={t(pendingAction.action.labelKey)}
          onConfirm={handleNumpadConfirm}
          onCancel={() => setPendingAction(null)}
        />,
        document.body
      )}
    </>
  );
}
