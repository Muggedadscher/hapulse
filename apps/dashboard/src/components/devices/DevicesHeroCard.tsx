/**
 * DevicesHeroCard — full-width summary hero for the Devices page.
 * Shows integration / device / entity / room counts and the Home Status state.
 */

import React from 'react';
import {
  Boxes, Cpu, LayoutGrid, DoorOpen,
  CheckCircle2, AlertTriangle, AlertCircle, Monitor,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { useSystemHealth } from '../../ha/useSystemHealth';
import { useT } from '../../i18n/useT';
import type { DevicesSummary } from '@hapulse/core';

interface StatProps {
  icon: React.ReactNode;
  value: number;
  label: string;
}

function Stat({ icon, value, label }: StatProps) {
  return (
    <div className="devices-hero__stat">
      <span className="devices-hero__stat-icon" aria-hidden="true">{icon}</span>
      <div className="devices-hero__stat-body">
        <span className="devices-hero__stat-value data-font">{value}</span>
        <span className="devices-hero__stat-label">{label}</span>
      </div>
    </div>
  );
}

export function DevicesHeroCard({ summary }: { summary: DevicesSummary }) {
  const t = useT();
  const { health, titleKey, titleCount } = useSystemHealth();
  const title = t(titleKey, titleCount !== undefined ? { count: titleCount } : undefined);
  const StatusIcon =
    health === 'healthy' ? CheckCircle2 :
    health === 'warning' ? AlertTriangle :
    health === 'critical' ? AlertCircle : Monitor;

  return (
    <Card className="devices-hero">
      <div className="devices-hero__head">
        <div>
          <h2 className="devices-hero__title">{t('devices.hero.title')}</h2>
          <p className="devices-hero__subtitle">
            {t('devices.hero.deviceCount', { count: summary.devices })} · {t('devices.hero.roomCount', { count: summary.rooms })}
          </p>
        </div>
        <span className={`devices-hero__status devices-hero__status--${health}`}>
          <StatusIcon size={15} strokeWidth={2} />
          {title}
        </span>
      </div>

      <div className="devices-hero__stats">
        <Stat icon={<Boxes size={18} strokeWidth={1.75} />} value={summary.integrations} label={t('devices.hero.stat.integrations')} />
        <Stat icon={<Cpu size={18} strokeWidth={1.75} />} value={summary.devices} label={t('devices.hero.stat.devices')} />
        <Stat icon={<LayoutGrid size={18} strokeWidth={1.75} />} value={summary.entities} label={t('devices.hero.stat.entities')} />
        <Stat icon={<DoorOpen size={18} strokeWidth={1.75} />} value={summary.rooms} label={t('devices.hero.stat.rooms')} />
      </div>
    </Card>
  );
}
