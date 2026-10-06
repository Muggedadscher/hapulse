/**
 * [fork] Renders the toast stack (stores/toastStore) above the mobile tab bar. Glas (plan docs/glas/PLAN-ETAPPE-2.md
 * §3.7): every toast is an error message, so each one is an alert instead of the polite live region.
 */

import { X } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore';
import { useIsGlas } from '../../app/glas/useUiStyle';
import { useT } from '../../i18n/useT';
import './Toaster.css';

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const t = useT();
  const glas = useIsGlas();
  return (
    <div className="toaster" role={glas ? undefined : 'status'} aria-live={glas ? undefined : 'polite'}>
      {toasts.map((toast) => (
        <div key={toast.id} className="toaster__item" role={glas ? 'alert' : undefined}>
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
