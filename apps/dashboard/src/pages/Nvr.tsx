/**
 * NVR page — embeds the Scrypted (or any) NVR web interface inside HAPulse.
 *
 * Scrypted's own cameras are usually NOT exposed to Home Assistant, so the
 * regular Security page can't show them. Instead of duplicating an NVR, this
 * page frames the Scrypted web UI directly. The URL is stored in
 * customization settings (and therefore synced to HA per-user like the rest of
 * the layout), and can be set/changed right here — no Settings detour.
 *
 * Note: some NVRs send `X-Frame-Options` / CSP `frame-ancestors` that block
 * being embedded, and an http:// NVR can't be framed inside an https:// app
 * (mixed content). For those cases the "Open" button launches it in a new tab.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Cctv, ExternalLink, Pencil, Check } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { Card } from '../components/ui/Card';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import { useT } from '../i18n/useT';
import './Page.css';
import './Nvr.css';

/** Trim, add a scheme if missing, and drop any trailing slash. */
function normalizeUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return '';
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, '');
}

/**
 * Append embed + theme hints so an embed-aware NVR UI (e.g. Sentinel NVR) hides
 * its own chrome and matches HAPulse's light/dark mode. Harmless for NVRs that
 * ignore the params.
 */
function withEmbedParams(url: string, mode: string): string {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}embed=1&theme=${mode === 'dark' ? 'dark' : 'light'}`;
}

export function Nvr() {
  const t = useT();
  const scryptedUrl = useSettingsStore((s) => s.customization.scryptedUrl);
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);

  const [editing, setEditing] = useState(!scryptedUrl);
  const [draft, setDraft] = useState(scryptedUrl);

  // Track HAPulse's resolved light/dark mode so the embedded NVR can match it.
  const [mode, setMode] = useState(() => document.documentElement.getAttribute('data-mode') || 'light');
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setMode(el.getAttribute('data-mode') || 'light'));
    obs.observe(el, { attributes: true, attributeFilter: ['data-mode'] });
    return () => obs.disconnect();
  }, []);
  const frameSrc = useMemo(() => withEmbedParams(scryptedUrl, mode), [scryptedUrl, mode]);

  const save = () => {
    const url = normalizeUrl(draft);
    updateCustomization({ scryptedUrl: url });
    setDraft(url);
    if (url) setEditing(false);
  };

  return (
    <div className="page nvr-page stagger-rise">
      <div className="page__header-row">
        <h1 className="page__title">{t('nvr.title')}</h1>
        <div className="nvr-actions">
          {scryptedUrl && !editing && (
            <>
              <a
                className="btn btn--ghost nvr-actions__btn"
                href={scryptedUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                <ExternalLink size={16} strokeWidth={1.75} />
                <span className="nvr-actions__label">{t('nvr.open')}</span>
              </a>
              <button
                type="button"
                className="btn btn--ghost nvr-actions__btn"
                onClick={() => {
                  setDraft(scryptedUrl);
                  setEditing(true);
                }}
              >
                <Pencil size={16} strokeWidth={1.75} />
                <span className="nvr-actions__label">{t('nvr.editUrl')}</span>
              </button>
            </>
          )}
          <PageHeaderActions />
        </div>
      </div>

      {editing ? (
        <Card className="nvr-setup">
          <span className="nvr-setup__icon" aria-hidden="true">
            <Cctv size={26} strokeWidth={1.75} />
          </span>
          <h2 className="nvr-setup__title">{t('nvr.setup.title')}</h2>
          <p className="nvr-setup__desc">{t('nvr.setup.desc')}</p>

          <form
            className="nvr-setup__form"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              className="nvr-input"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder={t('nvr.setup.placeholder')}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={t('nvr.setup.inputLabel')}
            />
            <button type="submit" className="btn btn--primary" disabled={!draft.trim()}>
              <Check size={16} strokeWidth={2} />
              {t('nvr.setup.save')}
            </button>
          </form>

          {scryptedUrl && (
            <button
              type="button"
              className="btn btn--ghost nvr-setup__cancel"
              onClick={() => {
                setDraft(scryptedUrl);
                setEditing(false);
              }}
            >
              {t('nvr.setup.cancel')}
            </button>
          )}

          <p className="nvr-setup__hint">{t('nvr.setup.hint')}</p>
        </Card>
      ) : (
        <div className="nvr-frame-wrap">
          <iframe
            className="nvr-frame"
            src={frameSrc}
            title={t('nvr.frameTitle')}
            allow="fullscreen; autoplay; camera; microphone; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
