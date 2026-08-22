/**
 * ThemeSwatch — mini preview card for a single theme.
 * Shows bg/card/accent shapes as coloured SVG rectangles.
 */

import React from 'react';
import { useT } from '../../i18n/useT';
import { THEMES, THEME_LABELS } from '../../theme/themes';
import type { ThemeName, ResolvedMode } from '../../theme/themes';

interface ThemeSwatchProps {
  name: ThemeName;
  active: boolean;
  onClick: () => void;
  /** Which variant to preview (defaults to light). */
  previewMode?: ResolvedMode;
}

export function ThemeSwatch({ name, active, onClick, previewMode = 'light' }: ThemeSwatchProps) {
  const t = useT();
  const c = THEMES[name][previewMode];

  return (
    <button
      type="button"
      className={`theme-swatch card ${active ? 'theme-swatch--active' : ''}`}
      onClick={onClick}
      aria-label={t('settings.appearance.theme.selectAria', { name })}
      aria-pressed={active}
    >
      <div
        className="theme-swatch__preview"
        style={{ background: c.bg }}
        aria-hidden="true"
      >
        {/* Card rectangle */}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          right: 10,
          bottom: 10,
          background: c.bgCard,
          borderRadius: 8,
          border: `1px solid ${c.line}`,
        }} />
        {/* Accent stripe */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          width: 28,
          height: 6,
          background: c.accent,
          borderRadius: 3,
        }} />
        {/* Text lines */}
        <div style={{
          position: 'absolute',
          top: 28,
          left: 16,
          right: 16,
          height: 4,
          background: c.text,
          borderRadius: 2,
          opacity: 0.5,
        }} />
        <div style={{
          position: 'absolute',
          top: 38,
          left: 16,
          right: 28,
          height: 3,
          background: c.textDim,
          borderRadius: 2,
          opacity: 0.4,
        }} />
      </div>
      <span className="theme-swatch__name">{THEME_LABELS[name]}</span>
    </button>
  );
}
