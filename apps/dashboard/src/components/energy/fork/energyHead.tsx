/**
 * [fork] Shared parts of the energy page's head after draft v5 (plan glas/energie-neu/umsetzung/PLAN.md), used by the
 * Glas tafel and the classic hero: the comparison with the period before as a sentence ("−12 % ggü. gestern", the
 * same span up to the last full hour, `useEnergyCompare`) and the cost's symbol (€ for euros, a banknote for other or unknown currencies).
 */

import React from 'react';
import { Banknote, Euro } from 'lucide-react';
import type { EnergyPeriod } from '@hapulse/core';
import { useEnergyCompare } from '../../../ha/useEnergyCompare';
import { useLocale, useT, type TKey } from '../../../i18n/useT';

const COMPARE_KEY: Record<EnergyPeriod, TKey> = {
  today: 'energy.compare.today',
  week: 'energy.compare.week',
  month: 'energy.compare.month',
  year: 'energy.compare.year',
};

/** The comparison as text, or null while loading or without anything to compare with. */
export function useEnergyCompareText(period: EnergyPeriod): string | null {
  const t = useT();
  const locale = useLocale();
  const change = useEnergyCompare(period);
  if (change === null) return null;
  const pct = new Intl.NumberFormat(locale, { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 0 });
  return t(COMPARE_KEY[period], { change: pct.format(change / 100).replace('-', '−') });
}

export function CostIcon({ currency, size, strokeWidth }: { currency: string | null; size: number; strokeWidth: number }) {
  return currency?.toUpperCase() === 'EUR' ? (
    <Euro size={size} strokeWidth={strokeWidth} />
  ) : (
    <Banknote size={size} strokeWidth={strokeWidth} />
  );
}
