import React from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldOff,
  Lock, LockOpen, DoorOpen, Grid2x2, Activity, Camera,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useConnectionStore } from '../../stores/connectionStore';
import { useT } from '../../i18n/useT';
import { Card } from '../ui/Card';
import type { HassEntity } from '@hapulse/core';
import './SecurityHeroCard.css';

function alarmGradientClass(state: string | undefined): string {
  if (!state || state === 'disarmed') return 'security-hero-card--disarmed';
  if (state === 'armed_home') return 'security-hero-card--armed-home';
  if (state === 'armed_night') return 'security-hero-card--armed-night';
  if (state === 'triggered' || state === 'pending') return 'security-hero-card--triggered';
  if (state.startsWith('armed_')) return 'security-hero-card--armed-away';
  return 'security-hero-card--disarmed';
}

function AlarmStateIcon({ state }: { state: string | undefined }) {
  const size = 36;
  const sw = 1.5;
  if (!state || state === 'disarmed') return <ShieldOff size={size} strokeWidth={sw} />;
  if (state === 'triggered' || state === 'pending') return <ShieldAlert size={size} strokeWidth={sw} />;
  if (state.startsWith('armed_')) return <ShieldCheck size={size} strokeWidth={sw} />;
  return <Shield size={size} strokeWidth={sw} />;
}

interface SecurityHeroCardProps {
  alarm: HassEntity | undefined;
  people: HassEntity[];
  locks: HassEntity[];
  doorSensors: HassEntity[];
  windowSensors: HassEntity[];
  motionSensors: HassEntity[];
  cameras: HassEntity[];
}

export function SecurityHeroCard({
  alarm,
  people,
  locks,
  doorSensors,
  windowSensors,
  motionSensors,
  cameras,
}: SecurityHeroCardProps) {
  const t = useT();
  const url = useConnectionStore(useShallow((s) => s.url));

  const alarmState = alarm?.state;
  const alarmName =
    (alarm?.attributes['friendly_name'] as string | undefined) ?? t('security.hero.alarmFallbackName');
  const gradientClass = alarmGradientClass(alarmState);

  const homePeople = people.filter((p) => p.state === 'home');
  const unlockedLocks = locks.filter((l) => l.state === 'unlocked');
  const openDoors = doorSensors.filter((s) => s.state === 'on');
  const openWindows = windowSensors.filter((s) => s.state === 'on');
  const activeMotion = motionSensors.filter((s) => s.state === 'on');
  const firstHomeName = homePeople[0]?.attributes['friendly_name'] as string | undefined;

  return (
    <Card className={`security-hero-card ${gradientClass}`}>
      <div className="security-hero-card__inner">

        {/* Alarm state */}
        <div className="security-hero-card__alarm">
          <div className="security-hero-card__alarm-icon">
            <AlarmStateIcon state={alarmState} />
          </div>
          <div className="security-hero-card__alarm-text">
            <p className="security-hero-card__alarm-name">{alarmName}</p>
            <p className="security-hero-card__alarm-state">
              {alarmState ? alarmState.replace(/_/g, ' ') : t('security.hero.notConfigured')}
            </p>
          </div>
          {people.length > 0 && (
            <div className="security-hero-card__people">
              {people.map((person) => {
                const name = (person.attributes['friendly_name'] as string | undefined) ?? person.entity_id;
                const pic = person.attributes['entity_picture'] as string | undefined;
                const isHome = person.state === 'home';
                const avatarUrl = pic && url ? `${url}${pic}` : null;
                return (
                  <div
                    key={person.entity_id}
                    className={`security-hero-avatar${isHome ? ' security-hero-avatar--home' : ' security-hero-avatar--away'}`}
                    title={
                      isHome
                        ? t('security.hero.personHomeTitle', { name })
                        : t('security.hero.personAwayTitle', { name })
                    }
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={name} className="security-hero-avatar__img" />
                    ) : (
                      <div className="security-hero-avatar__fallback" aria-hidden="true">
                        {name[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    {isHome && <div className="security-hero-avatar__dot" aria-hidden="true" />}
                  </div>
                );
              })}
              {homePeople.length > 0 && (
                <span className="security-hero-card__people-label">
                  {homePeople.length !== 1
                    ? t('security.hero.peopleHome', { count: homePeople.length })
                    : firstHomeName
                      ? t('security.hero.personIsHome', { name: firstHomeName })
                      : t('security.hero.someoneIsHome')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status chips */}
        <div className="security-hero-card__chips">
          {locks.length > 0 && (
            <div className={`security-hero-chip${unlockedLocks.length === 0 ? ' security-hero-chip--ok' : ' security-hero-chip--danger'}`}>
              {unlockedLocks.length === 0
                ? <Lock size={13} strokeWidth={1.75} />
                : <LockOpen size={13} strokeWidth={1.75} />}
              <span>
                {unlockedLocks.length === 0
                  ? t('security.hero.allLocked')
                  : t('security.hero.unlockedCount', { count: unlockedLocks.length })}
              </span>
            </div>
          )}
          {doorSensors.length > 0 && (
            <div className={`security-hero-chip${openDoors.length === 0 ? ' security-hero-chip--ok' : ' security-hero-chip--danger'}`}>
              <DoorOpen size={13} strokeWidth={1.75} />
              <span>
                {openDoors.length === 0
                  ? t('security.hero.doorsClosed')
                  : t('security.hero.openCount', { count: openDoors.length })}
              </span>
            </div>
          )}
          {windowSensors.length > 0 && (
            <div className={`security-hero-chip${openWindows.length === 0 ? ' security-hero-chip--ok' : ' security-hero-chip--warn'}`}>
              <Grid2x2 size={13} strokeWidth={1.75} />
              <span>
                {openWindows.length === 0
                  ? t('security.hero.windowsClosed')
                  : t('security.hero.openCount', { count: openWindows.length })}
              </span>
            </div>
          )}
          {motionSensors.length > 0 && (
            <div className={`security-hero-chip${activeMotion.length === 0 ? ' security-hero-chip--muted' : ' security-hero-chip--warn'}`}>
              <Activity size={13} strokeWidth={1.75} />
              <span>
                {activeMotion.length === 0
                  ? t('security.hero.noMotion')
                  : t('security.hero.detectedCount', { count: activeMotion.length })}
              </span>
            </div>
          )}
          {cameras.length > 0 && (
            <div className="security-hero-chip security-hero-chip--muted">
              <Camera size={13} strokeWidth={1.75} />
              <span>{t('security.hero.cameraCount', { count: cameras.length })}</span>
            </div>
          )}
        </div>

      </div>
    </Card>
  );
}
