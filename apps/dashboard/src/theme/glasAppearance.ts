/**
 * [fork] Appearance = the classic theme (`applyTheme`, unchanged) plus the optional second style "Glas".
 *
 * Klassisch stays exactly as before: `applyAppearance` calls `applyTheme` first and, in Klassisch, only removes what
 * Glas left behind (`--g-*` inline variables, `data-glass`, `data-contrast`, the theme-color). In Glas it then writes
 * `glasCssVars(…)` from @hapulse/core inline on :root — the classic token names (so every existing component shows
 * the iOS palette without its own CSS) plus the Glas-own `--g-*` variables — and sets `data-style="glas"`, which the
 * Glas stylesheets (`styles/glas/`) key on. `prefers-contrast: more` and `prefers-reduced-transparency` are read here
 * and written as values (plan K9/K13), so `glasTokens.ts` stays the only source of numbers.
 *
 * Plan: docs/glas/PLAN-ETAPPE-0-1.md §3.3. Settings fields: `customization.uiStyle`, `.glassStrength`,
 * `.reduceTransparency` (GLOBAL).
 */

import { glasCssVars, GLAS_COLORS, GLAS_STRENGTHS } from '@hapulse/core';
import type { GlasStrength, UiStyle } from '@hapulse/core';
import { applyTheme, resolveMode } from './themes';
import type { ThemeMode, ThemeName } from './themes';
import { effectiveMode } from '../stores/settingsStore';

export interface AppearanceInput {
  theme: ThemeName;
  /** Effective mode of this device (`modeOverride` already applied) */
  mode: ThemeMode;
  accentHue?: number | undefined;
  uiStyle: UiStyle;
  glassStrength: GlasStrength;
  reduceTransparency: boolean;
}

/** What this device asks for (system settings) and what its browser can do. */
export interface MediaEnv {
  contrastMore: boolean;
  reducedTransparency: boolean;
  supportsLinear: boolean;
}

export interface StyleFields {
  uiStyle: UiStyle;
  glassStrength: GlasStrength;
  reduceTransparency: boolean;
}

export const CLASSIC_STYLE: StyleFields = { uiStyle: 'classic', glassStrength: 'clear', reduceTransparency: false };

export const normalizeUiStyle = (v: unknown): UiStyle => (v === 'glas' ? 'glas' : 'classic');
export const normalizeGlassStrength = (v: unknown): GlasStrength =>
  (GLAS_STRENGTHS as readonly unknown[]).includes(v) ? (v as GlasStrength) : 'clear';

/** The style fields of a (possibly old or hand-edited) customization object, normalized. */
export function styleFields(c: { uiStyle?: unknown; glassStrength?: unknown; reduceTransparency?: unknown } | null | undefined): StyleFields {
  return {
    uiStyle: normalizeUiStyle(c?.uiStyle),
    glassStrength: normalizeGlassStrength(c?.glassStrength),
    reduceTransparency: c?.reduceTransparency === true,
  };
}

/** Pure: the settings-store slice → what `applyAppearance` needs. `modeOverride` (this device) wins over `mode`. */
export function resolveAppearance(s: {
  theme: ThemeName;
  mode: ThemeMode;
  modeOverride?: ThemeMode | null;
  accentHue?: number | undefined;
  customization: { uiStyle?: unknown; glassStrength?: unknown; reduceTransparency?: unknown };
}): AppearanceInput {
  return { theme: s.theme, mode: effectiveMode(s), accentHue: s.accentHue, ...styleFields(s.customization) };
}

/**
 * Pure, for the pre-paint in main.tsx (the persisted store has not hydrated yet): the style fields from the raw
 * `hapulse:settings` value. Missing, broken or old data → Klassisch.
 */
export function readPersistedStyle(raw: string | null): StyleFields {
  if (!raw) return { ...CLASSIC_STYLE };
  try {
    const parsed = JSON.parse(raw) as { state?: { customization?: Record<string, unknown> } } | null;
    const c = parsed?.state?.customization;
    return c && typeof c === 'object' ? styleFields(c) : { ...CLASSIC_STYLE };
  } catch {
    return { ...CLASSIC_STYLE };
  }
}

const media = (query: string): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query) : null;

const CONTRAST_MORE = '(prefers-contrast: more)';
const REDUCED_TRANSPARENCY = '(prefers-reduced-transparency: reduce)';

