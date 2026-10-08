/**
 * EnergyWidget — home overview card summarising today's energy.
 *
 * Uses the same data source as the Energy page (HA energy prefs + statistics
 * via useEnergy). When energy isn't configured in Home Assistant, it prompts the
 * user to set it up. Energy is NOT entity data — it comes from long-term
 * statistics, so this no longer scans the entity map for a "kWh sensor".
 */
import React from 'react';
import { Zap, ChevronRight, ExternalLink, Sun } from 'lucide-react'; // [fork] Sun
import { useNavigate } from 'react-router';
import { Card } from '../ui/Card';
import { useEnergy } from '../../ha/useEnergy';
import { useConnectionStore } from '../../stores/connectionStore';
import { fmtEnergy } from '../energy/EnergyCards';
import { useT, useLocale } from '../../i18n/useT'; // [fork] useLocale
import './EnergyWidget.css';

/** [fork] One stacked bar: solar on top, grid at the bottom (the colours of the energy page). */
function EnergyStack({ grid, solar }: { grid: number; solar: number }) {
  const g = Math.max(0, grid);
  const s = Math.max(0, solar);
  const total = g + s;
  return (
    <>
      {s > 0 && <span className="energy-widget__seg energy-widget__seg--solar" style={{ height: `${(s / total) * 100}%` }} />}
      {(g > 0 || total === 0) && (
        <span className="energy-widget__seg energy-widget__seg--grid" style={{ height: `${total > 0 ? (g / total) * 100 : 100}%` }} />
      )}
    </>
  );
}

export function EnergyWidget() {
  const navigate = useNavigate();
  const t = useT();
  const locale = useLocale(); // [fork] number formatting
  const haUrl = useConnectionStore((s) => s.url);
  const { state, dashboard } = useEnergy('today');

  // While loading, render nothing to avoid a layout flash.
  if (state === 'loading') return null;

  // ---- Not configured: prompt the user to set it up in HA ----
  if (state === 'not-configured') {
    const setupUrl = haUrl ? `${haUrl.replace(/\/+$/, '')}/config/energy` : null;
    return (
      <Card className="energy-widget energy-widget--prompt">
        <div className="energy-widget__header">
          <div className="energy-widget__title-row">
            <span className="energy-widget__icon-chip" aria-hidden="true">
              <Zap size={16} strokeWidth={1.75} />
            </span>
            <span className="energy-widget__title">{t('home.energy.title')}</span>
          </div>
        </div>
        <p className="energy-widget__prompt-text">
          {t('home.energy.promptText')}
        </p>
        {setupUrl && (
          <a
            className="energy-widget__prompt-btn"
            href={setupUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t('home.energy.promptButton')}
            <ExternalLink size={14} strokeWidth={2} />
          </a>
        )}
      </Card>
    );
  }

  if (state === 'error' || !dashboard) return null;

  const series = dashboard.series;
  const bars = series.map((p) => p.gridConsumed + p.solar);
  const maxBar = Math.max(...bars, 0.01);
  const stacked = dashboard.hasSolar; // [fork] grid/solar stacked + PV line (user decision E3/E9, both styles)

  return (
    <Card className="energy-widget">
      <div className="energy-widget__header">
        <div className="energy-widget__title-row">
          <span className="energy-widget__icon-chip" aria-hidden="true">
            <Zap size={16} strokeWidth={1.75} />
          </span>
          <span className="energy-widget__title">{t('home.energy.titleToday')}</span>
        </div>
        <button
          className="energy-widget__link"
          onClick={() => void navigate('/energy')}
          type="button"
          aria-label={t('home.energy.detailsAria')}
        >
          {t('home.energy.details')}
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="card-scroll-body card-scroll-wrap">
      <div className="energy-widget__value-row">
        <span className="energy-widget__value">{fmtEnergy(dashboard.homeConsumption, locale)}</span>
        <span className="energy-widget__unit">kWh</span>
      </div>
      {stacked && ( // [fork] PV yield
        <div className="energy-widget__solar">
          <Sun size={15} strokeWidth={2} aria-hidden="true" className="energy-widget__solar-icon" />
          <span className="energy-widget__solar-value">{fmtEnergy(dashboard.solarProduced, locale)} kWh</span>
          <span className="energy-widget__solar-label">{t('home.energy.solarProduced')}</span>
        </div>
      )}

      {bars.length > 0 && (
        <div className="energy-widget__chart" role="img" aria-label={t('home.energy.chartAria')}>
          {bars.map((h, i) => stacked ? ( // [fork] grid/solar stacked
            <div key={i} className="energy-widget__bar energy-widget__bar--stack" style={{ height: `${(h / maxBar) * 100}%` }}>
              <EnergyStack grid={series[i]!.gridConsumed} solar={series[i]!.solar} />
            </div>
          ) : ( // [fork] end
            <div
              key={i}
              className="energy-widget__bar"
              style={{ height: `${(h / maxBar) * 100}%` }}
            />
          ))}
        </div>
      )}
      </div>
    </Card>
  );
}
