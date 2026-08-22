/**
 * Device presentation helpers — icon per domain and friendly integration names.
 */

import React from 'react';
import {
  Lightbulb, Plug, Fan, Thermometer, Blinds, Lock, Speaker, Video,
  Gauge, ShieldCheck, Sparkles, User, CloudSun, Sun, CircleDot, Cpu,
} from 'lucide-react';
import type { useT, TKey } from '../../i18n/useT';

type TFunction = ReturnType<typeof useT>;

const DOMAIN_ICON: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  light: Lightbulb,
  switch: Plug,
  fan: Fan,
  climate: Thermometer,
  cover: Blinds,
  lock: Lock,
  media_player: Speaker,
  camera: Video,
  sensor: Gauge,
  binary_sensor: Gauge,
  alarm_control_panel: ShieldCheck,
  scene: Sparkles,
  person: User,
  weather: CloudSun,
  sun: Sun,
  button: CircleDot,
};

export function DeviceIcon({
  domain,
  size = 18,
  strokeWidth = 1.75,
}: {
  domain: string | null;
  size?: number;
  strokeWidth?: number;
}) {
  const Icon = (domain && DOMAIN_ICON[domain]) || Cpu;
  return <Icon size={size} strokeWidth={strokeWidth} />;
}

// 'homeassistant' is intentionally not in this map: its display name ("Home
// Assistant") is never translated, so it is handled as a literal special case
// in integrationLabel() below rather than routed through en.json.
const INTEGRATION_LABEL_KEY: Record<string, TKey> = {
  hue: 'devices.integration.hue',
  tplink: 'devices.integration.tplink',
  nest: 'devices.integration.nest',
  zwave_js: 'devices.integration.zwaveJs',
  zha: 'devices.integration.zha',
  cast: 'devices.integration.cast',
  generic: 'devices.integration.generic',
  manual_alarm: 'devices.integration.manualAlarm',
  roborock: 'devices.integration.roborock',
  systemmonitor: 'devices.integration.systemmonitor',
  person: 'devices.integration.person',
  met: 'devices.integration.met',
  sun: 'devices.integration.sun',
  mqtt: 'devices.integration.mqtt',
  spotify: 'devices.integration.spotify',
};

/** Friendly display name for an integration / platform slug. Never translate
 *  "Home Assistant" itself — it is kept as a literal for the `homeassistant`
 *  platform slug. */
export function integrationLabel(t: TFunction, platform: string | null | undefined): string {
  if (!platform) return t('devices.integration.unknown');
  if (platform === 'homeassistant') return 'Home Assistant';
  const key = INTEGRATION_LABEL_KEY[platform];
  return key ? t(key) : platform.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
