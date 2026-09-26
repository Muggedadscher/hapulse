/**
 * [fork] Renders the toast stack (stores/toastStore) above the mobile tab bar.
 */

import { X } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore';
import { useT } from '../../i18n/useT';
import './Toaster.css';

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const t = useT();
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toaster__item">
          <span className="toaster__text">{t(toast.key, toast.vars)}</span>
          <button
            type="button"
            className="toaster__close"
            aria-label={t('toast.dismiss')}
            onClick={() => dismiss(toast.id)}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  );
}
