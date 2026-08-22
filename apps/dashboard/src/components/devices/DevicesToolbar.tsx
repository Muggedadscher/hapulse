/**
 * DevicesToolbar — search, room + integration filters, and list/grid toggle.
 */

import React from 'react';
import { Search, List, LayoutGrid, ChevronDown } from 'lucide-react';
import { useT } from '../../i18n/useT';

export interface FilterOption {
  value: string;
  label: string;
}

interface DevicesToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  rooms: FilterOption[];
  room: string;
  onRoomChange: (v: string) => void;
  integrations: FilterOption[];
  integration: string;
  onIntegrationChange: (v: string) => void;
  view: 'grid' | 'list';
  onViewChange: (v: 'grid' | 'list') => void;
}

function Select({
  value, onChange, options, ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  ariaLabel: string;
}) {
  return (
    <div className="devices-select">
      <select
        className="devices-select__native"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} strokeWidth={2} className="devices-select__chevron" aria-hidden="true" />
    </div>
  );
}

export function DevicesToolbar({
  search, onSearchChange,
  rooms, room, onRoomChange,
  integrations, integration, onIntegrationChange,
  view, onViewChange,
}: DevicesToolbarProps) {
  const t = useT();
  return (
    <div className="devices-toolbar">
      <div className="devices-toolbar__search">
        <Search size={16} strokeWidth={2} aria-hidden="true" />
        <input
          type="search"
          className="devices-toolbar__search-input"
          placeholder={t('devices.toolbar.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={t('devices.toolbar.searchAria')}
        />
      </div>

      <div className="devices-toolbar__filters">
        <Select
          ariaLabel={t('devices.toolbar.roomFilterAria')}
          value={room}
          onChange={onRoomChange}
          options={[{ value: '', label: t('devices.toolbar.allRooms') }, ...rooms]}
        />
        <Select
          ariaLabel={t('devices.toolbar.integrationFilterAria')}
          value={integration}
          onChange={onIntegrationChange}
          options={[{ value: '', label: t('devices.toolbar.allIntegrations') }, ...integrations]}
        />

        <div className="devices-view-toggle" role="group" aria-label={t('devices.toolbar.viewModeAria')}>
          <button
            type="button"
            className={`devices-view-toggle__btn${view === 'list' ? ' devices-view-toggle__btn--active' : ''}`}
            onClick={() => onViewChange('list')}
            aria-label={t('devices.toolbar.listViewAria')}
            aria-pressed={view === 'list'}
          >
            <List size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={`devices-view-toggle__btn${view === 'grid' ? ' devices-view-toggle__btn--active' : ''}`}
            onClick={() => onViewChange('grid')}
            aria-label={t('devices.toolbar.gridViewAria')}
            aria-pressed={view === 'grid'}
          >
            <LayoutGrid size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
