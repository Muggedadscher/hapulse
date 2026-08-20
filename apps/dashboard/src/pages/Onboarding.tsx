/**
 * Onboarding page — HA OAuth sign-in (primary), LLAT connect (advanced), demo mode.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { AlertTriangle, Lock, ChevronDown } from 'lucide-react';
import { PulseLogo } from '../components/ui/PulseLogo';
import { DashboardBootLoading } from '../components/ui/DashboardBootLoading';
import { useConnectionStore } from '../stores/connectionStore';
import { useT } from '../i18n/useT';
import { HAAuthError, HAConnectionError } from '@hapulse/core';
import './Onboarding.css';

function detectMixedContent(url: string): boolean {
  return (
    window.location.protocol === 'https:' &&
    (url.startsWith('http://') || url.startsWith('ws://'))
  );
}

/** True when the current URL contains the HA auth callback query param. */
function isAuthCallback(): boolean {
  return window.location.search.includes('auth_callback=1');
}

export function Onboarding() {
  const { status, error: storeError, signInWithHomeAssistant, connect, startDemo } =
    useConnectionStore(
      useShallow((s) => ({
        status: s.status,
        error: s.error,
        signInWithHomeAssistant: s.signInWithHomeAssistant,
        connect: s.connect,
        startDemo: s.startDemo,
      }))
    );

  const navigate = useNavigate();
  const t = useT();

  // ---- Redirect when already connected ----
  useEffect(() => {
    if (status === 'connected') {
      navigate('/', { replace: true });
    }
  }, [status, navigate]);

  // ---- Primary OAuth form ----
  const [oauthUrl, setOauthUrl] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // ---- Advanced token form ----
  const [tokenUrl, setTokenUrl] = useState('');
  const [token, setToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ---- Mixed-content warnings ----
  const oauthMixedContent = oauthUrl.length > 0 && detectMixedContent(oauthUrl);
  const tokenMixedContent = tokenUrl.length > 0 && detectMixedContent(tokenUrl);

  // ---- Callback leg: store error (from init()) is shown on the form ----
  const callbackFailed = isAuthCallback() && storeError;

  // ---- OAuth sign-in ----
  async function handleOAuthSignIn(e: React.FormEvent) {
    e.preventDefault();
    setOauthError(null);

    const trimmedUrl = oauthUrl.trim().replace(/\/+$/, '');
    if (!trimmedUrl) {
      setOauthError(t('onboarding.errorMissingUrl'));
      return;
    }
    if (detectMixedContent(trimmedUrl)) {
      setOauthError(t('onboarding.oauthMixedContent'));
      return;
    }

    setOauthLoading(true);
    try {
      // This triggers a redirect — page navigates away; never resolves on success.
      await signInWithHomeAssistant(trimmedUrl);
    } catch (err) {
      if (err instanceof HAAuthError) {
        setOauthError(t('onboarding.signInFailed'));
      } else if (err instanceof HAConnectionError) {
        setOauthError(t('onboarding.connectionError', { message: err.message }));
      } else {
        setOauthError(t('onboarding.oauthGenericError'));
      }
      setOauthLoading(false);
    }
    // If redirect happens the component unmounts — no finally needed.
  }

  // ---- Token connect ----
  async function handleTokenConnect(e: React.FormEvent) {
    e.preventDefault();
    setTokenError(null);

    const trimmedUrl = tokenUrl.trim().replace(/\/+$/, '');
    const trimmedToken = token.trim();

    if (!trimmedUrl) {
      setTokenError(t('onboarding.errorMissingUrl'));
      return;
    }
    if (!trimmedToken) {
      setTokenError(t('onboarding.errorMissingToken'));
      return;
    }
    if (detectMixedContent(trimmedUrl)) {
      setTokenError(t('onboarding.tokenMixedContent'));
      return;
    }

    setTokenLoading(true);
    try {
      await connect(trimmedUrl, trimmedToken);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof HAAuthError) {
        setTokenError(t('onboarding.tokenRejected'));
      } else if (err instanceof HAConnectionError) {
        setTokenError(t('onboarding.connectionError', { message: (err as Error).message }));
      } else {
        setTokenError(t('onboarding.tokenGenericError'));
      }
    } finally {
      setTokenLoading(false);
    }
  }

  function handleDemo() {
    startDemo();
    navigate('/', { replace: true });
  }

  // ---- Connecting/connected: show the branded loader instead of the form ----
  // Covers the OAuth callback leg (init() resuming), an in-flight sign-in, and
  // the brief window after a successful connect while the redirect effect above
  // navigates to "/". Keeps the loading animation seamless with the boot gate.
  if (status === 'connecting' || status === 'connected') {
    return <DashboardBootLoading label={isAuthCallback() ? t('onboarding.finishingSignIn') : t('onboarding.connecting')} />;
  }

  return (
    <div className="onboarding">
      <div className="onboarding__bg" aria-hidden="true" />

      <div className="onboarding__card stagger-rise">
        <header className="onboarding__header">
          <PulseLogo size={48} />
          <h1 className="onboarding__title">HAPulse</h1>
          <p className="onboarding__tagline">
            {t('onboarding.tagline')}
          </p>
        </header>

        {/* ---- Primary: OAuth sign-in ---- */}
        <form className="onboarding__form" onSubmit={handleOAuthSignIn} noValidate>
          <div className="onboarding__field">
            <label htmlFor="ha-url-oauth" className="onboarding__label">
              {t('onboarding.urlLabel')}
            </label>
            <input
              id="ha-url-oauth"
              type="url"
              className="onboarding__input"
              placeholder={t('onboarding.urlPlaceholder')}
              value={oauthUrl}
              onChange={(e) => {
                setOauthUrl(e.target.value);
                setOauthError(null);
              }}
              autoComplete="url"
              spellCheck={false}
              disabled={oauthLoading}
            />
          </div>

          {oauthMixedContent && (
            <div className="onboarding__warning" role="alert">
              <AlertTriangle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{t('onboarding.mixedContentWarning')}</span>
            </div>
          )}

          {/* Show store error if callback failed */}
          {(oauthError || callbackFailed) && (
            <div className="onboarding__error" role="alert">
              {oauthError ?? storeError}
            </div>
          )}

          <button
            type="submit"
            className="onboarding__connect-btn"
            disabled={oauthLoading}
          >
            {oauthLoading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                {t('onboarding.oauthSubmitLoading')}
              </>
            ) : (
              t('onboarding.oauthSubmit')
            )}
          </button>
        </form>

        <p className="onboarding__oauth-hint">
          <Lock size={12} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />
          {t('onboarding.oauthHint')}
        </p>

        {/* ---- Advanced: long-lived access token ---- */}
        <div className="onboarding__advanced">
          <button
            type="button"
            className="onboarding__advanced-toggle"
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <ChevronDown
              size={15}
              strokeWidth={2}
              className={`onboarding__advanced-chevron${showAdvanced ? ' onboarding__advanced-chevron--open' : ''}`}
              aria-hidden="true"
            />
            {t('onboarding.advancedToggle')}
          </button>

          {showAdvanced && (
            <form
              className="onboarding__form onboarding__advanced-form"
              onSubmit={handleTokenConnect}
              noValidate
            >
              <div className="onboarding__field">
                <label htmlFor="ha-url-token" className="onboarding__label">
                  {t('onboarding.urlLabel')}
                </label>
                <input
                  id="ha-url-token"
                  type="url"
                  className="onboarding__input"
                  placeholder={t('onboarding.urlPlaceholder')}
                  value={tokenUrl}
                  onChange={(e) => {
                    setTokenUrl(e.target.value);
                    setTokenError(null);
                  }}
                  autoComplete="url"
                  spellCheck={false}
                  disabled={tokenLoading}
                />
              </div>

              {tokenMixedContent && (
                <div className="onboarding__warning" role="alert">
                  <AlertTriangle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{t('onboarding.mixedContentWarning')}</span>
                </div>
              )}

              <div className="onboarding__field">
                <label htmlFor="ha-token" className="onboarding__label">
                  {t('onboarding.tokenLabel')}
                </label>
                <input
                  id="ha-token"
                  type="password"
                  className="onboarding__input"
                  placeholder={t('onboarding.tokenPlaceholder')}
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setTokenError(null);
                  }}
                  autoComplete="current-password"
                  spellCheck={false}
                  disabled={tokenLoading}
                />
              </div>

              {tokenError && (
                <div className="onboarding__error" role="alert">
                  {tokenError}
                </div>
              )}

              <button
                type="submit"
                className="onboarding__connect-btn onboarding__connect-btn--secondary"
                disabled={tokenLoading}
              >
                {tokenLoading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    {t('onboarding.tokenSubmitLoading')}
                  </>
                ) : (
                  t('onboarding.tokenSubmit')
                )}
              </button>

              <p className="onboarding__token-hint">
                <Lock size={12} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />
                {t('onboarding.tokenHint')}
              </p>
            </form>
          )}
        </div>

        <div className="onboarding__divider" aria-hidden="true">{t('onboarding.divider')}</div>

        <button
          type="button"
          className="onboarding__demo-btn"
          onClick={handleDemo}
          disabled={oauthLoading || tokenLoading}
        >
          {t('onboarding.demoButton')}
        </button>
      </div>
    </div>
  );
}