export function readMediaEnv(): MediaEnv {
  return {
    contrastMore: media(CONTRAST_MORE)?.matches ?? false,
    reducedTransparency: media(REDUCED_TRANSPARENCY)?.matches ?? false,
    supportsLinear:
      typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
        ? CSS.supports('transition-timing-function', 'linear(0, 1)')
        : false,
  };
}

/** Glas strength in effect: "opaque" when the admin's switch, the system or more contrast asks for it. */
export function effectiveStrength(a: Pick<AppearanceInput, 'glassStrength' | 'reduceTransparency'>, env: MediaEnv): GlasStrength {
  return a.reduceTransparency || env.reducedTransparency || env.contrastMore ? 'opaque' : a.glassStrength;
}

/** theme-color of index.html, remembered on the first call so Klassisch gets exactly it back. */
let classicThemeColor: string | null | undefined;

function inlineGlasNames(style: CSSStyleDeclaration): string[] {
  const out: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const name = style.item(i);
    if (name.startsWith('--g-')) out.push(name);
  }
  return out;
}

/**
 * The last applied state: the settings store calls `applyAppearance` on every change, and most changes are not about
 * the appearance — Glas would otherwise rewrite ~145 properties on :root each time.
 */
let last: { root: HTMLElement; key: string } | null = null;

/** Apply theme + style to <html>. Call wherever `applyTheme` was called. */
export function applyAppearance(a: AppearanceInput, env: MediaEnv = readMediaEnv()): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const resolved = resolveMode(a.mode);
  const key = JSON.stringify([a.theme, a.mode, resolved, a.accentHue ?? null, a.uiStyle, a.glassStrength, a.reduceTransparency,
    env.contrastMore, env.reducedTransparency, env.supportsLinear]);
  if (last && last.root === root && last.key === key) return;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (classicThemeColor === undefined) classicThemeColor = meta ? meta.getAttribute('content') : null;

  // 1. Klassisch exactly as before (Glas overwrites the classic names below).
  applyTheme(a.theme, a.mode, a.accentHue);

  const glas = a.uiStyle === 'glas';
  const strength = effectiveStrength(a, env);
  const vars = glas
    ? glasCssVars({ mode: resolved, accentHue: a.accentHue, strength, contrastMore: env.contrastMore, supportsLinear: env.supportsLinear })
    : {};

  // 2. No stale Glas variable survives (switching back to Klassisch, or a value Glas no longer sets).
  for (const name of inlineGlasNames(root.style)) {
    if (!(name in vars)) root.style.removeProperty(name);
  }
  // 3. Glas values (classic names + --g-*).
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);

  // 4. Attributes the Glas CSS keys on.
  root.setAttribute('data-style', glas ? 'glas' : 'classic');
  if (glas) root.setAttribute('data-glass', strength);
  else root.removeAttribute('data-glass');
  if (glas && env.contrastMore) root.setAttribute('data-contrast', 'more');
  else root.removeAttribute('data-contrast');

  // 5. Browser/status-bar colour: the Glas page background, in Klassisch the original value.
  if (meta) {
    const color = glas ? GLAS_COLORS[resolved].bg : classicThemeColor;
    if (color == null) meta.removeAttribute('content');
    else if (meta.getAttribute('content') !== color) meta.setAttribute('content', color);
  }
  last = { root, key };
}

let unwatch: (() => void) | null = null;

/**
 * Replaces `watchSystemMode`: re-applies on OS changes — colour scheme (only in "auto", as before), more contrast and
 * reduced transparency (only in Glas). Pass a getter so the latest settings are read. Returns a cleanup function.
 */
export function watchAppearance(get: () => AppearanceInput): () => void {
  unwatch?.();
  const subs: (() => void)[] = [];
  const on = (query: string, relevant: (a: AppearanceInput) => boolean) => {
    const mql = media(query);
    if (!mql) return;
    const listener = () => {
      const a = get();
      if (relevant(a)) applyAppearance(a);
    };
    mql.addEventListener('change', listener);
    subs.push(() => mql.removeEventListener('change', listener));
  };
  on('(prefers-color-scheme: dark)', (a) => a.mode === 'auto');
  on(CONTRAST_MORE, (a) => a.uiStyle === 'glas');
  on(REDUCED_TRANSPARENCY, (a) => a.uiStyle === 'glas');
  const stop = () => {
    subs.forEach((s) => s());
    subs.length = 0;
    if (unwatch === stop) unwatch = null;
  };
  unwatch = stop;
  return stop;
}
