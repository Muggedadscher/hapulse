/**
 * [fork] Glas edit mode of a page with cards (plans docs/glas/PLAN-ETAPPE-4.md K78, PLAN-ETAPPE-5.md K96): the bar
 * above each card (SizeBar) and the "⋯" window (SizeSheet), shared by the overview and the pages with a card grid.
 *
 * Only the Glas paths live here: S / M / L, ‹ › with the focus kept on the button, and "⋯". The pages keep their
 * classic handlers for the eye, the phone, the span and the order, and hand them in. S / M / L write the classic span
 * and height plus the Glas-only "taller" entry (`tallSections`, key `<page>:<id>`, core sizePresets.ts) in one
 * change; a height cap from "⋯" leaves "taller" (the cap sets the height). In Klassisch nothing renders.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { sizeOfPreset, tallKey, withTall, type SizePreset } from '@hapulse/core';
import { useSettingsStore, type CustomizationSettings } from '../../../stores/settingsStore';
import { useUIStore } from '../../../stores/uiStore';
import { useIsGlas } from '../../../app/glas/useUiStyle';
import { SizeBar } from './SizeBar';
import { SizeSheet } from './SizeSheet';

type SpansField =
  | 'homeSectionSpans'
  | 'securitySectionSpans'
  | 'energySectionSpans'
  | 'automationSectionSpans'
  | 'sceneSectionSpans'
  | 'systemSectionSpans';

type HeightsField =
  | 'homeSectionHeights'
  | 'securitySectionHeights'
  | 'energySectionHeights'
  | 'automationSectionHeights'
  | 'sceneSectionHeights'
  | 'systemSectionHeights';

interface GlasSectionEditOptions {
  /** The page's key in `tallSections` (`home`, `security`, …). */
  page: string;
  spansField: SpansField;
  heightsField: HeightsField;
  /** The cards shown in edit mode, in order: ‹ › move among them. */
  visibleIds: readonly string[];
  /** Writes a new order (the page's own reorder). */
  onReorder: (ids: string[]) => void;
  /** Span and height level with the page's defaults. */
  spanOf: (id: string) => number;
  heightOf: (id: string) => number;
  /** Writes a span from "⋯" (the page's classic handler). */
  onSpan: (id: string, span: number) => void;
  /** The card's name: the bar's group and the head of "⋯". */
  nameOf: (id: string) => string;
}

/** What the bar of one card shows besides its size. */
export interface SectionBarProps {
  /** false: no S / M / L (cards whose size the page fixes, e.g. the hints). */
  presets?: boolean;
  hidden: boolean;
  hideLabel: string;
  onToggleHidden: () => void;
  mobileHidden: boolean;
  mobileLabel: string;
  onToggleMobileHidden: () => void;
}

export interface GlasSectionEdit {
  /** Glas L on this card (a height cap set in Klassisch wins): the cell gets `g-tall`. */
  isTall: (id: string) => boolean;
  /** The bar above a card; null in Klassisch. */
  renderBar: (id: string, bar: SectionBarProps) => React.ReactNode;
  /** The "⋯" window; null in Klassisch. */
  sheet: React.ReactNode;
}

export function useGlasSectionEdit(o: GlasSectionEditOptions): GlasSectionEdit {
  const isGlas = useIsGlas();
  const editMode = useUIStore((s) => s.editMode);
  const spans = useSettingsStore(useShallow((s) => s.customization[o.spansField]));
  const heights = useSettingsStore(useShallow((s) => s.customization[o.heightsField]));
  const tallSections = useSettingsStore(useShallow((s) => s.customization.tallSections));
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const moveFocus = useRef<{ id: string; dir: -1 | 1 } | null>(null);
  if (sheetFor !== null && !(editMode && isGlas)) setSheetFor(null); // leaving edit mode or Glas closes "⋯"

  // A moved card's DOM node can be re-inserted, which drops the focus: give it back (the other arrow at an end).
  useLayoutEffect(() => {
    const pending = moveFocus.current;
    if (!pending) return;
    moveFocus.current = null;
    const bar = document.querySelector(`.g-size-bar[data-for="${CSS.escape(pending.id)}"]`);
    const same = bar?.querySelector<HTMLButtonElement>(`[data-move="${pending.dir}"]`);
    const other = bar?.querySelector<HTMLButtonElement>(`[data-move="${-pending.dir}"]`);
    const target = same && !same.disabled ? same : other;
    if (!target || document.activeElement === target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest' });
  });

  const isTall = (id: string) =>
    isGlas && o.heightOf(id) === 0 && (tallSections ?? []).includes(tallKey(o.page, id));

  function patch(id: string, span: number | null, height: number | null, tall: boolean | null) {
    const next: Partial<CustomizationSettings> = {};
    if (span !== null) next[o.spansField] = { ...spans, [id]: span };
    if (height !== null) next[o.heightsField] = { ...heights, [id]: height };
    if (tall !== null) next.tallSections = withTall(tallSections ?? [], tallKey(o.page, id), tall);
    updateCustomization(next);
  }

  function handlePreset(id: string, preset: SizePreset) {
    const size = sizeOfPreset(preset);
    patch(id, size.span, size.height, size.tall);
  }

  // ‹ ›: one place earlier or later among the cards shown in edit mode.
  function handleMove(id: string, dir: -1 | 1, keepFocus: boolean) {
    const ids = o.visibleIds;
    const from = ids.indexOf(id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, id);
    moveFocus.current = keepFocus ? { id, dir } : null;
    o.onReorder(next);
  }

  function renderBar(id: string, bar: SectionBarProps): React.ReactNode {
    if (!isGlas) return null;
    const index = o.visibleIds.indexOf(id);
    return (
      <SizeBar
        forId={id}
        name={o.nameOf(id)}
        index={index}
        size={bar.presets === false ? undefined : { span: o.spanOf(id), height: o.heightOf(id), tall: isTall(id) }}
        onPreset={(preset) => handlePreset(id, preset)}
        first={index === 0}
        last={index === o.visibleIds.length - 1}
        onMove={(dir, keepFocus) => handleMove(id, dir, keepFocus)}
        hidden={bar.hidden}
        hideLabel={bar.hideLabel}
        onToggleHidden={bar.onToggleHidden}
        mobileHidden={bar.mobileHidden}
        mobileLabel={bar.mobileLabel}
        onToggleMobileHidden={bar.onToggleMobileHidden}
        onCustomize={() => setSheetFor(id)}
      />
    );
  }

  const sheet = isGlas ? (
    <SizeSheet
      open={editMode && sheetFor !== null}
      onClose={() => setSheetFor(null)}
      name={sheetFor ? o.nameOf(sheetFor) : ''}
      span={sheetFor ? o.spanOf(sheetFor) : 1}
      height={sheetFor ? o.heightOf(sheetFor) : 0}
      onSpan={(span) => sheetFor && o.onSpan(sheetFor, span)}
      onHeight={(level) => sheetFor && patch(sheetFor, null, level, level > 0 ? false : null)}
    />
  ) : null;

  return { isTall, renderBar, sheet };
}
