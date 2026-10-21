/**
 * [fork] HAPulse leads the Glas look, the Sentinel package carries a copy for the parts both apps show (@sentinel-nvr/web
 * ≥ 0.21.0, plan PLAN-SENTINEL-GLAS S2). This keeps the copy equal to HAPulse:
 * - the values: the package's `@sentinel-nvr/web/glas` (a verbatim copy of `packages/core/src/glasTokens.ts`) gives the
 *   same constants and the same results;
 * - the rules HAPulse keeps for its own parts and the package holds for the NVR (tafel.css for the tafel of the other
 *   pages, the glass recipe of material.css, the tafel's no-tint of pages.css): every package rule on `.nvr-tafel` or
 *   `.nvr-glass` has its HAPulse rule, in the same at-rules, with the same declarations.
 * Both ways: a changed, removed or new rule in HAPulse fails here until the package has it too (change it in the package's glas.css,
 * release, bump) — or the other way round after a package update.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss, { type AtRule, type Rule } from 'postcss';
// the module itself, not @hapulse/core's selection of it: the package copies the whole file
import * as core from '../../../packages/core/src/glasTokens';
import * as pkg from '@sentinel-nvr/web/glas';

const GLAS = join(__dirname, '../src/styles/glas');
const PACKAGE_GLAS_CSS = join(__dirname, '../../../node_modules/@sentinel-nvr/web/dist/ui/glas.css');

describe('Glas values: @sentinel-nvr/web/glas = @hapulse/core', () => {
  const shared = Object.keys(pkg).filter((k) => k in core) as (keyof typeof pkg & keyof typeof core)[];

  it('shares the values module (constants equal)', () => {
    for (const k of ['GLAS_COLORS', 'GLAS_TINT', 'GLAS_SURFACE_TINT', 'GLAS_SHADOWS', 'GLAS_WINDOW_SHADOWS', 'GLAS_SPRINGS', 'GLAS_STRENGTHS', 'UI_STYLES'])
      expect(shared, k).toContain(k);
    expect(Object.keys(pkg).filter((k) => !(k in core) && /^[A-Z_]+$|^glas|^[a-z]+[A-Z]/.test(k) && !['applyAppearance', 'watchAppearance', 'setAppearanceHost', 'setImmersiveThemeColor', 'darkScopeCss', 'effectiveStrength', 'normalizeUiStyle', 'normalizeGlassStrength', 'styleFields', 'readMediaEnv', 'CLASSIC_STYLE', 'DARK_SCOPE_ID'].includes(k))).toEqual([]);
    for (const k of shared) {
      const v = (pkg as Record<string, unknown>)[k];
      if (typeof v !== 'function') expect(v, k).toEqual((core as Record<string, unknown>)[k]);
    }
  });

  it('computes the same variables, tokens and accents', () => {
    const p = pkg as unknown as typeof core;
    for (const mode of ['light', 'dark'] as const) {
      for (const strength of ['clear', 'tinted', 'opaque'] as const) {
        for (const contrastMore of [false, true]) {
          for (const supportsLinear of [false, true]) {
            const input = { mode, strength, contrastMore, supportsLinear };
            expect(p.glasCssVars(input)).toEqual(core.glasCssVars(input));
          }
        }
      }
      for (const hue of [undefined, 0, 30, 140, 210, 300]) {
        expect(p.glasAccent(hue, mode)).toEqual(core.glasAccent(hue, mode));
        const input = { mode, strength: 'tinted', contrastMore: false, supportsLinear: true, accentHue: hue } as Parameters<typeof core.glasThemeTokens>[0];
        expect(p.glasThemeTokens(input)).toEqual(core.glasThemeTokens(input));
      }
    }
  });
});

const ws = (s: string) => s.replace(/\s+/g, ' ').trim();
/** a rule's at-rules from the outside in, e.g. "@media (min-width: 900px)" */
const within = (r: Rule) => {
  const out: string[] = [];
  for (let p = r.parent; p && p.type === 'atrule'; p = p.parent) out.unshift(`@${(p as AtRule).name} ${(p as AtRule).params.replace(/\bnvr-tafel\b/, 'g-tafel')}`);
  return out.join(' ');
};
const decls = (r: Rule) =>
  r.nodes.filter((n) => n.type === 'decl').map((d) => {
    const decl = d as postcss.Declaration;
    return `${decl.prop.replace(/--nvr-tafel-/, '--g-tafel-')}: ${ws(decl.value).replace(/--nvr-tafel-/g, '--g-tafel-').replace(/\bnvr-tafel\b/, 'g-tafel')}${decl.important ? ' !important' : ''}`;
  });
