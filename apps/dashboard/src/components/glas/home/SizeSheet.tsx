/**
 * [fork] Glas edit mode: "⋯ Anpassen" of a card on the overview (plan docs/glas/PLAN-ETAPPE-4.md K78, GLAS-DESIGN
 * §7.32). The classic values in one window: columns 1–4 and the height cap (off, 180, 280, 400, 560 px), both as a
 * segment. They are the same fields Klassisch reads; a cap leaves "L" (the cap sets the height, Home.tsx).
 */

import { formatNumber } from '@hapulse/core';
import { Modal } from '../../ui/Modal';
import { HEIGHT_PX, MAX_HEIGHT_LEVEL } from '../../ui/SectionResize';
import { Segment } from '../Segment';
import { useLocale, useT } from '../../../i18n/useT';

const COLUMNS = ['1', '2', '3', '4'] as const;

interface SizeSheetProps {
  open: boolean;
  onClose: () => void;
  /** The card's name (second line of the head). */
  name: string;
  span: number;
  height: number;
  onSpan: (span: number) => void;
  onHeight: (level: number) => void;
}

export function SizeSheet({ open, onClose, name, span, height, onSpan, onHeight }: SizeSheetProps) {
  const t = useT();
  const locale = useLocale();
  const levels = Array.from({ length: MAX_HEIGHT_LEVEL + 1 }, (_, level) => ({
    value: String(level),
    label: level === 0 ? t('glas.edit.heightOff') : `${formatNumber(HEIGHT_PX[level] ?? 0, locale)} px`,
  }));
  return (
    <Modal open={open} onClose={onClose} title={t('glas.edit.customize')} subtitle={name} className="g-size-sheet">
      <div className="g-size-sheet__group">
        <span className="g-size-sheet__label" aria-hidden="true">{t('glas.edit.columns')}</span>
        <Segment
          className="g-seg--sheet"
          label={t('glas.edit.columns')}
          value={String(span)}
          options={COLUMNS.map((c) => ({ value: c, label: formatNumber(Number(c), locale) }))}
          onChange={(c) => onSpan(Number(c))}
        />
      </div>
      <div className="g-size-sheet__group">
        <span className="g-size-sheet__label" aria-hidden="true">{t('glas.edit.maxHeight')}</span>
        <Segment
          className="g-seg--sheet"
          label={t('glas.edit.maxHeight')}
          value={String(height)}
          options={levels}
          onChange={(l) => onHeight(Number(l))}
        />
      </div>
    </Modal>
  );
}
