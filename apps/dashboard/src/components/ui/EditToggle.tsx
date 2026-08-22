/**
 * EditToggle — inline page-header control that activates/deactivates edit mode.
 * Renders a pencil icon when off, a check icon when on (accent background when on).
 *
 * Only Home Assistant admins may edit (useCanEdit). For non-admins the toggle is
 * hidden entirely, and any lingering edit mode is forced off.
 */

import React, { useEffect } from 'react';
import { Pencil, Check } from 'lucide-react';
import { IconButton } from './IconButton';
import { useUIStore } from '../../stores/uiStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCanEdit } from '../../ha/hooks';
import { useT } from '../../i18n/useT';
import './EditToggle.css';

interface EditToggleProps {
  className?: string;
}

export function EditToggle({ className = '' }: EditToggleProps) {
  const t = useT();
  const editMode = useUIStore((s) => s.editMode);
  const toggleEditMode = useUIStore((s) => s.toggleEditMode);
  const setEditMode = useUIStore((s) => s.setEditMode);
  const canEdit = useCanEdit();
  const editingEnabled = useSettingsStore((s) => s.customization.editingEnabled);

  useEffect(() => {
    if ((!canEdit || !editingEnabled) && editMode) setEditMode(false);
  }, [canEdit, editingEnabled, editMode, setEditMode]);

  if (!canEdit || !editingEnabled) return null;

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
