/**
 * [fork] PoolChartCard — the pump's power draw over time.
 *
 * Reuses the fork's sensor-history feature (useHistory + HistoryChart, plus the
 * history modal's range/plot/stats styling) to show the pool pump's estimated
 * power over a selectable window — a fuller "consumption over time" view than
 * the numeric tiles. Renders nothing meaningful without the power sensor (the
 * section is gated on its presence in Pool.tsx).
 */

import React, { useState } from 'react';
import { LineChart } from 'lucide-react';
import { Card } from '../ui/Card';
import { HISTORY_RANGES, formatEntityState } from '@hapulse/core';
import type { HistoryRange } from '@hapulse/core';
import { useEntity } from '../../ha/hooks';
import { useHistory } from '../../ha/useHistory';
import { HistoryChart } from '../history/HistoryChart';
import { useLocale, useT } from '../../i18n/useT';
import { POOL_ENTITIES } from './poolConfig';
import '../history/history.css';

const DEFAULT_RANGE: HistoryRange = '24h';

export function PoolChartCard() {
  const t = useT();
  const locale = useLocale();
  const power = useEntity(POOL_ENTITIES.power);
  const [range, setRange] = useState<HistoryRange>(DEFAULT_RANGE);

  const { loading, error, empty, points, summary } = useHistory(
    power ? POOL_ENTITIES.power : null,
    range,
  );

  const unit = power?.attributes['unit_of_measurement'] as string | undefined;
  const color = 'var(--accent)';
  const hasChart = points.length > 0;

  return (
    <Card className="pool-card pool-chart">
      <div className="pool-card__head">
        <span className="pool-card__icon" aria-hidden="true">
          <LineChart size={16} strokeWidth={1.75} />
        </span>
        <h2 className="pool-card__title">{t('pool.chart.title')}</h2>
        {power && <span className="pool-chart__current data-font" style={{ color }}>{formatEntityState(power, locale)}</span>}
      </div>

      <div className="history__ranges" role="group" aria-label={t('pool.chart.title')}>
        {HISTORY_RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`history__range-btn${range === r.id ? ' history__range-btn--active' : ''}`}
            onClick={() => setRange(r.id)}
            aria-pressed={range === r.id}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className={`history__plot${loading && hasChart ? ' history__plot--loading' : ''}`}>
        {hasChart && <HistoryChart points={points} color={color} unit={unit} />}
        {!hasChart && loading && <div className="history__msg">{t('common.loading')}</div>}
        {!hasChart && !loading && error && <div className="history__msg">{t('history.error')}</div>}
        {!hasChart && !loading && !error && empty && <div className="history__msg">{t('history.empty')}</div>}
      </div>

      {summary && hasChart && (
        <div className="history__stats">
          <Stat label={t('history.stat.min')} value={summary.min} unit={unit} />
          <Stat label={t('history.stat.avg')} value={summary.avg} unit={unit} />
          <Stat label={t('history.stat.max')} value={summary.max} unit={unit} />
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit?: string | undefined }) {
  return (
    <div className="history-stat">
      <span className="history-stat__label">{label}</span>
      <span className="history-stat__value">
        {Math.round(value * 10) / 10}
        {unit ? <span className="history-stat__unit"> {unit}</span> : null}
      </span>
    </div>
  );
}
