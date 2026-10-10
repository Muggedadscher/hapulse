/**
 * [fork] The summary chips' counts and labels (docs/glas/PLAN-ETAPPE-5.md K97): one count in core (`chipCounts`) for
 * the chips in both styles and, in Glas, for the subtitles of their windows ("5 an", "2 offen") — the same words, so a
 * window never disagrees with its chip, wherever it was opened from (chip bar or hints card).
 */

import { useShallow } from 'zustand/react/shallow';
import { chipCounts } from '@hapulse/core';
import type { ChipCounts, HassEntityMap } from '@hapulse/core';
import { POOL_ENTITIES, POOL_REQUIRED_ENTITIES } from '../pool/poolConfig';
import { summaryText } from '../garage/garageText';
import { lockSummaryText } from '../security/lockLogic';
import { useEntityStore } from '../../stores/entityStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useIsGlas } from '../../app/glas/useUiStyle';
import { useStateLabel, useT } from '../../i18n/useT';
import type { StateLabel, TFunction } from '../../i18n/useT';

export type ChipId = 'people' | 'lights' | 'doors' | 'alarm' | 'media' | 'pool' | 'garage' | 'locks';

/** The chips' counts, with the pool's entity ids. */
export function summaryCounts(entities: HassEntityMap): ChipCounts {
  return chipCounts(entities, { poolPump: POOL_ENTITIES.pump, poolRequired: POOL_REQUIRED_ENTITIES });
}

/** Each chip's label, as the chip shows it. */
export function chipLabels(c: ChipCounts, t: TFunction, sl: StateLabel): Record<ChipId, string> {
  const people = c.peopleHome.length;
  return {
    people: people > 0 ? t('home.summaryChips.peopleCount', { count: people }) : t('home.summaryChips.nobodyHome'),
    lights: c.lightsOn > 0 ? t('home.summaryChips.lightsCount', { count: c.lightsOn }) : t('home.summaryChips.allOff'),
    doors: c.openDoorWindow > 0 ? t('home.summaryChips.openCount', { count: c.openDoorWindow }) : t('home.summaryChips.allClosed'),
    alarm: c.alarm?.state ? sl('alarm_control_panel', c.alarm.state) : t('home.summaryChips.unknown'),
    media: c.mediaPlaying > 0 ? t('home.summaryChips.mediaCount', { count: c.mediaPlaying }) : t('home.summaryChips.nothingPlaying'),
    pool: c.pool.running ? t('home.summaryChips.poolRunning') : t('home.summaryChips.poolIdle'),
    garage: summaryText(t, c.garages, t('home.summaryChips.allClosed')),
    locks: lockSummaryText(t, c.locks, t('home.summaryChips.locksAllLocked')),
  };
}

function withoutHidden(entities: HassEntityMap, hidden: readonly string[]): HassEntityMap {
  if (hidden.length === 0) return entities;
  const set = new Set(hidden);
  return Object.fromEntries(Object.entries(entities).filter(([id]) => !set.has(id)));
}

/**
 * Glas: a chip window's subtitle — the chip's label over the same entities as the chip bar (hidden ones left out) —
 * and its class `g-chip-window` (sheets.css raises the first letter of the lower-case texts, "Alle aus"). Both undefined
 * in Klassisch, which keeps its DOM; the subtitle also while the window is closed, so a closed window re-renders on no
 * entity change.
 */
export function useChipWindow(id: ChipId, open: boolean): { subtitle: string | undefined; windowClass: string | undefined } {
  const glas = useIsGlas();
  const t = useT();
  const sl = useStateLabel();
  const hidden = useSettingsStore(useShallow((s) => s.customization.hiddenEntities));
  const subtitle = useEntityStore((s) => {
    if (!glas || !open) return undefined;
    return chipLabels(summaryCounts(withoutHidden(s.entities, hidden)), t, sl)[id];
  });
  return { subtitle, windowClass: glas ? 'g-chip-window' : undefined };
}
