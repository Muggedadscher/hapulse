/**
 * [fork] Glas frame (stage 2) — "Fertig" on the phone (plan docs/glas/PLAN-ETAPPE-2.md §3.5, K24): fixed at the top
 * right, next to the avatar (or alone on pages without one), on every route while edit mode is on. Rendered by
 * `GlasRuntime` only in Glas, below 900 px and only while editing; on the desktop the header capsule shows "Fertig".
 */

import { useUIStore } from '../../stores/uiStore';
import { useT } from '../../i18n/useT';

export function DoneCapsule() {
  const t = useT();
  const setEditMode = useUIStore((s) => s.setEditMode);
  return (
    <button type="button" className="g-done" title={t('editToggle.doneTitle')} onClick={() => setEditMode(false)}>
      <span className="g-done__capsule">{t('glas.edit.done')}</span>
    </button>
  );
}
