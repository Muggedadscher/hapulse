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
}

export function Modal({ open, onClose, title, icon, children, footer, className }: ModalProps) {
  const t = useT();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Save the element that triggered the modal so we can return focus on close
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
    }
  }, [open]);

  // Focus the panel when it opens
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
    if (!open && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

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
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      aria-hidden="false"
    >
      <div
        className={`modal-panel${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
      >
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

        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
