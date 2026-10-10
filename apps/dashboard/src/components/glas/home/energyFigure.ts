/**
 * [fork] Glas: the big energy figure and the PV yield (docs/GLAS-DESIGN.md §7.9) — one decimal below 100, whole numbers
 * above. Its own module, so the More menu (MoreValue.tsx, always mounted) shows today's figure the same way without
 * pulling the energy card into the main chunk.
 */

import { formatNumber } from '@hapulse/core';

export const energyFigure = (v: number, locale: string): string =>
  v >= 100
    ? formatNumber(v, locale, { maxDecimals: 0 })
    : formatNumber(v, locale, { minDecimals: 1, maxDecimals: 1 });
