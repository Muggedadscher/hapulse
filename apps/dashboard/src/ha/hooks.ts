/**
 * React hooks for HA data access.
 * All hooks are selector-based — no component subscribes to the whole entity map.
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEntityStore } from '../stores/entityStore';
import { useConnectionStore } from '../stores/connectionStore';
import { findMusicAssistant } from '@hapulse/core';
import type { HassEntity, Room, MusicAssistantInfo } from '@hapulse/core';
import type { StoreStatus } from '../stores/connectionStore';

/**
 * Get a single entity by ID.
 * Returns undefined if the entity is not found.
 */
export function useEntity(id: string): HassEntity | undefined {
  return useEntityStore((s) => s.entities[id]);
}

/**
 * Get multiple entities by ID.
 * Returns a stable array reference when values haven't changed.
 */
export function useEntities(ids: string[]): (HassEntity | undefined)[] {
  return useEntityStore(
    useShallow((s) => ids.map((id) => s.entities[id]))
  );
}

/**
 * Get all computed rooms.
 */
export function useRooms(): Room[] {
  return useEntityStore((s) => s.rooms);
}

/**
 * Get the current connection status and demo flag.
 */
export function useConnectionStatus(): { status: StoreStatus; demo: boolean; error?: string | undefined } {
  return useConnectionStore(
    useShallow((s) => ({ status: s.status, demo: s.demo, error: s.error }))
  );
}

/**
 * Get all entities whose IDs match a domain prefix.
 */
export function useEntitiesByDomain(domain: string): HassEntity[] {
  return useEntityStore(
    useShallow((s) => {
      const result: HassEntity[] = [];
      for (const [id, entity] of Object.entries(s.entities)) {
        if (id.startsWith(domain + '.')) {
          result.push(entity);
        }
      }
      return result;
    })
  );
}

/**
 * Get a room by area ID.
 */
export function useRoom(areaId: string): Room | undefined {
  return useEntityStore(
    useShallow((s) => s.rooms.find((r) => r.id === areaId))
  );
}

// ---------------------------------------------------------------------------
// Phase 3 additions — append-only
// ---------------------------------------------------------------------------

import { useSettingsStore } from '../stores/settingsStore';
import type { CustomizationSettings } from '../stores/settingsStore';

/**
 * Get the customization settings from settingsStore.
 */
export function useCustomization(): CustomizationSettings {
  return useSettingsStore(
    useShallow((s) => s.customization)
  );
}

/**
 * Get the active weather.* entity.
 *
 * Respects the user's chosen `customization.weatherEntity` when it's set and the
 * entity still exists; otherwise falls back to the first weather.* entity. Used
 * by both the header glance and the weather modal so they stay in sync.
 */
export function useWeatherEntity(): HassEntity | undefined {
  const preferred = useSettingsStore((s) => s.customization.weatherEntity);
  return useEntityStore(
    useShallow((s) => {
      if (preferred && s.entities[preferred]) return s.entities[preferred];
      for (const [id, entity] of Object.entries(s.entities)) {
        if (id.startsWith('weather.')) return entity;
      }
      return undefined;
    })
  );
}

/**
 * Get all weather.* entities (for the weather-entity picker), sorted by name.
 */
export function useWeatherEntities(): HassEntity[] {
  return useEntityStore(
    useShallow((s) => {
      const list: HassEntity[] = [];
      for (const [id, entity] of Object.entries(s.entities)) {
        if (id.startsWith('weather.')) list.push(entity);
      }
      return list.sort((a, b) => {
        const an = (a.attributes.friendly_name as string | undefined) ?? a.entity_id;
        const bn = (b.attributes.friendly_name as string | undefined) ?? b.entity_id;
        return an.localeCompare(bn);
      });
    })
  );
}

/**
 * Get the sun.sun entity, or undefined.
 */
export function useSunEntity(): HassEntity | undefined {
  return useEntityStore((s) => s.entities['sun.sun']);
}

/**
 * Get the full entity map (use sparingly — causes re-renders on every tick).
 * Prefer useEntity / useEntities for component-level reads.
 */
export function useEntityMap(): Record<string, HassEntity> {
  return useEntityStore((s) => s.entities);
}

/**
 * Get the display name for greetings.
 *
 * Priority order (per spec):
 *  1. settingsStore.userName (manual override)
 *  2. Linked person entity's friendly_name (person whose user_id === currentUser.id)
 *  3. currentUser.name (raw HA account name)
 *  4. First person entity's friendly_name
 *  5. undefined
 */
