/**
 * [fork] PoolModeSegment — the pool's mode in Glas (docs/GLAS-DESIGN.md §7.27, plan docs/glas/PLAN-ETAPPE-5.md K92),
 * on the pool page's hero and in the pool window.
 *
 * The input_select's own options as text (the classic buttons show a symbol next to it; a segment never mixes the
 * two). It writes the mode, so the arrows only move the focus and Space/Enter choose (manual activation). "Manuell"
 * asks for the run length first — on every tap, also when it is already the mode — and the mode changes only when the
 * run starts, as in Klassisch. With more than `POOL_SEGMENT_MAX` options the callers keep the classic buttons.
 */

import { setPoolMode } from '../../ha/pool';
import { POOL_ENTITIES, poolModeTone } from '../pool/poolConfig';
import { Segment } from './Segment';

/** The most options a segment shows (GLAS-DESIGN §7.27); more keep the classic buttons. */
export const POOL_SEGMENT_MAX = 5;

interface PoolModeSegmentProps {
  /** The mode's options in the order of the input_select. */
  options: readonly string[];
  /** The current mode (the input_select's state). */
  value: string | undefined;
  /** Accessible name of the group. */
  label: string;
  /** "Manuell" was chosen: ask for the run length. */
  onManual: () => void;
}

export function PoolModeSegment({ options, value, label, onManual }: PoolModeSegmentProps) {
  const choose = (option: string) => {
    if (poolModeTone(option) === 'manual') onManual();
    else void setPoolMode(POOL_ENTITIES.mode, option).catch(() => { /* toast shown */ });
  };
  return (
    <Segment
      options={options.map((o) => ({ value: o, label: o }))}
      value={value !== undefined && options.includes(value) ? value : null}
      onChange={choose}
      onReselect={(option) => {
        if (poolModeTone(option) === 'manual') onManual();
      }}
      label={label}
      activation="manual"
      className="g-seg--pool"
    />
  );
}
