/**
 * [fork] The energy page's cards "Consumption" and "Solar" after draft v5 (plan glas/energie-neu/umsetzung/PLAN.md):
 * each answers one question with one big figure — where the home's power came from ("85 % own power") and where the
 * solar went ("65 % used itself") — the shares below it and a chart of the period by origin or destination. Both
 * styles: the classic card frame (`energy-card__*`, the classes of the cards they replace, so Glas's frame in
 * styles/glas/pages.css applies); the look in EnergyOrigin.css and, for Glas, styles/glas/energy.css. Colours: solar
 * yellow, battery green, grid grey (Glas) — the classic accent, positive and info in Klassisch. The figures come from
 * core `energyOriginBars` / `energyShares`, the same allocation as Home Assistant's energy distribution.
 */

import React, { useMemo } from 'react';
import { Sun, Zap } from 'lucide-react';
import { energyAxis, energyOriginBars, energyPageWindow, energyShares, formatNumber, hiddenTicks } from '@hapulse/core';
import type { EnergyDashboard, EnergyOriginBar, EnergyPeriod } from '@hapulse/core';
import { Card } from '../../ui/Card';
import { useLocale, useT, type TFunction, type TKey } from '../../../i18n/useT';
import './EnergyOrigin.css';

export type OriginKind = 'solar' | 'battery' | 'grid';

/** What a card says it is about: the period of the segment. */
export const SCOPE_KEY: Record<EnergyPeriod, TKey> = {
  today: 'energy.scope.today',
  week: 'energy.scope.week',
  month: 'energy.scope.month',
  year: 'energy.scope.year',
};

const AVG_KEY: Record<EnergyPeriod, TKey> = {
  today: 'energy.chart.avgHour',
  week: 'energy.chart.avgDay',
  month: 'energy.chart.avgDay',
  year: 'energy.chart.avgMonth',
};

/** The period's bars, computed once per loaded result (the clock of that moment). */
export function useOriginBars(dashboard: EnergyDashboard, period: EnergyPeriod): EnergyOriginBar[] {
  return useMemo(() => {
    const now = new Date();
    return energyOriginBars(energyPageWindow(period, now), dashboard.series, now);
  }, [dashboard, period]);
}

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

interface ChartBar {
  /** bottom to top */
  parts: { kind: OriginKind; value: number }[];
  total: number;
  hasData: boolean;
  future: boolean;
  current: boolean;
  start: number;
}

/** Columns by count, like the classic page's chart in Glas: gap and widest column in px, top radius. */
function look(n: number): { gap: number; maxW: number; radius: number } {
  if (n <= 12) return { gap: 4, maxW: 26, radius: 6 };
  if (n <= 25) return { gap: 3, maxW: 14, radius: 4 };
  return { gap: 3, maxW: 10, radius: 3 };
}

interface XLabel {
  index: number;
  text: string;
}

function xLabels(bars: ChartBar[], period: EnergyPeriod, locale: string, t: TFunction): XLabel[] {
  if (period === 'today') {
    const hour = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
    const h12 = /^h1[12]$/.test(hour.resolvedOptions().hourCycle ?? '');
    const marks = [0, 6, 12, 18]
      .map((h) => bars.findIndex((b) => new Date(b.start).getHours() === h))
      .filter((i) => i >= 0);
    return marks.map((i, k) => {
      const d = new Date(bars[i]!.start);
      if (h12) return { index: i, text: hour.format(d) };
      // 24-hour languages: bare numbers, the unit once at the end ("0 · 6 · 12 · 18 Uhr")
      const text = k === marks.length - 1 ? t('energy.chart.hourLast', { hour: d.getHours() }) : String(d.getHours());
      return { index: i, text };
    });
  }
  if (period === 'week') {
    const wd = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return bars.map((b, i) => ({ index: i, text: wd.format(new Date(b.start)).replace(/\.$/, '') }));
  }
  if (period === 'month') {
    return [0, 7, 14, 21, 28].filter((i) => i < bars.length).map((i) => ({ index: i, text: String(i + 1) }));
  }
  const mon = new Intl.DateTimeFormat(locale, { month: 'short' });
  return [0, 3, 6, 9].map((i) => ({ index: i, text: mon.format(new Date(bars[i]!.start)).replace(/\.$/, '') }));
}

interface OriginChartProps {
  bars: ChartBar[];
  period: EnergyPeriod;
  /** the dashed average over the finished bars with data, and its line below the chart */
  average: boolean;
  label: string;
}

