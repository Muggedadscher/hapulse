import React from 'react';
import { Monitor, CheckCircle2, AlertTriangle, AlertCircle, Battery, WifiOff } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { Card } from '../ui/Card';
import { pickSystemMetrics } from '@hapulse/core';
import type { HassEntity, SystemMonitorIndex } from '@hapulse/core';
import './SystemHeroCard.css';

type SystemHealth = 'healthy' | 'warning' | 'critical' | 'unknown';

function deriveHealth(
  cpu: HassEntity | undefined,
  mem: HassEntity | undefined,
  disk: HassEntity | undefined,
): SystemHealth {
  const c = cpu ? parseFloat(cpu.state) : NaN;
  const m = mem ? parseFloat(mem.state) : NaN;
  const d = disk ? parseFloat(disk.state) : NaN;

  if (isNaN(c) && isNaN(m) && isNaN(d)) return 'unknown';

  if ((!isNaN(c) && c > 90) || (!isNaN(m) && m > 90) || (!isNaN(d) && d > 90)) return 'critical';
  if ((!isNaN(c) && c > 75) || (!isNaN(m) && m > 80) || (!isNaN(d) && d > 80)) return 'warning';
  return 'healthy';
}

function metricChipClass(val: number, warnAt: number, critAt: number): string {
  if (val > critAt) return 'system-hero-chip--critical';
  if (val > warnAt) return 'system-hero-chip--warn';
  return 'system-hero-chip--ok';
}

interface SystemHeroCardProps {
  systemMonitorEntities: HassEntity[];
  systemMonitorIndex: SystemMonitorIndex;
  lowBatteryCount: number;
  unavailableCount: number;
}

export function SystemHeroCard({ systemMonitorEntities, systemMonitorIndex, lowBatteryCount, unavailableCount }: SystemHeroCardProps) {
  const t = useT();
  const { cpu, memory: mem, disk } = pickSystemMetrics(systemMonitorEntities, systemMonitorIndex);

  const health = deriveHealth(cpu, mem, disk);

  const cpuVal  = cpu  ? parseFloat(cpu.state)  : null;
  const memVal  = mem  ? parseFloat(mem.state)  : null;
  const diskVal = disk ? parseFloat(disk.state) : null;

  const HealthIcon =
    health === 'healthy'  ? CheckCircle2 :
    health === 'warning'  ? AlertTriangle :
    health === 'critical' ? AlertCircle  : Monitor;

  const statusLabel =
    health === 'healthy'  ? t('system.hero.status.healthy')  :
    health === 'warning'  ? t('system.hero.status.warning')  :
    health === 'critical' ? t('system.hero.status.critical') : t('system.hero.status.unknown');

  const gradientClass = `system-hero-card--${health}`;

  const hasAlerts = lowBatteryCount > 0 || unavailableCount > 0;

  return (
    <Card className={`system-hero-card ${gradientClass}`}>
      <div className="system-hero-card__inner">
        <div className="system-hero-card__main">
          <div className="system-hero-card__icon">
            <HealthIcon size={36} strokeWidth={1.5} />
          </div>
          <div className="system-hero-card__text">
            <p className="system-hero-card__label">{t('system.title')}</p>
            <p className="system-hero-card__status">{statusLabel}</p>
          </div>
        </div>

        <div className="system-hero-card__chips">
          {cpuVal !== null && (
            <div className={`system-hero-chip ${metricChipClass(cpuVal, 75, 90)}`}>
              <span className="system-hero-chip__key">{t('system.hero.chip.cpu')}</span>
              <span className="system-hero-chip__val">{Math.round(cpuVal)}%</span>
            </div>
          )}
          {memVal !== null && (
            <div className={`system-hero-chip ${metricChipClass(memVal, 80, 90)}`}>
              <span className="system-hero-chip__key">{t('system.hero.chip.ram')}</span>
              <span className="system-hero-chip__val">{Math.round(memVal)}%</span>
            </div>
          )}
          {diskVal !== null && (
            <div className={`system-hero-chip ${metricChipClass(diskVal, 80, 90)}`}>
              <span className="system-hero-chip__key">{t('system.hero.chip.disk')}</span>
              <span className="system-hero-chip__val">{Math.round(diskVal)}%</span>
            </div>
          )}
          {lowBatteryCount > 0 && (
            <div className="system-hero-chip system-hero-chip--warn">
              <Battery size={12} strokeWidth={2} aria-hidden="true" />
              <span>{t('system.hero.lowBatteryCount', { count: lowBatteryCount })}</span>
            </div>
          )}
          {unavailableCount > 0 && (
            <div className="system-hero-chip system-hero-chip--critical">
              <WifiOff size={12} strokeWidth={2} aria-hidden="true" />
              <span>{t('system.hero.unavailableCount', { count: unavailableCount })}</span>
            </div>
          )}
          {!hasAlerts && cpuVal === null && memVal === null && diskVal === null && (
            <div className="system-hero-chip system-hero-chip--muted">
              <span>{t('system.hero.noMetrics')}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
