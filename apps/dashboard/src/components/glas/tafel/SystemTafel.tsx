/**
 * [fork] The system page's head in Glas (plan docs/glas/PLAN-TAFELN.md): the health as the head, CPU,
 * memory and disk as rings coloured by the classic thresholds (deriveHealth, metricChipClass in SystemHeroCard), low
 * batteries and unavailable devices as note rows. Klassisch keeps SystemHeroCard.
 */

import React from 'react';
import { Battery, WifiOff } from 'lucide-react';
import { formatNumber, pickSystemMetrics } from '@hapulse/core';
import type { HassEntity, SystemMonitorIndex } from '@hapulse/core';
import { Card } from '../../ui/Card';
import { useLocale, useT } from '../../../i18n/useT';
import { deriveHealth, metricChipClass } from '../../system/SystemHeroCard';
import { TafelHead, TafelNotes, TafelRings } from './Tafel';
import type { TafelGauge, TafelNote } from './Tafel';
import { HealthIcon, healthTone } from './health';

interface SystemTafelProps {
  systemMonitorEntities: HassEntity[];
  systemMonitorIndex: SystemMonitorIndex;
  lowBatteryCount: number;
  unavailableCount: number;
}

function gaugeTone(value: number, warnAt: number, critAt: number): TafelGauge['tone'] {
  const cls = metricChipClass(value, warnAt, critAt);
  return cls.endsWith('--critical') ? 'danger' : cls.endsWith('--warn') ? 'warn' : 'ok';
}

export function SystemTafel({ systemMonitorEntities, systemMonitorIndex, lowBatteryCount, unavailableCount }: SystemTafelProps) {
  const t = useT();
  const locale = useLocale();
  const { cpu, memory, disk } = pickSystemMetrics(systemMonitorEntities, systemMonitorIndex);
  const health = deriveHealth(cpu, memory, disk);
  const value = (e: HassEntity | undefined) => (e ? parseFloat(e.state) : NaN);
  const pct = (v: number) => `${formatNumber(Math.round(v), locale, { maxDecimals: 0 })} %`;

  const gauges: TafelGauge[] = [];
  const metrics: [string, HassEntity | undefined, 'system.hero.chip.cpu' | 'system.hero.chip.ram' | 'system.hero.chip.disk', number, number][] = [
    ['cpu', cpu, 'system.hero.chip.cpu', 75, 90],
    ['ram', memory, 'system.hero.chip.ram', 80, 90],
    ['disk', disk, 'system.hero.chip.disk', 80, 90],
  ];
  for (const [key, entity, label, warnAt, critAt] of metrics) {
    const v = value(entity);
    if (!isNaN(v)) gauges.push({ key, label: t(label), value: pct(v), pct: v, tone: gaugeTone(v, warnAt, critAt) });
  }

  const notes: TafelNote[] = [];
  if (lowBatteryCount > 0) {
    notes.push({ key: 'battery', tone: 'warn', icon: <Battery size={18} strokeWidth={2} />, text: t('system.hero.lowBatteryCount', { count: lowBatteryCount }) });
  }
  if (unavailableCount > 0) {
    notes.push({ key: 'unavailable', tone: 'warn', icon: <WifiOff size={18} strokeWidth={2} />, text: t('system.hero.unavailableCount', { count: unavailableCount }) });
  }

  const status =
    health === 'healthy' ? t('system.hero.status.healthy') :
    health === 'warning' ? t('system.hero.status.warning') :
    health === 'critical' ? t('system.hero.status.critical') : t('system.hero.status.unknown');

  return (
    <Card className="system-hero-card g-tafel" data-health={health}>
      <TafelHead icon={<HealthIcon health={health} />} tone={healthTone(health)} title={status} />
      <TafelRings items={gauges} label={t('system.title')} />
      <TafelNotes items={notes} />
      {gauges.length === 0 && notes.length === 0 && <p className="g-tafel__empty">{t('system.hero.noMetrics')}</p>}
    </Card>
  );
}
