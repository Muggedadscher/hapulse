/**
 * SpeakerGroupMenu — group speakers onto a leader (issue #2, grouping phase).
 *
 * A popover of groupable players: checking one calls `media_player.join`
 * with the leader as target, unchecking calls `unjoin` on that member. This
 * is the generic HA grouping API, so it works for Music Assistant, Sonos and
 * anything else that reports the GROUPING feature — candidates are players
 * that support grouping and share the leader's integration (joining across
 * integrations fails), resolved from the entity registry.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { useEntityStore } from '../../stores/entityStore';
import { joinPlayers, unjoinPlayer } from '../../ha/service';
import type { HassEntity } from '@hapulse/core';
import { useT } from '../../i18n/useT';
import './SpeakerGroupMenu.css';

const FEATURE_GROUPING = 524288;

function supportsGrouping(entity: HassEntity): boolean {
  const sf = entity.attributes['supported_features'];
  return typeof sf === 'number' && (sf & FEATURE_GROUPING) !== 0;
}

function groupMembers(entity: HassEntity): string[] {
  const gm = entity.attributes['group_members'];
  return Array.isArray(gm) ? gm.filter((m): m is string => typeof m === 'string') : [];
}

interface SpeakerGroupMenuProps {
  /** The player others get grouped onto. */
  leader: HassEntity;
}

export function SpeakerGroupMenu({ leader }: SpeakerGroupMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const registries = useEntityStore((s) => s.registries);
  const allEntities = useEntityStore((s) => s.entities);

  // Candidates: every other player that supports grouping and belongs to the
  // leader's integration (unknown platforms — demo — are allowed through).
  // Deliberately NOT filtered by hiddenEntities: hiding an entity means "keep
  // it off my dashboards", but the speaker still exists as an output — real
  // installs hide their raw MA players to declutter, and filtering here left
  // a single groupable speaker (reported on a 22-player install). The player
  // picker behaves the same way.
  const candidates = useMemo(() => {
    const platformOf = new Map<string, string>();
    for (const re of registries?.entities ?? []) {
      if (re.platform != null) platformOf.set(re.entity_id, re.platform);
    }
    const leaderPlatform = platformOf.get(leader.entity_id);
    return Object.values(allEntities)
      .filter((e) => e.entity_id.startsWith('media_player.'))
      .filter((e) => e.entity_id !== leader.entity_id)
      .filter((e) => e.state !== 'unavailable')
      .filter(supportsGrouping)
      .filter((e) => {
        const p = platformOf.get(e.entity_id);
        return leaderPlatform == null || p == null || p === leaderPlatform;
      })
      .sort((a, b) => a.entity_id.localeCompare(b.entity_id));
  }, [allEntities, registries, leader.entity_id]);

  const members = groupMembers(leader);

  // Close on outside press / Escape.
  useEffect(() => {
    if (!open) return;
    const onPress = (e: PointerEvent) => {
      if (wrapRef.current && e.target instanceof Node && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPress);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPress);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!supportsGrouping(leader) || candidates.length === 0) return null;

  const memberCount = members.filter((m) => m !== leader.entity_id).length;

  const toggle = (candidate: HassEntity) => {
    if (members.includes(candidate.entity_id)) {
      void unjoinPlayer(candidate.entity_id);
    } else {
      void joinPlayers(leader.entity_id, [candidate.entity_id]);
    }
  };

  return (
    <div className="group-menu" ref={wrapRef}>
      <button
        type="button"
        className={`group-menu__btn${memberCount > 0 ? ' group-menu__btn--active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('music.group.buttonAria')}
        title={t('music.group.buttonAria')}
      >
        <Link2 size={16} strokeWidth={1.75} />
        {memberCount > 0 && <span className="group-menu__count">+{memberCount}</span>}
      </button>

      {open && (
        <div className="group-menu__pop" role="menu" aria-label={t('music.group.menuAria')}>
          <div className="group-menu__pop-title">{t('music.group.menuTitle')}</div>
          {candidates.map((candidate) => {
            const grouped = members.includes(candidate.entity_id);
            const name =
              (candidate.attributes.friendly_name as string | undefined) ?? candidate.entity_id;
            return (
              <button
                key={candidate.entity_id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={grouped}
                className="group-menu__row"
                onClick={() => toggle(candidate)}
              >
                <span className={`group-menu__check${grouped ? ' group-menu__check--on' : ''}`}>
                  {grouped && <Check size={11} strokeWidth={3} />}
                </span>
                <span className="group-menu__row-name">{name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
