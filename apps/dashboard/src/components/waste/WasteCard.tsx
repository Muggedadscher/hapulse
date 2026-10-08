/**
 * [fork] WasteCard — the Home overview's "Waste collection" card.
 *
 * A hero row highlights the very next pickup ("Next up: Papiertonne · in 4 days"),
 * mirroring the summary tile the user had on their Home Assistant dashboard, in
 * HAPulse's Daylight style. The remaining bins follow as compact tiles. Every
 * row is tappable and opens {@link WasteBinModal} with that bin's upcoming dates.
 *
 * The card is intentionally thin — detection/de-duplication happens in
 * `@hapulse/core` (`detectWasteBins`) and is passed in as `bins`; Home hides the
 * whole section when there are none, so this component never renders empty.
 *
 * Glas (docs/GLAS-DESIGN.md §7.14, plan docs/glas/PLAN-ETAPPE-4.md K83): one list, a row per bin with its colour dot,
 * the next pickup first and stressed (desktop: "Als Nächstes" above it); styles/glas/home-lists.css.
 */

import React, { useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import type { WasteBin } from '@hapulse/core';
import { Card } from '../ui/Card';
import { MdiIcon } from '../ui/MdiIcon';
import { useT, useLocale } from '../../i18n/useT';
import { useIsGlas } from '../../app/glas/useUiStyle';
import { WasteBinModal } from './WasteBinModal';
import { wasteTone, toneVars, formatWasteDate, countdownLabel, isWasteSoon } from './wasteDisplay';
import './WasteCard.css';

interface WasteCardProps {
  bins: WasteBin[];
}

export function WasteCard({ bins }: WasteCardProps) {
  const t = useT();
  const locale = useLocale();
  const isGlas = useIsGlas();
  const [openBin, setOpenBin] = useState<WasteBin | null>(null);
  const refYear = new Date().getFullYear();

  if (bins.length === 0) return null; // Home already hides the section; belt & braces.

  const next = bins[0]!;
  const rest = bins.slice(1);

  const nextTone = toneVars(wasteTone(next.name, next.icon));
  const nextCountdown = countdownLabel(next.daysTo, t);
  const nextSoon = isWasteSoon(next.daysTo);

  return (
    <Card className="waste-card">
      <div className="waste-card__header">
        <span className="waste-card__icon-chip" aria-hidden="true">
          <Trash2 size={16} strokeWidth={1.75} />
        </span>
        <span className="waste-card__title">{t('waste.title')}</span>
      </div>

      {isGlas ? (
        <ul className="g-waste">
          {bins.map((bin, i) => {
            const date = bin.nextDate ? formatWasteDate(bin.nextDate, locale, refYear) : null;
            const countdown = countdownLabel(bin.daysTo, t);
            return (
              <li key={bin.entityId}>
                <button
                  type="button"
                  className="g-waste__row"
                  data-next={i === 0 ? '' : undefined}
                  onClick={() => setOpenBin(bin)}
                  aria-haspopup="dialog"
                >
                  <span className="g-waste__dot" data-tone={wasteTone(bin.name, bin.icon)} aria-hidden="true" />
                  <span className="g-waste__line">
                    <span className="g-waste__text">
                      {i === 0 && <span className="g-waste__over">{t('waste.next')}</span>}
                      <span className="g-waste__name">{bin.name}</span>
                      {date && <span className="g-waste__date">{date}</span>}
                    </span>
                    <span className="g-waste__when">
                      {countdown && <span className="g-waste__count">{countdown}</span>}
                      {date && <span className="g-waste__date g-waste__date--end">{date}</span>}
                    </span>
                    <ChevronRight className="g-waste__chev" size={16} strokeWidth={2.25} aria-hidden="true" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          {/* Hero: the very next pickup, prominent. */}
          <button
            type="button"
            className="waste-hero"
            onClick={() => setOpenBin(next)}
            aria-haspopup="dialog"
          >
            <span
              className="waste-hero__icon"
              style={{ background: nextTone.bg, color: nextTone.color }}
              aria-hidden="true"
            >
              <MdiIcon icon={next.icon} size={26} fallback={<Trash2 size={24} strokeWidth={1.75} />} />
            </span>
            <span className="waste-hero__text">
              <span className="waste-hero__overline">{t('waste.next')}</span>
              <span className="waste-hero__name">{next.name}</span>
              <span className="waste-hero__meta">
                {nextCountdown && (
                  <span className={`waste-hero__countdown${nextSoon ? ' waste-hero__countdown--soon' : ''}`}>
                    {nextCountdown}
                  </span>
                )}
                {next.nextDate && (
                  <>
                    <span className="waste-hero__dot" aria-hidden="true">·</span>
                    <span className="waste-hero__date">{formatWasteDate(next.nextDate, locale, refYear)}</span>
                  </>
                )}
              </span>
            </span>
          </button>

          {/* The other bins, soonest first. */}
          {rest.length > 0 && (
            <ul className="waste-card__grid">
              {rest.map((bin) => {
                const vars = toneVars(wasteTone(bin.name, bin.icon));
                const countdown = countdownLabel(bin.daysTo, t);
                const soon = isWasteSoon(bin.daysTo);
                return (
                  <li key={bin.entityId}>
                    <button
                      type="button"
                      className="waste-tile"
                      onClick={() => setOpenBin(bin)}
                      aria-haspopup="dialog"
                    >
                      <span
                        className="waste-tile__icon"
                        style={{ background: vars.bg, color: vars.color }}
                        aria-hidden="true"
                      >
                        <MdiIcon icon={bin.icon} size={20} fallback={<Trash2 size={18} strokeWidth={1.75} />} />
                      </span>
                      <span className="waste-tile__text">
                        <span className="waste-tile__name">{bin.name}</span>
                        {bin.nextDate && (
                          <span className="waste-tile__date">{formatWasteDate(bin.nextDate, locale, refYear)}</span>
                        )}
                      </span>
                      {countdown && (
                        <span className={`waste-tile__countdown${soon ? ' waste-tile__countdown--soon' : ''}`}>
                          {countdown}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <WasteBinModal bin={openBin} onClose={() => setOpenBin(null)} />
    </Card>
  );
}
