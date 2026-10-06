/**
 * PageHeaderActions — right-side cluster for a page header row.
 *
 * Renders the mobile-only bell + avatar (on desktop these live in the shell
 * header cluster) followed by the page's own actions (e.g. EditToggle) passed as
 * children. Mirrors how the Home page lays out its greeting row on mobile:
 * title/back on the left, bell + avatar + edit toggle grouped on the right.
 */

import React from 'react';
import { NotificationsPanel } from '../notifications/NotificationsPanel';
import { UserAvatar } from './UserAvatar';
import { useCurrentUserAvatar } from '../../ha/hooks';
import { useIsGlas } from '../../app/glas/useUiStyle'; // [fork] Glas (docs/glas/PLAN-ETAPPE-2.md §3.2)
import { AvatarMenu } from '../glas/AvatarMenu'; // [fork]
import './PageHeaderActions.css';

interface PageHeaderActionsProps {
  /** Page-specific actions (e.g. <EditToggle/>), shown on all breakpoints. */
  children?: React.ReactNode;
}

export function PageHeaderActions({ children }: PageHeaderActionsProps) {
  const avatarInfo = useCurrentUserAvatar();
  const glas = useIsGlas(); // [fork]

  // [fork] Glas: the avatar with its menu (notifications, edit, settings) instead of bell + avatar
  if (glas) {
    return (
      <div className="page-header-actions">
        <div className="page-header-actions__mobile"><AvatarMenu /></div>
        {children}
      </div>
    );
  }

  return (
    <div className="page-header-actions">
      {/* Bell + avatar: mobile only — desktop shows these in the shell header. */}
      <div className="page-header-actions__mobile">
        <NotificationsPanel />
        {avatarInfo && (
          <UserAvatar
            name={avatarInfo.name}
            pictureUrl={avatarInfo.pictureUrl}
            initial={avatarInfo.initial}
            interactive
          />
        )}
      </div>
      {children}
    </div>
  );
}
