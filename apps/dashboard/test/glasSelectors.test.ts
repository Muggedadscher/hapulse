import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Cpu, Home, LayoutGrid, Lightbulb, MoreHorizontal, Monitor, Music, Pause, Settings, ShieldCheck, Sparkles, Workflow } from 'lucide-react';

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

/** Every declaration with the at-rules around it. */
function declarations(css: string): { prop: string; value: string; at: string[] }[] {
  const out: { prop: string; value: string; at: string[] }[] = [];
  const stack: string[] = [];
  let buf = '';
  const flush = () => {
    const d = buf.trim();
    buf = '';
    const i = d.indexOf(':');
    if (i > 0 && !d.startsWith('@')) out.push({ prop: d.slice(0, i).trim(), value: d.slice(i + 1).trim(), at: stack.filter(Boolean) });
  };
  for (const ch of stripComments(css)) {
    if (ch === '{') {
      const head = buf.trim();
      buf = '';
      stack.push(head.startsWith('@') ? head : '');
    } else if (ch === '}') { flush(); stack.pop(); }
    else if (ch === ';') flush();
    else buf += ch;
  }
  return out;
}

/** The contents of every `:where(...)` in a stylesheet, whitespace normalised. */
function whereLists(css: string): string[] {
  const out: string[] = [];
  const text = stripComments(css);
  for (let i = text.indexOf(':where('); i >= 0; i = text.indexOf(':where(', i + 1)) {
    let depth = 0, j = i + ':where'.length;
    for (; j < text.length; j++) {
      if (text[j] === '(') depth++;
      if (text[j] === ')' && --depth === 0) break;
    }
    out.push(text.slice(i + ':where('.length, j).replace(/\s+/g, ' ').trim());
  }
  return out;
}

const glasCss = files(GLAS, /\.css$/).map((p) => ({ name: relative(SRC, p), css: readFileSync(p, 'utf8') }));

/**
 * Lucide symbols that the Glas CSS fills — tabbar.css for the shown tab (plan docs/glas/PLAN-ETAPPE-2.md §3.1, risk 4),
 * titles.css the bulb of the light chip (PLAN-ETAPPE-4.md K87): the class it targets and the child elements its
 * :first-child/:last-child/:first-of-type selectors rely on. A Lucide update that renames a symbol or reorders its parts
 * fails here instead of filling the wrong part.
 */
const FILLED_ICONS: [ComponentType<{ size?: number }>, string, string][] = [
  [Home, 'lucide-house', 'path path'],
  [LayoutGrid, 'lucide-layout-grid', 'rect rect rect rect'],
  [ShieldCheck, 'lucide-shield-check', 'path path'],
  [Cpu, 'lucide-cpu', `${'path '.repeat(12)}rect rect`],
  [Workflow, 'lucide-workflow', 'rect path rect'],
  [Music, 'lucide-music', 'path circle circle'],
  [Sparkles, 'lucide-sparkles', 'path path path circle'],
  [Monitor, 'lucide-monitor', 'rect line line'],
  [Settings, 'lucide-settings', 'path circle'],
  [MoreHorizontal, 'lucide-ellipsis', 'circle circle circle'],
  [Lightbulb, 'lucide-lightbulb', 'path path path'],
];

/**
 * Lucide symbols whose class the Glas CSS reads as a state: Now Playing shows the pause glyph while it plays
 * (controls.css, plan docs/glas/PLAN-ETAPPE-5.md K93).
 */
const MARKER_ICONS: [ComponentType<{ size?: number }>, string][] = [[Pause, 'lucide-pause']];

/** Classes that only exist at runtime (set from code, never in a stylesheet) and may still be targeted. */
const RUNTIME_CLASSES = new Set<string>([...FILLED_ICONS, ...MARKER_ICONS].map(([, cls]) => cls));

