/**
 * [fork] EnergyGlas — the overview's energy card in the style Glas, variant V4 "kompakt" (docs/GLAS-DESIGN.md §7.9,
 * docs/glas/PLAN-ETAPPE-4.md K75, Jannick's choice 08.10.; mockups glas/energie-varianten). Home.tsx renders it
 * instead of EnergyWidget while the style is Glas.
 *
 * Title above the card, the segment Tag | Woche | Monat, the consumption with the comparison and the PV yield below
 * it, then the chart: grid import (grey) at the bottom and the solar the home used itself (yellow) on top, axis on
 * the right with fine solid lines, the dashed Ø line, hours still to come as stubs. Tap or hover a bar for the
 * bubble; arrow keys, Home and End walk the bars, Esc closes. Data from `useEnergyWindow`; without an energy setup in
 * Home Assistant the classic card with its setup prompt shows instead (§7.9 "Leer/nicht eingerichtet").
 */

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Sun, Zap } from 'lucide-react';
import { useNavigate } from 'react-router';
import { barPercent, energyAverage, energyAxis, formatNumber, hiddenTicks } from '@hapulse/core';
import type { GlasEnergyBar, GlasEnergyPeriod } from '@hapulse/core';
import { Card } from '../../ui/Card';
import { EnergyWidget } from '../../home/EnergyWidget';
import { Segment } from '../Segment';
import { useEnergyWindow } from '../../../ha/useEnergyWindow';
import type { EnergyWindowData } from '../../../ha/useEnergyWindow';
import { useLocale, useT, type TFunction, type TKey } from '../../../i18n/useT';

const PERIODS: readonly GlasEnergyPeriod[] = ['day', 'week', 'month'];

/** Columns per period (§7.9): gap and maximum width in px, top radius, delay between the bars growing in (ms). */
const LOOK: Record<GlasEnergyPeriod, { gap: number; maxW: number; radius: number; delay: number }> = {
  day: { gap: 3, maxW: 14, radius: 4, delay: 14 },
  week: { gap: 4, maxW: 26, radius: 6, delay: 40 },
  month: { gap: 3, maxW: 10, radius: 3, delay: 9 },
};

const PERIOD_LABEL: Record<GlasEnergyPeriod, TKey> = {
  day: 'glas.energy.period.day',
  week: 'energy.period.week',
  month: 'energy.period.month',
};
const COMPARE: Record<GlasEnergyPeriod, TKey> = {
  day: 'glas.energy.compare.day',
  week: 'glas.energy.compare.week',
  month: 'glas.energy.compare.month',
};
const CHART: Record<GlasEnergyPeriod, TKey> = {
  day: 'glas.energy.chartAria.day',
  week: 'glas.energy.chartAria.week',
  month: 'glas.energy.chartAria.month',
};

/** Date labels of the month view: four marks a week apart (sketch). */
const MONTH_MARKS = [1, 8, 15, 22];
/** The bubble keeps this distance to the plot's edges (half its width at most). */
const BUBBLE_INSET = 82;

type Pick = { period: GlasEnergyPeriod; index: number };

interface Formats {
  hour: Intl.DateTimeFormat;
  weekday: Intl.DateTimeFormat;
  dayMonth: Intl.DateTimeFormat;
  day: Intl.DateTimeFormat;
  percent: Intl.NumberFormat;
  h12: boolean;
}

function formats(locale: string): Formats {
  const hour = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
  return {
    hour,
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
    dayMonth: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric' }),
    day: new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }),
    percent: new Intl.NumberFormat(locale, { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 0 }),
    h12: /^h1[12]$/.test(hour.resolvedOptions().hourCycle ?? ''),
  };
}

/** One decimal ("1,2"). */
const one = (v: number, locale: string) => formatNumber(v, locale, { minDecimals: 1, maxDecimals: 1 });
/** The big figure and the PV yield: one decimal below 100, whole numbers above (sketch). */
const figure = (v: number, locale: string) =>
  v >= 100 ? formatNumber(v, locale, { maxDecimals: 0 }) : one(v, locale);

