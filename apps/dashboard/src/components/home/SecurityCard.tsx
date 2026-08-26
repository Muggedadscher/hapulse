/**
 * SecurityCard — alarm state, locks, motion sensors, cameras.
 * Doors and windows are shown as two separate rows.
 */
import React from 'react';
import { useNavigate } from 'react-router';
import {
  Shield, Lock, Unlock, Activity, Camera, ChevronRight, ShieldCheck,
  DoorOpen, DoorClosed, Columns2,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { useSettingsStore } from '../../stores/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { pickAlarmPanel } from '@hapulse/core';
import type { HassEntityMap } from '@hapulse/core';
import { useT, useStateLabel } from '../../i18n/useT';
import './SecurityCard.css';

interface SecurityCardProps {
  entities: HassEntityMap;
}

export function SecurityCard({ entities }: SecurityCardProps) {
  const navigate = useNavigate();
  const t = useT();
  const sl = useStateLabel();
  const hiddenEntities = useSettingsStore(
    useShallow((s) => s.customization.hiddenEntities)
  );
  const all = Object.values(entities).filter(
    (e) => !hiddenEntities.includes(e.entity_id)
  );

  // Alarm
  const alarm = pickAlarmPanel(all);
  const alarmState = alarm?.state ?? null;
  const alarmLabel = alarmState
    ? sl('alarm_control_panel', alarmState)
    : t('home.security.notConfigured');

  /** Returns the CSS colour key for the alarm dot/value based on state. */
  function alarmColorKey(state: string | null): 'ok' | 'info' | 'danger' | 'muted' | 'warn' {
    switch (state) {
      case 'armed_home':     return 'ok';
      case 'armed_night':    return 'info';
      case 'armed_away':
      case 'armed_vacation':
      case 'triggered':
      case 'pending':        return 'danger';
      case 'arming':         return 'warn';
      default:               return 'muted'; // disarmed or null
    }
  }

  const alarmColor = alarmColorKey(alarmState);
  const alarmOk = !alarmState || alarmState === 'disarmed';

  // Locks
  const locks = all.filter((e) => e.entity_id.startsWith('lock.'));
  const unlockedLocks = locks.filter((e) => e.state === 'unlocked');

  // Motion sensors
  const motionSensors = all.filter(
    (e) => e.entity_id.startsWith('binary_sensor.') && e.attributes.device_class === 'motion'
  );
  const activeMotion = motionSensors.filter((e) => e.state === 'on');

  // Window sensors (device_class: window or opening)
  const windowSensors = all.filter(
    (e) =>
      e.entity_id.startsWith('binary_sensor.') &&
      (e.attributes.device_class === 'window' || e.attributes.device_class === 'opening')
  );
  const openWindows = windowSensors.filter((e) => e.state === 'on');

  // Door sensors (device_class: door or garage_door)
  const doorSensors = all.filter(
    (e) =>
      e.entity_id.startsWith('binary_sensor.') &&
      (e.attributes.device_class === 'door' || e.attributes.device_class === 'garage_door')
  );
  const openDoors = doorSensors.filter((e) => e.state === 'on');

  // Cameras
  const cameras = all.filter((e) => e.entity_id.startsWith('camera.'));

  // Overall status: positive if alarm disarmed/absent, no unlocked locks, no active motion, no open sensors
  const anyAlert =
    unlockedLocks.length > 0 ||
    activeMotion.length > 0 ||
    openDoors.length > 0 ||
    openWindows.length > 0;
  const alarmTriggered = alarmState === 'triggered' || alarmState === 'pending';

  const hasAnySecurityEntity =
    alarm ||
    locks.length > 0 ||
    motionSensors.length > 0 ||
    cameras.length > 0 ||
    windowSensors.length > 0 ||
    doorSensors.length > 0;
  if (!hasAnySecurityEntity) return null;

  return (
    <Card className="security-card">
      <div className="security-card__header">
        <div className="security-card__title-row">
          <span
            className={`security-card__shield-chip${alarmTriggered ? ' security-card__shield-chip--danger' : anyAlert ? ' security-card__shield-chip--warn' : ' security-card__shield-chip--ok'}`}
            aria-hidden="true"
          >
            {alarmTriggered
              ? <Shield size={16} strokeWidth={1.75} />
              : anyAlert
              ? <Shield size={16} strokeWidth={1.75} />
              : <ShieldCheck size={16} strokeWidth={1.75} />}
          </span>
          <span className="security-card__title">{t('home.security.title')}</span>
        </div>
        <button
          className="security-card__view-link"
          onClick={() => void navigate('/security')}
          type="button"
          aria-label={t('home.security.detailsAria')}
        >
          {t('home.security.details')}
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="card-scroll-body card-scroll-wrap">
      {/* Alarm row */}
      {alarm && (
        <div className="security-row">
          <span
            className={`security-row__dot security-row__dot--${alarmColor}`}
            aria-hidden="true"
          />
          <span className="security-row__icon" aria-hidden="true">
            <Shield size={15} strokeWidth={1.75} />
          </span>
          <span className="security-row__label">{t('home.security.alarmLabel')}</span>
          <span className={`security-row__value security-row__value--${alarmColor}`}>
            {alarmLabel}
          </span>
        </div>
      )}

      {/* Locks */}
      {locks.length > 0 && (
        <div className="security-row">
          <span
            className={`security-row__dot${unlockedLocks.length === 0 ? ' security-row__dot--ok' : ' security-row__dot--danger'}`}
            aria-hidden="true"
          />
          <span className="security-row__icon" aria-hidden="true">
            {unlockedLocks.length > 0
              ? <Unlock size={15} strokeWidth={1.75} />
              : <Lock size={15} strokeWidth={1.75} />}
          </span>
          <span className="security-row__label">
            {locks.length === 1
              ? (locks[0]!.attributes.friendly_name ?? t('home.security.doorFallback')).toString().replace(/_/g, ' ')
              : t('home.security.locksLabel')}
          </span>
          <span
            className={`security-row__value${unlockedLocks.length > 0 ? ' security-row__value--danger' : ' security-row__value--ok'}`}
          >
            {unlockedLocks.length > 0
              ? t('home.security.unlockedCount', { count: unlockedLocks.length })
              : t('home.security.allLocked')}
          </span>
        </div>
      )}

      {/* Windows */}
      {windowSensors.length > 0 && (
        <div className="security-row">
          <span
            className={`security-row__dot${openWindows.length === 0 ? ' security-row__dot--ok' : ' security-row__dot--warn'}`}
            aria-hidden="true"
          />
          <span className="security-row__icon" aria-hidden="true">
            <Columns2 size={15} strokeWidth={1.75} />
          </span>
          <span className="security-row__label">{t('home.security.windowsLabel')}</span>
          <span
            className={`security-row__value${openWindows.length > 0 ? ' security-row__value--warn' : ' security-row__value--ok'}`}
          >
            {openWindows.length > 0 ? t('home.security.openCount', { count: openWindows.length }) : t('home.security.allClosed')}
          </span>
        </div>
      )}

      {/* Doors */}
      {doorSensors.length > 0 && (
        <div className="security-row">
          <span
            className={`security-row__dot${openDoors.length === 0 ? ' security-row__dot--ok' : ' security-row__dot--danger'}`}
            aria-hidden="true"
          />
          <span className="security-row__icon" aria-hidden="true">
            {openDoors.length > 0
              ? <DoorOpen size={15} strokeWidth={1.75} />
              : <DoorClosed size={15} strokeWidth={1.75} />}
          </span>
          <span className="security-row__label">{t('home.security.doorsLabel')}</span>
          <span
            className={`security-row__value${openDoors.length > 0 ? ' security-row__value--danger' : ' security-row__value--ok'}`}
          >
            {openDoors.length > 0 ? t('home.security.openCount', { count: openDoors.length }) : t('home.security.allClosed')}
          </span>
        </div>
      )}

      {/* Motion */}
      {motionSensors.length > 0 && (
        <div className="security-row">
          <span
            className={`security-row__dot${activeMotion.length === 0 ? ' security-row__dot--ok' : ' security-row__dot--warn'}`}
            aria-hidden="true"
          />
          <span className="security-row__icon" aria-hidden="true">
            <Activity size={15} strokeWidth={1.75} />
          </span>
          <span className="security-row__label">{t('home.security.motionLabel')}</span>
          <span className={`security-row__value${activeMotion.length > 0 ? ' security-row__value--warn' : ''}`}>
            {activeMotion.length > 0 ? t('home.security.detectedCount', { count: activeMotion.length }) : t('home.security.noMotion')}
          </span>
        </div>
      )}

      {/* Cameras */}
      {cameras.length > 0 && (
        <div className="security-row">
          <span className="security-row__dot security-row__dot--ok" aria-hidden="true" />
          <span className="security-row__icon" aria-hidden="true">
            <Camera size={15} strokeWidth={1.75} />
          </span>
          <span className="security-row__label">{t('home.security.camerasLabel')}</span>
          <span className="security-row__value">
            {t('home.security.activeCount', { count: cameras.length })}
          </span>
        </div>
      )}

      {/* Summary line when no entities trigger an alert */}
      {!anyAlert && !alarmTriggered && (
        <p className="security-card__summary">
          <span className="security-card__summary-dot" aria-hidden="true" />
          {t('home.security.allNormal')}
        </p>
      )}
      </div>
    </Card>
  );
}
