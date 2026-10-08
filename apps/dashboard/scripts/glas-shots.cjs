// [fork] glas-shots.cjs — screenshots and runtime checks for the style "Glas" (docs/glas/PLAN-ETAPPE-0-1.md).
//
//   node apps/dashboard/scripts/glas-shots.cjs shoot   <base-url | --serve <dist>> <out-dir> [options]
//   node apps/dashboard/scripts/glas-shots.cjs compare <dir-a> <dir-b> [<diff-dir>] [--expect <regex>]
//   node apps/dashboard/scripts/glas-shots.cjs checks  <base-url | --serve <dist>> [--part stage1|frame|sheets|gestures|home]
//     [--dom-out <file>] [--only <block>,…]
//
// shoot options: --style classic|glas  --strength clear|tinted|opaque  --reduce  --modes light,dark
//   --devices phone,ipad,desktop  --scenes home,room,…  --contrast  --forced-colors  --engine chromium|webkit
//   --suffix <text> (appended to every file name)
//   Frame scenes of stage 2 (docs/glas/PLAN-ETAPPE-2.md §6.3) open a menu, scroll or insert a banner/toast and are taken
//   at viewport size (fixed layers); a scene that does not exist in a style or at a width is listed as skipped.
//   --elements <css> (also one picture per matching element, named after its first line of text, e.g.
//     "--scenes settings --elements .settings-page__section" → …-settings__2-darstellung.png)
//   Window scenes of stage 3 (win-…, glas-checks-sheets.cjs, docs/glas/PLAN-ETAPPE-3.md §6.0) open one window each,
//   the gesture scenes of stage 3b (ctx-card, ctx-card-off, swipe-lights, swipe-notes, glas-checks-gestures.cjs) a
//   context menu or a swipe row, the overview scenes of stage 4 (home-hints, home-edit, energy-bubble, detail-light,
//   glas-checks-home.cjs) the hints card, edit mode, a picked energy bar or a light's detail; all are taken at viewport
//   size and are not part of the default list.
// compare --expect <regex>: files whose name matches may differ (listed, but not an error).
// checks: stage 1 (docs/glas/PLAN-ETAPPE-0-1.md §2), the frame of stage 2 (PLAN-ETAPPE-2.md §6.3), the windows of
//   stage 3 (PLAN-ETAPPE-3.md §6.2, glas-checks-sheets.cjs), the gestures and the inspector of stage 3b
//   (glas-checks-gestures.cjs) and the overview's content of stage 4 (PLAN-ETAPPE-4.md §3, glas-checks-home.cjs);
//   --part runs one. --dom-out: the Klassisch DOM of every window as JSON, to compare a build with main's. --only runs
//   some blocks of the window, gesture or overview checks (e.g. sheetsDrag, gesturesInspector, homeHints).
//
// HA demo mode as in click-fuzz-test.cjs. Deterministic on purpose, so that two runs of the same build give the same
// pixels: fixed clock (Playwright `clock`, paused right after it is installed; timers only move with `run`, at most
// BUDGET ms per document, so the demo ticker's first step after 2 s never fires), seeded Math.random, only local
// requests, animations finished and scrolling settled, pointer parked at 0,0, every layer rastered afresh right before
// the shot (`repaint`). `compare` then demands 0 differing pixels.
// Playwright: the global install ($(npm root -g)/playwright) or HP_PW=<folder that contains node_modules/playwright>.
// Never run `playwright install` for this — the browsers are provided by the environment.

/* global __g -- the frame checks' helpers in the page (pageHelpers), used inside page.evaluate callbacks */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

