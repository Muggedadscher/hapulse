/**
 * EditBadge — shared badge cluster for edit mode affordances.
 *
 * Absolutely positioned top-right of a `position: relative` wrapper.
 * Shows eye/eye-off toggle and optional left/right reorder arrows.
 * Only renders children; parent must add `position: relative`.
 */

import React from 'react';
import { Eye, EyeOff, ChevronLeft, ChevronRight, Star, Smartphone } from 'lucide-react';
import { useT } from '../../i18n/useT';
import './EditBadge.css';

interface EditBadgeProps {
  /** Whether the item is currently hidden */
  hidden: boolean;
  /** aria-label for the eye toggle (e.g. "hide bedroom") */
  toggleLabel: string;
  /** Called when the eye/eye-off button is clicked */
  onToggleHidden: () => void;
  /** If provided, shows a left-arrow reorder button */
  onMoveLeft?: (() => void) | undefined;
  /** If provided, shows a right-arrow reorder button */
  onMoveRight?: (() => void) | undefined;
  /** Disable the left arrow (already first) */
  moveLeftDisabled?: boolean;
  /** Disable the right arrow (already last) */
  moveRightDisabled?: boolean;
  /** Whether this entity is currently favorited. When undefined, no star is shown. */
  favorite?: boolean | undefined;
  /**
   * Called when the star button is clicked. When provided, the star button is
   * rendered next to the eye button. Existing usages without this prop are unaffected.
   */
  onToggleFavorite?: (() => void) | undefined;
  /**
   * Human-readable name used to build the aria-label for the star button
   * (e.g. "living room ceiling"). Defaults to "entity" when omitted.
   */
  entityName?: string | undefined;
  /** Whether the section is hidden on mobile only. When undefined, no mobile button is shown. */
  mobileHidden?: boolean | undefined;
  /**
   * Called when the mobile-hide button is clicked. When provided, a phone toggle
   * is rendered beneath the eye button. Existing usages without it are unaffected.
   */
  onToggleMobileHidden?: (() => void) | undefined;
  /** aria-label for the mobile-hide toggle (e.g. "hide Activity on mobile"). */
  mobileToggleLabel?: string | undefined;
}

export function EditBadge({
  hidden,
  toggleLabel,
  onToggleHidden,
  onMoveLeft,
  onMoveRight,
  moveLeftDisabled = false,
  moveRightDisabled = false,
  favorite,
  onToggleFavorite,
  entityName,
  mobileHidden = false,
  onToggleMobileHidden,
  mobileToggleLabel,
}: EditBadgeProps) {
  const t = useT();
  const hasArrows = onMoveLeft !== undefined || onMoveRight !== undefined;
  const hasFavorite = onToggleFavorite !== undefined;
  const hasMobileToggle = onToggleMobileHidden !== undefined;

  const resolvedEntityName = entityName ?? t('editBadge.entityDefault');
  const resolvedMobileToggleLabel = mobileToggleLabel ?? t('editBadge.mobileToggleDefault');
  const starLabel = favorite
    ? t('editBadge.unfavorite', { entity: resolvedEntityName })
    : t('editBadge.favorite', { entity: resolvedEntityName });

  return (
    <div className={`edit-badge${hidden ? ' edit-badge--hidden' : ''}`} role="group">
      {/* Favorite star (only when onToggleFavorite is provided) */}
      {hasFavorite && (
        <button
          type="button"
          className={`edit-badge__btn edit-badge__btn--star${favorite ? ' edit-badge__btn--star-active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          aria-label={starLabel}
          aria-pressed={favorite === true}
          title={starLabel}
        >
          <Star
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            fill={favorite ? 'currentColor' : 'none'}
          />
        </button>
      )}

      {/* Eye / Eye-off toggle */}
      <button
        type="button"
        className={`edit-badge__btn edit-badge__btn--eye${hidden ? ' edit-badge__btn--eye-hidden' : ''}`}
        onClick={(e) => { e.stopPropagation(); onToggleHidden(); }}
        aria-label={toggleLabel}
        title={toggleLabel}
      >
        {hidden
          ? <Eye size={14} strokeWidth={2} aria-hidden="true" />
          : <EyeOff size={14} strokeWidth={2} aria-hidden="true" />
        }
      </button>

      {/* Mobile-only hide toggle (only when onToggleMobileHidden is provided) */}
      {hasMobileToggle && (
        <button
          type="button"
          className={`edit-badge__btn edit-badge__btn--mobile${mobileHidden ? ' edit-badge__btn--mobile-hidden' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleMobileHidden(); }}
          aria-label={resolvedMobileToggleLabel}
          aria-pressed={mobileHidden === true}
          title={resolvedMobileToggleLabel}
        >
          <Smartphone size={13} strokeWidth={2} aria-hidden="true" />
        </button>
      )}

      {/* Reorder arrows (only when provided) */}
      {hasArrows && (
        <div className="edit-badge__arrows">
          {onMoveLeft && (
            <button
              type="button"
              className="edit-badge__btn edit-badge__btn--arrow"
              onClick={(e) => { e.stopPropagation(); onMoveLeft(); }}
              disabled={moveLeftDisabled}
              aria-label={t('editBadge.moveLeftAria')}
              title={t('editBadge.moveLeftTitle')}
            >
              <ChevronLeft size={12} strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
          {onMoveRight && (
            <button
              type="button"
              className="edit-badge__btn edit-badge__btn--arrow"
              onClick={(e) => { e.stopPropagation(); onMoveRight(); }}
              disabled={moveRightDisabled}
              aria-label={t('editBadge.moveRightAria')}
              title={t('editBadge.moveRightTitle')}
            >
              <ChevronRight size={12} strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
