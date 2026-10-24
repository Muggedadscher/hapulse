/**
 * [fork] A day of the heating plan as a bar: the comfort periods filled, optionally the hours under it and a mark
 * for now. Wall-clock minutes (a 23- or 25-hour day still spans the bar).
 */

import { heatingMinutes } from '@hapulse/core';
import type { HeatingBlock } from '@hapulse/core';

const DAY = 24 * 60;

interface HeatingDayBarProps {
  blocks: readonly HeatingBlock[];
  /** Minutes since midnight of the "now" mark; none without. */
  nowMinute?: number | undefined;
  /** Hour labels under the bar (0, 6, 12, 18 and the given last one). */
  lastTick?: string | undefined;
  /** Comfort is not active (plan off, window open): the periods in grey. */
  muted?: boolean | undefined;
  /** The thin bar of a schedule row (sheet). */
  thin?: boolean | undefined;
  label: string;
}

export function HeatingDayBar({ blocks, nowMinute, lastTick, muted, thin, label }: HeatingDayBarProps) {
  const pct = (m: number) => `${(Math.min(Math.max(m, 0), DAY) / DAY) * 100}%`;
  return (
    <div className={`heating-bar${thin ? ' heating-bar--thin' : ''}${muted ? ' heating-bar--muted' : ''}`}>
      <div className="heating-bar__track" role="img" aria-label={label}>
        {blocks.map((b) => {
          const from = heatingMinutes(b.from);
          const to = heatingMinutes(b.to);
          return (
            <span
              key={`${b.from}-${b.to}`}
              className="heating-bar__fill"
              style={{ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})` }}
            />
          );
        })}
        {nowMinute !== undefined && <span className="heating-bar__now" style={{ left: pct(nowMinute) }} />}
      </div>
      {lastTick && (
        <div className="heating-bar__ticks" aria-hidden="true">
          <span>0</span>
          <span>6</span>
          <span>12</span>
          <span>18</span>
          <span>{lastTick}</span>
        </div>
      )}
    </div>
  );
}
