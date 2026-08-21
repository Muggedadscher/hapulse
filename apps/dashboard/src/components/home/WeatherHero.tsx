import React from 'react';
import {
  Sun, Moon, CloudSun, Cloud, CloudRain, CloudLightning, CloudSnow,
  Wind, Droplets,
} from 'lucide-react';
import type { HassEntity, Locale, WeatherForecast } from '@hapulse/core';
import { useLocale, useStateLabel } from '../../i18n/useT';
import './home.css';

interface WeatherHeroProps {
  entity: HassEntity;
  /** Whether sun.sun is below_horizon */
  isNight: boolean;
  /**
   * Optional slot rendered in the middle zone of the hero, between the
   * weather data (left) and the forecast strip (right).
   * Intended for FavoritesStrip.
   */
  favoritesSlot?: React.ReactNode;
}

const CONDITION_ICONS: Record<string, React.ReactNode> = {
  sunny: <Sun size={22} strokeWidth={1.75} />,
  'clear-night': <Moon size={22} strokeWidth={1.75} />,
  partlycloudy: <CloudSun size={22} strokeWidth={1.75} />,
  cloudy: <Cloud size={22} strokeWidth={1.75} />,
  rainy: <CloudRain size={22} strokeWidth={1.75} />,
  pouring: <CloudRain size={22} strokeWidth={1.75} />,
  snowy: <CloudSnow size={22} strokeWidth={1.75} />,
  lightning: <CloudLightning size={22} strokeWidth={1.75} />,
  'lightning-rainy': <CloudLightning size={22} strokeWidth={1.75} />,
  fog: <Wind size={22} strokeWidth={1.75} />,
  windy: <Wind size={22} strokeWidth={1.75} />,
  'windy-variant': <Wind size={22} strokeWidth={1.75} />,
  hail: <CloudRain size={22} strokeWidth={1.75} />,
};

const FORECAST_ICONS: Record<string, React.ReactNode> = {
  sunny: <Sun size={14} strokeWidth={1.75} />,
  'clear-night': <Moon size={14} strokeWidth={1.75} />,
  partlycloudy: <CloudSun size={14} strokeWidth={1.75} />,
  cloudy: <Cloud size={14} strokeWidth={1.75} />,
  rainy: <CloudRain size={14} strokeWidth={1.75} />,
  pouring: <CloudRain size={14} strokeWidth={1.75} />,
  snowy: <CloudSnow size={14} strokeWidth={1.75} />,
  lightning: <CloudLightning size={14} strokeWidth={1.75} />,
  'lightning-rainy': <CloudLightning size={14} strokeWidth={1.75} />,
  fog: <Wind size={14} strokeWidth={1.75} />,
  windy: <Wind size={14} strokeWidth={1.75} />,
  hail: <CloudRain size={14} strokeWidth={1.75} />,
};

/** Returns the ambient wash gradient CSS based on condition + night */
function conditionWash(condition: string, isNight: boolean): string {
  if (isNight || condition === 'clear-night') {
    return 'radial-gradient(ellipse 80% 60% at 70% 30%, rgba(63,48,120,0.35) 0%, transparent 70%)';
  }
  switch (condition) {
    case 'sunny':
      return 'radial-gradient(ellipse 80% 60% at 70% 20%, rgba(232,168,75,0.28) 0%, transparent 70%)';
    case 'rainy':
    case 'pouring':
      return 'radial-gradient(ellipse 80% 60% at 60% 30%, rgba(80,100,140,0.3) 0%, transparent 70%)';
    case 'snowy':
      return 'radial-gradient(ellipse 80% 60% at 70% 30%, rgba(180,210,235,0.22) 0%, transparent 70%)';
    case 'cloudy':
    case 'partlycloudy':
      return 'radial-gradient(ellipse 80% 60% at 70% 30%, rgba(120,130,145,0.2) 0%, transparent 70%)';
    default:
      return 'radial-gradient(ellipse 80% 60% at 70% 30%, rgba(100,110,130,0.18) 0%, transparent 70%)';
  }
}

function shortDayName(isoDate: string, locale: Locale): string {
  try {
    return new Date(isoDate).toLocaleDateString(locale, { weekday: 'short' });
  } catch {
    return '';
  }
}

export function WeatherHero({ entity, isNight, favoritesSlot }: WeatherHeroProps) {
  const locale = useLocale();
  const sl = useStateLabel();
  const condition = (entity.attributes.condition as string | undefined) ?? entity.state;
  const temp = entity.attributes.temperature as number | undefined;
  const tempUnit = (entity.attributes.temperature_unit as string | undefined) ?? '°C';
  const humidity = entity.attributes.humidity as number | undefined;
  const windSpeed = entity.attributes.wind_speed as number | undefined;
  const forecast = entity.attributes.forecast as WeatherForecast[] | undefined;

  const condIcon = CONDITION_ICONS[condition] ?? <CloudSun size={22} strokeWidth={1.75} />;
  const wash = conditionWash(condition, isNight);

  const forecastDays = forecast?.slice(0, 5) ?? [];

  return (
    <div className="weather-hero">
      {/* Ambient radial wash */}
      <div
        className="weather-hero__wash"
        style={{ background: wash }}
        aria-hidden="true"
      />

      <div className="weather-hero__content">
        <div className="weather-hero__left">
          <div className="weather-hero__condition-row">
            {condIcon}
            <span className="weather-hero__condition-text">{sl('weather', condition)}</span>
          </div>
          <div className="weather-hero__temp">
            {temp != null ? `${Math.round(temp)}${tempUnit}` : '—'}
          </div>
          {(humidity != null || windSpeed != null) && (
            <div className="weather-hero__chips">
              {humidity != null && (
                <span className="weather-hero__chip">
                  <Droplets size={12} strokeWidth={1.75} />
                  {humidity}%
                </span>
              )}
              {windSpeed != null && (
                <span className="weather-hero__chip">
                  <Wind size={12} strokeWidth={1.75} />
                  {windSpeed} km/h
                </span>
              )}
            </div>
          )}
        </div>

        {/* Favorites zone — grows to fill space between weather data and forecast */}
        {favoritesSlot != null && (
          <div className="weather-hero__favorites">
            {favoritesSlot}
          </div>
        )}

        {forecastDays.length > 0 && (
          <div className="weather-hero__forecast">
            {forecastDays.map((day, i) => (
              <div key={i} className="weather-hero__forecast-day">
                <span className="weather-hero__forecast-label">{shortDayName(day.datetime, locale)}</span>
                <span className="weather-hero__forecast-icon">
                  {FORECAST_ICONS[day.condition] ?? <Cloud size={14} strokeWidth={1.75} />}
                </span>
                <span className="weather-hero__forecast-temp">{Math.round(day.temperature)}°</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
