/**
 * [fork] WasteCard — the Home overview's "Waste collection" card.
 *
 * Renders one tile per detected bin (soonest pickup first): a type-tinted icon,
 * the bin name with its next date, and a countdown ("Today" / "in 3 days").
 * Tapping a tile opens {@link WasteBinModal} with that bin's upcoming dates.
 *
 * The card is intentionally thin — detection/de-duplication happens in
 * `@hapulse/core` (`detectWasteBins`) and is passed in as `bins`; Home hides the
 * whole section when there are none, so this component never renders empty.
 */

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { WasteBin } from '@hapulse/core';
import { Card } from '../ui/Card';
import { MdiIcon } from '../ui/MdiIcon';
import { useT, useLocale } from '../../i18n/useT';
import { WasteBinModal } from './WasteBinModal';
import { wasteTone, toneVars, formatWasteDate, countdownLabel, isWasteSoon } from './wasteDisplay';
import './WasteCard.css';

interface WasteCardProps {
  bins: WasteBin[];
}

export function WasteCard({ bins }: WasteCardProps) {
  const t = useT();
  const locale = useLocale();
  const [openBin, setOpenBin] = useState<WasteBin | null>(null);
  const refYear = new Date().getFullYear();

  return (
    <Card className="waste-card">
      <div className="waste-card__header">
        <span className="waste-card__icon-chip" aria-hidden="true">
          <Trash2 size={16} strokeWidth={1.75} />
        </span>
        <span className="waste-card__title">{t('waste.title')}</span>
      </div>

      <ul className="waste-card__grid">
        {bins.map((bin) => {
          const tone = wasteTone(bin.name, bin.icon);
          const vars = toneVars(tone);
          const countdown = countdownLabel(bin.daysTo, t);
          const soon = isWasteSoon(bin.daysTo);
          return (
            <li key={bin.entityId}>
              <button
                type="button"
                className="waste-tile"
                onClick={() => setOpenBin(bin)}
                aria-haspopup="dialog"
                // No aria-label: the visible name + date + countdown ARE the
                // accessible name, so screen readers hear the next pickup too
                // (an overriding label would suppress that text). aria-haspopup
                // conveys that activating opens a dialog.
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

      <WasteBinModal bin={openBin} onClose={() => setOpenBin(null)} />
    </Card>
  );
}
