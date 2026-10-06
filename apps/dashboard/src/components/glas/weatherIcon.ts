/**
 * [fork] Glas frame (stage 2) — Lucide symbol for a Home Assistant weather condition (plan
 * docs/glas/PLAN-ETAPPE-2.md K44; used by the weather line and the desktop weather pill). Own table on purpose:
 * upstream's WeatherHero.tsx is not mounted anywhere and may disappear.
 */

import {
  Cloud,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  TriangleAlert,
  Wind,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Readonly<Record<string, LucideIcon>> = {
  'clear-night': Moon,
  cloudy: Cloud,
  exceptional: TriangleAlert,
  fog: CloudFog,
  hail: CloudHail,
  lightning: CloudLightning,
  'lightning-rainy': CloudLightning,
  partlycloudy: CloudSun,
  pouring: CloudRainWind,
  rainy: CloudRain,
  snowy: CloudSnow,
  'snowy-rainy': CloudSnow,
  sunny: Sun,
  windy: Wind,
  'windy-variant': Wind,
};

/** The symbol for a `weather.*` state; unknown states (and "unavailable") get the plain cloud. */
export function weatherIcon(condition: string | undefined): LucideIcon {
  return (condition && ICONS[condition]) || Cloud;
}