function OriginChart({ bars, period, average, label }: OriginChartProps) {
  const t = useT();
  const locale = useLocale();
  const n = bars.length;
  const { gap, maxW, radius } = look(n);
  const axis = energyAxis(Math.max(0, ...bars.map((b) => b.total)));
  const done = bars.filter((b) => !b.future && !b.current && b.hasData);
  const avg = average && done.length > 0 ? done.reduce((s, b) => s + b.total, 0) / done.length : null;
  const hidden = hiddenTicks(axis, avg);
  const pct = (v: number) => Math.min(100, (v / axis.top) * 100);
  const centre = (i: number) => `calc((100% - ${(n - 1) * gap}px) * ${(i + 0.5) / n} + ${i * gap}px)`;
  const one = (v: number) => formatNumber(v, locale, { minDecimals: 1, maxDecimals: 1 });

  return (
    <div className="en-chart">
      <div className="en-chart__area" role="img" aria-label={label}>
        {axis.ticks.map((v, k) => (
          <React.Fragment key={k}>
            <span className={k === 0 ? 'en-chart__rule en-chart__rule--base' : 'en-chart__rule'} style={{ bottom: `${pct(v)}%` }} />
            <span
              className={hidden.includes(v) ? 'en-chart__tick en-chart__tick--hidden' : 'en-chart__tick'}
              style={{ bottom: `${pct(v)}%` }}
            >
              {formatNumber(v, locale, { maxDecimals: 2 })}
              {k === axis.ticks.length - 1 ? ' kWh' : ''}
            </span>
          </React.Fragment>
        ))}
        {avg !== null && (
          <span className="en-chart__tick en-chart__tick--avg" style={{ bottom: `${pct(avg)}%` }}>
            Ø
          </span>
        )}
        <div
          className="en-chart__plot"
          style={{ '--en-gap': `${gap}px`, '--en-max': `${maxW}px`, '--en-r': `${radius}px` } as React.CSSProperties}
        >
          {bars.map((bar, i) => {
            // hours to come and hours without a statistics row: a 3-px stub
            if (bar.future || !bar.hasData) {
              return (
                <span key={i} className="en-chart__bar">
                  <span className="en-chart__stub" />
                </span>
              );
            }
            // nothing in this bar (a night hour in the solar card): an empty column, like the overview's card
            if (bar.total <= 0) return <span key={i} className="en-chart__bar" />;
            const parts = bar.parts.filter((p) => p.value > 0);
            return (
              <span key={i} className="en-chart__bar">
                <span className="en-chart__col" style={{ height: `${Math.max(1.5, pct(bar.total))}%` }}>
                  {[...parts].reverse().map((p) => (
                    <span
                      key={p.kind}
                      className={`en-chart__part en-chart__part--${p.kind}`}
                      style={{ flexGrow: p.value }}
                    />
                  ))}
                </span>
              </span>
            );
          })}
          {avg !== null && <span className="en-chart__avg" style={{ bottom: `${pct(avg)}%` }} />}
        </div>
      </div>
      <div className="en-chart__x" aria-hidden="true">
        {xLabels(bars, period, locale, t).map((l) => (
          <span key={l.index} className="en-chart__xl" style={{ left: centre(l.index) }}>
            {l.text}
          </span>
        ))}
      </div>
      {avg !== null && <p className="en-chart__foot">{t(AVG_KEY[period], { value: one(avg) })}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shares
// ---------------------------------------------------------------------------

interface ShareRow {
  kind: OriginKind;
  label: string;
  pct: number;
}

/** The chart's description: the configured parts in the UI language's list form ("Solar, Batterie und Netz"). */
function partsText(rows: ShareRow[], locale: string): string {
  return new Intl.ListFormat(locale, { type: 'conjunction' }).format(rows.map((r) => r.label));
}

/** Whole percent in the UI language ("85 %" in German, "85%" in English). */
const percent = (v: number, locale: string): string =>
  new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(v / 100);

function ShareList({ rows }: { rows: ShareRow[] }) {
  const locale = useLocale();
  const fmt = (v: number) => percent(v, locale);
  return (
    <ul className="en-shares">
      {rows.map((r) => (
        <li key={r.kind} className="en-shares__row">
          <span className={`en-dot en-dot--${r.kind}`} aria-hidden="true" />
          <span className="en-shares__label">{r.label}</span>
          <span className="en-shares__value">{fmt(r.pct)}</span>
        </li>
      ))}
    </ul>
  );
}

function BigShare({ pct, text }: { pct: number; text: string }) {
  const locale = useLocale();
  return (
    <p className="en-big">
      <span className="en-big__num">{percent(pct, locale)}</span>
      <span className="en-big__unit">{text}</span>
    </p>
  );
}

export function CardHead({ icon, title, scope }: { icon: React.ReactNode; title: string; scope?: string }) {
  return (
    <div className="energy-card__header">
      <div className="energy-card__title-row">
        <span className="energy-card__icon-chip" aria-hidden="true">
          {icon}
        </span>
        <span className="energy-card__title">{title}</span>
      </div>
      {scope && <span className="energy-card__sub">{scope}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

interface CardProps {
  dashboard: EnergyDashboard;
  period: EnergyPeriod;
}

/** "Consumption": where the home's power came from. Replaces the classic "Sources" (section `usage`). */
export function EnergyUsageCard({ dashboard: d, period }: CardProps) {
  const t = useT();
  const locale = useLocale();
  const bars = useOriginBars(d, period);
  const shares = energyShares(bars);
  const own = d.hasSolar || d.hasBattery;
  const rows: ShareRow[] = [];
  if (d.hasSolar) rows.push({ kind: 'solar', label: t('energy.usage.fromSolar'), pct: shares.homePct.solar });
  if (d.hasBattery) rows.push({ kind: 'battery', label: t('energy.usage.fromBattery'), pct: shares.homePct.battery });
  if (d.hasGrid) rows.push({ kind: 'grid', label: t('energy.usage.fromGrid'), pct: shares.homePct.grid });
  const any = bars.some((b) => b.hasData);
  const chart: ChartBar[] = bars.map((b) => ({
    ...b,
    parts: [
      { kind: 'grid', value: b.gridHome },
      { kind: 'battery', value: b.batteryHome },
      { kind: 'solar', value: b.solarHome },
    ],
    total: b.home,
  }));
  return (
    <Card className="energy-sources en-card en-card--usage">
      <CardHead icon={<Zap size={16} strokeWidth={1.75} />} title={t('energy.usage.title')} scope={t(SCOPE_KEY[period])} />
      {!any ? (
        <p className="energy-empty">{t('energy.sources.empty')}</p>
      ) : (
        <>
          {own && shares.home > 0 && <BigShare pct={shares.homePct.own} text={t('energy.usage.own')} />}
          {own && shares.home > 0 && <ShareList rows={rows} />}
          <OriginChart
            bars={chart}
            period={period}
            average
            label={t('energy.usage.chartAria', { parts: partsText(rows, locale) })}
          />
        </>
      )}
    </Card>
  );
}

/** "Solar": where the solar went. Replaces the classic solar card (section `solar`). */
export function EnergySolarShareCard({ dashboard: d, period }: CardProps) {
  const t = useT();
  const locale = useLocale();
  const bars = useOriginBars(d, period);
  const shares = energyShares(bars);
  const rows: ShareRow[] = [{ kind: 'solar', label: t('energy.solarShare.toHome'), pct: shares.solarPct.home }];
  if (d.hasBattery) rows.push({ kind: 'battery', label: t('energy.solarShare.toBattery'), pct: shares.solarPct.battery });
  if (d.hasGrid) rows.push({ kind: 'grid', label: t('energy.solarShare.toGrid'), pct: shares.solarPct.grid });
  const chart: ChartBar[] = bars.map((b) => ({
    ...b,
    parts: [
      { kind: 'grid', value: b.solarGrid },
      { kind: 'battery', value: b.solarBattery },
      { kind: 'solar', value: b.solarHome },
    ],
    total: b.solarGrid + b.solarBattery + b.solarHome,
  }));
  return (
    <Card className="energy-solar en-card en-card--solar">
      <CardHead icon={<Sun size={16} strokeWidth={1.75} />} title={t('energy.solar.title')} scope={t(SCOPE_KEY[period])} />
      {shares.produced > 0 ? (
        <>
          <BigShare pct={shares.solarPct.self} text={t('energy.solarShare.self')} />
          <ShareList rows={rows} />
        </>
      ) : (
        <p className="energy-empty">{t('energy.solarShare.none')}</p>
      )}
      {bars.some((b) => b.hasData) && (
        <OriginChart
          bars={chart}
          period={period}
          average={false}
          label={t('energy.solarShare.chartAria', { parts: partsText(rows, locale) })}
        />
      )}
    </Card>
  );
}
