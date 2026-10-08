/**
 * [fork] A value that rolls when it changes (docs/GLAS-DESIGN.md §6.2, §7.8): the old text leaves upwards and the new
 * one comes in from below when the number rose, the other way round when it fell. Used for setpoints in Glas
 * (main room, plan docs/glas/PLAN-ETAPPE-4.md K83). The first render does not move; reduced motion fades
 * (styles/glas/controls.css). Screen readers get the current text only.
 */

import React, { useState } from 'react';

interface RollingValueProps {
  /** The text shown, e.g. "22,0 °". */
  text: string;
  /** The number behind it: decides the direction. */
  value: number;
  className?: string | undefined;
}

export function RollingValue({ text, value, className }: RollingValueProps) {
  const [roll, setRoll] = useState({ text, value, prev: null as string | null, up: true, n: 0 });
  if (text !== roll.text) {
    // adjust the state while rendering (React's pattern for "a prop changed"), so the old and the new text arrive
    // in the same frame
    setRoll({ text, value, prev: roll.text, up: value >= roll.value, n: roll.n + 1 });
  }
  return (
    <span className={`g-roll${className ? ` ${className}` : ''}`} data-dir={roll.n > 0 ? (roll.up ? 'up' : 'down') : undefined}>
      {roll.prev !== null && (
        <span key={`o${roll.n}`} className="g-roll__out" aria-hidden="true">
          {roll.prev}
        </span>
      )}
      <span key={`i${roll.n}`} className={roll.n > 0 ? 'g-roll__in' : undefined}>
        {roll.text}
      </span>
    </span>
  );
}
