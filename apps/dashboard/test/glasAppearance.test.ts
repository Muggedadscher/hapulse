import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEMES, GLAS_COLORS } from '@hapulse/core';

// --- a minimal <html> + <meta name="theme-color">: inline style keeps insertion order like the CSSOM -----------------
class FakeStyle {
  private props = new Map<string, string>();
  get length() { return this.props.size; }
  item(i: number) { return [...this.props.keys()][i] ?? ''; }
  setProperty(name: string, value: string) { this.props.set(name, value); }
  removeProperty(name: string) { const v = this.props.get(name) ?? ''; this.props.delete(name); return v; }
  getPropertyValue(name: string) { return this.props.get(name) ?? ''; }
  entries() { return [...this.props.entries()]; }
}
class FakeEl {
  attrs = new Map<string, string>();
  style = new FakeStyle();
  getAttribute(n: string) { return this.attrs.get(n) ?? null; }
  setAttribute(n: string, v: string) { this.attrs.set(n, v); }
  removeAttribute(n: string) { this.attrs.delete(n); }
}

/** matchMedia with switchable answers and change listeners. */
function fakeMedia(initial: Record<string, boolean>) {
  const state = { ...initial };
  const listeners = new Map<string, Set<() => void>>();
  return {
    state,
    matchMedia: (q: string) => ({
      get matches() { return state[q] ?? false; },
      addEventListener: (_: string, l: () => void) => { if (!listeners.has(q)) listeners.set(q, new Set()); listeners.get(q)!.add(l); },
      removeEventListener: (_: string, l: () => void) => { listeners.get(q)?.delete(l); },
    }),
    flip(q: string, v: boolean) { state[q] = v; listeners.get(q)?.forEach((l) => l()); },
    count(q: string) { return listeners.get(q)?.size ?? 0; },
  };
}

const DARK = '(prefers-color-scheme: dark)';
const MORE = '(prefers-contrast: more)';
const LESS_GLASS = '(prefers-reduced-transparency: reduce)';

let root: FakeEl;
let meta: FakeEl;
let media: ReturnType<typeof fakeMedia>;

function installDom() {
  root = new FakeEl();
  meta = new FakeEl();
  meta.setAttribute('name', 'theme-color');
  meta.setAttribute('content', '#f3f4f6');
  media = fakeMedia({});
  vi.stubGlobal('document', { documentElement: root, querySelector: (s: string) => (s === 'meta[name="theme-color"]' ? meta : null) });
  vi.stubGlobal('window', { matchMedia: media.matchMedia });
}

const G = await import('../src/theme/glasAppearance');
type Input = import('../src/theme/glasAppearance').AppearanceInput;

const ENV = { contrastMore: false, reducedTransparency: false, supportsLinear: true };
const classic = (over: Partial<Input> = {}): Input => ({
  theme: 'aurora', mode: 'light', uiStyle: 'classic', glassStrength: 'clear', reduceTransparency: false, ...over,
});
const glas = (over: Partial<Input> = {}): Input => classic({ uiStyle: 'glas', ...over });
const glasVars = () => root.style.entries().filter(([k]) => k.startsWith('--g-'));
const domState = () => ({ style: root.style.entries(), attrs: [...root.attrs.entries()].sort(), themeColor: meta.getAttribute('content') });

beforeEach(installDom);
afterEach(() => vi.unstubAllGlobals());

