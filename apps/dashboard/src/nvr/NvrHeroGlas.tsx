/**
 * [fork] The NVR overview's hero in Glas, a tafel like the other pages' heads (plan docs/glas/PLAN-TAFELN.md,
 * GLAS-DESIGN §7.34): the camera symbol in a circle, "Sentinel NVR", the state large in its colour
 * (all cameras online, or what is wrong), the values as the tafel's grid (events today, recording, storage used,
 * retention). The facts are the package hero's (`Hero` in @sentinel-nvr/web/ui, which Klassisch keeps): a lost
 * storage root outranks the cameras, a stalled recording counts as online and is named, every problem is red like
 * the package's pill; the retention target out of reach is the one value in warnInk. Looks in styles/glas/tafel.css.
 */

import React from 'react';
import { CalendarClock, Cctv, CircleDot, HardDrive, Zap } from 'lucide-react';
import {
  fmtCount,
  sentinelHumanBytes,
  sentinelRecordingState,
  sentinelStorageForecast,
} from '@sentinel-nvr/web/api';
import type { SentinelCamera, SentinelStats } from '@sentinel-nvr/web/api';
import { Card } from '../components/ui/Card';
import { TafelGrid, TafelHead, TAFEL_ICON } from '../components/glas/tafel/Tafel';
import type { TafelFigure } from '../components/glas/tafel/Tafel';
import { useLocale, useT } from '../i18n/useT';
import { fmtDays } from './format';

interface NvrHeroGlasProps {
  cameras: SentinelCamera[];
  stats: SentinelStats;
}

/** "14 Tage" → value "14", unit "Tage", as the package hero splits it; anything else stays whole */
function splitCount(text: string): { value: string; unit?: string } {
  const m = /^(\d+)\s+(.+)$/.exec(text);
  return m ? { value: m[1]!, unit: m[2]! } : { value: text };
}

export function NvrHeroGlas({ cameras, stats }: NvrHeroGlasProps) {
  const t = useT();
  const locale = useLocale();
  const stalled = cameras.filter((c) => sentinelRecordingState(c) === 'stalled').length;
  const online = cameras.filter((c) => c.online || sentinelRecordingState(c) === 'stalled').length;
  const offline = Math.max(0, stats.cameras - online);
  const problems = [
    offline > 0 ? t('nvr.hero.offline', { count: offline }) : null,
    stalled > 0 ? t('nvr.hero.stalled', { count: stalled }) : null,
  ].filter((p): p is string => p !== null);
  const storageLost = stats.storageOk === false;
  const ok = !storageLost && problems.length === 0;
  // a line breaks between the problems, not inside one ("1 Kamera offline · 1 Aufnahme hängt")
  const parts = storageLost ? [t('nvr.hero.storageProblem')] : ok ? [t('nvr.hero.allOnline')] : problems;
  const fc = sentinelStorageForecast(stats);
  const bytes = sentinelHumanBytes(stats.bytes, locale);
  const retention = fc.spanDays ? splitCount(fmtDays(fc.spanDays, t)) : { value: '–' };
  const icon = (I: typeof Zap) => <I size={TAFEL_ICON} strokeWidth={2} />;

  const items: TafelFigure[] = [
    { key: 'events', icon: icon(Zap), label: t('nvr.hero.eventsToday'), value: fmtCount(stats.eventsToday, locale) },
    {
      key: 'recording',
      icon: icon(CircleDot),
      label: t('nvr.hero.recording'),
      value: `${fmtCount(stats.recording, locale)}/${fmtCount(stats.cameras, locale)}`,
    },
    { key: 'storage', icon: icon(HardDrive), label: t('nvr.hero.storageUsed'), value: bytes.value, unit: bytes.unit },
    {
      key: 'retention',
      icon: icon(CalendarClock),
      label: t('nvr.hero.retention'),
      value: retention.value,
      unit: retention.unit,
      // the retention target out of reach: the storage card says why
      tone: fc.status === 'unreachable' ? 'warn' : 'none',
    },
  ];

  return (
    <Card className={`g-nvr-hero g-nvr-hero--${ok ? 'ok' : 'problem'} g-tafel`}>
      <TafelHead
        icon={<Cctv size={28} strokeWidth={1.75} />}
        tone={ok ? 'ok' : 'danger'}
        kicker={t('nvr.hero.title')}
        titleHint={storageLost ? stats.storageProblem : undefined}
        title={parts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && ' · '}
            <span className="g-tafel__part">{part}</span>
          </React.Fragment>
        ))}
      />
      <TafelGrid items={items} label={t('nvr.hero.title')} />
    </Card>
  );
}
