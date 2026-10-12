/** [fork] The home's health (System Monitor, batteries, unavailable devices) as a tafel head: tone and symbol. */

import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Monitor } from 'lucide-react';
import type { TafelTone } from './Tafel';

export type Health = 'healthy' | 'warning' | 'critical' | 'unknown';

export function healthTone(health: Health): TafelTone {
  return health === 'healthy' ? 'ok' : health === 'warning' ? 'warn' : health === 'critical' ? 'danger' : 'none';
}

export function HealthIcon({ health }: { health: Health }) {
  const Icon =
    health === 'healthy' ? CheckCircle2 : health === 'warning' ? AlertTriangle : health === 'critical' ? AlertCircle : Monitor;
  return <Icon size={28} strokeWidth={1.75} />;
}
