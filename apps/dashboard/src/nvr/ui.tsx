/**
 * [fork] Host contract for the shared NVR UI (@sentinel-nvr/web/ui): HAPulse's
 * translate function, the resolved locale, the API client and router navigation.
 */
import React, { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { SentinelUiProvider, type TFn } from '@sentinel-nvr/web/ui';
import type { SentinelClient } from './api';
import { useT, useLocale, type TKey } from '../i18n/useT';
import { cameraPath } from './paths';
import '@sentinel-nvr/web/ui/ui.css';

/** HAPulse's typed t() as the package's string-keyed TFn (all nvr.* keys exist in HAPulse's locales). */
export function useNvrT(): TFn {
  const t = useT();
  return useMemo<TFn>(() => (k, v) => t(k as TKey, v), [t]);
}

export function NvrUi({ client, children }: { client: SentinelClient; children: ReactNode }) {
  const t = useNvrT();
  const locale = useLocale();
  const navigate = useNavigate();
  const value = useMemo(() => ({
    client, t, locale,
    nav: { openCamera: (id: string, at?: number, ev?: number) => navigate(cameraPath(id, at, ev)) },
  }), [client, t, locale, navigate]);
  return <SentinelUiProvider value={value}>{children}</SentinelUiProvider>;
}
