/**
 * [fork] PoolChartCard — pump runtime per day, as bars.
 *
 * `sensor…laufzeit_poolpumpe_heute` counts up through the day and resets at
 * midnight, so the per-day maximum of its state history is that day's total
 * runtime. We fetch the recorder history (self-contained — no long-term
 * statistics infra) and bucket it via core's `dailyRuntimeBars`. Days older
 * than the recorder retention are dropped (they'd otherwise read as 0).
 */

import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Card } from '../ui/Card';
import { dailyRuntimeBars } from '@hapulse/core';
import type { PoolDayRuntime } from '@hapulse/core';
import { useEntity } from '../../ha/hooks';
import { useLocale, useT } from '../../i18n/useT';
import { getHistory } from '../../ha/history';
import { POOL_ENTITIES } from './poolConfig';

const DAYS = 14;
const DAY_MS = 86_400_000;

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

export function PoolChartCard() {
  const t = useT();
  const locale = useLocale();
  const runtime = useEntity(POOL_ENTITIES.runtimeToday);
  const unit = (runtime?.attributes['unit_of_measurement'] as string | undefined) ?? 'h';

  const [bars, setBars] = useState<PoolDayRuntime[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  // Which day's runtime the header reads out. null → today (the last bar);
  // hovering or tapping a bar points it at that day instead.
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        const dayStarts = Array.from({ length: DAYS }, (_, i) => midnight.getTime() - (DAYS - 1 - i) * DAY_MS);
        const points = await getHistory(POOL_ENTITIES.runtimeToday, dayStarts[0]!, Date.now());
        if (cancelled) return;
        const all = dailyRuntimeBars(points, dayStarts);
        // Drop leading days outside the recorder's retention window.
        const firstWithData = all.findIndex((b) => b.hasData);
        const trimmed = firstWithData >= 0 ? all.slice(firstWithData) : [];
        setBars(trimmed);
        setActiveIdx(null);
        setState(trimmed.length === 0 ? 'empty' : 'ready');
      } catch (err) {
        if (!cancelled) {
          console.warn('[HAPulse] pool runtime chart failed:', err);
          setState('error');
        }
      }
    })();
    return () => { cancelled = true; };
    // Re-fetch when the sensor's day rolls over (its state resets to ~0 at midnight).
  }, [runtime?.entity_id, runtime?.attributes['last_reset']]);

  const maxVal = Math.max(0.001, ...bars.map((b) => b.value));
  const fmtDay = new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: '2-digit' });
  const fmtWeekday = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // Compact runtime value: one decimal below 10, whole hours above.
  const fmtVal = (v: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: v < 10 ? 1 : 0 }).format(v);

  // The day whose runtime the header reads out (defaults to today).
  const lastIdx = bars.length - 1;
  const shownIdx = activeIdx != null && activeIdx >= 0 && activeIdx <= lastIdx ? activeIdx : lastIdx;
  const shown = bars[shownIdx];

  return (
    <Card className="pool-card pool-chart">
      <div className="pool-card__head">
        <span className="pool-card__icon" aria-hidden="true">
          <BarChart3 size={16} strokeWidth={1.75} />
        </span>
        <h2 className="pool-card__title">{t('pool.chart.title')}</h2>
        {state === 'ready' && shown && (
          <div className="pool-chart__readout">
            <span className="pool-chart__readout-value data-font">
              {fmtVal(shown.value)}<span className="pool-chart__readout-unit"> {unit}</span>
            </span>
            <span className="pool-chart__readout-day">
              {shownIdx === lastIdx ? t('pool.chart.today') : fmtDay.format(new Date(shown.start))}
            </span>
          </div>
        )}
      </div>

      <div className="pool-chart__body">
        {state === 'loading' && <p className="pool-chart__msg">{t('common.loading')}</p>}
        {state === 'error' && <p className="pool-chart__msg">{t('history.error')}</p>}
        {state === 'empty' && <p className="pool-chart__msg">{t('history.empty')}</p>}
        {state === 'ready' && (
          <div className="pool-bars" onMouseLeave={() => setActiveIdx(null)}>
            {bars.map((b, i) => {
              const isActive = i === shownIdx;
              const pct = Math.round((b.value / maxVal) * 100);
              const d = new Date(b.start);
              return (
                <button
                  key={b.start}
                  type="button"
                  className={`pool-bar${isActive ? ' pool-bar--active' : ''}`}
                  aria-label={`${fmtDay.format(d)}: ${fmtVal(b.value)} ${unit}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onFocus={() => setActiveIdx(i)}
                  onClick={() => setActiveIdx(i)}
                >
                  <div className="pool-bar__track">
                    <div
                      className={`pool-bar__fill${isActive ? ' pool-bar__fill--active' : ''}`}
                      style={{ height: `${Math.max(pct, b.value > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <span className="pool-bar__label">{fmtWeekday.format(d).slice(0, 2)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
