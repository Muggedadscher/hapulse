import { describe, expect, it } from 'vitest';
import { oauthCallbackMatches } from '../../../packages/core/src/oauthGuard';
import { sanitizeCustomization } from '../src/stores/settingsSanitize';

const state = (hassUrl: string) => btoa(JSON.stringify({ hassUrl, clientId: 'https://dash/' }));

describe('oauthCallbackMatches (login CSRF)', () => {
  it('no callback → nothing to check', () => {
    expect(oauthCallbackMatches('', 'https://ha.example')).toBe(true);
    expect(oauthCallbackMatches('?foo=1', undefined)).toBe(true);
  });
  it('the callback must name the instance the sign-in was started for', () => {
    expect(oauthCallbackMatches(`?auth_callback=1&code=x&state=${state('https://ha.example')}`, 'https://ha.example/')).toBe(true);
    expect(oauthCallbackMatches(`?auth_callback=1&code=x&state=${state('https://evil.example')}`, 'https://ha.example')).toBe(false);
    expect(oauthCallbackMatches('?auth_callback=1&code=x&state=garbage', 'https://ha.example')).toBe(false);
    expect(oauthCallbackMatches(`?auth_callback=1&code=x&state=${state('https://ha.example')}`, undefined)).toBe(false);
  });
});

describe('sanitizeCustomization', () => {
  const defaults = { scryptedUrl: '', favorites: [] as string[], entityOrder: {} as Record<string, string[]>, maServerUrl: null as string | null, compact: false, cols: 3 };
  it('drops values of the wrong type, keeps the rest', () => {
    expect(sanitizeCustomization({ scryptedUrl: 123, favorites: 'x', entityOrder: [], compact: 'yes', cols: 4, maServerUrl: 'http://ma', extra: 1 }, defaults))
      .toEqual({ cols: 4, maServerUrl: 'http://ma', extra: 1 });
    expect(sanitizeCustomization(null, defaults)).toEqual({});
    expect(sanitizeCustomization({ maServerUrl: null, favorites: ['a'] }, defaults)).toEqual({ maServerUrl: null, favorites: ['a'] });
  });
});
