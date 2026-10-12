/**
 * [fork] The devices page's head in Glas (plan docs/glas/PLAN-TAFELN.md): the home's health as the head,
 * the four counts as the tafel's grid (a count has no state, so its symbol stays `label2`). The facts are those of
 * the classic DevicesHeroCard, which Klassisch keeps.
 */

import React from 'react';
import { Boxes, Cpu, LayoutGrid, DoorOpen } from 'lucide-react';
import { formatNumber } from '@hapulse/core';
import type { DevicesSummary } from '@hapulse/core';
import { Card } from '../../ui/Card';
import { useLocale, useT } from '../../../i18n/useT';
import { useSystemHealth } from '../../../ha/useSystemHealth';
import { TafelGrid, TafelHead, TAFEL_ICON } from './Tafel';
import { HealthIcon, healthTone } from './health';

export function DevicesTafel({ summary }: { summary: DevicesSummary }) {
  const t = useT();
  const locale = useLocale();
  const { health, titleKey, titleCount } = useSystemHealth();
  const n = (v: number) => formatNumber(v, locale, { maxDecimals: 0 });

  return (
    <Card className="devices-hero g-tafel">
      <TafelHead
        icon={<HealthIcon health={health} />}
        tone={healthTone(health)}
        kicker={t('system.title')}
        title={t(titleKey, titleCount !== undefined ? { count: titleCount } : undefined)}
      />
      <TafelGrid
        items={[
          { key: 'integrations', icon: <Boxes size={TAFEL_ICON} strokeWidth={2} />, label: t('devices.hero.stat.integrations'), value: n(summary.integrations) },
          { key: 'devices', icon: <Cpu size={TAFEL_ICON} strokeWidth={2} />, label: t('devices.hero.stat.devices'), value: n(summary.devices) },
          { key: 'entities', icon: <LayoutGrid size={TAFEL_ICON} strokeWidth={2} />, label: t('devices.hero.stat.entities'), value: n(summary.entities) },
          { key: 'rooms', icon: <DoorOpen size={TAFEL_ICON} strokeWidth={2} />, label: t('devices.hero.stat.rooms'), value: n(summary.rooms) },
        ]}
      />
    </Card>
  );
}
