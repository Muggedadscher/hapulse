/**
 * AutomationsToolbar — search input + Room and Category filter dropdowns.
 * Modeled on DevicesToolbar but without the view-mode toggle.
 */

import React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { useT } from '../../i18n/useT';
import './AutomationsToolbar.css';

export interface FilterOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  ariaLabel: string;
}

function Select({ value, onChange, options, ariaLabel }: SelectProps) {
  return (
    <div className="automations-select">
      <select
        className="automations-select__native"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} strokeWidth={2} className="automations-select__chevron" aria-hidden="true" />
    </div>
  );
}

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  rooms: FilterOption[];
  room: string;
  onRoomChange: (v: string) => void;
  categories: FilterOption[];
  category: string;
  onCategoryChange: (v: string) => void;
}

export function AutomationsToolbar({
  search, onSearchChange,
  rooms, room, onRoomChange,
  categories, category, onCategoryChange,
}: Props) {
  const t = useT();
  return (
    <div className="automations-toolbar">
      <div className="automations-toolbar__search">
        <Search size={16} strokeWidth={2} aria-hidden="true" />
        <input
          type="search"
          className="automations-toolbar__search-input"
          placeholder={t('automations.toolbar.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={t('automations.toolbar.searchAria')}
        />
      </div>

      <div className="automations-toolbar__filters">
        <Select
          ariaLabel={t('automations.toolbar.roomFilterAria')}
          value={room}
          onChange={onRoomChange}
          options={[{ value: '', label: t('automations.toolbar.allRooms') }, ...rooms]}
        />
        <Select
          ariaLabel={t('automations.toolbar.categoryFilterAria')}
          value={category}
          onChange={onCategoryChange}
          options={[{ value: '', label: t('automations.toolbar.allCategories') }, ...categories]}
        />
      </div>
    </div>
  );
}
