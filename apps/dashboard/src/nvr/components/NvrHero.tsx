/**
 * [fork] NVR hero — the overview's summary card in the Energy/Security hero
 * style: title row with icon chip + status pill, big "events today" figure and
 * four equal stat tiles (cameras online, recording, storage, retention).
 */

import React from 'react';
import { Cctv, Video, Database, Clock, Zap, Gauge } from 'lucide-react';
import { sentinelHumanBytes, sentinelStorageForecast } from '@hapulse/core';
import type { SentinelCamera, SentinelStats } from '@hapulse/core';
import { Card } from '../../components/ui/Card';
import { useT } from '../../i18n/useT';
import { fmtDays } from '../format';

type Tone = 'accent' | 'info' | 'positive' | 'danger' | 'neutral';

export function StatTile({ icon, label, value, unit, tone = 'neutral' }: {
  icon: React.ReactNode; label: string; value: string; unit?: string | undefined; tone?: Tone;
}) {
  return (
    <div className={`nvr-stat nvr-stat--${tone}`}>
      <span className="nvr-stat__icon" aria-hidden="true">{icon}</span>
      <div className="nvr-stat__body">
        <span className="nvr-stat__label">{label}</span>
        <span className="nvr-stat__value data-font">
          {value}
          {unit && <span className="nvr-stat__unit"> {unit}</span>}
        </span>
      </div>
    </div>
  );
}

export function CardTitle({ icon, title, sub, tone = 'accent', action }: {
  icon: React.ReactNode; title: string; sub?: string | undefined; tone?: Tone; action?: React.ReactNode;
}) {
  return (
    <div className="nvr-ctitle">
      <span className={`nvr-ctitle__chip nvr-ctitle__chip--${tone}`} aria-hidden="true">{icon}</span>
      <div className="nvr-ctitle__text">
        <div className="nvr-ctitle__title">{title}</div>
        {sub && <div className="nvr-ctitle__sub">{sub}</div>}
      </div>
      {action && <div className="nvr-ctitle__action">{action}</div>}
    </div>
  );
}

export function NvrHero({ cameras, stats }: { cameras: SentinelCamera[]; stats: SentinelStats }) {
  const t = useT();
  const online = cameras.filter((c) => c.online).length;
  const offline = Math.max(0, stats.cameras - online);
  const fc = sentinelStorageForecast(stats);
  const bytes = sentinelHumanBytes(stats.bytes);
  const span = fc.spanDays ? fmtDays(fc.spanDays, t).split(' ') : ['–'];
  const spanValue = span[0] ?? '–';
  const spanUnit = span.slice(1).join(' ');

  return (
    <Card className="nvr-hero">
      <div className="nvr-hero__head">
        <CardTitle icon={<Gauge size={16} strokeWidth={1.75} />} title={t('nvr.hero.title')} sub={t('nvr.hero.sub')} />
        <span className={`nvr-pill ${offline > 0 ? 'nvr-pill--danger' : 'nvr-pill--positive'}`}>
          <span className="nvr-pill__dot" aria-hidden="true" />
          {offline > 0 ? t('nvr.hero.offline', { count: offline }) : t('nvr.hero.allOnline')}
        </span>
      </div>
      <div className="nvr-hero__primary">
        <span className="nvr-hero__primary-label">
          <Zap size={14} strokeWidth={2} />
          {t('nvr.hero.eventsToday')}
        </span>
        <span className="nvr-hero__primary-value data-font">{stats.eventsToday}</span>
      </div>
      <div className="nvr-hero__stats">
        <StatTile
          icon={<Cctv size={16} strokeWidth={1.75} />}
          label={t('nvr.hero.camerasOnline')}
          value={`${online}`}
          unit={`/ ${stats.cameras}`}
          tone={offline > 0 ? 'danger' : 'positive'}
        />
        <StatTile
          icon={<Video size={16} strokeWidth={1.75} />}
          label={t('nvr.hero.recording')}
          value={`${stats.recording}`}
          unit={`/ ${stats.cameras}`}
          tone="accent"
        />
        <StatTile
          icon={<Database size={16} strokeWidth={1.75} />}
          label={t('nvr.hero.storageUsed')}
          value={bytes.value}
          unit={bytes.unit}
          tone="info"
        />
        <StatTile
          icon={<Clock size={16} strokeWidth={1.75} />}
          label={t('nvr.hero.retention')}
          value={spanValue}
          unit={spanUnit || undefined}
        />
      </div>
    </Card>
  );
}
