import React, { useState } from 'react';
import {
  Thermometer, Droplets, Zap, Sun, Battery, Gauge,
  Clock, Wind, Activity, Eye, DoorOpen, Flame, Users,
  Wifi, AlertCircle, Grid2x2, Waves,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { formatEntityState } from '@hapulse/core';
import { useLocale, useT, useStateLabel } from '../../i18n/useT';
import type { TFunction } from '../../i18n/useT';
import type { HassEntity } from '@hapulse/core';
import { HistoryModal } from '../history/HistoryModal'; // [fork]
import './cards.css';

interface SensorTileProps {
  entity: HassEntity;
  name: string;
}

const DC_ICONS: Record<string, React.ReactNode> = {
  temperature:      <Thermometer size={16} strokeWidth={1.75} />,
  humidity:         <Droplets size={16} strokeWidth={1.75} />,
  power:            <Zap size={16} strokeWidth={1.75} />,
  energy:           <Zap size={16} strokeWidth={1.75} />,
  illuminance:      <Sun size={16} strokeWidth={1.75} />,
  battery:          <Battery size={16} strokeWidth={1.75} />,
  pressure:         <Gauge size={16} strokeWidth={1.75} />,
  timestamp:        <Clock size={16} strokeWidth={1.75} />,
  voltage:          <Zap size={16} strokeWidth={1.75} />,
  current:          <Zap size={16} strokeWidth={1.75} />,
  co2:              <Wind size={16} strokeWidth={1.75} />,
  carbon_dioxide:   <Wind size={16} strokeWidth={1.75} />,
  gas:              <Wind size={16} strokeWidth={1.75} />,
  motion:           <Eye size={16} strokeWidth={1.75} />,
  door:             <DoorOpen size={16} strokeWidth={1.75} />,
  window:           <Grid2x2 size={16} strokeWidth={1.75} />,
  moisture:         <Droplets size={16} strokeWidth={1.75} />,
  smoke:            <Flame size={16} strokeWidth={1.75} />,
  presence:         <Users size={16} strokeWidth={1.75} />,
  occupancy:        <Users size={16} strokeWidth={1.75} />,
  connectivity:     <Wifi size={16} strokeWidth={1.75} />,
  problem:          <AlertCircle size={16} strokeWidth={1.75} />,
  vibration:        <Waves size={16} strokeWidth={1.75} />,
  carbon_monoxide:  <Wind size={16} strokeWidth={1.75} />,
};

const BINARY_ON_DANGER   = new Set(['moisture', 'smoke', 'gas', 'carbon_monoxide', 'problem']);
const BINARY_ON_POSITIVE = new Set(['presence', 'occupancy', 'connectivity', 'plug']);
const BINARY_ON_INFO     = new Set(['door', 'window', 'motion', 'vibration']);

function binaryLabel(deviceClass: string | undefined, on: boolean, t: TFunction): string {
  switch (deviceClass) {
    case 'door':
    case 'window':
    case 'garage_door':
    case 'opening':         return on ? t('cards.sensor.open') : t('cards.sensor.closed');
    case 'motion':
    case 'occupancy':
    case 'presence':
    case 'moving':
    case 'vibration':       return on ? t('cards.sensor.detected') : t('cards.sensor.clear');
    case 'moisture':        return on ? t('cards.sensor.wet') : t('cards.sensor.dry');
    case 'smoke':
    case 'gas':
    case 'carbon_monoxide': return on ? t('cards.sensor.detected') : t('cards.sensor.clear');
    case 'connectivity':    return on ? t('cards.sensor.connected') : t('cards.sensor.disconnected');
    case 'battery':         return on ? t('cards.sensor.low') : t('cards.sensor.ok');
    case 'problem':         return on ? t('cards.sensor.problem') : t('cards.sensor.ok');
    case 'lock':            return on ? t('cards.sensor.unlocked') : t('cards.sensor.locked');
    default:                return on ? t('cards.sensor.on') : t('cards.sensor.off');
  }
}

function binaryOnType(deviceClass: string | undefined): 'danger' | 'positive' | 'info' | 'accent' {
  if (!deviceClass) return 'accent';
  if (BINARY_ON_DANGER.has(deviceClass))   return 'danger';
  if (BINARY_ON_POSITIVE.has(deviceClass)) return 'positive';
  if (BINARY_ON_INFO.has(deviceClass))     return 'info';
  return 'accent';
}

function normalizeSensorValue(deviceClass: string | undefined, value: number): number {
  let pct: number;
  switch (deviceClass) {
    case 'humidity':
    case 'battery':
      pct = value;
      break;
    case 'temperature':
      pct = (value / 40) * 100;
      break;
    case 'illuminance':
      pct = (Math.log10(value + 1) / 5) * 100;
      break;
    case 'pressure':
      pct = ((value - 900) / 200) * 100;
      break;
    case 'power':
      pct = (value / 3000) * 100;
      break;
    default:
      pct = value;
  }
  return Math.min(Math.max(pct, 0), 100);
}

function sensorBarColor(deviceClass: string | undefined): string {
  switch (deviceClass) {
    case 'temperature': return 'var(--danger)';
    case 'humidity':    return 'var(--info)';
    case 'battery':     return 'var(--positive)';
    case 'power':
    case 'energy':      return 'var(--accent)';
    default:            return 'var(--accent)';
  }
}

export function SensorTile({ entity, name }: SensorTileProps) {
  const [historyOpen, setHistoryOpen] = useState(false); // [fork]
  const t = useT();
  const locale = useLocale();
  const sl = useStateLabel();
  const deviceClass = entity.attributes.device_class as string | undefined;
  const icon = (deviceClass && DC_ICONS[deviceClass]) ?? <Activity size={16} strokeWidth={1.75} />;
  const value = formatEntityState(entity, locale, sl);

  const isBinary  = entity.entity_id.startsWith('binary_sensor.');
  const isOn      = entity.state === 'on';
  const numValue  = parseFloat(entity.state);
  const isNumeric = !isBinary && !isNaN(numValue);

  if (isBinary) {
    const onType = isOn ? binaryOnType(deviceClass) : null;
    return (
      <Card className={`sensor-tile sensor-tile--binary${isOn ? ` sensor-tile--binary-on sensor-tile--binary-on-${onType}` : ''}`}>
        <div className={`icon-chip sensor-tile__chip${isOn ? ` sensor-tile__chip--binary-${onType}` : ''}`}>{icon}</div>
        <div className={`sensor-tile__value${isOn ? ` sensor-tile__value--binary-${onType}` : ''}`}>
          {binaryLabel(deviceClass, isOn, t)}
        </div>
        <div className="sensor-tile__name">{name}</div>
      </Card>
    );
  }

  const fillPct  = isNumeric ? normalizeSensorValue(deviceClass, numValue) : 0;
  const barColor = sensorBarColor(deviceClass);

  const tileInner = (
    <>
      {isNumeric && (
        <div
          className="sensor-tile__bar"
          style={{ width: `${fillPct}%`, background: barColor }}
          aria-hidden="true"
        />
      )}
      <div className="icon-chip sensor-tile__chip">{icon}</div>
      <div className="sensor-tile__value">{value}</div>
      <div className="sensor-tile__name">{name}</div>
    </>
  );

  // [fork] Numeric sensors open a value-over-time history chart on tap;
  // non-numeric (text/unavailable) tiles stay static.
  if (!isNumeric) {
    return <Card className="sensor-tile sensor-tile--numeric">{tileInner}</Card>;
  }

  return (
    <>
      <Card
        className="sensor-tile sensor-tile--numeric sensor-tile--clickable"
        role="button"
        tabIndex={0}
        aria-label={`${name} — show history`}
        onClick={() => setHistoryOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setHistoryOpen(true);
          }
        }}
      >
        {tileInner}
      </Card>
      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entity={entity}
        name={name}
        color={barColor}
      />
    </>
  );
}
