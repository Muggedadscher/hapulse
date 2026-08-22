import React from 'react';
import {
  Sun, Moon, CloudSun, Cloud, CloudRain, CloudLightning, CloudSnow,
  Wind, Droplets, Thermometer, Gauge, Eye, ArrowUp, ArrowDown, ChevronDown,
} from 'lucide-react';
import type { HassEntity, Locale, WeatherForecast } from '@hapulse/core';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { useWeatherEntity, useWeatherEntities } from '../../../ha/hooks';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useLocale, useT } from '../../../i18n/useT';
import './WeatherModal.css';

// ---------------------------------------------------------------------------
// Icon maps
// ---------------------------------------------------------------------------

const CONDITION_ICON_LG: Record<string, React.ReactNode> = {
  sunny:             <Sun           size={56} strokeWidth={1.5} />,
  'clear-night':     <Moon          size={56} strokeWidth={1.5} />,
  partlycloudy:      <CloudSun      size={56} strokeWidth={1.5} />,
  cloudy:            <Cloud         size={56} strokeWidth={1.5} />,
  rainy:             <CloudRain     size={56} strokeWidth={1.5} />,
  pouring:           <CloudRain     size={56} strokeWidth={1.5} />,
  snowy:             <CloudSnow     size={56} strokeWidth={1.5} />,
  lightning:         <CloudLightning size={56} strokeWidth={1.5} />,
  'lightning-rainy': <CloudLightning size={56} strokeWidth={1.5} />,
  fog:               <Wind          size={56} strokeWidth={1.5} />,
  windy:             <Wind          size={56} strokeWidth={1.5} />,
  'windy-variant':   <Wind          size={56} strokeWidth={1.5} />,
  hail:              <CloudRain     size={56} strokeWidth={1.5} />,
};

const CONDITION_ICON_SM: Record<string, React.ReactNode> = {
  sunny:             <Sun           size={18} strokeWidth={1.75} />,
  'clear-night':     <Moon          size={18} strokeWidth={1.75} />,
  partlycloudy:      <CloudSun      size={18} strokeWidth={1.75} />,
  cloudy:            <Cloud         size={18} strokeWidth={1.75} />,
  rainy:             <CloudRain     size={18} strokeWidth={1.75} />,
  pouring:           <CloudRain     size={18} strokeWidth={1.75} />,
  snowy:             <CloudSnow     size={18} strokeWidth={1.75} />,
  lightning:         <CloudLightning size={18} strokeWidth={1.75} />,
  'lightning-rainy': <CloudLightning size={18} strokeWidth={1.75} />,
  fog:               <Wind          size={18} strokeWidth={1.75} />,
  windy:             <Wind          size={18} strokeWidth={1.75} />,
  'windy-variant':   <Wind          size={18} strokeWidth={1.75} />,
  hail:              <CloudRain     size={18} strokeWidth={1.75} />,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function conditionGradient(condition: string, isNight: boolean): string {
  if (isNight || condition === 'clear-night') {
    return 'radial-gradient(ellipse 120% 80% at 80% 20%, rgba(63,48,120,0.45) 0%, transparent 65%)';
  }
  switch (condition) {
    case 'sunny':
      return 'radial-gradient(ellipse 120% 80% at 80% 10%, rgba(232,168,75,0.38) 0%, transparent 65%)';
    case 'rainy':
    case 'pouring':
      return 'radial-gradient(ellipse 120% 80% at 70% 20%, rgba(80,100,160,0.38) 0%, transparent 65%)';
    case 'snowy':
      return 'radial-gradient(ellipse 120% 80% at 80% 20%, rgba(180,210,240,0.32) 0%, transparent 65%)';
    case 'lightning':
    case 'lightning-rainy':
      return 'radial-gradient(ellipse 120% 80% at 80% 20%, rgba(120,80,200,0.35) 0%, transparent 65%)';
    case 'cloudy':
    case 'partlycloudy':
    case 'fog':
      return 'radial-gradient(ellipse 120% 80% at 70% 20%, rgba(110,120,140,0.28) 0%, transparent 65%)';
    default:
      return 'radial-gradient(ellipse 120% 80% at 80% 20%, rgba(100,110,130,0.22) 0%, transparent 65%)';
  }
}

type TFunction = ReturnType<typeof useT>;

function formatForecastLabel(datetime: string, isHourly: boolean, t: TFunction, locale: Locale): string {
  try {
    const d = new Date(datetime);
    if (isHourly) {
      return d.toLocaleTimeString(locale, { hour: 'numeric' });
    }
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
    if (isToday) return t('home.chipmodals.weather.today');
    return d.toLocaleDateString(locale, { weekday: 'short' });
  } catch {
    return '';
  }
}

function detectHourly(forecast: WeatherForecast[]): boolean {
  const first = forecast[0];
  const second = forecast[1];
  if (!first || !second) return false;
  const diff = new Date(second.datetime).getTime() - new Date(first.datetime).getTime();
  return diff < 6 * 60 * 60 * 1000; // < 6 hours → hourly
}

function windBearingLabel(bearing: number | string | undefined): string {
  if (bearing == null) return '';
  if (typeof bearing === 'string') return bearing;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(bearing / 45) % 8] ?? '';
}

