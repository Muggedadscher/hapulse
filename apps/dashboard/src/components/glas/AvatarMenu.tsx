/**
 * [fork] Glas frame (stage 2) — the phone's avatar with its menu (GLAS-DESIGN §7.4, plan docs/glas/PLAN-ETAPPE-2.md
 * §3.2, §3.3). `PageHeaderActions` renders it in Glas instead of bell and avatar; fixed at the top right.
 *
 * Menu: notifications (the notifications sheet, docs/glas/PLAN-ETAPPE-3.md K57), edit (only where the page offers
 * it, K23), settings — and a host-supplied account menu (SaaS) below a separator. `role="menu"`, focus on the first
 * item, arrows/Home/End, Esc, Tab and outside click close it and the focus returns to the avatar.
 */

import { useCallback, useContext, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router';
import { Bell, Check, Pencil, Settings, UserRound } from 'lucide-react';
import { useNotifications } from '../notifications/NotificationsPanel';
import { NotificationsSheet } from './NotificationsSheet';
import { UserMenuContext, DashboardNavContext } from '../../app/userMenuContext';
import { useCanEditHere } from '../../app/glas/shellStore';
import { nextMenuIndex } from '../../app/glas/menuKeys';
import { useCurrentUserAvatar } from '../../ha/hooks';
import { useUIStore } from '../../stores/uiStore';
import { useT } from '../../i18n/useT';

/** Longest closing animation (280 ms, reduced 200 ms) plus a margin, in case `animationend` never comes. */
const CLOSE_FALLBACK_MS = 400;
const FOCUSABLE = '[role="menuitem"], a[href], button:not([disabled])';

type Phase = 'closed' | 'open' | 'closing';

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
  const [phase, setPhase] = useState<Phase>('closed');
  const [sheetOpen, setSheetOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /** Which item gets the focus once the menu is open: first or last. */
  const focusEnd = useRef<'first' | 'last'>('first');
  const count = notifications.length;
  const open = phase === 'open';

  const items = () => [...(menuRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];

  const closeMenu = useCallback((focusAvatar: boolean) => {
    setPhase((p) => (p === 'open' ? 'closing' : p));
    if (focusAvatar) btnRef.current?.focus();
  }, []);

  // closing: unmount after the animation (or the fallback)
  useEffect(() => {
    if (phase !== 'closing') return undefined;
    const id = window.setTimeout(() => setPhase('closed'), CLOSE_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  // open: focus the first (or last) item
  useEffect(() => {
    if (!open) return;
    const list = items();
    (focusEnd.current === 'last' ? list[list.length - 1] : list[0])?.focus();
  }, [open]);

  // a new route closes everything
  useEffect(() => {
    setPhase((p) => (p === 'open' ? 'closing' : p));
    setSheetOpen(false);
  }, [pathname]);

  // outside click (also on the dim layer) and Escape — menu
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !btnRef.current?.contains(target)) closeMenu(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, closeMenu]);

  const toggle = () => {
    focusEnd.current = 'first';
    setPhase((p) => (p === 'open' ? 'closing' : 'open'));
  };

  const onTriggerKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    focusEnd.current = e.key === 'ArrowUp' ? 'last' : 'first';
    if (open) {
      const list = items();
      (e.key === 'ArrowUp' ? list[list.length - 1] : list[0])?.focus();
    } else {
      setPhase('open');
    }
  };

  const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      closeMenu(true);
      return;
    }
    const list = items();
    const next = nextMenuIndex(e.key, list.indexOf(document.activeElement as HTMLElement), list.length);
    if (next === null) return;
    e.preventDefault();
    list[next]!.focus();
  };

  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const avatarButton = useCallback(() => btnRef.current, []);

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
        ref={btnRef}
        type="button"
        className="g-avatar__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={toggle}
        onKeyDown={onTriggerKey}
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
              ref={menuRef}
              className={`g-avatar-menu${phase === 'closing' ? ' g-avatar-menu--closing' : ''}`}
              role="menu"
              aria-label={t('glas.avatar.menuLabel')}
              onKeyDown={onMenuKey}
              onAnimationEnd={(e) => {
                if (phase === 'closing' && e.target === e.currentTarget) setPhase('closed');
              }}
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
