/**
 * EditToggle — inline page-header control that activates/deactivates edit mode.
 * Renders a pencil icon when off, a check icon when on (accent background when on).
 *
 * Only Home Assistant admins may edit (useCanEdit). For non-admins the toggle is
 * hidden entirely, and any lingering edit mode is forced off.
 */

import React, { useEffect, useLayoutEffect } from 'react'; // [fork] useLayoutEffect (Glas)
import { Pencil, Check } from 'lucide-react';
import { IconButton } from './IconButton';
import { useUIStore } from '../../stores/uiStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCanEdit } from '../../ha/hooks';
import { useT } from '../../i18n/useT';
import { useShellStore } from '../../app/glas/shellStore'; // [fork] Glas (docs/glas/PLAN-ETAPPE-2.md K23)
import { useIsGlas } from '../../app/glas/useUiStyle'; // [fork]
import './EditToggle.css';

interface EditToggleProps {
  className?: string;
  /** [fork] Glas: 'label' = the desktop header capsule "Bearbeiten" / "Fertig" (own button, docs/glas/PLAN-ETAPPE-2.md §4.2). */
  variant?: 'icon' | 'label';
}

export function EditToggle({ className = '', variant = 'icon' }: EditToggleProps) { // [fork] variant
  const t = useT();
  const editMode = useUIStore((s) => s.editMode);
  const toggleEditMode = useUIStore((s) => s.toggleEditMode);
  const setEditMode = useUIStore((s) => s.setEditMode);
  const canEdit = useCanEdit();
  const editingEnabled = useSettingsStore((s) => s.customization.editingEnabled);

  useEffect(() => {
    if ((!canEdit || !editingEnabled) && editMode) setEditMode(false);
  }, [canEdit, editingEnabled, editMode, setEditMode]);

  // [fork] Glas (K23): a page that shows this toggle offers "Bearbeiten" in the header capsule and the avatar menu
  const glas = useIsGlas();
  const addEditTarget = useShellStore((s) => s.addEditTarget);
  const offers = glas && variant === 'icon' && canEdit && editingEnabled;
  useLayoutEffect(() => (offers ? addEditTarget() : undefined), [offers, addEditTarget]);

  if (!canEdit || !editingEnabled) return null;

  // [fork] Glas header capsule: text instead of the symbol, the state in aria-pressed
  if (variant === 'label') {
    return (
      <button
        type="button"
        className={`g-edit-capsule${className ? ' ' + className : ''}`}
        aria-pressed={editMode}
        onClick={toggleEditMode}
      >
        {editMode ? t('glas.edit.done') : t('glas.edit.label')}
      </button>
    );
  }

  return (
    <IconButton
      label={editMode ? t('editToggle.doneAria') : t('editToggle.editAria')}
      size={40}
      variant={editMode ? 'accent' : 'default'}
      onClick={toggleEditMode}
      aria-pressed={editMode}
      title={editMode ? t('editToggle.doneTitle') : t('editToggle.editTitle')}
      className={`edit-toggle${editMode ? ' edit-toggle--active' : ''}${className ? ' ' + className : ''}`}
    >
      {editMode
        ? <Check size={18} strokeWidth={2} />
        : <Pencil size={18} strokeWidth={1.75} />
      }
    </IconButton>
  );
}
