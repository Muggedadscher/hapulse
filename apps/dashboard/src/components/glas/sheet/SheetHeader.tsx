/**
 * [fork] Glas sheets (stage 3) — the head of a window in Glas (plan docs/glas/PLAN-ETAPPE-3.md K53, GLAS-DESIGN
 * §7.18/§7.19): grid `44px 1fr 44px`, close (hit area 44, circle 32) on the left — "‹ Zurück" on a page —, title
 * 17/22 600 in the middle with an optional subtitle; the icon only on the desktop. The title keeps the id the panel's
 * `aria-labelledby` points to. The entity detail (stage 4, plan docs/glas/PLAN-ETAPPE-4.md K79, §7.20/§7.21) puts its
 * state tile before name and room (`lead`, also on the phone) and its star into the end column (`trailing`); in the
 * inspector the head reads tile, name and room, star, close (styles/glas/detail.css).
 */

import type { ReactNode } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { useT } from '../../../i18n/useT';

interface SheetHeaderProps {
  title: string;
  titleId: string;
  subtitle?: string | undefined;
  icon?: ReactNode;
  /** Before the title instead of the icon, also on the phone; decorative (the detail's state tile). */
  lead?: ReactNode;
  /** In the end column instead of the empty space (the detail's star). */
  trailing?: ReactNode;
  /** A page in another window: "‹ Zurück" instead of ×. */
  page: boolean;
  onClose: () => void;
}

export function SheetHeader({ title, titleId, subtitle, icon, lead, trailing, page, onClose }: SheetHeaderProps) {
  const t = useT();
  return (
    <div className={`g-sheet-header${page ? ' g-sheet-header--page' : ''}${lead ? ' g-sheet-header--lead' : ''}`}>
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
        {lead ? (
          <>
            <span className="g-sheet-header__lead" aria-hidden="true">{lead}</span>
            <div className="g-sheet-header__text">
              <h2 className="g-sheet-header__title" id={titleId}>{title}</h2>
              {subtitle && <p className="g-sheet-header__subtitle">{subtitle}</p>}
            </div>
          </>
        ) : (
          <>
            <div className="g-sheet-header__line">
              {icon && <span className="g-sheet-header__icon" aria-hidden="true">{icon}</span>}
              <h2 className="g-sheet-header__title" id={titleId}>{title}</h2>
            </div>
            {subtitle && <p className="g-sheet-header__subtitle">{subtitle}</p>}
          </>
        )}
      </div>
      {trailing ? (
        <div className="g-sheet-header__trail">{trailing}</div>
      ) : (
        <span className="g-sheet-header__end" aria-hidden="true" />
      )}
    </div>
  );
}
