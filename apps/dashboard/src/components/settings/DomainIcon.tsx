/**
 * DomainIcon — renders the correct lucide icon for a given entity's domain/device_class.
 * Maps the string returned by domainIcon() to the actual lucide-react component.
 */

import React from 'react';
import {
  Lightbulb, Plug, Fan, Thermometer, PanelTop, Warehouse,
  Speaker, Camera, Lock, Shield, CloudSun, User, Sun,
  ToggleLeft, Play, Zap, Sparkles, DoorOpen, AppWindow,
  Activity, Flame, Droplets, UserCheck, CircleDot,
  Battery, Gauge, Wind, Clock,
  Fence, // [fork] gate
} from 'lucide-react';
import { domainIcon } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';

const ICON_MAP: Record<string, React.FC<{ size?: number; strokeWidth?: number }>> = {
  lightbulb: Lightbulb,
  plug: Plug,
  fan: Fan,
  thermometer: Thermometer,
  'panel-top': PanelTop,
  warehouse: Warehouse,
  fence: Fence, // [fork] gate
  blinds: PanelTop, // lucide doesn't export Blinds in all versions — use PanelTop as fallback
  speaker: Speaker,
  camera: Camera,
  lock: Lock,
  shield: Shield,
  'cloud-sun': CloudSun,
  user: User,
  sun: Sun,
  'toggle-left': ToggleLeft,
  play: Play,
  zap: Zap,
  sparkles: Sparkles,
  'door-open': DoorOpen,
  'app-window': AppWindow,
  activity: Activity,
  flame: Flame,
  droplets: Droplets,
  'user-check': UserCheck,
  'circle-dot': CircleDot,
  battery: Battery,
  gauge: Gauge,
  wind: Wind,
  clock: Clock,
  bolt: Zap, // reuse Zap for bolt
};

interface DomainIconProps {
  entity: HassEntity;
  size?: number;
  strokeWidth?: number;
}

export function DomainIcon({ entity, size = 20, strokeWidth = 1.75 }: DomainIconProps) {
  const iconName = domainIcon(entity);
  const IconComponent = ICON_MAP[iconName] ?? Activity;
  return <IconComponent size={size} strokeWidth={strokeWidth} />;
}