function close(s: string, i: number) {
  let d = 0;
  for (let k = i; k < s.length; k++) {
    if (s[k] === '(') d++;
    else if (s[k] === ')' && --d === 0) return k;
  }
  return s.length;
}
function splitTop(s: string) {
  const out: string[] = [];
  let d = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') d++;
    if (ch === ')') d--;
    if (ch === ',' && !d) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
/** a HAPulse selector as the package names it: its tafel and glass classes renamed, in :is()/:where() lists only the
 *  alternatives with those (the other alternatives are HAPulse's own parts) */
function asPackage(sel: string): string | null {
  let s = sel
    .replace(/\.card\.g-tafel/g, '.nvr-card.nvr-tafel')
    .replace(/\.g-tafel/g, '.nvr-tafel')
    .replace(/\.g-glass(?![\w-]*__)(?=[\s.:,)[>-]|$)/g, '.nvr-glass')
    .replace(/:where\(\.card\)/g, ':where(.nvr-card)');
  const ours = (alt: string) => /\.nvr-(tafel|glass|card)/.test(alt) && !/\.(?!nvr-)[_a-zA-Z][\w-]*/.test(alt.replace(/\.nvr-[\w-]+/g, ''));
  for (const m of [...s.matchAll(/:(is|where)\(/g)].reverse()) {
    const open = m.index! + m[0].length - 1;
    const end = close(s, open);
    const alts = splitTop(s.slice(open + 1, end));
    const keep = alts.filter(ours);
    if (!keep.length) continue;
    const rep = m[1] === 'is' && keep.length === 1 ? keep[0]! : `:${m[1]}(${keep.join(', ')})`;
    s = s.slice(0, m.index) + rep + s.slice(end + 1);
  }
  return /\.nvr-(tafel|glass)/.test(s) ? ws(s) : null;
}

describe('Glas rules: the package keeps HAPulse’s tafel and glass recipe', () => {
  const hp = new Map<string, string[][]>();
  for (const f of ['material.css', 'pages.css', 'tafel.css']) {
    postcss.parse(readFileSync(join(GLAS, f), 'utf8')).walkRules((r) => {
      if (r.parent?.type === 'atrule' && /keyframes/.test((r.parent as AtRule).name)) return;
      for (const s of r.selectors) {
        const p = asPackage(s);
        if (!p) continue;
        const key = `${within(r)} | ${p}`;
        hp.set(key, [...(hp.get(key) ?? []), decls(r)]);
      }
    });
  }
  const pkgRules: { key: string; decls: string[] }[] = [];
  postcss.parse(readFileSync(PACKAGE_GLAS_CSS, 'utf8')).walkRules((r) => {
    if (r.parent?.type === 'atrule' && /keyframes/.test((r.parent as AtRule).name)) return;
    for (const s of r.selectors) if (/\.nvr-(tafel|glass)/.test(s)) pkgRules.push({ key: `${within(r)} | ${ws(s)}`, decls: decls(r) });
  });

  it('finds the rules (a broken parser would pass with nothing to compare)', () => {
    expect(pkgRules.length).toBeGreaterThan(30);
  });

  it('every package rule on the tafel or the glass has HAPulse’s declarations', () => {
    const missing = pkgRules.filter((r) => !hp.has(r.key)).map((r) => r.key);
    expect(missing).toEqual([]);
    const differ = pkgRules
      .filter((r) => hp.has(r.key) && !hp.get(r.key)!.some((d) => JSON.stringify(d) === JSON.stringify(r.decls)))
      .map((r) => ({ rule: r.key, package: r.decls, hapulse: hp.get(r.key) }));
    expect(differ).toEqual([]);
  });

  it('every HAPulse rule on the parts the package has is in the package (a new HAPulse rule fails here too)', () => {
    // the package carries the tafel parts the NVR shows (not people, totals, rings, solar, …): a HAPulse rule counts when
    // all its classes are the package's and every part and attribute value in it is one the package styles
    const classes = (k: string) => [...k.split(' | ')[1]!.matchAll(/\.([_a-zA-Z][\w-]*)|(\[[^\]]+\])/g)].map((m) => m[1] ?? `nvr-${m[2]}`);
    const parts = new Set(pkgRules.flatMap((r) => classes(r.key)));
    const shared = [...hp.keys()].filter((k) => classes(k).every((c) => c.startsWith('nvr-') && parts.has(c)));
    expect(shared.length).toBeGreaterThan(30);
    const inPackage = new Set(pkgRules.map((r) => r.key));
    expect(shared.filter((k) => !inPackage.has(k))).toEqual([]);
  });
});
