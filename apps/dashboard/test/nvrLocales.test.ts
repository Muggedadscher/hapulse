// [fork] HAPulse translates the shared package's nvr.* keys with its OWN dictionaries (nvr/ui.tsx) — a key the package
// adds but HAPulse lacks shows up raw in the UI (happened with the 0.14.0 PiP note). Every package key must exist here.
import { describe, expect, it } from 'vitest';
import pkgEn from '@sentinel-nvr/web/ui/locales/en.json';
import en from '../../../packages/core/locales/en.json';

describe('@sentinel-nvr/web keys in HAPulse locales', () => {
  it('every nvr.* key of the package exists in HAPulse (en; the core smoke test keeps all locales in parity)', () => {
    const missing = Object.keys(pkgEn).filter((k) => k.startsWith('nvr.') && !(k in en));
    expect(missing).toEqual([]);
  });
});