describe('resolveAppearance / readPersistedStyle', () => {
  it('normalizes the stored fields; the device override wins over the shared mode', () => {
    const base = { theme: 'ocean' as const, mode: 'light' as const, accentHue: 200 };
    expect(G.resolveAppearance({ ...base, modeOverride: 'dark', customization: { uiStyle: 'glas', glassStrength: 'tinted', reduceTransparency: true } }))
      .toEqual({ theme: 'ocean', mode: 'dark', accentHue: 200, uiStyle: 'glas', glassStrength: 'tinted', reduceTransparency: true });
    expect(G.resolveAppearance({ ...base, modeOverride: null, customization: { uiStyle: 'Glas', glassStrength: 'milky', reduceTransparency: 'yes' } }))
      .toMatchObject({ mode: 'light', uiStyle: 'classic', glassStrength: 'clear', reduceTransparency: false });
    expect(G.resolveAppearance({ ...base, customization: {} })).toMatchObject({ uiStyle: 'classic', glassStrength: 'clear', reduceTransparency: false });
  });

  it('reads the style from the raw persisted settings before the store hydrates', () => {
    const raw = (customization: unknown) => JSON.stringify({ state: { theme: 'aurora', customization }, version: 0 });
    expect(G.readPersistedStyle(null)).toEqual(G.CLASSIC_STYLE);
    expect(G.readPersistedStyle('{not json')).toEqual(G.CLASSIC_STYLE);
    expect(G.readPersistedStyle(JSON.stringify({ state: { theme: 'aurora' } }))).toEqual(G.CLASSIC_STYLE); // before Glas existed
    expect(G.readPersistedStyle('null')).toEqual(G.CLASSIC_STYLE);
    expect(G.readPersistedStyle(raw({ uiStyle: 'glas', glassStrength: 'opaque', reduceTransparency: true })))
      .toEqual({ uiStyle: 'glas', glassStrength: 'opaque', reduceTransparency: true });
    expect(G.readPersistedStyle(raw({ uiStyle: 42, glassStrength: null }))).toEqual(G.CLASSIC_STYLE);
  });
});

