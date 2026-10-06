/**
 * [fork] Settings → Appearance: the style ("Klassisch" | "Glas"), and while Glas is active its strength and
 * "Transparenz reduzieren". All three are GLOBAL customization fields: under the admin management the admin's choice
 * applies to every user and device; per device only light/dark can differ (docs/GLAS-PLAN.md §7.3, E1/E2).
 * Shown only to Home Assistant admins (E11). One exception, so that nobody is stuck in the preview: a non-admin
 * without the admin management who has Glas anyway (e.g. from an imported admin export) sees it as the way back.
 * Under the management the admin's document decides; a document without a style means Klassisch (`applyGlobal`).
 */

import { Blend, Contrast, Layers, Palette } from 'lucide-react';
import type { GlasStrength, UiStyle } from '@hapulse/core';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCanEdit } from '../../ha/hooks';
import { normalizeGlassStrength } from '../../theme/glasAppearance';
import { useUiStyle } from '../../app/glas/useUiStyle';
import { useT } from '../../i18n/useT';
import type { TKey } from '../../i18n/useT';
import './GlobalSettings.css';

const STYLE_OPTIONS: { id: UiStyle; labelKey: TKey }[] = [
  { id: 'classic', labelKey: 'glas.style.classic' },
  { id: 'glas', labelKey: 'glas.style.glas' },
];

const STRENGTH_OPTIONS: { id: GlasStrength; labelKey: TKey }[] = [
  { id: 'clear', labelKey: 'glas.strength.clear' },
  { id: 'tinted', labelKey: 'glas.strength.tinted' },
  { id: 'opaque', labelKey: 'glas.strength.opaque' },
];

export function StyleSettings({ locked, managed }: { locked: boolean; managed: boolean }) {
  const t = useT();
  const canEdit = useCanEdit();
  const uiStyle = useUiStyle();
  const glassStrength = useSettingsStore((s) => normalizeGlassStrength(s.customization.glassStrength));
  const reduceTransparency = useSettingsStore((s) => s.customization.reduceTransparency === true);
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);
  if (!canEdit && (managed || uiStyle !== 'glas')) return null; // after all hooks

  return (
    <fieldset className="managed-fieldset" disabled={locked}>
      <div className="settings-card__row settings-card__row--inline">
        <span className="settings-card__row-label">
          <span className="settings-card__icon-chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Layers size={14} strokeWidth={1.75} />
          </span>
          {t('glas.style.label')}
        </span>
        <div className="mode-toggle" role="group" aria-label={t('glas.style.groupAria')}>
          {STYLE_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`mode-toggle__btn${uiStyle === o.id ? ' mode-toggle__btn--active' : ''}`}
              onClick={() => updateCustomization({ uiStyle: o.id })}
              aria-pressed={uiStyle === o.id}
              data-glas-style-option={o.id}
            >
              {t(o.labelKey)}
            </button>
          ))}
        </div>
        <p className="managed-row-hint">
          {t('glas.style.hint')}
          {managed && <> · {t('globalSettings.mode.hintGlobal')}</>}
        </p>
      </div>

      {uiStyle === 'glas' && (
        <>
          <div className="settings-card__row settings-card__row--inline">
            <span className="settings-card__row-label">
              <span className="settings-card__icon-chip" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
                <Blend size={14} strokeWidth={1.75} />
              </span>
              {t('glas.strength.label')}
            </span>
            <div className="mode-toggle" role="group" aria-label={t('glas.strength.groupAria')}>
              {STRENGTH_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`mode-toggle__btn${glassStrength === o.id ? ' mode-toggle__btn--active' : ''}`}
                  onClick={() => updateCustomization({ glassStrength: o.id })}
                  aria-pressed={glassStrength === o.id}
                >
                  {t(o.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-card__row settings-card__row--inline">
            <span className="settings-card__row-label">
              <span className="settings-card__icon-chip" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
                <Contrast size={14} strokeWidth={1.75} />
              </span>
              {t('glas.reduceTransparency.label')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={reduceTransparency}
              aria-label={t('glas.reduceTransparency.label')}
              className={`admin-toggle${reduceTransparency ? ' admin-toggle--on' : ''}`}
              onClick={() => updateCustomization({ reduceTransparency: !reduceTransparency })}
            >
              <span className="admin-toggle__thumb" />
            </button>
            <p className="managed-row-hint">{t('glas.reduceTransparency.hint')}</p>
          </div>
        </>
      )}
    </fieldset>
  );
}

/** In Glas, instead of the theme cards: one neutral palette; the theme stays saved for Klassisch (E14). */
export function GlasThemeHint() {
  const t = useT();
  return (
    <div className="settings-card__row settings-card__row--inline">
      <span className="settings-card__row-label">
        <span className="settings-card__icon-chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          <Palette size={14} strokeWidth={1.75} />
        </span>
        {t('settings.appearance.theme.label')}
      </span>
      <p className="managed-row-hint">{t('glas.themeHint')}</p>
    </div>
  );
}
