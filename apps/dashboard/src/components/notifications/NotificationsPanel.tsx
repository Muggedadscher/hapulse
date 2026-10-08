import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Bell, X, CheckCheck, BellOff } from 'lucide-react';
import { useConnectionStore } from '../../stores/connectionStore';
import { callService, subscribeNotifications } from '../../ha/service';
import { useT } from '../../i18n/useT';
import { useIsGlas } from '../../app/glas/useUiStyle'; // [fork] Glas: bell 44 (docs/glas/PLAN-ETAPPE-2.md K41)
import { SwipeRow } from '../glas/SwipeRow'; // [fork] Glas: swipe a row to dismiss it (docs/glas/PLAN-ETAPPE-3.md K59)
import './NotificationsPanel.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HANotification { // [fork] exported: the Glas avatar menu shows the same list
  notificationId: string;
  title: string;
  message: string;
  createdAt?: string | undefined; // [fork] Glas notifications sheet shows "3 h ago" (docs/glas/PLAN-ETAPPE-3.md K57)
}

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

export function useNotifications(): HANotification[] { // [fork] exported (Glas avatar menu)
  const status = useConnectionStore((s) => s.status);
  const mode = useConnectionStore((s) => s.mode);
  const [list, setList] = useState<HANotification[]>([]);

  useEffect(() => {
    if (status !== 'connected') {
      setList([]);
      return;
    }
    const unsub = subscribeNotifications((notifs) => {
      setList(
        notifs.map((n) => ({
          notificationId: n.notification_id,
          title: n.title ?? n.notification_id.replace(/_/g, ' '),
          message: n.message ?? '',
          createdAt: n.created_at, // [fork] K57
        }))
      );
    });
    return unsub;
  }, [status, mode]);

  return list;
}

// ---------------------------------------------------------------------------
// Notification row
// ---------------------------------------------------------------------------

interface NotificationRowProps {
  notification: HANotification;
  onDismiss: (notifId: string) => void;
}

function NotificationRow({ notification, onDismiss }: NotificationRowProps) {
  const t = useT();
  return (
    <SwipeRow label={t('glas.swipe.dismiss')} tone="del" width={104} onAction={() => onDismiss(notification.notificationId)}>{/* [fork] Glas only */}
    <div className="notif-row">
      <div className="notif-row__body">
        {notification.title && (
          <p className="notif-row__title">{notification.title}</p>
        )}
        {notification.message && (
          <p className="notif-row__message">{notification.message}</p>
        )}
      </div>
      <button
        type="button"
        className="notif-row__dismiss"
        aria-label={t('notifications.dismissOne', { title: notification.title })}
        onClick={() => onDismiss(notification.notificationId)}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
    </SwipeRow> // [fork]
  );
}

// ---------------------------------------------------------------------------
// Panel (portaled, position: fixed computed from trigger rect)
// ---------------------------------------------------------------------------

interface PanelProps {
  panelRef: React.RefObject<HTMLDivElement | null>;
  style: React.CSSProperties;
  notifications: HANotification[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

function Panel({ panelRef, style, notifications, onDismiss, onDismissAll }: PanelProps) {
  const t = useT();
  const glas = useIsGlas(); // [fork]
  const count = notifications.length;
  return ReactDOM.createPortal(
    <div
      ref={panelRef}
      className="notifications-panel"
      role="dialog"
      aria-label={t('notifications.title')}
      aria-modal="false"
      style={style}
    >
      <div className="notifications-panel__header">
        <span className="notifications-panel__title">{t('notifications.title')}</span>
        {count > 0 && (
          <button
            type="button"
            className="notifications-panel__dismiss-all"
            onClick={onDismissAll}
            aria-label={t('notifications.dismissAll')}
          >
            <CheckCheck size={14} strokeWidth={2} />
            {t('notifications.dismissAllButton')}
          </button>
        )}
      </div>

      <div className="notifications-panel__body">
        {count === 0 ? (
          <div className="notifications-empty">
            <BellOff size={28} strokeWidth={1.5} />
            <p>{t('notifications.empty')}</p>
          </div>
        ) : (
          <div className="notifications-panel__list">
            {notifications.map((n) => (
              <NotificationRow
                key={n.notificationId}
                notification={n}
                onDismiss={onDismiss}
              />
            ))}
          </div>
        )}
        {glas && count > 0 && <p className="g-notes__hint">{t('glas.swipe.hint')}</p>}{/* [fork] Glas: the swipe hint */}
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NotificationsPanel() {
  const t = useT();
  const bell = useIsGlas() ? 44 : 40; // [fork] Glas: 44 inside the 48 glass capsule
  const notifications = useNotifications();
  const count = notifications.length;

  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Compute fixed position from trigger rect whenever panel opens.
  // On mobile, span the viewport with small side margins so the panel never
  // pokes off the left edge (the bell isn't the right-most item on most pages).
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const mobile = window.innerWidth <= 559;
    setPanelStyle(
      mobile
        ? { position: 'fixed', top: rect.bottom + 10, left: 8, right: 8 }
        : { position: 'fixed', top: rect.bottom + 10, right: window.innerWidth - rect.right }
    );
  }, [open]);

  // Click outside or Escape to close
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (
        panelRef.current && !panelRef.current.contains(t) &&
        triggerRef.current && !triggerRef.current.contains(t)
      ) {
        close();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  const handleDismiss = useCallback((notifId: string) => {
    void callService('persistent_notification', 'dismiss', { notification_id: notifId });
  }, []);

  const handleDismissAll = useCallback(() => {
    void callService('persistent_notification', 'dismiss_all', {});
    close();
  }, [close]);

  return (
    <div className="notifications-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="icon-btn icon-btn--ghost notifications-trigger"
        style={{ width: bell, height: bell, minWidth: bell, minHeight: bell }} // [fork] bell size
        aria-label={count > 0 ? t('notifications.unread', { count }) : t('notifications.title')}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell size={18} strokeWidth={1.75} />
        {count > 0 && (
          <span className="notifications-badge" aria-hidden="true">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <Panel
          panelRef={panelRef}
          style={panelStyle}
          notifications={notifications}
          onDismiss={handleDismiss}
          onDismissAll={handleDismissAll}
        />
      )}
    </div>
  );
}
