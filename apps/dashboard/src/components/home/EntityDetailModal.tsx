/**
 * EntityDetailModal — the "more info" dialog for any entity (issue #14).
 *
 * Opened globally via uiStore.openEntityDetail: non-interactive cards (sensors
 * and the like) open it on tap, interactive cards on a long press (see
 * EntityCard). Shows, in HAPulse's design language, what HA's own more-info
 * dialog shows: current state + last changed, a history timeline (discrete
 * states) or value chart (numeric sensors), the recent activity list, the
 * entity's control card where it has one, group members, and attributes.
 *
 * History/activity arrive through the service facade — live over the
 * `history` / `logbook` WebSocket commands, fabricated deterministically in
 * demo mode — so the modal works identically in both.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { EntityCard } from '../cards/EntityCard';
import { DomainIcon } from '../settings/DomainIcon';
import { relativeTime } from '../security/roomUtils';
import { useEntity } from '../../ha/hooks';
import { useConnectionStore } from '../../stores/connectionStore';
import { resolveEntityPicture } from '../../lib/media';
import { Camera } from 'lucide-react';
import { getEntityHistory, getEntityLogbook } from '../../ha/service';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUIStore } from '../../stores/uiStore';
import { domainOf, formatEntityState, isNumericHistory } from '@hapulse/core';
import type { HassEntity, HistoryPoint, LogbookEntry } from '@hapulse/core';
import { useT, useLocale, useStateLabel } from '../../i18n/useT';
import './EntityDetailModal.css';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Attribute keys that are internal/noise and shouldn't be listed. */
const SKIP_ATTRS = new Set([
  'friendly_name',
  'icon',
  'entity_picture',
  'supported_features',
  'attribution',
  'hidden_by',
  'assumed_state',
  'editable',
  'restored',
]);

/** Domains whose card is a control worth embedding (sensors would duplicate the
 *  header; cameras get the dedicated live view below instead). */
const CONTROL_DOMAINS = new Set([
  'light', 'switch', 'fan', 'input_boolean', 'climate', 'cover',
  'media_player', 'lock', 'vacuum', 'button', 'scene', 'script',
]);

/** States rendered as "off"/neutral in the timeline; everything else is active. */
const NEUTRAL_STATES = new Set([
  'off', 'closed', 'idle', 'standby', 'paused', 'locked', 'disarmed',
  'not_home', 'away', 'clear', 'ok', 'dry', 'docked', 'none',
]);

function segmentTone(state: string): 'active' | 'neutral' | 'unavailable' {
  if (state === 'unavailable' || state === 'unknown') return 'unavailable';
  return NEUTRAL_STATES.has(state) ? 'neutral' : 'active';
}

/** Humanize an attribute key: "current_temperature" → "Current temperature". */
function humanizeKey(key: string): string {
  const spaced = key.replace(/_/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Render an attribute value compactly for display. */
function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (Array.isArray(value)) {
    return value.length ? value.map((v) => formatValue(v)).join(', ') : '—';
  }
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// History rendering
// ---------------------------------------------------------------------------

/** Evenly spaced tick labels for the time axis. */
function timeTicks(start: number, end: number, locale: string, count = 5): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const fmtDay = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const useDays = end - start > 48 * 3_600_000;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const ts = start + ((end - start) * i) / (count - 1);
    out.push(useDays ? fmtDay.format(ts) : fmt.format(ts));
  }
  return out;
}