// ---------------------------------------------------------------------------
// Stat chip
// ---------------------------------------------------------------------------

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function Stat({ icon, label, value }: StatProps) {
  return (
    <div className="weather-modal__stat">
      <span className="weather-modal__stat-icon" aria-hidden="true">{icon}</span>
      <span className="weather-modal__stat-label">{label}</span>
      <span className="weather-modal__stat-value">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forecast row
// ---------------------------------------------------------------------------

interface ForecastRowProps {
  entry: WeatherForecast;
  label: string;
  tempUnit: string;
}

function ForecastRow({ entry, label, tempUnit }: ForecastRowProps) {
  const icon = CONDITION_ICON_SM[entry.condition] ?? <Cloud size={18} strokeWidth={1.75} />;
  const precip = entry.precipitation != null && entry.precipitation > 0;

  return (
    <div className="weather-modal__forecast-row">
      <span className="weather-modal__forecast-label">{label}</span>
      <span className="weather-modal__forecast-icon" aria-hidden="true">{icon}</span>
      {precip ? (
        <span className="weather-modal__forecast-precip">
          <Droplets size={12} strokeWidth={1.75} />
          {Math.round(entry.precipitation!)} mm
        </span>
      ) : (
        <span className="weather-modal__forecast-precip weather-modal__forecast-precip--none" />
      )}
      <span className="weather-modal__forecast-hi">
        <ArrowUp size={11} strokeWidth={2} />
        {Math.round(entry.temperature)}{tempUnit}
      </span>
      {entry.templow != null && (
        <span className="weather-modal__forecast-lo">
          <ArrowDown size={11} strokeWidth={2} />
          {Math.round(entry.templow)}{tempUnit}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface WeatherModalProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Weather entity picker (edit mode only)
// ---------------------------------------------------------------------------

interface WeatherPickerProps {
  entities: HassEntity[];
  value: string;
  onChange: (id: string) => void;
}

function WeatherEntityPicker({ entities, value, onChange }: WeatherPickerProps) {
  const t = useT();
  return (
    <div className="weather-modal__picker">
      <label className="weather-modal__picker-label" htmlFor="weather-entity-select">
        {t('home.chipmodals.weather.entityLabel')}
      </label>
      <div className="weather-modal__picker-select">
        <select
          id="weather-entity-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={t('home.chipmodals.weather.entityLabel')}
        >
          {entities.map((e) => (
            <option key={e.entity_id} value={e.entity_id}>
              {(e.attributes.friendly_name as string | undefined) ?? e.entity_id}
            </option>
          ))}
        </select>
        <ChevronDown size={14} strokeWidth={2} className="weather-modal__picker-chevron" aria-hidden="true" />
      </div>
    </div>
  );
}

export function WeatherModal({ open, onClose }: WeatherModalProps) {
  const t = useT();
  const entity = useWeatherEntity();
  const weatherEntities = useWeatherEntities();
  const editingEnabled = useSettingsStore((s) => s.customization.editingEnabled);
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('home.chipmodals.weather.title')}
      icon={<Sun size={20} strokeWidth={1.75} />}
    >
      {editingEnabled && weatherEntities.length > 0 && (
        <WeatherEntityPicker
          entities={weatherEntities}
          value={entity?.entity_id ?? ''}
          onChange={(id) => updateCustomization({ weatherEntity: id })}
        />
      )}

      {!entity ? (
        <EmptyState
          icon={<Cloud size={32} strokeWidth={1.5} />}
          title={t('home.chipmodals.weather.emptyTitle')}
          description={t('home.chipmodals.weather.emptyDescription')}
        />
      ) : (
        <WeatherContent entity={entity} />
      )}
    </Modal>
  );
}

function WeatherContent({ entity }: { entity: NonNullable<ReturnType<typeof useWeatherEntity>> }) {
  const t = useT();
  const locale = useLocale();
  const attrs = entity.attributes;
  const condition     = (attrs.condition as string | undefined) ?? entity.state;
  const temp          = attrs.temperature as number | undefined;
  const tempUnit      = (attrs.temperature_unit as string | undefined) ?? '°C';
  const humidity      = attrs.humidity as number | undefined;
  const windSpeed     = attrs.wind_speed as number | undefined;
  const windUnit      = (attrs.wind_speed_unit as string | undefined) ?? 'km/h';
  const windBearing   = attrs.wind_bearing as number | string | undefined;
  const windGust      = attrs.wind_gust_speed as number | undefined;
  const pressure      = attrs.pressure as number | undefined;
  const pressureUnit  = (attrs.pressure_unit as string | undefined) ?? 'hPa';
  const visibility    = attrs.visibility as number | undefined;
  const visibilityUnit = (attrs.visibility_unit as string | undefined) ?? 'km';
  const apparentTemp  = attrs.apparent_temperature as number | undefined;
  const dewPoint      = attrs.dew_point as number | undefined;
  const uvIndex       = attrs.uv_index as number | undefined;
  const cloudCoverage = attrs.cloud_coverage as number | undefined;
  const forecast      = attrs.forecast as WeatherForecast[] | undefined;
  const name          = (attrs.friendly_name as string | undefined) ?? t('home.chipmodals.weather.title');

  // Detect night: no sun entity available here, so check condition
  const isNight = condition === 'clear-night';
  const gradient = conditionGradient(condition, isNight);
  const largeIcon = CONDITION_ICON_LG[condition] ?? <CloudSun size={56} strokeWidth={1.5} />;

  const isHourly = forecast ? detectHourly(forecast) : false;
  const forecastToShow = forecast?.slice(0, isHourly ? 8 : 7) ?? [];

  // Build stat list — only show what's available
  const stats: StatProps[] = [];
  if (humidity != null) {
    stats.push({ icon: <Droplets size={14} strokeWidth={1.75} />, label: t('home.chipmodals.weather.stat.humidity'), value: `${humidity}%` });
  }
  if (apparentTemp != null) {
    stats.push({ icon: <Thermometer size={14} strokeWidth={1.75} />, label: t('home.chipmodals.weather.stat.feelsLike'), value: `${Math.round(apparentTemp)}${tempUnit}` });
  }
  if (windSpeed != null) {
    const bearing = windBearingLabel(windBearing);
    stats.push({
      icon: <Wind size={14} strokeWidth={1.75} />,
      label: t('home.chipmodals.weather.stat.wind'),
      value: `${windSpeed} ${windUnit}${bearing ? ` ${bearing}` : ''}`,
    });
  }
  if (windGust != null) {
    stats.push({ icon: <Wind size={14} strokeWidth={1.75} />, label: t('home.chipmodals.weather.stat.gusts'), value: `${windGust} ${windUnit}` });
  }
  if (pressure != null) {
    stats.push({ icon: <Gauge size={14} strokeWidth={1.75} />, label: t('home.chipmodals.weather.stat.pressure'), value: `${Math.round(pressure)} ${pressureUnit}` });
  }
  if (visibility != null) {
    stats.push({ icon: <Eye size={14} strokeWidth={1.75} />, label: t('home.chipmodals.weather.stat.visibility'), value: `${visibility} ${visibilityUnit}` });
  }
  if (dewPoint != null) {
    stats.push({ icon: <Thermometer size={14} strokeWidth={1.75} />, label: t('home.chipmodals.weather.stat.dewPoint'), value: `${Math.round(dewPoint)}${tempUnit}` });
  }
  if (uvIndex != null) {
    stats.push({ icon: <Sun size={14} strokeWidth={1.75} />, label: t('home.chipmodals.weather.stat.uvIndex'), value: String(Math.round(uvIndex)) });
  }
  if (cloudCoverage != null) {
    stats.push({ icon: <Cloud size={14} strokeWidth={1.75} />, label: t('home.chipmodals.weather.stat.cloudCover'), value: `${cloudCoverage}%` });
  }

  return (
    <div className="weather-modal__content">
      {/* Current conditions hero */}
      <div className="weather-modal__hero" style={{ '--weather-gradient': gradient } as React.CSSProperties}>
        <div className="weather-modal__hero-wash" aria-hidden="true" />
        <div className="weather-modal__hero-body">
          <div className="weather-modal__hero-icon" aria-hidden="true">{largeIcon}</div>
          <div className="weather-modal__hero-info">
            <p className="weather-modal__hero-temp">
              {temp != null ? `${Math.round(temp)}${tempUnit}` : '—'}
            </p>
            <p className="weather-modal__hero-condition">
              {condition.replace(/-/g, ' ')}
            </p>
            <p className="weather-modal__hero-name">{name}</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {stats.length > 0 && (
        <div className="weather-modal__stats">
          {stats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
      )}

      {/* Forecast */}
      {forecastToShow.length > 0 && (
        <div className="weather-modal__forecast">
          <p className="weather-modal__forecast-title">
            {isHourly ? t('home.chipmodals.weather.hourlyForecast') : t('home.chipmodals.weather.dailyForecast')}
          </p>
          <div className="weather-modal__forecast-list">
            {forecastToShow.map((entry, i) => (
              <ForecastRow
                key={i}
                entry={entry}
                label={formatForecastLabel(entry.datetime, isHourly, t, locale)}
                tempUnit={tempUnit}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
