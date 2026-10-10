/**
 * [fork] Glas, phone: the values on the right of the More menu's rows and its foot (docs/GLAS-DESIGN.md §7.18 "Mehr",
 * docs/glas/PLAN-ETAPPE-5.md K97) — the energy used today ("8,4 kWh", as on the energy card), the number of scenes
 * and the system's state ("Normal"), and below the list "Version 1.3.2 · F38". The menu stays mounted (also on the
 * desktop, where it never opens). A value is read only while the menu is open: its probe mounts with the menu and
 * reports the text before the paint; while the menu is closed (and slides out) the last text stays and nothing is
 * read or counted. Today's energy is fetched only while it is open (a remembered figure shows at once).
 */

import { useLayoutEffect, useState } from 'react';
import { CURRENT_FORK_VERSION, CURRENT_VERSION, forkLabel, formatNumber } from '@hapulse/core';
import { useEnergyWindow } from '../../ha/useEnergyWindow';
import { useSystemHealth } from '../../ha/useSystemHealth';
import { useEntityStore } from '../../stores/entityStore';
import { useLocale, useT } from '../../i18n/useT';
import type { TKey } from '../../i18n/useT';
import { energyFigure } from './home/energyFigure';

type Report = (text: string | null) => void;

/** Hands the text to the row before the paint (null: no value). */
function useReport(report: Report, text: string | null): void {
  useLayoutEffect(() => {
    report(text);
  }, [report, text]);
}

const PROBES: Partial<Record<string, (props: { report: Report }) => null>> = {
  energy: EnergyProbe,
  scenes: ScenesProbe,
  system: SystemProbe,
};

export function GlasMoreValue({ id, open }: { id: string; open: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const Probe = PROBES[id];
  if (!Probe) return null;
  return (
    <>
      {open && <Probe report={setText} />}
      {text && <span className="g-more-value">{text}</span>}
    </>
  );
}

/** Today's energy; nothing while today's figure is not there (loading, failed, another day's, no energy set up). */
function EnergyProbe({ report }: { report: Report }) {
  const locale = useLocale();
  const { state, data, stale } = useEnergyWindow('day');
  const text =
    state === 'ready' && data && !stale ? `${energyFigure(data.dashboard.homeConsumption, locale)} kWh` : null;
  useReport(report, text);
  return null;
}

/** All scenes, like the scenes page's hero. */
function ScenesProbe({ report }: { report: Report }) {
  const locale = useLocale();
  const count = useEntityStore((s) => {
    let n = 0;
    for (const id in s.entities) if (id.startsWith('scene.')) n++;
    return n;
  });
  useReport(report, formatNumber(count, locale));
  return null;
}

/** The status pill's states in one word ("Normal", "Ausgelastet", "Kritisch"); counts as there ("3 nicht verfügbar"). */
const SHORT: Partial<Record<TKey, TKey>> = {
  'nav.systemStatus.healthy': 'glas.more.system.healthy',
  'nav.systemStatus.warning': 'glas.more.system.warning',
  'nav.systemStatus.critical': 'glas.more.system.critical',
};

function SystemProbe({ report }: { report: Report }) {
  const t = useT();
  const { titleKey, titleCount } = useSystemHealth();
  const text =
    titleKey === 'nav.systemStatus.unknown'
      ? null
      : t(SHORT[titleKey] ?? titleKey, titleCount != null ? { count: titleCount } : undefined);
  useReport(report, text);
  return null;
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
