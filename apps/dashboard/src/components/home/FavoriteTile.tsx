/**
 * FavoriteTile — compact interactive tile for a single favorited entity.
 *
 * - Toggleable domains (light/switch/fan/input_boolean): clicking toggles the
 *   entity via callService. The tile renders as a <button> with aria-label
 *   "toggle {name}".
 * - All other domains: clicking opens the entity detail modal via onOpenDetail.
 *   The tile renders as a <button> with aria-label "{name} details" and
 *   aria-haspopup="dialog".
 *
 * Applies an accent tint when the entity is "active/on".
 * Scale(.98) active feedback per DESIGN.md motion spec.
 */

import React, { useCallback } from 'react';
import {
  Lightbulb, Plug, Fan, Thermometer, Speaker, Camera, Lock,
  Shield, CloudSun, User, Sun, ToggleLeft, Zap, Activity,
  DoorOpen, AppWindow, Droplets, Battery, Gauge, Clock, Wind,
  Blinds, Warehouse, PanelTop, CircleDot, UserCheck,
  Play, Flame,
} from 'lucide-react';
import { domainOf, domainIcon, formatEntityState, isToggleable } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import type { CustomizationSettings } from '../../stores/settingsStore';
import { callService } from '../../ha/service';
import { useLocale, useT } from '../../i18n/useT';
import './favorites.css';

interface FavoriteTileProps {
  entity: HassEntity;
  customization: Pick<CustomizationSettings, 'entityOverrides'>;
  onOpenDetail: (entityId: string) => void;
}

/** Map a domainIcon() string name → lucide React component. */
const ICON_MAP: Record<string, React.ReactNode> = {
  lightbulb:      <Lightbulb  size={16} strokeWidth={1.75} />,
  plug:           <Plug       size={16} strokeWidth={1.75} />,
  fan:            <Fan        size={16} strokeWidth={1.75} />,
  thermometer:    <Thermometer size={16} strokeWidth={1.75} />,
  speaker:        <Speaker    size={16} strokeWidth={1.75} />,
  camera:         <Camera     size={16} strokeWidth={1.75} />,
  lock:           <Lock       size={16} strokeWidth={1.75} />,
  shield:         <Shield     size={16} strokeWidth={1.75} />,
  'cloud-sun':    <CloudSun   size={16} strokeWidth={1.75} />,
  user:           <User       size={16} strokeWidth={1.75} />,
  sun:            <Sun        size={16} strokeWidth={1.75} />,
  'toggle-left':  <ToggleLeft size={16} strokeWidth={1.75} />,
  play:           <Play       size={16} strokeWidth={1.75} />,
  zap:            <Zap        size={16} strokeWidth={1.75} />,
  activity:       <Activity   size={16} strokeWidth={1.75} />,
  'door-open':    <DoorOpen   size={16} strokeWidth={1.75} />,
  'app-window':   <AppWindow  size={16} strokeWidth={1.75} />,
  droplets:       <Droplets   size={16} strokeWidth={1.75} />,
  battery:        <Battery    size={16} strokeWidth={1.75} />,
  gauge:          <Gauge      size={16} strokeWidth={1.75} />,
  clock:          <Clock      size={16} strokeWidth={1.75} />,
  wind:           <Wind       size={16} strokeWidth={1.75} />,
  blinds:         <Blinds     size={16} strokeWidth={1.75} />,
  warehouse:      <Warehouse  size={16} strokeWidth={1.75} />,
  'panel-top':    <PanelTop   size={16} strokeWidth={1.75} />,
  'circle-dot':   <CircleDot  size={16} strokeWidth={1.75} />,
  'user-check':   <UserCheck  size={16} strokeWidth={1.75} />,
  flame:          <Flame      size={16} strokeWidth={1.75} />,
};

/** Domains / states considered "active" — receive accent tint */
function isEntityActive(entity: HassEntity): boolean {
  const { state } = entity;
  const domain = domainOf(entity.entity_id);
  switch (domain) {
    case 'light':
    case 'switch':
    case 'fan':
    case 'input_boolean':
    case 'siren':
    case 'humidifier':
    case 'binary_sensor':
      return state === 'on';
    case 'cover':
      return state === 'open';
    case 'lock':
      return state === 'unlocked';
    case 'media_player':
      return state === 'playing' || state === 'paused';
    case 'climate':
      return state !== 'off';
    case 'alarm_control_panel':
      return state !== 'disarmed';
    case 'vacuum':
      return state === 'cleaning' || state === 'returning';
    default:
      return false;
  }
}

export function FavoriteTile({ entity, customization, onOpenDetail }: FavoriteTileProps) {
  const t = useT();
  const locale = useLocale();
  const { entityOverrides } = customization;
  const override = entityOverrides[entity.entity_id];
  const name =
    override?.name ??
    (entity.attributes.friendly_name as string | undefined) ??
    entity.entity_id;

  const iconName = domainIcon(entity);
  const icon = ICON_MAP[iconName] ?? <Activity size={16} strokeWidth={1.75} />;
  const value = formatEntityState(entity, locale);
  const active = isEntityActive(entity);

  const domain = domainOf(entity.entity_id);
  const toggleable = isToggleable(domain);

  const handleToggle = useCallback(() => {
    void callService(domain, 'toggle', {}, { entity_id: entity.entity_id });
  }, [domain, entity.entity_id]);

  const handleOpenDetail = useCallback(() => {
    onOpenDetail(entity.entity_id);
  }, [onOpenDetail, entity.entity_id]);

  const tileClass = `favorite-tile${active ? ' favorite-tile--active' : ''}`;

  if (toggleable) {
    return (
      <button
        type="button"
        className={tileClass}
        onClick={handleToggle}
        aria-label={t('home.favorites.toggleAria', { name })}
        aria-pressed={active}
      >
        <div className="favorite-tile__icon" aria-hidden="true">{icon}</div>
        <div className="favorite-tile__value">{value}</div>
        <div className="favorite-tile__name">{name}</div>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={tileClass}
      onClick={handleOpenDetail}
      aria-label={t('home.favorites.detailsAria', { name })}
      aria-haspopup="dialog"
    >
      <div className="favorite-tile__icon" aria-hidden="true">{icon}</div>
      <div className="favorite-tile__value">{value}</div>
      <div className="favorite-tile__name">{name}</div>
    </button>
  );
}
