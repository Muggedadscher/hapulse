/**
 * [fork] Glas sheets (stage 3) — the grabber at the top of a sheet (plan docs/glas/PLAN-ETAPPE-3.md K50, K51;
 * GLAS-DESIGN §7.18): hit area 120 × 30, visible 36 × 5. A button: a click or Enter/Space switches medium ↔ large, the
 * only keyboard way to the other detent. With one detent (short viewport) it is decoration only. Dragging it is handled
 * by the sheet runtime (`useGlasSheet`); on dialogs the CSS hides it.
 */

import { useSyncExternalStore } from 'react';
import { useT } from '../../../i18n/useT';
import type { GrabberControl } from './useGlasSheet';

export function SheetGrabber({ control }: { control: GrabberControl }) {
  const t = useT();
  const { detent, single } = useSyncExternalStore(control.subscribe, control.get);
  return (
    <button
      type="button"
      className="g-sheet-grabber"
      onClick={() => control.toggle()}
      aria-label={t(detent === 'large' ? 'glas.sheet.shrink' : 'glas.sheet.grow')}
      aria-hidden={single || undefined}
      tabIndex={single ? -1 : undefined}
    />
  );
}
