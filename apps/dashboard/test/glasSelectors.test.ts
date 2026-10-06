import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// [fork] Guard for the Glas stylesheets (docs/GLAS-PLAN.md §1.4, §5.2): Glas must never touch Klassisch, and an
// upstream rename must not leave a Glas rule silently pointing at nothing.

const SRC = join(__dirname, '../src');
const GLAS = join(SRC, 'styles/glas');
const PACKAGE_CSS = join(__dirname, '../../../node_modules/@sentinel-nvr/web/dist/ui/ui.css');
const PREFIX = ":root[data-style='glas']";

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p, ext) : ext.test(name) ? [p] : [];
  });
}

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Top-level comma split (not inside parentheses or brackets). */
function splitSelectors(list: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of list) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Every style rule's selector list with its enclosing at-rules (keyframe steps excluded). */
function styleRules(css: string): { selectors: string[]; at: string[] }[] {
  const out: { selectors: string[]; at: string[] }[] = [];
  const stack: string[] = [];
  let buf = '';
  for (const ch of stripComments(css)) {
    if (ch === '{') {
      const head = buf.trim();
      buf = '';
      if (head.startsWith('@')) { stack.push(head); continue; }
      const at = stack.filter((s) => s !== '');
      if (!at.some((a) => a.startsWith('@keyframes'))) out.push({ selectors: splitSelectors(head), at });
      stack.push('');
    } else if (ch === '}') { stack.pop(); buf = ''; }
    else if (ch === ';') buf = '';
    else buf += ch;
  }
  return out;
}

const glasCss = files(GLAS, /\.css$/).map((p) => ({ name: relative(SRC, p), css: readFileSync(p, 'utf8') }));

/** Classes that only exist at runtime (set from code, never in a stylesheet) and may still be targeted. */
const RUNTIME_CLASSES = new Set<string>([]);

describe('Glas stylesheets', () => {
  it('exist', () => {
    expect(glasCss.map((f) => f.name).sort()).toEqual([
      'styles/glas/accent.css', 'styles/glas/base.css', 'styles/glas/index.css', 'styles/glas/material.css', 'styles/glas/motion.css',
    ]);
  });

  it(`scope every selector to ${PREFIX}`, () => {
    const bad = glasCss.flatMap((f) =>
      styleRules(f.css).flatMap((r) => r.selectors.filter((s) => !s.startsWith(PREFIX)).map((s) => `${f.name}: ${s}`)),
    );
    expect(bad).toEqual([]);
  });

  it('use no hex colours, no !important, no @layer, no global at-rules', () => {
    for (const f of glasCss) {
      const css = stripComments(f.css);
      expect(css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], f.name).toEqual([]);
      expect(css.includes('!important'), f.name).toBe(false);
      expect(css.includes('@layer'), f.name).toBe(false);
      // a registered property, a font face or a foreign stylesheet would act in Klassisch too
      expect(css.match(/@(property|font-face)\b/g) ?? [], f.name).toEqual([]);
      const imports = [...css.matchAll(/@import\s+([^;]+);/g)].map((m) => m[1]!.trim());
      expect(imports.filter((i) => !/^'\.\/[\w-]+\.css'$/.test(i)), f.name).toEqual([]);
    }
  });

  it('name every keyframes g-* (a classic name would replace the classic animation)', () => {
    const names = glasCss.flatMap((f) => [...stripComments(f.css).matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]!));
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => !n.startsWith('g-'))).toEqual([]);
  });

  it('only target classes that Klassisch (or the Sentinel package) still defines — g-* are Glas-own', () => {
    const otherCss = [
      ...files(SRC, /\.css$/).filter((p) => !p.startsWith(GLAS)).map((p) => readFileSync(p, 'utf8')),
      readFileSync(PACKAGE_CSS, 'utf8'),
    ].map(stripComments).join('\n');
    const defined = new Set([...otherCss.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]));
    const used = new Set(
      glasCss.flatMap((f) => styleRules(f.css).flatMap((r) => r.selectors.flatMap((s) => [...s.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]!)))),
    );
    const missing = [...used].filter((c) => !c.startsWith('g-') && !defined.has(c) && !RUNTIME_CLASSES.has(c));
    expect(missing).toEqual([]);
  });
});
