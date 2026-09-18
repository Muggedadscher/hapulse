/**
 * [fork] Overview detail cards: "Events per hour" (today's histogram) and
 * "Storage & retention" (meter, legend, key figures, forecast note) — the same
 * maths as Sentinel's status page (`sentinelStorageForecast`).
 */

import React from 'react';
import { BarChart3, HardDrive } from 'lucide-react';
import { sentinelHumanBytes, sentinelStorageForecast } from '@sentinel-nvr/web/api';
import type { SentinelStats } from '@sentinel-nvr/web/api';
import { Card } from '../../components/ui/Card';
import { useT } from '../../i18n/useT';
import { fmtDays } from '../format';
import { CardTitle } from './NvrHero';

const human = (b: number) => { const h = sentinelHumanBytes(b); return `${h.value} ${h.unit}`; };

export function NvrHistogramCard({ histogram }: { histogram: number[] }) {
  const t = useT();
  const buckets = histogram.length === 24 ? histogram : Array.from({ length: 24 }, (_, i) => histogram[i] ?? 0);
  const max = Math.max(1, ...buckets);
  const hour = new Date().getHours();
  return (
    <Card className="nvr-card">
      <CardTitle icon={<BarChart3 size={16} strokeWidth={1.75} />} title={t('nvr.histogram.title')} sub={t('nvr.histogram.sub')} />
      <div className="nvr-chart" role="img" aria-label={t('nvr.histogram.title')}>
        {buckets.map((v, i) => (
          <div key={i} className={`nvr-chart__col${i === hour ? ' nvr-chart__col--now' : ''}`} title={`${String(i).padStart(2, '0')}:00 – ${v}`}>
            <div className="nvr-chart__bar" style={{ height: `${(v / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="nvr-chart__axis data-font"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
    </Card>
  );
}

export function NvrStorageCard({ stats }: { stats: SentinelStats }) {
  const t = useT();
  const fc = sentinelStorageForecast(stats);
  const pct = (v: number) => (stats.diskTotal ? `${((v / stats.diskTotal) * 100).toFixed(2)}%` : '0%');
  const reserveShown = Math.min(fc.reserve, stats.diskFree);

  let note: string;
  switch (fc.status) {
    case 'unreachable':
      note = t('nvr.storage.note.unreachable', { target: stats.retentionDays, fits: fmtDays(fc.fitsDays, t) })
        + (fc.steady ? '' : ' ' + t('nvr.storage.note.fullIn', { days: fmtDays(fc.fillsInDays, t) }));
      break;
    case 'reachable':
      note = t(fc.spanDays >= stats.retentionDays ? 'nvr.storage.note.reachableAge' : 'nvr.storage.note.reachableEvict', { fits: fmtDays(fc.fitsDays, t) });
      break;
    case 'filling':
      note = t('nvr.storage.note.filling', { fillsIn: fmtDays(fc.fillsInDays, t), fits: fmtDays(fc.fitsDays, t) });
      break;
    default:
      note = t('nvr.storage.note.unknown');
  }

  return (
    <Card className="nvr-card">
      <CardTitle icon={<HardDrive size={16} strokeWidth={1.75} />} title={t('nvr.storage.title')} sub={t('nvr.storage.sub')} tone="info" />
      <div className="nvr-meter" role="img" aria-label={t('nvr.storage.title')}>
        <span className="nvr-meter__rec" style={{ width: pct(stats.bytes) }} />
        <span className="nvr-meter__other" style={{ left: pct(stats.bytes), width: pct(fc.other) }} />
        <span className="nvr-meter__reserve" style={{ width: pct(reserveShown) }} />
      </div>
      <div className="nvr-legend">
        <span><i className="nvr-legend__sw nvr-legend__sw--rec" />{t('nvr.storage.recordings')} {human(stats.bytes)}</span>
        <span><i className="nvr-legend__sw nvr-legend__sw--other" />{t('nvr.storage.system')} {human(fc.other)}</span>
        <span><i className="nvr-legend__sw nvr-legend__sw--free" />{t('nvr.storage.free')} {human(stats.diskFree)}</span>
        <span><i className="nvr-legend__sw nvr-legend__sw--reserve" />{t('nvr.storage.reserve')} {human(fc.reserve)}</span>
      </div>
      <ul className="nvr-kv">
        <li><span>{t('nvr.storage.rate')}</span><b className="data-font">{fc.ratePerDay ? t('nvr.storage.perDay', { value: human(fc.ratePerDay) }) : '–'}</b></li>
        <li><span>{t('nvr.storage.capacity')}</span><b className="data-font">{human(fc.capacity)}{fc.ratePerDay ? <em> ≈ {fmtDays(fc.fitsDays, t)}</em> : null}</b></li>
        <li><span>{t('nvr.storage.retention')}</span><b className="data-font">{fc.spanDays ? `~${fmtDays(fc.spanDays, t)}` : '–'}<em> / {t('nvr.storage.target', { days: stats.retentionDays })}</em></b></li>
        <li><span>{t('nvr.storage.segments')}</span><b className="data-font">{stats.segments}</b></li>
      </ul>
      <p className={`nvr-note${fc.status === 'unreachable' ? ' nvr-note--warn' : ''}`}>{note}</p>
    </Card>
  );
}
