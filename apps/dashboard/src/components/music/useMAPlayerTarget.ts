/**
 * useMAPlayerTarget — the Music Assistant player the library and queue act on.
 *
 * Shared by LibraryCard and QueueCard so "play this" and "whose queue am I
 * looking at" always agree. The persisted last choice wins (synced across
 * devices like all customization), then whichever MA player is already
 * playing, then the first — alphabetical-first alone made "Alarm Clock" the
 * default on a real install.
 */

import { useCallback } from 'react';
import type { HassEntity, MusicAssistantInfo } from '@hapulse/core';
import { useEntities } from '../../ha/hooks';
import { useSettingsStore } from '../../stores/settingsStore';

export interface MAPlayerTarget {
  /** MA players that currently exist, in id order. */
  players: HassEntity[];
  /** The active target's entity_id (null only when no players exist). */
  target: string | null;
  setTarget: (entityId: string) => void;
  /** Display name for one of the players. */
  nameOf: (entityId: string) => string;
}

export function useMAPlayerTarget(ma: MusicAssistantInfo): MAPlayerTarget {
  const entities = useEntities(ma.playerIds);
  const storedTarget = useSettingsStore((s) => s.customization.libraryPlayerId);
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);

  const players = entities.filter((p): p is HassEntity => p != null);
  const target =
    (storedTarget != null && players.some((p) => p.entity_id === storedTarget)
      ? storedTarget
      : null) ??
    players.find((p) => p.state === 'playing')?.entity_id ??
    players[0]?.entity_id ??
    null;

  const setTarget = useCallback(
    (entityId: string) => updateCustomization({ libraryPlayerId: entityId }),
    [updateCustomization],
  );

  const nameOf = useCallback(
    (entityId: string): string => {
      const p = players.find((e) => e.entity_id === entityId);
      return (p?.attributes.friendly_name as string | undefined) ?? entityId;
    },
    [players],
  );

  return { players, target, setTarget, nameOf };
}
