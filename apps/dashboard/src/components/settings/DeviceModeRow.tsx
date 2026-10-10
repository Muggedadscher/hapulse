/**
 * [fork] Light/dark for THIS device only (global admin management): the admin's mode is
 * the default, a device may deviate — e.g. a wall tablet that should always be dark.
 * In Glas the choice is a segment with manual activation (it writes; plan docs/glas/PLAN-ETAPPE-5.md K92).
 */

import { Smartphone } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import type { ThemeMode } from '../../theme/themes';
import { useIsGlas } from '../../app/glas/useUiStyle';
import { Segment } from '../glas/Segment';
import { useT } from '../../i18n/useT';
import type { TKey } from '../../i18n/useT';
import './GlobalSettings.css';

/** The segment's values: `follow` stands for null (the admin's mode). */
type Choice = ThemeMode | 'follow';

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
  const isGlas = useIsGlas();
  return (
    <div className="settings-card__row settings-card__row--inline">
      <span className="settings-card__row-label">
        <span className="settings-card__icon-chip" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
          <Smartphone size={14} strokeWidth={1.75} />
        </span>
        {t('globalSettings.deviceMode.label')}
      </span>
      {isGlas ? (
        <Segment<Choice>
          className="g-seg--settings"
          label={t('globalSettings.deviceMode.label')}
          value={modeOverride ?? 'follow'}
          onChange={(id) => setModeOverride(id === 'follow' ? null : id)}
          activation="manual"
          options={OPTIONS.map((o) => ({ value: o.id ?? 'follow', label: t(o.labelKey) }))}
        />
      ) : (
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
      )}
      <p className="managed-row-hint">
        {t('globalSettings.deviceMode.hint', {
          follow: t('globalSettings.deviceMode.follow'),
          mode: t('settings.appearance.mode.label'),
        })}
      </p>
    </div>
  );
}
