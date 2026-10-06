/**
 * [fork] Glas frame (stage 2) — the weather line under the greeting on the phone (GLAS-DESIGN §7.4, plan
 * docs/glas/PLAN-ETAPPE-2.md §3.4): symbol by condition (K44), "14 °C · Teilweise bewölkt", chevron; opens the same
 * weather window as the header pill (the entity choice for editors stays in there). Nothing without a weather entity.
 */

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatNumber } from '@hapulse/core';
import { WeatherModal } from '../home/chipmodals';
import { useWeatherEntity } from '../../ha/hooks';
import { useLocale, useStateLabel, useT } from '../../i18n/useT';
import { weatherIcon } from './weatherIcon';

/** "14 °C" — rounded like the header pill, number in the UI language, unit after a no-break space ("14°" without unit). */
export function weatherTemp(temp: number, unit: string, locale: string): string {
  const n = formatNumber(Math.round(temp), locale);
  return unit === '°' ? `${n}°` : `${n} ${unit}`;
}

export function WeatherLine() {
  const t = useT();
  const locale = useLocale();
  const sl = useStateLabel();
  const weather = useWeatherEntity();
  const [open, setOpen] = useState(false);
  if (!weather) return null;

  const temp = weather.attributes.temperature as number | undefined;
  const unit = (weather.attributes.temperature_unit as string | undefined) ?? '°';
  const condition = sl('weather', weather.state);
  const tempText = temp != null ? weatherTemp(temp, unit, locale) : null;
  const Icon = weatherIcon(weather.state);

  return (
    <>
      <button
        type="button"
        className="g-weather-line"
        aria-label={t('nav.weatherGlance.ariaLabel', { condition, tempPart: tempText ? `, ${tempText}` : '' })}
        onClick={() => setOpen(true)}
      >
        <Icon className="g-weather-line__icon" size={20} strokeWidth={1.75} aria-hidden="true" />
        <span className="g-weather-line__text">{tempText ? `${tempText} · ${condition}` : condition}</span>
        <ChevronRight className="g-weather-line__chevron" size={17} strokeWidth={2} aria-hidden="true" />
      </button>
      <WeatherModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
