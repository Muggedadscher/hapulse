import { describe, expect, it } from 'vitest';
import { useGlasUiStore } from '../src/stores/glasUiStore';

describe('glasUiStore: immersive', () => {
  it('stays set while any page holds it (two camera pages overlap while the route changes)', () => {
    const st = () => useGlasUiStore.getState();
    expect(st().immersive).toBe(false);
    const a = st().holdImmersive();
    const b = st().holdImmersive();
    expect(st().immersive).toBe(true);
    a();
    expect(st().immersive).toBe(true);
    a(); // a second release changes nothing
    expect(st().immersive).toBe(true);
    b();
    expect(st().immersive).toBe(false);
    const c = st().holdImmersive();
    expect(st().immersive).toBe(true);
    c();
    expect(st().immersive).toBe(false);
  });
});
