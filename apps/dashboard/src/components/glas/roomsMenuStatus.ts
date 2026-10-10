/**
 * [fork] Glas: each room's state in the rooms menu (docs/glas/PLAN-ETAPPE-5.md K97, GLAS-DESIGN §7.18 "Räume") —
 * the same as on the overview's room tiles: the status symbol replaces the room's own (open window or door, open gate,
 * water, smoke) and tints the circle, else yellow while a visible light is on. The menu stays mounted: the states
 * follow the entities only while it is open; closed (and sliding out) it keeps the last ones and reads nothing, and
 * before the first opening there are none. Null in Klassisch, which keeps the room's own symbol.
 */

import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { HassEntityMap, Room } from '@hapulse/core';
import { roomDisplayIcon } from '../../lib/roomIcon';
import { useEntityStore } from '../../stores/entityStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useIsGlas } from '../../app/glas/useUiStyle';
import { roomTone } from './home/roomTone';
import type { RoomTone } from './home/roomTone';

export interface RoomMenuStatus {
  iconName: string;
  isStatus: boolean;
  /** Visible lights on. */
  lightsOn: number;
  tone: RoomTone | undefined;
}

export function useRoomsMenuStatus(rooms: readonly Room[], open: boolean): ReadonlyMap<string, RoomMenuStatus> | null {
  const glas = useIsGlas();
  const live = useEntityStore((s) => (glas && open ? s.entities : null));
  const [entities, setEntities] = useState(live);
  if (live && live !== entities) setEntities(live);
  const hidden = useSettingsStore(useShallow((s) => s.customization.hiddenEntities));

  const status = useMemo(() => {
    if (!entities) return null;
    // hidden entities left out once for all rooms (roomDisplayIcon would filter the whole map per room)
    const hiddenSet = new Set(hidden);
    const visible: HassEntityMap =
      hiddenSet.size === 0 ? entities : Object.fromEntries(Object.entries(entities).filter(([id]) => !hiddenSet.has(id)));
    const out = new Map<string, RoomMenuStatus>();
    for (const room of rooms) {
      const { iconName, isStatus } = roomDisplayIcon(room, visible);
      const lightsOn = (room.domains['light'] ?? []).filter((id) => visible[id]?.state === 'on').length;
      out.set(room.id, { iconName, isStatus, lightsOn, tone: roomTone(iconName, isStatus, lightsOn) });
    }
    return out;
  }, [entities, hidden, rooms]);
  return glas ? status : null;
}
