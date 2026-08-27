/**
 * FullQueueList — the scrollable, editable queue item list (issue #2).
 *
 * Fed by the direct Music Assistant connection (or the demo's in-memory
 * queue): every queued track, drag-to-reorder (dnd-kit vertical list — the
 * same stack as edit mode's grids, so mouse, touch and keyboard all work) and
 * per-row delete. Reorders apply optimistically and re-sync from the server
 * afterwards, so a failed call self-corrects.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { GripVertical, Music2, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getMAQueueItems, moveMAQueueItem, deleteMAQueueItem } from '../../ha/service';
import type { MAFullQueueItem } from '@hapulse/core';
import { useT } from '../../i18n/useT';

interface FullQueueListProps {
  queueId: string;
  /** Name of the playing item — highlights its row. */
  currentName: string | null;
  /** Bumps whenever the summary refreshes, to keep the list in step. */
  refreshToken: number;
  /** Reports load failures so the card can fall back to the summary rows. */
  onAvailabilityChange: (available: boolean) => void;
}

export function FullQueueList({ queueId, currentName, refreshToken, onAvailabilityChange }: FullQueueListProps) {
  const t = useT();
  const [items, setItems] = useState<MAFullQueueItem[] | null>(null);

  const reload = useCallback(() => {
    void getMAQueueItems(queueId).then((list) => {
      setItems(list);
      onAvailabilityChange(list != null);
    });
  }, [queueId, onAvailabilityChange]);

  useEffect(() => {
    reload();
  }, [reload, refreshToken]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (items == null || over == null || active.id === over.id) return;
      const from = items.findIndex((i) => i.queueItemId === active.id);
      const to = items.findIndex((i) => i.queueItemId === over.id);
      if (from < 0 || to < 0) return;
      setItems(arrayMove(items, from, to)); // optimistic
      void moveMAQueueItem(queueId, String(active.id), from, to)
        .catch(() => undefined)
        .then(reload); // server order wins either way
    },
    [items, queueId, reload],
  );

  const handleDelete = useCallback(
    (queueItemId: string) => {
      if (items == null) return;
      setItems(items.filter((i) => i.queueItemId !== queueItemId)); // optimistic
      void deleteMAQueueItem(queueId, queueItemId)
        .catch(() => undefined)
        .then(reload);
    },
    [items, queueId, reload],
  );

  if (items == null || items.length === 0) return null;

  return (
    <div className="full-queue" role="list" aria-label={t('music.queue.listAria')}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.queueItemId)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <QueueItemRow
              key={item.queueItemId}
              item={item}
              isCurrent={currentName != null && item.name === currentName}
              onDelete={() => handleDelete(item.queueItemId)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function QueueItemRow({ item, isCurrent, onDelete }: {
  item: MAFullQueueItem;
  isCurrent: boolean;
  onDelete: () => void;
}) {
  const t = useT();
  const [imgFailed, setImgFailed] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.queueItemId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    ...(isDragging ? { zIndex: 5, position: 'relative' as const } : {}),
  };

  const duration = item.durationSeconds != null
    ? `${Math.floor(item.durationSeconds / 60)}:${String(Math.floor(item.durationSeconds % 60)).padStart(2, '0')}`
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`full-queue__row${isCurrent ? ' full-queue__row--current' : ''}${isDragging ? ' full-queue__row--dragging' : ''}`}
      role="listitem"
    >
      <button
        type="button"
        className="full-queue__grip"
        aria-label={t('music.queue.dragAria', { name: item.name })}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} strokeWidth={1.75} />
      </button>

      <span className="full-queue__art" aria-hidden="true">
        {item.image != null && !imgFailed ? (
          <img src={item.image} alt="" loading="lazy" onError={() => setImgFailed(true)} />
        ) : (
          <Music2 size={13} strokeWidth={1.75} />
        )}
      </span>

      <div className="full-queue__main">
        <span className="full-queue__name">{item.name}</span>
        {item.artist && <span className="full-queue__artist">{item.artist}</span>}
      </div>

      {duration && <span className="full-queue__duration">{duration}</span>}

      <button
        type="button"
        className="full-queue__delete"
        onClick={onDelete}
        aria-label={t('music.queue.removeAria', { name: item.name })}
        title={t('music.queue.removeAria', { name: item.name })}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
