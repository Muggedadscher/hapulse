/**
 * [fork] NVR connection setup — a centred card when nothing is configured and
 * a modal (gear button) to edit later. Fields: Scrypted URL + either the Sentinel
 * access token or a Scrypted account (username/password → the plugin hands out
 * the token: `api/token-exchange`), with a "test connection" probe against `api/stats`.
 *
 * Pasting Sentinel's embed URL (`…/public/?token=…`) fills the token in
 * automatically (`parseSentinelSetup`). Only the token is stored (device-local),
 * never the password.
 */

import React, { useEffect, useState } from 'react';
import { Cctv, Check, KeyRound, Link2, RefreshCw, User } from 'lucide-react';
import { exchangeSentinelToken, parseSentinelSetup } from '@sentinel-nvr/web/api';
import { useSettingsStore } from '../../stores/settingsStore';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { useT } from '../../i18n/useT';
import { SentinelHttpError } from '../api';
import { useNvrStore } from '../store';
import { clientFor, storedNvrUrl } from '../config';

type Probe = { state: 'idle' } | { state: 'busy' } | { state: 'ok'; cameras: number } | { state: 'fail'; status: number; step: 'login' | 'probe' };
type AuthMode = 'token' | 'login';

function useSetupForm(onSaved?: () => void) {
  const t = useT();
  const scryptedUrl = useSettingsStore((s) => s.customization.scryptedUrl);
  const scryptedToken = useSettingsStore((s) => s.customization.scryptedToken);
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);
  const [url, setUrl] = useState(scryptedUrl);
  const [token, setToken] = useState(scryptedToken);
  const [mode, setMode] = useState<AuthMode>('token');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [probe, setProbe] = useState<Probe>({ state: 'idle' });
  useEffect(() => { setUrl(scryptedUrl); setToken(scryptedToken); }, [scryptedUrl, scryptedToken]);

  const parsed = parseSentinelSetup(url);
  const typedToken = token.trim() || parsed?.token || '';
  const valid = parsed != null && (mode === 'token' ? typedToken !== '' : user.trim() !== '' && password !== '');

  /** A pasted embed URL carries the token — it replaces the token field (a rotated token in a freshly pasted URL
   *  must win over the stored one the field was prefilled with). */
  const onUrlChange = (v: string) => {
    setUrl(v);
    const p = parseSentinelSetup(v);
    if (p?.token) setToken(p.token);
    setProbe({ state: 'idle' });
  };

  /** The token to use: typed/pasted, or fetched with the Scrypted account (login mode). */
  const resolveToken = async (): Promise<string> => {
    if (mode === 'token' || !parsed) return typedToken;
    return exchangeSentinelToken(parsed.origin, user.trim(), password, 10_000, parsed.prefix ?? '');
  };

  const test = async () => {
    if (!parsed) return;
    setProbe({ state: 'busy' });
    let tok = '';
    try { tok = await resolveToken(); } catch (e) {
      setProbe({ state: 'fail', status: e instanceof SentinelHttpError ? e.status : 0, step: 'login' }); return;
    }
    try {
      const c = clientFor(parsed.origin, tok, parsed.prefix ?? '');
      const st = await c.getJson<{ cameras: number }>('api/stats');
      setProbe({ state: 'ok', cameras: st.cameras });
    } catch (e) {
      setProbe({ state: 'fail', status: e instanceof SentinelHttpError ? e.status : 0, step: 'probe' });
    }
  };

  const save = async () => {
    if (!parsed || !valid) return;
    let tok = '';
    try { tok = await resolveToken(); } catch (e) {
      setProbe({ state: 'fail', status: e instanceof SentinelHttpError ? e.status : 0, step: 'login' }); return;
    }
    updateCustomization({ scryptedUrl: storedNvrUrl(parsed.origin, parsed.prefix ?? ''), scryptedToken: tok });
    setPassword('');
    useNvrStore.getState().reset();
    onSaved?.();
  };

  const failText = (p: Extract<Probe, { state: 'fail' }>): string => {
    if (p.step === 'login') {
      if (p.status === 401) return t('nvr.setup.loginFailed');
      if (p.status === 403) return t('nvr.setup.loginDisabled');
      if (p.status === 404) return t('nvr.setup.loginOld');
      if (p.status === 429) return t('nvr.setup.loginBusy');
    }
    if (p.status === 401) return t('nvr.setup.testUnauthorized');
    return p.status ? t('nvr.setup.testHttp', { status: p.status }) : t('nvr.setup.testUnreachable');
  };
  const probeText = probe.state === 'ok' ? t('nvr.setup.testOk', { count: probe.cameras }) : probe.state === 'fail' ? failText(probe) : null;

  const fields = (
    <div className="nvr-setup__fields">
      <label className="nvr-setup__field">
        <span className="nvr-setup__label"><Link2 size={14} strokeWidth={2} />{t('nvr.setup.urlLabel')}</span>
        <input
          className="nvr-input"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('nvr.setup.urlPlaceholder')}
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
        />
      </label>
      <div className="mode-toggle nvr-setup__mode" role="group" aria-label={t('nvr.setup.authToken') + ' / ' + t('nvr.setup.authLogin')}>
        {(['token', 'login'] as const).map((m) => (
          <button key={m} type="button" className={`mode-toggle__btn${mode === m ? ' mode-toggle__btn--active' : ''}`} onClick={() => { setMode(m); setProbe({ state: 'idle' }); }} aria-pressed={mode === m}>
            {m === 'token' ? t('nvr.setup.authToken') : t('nvr.setup.authLogin')}
          </button>
        ))}
      </div>
      {mode === 'token' ? (
        <label className="nvr-setup__field">
          <span className="nvr-setup__label"><KeyRound size={14} strokeWidth={2} />{t('nvr.setup.tokenLabel')}</span>
          <input
            className="nvr-input data-font"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={t('nvr.setup.tokenPlaceholder')}
            value={token}
            onChange={(e) => { setToken(e.target.value); setProbe({ state: 'idle' }); }}
          />
        </label>
      ) : (
        <>
          <label className="nvr-setup__field">
            <span className="nvr-setup__label"><User size={14} strokeWidth={2} />{t('nvr.setup.userLabel')}</span>
            <input className="nvr-input" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} value={user} onChange={(e) => { setUser(e.target.value); setProbe({ state: 'idle' }); }} />
          </label>
          <label className="nvr-setup__field">
            <span className="nvr-setup__label"><KeyRound size={14} strokeWidth={2} />{t('nvr.setup.passwordLabel')}</span>
            <input className="nvr-input" type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setProbe({ state: 'idle' }); }} />
          </label>
          <p className="nvr-setup__hint nvr-setup__hint--inline">{t('nvr.setup.loginHint')}</p>
        </>
      )}
      {probeText && (
        <p className={`nvr-setup__probe nvr-setup__probe--${probe.state}`} role="status">{probeText}</p>
      )}
    </div>
  );

  const actions = (
    <div className="nvr-setup__actions">
      <button type="button" className="btn btn--ghost" disabled={!valid || probe.state === 'busy'} onClick={() => void test()}>
        <RefreshCw size={16} strokeWidth={1.75} className={probe.state === 'busy' ? 'nvr-spin' : undefined} />
        {t('nvr.setup.test')}
      </button>
      <button type="button" className="btn btn--primary" disabled={!valid || probe.state === 'busy'} onClick={() => void save()}>
        <Check size={16} strokeWidth={2} />
        {t('nvr.setup.save')}
      </button>
    </div>
  );

  return { fields, actions, valid, save };
}