function TimelineBar({ points, start, end, sl, domain, deviceClass }: {
  points: HistoryPoint[];
  start: number;
  end: number;
  sl: ReturnType<typeof useStateLabel>;
  domain: string;
  deviceClass: string | undefined;
}) {
  // Clamp the series to the window and turn points into proportional segments.
  const span = end - start;
  const segments = points.map((p, i) => {
    const from = Math.max(p.start, start);
    const to = i + 1 < points.length ? Math.min(points[i + 1]!.start, end) : end;
    return { state: p.state, from, to };
  }).filter((s) => s.to > s.from);

  // The label rides on the longest segment so it never overflows a sliver.
  const longest = segments.reduce(
    (best, s) => (s.to - s.from > best.to - best.from ? s : best),
    segments[0] ?? { state: '', from: 0, to: 0 },
  );

  return (
    <div className="entity-detail__timeline" role="img">
      {segments.map((s, i) => (
        <div
          key={i}
          className={`entity-detail__timeline-seg entity-detail__timeline-seg--${segmentTone(s.state)}`}
          style={{ width: `${((s.to - s.from) / span) * 100}%` }}
          title={sl(domain, s.state, { deviceClass })}
        >
          {s === longest && (s.to - s.from) / span > 0.18 && (
            <span className="entity-detail__timeline-label">
              {sl(domain, s.state, { deviceClass })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function ValueChart({ points, start, end, unit }: {
  points: HistoryPoint[];
  start: number;
  end: number;
  unit: string;
}) {
  const numeric = points
    .map((p) => ({ v: Number(p.state), t: p.start }))
    .filter((p) => !Number.isNaN(p.v));
  if (numeric.length < 2) return null;

  const min = Math.min(...numeric.map((p) => p.v));
  const max = Math.max(...numeric.map((p) => p.v));
  const pad = (max - min) * 0.1 || 1;
  const lo = min - pad;
  const hi = max + pad;

  const W = 100;
  const H = 36;
  const x = (t: number) => ((Math.min(Math.max(t, start), end) - start) / (end - start)) * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;

  const line = numeric.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(2)},${y(p.v).toFixed(2)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const fmt = (v: number) => `${Math.round(v * 10) / 10}${unit ? ` ${unit}` : ''}`;

  return (
    <div className="entity-detail__chart-wrap">
      <svg className="entity-detail__chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
        <path d={area} className="entity-detail__chart-area" />
        <path d={line} className="entity-detail__chart-line" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="entity-detail__chart-max">{fmt(max)}</span>
      <span className="entity-detail__chart-min">{fmt(min)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity list
// ---------------------------------------------------------------------------

function dayLabel(when: number, locale: string, t: ReturnType<typeof useT>): string {
  const day = new Date(when);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const dateStr = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(day);
  if (sameDay(day, today)) return `${t('entityDetail.today')} · ${dateStr}`;
  if (sameDay(day, yesterday)) return `${t('entityDetail.yesterday')} · ${dateStr}`;
  return dateStr;
}

function ActivityList({ entries, locale, sl, domain, deviceClass, t }: {
  entries: LogbookEntry[];
  locale: string;
  sl: ReturnType<typeof useStateLabel>;
  domain: string;
  deviceClass: string | undefined;
  t: ReturnType<typeof useT>;
}) {
  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    [locale],
  );
  // Group consecutive entries under day headers.
  const groups: { label: string; rows: LogbookEntry[] }[] = [];
  for (const entry of entries) {
    const label = dayLabel(entry.when, locale, t);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(entry);
    else groups.push({ label, rows: [entry] });
  }
  return (
    <div className="entity-detail__activity">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="entity-detail__activity-day">{g.label}</div>
          <ul className="entity-detail__activity-list">
            {g.rows.map((row, i) => (
              <li key={`${row.when}-${i}`} className="entity-detail__activity-row">
                <span className={`entity-detail__activity-dot entity-detail__activity-dot--${segmentTone(row.state)}`} />
                <span className="entity-detail__activity-state">
                  {sl(domain, row.state, { deviceClass })}
                </span>
                <span className="entity-detail__activity-time">{timeFmt.format(row.when)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

// [fork] History range options shown as pills (replaces upstream's single
// 24h/7d toggle). `hours` drives getEntityHistory; `label` is shown on the pill.
const HISTORY_RANGES = [
  { id: '24h', hours: 24, label: '24H' },
  { id: '7d', hours: 7 * 24, label: '7D' },
  { id: '30d', hours: 30 * 24, label: '30D' },
] as const;
const RANGE_DEFAULT_H = HISTORY_RANGES[0].hours;
/** [fork] Hours for a stored range id, falling back to the default (24h). */
function rangeHoursFromId(id: string): number {
  return HISTORY_RANGES.find((r) => r.id === id)?.hours ?? RANGE_DEFAULT_H;
}
const ACTIVITY_COLLAPSED = 6;

interface EntityDetailModalProps {
  /** The entity to show; null means closed. */
  entityId: string | null;
  onClose: () => void;
}

export function EntityDetailModal({ entityId, onClose }: EntityDetailModalProps) {
  const t = useT();
  const locale = useLocale();
  const sl = useStateLabel();
  const entity = useEntity(entityId ?? '');
  const entityOverrides = useSettingsStore((s) => s.customization.entityOverrides);
  const openEntityDetail = useUIStore((s) => s.openEntityDetail);

  // [fork] Selected history range is remembered per user (synced to HA storage).
  const detailRange = useSettingsStore((s) => s.customization.detailHistoryRange);
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);
  const rangeH = rangeHoursFromId(detailRange);
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);
  const [logbook, setLogbook] = useState<LogbookEntry[] | null>(null);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [attrsOpen, setAttrsOpen] = useState(false);
  const [windowEnd, setWindowEnd] = useState(() => Date.now());
  // [fork] The range the *displayed* series was fetched for, and whether a new
  // range is currently loading. Keeping the old chart on screen (dimmed) during
  // a range switch — instead of blanking to a placeholder — lets it cross-fade
  // into the new series rather than vanishing and popping back.
  const [histRangeH, setHistRangeH] = useState<number>(rangeH);
  const [historyLoading, setHistoryLoading] = useState(false);
  const prevEntityRef = useRef<string | null>(null);

  // Reset per-entity view state when the modal switches target.
  // ([fork] the history range persists across entities via settings.)
  useEffect(() => {
    setActivityExpanded(false);
    setAttrsOpen(false);
  }, [entityId]);

  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;
    // [fork] Only blank to the loading placeholder when the *entity* changes.
    // On a mere range switch keep the old series visible until the new one
    // arrives, so the chart cross-fades instead of disappearing.
    const entityChanged = prevEntityRef.current !== entityId;
    prevEntityRef.current = entityId;
    if (entityChanged) {
      setHistory(null);
      setLogbook(null);
    }
    setHistoryLoading(true);
    const end = Date.now();
    const fetchedRangeH = rangeH;
    void Promise.all([
      getEntityHistory(entityId, fetchedRangeH),
      getEntityLogbook(entityId, fetchedRangeH),
    ]).then(([h, l]) => {
      if (cancelled) return;
      // Swap points and their matching window together so the axes never lag.
      setWindowEnd(end);
      setHistRangeH(fetchedRangeH);
      setHistory(h);
      setLogbook(l);
      setHistoryLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [entityId, rangeH]);

  if (!entityId || !entity) return null;

  const domain = domainOf(entity.entity_id);
  const deviceClass = entity.attributes.device_class as string | undefined;
  const unit = (entity.attributes.unit_of_measurement as string | undefined) ?? '';
  const override = entityOverrides[entity.entity_id];
  const name =
    override?.name ??
    (entity.attributes.friendly_name as string | undefined) ??
    entity.entity_id;

  const stateLabel = formatEntityState(entity, locale, (d, s, o) => sl(d, s, o));
  const windowStart = windowEnd - histRangeH * 3_600_000; // [fork] matches the displayed series
  const numeric = history != null && history.length > 0 && isNumericHistory(history);
  const ticks = timeTicks(windowStart, windowEnd, locale);

  // Group members (HA groups/light groups expose them as attributes.entity_id).
  const memberIds = Array.isArray(entity.attributes.entity_id)
    ? (entity.attributes.entity_id as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];

  const attrRows = Object.entries(entity.attributes).filter(
    ([key]) => !SKIP_ATTRS.has(key) && !key.startsWith('_') && key !== 'entity_id'
  );

  const visibleLogbook = logbook == null
    ? null
    : activityExpanded ? logbook.slice(0, 40) : logbook.slice(0, ACTIVITY_COLLAPSED);

  return (
    <Modal open={entityId != null} onClose={onClose} title={name} className="entity-detail-modal">
      <div className="entity-detail">
        {/* ── Header: icon, name, last changed, current state ── */}
        <div className="entity-detail__header">
          <span className="entity-detail__icon-chip" aria-hidden="true">
            <DomainIcon entity={entity} size={20} />
          </span>
          <div className="entity-detail__header-main">
            <div className="entity-detail__header-name">{name}</div>
            <div className="entity-detail__header-when">
              {relativeTime(t, entity.last_changed)}
            </div>
          </div>
          <div className="entity-detail__header-state">{stateLabel}</div>
        </div>

        {/* ── Camera: live view ── */}
        {domain === 'camera' && <CameraLiveView entity={entity} name={name} />}

        {/* ── Control (interactive domains only) ── */}
        {CONTROL_DOMAINS.has(domain) && (
          <div className="entity-detail__control">
            <EntityCard entity={entity} name={name} detailPress={false} />
          </div>
        )}

        {/* ── History ── */}
        <section className="entity-detail__section">
          <div className="entity-detail__section-head">
            <h3 className="entity-detail__section-title">{t('entityDetail.history')}</h3>
            {/* [fork] Range pills (24H/7D/30D) — replaces the 24h/7d toggle. */}
            <div className="entity-detail__ranges" role="group" aria-label={t('entityDetail.history')}>
              {HISTORY_RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`entity-detail__range-btn${detailRange === r.id ? ' entity-detail__range-btn--active' : ''}`}
                  onClick={() => updateCustomization({ detailHistoryRange: r.id })}
                  aria-pressed={detailRange === r.id}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {history == null ? (
            <div className="entity-detail__placeholder">{t('common.loading')}</div>
          ) : history.length === 0 ? (
            <div className="entity-detail__placeholder">{t('entityDetail.historyEmpty')}</div>
          ) : (
            /* [fork] Dims while a new range loads; the old series stays put and
               eases back to full opacity when the new one arrives. */
            <div
              className={`entity-detail__history-view${historyLoading ? ' entity-detail__history-view--loading' : ''}`}
            >
              {numeric ? (
                <ValueChart points={history} start={windowStart} end={windowEnd} unit={unit} />
              ) : (
                <TimelineBar
                  points={history}
                  start={windowStart}
                  end={windowEnd}
                  sl={sl}
                  domain={domain}
                  deviceClass={deviceClass}
                />
              )}
              <div className="entity-detail__ticks" aria-hidden="true">
                {ticks.map((tick, i) => <span key={i}>{tick}</span>)}
              </div>
            </div>
          )}
        </section>

        {/* ── Activity ── */}
        <section className="entity-detail__section">
          <div className="entity-detail__section-head">
            <h3 className="entity-detail__section-title">{t('entityDetail.activity')}</h3>
            {logbook != null && logbook.length > ACTIVITY_COLLAPSED && (
              <button
                type="button"
                className="entity-detail__section-action"
                onClick={() => setActivityExpanded((v) => !v)}
              >
                {activityExpanded ? t('entityDetail.showLess') : t('entityDetail.showMore')}
              </button>
            )}
          </div>
          {visibleLogbook == null ? (
            <div className="entity-detail__placeholder">{t('common.loading')}</div>
          ) : visibleLogbook.length === 0 ? (
            <div className="entity-detail__placeholder">{t('entityDetail.activityEmpty')}</div>
          ) : (
            <ActivityList
              entries={visibleLogbook}
              locale={locale}
              sl={sl}
              domain={domain}
              deviceClass={deviceClass}
              t={t}
            />
          )}
        </section>

        {/* ── Group members ── */}
        {memberIds.length > 0 && (
          <section className="entity-detail__section">
            <h3 className="entity-detail__section-title">{t('entityDetail.members')}</h3>
            <div className="entity-detail__members">
              {memberIds.map((id) => (
                <MemberRow key={id} entityId={id} onOpen={() => openEntityDetail(id)} />
              ))}
            </div>
          </section>
        )}

        {/* ── Attributes (collapsed by default) ── */}
        <section className="entity-detail__section">
          <button
            type="button"
            className="entity-detail__attrs-toggle"
            onClick={() => setAttrsOpen((v) => !v)}
            aria-expanded={attrsOpen}
          >
            {attrsOpen
              ? <ChevronUp size={14} strokeWidth={2} aria-hidden="true" />
              : <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />}
            {t('home.entityDetail.attributesLabel')}
          </button>
          {attrsOpen && (
            attrRows.length > 0 ? (
              <dl className="entity-detail__attr-list">
                {attrRows.map(([key, value]) => (
                  <div key={key} className="entity-detail__attr-row">
                    <dt className="entity-detail__attr-key">{humanizeKey(key)}</dt>
                    <dd className="entity-detail__attr-value">{formatValue(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="entity-detail__attr-empty">{t('home.entityDetail.emptyAttrs')}</p>
            )
          )}
        </section>
      </div>
    </Modal>
  );
}

/** One tappable group-member row: icon, name, current state. */
function MemberRow({ entityId, onOpen }: { entityId: string; onOpen: () => void }) {
  const locale = useLocale();
  const sl = useStateLabel();
  const entity = useEntity(entityId);
  if (!entity) return null;
  const name = (entity.attributes.friendly_name as string | undefined) ?? entityId;
  return (
    <button type="button" className="entity-detail__member-row" onClick={onOpen}>
      <span className="entity-detail__member-icon" aria-hidden="true">
        <DomainIcon entity={entity} size={16} />
      </span>
      <span className="entity-detail__member-name">{name}</span>
      <span className="entity-detail__member-state">
        {formatEntityState(entity as HassEntity, locale, (d, s, o) => sl(d, s, o))}
      </span>
      <ChevronRight size={14} strokeWidth={2} className="entity-detail__member-chevron" aria-hidden="true" />
    </button>
  );
}

/**
 * CameraLiveView — the camera's live picture at the top of its detail modal.
 *
 * The camera entity's `entity_picture` is a pre-signed `/api/camera_proxy/…`
 * snapshot URL; substituting `camera_proxy_stream` yields HA's MJPEG live
 * stream under the same signed token, so live view works in OAuth mode too
 * (no long-lived token available) and needs no extra auth machinery. If the
 * stream errors — some cameras don't serve MJPEG — it falls back to the
 * still snapshot, refreshed every few seconds. Demo cameras have no picture
 * and show a placeholder.
 */
function CameraLiveView({ entity, name }: { entity: HassEntity; name: string }) {
  const url = useConnectionStore((s) => s.url);
  const demo = useConnectionStore((s) => s.demo);
  const [streamFailed, setStreamFailed] = useState(false);
  const [stillFailed, setStillFailed] = useState(false);
  const [tick, setTick] = useState(0);

  const picture = entity.attributes['entity_picture'] as string | undefined;
  const base = demo ? null : resolveEntityPicture(picture, url || null);
  const streamSrc = base ? base.replace('/api/camera_proxy/', '/api/camera_proxy_stream/') : null;
  const useStream = streamSrc != null && streamSrc !== base && !streamFailed;

  useEffect(() => {
    setStreamFailed(false);
    setStillFailed(false);
  }, [base]);

  // Snapshot fallback: refresh with a cache-buster for a near-live view.
  useEffect(() => {
    if (!base || useStream) return;
    const id = setInterval(() => setTick((t) => t + 1), 5_000);
    return () => clearInterval(id);
  }, [base, useStream]);

  const src = useStream
    ? streamSrc
    : base ? `${base}${base.includes('?') ? '&' : '?'}_ts=${tick}` : null;

  if (!src || stillFailed) {
    return (
      <div className="entity-detail__camera entity-detail__camera--empty">
        <Camera size={32} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="entity-detail__camera">
      <img
        src={src}
        alt={name}
        className="entity-detail__camera-img"
        onError={() => (useStream ? setStreamFailed(true) : setStillFailed(true))}
      />
    </div>
  );
}
