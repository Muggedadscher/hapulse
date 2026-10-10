// [fork] glas-checks-sheets.cjs — the windows of Glas stage 3 for glas-shots.cjs (docs/glas/PLAN-ETAPPE-3.md §6.0,
// §6.2): scenes that open each window (`shoot --scenes win-…`) and `checks --part sheets`. glas-shots.cjs loads this
// file with its helpers; it is not run on its own.
//
// The checks run in real time (no Playwright clock): the windows move with the Web Animations API, follow their content
// with a ResizeObserver and give the focus back in microtasks, none of which a paused clock would hold. Drags go
// through CDP touch events (Chromium only; WebKit belongs to the lab).

/* global __g, __s -- helpers in the page (glas-shots.cjs pageHelpers, sheetHelpers below) */

module.exports = function sheets(h) {
  const { DE, DEVICES, ABORTED, tap, run, settleAnimations, isGlas, seedScript, pageHelpers } = h;

  // ---- scenes (§6.0): one window each; a window a style or width does not have is skipped with a note ----

  /** Tap a trigger on the page after bringing it to the middle of the screen. Playwright's own click retried while the
   *  cards still moved in ("element is not stable") and then scrolled with a different alignment each time, so the page
   *  behind a window stood at one of several positions from run to run — on main as on the branch. */
  const reach = async (page, s) => {
    const el = page.locator(s).filter({ visible: true }).first();
    if (await el.count()) {
      await settleAnimations(page);
      const moved = await el.evaluate((e) => {
        if (e.closest('.modal-backdrop, [role="dialog"]')) return false;
        const y = scrollY;
        e.scrollIntoView({ block: 'center', behavior: 'instant' });
        return scrollY !== y;
      });
      // the Glas runtime reads the scroll position in requestAnimationFrame (paused clock in shoot: `run`)
      if (moved) await run(page, 100);
      await settleAnimations(page);
    }
    return tap(page, s);
  };
  const chip = (name) => (page) => reach(page, `.summary-chip[aria-label^="${name}:"]`);
  const sel = (s) => (page) => reach(page, s);
  const seq = (...steps) => async (page) => {
    for (const step of steps) {
      const note = await step(page);
      if (note) return note;
    }
    return '';
  };
  const glasOnly = (step) => async (page) => ((await isGlas(page)) ? step(page) : 'Glas only');
  /** "Manuell" in the pool window: the classic button, in Glas the option of the mode segment (plan Etappe 5 K92). */
  const POOL_MANUAL = '.modal-body .pool-modal__mode-btn--manual, .modal-body .g-seg--pool .g-seg__opt[data-value="Manuell"]';
  const NVR = { customization: { scryptedUrl: 'https://192.0.2.10/endpoint/@local/sentinel-nvr/public/', scryptedToken: 'demo' } };

  const scenes = {
    'win-people': { act: chip('people') },
    'win-lights': { act: chip('lights') },
    'win-doors': { act: chip('doors') },
    'win-garage': { act: chip('garage') },
    'win-locks': { act: chip('locks') },
    'win-alarm': { act: chip('alarm') },
    'win-pool': { act: chip('pool') },
    'win-media': { act: chip('media') },
    'win-weather': { act: sel('.g-weather-line, .header-cluster__weather--btn') },
    'win-climate': { act: sel('.climate-card__link') },
    'win-blinds': { customization: { hiddenSections: [] }, act: sel('.blinds-card__link') },
    'win-waste': { act: sel('.waste-hero, .g-waste__row') }, // Glas: the first row of its list (stage 4)
    'win-detail': { path: '/room/living_room', act: (page, tile = '.sensor-tile') => reach(page, tile) },
    'win-manual': { act: seq(chip('pool'), sel(POOL_MANUAL)) },
    'win-schedule': { path: '/pool', act: sel(`.pool-card .btn:has-text("${DE['pool.schedule.edit']}")`) },
    'win-whatsnew': { path: '/settings', act: sel('.about-card__link--button') },
    'win-device': { path: '/devices', act: sel('.device-card') },
    'win-unlock': { act: seq(chip('locks'), sel('.modal-body .locks-row__btn--unlock')) },
    'win-unlock-security': { path: '/security', act: sel('.locks-row__btn--unlock') },
    'win-garage-open': { act: seq(chip('garage'), sel('.modal-body .garage-row__btn--open')) },
    'win-entities': { path: '/settings', act: sel(`button:has-text("${DE['settings.admin.editEntitiesBtn']}")`) },
    'win-nvr-setup': { path: '/nvr', ...NVR, act: sel(`.nvr-actions [aria-label="${DE['nvr.setup.modalTitle']}"]`) },
    'win-nvr-rooms': { path: '/nvr', ...NVR, act: sel(`.nvr-actions [aria-label="${DE['cameraSource.rooms.title']}"]`) },
    'win-keypad': { act: seq(chip('alarm'), sel('.modal-body .alarm-btn--away')) },
    'win-keypad-security': { path: '/security', act: sel('.alarm-btn--away') },
    'win-pool-restart': { path: '/pool', act: glasOnly(sel('.pool-admin__restart')) },
  };
  for (const sc of Object.values(scenes)) {
    sc.path = sc.path || '/';
    sc.viewport = true;
  }
  /** Windows a style or width does not have. Any other skip fails the window checks: a trigger that an upstream merge
   *  renamed would otherwise pass without its window ever opening. */
  const SKIPS = {
    classic: ['phone win-weather', 'phone win-pool-restart', 'desktop win-pool-restart'],
    glas: [],
  };
  const skipped = (windows, style) => {
    const list = Object.entries(windows).filter(([, v]) => v.skipped);
    return { all: list.map(([n]) => n), unexpected: list.filter(([n]) => !SKIPS[style].includes(n)).map(([n, v]) => `${n}: ${v.skipped}`) };
  };

  // ---- checks --part sheets ----

  async function sheetsChecks(browser, url, out, opts = {}) {
    const pageErrors = [];
    const ran = [];
    const block = async (name, fn) => {
      if (opts.only && opts.only.length && !opts.only.includes(name)) return;
      ran.push(name);
      try {
        await fn();
      } catch (e) {
        out[name + 'Error'] = String(e && e.message).split('\n')[0].slice(0, 300);
        out[name + 'Ok'] = false;
      }
    };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const ev = (page, fn, a) => page.evaluate(fn, a);
    const until = (page, fn, a, timeout = 4000) => page.waitForFunction(fn, a, { timeout }).then(() => true, () => false);

    /** A real-time document (see header). `device`: a name from DEVICES or a context option object. */
    const open = async (device, style, p = '/', extra = {}) => {
      const dev = typeof device === 'string' ? DEVICES[device] : device;
      const ctx = await browser.newContext({
        ...dev, locale: 'de-DE', timezoneId: 'Europe/Berlin', colorScheme: 'light',
        reducedMotion: extra.reduce ? 'reduce' : 'no-preference',
      });
      await ctx.route((u) => !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(u.href), (r) => r.abort());
      await ctx.addInitScript(seedScript({ demo: true, mode: 'light', style, strength: extra.strength || 'clear',
        customization: extra.customization }));
      // after the seed: some fork releases unseen, so "What's new" opens by itself (an effect, no gesture)
      if (extra.unseen) {
        await ctx.addInitScript(() => {
          try {
            const s = JSON.parse(localStorage.getItem('hapulse:settings'));
            s.state.lastSeenFork = 30;
            localStorage.setItem('hapulse:settings', JSON.stringify(s));
          } catch { /* storage blocked */ }
        });
      }
      await ctx.addInitScript(pageHelpers);
      await ctx.addInitScript(sheetHelpers);
      // A "ResizeObserver loop" is an error event, not an exception: an observer's reaction resized what it observes in
      // the same frame. It counts as a page error.
      await ctx.addInitScript(() => {
        window.__roLoops = 0;
        addEventListener('error', (e) => { if (/ResizeObserver loop/.test(e.message)) window.__roLoops += 1; });
        // Callbacks of observers that watch a window's parts: the sheet pauses what its own reaction resized (U11), so a
        // reaction that never settles would not raise a loop error but call back every frame (block 5b counts them).
        window.__roWindow = 0;
        const Base = window.ResizeObserver;
        window.ResizeObserver = class extends Base {
          constructor(cb) {
            const self = { window: false };
            super((entries, ro) => {
              if (self.window) window.__roWindow += 1;
              cb(entries, ro);
            });
            this.__self = self;
          }
          observe(target, options) {
            if (target.closest && target.closest('.modal-backdrop')) this.__self.window = true;
            return super.observe(target, options);
          }
        };
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push('exc: ' + String(e.message).slice(0, 200)));
      page.on('console', (m) => { if (m.type() === 'error' && !ABORTED.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });
      await page.goto(url + p, { waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelector('#root > *'), null, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      await sleep(600);
      const close = async () => {
        const loops = await page.evaluate(() => window.__roLoops).catch(() => 0);
        if (loops) errors.push(`ResizeObserver loop ×${loops}`);
        if (errors.length) pageErrors.push({ device: typeof device === 'string' ? device : 'custom', style, path: p, errors: errors.slice(0, 3) });
        await ctx.close();
      };
      return { ctx, page, close };
    };
    /** Open a window by its scene; wait until it rests. */
    const openWin = async (page, name) => {
      const note = await scenes[name].act(page);
      if (note) throw new Error(`${name}: ${note}`);
      await until(page, () => !!__s.panel());
      await settleAnimations(page);
      return ev(page, () => __s.state());
    };
    const touchDrag = async (page, x, y, dy, ms, steps = 12) => {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= steps; i++) {
        await sleep(ms / steps);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (dy * i) / steps }] });
      }
      await sleep(30);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
      await sleep(80);
      await settleAnimations(page);
    };
    /** Click the middle of the element `fn` finds in the page (a real pointer: the runtime notes origins on press). */
    const press = async (page, fn, a) => {
      const b = await ev(page, (args) => {
        const el = new Function('a', `return (${args.fn})(a)`)(args.a);
        return el ? __g.r(el) : null;
      }, { fn: fn.toString(), a });
      if (!b) throw new Error('nothing to press: ' + fn.toString().slice(0, 80));
      await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
    };
    /** After a close: the ghost while it runs, then the rest once it is gone. Waits for the windows to go first — a
     *  route change takes a moment on the Vite dev server (the next page is loaded on demand). */
    const leave = async (page, trigger) => {
      await until(page, () => !__s.panels().length, null, 6000);
      const ghost = await ev(page, () => __s.ghost());
      await until(page, () => !document.querySelector('.g-sheet-ghost'), null, 3000);
      await sleep(60);
      return { ghost, after: await ev(page, (q) => __s.rest(q), trigger) };
    };
    /** Where to grab a sheet: the middle of its header, below the grabber. */
    const grip = (page) => ev(page, () => {
      const head = __s.panel().querySelector('.g-sheet-header__titles');
      const b = head.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    });

    // 1. Klassisch: every window as on main — no g-* element, no data-g-* attribute, no inline variable of the
    //    runtime; the scroll lock comes back. The DOM goes to --dom-out for a comparison with main's build.
    await block('sheetsClassic', async () => {
      const res = { windows: {}, dom: {} };
      for (const device of ['phone', 'desktop']) {
        for (const [name, sc] of Object.entries(scenes)) {
          const w = await open(device, 'classic', sc.path, sc);
          const note = await sc.act(w.page);
          if (note) {
            res.windows[`${device} ${name}`] = { skipped: note };
            await w.close();
            continue;
          }
          await settleAnimations(w.page);
          const r = await ev(w.page, () => ({ dialogs: document.querySelectorAll('[role="dialog"]').length, remnants: __g.remnants().count,
            overflow: document.body.style.overflow, dom: __s.classicDom() }));
          res.dom[`${device} ${name}`] = r.dom;
          await w.page.keyboard.press('Escape');
          await sleep(150);
          const after = await ev(w.page, () => ({ dialogs: document.querySelectorAll('[role="dialog"]').length, overflow: document.body.style.overflow }));
          res.windows[`${device} ${name}`] = { dialogs: r.dialogs, remnants: r.remnants, after };
          await w.close();
        }
      }
      if (opts.domOut) require('fs').writeFileSync(opts.domOut, JSON.stringify(res.dom, null, 1));
      out.sheetsClassic = res.windows;
      // the keypad has no Escape in Klassisch (K56), the pool restart is Glas only
      const bad = Object.entries(res.windows).filter(([n, v]) => !v.skipped && (v.dialogs < 1 && !/keypad/.test(n) || v.remnants > 0
        || (!/keypad/.test(n) && (v.after.dialogs > 0 || v.after.overflow !== ''))));
      const skips = skipped(res.windows, 'classic');
      out.sheetsClassicBad = bad.map(([n]) => n).concat(skips.unexpected);
      out.sheetsClassicSkipped = skips.all;
      out.sheetsClassicOk = out.sheetsClassicBad.length === 0;
    });

    // 2. The three side findings of Klassisch (K63) as a measurement: (a) Escape closes nested windows all at once,
    //    (b) both windows leave in a deleted subtree and the scroll lock stays, (c) the lock code field loses the focus
    //    (null: the demo lock has no code). A report, no failure: Klassisch stays as it is without Jannick's OK.
    await block('sheetsK63', async () => {
      const res = {};
      const a = await open('phone', 'classic', '/');
      await scenes['win-unlock'].act(a.page);
      res.nestedBefore = await ev(a.page, () => document.querySelectorAll('[role="dialog"]').length);
      res.focusInCode = await ev(a.page, () => (document.querySelector('.lock-confirm__code')
        ? document.activeElement === document.querySelector('.lock-confirm__code') : null));
      await a.page.keyboard.press('Escape');
      await sleep(150);
      res.nestedAfterOneEscape = await ev(a.page, () => document.querySelectorAll('[role="dialog"]').length);
      await a.close();
      const b = await open('phone', 'classic', '/');
      await scenes['win-unlock'].act(b.page);
      await ev(b.page, () => { history.pushState({}, '', '/pool'); dispatchEvent(new PopStateEvent('popstate')); });
      await sleep(400);
      res.subtreeLeft = await ev(b.page, () => ({ dialogs: document.querySelectorAll('[role="dialog"]').length, overflow: document.body.style.overflow }));
      await b.close();
      out.sheetsK63 = { a: res.nestedBefore === 2 && res.nestedAfterOneEscape === 0, b: res.subtreeLeft.overflow === 'hidden',
        c: res.focusInCode === null ? null : !res.focusInCode, raw: res };
      out.sheetsK63Ok = true;
    });

    // 3. Geometry (K50, K52, K53): medium, large, landscape phone (only large), iPad upright, desktop dialogs.
    await block('sheetsGeometry', async () => {
      const res = {};
      const phone = await open('phone', 'glas', '/');
      res.medium = await openWin(phone.page, 'win-people');
      res.mediumHead = await ev(phone.page, () => __s.head());
      res.panelStyle = await ev(phone.page, () => {
        const p = __s.panel();
        const anim = getComputedStyle(p).animationName;
        const before = p.style.translate;
        p.style.translate = '0 10px';
        const arrived = getComputedStyle(p).translate === '0px 10px';
        p.style.translate = before;
        return { anim, arrived };
      });
      await phone.close();
      const big = await open('phone', 'glas', '/');
      res.large = await openWin(big.page, 'win-lights');
      await big.close();
      const land = await open({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'glas', '/');
      res.landscape = await openWin(land.page, 'win-people');
      await land.close();
      const ipad = await open('ipadUpright', 'glas', '/');
      res.ipad = await openWin(ipad.page, 'win-people');
      await ipad.close();
      const widths = { 'win-people': 440, 'win-weather': 500, 'win-lights': 480, 'win-doors': 460, 'win-garage': 560, 'win-locks': 560,
        'win-alarm': 460, 'win-pool': 480, 'win-media': 500, 'win-climate': 760, 'win-blinds': 780, 'win-waste': 440 };
      res.desktop = {};
      for (const [name, want] of Object.entries(widths)) {
        const d = await open('desktop', 'glas', scenes[name].path, scenes[name]);
        const s = await openWin(d.page, name);
        res.desktop[name] = { w: s.rect.w, want, radius: s.radius, pres: s.pres, centred: Math.abs(s.rect.x + s.rect.w / 2 - 720) <= 1 };
        await d.close();
      }
      out.sheetsGeometry = res;
      const m = res.medium;
      const l = res.large;
      out.sheetsGeometryOk = m.pres === 'sheet' && m.sheet === 'medium' && near(m.rect.x, 8) && near(m.rect.right, 382)
        && near(m.rect.bottom, 836) && m.rect.h <= 700 && m.radius === '40px' && m.glass && m.grabber.w === 120 && m.grabber.h === 30
        && near(m.grabber.barW, 36) && near(m.grabber.barH, 5) && !m.grabber.hidden
        && res.mediumHead.closeW >= 44 && res.mediumHead.closeH >= 44 && res.mediumHead.titleOff <= 1
        && res.panelStyle.anim === 'none' && res.panelStyle.arrived
        && l.sheet === 'large' && near(l.rect.y, 52) && near(l.rect.x, 0) && near(l.rect.w, 390) && l.mat === 'solid' && !l.glass
        && l.radius === '40px 40px 0px 0px'
        && res.landscape.sheet === 'large' && res.landscape.grabber.hidden && res.landscape.grabber.tabIndex === -1
        && near(res.ipad.rect.w, 560) && near(res.ipad.rect.x, 130)
        && Object.values(res.desktop).every((d) => d.pres === 'dialog' && near(d.w, d.want) && d.radius === '34px' && d.centred);
    });

    // 4. Dragging with the finger (K51): close, spring back, grow, shrink, close large, fling, grabber tap, never close
    //    the keypad.
    await block('sheetsDrag', async () => {
      const res = {};
      const run = async (name, fn) => {
        const w = await open('phone', 'glas', scenes[name].path, scenes[name]);
        const before = await openWin(w.page, name);
        res[fn.name] = { before: before.sheet, ...(await fn(w.page, before)) };
        await w.close();
      };
      const state = (page) => ev(page, () => (__s.panel() ? __s.state() : null));
      await run('win-people', async function mediumCloses(page, s) {
        const g = await grip(page);
        await touchDrag(page, g.x, g.y, s.rect.h * 0.3, 450);
        return { open: !!(await state(page)) };
      });
      await run('win-people', async function mediumStays(page, s) {
        const g = await grip(page);
        await touchDrag(page, g.x, g.y, s.rect.h * 0.1, 450);
        const after = await state(page);
        return { open: !!after, sheet: after && after.sheet, y: after && after.rect.y, y0: s.rect.y };
      });
      await run('win-people', async function mediumGrows(page) {
        const g = await grip(page);
        await touchDrag(page, g.x, g.y, -60, 450);
        const after = await state(page);
        return { sheet: after && after.sheet, top: after && after.rect.y };
      });
      await run('win-lights', async function largeShrinks(page) {
        const g = await grip(page);
        await touchDrag(page, g.x, g.y, 100, 450);
        const after = await state(page);
        return { sheet: after && after.sheet };
      });
      await run('win-lights', async function largeCloses(page, s) {
        const g = await grip(page);
        await touchDrag(page, g.x, g.y, s.rect.h * 0.5, 600);
        return { open: !!(await state(page)) };
      });
      await run('win-people', async function fling(page) {
        const g = await grip(page);
        await touchDrag(page, g.x, g.y, 70, 60, 4);
        return { open: !!(await state(page)) };
      });
      await run('win-people', async function grabberTap(page) {
        await page.locator('.g-sheet-grabber').click();
        await sleep(100);
        await settleAnimations(page);
        const grown = await state(page);
        await page.locator('.g-sheet-grabber').click();
        await sleep(100);
        await settleAnimations(page);
        const back = await state(page);
        return { grown: grown.sheet, back: back.sheet };
      });
      // a mouse drag ends with the pointer captured by the panel, so its click never reaches the grabber: the grabber
      // still answers a key afterwards (review finding 6; a click of the drag itself is swallowed for 500 ms)
      await run('win-people', async function keyAfterMouseDrag(page) {
        const g = await grip(page);
        await page.mouse.move(g.x, g.y);
        await page.mouse.down();
        for (let i = 1; i <= 6; i++) await page.mouse.move(g.x, g.y - 6 * i);
        await page.mouse.up();
        await sleep(100);
        await settleAnimations(page);
        const dragged = await state(page);
        await sleep(600);
        await ev(page, () => __s.panel().querySelector('.g-sheet-grabber').focus());
        await page.keyboard.press('Enter');
        await sleep(100);
        await settleAnimations(page);
        const keyed = await state(page);
        return { dragged: dragged && dragged.sheet, keyed: keyed && keyed.sheet };
      });
      await run('win-keypad-security', async function keypadStays(page, s) {
        const g = await grip(page);
        await touchDrag(page, g.x, g.y, s.rect.h * 0.6, 500);
        const after = await state(page);
        return { open: !!after, y: after && after.rect.y, y0: s.rect.y };
      });
      out.sheetsDrag = res;
      out.sheetsDragOk = res.mediumCloses.before === 'medium' && !res.mediumCloses.open
        && res.mediumStays.open && res.mediumStays.sheet === 'medium' && near(res.mediumStays.y, res.mediumStays.y0)
        && res.mediumGrows.sheet === 'large' && near(res.mediumGrows.top, 52)
        && res.largeShrinks.before === 'large' && res.largeShrinks.sheet === 'medium'
        && !res.largeCloses.open && !res.fling.open
        && res.grabberTap.grown === 'large' && res.grabberTap.back === 'medium'
        && !!res.keyAfterMouseDrag.dragged && !!res.keyAfterMouseDrag.keyed && res.keyAfterMouseDrag.keyed !== res.keyAfterMouseDrag.dragged
        && res.keypadStays.open && near(res.keypadStays.y, res.keypadStays.y0);
    });

    // 5. Growing out of the chip and back (K47, K69): the rectangle moves from the chip to the end position; closing
    //    leaves a ghost without a role that runs back and disappears; afterwards nothing is left, the focus is back on
    //    the chip — for ×, Escape and a tap beside the sheet.
    await block('sheetsMorph', async () => {
      const res = {};
      const w = await open('phone', 'glas', '/');
      const chipSel = '.summary-chip[aria-label^="lights:"]';
      const chipRect = await ev(w.page, (q) => __g.r([...document.querySelectorAll(q)].find((e) => __g.visible(e))), chipSel);
      await w.page.locator(chipSel).filter({ visible: true }).first().click();
      const t0 = Date.now();
      res.frames = [];
      for (const t of [0, 80, 160, 320]) {
        await sleep(Math.max(0, t - (Date.now() - t0)));
        res.frames.push(await ev(w.page, () => (__s.panel() ? __s.state().rect : null)));
      }
      await settleAnimations(w.page);
      res.end = (await ev(w.page, () => __s.state())).rect;
      res.chip = chipRect;
      for (const how of ['close', 'escape', 'beside']) {
        if (how !== 'close') {
          await w.page.locator(chipSel).filter({ visible: true }).first().click();
          await until(w.page, () => !!__s.panel());
          await settleAnimations(w.page);
        }
        if (how === 'close') await w.page.locator('.g-sheet-header__close').click();
        else if (how === 'escape') await w.page.keyboard.press('Escape');
        else await w.page.mouse.click(195, 30);
        await sleep(60);
        const ghost = await ev(w.page, () => __s.ghost());
        await until(w.page, () => !document.querySelector('.g-sheet-ghost'), null, 3000);
        await sleep(60);
        res[how] = { ghost, after: await ev(w.page, (q) => __s.rest(q), chipSel) };
      }
      await w.close();
      out.sheetsMorph = res;
      const f = res.frames;
      const grows = f[0] && f[3] && f[0].w < res.end.w * 0.6 && f[1].w > f[0].w && f[3].w >= f[1].w && near(res.end.y, 52);
      const startsAtChip = f[0] && Math.abs(f[0].x - res.chip.x) < 40 && Math.abs(f[0].y - res.chip.y) < 60;
      out.sheetsMorphOk = !!grows && !!startsAtChip
        && ['close', 'escape', 'beside'].every((k) => res[k].ghost.count === 1 && !res[k].ghost.role && res[k].after.clean
          && res[k].after.focusOnChip);
    });

    // 5b. Windows whose content changes while they open (K50): the entities list (a loader first) and a detail (its
    //     history loads after the first render). The movement starts at the trigger and comes to rest; how high the
    //     window ends up is reported (during the opening the detent may still follow the content, K50). At rest the
    //     window's ResizeObserver stays quiet (U11).
    await block('sheetsGrow', async () => {
      const res = {};
      const cases = [['entities', 'win-entities', `button:has-text("${DE['settings.admin.editEntitiesBtn']}")`],
        ['detail', 'win-detail', '.sensor-tile']];
      for (const [key, name, trigger] of cases) {
        const sc = scenes[name];
        const w = await open('phone', 'glas', sc.path, sc);
        const el = w.page.locator(trigger).filter({ visible: true }).first();
        await el.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await settleAnimations(w.page);
        const from = await el.evaluate((e) => __g.r(e));
        await w.page.mouse.click(from.x + from.w / 2, from.y + from.h / 2);
        const t0 = Date.now();
        const frames = [];
        for (const t of [0, 80, 160, 320]) {
          await sleep(Math.max(0, t - (Date.now() - t0)));
          frames.push(await ev(w.page, () => (__s.panel() ? { ...__s.state().rect, sheet: __s.state().sheet } : null)));
        }
        await settleAnimations(w.page, 6000);
        await sleep(300);
        const end = await ev(w.page, () => ({ ...__s.state().rect, sheet: __s.state().sheet, moving: __s.motion().length }));
        // at rest the window's observer stays quiet (a demo tick may change the content once); while it opened it ran
        const opening = await ev(w.page, () => window.__roWindow);
        await sleep(600);
        const idle = (await ev(w.page, () => window.__roWindow)) - opening;
        res[key] = { from, frames, end, observer: { opening, idle } };
        await w.close();
      }
      out.sheetsGrow = res;
      out.sheetsGrowOk = Object.values(res).every((r) => r.frames[0] && Math.abs(r.frames[0].x - r.from.x) < 40
        && Math.abs(r.frames[0].y - r.from.y) < 60 && Math.abs(r.frames[0].w - r.from.w) < 80
        && r.frames.slice(1).every((f) => f && (f.y !== r.frames[0].y || f.w !== r.frames[0].w)) && r.end.moving === 0
        && r.observer.opening > 0 && r.observer.idle <= 2);
    });

    // 6. Pages in a window (K48): locks → "Entriegeln" is a page on the sheet's rectangle, solid, the sheet below pushed
    //    aside and inert; Escape closes only the page and the focus goes back to "Entriegeln"; a second Escape closes the
    //    sheet, the scroll lock goes with it.
    await block('sheetsStack', async () => {
      const res = {};
      const w = await open('phone', 'glas', '/');
      const parent = await openWin(w.page, 'win-locks');
      await tap(w.page, '.modal-body .locks-row__btn--unlock');
      await settleAnimations(w.page);
      res.page = await ev(w.page, () => __s.stack());
      res.parent = parent.rect;
      await w.page.keyboard.press('Escape');
      await sleep(80);
      await settleAnimations(w.page);
      res.afterEscape = await ev(w.page, () => ({ ...__s.stack(), focus: __g.desc(document.activeElement) }));
      await w.page.keyboard.press('Escape');
      await sleep(80);
      await settleAnimations(w.page);
      res.afterSecond = await ev(w.page, () => __s.rest(null));
      await w.close();
      // the keypad is a page in the alarm sheet (K56)
      const k = await open('phone', 'glas', '/');
      await openWin(k.page, 'win-keypad');
      res.keypad = await ev(k.page, () => __s.stack());
      await k.close();
      // a confirmation from the card in a detail is a page in the detail: hallway → the lock's card → its button
      const d = await open('phone', 'glas', '/room/hallway');
      const note = await scenes['win-detail'].act(d.page, '.lock-card__name');
      if (note) throw new Error('lock detail: ' + note);
      await until(d.page, () => !!__s.panel());
      await settleAnimations(d.page);
      res.detailBefore = await ev(d.page, () => __s.stack());
      await tap(d.page, '.modal-body .lock-card__btn');
      await settleAnimations(d.page);
      res.detailPage = await ev(d.page, () => ({ ...__s.stack(), code: !!__s.panel().querySelector('.lock-confirm__code, .modal-footer') }));
      await d.close();
      out.sheetsStack = res;
      const p = res.page;
      const isPage = (st) => st.windows === 2 && st.top.pres === 'page' && st.top.mat === 'solid' && st.top.back && st.below.inert;
      out.sheetsStackOk = isPage(p) && near(p.top.rect.x, res.parent.x) && near(p.top.rect.w, res.parent.w) && p.below.pushed
        && res.afterEscape.windows === 1 && /locks-row__btn--unlock/.test(res.afterEscape.focus) && !res.afterEscape.below.inert
        && res.afterSecond.clean && isPage(res.keypad) && res.detailBefore.windows === 1 && isPage(res.detailPage);
    });

    // 7. Hand-over (K49): pool → "Manuell" — one window on screen, the duration picker.
    await block('sheetsHandoff', async () => {
      const w = await open('phone', 'glas', '/');
      await openWin(w.page, 'win-pool');
      await tap(w.page, POOL_MANUAL);
      await sleep(100);
      const mid = await ev(w.page, () => ({ panels: __s.panels().length, ghosts: document.querySelectorAll('.g-sheet-ghost').length }));
      await settleAnimations(w.page);
      const end = await ev(w.page, () => ({ panels: __s.panels().length, ghosts: document.querySelectorAll('.g-sheet-ghost').length,
        manual: !!(__s.panel() && __s.panel().querySelector('.pool-manual, .pool-duration')) }));
      await w.close();
      out.sheetsHandoff = { mid, end };
      out.sheetsHandoffOk = mid.panels === 1 && end.panels === 1 && end.ghosts === 0 && end.manual;
    });

    // 8. The tab bar steps back while a window is open and returns afterwards; no glass in a window's content; the
    //    opaque strength blurs nothing.
    await block('sheetsTabsGlass', async () => {
      const res = {};
      const w = await open('phone', 'glas', '/');
      await openWin(w.page, 'win-media');
      res.tabsOpen = await ev(w.page, () => __s.tabs());
      res.glass = await ev(w.page, () => __g.glass().filter((g) => g.inGlass || g.roots.length));
      await w.page.keyboard.press('Escape');
      await sleep(80);
      await settleAnimations(w.page);
      res.tabsAfter = await ev(w.page, () => __s.tabs());
      await w.close();
      const o = await open('phone', 'glas', '/', { strength: 'opaque' });
      await openWin(o.page, 'win-people');
      res.opaqueBlur = await ev(o.page, () => __g.anyBlur());
      await o.close();
      out.sheetsTabsGlass = res;
      out.sheetsTabsGlassOk = !res.tabsOpen.reachable && res.tabsAfter.reachable && res.glass.length === 0 && res.opaqueBlur.length === 0;
    });

    // 9. Notifications on the phone (K57): times, ×, "Dismiss all" keeps the sheet open on the empty state, the focus
    //    goes back to the avatar.
    await block('sheetsNotifications', async () => {
      const w = await open('phone', 'glas', '/');
      await tap(w.page, '.g-avatar__btn');
      await tap(w.page, `.g-avatar-menu__item:has-text("${DE['glas.avatar.notifications']}")`);
      await settleAnimations(w.page);
      const first = await ev(w.page, () => __s.notes());
      await w.page.locator('.g-notes__dismiss').first().click();
      await sleep(150);
      const one = await ev(w.page, () => __s.notes());
      await w.page.locator('.g-notes__all').click();
      await sleep(150);
      await settleAnimations(w.page);
      const none = await ev(w.page, () => __s.notes());
      await w.page.keyboard.press('Escape');
      await sleep(80);
      await settleAnimations(w.page);
      const back = await ev(w.page, () => ({ ...__s.rest(null), onAvatar: document.activeElement === document.querySelector('.g-avatar__btn') }));
      await w.close();
      out.sheetsNotifications = { first, one, none, back };
      out.sheetsNotificationsOk = first.rows === 3 && first.times === 3 && /3/.test(first.subtitle) && one.rows === 2
        && none.open && none.rows === 0 && none.empty && none.height < first.height && back.clean && back.onAvatar;
    });

    // 10. Text fields in windows at 16 px at least (K54; the demo lock has no code field); reduced motion: only opacity,
    //     at most 200 ms (K65).
    await block('sheetsFieldsMotion', async () => {
      const res = { fields: {} };
      for (const name of ['win-weather', 'win-entities', 'win-nvr-setup', 'win-nvr-rooms']) {
        const sc = scenes[name];
        const w = await open('phone', 'glas', sc.path, sc);
        await openWin(w.page, name);
        // the demo Sentinel has no cameras, so the rooms window shows no select: one row as NvrCameraRoomsModal renders it
        if (name === 'win-nvr-rooms') {
          await ev(w.page, () => __s.panel().querySelector('.modal-body').insertAdjacentHTML('beforeend', '<div class="nvr-camrooms">'
            + '<label class="nvr-camrooms__row"><span class="nvr-camrooms__name">Demo</span><span class="nvr-select">'
            + '<select class="nvr-select__native"><option value="">–</option></select></span></label></div>'));
        }
        res.fields[name] = await ev(w.page, () => [...document.querySelectorAll('.modal-panel input:not([type=checkbox]):not([type=range]), .modal-panel select, .modal-panel textarea')]
          .filter((e) => __g.visible(e)).map((e) => parseFloat(getComputedStyle(e).fontSize)));
        await w.close();
      }
      const r = await open('phone', 'glas', '/', { reduce: true });
      await r.page.locator('.summary-chip[aria-label^="people:"]').filter({ visible: true }).first().click();
      await sleep(30);
      res.reduced = await ev(r.page, () => __s.motion());
      await r.close();
      out.sheetsFieldsMotion = res;
      const fields = Object.values(res.fields);
      out.sheetsFieldsMotionOk = fields.every((list) => list.length > 0 && list.every((px) => px >= 16))
        && res.reduced.length > 0 && res.reduced.every((a) => a.ms <= 200 && a.props.every((p) => p === 'opacity'));
    });

    // 11. A window that stays: switching the style with a window open (Glas → Klassisch → Glas) — no ghost, no
    //     opening movement, the scroll lock right and free afterwards. Closed after a switch either way, the window
    //     gives the focus back to its trigger (review finding 5).
    await block('sheetsStyleSwitch', async () => {
      const w = await open('phone', 'glas', '/settings');
      await openWin(w.page, 'win-entities');
      const click = (id) => ev(w.page, (q) => document.querySelector(`[data-glas-style-option="${q}"]`).click(), id);
      await click('classic');
      await sleep(300);
      const classic = await ev(w.page, () => ({ dialogs: document.querySelectorAll('[role="dialog"]').length, ghosts: document.querySelectorAll('.g-sheet-ghost').length,
        style: document.documentElement.getAttribute('data-style'), overflow: document.body.style.overflow, remnants: __g.remnants().count }));
      await click('glas');
      await sleep(300);
      const glas = await ev(w.page, () => ({ dialogs: __s.panels().length, ghosts: document.querySelectorAll('.g-sheet-ghost').length,
        style: document.documentElement.getAttribute('data-style'), sheets: document.documentElement.hasAttribute('data-g-sheets'),
        overflow: document.body.style.overflow, moving: __s.motion().length }));
      await w.page.keyboard.press('Escape');
      await sleep(80);
      await settleAnimations(w.page);
      const after = await ev(w.page, () => __s.rest(null));
      await w.close();
      const focus = {};
      for (const [from, to] of [['glas', 'classic'], ['classic', 'glas']]) {
        const f = await open('phone', from, '/settings');
        await openWin(f.page, 'win-entities');
        await ev(f.page, (q) => document.querySelector(`[data-glas-style-option="${q}"]`).click(), to);
        await sleep(300);
        await f.page.keyboard.press('Escape');
        await sleep(400);
        await settleAnimations(f.page);
        focus[`${from}→${to}`] = await ev(f.page, () => __s.rest('.admin-entities-btn'));
        await f.close();
      }
      out.sheetsStyleSwitch = { classic, glas, after, focus };
      out.sheetsStyleSwitchOk = classic.dialogs === 1 && classic.ghosts === 0 && classic.style !== 'glas' && classic.overflow === 'hidden'
        && classic.remnants === 0 && glas.dialogs === 1 && glas.ghosts === 0 && glas.style === 'glas' && glas.sheets
        && glas.overflow === '' && glas.moving === 0 && after.clean
        && Object.values(focus).every((r) => r.clean && r.focusOnChip);
    });

    // 13. Closing animates on every way (K47, K69): windows that disappear instead of getting open=false (device,
    //     confirmation), the detail, closing by dragging, a route change with a sheet and its page (both leave together,
    //     nothing stays inert), and a scrolled list keeps its position in the ghost.
    await block('sheetsClose', async () => {
      const res = {};
      const closeX = (page) => press(page, () => __s.panel().querySelector('.g-sheet-header__close'));
      const cases = [
        ['device', 'win-device', closeX, '.device-card'],
        ['detail', 'win-detail', closeX, '.sensor-tile'],
        ['confirm', 'win-unlock-security', (page) => press(page, () => [...__s.panel().querySelectorAll('.modal-footer button')]
          .find((b) => !b.className.includes('danger'))), '.locks-row__btn--unlock'],
        ['dragged', 'win-people', async (page) => {
          const g = await grip(page);
          const h = await ev(page, () => __s.state().rect.h);
          const cdp = await page.context().newCDPSession(page);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.x, y: g.y }] });
          for (let i = 1; i <= 10; i++) {
            await sleep(40);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.x, y: g.y + (h * 0.35 * i) / 10 }] });
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await cdp.detach();
        }, '.summary-chip[aria-label^="people:"]'],
      ];
      for (const [key, name, act, trigger] of cases) {
        const sc = scenes[name];
        const w = await open('phone', 'glas', sc.path, sc);
        await openWin(w.page, name);
        await act(w.page);
        res[key] = await leave(w.page, trigger);
        await w.close();
      }
      // a route change takes the locks sheet and its "Unlock" page away at once
      const r = await open('phone', 'glas', '/');
      await openWin(r.page, 'win-unlock');
      await ev(r.page, () => { history.pushState({}, '', '/pool'); dispatchEvent(new PopStateEvent('popstate')); });
      res.route = await leave(r.page, null);
      await r.close();
      // the lights sheet scrolled down: its ghost shows the same position
      const l = await open('phone', 'glas', '/');
      await openWin(l.page, 'win-lights');
      res.scroll = await ev(l.page, () => {
        const body = __s.panel().querySelector('.modal-body');
        body.scrollTop = 300;
        return body.scrollTop;
      });
      await closeX(l.page);
      await sleep(30);
      res.ghostScroll = await ev(l.page, () => {
        const body = document.querySelector('.g-sheet-ghost .modal-body');
        return body ? body.scrollTop : null;
      });
      await l.close();
      out.sheetsClose = res;
      const ok = (k, n = 1) => res[k].ghost.count === n && !res[k].ghost.role && res[k].after.clean;
      // the focus goes back to the trigger where it can take it, else it stays on the page (body)
      out.sheetsCloseOk = ['device', 'detail', 'confirm', 'dragged'].every((k) => ok(k)
        && (res[k].after.focusOnChip || (!res[k].after.focusable && res[k].after.focus === 'BODY')))
        && ok('route', 2) && res.scroll > 0 && near(res.ghostScroll, res.scroll);
    });

    // 14. A window opened by an effect, without a gesture (What's new with an unseen fork release): one window, no ghost,
    //     the focus on its default action; Escape closes it with a ghost. With --serve this is the build; pointed at the
    //     Vite dev server it is StrictMode (plan §6.2).
    await block('sheetsEffect', async () => {
      const w = await open('phone', 'glas', '/', { unseen: true });
      await until(w.page, () => !!__s.panel(), null, 6000);
      const samples = [];
      for (let i = 0; i < 6; i++) {
        samples.push(await ev(w.page, () => ({ panels: __s.panels().length, ghosts: document.querySelectorAll('.g-sheet-ghost').length })));
        await sleep(100);
      }
      await settleAnimations(w.page);
      const focus = await ev(w.page, () => !!document.activeElement && document.activeElement.hasAttribute('data-autofocus'));
      await w.page.keyboard.press('Escape');
      const closed = await leave(w.page, null);
      await w.close();
      out.sheetsEffect = { samples, focus, closed };
      out.sheetsEffectOk = samples.every((x) => x.panels === 1 && x.ghosts === 0) && focus && closed.ghost.count === 1
        && closed.after.clean;
    });

    // 15. More and rooms close animated (K61); at rest their scrim catches no tap.
    await block('sheetsMenus', async () => {
      const res = {};
      for (const [key, tab, menu] of [['more', DE['nav.moreNavigation'], '.app-more-menu'], ['rooms', DE['nav.rooms'], '.rooms-menu']]) {
        const w = await open('phone', 'glas', '/');
        await tap(w.page, `.app-tabs__item[aria-label="${tab}"]`);
        const opened = await ev(w.page, (q) => !!document.querySelector(q + '--open'), menu);
        await w.page.keyboard.press('Escape');
        await sleep(40);
        const moving = await ev(w.page, (q) => document.querySelector(q).getAnimations().filter((a) => a.playState === 'running').length, menu);
        await settleAnimations(w.page);
        await sleep(400);
        const rest = await ev(w.page, (q) => {
          const hit = document.elementFromPoint(195, 300);
          return { display: getComputedStyle(document.querySelector(q)).display, hitScrim: hit === document.querySelector('.app-layout'),
            hit: __g.desc(hit) };
        }, menu);
        res[key] = { opened, moving, rest };
        await w.close();
      }
      out.sheetsMenus = res;
      out.sheetsMenusOk = Object.values(res).every((r) => r.opened && r.moving > 0 && r.rest.display === 'none' && !r.rest.hitScrim);
    });

    // 16. Reopening while the ghost still runs: one window, no double — the new window takes the ghost's place at once
    //     (`takeGhost` drops it when the window registers, in the task of the tap).
    await block('sheetsReopen', async () => {
      const w = await open('phone', 'glas', '/');
      await openWin(w.page, 'win-people');
      await press(w.page, () => __s.panel().querySelector('.g-sheet-header__close'));
      await sleep(80);
      const during = await ev(w.page, () => document.querySelectorAll('.g-sheet-ghost').length);
      await w.page.locator('.summary-chip[aria-label^="people:"]').filter({ visible: true }).first().click();
      const atOnce = await ev(w.page, () => document.querySelectorAll('.g-sheet-ghost').length);
      await sleep(100);
      await settleAnimations(w.page);
      await until(w.page, () => !document.querySelector('.g-sheet-ghost'), null, 3000);
      const after = await ev(w.page, () => ({ panels: __s.panels().length, ghosts: document.querySelectorAll('.g-sheet-ghost').length,
        sheet: __s.panel() && __s.state().sheet }));
      await w.close();
      out.sheetsReopen = { during, atOnce, after };
      out.sheetsReopenOk = during === 1 && atOnce === 0 && after.panels === 1 && after.ghosts === 0 && after.sheet === 'medium';
    });

    // 18. The ghost shows the window as it was (plan §13.1): every text that showed in a scroll area sits at the same place
    //     in the ghost, measured right after the ghost decides (a mutation observer runs before its microtask and queues
    //     the measurement behind it; the closing animation still stands at its start). The entity list and "What's new"
    //     are big enough to be copied in part (only what shows, plus a margin), lights and the detail are copied whole.
    //     `margins` puts above what shows what an empty box of the same size would move (review finding 9): a margin
    //     that passes through its parent, and an inline-block that sets the height of its line by its baseline.
    await block('sheetsGhostCopy', async () => {
      const res = {};
      const SHIFTERS = '<div><p style="margin:30px 0">Rand</p></div>'
        + '<div><span style="display:inline-block;font-size:12px;line-height:40px">Grundlinie</span><span style="font-size:30px">y</span></div>';
      // the entity groups are closed <details> (not rendered); `entitiesOpen` opens the biggest one and scrolls down
      for (const [key, name, openGroup, shifters] of [['entities', 'win-entities'], ['entitiesOpen', 'win-entities', true],
        ['margins', 'win-entities', true, SHIFTERS], ['whatsnew', 'win-whatsnew'], ['lights', 'win-lights'], ['detail', 'win-detail']]) {
        const sc = scenes[name];
        const w = await open('phone', 'glas', sc.path, sc);
        await openWin(w.page, name);
        const openNodes = !openGroup ? 0 : await ev(w.page, () => {
          const groups = [...__s.panel().querySelectorAll('details')];
          groups.sort((a, b) => b.getElementsByTagName('*').length - a.getElementsByTagName('*').length);
          groups[0].open = true;
          return groups[0].getElementsByTagName('*').length;
        });
        await sleep(300);
        const before = await ev(w.page, (html) => {
          const panel = __s.panel();
          const scroller = [...panel.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 1
            && ['auto', 'scroll'].includes(getComputedStyle(e).overflowY));
          if (scroller && html) scroller.insertAdjacentHTML('afterbegin', html);
          if (scroller) scroller.scrollTop = Math.round((scroller.scrollHeight - scroller.clientHeight) / 2);
          return { scrolled: scroller ? scroller.scrollTop : 0 };
        }, shifters || '');
        await sleep(200);
        const texts = () => {
          const panel = document.querySelector('.g-sheet-ghost > .modal-panel') || __s.panel();
          const p = panel.getBoundingClientRect();
          const list = [];
          for (const e of panel.querySelectorAll('*')) {
            if (e.children.length || !e.textContent.trim()) continue;
            // not rendered (the content of a closed <details>): nothing shows
            if (e.checkVisibility && !e.checkVisibility()) continue;
            const r = e.getBoundingClientRect();
            if (!r.width || !r.height || r.bottom <= p.top || r.top >= p.bottom) continue;
            // only what shows: inside every scroll area around it
            let shown = true;
            for (let a = e.parentElement; a && a !== panel; a = a.parentElement) {
              if (a.scrollHeight > a.clientHeight + 1 && ['auto', 'scroll'].includes(getComputedStyle(a).overflowY)) {
                const b = a.getBoundingClientRect();
                if (r.bottom <= b.top || r.top >= b.bottom) shown = false;
              }
            }
            if (shown) list.push({ t: e.textContent.trim().slice(0, 40), x: r.left - p.left, y: r.top - p.top, w: r.width, h: r.height });
          }
          return { list, nodes: panel.parentElement.getElementsByTagName('*').length };
        };
        const orig = await ev(w.page, `(${texts})()`);
        await ev(w.page, (fn) => {
          const read = new Function(`return (${fn})()`);
          const mo = new MutationObserver((records) => {
            if (!records.some((r) => [...r.addedNodes].some((n) => n.classList && n.classList.contains('g-sheet-ghost')))) return;
            mo.disconnect();
            queueMicrotask(() => { window.__ghostCopy = read(); });
          });
          mo.observe(document.body, { childList: true });
        }, texts.toString());
        await press(w.page, () => __s.panel().querySelector('.g-sheet-header__close'));
        await sleep(600);
        const ghost = await ev(w.page, () => window.__ghostCopy || null);
        await w.close();
        if (!ghost) {
          res[key] = { ghost: null };
          continue;
        }
        const missing = orig.list.filter((o) => !ghost.list.some((g) => g.t === o.t && Math.abs(g.x - o.x) <= 0.5
          && Math.abs(g.y - o.y) <= 0.5 && Math.abs(g.w - o.w) <= 0.5 && Math.abs(g.h - o.h) <= 0.5));
        res[key] = { scrolled: before.scrolled, texts: orig.list.length, missing: missing.length, sample: missing.slice(0, 3),
          nodes: orig.nodes, openNodes, ghostNodes: ghost.nodes };
      }
      out.sheetsGhostCopy = res;
      out.sheetsGhostCopyOk = Object.values(res).every((r) => r.ghost !== null && r.texts > 0 && r.missing === 0)
        // closed groups keep only their summary; of the open, scrolled group only what shows (plus a margin)
        && res.entities.ghostNodes < res.entities.nodes / 4
        && res.entitiesOpen.scrolled > 0 && res.entitiesOpen.ghostNodes < res.entitiesOpen.openNodes / 2
        && res.margins.ghostNodes < res.margins.nodes && res.whatsnew.scrolled > 0 && res.whatsnew.ghostNodes < res.whatsnew.nodes
        && res.lights.scrolled > 0 && res.lights.ghostNodes === res.lights.nodes;
    });

    // 19. The ghost loads nothing again (review finding 2): a `no-store` picture and a stream that is still loading (a
    //     camera's MJPEG) are requested once, also after the window closed; the ghost shows the picture as a still and
    //     keeps the stream's place empty.
    await block('sheetsGhostMedia', async () => {
      const w = await open('phone', 'glas', scenes['win-detail'].path, scenes['win-detail']);
      const asked = { still: 0, stream: 0 };
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      await w.page.route('**/__ghost-probe/**', (route) => {
        if (route.request().url().includes('stream')) {
          asked.stream++; // never answered: a stream that is still loading
          return;
        }
        asked.still++;
        route.fulfill({ status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'no-store' }, body: png });
      });
      await openWin(w.page, 'win-detail');
      await ev(w.page, () => __s.panel().querySelector('.modal-body').insertAdjacentHTML('afterbegin',
        '<img class="probe-still" alt="" src="/__ghost-probe/still.png" style="display:block;width:120px;height:80px">'
        + '<img class="probe-stream" alt="" src="/__ghost-probe/stream.mjpg" style="display:block;width:120px;height:80px">'));
      const loaded = await until(w.page, () => { const i = document.querySelector('.probe-still'); return i.complete && i.naturalWidth > 0; });
      await sleep(200);
      const before = { ...asked };
      await ev(w.page, () => {
        const mo = new MutationObserver((records) => {
          const ghost = records.flatMap((r) => [...r.addedNodes]).find((n) => n.classList && n.classList.contains('g-sheet-ghost'));
          if (!ghost) return;
          mo.disconnect();
          const body = ghost.querySelector('.modal-body');
          const stream = body.querySelector('.probe-stream');
          window.__ghostMedia = {
            still: body.firstElementChild ? body.firstElementChild.tagName : null,
            streamHidden: !!stream && stream.style.visibility === 'hidden',
            sources: [...ghost.querySelectorAll('img, source, video, audio, iframe')].filter((e) => e.hasAttribute('src')
              || e.hasAttribute('srcset') || e.hasAttribute('poster')).length,
          };
        });
        mo.observe(document.body, { childList: true });
      });
      await press(w.page, () => __s.panel().querySelector('.g-sheet-header__close'));
      await sleep(1200);
      const ghost = await ev(w.page, () => window.__ghostMedia || null);
      const after = { ...asked };
      await w.close();
      out.sheetsGhostMedia = { loaded, before, after, ghost };
      out.sheetsGhostMediaOk = loaded && before.still === 1 && before.stream === 1 && after.still === 1 && after.stream === 1
        && !!ghost && ghost.still === 'CANVAS' && ghost.streamHidden && ghost.sources === 0;
    });

    // 20. A tap's element is the origin only until its click is done (review finding 7): a window that opens a moment
    //     later without a tap of its own (here: from a timer) does not grow out of it.
    await block('sheetsOriginExpiry', async () => {
      const w = await open('phone', 'glas', '/');
      const tab = '.app-tabs__item--active';
      await ev(w.page, (q) => {
        const chip = [...document.querySelectorAll('.summary-chip[aria-label^="people:"]')].find((e) => __g.visible(e));
        document.querySelector(q).addEventListener('click', () => setTimeout(() => chip.click(), 40), { once: true });
      }, tab);
      await press(w.page, (q) => document.querySelector(q), tab);
      await until(w.page, () => !!__s.panel());
      const first = await ev(w.page, () => __s.state().rect);
      await settleAnimations(w.page);
      const end = await ev(w.page, () => __s.state().rect);
      await w.close();
      out.sheetsOriginExpiry = { first, end };
      out.sheetsOriginExpiryOk = first.w >= end.w * 0.9;
    });

    // 17. Performance (a report, GLAS-PLAN §5.5, plan §6.3), at full speed and at 4× CPU slowdown, Klassisch at 4× as the
    //     baseline: frames dropped in the 900 ms after the press that opens a window and after the press that closes it,
    //     long tasks, and how long the ghost's synchronous work takes — from the backdrop's clone until the ghost queues
    //     its decision (copy, frozen styles, stills, insertion) — with the number of nodes of the window.
    await block('sheetsPerf', async () => {
      const res = {};
      for (const [style, rate] of [['glas', 1], ['glas', 4], ['classic', 4]]) {
        for (const [key, name] of [['lights', 'win-lights'], ['entities', 'win-entities'], ['detail', 'win-detail']]) {
          const sc = scenes[name];
          const w = await open('phone', style, sc.path, sc);
          const cdp = await w.page.context().newCDPSession(w.page);
          await cdp.send('Emulation.setCPUThrottlingRate', { rate });
          await ev(w.page, () => {
            const p = (window.__perf = { frames: [], long: [], downs: [], clones: [], cloneAt: 0, cloneNodes: 0 });
            new PerformanceObserver((l) => { for (const e of l.getEntries()) p.long.push(Math.round(e.duration)); })
              .observe({ type: 'longtask' });
            addEventListener('pointerdown', () => p.downs.push(performance.now()), true);
            const tick = (t) => { p.frames.push(t); requestAnimationFrame(tick); };
            requestAnimationFrame(tick);
            const clone = Node.prototype.cloneNode;
            Node.prototype.cloneNode = function (deep) {
              if (this instanceof HTMLElement && this.classList.contains('modal-backdrop')) {
                p.cloneNodes = this.querySelectorAll('*').length;
                p.cloneAt = performance.now();
              }
              return clone.call(this, deep);
            };
            const queue = window.queueMicrotask;
            window.queueMicrotask = function (cb) {
              if (p.cloneAt) p.clones.push({ ms: +(performance.now() - p.cloneAt).toFixed(1), nodes: p.cloneNodes });
              p.cloneAt = 0;
              return queue.call(window, cb);
            };
          });
          const frames = () => ev(w.page, () => {
            const p = window.__perf;
            const t0 = p.downs[p.downs.length - 1] || 0;
            const f = p.frames.filter((t) => t >= t0 && t <= t0 + 900);
            let dropped = 0;
            let worst = 0;
            for (let i = 1; i < f.length; i++) {
              const d = f[i] - f[i - 1];
              worst = Math.max(worst, d);
              dropped += Math.max(0, Math.round(d / 16.7) - 1);
            }
            const long = p.long.slice();
            p.long.length = 0;
            return { frames: f.length, dropped, worst: Math.round(worst), long };
          });
          const note = await sc.act(w.page);
          if (note) throw new Error(`${name}: ${note}`);
          await settleAnimations(w.page, 6000);
          await sleep(300);
          const opening = { ...(await frames()), nodes: await ev(w.page, () => __s.panel().querySelectorAll('*').length) };
          await press(w.page, () => __s.panel().querySelector('.g-sheet-header__close, .modal-header__close button'));
          await sleep(1500);
          const closing = { ...(await frames()), ghost: await ev(w.page, () => window.__perf.clones.slice()) };
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
          await cdp.detach();
          res[`${key}@${rate}x${style === 'classic' ? ' Klassisch' : ''}`] = { opening, closing };
          await w.close();
        }
      }
      out.sheetsPerf = res;
      out.sheetsPerfOk = true;
    });

    // 12. Every window of §6.0 opens in Glas on the phone and the desktop without an error, with one window on top and
    //     no text field below 16 px (K54).
    await block('sheetsAll', async () => {
      const res = {};
      for (const device of ['phone', 'desktop']) {
        for (const [name, sc] of Object.entries(scenes)) {
          const w = await open(device, 'glas', sc.path, sc);
          const note = await sc.act(w.page);
          if (note) {
            res[`${device} ${name}`] = { skipped: note };
            await w.close();
            continue;
          }
          await settleAnimations(w.page);
          res[`${device} ${name}`] = await ev(w.page, () => {
            const s = __s.panel() && __s.state();
            return s ? { pres: s.pres, sheet: s.sheet, w: Math.round(s.rect.w), h: Math.round(s.rect.h), onTop: __s.onTop(),
              small: __s.smallFields() } : { none: true };
          });
          await w.close();
        }
      }
      out.sheetsAll = res;
      const skips = skipped(res, 'glas');
      out.sheetsAllSkipped = skips.all;
      out.sheetsAllUnexpectedSkips = skips.unexpected;
      out.sheetsAllOk = skips.unexpected.length === 0
        && Object.values(res).every((r) => r.skipped || (!r.none && r.onTop && r.small.length === 0));
    });

    out.sheetsPageErrors = pageErrors;
    return ran.filter((k) => k !== 'sheetsK63').every((k) => out[k + 'Ok']) && pageErrors.length === 0;
  }

  const near = (v, want, tol = 1) => typeof v === 'number' && Math.abs(v - want) <= tol;

  /** Helpers for the window checks in the page (`window.__s`). Runs in the page, next to pageHelpers. */
  function sheetHelpers() {
    const live = (el) => !el.closest('.g-sheet-ghost');
    const rect = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height, right: b.right, bottom: b.bottom };
    };
    window.__s = {
      panels: () => [...document.querySelectorAll('.modal-panel[role="dialog"]')].filter(live),
      /** The window on top (last in the stack order). */
      panel() {
        const list = this.panels();
        if (!list.length) return null;
        return list.reduce((a, b) => (Number(b.parentElement.style.zIndex || 0) >= Number(a.parentElement.style.zIndex || 0) ? b : a));
      },
      state() {
        const p = this.panel();
        const cs = getComputedStyle(p);
        const g = p.querySelector(':scope > .g-sheet-grabber');
        const bar = g && getComputedStyle(g, '::before');
        return {
          pres: p.parentElement.getAttribute('data-g-pres'), sheet: p.getAttribute('data-g-sheet'), mat: p.getAttribute('data-g-mat'),
          rect: rect(p), radius: cs.borderRadius,
          glass: [cs.backdropFilter, cs.webkitBackdropFilter].some((v) => v && v !== 'none'),
          grabber: g ? { w: g.offsetWidth, h: g.offsetHeight, barW: parseFloat(bar.width), barH: parseFloat(bar.height),
            hidden: g.getAttribute('aria-hidden') === 'true', tabIndex: g.tabIndex } : null,
        };
      },
      head() {
        const p = this.panel();
        const close = p.querySelector('.g-sheet-header__close');
        const title = p.querySelector('.g-sheet-header__title');
        const pr = p.getBoundingClientRect();
        const tr = title.getBoundingClientRect();
        return { closeW: close.offsetWidth, closeH: close.offsetHeight,
          titleOff: Math.abs(tr.left + tr.width / 2 - (pr.left + pr.width / 2)) };
      },
      stack() {
        const list = this.panels().sort((a, b) => Number(a.parentElement.style.zIndex) - Number(b.parentElement.style.zIndex));
        const top = list[list.length - 1];
        const below = list[list.length - 2];
        return {
          windows: list.length,
          top: top && { pres: top.parentElement.getAttribute('data-g-pres'), mat: top.getAttribute('data-g-mat'), rect: rect(top),
            back: !!top.querySelector('.g-sheet-header__back') },
          below: below ? { pushed: below.hasAttribute('data-g-pushed'), inert: below.parentElement.inert } : { pushed: false, inert: false },
        };
      },
      ghost() {
        const gs = [...document.querySelectorAll('.g-sheet-ghost')];
        return { count: gs.length, role: gs.some((g) => g.querySelector('[role="dialog"], [aria-modal]')) };
      },
      /** Nothing of a window left; the focus back on the trigger (selector, or null to skip). */
      rest(trigger) {
        const t = trigger && [...document.querySelectorAll(trigger)].find((e) => e.getClientRects().length);
        return {
          clean: !document.querySelector('.modal-backdrop, .g-sheet-ghost') && !document.documentElement.hasAttribute('data-g-sheets')
            && document.body.style.overflow === '' && getComputedStyle(document.body).overflow !== 'hidden'
            && ![...document.querySelectorAll('[inert]')].length,
          focusOnChip: !!t && document.activeElement === t,
          // a trigger that cannot take the focus (the room's sensor tiles are plain divs, in Klassisch too)
          focusable: !!t && t.tabIndex >= 0,
          focus: document.activeElement && (document.activeElement.className || document.activeElement.tagName).toString().slice(0, 40),
        };
      },
      tabs() {
        const tabs = document.querySelector('.app-tabs');
        if (!tabs) return { reachable: false };
        const b = tabs.getBoundingClientRect();
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return { reachable: !!hit && tabs.contains(hit) };
      },
      notes() {
        const p = this.panel();
        if (!p) return { open: false };
        return { open: true, rows: p.querySelectorAll('.g-notes__row').length, times: p.querySelectorAll('.g-notes__time').length,
          empty: !!p.querySelector('.empty-state'), subtitle: (p.querySelector('.g-sheet-header__subtitle') || {}).textContent || '',
          height: p.getBoundingClientRect().height };
      },
      /** Running animations on windows: duration and animated properties. */
      motion() {
        return [...document.querySelectorAll('.modal-backdrop, .modal-backdrop *')].flatMap((el) => el.getAnimations()
          // a transition cut to (almost) nothing by reduced motion moves nothing
          .filter((a) => a.playState === 'running' && Number(a.effect.getComputedTiming().duration) >= 1)
          .map((a) => ({ ms: Math.round(Number(a.effect.getComputedTiming().duration) || 0),
            props: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))]
              .filter((p) => !['offset', 'computedOffset', 'easing', 'composite'].includes(p)) })));
      },
      /** Visible text fields of the windows below 16 px (K54): [element, px]. */
      smallFields() {
        return [...document.querySelectorAll('.modal-panel :is(input, select, textarea)')]
          .filter((e) => !['checkbox', 'radio', 'range', 'color', 'button', 'submit', 'hidden'].includes(e.type) && __g.visible(e))
          .map((e) => [__g.desc(e), parseFloat(getComputedStyle(e).fontSize)]).filter(([, px]) => px < 16);
      },
      /** Only the window on top answers a tap in its middle. */
      onTop() {
        const p = this.panel();
        const b = p.getBoundingClientRect();
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + Math.min(b.height / 2, 60));
        return !!hit && p.contains(hit);
      },
      /** The Klassisch DOM of the open windows, without React's generated ids. */
      classicDom() {
        return [...document.querySelectorAll('.modal-backdrop, .numpad-overlay')].map((el) => el.outerHTML
          .replace(/_r_[0-9a-z]+_/g, '_r_')
          .replace(/ aria-labelledby="[^"]*"/g, '').replace(/ id="_r_"/g, ''));
      },
    };
  }

  // the gesture checks of stage 3b (glas-checks-gestures.cjs) use the window helpers and `reach` too
  return { scenes, sheetsChecks, sheetHelpers, reach };
};