/** What a bar shows: data (a button), a past bucket without data (a button, "no data") or a stub (to come). */
function kindOf(bar: GlasEnergyBar): 'data' | 'empty' | 'stub' {
  if (bar.future || (bar.current && !bar.hasData)) return 'stub';
  return bar.hasData ? 'data' : 'empty';
}

function whenOf(data: EnergyWindowData, i: number, f: Formats, t: TFunction): string {
  const bar = data.bars[i]!;
  if (data.period === 'day') return f.hour.formatRange(new Date(bar.start), new Date(bar.end));
  return bar.current ? t('glas.energy.today') : f.day.format(new Date(bar.start));
}

interface XLabel {
  key: string;
  text: string;
  /** Column the label belongs to. */
  index: number;
  /** Centred under its column (week); otherwise it starts at the column's left edge. */
  centred: boolean;
}

function xLabels(data: EnergyWindowData, f: Formats, t: TFunction): XLabel[] {
  const { bars, period } = data;
  const n = bars.length;
  if (period === 'day') {
    const marks = [0, 6, 12, 18]
      .map((h) => bars.findIndex((b) => new Date(b.start).getHours() === h))
      .filter((i) => i >= 0);
    return marks.map((i, k) => {
      const d = new Date(bars[i]!.start);
      // 24-hour languages show bare numbers and the unit once at the end ("0 · 6 · 12 · 18 Uhr"),
      // 12-hour ones "6 AM"
      let text = f.hour.format(d);
      if (!f.h12) {
        const unit =
          k === marks.length - 1
            ? f.hour
                .formatToParts(d)
                .filter((p) => p.type === 'literal')
                .map((p) => p.value)
                .join('')
                .trim()
            : '';
        text = unit ? `${d.getHours()} ${unit}` : String(d.getHours());
      }
      return { key: `h${i}`, text, index: i, centred: false };
    });
  }
  if (period === 'week') {
    // short weekdays without the abbreviation dot ("lun." → "lun"), the last one "Heute"
    return bars.map((b, i) => ({
      key: `d${i}`,
      text: b.current ? t('glas.energy.today') : f.weekday.format(new Date(b.start)).replace(/\.$/, ''),
      index: i,
      centred: true,
    }));
  }
  return MONTH_MARKS.filter((i) => i < n).map((i) => ({
    key: `m${i}`,
    text: f.dayMonth.format(new Date(bars[i]!.start)),
    index: i,
    centred: false,
  }));
}

/** Smallest space between two x labels in px. */
const LABEL_GAP = 6;

/**
 * How many x labels to step over so that none touch: 1 shows all, 2 every second one, … always counted from the
 * last label (today, the evening hours), which stays. Measures the rendered labels, hidden ones included.
 */
function labelStep(row: HTMLElement): number {
  const rects = [...row.querySelectorAll<HTMLElement>('.g-energy__xl')].map((l) => l.getBoundingClientRect());
  const last = rects.length - 1;
  for (let step = 1; step <= last + 1; step++) {
    let right = -Infinity;
    let fits = true;
    for (let k = last % step; k <= last; k += step) {
      const r = rects[k]!;
      if (r.left < right + LABEL_GAP) fits = false;
      right = r.right;
    }
    if (fits) return step;
  }
  return 1;
}

export function EnergyGlas() {
  const [period, setPeriod] = useState<GlasEnergyPeriod>('day');
  const [switched, setSwitched] = useState(false);
  const { state, data, stale } = useEnergyWindow(period);

  // Not set up in Home Assistant: the HAPulse setup prompt stays (§7.9).
  if (state === 'not-configured') return <EnergyWidget />;
  // While loading for the first time (and after an error without anything to show), render nothing, like Klassisch.
  if (!data) return null;
  return (
    <EnergyGlasCard
      data={data}
      stale={stale}
      period={period}
      switched={switched}
      onPeriod={(p) => {
        setPeriod(p);
        setSwitched(true);
      }}
    />
  );
}

interface CardProps {
  data: EnergyWindowData;
  stale: boolean;
  period: GlasEnergyPeriod;
  switched: boolean;
  onPeriod: (period: GlasEnergyPeriod) => void;
}

