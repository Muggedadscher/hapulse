/**
 * [fork] The entity detail's head in Glas (docs/GLAS-DESIGN.md §7.20, §7.21, plan docs/glas/PLAN-ETAPPE-4.md K79).
 * Name, room, state tile and star sit in the window's head (EntityDetailModal hands the tile and the FavoriteToggle to
 * Modal → SheetHeader as `lead` and `trailing`): the tile lights up in the device's colour while a light, switch, fan,
 * player or vacuum is on (the devices card's colours), other entities keep the soft accent of the classic chip. The
 * content starts with the state line: the state large ("An · 80 %"), when it last changed on the right. A value chart
 * takes the colour of what it measures (temperature orange, humidity blue). Looks in styles/glas/detail.css.
 */

import React from 'react';
import { domainOf, formatNumber, lightPercent } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import { DomainIcon } from '../../settings/DomainIcon';
import { relativeTime } from '../../security/roomUtils';
import { useLocale, useT } from '../../../i18n/useT';

/** The colour a device lights up in (the devices card's, §7.10). */
const TONE: Record<string, string> = {
  light: 'yellow',
  switch: 'yellow',
  input_boolean: 'yellow',
  fan: 'teal',
  media_player: 'blue',
  vacuum: 'green',
};

/** On like the devices card counts it: playing or paused, cleaning or returning, else "on". */
function isOn(entity: HassEntity): boolean {
  const domain = domainOf(entity.entity_id);
  if (domain === 'media_player') return entity.state === 'playing' || entity.state === 'paused';
  if (domain === 'vacuum') return entity.state === 'cleaning' || entity.state === 'returning';
  return entity.state === 'on';
}

/** The state tile before the name: 40, radius 12 (§7.20). Decorative — the state line says the state. */
export function GlasDetailTile({ entity }: { entity: HassEntity }) {
  const tone = TONE[domainOf(entity.entity_id)];
  const gone = entity.state === 'unavailable' || entity.state === 'unknown';
  const look = gone ? 'gone' : tone === undefined ? 'soft' : isOn(entity) ? 'lit' : 'off';
  return (
    <span className="g-detail-tile" data-tone={tone} data-look={look}>
      <DomainIcon entity={entity} size={20} />
    </span>
  );
}

/** The state line at the top of the content: "An · 80 %" (a lit light with its brightness), the time on the right. */
export function GlasDetailState({ entity, stateLabel }: { entity: HassEntity; stateLabel: string }) {
  const t = useT();
  const locale = useLocale();
  const pct = lightPercent(entity);
  return (
    <div className="g-detail-state">
      <span className="g-detail-state__value">
        {pct !== null ? `${stateLabel} · ${formatNumber(pct, locale)} %` : stateLabel}
      </span>
      <span className="g-detail-state__when">{relativeTime(t, entity.last_changed)}</span>
    </div>
  );
}

/** The colour of a value chart: what it measures, else the accent (undefined). */
export function glasChartTone(deviceClass: string | undefined): 'orange' | 'blue' | undefined {
  if (deviceClass === 'temperature') return 'orange';
  if (deviceClass === 'humidity' || deviceClass === 'moisture') return 'blue';
  return undefined;
}
