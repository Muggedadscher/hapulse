/**
 * [fork] Status icon for a garage door / gate: MDI garage / garage-open /
 * garage-alert (gate-* for gates) — the same family as the room status icon
 * `mdi:garage-open`. Lucide Warehouse / Fence stand in while @mdi/js loads.
 */

import React from 'react';
import { Fence, Warehouse } from 'lucide-react';
import { garageMdiIcon, garageStatus, isGate } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import { MdiIcon } from '../ui/MdiIcon';
import './garage.css';

/** Visual tone: moving counts as open (the door is not shut). */
export type GarageTone = 'closed' | 'open' | 'unavailable';

export function garageTone(state: string): GarageTone {
  const s = garageStatus(state);
  return s === 'moving' ? 'open' : s;
}

export function GarageIcon({ entity, size = 18 }: { entity: HassEntity; size?: number }) {
  const Fallback = isGate(entity) ? Fence : Warehouse;
  return (
    <MdiIcon
      icon={garageMdiIcon(entity)}
      size={size}
      className="garage-mdi"
      fallback={<Fallback size={size} strokeWidth={1.75} />}
    />
  );
}

/** Icon for a group of doors (chips, section headers): garage / garage-open / garage-alert. */
export function GarageSummaryIcon({ tone, size = 16 }: { tone: GarageTone; size?: number }) {
  const icon = tone === 'open' ? 'mdi:garage-open' : tone === 'unavailable' ? 'mdi:garage-alert' : 'mdi:garage';
  return <MdiIcon icon={icon} size={size} className="garage-mdi" fallback={<Warehouse size={size} strokeWidth={1.75} />} />;
}