function EnergyGlasCard({ data, stale, period, switched, onPeriod }: CardProps) {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const f = useMemo(() => formats(locale), [locale]);
  const [sel, setSel] = useState<Pick | null>(null);
  const [hov, setHov] = useState<Pick | null>(null);
  const barRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const xRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);

  const { dashboard, bars } = data;
  const n = bars.length;
  const look = LOOK[data.period];
  const axis = energyAxis(Math.max(0, ...bars.map((b) => b.total)));
  const avg = energyAverage(bars);
  const hidden = hiddenTicks(axis, avg);
  const avgPct = avg === null ? 0 : Math.min(100, (avg / axis.top) * 100);
  const kinds = bars.map(kindOf);
  const reachable = kinds.flatMap((k, i) => (k === 'stub' ? [] : [i]));
  const selIndex = sel && sel.period === data.period ? sel.index : null;
  const hovIndex = hov && hov.period === data.period ? hov.index : null;
  const lit = hovIndex ?? selIndex;
  const tabAt = selIndex ?? reachable[reachable.length - 1] ?? -1;
  const solarSource = dashboard.hasSolar;
  const labels = xLabels(data, f, t);
  const labelKey = labels.map((l) => l.text).join('|');

  // Thin out the x labels where they would touch (narrow cards, long words), again whenever the row changes size
  // and once the web fonts are there.
  useLayoutEffect(() => {
    const row = xRef.current;
    if (!row) return undefined;
    let live = true;
    const fit = () => {
      if (live) setStep(labelStep(row));
    };
    fit();
    void document.fonts?.ready.then(fit);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    observer?.observe(row);
    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [labelKey]);

  const pick = (index: number | null) => setSel(index === null ? null : { period: data.period, index });

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      if (selIndex === null) return;
      e.preventDefault();
      e.stopPropagation();
      pick(null);
      return;
    }
    const pos = reachable.indexOf(selIndex ?? tabAt);
    let j: number | undefined;
    if (e.key === 'ArrowRight') j = selIndex === null ? tabAt : reachable[Math.min(reachable.length - 1, pos + 1)];
    else if (e.key === 'ArrowLeft') j = selIndex === null ? tabAt : reachable[Math.max(0, pos - 1)];
    else if (e.key === 'Home') j = reachable[0];
    else if (e.key === 'End') j = reachable[reachable.length - 1];
    if (j === undefined || j < 0) return;
    e.preventDefault();
    barRefs.current[j]?.focus();
    pick(j);
  }

  // ---- figure line: comparison · PV yield ----
  const compare =
    data.change === null
      ? null
      : t(COMPARE[data.period], { change: f.percent.format(data.change / 100).replace('-', '−') });

  // ---- accessible description of the chart ----
  const chartAria = [
    `${t(CHART[data.period])}${solarSource && dashboard.hasGrid ? `, ${t('glas.energy.chartAriaStacked')}` : ''}.`,
    avg === null
      ? ''
      : t(data.period === 'day' ? 'glas.energy.chartAriaAvgHour' : 'glas.energy.chartAriaAvgDay', {
          value: one(avg, locale),
        }),
    t('glas.energy.chartAriaKeys'),
  ]
    .filter(Boolean)
    .join(' ');

  function barAria(i: number): string {
    const bar = bars[i]!;
    const when = whenOf(data, i, f, t);
    const label = bar.current ? t('glas.energy.running', { when }) : when;
    if (!bar.hasData) return t('glas.energy.barAriaNoData', { when: label });
    return solarSource
      ? t('glas.energy.barAria', { when: label, value: one(bar.total, locale), solar: one(bar.solar, locale) })
      : t('glas.energy.barAriaGrid', { when: label, value: one(bar.total, locale) });
  }

  /** Centre of column i in the plot, exact with the gaps between the columns. */
  const centre = (i: number) => `calc((100% - ${(n - 1) * look.gap}px) * ${(i + 0.5) / n} + ${i * look.gap}px)`;
  /** Left edge of column i. */
  const colStart = (i: number) => `calc((100% - ${(n - 1) * look.gap}px) * ${i / n} + ${i * look.gap}px)`;
  /** Column height in % of the axis top (a data bar is at least 1.5 % tall, also at 0 kWh, like the sketch). */
  const colPct = (bar: GlasEnergyBar) => {
    const p = barPercent(bar, axis.top);
    return bar.total > 0 ? p.grid + p.solar : 1.5;
  };

  const litBar = lit === null ? undefined : bars[lit];

  return (
    <div className="g-energy" data-stale={stale ? 'true' : undefined}>
      <div className="g-card-head">
        <h2 className="g-card-head__title">
          <Zap className="g-card-head__icon" size={18} strokeWidth={2} aria-hidden="true" />
          <span className="g-card-head__text">{t('home.energy.titleToday')}</span>
        </h2>
        <button
          type="button"
          className="g-card-head__link"
          onClick={() => void navigate('/energy')}
          aria-label={t('home.energy.detailsAria')}
        >
          {t('home.energy.details')}
          <ChevronRight size={14} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>

      <Card className="g-energy__card card-scroll-body">
        <Segment
          className="g-seg--energy"
          label={t('energy.period.ariaLabel')}
          value={period}
          onChange={onPeriod}
          options={PERIODS.map((p) => ({ value: p, label: t(PERIOD_LABEL[p]) }))}
        />

        <div className="g-energy__data">
          <div key={data.period} className={switched ? 'g-energy__fig g-energy__fig--swap' : 'g-energy__fig'}>
            <div className="g-energy__total">
              <span className="g-energy__num">{figure(dashboard.homeConsumption, locale)}</span>
              <span className="g-energy__unit">
                kWh <span className="g-energy__unit-word">{t('glas.energy.consumption')}</span>
              </span>
            </div>
            {(compare !== null || solarSource) && (
              // Each part brings its own "·"; the one that starts a line sits outside the clipped row, so a wrapped
              // line never ends or starts with a dot.
              <div className="g-energy__line-2">
                <div className="g-energy__line-2-row">
                  {compare !== null && (
                    <span className="g-energy__part">
                      <span className="g-energy__dot" aria-hidden="true">
                        ·
                      </span>
                      <span className="g-energy__compare">{compare}</span>
                    </span>
                  )}
                  {solarSource && (
                    <span className="g-energy__part">
                      <span className="g-energy__dot" aria-hidden="true">
                        ·
                      </span>
                      <span className="g-energy__pv">
                        <Sun className="g-energy__sun" size={15} strokeWidth={2.25} aria-hidden="true" />
                        <span className="g-energy__pv-value">{figure(dashboard.solarProduced, locale)} kWh</span>{' '}
                        <span className="g-energy__pv-label">{t('home.energy.solarProduced')}</span>
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="g-energy__chart">
            {axis.ticks.map((v, k) => (
              <React.Fragment key={k}>
                <span
                  className={k === 0 ? 'g-energy__rule-h g-energy__rule-h--base' : 'g-energy__rule-h'}
                  style={{ bottom: `${(v / axis.top) * 100}%` }}
                  aria-hidden="true"
                />
                <span
                  className={hidden.includes(v) ? 'g-energy__tick g-energy__tick--hidden' : 'g-energy__tick'}
                  style={{ bottom: `${(v / axis.top) * 100}%` }}
                  aria-hidden="true"
                >
                  {formatNumber(v, locale, { maxDecimals: 2 })}
                  {k === axis.ticks.length - 1 ? ' kWh' : ''}
                </span>
              </React.Fragment>
            ))}
            {avg !== null && (
              <span className="g-energy__tick g-energy__tick--avg" style={{ bottom: `${avgPct}%` }} aria-hidden="true">
                Ø
              </span>
            )}

            <div className="g-energy__plot">
              <div
                key={data.period}
                role="group"
                aria-label={chartAria}
                className="g-energy__bars"
                style={
                  {
                    '--g-en-gap': `${look.gap}px`,
                    '--g-en-max': `${look.maxW}px`,
                    '--g-en-r': `${look.radius}px`,
                    '--g-en-delay': `${look.delay}ms`,
                  } as React.CSSProperties
                }
                onKeyDown={onKeyDown}
                onPointerLeave={() => setHov(null)}
              >
                {bars.map((bar, i) => {
                  const kind = kinds[i];
                  if (kind === 'stub') {
                    return (
                      <span key={i} className="g-energy__bar g-energy__bar--stub" aria-hidden="true">
                        <span className="g-energy__stub" />
                      </span>
                    );
                  }
                  const dim = lit !== null && lit !== i;
                  const both = bar.solar > 0 && bar.grid > 0;
                  return (
                    <button
                      key={i}
                      ref={(el) => {
                        barRefs.current[i] = el;
                      }}
                      type="button"
                      className={dim ? 'g-energy__bar g-energy__bar--dim' : 'g-energy__bar'}
                      tabIndex={i === tabAt ? 0 : -1}
                      aria-label={barAria(i)}
                      aria-pressed={selIndex === i}
                      onClick={() => pick(selIndex === i ? null : i)}
                      onPointerEnter={(e) => {
                        if (e.pointerType === 'mouse') setHov({ period: data.period, index: i });
                      }}
                    >
                      {kind === 'data' && (
                        <span
                          className={both ? 'g-energy__col g-energy__col--both' : 'g-energy__col'}
                          style={{ height: `${colPct(bar)}%`, '--i': i } as React.CSSProperties}
                        >
                          {bar.solar > 0 && (
                            <span
                              className="g-energy__solar"
                              style={both ? { height: `${(bar.solar / bar.total) * 100}%` } : undefined}
                            />
                          )}
                          {(bar.grid > 0 || bar.total <= 0) && <span className="g-energy__grid" />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {avg !== null && <span className="g-energy__avg" style={{ bottom: `${avgPct}%` }} aria-hidden="true" />}

              {lit !== null && litBar && (
                <>
                  <span
                    className="g-energy__rule-v"
                    style={{ left: centre(lit), height: `calc(${100 - colPct(litBar)}% - 30px)` }}
                    aria-hidden="true"
                  />
                  <span
                    className="g-energy__bubble"
                    style={{ left: `clamp(${BUBBLE_INSET}px, ${centre(lit)}, calc(100% - ${BUBBLE_INSET}px))` }}
                    aria-hidden="true"
                  >
                    <span className="g-energy__bubble-when">
                      {litBar.current
                        ? t('glas.energy.running', { when: whenOf(data, lit, f, t) })
                        : whenOf(data, lit, f, t)}
                    </span>
                    <span className="g-energy__bubble-value">
                      {litBar.hasData ? `${one(litBar.total, locale)} kWh` : t('glas.energy.noData')}
                      {litBar.hasData && solarSource && (
                        <span className="g-energy__bubble-solar">
                          {' · '}
                          {t('glas.energy.solarShort', { value: one(litBar.solar, locale) })}
                        </span>
                      )}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div ref={xRef} className="g-energy__x" aria-hidden="true">
            {labels.map((l, k) => (
              <span
                key={l.key}
                className={[
                  'g-energy__xl',
                  l.centred ? 'g-energy__xl--centre' : '',
                  (labels.length - 1 - k) % step ? 'g-energy__xl--off' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ left: l.centred ? centre(l.index) : colStart(l.index) }}
              >
                {l.text}
              </span>
            ))}
          </div>

          <div className="g-energy__legend">
            {dashboard.hasGrid && (
              <span className="g-energy__key">
                <span className="g-energy__swatch g-energy__swatch--grid" aria-hidden="true" />
                {t('energy.sources.legendGrid')}
              </span>
            )}
            {solarSource && (
              <span className="g-energy__key">
                <span className="g-energy__swatch g-energy__swatch--solar" aria-hidden="true" />
                {t('energy.sources.legendSolar')}
              </span>
            )}
            {avg !== null && (
              <span className="g-energy__avg-text" aria-hidden="true">
                {t(data.period === 'day' ? 'glas.energy.avgHour' : 'glas.energy.avgDay', { value: one(avg, locale) })}
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