describe('applyAppearance', () => {
  it('Klassisch writes exactly the classic theme and no Glas trace', () => {
    G.applyAppearance(classic(), ENV);
    expect(root.style.getPropertyValue('--bg')).toBe(THEMES.aurora.light.bg);
    expect(glasVars()).toEqual([]);
    expect(root.getAttribute('data-style')).toBe('classic');
    expect(root.getAttribute('data-glass')).toBeNull();
    expect(root.getAttribute('data-contrast')).toBeNull();
    expect(meta.getAttribute('content')).toBe('#f3f4f6');
  });

  it('Glas writes the iOS palette on the classic names, the --g-* variables and the attributes', () => {
    G.applyAppearance(glas(), ENV);
    expect(root.style.getPropertyValue('--bg')).toBe('#F2F2F7');
    expect(root.style.getPropertyValue('--accent')).toBe('#A64B00');
    expect(root.style.getPropertyValue('--g-accent')).toBe('#FF9500');
    expect(glasVars().length).toBeGreaterThan(100);
    expect(root.getAttribute('data-style')).toBe('glas');
    expect(root.getAttribute('data-glass')).toBe('clear');
    expect(root.getAttribute('data-mode')).toBe('light');
    expect(meta.getAttribute('content')).toBe(GLAS_COLORS.light.bg);

    G.applyAppearance(glas({ mode: 'dark' }), ENV);
    expect(root.style.getPropertyValue('--bg')).toBe('#000000');
    expect(meta.getAttribute('content')).toBe('#000000');
  });

  it('Glas → Klassisch leaves exactly the state of a fresh Klassisch load', () => {
    for (const over of [{}, { accentHue: 200 }, { theme: 'forest' as const, mode: 'dark' as const }]) {
      installDom();
      G.applyAppearance(classic(over), ENV);
      const fresh = domState();

      installDom();
      G.applyAppearance(glas({ ...over, glassStrength: 'tinted' }), { ...ENV, contrastMore: true });
      expect(glasVars().length).toBeGreaterThan(0);
      G.applyAppearance(classic(over), ENV);
      expect(domState()).toEqual(fresh);
    }
  });

  it('"reduce transparency", the system setting and more contrast make the glass opaque', () => {
    G.applyAppearance(glas({ glassStrength: 'tinted' }), ENV);
    expect(root.getAttribute('data-glass')).toBe('tinted');
    expect(root.style.getPropertyValue('--g-glass-tint')).toBe('0.75');

    G.applyAppearance(glas({ reduceTransparency: true }), ENV);
    expect(root.getAttribute('data-glass')).toBe('opaque');
    expect(root.style.getPropertyValue('--g-glass-tint')).toBe('1');

    G.applyAppearance(glas(), { ...ENV, reducedTransparency: true });
    expect(root.getAttribute('data-glass')).toBe('opaque');

    G.applyAppearance(glas(), { ...ENV, contrastMore: true });
    expect(root.getAttribute('data-glass')).toBe('opaque');
    expect(root.getAttribute('data-contrast')).toBe('more');
    expect(root.style.getPropertyValue('--text-dim')).toBe(GLAS_COLORS.light.glassLabel2);

    G.applyAppearance(glas(), ENV);
    expect(root.getAttribute('data-glass')).toBe('clear');
    expect(root.getAttribute('data-contrast')).toBeNull();
    expect(root.style.getPropertyValue('--text-dim')).toBe(GLAS_COLORS.light.label2);
  });

  it('without linear() the springs fall back to cubic-bezier', () => {
    G.applyAppearance(glas(), { ...ENV, supportsLinear: false });
    expect(root.style.getPropertyValue('--g-spring-smooth')).toMatch(/^cubic-bezier\(/);
    G.applyAppearance(glas(), ENV);
    expect(root.style.getPropertyValue('--g-spring-smooth')).toMatch(/^linear\(/);
  });

  it('an unchanged appearance is not written again (the store calls on every settings change)', () => {
    G.applyAppearance(glas(), ENV);
    const set = vi.spyOn(root.style, 'setProperty');
    const attr = vi.spyOn(root, 'setAttribute');
    G.applyAppearance(glas(), { ...ENV });
    expect(set).not.toHaveBeenCalled();
    expect(attr).not.toHaveBeenCalled();
    G.applyAppearance(glas({ glassStrength: 'tinted' }), ENV);
    expect(set).toHaveBeenCalled();
    expect(root.getAttribute('data-glass')).toBe('tinted');
  });

  it('"auto" follows the system colour scheme in both styles', () => {
    media.state[DARK] = true;
    G.applyAppearance(glas({ mode: 'auto' }), ENV);
    expect(root.style.getPropertyValue('--bg')).toBe('#000000');
    expect(root.getAttribute('data-mode')).toBe('dark');
  });
});

describe('watchAppearance', () => {
  it('re-applies on a system switch: colour scheme only in "auto", contrast and transparency only in Glas', () => {
    let current = glas({ mode: 'auto' });
    const stop = G.watchAppearance(() => current);
    G.applyAppearance(current, G.readMediaEnv());
    expect(root.style.getPropertyValue('--bg')).toBe('#F2F2F7');

    media.flip(DARK, true);
    expect(root.style.getPropertyValue('--bg')).toBe('#000000');
    expect(root.getAttribute('data-style')).toBe('glas'); // Glas survives the OS switch

    media.flip(MORE, true);
    expect(root.getAttribute('data-contrast')).toBe('more');
    media.flip(MORE, false);
    media.flip(LESS_GLASS, true);
    expect(root.getAttribute('data-glass')).toBe('opaque');
    media.flip(LESS_GLASS, false);
    expect(root.getAttribute('data-glass')).toBe('clear');

    current = classic({ mode: 'light' });
    G.applyAppearance(current, G.readMediaEnv());
    const before = domState();
    media.flip(DARK, false);
    media.flip(MORE, true);
    expect(domState()).toEqual(before); // Klassisch with a fixed mode ignores all three

    stop();
    expect(media.count(DARK) + media.count(MORE) + media.count(LESS_GLASS)).toBe(0);
  });

  it('a second watch replaces the first (no double listeners)', () => {
    G.watchAppearance(() => classic());
    const stop = G.watchAppearance(() => classic());
    expect(media.count(DARK)).toBe(1);
    stop();
    expect(media.count(DARK)).toBe(0);
  });
});
