import React, { useMemo, useState } from 'react';
import { Cpu } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useDevices } from '../ha/useDevices';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { useT } from '../i18n/useT';
import { EmptyState } from '../components/ui/EmptyState';
import { DevicesHeroCard } from '../components/devices/DevicesHeroCard';
import { DevicesToolbar, type FilterOption } from '../components/devices/DevicesToolbar';
import { DeviceCard } from '../components/devices/DeviceCard';
import { DeviceDetailsModal } from '../components/devices/DeviceDetailsModal';
import { integrationLabel } from '../components/devices/deviceMeta';
import { useSettingsStore } from '../stores/settingsStore';
import type { DeviceModel } from '@hapulse/core';
import './Page.css';
import './Devices.css';

export function Devices() {
  const t = useT();
  const { state, progress, devices, summary } = useDevices();

  const editingEnabled = useSettingsStore((s) => s.customization.editingEnabled);
  const hiddenEntities = useSettingsStore(useShallow((s) => s.customization.hiddenEntities));
  const hiddenSet = useMemo(() => new Set(hiddenEntities), [hiddenEntities]);

  const [search, setSearch] = useState('');
  const [room, setRoom] = useState('');
  const [integration, setIntegration] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selected, setSelected] = useState<DeviceModel | null>(null);

  // Filter options derived from the loaded devices.
  const roomOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();
    for (const d of devices) {
      if (d.areaId && d.areaName) map.set(d.areaId, d.areaName);
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [devices]);

  const integrationOptions = useMemo<FilterOption[]>(() => {
    const set = new Set<string>();
    for (const d of devices) for (const i of d.integrations) set.add(i);
    return [...set]
      .map((value) => ({ value, label: integrationLabel(t, value) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [devices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices.filter((d) => {
      if (room && d.areaId !== room) return false;
      if (integration && !d.integrations.includes(integration)) return false;
      if (q) {
        const hay = [
          d.name,
          d.areaName ?? '',
          d.manufacturer ?? '',
          d.model ?? '',
          ...d.integrations.map((i) => integrationLabel(t, i)),
          ...d.entities.map((e) => e.name),
          ...d.entities.map((e) => e.entity_id),
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [devices, search, room, integration]);

  return (
    <div className="page devices-page stagger-rise">
      <div className="page__header-row">
        <h1 className="page__title">{t('devices.title')}</h1>
        <PageHeaderActions />
      </div>

      {state === 'loading' ? (
        <div className="devices-loading" role="status" aria-live="polite">
          <div className="devices-loading__top">
            <span className="devices-loading__label">{t('devices.loading')}</span>
            <span className="devices-loading__pct data-font">{progress}%</span>
          </div>
          <div className="devices-loading__bar">
            <div className="devices-loading__bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="devices-loading__hint">
            {t('devices.loadingHint')}
          </p>
        </div>
      ) : devices.length === 0 ? (
        <EmptyState
          icon={<Cpu size={36} strokeWidth={1.5} />}
          title={t('devices.empty.title')}
          description={t('devices.empty.description')}
        />
      ) : (
        <>
          <DevicesHeroCard summary={summary} />

          <DevicesToolbar
            search={search}
            onSearchChange={setSearch}
            rooms={roomOptions}
            room={room}
            onRoomChange={setRoom}
            integrations={integrationOptions}
            integration={integration}
            onIntegrationChange={setIntegration}
            view={view}
            onViewChange={setView}
          />

          {filtered.length === 0 ? (
            <p className="devices-empty-filter">{t('devices.emptyFilter')}</p>
          ) : (
            <div className={`devices-results devices-results--${view}`}>
              {filtered.map((d) => {
                const deviceHidden = d.entities.length > 0 && d.entities.every((e) => hiddenSet.has(e.entity_id));
                return (
                  <DeviceCard
                    key={d.id}
                    device={d}
                    view={view}
                    onSelect={setSelected}
                    dimHidden={editingEnabled && deviceHidden}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      <DeviceDetailsModal
        device={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
