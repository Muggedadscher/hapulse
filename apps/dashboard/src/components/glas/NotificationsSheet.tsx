/**
 * [fork] Glas windows (stage 3) — notifications on the phone (plan docs/glas/PLAN-ETAPPE-3.md §3.9, K57; sketch
 * g5h-notifications-l). The avatar menu opens it below 900 px; on the desktop the bell keeps its glass popover.
 *
 * Subtitle "N unread" (HA has no read state: a notification counts until it is dismissed, like the avatar's dot), a
 * row "N notifications" + "Dismiss all", rows newest first with title, text and time, × per row. "Dismiss all" keeps
 * the sheet open and shows the empty state once HA reports the empty list. A row swipes to the left to "Dismiss"
 * (stage 3b, K59; the × is its twin for keyboards and screen readers).
 */

import { useEffect, useMemo, useRef } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import type { HANotification } from '../notifications/NotificationsPanel';
import { relativeTime } from '../security/roomUtils';
import { callService } from '../../ha/service';
import { useT } from '../../i18n/useT';
import { createdMs, newestFirst } from './notificationOrder';
import { SwipeRow } from './SwipeRow';

interface NotificationsSheetProps {
  open: boolean;
  onClose: () => void;
  notifications: HANotification[];
  /** The avatar button: the menu item that opened the sheet is gone by the time it closes. */
  returnFocus: () => HTMLElement | null;
}

export function NotificationsSheet({ open, onClose, notifications, returnFocus }: NotificationsSheetProps) {
  const t = useT();
  const rows = useMemo(() => newestFirst(notifications), [notifications]);
  const count = rows.length;
  const rootRef = useRef<HTMLDivElement>(null);
  /** The focus sat on a button that a dismiss takes away: that row's index, or -1 for "Dismiss all". */
  const lostFocus = useRef<number | null>(null);

  // Once HA has removed it, the focus moves to the × of the row now in its place (or the last one), and to the window
  // when the list is empty — instead of falling back to the page under the sheet.
  useEffect(() => {
    const at = lostFocus.current;
    const root = rootRef.current;
    if (at === null || !root) return;
    const active = document.activeElement;
    if (active && active !== document.body) {
      if (!root.contains(active)) lostFocus.current = null; // the user moved on
      return; // still there: HA has not removed it yet
    }
    lostFocus.current = null;
    const buttons = root.querySelectorAll<HTMLElement>('.g-notes__dismiss');
    const next = at >= 0 ? buttons[Math.min(at, buttons.length - 1)] : undefined;
    (next ?? root.closest<HTMLElement>('[role="dialog"]'))?.focus();
  }, [rows]);

  const dismiss = (id: string, index: number, button: HTMLElement | null) => {
    if (button && document.activeElement === button) lostFocus.current = index;
    void callService('persistent_notification', 'dismiss', { notification_id: id });
  };

  const dismissAll = (button: HTMLElement) => {
    if (document.activeElement === button) lostFocus.current = -1;
    void callService('persistent_notification', 'dismiss_all', {});
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('notifications.title')}
      subtitle={count > 0 ? t('glas.notifications.unread', { count }) : t('glas.notifications.none')}
      icon={<Bell size={18} strokeWidth={1.75} />}
      returnFocus={returnFocus}
    >
      <div className="g-notes" ref={rootRef}>
        {count === 0 ? (
          <EmptyState
            icon={<BellOff size={28} strokeWidth={1.75} />}
            title={t('notifications.empty')}
            description={t('glas.notifications.emptyHint')}
          />
        ) : (
          <>
            <div className="g-notes__head">
              <span className="g-notes__count">{t('glas.notifications.count', { count })}</span>
              <button type="button" className="g-notes__all" onClick={(e) => dismissAll(e.currentTarget)}>
                {t('glas.notifications.dismissAll')}
              </button>
            </div>
            <ul className="g-notes__list">
              {rows.map((n, i) => {
                const time = n.createdAt && createdMs(n) !== null ? relativeTime(t, n.createdAt) : null;
                return (
                  <SwipeRow
                    key={n.notificationId}
                    label={t('glas.swipe.dismiss')}
                    tone="del"
                    width={104}
                    onAction={() => dismiss(n.notificationId, i, null)}
                  >
                    <li className="g-notes__row">
                      <div className="g-notes__text">
                        <p className="g-notes__title">{n.title}</p>
                        {n.message && <p className="g-notes__message">{n.message}</p>}
                        {time && <p className="g-notes__time">{time}</p>}
                      </div>
                      <button
                        type="button"
                        className="g-notes__dismiss"
                        aria-label={t('glas.notifications.dismissOne', { title: n.title })}
                        onClick={(e) => dismiss(n.notificationId, i, e.currentTarget)}
                      >
                        <X size={16} strokeWidth={2.5} aria-hidden="true" />
                      </button>
                    </li>
                  </SwipeRow>
                );
              })}
            </ul>
            <p className="g-notes__hint">{t('glas.swipe.hint')}</p>
          </>
        )}
      </div>
    </Modal>
  );
}
