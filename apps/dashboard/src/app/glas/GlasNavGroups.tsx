/**
 * [fork] Glas frame (stage 2) — the sidebar's groups "Zuhause", "Bereiche", "System" (GLAS-DESIGN §7.2, E10; plan
 * docs/glas/PLAN-ETAPPE-2.md §4.1). AppLayout renders this instead of its flat list in Glas outside edit mode; the
 * entries themselves still come from AppLayout's `renderSidebarItem` (NavLink, rooms button with its refs). The lens
 * glides to the active entry; while the rooms menu is open it sits on "Räume".
 */

import { useRef, type ReactNode } from 'react';
import { navGroups } from './navGroups';
import { useLens } from './useLens';
import { useT, type TKey } from '../../i18n/useT';

interface GlasNavGroupsProps {
  /** All nav ids in the user's order. */
  ids: readonly string[];
  hidden: readonly string[];
  renderItem: (id: string) => ReactNode;
}

const GROUP_LABEL: Record<string, TKey> = {
  home: 'glas.nav.group.home',
  areas: 'glas.nav.group.areas',
  system: 'glas.nav.group.system',
};

/** The open rooms menu wins over the route's entry (the popover belongs to "Räume"). */
function pickActive(box: HTMLElement): HTMLElement | null {
  return (
    box.querySelector<HTMLElement>('.sidebar-nav__item--active[aria-expanded="true"]')
    ?? box.querySelector<HTMLElement>('.sidebar-nav__item--active')
  );
}

export function GlasNavGroups({ ids, hidden, renderItem }: GlasNavGroupsProps) {
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  useLens(boxRef, { pick: pickActive, insetY: 2, enabled: true });

  return (
    <div ref={boxRef} className="g-navgroups">
      <div className="g-navgroups__lens" aria-hidden="true" />
      {navGroups(ids, hidden).map((group) => (
        <div key={group.id} className="g-navgroup" role="group" aria-labelledby={`g-navgroup-${group.id}`}>
          <div id={`g-navgroup-${group.id}`} className="g-navgroup__title">
            {t(GROUP_LABEL[group.id]!)}
          </div>
          <ul className="sidebar-nav__list" role="list">
            {group.ids.map((id) => renderItem(id))}
          </ul>
        </div>
      ))}
    </div>
  );
}
