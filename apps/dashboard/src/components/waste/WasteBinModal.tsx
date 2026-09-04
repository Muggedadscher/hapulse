/**
 * [fork] WasteBinModal — a bin's upcoming pickups.
 *
 * Opened from a WasteCard tile. Lists the bin's next collection dates (from the
 * sensor's `upcoming` attribute), each with its own type label so a rescheduled
 * "(verlegt)" date is visible as such. Uses the shared Modal primitive and the
 * detail-modal list styling; tokens only.
 */

import React from 'react';
import { Trash2, CalendarClock } from 'lucide-react';
import type { WasteBin } from '@hapulse/core';
import { Modal } from '../ui/Modal';
import { MdiIcon } from '../ui/MdiIcon';
import { useT, useLocale } from '../../i18n/useT';
import { countdownLabel, formatWasteDate, wasteTone, toneVars, isWasteSoon } from './wasteDisplay';
import './WasteCard.css';

interface WasteBinModalProps {
  bin: WasteBin | null;
  onClose: () => void;
}

export function WasteBinModal({ bin, onClose }: WasteBinModalProps) {
  const t = useT();
  const locale = useLocale();
  const refYear = new Date().getFullYear();

  // Keep hooks unconditional; render nothing meaningful until a bin is chosen.
  const tone = bin ? wasteTone(bin.name, bin.icon) : 'neutral';
  const vars = toneVars(tone);
  const countdown = bin ? countdownLabel(bin.daysTo, t) : null;

  return (
    <Modal
      open={bin != null}
      onClose={onClose}
      title={bin?.name ?? ''}
      icon={
        <span className="waste-modal__title-icon" style={{ color: vars.color }} aria-hidden="true">
          <MdiIcon icon={bin?.icon} size={20} fallback={<Trash2 size={18} strokeWidth={1.75} />} />
        </span>
      }
    >
      {bin && (
        <div className="waste-modal">
          {countdown && (
            <div className={`waste-modal__next${isWasteSoon(bin.daysTo) ? ' waste-modal__next--soon' : ''}`}>
              <span className="waste-modal__next-count">{countdown}</span>
              {bin.nextDate && (
                <span className="waste-modal__next-date">{formatWasteDate(bin.nextDate, locale, refYear)}</span>
              )}
            </div>
          )}

          <div className="waste-modal__section-label">{t('waste.upcoming')}</div>

          {bin.upcoming.length > 0 ? (
            <ul className="waste-modal__list">
              {bin.upcoming.map((c) => {
                // Only surface a per-date type when it differs from the bin name
                // (e.g. a "(verlegt)" reschedule); otherwise it's just noise.
                const showType = c.type != null && c.type.trim() !== bin.name;
                return (
                  <li key={c.date} className="waste-modal__row">
                    <CalendarClock size={15} strokeWidth={1.75} className="waste-modal__row-icon" aria-hidden="true" />
                    <span className="waste-modal__row-date">{formatWasteDate(c.date, locale, refYear)}</span>
                    {showType && <span className="waste-modal__row-type">{c.type}</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="waste-modal__empty">{t('waste.noUpcoming')}</p>
          )}
        </div>
      )}
    </Modal>
  );
}
