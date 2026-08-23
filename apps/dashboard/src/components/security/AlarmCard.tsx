/**
 * AlarmCard — Alarm control panel: state display + arm/disarm buttons + code input.
 */

import React, { useState, useCallback } from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';
import { callService } from '../../ha/service';
import { useT, useStateLabel } from '../../i18n/useT';
import { Card } from '../ui/Card';
import type { HassEntity } from '@hapulse/core';
import './AlarmCard.css';

type AlarmState =
  | 'disarmed'
  | 'armed_home'
  | 'armed_away'
  | 'armed_night'
  | 'armed_vacation'
  | 'armed_custom_bypass'
  | 'arming'
  | 'pending'
  | 'triggered';

function stateColorClass(state: string): string {
  if (state === 'disarmed') return 'alarm-card__state--disarmed';
  if (state.startsWith('armed_')) return 'alarm-card__state--armed';
  if (state === 'arming' || state === 'pending') return 'alarm-card__state--warning';
  if (state === 'triggered') return 'alarm-card__state--triggered';
  return '';
}

function StateIcon({ state }: { state: string }) {
  const size = 32;
  const sw = 1.5;
  if (state === 'disarmed') return <ShieldOff size={size} strokeWidth={sw} />;
  if (state === 'triggered') return <ShieldAlert size={size} strokeWidth={sw} />;
  if (state.startsWith('armed_')) return <ShieldCheck size={size} strokeWidth={sw} />;
  return <Shield size={size} strokeWidth={sw} />;
}

interface AlarmCardProps {
  entity: HassEntity;
}

export function AlarmCard({ entity }: AlarmCardProps) {
  const t = useT();
  const sl = useStateLabel();
  const state = entity.state as AlarmState;
  const codeFormat = entity.attributes['code_format'] as string | undefined;
  const requiresCode = !!codeFormat;
  const name =
    (entity.attributes['friendly_name'] as string | undefined) ?? t('security.alarmCard.fallbackName');

  const [code, setCode] = useState('');

  const target = { entity_id: entity.entity_id };

  const handleArmHome = useCallback(() => {
    callService('alarm_control_panel', 'alarm_arm_home', requiresCode ? { code } : {}, target);
  }, [code, requiresCode, entity.entity_id]);

  const handleArmAway = useCallback(() => {
    callService('alarm_control_panel', 'alarm_arm_away', requiresCode ? { code } : {}, target);
  }, [code, requiresCode, entity.entity_id]);

  const handleDisarm = useCallback(() => {
    callService('alarm_control_panel', 'alarm_disarm', requiresCode ? { code } : {}, target);
  }, [code, requiresCode, entity.entity_id]);

  const isTriggered = state === 'triggered';
  const isArmed = state.startsWith('armed_');

  return (
    <Card className={`alarm-card ${isTriggered ? 'alarm-card--triggered' : ''}`} active={isArmed || isTriggered}>
      <div className="alarm-card__inner">
        {/* Status header: icon chip + state label */}
        <div className={`alarm-card__state-wrap ${stateColorClass(state)}`}>
          <div className={`alarm-card__icon ${isTriggered ? 'alarm-card__icon--pulse' : ''}`}>
            <StateIcon state={state} />
          </div>
          <div>
            <p className="alarm-card__name">{name}</p>
            <p className="alarm-card__state-label">{sl('alarm_control_panel', state)}</p>
          </div>
        </div>

        <div className="alarm-card__divider" aria-hidden="true" />

        {/* Code input */}
        {requiresCode && (
          <div className="alarm-card__code-wrap">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              className="alarm-card__code-input"
              placeholder={t('security.alarmCard.codePlaceholder')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-label={t('security.alarmCard.codeAria')}
              maxLength={8}
              autoComplete="off"
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="alarm-card__actions">
          <button
            className="alarm-card__btn alarm-card__btn--home"
            onClick={handleArmHome}
            disabled={state === 'armed_home' || state === 'arming'}
            type="button"
          >
            {t('security.alarmCard.armHome')}
          </button>
          <button
            className="alarm-card__btn alarm-card__btn--away"
            onClick={handleArmAway}
            disabled={state === 'armed_away' || state === 'arming'}
            type="button"
          >
            {t('security.alarmCard.armAway')}
          </button>
          <button
            className="alarm-card__btn alarm-card__btn--disarm"
            onClick={handleDisarm}
            disabled={state === 'disarmed'}
            type="button"
          >
            {t('security.alarmCard.disarm')}
          </button>
        </div>
      </div>
    </Card>
  );
}
