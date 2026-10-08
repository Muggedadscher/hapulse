/**
 * [fork] Glas edit mode of the overview (plan docs/glas/PLAN-ETAPPE-4.md K78, GLAS-DESIGN §7.32, sketch
 * glas/screens/g5d-bearbeiten): the bar above each card instead of the classic badges and handles. Segment S / M / L,
 * a spacer, ‹ › to move, the eye, the phone and "⋯" for the classic values (columns 1–4, height cap) in a sheet.
 * Below 900 px only the eye and the phone remain (one column, a width has no effect there); the CSS hides the rest.
 * Hints and rooms have no segment. The group carries the card's name, so each button reads with its card.
 *
 * A size that matches no preset selects nothing in the segment ("Eigene"). The eye and the phone are toggle buttons
 * with a fixed name and `aria-pressed`; pressed = hidden, drawn inverted (CSS). `data-g-nodrag` keeps presses and
 * Space / Enter on the bar from starting the card's drag (noDrag.ts).
 */

import React from 'react';
import { ChevronLeft, ChevronRight, Ellipsis, Eye, EyeOff, Smartphone } from 'lucide-react';
import { SIZE_PRESETS, sizePresetOf, type SectionSize, type SizePreset } from '@hapulse/core';
import { Segment } from '../Segment';
import { useT, type TKey } from '../../../i18n/useT';

const PRESET_NAME: Record<SizePreset, TKey> = { S: 'glas.edit.sizeS', M: 'glas.edit.sizeM', L: 'glas.edit.sizeL' };

interface SizeBarProps {
  /** The card's name; names the group. */
  name: string;
  /** Position on the page: staggers the entrance. */
  index: number;
  /** Stored size; undefined = no segment (hints, rooms). */
  size?: SectionSize | undefined;
  onPreset: (preset: SizePreset) => void;
  first: boolean;
  last: boolean;
  /** `keepFocus`: the button had the focus, so it gets it back after the card moved. */
  onMove: (dir: -1 | 1, keepFocus: boolean) => void;
  hidden: boolean;
  hideLabel: string;
  onToggleHidden: () => void;
  mobileHidden: boolean;
  mobileLabel: string;
  onToggleMobileHidden: () => void;
  onCustomize: () => void;
}

export function SizeBar({
  name,
  index,
  size,
  onPreset,
  first,
  last,
  onMove,
  hidden,
  hideLabel,
  onToggleHidden,
  mobileHidden,
  mobileLabel,
  onToggleMobileHidden,
  onCustomize,
}: SizeBarProps) {
  const t = useT();
  const back = t('editBadge.moveLeftTitle');
  const forward = t('editBadge.moveRightTitle');

  function move(dir: -1 | 1, e: React.MouseEvent<HTMLButtonElement>) {
    onMove(dir, document.activeElement === e.currentTarget);
  }

  return (
    <div
      className="g-size-bar"
      role="group"
      aria-label={name}
      data-g-nodrag=""
      style={{ '--i': index } as React.CSSProperties}
    >
      {size && (
        <Segment
          className="g-seg--size g-size-bar__wide"
          label={t('glas.edit.size')}
          value={sizePresetOf(size)}
          options={SIZE_PRESETS.map((p) => ({ value: p, label: p, aria: t(PRESET_NAME[p]) }))}
          onChange={onPreset}
        />
      )}
      <span className="g-size-bar__space" />
      <button
        type="button"
        className="g-size-bar__btn g-size-bar__wide"
        data-move="-1"
        disabled={first}
        aria-label={back}
        title={back}
        onClick={(e) => move(-1, e)}
      >
        <ChevronLeft size={18} strokeWidth={2.25} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="g-size-bar__btn g-size-bar__wide"
        data-move="1"
        disabled={last}
        aria-label={forward}
        title={forward}
        onClick={(e) => move(1, e)}
      >
        <ChevronRight size={18} strokeWidth={2.25} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="g-size-bar__btn"
        aria-pressed={hidden}
        aria-label={hideLabel}
        title={hideLabel}
        onClick={onToggleHidden}
      >
        {hidden ? <EyeOff size={17} strokeWidth={2} aria-hidden="true" /> : <Eye size={17} strokeWidth={2} aria-hidden="true" />}
      </button>
      <button
        type="button"
        className="g-size-bar__btn"
        aria-pressed={mobileHidden}
        aria-label={mobileLabel}
        title={mobileLabel}
        onClick={onToggleMobileHidden}
      >
        <Smartphone size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="g-size-bar__btn g-size-bar__wide"
        aria-haspopup="dialog"
        aria-label={t('glas.edit.customize')}
        title={t('glas.edit.customize')}
        onClick={onCustomize}
      >
        <Ellipsis size={18} strokeWidth={2.25} aria-hidden="true" />
      </button>
    </div>
  );
}
