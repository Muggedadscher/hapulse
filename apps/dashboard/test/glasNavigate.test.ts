import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CAMERA_STILL, samePath, takesLinkClick, transitionFor } from '../src/app/glas/glasNavigate';

// [fork] Glas page changes as view transitions (docs/glas/PLAN-ETAPPE-7.md K107): which clicks and navigations get
// one, and the page chunks a transition requests on the press.

const click = { button: 0, metaKey: false, altKey: false, ctrlKey: false, shiftKey: false, defaultPrevented: false };

describe('takesLinkClick', () => {
  it('takes a plain left click that leaves the page', () => {
    expect(takesLinkClick(click, null, '/', '/security')).toBe(true);
    expect(takesLinkClick(click, '_self', '/nvr/1', '/nvr')).toBe(true);
  });

  it('leaves every other click to the link, as React Router handles it', () => {
    for (const key of ['metaKey', 'altKey', 'ctrlKey', 'shiftKey'] as const) {
      expect(takesLinkClick({ ...click, [key]: true }, null, '/', '/security'), key).toBe(false);
    }
    expect(takesLinkClick({ ...click, button: 1 }, null, '/', '/security')).toBe(false);
    expect(takesLinkClick({ ...click, defaultPrevented: true }, null, '/', '/security')).toBe(false);
    expect(takesLinkClick(click, '_blank', '/', '/security')).toBe(false);
    // the tab of the page on screen
    expect(takesLinkClick(click, null, '/security', '/security')).toBe(false);
  });
});

describe('samePath', () => {
  it('compares paths without query and hash, decoded', () => {
    expect(samePath('/nvr/1?at=5&ev=6', '/nvr/1')).toBe(true);
    expect(samePath('/nvr/cam%201', '/nvr/cam 1')).toBe(true);
    expect(samePath('/nvr/1', '/nvr')).toBe(false);
    expect(samePath('/bad%', '/bad%')).toBe(true);
  });
});

describe('transitionFor', () => {
  it('only in Glas and where the browser can', () => {
    expect(transitionFor('page', { glas: false, supported: true, reduced: false })).toBe(null);
    expect(transitionFor('camera', { glas: true, supported: false, reduced: false })).toBe(null);
    expect(transitionFor('page', { glas: true, supported: true, reduced: false })).toBe('page');
    expect(transitionFor('camera', { glas: true, supported: true, reduced: false })).toBe('camera');
  });

  it('only a fade under reduced motion (no rise, no morph)', () => {
    expect(transitionFor('page', { glas: true, supported: true, reduced: true })).toBe('fade');
    expect(transitionFor('camera', { glas: true, supported: true, reduced: true })).toBe('fade');
  });
});

describe('routeChunks', () => {
  const router = readFileSync(join(__dirname, '../src/app/Router.tsx'), 'utf8');
  const chunks = readFileSync(join(__dirname, '../src/app/glas/routeChunks.ts'), 'utf8');

  it("requests the page of each route — the module Router.tsx's lazy() loads for it", () => {
    // Router.tsx: `const Room = lazy(() => import('../pages/Room')…` and `<Route path="/room/:areaId" element={<Room />} />`
    const modules = new Map([...router.matchAll(/const (\w+)\s*=\s*lazy\(\(\) => import\('\.\.\/pages\/(\w+)'\)/g)].map((m) => [m[1]!, m[2]!]));
    const routes = [...router.matchAll(/<Route path="\/([\w-]*)[^"]*" element=\{<(\w+) \/>\}/g)]
      .filter((m) => modules.has(m[2]!))
      .map((m) => [m[1]!, modules.get(m[2]!)!]);
    const preloaded = [...chunks.matchAll(/^\s+'?([\w-]*)'?: \(\) => import\('\.\.\/\.\.\/pages\/(\w+)'\)/gm)].map((m) => [m[1]!, m[2]!]);
    expect(routes.length).toBeGreaterThan(10);
    expect(new Map(preloaded)).toEqual(new Map(routes));
  });
});

describe('camera morph', () => {
  it("names the package's still, which the installed package still has (renamed, the morph would become a fade)", () => {
    // through the package's own export, wherever npm put it; the `[data-src]` half of the selector is the player's,
    // only the browser probe (checks --part polish, camera morph) sees it
    const css = readFileSync(createRequire(import.meta.url).resolve('@sentinel-nvr/web/ui/ui.css'), 'utf8');
    const cls = /^\.([\w-]+)/.exec(CAMERA_STILL)![1]!;
    expect(css).toMatch(new RegExp(`\\.${cls}(?![\\w-])`));
  });
});
