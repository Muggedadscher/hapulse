/**
 * [fork] Range input that talks to Home Assistant sparingly.
 *
 * A range bound straight to HA state and firing a service call on every `change` sent dozens of calls per
 * second while dragging, jumped back to the old state between them and made seeking stutter. This hook keeps
 * a local draft while the user drags and commits on release (pointer up, key up, blur). With `throttleMs`
 * intermediate values are sent at most that often (volume: you hear the change while dragging); without it
 * only the final value goes out (seek). After a commit the draft stays until HA reports a new value (no snap
 * back), at most `holdMs`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

export function useCommitRange(value: number, commit: (v: number) => void, opts: { throttleMs?: number; holdMs?: number } = {}) {
  const { throttleMs = 0, holdMs = 2000 } = opts;
  const [draft, setDraft] = useState<number | null>(null);
  const lastSent = useRef<{ v: number; at: number } | null>(null);
  const holdT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef(commit); commitRef.current = commit;

  // HA reported a new value → the draft has done its job
  useEffect(() => { if (holdT.current === null) return; setDraft(null); clearTimeout(holdT.current); holdT.current = null; }, [value]);
  useEffect(() => () => { if (holdT.current) clearTimeout(holdT.current); }, []);

  const send = useCallback((v: number) => {
    lastSent.current = { v, at: Date.now() };
    commitRef.current(v);
  }, []);

  const dirty = useRef(false); // changed since the last commit

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    dirty.current = true;
    setDraft(v);
    if (throttleMs > 0 && (!lastSent.current || Date.now() - lastSent.current.at >= throttleMs)) send(v);
  }, [throttleMs, send]);

  const finish = useCallback((e: { currentTarget: HTMLInputElement }) => {
    if (!dirty.current) return; // a click / key / blur without a change sends nothing
    dirty.current = false;
    const v = parseFloat(e.currentTarget.value);
    if (!Number.isFinite(v)) return;
    if (!lastSent.current || lastSent.current.v !== v) send(v);
    lastSent.current = null;
    if (holdT.current) clearTimeout(holdT.current);
    holdT.current = setTimeout(() => { holdT.current = null; setDraft(null); }, holdMs);
  }, [holdMs, send]);

  const onKeyUp = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => { finish(e); }, [finish]);
  const onBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => { finish(e); }, [finish]);

  return { value: draft ?? value, onChange, onPointerUp: finish, onKeyUp, onBlur };
}
