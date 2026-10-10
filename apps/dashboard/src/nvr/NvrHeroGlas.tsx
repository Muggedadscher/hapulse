/**
 * [fork] The NVR overview's hero in Glas (plan docs/glas/PLAN-ETAPPE-7.md N2): calm like the heroes of security and
 * system (K90) — the symbol in a circle, "Sentinel NVR", the state large in its colour (all cameras online, or what is
 * wrong), the values as chips (events today, recording, storage used, retention). The facts are the package hero's
 * (`Hero` in @sentinel-nvr/web/ui, which Klassisch keeps): a lost storage root outranks the cameras, a stalled
 * recording counts as online and is named. Looks in styles/glas/nvr.css.
 */

import React from 'react';
import { Cctv } from 'lucide-react';
import {
  fmtCount,
  sentinelHumanBytes,
  sentinelRecordingState,
  sentinelStorageForecast,
} from '@sentinel-nvr/web/api';
import type { SentinelCamera, SentinelStats } from '@sentinel-nvr/web/api';
import { Card } from '../components/ui/Card';
import { useLocale, useT } from '../i18n/useT';
import { fmtDays } from './format';

interface NvrHeroGlasProps {
  cameras: SentinelCamera[];
  stats: SentinelStats;
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
  ].filter(Boolean);
  const storageLost = stats.storageOk === false;
  const ok = !storageLost && problems.length === 0;
  // a line breaks between the problems, not inside one ("1 Kamera offline · 1 Aufnahme hängt")
  const parts = storageLost ? [t('nvr.hero.storageProblem')] : ok ? [t('nvr.hero.allOnline')] : problems;
  const fc = sentinelStorageForecast(stats);
  const bytes = sentinelHumanBytes(stats.bytes, locale);
  const chips: { key: string; value: string; warn?: boolean }[] = [
    { key: t('nvr.hero.eventsToday'), value: fmtCount(stats.eventsToday, locale) },
    { key: t('nvr.hero.recording'), value: `${stats.recording}/${stats.cameras}` },
    { key: t('nvr.hero.storageUsed'), value: `${bytes.value} ${bytes.unit}` },
    // the retention target out of reach: the storage card says why
    { key: t('nvr.hero.retention'), value: fc.spanDays ? fmtDays(fc.spanDays, t) : '–', warn: fc.status === 'unreachable' },
  ];

  return (
    <Card className={`g-nvr-hero g-nvr-hero--${ok ? 'ok' : 'problem'}`}>
      <div className="g-nvr-hero__main">
        <span className="g-nvr-hero__icon" aria-hidden="true">
          <Cctv size={28} strokeWidth={1.75} />
        </span>
        <div className="g-nvr-hero__text">
          <p className="g-nvr-hero__label">{t('nvr.hero.title')}</p>
          <p className="g-nvr-hero__state" title={storageLost ? stats.storageProblem : undefined}>
            {parts.map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && ' · '}
                <span className="g-nvr-hero__part">{part}</span>
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>
      <ul className="g-nvr-hero__chips">
        {chips.map((c) => (
          <li key={c.key} className="g-nvr-hero__chip" data-warn={c.warn ? '' : undefined}>
            <span className="g-nvr-hero__key">{c.key}</span>
            <span className="g-nvr-hero__value">{c.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
