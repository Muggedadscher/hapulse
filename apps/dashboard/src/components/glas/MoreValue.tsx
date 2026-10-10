/**
 * [fork] Glas, phone: the values on the right of the More menu's rows and its foot (docs/GLAS-DESIGN.md §7.18 "Mehr",
 * docs/glas/PLAN-ETAPPE-5.md K97) — the energy used today ("8,4 kWh", as on the energy card), the number of scenes
 * and the system's state ("Normal"), and below the list "Version 1.3.2 · F38". The menu stays mounted (also on the
 * desktop, where it never opens), so nothing is counted before it has been opened once, and today's energy is fetched
 * only while it is open (a remembered figure shows at once).
 */

import { useState } from 'react';
import { CURRENT_FORK_VERSION, CURRENT_VERSION, forkLabel, formatNumber } from '@hapulse/core';
import { useEnergyWindow } from '../../ha/useEnergyWindow';
import { useSystemHealth } from '../../ha/useSystemHealth';
import { useEntityStore } from '../../stores/entityStore';
import { useLocale, useT } from '../../i18n/useT';
import type { TKey } from '../../i18n/useT';
import { energyFigure } from './home/EnergyGlas';

const WITH_VALUE = new Set(['energy', 'scenes', 'system']);

export function GlasMoreValue({ id, open }: { id: string; open: boolean }) {
  const [seen, setSeen] = useState(open);
  if (open && !seen) setSeen(true);
  if (!seen || !WITH_VALUE.has(id)) return null;
  if (id === 'energy') return <EnergyValue open={open} />;
  if (id === 'scenes') return <ScenesValue />;
  return <SystemValue />;
}

function EnergyValue({ open }: { open: boolean }) {
  const locale = useLocale();
  const { state, data } = useEnergyWindow('day', open);
  if (state !== 'ready' || !data) return null;
  return <span className="g-more-value">{energyFigure(data.dashboard.homeConsumption, locale)} kWh</span>;
}

/** All scenes, like the scenes page's hero. */
function ScenesValue() {
  const locale = useLocale();
  const count = useEntityStore((s) => {
    let n = 0;
    for (const id in s.entities) if (id.startsWith('scene.')) n++;
    return n;
  });
  return <span className="g-more-value">{formatNumber(count, locale)}</span>;
}

/** The status pill's states in one word ("Normal", "Ausgelastet", "Kritisch"); counts as there ("3 nicht verfügbar"). */
const SHORT: Partial<Record<TKey, TKey>> = {
  'nav.systemStatus.healthy': 'glas.more.system.healthy',
  'nav.systemStatus.warning': 'glas.more.system.warning',
  'nav.systemStatus.critical': 'glas.more.system.critical',
};

function SystemValue() {
  const t = useT();
  const { titleKey, titleCount } = useSystemHealth();
  if (titleKey === 'nav.systemStatus.unknown') return null;
  const text = t(SHORT[titleKey] ?? titleKey, titleCount != null ? { count: titleCount } : undefined);
  return <span className="g-more-value">{text}</span>;
}

/** Hidden from screen readers: the menu holds menu items only; the version is in the settings' "About". */
export function GlasMoreFoot() {
  const t = useT();
  return (
    <div className="g-more-foot" aria-hidden="true">
      {t('settings.about.version', { version: `${CURRENT_VERSION} · ${forkLabel(CURRENT_FORK_VERSION)}` })}
    </div>
  );
}