describe('Glas stylesheets', () => {
  it('exist', () => {
    expect(glasCss.map((f) => f.name).sort()).toEqual([
      'styles/glas/accent.css', 'styles/glas/base.css', 'styles/glas/controls.css', 'styles/glas/detail.css', 'styles/glas/edit.css',
      'styles/glas/feedback.css', 'styles/glas/gestures.css', 'styles/glas/home-cards.css', 'styles/glas/home-lists.css',
      'styles/glas/home.css', 'styles/glas/index.css', 'styles/glas/lists.css', 'styles/glas/material.css', 'styles/glas/menus.css',
      'styles/glas/motion.css', 'styles/glas/nvr.css', 'styles/glas/pages.css', 'styles/glas/sheet-content.css',
      'styles/glas/sheets.css', 'styles/glas/shell.css', 'styles/glas/tabbar.css', 'styles/glas/titles.css',
    ]);
  });

  it(`scope every selector to ${PREFIX}`, () => {
    const bad = glasCss.flatMap((f) =>
      styleRules(f.css).flatMap((r) => r.selectors.filter((s) => !s.startsWith(PREFIX)).map((s) => `${f.name}: ${s}`)),
    );
    expect(bad).toEqual([]);
  });

  it('use no hex colours, no @layer, no global at-rules', () => {
    for (const f of glasCss) {
      const css = stripComments(f.css);
      expect(css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], f.name).toEqual([]);
      expect(css.includes('@layer'), f.name).toBe(false);
      // a registered property, a font face or a foreign stylesheet would act in Klassisch too
      expect(css.match(/@(property|font-face)\b/g) ?? [], f.name).toEqual([]);
      const imports = [...css.matchAll(/@import\s+([^;]+);/g)].map((m) => m[1]!.trim());
      expect(imports.filter((i) => !/^'\.\/[\w-]+\.css'$/.test(i)), f.name).toEqual([]);
    }
  });

  // Upstream switches every duration off under reduced motion with !important (global.css); Glas answers that only
  // to keep the 200-ms fades GLAS-DESIGN §6.4 asks for (plan K38) — nothing else may be forced.
  it('use !important only for transition-*/animation-* under prefers-reduced-motion: reduce', () => {
    for (const f of glasCss) {
      const important = declarations(f.css).filter((d) => /!important$/.test(d.value));
      expect(important.length, f.name).toBe((stripComments(f.css).match(/!important/g) ?? []).length);
      const bad = important.filter(
        (d) =>
          !/^(transition|animation)(-|$)/.test(d.prop) ||
          !d.at.some((a) => /^@media\b.*prefers-reduced-motion:\s*reduce/.test(a)),
      );
      expect(bad.map((d) => `${d.prop}: ${d.value}`), f.name).toEqual([]);
    }
  });

  it('list the same surfaces in every :where() of material.css (plan K30)', () => {
    const lists = whereLists(readFileSync(join(GLAS, 'material.css'), 'utf8'));
    expect(lists.length).toBeGreaterThanOrEqual(6);
    expect(new Set(lists).size).toBe(1);
  });

  it('fill only Lucide symbols whose class and parts are as checked', () => {
    for (const [Icon, cls, parts] of FILLED_ICONS) {
      const svg = renderToStaticMarkup(createElement(Icon, { size: 24 }));
      expect(svg.match(/class="([^"]*)"/)?.[1]?.split(' '), cls).toContain(cls);
      const kids = [...svg.matchAll(/<(path|rect|circle|line|polyline|polygon|ellipse)\b/g)].map((m) => m[1]).join(' ');
      expect(kids, cls).toBe(parts.trim());
    }
  });

  it('read only Lucide state symbols whose class is as checked', () => {
    for (const [Icon, cls] of MARKER_ICONS) {
      const svg = renderToStaticMarkup(createElement(Icon, { size: 24 }));
      expect(svg.match(/class="([^"]*)"/)?.[1]?.split(' '), cls).toContain(cls);
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
