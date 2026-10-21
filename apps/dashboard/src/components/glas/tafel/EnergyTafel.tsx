/**
 * [fork] The energy page's head in Glas (plan docs/glas/PLAN-TAFELN.md; since draft v5, glas/energie-neu/umsetzung):
 * the period segment, the home's consumption large with the solar yield and the comparison below it like the
 * overview's energy card, then the amounts in pairs (battery charged / discharged, from the grid / exported) and the
 * grid's cost, at most two columns. Only the sun is coloured (its chart colour, GLAS-DESIGN §2.4); the amounts have no
 * state. While another period loads the figures dim (Energy.tsx `data-g-stale`, tafel.css). The classic
 * EnergyHeroCard shows the same facts.
 */

import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Battery, BatteryPlus, House, Sun } from 'lucide-react';
import type { EnergyDashboard, EnergyPeriod } from '@hapulse/core';
import { Card } from '../../ui/Card';
import { useLocale, useT } from '../../../i18n/useT';
import { PeriodSelector, fmtCost, fmtEnergy } from '../../energy/EnergyCards';
import { CostIcon, useEnergyCompareText } from '../../energy/fork/energyHead';
import { TafelGrid, TAFEL_ICON } from './Tafel';
import type { TafelFigure } from './Tafel';

interface EnergyTafelProps {
  dashboard: EnergyDashboard;
  period: EnergyPeriod;
  onPeriodChange: (p: EnergyPeriod) => void;
  currency: string | null;
  /** the period `dashboard` belongs to while the next one loads (default `period`) */
  dataPeriod?: EnergyPeriod;
}

export function EnergyTafel({ dashboard: d, period, onPeriodChange, currency, dataPeriod }: EnergyTafelProps) {
  const t = useT();
  const locale = useLocale();
  const compare = useEnergyCompareText(dataPeriod ?? period);
  const items: TafelFigure[] = [];
  if (d.hasBattery) {
    items.push({ key: 'batteryIn', icon: <BatteryPlus size={TAFEL_ICON} strokeWidth={2} />, label: t('energy.tafel.batteryIn'), value: fmtEnergy(d.batteryIn, locale), unit: 'kWh' });
    items.push({ key: 'battery', icon: <Battery size={TAFEL_ICON} strokeWidth={2} />, label: t('energy.tafel.batteryOut'), value: fmtEnergy(d.batteryOut, locale), unit: 'kWh' });
  }
  if (d.hasGrid) {
    items.push({ key: 'grid', icon: <ArrowDownToLine size={TAFEL_ICON} strokeWidth={2} />, label: t('energy.hero.fromGrid'), value: fmtEnergy(d.gridConsumed, locale), unit: 'kWh' });
    items.push({ key: 'returned', icon: <ArrowUpFromLine size={TAFEL_ICON} strokeWidth={2} />, label: t('energy.hero.returned'), value: fmtEnergy(d.gridReturned, locale), unit: 'kWh' });
  }
  if (d.cost != null) {
    items.push({ key: 'cost', icon: <CostIcon currency={currency} size={TAFEL_ICON} strokeWidth={2} />, label: t('energy.hero.gridCost'), value: fmtCost(d.cost, currency, locale) });
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
        {d.hasSolar && (
          <span className="g-tafel__pv">
            <Sun className="g-tafel__pv-sun" size={TAFEL_ICON} strokeWidth={2} aria-hidden="true" />
            <span className="g-tafel__pv-value">
              {fmtEnergy(d.solarProduced, locale)}
              {'\u00a0kWh'}
            </span>{' '}
            {t('home.energy.solarProduced')}
          </span>
        )}
        {compare !== null && <span className="g-tafel__compare">{compare}</span>}
      </div>
      <TafelGrid items={items} min={130} max={2} />
    </Card>
  );
}
