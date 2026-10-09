// [fork] glas-checks-pages.cjs — the other pages of Glas stage 5 for glas-shots.cjs (docs/glas/PLAN-ETAPPE-5.md §3):
// `checks --part pages`. glas-shots.cjs loads this file with its helpers; it is not run on its own.
//
// The checks run in real time and change the demo like the overview checks (glas-checks-home.cjs). Blocks so far:
// pagesSwitches (K91), pagesControls (K93), pagesFields (K94), pagesTitles, pagesCardTitles and pagesFrame (K89, K90,
// K85). The plan's other blocks (segments, edit, keep, empty, menus) come with their steps.

module.exports = function pages(h) {
  const { DE, DEVICES, ABORTED, settleAnimations, seedScript } = h;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /**
   * The classic switches that Glas draws as the iOS switch (K91), where the demo shows them. `box` is the control a tap
   * and Space reach (the label or the button), `capsule` the drawn track (null = the box itself), `knob` its knob
   * (null = the capsule's ::after), `state` reads on/off. `open` brings the switch on screen.
   */
  const KINDS = {
    automation: {
      path: '/automations', box: '.auto-row-toggle', capsule: '.auto-row-toggle__track', knob: '.auto-row-toggle__knob',
    },
    poolSchedule: {
      path: '/pool', box: '.pool-schedule .pool-switch', capsule: '.pool-switch__track', knob: '.pool-switch__thumb',
    },
    settings: {
      path: '/settings', box: `.admin-toggle[aria-label="${DE['glas.reduceTransparency.label']}"]`, capsule: null,
      knob: '.admin-toggle__thumb',
    },
    lights: {
      path: '/', open: (page) => click(page, '.summary-chip[data-chip="lights"]'),
      box: '.lights-modal__toggle', capsule: '.lights-modal__toggle-track', knob: null,
    },
    device: {
      path: '/devices', open: openDeviceWithSwitch, box: '.device-toggle', capsule: null, knob: '.device-toggle__knob',
    },
  };

  /** Click the first visible match (scrolled into view), then let it settle. */
  async function click(page, sel) {
    const el = page.locator(sel).filter({ visible: true }).first();
    if (!(await el.count())) throw new Error('not visible: ' + sel);
    await el.click();
    await sleep(80);
    await settleAnimations(page);
  }

  /** The devices page: the first device whose window has a switch row. */
  async function openDeviceWithSwitch(page) {
    const n = await page.locator('.device-card').count();
    for (let i = 0; i < Math.min(n, 40); i++) {
      await page.locator('.device-card').nth(i).click();
      await sleep(150);
      await settleAnimations(page);
      if (await page.locator('[role="dialog"] .device-toggle').filter({ visible: true }).count()) return;
      await page.keyboard.press('Escape');
      await sleep(150);
      await settleAnimations(page);
    }
    throw new Error('no device with a switch row');
  }

  async function pagesChecks(browser, url, out, opts = {}) {
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

    /** A real-time document of the demo in Glas (or Klassisch). */
    const open = async (device, style, p, extra = {}) => {
      const ctx = await browser.newContext({
        ...DEVICES[device], ...(extra.viewport ? { viewport: extra.viewport } : {}), locale: 'de-DE',
        timezoneId: 'Europe/Berlin', colorScheme: extra.mode || 'light', reducedMotion: 'no-preference',
      });
      await ctx.route((u) => !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(u.href), (r) => r.abort());
      await ctx.addInitScript(seedScript({ demo: true, mode: extra.mode || 'light', style, strength: 'clear', customization: extra.customization }));
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

    // ---- K91: every list switch is the iOS switch — 51 × 31, iOS green / grey, knob 27 white at 2 / 22, hit area
    //      64 × 44 (a point 5 px outside the capsule still reaches the control), click, Space and a tap on the edge of
    //      the hit area switch. The pill of a switch card (detail) lets the tap through to the card. Glas only. ----
    await block('pagesSwitches', async () => {
      const res = {};
      for (const [device, mode] of [['desktop', 'light'], ['phone', 'dark']]) {
        for (const [kind, k] of Object.entries(KINDS)) {
          const { page, close } = await open(device, 'glas', k.path, { mode });
          try {
            if (k.open) await k.open(page);
            const box = page.locator(k.box).filter({ visible: true }).first();
            if (!(await box.count())) throw new Error('not visible: ' + k.box);
            await box.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
            await settleAnimations(page);
            const look = () => ev(page, ([sel, capSel, knobSel]) => {
              const boxEl = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length);
              const cap = capSel ? boxEl.querySelector(capSel) : boxEl;
              const knob = knobSel ? boxEl.querySelector(knobSel) : null;
              const kcs = knob ? getComputedStyle(knob) : getComputedStyle(cap, '::after');
              const input = boxEl.querySelector('input');
              const on = input ? input.checked : boxEl.getAttribute('aria-checked') === 'true';
              const c = cap.getBoundingClientRect();
              const kx = knob ? knob.getBoundingClientRect().left - c.left
                : parseFloat(kcs.left) + (new DOMMatrixReadOnly(kcs.transform === 'none' ? undefined : kcs.transform).m41 || 0);
              const tok = (name) => {
                const d = document.createElement('div');
                d.style.background = `var(${name})`;
                document.body.appendChild(d);
                const v = getComputedStyle(d).backgroundColor;
                d.remove();
                return v;
              };
              // a point 5 px outside each edge of the capsule still belongs to the control
              const owner = (x, y) => {
                const e = document.elementFromPoint(x, y);
                return !!e && e.closest(sel) === boxEl;
              };
              const mx = c.left + c.width / 2;
              const my = c.top + c.height / 2;
              return {
                on, w: c.width, h: c.height, kx: Math.round(kx), kw: parseFloat(kcs.width), kbg: kcs.backgroundColor,
                bg: getComputedStyle(cap).backgroundColor, want: tok(on ? '--g-switch-on' : '--g-switch-off'),
                knobWhite: tok('--g-knob'),
                hit: { left: owner(c.left - 5, my), right: owner(c.right + 5, my), top: owner(mx, c.top - 5), bottom: owner(mx, c.bottom + 5) },
                edge: { x: c.right + 5, y: my }, mid: { x: mx, y: my },
              };
            }, [k.box, k.capsule, k.knob]);
            const settle = async (was) => {
              await page.waitForFunction(([sel, w]) => {
                const b = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length);
                const input = b && b.querySelector('input');
                return b && (input ? input.checked : b.getAttribute('aria-checked') === 'true') !== w;
              }, [k.box, was], { timeout: 3000 }).catch(() => {});
              await sleep(80);
              await settleAnimations(page);
            };
            const a = await look();
            // click in the middle
            await page.mouse.click(a.mid.x, a.mid.y);
            await settle(a.on);
            const b = await look();
            // Space on the control (the label's input or the button)
            await ev(page, (sel) => {
              const boxEl = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length);
              (boxEl.querySelector('input') || boxEl).focus();
            }, k.box);
            await page.keyboard.press('Space');
            await settle(b.on);
            const c = await look();
            // a tap 5 px beside the capsule
            await page.mouse.click(c.edge.x, c.edge.y);
            await settle(c.on);
            const d = await look();
            const shape = (s) => Math.abs(s.w - 51) < 0.6 && Math.abs(s.h - 31) < 0.6 && Math.abs(s.kw - 27) < 0.6
              && s.kx === (s.on ? 22 : 2) && s.kbg === s.knobWhite && s.bg === s.want;
            const ok = [a, b, c, d].every(shape) && Object.values(a.hit).every(Boolean)
              && b.on !== a.on && c.on !== b.on && d.on !== c.on;
            res[`${device}-${kind}`] = { ok, a: { on: a.on, w: a.w, h: a.h, kx: a.kx, bg: a.bg, hit: a.hit }, flips: [a.on, b.on, c.on, d.on], shapes: [a, b, c, d].map(shape) };
          } catch (e) {
            res[`${device}-${kind}`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }
        // the detail's control card: the pill is a picture of the card's state; a tap on it switches the card
        {
          const { page, close } = await open(device, 'glas', '/', { mode });
          try {
            await ev(page, () => window.__hapulseDemo.openDetail('switch.coffee_machine'));
            await sleep(300);
            await settleAnimations(page);
            const state = () => ev(page, () => window.__hapulseDemo.entity('switch.coffee_machine').state);
            const track = page.locator('.entity-detail__control .pill-toggle__track').filter({ visible: true }).first();
            const s0 = await state();
            const t = await track.boundingBox();
            await page.mouse.click(t.x + t.width / 2, t.y + t.height / 2);
            await page.waitForFunction((w) => window.__hapulseDemo.entity('switch.coffee_machine').state !== w, s0, { timeout: 3000 }).catch(() => {});
            const s1 = await state();
            await page.locator('.entity-detail__control .toggle-card').first().focus();
            await page.keyboard.press('Space');
            await page.waitForFunction((w) => window.__hapulseDemo.entity('switch.coffee_machine').state !== w, s1, { timeout: 3000 }).catch(() => {});
            const s2 = await state();
            const size = await track.boundingBox();
            res[`${device}-detailPill`] = { ok: s1 !== s0 && s2 !== s1 && Math.abs(size.width - 51) < 0.6, states: [s0, s1, s2] };
          } catch (e) {
            res[`${device}-detailPill`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }
      }
      out.pagesSwitches = res;
      out.pagesSwitchesOk = Object.values(res).every((r) => r.ok);
    });

    // ---- K93 building blocks: steppers round 44 in fill, choice pills 36 (chosen = accentSoft), sliders in Glas
    //      colours (track fill2, brightness yellow, volume label2), gradient knobs 24, play 44 / 56 (playing = blue).
    //      A click on +, on a pill and on play still does what it did. Glas only. ----
    await block('pagesControls', async () => {
      const res = {};
      const probe = (page) => ev(page, () => {
        const tok = (name) => {
          const d = document.createElement('div');
          d.style.background = `var(${name})`;
          document.body.appendChild(d);
          const v = getComputedStyle(d).backgroundColor;
          d.remove();
          return v;
        };
        const vis = (sel) => [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length);
        const box = (e) => e && { w: Math.round(e.getBoundingClientRect().width * 10) / 10, h: Math.round(e.getBoundingClientRect().height * 10) / 10, bg: getComputedStyle(e).backgroundColor, r: getComputedStyle(e).borderRadius };
        const step = vis('.climate-card__step-btn');
        const pills = [...document.querySelectorAll('.climate-card__mode-pill')].filter((e) => e.getClientRects().length);
        const active = pills.find((e) => e.classList.contains('climate-card__mode-pill--active'));
        const fill = vis('.light-card__fill:not(.light-card__fill--temp)');
        const temp = vis('.light-card__fill--temp');
        const play = vis('.media-card__play-btn');
        const pool = vis('.pool-stepper__btn');
        const np = vis('.now-playing-card__play-btn');
        const accent = vis('.accent-slider');
        const music = vis('.now-playing-card__progress, .player-tile__volume, .zone-row__slider');
        return {
          fill: tok('--g-fill'), fill2: tok('--g-fill-2'), yellow: tok('--g-yellow'), blue: tok('--g-blue'),
          soft: tok('--g-accent-soft'),
          step: box(step), pills: pills.map((p) => box(p).h), active: box(active),
          light: fill && { fill: getComputedStyle(fill).backgroundColor, track: getComputedStyle(fill.parentElement).backgroundColor },
          tempKnob: temp && parseFloat(getComputedStyle(temp, '::after').width),
          play: play && { ...box(play), playing: !!play.closest('.card--active') },
          pool: box(pool),
          np: np && { ...box(np), playing: !!np.querySelector(':scope > .lucide-pause') },
          // the thumb has no computed style of its own: read the Glas rule that applies to the slider
          accent: accent && {
            h: accent.getBoundingClientRect().height,
            knob: [...document.styleSheets].flatMap((sh) => { try { return [...sh.cssRules]; } catch { return []; } })
              .filter((r) => r.selectorText && r.selectorText.endsWith('.accent-slider::-webkit-slider-thumb')
                && accent.matches(r.selectorText.replace('::-webkit-slider-thumb', '')) && r.selectorText.includes('data-style'))
              .map((r) => parseFloat(r.style.width))[0],
          },
          music: music && getComputedStyle(music).backgroundImage.includes(tok('--g-label-2')) && getComputedStyle(music).backgroundImage.includes(tok('--g-fill-2')),
        };
      });
      const round44 = (b) => b && Math.abs(b.w - 44) < 0.6 && Math.abs(b.h - 44) < 0.6 && b.r === '50%';
      for (const [device, mode] of [['desktop', 'light'], ['phone', 'dark']]) {
        // room: climate stepper and pills, light sliders, media card play
        {
          const { page, close } = await open(device, 'glas', '/room/living_room', { mode });
          try {
            const a = await probe(page);
            const value = () => ev(page, () => [...document.querySelectorAll('.climate-card__target-value')].find((e) => e.getClientRects().length)?.textContent);
            const v0 = await value();
            await page.locator('.climate-card__step-btn').filter({ visible: true }).nth(1).click();
            await sleep(150);
            const v1 = await value();
            const other = page.locator('.climate-card__mode-pill:not(.climate-card__mode-pill--active)').filter({ visible: true }).first();
            const otherText = await other.textContent();
            await other.click();
            await sleep(200);
            const nowActive = await ev(page, () => [...document.querySelectorAll('.climate-card__mode-pill--active')].find((e) => e.getClientRects().length)?.textContent);
            await page.locator('.media-card__play-btn').filter({ visible: true }).first().click();
            await sleep(400);
            await settleAnimations(page);
            const b = await probe(page);
            const playOk = (p) => p && Math.abs(p.w - 44) < 0.6 && p.bg === (p.playing ? a.blue : a.fill);
            const ok = round44(a.step) && a.step.bg === a.fill && v1 !== v0
              && a.pills.length > 1 && a.pills.every((h) => Math.abs(h - 36) < 0.6) && a.active && a.active.bg === a.soft
              && nowActive === otherText
              && a.light && a.light.fill === a.yellow && a.light.track === a.fill2 && (a.tempKnob == null || a.tempKnob === 24)
              && playOk(a.play) && playOk(b.play) && a.play.playing !== b.play.playing;
            res[`${device}-room`] = { ok, step: a.step, values: [v0, v1], pills: a.pills, active: a.active, mode: [otherText, nowActive], light: a.light, tempKnob: a.tempKnob, play: [a.play, b.play] };
          } catch (e) {
            res[`${device}-room`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }
        // pool page stepper, music Now Playing, settings accent slider
        for (const [name, p] of [['pool', '/pool'], ['music', '/music'], ['settings', '/settings']]) {
          const { page, close } = await open(device, 'glas', p, { mode });
          try {
            const a = await probe(page);
            let ok;
            if (name === 'pool') ok = round44(a.pool) && a.pool.bg === a.fill;
            else if (name === 'settings') ok = !!a.accent && Math.abs(a.accent.h - 28) < 0.6 && a.accent.knob === 24;
            else {
              await page.locator('.now-playing-card__play-btn').filter({ visible: true }).first().click();
              await sleep(400);
              await settleAnimations(page);
              const b = await probe(page);
              const npOk = (n) => n && Math.abs(n.w - 56) < 0.6 && n.bg === (n.playing ? a.blue : a.fill);
              ok = npOk(a.np) && npOk(b.np) && a.np.playing !== b.np.playing && a.music === true;
              res[`${device}-${name}-after`] = b.np;
            }
            res[`${device}-${name}`] = { ok, pool: a.pool, np: a.np, music: a.music, accent: a.accent };
          } catch (e) {
            res[`${device}-${name}`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }
      }
      out.pagesControls = res;
      out.pagesControlsOk = Object.entries(res).filter(([k]) => !k.endsWith('-after')).every(([, r]) => r.ok);
    });

    // ---- K94 fields: fill, 36 visible in a hit area of 44, text 17; a click 2 px inside the hit area but outside the
    //      visible field still focuses it, and typing still reaches it. Glas only. ----
    await block('pagesFields', async () => {
      const res = {};
      const FIELDS = [
        ['devices', '/devices', '.devices-toolbar__search-input', '.devices-toolbar__search'],
        ['automations', '/automations', '.automations-toolbar__search-input', '.automations-toolbar__search'],
        ['settings', '/settings', '.settings-text-input', null],
        ['library', '/music', '.library-card__search-input', null],
      ];
      for (const [device, mode] of [['desktop', 'light'], ['phone', 'dark']]) {
        for (const [name, p, input, bar] of FIELDS) {
          const { page, close } = await open(device, 'glas', p, { mode });
          try {
            const field = page.locator(input).filter({ visible: true }).first();
            if (!(await field.count())) throw new Error('not visible: ' + input);
            await field.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
            await settleAnimations(page);
            const a = await ev(page, ([sel, barSel]) => {
              const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length);
              const shown = barSel ? el.closest(barSel) : el;
              const cs = getComputedStyle(shown);
              const d = document.createElement('div');
              d.style.background = 'var(--g-fill)';
              document.body.appendChild(d);
              const fill = getComputedStyle(d).backgroundColor;
              d.remove();
              const r = el.getBoundingClientRect();
              const s = shown.getBoundingClientRect();
              const visible = barSel ? s.height : r.height - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth);
              return { hit: r.height, visible, top: Math.min(r.top, s.top), x: r.left + Math.min(40, r.width / 2), bg: cs.backgroundColor, fill, font: getComputedStyle(el).fontSize, visTop: barSel ? s.top : r.top + parseFloat(cs.borderTopWidth) };
            }, [input, bar]);
            // a click 2 px above the visible field, inside the hit area
            await page.mouse.click(a.x, a.visTop - 2);
            await sleep(100);
            const focused = await ev(page, (sel) => document.activeElement && document.activeElement.matches(sel), input);
            await page.keyboard.type('ab');
            const typed = await field.inputValue();
            const ok = Math.abs(a.hit - 44) < 0.6 && Math.abs(a.visible - 36) < 0.6 && a.bg === a.fill && a.font === '17px' && focused && typed.endsWith('ab');
            res[`${device}-${name}`] = { ok, hit: a.hit, visible: a.visible, bg: a.bg, font: a.font, focused, typed };
          } catch (e) {
            res[`${device}-${name}`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }
      }
      out.pagesFields = res;
      out.pagesFieldsOk = Object.values(res).every((r) => r.ok);
    });

    // ---- K89 section titles: sentence case instead of capitals, no hairline; room 20 in label (also in edit mode),
    //      settings 15 in label2. Glas only. ----
    await block('pagesTitles', async () => {
      const res = {};
      const read = (page) => ev(page, () => {
        const d = document.createElement('div');
        d.style.color = 'var(--g-label)';
        document.body.appendChild(d);
        const label = getComputedStyle(d).color;
        d.style.color = 'var(--g-label-2)';
        const label2 = getComputedStyle(d).color;
        d.remove();
        return {
          label, label2,
          titles: [...document.querySelectorAll('.section-label')].filter((e) => e.getClientRects().length && !e.closest('.home-page')).map((e) => {
            const cs = getComputedStyle(e);
            const line = e.querySelector('[aria-hidden="true"]');
            const first = getComputedStyle(e.firstElementChild, '::first-letter').textTransform;
            return { size: cs.fontSize, caps: cs.textTransform, first, color: cs.color, line: !!line && line.getClientRects().length > 0 };
          }),
        };
      });
      for (const [device, mode] of [['desktop', 'light'], ['phone', 'dark']]) {
        for (const [name, p] of [['room', '/room/living_room'], ['settings', '/settings']]) {
          const { page, close } = await open(device, 'glas', p, { mode });
          try {
            const runs = [await read(page)];
            if (name === 'room') {
              // edit mode: the header capsule on the desktop, the avatar menu on the phone (as the edit scene)
              if (device === 'phone') {
                await click(page, '.g-avatar__btn');
                await click(page, `.g-avatar-menu__item:has-text("${DE['glas.avatar.edit']}")`);
              } else await click(page, '.g-edit-capsule');
              await page.waitForSelector('.room-section__label-row', { timeout: 3000 });
              runs.push(await read(page));
            }
            const want = name === 'room' ? ['20px', 'label'] : ['15px', 'label2'];
            const ok = runs.every((r) => r.titles.length > 0 && r.titles.every((t) => t.size === want[0]
              && t.caps === 'none' && t.first === 'uppercase' && t.color === r[want[1]] && !t.line));
            res[`${device}-${name}`] = { ok, n: runs.map((r) => r.titles.length), first: runs.map((r) => r.titles[0]) };
          } catch (e) {
            res[`${device}-${name}`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }
      }
      out.pagesTitles = res;
      out.pagesTitlesOk = Object.values(res).every((r) => r.ok);
    });

    // ---- K89 card titles on every page: above the surface (the card itself has no background, its ::before surface
    //      starts below the 44-px head + 6-px gap, the title (20, label) sits above it, the first body part 16 px
    //      inside it, the icon chip is a bare symbol), or in the surface where the head carries a control or the card
    //      is only its head (pool schedule, the music page, water with one meter). Glas only. ----
    await block('pagesCardTitles', async () => {
      const res = {};
      // [page, card, title, chip, where]
      const CARDS = [
        ['/security', '.people-list-card', '.people-list-card__title', '.people-list-card__icon-chip', 'above'],
        ['/security', '.locks-section-card', '.locks-section-card__title', '.locks-section-card__icon-chip', 'above'],
        ['/security', '.garage-section-card', '.garage-section-card__title', '.garage-section-card__icon-chip', 'above'],
        ['/security', '.sensor-section-card', '.sensor-section-card__title', '.sensor-section-card__icon-chip', 'above'],
        ['/energy', '.energy-sources', '.energy-card__title', '.energy-card__icon-chip', 'above'],
        ['/energy', '.energy-devices', '.energy-card__title', '.energy-card__icon-chip', 'above'],
        ['/energy', '.energy-solar', '.energy-card__title', '.energy-card__icon-chip', 'above'],
        ['/energy', '.energy-water', '.energy-card__title', '.energy-card__icon-chip', 'inside'],
        ['/pool', '.pool-card:not(.pool-schedule)', '.pool-card__title', '.pool-card__icon', 'above'],
        ['/pool', '.pool-schedule', '.pool-card__title', '.pool-card__icon', 'inside'],
        ['/music', '.other-players-card', '.other-players-card__title', '.other-players-card__icon-chip', 'inside'],
        ['/music', '.zones-card', '.zones-card__title', '.zones-card__icon-chip', 'inside'],
        ['/music', '.queue-card', '.queue-card__title', '.queue-card__title-icon', 'inside'],
        ['/music', '.library-card', '.library-card__title', '.library-card__title-icon', 'inside'],
        ['/system', '.sys-monitor-card', '.sys-monitor-card__title', '.sys-monitor-card__icon-chip', 'above'],
        ['/system', '.batteries-card', '.batteries-card__title', '.batteries-card__icon-chip', 'above'],
        ['/system', '.activity-card', '.activity-card__title', '.activity-card__icon-chip', 'above'],
        ['/automations', '.auto-feed-card', '.auto-feed-card__title', '.auto-feed-card__icon-chip', 'above'],
        ['/automations', '.auto-cat-card', '.auto-cat-card__title', '.auto-cat-card__icon-chip', 'above'],
        ['/scenes', '.scene-feed-card', '.scene-feed-card__title', '.scene-feed-card__icon-chip', 'above'],
        ['/scenes', '.scene-room-card', '.scene-room-card__title', '.scene-room-card__icon-chip', 'above'],
      ];
      const PAGES = [...new Set(CARDS.map((c) => c[0]))];
      for (const [device, mode] of [['desktop', 'light'], ['phone', 'dark']]) {
        for (const p of PAGES) {
          const { page, close } = await open(device, 'glas', p, { mode });
          try {
            const cards = await ev(page, (specs) => {
              const d = document.createElement('div');
              d.style.color = 'var(--g-label)';
              document.body.appendChild(d);
              const label = getComputedStyle(d).color;
              d.remove();
              return specs.flatMap(([, sel, titleSel, chipSel, where]) => {
                const els = [...document.querySelectorAll(`.page ${sel}`)].filter((e) => e.getClientRects().length);
                if (!els.length) return [{ sel, missing: true }];
                return els.map((card) => {
                  const r = card.getBoundingClientRect();
                  const surface = r.top + 44 + 6;
                  const title = card.querySelector(titleSel);
                  const tr = title.getBoundingClientRect();
                  const tcs = getComputedStyle(title);
                  const body = card.children[1]?.getBoundingClientRect();
                  const before = getComputedStyle(card, '::before');
                  const chip = card.querySelector(chipSel);
                  const base = { sel, where, size: tcs.fontSize, label: tcs.color === label,
                    chip: !chip || getComputedStyle(chip).backgroundColor === 'rgba(0, 0, 0, 0)' };
                  if (where === 'inside') {
                    return { ...base, ok: getComputedStyle(card).backgroundColor !== 'rgba(0, 0, 0, 0)'
                      && before.content === 'none' && tr.top >= r.top - 0.5 && tr.bottom <= surface + 0.5 };
                  }
                  return { ...base, ok: getComputedStyle(card).backgroundColor === 'rgba(0, 0, 0, 0)'
                    && before.content !== 'none' && before.backgroundColor !== 'rgba(0, 0, 0, 0)'
                    && tr.bottom <= surface + 0.5 && !!body && body.top >= surface + 16 - 0.5 };
                });
              });
            }, CARDS.filter((c) => c[0] === p));
            const bad = cards.filter((c) => c.missing || !c.ok || c.size !== '20px' || !c.label || !c.chip);
            res[`${device}${p}`] = { ok: bad.length === 0, cards: cards.length, ...(bad.length ? { bad: bad.slice(0, 3) } : {}) };
          } catch (e) {
            res[`${device}${p}`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }
      }
      out.pagesCardTitles = res;
      out.pagesCardTitlesOk = Object.values(res).every((r) => r.ok);
    });

    // ---- K89/K90/K85 the frame. Columns by content width (1920/1440/1100/900: 4/3/2/2; a grid whose cards all span
    //      two columns takes four from 900 px of content), no page wider than the window; a card without a title above
    //      (hero, alarm panel, pool schedule) starts its surface on the line of its neighbours' surfaces; heroes keep
    //      their state as colour (security disarmed/armed/triggered, system healthy) with the symbol in a circle,
    //      chips 32 in `fill`, no capitals; the stateless heroes lose their gradient; the camera section has neither
    //      head nor surface; no element of a page that became a size container is fixed (windows and menus are
    //      portaled: open ones included), the notifications panel still hangs below its bell. Glas only. ----
    await block('pagesFrame', async () => {
      const res = {};
      const GRID = ['/security', '/energy', '/system', '/automations', '/scenes'];
      const tokens = (page) => ev(page, () => {
        const out = {};
        const d = document.createElement('div');
        document.body.appendChild(d);
        for (const t of ['--g-label', '--g-label-2', '--g-fill', '--g-green-ink', '--g-green-soft', '--g-red-ink', '--g-warn-ink']) {
          d.style.color = `var(${t})`;
          out[t] = getComputedStyle(d).color;
        }
        d.remove();
        return out;
      });

      // columns and alignment
      const WANT = { 1920: [4, 4], 1440: [3, 4], 1100: [2, 2], 900: [2, 2] };
      for (const w of [1920, 1440, 1100, 900]) {
        for (const p of [...GRID, '/pool']) {
          const { page, close } = await open('desktop', 'glas', p, { viewport: { width: w, height: 1000 } });
          try {
            const got = await ev(page, () => {
              const grid = document.querySelector('.page > .overview-grid');
              const cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 0;
              const wide = !!grid && ![...grid.children].some((c) => c.classList.contains('overview-grid__cell')
                && ![...c.classList].some((k) => k.startsWith('overview-grid__cell--span-')));
              // a headless card next to a card with a title above: same row = cells start on the same line
              const HEADLESS = '.security-hero-card, .alarm-panel-card, .energy-hero, .system-hero-card, .auto-hero-card, .scene-hero-card, .pool-schedule';
              const titled = [...document.querySelectorAll('.page .card')].filter((c) => getComputedStyle(c, '::before').content !== 'none'
                && getComputedStyle(c).backgroundColor === 'rgba(0, 0, 0, 0)' && c.getClientRects().length);
              const pairs = [];
              // the grid item and the top of its grid area (a pool card is the item itself: less its own margin)
              const item = (el) => el.closest('.overview-grid__cell, .pool-grid > *') || el;
              const rowTop = (el) => {
                const it = item(el);
                return it.getBoundingClientRect().top - (it === el ? parseFloat(getComputedStyle(el).marginTop) || 0 : 0);
              };
              for (const h of document.querySelectorAll(`.page :is(${HEADLESS})`)) {
                if (!h.getClientRects().length) continue;
                const hr = item(h).getBoundingClientRect();
                const top = rowTop(h);
                const mate = titled.find((t) => Math.abs(rowTop(t) - top) < 1 && item(t).getBoundingClientRect().left !== hr.left);
                const full = Math.abs(hr.width - item(h).parentElement.getBoundingClientRect().width) < 1;
                pairs.push({ h: h.classList[1] || h.classList[0], mate: !!mate, full,
                  d: mate ? Math.round(h.getBoundingClientRect().top - (mate.getBoundingClientRect().top + 50)) : null,
                  top: Math.round(h.getBoundingClientRect().top - top) });
              }
              return { cols, wide, overflow: document.documentElement.scrollWidth > innerWidth + 0.5, pairs };
            });
            const want = p === '/pool' ? null : WANT[w][got.wide ? 1 : 0];
            // with a mate the surface sits on its line; alone in its row (or full width) it keeps its place
            const pairOk = got.pairs.every((x) => (x.mate ? Math.abs(x.d) <= 1 : x.top === 0 || !x.full));
            const ok = (want === null || got.cols === want) && !got.overflow && pairOk;
            const aligned = got.pairs.filter((x) => x.mate).map((x) => x.h);
            res[`cols-${w}${p}`] = { ok, cols: got.cols, ...(got.wide ? { wide: true } : {}), aligned, ...(ok ? {} : got) };
          } catch (e) {
            res[`cols-${w}${p}`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }
      }

      // heroes
      for (const [device, mode] of [['desktop', 'light'], ['phone', 'dark']]) {
        // security: disarmed, armed (green), triggered (red); chips; no capitals; the camera section
        {
          const { page, close } = await open(device, 'glas', '/security', { mode });
          try {
            const tk = await tokens(page);
            const read = () => ev(page, () => {
              const card = document.querySelector('.security-hero-card');
              const icon = card.querySelector('.security-hero-card__alarm-icon');
              const ir = icon.getBoundingClientRect();
              const state = getComputedStyle(card.querySelector('.security-hero-card__alarm-state'));
              const name = getComputedStyle(card.querySelector('.security-hero-card__alarm-name'));
              const chips = [...card.querySelectorAll('.security-hero-chip')].map((c) => {
                const cs = getComputedStyle(c);
                return { h: c.getBoundingClientRect().height, r: parseFloat(cs.borderTopLeftRadius), bg: cs.backgroundColor,
                  border: parseFloat(cs.borderTopWidth), warn: c.classList.contains('security-hero-chip--warn'),
                  svg: c.querySelector('svg') ? getComputedStyle(c.querySelector('svg')).color : null };
              });
              const cam = document.querySelector('.security-page__camera-section');
              return {
                cls: card.className, grad: getComputedStyle(card).backgroundImage,
                icon: { w: Math.round(ir.width), h: Math.round(ir.height), round: getComputedStyle(icon).borderTopLeftRadius === '50%'
                  || parseFloat(getComputedStyle(icon).borderTopLeftRadius) >= ir.width / 2 - 0.5, color: getComputedStyle(icon).color },
                state: { color: state.color, size: state.fontSize, weight: state.fontWeight },
                name: { caps: name.textTransform, size: name.fontSize },
                chips,
                cam: cam ? { before: getComputedStyle(cam, '::before').content, bg: getComputedStyle(cam).backgroundColor,
                  title: !!cam.querySelector('h2, h3, [class*="title"]:not([class*="camera"])') } : null,
              };
            });
            const runs = { disarmed: await read() };
            for (const [st, key] of [['armed_home', 'armed'], ['triggered', 'triggered']]) {
              await ev(page, (s2) => window.__hapulseDemo.patch('alarm_control_panel.home', { state: s2 }), st);
              await sleep(200);
              runs[key] = await read();
            }
            await ev(page, () => window.__hapulseDemo.patch('alarm_control_panel.home', { state: 'disarmed' }));
            const d = runs.disarmed;
            const chipsOk = d.chips.length > 0 && d.chips.every((c) => c.h >= 32 - 0.5 && c.r >= 16 && c.bg === tk['--g-fill']
              && c.border === 0 && (!c.warn || c.svg === tk['--g-warn-ink']));
            const ok = d.icon.round && Math.abs(d.icon.w - 56) <= 1 && d.state.color === tk['--g-label'] && d.state.size === '22px'
              && d.name.caps === 'none' && d.name.size === '13px'
              && runs.armed.state.color === tk['--g-green-ink'] && runs.armed.icon.color === tk['--g-green-ink']
              && /gradient/.test(runs.armed.grad)
              && runs.triggered.state.color === tk['--g-red-ink'] && runs.triggered.icon.color === tk['--g-red-ink']
              && chipsOk && !!d.cam && d.cam.before === 'none' && d.cam.bg === 'rgba(0, 0, 0, 0)' && !d.cam.title;
            res[`hero-${device}/security`] = { ok, ...(ok ? {} : { runs }) };
          } catch (e) {
            res[`hero-${device}/security`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }
        // system: healthy = green; chips; no capitals
        {
          const { page, close } = await open(device, 'glas', '/system', { mode });
          try {
            const tk = await tokens(page);
            const got = await ev(page, () => {
              const card = document.querySelector('.system-hero-card');
              const icon = card.querySelector('.system-hero-card__icon');
              const status = getComputedStyle(card.querySelector('.system-hero-card__status'));
              const label = getComputedStyle(card.querySelector('.system-hero-card__label'));
              return {
                cls: card.className,
                icon: { w: Math.round(icon.getBoundingClientRect().width), color: getComputedStyle(icon).color },
                status: status.color, size: status.fontSize, caps: label.textTransform,
                chips: [...card.querySelectorAll('.system-hero-chip')].map((c) => ({
                  h: c.getBoundingClientRect().height, bg: getComputedStyle(c).backgroundColor,
                  r: parseFloat(getComputedStyle(c).borderTopLeftRadius) })),
              };
            });
            const healthy = /system-hero-card--healthy/.test(got.cls);
            const ok = (!healthy || (got.status === tk['--g-green-ink'] && got.icon.color === tk['--g-green-ink']))
              && Math.abs(got.icon.w - 56) <= 1 && got.size === '22px' && got.caps === 'none' && got.chips.length > 0
              && got.chips.every((c) => c.h >= 32 - 0.5 && c.bg === tk['--g-fill'] && c.r >= 16);
            res[`hero-${device}/system`] = { ok, healthy, ...(ok ? {} : { got }) };
          } catch (e) {
            res[`hero-${device}/system`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }
        // the stateless heroes: plain card, eyebrow 15 label2 without capitals
        for (const [p, sel, bg, eyebrow] of [
          ['/energy', '.energy-hero', null, null],
          ['/automations', '.auto-hero-card', '.auto-hero-card__bg', '.auto-hero-card__eyebrow'],
          ['/scenes', '.scene-hero-card', '.scene-hero-card__bg', '.scene-hero-card__eyebrow'],
        ]) {
          const { page, close } = await open(device, 'glas', p, { mode });
          try {
            const tk = await tokens(page);
            const got = await ev(page, ([s1, s2, s3]) => {
              const card = document.querySelector(s1);
              const b = s2 ? card.querySelector(s2) : null;
              const e = s3 ? getComputedStyle(card.querySelector(s3)) : null;
              return { grad: getComputedStyle(card).backgroundImage, bg: b ? getComputedStyle(b).display : 'none',
                eyebrow: e ? { caps: e.textTransform, size: e.fontSize, color: e.color } : null };
            }, [sel, bg, eyebrow]);
            const ok = !/gradient/.test(got.grad) && got.bg === 'none'
              && (!got.eyebrow || (got.eyebrow.caps === 'none' && got.eyebrow.size === '15px' && got.eyebrow.color === tk['--g-label-2']));
            res[`hero-${device}${p}`] = { ok, ...(ok ? {} : { got }) };
          } catch (e) {
            res[`hero-${device}${p}`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }
      }

      // nothing fixed inside a page that became a size container, also with its windows and menus open
      for (const p of [...GRID, '/pool']) {
        const { page, close } = await open('desktop', 'glas', p);
        try {
          const fixedIn = () => ev(page, () => [...document.querySelectorAll('.page *')]
            .filter((e) => getComputedStyle(e).position === 'fixed').map((e) => e.className && String(e.className).slice(0, 40)));
          const container = await ev(page, () => getComputedStyle(document.querySelector('.pool-layout') || document.querySelector('.page')).containerType);
          const found = [...(await fixedIn())];
          let opened = 'none';
          if (p === '/security') {
            // arming asks for the code: in Glas the pad is a window (portaled), whole inside the browser window
            await click(page, '.alarm-btn:not(:disabled)');
            const pad = await ev(page, () => {
              const o = document.querySelector('.numpad-modal')?.closest('[role="dialog"]');
              if (!o) return null;
              const r = o.getBoundingClientRect();
              return { inPage: !!o.closest('.page'), inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5
                && r.bottom <= innerHeight + 0.5, w: Math.round(r.width) };
            });
            opened = pad ? 'numpad' : 'no numpad';
            found.push(...(await fixedIn()));
            if (!pad || pad.inPage || !pad.inside) found.push('numpad: ' + JSON.stringify(pad));
            await page.keyboard.press('Escape');
            await sleep(300);
            await settleAnimations(page);
          }
          if (p === '/system' || p === '/energy') {
            // an entity's detail as a tap opens it (the inspector from 1100 px), outside the page
            await ev(page, () => window.__hapulseDemo.openDetail('light.living_room_ceiling'));
            await sleep(400);
            await settleAnimations(page);
            const win = await ev(page, () => {
              const d = [...document.querySelectorAll('[role="dialog"], [role="complementary"]')].find((e) => e.getClientRects().length);
              if (!d) return null;
              const r = d.getBoundingClientRect();
              return { inPage: !!d.closest('.page'), inside: r.left >= -0.5 && r.right <= innerWidth + 0.5 && r.top >= -0.5 };
            });
            opened = win ? 'detail' : 'no detail';
            found.push(...(await fixedIn()));
            if (!win || win.inPage || !win.inside) found.push('detail: ' + JSON.stringify(win));
            await page.keyboard.press('Escape');
            await sleep(300);
            await settleAnimations(page);
          }
          const bell = page.locator('.header-cluster .notifications-trigger').filter({ visible: true }).first();
          let panel = null;
          if (await bell.count()) {
            await bell.click();
            await sleep(250);
            await settleAnimations(page);
            panel = await ev(page, () => {
              const pn = document.querySelector('.notifications-panel');
              const b = document.querySelector('.header-cluster .notifications-trigger').getBoundingClientRect();
              if (!pn) return null;
              const r = pn.getBoundingClientRect();
              return { gap: Math.round(r.top - b.bottom), inPage: !!pn.closest('.page'), right: Math.round(innerWidth - r.right) };
            });
            found.push(...(await fixedIn()));
            await page.keyboard.press('Escape');
          }
          const ok = container !== 'normal' && found.length === 0 && !!panel && !panel.inPage && panel.gap >= 0 && panel.gap <= 24;
          res[`fixed${p}`] = { ok, container, opened, panel, ...(found.length ? { found: found.slice(0, 4) } : {}) };
        } catch (e) {
          res[`fixed${p}`] = { ok: false, error: String(e.message).slice(0, 160) };
        }
        await close();
      }
      out.pagesFrame = res;
      out.pagesFrameOk = Object.values(res).every((r) => r.ok);
    });

    out.pagesPageErrors = pageErrors;
    return ran.every((k) => out[k + 'Ok']) && pageErrors.length === 0;
  }

  return { pagesChecks };
};
