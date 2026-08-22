/**
 * UserAvatar — 44px circle showing the signed-in Home Assistant user.
 *
 * Shows the user's entity_picture when available, falling back to
 * the first letter of their name on the accent-soft background.
 *
 * Behavior when `interactive` (default true):
 *  - If a host supplied a menu via UserMenuContext (the SaaS account menu), the
 *    avatar is a dropdown trigger. The dropdown is portaled to <body> with fixed
 *    positioning (computed from the trigger rect) so it escapes page stacking
 *    contexts — mirrors NotificationsPanel.
 *  - Otherwise it navigates to /settings.
 * Pass `interactive={false}` for the Settings page identity row.
 */

import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router';
import { UserMenuContext, DashboardNavContext } from '../../app/userMenuContext';
import { useT } from '../../i18n/useT';
import './UserAvatar.css';

export interface UserAvatarProps {
  name: string;
  pictureUrl: string | null;
  initial: string;
  /** Whether the avatar is clickable (navigates to /settings or opens the host menu). Default: true. */
  interactive?: boolean;
}

export function UserAvatar({ name, pictureUrl, initial, interactive = true }: UserAvatarProps) {
  const t = useT();
  const navigate = useNavigate();
  const menu = useContext(UserMenuContext);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // In-SPA navigation for host menu items (e.g. "Dashboard settings") that also
  // closes the dropdown.
  const handleNav = useCallback(
    (to: string) => {
      setOpen(false);
      navigate(to);
    },
    [navigate],
  );

  // Position the portaled panel from the trigger rect each time it opens. The
  // avatar is the right-most header item, so anchor to its right edge.
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  // Close on outside click / Escape.
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

  const inner = pictureUrl ? (
    <img
      src={pictureUrl}
      alt={name}
      className="user-avatar__img"
      draggable={false}
    />
  ) : (
    <span className="user-avatar__initial" aria-hidden="true">
      {initial}
    </span>
  );

  // Menu mode — host supplied a dropdown (e.g. the SaaS account menu).
  if (interactive && menu) {
    return (
      <div className="user-avatar-menu">
        <button
          ref={triggerRef}
          type="button"
          className="user-avatar user-avatar--interactive"
          aria-label={t('userAvatar.account', { name })}
          aria-haspopup="menu"
          aria-expanded={open}
          title={name}
          onClick={() => setOpen((o) => !o)}
        >
          {inner}
        </button>
        {open &&
          ReactDOM.createPortal(
            <DashboardNavContext.Provider value={handleNav}>
              <div
                ref={panelRef}
                className="user-avatar-menu__panel"
                role="menu"
                style={panelStyle}
              >
                {menu}
              </div>
            </DashboardNavContext.Provider>,
            document.body,
          )}
      </div>
    );
  }

  if (interactive) {
    return (
      <button
        type="button"
        className="user-avatar user-avatar--interactive"
        aria-label={t('userAvatar.signedInSettings', { name })}
        title={name}
        onClick={() => navigate('/settings')}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className="user-avatar"
      title={name}
      aria-label={t('userAvatar.signedIn', { name })}
    >
      {inner}
    </div>
  );
}
