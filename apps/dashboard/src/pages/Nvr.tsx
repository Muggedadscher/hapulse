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

import React, { useState } from 'react';
import { Cctv, ExternalLink, Pencil, Check } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { Card } from '../components/ui/Card';
import { PageHeaderActions } from '../components/ui/PageHeaderActions';
import './Page.css';
import './Nvr.css';

/** Trim, add a scheme if missing, and drop any trailing slash. */
function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return '';
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  return withScheme.replace(/\/+$/, '');
}

export function Nvr() {
  const scryptedUrl = useSettingsStore((s) => s.customization.scryptedUrl);
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);

  const [editing, setEditing] = useState(!scryptedUrl);
  const [draft, setDraft] = useState(scryptedUrl);

  const save = () => {
    const url = normalizeUrl(draft);
    updateCustomization({ scryptedUrl: url });
    setDraft(url);
    if (url) setEditing(false);
  };

  return (
    <div className="page nvr-page stagger-rise">
      <div className="page__header-row">
        <h1 className="page__title">NVR</h1>
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
                <span className="nvr-actions__label">Open</span>
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
                <span className="nvr-actions__label">URL</span>
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
          <h2 className="nvr-setup__title">Connect your NVR</h2>
          <p className="nvr-setup__desc">
            Enter the address of your Scrypted web interface. It gets embedded here so you can
            watch cameras, the timeline and recordings without leaving HAPulse.
          </p>

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
              placeholder="https://192.168.1.50:10443"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Scrypted NVR URL"
            />
            <button type="submit" className="btn btn--primary" disabled={!draft.trim()}>
              <Check size={16} strokeWidth={2} />
              Save
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
              Cancel
            </button>
          )}

          <p className="nvr-setup__hint">
            Scrypted usually runs on port <strong>10443</strong> (https) or <strong>11080</strong>{' '}
            (http). If the frame stays blank, your NVR may block embedding — use{' '}
            <strong>Open</strong> to launch it in a new tab instead.
          </p>
        </Card>
      ) : (
        <div className="nvr-frame-wrap">
          <iframe
            className="nvr-frame"
            src={scryptedUrl}
            title="Scrypted NVR"
            allow="fullscreen; autoplay; camera; microphone; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
