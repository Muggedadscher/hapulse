// [fork] glas-checks-pages.cjs — the other pages of Glas stage 5 for glas-shots.cjs (docs/glas/PLAN-ETAPPE-5.md §3):
// `checks --part pages`. glas-shots.cjs loads this file with its helpers; it is not run on its own.
//
// The checks run in real time and change the demo like the overview checks (glas-checks-home.cjs). Blocks so far:
// pagesSwitches (K91), pagesControls (K93), pagesFields (K94), pagesTitles, pagesCardTitles and pagesFrame (K89, K90,
// K85), pagesEdit (K96), pagesSegments (K92), pagesKeep and pagesEmpty (§3.1); segments, edit, keep and empty grow page
// by page as the pages come in. The plan's last block (menus) comes with its step. Service calls the demo does not apply
// (the pool's mode, threshold, schedule, restart) are read from the demo's call log (`__hapulseDemo.calls()`).

module.exports = function pages(h) {
  const { DE, DEVICES, ABORTED, settleAnimations, seedScript, run, isGlas } = h;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // the energy checks' date (as `shoot`: 2026-10-06 12:30 Berlin): the demo's figures depend on the hour
  const ENERGY_AT = Date.parse('2026-10-06T10:30:00Z');

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
    // --only names blocks (`pagesKeep`) or parts of one (`pagesKeep:devices`, the parts of a block with several pages):
    // after a fix only the affected checks run (plan §3)
    const onlyBlocks = (opts.only || []).map((o) => o.split(':')[0]);
    const onlyParts = (name) => (opts.only || []).filter((o) => o.startsWith(`${name}:`)).map((o) => o.slice(name.length + 1));
    const block = async (name, fn) => {
      if (onlyBlocks.length && !onlyBlocks.includes(name)) return;
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
      // a fixed date (timers keep running): the demo's energy figures depend on the hour, two documents must agree
      if (extra.fixedTime) await ctx.clock.setFixedTime(extra.fixedTime);
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

    // ---- K93 building blocks: steppers round 44 in fill (the climate card's setpoint is a capsule 40 in fill with
    //      − / + 40 inside and a hit area of 44, §7.11, K97), choice pills 36 (chosen = accentSoft), sliders in Glas
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
        const capsule = vis('.climate-card__target-control');
        capsule?.scrollIntoView({ block: 'center', behavior: 'instant' });
        const cr = capsule && capsule.getBoundingClientRect();
        // 1 px outside the capsule, beside − : still the button (its hit area reaches 2 px beyond the visible 40)
        const hit = cr && document.elementFromPoint(cr.left - 1, cr.top + cr.height / 2)?.closest('.climate-card__step-btn');
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
          step: box(step), capsule: box(capsule), stepHit: !!hit && hit === capsule.firstElementChild,
          pills: pills.map((p) => box(p).h), active: box(active),
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
            const ok = a.capsule && Math.abs(a.capsule.h - 40) < 0.6 && a.capsule.r === '20px' && a.capsule.bg === a.fill
              && Math.abs(a.step.w - 40) < 0.6 && Math.abs(a.step.h - 40) < 0.6 && a.step.bg === 'rgba(0, 0, 0, 0)' && a.stepHit
              && v1 !== v0
              && a.pills.length > 1 && a.pills.every((h) => Math.abs(h - 36) < 0.6) && a.active && a.active.bg === a.soft
              && nowActive === otherText
              && a.light && a.light.fill === a.yellow && a.light.track === a.fill2 && (a.tempKnob == null || a.tempKnob === 24)
              && playOk(a.play) && playOk(b.play) && a.play.playing !== b.play.playing;
            res[`${device}-room`] = { ok, capsule: a.capsule, step: a.step, stepHit: a.stepHit, values: [v0, v1], pills: a.pills, active: a.active, mode: [otherText, nowActive], light: a.light, tempKnob: a.tempKnob, play: [a.play, b.play] };
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
    //      visible field still focuses it, and typing still reaches it (the pool editor's time field: the arrow up moves
    //      its hour). Glas only. ----
    await block('pagesFields', async () => {
      const res = {};
      const FIELDS = [
        ['devices', '/devices', '.devices-toolbar__search-input', '.devices-toolbar__search'],
        ['automations', '/automations', '.automations-toolbar__search-input', '.automations-toolbar__search'],
        ['settings', '/settings', '.settings-text-input', null],
        ['library', '/music', '.library-card__search-input', null],
        ['poolTime', '/pool', '[role="dialog"] .pool-time-input', null, (page) => click(page, '.pool-schedule__edit')],
      ];
      for (const [device, mode] of [['desktop', 'light'], ['phone', 'dark']]) {
        for (const [name, p, input, bar, opener] of FIELDS) {
          const { page, close } = await open(device, 'glas', p, { mode });
          try {
            if (opener) await opener(page);
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
            const before = await field.inputValue();
            if (name === 'poolTime') await page.keyboard.press('ArrowUp');
            else await page.keyboard.type('ab');
            await sleep(100);
            const typed = await field.inputValue();
            const reached = name === 'poolTime' ? typed !== before : typed.endsWith('ab');
            const ok = Math.abs(a.hit - 44) < 0.6 && Math.abs(a.visible - 36) < 0.6 && a.bg === a.fill && a.font === '17px' && focused && reached;
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
    //      inside it, the icon chip is a bare symbol), or in the surface where the head carries a control (pool
    //      schedule, the music page). Water with one meter and gas carry their figure in the surface. Glas only. ----
    await block('pagesCardTitles', async () => {
      const res = {};
      // [page, card, title, chip, where, list, body]: `list` = the body is an inset list (K94) that fills the surface from
      // its top edge; any other body starts at least 16 below it. `body` = selectors tried in turn for the body when it
      // is not the card's second child (water and gas: the list of meters, or with one meter its figure, whose header
      // is `display: contents`)
      const CARDS = [
        ['/security', '.people-list-card', '.people-list-card__title', '.people-list-card__icon-chip', 'above', true],
        ['/security', '.locks-section-card', '.locks-section-card__title', '.locks-section-card__icon-chip', 'above'],
        ['/security', '.garage-section-card', '.garage-section-card__title', '.garage-section-card__icon-chip', 'above'],
        ['/security', '.sensor-section-card', '.sensor-section-card__title', '.sensor-section-card__icon-chip', 'above', true],
        ['/energy', '.energy-sources', '.energy-card__title', '.energy-card__icon-chip', 'above'],
        ['/energy', '.energy-devices', '.energy-card__title', '.energy-card__icon-chip', 'above'],
        ['/energy', '.energy-solar', '.energy-card__title', '.energy-card__icon-chip', 'above'],
        ['/energy', '.energy-water', '.energy-card__title', '.energy-card__icon-chip', 'above', false, ['.energy-kv-list', '.energy-card__sub']],
        ['/pool', '.pool-card:not(.pool-schedule, .pool-data, .pool-admin)', '.pool-card__title', '.pool-card__icon', 'above'],
        ['/pool', ':is(.pool-data, .pool-admin)', '.pool-card__title', '.pool-card__icon', 'above', true],
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
              return specs.flatMap(([, sel, titleSel, chipSel, where, list, bodySels]) => {
                const els = [...document.querySelectorAll(`.page ${sel}`)].filter((e) => e.getClientRects().length);
                if (!els.length) return [{ sel, missing: true }];
                return els.map((card) => {
                  const r = card.getBoundingClientRect();
                  const surface = r.top + 44 + 6;
                  const title = card.querySelector(titleSel);
                  const tr = title.getBoundingClientRect();
                  const tcs = getComputedStyle(title);
                  const bodyEl = bodySels ? bodySels.map((b) => card.querySelector(b)).find(Boolean) : card.children[1];
                  const body = bodyEl?.getBoundingClientRect();
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
                    && tr.bottom <= surface + 0.5 && !!body
                    && (list ? body.top >= surface - 0.5 && body.top <= surface + 1.5 : body.top >= surface + 16 - 0.5) };
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

    // ---- K96 edit bar on the pages with a card grid (pagesEdit): S / M / L write the fields Klassisch reads (span,
    //      height, `tallSections` `<page>:<id>`), "⋯" sets columns and a cap, ‹ › keep the focus, the eye and the phone
    //      toggle; the bar covers nothing (desktop, iPad, phone); after a switch to Klassisch the same order, spans and
    //      hidden cards. One page after the other as they come in. ----
    const EDIT_PAGES = [
      { page: 'security', path: '/security', root: '.security-page', spans: 'securitySectionSpans', heights: 'securitySectionHeights',
        hidden: 'hiddenSecuritySections', mobile: 'mobileHiddenSecuritySections', card: 'people' },
      { page: 'energy', path: '/energy', root: '.energy-page', spans: 'energySectionSpans', heights: 'energySectionHeights',
        hidden: 'hiddenEnergySections', mobile: 'mobileHiddenEnergySections', card: 'devices' },
    ];
    /** Edit mode: the header capsule, on a phone in Glas the avatar menu. */
    const enterEdit = async (page) => {
      if (await page.locator('.g-edit-capsule:visible, .edit-toggle:visible').count()) await click(page, '.g-edit-capsule, .edit-toggle');
      else {
        await click(page, '.g-avatar__btn');
        await click(page, `.g-avatar-menu__item:has-text("${DE['glas.avatar.edit']}")`);
      }
      await sleep(300);
      await settleAnimations(page);
    };
    /** Per card in edit mode: what of its contents a visible part of its bar covers (text, controls). */
    const barCovers = (page, root) => ev(page, (r) => {
      const hits = [];
      for (const cell of document.querySelectorAll(`${r} .overview-grid__cell--editing`)) {
        const parts = [...cell.querySelectorAll(':scope > .g-size-bar > *')].filter((e) => e.getClientRects().length
          && getComputedStyle(e).visibility !== 'hidden' && !e.classList.contains('g-size-bar__space'))
          .map((e) => {
            const b = e.getBoundingClientRect();
            const inset = e.classList.contains('g-size-bar__btn') ? 4 : 0; // the circles are 36 in a 44 hit area
            return { l: b.left + inset, t: b.top + inset, r: b.right - inset, b: b.bottom - inset };
          });
        const content = [...cell.querySelectorAll('.edit-section-outline *')].filter((e) => {
          if (!e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') return false;
          if (e.matches('button, a, input, [role="button"], svg')) return true;
          return [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        });
        for (const e of content) {
          const b = e.getBoundingClientRect();
          if (b.width < 1 || b.height < 1) continue;
          if (parts.some((p) => p.l < b.right - 1 && p.r > b.left + 1 && p.t < b.bottom - 1 && p.b > b.top + 1)) {
            hits.push(`${cell.dataset.section}:${(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) || e.tagName}`);
          }
        }
      }
      return hits;
    }, root);

    await block('pagesEdit', async () => {
      const res = {};
      for (const cfg of EDIT_PAGES) {
        // S / M / L, "⋯", ‹ ›, eye and phone on the desktop; then the switch to Klassisch
        {
          const { page, close } = await open('desktop', 'glas', cfg.path);
          try {
            const r = {};
            const settle = async (ms = 250) => {
              await sleep(ms);
              await settleAnimations(page);
            };
            const bar = (id) => `${cfg.root} [data-section="${id}"] > .g-size-bar`;
            const order = () => ev(page, (root) => [...document.querySelectorAll(`${root} .overview-grid [data-section]`)].map((e) => e.dataset.section), cfg.root);
            const cust = () => ev(page, () => JSON.parse(localStorage.getItem('hapulse:settings') || '{}').state?.customization || {});
            const A = cfg.card;
            const isTall = (c) => (c.tallSections || []).includes(`${cfg.page}:${A}`);
            const focusOn = () => ev(page, () => {
              const a = document.activeElement;
              const sec = a && a.closest('[data-section]');
              return a ? `${a.dataset.move || a.getAttribute('aria-haspopup') || ''}|${sec ? sec.dataset.section : ''}` : '';
            });
            await enterEdit(page);
            const o1 = await order();
            r.name = await ev(page, (sel) => document.querySelector(sel)?.getAttribute('aria-label'), bar(A));

            await page.click(`${bar(A)} [role="radio"]:has-text("L")`);
            await settle();
            let c = await cust();
            r.L = { span: (c[cfg.spans] || {})[A], tall: isTall(c), height: (c[cfg.heights] || {})[A] || 0,
              cell: await ev(page, (sel) => Math.round(document.querySelector(sel).getBoundingClientRect().height), `${cfg.root} [data-section="${A}"]`) };
            await page.click(`${bar(A)} [role="radio"]:has-text("S")`);
            await settle();
            c = await cust();
            r.S = { span: c[cfg.spans][A], tall: isTall(c) };

            await page.click(`${bar(A)} [aria-haspopup="dialog"]`);
            await settle(450);
            r.sheetTitle = await ev(page, () => [...document.querySelectorAll('[role="dialog"]')].map((d) => d.textContent.slice(0, 80)).join('|'));
            await page.click('[role="dialog"] [role="radiogroup"] >> nth=0 >> [role="radio"]:has-text("3")');
            await settle();
            c = await cust();
            r.cols = { span: c[cfg.spans][A], none: await ev(page, (sel) => document.querySelector(sel + ' .g-seg').hasAttribute('data-none'), bar(A)) };
            await page.click('[role="dialog"] [role="radiogroup"] >> nth=1 >> [role="radio"]:has-text("280")');
            await settle();
            r.cap = ((await cust())[cfg.heights] || {})[A];
            await page.click('[role="dialog"] [role="radiogroup"] >> nth=1 >> [role="radio"] >> nth=0');
            await settle();
            r.capOff = ((await cust())[cfg.heights] || {})[A];
            await page.keyboard.press('Escape');
            await settle(450);
            r.focusBack = await focusOn();

            const second = o1[1];
            await page.focus(`${bar(second)} [data-move="1"]`);
            await page.keyboard.press('Enter');
            await settle(400);
            r.move = { order: await order(), focus: await focusOn() };
            await page.focus(`${bar(second)} [data-move="-1"]`);
            await page.keyboard.press('Enter');
            await settle(400);
            r.moveBack = await order();

            const toggle = async (nth, field) => {
              const btn = page.locator(`${bar(A)} [aria-pressed]`).nth(nth);
              await btn.click();
              await settle(300);
              const on = { stored: ((await cust())[field] || []).includes(A), pressed: await btn.getAttribute('aria-pressed') };
              await btn.click();
              await settle(300);
              return { ...on, back: ((await cust())[field] || []).includes(A) };
            };
            r.eye = await toggle(0, cfg.hidden);
            r.phone = await toggle(1, cfg.mobile);

            // the same layout after the switch to Klassisch (L reads as M there): A is L, the second card hidden
            await page.click(`${bar(A)} [role="radio"]:has-text("L")`);
            await settle();
            await page.locator(`${bar(second)} [aria-pressed]`).nth(0).click();
            await settle(300);
            const layout = () => ev(page, (root) => [...document.querySelectorAll(`${root} .overview-grid [data-section]`)].map((e) => {
              const m = `${e.parentElement.className} ${e.className}`.match(/span-(\d)/);
              return `${e.dataset.section}:${m ? m[1] : 1}:${e.classList.contains('overview-grid__cell--hidden') ? 'h' : ''}`;
            }).join(','), cfg.root);
            r.glas = await layout();
            await ev(page, () => {
              const st = JSON.parse(localStorage.getItem('hapulse:settings'));
              st.state.customization.uiStyle = 'classic';
              localStorage.setItem('hapulse:settings', JSON.stringify(st));
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForFunction(() => document.querySelector('#root > *'));
            await settle(900);
            await enterEdit(page);
            r.classic = await layout();
            r.classicStyle = await ev(page, () => document.documentElement.getAttribute('data-style'));
            r.classicGlas = await ev(page, () => document.querySelectorAll('.g-tall, .g-size-bar').length);

            const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
            const ok = !!r.name && r.L.span === 2 && r.L.tall && !r.L.height && r.L.cell >= 470 + 38
              && r.S.span === 1 && !r.S.tall && r.sheetTitle.includes(r.name)
              && r.cols.span === 3 && r.cols.none && r.cap === 2 && !r.capOff && r.focusBack === `dialog|${A}`
              && r.move.order[2] === second && r.move.focus === `1|${second}` && same(r.moveBack, o1)
              && r.eye.stored && r.eye.pressed === 'true' && !r.eye.back
              && r.phone.stored && r.phone.pressed === 'true' && !r.phone.back
              && r.glas === r.classic && r.classicStyle !== 'glas' && r.classicGlas === 0;
            res[`${cfg.page}-desktop`] = { ok, order: o1, ...r };
          } catch (e) {
            res[`${cfg.page}-desktop`] = { ok: false, error: String(e.message).slice(0, 200) };
          }
          await close();
        }

        // the bar covers nothing: default sizes, then with a capped titled card, an L card and a hero sharing a row
        for (const device of ['desktop', 'ipad', 'phone']) {
          for (const [variant, extra] of [['default', {}], ['sized', { [cfg.heights]: { [cfg.card]: 1 }, tallSections: [`${cfg.page}:${cfg.card}`] }]]) {
            const { page, close } = await open(device, 'glas', cfg.path, { customization: extra });
            try {
              await enterEdit(page);
              await page.evaluate(() => window.scrollTo(0, 0));
              await settleAnimations(page);
              const bars = await ev(page, (root) => document.querySelectorAll(`${root} .overview-grid__cell--editing > .g-size-bar`).length, cfg.root);
              const cells = await ev(page, (root) => document.querySelectorAll(`${root} .overview-grid__cell--editing`).length, cfg.root);
              const hits = await barCovers(page, cfg.root);
              const classic = await ev(page, (root) => [...document.querySelectorAll(`${root} .overview-grid__cell--editing > :is(.edit-badge, .overview-span-dots, .overview-resize-handle, .section-height-dots, .section-height-handle)`)]
                .filter((e) => e.getClientRects().length).length, cfg.root);
              res[`${cfg.page}-${device}-${variant}`] = { ok: bars > 0 && bars === cells && hits.length === 0 && classic === 0, bars, cells, hits: hits.slice(0, 6), classic };
            } catch (e) {
              res[`${cfg.page}-${device}-${variant}`] = { ok: false, error: String(e.message).slice(0, 200) };
            }
            await close();
          }
        }
      }
      // Music (K96, no card grid): the eye and the phone stand at each card's corner as in Klassisch and cover nothing
      // of a card (text, controls); they write the fields Klassisch reads; a hidden card dims its content, not its
      // badges (the eye inverted); after the switch to Klassisch the same cards are hidden
      const MUSIC_CARDS = ['now-playing-card', 'zones-card', 'queue-card', 'other-players-card', 'library-card'];
      const musicCust = (page) => ev(page, () => JSON.parse(localStorage.getItem('hapulse:settings') || '{}').state?.customization || {});
      const musicLayout = (page) => ev(page, (cards) => [...document.querySelectorAll('.music-page .edit-entity-wrap--editing')].map((w) => {
        const card = cards.find((c) => w.querySelector(`.edit-item-outline > .${c}`)) || '?';
        return `${card}:${w.classList.contains('edit-entity-wrap--hidden') ? 'h' : ''}${w.querySelector('.edit-badge__btn--mobile-hidden') ? 'm' : ''}`;
      }).join(','), MUSIC_CARDS);
      for (const [device, mode] of [['desktop', 'light'], ['ipad', 'light'], ['phone', 'dark']]) {
        const { page, close } = await open(device, 'glas', '/music', { mode });
        try {
          const settle = async (ms = 300) => {
            await sleep(ms);
            await settleAnimations(page);
          };
          await enterEdit(page);
          await page.evaluate(() => window.scrollTo(0, 0));
          await settleAnimations(page);
          const covers = () => ev(page, () => {
            const hits = [];
            const wraps = [...document.querySelectorAll('.music-page .edit-entity-wrap--editing')];
            for (const w of wraps) {
              const btns = [...w.querySelectorAll(':scope > .edit-badge .edit-badge__btn')].filter((e) => e.getClientRects().length)
                .map((e) => e.getBoundingClientRect());
              const content = [...w.querySelectorAll('.edit-item-outline *')].filter((e) => {
                if (!e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') return false;
                if (e.matches('button, a, input, select, [role="button"], [role="radio"], svg')) return true;
                return [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
              });
              for (const e of content) {
                const b = e.getBoundingClientRect();
                if (b.width < 1 || b.height < 1) continue;
                if (btns.some((p) => p.left < b.right - 1 && p.right > b.left + 1 && p.top < b.bottom - 1 && p.bottom > b.top + 1)) {
                  const c = e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className;
                  hits.push(`${(w.querySelector('.edit-item-outline > *') || {}).className}:${c || e.tagName}`);
                }
              }
            }
            return { wraps: wraps.length, badges: wraps.filter((w) => w.querySelectorAll(':scope > .edit-badge .edit-badge__btn').length === 2).length, hits };
          });
          const look = await covers();
          const r = { look };
          if (device === 'desktop') {
            // eye and phone on the zones card: the field Klassisch reads, the look of a hidden card, and back
            const wrap = page.locator('.music-page .edit-entity-wrap--editing', { has: page.locator('.zones-card') });
            const eye = wrap.locator(':scope > .edit-badge .edit-badge__btn--eye');
            const phone = wrap.locator(':scope > .edit-badge .edit-badge__btn--mobile');
            await eye.click();
            await settle();
            r.eye = { stored: ((await musicCust(page)).hiddenMusicSections || []).includes('zones'), ...(await wrap.evaluate((w) => {
              const tok = (n) => {
                const d = document.createElement('div');
                d.style.background = `var(${n})`;
                document.body.appendChild(d);
                const v = getComputedStyle(d).backgroundColor;
                d.remove();
                return v;
              };
              const btn = w.querySelector(':scope > .edit-badge .edit-badge__btn--eye');
              return { wrap: getComputedStyle(w).opacity, content: getComputedStyle(w.querySelector(':scope > .edit-item-outline')).opacity,
                badge: getComputedStyle(w.querySelector(':scope > .edit-badge')).opacity, inverted: getComputedStyle(btn).backgroundColor === tok('--g-label') };
            })) };
            await phone.click();
            await settle();
            r.phone = { stored: ((await musicCust(page)).mobileHiddenMusicSections || []).includes('zones'), pressed: await phone.getAttribute('aria-pressed') };
            r.glas = await musicLayout(page);
            // the switch to Klassisch: the same cards hidden there
            await ev(page, () => {
              const st = JSON.parse(localStorage.getItem('hapulse:settings'));
              st.state.customization.uiStyle = 'classic';
              localStorage.setItem('hapulse:settings', JSON.stringify(st));
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForFunction(() => document.querySelector('#root > *'));
            await settle(900);
            await enterEdit(page);
            r.classic = await musicLayout(page);
            r.classicStyle = await ev(page, () => document.documentElement.getAttribute('data-style'));
            // and back: both toggles off
            await page.locator('.music-page .edit-entity-wrap--editing', { has: page.locator('.zones-card') }).locator(':scope > .edit-badge .edit-badge__btn--eye').click();
            await settle();
            await page.locator('.music-page .edit-entity-wrap--editing', { has: page.locator('.zones-card') }).locator(':scope > .edit-badge .edit-badge__btn--mobile').click();
            await settle();
            const c = await musicCust(page);
            r.back = (c.hiddenMusicSections || []).includes('zones') || (c.mobileHiddenMusicSections || []).includes('zones');
          }
          const ok = look.wraps === 5 && look.badges === 5 && look.hits.length === 0
            && (device !== 'desktop' || (r.eye.stored && r.eye.wrap === '1' && r.eye.content === '0.4' && r.eye.badge === '1' && r.eye.inverted
              && r.phone.stored && r.phone.pressed === 'true' && r.glas.includes('zones-card:hm') && r.glas === r.classic
              && r.classicStyle !== 'glas' && r.back === false));
          res[`music-${device}`] = { ok, ...r, look: { ...look, hits: look.hits.slice(0, 6) } };
        } catch (e) {
          res[`music-${device}`] = { ok: false, error: String(e.message).slice(0, 200) };
        }
        await close();
      }
      out.pagesEdit = res;
      out.pagesEditOk = Object.values(res).every((r) => r.ok);
    });

    // ---- K92: the segments with the lens write what Klassisch writes. The pool's mode, on the page and in the chip's
    //      window: "Automatik" sends the call of the classic button; manual activation (the arrows only move the focus,
    //      Space chooses); "Manuell" asks for the run length on every tap, also when it is the mode, and sends nothing;
    //      long labels turn the segment tight on the phone and are never cut; six options keep the classic buttons. ----
    await block('pagesSegments', async () => {
      const res = {};
      const MODE = 'input_select.modus_poolpumpe';
      const calls = (page) => ev(page, () => window.__hapulseDemo.calls().map(({ domain, service, data, target }) => ({ domain, service, data, target })));
      const clear = (page) => ev(page, () => window.__hapulseDemo.clearCalls());
      const setMode = (page, state, options) => ev(page, ([i, st, o]) => window.__hapulseDemo.patch(i, { state: st, ...(o ? { attributes: { options: o } } : {}) }), [MODE, state, options]);
      /** The pool's window from the chip row (a JS click: on the phone the chip may sit outside the scrolled row; the
       *  aria-label names the chip in both styles, `data-chip` exists in Glas only). */
      const openChip = async (page) => {
        await ev(page, () => document.querySelector('.summary-chip[aria-label^="pool:"]').click());
        await sleep(400);
        await settleAnimations(page);
      };
      const ROOT = { page: '.pool-hero', sheet: '[role="dialog"]:has(.pool-modal)' };
      const CLASSIC = { page: '.pool-hero .pool-mode__btn', sheet: '[role="dialog"] .pool-modal__mode-btn' };

      // Klassisch: the call of the "Automatik" button on the page and in the window
      const classic = {};
      for (const where of ['page', 'sheet']) {
        const { page, close } = await open('desktop', 'classic', where === 'page' ? '/pool' : '/');
        try {
          if (where === 'sheet') await openChip(page);
          await clear(page);
          await page.locator(CLASSIC[where], { hasText: 'Automatik' }).first().click();
          await sleep(200);
          classic[where] = await calls(page);
        } catch (e) {
          classic[where] = { error: String(e.message).slice(0, 160) };
        }
        await close();
      }

      for (const [device, mode] of [['desktop', 'light'], ['phone', 'dark']]) {
        for (const where of ['page', 'sheet']) {
          const { page, close } = await open(device, 'glas', where === 'page' ? '/pool' : '/', { mode });
          try {
            const reopen = async () => {
              if (where === 'sheet' && !(await page.locator(ROOT.sheet).count())) await openChip(page);
            };
            await reopen();
            const seg = page.locator(`${ROOT[where]} .g-seg--pool`).first();
            const opt = (v) => seg.locator(`.g-seg__opt[data-value="${v}"]`);
            const state = () => seg.evaluate((el) => ({
              options: [...el.querySelectorAll('.g-seg__opt')].map((o) => o.dataset.value),
              checked: el.querySelector('.g-seg__opt[aria-checked="true"]')?.dataset.value ?? null,
              focus: document.activeElement?.closest('.g-seg') === el ? document.activeElement.dataset.value : null,
              tight: el.hasAttribute('data-tight'),
              cut: [...el.querySelectorAll('.g-seg__opt')].filter((o) => o.scrollWidth > o.clientWidth + 0.5).map((o) => o.dataset.value),
            }));
            const look = await state();
            const picker = () => page.locator('.pool-manual-modal').filter({ visible: true }).count();
            const closePicker = async () => {
              await page.keyboard.press('Escape');
              await sleep(300);
              await settleAnimations(page);
            };

            // "Automatik" with a tap: the classic call
            await clear(page);
            await opt('Automatik').click();
            await sleep(200);
            const tap = await calls(page);

            // manual activation: from "Ausgeschalten" the arrow moves the focus only, Space chooses
            await reopen();
            await setMode(page, 'Ausgeschalten');
            await sleep(200);
            await clear(page);
            await opt('Ausgeschalten').focus();
            await page.keyboard.press('ArrowRight');
            await sleep(150);
            const arrow = { ...(await state()), calls: (await calls(page)).length };
            await page.keyboard.press('Space');
            await sleep(200);
            const space = await calls(page);

            // "Manuell": asks while another mode is set and when it is the mode (twice), the mode stays, nothing is sent
            await reopen();
            await setMode(page, 'Automatik');
            await sleep(200);
            await clear(page);
            const manual = [];
            for (const [st, n] of [['Automatik', 1], ['Manuell', 2]]) {
              await reopen();
              await setMode(page, st);
              await sleep(200);
              for (let k = 0; k < n; k++) {
                await reopen();
                await opt('Manuell').click();
                await sleep(400);
                await settleAnimations(page);
                const m = { mode: st, asked: await picker(), sheetClosed: where === 'sheet' ? (await page.locator(ROOT.sheet).count()) === 0 : null };
                await closePicker();
                await reopen();
                m.checked = (await state()).checked;
                manual.push(m);
              }
            }
            await reopen();
            const after = { calls: (await calls(page)).length, checked: (await state()).checked };

            // six options: the classic buttons
            await setMode(page, 'Automatik', ['Ausgeschalten', 'Automatik', 'Manuell', 'Eco', 'Boost', 'Urlaub']);
            await sleep(300);
            await reopen();
            const six = { segments: await page.locator(`${ROOT[where]} .g-seg--pool`).count(), buttons: await page.locator(CLASSIC[where]).count() };

            const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
            const ok = same(look.options, ['Ausgeschalten', 'Automatik', 'Manuell']) && look.checked === 'Manuell' && look.cut.length === 0
              && (device === 'desktop' ? !look.tight : where === 'sheet' || look.tight)
              && Array.isArray(classic[where]) && classic[where].length === 1 && same(tap, classic[where])
              && arrow.calls === 0 && arrow.checked === 'Ausgeschalten' && arrow.focus === 'Automatik'
              && space.length === 1 && space[0].data.option === 'Automatik' && space[0].target.entity_id === MODE
              && manual.length === 3 && manual.every((m) => m.asked === 1 && m.sheetClosed !== false && m.checked === m.mode)
              && after.calls === 0 && after.checked === 'Manuell'
              && six.segments === 0 && six.buttons === 6;
            res[`${device}-${where}`] = { ok, look, tap, classic: classic[where], arrow, space, manual, after, six };
          } catch (e) {
            res[`${device}-${where}`] = { ok: false, error: String(e.message).slice(0, 200) };
          }
          await close();
        }
      }
      // The energy period: a view, so a tap and the arrows choose at once; the hero shows the figure of Klassisch's tab.
      // While a period loads (the demo holds its statistics: energyHold) Klassisch swaps the page for its loading line
      // and the focus is gone; Glas keeps the cards and dims them (`data-g-stale`, .5, the hero's head stays), so the
      // segment keeps the focus and the arrows can go on.
      const LABEL = { today: DE['energy.period.today'], week: DE['energy.period.week'], month: DE['energy.period.month'], year: DE['energy.period.year'] };
      const figure = (page) => ev(page, () => document.querySelector('.energy-hero__primary-value')?.textContent.trim() ?? null);
      const classicEnergy = {};
      {
        const { page, close } = await open('desktop', 'classic', '/energy', { fixedTime: ENERGY_AT });
        try {
          for (const p of ['week', 'month', 'year', 'today']) {
            await page.locator('.energy-period__btn', { hasText: LABEL[p] }).click();
            await sleep(300);
            await page.waitForFunction((l) => document.querySelector('.energy-period__btn--active')?.textContent.trim() === l
              && !document.querySelector('.energy-page__loading'), LABEL[p], { timeout: 5000 });
            classicEnergy[p] = await figure(page);
          }
          // a held load: the loading line instead of the cards, the focus falls back to the page
          await ev(page, () => window.__hapulseDemo.energyHold(true));
          await page.locator('.energy-period__btn', { hasText: LABEL.month }).focus();
          await page.keyboard.press('Enter');
          await sleep(300);
          classicEnergy.held = await ev(page, () => ({ loading: !!document.querySelector('.energy-page__loading'),
            hero: !!document.querySelector('.energy-hero'), focus: document.activeElement === document.body }));
          await ev(page, () => window.__hapulseDemo.energyHold(false));
        } catch (e) {
          classicEnergy.error = String(e.message).slice(0, 160);
        }
        await close();
      }
      for (const [device, mode] of [['desktop', 'light'], ['phone', 'dark']]) {
        const { page, close } = await open(device, 'glas', '/energy', { mode, fixedTime: ENERGY_AT });
        try {
          const seg = page.locator('.energy-hero .g-seg--energy');
          const opt = (v) => seg.locator(`.g-seg__opt[data-value="${v}"]`);
          const state = async () => ({ figure: await figure(page), ...(await seg.evaluate((el) => {
            const cell = document.querySelector('.energy-page .overview-grid__cell:not([data-section="hero"]) > *');
            return {
              role: el.getAttribute('role'),
              options: [...el.querySelectorAll('.g-seg__opt')].map((o) => `${o.dataset.value}:${o.textContent.trim()}`),
              checked: el.querySelector('.g-seg__opt[aria-checked="true"]')?.dataset.value ?? null,
              focus: document.activeElement?.closest('.g-seg') === el ? document.activeElement.dataset.value : null,
              cut: [...el.querySelectorAll('.g-seg__opt')].filter((o) => o.scrollWidth > o.clientWidth + 0.5).map((o) => o.dataset.value),
              h: Math.round(el.getBoundingClientRect().height),
              stale: document.querySelector('.energy-page')?.hasAttribute('data-g-stale') ?? null,
              loading: !!document.querySelector('.energy-page__loading'),
              dim: { card: cell && getComputedStyle(cell).opacity,
                stats: getComputedStyle(document.querySelector('.energy-hero__stats')).opacity,
                head: getComputedStyle(document.querySelector('.energy-hero__header')).opacity },
            };
          })) });
          const waitFigure = (want) => page.waitForFunction((w) => document.querySelector('.energy-hero__primary-value')?.textContent.trim() === w
            && !document.querySelector('.energy-page[data-g-stale]'), want, { timeout: 5000 }).catch(() => {});
          const look = await state();
          // a tap on "Woche"
          await opt('week').click();
          await waitFigure(classicEnergy.week);
          await sleep(300);
          const tap = await state();
          // the arrow from "Woche" while the load is held: "Monat" is chosen, the cards stay dimmed, the focus stays
          await ev(page, () => window.__hapulseDemo.energyHold(true));
          await page.keyboard.press('ArrowRight');
          await sleep(400);
          const held = await state();
          await ev(page, () => window.__hapulseDemo.energyHold(false));
          await waitFigure(classicEnergy.month);
          await sleep(300);
          const loaded = await state();
          // and on: End chooses "Jahr", Home "Heute"
          await page.keyboard.press('End');
          await waitFigure(classicEnergy.year);
          const end = await state();
          await page.keyboard.press('Home');
          await waitFigure(classicEnergy.today);
          const home = await state();
          const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
          const plain = (st) => st.stale === false && !st.loading && st.dim.card === '1' && st.dim.stats === '1' && st.dim.head === '1';
          const ok = !classicEnergy.error && look.role === 'radiogroup'
            && same(look.options, ['today', 'week', 'month', 'year'].map((v) => `${v}:${LABEL[v]}`))
            && look.checked === 'today' && look.figure === classicEnergy.today && look.cut.length === 0 && look.h === 44 && plain(look)
            && tap.checked === 'week' && tap.figure === classicEnergy.week && plain(tap)
            && held.checked === 'month' && held.focus === 'month' && held.stale === true && !held.loading
            && held.figure === classicEnergy.week && held.dim.card === '0.5' && held.dim.stats === '0.5' && held.dim.head === '1'
            && loaded.checked === 'month' && loaded.focus === 'month' && loaded.figure === classicEnergy.month && plain(loaded)
            && end.checked === 'year' && end.focus === 'year' && end.figure === classicEnergy.year
            && home.checked === 'today' && home.focus === 'today' && home.figure === classicEnergy.today
            && new Set([classicEnergy.today, classicEnergy.week, classicEnergy.month, classicEnergy.year]).size === 4;
          res[`${device}-energy`] = { ok, classic: classicEnergy, look, tap, held, loaded, end: [end.checked, end.figure], home: [home.checked, home.figure] };
        } catch (e) {
          res[`${device}-energy`] = { ok: false, error: String(e.message).slice(0, 200) };
        }
        await close();
      }

      // Music: the zones' view is a segment of two symbols (list, grid) instead of Klassisch's two buttons; a view, so
      // the arrows choose; either view shows the rooms Klassisch shows in it
      let classicZones;
      {
        const { page, close } = await open('desktop', 'classic', '/music');
        try {
          const names = () => ev(page, () => ({ tiles: [...document.querySelectorAll('.zone-grid-card__name')].map((e) => e.textContent.trim()),
            rows: [...document.querySelectorAll('.zone-row__name')].map((e) => e.textContent.trim()) }));
          const grid = await names();
          await page.locator('.zones-card__view-btn').nth(0).click();
          await sleep(200);
          classicZones = { grid, list: await names() };
        } catch (e) {
          classicZones = { error: String(e.message).slice(0, 160) };
        }
        await close();
      }
      for (const [device, mode] of [['desktop', 'light'], ['phone', 'dark']]) {
        const { page, close } = await open(device, 'glas', '/music', { mode });
        try {
          const seg = page.locator('.zones-card .g-seg--view');
          await seg.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await settleAnimations(page);
          const state = () => seg.evaluate((el) => {
            const b = el.getBoundingClientRect();
            return {
              role: el.getAttribute('role'), label: el.getAttribute('aria-label'),
              options: [...el.querySelectorAll('.g-seg__opt')].map((o) => `${o.dataset.value}:${o.getAttribute('aria-label')}`),
              checked: el.querySelector('.g-seg__opt[aria-checked="true"]')?.dataset.value ?? null,
              focus: document.activeElement?.closest('.g-seg') === el ? document.activeElement.dataset.value : null,
              h: Math.round(b.height), w: Math.round(b.width),
              tiles: [...document.querySelectorAll('.zone-grid-card__name')].map((e) => e.textContent.trim()),
              rows: [...document.querySelectorAll('.zone-row__name')].map((e) => e.textContent.trim()),
              buttons: document.querySelectorAll('.zones-card__view-btn').length,
            };
          });
          const look = await state();
          await seg.locator('.g-seg__opt[data-value="list"]').click();
          await sleep(300);
          const tap = await state();
          const keys = {};
          for (const key of ['ArrowRight', 'Home', 'End', 'ArrowRight']) {
            await page.keyboard.press(key);
            await sleep(300);
            const st = await state();
            keys[`${Object.keys(keys).length}:${key}`] = { checked: st.checked, focus: st.focus, n: st.checked === 'grid' ? st.tiles.length : st.rows.length };
          }
          const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
          const cg = classicZones.grid || {};
          const cl = classicZones.list || {};
          const ok = !classicZones.error && (cg.tiles || []).length > 0 && same(cl.rows, cg.tiles) && look.role === 'radiogroup'
            && look.label === DE['music.zones.viewModeAria']
            && same(look.options, [`list:${DE['music.zones.listView']}`, `grid:${DE['music.zones.gridView']}`])
            && look.checked === 'grid' && look.h === 44 && look.w === 88 && look.buttons === 0
            && same(look.tiles, cg.tiles) && look.rows.length === 0
            && tap.checked === 'list' && tap.focus === 'list' && same(tap.rows, cl.rows) && tap.tiles.length === 0
            && same(Object.values(keys).map((k) => `${k.checked}/${k.focus}/${k.n}`),
              ['grid', 'list', 'grid', 'list'].map((v) => `${v}/${v}/${cg.tiles.length}`));
          res[`${device}-music`] = { ok, classic: classicZones, look, tap: [tap.checked, tap.focus, tap.rows.length], keys };
        } catch (e) {
          res[`${device}-music`] = { ok: false, error: String(e.message).slice(0, 200) };
        }
        await close();
      }

      // Devices: grid | list is the same segment of two symbols instead of Klassisch's two buttons; a view, so the
      // arrows choose; either view lists the devices Klassisch lists in it
      let classicDevices;
      {
        const { page, close } = await open('desktop', 'classic', '/devices');
        try {
          const names = () => ev(page, () => [...document.querySelectorAll('.devices-results .device-card__name')].map((e) => e.textContent.trim()));
          const grid = await names();
          await page.locator('.devices-view-toggle__btn').nth(0).click();
          await sleep(300);
          classicDevices = { grid, list: await names() };
        } catch (e) {
          classicDevices = { error: String(e.message).slice(0, 160) };
        }
        await close();
      }
      for (const [device, mode] of [['desktop', 'light'], ['phone', 'dark']]) {
        const { page, close } = await open(device, 'glas', '/devices', { mode });
        try {
          const seg = page.locator('.devices-toolbar .g-seg--view');
          await seg.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await settleAnimations(page);
          const state = () => seg.evaluate((el) => {
            const b = el.getBoundingClientRect();
            const names = (v) => [...document.querySelectorAll(`.devices-results--${v} .device-card__name`)].map((e) => e.textContent.trim());
            return {
              role: el.getAttribute('role'), label: el.getAttribute('aria-label'),
              options: [...el.querySelectorAll('.g-seg__opt')].map((o) => `${o.dataset.value}:${o.getAttribute('aria-label')}`),
              checked: el.querySelector('.g-seg__opt[aria-checked="true"]')?.dataset.value ?? null,
              focus: document.activeElement?.closest('.g-seg') === el ? document.activeElement.dataset.value : null,
              h: Math.round(b.height), w: Math.round(b.width),
              grid: names('grid'), list: names('list'),
              buttons: document.querySelectorAll('.devices-view-toggle__btn').length,
            };
          });
          const look = await state();
          await seg.locator('.g-seg__opt[data-value="list"]').click();
          await sleep(300);
          const tap = await state();
          const keys = {};
          for (const key of ['ArrowRight', 'Home', 'End', 'ArrowRight']) {
            await page.keyboard.press(key);
            await sleep(300);
            const st = await state();
            keys[`${Object.keys(keys).length}:${key}`] = { checked: st.checked, focus: st.focus, n: st[st.checked].length };
          }
          const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
          const cg = classicDevices.grid || [];
          const ok = !classicDevices.error && cg.length > 0 && same(classicDevices.list, cg) && look.role === 'radiogroup'
            && look.label === DE['devices.toolbar.viewModeAria']
            && same(look.options, [`list:${DE['devices.toolbar.listViewAria']}`, `grid:${DE['devices.toolbar.gridViewAria']}`])
            && look.checked === 'grid' && look.h === 44 && look.w === 88 && look.buttons === 0
            && same(look.grid, cg) && look.list.length === 0
            && tap.checked === 'list' && tap.focus === 'list' && same(tap.list, classicDevices.list) && tap.grid.length === 0
            && same(Object.values(keys).map((k) => `${k.checked}/${k.focus}/${k.n}`),
              ['grid', 'list', 'grid', 'list'].map((v) => `${v}/${v}/${cg.length}`));
          res[`${device}-devices`] = { ok, classic: classicDevices.error || classicDevices.grid.length, look: { ...look, grid: look.grid.length },
            tap: [tap.checked, tap.focus, tap.list.length], keys };
        } catch (e) {
          res[`${device}-devices`] = { ok: false, error: String(e.message).slice(0, 200) };
        }
        await close();
      }
      out.pagesSegments = res;
      out.pagesSegmentsOk = Object.values(res).every((r) => r.ok);
    });

    // ---- §3.1 "Nicht verlieren" (pagesKeep) page by page: what a page could do in Klassisch it still does in Glas.
    //      Service calls are counted on the entity's last_updated (the demo stamps it on every call it applies).
    //      Glas only; where a comparison with Klassisch is named, Klassisch is opened too. ----
    /** A watch on the calls that reach `id`; `count()` = calls so far, `stop()` ends it and returns the count. */
    const watchCalls = async (page, id) => {
      await ev(page, (i) => {
        const w = { n: 0, last: window.__hapulseDemo.entity(i)?.last_updated };
        w.t = setInterval(() => {
          const v = window.__hapulseDemo.entity(i)?.last_updated;
          if (v !== w.last) { w.n += 1; w.last = v; }
        }, 4);
        window.__gKeepWatch = w;
      }, id);
      return {
        count: () => ev(page, () => window.__gKeepWatch.n),
        stop: () => ev(page, () => { clearInterval(window.__gKeepWatch.t); return window.__gKeepWatch.n; }),
      };
    };
    const entity = (page, id) => ev(page, (i) => window.__hapulseDemo.entity(i), id);
    const customization = (page) => ev(page, () => JSON.parse(localStorage.getItem('hapulse:settings') || '{}').state?.customization || {});
    /** Drag a range from `from` to `to` (fractions of its width): calls while the pointer is down and after the release. */
    const dragRange = async (page, loc, id, from, to) => {
      await loc.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await settleAnimations(page);
      const b = await loc.boundingBox();
      const y = b.y + b.height / 2;
      const w = await watchCalls(page, id);
      await page.mouse.move(b.x + b.width * from, y);
      await page.mouse.down();
      for (let k = 1; k <= 6; k++) await page.mouse.move(b.x + b.width * (from + ((to - from) * k) / 6), y);
      await sleep(250);
      const during = await w.count();
      await page.mouse.up();
      await sleep(400);
      return { during, after: (await w.stop()) - during };
    };
    /** Section titles of a room in their order. */
    const roomSections = (page) => ev(page, () => [...document.querySelectorAll('.room-page__section')]
      .filter((e) => e.getClientRects().length)
      .map((e) => e.querySelector('.section-label')?.textContent.trim()));

    await block('pagesKeep', async () => {
      const res = {};
      const keepPart = (name) => !onlyParts('pagesKeep').length || onlyParts('pagesKeep').includes(name);
      for (const [device, mode] of [['desktop', 'light'], ['phone', 'dark']]) {
        // Room G: sections in Klassisch's order; half/full writes the same field as Klassisch (desktop: the handle
        // is dragged by one column)
        if (keepPart('room')) {
          const got = {};
          for (const style of ['classic', 'glas']) {
            const { page, close } = await open(device, style, '/room/living_room', { mode });
            try {
              got[style] = { order: await roomSections(page) };
              if (device === 'desktop') {
                await page.locator('.g-edit-capsule:visible, .edit-toggle:visible').first().click();
                await sleep(300);
                await settleAnimations(page);
                const handle = page.locator('.room-page__section:has(.light-card) .room-section__resize-handle').first();
                await handle.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
                await settleAnimations(page);
                const hb = await handle.boundingBox();
                const gw = await ev(page, () => document.querySelector('.room-page__sections').getBoundingClientRect().width);
                await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
                await page.mouse.down();
                for (let k = 1; k <= 5; k++) await page.mouse.move(hb.x + hb.width / 2 - (gw / 2) * (k / 5), hb.y + hb.height / 2);
                await page.mouse.up();
                await sleep(300);
                got[style].spans = (await customization(page)).roomSectionSpans || {};
                got[style].half = await ev(page, () => document.querySelector('.room-page__section:has(.light-card)').classList.contains('room-page__section--span-1'));
              }
            } catch (e) {
              got[style] = { error: String(e.message).slice(0, 160) };
            }
            await close();
          }
          const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
          const ok = !got.classic.error && !got.glas.error && got.glas.order.length > 3 && same(got.classic.order, got.glas.order)
            && (device !== 'desktop' || (same(got.classic.spans, got.glas.spans) && Object.values(got.glas.spans).includes(1) && got.glas.half));
          res[`${device}-room-sections`] = { ok, ...got };
        }

        // Entity cards E: sliders send once on release, the tile switches by click and Space, volume, a scene tile, the
        // sensors' fill bars and wording, "unavailable" dimmed
        if (keepPart('room')) {
          const { page, close } = await open(device, 'glas', '/room/living_room', { mode });
          try {
            const ceiling = page.locator('.room-page .light-card', { hasText: 'Ceiling Light' }).first();
            const before = await entity(page, 'light.living_room_ceiling');
            const bright = await dragRange(page, ceiling.locator('.light-card__range').first(), 'light.living_room_ceiling', 0.2, 0.6);
            const afterBright = await entity(page, 'light.living_room_ceiling');
            const temp = await dragRange(page, ceiling.locator('.light-card__range').nth(1), 'light.living_room_ceiling', 0.7, 0.3);
            const hue = await dragRange(page, ceiling.locator('.light-card__hue-range').first(), 'light.living_room_ceiling', 0.3, 0.6);
            const sliders = [bright, temp, hue].every((x) => x.during === 0 && x.after === 1)
              && afterBright.attributes.brightness !== before.attributes.brightness;

            // the tile switches: a click on its name, then Space on the focused tile
            const floor = page.locator('.room-page .light-card', { hasText: 'Floor Lamp' }).first();
            const s0 = (await entity(page, 'light.living_room_floor_lamp')).state;
            await floor.locator('.light-card__name').click();
            await sleep(200);
            const s1 = (await entity(page, 'light.living_room_floor_lamp')).state;
            await floor.focus();
            await page.keyboard.press('Space');
            await sleep(200);
            const s2 = (await entity(page, 'light.living_room_floor_lamp')).state;
            const tile = s1 !== s0 && s2 === s0;

            // volume by keyboard (the slider throttles while it moves)
            const v0 = (await entity(page, 'media_player.living_room_tv')).attributes.volume_level;
            const vol = page.locator('.room-page .media-card__volume-input').first();
            await vol.focus();
            for (let k = 0; k < 4; k++) await page.keyboard.press('ArrowRight');
            await sleep(700);
            const v1 = (await entity(page, 'media_player.living_room_tv')).attributes.volume_level;

            // a scene tile activates its scene
            const sw = await watchCalls(page, 'scene.living_room_movie');
            await page.locator('.room-page .scene-tile', { hasText: 'Movie Night' }).first().click();
            await sleep(300);
            const scene = (await sw.stop()) === 1;

            // sensors: numeric tiles keep their fill bar, the motion tile its wording
            const sensors = await ev(page, () => {
              const tiles = [...document.querySelectorAll('.room-page .sensor-tile')].filter((e) => e.getClientRects().length);
              const bars = tiles.filter((t) => t.classList.contains('sensor-tile--numeric'))
                .map((t) => t.querySelector('.sensor-tile__bar')?.getBoundingClientRect().width || 0);
              const binary = tiles.filter((t) => t.classList.contains('sensor-tile--binary'))
                .map((t) => t.querySelector('.sensor-tile__value').textContent.trim());
              return { n: tiles.length, bars, binary };
            });
            const sensorsOk = sensors.n >= 3 && sensors.bars.length >= 2 && sensors.bars.every((w) => w > 0)
              && sensors.binary.length >= 1 && sensors.binary.every((t) => ['Erkannt', 'Frei'].includes(t));

            // "unavailable": the card stays, dimmed and out of reach
            await ev(page, () => window.__hapulseDemo.patch('light.living_room_shelf', { state: 'unavailable' }));
            await sleep(300);
            const unavailable = await ev(page, () => {
              const wrap = [...document.querySelectorAll('.room-page .entity-unavailable')].find((e) => e.textContent.includes('Shelf Light'));
              return wrap ? { opacity: parseFloat(getComputedStyle(wrap).opacity), events: getComputedStyle(wrap).pointerEvents } : null;
            });
            const unavailableOk = !!unavailable && unavailable.opacity < 0.5 && unavailable.events === 'none';

            const ok = sliders && tile && v1 !== v0 && scene && sensorsOk && unavailableOk;
            res[`${device}-room-cards`] = { ok, bright, temp, hue, brightness: [before.attributes.brightness, afterBright.attributes.brightness],
              tile: [s0, s1, s2], volume: [v0, v1], scene, sensors, unavailable };
          } catch (e) {
            res[`${device}-room-cards`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }

        // blinds: close, stop, open (the narrow card shows symbols, its buttons keep their names)
        if (keepPart('room')) {
          const { page, close } = await open(device, 'glas', '/room/bedroom', { mode });
          try {
            const card = page.locator('.room-page .cover-card').first();
            await card.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
            const st = async () => (await entity(page, 'cover.bedroom_blinds')).state;
            // the little blind follows the position (§7.12): open = a 4 px rail, closed = slats over the whole 40
            const slats = () => card.evaluate((c) => parseFloat(getComputedStyle(c.querySelector('.cover-card__chip'), '::before').height));
            const s0 = await st();
            const h0 = await slats();
            const press = async (key) => {
              await card.getByRole('button', { name: DE[key], exact: true }).click();
              await sleep(500);
              return st();
            };
            const states = [s0, await press('cards.cover.open')];
            const h1 = await slats();
            states.push(await press('cards.cover.stop'), await press('cards.cover.close'));
            const ok = states.join() === 'closed,open,stopped,closed' && Math.abs(h0 - 40) < 0.6 && Math.abs(h1 - 4) < 0.6;
            res[`${device}-room-blinds`] = { ok, states, slats: [h0, h1] };
          } catch (e) {
            res[`${device}-room-blinds`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }

        // garage: opening asks first (Escape leaves the door as it is)
        if (keepPart('room')) {
          const { page, close } = await open(device, 'glas', '/room/garage', { mode });
          try {
            const s0 = (await entity(page, 'cover.garage_door')).state;
            await page.locator('.room-page .garage-card__btn').first().click();
            await sleep(300);
            await settleAnimations(page);
            const asked = await page.locator('.garage-confirm__text').filter({ visible: true }).count();
            await page.keyboard.press('Escape');
            await sleep(300);
            const s1 = (await entity(page, 'cover.garage_door')).state;
            const ok = s0 === 'closed' && asked === 1 && s1 === s0;
            res[`${device}-room-garage`] = { ok, states: [s0, s1], asked };
          } catch (e) {
            res[`${device}-room-garage`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }

        // hallway: a lock with a code reaches the code entry (Escape leaves it locked); the camera card is there
        if (keepPart('room')) {
          const { page, close } = await open(device, 'glas', '/room/hallway', { mode });
          try {
            await ev(page, () => window.__hapulseDemo.patch('lock.front_door', { attributes: { code_format: '^\\d{4}$' } }));
            await sleep(200);
            await page.locator('.room-page .lock-card__btn').first().click();
            await sleep(300);
            await settleAnimations(page);
            const code = await page.locator('.lock-confirm__code').filter({ visible: true }).count();
            await page.keyboard.press('Escape');
            await sleep(300);
            const s1 = (await entity(page, 'lock.front_door')).state;
            const camera = await page.locator('.room-page .camera-card').filter({ visible: true }).count();
            const ok = code === 1 && s1 === 'locked' && camera >= 1;
            res[`${device}-room-hallway`] = { ok, code, lock: s1, camera };
          } catch (e) {
            res[`${device}-room-hallway`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }

        // button and vacuum (the demo has none: two are placed in the living room)
        if (keepPart('room')) {
          const { page, close } = await open(device, 'glas', '/room/living_room', { mode });
          try {
            await ev(page, () => {
              const d = window.__hapulseDemo;
              d.patch('button.doorbell', { state: 'unknown', attributes: { friendly_name: 'Doorbell' } });
              d.patch('vacuum.robo', { state: 'docked', attributes: { friendly_name: 'Robo', battery_level: 80 } });
              d.placeEntity('button.doorbell', 'living_room');
              d.placeEntity('vacuum.robo', 'living_room');
            });
            await sleep(400);
            const btn = page.locator('.room-page .button-card__btn').first();
            await btn.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
            await btn.click();
            await sleep(100);
            const flash = await page.locator('.room-page .button-card__chip--flash').count();
            const vac = await ev(page, () => {
              const card = document.querySelector('.room-page .vacuum-card');
              return card && { state: card.querySelector('.vacuum-card__state')?.textContent.trim(),
                buttons: [...card.querySelectorAll('.vacuum-card__btn')].map((b) => b.getAttribute('aria-label')) };
            });
            await page.locator('.room-page .vacuum-card__btn--start').first().click();
            await sleep(200);
            const ok = flash === 1 && !!vac && !!vac.state && vac.buttons.length >= 1 && vac.buttons.every(Boolean);
            res[`${device}-room-button-vacuum`] = { ok, flash, vacuum: vac };
          } catch (e) {
            res[`${device}-room-button-vacuum`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }

        // Security H: the hero by alarm state (demo control), the triggered alarm card's ring; a mode reaches the code
        // pad (Escape leaves the state), without a code one tap switches; "unlock all" asks with the count, "lock all"
        // locks; the garage's "open all" asks, "close all" closes; the camera badge, people, doors, windows and motion
        if (keepPart('security')) {
          const { page, close } = await open(device, 'glas', '/security', { mode });
          try {
            const ALARM = 'alarm_control_panel.home';
            const patch = (id, v) => ev(page, ([i, x]) => window.__hapulseDemo.patch(i, x), [id, v]);
            const waitFor = (fn, a, timeout = 3000) => page.waitForFunction(fn, a, { timeout }).then(() => true, () => false);
            const tok = (n) => ev(page, (name) => {
              const d = document.createElement('div');
              d.style.color = `var(${name})`;
              document.body.appendChild(d);
              const v = getComputedStyle(d).color;
              d.remove();
              return v;
            }, n);
            const [label, green, red, redRing, actDel, onBadge] = [await tok('--g-label'), await tok('--g-green-ink'),
              await tok('--g-red-ink'), await tok('--g-red'), await tok('--g-act-del'), await tok('--g-on-badge')];
            // the demo's hallway motion burst writes its snapshot back after 3 s and would undo a patch made meanwhile:
            // without the sensor there is no burst (drop, wait a pending one out, drop again; it returns for the badge)
            const HALL = 'binary_sensor.hallway_motion';
            const hall = await entity(page, HALL);
            await patch(HALL, null);
            await sleep(3200);
            await patch(HALL, null);

            // the hero's word in the colour of its state
            const hero = {};
            for (const [st, want] of [['disarmed', label], ['armed_home', green], ['armed_away', green], ['armed_night', green],
              ['armed_vacation', green], ['arming', label], ['pending', red], ['triggered', red]]) {
              await patch(ALARM, { state: st });
              await sleep(200);
              hero[st] = (await ev(page, () => {
                const e = document.querySelector('.security-page .security-hero-card__alarm-state');
                return e && getComputedStyle(e).color;
              })) === want;
            }
            const ring = await ev(page, () => {
              const cs = getComputedStyle(document.querySelector('.security-page .alarm-panel-card'));
              return `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} ${cs.outlineOffset}`;
            });
            const ringOk = ring === `solid 2px ${redRing} -2px`;
            await patch(ALARM, { state: 'disarmed' });
            await sleep(200);

            // a mode with a code: the pad, its dots, Escape changes nothing
            const modeBtn = (key) => page.locator('.security-page .alarm-btn', { hasText: DE[key] }).first();
            await modeBtn('security.alarmPanel.action.armAway').click();
            await sleep(300);
            await settleAnimations(page);
            const pad = await ev(page, () => {
              const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => x.querySelector('.numpad-modal'));
              return d ? { keys: d.querySelectorAll('.numpad-key').length, text: d.textContent.slice(0, 60) } : null;
            });
            for (const k of ['1', '2', '3']) await page.locator('.numpad-modal .numpad-key', { hasText: k }).first().click();
            const dots = await ev(page, () => document.querySelectorAll('.numpad-modal .numpad-modal__dot--filled').length);
            await page.keyboard.press('Escape');
            await sleep(300);
            await settleAnimations(page);
            const padLeft = { state: (await entity(page, ALARM)).state, open: await page.locator('.numpad-modal').count() };
            // without a code one tap arms
            await patch(ALARM, { attributes: { code_format: null } });
            await sleep(200);
            const aw = await watchCalls(page, ALARM);
            await modeBtn('security.alarmPanel.action.armHome').click();
            await sleep(400);
            const direct = { calls: await aw.stop(), state: (await entity(page, ALARM)).state };
            const alarmOk = !!pad && pad.keys === 12 && pad.text.includes(DE['security.alarmPanel.action.armAway']) && dots === 3
              && padLeft.state === 'disarmed' && padLeft.open === 0 && direct.calls === 1 && direct.state === 'armed_home';

            // locks: a second one, "unlock all" asks with the count; Escape keeps both locked, the danger button unlocks
            // both; "lock all" locks them without a question
            await patch('lock.back_door', { state: 'locked', attributes: { friendly_name: 'Back Door Lock' } });
            await sleep(300);
            const lockStates = async () => [(await entity(page, 'lock.front_door')).state, (await entity(page, 'lock.back_door')).state].join();
            await page.locator('.security-page .locks-section-card__ctrl-btn--unlock').click();
            await sleep(300);
            await settleAnimations(page);
            const question = await ev(page, () => document.querySelector('.lock-confirm__text')?.textContent.trim());
            await page.keyboard.press('Escape');
            await sleep(300);
            await settleAnimations(page);
            const l1 = await lockStates();
            await page.locator('.security-page .locks-section-card__ctrl-btn--unlock').click();
            await sleep(300);
            await settleAnimations(page);
            await page.locator('[role="dialog"] .lock-confirm__actions .btn--danger').click();
            await sleep(500);
            await settleAnimations(page);
            const l2 = await lockStates();
            await page.locator('.security-page .locks-section-card__ctrl-btn--lock').click();
            await sleep(500);
            const l3 = { states: await lockStates(), asked: await page.locator('.lock-confirm__text').count() };
            const locksOk = question === DE['security.locks.confirmUnlockAll.other'].replace('{count}', '2')
              && l1 === 'locked,locked' && l2 === 'unlocked,unlocked' && l3.states === 'locked,locked' && l3.asked === 0;

            // garage: "open all" asks (Escape keeps it closed), "close all" closes an open door at once
            await page.locator('.security-page .garage-section-card__ctrl-btn--open').click();
            await sleep(300);
            await settleAnimations(page);
            const gAsked = await page.locator('.garage-confirm__text').filter({ visible: true }).count();
            await page.keyboard.press('Escape');
            await sleep(300);
            await settleAnimations(page);
            const g1 = (await entity(page, 'cover.garage_door')).state;
            await patch('cover.garage_door', { state: 'open', attributes: { current_position: 100 } });
            await sleep(300);
            await page.locator('.security-page .garage-section-card__ctrl-btn--close').click();
            await sleep(400);
            const g2 = (await entity(page, 'cover.garage_door')).state;
            const garageOk = gAsked === 1 && g1 === 'closed' && g2 === 'closed';

            // the camera badge: a capsule in actDel with the badge colour, sentence case
            await patch(HALL, { state: 'on', attributes: hall.attributes });
            const shown = await waitFor(() => !!document.querySelector('.security-page .camera-tile__motion-badge'));
            const badge = shown ? await ev(page, () => {
              const b = document.querySelector('.security-page .camera-tile__motion-badge');
              const cs = getComputedStyle(b);
              return { text: b.innerText.trim(), bg: cs.backgroundColor, color: cs.color, radius: parseFloat(cs.borderRadius) };
            }) : null;
            const want = DE['security.sensor.motion'];
            const badgeOk = !!badge && badge.bg === actDel && badge.color === onBadge && badge.radius >= 10
              && badge.text === want.charAt(0).toUpperCase() + want.slice(1);

            // people, doors, windows and motion with their rows
            const lists = await ev(page, () => {
              const names = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length).map((e) => e.textContent.trim());
              return {
                people: names('.security-page .people-list__name'),
                sensors: [...document.querySelectorAll('.security-page .sensor-section-card')].map((c) => ({
                  title: c.querySelector('.sensor-section-card__title')?.textContent.trim(),
                  rows: [...c.querySelectorAll('.motion-list__row')].map((r) => `${r.querySelector('.motion-list__name')?.textContent.trim()}|${r.querySelector('.motion-list__pill')?.textContent.trim()}`),
                })),
              };
            });
            const titles = lists.sensors.map((x) => x.title);
            const listsOk = lists.people.length >= 2 && ['doors', 'windows', 'motion'].every((k) => titles.includes(DE[`security.section.label.${k}`]))
              && lists.sensors.every((x) => x.rows.length >= 1 && x.rows.every((r) => !r.endsWith('|') && !r.startsWith('|')));

            const ok = Object.values(hero).every(Boolean) && ringOk && alarmOk && locksOk && garageOk && badgeOk && listsOk;
            res[`${device}-security`] = { ok, hero, ring: ringOk ? 'ok' : ring, pad, dots, padLeft, direct, question, locks: [l1, l2, l3],
              garage: [gAsked, g1, g2], badge, lists };
          } catch (e) {
            res[`${device}-security`] = { ok: false, error: String(e.message).slice(0, 200) };
          }
          await close();
        }

        // Pool K: the hero's word and the rings in their Glas colours (K99); the solar stepper writes the threshold,
        // "Stopp" the automatic mode; the schedule: a handle moved by 5 min and saved sends scheduler.edit with the new
        // switch point; a figure opens its detail; the restart asks first (Escape: nothing is sent, the danger button
        // presses). The demo applies none of these calls: they are read from its call log (demoCalls.ts).
        if (keepPart('pool')) {
          const { page, close } = await open(device, 'glas', '/pool', { mode });
          try {
            const calls = () => ev(page, () => window.__hapulseDemo.calls().map(({ domain, service, data, target }) => ({ domain, service, data, target })));
            const clear = () => ev(page, () => window.__hapulseDemo.clearCalls());
            const tok = (n) => ev(page, (name) => {
              const d = document.createElement('div');
              d.style.color = `var(${name})`;
              document.body.appendChild(d);
              const v = getComputedStyle(d).color;
              d.remove();
              return v;
            }, n);
            const look = await ev(page, () => {
              const cs = (sel, prop) => {
                const e = document.querySelector(sel);
                return e ? getComputedStyle(e)[prop] : null;
              };
              return {
                running: !!document.querySelector('.pool-hero--running'),
                status: cs('.pool-hero__status', 'color'),
                track: cs('.pool-solar .pool-gauge__track', 'stroke'),
                manualTrack: cs('.pool-manual .pool-gauge__track', 'stroke'),
                solar: cs('.pool-solar .pool-gauge__value', 'stroke'),
                solarText: cs('.pool-solar .pool-gauge__primary', 'color'),
                exceeded: !!document.querySelector('.pool-solar .pool-chip--positive'),
                manual: cs('.pool-manual .pool-gauge__value', 'stroke'),
                manualText: cs('.pool-manual .pool-gauge__primary', 'color'),
              };
            });
            const [tealInk, fill2, green, greenInk, teal] = [await tok('--g-teal-ink'), await tok('--g-fill-2'), await tok('--g-green'),
              await tok('--g-green-ink'), await tok('--g-teal')];
            const colours = look.running && look.status === tealInk && look.track === fill2 && look.manualTrack === fill2 && look.exceeded
              && look.solar === green && look.solarText === greenInk && look.manual === teal && look.manualText === tealInk;

            // the solar stepper: + writes threshold + step
            await clear();
            const plus = page.locator('.pool-solar .pool-stepper__btn').nth(1);
            await plus.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
            await plus.click();
            await sleep(200);
            const stepper = await calls();
            const stepperOk = stepper.length === 1 && stepper[0].domain === 'input_number' && stepper[0].service === 'set_value'
              && stepper[0].data.value === 450 && stepper[0].target.entity_id === 'input_number.schwellwert_poolpumpe_solarleistung';

            // "Stopp" while the manual run is on: back to Automatik
            await clear();
            await page.locator('.pool-manual .pool-manual__action').click();
            await sleep(200);
            const stop = await calls();
            const stopOk = stop.length === 1 && stop[0].domain === 'input_select' && stop[0].service === 'select_option'
              && stop[0].data.option === 'Automatik' && stop[0].target.entity_id === 'input_select.modus_poolpumpe';

            // the schedule: the handle at 12:00 moved to 12:05 and saved
            await page.locator('.pool-schedule__edit').click();
            await sleep(400);
            await settleAnimations(page);
            const handle = page.locator('[role="dialog"] .pool-timeline__handle').first();
            await handle.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
            await settleAnimations(page);
            const h0 = Number(await handle.getAttribute('aria-valuenow'));
            const bar = await page.locator('[role="dialog"] .pool-timeline__bar').boundingBox();
            const hb = await handle.boundingBox();
            await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
            await page.mouse.down();
            const tx = bar.x + (bar.width * (h0 + 5)) / 1440;
            for (let k = 1; k <= 4; k++) await page.mouse.move(hb.x + hb.width / 2 + (tx - hb.x - hb.width / 2) * (k / 4), hb.y + hb.height / 2);
            await page.mouse.up();
            await sleep(200);
            const moved = { now: Number(await handle.getAttribute('aria-valuenow')), time: (await handle.locator('.pool-timeline__handle-time').textContent()).trim() };
            await clear();
            await page.locator('[role="dialog"] .pool-editor__footer .btn--primary').click();
            await sleep(500);
            await settleAnimations(page);
            const saved = await calls();
            const edit = saved[0];
            const slot = edit && Array.isArray(edit.data.timeslots) ? edit.data.timeslots.find((s) => s.start === '12:05') : null;
            const scheduleOk = h0 === 720 && moved.now === 725 && moved.time === '12:05' && saved.length === 1
              && edit.domain === 'scheduler' && edit.service === 'edit' && edit.data.entity_id === 'switch.schedule_zeitplan_poolpumpe'
              && !!slot && slot.actions[0].service === 'input_boolean.turn_on' && Array.isArray(edit.data.weekdays) && edit.data.weekdays.length > 0
              && (await page.locator('[role="dialog"] .pool-editor').count()) === 0;

            // a figure opens its detail (the inspector from 1100 px, the sheet on the phone)
            const tile = page.locator('.pool-data .pool-tile--clickable').first();
            await tile.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
            await tile.click();
            await sleep(400);
            await settleAnimations(page);
            const detail = await ev(page, () => {
              const p = [...document.querySelectorAll('[role="dialog"]')].find((d) => !d.closest('.g-sheet-ghost'));
              const hd = p && p.querySelector('.g-sheet-header');
              return hd ? { pres: p.parentElement.getAttribute('data-g-pres'), title: (hd.querySelector('.g-sheet-header__title') || {}).textContent } : null;
            });
            const detailOk = !!detail && detail.title === 'Laufzeit Poolpumpe Heute' && detail.pres === (device === 'desktop' ? 'inspector' : 'sheet');
            await page.keyboard.press('Escape');
            await sleep(400);
            await settleAnimations(page);

            // the restart: asks, Escape sends nothing, the danger button presses
            await clear();
            const restart = page.locator('.pool-admin__restart');
            await restart.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
            await restart.click();
            await sleep(300);
            await settleAnimations(page);
            const question = await ev(page, () => document.querySelector('[role="dialog"] .g-confirm__text')?.textContent.trim());
            await page.keyboard.press('Escape');
            await sleep(300);
            await settleAnimations(page);
            const afterEsc = { calls: (await calls()).length, open: await page.locator('.g-confirm__text').count() };
            await restart.click();
            await sleep(300);
            await settleAnimations(page);
            await page.locator('[role="dialog"] .g-confirm__actions .btn--danger').click();
            await sleep(300);
            const pressed = await calls();
            const restartOk = question === DE['pool.admin.restartConfirm'] && afterEsc.calls === 0 && afterEsc.open === 0 && pressed.length === 1
              && pressed[0].domain === 'button' && pressed[0].service === 'press' && pressed[0].target.entity_id === 'button.poolpumpe_esppoolpumpe_geraeteneustart';

            const ok = colours && stepperOk && stopOk && scheduleOk && detailOk && restartOk;
            res[`${device}-pool`] = { ok, colours: colours ? 'ok' : look, stepper: stepperOk || stepper, stop: stopOk || stop,
              schedule: scheduleOk || { h0, moved, saved }, detail, restart: restartOk || { question, afterEsc, pressed } };
          } catch (e) {
            res[`${device}-pool`] = { ok: false, error: String(e.message).slice(0, 200) };
          }
          await close();
        }

        // Energy N: on the same date as Klassisch the same figures, tiles, legend, totals, bars (their heights), solar
        // rows and meter, devices (their bars) and water; the chart grey and yellow, its stacks 14 wide for 13 bars, the
        // device bars orange, the solar meter yellow; every card in the picture, no value cut, the page no wider than the
        // window; the hero does not tint under the pointer (desktop); the loading line 15/20 label2.
        if (keepPart('energy')) {
          const texts = (page) => ev(page, () => {
            const txt = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
            const all = (sel) => [...document.querySelectorAll(sel)].map(txt);
            const styles = (sel) => [...document.querySelectorAll(sel)].map((e) => e.getAttribute('style'));
            return {
              figure: txt(document.querySelector('.energy-hero__primary-value')),
              label: txt(document.querySelector('.energy-hero__primary-label')),
              stats: all('.energy-stat'),
              legend: all('.energy-legend__item'),
              totals: all('.energy-total'),
              bars: [...document.querySelectorAll('.energy-chart__col')].map((c) => [...c.querySelectorAll('.energy-chart__seg')]
                .map((g) => g.getAttribute('style')).join('|')),
              solar: all('.energy-solar .energy-kv').concat(all('.energy-solar__meter-label')),
              solarFill: styles('.energy-solar__meter-fill'),
              devices: all('.energy-device'),
              deviceBars: styles('.energy-device__bar'),
              heads: all('.energy-card__sub'),
              sections: [...document.querySelectorAll('.energy-page .overview-grid [data-section]')].map((e) => e.dataset.section),
            };
          });
          let classicTexts;
          {
            const { page, close } = await open(device, 'classic', '/energy', { mode, fixedTime: ENERGY_AT });
            try {
              classicTexts = await texts(page);
            } catch (e) {
              classicTexts = { error: String(e.message).slice(0, 160) };
            }
            await close();
          }
          const { page, close } = await open(device, 'glas', '/energy', { mode, fixedTime: ENERGY_AT });
          try {
            const glasTexts = await texts(page);
            const look = await ev(page, () => {
              const tok = (n, prop = 'backgroundColor') => {
                const d = document.createElement('div');
                d.style[prop === 'color' ? 'color' : 'background'] = `var(${n})`;
                document.body.appendChild(d);
                const v = getComputedStyle(d)[prop];
                d.remove();
                return v;
              };
              const bg = (e) => getComputedStyle(e).backgroundColor;
              const each = (sel, fn) => [...document.querySelectorAll(sel)].every(fn);
              const stacks = [...document.querySelectorAll('.energy-chart__stack')];
              const fig = getComputedStyle(document.querySelector('.energy-hero__primary-value'));
              // values: a block that clips (ellipsis) must not; an inline value must stay inside its card
              const cut = [...document.querySelectorAll('.energy-page :is(.energy-hero__primary-value, .energy-stat__value, .energy-total__value, .energy-kv__value, .energy-device__value, .energy-card__sub, .energy-legend__item)')]
                .filter((e) => {
                  const card = e.closest('.card') || e.closest('[data-section]');
                  const r = e.getBoundingClientRect();
                  const c = card.getBoundingClientRect();
                  const clipped = getComputedStyle(e).display !== 'inline' && e.scrollWidth > e.clientWidth + 0.5;
                  return clipped || r.right > c.right + 0.5 || r.left < c.left - 0.5;
                }).map((e) => e.className);
              const out = [...document.querySelectorAll('.energy-page .overview-grid [data-section]')]
                .filter((e) => { const r = e.getBoundingClientRect(); return r.width < 1 || r.left < -0.5 || r.right > innerWidth + 0.5; })
                .map((e) => e.dataset.section);
              // the loading line (the first load only, a moment): its rule, read on a copy
              const box = document.createElement('div');
              box.className = 'page energy-page';
              box.innerHTML = '<p class="energy-page__loading">x</p>';
              document.body.appendChild(box);
              const ld = getComputedStyle(box.firstChild);
              const loading = `${ld.fontSize}/${ld.lineHeight}` === '15px/20px' && ld.color === tok('--g-label-2', 'color');
              box.remove();
              return {
                grid: each('.energy-chart__seg--grid', (e) => bg(e) === tok('--g-chart-netz')),
                solar: each('.energy-chart__seg--solar', (e) => bg(e) === tok('--g-chart-solar')),
                legend: bg(document.querySelector('.energy-legend__swatch--grid')) === tok('--g-chart-netz')
                  && bg(document.querySelector('.energy-legend__swatch--solar')) === tok('--g-chart-solar'),
                stacks: stacks.length, widths: [...new Set(stacks.map((e) => Math.round(e.getBoundingClientRect().width)))],
                deviceBars: each('.energy-device__bar', (e) => bg(e) === tok('--g-prominent')),
                meter: bg(document.querySelector('.energy-solar__meter-fill')) === tok('--g-chart-solar'),
                figure: `${fig.fontWeight} ${fig.fontSize}/${fig.lineHeight}`, figureColor: fig.color === tok('--g-label', 'color'),
                tiles: each('.energy-stat', (e) => bg(e) === tok('--g-fill') && getComputedStyle(e).borderRadius === '12px'),
                icons: each('.energy-stat__icon', (e) => Math.round(e.getBoundingClientRect().width) === 32 && getComputedStyle(e).borderRadius === '50%'),
                cut, out, wide: document.documentElement.scrollWidth > innerWidth, loading,
              };
            });
            let hover = null;
            if (device === 'desktop') {
              const hero = page.locator('.energy-hero');
              const b = await hero.boundingBox();
              await page.mouse.move(b.x + b.width - 30, b.y + b.height - 12);
              await sleep(300);
              hover = await ev(page, () => {
                const d = document.createElement('div');
                d.style.background = 'var(--bg-card)';
                document.body.appendChild(d);
                const want = getComputedStyle(d).backgroundColor;
                d.remove();
                return getComputedStyle(document.querySelector('.energy-hero')).backgroundColor === want;
              });
              await page.mouse.move(0, 0);
            }
            const same = JSON.stringify(glasTexts) === JSON.stringify(classicTexts);
            const ok = same && glasTexts.sections.join() === 'hero,usage,solar,devices,water' && glasTexts.bars.length === 13
              && look.grid && look.solar && look.legend && look.stacks === 13 && look.widths.length === 1 && look.widths[0] === 14
              && look.deviceBars && look.meter && look.figure === '600 34px/41px' && look.figureColor && look.tiles && look.icons
              && look.cut.length === 0 && look.out.length === 0 && !look.wide && look.loading && hover !== false;
            res[`${device}-energy`] = { ok, same, ...(same ? {} : { glas: glasTexts, classic: classicTexts }), look, hover };
          } catch (e) {
            res[`${device}-energy`] = { ok: false, error: String(e.message).slice(0, 200) };
          }
          await close();
        }

        // Music: the same steps in Klassisch and Glas send the same calls (a range's numbers as the change from its value
        // before) and change the page alike — Now Playing's transport, mute, source, seek and volume (keys); another
        // player's play/pause and choosing it; a zone's mute and volume; the queue's shuffle, repeat, group, removing
        // and dragging a track, moving the queue; the library's media types, favourites, search, item menu (Escape as
        // in Klassisch) and play. Glas then drags seek (one call, on release), volume and a zone's volume (calls while
        // dragging).
        if (keepPart('music')) {
          const calls = (page) => ev(page, () => window.__hapulseDemo.calls().map(({ domain, service, data, target }) => ({ domain, service, data, target })));
          const clear = (page) => ev(page, () => window.__hapulseDemo.clearCalls());
          const texts = (page, sel) => ev(page, (s) => [...document.querySelectorAll(s)].filter((e) => e.getClientRects().length)
            .map((e) => e.textContent.replace(/\s+/g, ' ').trim()), sel);
          const runMusic = async (page, style) => {
            const steps = {};
            const fallbacks = [];
            /** A real tap on the visible match (scrolled to the middle); Klassisch falls back to a JS click where its own
             *  layout keeps the control from the pointer (NEBENBEFUNDE: its item menu clipped by the art). */
            const tap = async (sel, o = {}) => {
              const loc = (o.text ? page.locator(sel, { hasText: o.text }) : page.locator(sel)).filter({ visible: true }).nth(o.nth || 0);
              await loc.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
              await settleAnimations(page);
              try {
                await loc.click({ timeout: 2500 });
              } catch (e) {
                if (style !== 'classic') throw e;
                fallbacks.push(sel);
                await loc.evaluate((el) => el.click());
              }
              await sleep(250);
              await settleAnimations(page);
            };
            /** A range moved by `n` arrow keys; returns its value before. */
            const keys = async (sel, n) => {
              const loc = page.locator(sel).filter({ visible: true }).first();
              await loc.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
              const before = Number(await loc.inputValue());
              await loc.focus();
              for (let k = 0; k < n; k++) {
                await page.keyboard.press('ArrowRight');
                await sleep(60);
              }
              await sleep(350);
              return before;
            };
            const step = async (name, fn, dom) => {
              await clear(page);
              const before = await fn();
              await sleep(250);
              const sent = (await calls(page)).map((c) => {
                const data = {};
                for (const [k, v] of Object.entries(c.data || {})) {
                  data[k] = typeof v === 'number' && typeof before === 'number' ? Math.round((v - before) * 1000) / 1000 : v;
                }
                return `${c.domain}.${c.service} ${JSON.stringify(c.target || {})} ${JSON.stringify(data)}`;
              });
              steps[name] = { sent, ...(dom ? { dom: await dom() } : {}) };
            };
            const np = '.now-playing-card';
            const hero = () => ev(page, () => ({ room: document.querySelector('.now-playing-card__room-label')?.textContent.trim(),
              title: document.querySelector('.now-playing-card__title')?.textContent.trim() }));
            const target = async () => {
              const id = await page.locator('.library-card__player-native').inputValue();
              return { id, title: ((await entity(page, id)) || { attributes: {} }).attributes.media_title };
            };
            const tiles = () => texts(page, '.library-tile__name');

            await step('start', async () => {}, async () => {
              const queue = await texts(page, '.full-queue__name');
              return { hero: await hero(), tiles: await tiles(), queue: queue.slice(0, 3), queueN: queue.length };
            });
            await step('previous', () => tap(`${np} [aria-label="${DE['music.control.previous']}"]`));
            await step('pause', () => tap(`${np} .now-playing-card__play-btn`), () => page.locator(`${np} .now-playing-card__play-btn`).getAttribute('aria-label'));
            await step('next', () => tap(`${np} [aria-label="${DE['music.control.next']}"]`));
            await step('mute', () => tap(`${np} .now-playing-card__mute-btn`));
            await step('source', async () => {
              const sel = page.locator(`${np} .now-playing-card__source-select`);
              await sel.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
              await sel.selectOption('YouTube');
            }, () => page.locator(`${np} .now-playing-card__source-select`).inputValue());
            await step('seek', () => keys(`${np} .now-playing-card__progress`, 2));
            await step('volume', () => keys(`${np} .now-playing-card__volume-slider`, 2));
            await step('playerPp', () => tap('.other-player-row__pp'), () => hero());
            // The first other player becomes the one shown above (playing it paused nothing, the hero may have moved).
            let picked = null;
            await step('playerSelect', async () => {
              picked = (await texts(page, '.other-player-row__name'))[0];
              await tap('.other-player-row__name');
            }, async () => ({ picked, hero: await hero(), others: await texts(page, '.other-player-row__name') }));
            await step('zoneMute', () => tap('.zone-grid-card__mute'));
            await step('zoneVolume', () => keys('.zone-grid-card__slider', 2));
            await step('queueShuffle', () => tap('.queue-card__ctl', { nth: 0 }));
            await step('queueRepeat', () => tap('.queue-card__ctl', { nth: 1 }));
            await step('group', () => tap('.group-menu__btn'), () => texts(page, '.group-menu__row'));
            await step('groupRow', () => tap('.group-menu__row'), () => texts(page, '.group-menu__btn'));
            await step('groupEscape', () => page.keyboard.press('Escape'), () => page.locator('.group-menu__pop').count());
            await step('queueDelete', () => tap('.full-queue__delete'), async () => {
              const names = await texts(page, '.full-queue__name');
              return { first: names.slice(0, 2), n: names.length };
            });
            // the first track dragged by its grip onto the second (the pointer sensor starts after 6 px)
            await step('queueMove', async () => {
              const grip = page.locator('.full-queue__grip').filter({ visible: true }).first();
              await grip.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
              await settleAnimations(page);
              const g = await grip.boundingBox();
              const second = await page.locator('.full-queue__row').nth(1).boundingBox();
              const [x, y] = [g.x + g.width / 2, g.y + g.height / 2];
              const ty = second.y + second.height * 0.75;
              await page.mouse.move(x, y);
              await page.mouse.down();
              for (let k = 1; k <= 8; k++) {
                await page.mouse.move(x, y + ((ty - y) * k) / 8);
                await sleep(30);
              }
              await sleep(150);
              await page.mouse.up();
              await sleep(400);
            }, async () => (await texts(page, '.full-queue__name')).slice(0, 3));
            await step('albums', () => tap('.library-card__tab', { text: DE['music.library.type.album'] }), tiles);
            await step('favourites', () => tap('.library-card__fav-toggle'), tiles);
            await step('favouritesOff', () => tap('.library-card__fav-toggle'), async () => (await tiles()).length);
            await step('search', async () => {
              await page.locator('.library-card__search-input').fill('night');
              await sleep(500);
            }, tiles);
            await step('searchOff', async () => {
              await page.locator('.library-card__search-input').fill('');
              await sleep(500);
            }, async () => (await tiles()).length);
            await step('menu', () => tap('.library-tile__more'), () => texts(page, '.library-tile__menu-item'));
            await step('menuEscape', () => page.keyboard.press('Escape'), () => page.locator('.library-tile__menu').count());
            await step('replace', () => tap('.library-tile__menu-item', { text: DE['music.library.replaceQueue'] }), target);
            await step('tilePlay', () => tap('.library-tile__play', { nth: 1 }), target);
            await step('transfer', () => tap('.queue-card__transfer .queue-card__ctl'), () => texts(page, '.queue-card__transfer-row'));
            await step('transferRow', () => tap('.queue-card__transfer-row'), () => page.locator('.queue-card__player-native').inputValue());
            return { steps, fallbacks };
          };
          /** A range dragged from `from` to `to` (fractions of its width) with the mouse: calls while it is down, after
           *  the release, and the last one. */
          const dragCalls = async (page, sel, from, to) => {
            const loc = page.locator(sel).filter({ visible: true }).first();
            await loc.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
            await settleAnimations(page);
            const b = await loc.boundingBox();
            const y = b.y + b.height / 2;
            await clear(page);
            await page.mouse.move(b.x + b.width * from, y);
            await page.mouse.down();
            for (let k = 1; k <= 6; k++) await page.mouse.move(b.x + b.width * (from + ((to - from) * k) / 6), y);
            await sleep(250);
            const during = (await calls(page)).length;
            await page.mouse.up();
            await sleep(400);
            const all = await calls(page);
            return { during, after: all.length - during, last: all.length ? all[all.length - 1].data : null, max: Number(await loc.getAttribute('max')) };
          };

          const got = {};
          for (const style of ['classic', 'glas']) {
            const { page, close } = await open(device, style, '/music', { mode });
            try {
              got[style] = await runMusic(page, style);
            } catch (e) {
              got[style] = { error: String(e.message).slice(0, 200) };
            }
            await close();
          }
          let drags = null;
          {
            const { page, close } = await open(device, 'glas', '/music', { mode });
            try {
              drags = {
                seek: await dragCalls(page, '.now-playing-card__progress', 0.2, 0.6),
                volume: await dragCalls(page, '.now-playing-card__volume-slider', 0.2, 0.7),
                zone: await dragCalls(page, '.zone-grid-card__slider', 0.2, 0.7),
              };
            } catch (e) {
              drags = { error: String(e.message).slice(0, 200) };
            }
            await close();
          }
          const g = (got.glas && got.glas.steps) || {};
          const same = !!got.classic && !!got.glas && !got.classic.error && !got.glas.error
            && JSON.stringify(got.classic.steps) === JSON.stringify(g);
          const sends = ['previous', 'pause', 'next', 'mute', 'source', 'playerPp', 'zoneMute', 'queueShuffle', 'queueRepeat', 'groupRow', 'transferRow']
            .filter((k) => !(g[k] && g[k].sent.length === 1));
          const twice = ['seek', 'volume'].filter((k) => !(g[k] && g[k].sent.length === 2));
          const st = g.start ? g.start.dom : {};
          const fine = same && sends.length === 0 && twice.length === 0 && (g.zoneVolume?.sent.length || 0) >= 2
            && g.playerSelect.dom.hero.room === g.playerSelect.dom.picked && g.playerSelect.dom.picked !== g.playerPp.dom.room
            && !g.playerSelect.dom.others.includes(g.playerSelect.dom.picked)
            && g.queueDelete.dom.first[0] === st.queue[1] && g.queueDelete.dom.n === st.queueN - 1
            && g.queueMove.dom[0] === g.queueDelete.dom.first[1] && g.queueMove.dom[1] === g.queueDelete.dom.first[0]
            && g.albums.dom.length > 0 && g.albums.dom[0] !== st.tiles[0]
            && g.favourites.dom.length > 0 && g.favourites.dom.length < g.albums.dom.length && g.favouritesOff.dom === g.albums.dom.length
            && g.search.dom.join() === 'Midnight Frequencies' && g.searchOff.dom === g.albums.dom.length
            && JSON.stringify(g.menu.dom) === JSON.stringify([DE['music.library.playNext'], DE['music.library.addQueue'], DE['music.library.replaceQueue']])
            && g.replace.dom.title === g.albums.dom[0] && g.tilePlay.dom.title === g.albums.dom[1]
            && g.transfer.dom.length > 0 && g.transferRow.dom !== g.replace.dom.id && g.group.dom.length > 0;
          const dragged = !!drags && !drags.error && drags.seek.during === 0 && drags.seek.after === 1
            && drags.seek.last.seek_position / drags.seek.max > 0.5 && drags.seek.last.seek_position / drags.seek.max < 0.7
            && drags.volume.during >= 1 && drags.volume.last.volume_level > 0.55 && drags.volume.last.volume_level < 0.8
            && drags.zone.during >= 1;
          res[`${device}-music`] = { ok: fine && dragged, same, sends, twice, glas: g, ...(same ? {} : { classic: got.classic && got.classic.steps }),
            errors: [got.classic && got.classic.error, got.glas && got.glas.error].filter(Boolean),
            fallbacks: { classic: got.classic && got.classic.fallbacks, glas: got.glas && got.glas.fallbacks }, drags };
        }

        // Devices O1–O7, the same steps in Klassisch and Glas: search (also without a match), room and integration,
        // grid | list, a device's window with its switch, star, eye and "hide all" (Escape closes it as in Klassisch),
        // a thermostat's stepper, a TV's transport, blinds, the lock (unlocking asks first) and the garage door
        // (opening asks first). Glas alone: tiles, rows and controls in their measures (K93, K94).
        if (keepPart('devices')) {
          const calls = (page) => ev(page, () => window.__hapulseDemo.calls().map(({ domain, service, data, target }) => ({ domain, service, data, target })));
          const clear = (page) => ev(page, () => window.__hapulseDemo.clearCalls());
          const texts = (page, sel) => ev(page, (s) => [...document.querySelectorAll(s)].filter((e) => e.getClientRects().length)
            .map((e) => e.textContent.replace(/\s+/g, ' ').trim()), sel);
          const runDevices = async (page, style) => {
            const steps = {};
            const tap = async (sel, o = {}) => {
              const loc = (o.text ? page.locator(sel, { hasText: o.text }) : page.locator(sel)).filter({ visible: true }).nth(o.nth || 0);
              await loc.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
              await settleAnimations(page);
              await loc.click({ timeout: 2500 });
              await sleep(250);
              await settleAnimations(page);
            };
            const step = async (name, fn, dom) => {
              await clear(page);
              const before = await fn();
              await sleep(250);
              const sent = (await calls(page)).map((c) => {
                const data = {};
                for (const [k, v] of Object.entries(c.data || {})) {
                  data[k] = typeof v === 'number' && typeof before === 'number' ? Math.round((v - before) * 1000) / 1000 : v;
                }
                return `${c.domain}.${c.service} ${JSON.stringify(c.target || {})} ${JSON.stringify(data)}`;
              });
              steps[name] = { sent, ...(dom ? { dom: await dom() } : {}) };
            };
            const names = () => texts(page, '.devices-results .device-card__name');
            const search = (q) => page.locator('.devices-toolbar__search-input').fill(q).then(() => sleep(250));
            const choose = (nth, label) => page.locator('.devices-select__native').nth(nth).selectOption({ label }).then(() => sleep(250));
            const win = () => ev(page, () => {
              const el = document.querySelector('.modal-body .device-modal');
              if (!el) return null;
              const panel = el.closest('[role="dialog"]');
              return {
                // the classic header or the Glas sheet head: the dialog's label either way
                title: document.getElementById(panel?.getAttribute('aria-labelledby') || '')?.textContent.trim(),
                chips: [...el.querySelectorAll('.device-modal__chip')].map((c) => c.textContent.trim()),
                sections: [...el.querySelectorAll('.device-modal__section-label')].map((s) => s.textContent.replace(/\s+/g, ' ').trim()),
                rows: [...el.querySelectorAll('.device-entity-row')].map((r) => [r.querySelector('.device-entity-row__name').textContent.trim(),
                  r.classList.contains('device-entity-row--hidden') ? 'hidden' : 'shown',
                  r.querySelector('.device-row-fav')?.getAttribute('aria-pressed') === 'true' ? 'fav' : '-',
                  r.querySelector('.device-entity-row__value')?.textContent.trim() || r.querySelector('.device-stepper__value')?.textContent.trim() || ''].join('|')),
                hideAll: el.querySelector('.device-modal__hide-all')?.textContent.trim(),
              };
            });
            const dialogs = () => ev(page, () => document.querySelectorAll('[role="dialog"]').length);
            const stored = async () => {
              const c = await customization(page);
              return { favorites: (c.favorites || []).filter((i) => /bedroom/.test(i)), hidden: (c.hiddenEntities || []).filter((i) => /bedroom/.test(i)).sort() };
            };
            const window_ = (name) => tap('.device-card', { text: name });
            const close_ = async () => {
              await page.keyboard.press('Escape');
              await sleep(300);
              await settleAnimations(page);
            };
            const label = (key) => `[role="dialog"] .device-modal [aria-label="${DE[key]}"]`;

            await step('start', async () => {}, async () => {
              const all = await names();
              return { n: all.length, first: all.slice(0, 3), sub: (await texts(page, '.devices-hero__subtitle'))[0], status: (await texts(page, '.devices-hero__status'))[0] };
            });
            await step('search', () => search('kitchen'), names);
            await step('searchNone', () => search('zzzz'), () => texts(page, '.devices-empty-filter'));
            await step('searchOff', () => search(''), async () => (await names()).length);
            await step('room', () => choose(0, 'Bedroom'), names);
            await step('integration', async () => { await choose(0, DE['devices.toolbar.allRooms']); await choose(1, 'Z-Wave'); }, names);
            await step('filtersOff', () => choose(1, DE['devices.toolbar.allIntegrations']), async () => (await names()).length);
            await step('list', () => (style === 'glas' ? tap('.devices-toolbar .g-seg__opt[data-value="list"]') : tap('.devices-view-toggle__btn', { nth: 0 })),
              async () => ({ names: (await texts(page, '.devices-results--list .device-card__name')).length, counts: (await texts(page, '.devices-results--list .device-card__count')).slice(0, 4) }));
            await step('grid', () => (style === 'glas' ? tap('.devices-toolbar .g-seg__opt[data-value="grid"]') : tap('.devices-view-toggle__btn', { nth: 1 })),
              async () => (await texts(page, '.devices-results--grid .device-card__name')).length);
            await step('open', () => window_('Bedroom Lights'), win);
            await step('toggle', () => tap('[role="dialog"] .device-toggle'), win);
            await step('fav', () => tap('[role="dialog"] .device-row-fav'), async () => ({ win: await win(), stored: await stored() }));
            await step('favOff', () => tap('[role="dialog"] .device-row-fav'), async () => ({ win: await win(), stored: await stored() }));
            await step('hide', () => tap('[role="dialog"] .device-entity-row__edit > .device-icon-btn:last-child'), async () => ({ win: await win(), stored: await stored() }));
            await step('unhide', () => tap('[role="dialog"] .device-entity-row__edit > .device-icon-btn:last-child'), async () => ({ win: await win(), stored: await stored() }));
            await step('hideAll', () => tap('[role="dialog"] .device-modal__hide-all'), async () => ({ win: await win(), stored: await stored() }));
            await step('showAll', () => tap('[role="dialog"] .device-modal__hide-all'), async () => ({ win: await win(), stored: await stored() }));
            await step('escape', close_, dialogs);
            await step('thermostat', async () => {
              await window_('Living Room Thermostat');
              const before = (await entity(page, 'climate.living_room')).attributes.temperature;
              await tap(label('devices.row.increaseAria'));
              return before;
            }, win);
            await step('thermostatDown', async () => {
              const before = (await entity(page, 'climate.living_room')).attributes.temperature;
              await tap(label('devices.row.decreaseAria'));
              return before;
            }, win);
            await close_();
            await step('media', async () => {
              await window_('Living Room TV');
              await tap(label('devices.row.previousAria'));
              await tap(`${label('devices.row.pauseAria')}, ${label('devices.row.playAria')}`);
              await tap(label('devices.row.nextAria'));
            });
            await close_();
            await step('blinds', async () => {
              await window_('Bedroom Blinds');
              for (const key of ['devices.row.openAria', 'devices.row.stopAria', 'devices.row.closeAria']) await tap(label(key));
            });
            await close_();
            await step('lockAsk', async () => {
              await window_('Front Door Lock');
              await tap('[role="dialog"] .device-modal .device-toggle');
            }, () => texts(page, '.lock-confirm__text'));
            await step('lockConfirm', () => tap('.lock-confirm__actions .btn--danger'), async () => ({ ask: await texts(page, '.lock-confirm__text'), win: await win() }));
            await step('lockAgain', () => tap('[role="dialog"] .device-modal .device-toggle'), () => texts(page, '.lock-confirm__text'));
            await close_();
            await step('garageAsk', async () => {
              await window_('Garage Door');
              await tap(label('devices.row.openAria'));
            }, () => texts(page, '.garage-confirm__text'));
            await step('garageConfirm', () => tap('.garage-confirm__actions .btn--danger'), async () => ({ ask: await texts(page, '.garage-confirm__text'), dialogs: await dialogs() }));
            await close_();
            return { steps };
          };
          /** Glas: the tiles, list rows, choices and the window's controls in their measures — a hit area of 44 around
           *  a capsule or circle of 36 (a point 3 px beside the visible edge still reaches it). */
          const devicesLook = async (page) => {
            const grid = await ev(page, () => {
              const tile = document.querySelector('.devices-results--grid .device-card');
              const cs = getComputedStyle(tile);
              const icon = tile.querySelector('.device-card__icon').getBoundingClientRect();
              const name = getComputedStyle(tile.querySelector('.device-card__name'));
              const sel = document.querySelector('.devices-select__native');
              const sb = sel.getBoundingClientRect();
              const scs = getComputedStyle(sel);
              return { radius: cs.borderTopLeftRadius, border: cs.borderTopWidth, icon: `${Math.round(icon.width)}x${Math.round(icon.height)}`,
                name: `${name.fontWeight} ${name.fontSize}/${name.lineHeight}`, select: Math.round(sb.height), selectVisible: Math.round(sb.height - parseFloat(scs.borderTopWidth) - parseFloat(scs.borderBottomWidth)) };
            });
            await page.locator('.devices-toolbar .g-seg__opt[data-value="list"]').click();
            await sleep(300);
            await settleAnimations(page);
            const list = await ev(page, () => {
              const box = document.querySelector('.devices-results--list');
              const rows = [...box.querySelectorAll('.device-card')];
              return { radius: getComputedStyle(box).borderTopLeftRadius, rows: rows.length, minH: Math.round(Math.min(...rows.map((r) => r.getBoundingClientRect().height))) };
            });
            await page.locator('.devices-toolbar .g-seg__opt[data-value="grid"]').click();
            await sleep(300);
            await page.locator('.device-card', { hasText: 'Living Room Thermostat' }).first().click();
            await sleep(500);
            await settleAnimations(page);
            const win = await ev(page, () => {
              const el = document.querySelector('.modal-body .device-modal');
              const btns = [...el.querySelectorAll('.device-icon-btn')].filter((b) => b.getClientRects().length);
              const hits = btns.map((b) => {
                const r = b.getBoundingClientRect();
                const at = document.elementFromPoint(r.right + 3, r.top + r.height / 2);
                return { size: `${Math.round(r.width)}x${Math.round(r.height)}`, hit: !!at && (at === b || b.contains(at)) };
              });
              const rows = [...el.querySelectorAll('.device-entity-row')].map((r) => Math.round(r.getBoundingClientRect().height));
              const label = getComputedStyle(el.querySelector('.device-modal__section-label'));
              return { buttons: hits, rows, section: `${label.fontWeight} ${label.fontSize} ${label.textTransform}`,
                hideAll: Math.round(el.querySelector('.device-modal__hide-all').getBoundingClientRect().height) };
            });
            return { grid, list, win };
          };
          const got = {};
          for (const style of ['classic', 'glas']) {
            const { page, close } = await open(device, style, '/devices', { mode });
            try {
              got[style] = await runDevices(page, style);
            } catch (e) {
              got[style] = { error: String(e.message).slice(0, 200) };
            }
            await close();
          }
          let look = null;
          {
            const { page, close } = await open(device, 'glas', '/devices', { mode });
            try {
              look = await devicesLook(page);
            } catch (e) {
              look = { error: String(e.message).slice(0, 200) };
            }
            await close();
          }
          const g = (got.glas && got.glas.steps) || {};
          const same = !!got.classic && !!got.glas && !got.classic.error && !got.glas.error
            && JSON.stringify(got.classic.steps) === JSON.stringify(g);
          const one = (k, want) => !!g[k] && g[k].sent.length === 1 && g[k].sent[0].startsWith(want);
          const st = g.start ? g.start.dom : {};
          const fine = same && st.n > 10
            && g.search.dom.length > 0 && g.search.dom.length < st.n && g.searchNone.dom.join() === DE['devices.emptyFilter'] && g.searchOff.dom === st.n
            && g.room.dom.length > 0 && g.room.dom.length < st.n && g.integration.dom.length > 0 && g.integration.dom.length < st.n && g.filtersOff.dom === st.n
            && g.list.dom.names === st.n && g.grid.dom === st.n
            && g.open.dom.title === 'Bedroom Lights' && g.open.dom.rows.length === 2
            && one('toggle', 'light.toggle')
            && g.fav.dom.stored.favorites.length === 1 && g.fav.dom.win.rows[0].includes('|fav|') && g.favOff.dom.stored.favorites.length === 0
            && g.hide.dom.stored.hidden.length === 1 && g.hide.dom.win.rows[0].includes('|hidden|') && g.unhide.dom.stored.hidden.length === 0
            && g.hideAll.dom.stored.hidden.length === 2 && g.hideAll.dom.win.rows.every((r) => r.includes('|hidden|'))
            && g.hideAll.dom.win.hideAll === DE['devices.modal.showAllEntities']
            && g.showAll.dom.stored.hidden.length === 0 && g.showAll.dom.win.hideAll === DE['devices.modal.hideAllEntities']
            && g.escape.dom === 0
            && g.thermostat.sent.join() === 'climate.set_temperature {"entity_id":"climate.living_room"} {"temperature":0.5}'
            && g.thermostatDown.sent.join() === 'climate.set_temperature {"entity_id":"climate.living_room"} {"temperature":-0.5}'
            && g.media.sent.map((c) => c.split(' ')[0]).join() === 'media_player.media_previous_track,media_player.media_pause,media_player.media_next_track'
            && g.blinds.sent.map((c) => c.split(' ')[0]).join() === 'cover.open_cover,cover.stop_cover,cover.close_cover'
            && g.lockAsk.sent.length === 0 && g.lockAsk.dom.length === 1 && one('lockConfirm', 'lock.unlock') && g.lockConfirm.dom.ask.length === 0
            && one('lockAgain', 'lock.lock') && g.lockAgain.dom.length === 0
            && g.garageAsk.sent.length === 0 && g.garageAsk.dom.length === 1 && one('garageConfirm', 'cover.open_cover') && g.garageConfirm.dom.ask.length === 0;
          const measured = !!look && !look.error && look.grid.radius === '22px' && look.grid.border === '0px' && look.grid.icon === '36x36'
            && look.grid.name === '600 15px/20px' && look.grid.select === 44 && look.grid.selectVisible === 36
            && look.list.radius === '22px' && look.list.rows === st.n && look.list.minH >= 60
            && look.win.buttons.length >= 4 && look.win.buttons.every((b) => b.size === '36x36' && b.hit)
            && look.win.rows.every((h) => h >= 52) && look.win.section === '600 15px none' && look.win.hideAll === 44;
          res[`${device}-devices`] = { ok: fine && measured, same, glas: g, ...(same ? {} : { classic: got.classic && (got.classic.steps || got.classic) }),
            errors: [got.classic && got.classic.error, got.glas && got.glas.error].filter(Boolean), look };
        }
      }
      out.pagesKeep = res;
      out.pagesKeepOk = Object.values(res).every((r) => r.ok);
    });

    /** The look of a page's empty state (§7.31): circle 56 `fill` with the glyph in `label2`, title 17/22 600 `label`,
     *  text 15/20 `label2`. */
    const emptyLook = (page, sel) => ev(page, (s) => {
      const tok = (n, prop = 'color') => {
        const d = document.createElement('div');
        d.style[prop] = `var(${n})`;
        document.body.appendChild(d);
        const v = getComputedStyle(d)[prop];
        d.remove();
        return v;
      };
      const box = document.querySelector(s);
      if (!box) return null;
      const icon = box.querySelector('.empty-state__icon');
      const title = box.querySelector('.empty-state__title');
      const desc = box.querySelector('.empty-state__description');
      const ic = getComputedStyle(icon);
      const t = getComputedStyle(title);
      const dd = getComputedStyle(desc);
      const b = icon.getBoundingClientRect();
      return { text: title.textContent.trim(), circle: Math.round(b.width) === 56 && Math.round(b.height) === 56 && ic.borderRadius === '50%',
        fill: ic.backgroundColor === tok('--g-fill', 'backgroundColor'),
        glyph: ic.color === tok('--g-label-2'), title: `${t.fontWeight} ${t.fontSize}/${t.lineHeight}`, titleColor: t.color === tok('--g-label'),
        desc: `${dd.fontSize}/${dd.lineHeight}`, descColor: dd.color === tok('--g-label-2') };
    }, sel);
    const emptyOk = (got, key) => !!got && got.text === DE[key] && got.circle && got.fill && got.glyph && got.title === '600 17px/22px'
      && got.titleColor && got.desc === '15px/20px' && got.descColor;

    // ---- Empty states (pagesEmpty, §7.31): what the demo can show, page by page. Glas only. ----
    await block('pagesEmpty', async () => {
      const res = {};
      for (const [device, mode] of [['desktop', 'light'], ['phone', 'dark']]) {
        // room: "not found" and "no entities" (the garage door moves to the hallway), title label 600 17, the way back
        // in accentInk
        for (const [name, p, key] of [['room-notFound', '/room/nowhere', 'room.notFound.title'], ['room-empty', '/room/garage', 'room.empty.title']]) {
          const { page, close } = await open(device, 'glas', p, { mode });
          try {
            if (name === 'room-empty') {
              await ev(page, () => window.__hapulseDemo.placeEntity('cover.garage_door', 'hallway'));
              await sleep(400);
            }
            const got = await ev(page, () => {
              const tok = (n) => {
                const d = document.createElement('div');
                d.style.color = `var(${n})`;
                document.body.appendChild(d);
                const v = getComputedStyle(d).color;
                d.remove();
                return v;
              };
              const title = document.querySelector('.room-page__not-found-title');
              const link = document.querySelector('.room-page__not-found-link');
              if (!title || !link) return null;
              const t = getComputedStyle(title);
              const l = getComputedStyle(link);
              return { text: title.textContent.trim(), color: t.color === tok('--g-label'), font: `${t.fontWeight} ${t.fontSize}`,
                link: l.color === tok('--g-accent-ink'), linkH: link.getBoundingClientRect().height };
            });
            const ok = !!got && got.text === DE[key] && got.color && got.font === '600 17px' && got.link && got.linkH >= 44;
            res[`${device}-${name}`] = { ok, ...got };
          } catch (e) {
            res[`${device}-${name}`] = { ok: false, error: String(e.message).slice(0, 160) };
          }
          await close();
        }

        // security: without alarm, cameras, people, locks, garage doors and door, window and motion sensors (the demo's,
        // read from the core build) the page's empty state in the window's look (§7.31)
        {
          const { page, close } = await open(device, 'glas', '/security', { mode });
          try {
            const { DEMO_ENTITIES } = await import(require('url').pathToFileURL(require('path').join(__dirname, '../../../packages/core/dist/demo.js')).href);
            const SENSOR = new Set(['door', 'garage_door', 'window', 'opening', 'motion', 'occupancy', 'presence']);
            const ids = Object.entries(DEMO_ENTITIES).filter(([id, e]) => /^(camera|person|lock|alarm_control_panel)\./.test(id)
              || (id.startsWith('cover.') && ['garage', 'gate'].includes(e.attributes.device_class))
              || (id.startsWith('binary_sensor.') && SENSOR.has(e.attributes.device_class))).map(([id]) => id);
            const drop = () => ev(page, (list) => list.forEach((i) => window.__hapulseDemo.patch(i, null)), ids);
            // a motion burst of the demo writes its snapshot back after 3 s: drop, wait it out, drop again
            await drop();
            await sleep(3300);
            await drop();
            await sleep(400);
            await settleAnimations(page);
            const got = await emptyLook(page, '.security-page > .empty-state');
            const ok = emptyOk(got, 'security.empty.title');
            res[`${device}-security-empty`] = { ok, removed: ids.length, ...got };
          } catch (e) {
            res[`${device}-security-empty`] = { ok: false, error: String(e.message).slice(0, 200) };
          }
          await close();
        }

        // pool: without the mode and the pump the page shows "not set up" in the same look
        {
          const { page, close } = await open(device, 'glas', '/pool', { mode });
          try {
            await ev(page, () => ['input_select.modus_poolpumpe', 'switch.esppoolpumpe_poolpumpe'].forEach((i) => window.__hapulseDemo.patch(i, null)));
            await sleep(400);
            await settleAnimations(page);
            const got = await emptyLook(page, '.pool-page > .empty-state');
            res[`${device}-pool-empty`] = { ok: emptyOk(got, 'pool.notConfigured.title'), ...got };
          } catch (e) {
            res[`${device}-pool-empty`] = { ok: false, error: String(e.message).slice(0, 200) };
          }
          await close();
        }

        // energy: HA's energy not set up (a demo switch; the demo also gets an HA address, it has none): a card in the
        // empty state's look, its link opens HA's energy settings in a new tab, prominent 48
        {
          const { page, close } = await open(device, 'glas', '/', { mode });
          try {
            await ev(page, () => {
              window.__hapulseDemo.energyConfigured(false);
              window.__hapulseDemo.setUrl('http://192.0.2.10:8123/');
              history.pushState({}, '', '/energy');
              dispatchEvent(new PopStateEvent('popstate'));
            });
            await page.waitForSelector('.energy-empty-state', { timeout: 5000 });
            await sleep(400);
            await settleAnimations(page);
            const got = await ev(page, () => {
              const tok = (n, prop = 'color') => {
                const d = document.createElement('div');
                d.style[prop] = `var(${n})`;
                document.body.appendChild(d);
                const v = getComputedStyle(d)[prop];
                d.remove();
                return v;
              };
              const card = document.querySelector('.energy-empty-state');
              const icon = card.querySelector('.energy-empty-state__icon');
              const title = card.querySelector('.energy-empty-state__title');
              const desc = card.querySelector('.energy-empty-state__desc');
              const btn = card.querySelector('.energy-empty-state__btn');
              const [ic, t, dd, bc] = [icon, title, desc, btn].map((e) => getComputedStyle(e));
              const ib = icon.getBoundingClientRect();
              const bb = btn ? btn.getBoundingClientRect() : null;
              return {
                text: title.textContent.trim(),
                card: getComputedStyle(card).backgroundColor === tok('--bg-card', 'backgroundColor') && getComputedStyle(card, '::before').content === 'none',
                circle: Math.round(ib.width) === 56 && Math.round(ib.height) === 56 && ic.borderRadius === '50%',
                fill: ic.backgroundColor === tok('--g-fill', 'backgroundColor'), glyph: ic.color === tok('--g-label-2'),
                title: `${t.fontWeight} ${t.fontSize}/${t.lineHeight}`, titleColor: t.color === tok('--g-label'),
                desc: `${dd.fontSize}/${dd.lineHeight}`, descColor: dd.color === tok('--g-label-2'),
                btn: bb && { href: btn.getAttribute('href'), target: btn.getAttribute('target'), rel: btn.getAttribute('rel'),
                  h: Math.round(bb.height), w: Math.round(bb.width), bg: bc.backgroundColor === tok('--g-prominent', 'backgroundColor'),
                  ink: bc.color === tok('--g-on-prominent'), text: btn.textContent.trim() },
              };
            });
            const ok = !!got && got.text === DE['energy.notConfigured.title'] && got.card && got.circle && got.fill && got.glyph
              && got.title === '600 17px/22px' && got.titleColor && got.desc === '15px/20px' && got.descColor && !!got.btn
              && got.btn.href === 'http://192.0.2.10:8123/config/energy' && got.btn.target === '_blank' && /\bnoopener\b/.test(got.btn.rel)
              && got.btn.h === 48 && got.btn.w >= 44 && got.btn.bg && got.btn.ink && got.btn.text === DE['energy.notConfigured.openSettings'];
            res[`${device}-energy-empty`] = { ok, ...got };
          } catch (e) {
            res[`${device}-energy-empty`] = { ok: false, error: String(e.message).slice(0, 200) };
          }
          await close();
        }

        // music: without media players the page's empty state in the same look
        {
          const { page, close } = await open(device, 'glas', '/music', { mode });
          try {
            const ids = await ev(page, () => ['media_player.living_room_tv', 'media_player.bedroom_speaker', 'media_player.kitchen_speaker']
              .filter((i) => window.__hapulseDemo.entity(i)));
            await ev(page, (list) => list.forEach((i) => window.__hapulseDemo.patch(i, null)), ids);
            await sleep(400);
            await settleAnimations(page);
            const got = await emptyLook(page, '.music-page > .empty-state');
            res[`${device}-music-empty`] = { ok: ids.length === 3 && emptyOk(got, 'music.empty.title'), removed: ids.length, ...got };
          } catch (e) {
            res[`${device}-music-empty`] = { ok: false, error: String(e.message).slice(0, 200) };
          }
          await close();
        }

        // devices: with every entity hidden and editing off no device is left, the page's empty state in the same look;
        // a search without a match says so in 15/20 `label2`
        {
          const { DEMO_ENTITIES } = await import(require('url').pathToFileURL(require('path').join(__dirname, '../../../packages/core/dist/demo.js')).href);
          const { page, close } = await open(device, 'glas', '/devices',
            { mode, customization: { editingEnabled: false, hiddenEntities: Object.keys(DEMO_ENTITIES) } });
          try {
            await sleep(500);
            await settleAnimations(page);
            const got = await emptyLook(page, '.devices-page > .empty-state');
            res[`${device}-devices-empty`] = { ok: emptyOk(got, 'devices.empty.title'), ...got };
          } catch (e) {
            res[`${device}-devices-empty`] = { ok: false, error: String(e.message).slice(0, 200) };
          }
          await close();
        }
        {
          const { page, close } = await open(device, 'glas', '/devices', { mode });
          try {
            await page.locator('.devices-toolbar__search-input').fill('zzzz');
            await sleep(300);
            const got = await ev(page, () => {
              const d = document.createElement('div');
              d.style.color = 'var(--g-label-2)';
              document.body.appendChild(d);
              const want = getComputedStyle(d).color;
              d.remove();
              const e = document.querySelector('.devices-empty-filter');
              const cs = getComputedStyle(e);
              return { text: e.textContent.trim(), font: `${cs.fontSize}/${cs.lineHeight}`, color: cs.color === want,
                cards: document.querySelectorAll('.device-card').length };
            });
            res[`${device}-devices-noMatch`] = { ok: got.text === DE['devices.emptyFilter'] && got.font === '15px/20px' && got.color && got.cards === 0, ...got };
          } catch (e) {
            res[`${device}-devices-noMatch`] = { ok: false, error: String(e.message).slice(0, 200) };
          }
          await close();
        }
      }
      out.pagesEmpty = res;
      out.pagesEmptyOk = Object.values(res).every((r) => r.ok);
    });

    out.pagesPageErrors = pageErrors;
    return ran.every((k) => out[k + 'Ok']) && pageErrors.length === 0;
  }

  // ---- Scenes for `shoot` (its paused clock: only `run` moves time): a page in edit mode, Glas with its bars and
  //      Klassisch with its badges, so that `compare` also holds Klassisch's edit mode pixel-identical (as `home-edit`
  //      does on the overview). On a phone Glas enters edit mode from the avatar menu. ----
  const editScene = (p) => ({ path: p, act: async (page) => {
    const press = async (sel, text) => {
      const done = await page.evaluate(([s, t]) => {
        const b = [...document.querySelectorAll(s)].find((e) => e.getClientRects().length && (!t || e.textContent.includes(t)));
        if (b) b.click();
        return !!b;
      }, [sel, text]);
      await run(page, 200);
      await settleAnimations(page);
      return done;
    };
    const phoneGlas = page.viewportSize().width < 900 && (await isGlas(page));
    const done = phoneGlas
      ? (await press('.g-avatar__btn')) && (await press('.g-avatar-menu__item', DE['glas.avatar.edit']))
      : await press('.g-edit-capsule, .edit-toggle');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await run(page, 100);
    await settleAnimations(page);
    return done ? '' : 'no edit toggle';
  } });
  const scenes = {
    'security-edit': editScene('/security'),
    'energy-edit': editScene('/energy'),
    'music-edit': editScene('/music'),
  };

  return { pagesChecks, scenes };
};
