/**
 * QueueCard — the Music Assistant play queue (issue #2, queue phase).
 *
 * Shows, for the shared MA target player: the queue with shuffle/repeat,
 * speaker grouping and transfer-to-another-player. Two tiers:
 *
 * - HA alone exposes only a queue SUMMARY (music_assistant.get_queue): the
 *   playing item, what's next, and the count.
 * - With the optional direct Music Assistant connection (URL + API token,
 *   configured inline below the card), the summary upgrades to the FULL
 *   scrollable item list with drag-to-reorder and per-item removal. Demo mode
 *   always shows the full list against an in-memory queue.
 *
 * The snapshot refetches whenever the player's track changes and on a slow
 * interval, so position/count stay roughly current without hammering HA.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ListMusic, Music2, Shuffle, Repeat, Repeat1, ArrowRightLeft, ChevronDown, Plug,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { getMAQueue, transferMAQueue, callService, hasDirectMA } from '../../ha/service';
import { FullQueueList } from './FullQueueList';
import { useSettingsStore } from '../../stores/settingsStore';
import { SpeakerGroupMenu } from './SpeakerGroupMenu';
import { useMAPlayerTarget } from './useMAPlayerTarget';
import type { MAQueueSnapshot, MAQueueItem, MusicAssistantInfo } from '@hapulse/core';
import { useT } from '../../i18n/useT';
import './QueueCard.css';

const REFRESH_MS = 15_000;

interface QueueCardProps {
  ma: MusicAssistantInfo;
}

export function QueueCard({ ma }: QueueCardProps) {
  const t = useT();
  const { players, target, setTarget, nameOf } = useMAPlayerTarget(ma);
  const [queue, setQueue] = useState<MAQueueSnapshot | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  // Full-queue upgrade (direct MA connection): available?, working?, config UI
  const directConfigured = hasDirectMA();
  const [fullListWorks, setFullListWorks] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const player = players.find((p) => p.entity_id === target);
  const trackKey = `${player?.attributes.media_title ?? ''}|${player?.state ?? ''}`;

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    const load = () => {
      void getMAQueue(target).then((snapshot) => {
        if (cancelled) return;
        setQueue(snapshot);
        setRefreshToken((n) => n + 1);
      });
    };
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // trackKey: refetch when the playing item changes, not only on the timer.
  }, [target, trackKey]);

  const toggleShuffle = useCallback(() => {
    if (!target || queue == null) return;
    setQueue({ ...queue, shuffle: !queue.shuffle });
    void callService('media_player', 'shuffle_set', { shuffle: !queue.shuffle }, { entity_id: target });
  }, [target, queue]);

  const cycleRepeat = useCallback(() => {
    if (!target || queue == null) return;
    const next = queue.repeat === 'off' ? 'all' : queue.repeat === 'all' ? 'one' : 'off';
    setQueue({ ...queue, repeat: next });
    void callService('media_player', 'repeat_set', { repeat: next }, { entity_id: target });
  }, [target, queue]);

  const transferTo = useCallback(
    (destinationId: string) => {
      setTransferOpen(false);
      if (!target || destinationId === target) return;
      void transferMAQueue(target, destinationId).then(() => setTarget(destinationId));
    },
    [target, setTarget],
  );

  if (!target || !player) return null;

  const transferCandidates = players.filter((p) => p.entity_id !== target);
  const empty = queue == null || (queue.current == null && queue.items === 0);

  return (
    <Card className="queue-card">
      {/* ── Header ── */}
      <div className="queue-card__header">
        <div className="queue-card__title-wrap">
          <span className="queue-card__title-icon" aria-hidden="true">
            <ListMusic size={16} strokeWidth={1.75} />
          </span>
          <h2 className="queue-card__title">{t('music.queue.title')}</h2>
        </div>
        <div className="queue-card__header-actions">
          <SpeakerGroupMenu leader={player} />
          <div className="queue-card__player-select">
            <select
              className="queue-card__player-native"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label={t('music.library.playerAria')}
            >
              {players.map((p) => (
                <option key={p.entity_id} value={p.entity_id}>
                  {nameOf(p.entity_id)}
                </option>
              ))}
            </select>
            <ChevronDown size={13} strokeWidth={2} className="queue-card__player-chevron" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      {empty ? (
        <div className="queue-card__empty">{t('music.queue.empty')}</div>
      ) : (
        <>
          {directConfigured && queue.queueId != null && (
            <FullQueueList
              queueId={queue.queueId}
              currentName={queue.current?.name ?? null}
              refreshToken={refreshToken}
              onAvailabilityChange={setFullListWorks}
            />
          )}
          {(!directConfigured || queue.queueId == null || !fullListWorks) && (
            <div className="queue-card__items">
              {queue.current && (
                <QueueRow
                  item={queue.current}
                  label={t('music.queue.nowLabel')}
                  active
                />
              )}
              {queue.next && (
                <QueueRow item={queue.next} label={t('music.queue.nextLabel')} />
              )}
            </div>
          )}

          <div className="queue-card__footer">
            <span className="queue-card__count">
              {queue.position != null
                ? t('music.queue.positionCount', { position: queue.position, count: queue.items })
                : t('music.queue.count', { count: queue.items })}
            </span>

            <div className="queue-card__controls">
              <button
                type="button"
                className={`queue-card__ctl${queue.shuffle ? ' queue-card__ctl--active' : ''}`}
                onClick={toggleShuffle}
                aria-pressed={queue.shuffle}
                aria-label={t('music.control.shuffle')}
                title={t('music.control.shuffle')}
              >
                <Shuffle size={15} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                className={`queue-card__ctl${queue.repeat !== 'off' ? ' queue-card__ctl--active' : ''}`}
                onClick={cycleRepeat}
                aria-label={t('music.control.repeatAria', { mode: queue.repeat })}
                title={t('music.control.repeatAria', { mode: queue.repeat })}
              >
                {queue.repeat === 'one'
                  ? <Repeat1 size={15} strokeWidth={1.75} />
                  : <Repeat size={15} strokeWidth={1.75} />}
              </button>

              {transferCandidates.length > 0 && (
                <div className="queue-card__transfer">
                  <button
                    type="button"
                    className="queue-card__ctl"
                    onClick={() => setTransferOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={transferOpen}
                    aria-label={t('music.queue.transferAria')}
                    title={t('music.queue.transferAria')}
                  >
                    <ArrowRightLeft size={15} strokeWidth={1.75} />
                  </button>
                  {transferOpen && (
                    <div className="queue-card__transfer-pop" role="menu">
                      <div className="queue-card__transfer-title">{t('music.queue.transferTitle')}</div>
                      {transferCandidates.map((p) => (
                        <button
                          key={p.entity_id}
                          type="button"
                          role="menuitem"
                          className="queue-card__transfer-row"
                          onClick={() => transferTo(p.entity_id)}
                        >
                          {nameOf(p.entity_id)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Full-queue upgrade: connect directly to Music Assistant. */}
          {(!directConfigured || !fullListWorks) && (
            <MAConnectPrompt
              failed={directConfigured && !fullListWorks}
              open={configOpen}
              onToggle={() => setConfigOpen((v) => !v)}
              onSaved={() => {
                setConfigOpen(false);
                setFullListWorks(true);
                setRefreshToken((n) => n + 1);
              }}
            />
          )}
        </>
      )}
    </Card>
  );
}

/**
 * Inline configuration for the direct Music Assistant connection: server URL
 * and an API token created in MA's settings. Stored per-user in
 * customization (synced), so it follows the user across devices.
 */
function MAConnectPrompt({ failed, open, onToggle, onSaved }: {
  failed: boolean;
  open: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const maServerUrl = useSettingsStore((s) => s.customization.maServerUrl);
  const maToken = useSettingsStore((s) => s.customization.maToken);
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);
  const [url, setUrl] = useState(maServerUrl ?? '');
  const [token, setToken] = useState(maToken ?? '');

  const save = () => {
    updateCustomization({
      maServerUrl: url.trim() === '' ? null : url.trim(),
      maToken: token.trim() === '' ? null : token.trim(),
    });
    onSaved();
  };

  return (
    <div className="queue-card__connect">
      <button type="button" className="queue-card__connect-toggle" onClick={onToggle} aria-expanded={open}>
        <Plug size={13} strokeWidth={1.75} aria-hidden="true" />
        {failed ? t('music.queue.connect.failed') : t('music.queue.connect.prompt')}
      </button>
      {open && (
        <div className="queue-card__connect-form">
          <p className="queue-card__connect-hint">{t('music.queue.connect.hint')}</p>
          <input
            type="url"
            className="queue-card__connect-input"
            placeholder="http://homeassistant.local:8095"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label={t('music.queue.connect.urlLabel')}
          />
          <input
            type="password"
            className="queue-card__connect-input"
            placeholder={t('music.queue.connect.tokenLabel')}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            aria-label={t('music.queue.connect.tokenLabel')}
          />
          <button type="button" className="queue-card__connect-save" onClick={save}>
            {t('music.queue.connect.save')}
          </button>
        </div>
      )}
    </div>
  );
}

function QueueRow({ item, label, active = false }: {
  item: MAQueueItem;
  label: string;
  active?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [item.image]);
  return (
    <div className={`queue-row${active ? ' queue-row--active' : ''}`}>
      <span className="queue-row__art" aria-hidden="true">
        {item.image != null && !imgFailed ? (
          <img src={item.image} alt="" className="queue-row__img" onError={() => setImgFailed(true)} />
        ) : (
          <Music2 size={16} strokeWidth={1.75} />
        )}
      </span>
      <div className="queue-row__main">
        <span className="queue-row__label">{label}</span>
        <span className="queue-row__name">{item.name}</span>
        {item.artist && <span className="queue-row__artist">{item.artist}</span>}
      </div>
    </div>
  );
}
