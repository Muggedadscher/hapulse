/**
 * MediaModal — all media_player entities (respects hiddenEntities).
 * Reuses PlayerTile for each player.
 * Footer: "open music page →" link.
 */

import React, { useCallback } from 'react';
import { Music2, ArrowRight, Play, Moon } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { PlayerTile } from '../../music/PlayerTile';
import { useEntityStore } from '../../../stores/entityStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import type { HassEntity } from '@hapulse/core';
import { useT } from '../../../i18n/useT';
import './chipmodals.css';

interface MediaModalProps {
  open: boolean;
  onClose: () => void;
}

/** States that count as "active" (in use) vs. idle/off. */
const ACTIVE_STATES = new Set(['playing', 'paused', 'buffering', 'on']);

export function MediaModal({ open, onClose }: MediaModalProps) {
  const t = useT();
  const navigate = useNavigate();

  const rooms = useEntityStore((s) => s.rooms);
  const players = useEntityStore(
    useShallow((s) => {
      return Object.values(s.entities).filter((e) =>
        e.entity_id.startsWith('media_player.')
      );
    })
  );
  const hiddenEntities = useSettingsStore(
    useShallow((s) => s.customization.hiddenEntities)
  );

  const visiblePlayers = players.filter(
    (p) => !hiddenEntities.includes(p.entity_id)
  );

  const activePlayers = visiblePlayers.filter((p) => ACTIVE_STATES.has(p.state));
  const idlePlayers = visiblePlayers.filter((p) => !ACTIVE_STATES.has(p.state));

  /** Find the room name for a given entity ID */
  function getRoomName(entityId: string): string | undefined {
    return rooms.find((r) => r.entityIds.includes(entityId))?.name;
  }

  function renderGroup(
    label: string,
    icon: React.ReactNode,
    list: HassEntity[],
  ) {
    if (list.length === 0) return null;
    return (
      <div className="media-modal__group">
        <div className="media-modal__group-header">
          <span className="media-modal__group-icon">{icon}</span>
          <span className="media-modal__group-label">{label}</span>
          <span className="media-modal__group-count">{list.length}</span>
        </div>
        <div className="media-modal__list">
          {list.map((player) => (
            <PlayerTile
              key={player.entity_id}
              entity={player}
              roomName={getRoomName(player.entity_id)}
              selected={false}
              onSelect={() => {
                /* no selection in modal context */
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  const handleOpenMusic = useCallback(() => {
    onClose();
    void navigate('/music');
  }, [onClose, navigate]);

  const footer = (
    <button
      className="media-modal__footer-link"
      onClick={handleOpenMusic}
      type="button"
    >
      {t('home.chipmodals.media.footerLink')}
      <ArrowRight size={14} strokeWidth={2} />
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('home.chipmodals.media.title')}
      icon={<Music2 size={20} strokeWidth={1.75} />}
      footer={footer}
    >
      {visiblePlayers.length === 0 ? (
        <EmptyState
          icon={<Music2 size={32} strokeWidth={1.5} />}
          title={t('home.chipmodals.media.emptyTitle')}
          description={t('home.chipmodals.media.emptyDescription')}
        />
      ) : (
        <div className="media-modal">
          {renderGroup(t('home.chipmodals.media.activeLabel'), <Play size={14} strokeWidth={1.75} />, activePlayers)}
          {renderGroup(t('home.chipmodals.media.idleLabel'), <Moon size={14} strokeWidth={1.75} />, idlePlayers)}
        </div>
      )}
    </Modal>
  );
}
