/**
 * [fork] The security page's head in Glas (plan docs/glas/PLAN-TAFELN.md): the alarm as the head, the
 * people in a row, the protections as the tafel's grid of words (locks, garage doors, doors, windows, motion,
 * cameras). Colour only where something differs, like the status chips (K87): closed, locked, quiet and the cameras
 * stay `label2`; open doors and windows and motion in warnInk, open locks and garage doors in redInk, faults in
 * warnInk, each at symbol and word. The rules are the classic hero's (lockSummary/lockTone,
 * garageSummary, alarmGradientClass), which Klassisch keeps.
 */

import React from 'react';
import {
  Activity, Camera, DoorOpen, Grid2x2, Lock, LockOpen, Shield, ShieldAlert, ShieldCheck, ShieldOff,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { formatNumber, garageSummary } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import { Card } from '../../ui/Card';
import { useConnectionStore } from '../../../stores/connectionStore';
import { useLocale, useStateLabel, useT } from '../../../i18n/useT';
import { useCameraCount } from '../../../nvr/cameraSource';
import { GarageSummaryIcon } from '../../garage/GarageIcon';
import { summaryTone } from '../../garage/garageText';
import { lockSummary, lockTone } from '../../security/lockLogic';
import { alarmGradientClass } from '../../security/SecurityHeroCard';
import { TafelGrid, TafelHead, TAFEL_ICON } from './Tafel';
import type { TafelFigure, TafelTone } from './Tafel';

interface SecurityTafelProps {
  alarm: HassEntity | undefined;
  people: HassEntity[];
  locks: HassEntity[];
  garages?: HassEntity[] | undefined;
  doorSensors: HassEntity[];
  windowSensors: HassEntity[];
  motionSensors: HassEntity[];
  cameras: HassEntity[];
}

/** the alarm's tone, from the classic hero's states: armed green, triggered and pending red, else none */
function alarmTone(state: string | undefined): TafelTone {
  const cls = alarmGradientClass(state);
  if (cls.endsWith('--triggered')) return 'danger';
  if (cls.endsWith('--disarmed')) return 'none';
  return 'ok';
}

function AlarmIcon({ state }: { state: string | undefined }) {
  const Icon =
    !state || state === 'disarmed' ? ShieldOff :
    state === 'triggered' || state === 'pending' ? ShieldAlert :
    state.startsWith('armed_') ? ShieldCheck : Shield;
  return <Icon size={28} strokeWidth={1.75} />;
}

export function SecurityTafel({
  alarm, people, locks, garages = [], doorSensors, windowSensors, motionSensors, cameras,
}: SecurityTafelProps) {
  const t = useT();
  const sl = useStateLabel();
  const locale = useLocale();
  const url = useConnectionStore(useShallow((s) => s.url));
  const cameraCount = useCameraCount(cameras.length).total;
  const garage = garageSummary(garages);
  const gTone = summaryTone(garage);
  const lockSum = lockSummary(locks);
  const lState = lockTone(lockSum);

  const state = alarm?.state;
  const alarmName = (alarm?.attributes['friendly_name'] as string | undefined) ?? t('security.hero.alarmFallbackName');
  const home = people.filter((p) => p.state === 'home');
  const firstHome = home[0]?.attributes['friendly_name'] as string | undefined;
  const openDoors = doorSensors.filter((s) => s.state === 'on').length;
  const openWindows = windowSensors.filter((s) => s.state === 'on').length;
  const motion = motionSensors.filter((s) => s.state === 'on').length;
  const icon = (I: typeof Lock) => <I size={TAFEL_ICON} strokeWidth={2} />;

  const items: TafelFigure[] = [];
  if (locks.length > 0) {
    items.push({
      key: 'locks',
      icon: icon(lState === 'open' ? LockOpen : Lock),
      label: t('home.security.locksLabel'),
      tone: lState === 'locked' ? 'none' : lState === 'open' ? 'danger' : 'warn',
      value:
        lState === 'open' ? t('security.hero.unlockedCount', { count: lockSum.open }) :
        lState === 'problem' ? t('locks.problemCount', { count: lockSum.problem }) : t('security.hero.allLocked'),
    });
  }
  if (garage.total > 0) {
    items.push({
      key: 'garage',
      icon: <GarageSummaryIcon tone={gTone} size={TAFEL_ICON} />,
      label: t('garage.title'),
      tone: gTone === 'closed' ? 'none' : gTone === 'open' ? 'danger' : 'warn',
      value:
        gTone === 'open' ? t('security.hero.garageOpenCount', { count: garage.open }) :
        gTone === 'unavailable' ? t('garage.unavailableCount', { count: garage.unavailable }) : t('glas.tafel.garageClosed'),
    });
  }
  if (doorSensors.length > 0) {
    items.push({
      key: 'doors', icon: icon(DoorOpen), label: t('home.security.doorsLabel'),
      tone: openDoors > 0 ? 'warn' : 'none',
      value: openDoors > 0 ? t('security.hero.openCount', { count: openDoors }) : t('glas.tafel.doorsClosed'),
    });
  }
  if (windowSensors.length > 0) {
    items.push({
      key: 'windows', icon: icon(Grid2x2), label: t('home.security.windowsLabel'),
      tone: openWindows > 0 ? 'warn' : 'none',
      value: openWindows > 0 ? t('security.hero.openCount', { count: openWindows }) : t('glas.tafel.windowsClosed'),
    });
  }
  if (motionSensors.length > 0) {
    items.push({
      key: 'motion', icon: icon(Activity), label: t('home.security.motionLabel'),
      tone: motion > 0 ? 'warn' : 'none',
      value: motion > 0 ? t('security.hero.detectedCount', { count: motion }) : t('glas.tafel.noMotion'),
    });
  }
  if (cameraCount > 0) {
    items.push({
      key: 'cameras', icon: icon(Camera), label: t('home.security.camerasLabel'),
      value: formatNumber(cameraCount, locale, { maxDecimals: 0 }),
    });
  }

  return (
    <Card className="security-hero-card g-tafel">
      <TafelHead
        icon={<AlarmIcon state={state} />}
        tone={alarmTone(state)}
        kicker={alarmName}
        title={state ? sl('alarm_control_panel', state) : t('security.hero.notConfigured')}
      />
      {people.length > 0 && (
        <div className="g-tafel__people">
          <span className="g-tafel__faces">
            {people.map((p) => {
              const name = (p.attributes['friendly_name'] as string | undefined) ?? p.entity_id;
              const pic = p.attributes['entity_picture'] as string | undefined;
              const isHome = p.state === 'home';
              const label = isHome ? t('security.hero.personHomeTitle', { name }) : t('security.hero.personAwayTitle', { name });
              return (
                <span
                  key={p.entity_id}
                  className="g-tafel__face"
                  data-home={isHome ? '' : undefined}
                  role="img"
                  aria-label={label}
                  title={label}
                >
                  {pic && url ? (
                    <img src={`${url}${pic}`} alt="" />
                  ) : (
                    <span aria-hidden="true">{name[0]?.toUpperCase() ?? '?'}</span>
                  )}
                </span>
              );
            })}
          </span>
          {home.length > 0 && (
            <span className="g-tafel__people-label">
              {home.length !== 1
                ? t('security.hero.peopleHome', { count: home.length })
                : firstHome
                  ? t('security.hero.personIsHome', { name: firstHome })
                  : t('security.hero.someoneIsHome')}
            </span>
          )}
        </div>
      )}
      <TafelGrid items={items} kind="text" min={140} max={3} />
    </Card>
  );
}
