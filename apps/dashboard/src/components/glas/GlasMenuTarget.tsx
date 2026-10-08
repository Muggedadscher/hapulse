/**
 * [fork] Wraps one tile or row so the Glas context menu opens on it (stage 4, docs/glas/PLAN-ETAPPE-4.md K81):
 * `<GlasMenuTarget entityId name><button …/></GlasMenuTarget>`. The child keeps its own handlers and ref; the menu's
 * handlers run after them. In Klassisch and in the edit mode the child renders unchanged (no handlers added).
 */

import React, { cloneElement, useCallback, useRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { useGlasContextMenu } from './useGlasContextMenu';
import type { GlasMenuHandlers } from './useGlasContextMenu';

type ChildProps = GlasMenuHandlers & { ref?: Ref<HTMLElement> };

export interface GlasMenuTargetProps {
  entityId: string;
  /** Name shown in the menu's header. */
  name: string;
  children: ReactElement<ChildProps>;
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref && typeof ref === 'object') (ref as React.RefObject<T | null>).current = value;
}

export function GlasMenuTarget({ entityId, name, children }: GlasMenuTargetProps) {
  const ref = useRef<HTMLElement | null>(null);
  const handlers = useGlasContextMenu(ref, entityId, name);
  const own = children.props;
  const childRef = own.ref;
  const mergedRef = useCallback(
    (el: HTMLElement | null) => {
      ref.current = el;
      setRef(childRef, el);
    },
    [childRef],
  );
  const merged: Record<string, unknown> = { ref: mergedRef };
  for (const key of Object.keys(handlers) as (keyof GlasMenuHandlers)[]) {
    const mine = handlers[key] as ((e: React.SyntheticEvent) => void) | undefined;
    const theirs = own[key] as ((e: React.SyntheticEvent) => void) | undefined;
    merged[key] = theirs
      ? (e: React.SyntheticEvent) => {
          theirs(e);
          mine?.(e);
        }
      : mine;
  }
  return cloneElement(children, merged as Partial<ChildProps>);
}
