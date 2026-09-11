/**
 * [fork] NVR connection setup — a centred card when nothing is configured and
 * a modal (gear button) to edit later. Fields: Scrypted URL + Sentinel access
 * token, with a "test connection" probe against `api/stats`.
 *
 * Pasting Sentinel's embed URL (`…/public/?token=…`) fills the token in
 * automatically (`parseSentinelSetup`).
 */

import React, { useEffect, useState } from 'react';
import { Cctv, Check, KeyRound, Link2, RefreshCw } from 'lucide-react';
import { parseSentinelSetup } from '@hapulse/core';
import { useSettingsStore } from '../../stores/settingsStore';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { useT } from '../../i18n/useT';
import { SentinelClient, SentinelHttpError } from '../api';
import { useNvrStore } from '../store';

type Probe = { state: 'idle' } | { state: 'busy' } | { state: 'ok'; cameras: number } | { state: 'fail'; status: number };

function useSetupForm(onSaved?: () => void) {
  const t = useT();
  const scryptedUrl = useSettingsStore((s) => s.customization.scryptedUrl);
  const scryptedToken = useSettingsStore((s) => s.customization.scryptedToken);
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);
  const [url, setUrl] = useState(scryptedUrl);
  const [token, setToken] = useState(scryptedToken);
  const [probe, setProbe] = useState<Probe>({ state: 'idle' });
  useEffect(() => { setUrl(scryptedUrl); setToken(scryptedToken); }, [scryptedUrl, scryptedToken]);

  const parsed = parseSentinelSetup(url);
  const effectiveToken = token.trim() || parsed?.token || '';
  const valid = parsed != null && effectiveToken !== '';

  /** A pasted embed URL carries the token — surface it in the token field. */
  const onUrlChange = (v: string) => {
    setUrl(v);
    const p = parseSentinelSetup(v);
    if (p?.token && !token.trim()) setToken(p.token);
    setProbe({ state: 'idle' });
  };

  const test = async () => {
    if (!parsed) return;
    setProbe({ state: 'busy' });
    try {
      const c = new SentinelClient(parsed.origin, effectiveToken);
      const st = await c.getJson<{ cameras: number }>('api/stats');
      setProbe({ state: 'ok', cameras: st.cameras });
    } catch (e) {
      setProbe({ state: 'fail', status: e instanceof SentinelHttpError ? e.status : 0 });
    }
  };

  const save = () => {
    if (!parsed) return;
    updateCustomization({ scryptedUrl: parsed.origin, scryptedToken: effectiveToken });
    useNvrStore.getState().reset();
    onSaved?.();
  };

  const probeText = probe.state === 'ok'
    ? t('nvr.setup.testOk', { count: probe.cameras })
    : probe.state === 'fail'
      ? (probe.status === 401 ? t('nvr.setup.testUnauthorized') : probe.status ? t('nvr.setup.testHttp', { status: probe.status }) : t('nvr.setup.testUnreachable'))
      : null;

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
      <button type="button" className="btn btn--primary" disabled={!valid} onClick={save}>
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
      <form className="nvr-setup__form" onSubmit={(e) => { e.preventDefault(); if (valid) save(); }}>
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
  const { fields, actions } = useSetupForm(onClose);
  return (
    <Modal open={open} onClose={onClose} title={t('nvr.setup.modalTitle')} icon={<Cctv size={18} strokeWidth={1.75} />} footer={actions}>
      <p className="nvr-setup__desc nvr-setup__desc--modal">{t('nvr.setup.desc')}</p>
      {fields}
      <p className="nvr-setup__hint">{t('nvr.setup.hint')}</p>
    </Modal>
  );
}
