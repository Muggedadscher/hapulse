/**
 * [fork] Glas sheets (stage 3) — the head of a window in Glas (plan docs/glas/PLAN-ETAPPE-3.md K53, GLAS-DESIGN
 * §7.18/§7.19): grid `44px 1fr 44px`, close (hit area 44, circle 32) on the left — "‹ Zurück" on a page —, title
 * 17/22 600 in the middle with an optional subtitle; the icon only on the desktop. The title keeps the id the panel's
 * `aria-labelledby` points to.
 */

import type { ReactNode } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { useT } from '../../../i18n/useT';

interface SheetHeaderProps {
  title: string;
  titleId: string;
  subtitle?: string | undefined;
  icon?: ReactNode;
  /** A page in another window: "‹ Zurück" instead of ×. */
  page: boolean;
  onClose: () => void;
}

export function SheetHeader({ title, titleId, subtitle, icon, page, onClose }: SheetHeaderProps) {
  const t = useT();
  return (
    <div className={`g-sheet-header${page ? ' g-sheet-header--page' : ''}`}>
      {page ? (
        <button type="button" className="g-sheet-header__back" onClick={onClose}>
          <ChevronLeft size={24} strokeWidth={2.25} aria-hidden="true" />
          <span>{t('common.back')}</span>
        </button>
      ) : (
        <button type="button" className="g-sheet-header__close" aria-label={t('common.close')} onClick={onClose}>
          <span className="g-sheet-header__close-circle" aria-hidden="true">
            <X size={16} strokeWidth={2.5} />
          </span>
        </button>
      )}
      <div className="g-sheet-header__titles">
        <div className="g-sheet-header__line">
          {icon && <span className="g-sheet-header__icon" aria-hidden="true">{icon}</span>}
          <h2 className="g-sheet-header__title" id={titleId}>{title}</h2>
        </div>
        {subtitle && <p className="g-sheet-header__subtitle">{subtitle}</p>}
      </div>
      <span className="g-sheet-header__end" aria-hidden="true" />
    </div>
  );
}
