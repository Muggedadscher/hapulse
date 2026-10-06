/**
 * [fork] The active style ("Klassisch" | "Glas") for components, normalized exactly like `applyAppearance` reads it
 * (unknown or missing values → Klassisch). Docs: docs/GLAS-PLAN.md, docs/glas/PLAN-ETAPPE-0-1.md.
 */

import type { UiStyle } from '@hapulse/core';
import { useSettingsStore } from '../../stores/settingsStore';
import { normalizeUiStyle } from '../../theme/glasAppearance';

export function useUiStyle(): UiStyle {
  return useSettingsStore((s) => normalizeUiStyle(s.customization.uiStyle));
}

export function useIsGlas(): boolean {
  return useUiStyle() === 'glas';
}
