/**
 * [fork] Admin rows for the global management (inside Settings → Admin): activate it once
 * ("Meine Einstellungen für alle übernehmen", permanent), afterwards show who manages it,
 * share Sentinel / Music Assistant access, and refresh the favorites/language defaults.
 */

import { useState } from 'react';
import { Users, KeyRound, Star } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useGlobalSettingsStore } from '../../stores/globalSettingsStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { activateGlobalSettings, setShareSecrets, updateUserDefaults } from '../../ha/globalSettings';
import { useT, useLocale } from '../../i18n/useT';
import './GlobalSettings.css';

type Notice = 'exists' | 'failed' | 'defaultsDone' | null;

function useFormatDate(): (iso: string | null) => string {
  const locale = useLocale();
  return (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  };
}

export function GlobalSettingsAdmin() {
  const t = useT();
  const fmt = useFormatDate();
  const meta = useGlobalSettingsStore((s) => s.meta);
  const loaded = useGlobalSettingsStore((s) => s.loaded);
  const writeError = useGlobalSettingsStore((s) => s.writeError);
  const connected = useConnectionStore((s) => s.status === 'connected' && !s.demo);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [share, setShare] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const run = async (fn: () => Promise<Notice>) => {
    setBusy(true);
    setNotice(null);
    try {
      setNotice(await fn());
    } catch (err) {
      console.warn('[HAPulse] global settings action failed:', err);
      setNotice('failed');
    } finally {
      setBusy(false);
    }
  };

  const activate = () =>
    run(async () => {
      const r = await activateGlobalSettings({ shareSecrets: share });
      setConfirmOpen(false);
      return r === 'exists' ? 'exists' : null;
    });

  const noticeText =
    notice === 'exists' ? t('globalSettings.admin.exists')
      : notice === 'failed' ? t('globalSettings.admin.failed')
        : notice === 'defaultsDone' ? t('globalSettings.admin.defaultsDone')
          : null;

  if (!meta.managed) {
    return (
      <>
        <div className="settings-card__row">
          <span className="settings-card__row-label">
            <span className="settings-card__icon-chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Users size={14} strokeWidth={1.75} />
            </span>
            {t('globalSettings.admin.label')}
          </span>
          <p className="global-admin__text">{t('globalSettings.admin.inactiveHint')}</p>
          <div className="global-admin__actions">
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!connected || !loaded || busy}
              onClick={() => { setNotice(null); setConfirmOpen(true); }}
            >
              {t('globalSettings.admin.activateBtn')}
            </button>
          </div>
          {noticeText && <p className={notice === 'failed' ? 'global-admin__error' : 'global-admin__ok'} role="status">{noticeText}</p>}
        </div>

        <Modal
          open={confirmOpen}
          onClose={() => { if (!busy) setConfirmOpen(false); }}
          title={t('globalSettings.confirm.title')}
          icon={<Users size={18} strokeWidth={1.75} />}
          footer={(
            <div className="global-admin__actions">
              <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setConfirmOpen(false)}>
                {t('globalSettings.cancel')}
              </button>
              <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void activate()}>
                {t('globalSettings.confirm.ok')}
              </button>
            </div>
          )}
        >
          <div className="global-confirm">
            <p>{t('globalSettings.confirm.body1')}</p>
            <p>{t('globalSettings.confirm.body2')}</p>
            <label className="global-confirm__share">
              <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
              <span>
                {t('globalSettings.confirm.share')}
                <span className="global-confirm__share-hint">{t('globalSettings.confirm.shareHint')}</span>
              </span>
            </label>
            {notice === 'failed' && <p className="global-admin__error" role="alert">{t('globalSettings.admin.failed')}</p>}
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      <div className="settings-card__row">
        <span className="settings-card__row-label">
          <span className="settings-card__icon-chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Users size={14} strokeWidth={1.75} />
          </span>
          {t('globalSettings.admin.label')}
        </span>
        <p className="global-admin__meta">
          {t('globalSettings.admin.activeSince', { date: fmt(meta.activatedAt), name: meta.activatedBy?.name ?? '' })}
          <br />
          {t('globalSettings.admin.lastChange', { date: fmt(meta.updatedAt), name: meta.updatedBy?.name ?? '' })}
        </p>
        {writeError && <p className="global-admin__error" role="alert">{t('globalSettings.admin.writeError')}</p>}
      </div>

      <div className="settings-card__row settings-card__row--inline">
        <span className="settings-card__row-label">
          <span className="settings-card__icon-chip" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
            <KeyRound size={14} strokeWidth={1.75} />
          </span>
          {t('globalSettings.admin.shareLabel')}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={meta.shareSecrets}
          aria-label={t('globalSettings.admin.shareLabel')}
          title={t('globalSettings.confirm.shareHint')}
          className={`admin-toggle${meta.shareSecrets ? ' admin-toggle--on' : ''}`}
          disabled={!connected || busy}
          onClick={() => void run(async () => { await setShareSecrets(!meta.shareSecrets); return null; })}
        >
          <span className="admin-toggle__thumb" />
        </button>
      </div>

      <div className="settings-card__row">
        <span className="settings-card__row-label">
          <span className="settings-card__icon-chip" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
            <Star size={14} strokeWidth={1.75} />
          </span>
          {t('globalSettings.admin.defaultsLabel')}
        </span>
        <p className="global-admin__text">{t('globalSettings.admin.defaultsHint')}</p>
        <div className="global-admin__actions">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!connected || busy}
            onClick={() => void run(async () => { await updateUserDefaults(); return 'defaultsDone'; })}
          >
            {t('globalSettings.admin.defaultsBtn')}
          </button>
        </div>
        {noticeText && <p className={notice === 'failed' ? 'global-admin__error' : 'global-admin__ok'} role="status">{noticeText}</p>}
      </div>
    </>
  );
}
