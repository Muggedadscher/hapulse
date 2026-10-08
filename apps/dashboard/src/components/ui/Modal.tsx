/**
 * Modal — portal-based dialog primitive.
 *
 * Features:
 * - createPortal to document.body
 * - Dimmed + blurred backdrop; click closes
 * - Esc key closes (keydown listener with cleanup)
 * - Focus management: panel focused on open, returns focus on close
 * - aria-modal, role=dialog, aria-labelledby
 * - Body scroll locked while open
 * - Fade+scale on desktop; slide-up bottom sheet on mobile ≤640px
 * - prefers-reduced-motion: transitions disabled by CSS
 */

import React, { useEffect, useRef, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { useT } from '../../i18n/useT';
import { useGlasSheet } from '../glas/sheet/useGlasSheet'; // [fork] Glas sheets (docs/glas/PLAN-ETAPPE-3.md §3.1)
import { SheetContext } from '../glas/sheet/SheetContext'; // [fork]
import { SheetHeader } from '../glas/sheet/SheetHeader'; // [fork]
import { SheetGrabber } from '../glas/sheet/SheetGrabber'; // [fork]
import './Modal.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Extra class on the panel (e.g. a width modifier). */
  className?: string | undefined;
  /** [fork] Glas only: second line under the title (K53). */
  subtitle?: string | undefined;
  /** [fork] Glas only: false = the sheet never closes by dragging (alarm keypad, K51). */
  swipeToClose?: boolean | undefined;
  /** [fork] Glas only: a new value while open swaps the content in place (K70). */
  contentKey?: string | undefined;
  /** [fork] Glas only: where the focus goes back on close, if not to the trigger (K55). */
  returnFocus?: (() => HTMLElement | null) | undefined;
  /** [fork] Glas only: 'inspector' = from 1100 px a panel at the right that leaves the page usable (K60). */
  presentation?: 'auto' | 'inspector' | undefined;
  /** [fork] Glas only: a new value while open asks for the window again; one under another window comes up (K60). */
  requestKey?: number | undefined;
  /** [fork] Glas only: before the title instead of the icon, also on the phone (the detail's state tile, K79). */
  lead?: React.ReactNode;
  /** [fork] Glas only: at the end of the head (the detail's star, K79). */
  trailing?: React.ReactNode;
}

export function Modal({ open, onClose, title, icon, children, footer, className, subtitle, swipeToClose, contentKey, returnFocus, presentation, requestKey, lead, trailing }: ModalProps) { // [fork] Glas props
  const t = useT();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const sheet = useGlasSheet({ open, onClose, swipeToClose, contentKey, returnFocus, presentation, requestKey, panelRef }); // [fork]

  // Save the element that triggered the modal so we can return focus on close
  useEffect(() => {
    if (open) {
      // [fork] Glas has moved the focus into the window by now: its trigger, for a close after a switch to Klassisch
      triggerRef.current = sheet.onRef.current ? sheet.openedFrom.current : document.activeElement;
    }
  }, [open, sheet.onRef, sheet.openedFrom]); // [fork] both stable

  // Focus the panel when it opens
  useEffect(() => {
    if (sheet.onRef.current) return; // [fork] Glas: the sheet runtime moves the focus in and back (K55)
    if (open && panelRef.current) {
      // [fork] a dialog can name its default action (`data-autofocus`, e.g. What's New → "Got it"); otherwise the panel
      const initial = panelRef.current.querySelector<HTMLElement>('[data-autofocus]');
      (initial ?? panelRef.current).focus();
    }
    if (!open && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [open, sheet.onRef]); // [fork] sheet.onRef is stable: a style switch does not re-run it

  // Esc to close
  useEffect(() => {
    if (!open || sheet.on) return; // [fork] Glas: one Esc listener for all windows (K72)
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, sheet.on]); // [fork] sheet.on

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open || sheet.on) return; // [fork] Glas: scroll lock by CSS while a window is open (K63)
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, sheet.on]); // [fork] sheet.on

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!open) return null;

  return createPortal(
    <SheetContext.Provider value={sheet.context}>{/* [fork] the content knows its Glas window (pages, K48) */}
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      aria-hidden="false"
      ref={sheet.backdropRef} // [fork] Glas: the ghost closes the window animated (K47)
    >
      {sheet.on && <div className="g-sheet-scrim" aria-hidden="true" />}{/* [fork] */}
      <div
        className={`modal-panel${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
      >
        {sheet.on && !sheet.page && <SheetGrabber control={sheet.grabber} />}{/* [fork] */}
        {sheet.on ? ( // [fork] Glas head (K53)
          <SheetHeader title={title} titleId={titleId} subtitle={subtitle} icon={icon} lead={lead} trailing={trailing} page={sheet.page} onClose={onClose} />
        ) : (
        <div className="modal-header">
          {icon && <span className="modal-header__icon" aria-hidden="true">{icon}</span>}
          <h2 className="modal-header__title" id={titleId}>{title}</h2>
          <span className="modal-header__close">
            <IconButton
              label={t('common.close')}
              variant="ghost"
              size={36}
              onClick={onClose}
            >
              <X size={18} strokeWidth={1.75} />
            </IconButton>
          </span>
        </div>
        )}{/* [fork] */}

        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
    </SheetContext.Provider>,
    document.body
  );
}
