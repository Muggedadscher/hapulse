/**
 * [fork] Light/dark for THIS device only (global admin management): the admin's mode is
 * the default, a device may deviate — e.g. a wall tablet that should always be dark.
 */

import { Smartphone } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import type { ThemeMode } from '../../theme/themes';
import { useT } from '../../i18n/useT';
import type { TKey } from '../../i18n/useT';

const OPTIONS: { id: ThemeMode | null; labelKey: TKey }[] = [
  { id: null, labelKey: 'globalSettings.deviceMode.follow' },
  { id: 'light', labelKey: 'settings.appearance.mode.light' },
  { id: 'dark', labelKey: 'settings.appearance.mode.dark' },
  { id: 'auto', labelKey: 'settings.appearance.mode.auto' },
];

export function DeviceModeRow() {
  const t = useT();
  const modeOverride = useSettingsStore((s) => s.modeOverride);
  const setModeOverride = useSettingsStore((s) => s.setModeOverride);
  return (
    <div className="settings-card__row settings-card__row--inline">
      <span className="settings-card__row-label">
        <span className="settings-card__icon-chip" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
          <Smartphone size={14} strokeWidth={1.75} />
        </span>
        {t('globalSettings.deviceMode.label')}
      </span>
      <div className="mode-toggle" role="group" aria-label={t('globalSettings.deviceMode.label')}>
        {OPTIONS.map((o) => (
          <button
            key={o.id ?? 'follow'}
            type="button"
            className={`mode-toggle__btn${modeOverride === o.id ? ' mode-toggle__btn--active' : ''}`}
            onClick={() => setModeOverride(o.id)}
            aria-pressed={modeOverride === o.id}
          >
            {t(o.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
