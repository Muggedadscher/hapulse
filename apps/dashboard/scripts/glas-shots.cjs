// [fork] glas-shots.cjs — screenshots and runtime checks for the style "Glas" (docs/glas/PLAN-ETAPPE-0-1.md).
//
//   node apps/dashboard/scripts/glas-shots.cjs shoot   <base-url | --serve <dist>> <out-dir> [options]
//   node apps/dashboard/scripts/glas-shots.cjs compare <dir-a> <dir-b> [<diff-dir>] [--expect <regex>]
//   node apps/dashboard/scripts/glas-shots.cjs checks  <base-url | --serve <dist>>
//
// shoot options: --style classic|glas  --strength clear|tinted|opaque  --reduce  --modes light,dark
//   --devices phone,ipad,desktop  --scenes home,room,…  --contrast  --forced-colors  --engine chromium|webkit
//   --suffix <text> (appended to every file name)
//   --elements <css> (also one picture per matching element, named after its first line of text, e.g.
//     "--scenes settings --elements .settings-page__section" → …-settings__2-darstellung.png)
// compare --expect <regex>: files whose name matches may differ (listed, but not an error).
//
// HA demo mode as in click-fuzz-test.cjs. Deterministic on purpose, so that two runs of the same build give the same
// pixels: fixed clock (Playwright `clock`, paused right after it is installed; timers only move with `run`, at most
// BUDGET ms per document, so the demo ticker's first step after 2 s never fires), seeded Math.random, only local
// requests, animations finished and scrolling settled, pointer parked at 0,0. `compare` then demands 0 differing
// pixels.
// Playwright: the global install ($(npm root -g)/playwright) or HP_PW=<folder that contains node_modules/playwright>.
// Never run `playwright install` for this — the browsers are provided by the environment.
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
  ipad: { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
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
};
const DEFAULT_SCENES = Object.keys(SCENES).filter((s) => s !== 'material');

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
  return ctx;
}

/** Fake time spent per document (the demo ticker must never fire). */
const spent = new WeakMap();
async function run(page, ms) {
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

/** Load a path with the clock paused, let it settle deterministically. */
async function openPage(ctx, url, extraRun = 0) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('exc: ' + String(e.message).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
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
        const ctx = await newContext(browser, device, { demo: sc.demo !== false, mode, style, strength, reduce, contrast, forcedColors });
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
        if (sc.material) { await page.evaluate(MATERIAL_PROBE); await page.waitForTimeout(100); }
        const name = [style, mode, device, scene].join('-') + (style === 'glas' && strength !== 'clear' ? '-' + strength : '')
          + (reduce ? '-reduce' : '') + (contrast ? '-contrast' : '') + (forcedColors ? '-forced' : '') + (suffix ? '-' + suffix : '');
        if (note) { report.push({ name, skipped: note }); await ctx.close(); continue; }
        await settleAnimations(page);
        await page.mouse.move(0, 0);
        await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true, animations: 'disabled', caret: 'hide' });
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
async function checks() {
  const { srv, url } = await baseUrl(3);
  const pw = loadPlaywright();
  const browser = await pw[arg('engine', 'chromium')].launch();
  const cmp = await browser.newPage();
  const out = {};
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
  const shot = async (page) => { await page.mouse.move(0, 0); return page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' }); };

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
        const r = await page.evaluate((sels) => Object.fromEntries(Object.entries(sels).map(([k, s]) =>
          [k, [...document.querySelectorAll(s)].map((el) => getComputedStyle(el).backgroundColor)])), KNOBS);
        for (const [k, colors] of Object.entries(r)) {
          found[k] = (found[k] || 0) + colors.length;
          colors.filter((c) => c !== 'rgb(255, 255, 255)').forEach((c) => bad.push({ mode, page: p, knob: k, color: c }));
        }
        await page.close();
      }
      await ctx.close();
    }
    out.knobs = { found, bad };
    // the demo shows these kinds switched on; the others (legacy, device rows in a dialog) are checked where they appear
    out.knobsOk = bad.length === 0 && ['pill', 'autoRow', 'pool', 'deviceCard', 'admin'].every((k) => found[k] > 0);
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

  await browser.close();
  if (srv) srv.close();
  const ok = out.prePaintOk && out.noWebfontsOk && out.switchBackOk && out.accentSliderOk && out.autoModeOk && out.reducedMotionOk
    && out.knobsOk && out.cardBordersOk;
  console.log(JSON.stringify({ ok, ...out }, null, 1));
  process.exit(ok ? 0 : 1);
}

const cmd = process.argv[2];
(cmd === 'shoot' ? shoot() : cmd === 'compare' ? compare() : cmd === 'checks' ? checks() : Promise.reject(new Error('usage: shoot | compare | checks (see header)')))
  .catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(2); });
