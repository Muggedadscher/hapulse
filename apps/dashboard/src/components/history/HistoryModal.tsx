/**
 * HistoryModal — tap a numeric sensor tile to see its value over time.
 *
 * Reuses the shared Modal primitive and the app's design tokens. Fetches
 * on-demand via `useHistory` (only while open), with a range selector and a
 * min / avg / max summary. Falls back gracefully to loading / empty / error
 * states so a sensor with no recorder history never crashes the view.
 */

import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import type { HassEntity } from '@hapulse/core';
import { HISTORY_RANGES } from '@hapulse/core';
import type { HistoryRange } from '@hapulse/core';
import { formatEntityState } from '@hapulse/core';
import { Modal } from '../ui/Modal';
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

export function HistoryModal({ open, onClose, entity, name, color }: HistoryModalProps) {
  const [range, setRange] = useState<HistoryRange>(DEFAULT_RANGE);
  const { state, points, summary } = useHistory(open ? entity.entity_id : null, range);

  const unit = entity.attributes['unit_of_measurement'] as string | undefined;
  const current = formatEntityState(entity);

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

        <div className="history__plot">
          {state === 'loading' && <div className="history__msg">loading…</div>}
          {state === 'error' && <div className="history__msg">Could not load history.</div>}
          {state === 'empty' && (
            <div className="history__msg">No history recorded for this range.</div>
          )}
          {state === 'ready' && <HistoryChart points={points} color={color} unit={unit} />}
        </div>

        {summary && state === 'ready' && (
          <div className="history__stats">
            <Stat label="min" value={summary.min} unit={unit} />
            <Stat label="avg" value={summary.avg} unit={unit} />
            <Stat label="max" value={summary.max} unit={unit} />
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
