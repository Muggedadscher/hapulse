import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CAMERA_STILL,
  STAGE_LAYERS,
  TILE_PICTURE,
  cameraBackTarget,
  forgetRoute,
  glasCameraBack,
  glasOpenCamera,
  keptScrollY,
  noteRouteCommit,
  samePath,
  takesLinkClick,
  transitionFor,
} from '../src/app/glas/glasNavigate';

// [fork] Glas page changes as view transitions (docs/glas/PLAN-ETAPPE-7.md K107): which clicks and navigations get
// one, the page chunks a transition requests on the press, and where the camera page's back leads.

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
    expect(transitionFor('back', { glas: true, supported: true, reduced: true })).toBe('fade');
  });

  it('back from a camera: its own kind, as the others only in Glas and where the browser can', () => {
    expect(transitionFor('back', { glas: true, supported: true, reduced: false })).toBe('back');
    expect(transitionFor('back', { glas: false, supported: true, reduced: false })).toBe(null);
    expect(transitionFor('back', { glas: true, supported: false, reduced: false })).toBe(null);
  });
});

describe('keptScrollY', () => {
  it('reads the position a navigation keeps, else null (the top)', () => {
    expect(keptScrollY({ glasScrollY: 640 })).toBe(640);
    expect(keptScrollY({ glasScrollY: 0 })).toBe(0);
    expect(keptScrollY({ glasScrollY: 12.5, other: 1 })).toBe(12.5);
    for (const state of [null, undefined, 'x', 3, {}, { glasScrollY: -1 }, { glasScrollY: '640' }, { glasScrollY: NaN }, { glasScrollY: Infinity }]) {
      expect(keptScrollY(state), JSON.stringify(state)).toBe(null);
    }
  });
});

describe('cameraBackTarget', () => {
  const way = { camera: '/nvr/cam%201', from: '/room/kitchen', y: 640 };

  it('leads back to where the camera on screen was opened, at the same place', () => {
    expect(cameraBackTarget(way, '/nvr/cam 1', '/nvr')).toEqual({ to: '/room/kitchen', y: 640 });
    // opened at a moment (an event): the same camera page
    expect(cameraBackTarget({ ...way, camera: '/nvr/cam%201?at=5&ev=6' }, '/nvr/cam%201?at=5&ev=6', '/nvr')).toEqual({ to: '/room/kitchen', y: 640 });
    expect(cameraBackTarget({ ...way, from: '/security?x=1' }, '/nvr/cam%201', '/nvr')).toEqual({ to: '/security?x=1', y: 640 });
  });

  it('without that way in: to the overview at the top', () => {
    expect(cameraBackTarget(null, '/nvr/cam 1', '/nvr')).toEqual({ to: '/nvr', y: 0 });
    expect(cameraBackTarget(way, null, '/nvr')).toEqual({ to: '/nvr', y: 0 });
    // another camera on screen
    expect(cameraBackTarget(way, '/nvr/cam 2', '/nvr')).toEqual({ to: '/nvr', y: 0 });
    // the way in would lead to the page on screen
    expect(cameraBackTarget({ ...way, from: '/nvr/cam 1' }, '/nvr/cam 1', '/nvr')).toEqual({ to: '/nvr', y: 0 });
  });
});

describe('the way in and back (no view transitions: the plain navigations)', () => {
  const nav = vi.fn();
  function browser(scrollY: number): void {
    vi.stubGlobal('window', { scrollY, matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('document', { documentElement: { getAttribute: () => null } });
  }
  afterEach(() => {
    forgetRoute();
    nav.mockReset();
    vi.unstubAllGlobals();
  });

  it('back goes to the page and place the camera was opened from, once', () => {
    browser(640);
    noteRouteCommit('/room/kitchen');
    glasOpenCamera(nav, '/nvr/cam%201', true);
    expect(nav).toHaveBeenLastCalledWith('/nvr/cam%201');
    noteRouteCommit('/nvr/cam 1');
    glasCameraBack(nav, 'cam 1', '/nvr');
    expect(nav).toHaveBeenLastCalledWith('/room/kitchen', { state: { glasScrollY: 640 } });
    noteRouteCommit('/room/kitchen');
    // the way in is spent: the camera page again without a new one (browser forward) leads to the overview
    noteRouteCommit('/nvr/cam 1');
    glasCameraBack(nav, 'cam 1', '/nvr');
    expect(nav).toHaveBeenLastCalledWith('/nvr', { state: { glasScrollY: 0 } });
  });

  it('an event opens plainly and remembers the way in too', () => {
    browser(220);
    noteRouteCommit('/', '');
    glasOpenCamera(nav, '/nvr/c1?at=5&ev=6', false);
    expect(nav).toHaveBeenLastCalledWith('/nvr/c1?at=5&ev=6');
    noteRouteCommit('/nvr/c1', '?at=5&ev=6');
    glasCameraBack(nav, 'c1', '/nvr');
    expect(nav).toHaveBeenLastCalledWith('/', { state: { glasScrollY: 220 } });
  });

  it('a detour, another camera or no Glas runtime: the overview at the top', () => {
    browser(300);
    noteRouteCommit('/security');
    glasOpenCamera(nav, '/nvr/c1', true);
    noteRouteCommit('/nvr/c1');
    noteRouteCommit('/pool'); // left the camera page another way
    noteRouteCommit('/nvr/c1'); // and came back with the browser
    glasCameraBack(nav, 'c1', '/nvr');
    expect(nav).toHaveBeenLastCalledWith('/nvr', { state: { glasScrollY: 0 } });

    noteRouteCommit('/security');
    glasOpenCamera(nav, '/nvr/c1', true);
    noteRouteCommit('/nvr/c2');
    glasCameraBack(nav, 'c2', '/nvr');
    expect(nav).toHaveBeenLastCalledWith('/nvr', { state: { glasScrollY: 0 } });

    forgetRoute(); // Klassisch: GlasRuntime is gone
    glasOpenCamera(nav, '/nvr/c1', true);
    glasCameraBack(nav, 'c1', '/nvr');
    expect(nav).toHaveBeenLastCalledWith('/nvr', { state: { glasScrollY: 0 } });
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
  // through the package's own export, wherever npm put it
  const css = () => readFileSync(createRequire(import.meta.url).resolve('@sentinel-nvr/web/ui/ui.css'), 'utf8');
  const has = (cls: string) => new RegExp(`\\.${cls}(?![\\w-])`);

  it("names the package's still, which the installed package still has (renamed, the morph would become a fade)", () => {
    // the `[data-src]` half of the selector is the player's, only the browser probe (checks --part polish) sees it
    expect(css()).toMatch(has(/^\.([\w-]+)/.exec(CAMERA_STILL)![1]!));
  });

  it("finds the package's stage layers and tile picture box (renamed, back would only close)", () => {
    for (const cls of [...STAGE_LAYERS.matchAll(/\.([\w-]+)/g)].map((m) => m[1]!)) expect(css(), cls).toMatch(has(cls));
    expect(css()).toMatch(has(/^\.([\w-]+)/.exec(TILE_PICTURE)![1]!));
  });
});
