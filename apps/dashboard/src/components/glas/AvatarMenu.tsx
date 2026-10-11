/**
 * [fork] Glas frame (stage 2) — the phone's avatar with its menu (GLAS-DESIGN §7.4, plan docs/glas/PLAN-ETAPPE-2.md
 * §3.2, §3.3). `PageHeaderActions` renders it in Glas instead of bell and avatar; fixed at the top right.
 *
 * Menu: notifications (the notifications sheet, docs/glas/PLAN-ETAPPE-3.md K57), edit (only where the page offers
 * it, K23), settings — and a host-supplied account menu (SaaS) below a separator. `role="menu"`, focus on the first
 * item, arrows/Home/End, Esc, Tab and outside click close it and the focus returns to the avatar (useGlasMenu, shared
 * with a page head's "⋯" menu since stage 7).
 */

import { useCallback, useContext, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router';
import { Bell, Check, Pencil, Settings, UserRound } from 'lucide-react';
import { useNotifications } from '../notifications/NotificationsPanel';
import { NotificationsSheet } from './NotificationsSheet';
import { UserMenuContext, DashboardNavContext } from '../../app/userMenuContext';
import { useCanEditHere } from '../../app/glas/shellStore';
import { useGlasMenu } from '../../app/glas/useGlasMenu';
import { useCurrentUserAvatar } from '../../ha/hooks';
import { useUIStore } from '../../stores/uiStore';
import { useT } from '../../i18n/useT';

export function AvatarMenu() {
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const avatar = useCurrentUserAvatar();
  const hostMenu = useContext(UserMenuContext);
  const notifications = useNotifications();
  const canEditHere = useCanEditHere();
  const editMode = useUIStore((s) => s.editMode);
  const toggleEditMode = useUIStore((s) => s.toggleEditMode);
  const menu = useGlasMenu();
  const { phase, open, close: closeMenu, buttonRef } = menu;
  const [sheetOpen, setSheetOpen] = useState(false);
  const count = notifications.length;

  // a new route closes the sheet too (the menu closes itself)
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const avatarButton = useCallback(() => buttonRef.current, [buttonRef]);

  const run = (action: () => void) => {
    closeMenu(false);
    action();
  };

  const handleHostNav = useCallback(
    (to: string) => {
      closeMenu(false);
      void navigate(to);
    },
    [closeMenu, navigate],
  );

  const account = avatar ? t('glas.avatar.account', { name: avatar.name }) : t('glas.avatar.accountNoName');
  const label = count > 0 ? t('glas.avatar.labelUnread', { account, count }) : t('glas.avatar.label', { account });

  return (
    <div className="g-avatar">
      <button
        ref={buttonRef}
        type="button"
        className="g-avatar__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={menu.toggle}
        onKeyDown={menu.onButtonKeyDown}
      >
        <span className="g-avatar__glass" aria-hidden="true">
          {avatar?.pictureUrl ? (
            <img className="g-avatar__img" src={avatar.pictureUrl} alt="" draggable={false} />
          ) : avatar ? (
            <span className="g-avatar__initial">{avatar.initial}</span>
          ) : (
            <UserRound size={20} strokeWidth={1.75} />
          )}
        </span>
        {count > 0 && <span className="g-avatar__dot" aria-hidden="true" />}
      </button>

      {phase !== 'closed' &&
        ReactDOM.createPortal(
          <>
            <div className={`g-avatar-dim${phase === 'closing' ? ' g-avatar-dim--closing' : ''}`} aria-hidden="true" />
            <div
              ref={menu.menuRef}
              className={`g-avatar-menu${phase === 'closing' ? ' g-avatar-menu--closing' : ''}`}
              role="menu"
              aria-label={t('glas.avatar.menuLabel')}
              onKeyDown={menu.onMenuKeyDown}
              onAnimationEnd={menu.onMenuAnimationEnd}
            >
              <div className="g-avatar-menu__content">
                <button
                  type="button"
                  role="menuitem"
                  className="g-avatar-menu__item"
                  onClick={() => run(() => setSheetOpen(true))}
                >
                  <span className="g-avatar-menu__text">
                    {count > 0 ? t('glas.avatar.notificationsCount', { count }) : t('glas.avatar.notifications')}
                  </span>
                  <Bell className="g-avatar-menu__icon" size={20} strokeWidth={1.75} aria-hidden="true" />
                </button>
                {canEditHere && (
                  <button
                    type="button"
                    role="menuitem"
                    className="g-avatar-menu__item"
                    onClick={() => run(toggleEditMode)}
                  >
                    <span className="g-avatar-menu__text">{editMode ? t('glas.avatar.editDone') : t('glas.avatar.edit')}</span>
                    {editMode ? (
                      <Check className="g-avatar-menu__icon g-avatar-menu__icon--on" size={20} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <Pencil className="g-avatar-menu__icon" size={20} strokeWidth={1.75} aria-hidden="true" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  className="g-avatar-menu__item"
                  onClick={() => run(() => void navigate('/settings'))}
                >
                  <span className="g-avatar-menu__text">{t('nav.settings')}</span>
                  <Settings className="g-avatar-menu__icon" size={20} strokeWidth={1.75} aria-hidden="true" />
                </button>
                {hostMenu != null && (
                  <>
                    <div className="g-avatar-menu__sep" role="separator" />
                    <DashboardNavContext.Provider value={handleHostNav}>
                      <div className="g-avatar-menu__host">{hostMenu}</div>
                    </DashboardNavContext.Provider>
                  </>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}

      <NotificationsSheet
        open={sheetOpen}
        onClose={closeSheet}
        notifications={notifications}
        returnFocus={avatarButton}
      />
    </div>
  );
}
