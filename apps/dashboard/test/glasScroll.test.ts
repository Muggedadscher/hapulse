import { describe, expect, it } from 'vitest';
import {
  TABS_MIN_INITIAL,
  TITLE_Y_MAX,
  edgeOpacity,
  edgeTitle,
  hasEdge,
  navEntryFor,
  nextTabsMin,
  pathIn,
  roomIdOf,
  tabMinGeometry,
  titleY,
  type TabsMinState,
} from '../src/app/glas/glasScroll';

// [fork] Glas frame (stage 2): pure scroll maths (docs/glas/PLAN-ETAPPE-2.md §2.2, K21, K22).

describe('titleY', () => {
  it('follows scrollY without a title, in 4-px steps up to 64', () => {
    expect(titleY(0, null, 60)).toBe(0);
    expect(titleY(5, null, 60)).toBe(4);
    expect(titleY(6, null, 60)).toBe(8);
    expect(titleY(41, null, 60)).toBe(40);
    expect(titleY(500, null, 60)).toBe(TITLE_Y_MAX);
    expect(titleY(-30, null, 60)).toBe(0);
  });

  it('counts from the moment the title reaches the band', () => {
    // title top at 140 in the document, band 60 → the title touches the band at scrollY 80
    expect(titleY(50, 140, 60)).toBe(0);
    expect(titleY(80, 140, 60)).toBe(0);
    expect(titleY(100, 140, 60)).toBe(20);
    expect(titleY(400, 140, 60)).toBe(64);
    // with the banner the band is 120: the same title is under it 60 px earlier
    expect(titleY(40, 140, 120)).toBe(20);
  });

  it('only ever yields multiples of 4', () => {
    for (let y = 0; y < 120; y++) expect(titleY(y, null, 60) % 4).toBe(0);
  });
});

describe('edgeOpacity', () => {
  it('is scrollY / 40 in tenths, clamped to 0…1', () => {
    expect(edgeOpacity(0)).toBe(0);
    expect(edgeOpacity(13)).toBe(0.3);
    expect(edgeOpacity(20)).toBe(0.5);
    expect(edgeOpacity(40)).toBe(1);
    expect(edgeOpacity(900)).toBe(1);
    expect(edgeOpacity(-12)).toBe(0);
  });
});

describe('nextTabsMin', () => {
  const MAX = 2000;
  const run = (ys: number[], start: TabsMinState = TABS_MIN_INITIAL) =>
    ys.reduce((s, y) => nextTabsMin(s, y, MAX), start);

  it('minimises after more than 24 px down from the anchor', () => {
    // near the top (y ≤ 40) the anchor is the current position
    expect(run([0, 40, 64]).min).toBe(false);
    expect(run([0, 40, 65]).min).toBe(true);
    expect(run([0, 30, 54]).min).toBe(false);
    expect(run([0, 30, 55]).min).toBe(true);
    // one big jump from the top
    expect(run([0, 300]).min).toBe(true);
  });

  it('expands after more than 24 px up from the lowest point, wherever that was', () => {
    const down = run([0, 100, 400, 800]);
    expect(down).toEqual({ min: true, anchor: 800 });
    expect(nextTabsMin(down, 777, MAX)).toBe(down); // 23 px up: nothing
    expect(nextTabsMin(down, 776, MAX)).toBe(down); // 24 px: still nothing
    expect(nextTabsMin(down, 775, MAX)).toEqual({ min: false, anchor: 775 });
  });

  it('does not flutter with ±23 px wobble', () => {
    let s = run([0, 200, 500]);
    expect(s.min).toBe(true);
    for (const y of [477, 500, 480, 499, 478]) {
      s = nextTabsMin(s, y, MAX);
      expect(s.min).toBe(true);
    }
    s = nextTabsMin(s, 450, MAX); // now really up
    expect(s.min).toBe(false);
    for (const y of [473, 451, 470, 455]) {
      s = nextTabsMin(s, y, MAX);
      expect(s.min).toBe(false);
    }
  });

  it('a long scroll down while minimised needs only 24 px up to expand', () => {
    const s = run([0, 100, 1500]);
    expect(s).toEqual({ min: true, anchor: 1500 });
    expect(nextTabsMin(s, 1475, MAX).min).toBe(false);
  });

  it('a long scroll up while expanded needs only 24 px down to minimise again', () => {
    const s = run([0, 100, 1500, 1400, 300]);
    expect(s).toEqual({ min: false, anchor: 300 });
    expect(nextTabsMin(s, 325, MAX).min).toBe(true);
  });

  it('expands near the top (y ≤ 40) and at the page end', () => {
    const min = run([0, 100, 600]);
    expect(nextTabsMin(min, 40, MAX)).toEqual({ min: false, anchor: 40 });
    expect(nextTabsMin(min, MAX - 2, MAX)).toEqual({ min: false, anchor: MAX - 2 });
    expect(nextTabsMin(min, MAX, MAX).min).toBe(false);
    expect(nextTabsMin(min, MAX - 3, MAX).min).toBe(true);
  });

  it('ignores the rubber band at both ends', () => {
    const min = run([0, 100, 600]);
    expect(nextTabsMin(min, -30, MAX)).toBe(min);
    expect(nextTabsMin(min, MAX + 40, MAX)).toBe(min);
    const top = run([0, 10]);
    expect(nextTabsMin(top, -60, MAX)).toBe(top);
  });

  it('returns the same object when nothing changes (no store write)', () => {
    const top = nextTabsMin(TABS_MIN_INITIAL, 0, MAX);
    expect(top).toBe(TABS_MIN_INITIAL);
    expect(nextTabsMin(top, 0, MAX)).toBe(top);
  });

  it('on a page shorter than the screen it never minimises', () => {
    expect(nextTabsMin(TABS_MIN_INITIAL, 0, 0)).toBe(TABS_MIN_INITIAL);
    expect(nextTabsMin(TABS_MIN_INITIAL, 30, 0)).toBe(TABS_MIN_INITIAL);
  });
});

