// [fork] glas-checks-home.cjs — the overview of Glas stage 4 for glas-shots.cjs (docs/glas/PLAN-ETAPPE-4.md §3):
// scenes with a state the demo does not have on its own (`shoot --scenes home-hints,home-edit,energy-bubble,
// detail-light`, taken at viewport size) and `checks --part home`. glas-shots.cjs loads this file with its helpers; it
// is not run on its own.
//
// The checks run in real time like the gesture checks (glas-checks-gestures.cjs) and change the demo through
// `window.__hapulseDemo` (apps/dashboard/src/ha/demoControl.ts): a hint appears and goes, a scene member changes, a
// room gets a picture, an entity's detail opens. Blocks without "Glas" in their comment run in both styles.

/* global __h -- the overview checks' helpers in the page (homeHelpers below) */

module.exports = function home(h) {
  const { DE, DEVICES, ABORTED, run, settleAnimations, isGlas, seedScript } = h;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const LOCK = 'lock.front_door';
  const WINDOW = 'binary_sensor.bedroom_window';
  const DOOR = 'binary_sensor.front_door';
  const GARAGE = 'cover.garage_door';
  const ALARM = 'alarm_control_panel.home';
  const BIN = 'sensor.grauetonne_komplett';
  const BLINDS = 'cover.bedroom_blinds';
  const CLIMATE = 'climate.living_room';
  const LIGHT = 'light.living_room_ceiling';
  const ROOM_LIGHTS = ['light.living_room_ceiling', 'light.living_room_floor_lamp', 'light.living_room_shelf'];
  const SCENE_NAME = 'Movie Night'; // scene.living_room_movie
  const MEMBER = 'light.living_room_shelf';
  const CHECK_WINDOW = 'binary_sensor.check_window';
  const CHECK_LEAK = 'binary_sensor.check_leak';
  const AREAS = ['living_room', 'kitchen', 'bedroom', 'office', 'bathroom', 'hallway', 'garage'];
  // the scenes card and the devices card show favourites
  const FAVORITES = ['scene.living_room_movie', 'scene.living_room_relax', 'scene.bedroom_sleep', 'scene.kitchen_cooking',
    'light.living_room_ceiling', 'light.living_room_floor_lamp', 'light.kitchen_ceiling', 'light.office_desk',
    'switch.coffee_machine', 'media_player.living_room_tv'];
  const PICTURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  const fill = (key, vars) => Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), DE[key]);
  const plural = (key, n) => fill(`${key}.${n === 1 ? 'one' : 'other'}`, { count: n });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const lower = (list) => list.map((s) => String(s).toLowerCase());

  // ---- shared steps (scenes and checks) ----

  const demo = (page) => page.evaluate(() => !!window.__hapulseDemo);
  const patch = (page, id, p) => page.evaluate(([i, q]) => { window.__hapulseDemo.patch(i, q); }, [id, p]);
  /** The bin's next pickup tomorrow (local date of the page's clock). */
  const binTomorrow = (page) => page.evaluate((id) => {
    const d = new Date(Date.now() + 86400000);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    window.__hapulseDemo.patch(id, { attributes: { daysTo: 1, upcoming: [{ date, type: 'Graue Tonne', icon: 'mdi:trash-can' }] } });
  }, BIN);
  /** Scroll a section of the overview into the middle of the screen. */
  async function bringSection(page, id) {
    const found = await page.evaluate((s) => {
      const el = document.querySelector(`.home-page [data-section="${s}"]`);
      if (!el) return false;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      return true;
    }, id);
    // the Glas runtime reads the scroll position in requestAnimationFrame
    await run(page, 100);
    await settleAnimations(page);
    return found;
  }

  // ---- scenes (taken on the paused clock of `shoot`; these steps only use `run`) ----

  const scenes = {
    // a lock, a window and tomorrow's bin: the hints card (phone: a list, from 900 px: capsules)
    'home-hints': { path: '/', act: async (page) => {
      if (!(await demo(page))) return 'no demo control';
      await patch(page, LOCK, { state: 'unlocked' });
      await patch(page, WINDOW, { state: 'on' });
      await binTomorrow(page);
      await run(page, 100);
      await settleAnimations(page);
      return (await page.evaluate(() => document.querySelectorAll('.hint-row').length)) === 3 ? '' : 'hints missing';
    } },
    // edit mode: Glas shows the bar over every card, Klassisch its badges; the hints card is empty
    'home-edit': { path: '/', act: async (page) => {
      const done = await page.evaluate(() => {
        const b = document.querySelector('.home-page__edit-toggle');
        if (b) b.click();
        return !!b;
      });
      await run(page, 300);
      await settleAnimations(page);
      return done ? '' : 'no edit toggle';
    } },
    // the energy card with a bar picked (Glas)
    'energy-bubble': { path: '/', act: async (page) => {
      if (!(await isGlas(page))) return 'Glas only';
      if (!(await bringSection(page, 'energy'))) return 'no energy card';
      const bars = page.locator('.g-energy__bars button.g-energy__bar');
      const n = await bars.count();
      if (n < 2) return 'no bars';
      await bars.nth(n - 2).click();
      await run(page, 100);
      await settleAnimations(page);
      return (await page.evaluate(() => !!document.querySelector('.g-energy__bubble'))) ? '' : 'no bubble';
    } },
    // a light's detail (Glas: the capsule; from 1100 px the inspector)
    'detail-light': { path: '/', act: async (page) => {
      if (!(await demo(page))) return 'no demo control';
      await page.evaluate((id) => window.__hapulseDemo.openDetail(id), LIGHT);
      await run(page, 300);
      await settleAnimations(page);
      return (await page.evaluate(() => !!document.querySelector('[role="dialog"]'))) ? '' : 'no detail';
    } },
  };
  for (const sc of Object.values(scenes)) sc.viewport = true;

  // ---- checks --part home ----

  async function homeChecks(browser, url, out, opts = {}) {
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
    const entity = (page, id) => ev(page, (i) => window.__hapulseDemo.entity(i), id);

    /** A real-time document of the demo. */
    const open = async (device, style, p = '/', extra = {}) => {
      const ctx = await browser.newContext({
        ...DEVICES[device], locale: 'de-DE', timezoneId: 'Europe/Berlin', colorScheme: 'light',
        reducedMotion: extra.reduce ? 'reduce' : 'no-preference',
      });
      await ctx.route((u) => !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(u.href), (r) => r.abort());
      await ctx.addInitScript(seedScript({ demo: true, mode: 'light', style, strength: 'clear', customization: extra.customization }));
      await ctx.addInitScript(homeHelpers);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push('exc: ' + String(e.message).slice(0, 200)));
      page.on('console', (m) => { if (m.type() === 'error' && !ABORTED.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });
      await page.goto(url + p, { waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelector('#root > *') && window.__hapulseDemo, null, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      await sleep(600);
      await settleAnimations(page);
      const close = async () => {
        if (errors.length) pageErrors.push({ device, style, path: p, errors: errors.slice(0, 3) });
        await ctx.close();
      };
      return { ctx, page, close };
    };

    /** Click the first visible match (scrolled into view by Playwright), then let it settle. */
    const click = async (page, sel, how = 'click') => {
      const el = page.locator(sel).filter({ visible: true }).first();
      if (!(await el.count())) throw new Error('not visible: ' + sel);
      await (how === 'tap' ? el.tap() : el.click());
      await sleep(80);
      await settleAnimations(page);
    };
    const escape = async (page) => {
      await page.keyboard.press('Escape');
      await sleep(120);
      await settleAnimations(page);
    };
    const closeAll = async (page) => {
      for (let i = 0; i < 4 && (await ev(page, () => __h.dialogs().length)); i++) await escape(page);
      return until(page, () => __h.dialogs().length === 0, null, 2000);
    };
    const titles = (page) => ev(page, () => __h.dialogs().map((d) => d.title));
    const editMode = async (page) => {
      await ev(page, () => document.querySelector('.home-page__edit-toggle').click());
      await sleep(300);
      await settleAnimations(page);
    };

    // 1. Hints: appear and go live; a hidden entity does not count; a door after ten minutes; each row opens its
    //    window (water: the sensor's detail); an action in the window that resolves the hint leaves the window open;
    //    the order by severity; in edit mode the empty card. Klassisch and Glas at 1440, Glas on the phone.
    await block('homeHints', async () => {
      const res = {};
      for (const [device, style] of [['desktop', 'classic'], ['desktop', 'glas'], ['phone', 'glas']]) {
        const w = await open(device, style, '/', { customization: { hiddenEntities: [WINDOW] } });
        const page = w.page;
        const hints = () => ev(page, () => __h.hints());
        const r = {};
        r.start = await hints();
        await patch(page, WINDOW, { state: 'on' });
        await sleep(300);
        r.hidden = await hints();

        await patch(page, LOCK, { state: 'unlocked' });
        await until(page, () => !!document.querySelector('.hint-row[data-kind="lock-open"]'));
        r.lock = (await hints()).rows;
        await click(page, '.hint-row[data-kind="lock-open"]');
        await until(page, () => __h.dialogs().length > 0);
        await settleAnimations(page);
        r.lockWindow = await titles(page);
        await click(page, '[role="dialog"] .locks-row__btn--lock');
        await until(page, () => !document.querySelector('.home-page [data-section="hints"]'));
        await settleAnimations(page);
        r.lockAfter = { hints: await hints(), windows: await titles(page), state: (await entity(page, LOCK)).state };
        r.lockClosed = await closeAll(page);

        await patch(page, CHECK_WINDOW, { state: 'on', attributes: { device_class: 'window', friendly_name: 'Prüffenster' } });
        await until(page, () => !!document.querySelector('.hint-row[data-kind="window-open"]'));
        r.window = (await hints()).rows;
        await click(page, '.hint-row[data-kind="window-open"]');
        await until(page, () => __h.dialogs().length > 0);
        r.windowWindow = await titles(page);
        await closeAll(page);
        await patch(page, CHECK_WINDOW, null);

        await patch(page, DOOR, { state: 'on' });
        await sleep(300);
        r.doorNew = (await hints()).rows.map((x) => x.kind);
        await ev(page, (id) => window.__hapulseDemo.patch(id, { state: 'on', last_changed: new Date(Date.now() - 11 * 60000).toISOString() }), DOOR);
        await until(page, () => !!document.querySelector('.hint-row[data-kind="door-open"]'));
        r.doorOld = (await hints()).rows.map((x) => x.kind);
        await patch(page, DOOR, { state: 'off' });
        await until(page, () => !document.querySelector('.hint-row'));

        // each row opens its window
        const bin = await entity(page, BIN);
        const targets = [
          ['garage-open', () => patch(page, GARAGE, { state: 'open' }), () => patch(page, GARAGE, { state: 'closed' }), DE['garage.title']],
          ['alarm-triggered', () => patch(page, ALARM, { state: 'triggered' }), () => patch(page, ALARM, { state: 'disarmed' }),
            DE['home.chipmodals.alarm.title']],
          ['leak', () => patch(page, CHECK_LEAK, { state: 'on', attributes: { device_class: 'moisture', friendly_name: 'Prüfsensor Wasser' } }),
            () => patch(page, CHECK_LEAK, null), 'Prüfsensor Wasser'],
          ['waste-soon', () => binTomorrow(page),
            () => patch(page, BIN, { attributes: { daysTo: bin.attributes.daysTo, upcoming: bin.attributes.upcoming } }), 'Graue Tonne'],
        ];
        r.targets = {};
        for (const [kind, set, reset, want] of targets) {
          await set();
          const shown = await until(page, (k) => !!document.querySelector(`.hint-row[data-kind="${k}"]`), kind);
          let got = null;
          if (shown) {
            await click(page, `.hint-row[data-kind="${kind}"]`);
            await until(page, () => __h.dialogs().length > 0);
            got = await titles(page);
            await closeAll(page);
          }
          await reset();
          const gone = await until(page, (k) => !document.querySelector(`.hint-row[data-kind="${k}"]`), kind);
          r.targets[kind] = { shown, got, want, gone };
        }

        // several at once: by severity, then the fixed order
        await patch(page, ALARM, { state: 'triggered' });
        await patch(page, LOCK, { state: 'unlocked' });
        await patch(page, CHECK_WINDOW, { state: 'on', attributes: { device_class: 'window', friendly_name: 'Prüffenster' } });
        await binTomorrow(page);
        await until(page, () => document.querySelectorAll('.hint-row').length === 4);
        r.order = (await hints()).rows.map((x) => x.kind);
        await patch(page, ALARM, { state: 'disarmed' });
        await patch(page, LOCK, { state: 'locked' });
        await patch(page, CHECK_WINDOW, null);
        await patch(page, BIN, { attributes: { daysTo: bin.attributes.daysTo, upcoming: bin.attributes.upcoming } });
        await until(page, () => !document.querySelector('.hint-row'));

        // edit mode: the empty card, so it can be hidden and shown again
        await editMode(page);
        r.edit = await ev(page, () => {
          const c = document.querySelector('.home-page [data-section="hints"]');
          const e = c && c.querySelector('.hints-card__empty');
          return { card: !!c, empty: e ? e.textContent.trim() : null };
        });
        await editMode(page);
        r.after = await hints();
        await w.close();

        const t = r.targets;
        r.ok = !r.start.section && r.start.rows.length === 0 && !r.hidden.section
          && r.lock.length === 1 && r.lock[0].title === plural('hints.lockOpen', 1) && r.lock[0].sub === DE['hints.tapToLock']
          && same(lower(r.lockWindow), lower([DE['security.locks.title']]))
          && r.lockAfter.state === 'locked' && !r.lockAfter.hints.section
          && same(lower(r.lockAfter.windows), lower([DE['security.locks.title']])) && r.lockClosed
          && r.window.length === 1 && r.window[0].title === plural('hints.windowOpen', 1)
          && same(lower(r.windowWindow), lower([DE['home.chipmodals.doors.title']]))
          && r.doorNew.length === 0 && same(r.doorOld, ['door-open'])
          && Object.values(t).every((x) => x.shown && x.gone && same(lower(x.got || []), lower([x.want])))
          && same(r.order, ['alarm-triggered', 'lock-open', 'window-open', 'waste-soon'])
          && r.edit.card && r.edit.empty === DE['hints.empty'] && !r.after.section;
        res[`${device}-${style}`] = r;
      }
      out.homeHints = res;
      out.homeHintsOk = Object.values(res).every((r) => r.ok);
    });

    // 2. A scene is "Aktiv" after it was activated (Glas: with its ring) and loses it when a member changes after the
    //    grace time; before and after, the tile names its members ("3 Geräte").
    await block('homeScene', async () => {
      const res = {};
      const label = fill('home.scenes.activateAria', { name: SCENE_NAME });
      for (const style of ['classic', 'glas']) {
        const w = await open('desktop', style, '/', { customization: { favorites: FAVORITES } });
        const page = w.page;
        const tile = () => ev(page, (l) => {
          const t = [...document.querySelectorAll('.scene-tile')].find((e) => e.getAttribute('aria-label') === l);
          return t ? { active: t.hasAttribute('data-active'), sub: ((t.querySelector('.scene-tile__sub') || {}).textContent || '').trim(),
            ring: !!t.querySelector('.g-scene-ring') } : null;
        }, label);
        const r = { before: await tile() };
        await click(page, `.scene-tile[aria-label="${label}"]`);
        await until(page, (l) => [...document.querySelectorAll('.scene-tile[data-active]')].some((e) => e.getAttribute('aria-label') === l), label);
        await settleAnimations(page);
        r.active = await tile();
        await ev(page, (m) => {
          const e = window.__hapulseDemo.entity(m);
          window.__hapulseDemo.patch(m, { state: e.state === 'on' ? 'off' : 'on', last_updated: new Date(Date.now() + 20000).toISOString() });
        }, MEMBER);
        await until(page, (l) => ![...document.querySelectorAll('.scene-tile[data-active]')].some((e) => e.getAttribute('aria-label') === l), label);
        r.changed = await tile();
        await w.close();
        res[style] = r;
      }
      out.homeScene = res;
      const members = plural('home.scenes.members', 3);
      out.homeSceneOk = ['classic', 'glas'].every((s) => {
        const r = res[s];
        return !!r.before && !r.before.active && r.before.sub === members && r.active.active && r.active.sub === DE['home.scenes.active']
          && r.active.ring === (s === 'glas') && !r.changed.active && r.changed.sub === members;
      });
    });

    // 3. Nothing lost (GLAS-PLAN stage 4): the main room's lights pill and climate stepper, the climate card's rooms and
    //    stepper, close/stop/open of the blinds, the seven security rows, a room's status symbol, a capped card that
    //    scrolls inside, dragging a card with the keyboard, hiding a chip, the question before unlocking.
    await block('homeKeep', async () => {
      const res = {};
      // `at` names the step a failure stopped in
      out.homeKeep = res;
      for (const [device, style] of [['desktop', 'classic'], ['desktop', 'glas'], ['phone', 'glas']]) {
        const w = await open(device, style, '/', { customization: { favorites: FAVORITES, hiddenSections: [], homeSectionHeights: { security: 1 } } });
        const page = w.page;
        const r = {};
        const at = (step) => { res.at = `${device}-${style}: ${step}`; };
        at('hero');
        const states = (ids) => ev(page, (list) => list.map((i) => window.__hapulseDemo.entity(i).state), ids);

        // main room: the stepper changes the setpoint, the lights pill switches the room's lights. Klassisch then shows
        // the next most active room (upstream; Glas keeps the room for a minute), so only Glas switches them on again.
        await ev(page, () => window.scrollTo(0, 0));
        const sp0 = (await entity(page, CLIMATE)).attributes.temperature;
        await click(page, `.hero-room-card .hero-pill__step-btn[aria-label="${DE['home.hero.raiseTempAria']}"]`);
        await until(page, ([id, v]) => window.__hapulseDemo.entity(id).attributes.temperature > v, [CLIMATE, sp0]);
        r.heroStep = [sp0, (await entity(page, CLIMATE)).attributes.temperature];
        const lights0 = await states(ROOM_LIGHTS);
        await click(page, '.hero-room-card .hero-pill--lights');
        await until(page, (ids) => ids.every((i) => window.__hapulseDemo.entity(i).state === 'off'), ROOM_LIGHTS);
        const lights1 = await states(ROOM_LIGHTS);
        if (style === 'glas') {
          await click(page, '.hero-room-card .hero-pill--lights');
          await until(page, (ids) => ids.every((i) => window.__hapulseDemo.entity(i).state === 'on'), ROOM_LIGHTS);
        }
        r.heroLights = { before: lights0, off: lights1, on: style === 'glas' ? await states(ROOM_LIGHTS) : null };

        // climate card: the room list moves the controls (the demo opens on the bedroom, whose thermostat is off),
        // the stepper changes the shown room's setpoint
        at('climate');
        await bringSection(page, 'climate');
        const roomSel = style === 'glas' ? '.home-page [data-section="climate"] .g-pick__row' : '.home-page [data-section="climate"] .climate-card__room-row';
        const rooms = () => ev(page, (sel) => [...document.querySelectorAll(sel)].map((x) => ({
          name: (x.querySelector('.g-pick__name, .climate-card__room-name') || x).textContent.trim(),
          on: x.getAttribute('aria-checked') === 'true' || x.classList.contains('climate-card__room-row--selected'),
        })), roomSel);
        const pickRoom = async (name) => {
          await page.locator(roomSel).filter({ hasText: name }).first().click();
          await sleep(150);
          await settleAnimations(page);
          return rooms();
        };
        const room0 = await rooms();
        const roomLiving = await pickRoom('Living Room');
        const sp1 = (await entity(page, CLIMATE)).attributes.temperature;
        await click(page, `.home-page [data-section="climate"] button[aria-label="${DE['home.climate.raiseAria']}"]`);
        await until(page, ([id, v]) => window.__hapulseDemo.entity(id).attributes.temperature > v, [CLIMATE, sp1]);
        r.climateStep = [sp1, (await entity(page, CLIMATE)).attributes.temperature];
        r.climateRoom = { start: room0, living: roomLiving, bedroom: await pickRoom('Bedroom') };

        // blinds: open, stop, close (the labels differ between the classic card, the Glas phone and the Glas rows)
        at('blinds');
        await bringSection(page, 'blinds');
        r.blinds = [];
        for (const [labels, want] of [[['home.blinds.openAria', 'cards.cover.open'], 'open'], [['home.blinds.stopAria', 'cards.cover.stop'], 'stopped'],
          [['home.blinds.closeAria', 'cards.cover.close'], 'closed']]) {
          const sel = labels.map((k) => `.home-page [data-section="blinds"] button[aria-label="${DE[k]}"]`).join(', ');
          await click(page, sel);
          await until(page, ([id, s]) => window.__hapulseDemo.entity(id).state === s, [BLINDS, want]);
          r.blinds.push((await entity(page, BLINDS)).state);
        }

        // security: seven rows; capped at 180 px it scrolls inside
        at('security');
        await bringSection(page, 'security');
        r.security = await ev(page, () => {
          const cell = document.querySelector('.home-page [data-section="security"]');
          const body = cell.querySelector('.card-scroll-body');
          const rows = [...cell.querySelectorAll('.security-row')].map((x) => [
            (x.querySelector('.security-row__label') || {}).textContent, (x.querySelector('.security-row__value') || {}).textContent]);
          const before = body.scrollTop;
          body.scrollTop = 60;
          const scrolled = body.scrollTop;
          body.scrollTop = before;
          return { rows, capped: cell.classList.contains('section-h-1'), overflow: getComputedStyle(body).overflowY,
            inner: body.scrollHeight - body.clientHeight, scrolled };
        });

        // a room's status symbol replaces its own
        at('room status');
        await bringSection(page, 'rooms');
        const status = () => ev(page, () => {
          const glas = [...document.querySelectorAll('.home-page .g-room')].find((x) => (x.querySelector('.g-room__name') || {}).textContent === 'Bedroom');
          if (glas) return { status: glas.hasAttribute('data-status'), tone: glas.getAttribute('data-tone') };
          const tile = [...document.querySelectorAll('.home-page .rooms-quick-tile')].find((x) => (x.querySelector('.rooms-quick-tile__name') || {}).textContent === 'Bedroom');
          return tile ? { status: tile.classList.contains('rooms-quick-tile--status'), tone: null } : null;
        });
        const st0 = await status();
        await patch(page, WINDOW, { state: 'on' });
        await until(page, () => !!document.querySelector('.home-page .g-room[data-status], .home-page .rooms-quick-tile--status'));
        const st1 = await status();
        await patch(page, WINDOW, { state: 'off' });
        await until(page, () => !document.querySelector('.home-page .g-room[data-status], .home-page .rooms-quick-tile--status'));
        r.roomStatus = [st0, st1, await status()];

        // the question before unlocking: cancel keeps it locked, confirm unlocks; locking needs no question
        at('unlock');
        await ev(page, () => window.scrollTo(0, 0));
        await sleep(150);
        await click(page, '.summary-chip[aria-label^="locks:"]');
        await until(page, () => __h.dialogs().length > 0);
        await click(page, '[role="dialog"] .locks-row__btn--unlock');
        await until(page, () => __h.dialogs().length > 1 || !!document.querySelector('.lock-confirm'));
        const asked = { windows: await titles(page), state: (await entity(page, LOCK)).state };
        await click(page, '.lock-confirm-host .btn--secondary, [role="dialog"] .lock-confirm__actions .btn--secondary');
        await until(page, () => !document.querySelector('.lock-confirm'));
        const cancelled = (await entity(page, LOCK)).state;
        await click(page, '[role="dialog"] .locks-row__btn--unlock');
        await until(page, () => !!document.querySelector('.lock-confirm'));
        await click(page, '.lock-confirm__actions .btn--danger');
        await until(page, (id) => window.__hapulseDemo.entity(id).state === 'unlocked', LOCK);
        const confirmed = (await entity(page, LOCK)).state;
        await click(page, '[role="dialog"] .locks-row__btn--lock');
        await until(page, (id) => window.__hapulseDemo.entity(id).state === 'locked', LOCK);
        r.unlock = { asked, cancelled, confirmed, locked: (await entity(page, LOCK)).state, question: !!(await ev(page, () => document.querySelector('.lock-confirm'))) };
        await closeAll(page);

        // edit mode: a chip hides and shows again, a card moves with the keyboard
        at('edit');
        await editMode(page);
        const chipSel = `button[aria-label="${fill('home.summaryChips.hideChipAria', { id: 'lights' })}"]`;
        await click(page, chipSel);
        const hid = await ev(page, () => ({ chips: __h.cust().homeChips, dim: !!document.querySelector('.summary-chip--edit-hidden') }));
        await click(page, `button[aria-label="${fill('home.summaryChips.showChipAria', { id: 'lights' })}"]`);
        const shown = await ev(page, () => ({ chips: __h.cust().homeChips, dim: !!document.querySelector('.summary-chip--edit-hidden') }));
        r.chip = { hid, shown };
        const o1 = await ev(page, () => __h.order());
        await ev(page, (id) => document.querySelector(`.home-page [data-section="${id}"]`).parentElement.focus(), o1[1]);
        await page.keyboard.press(' ');
        await sleep(250);
        await page.keyboard.press(device === 'phone' ? 'ArrowDown' : 'ArrowRight');
        await sleep(250);
        await page.keyboard.press(' ');
        await sleep(600);
        await settleAnimations(page);
        r.drag = { before: o1, after: await ev(page, () => __h.order()), saved: await ev(page, () => __h.cust().homeSectionOrder || null) };
        await editMode(page);
        await w.close();

        r.ok = same(r.heroLights.before, ['on', 'on', 'off']) && r.heroLights.off.every((s) => s === 'off')
          && (style === 'classic' || r.heroLights.on.every((s) => s === 'on'))
          && r.heroStep[1] > r.heroStep[0] && r.climateStep[1] > r.climateStep[0]
          && Object.values(r.climateRoom).every((list) => list.length === 2 && list.filter((x) => x.on).length === 1)
          && r.climateRoom.living.find((x) => x.on).name === 'Living Room' && r.climateRoom.bedroom.find((x) => x.on).name === 'Bedroom'
          && same(r.blinds, ['open', 'stopped', 'closed'])
          && r.security.rows.length === 7 && r.security.rows.every(([l, v]) => l && v) && r.security.capped
          && /auto|scroll/.test(r.security.overflow) && r.security.inner > 20 && r.security.scrolled > 0
          && r.roomStatus[0] && !r.roomStatus[0].status && r.roomStatus[1].status && (style === 'classic' || r.roomStatus[1].tone === 'warn')
          && !r.roomStatus[2].status
          && r.unlock.asked.state === 'locked' && r.unlock.cancelled === 'locked' && r.unlock.confirmed === 'unlocked'
          && r.unlock.locked === 'locked' && !r.unlock.question
          && Array.isArray(r.chip.hid.chips) && !r.chip.hid.chips.includes('lights') && r.chip.hid.dim && !r.chip.shown.dim
          && !same(r.drag.before, r.drag.after) && same(r.drag.after[0], r.drag.before[0]);
        res[`${device}-${style}`] = r;
      }
      delete res.at;
      out.homeKeepOk = Object.values(res).every((r) => r.ok);
    });

    // 4. Glas: the energy card's period with the keyboard (the focus stays in the segment, the card keeps its place),
    //    a bar picked with a tap or click, the arrows move the pick, Esc ends it.
    await block('homeEnergy', async () => {
      const res = {};
      for (const device of ['desktop', 'phone']) {
        const w = await open(device, 'glas');
        const page = w.page;
        const r = {};
        await bringSection(page, 'energy');
        await until(page, () => document.querySelectorAll('.g-energy__bars button.g-energy__bar').length > 0, null, 6000);
        await settleAnimations(page);
        const look = () => ev(page, () => {
          const cell = document.querySelector('.home-page [data-section="energy"]');
          const opts = [...document.querySelectorAll('.g-seg--energy .g-seg__opt')];
          return { card: __h.rect(cell), y: scrollY, energy: !!cell.querySelector('.g-energy'),
            checked: opts.findIndex((o) => o.getAttribute('aria-checked') === 'true'), focus: opts.indexOf(document.activeElement),
            stops: opts.filter((o) => o.tabIndex === 0).length };
        });
        r.start = await look();
        await page.focus('.g-seg--energy .g-seg__opt[aria-checked="true"]');
        r.steps = [];
        for (const key of ['ArrowRight', 'ArrowRight', 'ArrowLeft']) {
          await page.keyboard.press(key);
          const samples = [];
          for (let i = 0; i < 8; i++) {
            samples.push(await look());
            await sleep(100);
          }
          await settleAnimations(page);
          samples.push(await look());
          const last = samples[samples.length - 1];
          r.steps.push({ key, checked: last.checked, focus: last.focus, stops: last.stops, always: samples.every((s) => s.energy),
            moved: Math.max(...samples.map((s) => Math.abs(s.card.y - r.start.card.y))), scrolled: Math.max(...samples.map((s) => Math.abs(s.y - r.start.y))) });
        }

        const bars = () => ev(page, () => {
          const list = [...document.querySelectorAll('.g-energy__bars button.g-energy__bar')];
          return { n: list.length, pressed: list.findIndex((b) => b.getAttribute('aria-pressed') === 'true'), focus: list.indexOf(document.activeElement),
            bubble: !!document.querySelector('.g-energy__bubble') };
        });
        const bar = page.locator('.g-energy__bars button.g-energy__bar').nth(3);
        await (device === 'phone' ? bar.tap() : bar.click());
        // the mouse leaves the bars: hovering one shows its bubble without a pick
        if (device !== 'phone') await page.mouse.move(2, 2);
        await sleep(120);
        r.picked = await bars();
        await page.keyboard.press('ArrowLeft');
        await sleep(120);
        r.left = await bars();
        await page.keyboard.press('Escape');
        await sleep(120);
        await settleAnimations(page);
        r.esc = { ...(await bars()), windows: (await titles(page)).length, url: await ev(page, () => location.pathname) };
        await w.close();
        r.ok = r.start.checked === 0 && r.start.stops === 1
          && same(r.steps.map((s) => s.checked), [1, 2, 1]) && r.steps.every((s) => s.focus === s.checked && s.stops === 1 && s.always
            && s.moved <= 1 && s.scrolled <= 1)
          && r.picked.pressed === 3 && r.picked.bubble && r.left.pressed === 2 && r.left.focus === 2 && r.left.bubble
          && r.esc.pressed === -1 && !r.esc.bubble && r.esc.focus === 2 && r.esc.windows === 0 && r.esc.url === '/';
        res[device] = r;
      }
      out.homeEnergy = res;
      out.homeEnergyOk = Object.values(res).every((r) => r.ok);
    });

    // 5. Glas, edit mode from 900 px: S/M/L write the classic span and height plus `tallSections`; "⋯" sets columns and
    //    a height cap (a cap ends L); ‹ › move a card and keep the focus; Space on the eye hides without a keyboard drag;
    //    a press on the bar never drags, one on the card does. After a style switch Klassisch shows the same order and
    //    spans.
    await block('homeEdit', async () => {
      const res = {};
      const w = await open('desktop', 'glas');
      const page = w.page;
      const cust = () => ev(page, () => __h.cust());
      const order = () => ev(page, () => __h.order());
      const bar = (id) => `.home-page [data-section="${id}"] > .g-size-bar`;
      const settle = async (ms = 250) => {
        await sleep(ms);
        await settleAnimations(page);
      };
      await editMode(page);
      const o1 = await order();
      await page.click(`${bar('scenes')} [role="radio"]:has-text("L")`);
      await settle();
      let c = await cust();
      res.L = { span: (c.homeSectionSpans || {}).scenes, tall: c.tallSections || [], height: (c.homeSectionHeights || {}).scenes,
        cell: await ev(page, () => Math.round(document.querySelector('.home-page [data-section="scenes"]').getBoundingClientRect().height)) };
      await page.click(`${bar('scenes')} [role="radio"]:has-text("S")`);
      await settle();
      c = await cust();
      res.S = { span: c.homeSectionSpans.scenes, tall: c.tallSections || [] };
      await page.click(`${bar('scenes')} [aria-haspopup="dialog"]`);
      await until(page, () => __h.dialogs().length > 0);
      await settle();
      await page.click('[role="dialog"] [role="radiogroup"] >> nth=0 >> [role="radio"]:has-text("3")');
      await settle();
      c = await cust();
      res.sheet = { span: c.homeSectionSpans.scenes, none: await ev(page, (sel) => document.querySelector(sel + ' .g-seg').hasAttribute('data-none'), bar('scenes')) };
      await escape(page);
      res.focusBack = await ev(page, () => {
        const a = document.activeElement;
        return a ? `${a.getAttribute('aria-haspopup') || ''}|${(a.closest('[data-section]') || { dataset: {} }).dataset.section}` : '';
      });
      await page.click(`${bar('scenes')} [role="radio"]:has-text("L")`);
      await settle();
      await page.click(`${bar('scenes')} [aria-haspopup="dialog"]`);
      await until(page, () => __h.dialogs().length > 0);
      await settle();
      await page.click('[role="dialog"] [role="radiogroup"] >> nth=1 >> [role="radio"]:has-text("280")');
      await settle();
      c = await cust();
      res.cap = { height: c.homeSectionHeights.scenes, tall: c.tallSections || [] };
      await page.click('[role="dialog"] [role="radiogroup"] >> nth=1 >> [role="radio"] >> nth=0');
      await settle();
      res.capOff = (await cust()).homeSectionHeights.scenes;
      await escape(page);

      // ‹ › with the keyboard: the focus stays on the arrow
      const second = o1[1];
      const focusOn = () => ev(page, () => {
        const a = document.activeElement;
        return a ? `${a.dataset.move || ''}|${(a.closest('[data-section]') || { dataset: {} }).dataset.section}` : '';
      });
      await page.focus(`${bar(second)} [data-move="1"]`);
      await page.keyboard.press('Enter');
      await settle(400);
      res.moveEnter = { order: await order(), focus: await focusOn() };
      await page.keyboard.press(' ');
      await settle(400);
      res.moveSpace = { order: await order(), focus: await focusOn() };
      await page.focus(`${bar(second)} [data-move="-1"]`);
      await page.keyboard.press('Enter');
      await settle(400);
      await page.keyboard.press('Enter');
      await settle(400);
      res.moveBack = await order();

      // Space on the eye: hidden, no keyboard drag, no announcement of one
      await page.focus(`${bar(second)} [aria-pressed]`);
      await page.keyboard.press(' ');
      await settle(300);
      await page.keyboard.press('ArrowRight');
      await settle(300);
      await page.keyboard.press('ArrowDown');
      await settle(300);
      res.eye = { hidden: (await cust()).hiddenSections || [], order: await order(),
        live: await ev(page, () => [...document.querySelectorAll('[id^="DndLiveRegion"]')].map((n) => n.textContent).join('|')) };
      await page.keyboard.press('Enter');
      await settle(300);
      res.eyeBack = (await cust()).hiddenSections || [];

      // a press on the bar does not drag, one on the card does
      const drag = async (from, to) => {
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        for (let i = 1; i <= 20; i++) {
          await page.mouse.move(from.x + ((to.x - from.x) * i) / 20, from.y + ((to.y - from.y) * i) / 20);
          await sleep(16);
        }
        await page.mouse.up();
        await settle(600);
      };
      const space = await ev(page, (sel) => {
        const r = document.querySelector(sel + ' .g-size-bar__space').getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, bar(o1[1]));
      await drag(space, { x: space.x + 300, y: space.y + 200 });
      res.barDrag = await order();
      const from = await ev(page, (id) => {
        const r = document.querySelector(`.home-page [data-section="${id}"] .edit-section-outline`).getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + 30 };
      }, o1[1]);
      const to = await ev(page, (id) => {
        const r = document.querySelector(`.home-page [data-section="${id}"]`).getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, o1[2]);
      await drag(from, to);
      res.cardDrag = await order();

      // the same order and spans after a switch to Klassisch (L reads as M there)
      await page.click(`${bar('scenes')} [role="radio"]:has-text("L")`);
      await settle();
      await page.click(`${bar('energy')} [role="radio"]:has-text("S")`);
      await settle();
      await editMode(page);
      const spans = () => ev(page, () => [...document.querySelectorAll('.home-page .overview-grid [data-section]')].map((c) => {
        const m = c.className.match(/span-(\d)/);
        return `${c.dataset.section}:${m ? m[1] : '?'}`;
      }).join(','));
      res.glas = await spans();
      await ev(page, () => {
        const s = JSON.parse(localStorage.getItem('hapulse:settings'));
        s.state.customization.uiStyle = 'classic';
        localStorage.setItem('hapulse:settings', JSON.stringify(s));
      });
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelector('#root > *'));
      await settle(900);
      res.classic = await spans();
      res.classicStyle = await ev(page, () => document.documentElement.getAttribute('data-style'));
      res.classicTall = await ev(page, () => document.querySelectorAll('.g-tall').length);
      await w.close();

      out.homeEdit = res;
      out.homeEditOk = res.L.span === 2 && res.L.tall.includes('home:scenes') && !res.L.height && res.L.cell >= 470
        && res.S.span === 1 && !res.S.tall.includes('home:scenes')
        && res.sheet.span === 3 && res.sheet.none && res.focusBack === 'dialog|scenes'
        && res.cap.height === 2 && !res.cap.tall.includes('home:scenes') && res.capOff === 0
        && res.moveEnter.order[2] === second && res.moveEnter.focus === `1|${second}`
        && res.moveSpace.order[3] === second && res.moveSpace.focus === `1|${second}` && same(res.moveBack, o1)
        && res.eye.hidden.includes(second) && same(res.eye.order, o1) && !/picked up/i.test(res.eye.live) && !res.eyeBack.includes(second)
        && same(res.barDrag, o1) && !same(res.cardDrag, o1)
        && res.glas === res.classic && res.classicStyle !== 'glas' && res.classicTall === 0;
    });

    // 6. Glas: the light's capsule with the keyboard — the level moves at once, Home Assistant gets it when the key is
    //    let go (a held key repeats first); End = 100 %, Home = off. The head of the detail: state tile, name, room
    //    (from 1100 px the inspector, on the phone a sheet).
    await block('homeLight', async () => {
      const res = {};
      for (const device of ['desktop', 'phone']) {
        const w = await open(device, 'glas');
        const page = w.page;
        const r = {};
        await ev(page, (id) => window.__hapulseDemo.openDetail(id), LIGHT);
        await until(page, () => !!document.querySelector('.g-light__cap[role="slider"]'));
        await settleAnimations(page);
        r.head = await ev(page, () => {
          const p = [...document.querySelectorAll('[role="dialog"]')].find((d) => !d.closest('.g-sheet-ghost'));
          const hd = p && p.querySelector('.g-sheet-header');
          return hd ? { pres: p.parentElement.getAttribute('data-g-pres'), lead: hd.classList.contains('g-sheet-header--lead'),
            tile: !!hd.querySelector('.g-sheet-header__lead .g-detail-tile'), title: (hd.querySelector('.g-sheet-header__title') || {}).textContent,
            subtitle: (hd.querySelector('.g-sheet-header__subtitle') || {}).textContent, icon: !!hd.querySelector('.g-sheet-header__icon') } : null;
        });
        const slider = () => ev(page, (id) => {
          const s = document.querySelector('.g-light__cap[role="slider"]');
          const e = window.__hapulseDemo.entity(id);
          return { now: Number(s.getAttribute('aria-valuenow')), state: e.state, brightness: e.attributes.brightness ?? null };
        }, LIGHT);
        await page.focus('.g-light__cap[role="slider"]');
        r.start = await slider();
        await page.keyboard.down('ArrowUp');
        await sleep(80);
        r.down1 = await slider();
        await page.keyboard.down('ArrowUp'); // held: the key repeats
        await sleep(80);
        r.down2 = await slider();
        // Shift tapped during the hold sends nothing
        await page.keyboard.press('Shift');
        await sleep(300);
        r.shift = await slider();
        await page.keyboard.up('ArrowUp');
        await until(page, ([id, b]) => window.__hapulseDemo.entity(id).attributes.brightness !== b, [LIGHT, r.start.brightness]);
        r.up = await slider();
        await page.keyboard.press('End');
        await until(page, (id) => window.__hapulseDemo.entity(id).attributes.brightness === 255, LIGHT);
        r.end = await slider();
        await page.keyboard.press('Home');
        await until(page, (id) => window.__hapulseDemo.entity(id).state === 'off', LIGHT);
        r.home = await slider();
        await page.keyboard.press('PageUp');
        await until(page, (id) => window.__hapulseDemo.entity(id).state === 'on', LIGHT);
        r.page = await slider();
        await w.close();
        const level = (b) => Math.round((b / 255) * 100);
        r.ok = !!r.head && r.head.pres === (device === 'desktop' ? 'inspector' : 'sheet') && r.head.lead && r.head.tile
          && r.head.title === 'Ceiling Light' && r.head.subtitle === 'Living Room'
          && r.start.state === 'on' && r.start.now === level(r.start.brightness)
          && r.down1.now === r.start.now + 10 && r.down1.brightness === r.start.brightness
          && r.down2.now === r.start.now + 20 && r.down2.brightness === r.start.brightness
          && r.shift.now === r.start.now + 20 && r.shift.brightness === r.start.brightness
          && r.up.brightness === Math.round((r.start.now + 20) * 2.55) && r.up.now === r.start.now + 20
          && r.end.brightness === 255 && r.end.now === 100 && r.home.state === 'off' && r.home.now === 0
          && r.page.state === 'on' && r.page.brightness === 51 && r.page.now === 20;
        res[device] = r;
      }
      out.homeLight = res;
      out.homeLightOk = Object.values(res).every((r) => r.ok);
    });

    // 7. Glas on the phone: the tab order of the overview's top is greeting → weather line → chips → hints → cards.
    await block('homeTabOrder', async () => {
      const w = await open('phone', 'glas');
      const page = w.page;
      await patch(page, LOCK, { state: 'unlocked' });
      await until(page, () => !!document.querySelector('.hint-row'));
      await ev(page, () => {
        window.scrollTo(0, 0);
        if (document.activeElement) document.activeElement.blur();
      });
      const kinds = [];
      for (let i = 0; i < 60; i++) {
        await page.keyboard.press('Tab');
        const k = await ev(page, () => __h.kindOf(document.activeElement));
        if (kinds[kinds.length - 1] !== k) kinds.push(k);
        if (k === 'card') break;
      }
      await w.close();
      const top = kinds.filter((k) => ['greeting', 'weather', 'chips', 'hints', 'card'].includes(k));
      out.homeTabOrder = kinds;
      out.homeTabOrderOk = same(top.filter((k) => k !== 'greeting'), ['weather', 'chips', 'hints', 'card'])
        && (!top.includes('greeting') || top.indexOf('greeting') < top.indexOf('chips'));
    });

    // 8. Glas: the context menu on scene tiles and devices — a right click (desktop) or a long press (phone) opens it,
    //    Esc closes it and gives the focus back; "Aktivieren", "Ausschalten" (the device stays in the card), the
    //    context-menu key, "Raum öffnen"; no menu in edit mode; Klassisch has none.
    await block('homeMenu', async () => {
      const res = {};
      const menu = (page) => ev(page, () => {
        const m = document.querySelector('.g-ctx:not(.g-ctx--closing) .g-ctx__menu');
        return m ? [...m.querySelectorAll('[role="menuitem"]')].map((i) => i.textContent.trim()) : null;
      });
      const menuOpen = (page) => until(page, () => !!document.querySelector('.g-ctx:not(.g-ctx--closing) .g-ctx__menu'), null, 3000);
      const menuGone = (page) => until(page, () => !document.querySelector('.g-ctx'), null, 3000);
      const item = async (page, label) => {
        await page.click(`.g-ctx__menu [role="menuitem"]:has-text("${label}")`);
        await menuGone(page);
        await settleAnimations(page);
      };
      const rightClick = async (page, sel, at) => {
        const el = page.locator(sel).first();
        await el.scrollIntoViewIfNeeded();
        await settleAnimations(page);
        await el.click({ button: 'right', ...(at ? { position: at } : {}) });
        await menuOpen(page);
        await settleAnimations(page);
      };
      const devices = (page) => ev(page, () => [...document.querySelectorAll('.home-page .g-device')].map((d) => ({
        name: d.querySelector('.g-device__name').textContent, on: d.hasAttribute('data-on') })));

      // Klassisch
      {
        const w = await open('desktop', 'classic', '/', { customization: { favorites: FAVORITES } });
        const page = w.page;
        const tile = page.locator('.scene-tile').first();
        await tile.scrollIntoViewIfNeeded();
        await tile.click({ button: 'right' });
        await sleep(400);
        res.classic = { menu: await menu(page), lifted: await ev(page, () => !!document.querySelector('[data-g-lifted]')) };
        await w.close();
      }

      // desktop
      {
        const w = await open('desktop', 'glas', '/', { customization: { favorites: FAVORITES } });
        const page = w.page;
        const r = {};
        const name = (await page.locator('.scene-tile .scene-tile__name').first().textContent()).trim();
        await rightClick(page, '.scene-tile');
        r.scene = { items: await menu(page), lifted: await ev(page, () => !!document.querySelector('.scene-tile[data-g-lifted]')) };
        await escape(page);
        await menuGone(page);
        r.sceneEsc = await ev(page, () => ({ menu: !!document.querySelector('.g-ctx'), focus: !!document.activeElement && document.activeElement.classList.contains('scene-tile') }));
        await rightClick(page, '.scene-tile');
        await item(page, DE['glas.context.activate']);
        r.activated = await until(page, (n) => [...document.querySelectorAll('.scene-tile[data-active] .scene-tile__name')].some((e) => e.textContent.trim() === n), name);

        const d0 = await devices(page);
        const lit = d0.findIndex((d) => d.on);
        const row = `.home-page .g-device >> nth=${lit}`;
        await rightClick(page, row, { x: 120, y: 20 });
        r.device = await menu(page);
        await item(page, DE['glas.context.turnOff']);
        await sleep(300);
        r.deviceOff = { before: d0, after: await devices(page) };
        await page.locator(row).locator('.g-device__open').focus();
        await page.keyboard.press('ContextMenu');
        await menuOpen(page);
        r.key = { items: await menu(page), focusIn: await ev(page, () => !!document.activeElement && document.activeElement.getAttribute('role') === 'menuitem') };
        await page.keyboard.press('ArrowDown');
        await escape(page);
        await menuGone(page);
        r.keyBack = await ev(page, () => !!document.activeElement && document.activeElement.classList.contains('g-device__open'));
        await rightClick(page, row, { x: 120, y: 20 });
        await item(page, DE['glas.context.room']);
        await sleep(300);
        r.room = await ev(page, () => location.pathname);
        await page.goBack();
        await page.waitForFunction(() => !!document.querySelector('.home-page'));
        await sleep(400);
        await editMode(page);
        await page.locator('.scene-tile').first().click({ button: 'right' });
        await sleep(400);
        r.edit = await menu(page);
        await w.close();
        res.desktop = r;
      }

      // phone: a long press (CDP touch; the click CDP adds after a touchEnd lands on the menu's layer)
      {
        const w = await open('phone', 'glas', '/', { customization: { favorites: FAVORITES } });
        const page = w.page;
        const r = {};
        const press = async (sel, dy) => {
          const el = page.locator(sel).first();
          await el.scrollIntoViewIfNeeded();
          await settleAnimations(page);
          const b = await el.boundingBox();
          const cdp = await page.context().newCDPSession(page);
          const pt = { x: b.x + b.width / 2, y: dy === undefined ? b.y + b.height / 2 : b.y + b.height - dy };
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
          return { el, cdp };
        };
        const lift = async (cdp) => {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await cdp.detach();
          await sleep(400);
          await settleAnimations(page);
        };
        let p = await press('.scene-tile');
        await sleep(350);
        r.at350 = await menu(page);
        await sleep(400);
        r.held = await menu(page);
        await lift(p.cdp);
        r.released = await menu(page);
        r.notActivated = await ev(page, () => !document.querySelector('.scene-tile[data-active]'));
        await escape(page);
        await menuGone(page);
        p = await press('.home-page .g-device', 14);
        await sleep(700);
        const ratios = [];
        for (let i = 0; i < 25; i++) {
          ratios.push(await p.el.evaluate((x) => x.getBoundingClientRect().width / x.offsetWidth));
          await sleep(20);
        }
        await lift(p.cdp);
        r.lift = { max: Math.max(...ratios), end: await p.el.evaluate((x) => x.getBoundingClientRect().width / x.offsetWidth) };
        r.device = await menu(page);
        await w.close();
        res.phone = r;
      }

      out.homeMenu = res;
      const d = res.desktop;
      const p = res.phone;
      const FAV = [DE['glas.context.favoriteAdd'], DE['glas.context.favoriteRemove']];
      out.homeMenuOk = res.classic.menu === null && !res.classic.lifted
        && !!d.scene.items && d.scene.items[0] === DE['glas.context.activate'] && d.scene.items.includes(DE['glas.context.details'])
        && d.scene.items.some((x) => FAV.includes(x)) && d.scene.items.includes(DE['glas.context.room']) && d.scene.lifted
        && !d.sceneEsc.menu && d.sceneEsc.focus && d.activated
        && !!d.device && d.device[0] === DE['glas.context.details'] && d.device.includes(DE['glas.context.turnOff']) && d.device.includes(DE['glas.context.room'])
        && d.deviceOff.after.length === d.deviceOff.before.length && d.deviceOff.after.filter((x) => x.on).length === d.deviceOff.before.filter((x) => x.on).length - 1
        && !!d.key.items && d.key.items[0] === DE['glas.context.details'] && d.key.focusIn && d.keyBack
        && /^\/room\//.test(d.room) && d.edit === null
        && p.at350 === null && !!p.held && p.held[0] === DE['glas.context.activate'] && !!p.released && p.notActivated
        && p.lift.max < 1.075 && Math.abs(p.lift.end - 1.04) < 0.005 && !!p.device && p.device[0] === DE['glas.context.details'];
    });

    // 9. Glas: a device switched off in the card stays there as "Aus" until the page reloads; switched on again it is
    //    an ordinary active device (desktop: the switch, phone: the circle).
    await block('homeKeptOff', async () => {
      const res = {};
      for (const device of ['desktop', 'phone']) {
        const w = await open(device, 'glas', '/', { customization: { favorites: FAVORITES } });
        const page = w.page;
        const list = () => ev(page, () => [...document.querySelectorAll('.home-page .g-device')].map((d) => ({
          name: d.querySelector('.g-device__name').textContent, on: d.hasAttribute('data-on'), state: d.querySelector('.g-device__state').textContent })));
        await bringSection(page, 'devices');
        const before = await list();
        const i = before.findIndex((d) => d.on);
        const sel = device === 'phone' ? '.g-device__toggle' : '.g-device__switch';
        const ctl = page.locator('.home-page .g-device').nth(i).locator(sel);
        await (device === 'phone' ? ctl.tap() : ctl.click());
        await sleep(400);
        const off = await list();
        await (device === 'phone' ? ctl.tap() : ctl.click());
        await sleep(400);
        const on = await list();
        await page.reload({ waitUntil: 'load' });
        await page.waitForFunction(() => document.querySelector('#root > *') && window.__hapulseDemo);
        await sleep(600);
        await w.close();
        res[device] = { name: before[i].name, before, off, on };
        const r = res[device];
        // the state reads like any other device that is off (HA's own word, "Aus"; the demo has no HA translations)
        r.ok = off.length === before.length && off[i].name === r.name && !off[i].on && !!off[i].state
          && off[i].state !== before[i].state && !off[i].state.includes('%')
          && on.length === before.length && on[i].on;
      }
      out.homeKeptOff = res;
      out.homeKeptOffOk = Object.values(res).every((r) => r.ok);
    });

    // 10. A room picture from Home Assistant: Klassisch shows it on the main room card, Glas keeps the card plain (E8).
    await block('homePicture', async () => {
      const res = {};
      for (const style of ['classic', 'glas']) {
        const w = await open('desktop', style);
        const page = w.page;
        await ev(page, ([ids, pic]) => ids.forEach((id) => window.__hapulseDemo.patchArea(id, { picture: pic })), [AREAS, PICTURE]);
        await until(page, () => !!document.querySelector('.hero-room-card--photo'), null, style === 'classic' ? 4000 : 1200);
        res[style] = await ev(page, () => {
          const c = document.querySelector('.hero-room-card');
          return { photo: c.classList.contains('hero-room-card--photo'), var: c.style.getPropertyValue('--hero-photo') !== '' };
        });
        await w.close();
      }
      out.homePicture = res;
      out.homePictureOk = res.classic.photo && res.classic.var && !res.glas.photo && !res.glas.var;
    });

    out.homePageErrors = pageErrors;
    return ran.every((k) => out[k + 'Ok']) && pageErrors.length === 0;
  }

  /** Helpers for the overview checks in the page (`window.__h`). */
  function homeHelpers() {
    const rect = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height, right: b.right, bottom: b.bottom };
    };
    const shown = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    window.__h = {
      rect,
      cust() {
        try {
          return JSON.parse(localStorage.getItem('hapulse:settings')).state.customization;
        } catch {
          return {};
        }
      },
      /** The overview's cards in the order shown. */
      order() {
        return [...document.querySelectorAll('.home-page .overview-grid [data-section]')].map((c) => c.dataset.section);
      },
      hints() {
        return {
          section: !!document.querySelector('.home-page [data-section="hints"]'),
          rows: [...document.querySelectorAll('.home-page .hint-row')].filter(shown).map((b) => ({
            kind: b.dataset.kind, title: b.querySelector('.hint-row__title').textContent.trim(),
            sub: ((b.querySelector('.hint-row__sub') || {}).textContent || '').trim(),
          })),
        };
      },
      /** The open windows (not the copies of closing ones), by their title. */
      dialogs() {
        return [...document.querySelectorAll('[role="dialog"]')].filter((p) => !p.closest('.g-sheet-ghost') && shown(p)).map((p) => {
          const t = p.getAttribute('aria-labelledby') && document.getElementById(p.getAttribute('aria-labelledby'));
          return { title: ((t && t.textContent) || p.getAttribute('aria-label') || '').trim() };
        });
      },
      /** Where a focused element sits on the overview. */
      kindOf(el) {
        if (!el || el === document.body) return 'none';
        if (el.closest('.g-weather-line')) return 'weather';
        if (el.closest('.home-page .home-chips-mobile')) return 'chips';
        if (el.closest('.home-page .hint-row')) return 'hints';
        if (el.closest('.home-page .home-page__header')) return 'greeting';
        if (el.closest('.home-page .overview-grid')) return 'card';
        return el.closest('.home-page') ? 'page' : 'shell';
      },
    };
  }

  return { scenes, homeChecks };
};
