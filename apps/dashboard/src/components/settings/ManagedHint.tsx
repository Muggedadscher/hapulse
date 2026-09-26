/** [fork] "Managed by your administrator" — shown where shared settings are read-only. */

import { Lock } from 'lucide-react';
import { useT } from '../../i18n/useT';
import './GlobalSettings.css';

export function ManagedHint({ text }: { text?: string | undefined }) {
  const t = useT();
  return (
    <p className="managed-hint" role="note">
      <Lock size={14} strokeWidth={2} aria-hidden="true" />
      {text ?? t('globalSettings.managedHint')}
    </p>
  );
}
