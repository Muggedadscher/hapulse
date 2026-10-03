import { describe, expect, it } from 'vitest';
import { clientFor, resolveNvrConfig, storedNvrUrl } from '../src/nvr/config';

const PUBLIC = '/endpoint/@local/sentinel-nvr/public/';

describe('resolveNvrConfig', () => {
  it('no URL → no config', () => {
    expect(resolveNvrConfig('', 'TOK')).toBeNull();
    expect(resolveNvrConfig('   ', '')).toBeNull();
  });

  it('address: origin of whatever Sentinel/Scrypted URL was pasted, https when no scheme', () => {
    const c = resolveNvrConfig('nvr.example:10443', 'TOK')!;
    expect(c.origin).toBe('https://nvr.example:10443');
    expect(c.prefix).toBe('');
    expect(c.client.base).toBe(`https://nvr.example:10443${PUBLIC}`);
    expect(resolveNvrConfig(`http://192.168.2.120:11080${PUBLIC}#/timeline/33`, 'TOK')!.origin).toBe('http://192.168.2.120:11080');
  });

  it('reverse-proxy prefix in front of /endpoint/ is kept in the request base', () => {
    const c = resolveNvrConfig(`https://home.example/scrypted${PUBLIC}`, 'TOK')!;
    expect(c.origin).toBe('https://home.example');
    expect(c.prefix).toBe('/scrypted');
    expect(c.client.base).toBe(`https://home.example/scrypted${PUBLIC}`);
    // what Settings stores keeps the prefix; without one the bare origin
    expect(storedNvrUrl(c.origin, c.prefix)).toBe(`https://home.example/scrypted${PUBLIC}`);
    expect(storedNvrUrl('https://nvr.example', '')).toBe('https://nvr.example');
  });

  it('token: the setting wins over a token inside the URL; the URL token is the fallback', () => {
    const url = `https://nvr.example${PUBLIC}?token=FROMURL`;
    expect(resolveNvrConfig(url, 'SETTING')!.token).toBe('SETTING');
    expect(resolveNvrConfig(url, '  ')!.token).toBe('FROMURL');
    expect(resolveNvrConfig('https://nvr.example', '')!.token).toBe('');
    expect(resolveNvrConfig(url, ' SETTING ')!.token).toBe('SETTING');
  });

  it('the client is reused while origin, token and base stay, rebuilt when one changes', () => {
    const a = clientFor('https://nvr.example', 'T1');
    expect(clientFor('https://nvr.example', 'T1')).toBe(a);
    const b = clientFor('https://nvr.example', 'T2');
    expect(b).not.toBe(a);
    expect(b.key).not.toBe(a.key);
    const c = clientFor('https://nvr.example', 'T2', '/scrypted');
    expect(c).not.toBe(b);
    expect(c.base).toBe(`https://nvr.example/scrypted${PUBLIC}`);
  });
});
