/**
 * HistoryModal — tap a numeric sensor tile to see its value over time.
 *
 * Reuses the shared Modal primitive and the app's design tokens. Fetches
 * on-demand via `useHistory` (only while open), with a range selector and a
 * min / avg / max summary. Falls back gracefully to loading / empty / error
 * states so a sensor with no recorder history never crashes the view.
 *
 * The selected time range is remembered in customization settings, so it
 * carries across every sensor you open — and, because settings are stored per
 * Home Assistant user, each person keeps their own choice.
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';
import type { HassEntity } from '@hapulse/core';
import { HISTORY_RANGES } from '@hapulse/core';
import type { HistoryRange } from '@hapulse/core';
import { formatEntityState } from '@hapulse/core';
import { Modal } from '../ui/Modal';
import { useT, useLocale } from '../../i18n/useT';
import { useSettingsStore } from '../../stores/settingsStore';
import { useHistory } from '../../ha/useHistory';
import { HistoryChart } from './HistoryChart';
import './history.css';

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  entity: HassEntity;
  name: string;
  /** Accent colour for the chart — pass a CSS variable, e.g. `var(--danger)`. */
  color: string;
}

const DEFAULT_RANGE: HistoryRange = '24h';

/** Coerce a persisted string into a valid range id (defaults to 24h). */
function toRange(value: string): HistoryRange {
  return HISTORY_RANGES.some((r) => r.id === value) ? (value as HistoryRange) : DEFAULT_RANGE;
}

export function HistoryModal({ open, onClose, entity, name, color }: HistoryModalProps) {
  const t = useT();
  const locale = useLocale();

  // Remembered per user (settings sync to HA user storage).
  const range = useSettingsStore((s) => toRange(s.customization.historyRange));
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);
  const setRange = (id: HistoryRange) => updateCustomization({ historyRange: id });

  const { loading, error, empty, points, summary } = useHistory(
    open ? entity.entity_id : null,
    range,
  );

  const unit = entity.attributes['unit_of_measurement'] as string | undefined;
  const current = formatEntityState(entity, locale);
  const hasChart = points.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={name}
      icon={<TrendingUp size={18} strokeWidth={1.75} />}
      className="modal-panel--wide"
    >
      <div className="history">
        <div className="history__head">
          <div className="history__current" style={{ color }}>{current}</div>

          <div className="history__ranges" role="group" aria-label="History range">
            {HISTORY_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`history__range-btn${range === r.id ? ' history__range-btn--active' : ''}`}
                onClick={() => setRange(r.id)}
                aria-pressed={range === r.id}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`history__plot${loading && hasChart ? ' history__plot--loading' : ''}`}>
          {/* Keep the previous chart on screen during a refetch so it can morph
              into the new range instead of blanking out. */}
          {hasChart && <HistoryChart points={points} color={color} unit={unit} />}
          {!hasChart && loading && <div className="history__msg">{t('common.loading')}</div>}
          {!hasChart && !loading && error && <div className="history__msg">{t('history.error')}</div>}
          {!hasChart && !loading && !error && empty && (
            <div className="history__msg">{t('history.empty')}</div>
          )}
        </div>

        {summary && hasChart && (
          <div className="history__stats">
            <Stat label={t('history.stat.min')} value={summary.min} unit={unit} />
            <Stat label={t('history.stat.avg')} value={summary.avg} unit={unit} />
            <Stat label={t('history.stat.max')} value={summary.max} unit={unit} />
          </div>
        )}
      </div>
    </Modal>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit?: string | undefined }) {
  return (
    <div className="history-stat">
      <span className="history-stat__label">{label}</span>
      <span className="history-stat__value">
        {Math.round(value * 10) / 10}
        {unit ? <span className="history-stat__unit"> {unit}</span> : null}
      </span>
    </div>
  );
}
