import { describe, expect, it } from 'vitest';
import { keepDeviceSecrets, migrateUrlToken, originOf, splitUrlToken } from '../src/stores/settingsSecrets';

const cur = {
  scryptedUrl: 'https://nvr.example.de/endpoint/@local/sentinel-nvr/public/',
  scryptedToken: 'LOCALTOKEN',
  maServerUrl: 'http://192.168.2.50:8095',
  maToken: 'MATOKEN',
};

describe('originOf / splitUrlToken', () => {
  it('origin with or without scheme', () => {
    expect(originOf('nvr.example.de/x')).toBe('https://nvr.example.de');
    expect(originOf('')).toBeNull();
  });
  it('removes only the token parameter', () => {
    expect(splitUrlToken('https://h/p/?token=abc')).toEqual({ url: 'https://h/p/', token: 'abc' });
    expect(splitUrlToken('https://h/p/?a=1&token=abc&b=2')).toEqual({ url: 'https://h/p/?a=1&b=2', token: 'abc' });
    expect(splitUrlToken('https://h/p/?a=1&token=abc')).toEqual({ url: 'https://h/p/?a=1', token: 'abc' });
    expect(splitUrlToken('https://h/p/')).toEqual({ url: 'https://h/p/', token: null });
  });
});

describe('keepDeviceSecrets', () => {
  it('same servers → this device keeps its tokens', () => {
    expect(keepDeviceSecrets(cur, { scryptedUrl: cur.scryptedUrl, maServerUrl: cur.maServerUrl })).toEqual({ scryptedToken: 'LOCALTOKEN', maToken: 'MATOKEN' });
  });
  it('a snapshot pointing at another host does NOT inherit the local token', () => {
    expect(keepDeviceSecrets(cur, { scryptedUrl: 'https://evil.example/endpoint/@local/sentinel-nvr/public/', maServerUrl: 'http://evil.example:8095' }))
      .toEqual({ scryptedToken: '', maToken: null });
  });
  it('an explicit token in the snapshot (or its URL) wins', () => {
    expect(keepDeviceSecrets(cur, { scryptedUrl: 'https://other/x', scryptedToken: 'NEW' }).scryptedToken).toBe('NEW');
    expect(keepDeviceSecrets(cur, { scryptedUrl: 'https://other/x?token=URLTOK' }).scryptedToken).toBe('URLTOK');
  });
});

describe('migrateUrlToken', () => {
  it('moves a URL token into the empty token field and cleans the URL', () => {
    expect(migrateUrlToken({ scryptedUrl: 'https://h/p/?token=abc', scryptedToken: '' })).toEqual({ scryptedUrl: 'https://h/p/', scryptedToken: 'abc' });
  });
  it('an existing token field wins, the URL is cleaned anyway', () => {
    expect(migrateUrlToken({ scryptedUrl: 'https://h/p/?token=old', scryptedToken: 'current' })).toEqual({ scryptedUrl: 'https://h/p/', scryptedToken: 'current' });
  });
});
