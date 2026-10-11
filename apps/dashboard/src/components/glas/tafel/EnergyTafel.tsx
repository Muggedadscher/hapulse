/**
 * [fork] The energy page's head in Glas (plan docs/glas/PLAN-TAFELN.md): the period segment, the home's
 * consumption large, the sources as the tafel's grid. Only solar is coloured (its chart colour, GLAS-DESIGN §2.4); the
 * other amounts have no state. While another period loads the figures dim (Energy.tsx `data-g-stale`, tafel.css). The
 * facts and their order are the classic EnergyHeroCard's, which Klassisch keeps.
 */

import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine, BatteryCharging, House, Sun, Zap } from 'lucide-react';
import type { EnergyDashboard, EnergyPeriod } from '@hapulse/core';
import { Card } from '../../ui/Card';
import { useLocale, useT } from '../../../i18n/useT';
import { PeriodSelector, fmtCost, fmtEnergy } from '../../energy/EnergyCards';
import { TafelGrid, TAFEL_ICON } from './Tafel';
import type { TafelFigure } from './Tafel';

interface EnergyTafelProps {
  dashboard: EnergyDashboard;
  period: EnergyPeriod;
  onPeriodChange: (p: EnergyPeriod) => void;
  currency: string | null;
}

export function EnergyTafel({ dashboard: d, period, onPeriodChange, currency }: EnergyTafelProps) {
  const t = useT();
  const locale = useLocale();
  const items: TafelFigure[] = [];
  if (d.hasGrid) {
    items.push({ key: 'grid', icon: <ArrowDownToLine size={TAFEL_ICON} strokeWidth={2} />, label: t('energy.hero.fromGrid'), value: fmtEnergy(d.gridConsumed, locale), unit: 'kWh' });
    items.push({ key: 'returned', icon: <ArrowUpFromLine size={TAFEL_ICON} strokeWidth={2} />, label: t('energy.hero.returned'), value: fmtEnergy(d.gridReturned, locale), unit: 'kWh' });
  }
  if (d.hasSolar) {
    items.push({ key: 'solar', icon: <Sun size={TAFEL_ICON} strokeWidth={2} />, label: t('energy.hero.solar'), value: fmtEnergy(d.solarProduced, locale), unit: 'kWh', tone: 'solar' });
  }
  if (d.hasBattery) {
    items.push({ key: 'battery', icon: <BatteryCharging size={TAFEL_ICON} strokeWidth={2} />, label: t('energy.hero.batteryOut'), value: fmtEnergy(d.batteryOut, locale), unit: 'kWh' });
  }
  if (d.cost != null) {
    items.push({ key: 'cost', icon: <Zap size={TAFEL_ICON} strokeWidth={2} />, label: t('energy.hero.gridCost'), value: fmtCost(d.cost, currency, locale) });
  }

  return (
    <Card className="energy-hero g-tafel g-tafel--energy">
      {/* a wrapper: a capped section keeps its first child at the top with the card's padding (tafel.css), the
          segment's track and lens stay on its own box */}
      <div className="g-tafel__bar">
        <PeriodSelector period={period} onChange={onPeriodChange} />
      </div>
      <div className="g-tafel__total">
        <span className="g-tafel__total-label">
          <House size={TAFEL_ICON} strokeWidth={2} aria-hidden="true" />
          {t('energy.hero.homeConsumption')}
        </span>
        <span className="g-tafel__total-value">
          {fmtEnergy(d.homeConsumption, locale)}
          <span className="g-tafel__total-unit">{' kWh'}</span>
        </span>
      </div>
      <TafelGrid items={items} min={130} max={3} />
    </Card>
  );
}
