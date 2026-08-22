/**
 * SectionResize — shared edit-mode controls for capping a section's height.
 *
 * Mirrors the per-page column-span ResizeHandle/SpanDots, but for vertical size.
 * Height is a small set of discrete *levels* (not free pixels) so it's easy to
 * give several sections the same max-height. Level 0 means "no cap" (the
 * default): the section sizes to its content and to its row like before. A
 * capped section never grows past its level; shorter content stays short and the
 * card scrolls internally when its content is taller than the cap.
 *
 * The matching `max-height` values live in Page.css under `.section-h-N` — keep
 * HEIGHT_PX in sync with that file.
 */

import React from 'react';
import { Scaling } from 'lucide-react';
import { useT } from '../../i18n/useT';
import './SectionResize.css';

/** Highest height level (0 = off). */
export const MAX_HEIGHT_LEVEL = 4;

/** Level → max-height in px. MUST match the `.section-h-N` rules in Page.css. */
export const HEIGHT_PX: Record<number, number> = {
  1: 180,
  2: 280,
  3: 400,
  4: 560,
};

/** Pixels of vertical drag per height step. */
const HEIGHT_STEP_PX = 80;

/** Read a section's stored height level, defaulting to 0 (no cap). */
export function getHeightLevel(id: string, stored: Record<string, number>): number {
  const lvl = stored[id] ?? 0;
  return Math.max(0, Math.min(MAX_HEIGHT_LEVEL, lvl));
}

/** CSS class for a height level, or '' for level 0 (no cap). */
export function heightClass(level: number): string {
  return level >= 1 && level <= MAX_HEIGHT_LEVEL ? `section-h-${level}` : '';
}

// ── Height dots — vertical indicator of the current cap level ────────────────

export function HeightDots({ level }: { level: number }) {
  return (
    <div className="section-height-dots" aria-hidden="true">
      {Array.from({ length: MAX_HEIGHT_LEVEL }, (_, i) => {
        // Render top-to-bottom but fill from the bottom up, so a taller cap
        // lights more bars upward — reads like a fill gauge.
        const barLevel = MAX_HEIGHT_LEVEL - i;
        return (
          <span
            key={i}
            className={`section-height-dot${barLevel <= level ? ' section-height-dot--filled' : ''}`}
          />
        );
      })}
    </div>
  );
}

// ── Height handle — drag up/down to change the cap level ─────────────────────

export function HeightHandle({
  id,
  level,
  onCommit,
}: {
  id: string;
  level: number;
  onCommit: (id: string, newLevel: number) => void;
}) {
  const t = useT();

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation(); // don't let DnD-kit start a drag

    const btn = e.currentTarget;
    btn.setPointerCapture(e.pointerId);

    // The capped element in edit mode is the inner content wrapper, so the
    // absolutely-positioned badges/handles (siblings of it) are never clipped.
    const cell = btn.closest('[data-section]') as HTMLElement | null;
    const outline = cell?.querySelector('.edit-section-outline') as HTMLElement | null;
    if (!outline) return;

    const startY = e.clientY;
    const startLevel = level;
    let previewLevel = startLevel;

    // Edit mode uses a fixed height so the level is visible while dragging
    // (matches the .section-h-N rules in Page.css for edit mode).
    function apply(lvl: number) {
      if (lvl <= 0) {
        outline!.style.height = '';
        outline!.style.overflow = '';
      } else {
        outline!.style.height = `${HEIGHT_PX[lvl]}px`;
        outline!.style.overflow = 'hidden';
      }
    }

    function onMove(me: PointerEvent) {
      // Drag down = taller (higher level); up = shorter.
      const delta = Math.round((me.clientY - startY) / HEIGHT_STEP_PX);
      const next = Math.max(0, Math.min(MAX_HEIGHT_LEVEL, startLevel + delta));
      if (next !== previewLevel) {
        previewLevel = next;
        apply(next);
      }
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      // Clear the inline preview — the committed class takes over after re-render.
      outline!.style.height = '';
      outline!.style.overflow = '';
      onCommit(id, previewLevel);
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  const desc =
    level === 0
      ? t('sectionResize.noLimit')
      : t('sectionResize.levelOf', { level, max: MAX_HEIGHT_LEVEL });

  return (
    <button
      type="button"
      className="section-height-handle"
      onPointerDown={handlePointerDown}
      aria-label={t('sectionResize.ariaLabel', { desc })}
      title={t('sectionResize.title', { desc })}
    >
      <Scaling size={12} strokeWidth={2.5} />
    </button>
  );
}
