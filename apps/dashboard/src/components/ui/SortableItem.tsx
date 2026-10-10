/**
 * SortableItem — wraps a single draggable item inside a SortableGrid.
 *
 * - Applies dnd-kit transform/transition styles.
 * - touch-action: none and cursor grab/grabbing ONLY when edit mode is active.
 * - Dragging item gets z-index lift + shadow + scale(1.02).
 * - All motion disabled under prefers-reduced-motion.
 *
 * When editMode is false, renders children in a plain fragment — the inner
 * DnD component is not mounted so useSortable is never called outside of a
 * SortableContext.
 */

import React, { useMemo } from 'react'; // [fork] useMemo
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { withoutBarDrag } from '../glas/edit/noDrag'; // [fork] Glas edit bar (K78)

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  /** When false, renders children plain — no DnD wrappers/hooks */
  editMode: boolean;
  /** Class applied to the wrapper div (e.g. grid-column span class) */
  className?: string | undefined;
}

const prefersReducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

/** Inner component — only mounted when editMode is true (always inside SortableContext) */
function SortableItemInner({ id, children, className }: { id: string; children: React.ReactNode; className?: string | undefined }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const dragListeners = useMemo(() => withoutBarDrag(listeners), [listeners]); // [fork] presses on the Glas bar stay its own

  const scaledTransform =
    isDragging && !prefersReducedMotion && transform
      ? { ...transform, scaleX: 1.02, scaleY: 1.02 }
      : transform;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(scaledTransform),
    transition: prefersReducedMotion ? undefined : transition ?? undefined,
    touchAction: 'none',
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 999 : undefined,
    boxShadow: isDragging
      ? '0 8px 32px -8px rgba(0,0,0,0.5), 0 0 0 1px var(--accent-soft)'
      : undefined,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className={className} {...attributes} {...dragListeners}>{/* [fork] dragListeners */}
      {children}
    </div>
  );
}

export function SortableItem({ id, children, editMode, className }: SortableItemProps) {
  if (!editMode) {
    return <>{children}</>;
  }
  return <SortableItemInner id={id} className={className}>{children}</SortableItemInner>;
}
