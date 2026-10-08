// [fork] glas-checks-gestures.cjs — the gestures and the inspector of Glas stage 3b for glas-shots.cjs
// (docs/glas/PLAN-ETAPPE-3.md §4, §6.2): scenes that open a context menu or a swipe row (`shoot --scenes ctx-card,
// ctx-card-off,swipe-lights,swipe-notes`; the inspector is the picture of win-detail at 1100 px and wider) and
// `checks --part gestures`. glas-shots.cjs loads this file with its helpers; it is not run on its own.
//
// The checks run in real time like the window checks (glas-checks-sheets.cjs): the long press waits for its 550 ms
// timer; the menu, the rows and the inspector move with the Web Animations API. Touch goes through CDP touch events
// (Chromium only; WebKit belongs to the lab). Cards are found by their entity through React's props on the card wrapper
// — a hook for the checks only, the app reads nothing of it.

/* global __g, __s, __x -- helpers in the page (glas-shots.cjs pageHelpers, glas-checks-sheets.cjs sheetHelpers,
   gestureHelpers below) */

module.exports = function gestures(h) {
  const { DE, DEVICES, ABORTED, run, settleAnimations, isGlas, seedScript, pageHelpers, sheetHelpers, reach } = h;

  const LIGHT_ON = 'light.living_room_ceiling';
  const LIGHT_OFF = 'light.living_room_shelf';
  const SENSOR = 'sensor.living_room_temperature';
  const SENSOR_2 = 'sensor.living_room_humidity';
  const MEDIA = 'media_player.living_room_tv';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---- shared steps (scenes and checks; the scenes run on the paused clock of `shoot`, these steps set no timers) ----

  /** The card of an entity in the middle of the screen: its rectangle, or null when the page has none. */
  async function bring(page, id) {
    await page.evaluate(gestureHelpers); // `shoot` has no init scripts of the checks
    await settleAnimations(page);
    const moved = await page.evaluate((e) => {
      const el = __x.card(e);
      if (!el) return null;
      const y = scrollY;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      return scrollY !== y;
    }, id);
    if (moved === null) return null;
    // the Glas runtime reads the scroll position in requestAnimationFrame
    if (moved) await run(page, 100);
    await settleAnimations(page);
    return page.evaluate((e) => __x.rect(__x.card(e)), id);
  }

  /** Swipe a row (its rectangle) by `dx`: with a finger where the page has touch, else with the mouse. */
  async function swipe(page, r, dx, { steps = 10, ms = 200, at = 0.6 } = {}) {
    const x = r.x + r.w * at;
    const y = r.y + r.h / 2;
    if (await page.evaluate(() => navigator.maxTouchPoints > 0)) {
      const cdp = await page.context().newCDPSession(page);
      const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
      await send('touchStart', [{ x, y }]);
      for (let i = 1; i <= steps; i++) {
        await sleep(ms / steps);
        await send('touchMove', [{ x: x + (dx * i) / steps, y: y + i * 0.3 }]);
      }
      await sleep(30);
      await send('touchEnd', []);
      await cdp.detach();
    } else {
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= steps; i++) {
        await sleep(ms / steps);
        await page.mouse.move(x + (dx * i) / steps, y + i * 0.3);
      }
      await page.mouse.up();
    }
    await sleep(80);
    await settleAnimations(page);
  }

  /** The visible rows matching `sel` (swipe state, how far each moved, its action). */
  const rows = async (page, sel) => {
    await page.evaluate(gestureHelpers);
    return page.evaluate((s) => __x.rows(s), sel);
  };

  // ---- scenes: the context menu and an open swipe row (Glas only; Klassisch has neither) ----

  const menuScene = (id) => async (page) => {
    if (!(await isGlas(page))) return 'Glas only';
    const c = await bring(page, id);
    if (!c) return 'no card ' + id;
    await page.mouse.click(c.x + c.w / 2, c.y + c.h / 2, { button: 'right' });
    await run(page, 100);
    await settleAnimations(page);
    return (await page.evaluate(() => !!document.querySelector('.g-ctx__menu'))) ? '' : 'no menu';
  };
  /** Opens the first matching row (a lit one with `lit`). */
  const swipeScene = (sel, lit = false) => async (page) => {
    const list = (await rows(page, sel)).filter((r) => r.swipe && (!lit || r.on));
    if (!list.length) return 'no row ' + sel;
    await swipe(page, list[0], -100);
    return (await rows(page, sel)).some((r) => r.state === 'open') ? '' : 'row did not open';
  };
  const glasOnly = (step) => async (page) => ((await isGlas(page)) ? step(page) : 'Glas only');
  const seq = (...steps) => async (page) => {
    for (const step of steps) {
      const note = await step(page);
      if (note) return note;
    }
    return '';
  };
  const openNotes = async (page) => (page.viewportSize().width < 900
    ? (await reach(page, '.g-avatar__btn')) || reach(page, `.g-avatar-menu__item:has-text("${DE['glas.avatar.notifications']}")`)
    : reach(page, '.header-cluster .notifications-trigger'));

  const scenes = {
    'ctx-card': { path: '/room/living_room', act: menuScene(LIGHT_ON) },
    // an off light: from two columns on, its grid cell is as tall as the on light's beside it — the hole is the card
    'ctx-card-off': { path: '/room/living_room', act: menuScene(LIGHT_OFF) },
    'swipe-lights': { path: '/', act: glasOnly(seq((page) => reach(page, '.summary-chip[aria-label^="lights:"]'),
      swipeScene('.modal-body [data-g-swipe]', true))) },
    'swipe-notes': { path: '/', act: glasOnly(seq(openNotes, swipeScene('[data-g-swipe]'))) },
  };
  for (const sc of Object.values(scenes)) sc.viewport = true;

  // ---- checks --part gestures ----

  async function gesturesChecks(browser, url, out, opts = {}) {
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
    const ev = (page, fn, a) => page.evaluate(fn, a);
    const until = (page, fn, a, timeout = 4000) => page.waitForFunction(fn, a, { timeout }).then(() => true, () => false);

    /** A real-time document. `device`: a name from DEVICES or a context option object. */
    const open = async (device, style, p = '/', extra = {}) => {
      const dev = typeof device === 'string' ? DEVICES[device] : device;
      const ctx = await browser.newContext({
        ...dev, locale: 'de-DE', timezoneId: 'Europe/Berlin', colorScheme: 'light',
        reducedMotion: extra.reduce ? 'reduce' : 'no-preference',
      });
      await ctx.route((u) => !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(u.href), (r) => r.abort());
      await ctx.addInitScript(seedScript({ demo: true, mode: 'light', style, strength: 'clear', customization: extra.customization }));
      await ctx.addInitScript(pageHelpers);
      await ctx.addInitScript(sheetHelpers);
      await ctx.addInitScript(gestureHelpers);
      await ctx.addInitScript(() => {
        window.__roLoops = 0;
        addEventListener('error', (e) => { if (/ResizeObserver loop/.test(e.message)) window.__roLoops += 1; });
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

    // finger and mouse
    const finger = async (page) => {
      const cdp = await page.context().newCDPSession(page);
      const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
      return {
        down: (pt) => send('touchStart', [{ x: pt.x, y: pt.y }]),
        move: (pt) => send('touchMove', [{ x: pt.x, y: pt.y }]),
        up: async () => {
          await send('touchEnd', []);
          await cdp.detach();
        },
        /** Lifts without a click: CDP touch makes one after every touchEnd, also after a long hold (a phone makes none). */
        cancel: async () => {
          await send('touchCancel', []);
          await cdp.detach();
        },
      };
    };
    const mid = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
    /** Hold a finger on `pt` for `ms`, keep it down; returns what lifts it. */
    const hold = async (page, pt, ms = 700) => {
      const f = await finger(page);
      await f.down(pt);
      await sleep(ms);
      return f;
    };
    /** Where a long press on a card lands: on a light card its name and subtitle (the middle of that card lies between
     *  two sliders, Chromium's touch adjustment may snap a finger there onto a slider, and a press on a control never
     *  arms the hold), else the card's centre. Call after `bring`. */
    const pressPoint = async (page, id) => mid(await ev(page, (e) => {
      const c = __x.card(e);
      return __x.rect(c.querySelector('.light-card__text') || c);
    }, id));
    const tapAt = async (page, pt) => {
      const f = await finger(page);
      await f.down(pt);
      await sleep(40);
      await f.up();
    };
    const menuGone = (page) => until(page, () => !document.querySelector('.g-ctx'), null, 3000);
    const menuOpen = (page) => until(page, () => !!document.querySelector('.g-ctx:not(.g-ctx--closing) .g-ctx__menu'), null, 3000);
    /** Right-click a card, wait until the menu rests; returns its state. */
    const rightClick = async (page, id) => {
      const c = await bring(page, id);
      if (!c) throw new Error('no card ' + id);
      await page.mouse.click(c.x + c.w / 2, c.y + c.h / 2, { button: 'right' });
      if (!(await menuOpen(page))) throw new Error('no menu for ' + id);
      await settleAnimations(page);
      return ev(page, (e) => __x.menu(e), id);
    };
    const escape = async (page) => {
      await page.keyboard.press('Escape');
      await sleep(80);
      await settleAnimations(page);
    };
    const clickItem = async (page, label) => {
      const b = await ev(page, (l) => {
        const item = [...document.querySelectorAll('.g-ctx__menu [role="menuitem"]')].find((e) => e.textContent.trim() === l);
        return item ? __x.rect(item) : null;
      }, label);
      if (!b) throw new Error('no menu item ' + label);
      await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
      await menuGone(page);
      await settleAnimations(page);
    };
    /** The card lifted, the hole over it (±1 px; the card is the `.card` in the wrapper, the wrapper is a grid cell as
     *  tall as its row); the menu 14 under or over the card and 16 from the sides. */
    const geometryOk = (m, view, width) => !!m.lifted && m.lifted.isCard && !!m.card
      && ['x', 'y', 'w', 'h'].every((k) => Math.abs(m.hole[k] - m.card[k]) <= 1)
      && /^path\(evenodd/.test(m.clip) && near(m.rect.w, width) && m.rect.x >= 15.5 && m.rect.right <= view - 15.5
      && (m.rect.y >= m.card.bottom + 13 || m.rect.bottom <= m.card.y - 13);
    /** The focused element, whether it is in the card of `id` and whether it shows a ring. */
    const focusRing = (page, id) => ev(page, (e) => __x.focusRing(e), id);
    const FAV = [DE['glas.context.favoriteAdd'], DE['glas.context.favoriteRemove']];
    /** "Aktionen für <name>" with a name. */
    const labelOk = (label) => {
      const [before, after] = DE['glas.context.menuLabel'].split('{name}');
      return label.startsWith(before) && label.endsWith(after) && label.length > before.length + after.length;
    };
    /** Menu items against the expected order; 'FAV' stands for either favourites item. */
    const itemsOk = (items, want) => items.length === want.length
      && want.every((w, i) => (w === 'FAV' ? FAV.includes(items[i]) : items[i] === DE[`glas.context.${w}`]));

    // 1. Klassisch: no menu (a right click keeps the browser's own, a long press opens the detail as on main), no swipe
    //    rows, the detail as the upstream modal at every width; nothing of Glas in the document.
    await block('gesturesClassic', async () => {
      const res = {};
      const d = await open('desktop', 'classic', '/room/living_room');
      await ev(d.page, () => {
        window.__ctx = [];
        addEventListener('contextmenu', (e) => window.__ctx.push(e.defaultPrevented));
      });
      const c = await bring(d.page, LIGHT_ON);
      await d.page.mouse.click(c.x + c.w / 2, c.y + c.h / 2, { button: 'right' });
      await sleep(400);
      res.rightClick = await ev(d.page, () => ({ menu: !!document.querySelector('.g-ctx'), prevented: window.__ctx,
        dialogs: document.querySelectorAll('[role="dialog"]').length, lifted: !!document.querySelector('[data-g-lifted]') }));
      const s = await bring(d.page, SENSOR);
      await d.page.mouse.click(s.x + s.w / 2, s.y + s.h / 2);
      await until(d.page, () => !!document.querySelector('[role="dialog"]'));
      await settleAnimations(d.page);
      res.detail = await ev(d.page, () => {
        const p = document.querySelector('[role="dialog"]');
        const b = p.getBoundingClientRect();
        return { modal: p.getAttribute('aria-modal'), centre: Math.round(b.left + b.width / 2), overflow: document.body.style.overflow,
          inspector: document.documentElement.hasAttribute('data-g-inspector'), remnants: __g.remnants().count };
      });
      await d.page.keyboard.press('Escape');
      await sleep(200);
      res.detailAfter = await ev(d.page, () => document.querySelectorAll('[role="dialog"]').length);
      await d.close();

      const p = await open('phone', 'classic', '/room/living_room');
      await bring(p.page, LIGHT_ON);
      const f = await hold(p.page, await pressPoint(p.page, LIGHT_ON), 750);
      // lifted without CDP's click: it would land on the light card of the detail that opened under the finger
      await f.cancel();
      await sleep(400);
      await settleAnimations(p.page);
      res.longPress = await ev(p.page, (id) => ({ menu: !!document.querySelector('.g-ctx'), dialogs: document.querySelectorAll('[role="dialog"]').length,
        state: __x.cardState(id) }), LIGHT_ON);
      await p.close();

      const q = await open('phone', 'classic', '/');
      await reach(q.page, '.summary-chip[aria-label^="lights:"]');
      await until(q.page, () => !!document.querySelector('.lights-modal__row'));
      await settleAnimations(q.page);
      const lit = (await rows(q.page, '.lights-modal__row')).filter((r) => r.on);
      await swipe(q.page, lit[0], -100);
      res.lights = await ev(q.page, () => ({ swipeRows: document.querySelectorAll('[data-g-swipe]').length,
        actions: document.querySelectorAll('.g-swipe-act').length, remnants: __g.remnants().count }));
      res.lightsRow = (await rows(q.page, '.lights-modal__row')).find((r) => r.text === lit[0].text);
      await q.close();
      out.gesturesClassic = res;
      out.gesturesClassicOk = !res.rightClick.menu && res.rightClick.prevented.length === 1 && res.rightClick.prevented[0] === false
        && res.rightClick.dialogs === 0 && !res.rightClick.lifted
        && res.detail.modal === 'true' && near(res.detail.centre, 720) && res.detail.overflow === 'hidden' && !res.detail.inspector
        && res.detail.remnants === 0 && res.detailAfter === 0
        && !res.longPress.menu && res.longPress.dialogs === 1 && res.longPress.state === 'on'
        && res.lights.swipeRows === 0 && res.lights.actions === 0 && res.lights.remnants === 0
        && !!res.lightsRow && res.lightsRow.moved === 0 && res.lightsRow.on;
    });

    // 2. The menu on the phone: a long press (550 ms) opens it while the finger is still down and the release keeps it;
    //    the card is lifted and shows through the hole (±1 px); the actions of a light; a tap on the hole closes without
    //    switching and gives the card the focus without a ring until a key is used; scrolling closes; a tap without
    //    holding still switches the light or opens a display card's detail. The `contextmenu` Android sends for the long
    //    press (a PointerEvent of a finger, at the element under it) opens one menu in either order and never the
    //    browser's; as a plain MouseEvent during the touch it counts as a long press too (the finger cannot scroll the
    //    page under the menu). After a menu the first tap on a control of the card works.
    await block('gesturesMenuTouch', async () => {
      const res = {};
      const w = await open('phone', 'glas', '/room/living_room');
      const page = w.page;
      await bring(page, LIGHT_ON);
      const f = await hold(page, await pressPoint(page, LIGHT_ON), 350);
      res.at350 = await ev(page, () => !!document.querySelector('.g-ctx'));
      await sleep(400);
      res.held = await ev(page, () => __x.menu());
      await f.up();
      await sleep(500);
      await settleAnimations(page);
      res.released = await ev(page, (id) => ({ ...__x.menu(id), state: __x.cardState(id), dialogs: __s.panels().length }), LIGHT_ON);
      // a tap on the hole closes; the light under it does not switch; the card has the focus, its ring comes with a key
      await tapAt(page, mid(res.released.hole));
      res.holeClosed = await menuGone(page);
      res.afterHole = await ev(page, (id) => ({ state: __x.cardState(id), dialogs: __s.panels().length }), LIGHT_ON);
      res.quietFocus = await focusRing(page, LIGHT_ON);
      await page.keyboard.press('Shift');
      res.keyFocus = await focusRing(page, LIGHT_ON);
      // scrolling closes
      await bring(page, LIGHT_ON);
      await (await hold(page, await pressPoint(page, LIGHT_ON))).up();
      await menuOpen(page);
      await settleAnimations(page);
      await ev(page, () => window.scrollBy({ top: 60, behavior: 'instant' }));
      res.scrollClosed = await menuGone(page);
      // Android's `contextmenu` for the long press, at the element under the finger (the hole once the menu is there)
      const ctxAt = (pt, kind) => ev(page, ([x, y, k]) => {
        const init = { bubbles: true, cancelable: true, clientX: x, clientY: y };
        const evt = k === 'touch' ? new PointerEvent('contextmenu', { ...init, pointerType: 'touch', isPrimary: true })
          : new MouseEvent('contextmenu', init);
        document.elementFromPoint(x, y).dispatchEvent(evt);
        return evt.defaultPrevented;
      }, [pt.x, pt.y, kind]);
      /** The menu now, to see later that no second one replaced it. */
      const mark = () => ev(page, () => { window.__menuNode = document.querySelector('.g-ctx__menu'); });
      const menuNow = () => ev(page, () => ({ hosts: document.querySelectorAll('.g-ctx').length,
        same: !!window.__menuNode && document.querySelector('.g-ctx__menu') === window.__menuNode,
        open: !!document.querySelector('.g-ctx:not(.g-ctx--closing)') }));
      //   after the menu came (550 ms)
      await bring(page, LIGHT_ON);
      const pt = await pressPoint(page, LIGHT_ON);
      const g = await hold(page, pt);
      await mark();
      res.timerFirst = { prevented: await ctxAt(pt, 'touch') };
      await sleep(150);
      Object.assign(res.timerFirst, await menuNow());
      await g.up();
      await sleep(400);
      res.timerFirst.released = (await menuNow()).open;
      await escape(page);
      await menuGone(page);
      //   before it (the menu comes with it, the 550 ms timer then changes nothing)
      const g2 = await finger(page);
      await g2.down(pt);
      await sleep(250);
      res.ctxFirst = { prevented: await ctxAt(pt, 'touch') };
      await sleep(50);
      await mark();
      await sleep(450);
      Object.assign(res.ctxFirst, await menuNow());
      await g2.up();
      await sleep(400);
      res.ctxFirst.released = (await menuNow()).open;
      await escape(page);
      await menuGone(page);
      //   as a plain MouseEvent (no pointer type) during the touch: the finger moving on does not scroll the page
      const g3 = await finger(page);
      await g3.down(pt);
      await sleep(250);
      res.plain = { prevented: await ctxAt(pt, 'mouse'), y: await ev(page, () => scrollY) };
      await sleep(50);
      await mark();
      for (let i = 1; i <= 6; i += 1) {
        await g3.move({ x: pt.x, y: pt.y - i * 8 });
        await sleep(20);
      }
      await sleep(150);
      Object.assign(res.plain, await menuNow(), { scrolled: (await ev(page, () => scrollY)) !== res.plain.y });
      await g3.up();
      await sleep(400);
      res.plain.released = (await menuNow()).open;
      await escape(page);
      await menuGone(page);
      // a tap without holding: the light switches (its own tap on the header), a display card opens its detail
      await bring(page, LIGHT_ON);
      await tapAt(page, mid(await ev(page, (id) => __x.rect(__x.card(id).querySelector('.light-card__name')), LIGHT_ON)));
      await sleep(400);
      res.tapLight = await ev(page, (id) => ({ menu: !!document.querySelector('.g-ctx'), state: __x.cardState(id), dialogs: __s.panels().length }), LIGHT_ON);
      const s = await bring(page, SENSOR);
      await tapAt(page, mid(s));
      await until(page, () => !!__s.panel());
      await settleAnimations(page);
      res.tapSensor = await ev(page, () => ({ menu: !!document.querySelector('.g-ctx'), windows: __s.panels().length, pres: __s.state().pres }));
      await escape(page);
      await until(page, () => !__s.panels().length);
      await settleAnimations(page);
      // after a menu (the finger lifted over its layer) the first tap on the media card's play button plays or pauses
      await bring(page, MEDIA);
      res.media = { before: await ev(page, (id) => __x.cardState(id), MEDIA) };
      const mh = await hold(page, mid(await ev(page, (id) => __x.rect(__x.card(id).querySelector('.media-card__info')), MEDIA)));
      await mh.up();
      res.media.menu = await menuOpen(page);
      await sleep(400);
      await settleAnimations(page);
      await tapAt(page, { x: 4, y: 40 });
      await menuGone(page);
      await settleAnimations(page);
      await tapAt(page, mid(await ev(page, (id) => __x.rect(__x.card(id).querySelector('.media-card__play-btn')), MEDIA)));
      await sleep(400);
      res.media.after = await ev(page, (id) => __x.cardState(id), MEDIA);
      await w.close();
      out.gesturesMenuTouch = res;
      const r = res.released;
      const oneMenu = (x) => x.prevented && x.hosts === 1 && x.same && x.open && x.released;
      out.gesturesMenuTouchOk = res.at350 === false && res.held.open && r.open && !r.closing && r.state === 'on' && r.dialogs === 0
        && r.lifted.attr === 'phone' && geometryOk(r, 390, 250) && r.role === 'menu' && labelOk(r.label)
        && itemsOk(r.items, ['details', 'turnOff', 'FAV', 'hide']) && r.itemH >= 45.5 && r.focus === 'menu'
        && res.holeClosed && res.afterHole.state === 'on' && res.afterHole.dialogs === 0
        && res.quietFocus.inCard && res.quietFocus.quiet && res.quietFocus.outline === 'none'
        && res.keyFocus.inCard && !res.keyFocus.quiet && res.keyFocus.outline !== 'none'
        && res.scrollClosed
        && oneMenu(res.timerFirst) && oneMenu(res.ctxFirst) && oneMenu(res.plain) && !res.plain.scrolled
        && !res.tapLight.menu && res.tapLight.state === 'off' && res.tapLight.dialogs === 0
        && !res.tapSensor.menu && res.tapSensor.windows === 1 && res.tapSensor.pres === 'sheet'
        && res.media.menu && ['playing', 'paused'].includes(res.media.before) && ['playing', 'paused'].includes(res.media.after)
        && res.media.after !== res.media.before;
    });

    // 3. Reduced motion: the card is not lifted (the hole = the card), the menu only fades, at most 200 ms (sampled as
    //    soon as the menu is there, while its fades run). Transitions of 0.01 ms are the global reduced-motion rule
    //    (global.css): instant, not movement.
    await block('gesturesMenuReduced', async () => {
      const w = await open('phone', 'glas', '/room/living_room', { reduce: true });
      await bring(w.page, LIGHT_ON);
      const f = await finger(w.page);
      await f.down(await pressPoint(w.page, LIGHT_ON));
      await w.page.waitForFunction(() => !!document.querySelector('.g-ctx'), null, { polling: 'raf', timeout: 3000 });
      const motion = await ev(w.page, () => [...document.querySelectorAll('.g-ctx, .g-ctx *, [data-g-lifted]')].flatMap((el) => el.getAnimations()
        .filter((a) => a.playState === 'running')
        .map((a) => ({ ms: Math.round((Number(a.effect.getComputedTiming().duration) || 0) * 100) / 100,
          props: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))]
            .filter((p) => !['offset', 'computedOffset', 'easing', 'composite'].includes(p)) }))));
      await sleep(200);
      await f.up();
      await sleep(400);
      await settleAnimations(w.page);
      const m = await ev(w.page, (id) => __x.menu(id), LIGHT_ON);
      await w.close();
      out.gesturesMenuReduced = { motion, lifted: m.lifted, hole: m.hole, card: m.card };
      const moving = motion.filter((a) => a.ms >= 1);
      out.gesturesMenuReducedOk = moving.length > 0 && moving.every((a) => a.ms <= 200 && a.props.every((p) => p === 'opacity'))
        && motion.every((a) => a.ms >= 1 || a.ms <= 0.01)
        && m.open && m.lifted.isCard && m.lifted.transform === 'none' && ['x', 'y', 'w', 'h'].every((k) => Math.abs(m.hole[k] - m.card[k]) <= 1);
    });

    // 4. The menu on the desktop: right click, the desktop's geometry (256 wide, rows of 44, the band before "Hide"),
    //    also for an off light whose grid cell an on light beside it makes taller; arrows and Home/End, Esc and Tab
    //    close with the focus back on the card and its ring; the context-menu key puts the focus on the first item; the
    //    actions of each kind of card; the actions work; Esc over an open inspector closes only the menu; the edit mode
    //    keeps the browser's menu.
    await block('gesturesMenuDesktop', async () => {
      const res = {};
      const w = await open('desktop', 'glas', '/room/living_room');
      const page = w.page;
      const m = await rightClick(page, LIGHT_ON);
      res.menu = m;
      const keys = [];
      for (const k of ['ArrowDown', 'ArrowDown', 'End', 'Home', 'ArrowUp']) {
        await page.keyboard.press(k);
        keys.push(await ev(page, () => __x.menu().focus));
      }
      res.keys = keys;
      await escape(page);
      res.escape = { gone: await menuGone(page), focus: await ev(page, (id) => __x.focusOn(id), LIGHT_ON), ring: await focusRing(page, LIGHT_ON) };
      await rightClick(page, LIGHT_ON);
      await page.keyboard.press('Tab');
      res.tab = { gone: await menuGone(page), focus: await ev(page, (id) => __x.focusOn(id), LIGHT_ON) };
      // the context-menu key on the focused card: the focus on the first item
      await ev(page, (id) => __x.card(id).querySelector('[tabindex]:not([tabindex="-1"]), button').focus(), LIGHT_ON);
      await page.keyboard.press('ContextMenu');
      await menuOpen(page);
      res.key = await ev(page, () => __x.menu().focus);
      await escape(page);
      await menuGone(page);
      // the actions work: off and on again, favourites and back
      await rightClick(page, LIGHT_ON);
      await clickItem(page, DE['glas.context.turnOff']);
      res.turnedOff = await ev(page, (id) => __x.cardState(id), LIGHT_ON);
      const back = await rightClick(page, LIGHT_ON);
      res.offItems = back.items;
      await clickItem(page, DE['glas.context.turnOn']);
      res.turnedOn = await ev(page, (id) => __x.cardState(id), LIGHT_ON);
      const fav = await rightClick(page, LIGHT_ON);
      await clickItem(page, fav.items[2]);
      res.favItems = [fav.items[2], (await rightClick(page, LIGHT_ON)).items[2]];
      await clickItem(page, res.favItems[1]);
      // Esc with an inspector under the menu closes only the menu
      const s = await bring(page, SENSOR);
      await page.mouse.click(s.x + s.w / 2, s.y + s.h / 2);
      await until(page, () => !!__s.panel());
      await settleAnimations(page);
      await rightClick(page, LIGHT_ON);
      await escape(page);
      res.overInspector = { gone: await menuGone(page), windows: await ev(page, () => __x.windows().list.map((x) => x.pres)) };
      await escape(page);
      await until(page, () => !__s.panels().length);
      // the actions of each kind of card (K58: no state action for climate, media, lock, garage door)
      const kinds = [['/room/living_room', LIGHT_OFF, ['details', 'turnOn', 'FAV', 'hide']],
        ['/room/living_room', SENSOR, ['details', 'FAV', 'hide']], ['/room/living_room', 'climate.living_room', ['details', 'FAV', 'hide']],
        ['/room/living_room', 'media_player.living_room_tv', ['details', 'FAV', 'hide']],
        ['/room/kitchen', 'switch.coffee_machine', ['details', 'turnOn', 'FAV', 'hide']],
        ['/room/hallway', 'lock.front_door', ['details', 'FAV', 'hide']], ['/room/garage', 'cover.garage_door', ['details', 'FAV', 'hide']]];
      res.kinds = {};
      for (const [path, id, want] of kinds) {
        if (!(await ev(page, (p) => location.pathname === p, path))) {
          await ev(page, (p) => { history.pushState({}, '', p); dispatchEvent(new PopStateEvent('popstate')); }, path);
          await until(page, (e) => !!__x.card(e), id, 6000);
          await settleAnimations(page);
        }
        const k = await rightClick(page, id);
        res.kinds[id] = { items: k.items, ok: itemsOk(k.items, want) };
        if (id === LIGHT_OFF) {
          res.offLight = { geometry: geometryOk(k, 1440, 256), cellTaller: Math.round(k.cell.h - k.card.layoutH), hole: k.hole, card: k.card };
        }
        await escape(page);
        await menuGone(page);
      }
      // "Hide" takes the card off the page
      await ev(page, () => { history.pushState({}, '', '/room/living_room'); dispatchEvent(new PopStateEvent('popstate')); });
      await until(page, (e) => !!__x.card(e), SENSOR_2, 6000);
      await rightClick(page, SENSOR_2);
      await clickItem(page, DE['glas.context.hide']);
      res.hidden = await ev(page, (id) => !__x.card(id), SENSOR_2);
      // the edit mode keeps the browser's own menu (dragging starts with a press there)
      await page.locator('.g-edit-capsule, .edit-toggle').filter({ visible: true }).first().click();
      await sleep(300);
      await ev(page, () => {
        window.__ctx = [];
        addEventListener('contextmenu', (e) => window.__ctx.push(e.defaultPrevented));
      });
      const e = await bring(page, LIGHT_ON);
      await page.mouse.click(e.x + e.w / 2, e.y + e.h / 2, { button: 'right' });
      await sleep(400);
      res.editMode = await ev(page, () => ({ menu: !!document.querySelector('.g-ctx'), prevented: window.__ctx }));
      await w.close();
      out.gesturesMenuDesktop = res;
      out.gesturesMenuDesktopOk = res.menu.lifted.attr === 'desktop' && geometryOk(res.menu, 1440, 256) && res.menu.itemH >= 43.5
        && res.menu.bandBeforeHide && res.menu.focus === 'menu' && itemsOk(res.menu.items, ['details', 'turnOff', 'FAV', 'hide'])
        && JSON.stringify(res.keys) === JSON.stringify([0, 1, 3, 0, 3])
        && res.escape.gone && res.escape.focus && res.escape.ring.inCard && !res.escape.ring.quiet && res.escape.ring.outline !== 'none'
        && res.tab.gone && res.tab.focus && res.key === 0
        && res.turnedOff === 'off' && itemsOk(res.offItems, ['details', 'turnOn', 'FAV', 'hide']) && res.turnedOn === 'on'
        && res.favItems[0] !== res.favItems[1] && res.favItems.every((x) => FAV.includes(x))
        && res.overInspector.gone && JSON.stringify(res.overInspector.windows) === '["inspector"]'
        && Object.values(res.kinds).every((k) => k.ok) && !!res.offLight && res.offLight.geometry && res.offLight.cellTaller > 20
        && res.hidden
        && !res.editMode.menu && res.editMode.prevented.length === 1 && res.editMode.prevented[0] === false;
    });

    // 4b. What else closes the menu on the desktop: a click on the dim layer (the card gets the focus without a ring), a
    //     right click on it (and never the browser's menu over it), anything that moves the card (the page above grows,
    //     the card itself grows) and a window opening over it (from a script; at 1000 px the detail is a dialog) — Esc
    //     then closes that window.
    await block('gesturesMenuClose', async () => {
      const res = {};
      const w = await open('desktop', 'glas', '/room/living_room');
      const page = w.page;
      const outside = { x: 120, y: 900 };
      await rightClick(page, LIGHT_ON);
      await page.mouse.click(outside.x, outside.y);
      res.dim = { gone: await menuGone(page), ring: await focusRing(page, LIGHT_ON) };
      await rightClick(page, LIGHT_ON);
      await ev(page, () => {
        window.__ctx = [];
        addEventListener('contextmenu', (e) => window.__ctx.push(e.defaultPrevented));
      });
      await page.mouse.click(outside.x, outside.y, { button: 'right' });
      res.rightDim = { gone: await menuGone(page), prevented: await ev(page, () => window.__ctx) };
      await rightClick(page, LIGHT_ON);
      await ev(page, (id) => {
        const spacer = Object.assign(document.createElement('div'), { id: '__spacer' });
        spacer.style.height = '120px';
        __x.card(id).closest('.room-page__card-grid').before(spacer);
      }, LIGHT_ON);
      res.pageGrew = await menuGone(page);
      await ev(page, () => document.getElementById('__spacer').remove());
      await rightClick(page, LIGHT_ON);
      await ev(page, (id) => { __x.card(id).querySelector('.card').style.paddingBottom = '60px'; }, LIGHT_ON);
      res.cardGrew = await menuGone(page);
      await ev(page, (id) => { __x.card(id).querySelector('.card').style.removeProperty('padding-bottom'); }, LIGHT_ON);
      await page.setViewportSize({ width: 1000, height: 1000 });
      await sleep(300);
      await rightClick(page, LIGHT_ON);
      await ev(page, (id) => __x.card(id).querySelector('.card').click(), SENSOR);
      res.windowOver = { gone: await menuGone(page), window: await until(page, () => !!__s.panel()) };
      await settleAnimations(page);
      res.windowOver.pres = await ev(page, () => __s.state().pres);
      await escape(page);
      res.windowOver.closed = await until(page, () => !__s.panels().length);
      await w.close();
      out.gesturesMenuClose = res;
      out.gesturesMenuCloseOk = res.dim.gone && res.dim.ring.inCard && res.dim.ring.quiet && res.dim.ring.outline === 'none'
        && res.rightDim.gone && res.rightDim.prevented.length === 1 && res.rightDim.prevented[0] === true
        && res.pageGrew && res.cardGrew
        && res.windowOver.gone && res.windowOver.window && res.windowOver.pres === 'dialog' && res.windowOver.closed;
    });

    // 5. Swipe rows in the lights sheet (K59): a plain tap on a closed row still switches the light (B4); below the
    //    threshold the row springs back, past it it rests open at the action's width, never further and never running
    //    the action by pulling through; the action is not focusable and hidden from screen readers; one row open at a
    //    time; a tap on the open row closes it without switching; scrolling closes; the action runs on a tap; the twin
    //    (the row's switch) works from the keyboard on an open row; a light that is off has no action.
    await block('gesturesSwipeLights', async () => {
      const res = {};
      const w = await open('phone', 'glas', '/');
      const page = w.page;
      await reach(page, '.summary-chip[aria-label^="lights:"]');
      await until(page, () => !!document.querySelector('.modal-body .lights-modal__row'));
      await settleAnimations(page);
      const SEL = '.modal-body .lights-modal__row';
      const find = async (text) => (await rows(page, SEL)).find((r) => r.text === text);
      const all = await rows(page, SEL);
      res.count = { rows: all.length, swipe: all.filter((r) => r.swipe).length };
      const lit = all.filter((r) => r.on);
      const [a, b] = lit;
      // a plain tap on a closed row still switches its light (B4): off, then on again
      const tapRow = async (text) => {
        const r = await find(text);
        await tapAt(page, { x: r.x + 60, y: r.y + r.h / 2 });
        await sleep(400);
        await settleAnimations(page);
        return find(text);
      };
      const t1 = await tapRow(a.text);
      const t2 = await tapRow(a.text);
      res.tap = { off: !t1.on && t1.state === 'closed' && t1.moved === 0, on: t2.on && t2.state === 'closed' && t2.moved === 0 };
      await swipe(page, a, -30);
      res.below = await find(a.text);
      await swipe(page, a, -70);
      res.open = await find(a.text);
      await swipe(page, b, -70);
      res.second = { a: await find(a.text), b: await find(b.text) };
      // a tap on the open row closes it, the light stays on
      const bo = await find(b.text);
      await tapAt(page, { x: bo.x + 60, y: bo.y + bo.h / 2 });
      await sleep(400);
      await settleAnimations(page);
      res.tapOpen = await find(b.text);
      // scrolling the sheet closes
      await swipe(page, a, -70);
      await ev(page, () => { __s.panel().querySelector('.modal-body').scrollTop += 40; });
      await sleep(400);
      await settleAnimations(page);
      res.scrolled = await find(a.text);
      await ev(page, () => { __s.panel().querySelector('.modal-body').scrollTop = 0; });
      await sleep(200);
      // pulling through: rests open at its width, the light stays on
      const a2 = await find(a.text);
      await swipe(page, a2, -300, { ms: 300 });
      res.through = await find(a.text);
      // the action runs on a tap
      const ao = await find(a.text);
      await tapAt(page, { x: ao.right + ao.moved / 2, y: ao.y + ao.h / 2 });
      await sleep(500);
      await settleAnimations(page);
      res.action = await find(a.text);
      // the twin in the row works from the keyboard on an open row: Space on the switch turns the light off, the row closes
      await swipe(page, await find(b.text), -70);
      res.keyOpen = (await find(b.text)).state;
      res.keyFocus = await ev(page, (text) => {
        const row = [...document.querySelectorAll('.modal-body .lights-modal__row')]
          .find((r) => r.querySelector('.lights-modal__name')?.textContent.trim().slice(0, 40) === text);
        const input = row && row.querySelector('input[type="checkbox"]');
        if (input) input.focus();
        return !!input && document.activeElement === input;
      }, b.text);
      await page.keyboard.press('Space');
      await sleep(500);
      await settleAnimations(page);
      res.key = await find(b.text);
      // a light that is off: no swipe
      const off = (await rows(page, SEL)).find((r) => !r.on);
      await swipe(page, off, -80);
      res.off = await find(off.text);
      res.offActs = await ev(page, () => document.querySelectorAll('.g-swipe-act').length);
      await w.close();
      out.gesturesSwipeLights = res;
      out.gesturesSwipeLightsOk = res.count.rows > 2 && res.count.swipe === res.count.rows && lit.length >= 2
        && res.tap.off && res.tap.on
        && res.below.state === 'closed' && res.below.moved === 0 && res.below.on
        && res.open.state === 'open' && near(res.open.moved, 88) && res.open.on && res.open.act && res.open.act.hidden === 'true'
        && res.open.act.tab === -1 && res.open.act.focusables === 0 && res.open.act.text === DE['glas.swipe.off']
        && res.second.a.state === 'closed' && res.second.b.state === 'open'
        && res.tapOpen.state === 'closed' && res.tapOpen.on && res.scrolled.state === 'closed'
        && res.through.state === 'open' && near(res.through.moved, 88) && res.through.on
        && res.action.state === 'closed' && !res.action.on
        && res.keyOpen === 'open' && res.keyFocus && res.key.state === 'closed' && !res.key.on
        && res.off.state !== 'open' && res.off.moved === 0 && res.offActs === 0;
    });

    // 6. The other swipe rows: notifications (sheet on the phone with the hint, popover on the desktop with the mouse:
    //    96 wide), garage and locks — closed doors and locked locks have no action (never open or unlock by swiping); an
    //    open door closes, an unlocked lock locks.
    await block('gesturesSwipeOthers', async () => {
      const res = {};
      const n = await open('phone', 'glas', '/');
      await openNotes(n.page);
      await until(n.page, () => !!document.querySelector('.modal-panel [data-g-swipe]'));
      await settleAnimations(n.page);
      const notes = await rows(n.page, '.modal-panel [data-g-swipe]');
      await swipe(n.page, notes[0], -100);
      const opened = (await rows(n.page, '.modal-panel [data-g-swipe]'))[0];
      await tapAt(n.page, { x: opened.right + opened.moved / 2, y: opened.y + opened.h / 2 });
      await sleep(600);
      await settleAnimations(n.page);
      res.notes = { before: notes.length, opened: { state: opened.state, moved: opened.moved, text: opened.act && opened.act.text },
        after: (await rows(n.page, '.modal-panel [data-g-swipe]')).length,
        hint: await ev(n.page, () => { const e = document.querySelector('.modal-panel .g-notes__hint'); return !!e && __g.visible(e) && e.textContent; }) };
      await n.close();

      const d = await open('desktop', 'glas', '/');
      await d.page.locator('.header-cluster .notifications-trigger').click();
      await until(d.page, () => !!document.querySelector('.notifications-panel [data-g-swipe]'));
      await settleAnimations(d.page);
      const pop = await rows(d.page, '.notifications-panel [data-g-swipe]');
      await swipe(d.page, pop[0], -40, { at: 0.5 });
      const short = (await rows(d.page, '.notifications-panel [data-g-swipe]'))[0];
      await swipe(d.page, pop[0], -60, { at: 0.5 });
      const desk = (await rows(d.page, '.notifications-panel [data-g-swipe]'))[0];
      res.popover = { short: short.state, state: desk.state, moved: desk.moved, popover: await ev(d.page, () => !!document.querySelector('.notifications-panel')),
        rows: (await rows(d.page, '.notifications-panel [data-g-swipe]')).length,
        hint: await ev(d.page, () => { const e = document.querySelector('.notifications-panel .g-notes__hint'); return !!e && __g.visible(e); }) };
      await d.close();

      // garage: closed → no action; open it (confirmation), then swipe "Close"
      const g = await open('phone', 'glas', '/');
      await reach(g.page, '.summary-chip[aria-label^="garage:"]');
      await until(g.page, () => !!document.querySelector('.modal-panel .garage-row'));
      await settleAnimations(g.page);
      const GSEL = '.modal-panel .garage-row';
      const closedRow = (await rows(g.page, GSEL))[0];
      await swipe(g.page, closedRow, -100, { at: 0.3 });
      res.garageClosed = { row: (await rows(g.page, GSEL))[0], acts: await ev(g.page, () => document.querySelectorAll('.g-swipe-act').length) };
      await reach(g.page, '.modal-body .garage-row__btn--open');
      await until(g.page, () => __s.panels().length === 2);
      await settleAnimations(g.page);
      await reach(g.page, '.garage-confirm__actions .btn--danger');
      await until(g.page, () => __s.panels().length === 1);
      await settleAnimations(g.page);
      const openRow = (await rows(g.page, GSEL))[0];
      await swipe(g.page, openRow, -100, { at: 0.3 });
      const gs = (await rows(g.page, GSEL))[0];
      await tapAt(g.page, { x: gs.right + gs.moved / 2, y: gs.y + gs.h / 2 });
      await sleep(500);
      await settleAnimations(g.page);
      res.garage = { opened: { state: gs.state, moved: gs.moved, text: gs.act && gs.act.text },
        // closed again: "Open" can act, "Close" cannot
        closedAgain: await ev(g.page, () => !document.querySelector('.modal-panel .garage-row__btn--open').disabled
          && document.querySelector('.modal-panel .garage-row__btn--close').disabled),
        windows: await ev(g.page, () => __s.panels().length) };
      await g.close();

      // locks: locked → no action; unlock (confirmation), then swipe "Lock"
      const k = await open('phone', 'glas', '/');
      await reach(k.page, '.summary-chip[aria-label^="locks:"]');
      await until(k.page, () => !!document.querySelector('.modal-panel .locks-row'));
      await settleAnimations(k.page);
      const KSEL = '.modal-panel .locks-row';
      const locked = (await rows(k.page, KSEL))[0];
      await swipe(k.page, locked, -100, { at: 0.3 });
      res.lockLocked = { row: (await rows(k.page, KSEL))[0], acts: await ev(k.page, () => document.querySelectorAll('.g-swipe-act').length) };
      await reach(k.page, '.modal-body .locks-row__btn--unlock');
      await until(k.page, () => __s.panels().length === 2);
      await settleAnimations(k.page);
      await reach(k.page, '.lock-confirm__actions .btn--danger');
      await until(k.page, () => __s.panels().length === 1);
      await settleAnimations(k.page);
      const unlocked = (await rows(k.page, KSEL))[0];
      await swipe(k.page, unlocked, -100, { at: 0.3 });
      const ks = (await rows(k.page, KSEL))[0];
      await tapAt(k.page, { x: ks.right + ks.moved / 2, y: ks.y + ks.h / 2 });
      await sleep(500);
      await settleAnimations(k.page);
      res.lock = { opened: { state: ks.state, moved: ks.moved, text: ks.act && ks.act.text },
        unlockEnabled: await ev(k.page, () => !document.querySelector('.modal-panel .locks-row__btn--unlock').disabled),
        windows: await ev(k.page, () => __s.panels().length) };
      await k.close();
      out.gesturesSwipeOthers = res;
      out.gesturesSwipeOthersOk = res.notes.before === 3 && res.notes.opened.state === 'open' && near(res.notes.opened.moved, 104)
        && res.notes.opened.text === DE['glas.swipe.dismiss'] && res.notes.after === 2 && res.notes.hint === DE['glas.swipe.hint']
        && res.popover.short === 'closed' && res.popover.state === 'open' && near(res.popover.moved, 96) && res.popover.popover
        && res.popover.rows === 3
        && !res.popover.hint
        && res.garageClosed.row.state !== 'open' && res.garageClosed.row.moved === 0 && res.garageClosed.acts === 0
        && res.garage.opened.state === 'open' && near(res.garage.opened.moved, 104) && res.garage.opened.text === DE['garage.close']
        && res.garage.closedAgain && res.garage.windows === 1
        && res.lockLocked.row.state !== 'open' && res.lockLocked.row.moved === 0 && res.lockLocked.acts === 0
        && res.lock.opened.state === 'open' && near(res.lock.opened.moved, 112) && res.lock.opened.text === DE['security.locks.lock']
        && res.lock.unlockEnabled && res.lock.windows === 1;
    });

    // 6b. A switch to Klassisch while a row is open (an admin on another device switches the style for everyone): the
    //     row in the bell's panel, which Klassisch keeps open, is back at its place with nothing of Glas on it or in the
    //     document, and its children are the same nodes (a switch of the style does not mount them anew).
    await block('gesturesSwipeStyle', async () => {
      const w = await open('desktop', 'glas', '/settings');
      const page = w.page;
      const SEL = '.notifications-panel [data-g-swipe]';
      await page.locator('.header-cluster .notifications-trigger').click();
      await until(page, (q) => !!document.querySelector(q), SEL);
      await settleAnimations(page);
      await swipe(page, (await rows(page, SEL))[0], -60, { at: 0.5 });
      const opened = (await rows(page, SEL))[0];
      await ev(page, () => { window.__rowKid = document.querySelector('.notifications-panel .notif-row').firstElementChild; });
      await ev(page, () => document.querySelector('[data-glas-style-option="classic"]').click());
      await sleep(300);
      const after = await ev(page, () => {
        const row = document.querySelector('.notifications-panel .notif-row');
        return { style: document.documentElement.getAttribute('data-style'), popover: !!document.querySelector('.notifications-panel'),
          row: !!row, transform: row && getComputedStyle(row).transform, inline: row && row.getAttribute('style'),
          sameKid: !!row && row.firstElementChild === window.__rowKid, acts: document.querySelectorAll('.g-swipe-act').length,
          remnants: __g.remnants() };
      });
      await w.close();
      out.gesturesSwipeStyle = { opened: { state: opened.state, moved: opened.moved }, after };
      out.gesturesSwipeStyleOk = opened.state === 'open' && opened.moved > 50 && after.style === 'classic' && after.popover && after.row
        && after.transform === 'none' && !after.inline && after.sameKid && after.acts === 0 && after.remnants.count === 0;
    });

    // 7. The inspector (K60) at 1440: the right panel 420 wide, not modal (no scrim, no scroll lock, the page answers
    //    taps and scrolls), under the context menu; the page makes room; a popup of the page beside it (the bell's
    //    panel) takes Esc first; a tap on another tile swaps the content in the same panel; Esc closes it and its ghost
    //    slides out; asked for from the keyboard (the context-menu key, "Details") by one card and then by another, its
    //    Esc gives the focus to the card that asked last; a route change closes it; a chip's dialog lies
    //    above it and makes it inert, and a request for the detail (a press on a tile) then brings it up on top, whose
    //    Esc gives the focus to the chip's dialog; the confirmation from the card in it is a page in it.
    await block('gesturesInspector', async () => {
      const res = {};
      const w = await open('desktop', 'glas', '/room/living_room');
      const page = w.page;
      const s = await bring(page, SENSOR);
      await page.mouse.click(s.x + s.w / 2, s.y + s.h / 2);
      await until(page, () => !!__s.panel());
      await settleAnimations(page);
      res.open = await ev(page, () => __x.windows());
      // the page beside answers a tap and scrolls
      res.page = await ev(page, (id) => {
        const card = __x.card(id);
        const b = card.getBoundingClientRect();
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        const y = scrollY;
        window.scrollBy({ top: y > 200 ? -120 : 120, behavior: 'instant' });
        const scrolled = scrollY !== y;
        window.scrollTo({ top: y, behavior: 'instant' });
        return { hit: !!hit && card.contains(hit), scrolled };
      }, SENSOR_2);
      await sleep(200);
      // the bell's panel beside it takes Esc: it closes and gives the bell the focus, the inspector stays
      await page.locator('.header-cluster .notifications-trigger').click();
      res.bell = { popover: await until(page, () => !!document.querySelector('.notifications-panel')) };
      await settleAnimations(page);
      await page.keyboard.press('Escape');
      await sleep(150);
      await settleAnimations(page);
      Object.assign(res.bell, await ev(page, () => ({ after: !!document.querySelector('.notifications-panel'),
        windows: __x.windows().list.map((x) => x.pres),
        bellFocus: document.activeElement === document.querySelector('.header-cluster .notifications-trigger') })));
      // swap: another tile, the same panel
      await ev(page, () => { window.__panel = __s.panel(); });
      const s2 = await bring(page, SENSOR_2);
      await page.mouse.click(s2.x + s2.w / 2, s2.y + s2.h / 2);
      await sleep(600);
      await settleAnimations(page);
      res.swap = { ...(await ev(page, () => __x.windows())), same: await ev(page, () => __s.panel() === window.__panel) };
      // Esc: closes, the ghost slides out to the right
      await page.keyboard.press('Escape');
      await sleep(60);
      res.ghost = await ev(page, () => {
        const g = document.querySelector('.g-sheet-ghost');
        const p = g && g.querySelector('.modal-panel');
        return g ? { role: !!g.querySelector('[role="dialog"]'),
          moves: p.getAnimations().map((a) => a.effect.getKeyframes().map((k) => k.transform).join(' → ')) } : null;
      });
      await until(page, () => !document.querySelector('.g-sheet-ghost'), null, 3000);
      res.closed = await ev(page, () => __x.windows());
      // the keyboard's way to the detail, from one card and then from another: Esc in it gives the focus to the second
      const keyDetail = async (id) => {
        await ev(page, (e) => __x.card(e).querySelector('[tabindex]:not([tabindex="-1"]), button').focus(), id);
        await page.keyboard.press('ContextMenu');
        await menuOpen(page);
        await page.keyboard.press('Enter');
        await menuGone(page);
        await until(page, () => !!__s.panel());
        await settleAnimations(page);
        return ev(page, () => __x.windows().list.map((x) => `${x.pres}:${x.title}`).join());
      };
      res.swapFocus = { titles: [await keyDetail(LIGHT_ON), await keyDetail(LIGHT_OFF)] };
      res.swapFocus.inPanel = await ev(page, () => { __s.panel().focus(); return __s.panel().contains(document.activeElement); });
      await page.keyboard.press('Escape');
      await until(page, () => !__s.panels().length && !document.querySelector('.g-sheet-ghost'), null, 3000);
      Object.assign(res.swapFocus, await ev(page, ([a, b]) => ({ first: __x.focusOn(a), last: __x.focusOn(b),
        windows: __x.windows().list.length }), [LIGHT_ON, LIGHT_OFF]));
      // a route change closes it
      const t = await bring(page, SENSOR);
      await page.mouse.click(t.x + t.w / 2, t.y + t.h / 2);
      await until(page, () => !!__s.panel());
      await settleAnimations(page);
      await page.locator('.app-sidebar a[href="/"]').first().click();
      await until(page, () => location.pathname === '/' && !__s.panels().length, null, 6000);
      await until(page, () => !document.querySelector('.g-sheet-ghost'), null, 3000);
      res.route = await ev(page, () => __x.windows());
      // a chip's dialog over the inspector, then the detail asked for again (the keyboard's way: a click on the tile)
      await ev(page, () => { history.pushState({}, '', '/room/living_room'); dispatchEvent(new PopStateEvent('popstate')); });
      await until(page, (e) => !!__x.card(e), SENSOR, 6000);
      const u = await bring(page, SENSOR);
      await page.mouse.click(u.x + u.w / 2, u.y + u.h / 2);
      await until(page, () => !!__s.panel());
      await settleAnimations(page);
      await reach(page, '.summary-chip[aria-label^="lights:"]');
      await until(page, () => __s.panels().length === 2);
      await settleAnimations(page);
      res.chip = await ev(page, () => __x.windows());
      // a press on the tile (the origin GlasRuntime notes), then its click
      await ev(page, (id) => {
        const card = __x.card(id).querySelector('.card');
        const at = { bubbles: true, isPrimary: true, pointerType: 'mouse' };
        card.dispatchEvent(new PointerEvent('pointerdown', at));
        card.dispatchEvent(new PointerEvent('pointerup', at));
        card.click();
      }, SENSOR_2);
      await sleep(100);
      await settleAnimations(page);
      res.raised = await ev(page, () => __x.windows());
      await escape(page);
      res.raisedEsc = await ev(page, (id) => ({ ...__x.windows(), focusInChip: __s.panel() && __s.panel().contains(document.activeElement),
        onTile: __x.focusOn(id) }), SENSOR_2);
      await escape(page);
      await until(page, () => !__s.panels().length);
      await sleep(200);
      res.raisedEnd = await ev(page, () => __x.windows());
      await w.close();

      // the confirmation from the garage door's card in the inspector is a page in it
      const g = await open('desktop', 'glas', '/room/garage');
      await rightClick(g.page, 'cover.garage_door');
      await clickItem(g.page, DE['glas.context.details']);
      await until(g.page, () => !!__s.panel());
      await settleAnimations(g.page);
      res.garage = await ev(g.page, () => __x.windows());
      await g.page.locator('.modal-panel .garage-card__btn').click();
      await until(g.page, () => __s.panels().length === 2);
      await settleAnimations(g.page);
      res.confirm = await ev(g.page, () => __x.windows());
      await escape(g.page);
      res.confirmEsc = { ...(await ev(g.page, () => __x.windows())), focus: await ev(g.page, () => __g.desc(document.activeElement)) };
      await escape(g.page);
      await until(g.page, () => !__s.panels().length);
      await g.close();
      out.gesturesInspector = res;
      const insp = (x) => x.pres === 'inspector' && x.sheet === 'inspector' && x.modal === 'false' && x.z === '400' && !x.inert
        && near(x.rect.x, 1008) && near(x.rect.y, 12) && near(x.rect.w, 420) && near(x.rect.h, 976) && x.radius === '30px' && x.glass
        && !x.scrim;
      const o = res.open;
      const quiet = (x) => !x.inspector && !x.sheets && x.inert === 0 && x.list.length === 0 && x.overflow === 'visible';
      out.gesturesInspectorOk = o.list.length === 1 && insp(o.list[0]) && o.list[0].focusIn && o.inspector && !o.sheets
        && o.overflow === 'visible' && o.content > 0 && o.content <= 988.5 && o.head > 0 && o.head <= 988.5
        && res.page.hit && res.page.scrolled
        && res.bell.popover && !res.bell.after && JSON.stringify(res.bell.windows) === '["inspector"]' && res.bell.bellFocus
        && res.swap.list.length === 1 && insp(res.swap.list[0]) && res.swap.same && res.swap.list[0].title !== o.list[0].title
        && !!res.ghost && !res.ghost.role && res.ghost.moves.some((m) => /translateX\(460px\)/.test(m)) && quiet(res.closed)
        && /^inspector:/.test(res.swapFocus.titles[0]) && /^inspector:/.test(res.swapFocus.titles[1])
        && res.swapFocus.titles[0] !== res.swapFocus.titles[1] && res.swapFocus.inPanel && res.swapFocus.last && !res.swapFocus.first
        && res.swapFocus.windows === 0
        && quiet(res.route)
        && res.chip.list.length === 2 && res.chip.list[0].pres === 'inspector' && res.chip.list[0].inert && res.chip.list[1].pres === 'dialog'
        && res.chip.sheets
        && res.raised.list.length === 2 && res.raised.list[1].pres === 'dialog' && res.raised.list[1].title !== ''
        && res.raised.list[0].inert && res.raised.list[1].modal === 'true'
        && res.raisedEsc.list.length === 1 && res.raisedEsc.list[0].pres === 'dialog' && res.raisedEsc.focusInChip
        && !res.raisedEsc.onTile
        && quiet(res.raisedEnd)
        && res.garage.list.length === 1 && insp(res.garage.list[0])
        && res.confirm.list.length === 2 && res.confirm.list[1].pres === 'page' && res.confirm.list[1].back
        && near(res.confirm.list[1].rect.x, 1008) && near(res.confirm.list[1].rect.w, 420) && res.confirm.list[0].pushed
        && res.confirm.list[0].inert
        && res.confirmEsc.list.length === 1 && insp(res.confirmEsc.list[0]) && /garage-card__btn/.test(res.confirmEsc.focus);
    });

    // 8. Widths: 900–1099 the detail is a dialog, below 900 a sheet; a window that changes its width while the detail is
    //    open switches the presentation without a movement; reduced motion only fades the inspector in.
    await block('gesturesInspectorWidths', async () => {
      const res = {};
      const w = await open('desktop', 'glas', '/room/living_room');
      const page = w.page;
      const s = await bring(page, SENSOR);
      await page.mouse.click(s.x + s.w / 2, s.y + s.h / 2);
      await until(page, () => !!__s.panel());
      await settleAnimations(page);
      for (const [width, height] of [[1000, 900], [800, 900], [1300, 900]]) {
        await page.setViewportSize({ width, height });
        await sleep(120);
        const moving = await ev(page, () => __s.motion().filter((m) => m.props.some((p) => /transform|translate|clip/.test(p))).length);
        await settleAnimations(page);
        const x = await ev(page, () => __x.windows());
        res[width] = { pres: x.list.map((l) => l.pres), modal: x.list.map((l) => l.modal), inspector: x.inspector, sheets: x.sheets, moving };
      }
      await w.close();
      const r = await open('desktop', 'glas', '/room/living_room', { reduce: true });
      const t = await bring(r.page, SENSOR);
      await r.page.mouse.click(t.x + t.w / 2, t.y + t.h / 2);
      await sleep(60);
      res.reduced = await ev(r.page, () => __s.motion());
      await r.close();
      out.gesturesInspectorWidths = res;
      out.gesturesInspectorWidthsOk = JSON.stringify(res[1000].pres) === '["dialog"]' && res[1000].modal[0] === 'true' && res[1000].sheets
        && !res[1000].inspector && JSON.stringify(res[800].pres) === '["sheet"]' && res[800].sheets
        && JSON.stringify(res[1300].pres) === '["inspector"]' && res[1300].inspector && !res[1300].sheets
        && [1000, 800, 1300].every((k) => res[k].moving === 0)
        && res.reduced.length > 0 && res.reduced.every((m) => m.ms <= 200 && m.props.every((p) => p === 'opacity'));
    });

    out.gesturesPageErrors = pageErrors;
    return ran.every((k) => out[k + 'Ok']) && pageErrors.length === 0;
  }

  const near = (v, want, tol = 1) => typeof v === 'number' && Math.abs(v - want) <= tol;

  /** Helpers for the gesture checks in the page (`window.__x`); also evaluated into the documents of `shoot`. */
  function gestureHelpers() {
    const rect = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height, right: b.right, bottom: b.bottom };
    };
    const entityOf = (el) => {
      const key = Object.keys(el).find((k) => k.startsWith('__reactProps'));
      const kid = key && el[key].children;
      return (kid && kid.props && kid.props.entity) || null;
    };
    window.__x = {
      rect,
      /** The card wrapper of an entity on the page (not in a window). */
      card(id) {
        return [...document.querySelectorAll('.entity-card-press')].find((el) => !el.closest('.modal-backdrop')
          && el.getClientRects().length > 0 && (entityOf(el) || {}).entity_id === id) || null;
      },
      cardState(id) {
        const el = this.card(id);
        return el ? entityOf(el).state : null;
      },
      /** The focus is on the card of `id` or inside it. */
      focusOn(id) {
        const el = this.card(id);
        return !!el && el.contains(document.activeElement);
      },
      /** The focused element: in the card of `id`, quiet (given back without its ring by the menu), its outline. */
      focusRing(id) {
        const a = document.activeElement;
        return { inCard: this.focusOn(id), quiet: !!a && a.hasAttribute('data-g-quiet-focus'), visible: !!a && a.matches(':focus-visible'),
          outline: a ? getComputedStyle(a).outlineStyle : null, el: a ? a.className || a.tagName : null };
      },
      /** The open menu; with `id` also the card of that entity (its `.card`, found without the app's marks) and the
       *  card's wrapper (`cell`, a grid cell as tall as its row). */
      menu(id) {
        const host = document.querySelector('.g-ctx');
        if (!host) return { open: false };
        const menu = host.querySelector('.g-ctx__menu');
        const items = [...menu.querySelectorAll('[role="menuitem"]')];
        const band = menu.querySelector('.g-ctx__band');
        const lifted = document.querySelector('[data-g-lifted]');
        const last = items[items.length - 1];
        const label = menu.getAttribute('aria-label') || '';
        const wrap = id ? this.card(id) : null;
        const card = wrap && wrap.querySelector('.card');
        return {
          card: card ? { ...rect(card), layoutH: card.offsetHeight } : null, cell: wrap ? rect(wrap) : null,
          open: true, closing: host.classList.contains('g-ctx--closing'), role: menu.getAttribute('role'), label,
          items: items.map((b) => b.textContent.trim()), rect: rect(menu),
          itemH: Math.min(...items.map((b) => b.getBoundingClientRect().height)),
          bandBeforeHide: !!band && getComputedStyle(band).display !== 'none' && band.nextElementSibling === last
            && last.classList.contains('g-ctx__item--danger'),
          hole: rect(host.querySelector('.g-ctx__hole')), clip: getComputedStyle(host.querySelector('.g-ctx__dim')).clipPath.slice(0, 20),
          lifted: lifted ? { attr: lifted.getAttribute('data-g-lifted'), rect: rect(lifted), transform: getComputedStyle(lifted).transform,
            isCard: !!card && lifted === card } : null,
          focus: document.activeElement === menu ? 'menu' : items.indexOf(document.activeElement),
        };
      },
      rows(sel) {
        return [...document.querySelectorAll(sel)].filter((r) => r.getClientRects().length > 0).map((r) => {
          const t = getComputedStyle(r).transform;
          const act = r.querySelector(':scope > .g-swipe-act');
          const box = r.querySelector('input[type="checkbox"]');
          return {
            ...rect(r), swipe: r.hasAttribute('data-g-swipe'), state: r.getAttribute('data-g-swipe-state') || 'closed',
            moved: t && t !== 'none' ? Math.round(-new DOMMatrixReadOnly(t).e * 10) / 10 : 0,
            on: !!box && box.checked,
            act: act ? { hidden: act.getAttribute('aria-hidden'), tab: act.tabIndex,
              focusables: act.querySelectorAll('a, button, input, select, textarea, [tabindex]').length, text: act.textContent.trim() } : null,
            text: (r.querySelector('.lights-modal__name, .notif-row__title, .g-notes__title, .garage-row__name, .locks-row__name')
              || r).textContent.trim().slice(0, 40),
          };
        });
      },
      /** The windows from the bottom up and the page around them. */
      windows() {
        const panels = [...document.querySelectorAll('.modal-panel[role="dialog"]')].filter((p) => !p.closest('.g-sheet-ghost'))
          .sort((a, b) => Number(a.parentElement.style.zIndex) - Number(b.parentElement.style.zIndex));
        const shown = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
        /** Where a box ends on screen: its right edge, cut by the scrollers around it (the header's chip row). */
        const seen = (el) => {
          let r = el.getBoundingClientRect().right;
          for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
            if (getComputedStyle(a).overflowX !== 'visible') r = Math.min(r, a.getBoundingClientRect().right);
          }
          return r;
        };
        // the page's own boxes: its cards, chips and the header's controls (their wrappers reach to the edge of the page)
        const right = (sel) => Math.max(0, ...[...document.querySelectorAll(sel)].filter((el) => shown(el) && !el.closest('.modal-backdrop'))
          .map(seen));
        return {
          list: panels.map((p) => {
            const cs = getComputedStyle(p);
            const scrim = p.parentElement.querySelector(':scope > .g-sheet-scrim');
            return {
              pres: p.parentElement.getAttribute('data-g-pres'), sheet: p.getAttribute('data-g-sheet'), modal: p.getAttribute('aria-modal'),
              z: p.parentElement.style.zIndex, inert: p.parentElement.inert, rect: rect(p), radius: cs.borderRadius,
              glass: [cs.backdropFilter, cs.webkitBackdropFilter].some((v) => v && v !== 'none'),
              scrim: !!scrim && getComputedStyle(scrim).display !== 'none',
              title: ((p.querySelector('.g-sheet-header__title') || {}).textContent || '').trim(),
              back: !!p.querySelector('.g-sheet-header__back'), pushed: p.hasAttribute('data-g-pushed'),
              focusIn: p.contains(document.activeElement),
            };
          }),
          inspector: document.documentElement.hasAttribute('data-g-inspector'),
          sheets: document.documentElement.hasAttribute('data-g-sheets'),
          overflow: getComputedStyle(document.body).overflowY,
          content: right('.app-content .card, .app-content .entity-card-press, .app-content .summary-chip'),
          head: right('.header-cluster > *'),
          inert: document.querySelectorAll('[inert]').length,
        };
      },
    };
  }

  return { scenes, gesturesChecks };
};