// 2026-10-06 12:30 Europe/Berlin — fixed, so greetings, relative times and today's bars never move
const FIXED = Date.parse('2026-10-06T10:30:00Z');
// demo.ts starts its live ticker with setTimeout(…, 2000): a document must never get that far
const BUDGET = 1900;
const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  phone375: { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  phone430: { viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  ipad: { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  ipadUpright: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};
const SCENES = {
  home: { path: '/' },
  room: { path: '/room/living_room' },
  security: { path: '/security' },
  pool: { path: '/pool' },
  energy: { path: '/energy' },
  music: { path: '/music' },
  devices: { path: '/devices' },
  automations: { path: '/automations' },
  scenes: { path: '/scenes' },
  system: { path: '/system' },
  settings: { path: '/settings' },
  nvr: { path: '/nvr' },
  onboarding: { path: '/onboarding', demo: false },
  chip: { path: '/', click: '.summary-chip' },
  weather: { path: '/', click: '.header-cluster__weather--btn' },
  material: { path: '/', material: true },
  // stage 2: the frame (viewport-sized, see header)
  scrolled: { path: '/', viewport: true, act: (page) => scrollPage(page, isPhone(page) ? 700 : 400) },
  minimized: { path: '/', viewport: true, act: (page) => (isPhone(page) ? scrollPage(page, 400) : 'phone only') },
  avatar: { path: '/', viewport: true, act: (page) => tap(page, '.g-avatar__btn') },
  notifications: { path: '/', viewport: true, act: async (page) => (isPhone(page)
    ? (await tap(page, '.g-avatar__btn')) || tap(page, `.g-avatar-menu__item:has-text("${DE['glas.avatar.notifications']}")`)
    : tap(page, '.header-cluster .notifications-trigger')) },
  more: { path: '/', viewport: true, act: (page) => tap(page, `.app-tabs__item[aria-label="${DE['nav.moreNavigation']}"]`) },
  rooms: { path: '/', viewport: true, act: (page) => tap(page, isPhone(page)
    ? `.app-tabs__item[aria-label="${DE['nav.rooms']}"]` : ".sidebar-nav__item[aria-haspopup='menu']") },
  edit: { path: '/', viewport: true, act: async (page) => {
    const note = isPhone(page) && (await isGlas(page))
      ? (await tap(page, '.g-avatar__btn')) || (await tap(page, `.g-avatar-menu__item:has-text("${DE['glas.avatar.edit']}")`))
      : await tap(page, '.g-edit-capsule, .edit-toggle');
    // the edit mode adds rows above the toggle; the page sometimes ends up scrolled (also on main): back to the top
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await run(page, 50);
    await settleAnimations(page);
    return note;
  } },
  collapsed: { path: '/', viewport: true, act: (page) => (isPhone(page) ? 'desktop only' : tap(page, '.app-sidebar__collapse')) },
  banner: { path: '/', viewport: true, act: (page) => insert(page, BANNER, ['warning', DE['banner.reconnecting']]) },
  'banner-lost': { path: '/', viewport: true, act: (page) => insert(page, BANNER, ['error', DE['banner.disconnected']]) },
  toast: { path: '/', viewport: true, act: async (page) => {
    await insert(page, TOAST, [DE['toast.serviceFailed'].replace('{domain}', 'light').replace('{service}', 'turn_on')
      .replace('{message}', 'Zeitüberschreitung'), DE['toast.dismiss']]);
    return insert(page, TOAST, [DE['toast.notConnected'], DE['toast.dismiss']]);
  } },
};
const FRAME_SCENES = ['scrolled', 'minimized', 'avatar', 'notifications', 'more', 'rooms', 'edit', 'collapsed', 'banner',
  'banner-lost', 'toast'];
const DEFAULT_SCENES = Object.keys(SCENES).filter((s) => s !== 'material' && !FRAME_SCENES.includes(s));
// German texts of the injected banner/toast markup and of the controls the scenes click (locale de-DE)
const DE = require(path.join(__dirname, '../../../packages/core/locales/de.json'));

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
}
const flag = (name) => process.argv.includes('--' + name);
const list = (name, def) => arg(name, def).split(',').map((s) => s.trim()).filter(Boolean);

function loadPlaywright() {
  const roots = [];
  if (process.env.HP_PW) roots.push(path.join(process.env.HP_PW, 'node_modules'), process.env.HP_PW);
  try { roots.push(execSync('npm root -g', { encoding: 'utf8' }).trim()); } catch { /* no npm on PATH */ }
  for (const r of roots) {
    try { return require(path.join(r, 'playwright')); } catch { /* next */ }
  }
  return require('playwright');
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };

/** Static server for a built dist folder with SPA fallback (unknown paths → index.html). */
function serve(dir) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const rel = decodeURIComponent((req.url || '/').split('?')[0]);
      let file = path.join(dir, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, 'index.html');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}` }));
  });
}

async function baseUrl(pos) {
  const i = process.argv.indexOf('--serve');
  if (i > 0) return serve(path.resolve(process.argv[i + 1]));
  return { srv: null, url: process.argv[pos].replace(/\/+$/, '') };
}

/** Init script: demo connection + settings, seeded Math.random, no dialogs/confirm. */
function seedScript({ demo, mode, style, strength, reduce, customization: extra }) {
  const customization = { ...(style === 'glas' ? { uiStyle: 'glas', glassStrength: strength, reduceTransparency: reduce } : {}), ...extra };
  const settings = { state: { theme: 'aurora', mode, lastSeenVersion: '99.0.0', lastSeenFork: 99, customization }, version: 0 };
  return `(() => {
    try {
      if (!sessionStorage.getItem('__glasSeeded')) {
        localStorage.clear();
        ${demo ? `localStorage.setItem('hapulse:connection', JSON.stringify({ demo: true, mode: 'demo' }));` : ''}
        localStorage.setItem('hapulse:settings', ${JSON.stringify(JSON.stringify(settings))});
        sessionStorage.setItem('__glasSeeded', '1');
      }
    } catch (e) { /* storage blocked */ }
    let seed = 20261006;
    Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    window.confirm = () => false; window.prompt = () => null;
  })();`;
}

async function newContext(browser, device, opts) {
  const ctx = await browser.newContext({
    ...DEVICES[device], locale: 'de-DE', timezoneId: 'Europe/Berlin',
    colorScheme: opts.mode === 'dark' ? 'dark' : 'light', reducedMotion: opts.reducedMotion || 'no-preference',
    forcedColors: opts.forcedColors ? 'active' : 'none', contrast: opts.contrast ? 'more' : 'no-preference',
  });
  // only the app itself: external requests fail the same way on every run
  await ctx.route((u) => !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(u.href), (r) => r.abort());
  await ctx.addInitScript(seedScript(opts));
  // Paused at once, before any page exists: a pauseAt later than `install + real time` would throw on a slow machine.
  await ctx.clock.install({ time: FIXED - 60_000 });
  await ctx.clock.pauseAt(FIXED + 500);
  faked.add(ctx);
  return ctx;
}

/** Fake time spent per document (the demo ticker must never fire). */
const spent = new WeakMap();
/** Contexts with the paused clock; the window checks of stage 3 run in real time and just wait. */
const faked = new WeakSet();
async function run(page, ms) {
  if (!faked.has(page.context())) return page.waitForTimeout(ms);
  const total = (spent.get(page) || 0) + ms;
  if (total >= BUDGET) throw new Error(`clock budget: ${total} ms in one document (demo ticker at 2000 ms)`);
  spent.set(page, total);
  await page.clock.runFor(ms);
}
/** A new document in the same page (full navigation) starts its own timers. */
async function gotoPage(page, url) {
  spent.set(page, 0);
  await page.goto(url, { waitUntil: 'load' });
}

/** The console line of a request the context aborted on purpose (only local requests, see newContext; the NVR window
 * scenes point Sentinel at a documentation address). */
const ABORTED = /^Failed to load resource: net::ERR_FAILED$/;

/** Load a path with the clock paused, let it settle deterministically. */
async function openPage(ctx, url, extraRun = 0) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('exc: ' + String(e.message).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error' && !ABORTED.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });
  await gotoPage(page, url);
  await page.waitForFunction(() => document.querySelector('#root > *'), null, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await run(page, 800);
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForLoadState('networkidle');
  await run(page, 400 + extraRun);
  return { page, errors };
}

/** CSS animations and smooth scrolling (`scroll-behavior: smooth`, e.g. when a dialog takes the focus) run on real
 * time, not on the paused clock: wait (in node, the page's timers are fake) until no finite animation runs and the
 * scroll position stands still — a fixed wait was too short when several runs shared the machine. */
async function settleAnimations(page, maxMs = 3000) {
  let last = '';
  for (const end = Date.now() + maxMs; Date.now() < end; await new Promise((r) => setTimeout(r, 60))) {
    const now = await page.evaluate(() => {
      const busy = document.getAnimations()
        .filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations !== Infinity).length;
      return busy ? 'busy' : `${scrollX},${scrollY}`;
    });
    if (now !== 'busy' && now === last) return;
    last = now;
  }
}

const MATERIAL_PROBE = `(() => {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:16px;right:16px;bottom:96px;display:grid;gap:10px;z-index:9000;';
  for (const t of ['.25', '.5', '.6', '.88']) {
    const d = document.createElement('div');
    d.className = 'g-glass';
    d.style.cssText = 'height:52px;border-radius:26px;display:flex;align-items:center;gap:12px;padding:0 20px;font:600 17px/22px var(--font-body);color:var(--text);';
    d.style.setProperty('--g-surface-tint', t);
    d.innerHTML = '<span>Glas ' + t + '</span><span style="font-weight:400;color:var(--g-glass-label-2)">Sekundär</span>';
    host.appendChild(d);
  }
  const media = document.createElement('div');
  media.style.cssText = 'height:120px;border-radius:22px;position:relative;overflow:hidden;background:linear-gradient(120deg,#f4f1ea,#9aa7b5 45%,#2f3a46);';
  const pill = document.createElement('div');
  pill.className = 'g-glass g-glass--clear';
  pill.style.cssText = 'position:absolute;left:16px;bottom:16px;height:44px;border-radius:22px;padding:0 18px;display:flex;align-items:center;font:600 15px/20px var(--font-body);color:#fff;';
  pill.textContent = 'LIVE · Einfahrt';
  media.appendChild(pill);
  host.appendChild(media);
  document.body.appendChild(host);
})();`;

const isPhone = (page) => page.viewportSize().width < 900;
const isGlas = (page) => page.evaluate(() => document.documentElement.getAttribute('data-style') === 'glas');

// stage 3: the windows — scenes win-… and `checks --part sheets`
const SHEETS = require('./glas-checks-sheets.cjs')({ DE, DEVICES, ABORTED, tap, run, settleAnimations, isGlas, seedScript,
  pageHelpers });
Object.assign(SCENES, SHEETS.scenes);
// stage 3b: the gestures and the inspector — scenes ctx-card, swipe-… and `checks --part gestures`
const GESTURES = require('./glas-checks-gestures.cjs')({ DE, DEVICES, ABORTED, run, settleAnimations, isGlas, seedScript,
  pageHelpers, sheetHelpers: SHEETS.sheetHelpers, reach: SHEETS.reach });
Object.assign(SCENES, GESTURES.scenes);
// stage 4: the overview's content — scenes home-hints, home-edit, energy-bubble, detail-light and `checks --part home`
const HOME = require('./glas-checks-home.cjs')({ DE, DEVICES, ABORTED, run, settleAnimations, isGlas, seedScript });
Object.assign(SCENES, HOME.scenes);

/** Click the first visible match, let menus and their animations settle; returns why it could not ('' = done). */
async function tap(page, sel) {
  const el = page.locator(sel).filter({ visible: true }).first();
  if (!(await el.count())) return 'not visible: ' + sel;
  if (await el.isDisabled()) return 'disabled: ' + sel;
  await el.click();
  await run(page, 150);
  await settleAnimations(page);
  await run(page, 100);
  return '';
}

/** Scroll the window; the Glas runtime reads the position in requestAnimationFrame (paused clock: `run`). */
async function scrollPage(page, y) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await run(page, 100);
  await settleAnimations(page);
  await run(page, 100);
  return '';
}

/** Markup as AppLayout renders it while the connection is lost (the demo connection never is). */
const BANNER = ([kind, text]) => {
  const b = document.createElement('div');
  b.className = 'app-banner app-banner--' + kind;
  b.setAttribute('role', 'status');
  b.setAttribute('aria-live', 'polite');
  b.textContent = text;
  document.querySelector('.app-content').prepend(b);
};

/** Markup as components/ui/Toaster.tsx renders a toast (role="alert" in Glas). */
const TOAST = ([text, close]) => {
  const item = document.createElement('div');
  item.className = 'toaster__item';
  if (document.documentElement.getAttribute('data-style') === 'glas') item.setAttribute('role', 'alert');
  item.innerHTML = '<span class="toaster__text"></span><button type="button" class="toaster__close">'
    + '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
    + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x" aria-hidden="true">'
    + '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg></button>';
  item.querySelector('.toaster__text').textContent = text;
  item.querySelector('button').setAttribute('aria-label', close);
  document.querySelector('.toaster').appendChild(item);
};

/** Chromium keeps the raster of a layer drawn while the page was still changing (a popover opening, a banner pushing
 * the content down), so text could land a subpixel off in some runs (also on main). One frame with the page hidden
 * drops every layer's tiles; the shot after it rasters everything afresh. */
async function repaint(page) {
  await page.evaluate(() => { document.documentElement.style.visibility = 'hidden'; });
  await page.screenshot({ animations: 'disabled' });
  await page.evaluate(() => { document.documentElement.style.visibility = ''; });
}

async function insert(page, fn, args) {
  await page.evaluate(fn, args);
  await run(page, 100);
  await settleAnimations(page);
  return '';
}

const slug = (s) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'x';

async function shoot() {
  const { srv, url } = await baseUrl(3);
  const out = path.resolve(srv ? process.argv[5] : process.argv[4]);
  fs.mkdirSync(out, { recursive: true });
  const style = arg('style', 'classic');
  const strength = arg('strength', 'clear');
  const reduce = flag('reduce');
  const contrast = flag('contrast');
  const forcedColors = flag('forced-colors');
  const suffix = arg('suffix', '');
  const elements = arg('elements', '');
  const pw = loadPlaywright();
  const browser = await pw[arg('engine', 'chromium')].launch();
  const report = [];
  for (const device of list('devices', 'phone,ipad,desktop')) {
    for (const mode of list('modes', 'light,dark')) {
      for (const scene of list('scenes', DEFAULT_SCENES.join(','))) {
        const sc = SCENES[scene];
        if (!sc) throw new Error('unknown scene ' + scene);
        const ctx = await newContext(browser, device, { demo: sc.demo !== false, mode, style, strength, reduce, contrast, forcedColors,
          customization: sc.customization });
        const { page, errors } = await openPage(ctx, url + sc.path);
        let note = '';
        if (sc.click) {
          const el = page.locator(sc.click).filter({ visible: true }).first();
          if (await el.count()) {
            await el.click();
            await run(page, 300);
            await settleAnimations(page);
            await run(page, 300);
          } else note = 'not visible: ' + sc.click;
        }
        if (sc.act) note = (await sc.act(page)) || '';
        if (sc.material) { await page.evaluate(MATERIAL_PROBE); await page.waitForTimeout(100); }
        const name = [style, mode, device, scene].join('-') + (style === 'glas' && strength !== 'clear' ? '-' + strength : '')
          + (reduce ? '-reduce' : '') + (contrast ? '-contrast' : '') + (forcedColors ? '-forced' : '') + (suffix ? '-' + suffix : '');
        if (note) { report.push({ name, skipped: note }); await ctx.close(); continue; }
        await settleAnimations(page);
        await page.mouse.move(0, 0);
        await repaint(page);
        await page.screenshot({ path: path.join(out, name + '.png'), fullPage: !sc.viewport, animations: 'disabled', caret: 'hide' });
        if (elements) {
          const els = await page.locator(elements).filter({ visible: true }).all();
          for (let i = 0; i < els.length; i++) {
            const label = slug(((await els[i].innerText()) || '').split('\n')[0] || '');
            await els[i].screenshot({ path: path.join(out, `${name}__${i + 1}-${label}.png`), animations: 'disabled', caret: 'hide' });
          }
        }
        const dom = await page.evaluate(() => ({
          style: document.documentElement.getAttribute('data-style'), glass: document.documentElement.getAttribute('data-glass'),
          errorCard: document.body.innerText.includes('Something went wrong'), path: location.pathname,
        }));
        report.push({ name, ...dom, errors });
        await ctx.close();
      }
    }
  }
  await browser.close();
  if (srv) srv.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
  const bad = report.filter((r) => r.errorCard || (r.errors && r.errors.length));
  console.log(JSON.stringify({ shots: report.filter((r) => !r.skipped).length, skipped: report.filter((r) => r.skipped).map((r) => r.name), bad }, null, 1));
  process.exit(bad.length ? 1 : 0);
}

/** Per-pixel RGBA comparison of two PNGs in the browser (no library): differing pixels, rows, optional red diff image. */
function pixelDiff(page, a, b, wantDiff) {
  return page.evaluate(async ([da, db, want]) => {
    const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const [ia, ib] = await Promise.all([load(da), load(db)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { pixels: -1, size: [ia.width, ia.height, ib.width, ib.height] };
    const c = (img) => { const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const x = cv.getContext('2d'); x.drawImage(img, 0, 0); return [cv, x, x.getImageData(0, 0, img.width, img.height)]; };
    const [, , A] = c(ia); const [cv, x, B] = c(ib);
    let n = 0, minY = Infinity, maxY = -1;
    for (let i = 0; i < A.data.length; i += 4) {
      if (A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2] || A.data[i + 3] !== B.data[i + 3]) {
        n++; const y = Math.floor(i / 4 / ia.width); if (y < minY) minY = y; if (y > maxY) maxY = y;
        B.data[i] = 255; B.data[i + 1] = 0; B.data[i + 2] = 0; B.data[i + 3] = 255;
      }
    }
    let diff = null;
    if (n && want) { x.putImageData(B, 0, 0); diff = cv.toDataURL('image/png'); }
    return { pixels: n, rows: n ? [minY, maxY] : null, diff };
  }, ['data:image/png;base64,' + a.toString('base64'), 'data:image/png;base64,' + b.toString('base64'), !!wantDiff]);
}

async function compare() {
  const [a, b] = [path.resolve(process.argv[3]), path.resolve(process.argv[4])];
  const diffDir = process.argv[5] && !process.argv[5].startsWith('--') ? path.resolve(process.argv[5]) : null;
  if (diffDir) fs.mkdirSync(diffDir, { recursive: true });
  const expect = arg('expect', '') ? new RegExp(arg('expect', '')) : null;
  const names = fs.readdirSync(a).filter((f) => f.endsWith('.png')).sort();
  const pw = loadPlaywright();
  const browser = await pw.chromium.launch();
  const page = await browser.newPage();
  const result = { same: 0, differ: [], expectedDiffer: [], missing: [] };
  for (const n of names) {
    const pa = path.join(a, n), pb = path.join(b, n);
    if (!fs.existsSync(pb)) { result.missing.push(n); continue; }
    const ba = fs.readFileSync(pa), bb = fs.readFileSync(pb);
    if (ba.equals(bb)) { result.same++; continue; }
    const r = await pixelDiff(page, ba, bb, !!diffDir);
    if (r.pixels === 0) { result.same++; continue; }
    if (r.diff) fs.writeFileSync(path.join(diffDir, n), Buffer.from(r.diff.split(',')[1], 'base64'));
    (expect && expect.test(n) ? result.expectedDiffer : result.differ).push({ name: n, pixels: r.pixels, rows: r.rows, size: r.size });
  }
  await browser.close();
  console.log(JSON.stringify(result, null, 1));
  process.exit(result.differ.length || result.missing.length ? 1 : 0);
}

/** Runtime checks of stage 1: pre-paint, switching without remnants (and the accent slider following the style), OS
 * mode in "auto", no web fonts, reduced motion, white switch knobs on the orange track, borderless cards that keep
 * their state borders. */
async function stage1Checks(browser, url, out) {
  const cmp = await browser.newPage();
  const rootState = (page) => page.evaluate(() => {
    const s = document.documentElement.style, vars = {};
    for (let i = 0; i < s.length; i++) vars[s.item(i)] = s.getPropertyValue(s.item(i)).trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    return {
      vars,
      attrs: ['data-style', 'data-glass', 'data-contrast', 'data-theme', 'data-mode'].map((a) => document.documentElement.getAttribute(a)),
      themeColor: meta ? meta.getAttribute('content') : null,
    };
  });
  const shot = async (page) => {
    await page.mouse.move(0, 0);
    await repaint(page);
    return page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
  };

  // 1. pre-paint: when React mounts its first node, Glas must already be applied (the frame before any script runs is
  //    the lab's job, plan §6.2). Web fonts: none may be requested once Glas is applied. The browser's first layout
  //    runs before the app's script (empty page, HTML defaults = Klassisch) and may already fetch the body font for
  //    its metrics — exactly as in Klassisch; those requests are listed apart and do not count.
  {
    const ctx = await newContext(browser, 'phone', { demo: true, mode: 'dark', style: 'glas', strength: 'clear' });
    let applied = false; // per document: set by the page as soon as data-style="glas" is on <html>
    await ctx.exposeBinding('__glasApplied', () => { applied = true; });
    await ctx.addInitScript(() => {
      new MutationObserver((_, obs) => {
        const root = document.getElementById('root');
        if (root && root.firstElementChild && !window.__firstPaint) {
          const cs = getComputedStyle(document.documentElement);
          window.__firstPaint = { style: document.documentElement.getAttribute('data-style'), bg: cs.getPropertyValue('--bg').trim() };
          obs.disconnect();
        }
      }).observe(document, { childList: true, subtree: true });
      new MutationObserver((_, obs) => {
        if (document.documentElement.getAttribute('data-style') === 'glas') { window.__glasApplied(); obs.disconnect(); }
      }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-style'] });
    });
    const fonts = [];
    ctx.on('request', (r) => { if (/\.(woff2?|ttf|otf)(\?|$)/.test(r.url())) fonts.push({ file: r.url().split('/').pop(), beforeApp: !applied }); });
    const { page } = await openPage(ctx, url + '/');
    out.prePaint = await page.evaluate(() => window.__firstPaint);
    out.prePaintOk = !!out.prePaint && out.prePaint.style === 'glas' && out.prePaint.bg.toUpperCase() === '#000000';
    applied = false;
    await gotoPage(page, url + '/settings');
    await run(page, 800);
    await page.evaluate(() => document.fonts.ready);
    out.fontsBeforeApp = fonts.filter((f) => f.beforeApp).map((f) => f.file);
    out.glasFontRequests = fonts.filter((f) => !f.beforeApp).map((f) => f.file);
    out.noWebfontsOk = out.glasFontRequests.length === 0;
    await ctx.close();
  }

  // 2. Glas → Klassisch at runtime (settings UI) leaves exactly the state of a fresh Klassisch load of the same build:
  //    inline variables, attributes, theme-color — and the pixels of the start page after navigating there. Without a
  //    chosen hue the accent slider shows the default of the style on screen, in both directions.
  {
    const hue = (page) => page.locator('.accent-slider').inputValue();
    const ref = await newContext(browser, 'desktop', { demo: true, mode: 'light', style: 'classic' });
    const refSettings = (await openPage(ref, url + '/settings')).page;
    const fresh = await rootState(refSettings);
    const freshHue = await hue(refSettings);
    const freshHome = await shot((await openPage(ref, url + '/')).page);
    await refSettings.locator('[data-glas-style-option="glas"]').click();
    await run(refSettings, 200);
    const toGlasHue = await hue(refSettings);
    await ref.close();
    const ctx = await newContext(browser, 'desktop', { demo: true, mode: 'light', style: 'glas', strength: 'tinted' });
    const { page } = await openPage(ctx, url + '/settings');
    const before = await rootState(page);
    const glasHue = await hue(page);
    const btn = page.locator('[data-glas-style-option="classic"]');
    out.switchButtonFound = (await btn.count()) === 1;
    if (out.switchButtonFound) {
      await btn.click();
      await run(page, 200);
    }
    const after = await rootState(page);
    const afterHue = await hue(page);
    const keys = new Set([...Object.keys(fresh.vars), ...Object.keys(after.vars)]);
    const diffs = [...keys].filter((k) => fresh.vars[k] !== after.vars[k]).map((k) => ({ k, fresh: fresh.vars[k], after: after.vars[k] }));
    // in-app navigation (no reload) to the start page, then the same picture as a fresh Klassisch start
    await page.evaluate(() => { history.pushState({}, '', '/'); dispatchEvent(new PopStateEvent('popstate')); });
    await page.waitForLoadState('networkidle'); // the start page's lazy chunk
    await run(page, 200);
    await settleAnimations(page);
    await page.waitForLoadState('networkidle');
    await run(page, 200);
    const home = await pixelDiff(cmp, freshHome, await shot(page), false);
    out.switchBack = {
      glasVarsBefore: Object.keys(before.vars).filter((k) => k.startsWith('--g-')).length,
      glasVarsAfter: Object.keys(after.vars).filter((k) => k.startsWith('--g-')).length,
      attrs: { fresh: fresh.attrs, after: after.attrs },
      themeColor: { before: before.themeColor, fresh: fresh.themeColor, after: after.themeColor },
      diffs,
      homePixels: home.pixels,
      accentSlider: { classicFresh: freshHue, classicToGlas: toGlasHue, glasFresh: glasHue, glasToClassic: afterHue },
    };
    out.switchBackOk = out.switchButtonFound && out.switchBack.glasVarsBefore > 0 && out.switchBack.glasVarsAfter === 0
      && diffs.length === 0 && JSON.stringify(fresh.attrs) === JSON.stringify(after.attrs)
      && fresh.themeColor === after.themeColor && before.themeColor !== after.themeColor && home.pixels === 0;
    // the two defaults differ (34 vs 35 for aurora light), so a stale slider shows up
    out.accentSliderOk = freshHue !== glasHue && afterHue === freshHue && toGlasHue === glasHue;
    await ctx.close();
  }

  // 3. mode "auto": the OS switch keeps Glas and flips the palette
  {
    const ctx = await newContext(browser, 'phone', { demo: true, mode: 'auto', style: 'glas', strength: 'clear' });
    const { page } = await openPage(ctx, url + '/');
    const read = () => page.evaluate(() => ({ style: document.documentElement.getAttribute('data-style'), bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().toUpperCase() }));
    // the media change event comes with a real rendering frame, not with the paused clock: wait for it in real time
    const until = async (bg) => {
      let r = await read();
      for (const end = Date.now() + 3000; r.bg !== bg && Date.now() < end; r = await read()) await new Promise((res) => setTimeout(res, 50));
      return r;
    };
    const light = await read();
    await page.emulateMedia({ colorScheme: 'dark' });
    const dark = await until('#000000');
    await page.emulateMedia({ colorScheme: 'light' });
    const back = await until('#F2F2F7');
    out.autoMode = { light, dark, back };
    out.autoModeOk = light.style === 'glas' && dark.style === 'glas' && light.bg === '#F2F2F7' && dark.bg === '#000000' && back.bg === '#F2F2F7';
    await ctx.close();
  }

  // 4. reduced motion: the Glas entry animation never starts (screenshots cannot tell — they fast-forward animations)
  {
    const started = async (reducedMotion) => {
      const ctx = await newContext(browser, 'phone', { demo: true, mode: 'light', style: 'glas', strength: 'clear', reducedMotion });
      await ctx.addInitScript(() => {
        window.__anims = [];
        document.addEventListener('animationstart', (e) => window.__anims.push(e.animationName), true);
      });
      const { page } = await openPage(ctx, url + '/system');
      await page.waitForTimeout(700); // real time: CSS animations do not follow the paused clock
      const names = await page.evaluate(() => window.__anims);
      await ctx.close();
      return names.filter((n) => n === 'g-rise').length;
    };
    out.reducedMotion = { normal: await started('no-preference'), reduce: await started('reduce') };
    out.reducedMotionOk = out.reducedMotion.normal > 0 && out.reducedMotion.reduce === 0;
  }

  // 5. switch knobs on the orange track are white in Glas, in both modes (Klassisch paints some with --on-accent, which
  //    the accent areas turn dark). Every page of the demo that shows a switched-on switch.
  {
    const KNOBS = {
      pill: '.pill-toggle input:checked + .pill-toggle__track .pill-toggle__knob',
      autoRow: '.auto-row-toggle input:checked + .auto-row-toggle__track .auto-row-toggle__knob',
      legacy: '.toggle-switch input:checked ~ .toggle-switch__knob',
      pool: '.pool-switch input:checked + .pool-switch__track .pool-switch__thumb',
      deviceCard: '.device-toggle--on .device-toggle__thumb',
      deviceRow: '.device-toggle--on .device-toggle__knob',
      admin: '.admin-toggle--on .admin-toggle__thumb',
      // stage 4: the Glas switch (the start page's device rows) draws its knob as ::after
      glasSwitch: ['[aria-checked="true"] > .g-switch', '::after'],
    };
    const found = {};
    const bad = [];
    // favourites, so that the start page's device card lists the switched-on ones; dark with "Transparenz reduzieren"
    // on, so that the settings show one switched-on admin switch, too
    const customization = { favorites: ['light.living_room_ceiling', 'light.living_room_floor_lamp', 'light.kitchen_counter',
      'light.office_desk', 'switch.coffee_machine', 'switch.office_desk'] };
    for (const [mode, reduce] of [['light', false], ['dark', true]]) {
      const ctx = await newContext(browser, 'desktop', { demo: true, mode, style: 'glas', strength: 'clear', reduce, customization });
      for (const p of ['/', '/room/living_room', '/automations', '/pool', '/settings']) {
        const { page } = await openPage(ctx, url + p);
        await settleAnimations(page); // the knob's background transition runs on real time
        const r = await page.evaluate((sels) => Object.fromEntries(Object.entries(sels).map(([k, s]) => {
          const [sel, pseudo] = Array.isArray(s) ? s : [s, null];
          return [k, [...document.querySelectorAll(sel)].map((el) => getComputedStyle(el, pseudo).backgroundColor)];
        })), KNOBS);
        for (const [k, colors] of Object.entries(r)) {
          found[k] = (found[k] || 0) + colors.length;
          colors.filter((c) => c !== 'rgb(255, 255, 255)').forEach((c) => bad.push({ mode, page: p, knob: k, color: c }));
        }
        await page.close();
      }
      await ctx.close();
    }
    out.knobs = { found, bad };
    // the demo shows these kinds switched on; the others (legacy, device rows in a dialog, since stage 4 the classic
    // device card, which Glas draws with its own switch) are checked where they appear
    out.knobsOk = bad.length === 0 && ['pill', 'autoRow', 'pool', 'glasSwitch', 'admin'].every((k) => found[k] > 0);
  }

  // 6. cards are borderless in Glas, except borders that show a state: a triggered alarm card (added to the security
  //    page, whose stylesheets define it) keeps the border Klassisch gives it. Note: in the production build the
  //    shared chunk with .alarm-panel-card--triggered is linked before the one with .card, so Klassisch shows the
  //    plain card border there, not the red one — `triggeredIsDanger` reports it, Glas only must not hide it.
  {
    const ctx = await newContext(browser, 'desktop', { demo: true, mode: 'light', style: 'glas', strength: 'clear' });
    const { page } = await openPage(ctx, url + '/security');
    out.cardBorders = await page.evaluate(() => {
      const border = (el) => getComputedStyle(el).borderTopColor;
      const plain = [...document.querySelectorAll('.card')].map(border);
      const triggered = document.createElement('div');
      triggered.className = 'card alarm-panel-card alarm-panel-card--triggered';
      document.body.appendChild(triggered);
      const danger = document.createElement('div');
      danger.style.color = 'var(--danger)';
      document.body.appendChild(danger);
      const r = { plain: plain.length, plainWithBorder: plain.filter((c) => c !== 'rgba(0, 0, 0, 0)').length,
        triggered: border(triggered), triggeredIsDanger: border(triggered) === getComputedStyle(danger).color };
      triggered.remove(); danger.remove();
      return r;
    });
    const cb = out.cardBorders;
    out.cardBordersOk = cb.plain > 0 && cb.plainWithBorder === 0 && cb.triggered !== 'rgba(0, 0, 0, 0)';
    await ctx.close();
  }

  await cmp.close();
  return out.prePaintOk && out.noWebfontsOk && out.switchBackOk && out.accentSliderOk && out.autoModeOk && out.reducedMotionOk
    && out.knobsOk && out.cardBordersOk;
}

// ---------------------------------------------------------------------------------------------------- stage 2: frame

/** Every page of the demo, and a room that does not exist (no header actions there). */
const FRAME_ROUTES = ['/', '/room/living_room', '/room/nope', '/security', '/pool', '/energy', '/music', '/devices',
  '/automations', '/scenes', '/system', '/settings', '/nvr'];

/** Helpers in every document of the frame checks (`window.__g`). Runs in the page. */
function pageHelpers() {
  const r = (el) => {
    const b = el.getBoundingClientRect();
    return { x: b.left, y: b.top, w: b.width, h: b.height, right: b.right, bottom: b.bottom };
  };
  const visible = (el) => !!el && el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
  const desc = (el) => {
    if (!el) return null;
    const cls = typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).join('.') : el.tagName.toLowerCase();
    const label = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return (label ? `${cls} "${label}"` : cls).slice(0, 80);
  };
  const glassy = (cs) => [cs.backdropFilter, cs.webkitBackdropFilter].some((v) => v && v !== 'none');
  const MOVES = ['transform', 'translate', 'scale', 'rotate', 'filter', 'opacity'];
  /** Ancestors that would move a fixed element (containing block) or cut a glass surface off from the page behind it
   * (backdrop root, GLAS-DESIGN §3.7) — also while an animation runs on them. */
  const badAncestors = (el) => {
    const bad = [];
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const why = [];
      if ([cs.transform, cs.translate, cs.scale, cs.rotate].some((v) => v !== 'none')) why.push('transform');
      if (cs.perspective !== 'none') why.push('perspective');
      if (cs.filter !== 'none') why.push('filter');
      if (glassy(cs)) why.push('backdrop-filter');
      if (/paint|layout|strict|content/.test(cs.contain)) why.push('contain');
      if (/transform|perspective|filter|opacity|mask|clip-path|mix-blend-mode/.test(cs.willChange)) why.push('will-change');
      if (parseFloat(cs.opacity) < 1) why.push('opacity');
      if ([cs.maskImage, cs.webkitMaskImage].some((v) => v && v !== 'none')) why.push('mask');
      if (cs.clipPath !== 'none') why.push('clip-path');
      if (cs.mixBlendMode !== 'normal') why.push('mix-blend-mode');
      const anims = a.getAnimations().filter((x) => x.playState === 'running' && x.effect
        && x.effect.getKeyframes().some((k) => MOVES.some((p) => p in k)));
      if (anims.length) why.push('animation ' + anims.map((x) => x.animationName || x.transitionProperty).join('/'));
      if (why.length) bad.push(desc(a) + ': ' + why.join(','));
    }
    return bad;
  };
  window.__g = {
    r, visible, desc, badAncestors,
    /** Visible glass surfaces (backdrop-filter on the element; the scroll edge blurs on ::before and is no glass). */
    glass() {
      const all = [...document.querySelectorAll('body *')].filter((el) => glassy(getComputedStyle(el)) && visible(el));
      return all.map((el) => ({ el: desc(el), inGlass: all.some((o) => o !== el && o.contains(el)), roots: badAncestors(el) }));
    },
    /** Elements and pseudo-elements with a backdrop-filter. */
    anyBlur() {
      const hits = [];
      for (const el of document.querySelectorAll('body, body *')) {
        for (const pseudo of [null, '::before', '::after']) {
          const cs = getComputedStyle(el, pseudo);
          if (pseudo && cs.content === 'none') continue;
          if (glassy(cs) && (pseudo ? visible(el) || el === document.body : visible(el))) hits.push(desc(el) + (pseudo || ''));
        }
      }
      return hits;
    },
    /** Visible matches with a hit area below 44 × 44: [element, width, height]. */
    small(sel) {
      return [...document.querySelectorAll(sel)].filter(visible)
        .map((el) => [desc(el), Math.round(r(el).w * 10) / 10, Math.round(r(el).h * 10) / 10])
        .filter(([, w, h]) => w < 43.9 || h < 43.9);
    },
    /** What a tap on the centre of `el` reaches is `el` itself (or inside it). */
    onTop(el) {
      const b = r(el);
      const top = document.elementFromPoint(b.x + b.w / 2, b.y + b.h / 2);
      return !!top && (top === el || el.contains(top));
    },
    /** Anything the Glas frame writes: data-g-* / data-tabs-min attributes, --g-* and sheen (--gx/--gy) inline
     * variables, g-* classes. */
    remnants() {
      const bad = [];
      for (const el of [document.documentElement, ...document.querySelectorAll('*')]) {
        for (const a of el.getAttributeNames()) if (/^data-(g-|tabs-min)/.test(a)) bad.push(desc(el) + ' @' + a);
        if (/--g-|--g[xy]\b/.test(el.getAttribute('style') || '')) bad.push(desc(el) + ' style');
        if ([...el.classList].some((c) => c.startsWith('g-'))) bad.push(desc(el));
      }
      const tabs = document.querySelector('.app-tabs');
      return { count: bad.length, bad: bad.slice(0, 8),
        nonItems: tabs ? [...tabs.children].filter((c) => !c.classList.contains('app-tabs__item')).length : -1 };
    },
    /** Running animations of the matches: name, duration, animated properties. */
    anims(sel) {
      return [...document.querySelectorAll(sel)].flatMap((el) => el.getAnimations().map((a) => ({
        el: desc(el).slice(0, 30), name: a.animationName || a.transitionProperty,
        ms: Math.round(Number(a.effect.getComputedTiming().duration) || 0),
        props: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))]
          .filter((p) => !['offset', 'computedOffset', 'easing', 'composite'].includes(p)),
      })));
    },
  };
}

/** Real-time wait for a condition in the page (Playwright polls in its own world, the paused clock does not stop it). */
const until = (page, fn, a, timeout = 4000) => page.waitForFunction(fn, a, { timeout }).then(() => true, () => false);

/** Scroll at once (the page scrolls smoothly otherwise) and let the Glas runtime evaluate it: its
 * requestAnimationFrame runs on the paused clock. */
async function scrollTick(page, y) {
  await page.evaluate((top) => {
    window.scrollTo({ top, behavior: 'instant' });
    window.dispatchEvent(new Event('scroll'));
  }, y);
  await run(page, 20);
}

/** In-app navigation: same document (clock budget goes on). Returns 'new' once the next page is in the DOM, 'kept'
 * when React kept the page element (same component, e.g. room → room), '' when no page appeared. */
async function navigate(page, to) {
  await page.evaluate((p) => {
    document.querySelectorAll('.app-main .page').forEach((el) => el.setAttribute('data-check-old', ''));
    history.pushState({}, '', p);
    dispatchEvent(new PopStateEvent('popstate'));
  }, to);
  if (await until(page, () => !!document.querySelector('.app-main .page:not([data-check-old])'), null, 1500)) return 'new';
  await page.waitForLoadState('networkidle');
  return (await page.evaluate(() => !!document.querySelector('.app-main .page'))) ? 'kept' : '';
}

const near = (v, want, tol = 1) => typeof v === 'number' && Math.abs(v - want) <= tol;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Runtime checks of stage 2 (docs/glas/PLAN-ETAPPE-2.md §6.3). */
async function frameChecks(browser, url, out) {
  const pageErrors = [];
  /** One check: an exception marks it failed (with the message) instead of ending the run. */
  const block = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      out[name + 'Error'] = String(e && e.message).split('\n')[0].slice(0, 300);
      out[name + 'Ok'] = false;
    }
  };
  const open = async (device, style, p, extra = {}) => {
    const ctx = await newContext(browser, device, { demo: true, mode: 'light', style, strength: 'clear', ...extra });
    await ctx.addInitScript(pageHelpers);
    const { page, errors } = await openPage(ctx, url + p);
    const close = async () => {
      if (errors.length) pageErrors.push({ device, style, path: p, errors: errors.slice(0, 3) });
      await ctx.close();
    };
    return { ctx, page, close };
  };
  const ev = (page, fn, a) => page.evaluate(fn, a);
  const avatarItems = (page) => ev(page, () => {
    const items = [...document.querySelectorAll('.g-avatar-menu [role="menuitem"]')];
    const btn = document.querySelector('.g-avatar__btn');
    return { open: !!document.querySelector('.g-avatar-menu:not(.g-avatar-menu--closing)'), n: items.length,
      i: items.indexOf(document.activeElement), onAvatar: document.activeElement === btn,
      expanded: btn && btn.getAttribute('aria-expanded'), texts: items.map((x) => x.textContent.trim()) };
  });

  // 1. Klassisch: nothing of the frame — on a fresh load, and after switching back from Glas with the frame in use
  //    (tab bar minimised and its lens placed, desktop scrolled, a sheen surface pressed)
  await block('frameClassic', async () => {
    const res = {};
    for (const device of ['phone', 'desktop']) {
      const fresh = await open(device, 'classic', '/');
      res[device] = await ev(fresh.page, () => __g.remnants());
      await fresh.close();
      const used = await open(device, 'glas', '/settings');
      await scrollTick(used.page, 600);
      res[device + 'Before'] = await ev(used.page, () => document.documentElement.hasAttribute(innerWidth < 900 ? 'data-tabs-min' : 'data-g-scrolled'));
      // a press without a click: the sheen runtime only listens to pointerdown (upstream elements keep the variables
      // in Klassisch unless they are removed)
      res[device + 'Sheen'] = await ev(used.page, () => {
        const el = document.querySelector('.header-cluster .notifications-wrap');
        if (!el) return false;
        const b = __g.r(el);
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: b.x + 4, clientY: b.y + 4 }));
        return el.style.getPropertyValue('--gx') !== '';
      });
      await used.page.locator('[data-glas-style-option="classic"]').click();
      await run(used.page, 50);
      res[device + 'AfterSwitch'] = await ev(used.page, () => __g.remnants());
      await used.close();
    }
    out.frameClassic = res;
    out.frameClassicOk = res.phoneBefore === true && res.desktopBefore === true && res.desktopSheen === true
      && ['phone', 'desktop', 'phoneAfterSwitch', 'desktopAfterSwitch'].every((k) => res[k].count === 0 && res[k].nonItems === 0);
  });

  // 2. Phone tab bar: minimises scrolling down (> 24 px from the turning point), expands scrolling up, near the top and
  //    at the page end; a keyboard focus in the bar keeps it expanded
  await block('tabsMin', async () => {
    const { page, close } = await open('phone', 'glas', '/');
    const min = () => ev(page, () => document.documentElement.hasAttribute('data-tabs-min'));
    const maxY = await ev(page, () => document.scrollingElement.scrollHeight - innerHeight);
    const ys = [300, 270, 285, 300, maxY, maxY - 200, maxY - 100, 30];
    const seq = [];
    for (const y of ys) { await scrollTick(page, y); seq.push(await min()); }
    const want = [true, false, false, true, false, false, true, false];
    await scrollTick(page, 0);
    await ev(page, () => document.activeElement && document.activeElement.blur());
    let inBar = false;
    for (let i = 0; i < 8 && !inBar; i++) {
      await page.keyboard.press('Shift+Tab');
      inBar = await ev(page, () => !!document.activeElement.closest('.app-tabs') && document.activeElement.matches(':focus-visible'));
    }
    await scrollTick(page, 300);
    const keptByFocus = inBar && !(await min());
    out.tabsMin = { maxY, ys, seq, want, focusInBar: inBar, keptByFocus };
    out.tabsMinOk = maxY > 700 && same(seq, want) && keptByFocus;
    await close();
  });

  // 3. Minimised: a 52 circle with the shown symbol in its middle at 375, 390, 430 and 820 (iPad upright); expanded,
  //    the lens covers the shown entry. The bar is the viewport minus 32 wide, from 600 px at most 560 and centred
  //    (K33). Behind "Mehr" (settings) the lens sits on "Mehr". Desktop: the sidebar lens on the active entry (2 px in
  //    at the top and the bottom, K40).
  await block('tabGeometry', async () => {
    const res = {};
    for (const device of ['phone375', 'phone', 'phone430', 'ipadUpright']) {
      const { page, close } = await open(device, 'glas', '/');
      await settleAnimations(page);
      const lens = await ev(page, () => {
        const l = __g.r(document.querySelector('.g-tabs__lens'));
        const e = __g.r(document.querySelector('.app-tabs [data-g-tab-pick]'));
        const b = __g.r(document.querySelector('.app-tabs'));
        return { dx: l.x - e.x, dy: l.y - e.y, dw: l.w - e.w, dh: l.h - e.h, bar: { w: b.w, left: b.x, right: innerWidth - b.x - b.w } };
      });
      await scrollTick(page, 400);
      await settleAnimations(page);
      const circle = await ev(page, () => {
        const g = __g.r(document.querySelector('.g-tabs__glass'));
        const s = __g.r(document.querySelector('.app-tabs [data-g-tab-pick] > svg'));
        return { w: g.w, h: g.h, dx: s.x + s.w / 2 - (g.x + g.w / 2), dy: s.y + s.h / 2 - (g.y + g.h / 2) };
      });
      res[device] = { lens, circle };
      await close();
    }
    const more = await open('phone', 'glas', '/settings');
    await settleAnimations(more.page);
    res.moreRoute = await ev(more.page, (label) => {
      const m = document.querySelector(`.app-tabs__item[aria-label="${label}"]`);
      const l = __g.r(document.querySelector('.g-tabs__lens'));
      const e = __g.r(m);
      return { picked: m.hasAttribute('data-g-tab-pick'), dx: l.x - e.x, dy: l.y - e.y, dw: l.w - e.w, dh: l.h - e.h };
    }, DE['nav.moreNavigation']);
    await more.close();
    const side = await open('desktop', 'glas', '/energy');
    await settleAnimations(side.page);
    res.sidebar = await ev(side.page, () => {
      const l = __g.r(document.querySelector('.g-navgroups__lens'));
      const e = __g.r(document.querySelector('.sidebar-nav__item--active'));
      return { dx: l.x - e.x, dy: l.y - (e.y + 2), dw: l.w - e.w, dh: l.h - (e.h - 4) };
    });
    await side.close();
    const zero = (o) => ['dx', 'dy', 'dw', 'dh'].every((k) => near(o[k], 0));
    out.tabGeometry = res;
    const barOk = (d) => {
      const { w, left, right } = res[d].lens.bar;
      const vw = DEVICES[d].viewport.width;
      return near(w, vw >= 600 ? Math.min(560, vw - 32) : vw - 32) && near(left, right);
    };
    out.tabGeometryOk = ['phone375', 'phone', 'phone430', 'ipadUpright'].every((d) => zero(res[d].lens) && barOk(d)
      && near(res[d].circle.w, 52) && near(res[d].circle.h, 52) && near(res[d].circle.dx, 0) && near(res[d].circle.dy, 0))
      && res.moreRoute.picked && zero(res.moreRoute) && zero(res.sidebar);
  });

  // 4. Minimised, only "Tab-Leiste einblenden" can take the focus; Enter on it expands the bar and puts the focus on
  //    the shown entry
  await block('tabsExpand', async () => {
    const { page, close } = await open('phone', 'glas', '/');
    await scrollTick(page, 400);
    await settleAnimations(page); // the entries turn invisible after the shrink (real time)
    const focusable = await ev(page, () => [...document.querySelectorAll('.app-tabs a, .app-tabs button')]
      .filter((el) => el.checkVisibility({ visibilityProperty: true }) && el.tabIndex >= 0).map((el) => __g.desc(el)));
    await page.locator('.g-tabs__expand').focus();
    await page.keyboard.press('Enter');
    await run(page, 20);
    const after = await ev(page, () => ({ min: document.documentElement.hasAttribute('data-tabs-min'),
      onShown: document.activeElement.hasAttribute('data-g-tab-pick'), active: __g.desc(document.activeElement) }));
    out.tabsExpand = { focusable, after };
    out.tabsExpandOk = focusable.length === 1 && /g-tabs__expand/.test(focusable[0]) && !after.min && after.onShown;
    await close();
  });

  // 5. Avatar menu (phone): Enter, arrows with wrap-around, Home/End, Escape and Tab close it with the focus back on
  //    the avatar, ArrowUp on the closed avatar opens it on the last item; a tap on the dim layer closes it without
  //    reaching the page below
  await block('avatarMenu', async () => {
    const { page, close } = await open('phone', 'glas', '/');
    const steps = {};
    const opened = () => until(page, () => !!document.activeElement && document.activeElement.matches('.g-avatar-menu [role="menuitem"]'));
    const closed = () => until(page, () => !document.querySelector('.g-avatar-menu'));
    await page.locator('.g-avatar__btn').focus();
    await page.keyboard.press('Enter');
    await opened();
    steps.enter = await avatarItems(page);
    for (const key of ['ArrowDown', 'End', 'Home', 'ArrowUp']) {
      await page.keyboard.press(key);
      steps[key] = (await avatarItems(page)).i;
    }
    await page.keyboard.press('Escape');
    await closed();
    steps.escape = await avatarItems(page);
    await page.keyboard.press('ArrowUp');
    await opened();
    steps.arrowUpOpens = (await avatarItems(page)).i;
    await page.keyboard.press('Tab');
    await closed();
    steps.tab = await avatarItems(page);
    await page.locator('.g-avatar__btn').click();
    await until(page, () => !!document.querySelector('.g-avatar-menu'));
    // the dim layer is what a tap there hits, not a tile below it
    const hit = await ev(page, () => { const el = document.elementFromPoint(195, 640); return el ? __g.desc(el) : ''; });
    await page.mouse.click(195, 640);
    await closed();
    steps.outside = { ...(await avatarItems(page)), path: await ev(page, () => location.pathname), hit };
    const n = steps.enter.n;
    out.avatarMenu = steps;
    out.avatarMenuOk = steps.enter.open && n === 3 && steps.enter.i === 0 && steps.enter.expanded === 'true'
      && steps.ArrowDown === 1 && steps.End === n - 1 && steps.Home === 0 && steps.ArrowUp === n - 1
      && !steps.escape.open && steps.escape.onAvatar && steps.escape.expanded === 'false'
      && steps.arrowUpOpens === n - 1 && !steps.tab.open && steps.tab.onAvatar
      && !steps.outside.open && steps.outside.path === '/' && /g-avatar-dim/.test(steps.outside.hit);
    await close();
  });

  // 6. Notifications: on the phone from the avatar menu — the sheet of stage 3 (K57) takes the focus, Escape closes it
  //    with the focus back on the avatar; on the desktop the popover under the bell, Escape returns the focus to the bell
  await block('notifications', async () => {
    const res = {};
    const phone = await open('phone', 'glas', '/');
    await phone.page.locator('.g-avatar__btn').focus();
    await phone.page.keyboard.press('Enter');
    await until(phone.page, () => !!document.activeElement && document.activeElement.matches('.g-avatar-menu [role="menuitem"]'));
    await phone.page.keyboard.press('Enter'); // first item: notifications
    await until(phone.page, () => !!document.activeElement && !!document.activeElement.closest('.modal-panel[role="dialog"]'));
    await settleAnimations(phone.page);
    res.phoneOpen = await ev(phone.page, () => {
      const p = document.querySelector('.modal-panel[role="dialog"]');
      return { panel: __g.visible(p) && !!p.querySelector('.g-notes'), focusIn: !!document.activeElement.closest('.modal-panel[role="dialog"]'),
        active: __g.desc(document.activeElement), rows: p.querySelectorAll('.g-notes__row').length };
    });
    await phone.page.keyboard.press('Escape');
    await until(phone.page, () => !document.querySelector('.modal-panel[role="dialog"], .g-sheet-ghost'));
    res.phoneEscape = await ev(phone.page, () => ({ panel: !!document.querySelector('.modal-panel[role="dialog"]'),
      onAvatar: document.activeElement === document.querySelector('.g-avatar__btn') }));
    await phone.close();
    const desk = await open('desktop', 'glas', '/');
    await desk.page.locator('.header-cluster .notifications-trigger').focus();
    await desk.page.keyboard.press('Enter');
    await until(desk.page, () => !!document.querySelector('.notifications-panel'));
    await settleAnimations(desk.page);
    res.desktopOpen = await ev(desk.page, () => {
      const p = __g.r(document.querySelector('.notifications-panel'));
      const b = __g.r(document.querySelector('.header-cluster .notifications-trigger'));
      return { w: p.w, belowBell: p.y > b.bottom, rightAligned: Math.abs(p.right - b.right) <= 2 };
    });
    await desk.page.keyboard.press('Escape');
    await until(desk.page, () => !document.querySelector('.notifications-panel'));
    res.desktopEscape = await ev(desk.page, () => document.activeElement === document.querySelector('.header-cluster .notifications-trigger'));
    await desk.close();
    out.notifications = res;
    out.notificationsOk = res.phoneOpen.panel && res.phoneOpen.focusIn && res.phoneOpen.rows > 0 && !res.phoneEscape.panel
      && res.phoneEscape.onAvatar && near(res.desktopOpen.w, 392) && res.desktopOpen.belowBell && res.desktopEscape;
  });

  // 7. More and rooms menus: open with Enter, focus on the first item, arrows with wrap-around, Home/End, Escape closes
  //    with the focus back on the trigger (phone sheets, desktop rooms popover beside the sidebar)
  await block('menus', async () => {
    const res = {};
    const walk = async (page, trigger, menu) => {
      const state = () => ev(page, (s) => {
        const items = [...document.querySelectorAll(s + ' [role="menuitem"]')];
        return { open: !!document.querySelector(s), n: items.length, i: items.indexOf(document.activeElement) };
      }, menu);
      const steps = {};
      await page.locator(trigger).first().focus();
      await page.keyboard.press('Enter');
      await until(page, (s) => !!document.querySelector(s), menu);
      await run(page, 20); // both menus focus their first item in requestAnimationFrame (paused clock)
      steps.open = await state();
      for (const key of ['ArrowDown', 'End', 'Home', 'ArrowUp']) {
        await page.keyboard.press(key);
        steps[key] = (await state()).i;
      }
      await page.keyboard.press('Escape');
      await until(page, (s) => !document.querySelector(s), menu);
      steps.escape = { open: (await state()).open, onTrigger: await ev(page, (t) => document.activeElement === document.querySelector(t), trigger) };
      const n = steps.open.n;
      steps.ok = steps.open.open && n > 2 && steps.open.i === 0 && steps.ArrowDown === 1 && steps.End === n - 1
        && steps.Home === 0 && steps.ArrowUp === n - 1 && !steps.escape.open && steps.escape.onTrigger;
      return steps;
    };
    const more = await open('phone', 'glas', '/');
    res.more = await walk(more.page, `.app-tabs__item[aria-label="${DE['nav.moreNavigation']}"]`, '.app-more-menu--open');
    await more.close();
    const rooms = await open('phone', 'glas', '/');
    res.rooms = await walk(rooms.page, `.app-tabs__item[aria-label="${DE['nav.rooms']}"]`, '.rooms-menu--open');
    await rooms.close();
    const desk = await open('desktop', 'glas', '/');
    res.roomsDesktop = await walk(desk.page, ".sidebar-nav__item[aria-haspopup='menu']", '.rooms-menu--open');
    await desk.page.locator(".sidebar-nav__item[aria-haspopup='menu']").click();
    await until(desk.page, () => !!document.querySelector('.rooms-menu--open'));
    await settleAnimations(desk.page);
    res.roomsDesktop.place = await ev(desk.page, () => {
      const s = __g.r(document.querySelector('.app-sidebar'));
      const p = __g.r(document.querySelector('.rooms-menu--open'));
      return { gap: Math.round(p.x - s.right), w: p.w };
    });
    await desk.close();
    out.menus = res;
    out.menusOk = res.more.ok && res.rooms.ok && res.roomsDesktop.ok && res.roomsDesktop.place.gap >= 0
      && res.roomsDesktop.place.gap <= 24 && near(res.roomsDesktop.place.w, 280);
  });

  // 8. Every route, phone/iPad/desktop, Klassisch next to Glas: "Bearbeiten" exactly where Klassisch shows an edit
  //    toggle (K23), chips where Klassisch has them (A17); at rest at most three glass surfaces, no glass in glass, no
  //    backdrop root above a glass surface; fixed buttons at their place and on top (the scroll edge catches no tap);
  //    hit areas of the frame ≥ 44; desktop header flush with the content.
  await block('frameRoutes', async () => {
    const rows = [];
    const PHONE_HITS = '.app-tabs__item, .g-avatar__btn, .g-back, .g-done, .app-chips-mobile .summary-chip';
    const WIDE_HITS = '.sidebar-nav__item, .app-sidebar__collapse, .home-status-pill, .header-cluster .notifications-trigger, '
      + '.g-edit-capsule, .header-cluster .user-avatar, .header-cluster__weather--btn, .g-head-back, .header-cluster__chips .summary-chip';
    for (const device of ['phone', 'ipad', 'desktop']) {
      const phone = device === 'phone';
      for (const p of FRAME_ROUTES) {
        const k = await open(device, 'classic', p);
        await settleAnimations(k.page); // the entry animation starts at opacity 0
        const classic = await ev(k.page, () => ({
          edit: [...document.querySelectorAll('.edit-toggle')].filter((el) => __g.visible(el)).length > 0,
          chips: [...document.querySelectorAll('.app-chips-mobile, .header-cluster__chips')].some((el) => __g.visible(el)),
        }));
        await k.close();
        const g = await open(device, 'glas', p);
        await settleAnimations(g.page);
        const row = await ev(g.page, ([isPhone, hits]) => {
          const q = (s) => document.querySelector(s);
          const res = {
            chips: [...document.querySelectorAll('.app-chips-mobile, .header-cluster__chips')].some((el) => __g.visible(el)),
            glass: __g.glass(),
            small: __g.small(hits),
            edge: q('.g-edge') ? getComputedStyle(q('.g-edge')).pointerEvents : null,
          };
          if (isPhone) {
            const fixed = {};
            const want = { '.g-avatar__btn': { y: 8, right: innerWidth - 14 }, '.g-back': { y: 8, x: 16 } };
            for (const [sel, pos] of Object.entries(want)) {
              const el = q(sel);
              if (!el) continue;
              const b = __g.r(el);
              fixed[sel] = { ok: Math.abs(b.y - pos.y) <= 1 && (pos.x === undefined || Math.abs(b.x - pos.x) <= 1)
                && (pos.right === undefined || Math.abs(b.right - pos.right) <= 1) && Math.abs(b.w - 44) <= 1 && Math.abs(b.h - 44) <= 1,
                onTop: __g.onTop(el), roots: __g.badAncestors(el) };
            }
            res.fixed = fixed;
          } else {
            res.edit = !!q('.g-edit-capsule') && __g.visible(q('.g-edit-capsule'));
            const inner = q('.header-cluster-wrapper');
            const main = q('.app-main');
            if (inner && main) {
              const a = __g.r(inner), m = __g.r(main), ia = getComputedStyle(inner), cm = getComputedStyle(main);
              res.flush = { left: Math.round(a.x + parseFloat(ia.paddingLeft) - (m.x + parseFloat(cm.paddingLeft))),
                right: Math.round(a.right - parseFloat(ia.paddingRight) - (m.right - parseFloat(cm.paddingRight))) };
            }
            res.onTop = ['.header-cluster .notifications-trigger', '.g-edit-capsule', '.header-cluster .user-avatar']
              .filter((s) => q(s) && __g.visible(q(s)) && !__g.onTop(q(s)));
          }
          return res;
        }, [phone, phone ? PHONE_HITS : WIDE_HITS]);
        if (phone && await g.page.locator('.g-avatar__btn').count()) {
          // "Bearbeiten" in the avatar menu
          await tap(g.page, '.g-avatar__btn');
          row.edit = (await avatarItems(g.page)).texts.includes(DE['glas.avatar.edit']);
        } else if (phone) row.edit = false;
        if (phone) {
          // scrolled: the edge does not take the tap at the small title, the avatar stays on top of it
          await g.page.keyboard.press('Escape');
          await until(g.page, () => !document.querySelector('.g-avatar-menu'));
          await scrollTick(g.page, 200);
          row.edgeTap = await ev(g.page, () => {
            const top = document.elementFromPoint(innerWidth / 2, 30);
            const av = document.querySelector('.g-avatar__btn');
            return { edgeTook: !!top && !!top.closest('.g-edge'), avatarOnTop: !av || __g.onTop(av) };
          });
        }
        await g.close();
        const n = row.glass.length;
        const okRow = row.edit === classic.edit && row.chips === classic.chips && n <= 3 && n >= (phone ? 1 : 2)
          && row.glass.every((x) => !x.inGlass && x.roots.length === 0) && row.small.length === 0
          && (row.edge === null || row.edge === 'none')
          && (phone ? Object.values(row.fixed).every((f) => f.ok && f.onTop && f.roots.length === 0)
            && !row.edgeTap.edgeTook && row.edgeTap.avatarOnTop
            : row.onTop.length === 0 && (!row.flush || (near(row.flush.left, 0) && near(row.flush.right, 0))));
        rows.push({ device, path: p, ok: okRow, classic, ...row, glass: row.glass.map((x) => x.el + (x.inGlass ? ' IN GLASS' : '')
          + (x.roots.length ? ' ROOTS ' + x.roots.join(' | ') : '')) });
      }
    }
    out.frameRoutes = rows.filter((x) => !x.ok).concat(rows.length ? [] : [{ none: true }]);
    out.frameRoutesCount = rows.length;
    out.frameRoutesOk = rows.length === FRAME_ROUTES.length * 3 && rows.every((x) => x.ok);
  });

  // 9. Edit mode on every route (also a room that does not exist): "Fertig" stays (phone capsule next to the avatar,
  //    desktop header capsule); right after each route change no fixed button has a moving or transformed ancestor
  //    (entry animation, K35)
  await block('editEverywhere', async () => {
    const res = {};
    for (const device of ['phone', 'desktop']) {
      const phone = device === 'phone';
      const { page, close } = await open(device, 'glas', '/');
      if (phone) {
        await tap(page, '.g-avatar__btn');
        await page.locator(`.g-avatar-menu__item:has-text("${DE['glas.avatar.edit']}")`).click();
      } else await page.locator('.g-edit-capsule').click();
      await until(page, (ph) => !!document.querySelector(ph ? '.g-done' : '.g-edit-capsule[aria-pressed="true"]'), phone);
      const rows = [];
      for (const p of FRAME_ROUTES) {
        const shown = (await ev(page, () => location.pathname)) === p ? 'same' : await navigate(page, p);
        const early = await ev(page, () => ['.g-avatar__btn', '.g-back', '.g-done', '.app-header-cluster-wrapper']
          .map((s) => document.querySelector(s)).filter(Boolean).flatMap((el) => __g.badAncestors(el)));
        await settleAnimations(page);
        const late = await ev(page, (ph) => {
          const done = document.querySelector(ph ? '.g-done' : '.g-edit-capsule[aria-pressed="true"]');
          const av = document.querySelector('.g-avatar__btn');
          const b = done && __g.r(done);
          return { done: !!done && __g.visible(done) && __g.onTop(done),
            place: !ph || !b ? null : { y: Math.round(b.y), right: Math.round(innerWidth - b.right), h: Math.round(b.h) },
            withAvatar: !!av };
        }, phone);
        const placeOk = !phone || (late.place && late.place.y === 8 && late.place.h === 44
          && late.place.right === (late.withAvatar ? 66 : 16));
        rows.push({ path: p, shown, ok: !!shown && early.length === 0 && late.done && placeOk, early, ...late });
      }
      // "Fertig" ends edit mode
      await page.locator(phone ? '.g-done' : '.g-edit-capsule').click();
      const ended = await until(page, () => !document.querySelector('.g-done, .g-edit-capsule[aria-pressed="true"]'));
      res[device] = { bad: rows.filter((x) => !x.ok), routes: rows.length, ended };
      await close();
    }
    out.editEverywhere = res;
    out.editEverywhereOk = Object.values(res).every((x) => x.bad.length === 0 && x.routes === FRAME_ROUTES.length && x.ended);
  });

  // 10. Opaque (strength "Deckend"; the same as "Transparenz reduzieren"/more contrast): no backdrop-filter anywhere,
  //     also with the avatar menu, the notifications sheet, More and the rooms sheet open (phone) and the
  //     notifications and rooms popovers (desktop); more contrast alike. Each opened layer must really be there.
  await block('opaque', async () => {
    const res = {};
    const shown = {};
    const isOpen = (page, sel) => ev(page, (q) => !!document.querySelector(q), sel);
    const phone = await open('phone', 'glas', '/', { strength: 'opaque' });
    res.phoneRest = await ev(phone.page, () => __g.anyBlur());
    await scrollTick(phone.page, 400);
    res.phoneScrolled = await ev(phone.page, () => __g.anyBlur());
    await scrollTick(phone.page, 0);
    await tap(phone.page, '.g-avatar__btn');
    shown.phoneAvatar = await isOpen(phone.page, '.g-avatar-menu');
    res.phoneAvatar = await ev(phone.page, () => __g.anyBlur());
    await tap(phone.page, `.g-avatar-menu__item:has-text("${DE['glas.avatar.notifications']}")`);
    shown.phoneNotifications = await isOpen(phone.page, '.modal-panel .g-notes');
    res.phoneNotifications = await ev(phone.page, () => __g.anyBlur());
    await phone.close();
    const more = await open('phone', 'glas', '/', { strength: 'opaque' });
    await tap(more.page, `.app-tabs__item[aria-label="${DE['nav.moreNavigation']}"]`);
    shown.phoneMore = await isOpen(more.page, '.app-more-menu--open');
    res.phoneMore = await ev(more.page, () => __g.anyBlur());
    await more.close();
    const rooms = await open('phone', 'glas', '/', { strength: 'opaque' });
    await tap(rooms.page, `.app-tabs__item[aria-label="${DE['nav.rooms']}"]`);
    shown.phoneRooms = await isOpen(rooms.page, '.rooms-menu--open');
    res.phoneRooms = await ev(rooms.page, () => __g.anyBlur());
    await rooms.close();
    const desk = await open('desktop', 'glas', '/', { strength: 'opaque' });
    res.desktopRest = await ev(desk.page, () => __g.anyBlur());
    await tap(desk.page, '.header-cluster .notifications-trigger');
    shown.desktopNotifications = await isOpen(desk.page, '.notifications-panel');
    res.desktopNotifications = await ev(desk.page, () => __g.anyBlur());
    await desk.page.keyboard.press('Escape');
    await tap(desk.page, ".sidebar-nav__item[aria-haspopup='menu']");
    shown.desktopRooms = await isOpen(desk.page, '.rooms-menu--open');
    res.desktopRooms = await ev(desk.page, () => __g.anyBlur());
    await desk.close();
    const contrast = await open('phone', 'glas', '/', { contrast: true });
    await scrollTick(contrast.page, 400);
    res.contrastScrolled = await ev(contrast.page, () => ({ glass: document.documentElement.getAttribute('data-glass'), blur: __g.anyBlur() }));
    await contrast.close();
    out.opaque = res;
    out.opaqueShown = shown;
    out.opaqueOk = Object.values(shown).every(Boolean)
      && Object.entries(res).every(([k, v]) => (k === 'contrastScrolled' ? v.glass === 'opaque' && v.blur.length === 0 : v.length === 0));
  });

  // 11. Desktop sidebar: groups "Zuhause", "Bereiche", "System" with every visible entry; edit mode = the flat list as
  //     in Klassisch (drag, eyes); collapsed to 72 with a tooltip on every entry
  await block('sidebar', async () => {
    const { page, close } = await open('desktop', 'glas', '/');
    const read = () => ev(page, () => ({
      titles: [...document.querySelectorAll('.g-navgroup__title')].map((x) => x.textContent.trim()),
      groups: !!document.querySelector('.g-navgroups'),
      grouped: document.querySelectorAll('.g-navgroups .sidebar-nav__item').length,
      width: Math.round(__g.r(document.querySelector('.app-sidebar')).w),
      titlesOnItems: [...document.querySelectorAll('.sidebar-nav__item')].filter((x) => x.getAttribute('title')).length,
      items: document.querySelectorAll('.sidebar-nav__item').length,
    }));
    const res = { rest: await read() };
    await page.locator('.g-edit-capsule').click();
    await until(page, () => !document.querySelector('.g-navgroups'));
    res.edit = await read();
    await page.locator('.g-edit-capsule').click();
    await until(page, () => !!document.querySelector('.g-navgroups'));
    await page.locator('.app-sidebar__collapse').click();
    await until(page, () => !!document.querySelector('.app-sidebar--collapsed'));
    await settleAnimations(page);
    res.collapsed = await read();
    await close();
    const titles = [DE['glas.nav.group.home'], DE['glas.nav.group.areas'], DE['glas.nav.group.system']];
    out.sidebar = res;
    out.sidebarOk = same(res.rest.titles, titles) && res.rest.groups && res.rest.grouped === res.rest.items && res.rest.items > 5
      && !res.edit.groups && res.edit.items >= res.rest.items && res.edit.titles.length === 0 && res.rest.titlesOnItems === 0 && near(res.rest.width, 260) && near(res.collapsed.width, 72)
      && res.collapsed.titlesOnItems === res.collapsed.items;
  });

  // 12. Reduced motion: menus and toasts cross-fade 200 ms (opacity only), the tab bar and the lens switch at once,
  //     the banner ring stands still. The lens is moved by a tab that changes the route (a link; "Räume" only opens
  //     its menu); the same tap without reduced motion does animate it (control).
  const lensAfterTap = async (page) => {
    const before = await ev(page, () => location.pathname);
    await page.locator('a.app-tabs__item:not([data-g-tab-pick])').first().click();
    await until(page, (p) => location.pathname !== p, before);
    await run(page, 50); // the lens moves in the next frames (useLens: layout, then requestAnimationFrame)
    // its transition runs in real time: look several times instead of once (a busy machine starts it later)
    let anims = [];
    for (let i = 0; i < 10 && !anims.length; i++) {
      if (i) await new Promise((r) => setTimeout(r, 40));
      anims = await ev(page, () => __g.anims('.g-tabs__lens, .app-tabs__item > svg').filter((a) => a.ms > 1));
    }
    return { moved: (await ev(page, () => location.pathname)) !== before, anims };
  };
  await block('reducedMotionFrame', async () => {
    const res = {};
    const rm = { reducedMotion: 'reduce' };
    const phone = await open('phone', 'glas', '/', rm);
    await phone.page.locator('.g-avatar__btn').click();
    await until(phone.page, () => !!document.querySelector('.g-avatar-menu'));
    res.avatarMenu = await ev(phone.page, () => __g.anims('.g-avatar-menu'));
    await phone.page.keyboard.press('Escape');
    await until(phone.page, () => !document.querySelector('.g-avatar-menu'));
    await phone.page.evaluate(TOAST, [DE['toast.notConnected'], DE['toast.dismiss']]);
    res.toast = await ev(phone.page, () => __g.anims('.toaster__item'));
    await phone.page.evaluate(BANNER, ['warning', DE['banner.reconnecting']]);
    res.bannerRing = await ev(phone.page, () => getComputedStyle(document.querySelector('.app-banner'), '::before').animationName);
    await scrollTick(phone.page, 400);
    res.tabBar = await ev(phone.page, () => __g.anims('.app-tabs, .app-tabs *').filter((a) => a.ms > 1));
    await scrollTick(phone.page, 0);
    res.lens = await lensAfterTap(phone.page);
    await phone.close();
    const control = await open('phone', 'glas', '/');
    res.lensControl = await lensAfterTap(control.page);
    await control.close();
    const more = await open('phone', 'glas', '/', rm);
    await more.page.locator(`.app-tabs__item[aria-label="${DE['nav.moreNavigation']}"]`).click();
    await until(more.page, () => !!document.querySelector('.app-more-menu--open'));
    res.more = await ev(more.page, () => __g.anims('.app-more-menu--open'));
    await more.close();
    const fade = (list) => list.length > 0 && list.every((a) => a.name === 'g-fade-in' && a.ms === 200 && same(a.props, ['opacity']));
    out.reducedMotionFrame = res;
    out.reducedMotionFrameOk = fade(res.avatarMenu) && fade(res.toast) && fade(res.more) && res.bannerRing === 'none'
      && res.tabBar.length === 0 && res.lens.moved && res.lens.anims.length === 0
      && res.lensControl.moved && res.lensControl.anims.length > 0;
  });

  // 13. Keyboard walk: every Tab stop is visible (the EditToggles Glas hides are never reached), and the frame's stops
  //     draw a 2-px ring in the focus colour (--g-focus). Forward from the top, backwards from the end (tab bar);
  //     on the phone also in edit mode ("Fertig" comes first) and on a room (Zurück).
  await block('focusWalk', async () => {
    const walk = async (device, p, key, n, edit = false) => {
      const { page, close } = await open(device, 'glas', p);
      if (edit) {
        await tap(page, '.g-avatar__btn');
        await tap(page, `.g-avatar-menu__item:has-text("${DE['glas.avatar.edit']}")`);
        // the menu hands the focus back to the avatar: start the walk from the top of the document again
        await ev(page, () => {
          const start = document.createElement('button');
          document.body.prepend(start);
          start.focus();
          start.remove();
        });
      }
      await settleAnimations(page);
      const stops = [];
      for (let i = 0; i < n; i++) {
        await page.keyboard.press(key);
        stops.push(await ev(page, () => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const probe = document.createElement('i');
          probe.style.color = 'var(--g-focus)';
          document.body.append(probe);
          const focus = getComputedStyle(probe).color;
          probe.remove();
          // the ring may sit on a child ("Fertig" draws it on its visible capsule)
          const ringEl = [el, ...el.querySelectorAll('*')].find((x) => {
            const cs = getComputedStyle(x);
            return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
          });
          return { el: __g.desc(el).slice(0, 60), visible: __g.visible(el),
            frame: !!el.closest('.app-sidebar, .app-header-cluster-wrapper, .app-tabs, .g-avatar, .g-back, .g-done'),
            ring: !!ringEl && getComputedStyle(ringEl).outlineColor === focus };
        }));
      }
      await close();
      return stops.filter(Boolean);
    };
    const res = {
      phoneHome: await walk('phone', '/', 'Tab', 16),
      phoneRoom: await walk('phone', '/room/living_room', 'Tab', 16),
      phoneEdit: await walk('phone', '/', 'Tab', 2, true),
      phoneEnd: await walk('phone', '/', 'Shift+Tab', 5),
      desktopHome: await walk('desktop', '/', 'Tab', 30),
      desktopRoom: await walk('desktop', '/room/living_room', 'Tab', 30),
    };
    const has = (stops, cls) => stops.some((s) => s.frame && s.el.includes(cls));
    const bad = Object.entries(res).flatMap(([k, stops]) => stops.filter((s) => !s.visible || (s.frame && !s.ring))
      .map((s) => `${k}: ${s.el}${s.visible ? '' : ' (hidden)'}${s.frame && !s.ring ? ' (no ring)' : ''}`));
    out.focusWalk = { bad, frameStops: Object.fromEntries(Object.entries(res).map(([k, stops]) => [k, stops.filter((s) => s.frame).map((s) => s.el)])) };
    out.focusWalkOk = bad.length === 0 && has(res.phoneHome, 'g-avatar__btn') && has(res.phoneRoom, 'g-back')
      && has(res.phoneRoom, 'g-avatar__btn') && res.phoneEdit.length > 0 && res.phoneEdit[0].el.includes('g-done')
      && res.phoneEnd.length === 5 && res.phoneEnd.every((s) => s.el.includes('app-tabs__item'))
      && ['sidebar-nav__item', 'app-sidebar__collapse', 'notifications-trigger', 'g-edit-capsule'].every((c) => has(res.desktopHome, c))
      && has(res.desktopRoom, 'g-head-back');
  });

  out.framePageErrors = pageErrors;
  return out.frameClassicOk && out.tabsMinOk && out.tabGeometryOk && out.tabsExpandOk && out.avatarMenuOk && out.notificationsOk
    && out.menusOk && out.frameRoutesOk && out.editEverywhereOk && out.opaqueOk && out.sidebarOk && out.reducedMotionFrameOk
    && out.focusWalkOk && pageErrors.length === 0;
}

async function checks() {
  const { srv, url } = await baseUrl(3);
  const pw = loadPlaywright();
  const browser = await pw[arg('engine', 'chromium')].launch();
  const part = arg('part', 'all');
  const out = {};
  let ok = true;
  if (part === 'all' || part === 'stage1') ok = (await stage1Checks(browser, url, out)) && ok;
  if (part === 'all' || part === 'frame') ok = (await frameChecks(browser, url, out)) && ok;
  if (part === 'all' || part === 'sheets') {
    ok = (await SHEETS.sheetsChecks(browser, url, out, { domOut: arg('dom-out', ''), only: list('only', '') })) && ok;
  }
  if (part === 'all' || part === 'gestures') ok = (await GESTURES.gesturesChecks(browser, url, out, { only: list('only', '') })) && ok;
  if (part === 'all' || part === 'home') ok = (await HOME.homeChecks(browser, url, out, { only: list('only', '') })) && ok;
  await browser.close();
  if (srv) srv.close();
  console.log(JSON.stringify({ ok, ...out }, null, 1));
  process.exit(ok ? 0 : 1);
}

const cmd = process.argv[2];
(cmd === 'shoot' ? shoot() : cmd === 'compare' ? compare() : cmd === 'checks' ? checks() : Promise.reject(new Error('usage: shoot | compare | checks (see header)')))
  .catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(2); });