export function useDisplayName(): string | undefined {
  const userName = useSettingsStore((s) => s.userName);
  const currentUser = useConnectionStore((s) => s.currentUser);

  // Select the linked person name and first-person name in a single entity-store pass
  const linkedPersonName = useEntityStore(
    useShallow((s) => {
      if (!currentUser) return undefined;
      for (const [id, entity] of Object.entries(s.entities)) {
        if (id.startsWith('person.') && entity.attributes.user_id === currentUser.id) {
          return (entity.attributes.friendly_name ?? id.split('.')[1]) as string;
        }
      }
      return undefined;
    })
  );

  const firstPersonName = useEntityStore(
    useShallow((s) => {
      for (const [id, entity] of Object.entries(s.entities)) {
        if (id.startsWith('person.')) {
          return (entity.attributes.friendly_name ?? id.split('.')[1]) as string;
        }
      }
      return undefined;
    })
  );

  return userName ?? linkedPersonName ?? currentUser?.name ?? firstPersonName;
}

// ---------------------------------------------------------------------------
// Phase v0.2 additions — current user awareness
// ---------------------------------------------------------------------------

/** Result of useCurrentUserAvatar. */
export interface CurrentUserAvatarInfo {
  name: string;
  pictureUrl: string | null;
  initial: string;
}

/**
 * Resolve the current user's avatar info for the UserAvatar component.
 *
 * - Finds the `person.*` entity whose `attributes.user_id` matches `currentUser.id`
 * - `pictureUrl`: entity_picture resolved against the connection URL, or null
 *   (demo persons have null entity_picture, so this will be null in demo)
 * - `initial`: first letter of currentUser.name, fallback person friendly_name,
 *   fallback '?'
 *
 * Returns null when no currentUser is set.
 */
export function useCurrentUserAvatar(): CurrentUserAvatarInfo | null {
  const currentUser = useConnectionStore((s) => s.currentUser);
  const url = useConnectionStore((s) => s.url);

  const personPicture = useEntityStore(
    useShallow((s) => {
      if (!currentUser) return null;
      for (const [id, entity] of Object.entries(s.entities)) {
        if (id.startsWith('person.') && entity.attributes.user_id === currentUser.id) {
          const pic = entity.attributes.entity_picture ?? null;
          const friendlyName = (entity.attributes.friendly_name ?? id.split('.')[1]) as string;
          return { pic, friendlyName };
        }
      }
      return null;
    })
  );

  if (!currentUser) return null;

  const name = currentUser.name || personPicture?.friendlyName || '?';
  const initial = (name[0] ?? '?').toUpperCase();

  let pictureUrl: string | null = null;
  if (personPicture?.pic) {
    // Resolve relative paths against HA URL; absolute URLs pass through
    const pic = personPicture.pic;
    if (pic.startsWith('http://') || pic.startsWith('https://')) {
      pictureUrl = pic;
    } else if (url) {
      pictureUrl = `${url}${pic}`;
    } else {
      pictureUrl = pic;
    }
  }

  return { name, pictureUrl, initial };
}

/**
 * Whether the current user may edit pages (enter edit mode).
 *
 * Only Home Assistant admins can edit. Demo mode uses a synthetic admin user,
 * so demo always returns true. Returns false while the user is still unknown
 * (e.g. before auth/current_user resolves) — a safe default that hides editing.
 */
export function useCanEdit(): boolean {
  const currentUser = useConnectionStore((s) => s.currentUser);
  return currentUser?.is_admin === true;
}

/**
 * Music Assistant presence (issue #2). Detected from the entity registry
 * (platform === 'music_assistant'); demo mode reports a synthetic install so
 * the public demo can showcase the library browser. Null → no MA, and the
 * Music page keeps its regular layout.
 */
export function useMusicAssistant(): MusicAssistantInfo | null {
  const demo = useConnectionStore((s) => s.demo);
  const registries = useEntityStore((s) => s.registries);
  return useMemo(() => {
    if (demo) {
      const players = Object.keys(useEntityStore.getState().entities)
        .filter((id) => id.startsWith('media_player.'))
        .sort();
      return players.length > 0 ? { configEntryId: 'demo', playerIds: players } : null;
    }
    return findMusicAssistant(registries);
  }, [demo, registries]);
}
