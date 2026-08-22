/**
 * EntityRow — single entity row in the entities customization section.
 * Supports inline rename (pencil → text input), eye/eye-off toggle.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Pencil, Check, X, Star } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { IconButton } from '../ui/IconButton';
import { DomainIcon } from './DomainIcon';
import type { HassEntity } from '@hapulse/core';

interface EntityRowProps {
  entity: HassEntity;
  displayName: string;
  isHidden: boolean;
  isFavorite: boolean;
  onRename: (name: string) => void;
  onToggleHide: () => void;
  onToggleFavorite: () => void;
}

export function EntityRow({
  entity,
  displayName,
  isHidden,
  isFavorite,
  onRename,
  onToggleHide,
  onToggleFavorite,
}: EntityRowProps) {
  const t = useT();
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(displayName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  function handleStartRename() {
    setDraftName(displayName);
    setRenaming(true);
  }

  function handleCommit() {
    onRename(draftName.trim());
    setRenaming(false);
  }

  function handleCancel() {
    setRenaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleCommit();
    if (e.key === 'Escape') handleCancel();
  }

  return (
    <div className="entity-row">
      <span className="entity-row__icon">
        <DomainIcon entity={entity} size={16} />
      </span>
      <div className="entity-row__info">
        {renaming ? (
          <input
            ref={inputRef}
            className="entity-rename-input"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={displayName}
            aria-label={t('settings.entities.renameAria', { name: displayName })}
          />
        ) : (
          <span className={`entity-row__name ${isHidden ? 'entity-row__name--hidden' : ''}`}>
            {displayName}
          </span>
        )}
        <span className="entity-row__id">{entity.entity_id}</span>
      </div>
      <div className="entity-row__controls">
        {renaming ? (
          <>
            <IconButton
              label={t('settings.entities.confirmRename')}
              size={36}
              variant="accent"
              onClick={handleCommit}
            >
              <Check size={14} strokeWidth={2} />
            </IconButton>
            <IconButton
              label={t('settings.entities.cancelRename')}
              size={36}
              variant="ghost"
              onClick={handleCancel}
            >
              <X size={14} strokeWidth={2} />
            </IconButton>
          </>
        ) : (
          <IconButton
            label={t('settings.entities.renameAria', { name: displayName })}
            size={36}
            variant="ghost"
            onClick={handleStartRename}
          >
            <Pencil size={14} strokeWidth={1.75} />
          </IconButton>
        )}
        {!renaming && (
          <IconButton
            label={
              isFavorite
                ? t('settings.entities.unfavoriteAria', { name: displayName })
                : t('settings.entities.favoriteAria', { name: displayName })
            }
            size={36}
            variant={isFavorite ? 'accent' : 'ghost'}
            onClick={onToggleFavorite}
          >
            <Star size={14} strokeWidth={1.75} fill={isFavorite ? 'currentColor' : 'none'} />
          </IconButton>
        )}
        <IconButton
          label={
            isHidden
              ? t('settings.entities.showAria', { name: displayName })
              : t('settings.entities.hideAria', { name: displayName })
          }
          size={36}
          variant={isHidden ? 'ghost' : 'default'}
          onClick={onToggleHide}
        >
          {isHidden
            ? <EyeOff size={14} strokeWidth={1.75} />
            : <Eye size={14} strokeWidth={1.75} />
          }
        </IconButton>
      </div>
    </div>
  );
}