/** Shown on the NVR page while nothing is configured. */
export function NvrSetupCard() {
  const t = useT();
  const { fields, actions, valid, save } = useSetupForm();
  return (
    <Card className="nvr-setup" as="section">
      <span className="nvr-setup__icon" aria-hidden="true"><Cctv size={26} strokeWidth={1.75} /></span>
      <h2 className="nvr-setup__title">{t('nvr.setup.title')}</h2>
      <p className="nvr-setup__desc">{t('nvr.setup.desc')}</p>
      <form className="nvr-setup__form" noValidate onSubmit={(e) => { e.preventDefault(); if (valid) void save(); }}>
        {fields}
        {actions}
      </form>
      <p className="nvr-setup__hint">{t('nvr.setup.hint')}</p>
    </Card>
  );
}

/** Edit an existing connection (gear button on the NVR page). */
export function NvrSetupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { fields, actions, valid, save } = useSetupForm(onClose);
  return (
    <Modal open={open} onClose={onClose} title={t('nvr.setup.modalTitle')} icon={<Cctv size={18} strokeWidth={1.75} />} footer={actions}>
      <p className="nvr-setup__desc nvr-setup__desc--modal">{t('nvr.setup.desc')}</p>
      {/* a form: Enter in a field saves, like on the setup card */}
      <form noValidate onSubmit={(e) => { e.preventDefault(); if (valid) void save(); }}>
        {fields}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
      <p className="nvr-setup__hint">{t('nvr.setup.hint')}</p>
    </Modal>
  );
}