describe('tabMinGeometry', () => {
  it('gives the values of GLAS-DESIGN §7.1 at 358 px', () => {
    const g = tabMinGeometry(358, 61);
    expect(g.sx).toBeCloseTo(0.1453, 4);
    expect(g.sy).toBeCloseTo(0.8387, 4);
    expect(g.rx).toBe(179);
    expect(g.dx).toBe(26 - 61);
  });

  it('shrinks to a 52-px circle at every width', () => {
    for (const w of [343, 358, 398, 560]) {
      const g = tabMinGeometry(w, 40);
      expect(w * g.sx).toBeCloseTo(52, 6);
      expect(62 * g.sy).toBeCloseTo(52, 6);
      // the radius `rx / 31px` scaled with the glass: 26 in both directions
      expect(g.rx * g.sx).toBeCloseTo(26, 6);
      expect(31 * g.sy).toBeCloseTo(26, 6);
    }
  });

  it('moves the active symbol into the circle', () => {
    expect(tabMinGeometry(390, 26).dx).toBe(0);
    expect(tabMinGeometry(390, 300).dx).toBe(-274);
  });

  it('never scales up', () => {
    expect(tabMinGeometry(30, 10).sx).toBe(1);
  });
});

describe('route helpers', () => {
  const NAV = [
    { id: 'overview', to: '/', exact: true },
    { id: 'rooms' },
    { id: 'nvr', to: '/nvr' },
    { id: 'security', to: '/security' },
    { id: 'settings', to: '/settings' },
  ];

  it('navEntryFor: exact "/" and prefixes of the other routes', () => {
    expect(navEntryFor('/', NAV)?.id).toBe('overview');
    expect(navEntryFor('/nvr', NAV)?.id).toBe('nvr');
    expect(navEntryFor('/nvr/front', NAV)?.id).toBe('nvr');
    expect(navEntryFor('/security', NAV)?.id).toBe('security');
    expect(navEntryFor('/securityx', NAV)).toBeUndefined();
    expect(navEntryFor('/room/kitchen', NAV)).toBeUndefined();
    expect(navEntryFor('/pool', NAV)).toBeUndefined();
  });

  it('pathIn: "/" exactly, "x/" as a prefix, other paths with what is below them', () => {
    const more = ['/music', '/settings', '/room/'];
    expect(pathIn('/music', more)).toBe(true);
    expect(pathIn('/music/library', more)).toBe(true);
    expect(pathIn('/musicx', more)).toBe(false);
    expect(pathIn('/room/kitchen', more)).toBe(true);
    expect(pathIn('/room', more)).toBe(false);
    expect(pathIn('/', more)).toBe(false);
    expect(pathIn('/', ['/'])).toBe(true);
    expect(pathIn('/security', ['/'])).toBe(false);
    expect(pathIn('/security', [])).toBe(false);
  });

  it('hasEdge: everywhere but the camera page', () => {
    expect(hasEdge('/')).toBe(true);
    expect(hasEdge('/nvr')).toBe(true);
    expect(hasEdge('/nvr/')).toBe(true);
    expect(hasEdge('/nvr/front')).toBe(false);
    expect(hasEdge('/room/kitchen')).toBe(true);
  });

  it('roomIdOf: decoded id on room pages, a malformed escape as typed, null elsewhere', () => {
    expect(roomIdOf('/room/kitchen')).toBe('kitchen');
    expect(roomIdOf('/room/k%C3%BCche/x')).toBe('küche');
    expect(roomIdOf('/room/50%')).toBe('50%');
    expect(roomIdOf('/room/%E0%A4')).toBe('%E0%A4');
    expect(roomIdOf('/room/')).toBe('');
    expect(roomIdOf('/rooms')).toBeNull();
    expect(roomIdOf('/')).toBeNull();
  });

  it('edgeTitle: room name on a room page, nav label elsewhere, else the h1', () => {
    expect(edgeTitle({ pathname: '/', navLabel: 'Übersicht', roomName: null, h1: 'Guten Abend, Jan' })).toBe('Übersicht');
    expect(edgeTitle({ pathname: '/room/kitchen', navLabel: null, roomName: 'Küche', h1: null })).toBe('Küche');
    expect(edgeTitle({ pathname: '/room/gone', navLabel: null, roomName: null, h1: null })).toBe('');
    expect(edgeTitle({ pathname: '/scenes', navLabel: 'Szenen', roomName: null, h1: 'Szenen' })).toBe('Szenen');
    expect(edgeTitle({ pathname: '/unknown', navLabel: null, roomName: null, h1: 'Seite' })).toBe('Seite');
  });
});
