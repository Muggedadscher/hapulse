/**
 * [fork] Glas stage 6 — a page that is shown immersive (the camera page, E13; GLAS-DESIGN §7.33): while `active`,
 * `immersive` in the Glas UI store is set. `GlasRuntime` turns it into `data-g-immersive` on the root (on the phone the
 * frame goes: tab bar, chips, paddings — shell.css) and `AppLayout` makes the content column the dark subtree
 * (`data-glas-scheme="dark"`, theme/glasAppearance.ts). A layout effect, so the first paint already has no frame.
 * Plan docs/glas/PLAN-ETAPPE-6.md K103, K104.
 */

import { useLayoutEffect } from 'react';
import { useGlasUiStore } from '../../stores/glasUiStore';

export function useGlasImmersive(active: boolean): void {
  useLayoutEffect(() => (active ? useGlasUiStore.getState().holdImmersive() : undefined), [active]);
}
