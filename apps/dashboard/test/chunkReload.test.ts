import { describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, reloadOnceForChunkError } from '../src/app/chunkReload';

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('isChunkLoadError', () => {
  it('recognises the browser messages for missing lazy chunks', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/Pool-abc.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('Unable to preload CSS for /assets/Home-1.css'))).toBe(true);
  });
  it('ignores ordinary render errors', () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'state')"))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('reloadOnceForChunkError', () => {
  it('reloads once, then not again within a minute, then again later', () => {
    const store = memStore();
    const reload = vi.fn();
    expect(reloadOnceForChunkError(1_000_000, store, reload)).toBe(true);
    expect(reloadOnceForChunkError(1_030_000, store, reload)).toBe(false);
    expect(reloadOnceForChunkError(1_061_000, store, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });
  it('does nothing without session storage', () => {
    const reload = vi.fn();
    expect(reloadOnceForChunkError(1, null, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
