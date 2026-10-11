// [fork] glas-checks-polish.cjs — the polish of Glas stage 7 for glas-shots.cjs (docs/glas/PLAN-ETAPPE-7.md §3):
// `checks --part polish`. glas-shots.cjs loads this file with its helpers; it is not run on its own.
//
// Blocks: polishHover (K108: after a tap every control shows its resting state — on touch screens no hover tint
// stays; in forced colours the tiles and buttons of the windows keep an edge), polishContrast (K109: contrast on the
// screen), polishPerf (K110: scrolling the overview at 4× CPU slowdown, Glas against Klassisch), polishReduced
// (GLAS-DESIGN §6.4: reduced motion everywhere), polishPreview (K111: the style row without "Vorschau" in seven
// languages, read-only for non-admins) and polishTransitions (K107: page changes as view transitions). The checks run in
// real time like the page checks.

module.exports = function polish(h) {
  const { DE, DEVICES, ABORTED, settleAnimations, seedScript, SCENES, NVR, textsOf } = h;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** The pages of the hover sweep (the NVR overview and a camera page with the Sentinel stand-in). */
  const ROUTES = ['/', '/room/living_room', '/security', '/pool', '/energy', '/music', '/devices', '/automations', '/scenes',
    '/system', '/settings', '/nvr', '/nvr/1'];
  /** The windows of the hover sweep and of the edges in forced colours (scenes of glas-checks-sheets.cjs). */
  const WINDOWS = ['win-people', 'win-lights', 'win-doors', 'win-garage', 'win-locks', 'win-alarm', 'win-pool', 'win-media',
    'win-weather', 'win-climate', 'win-blinds', 'win-waste', 'win-detail', 'win-manual', 'win-schedule', 'win-whatsnew',
    'win-device', 'win-entities', 'win-keypad', 'win-nvr-setup', 'win-nvr-rooms', 'win-unlock', 'win-garage-open',
    'win-keypad-security', 'win-pool-restart'];
  /** Further scenes of glas-shots.cjs the hover sweep visits: the frame's menus, the edit modes, the context menu and
   *  the swipes, a toast, the detail of a light, the camera page's events and date window, the NVR windows, its head's
   *  "⋯" menu and states.
   *  `room-edit` is the room in edit mode (below). */
  const VIEWS = ['avatar', 'notifications', 'more', 'rooms', 'edit', 'room-edit', 'collapsed', 'toast', 'security-edit',
    'energy-edit', 'music-edit', 'automations-edit', 'scenes-edit', 'system-edit', 'ctx-card', 'swipe-lights',
    'swipe-notes', 'detail-light', 'energy-bubble', 'nvr-cam-events', 'nvr-cam-date', 'nvr-setup', 'nvr-setup-window',
    'nvr-rooms', 'nvr-menu', 'nvr-security', 'nvr-room', 'nvr-error'];
  const sceneOf = (name) => (name === 'room-edit' ? { path: '/room/living_room', act: SCENES.edit.act } : SCENES[name]);
  /** What a tap may leave changed on purpose. */
  const ALLOWED = [
    // the package (Sentinel's own UI alike): a tap on the picture brings the player's capsule to full strength, as the
    // pointer does — on a touch screen it rests at 0.85 over the live picture
    { kind: /^DIV\.nvr-pill-ctl\b/, props: ['opacity'], why: 'a tap on the picture shows the player capsule in full' },
  ];
  /** Computed values a tap could leave changed; an outline counts only while it is drawn. */
  const PROPS = ['backgroundColor', 'backgroundImage', 'boxShadow', 'transform', 'translate', 'scale', 'filter', 'opacity',
    'color', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'textDecorationLine'];

  /**
   * In the page: every element (and pseudo-element) that a `:hover` rule of the stylesheets would restyle — rules
   * under a media query that does not match now (`(hover: hover)` on a touch screen) are left out. Each gets
   * `data-g-hv` (an index); returns their names, the selectors and the resting values. Two of each kind of element
   * (tag and classes) are enough. Transitions are switched off, so the hovered value is read at once.
   */
  function collect(props) {
    const kill = document.createElement('style');
    kill.id = 'g-hv-kill';
    kill.textContent = '*, *::before, *::after { transition: none !important; }';
    document.head.append(kill);
    const splitList = (text) => {
      const parts = [];
      let depth = 0, cur = '';
      for (const ch of text) {
        if (ch === '(' || ch === '[') depth++;
        if (ch === ')' || ch === ']') depth--;
        if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
      }
      if (cur.trim()) parts.push(cur.trim());
      return parts;
    };
    const items = [];
    const index = new Map(); // element + pseudo → item
    const kinds = new Map();
    const seen = new Set(); // the selectors of the `:hover` rules that apply now, and those that met an element
    const matched = new Set();
    let unparsed = 0;
    const visible = (el, pseudo) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      const cs = getComputedStyle(el, pseudo || undefined);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && (!pseudo || cs.content !== 'none');
    };
    const walk = (rules) => {
      for (const r of rules) {
        if (r instanceof CSSMediaRule) { if (matchMedia(r.media.mediaText).matches) walk(r.cssRules); continue; }
        if (r instanceof CSSSupportsRule) { if (CSS.supports(r.conditionText)) walk(r.cssRules); continue; }
        if (typeof CSSLayerBlockRule !== 'undefined' && r instanceof CSSLayerBlockRule) { walk(r.cssRules); continue; }
        if (!(r instanceof CSSStyleRule) || !r.selectorText.includes(':hover')) continue;
        for (const sel of splitList(r.selectorText)) {
          if (!sel.includes(':hover') || /:not\([^)]*:hover/.test(sel)) continue;
          let subject = sel.replace(/:hover/g, '').replace(/\(\s*,/g, '(').replace(/,\s*\)/g, ')').replace(/,\s*,/g, ',')
            .replace(/:(is|where)\(\s*\)/g, '');
          let pseudo = null;
          const m = subject.match(/::?(before|after)\s*$/);
          if (m) { pseudo = '::' + m[1]; subject = subject.slice(0, m.index); }
          let found;
          try { found = document.querySelectorAll(subject.trim() || '*'); } catch { unparsed++; continue; }
          seen.add(sel);
          if (found.length) matched.add(sel);
          for (const el of found) {
            const key = el;
            let byPseudo = index.get(key);
            if (!byPseudo) { byPseudo = new Map(); index.set(key, byPseudo); }
            let item = byPseudo.get(pseudo);
            if (!item) {
              const kind = el.tagName + '.' + [...el.classList].sort().join('.') + (pseudo || '');
              const n = kinds.get(kind) || 0;
              if (n >= 2 || !visible(el, pseudo)) { byPseudo.set(pseudo, null); continue; }
              kinds.set(kind, n + 1);
              item = { i: items.length, kind, pseudo, sels: [] };
              byPseudo.set(pseudo, item);
              items.push(item);
              el.setAttribute('data-g-hv' + (pseudo ? '-' + pseudo.slice(2) : ''), String(item.i));
              item.el = el;
            }
            if (item && item.sels.length < 4 && !item.sels.includes(sel)) item.sels.push(sel);
          }
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try { walk(sheet.cssRules); } catch { /* cross-origin */ }
    }
    for (const item of items) {
      const cs = getComputedStyle(item.el, item.pseudo || undefined);
      item.rest = Object.fromEntries(props.map((p) => [p, cs[p]]));
      if (cs.outlineStyle !== 'none') item.rest.outline = cs.outlineColor + ' ' + cs.outlineWidth;
      delete item.el;
    }
    return { items, unparsed, seen: [...seen], matched: [...matched] };
  }

  /**
   * In forced colours, in the open window: the tiles and buttons that have a fill of their own in the author's colours
   * (it differs from what lies around them) need an edge there — a border or an outline — since forced colours take
   * the fill away (GLAS-DESIGN §3.7). The author's colours are read with `forced-color-adjust: none` on the window for
   * a moment. Not counted: decoration (a surface without text that only holds a symbol or a picture, as in K109) and a
   * fill that stays in forced colours (`forced-color-adjust: none` with a system colour). Returns how many were checked
   * and the ones without an edge.
   */
  function edgeless() {
    const panel = document.querySelector('.modal-panel');
    if (!panel) return { checked: 0, missing: [], noWindow: true };
    const rgba = (c) => {
      const m = c.match(/^rgba?\(([^)]+)\)$/);
      if (!m) return null;
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    };
    const fill = (el) => rgba(getComputedStyle(el).backgroundColor);
    /** The first opaque-ish fill above the element (white when none). */
    const ground = (el) => {
      for (let e = el.parentElement; e; e = e.parentElement) {
        const f = fill(e);
        if (f && f[3] > 0.5) return f;
      }
      return [255, 255, 255, 1];
    };
    const INTERACTIVE = 'button, a[href], [role="button"], [role="radio"], [role="tab"], [role="switch"], summary';
    const candidates = [];
    panel.style.forcedColorAdjust = 'none';
    for (const el of panel.querySelectorAll('*')) {
      if (el.matches('input, select, textarea, :disabled')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 32 || r.height < 32) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const interactive = el.matches(INTERACTIVE);
      if (!interactive && !(parseFloat(cs.borderTopLeftRadius) >= 12 && r.width >= 44 && r.height >= 44)) continue;
      if (!interactive && !el.textContent.trim() && el.querySelector('svg, img')) continue;
      const f = fill(el);
      if (!f || f[3] <= 0.05) continue;
      const g = ground(el);
      const over = [0, 1, 2].map((i) => f[i] * f[3] + g[i] * (1 - f[3]));
      if (Math.abs(over[0] - g[0]) + Math.abs(over[1] - g[1]) + Math.abs(over[2] - g[2]) < 9) continue;
      candidates.push(el);
    }
    panel.style.forcedColorAdjust = '';
    const missing = new Map();
    for (const el of candidates) {
      const cs = getComputedStyle(el);
      const kept = fill(el);
      if (cs.forcedColorAdjust === 'none' && kept && kept[3] > 0.5) continue;
      const side = (s) => cs[`border${s}Style`] !== 'none' && parseFloat(cs[`border${s}Width`]) >= 1;
      const border = ['Top', 'Right', 'Bottom', 'Left'].every(side);
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1;
      if (border || outline) continue;
      const kind = el.tagName + '.' + [...el.classList].sort().join('.');
      if (!missing.has(kind)) missing.set(kind, { kind, label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30) });
    }
    return { checked: candidates.length, missing: [...missing.values()] };
  }

  /**
   * After a tap on an element its ancestors are hovered with it: force `:hover` on the element and every ancestor (CDP),
   * read the values, release. Returns what differs from the resting values.
   */
  async function hoverDiffs(page, cdp, collected) {
    const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: false });
    await cdp.send('CSS.enable');
    const parentOf = new Map();
    const remember = (node, parent) => {
      if (parent) parentOf.set(node.nodeId, parent.nodeId);
      for (const c of node.children || []) remember(c, node);
    };
    remember(root, null);
    const diffs = [];
    for (const item of collected.items) {
      const attr = 'data-g-hv' + (item.pseudo ? '-' + item.pseudo.slice(2) : '');
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[${attr}="${item.i}"]` });
      if (!nodeId) continue;
      const chain = [];
      for (let n = nodeId; n && n !== root.nodeId; n = parentOf.get(n)) chain.push(n);
      for (const n of chain) await cdp.send('CSS.forcePseudoState', { nodeId: n, forcedPseudoClasses: ['hover'] });
      const now = await page.evaluate(([a, i, pseudo, props]) => {
        const el = document.querySelector(`[${a}="${i}"]`);
        const cs = getComputedStyle(el, pseudo || undefined);
        const v = Object.fromEntries(props.map((p) => [p, cs[p]]));
        if (cs.outlineStyle !== 'none') v.outline = cs.outlineColor + ' ' + cs.outlineWidth;
        return v;
      }, [attr, item.i, item.pseudo, PROPS]);
      for (const n of chain) await cdp.send('CSS.forcePseudoState', { nodeId: n, forcedPseudoClasses: [] });
      const changed = Object.keys({ ...item.rest, ...now }).filter((p) => item.rest[p] !== now[p]);
      if (changed.length) {
        diffs.push({ kind: item.kind, sels: item.sels.map((s) => s.replace(":root[data-style='glas'] ", '')),
          changed: Object.fromEntries(changed.map((p) => [p, [item.rest[p], now[p]]])) });
      }
    }
    return diffs;
  }

  /**
   * In the page (K109): what to measure in the viewport now — texts, the value or placeholder of fields, and the icons of
   * controls without visible text (and SVG icons with a label). A target lies inside the viewport (texts cut at the top
   * or bottom wait for another scroll position, at the sides only the visible part counts), is visible (the opacities of
   * its ancestors ≥ 0.05), not measured yet (`data-c-done`) and not covered by anything painted above it (also by an
   * ancestor's pseudo-element: the page under the scrim of the phone's More and rooms menus is out of use like the page
   * under a window; listed as "under a pseudo-element" with the ancestor). It gets
   * `data-c-t` and `data-c-g` (2 on glass: for its background picture only the other things on glass are hidden, so the
   * page under the glass stays as it is). Its colour (alpha times the opacities), boxes and threshold are kept in
   * `window.__cT`. Cover is looked for on a grid over the boxes (a glass bar over part of a text blurs it there). For
   * that `inert` (the windows under the top one) is lifted for a moment: hit testing skips inert layers, so their scrim
   * would not count as cover. Returns the count and why the others were left out.
   */
  function contrastTargets() {
    if (!document.getElementById('c-hide')) {
      const style = document.createElement('style');
      style.id = 'c-hide';
      style.textContent = [
        '[data-c-h] { -webkit-text-fill-color: transparent !important; text-shadow: none !important; }',
        '[data-c-h]::placeholder { -webkit-text-fill-color: transparent !important; color: transparent !important; }',
        'text[data-c-h], tspan[data-c-h] { fill: transparent !important; stroke: transparent !important; }',
        'svg[data-c-h] { visibility: hidden !important; }',
        'select[data-c-h] { color: transparent !important; }',
        'html[data-c-pe] * { pointer-events: auto !important; }',
      ].join('\n');
      document.head.append(style);
    }
    for (const e of document.querySelectorAll('[data-c-t]')) {
      e.removeAttribute('data-c-t');
      e.removeAttribute('data-c-g');
    }
    const vw = innerWidth;
    const vh = innerHeight;
    let cx = null;
    /** Any computed colour as [r, g, b, a] (through a 1-px canvas: also color() and oklab() results). */
    const rgba = (css) => {
      if (!cx) {
        const cv = document.createElement('canvas');
        cv.width = 1;
        cv.height = 1;
        cx = cv.getContext('2d', { willReadFrequently: true });
      }
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = 'rgba(0, 0, 0, 0)';
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const opacityOf = (el) => {
      let o = 1;
      for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity);
      return o;
    };
    const backdrop = (s) => (!!s.backdropFilter && s.backdropFilter !== 'none')
      || (!!s.webkitBackdropFilter && s.webkitBackdropFilter !== 'none');
    const paintsBox = (s) => rgba(s.backgroundColor)[3] > 0.02 || s.backgroundImage !== 'none' || backdrop(s);
    /** Whether an element paints over what lies under it (its box, a pseudo-element, a picture or an SVG shape). */
    const paints = (o) => {
      if (o === document.documentElement || o === document.body) return false;
      const s = getComputedStyle(o);
      if (s.visibility !== 'visible' || opacityOf(o) < 0.02) return false;
      if (/^(IMG|VIDEO|CANVAS|IFRAME)$/.test(o.tagName)) return true;
      if (o instanceof SVGElement && o.tagName.toLowerCase() !== 'svg') return true;
      if (paintsBox(s)) return true;
      return ['::before', '::after'].some((p) => {
        const ps = getComputedStyle(o, p);
        return ps.content !== 'none' && parseFloat(ps.opacity) > 0.02 && paintsBox(ps);
      });
    };
    /** Whether a ::before or ::after of the element paints (an ancestor hit above its own content: the scrim of the
     *  phone's More and rooms menus is `.app-layout::before`). */
    const pseudoPaints = (o) => opacityOf(o) >= 0.02 && ['::before', '::after'].some((p) => {
      const ps = getComputedStyle(o, p);
      return ps.content !== 'none' && ps.visibility === 'visible' && parseFloat(ps.opacity) > 0.02 && paintsBox(ps);
    });
    const glassy = (o) => backdrop(getComputedStyle(o)) || backdrop(getComputedStyle(o, '::before'))
      || backdrop(getComputedStyle(o, '::after'));
    /** At a point: what covers `el` (the first painted element above it; an ancestor listed above it covers it with a
     *  pseudo-element) and whether glass lies under it (a glass layer of its own or of an ancestor, also a sibling layer
     *  like the tab bar's). */
    const stackAt = (el, x, y) => {
      let reached = false;
      let glass = false;
      for (const o of document.elementsFromPoint(x, y)) {
        if (!reached) {
          if (o === el || el.contains(o)) reached = true;
          else if (o.contains(el)) {
            if (pseudoPaints(o)) return { cover: o, pseudo: true };
            reached = true;
          } else if (paints(o)) return { cover: o };
        }
        if (reached && !glass && glassy(o)) glass = true;
      }
      return { cover: null, glass };
    };
    /** An ancestor that clips the boxes away completely (an overflow that hides them). */
    const clippedAway = (el, rects) => {
      for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
        const c = e.getBoundingClientRect();
        if (rects.every((r) => r.r <= c.left || r.l >= c.right || r.b <= c.top || r.t >= c.bottom)) return true;
      }
      return false;
    };
    const kindOf = (el) => (el.tagName.toLowerCase() + [...(el.classList || [])].slice(0, 3).map((c) => '.' + c).join('')).slice(0, 90);
    const skip = {};
    const skipKinds = {};
    const left = (why, el) => {
      skip[why] = (skip[why] || 0) + 1;
      if (el && ['disabled', 'inactive', 'transparent', 'emoji', 'unpainted', 'under a pseudo-element'].includes(why)) {
        const list = (skipKinds[why] = skipKinds[why] || []);
        const k = kindOf(el);
        if (!list.includes(k) && list.length < 12) list.push(k);
      }
    };
    /** Boxes in the viewport: null when cut at the top or bottom (measured at another scroll position). */
    const inView = (rs) => {
      const out = [];
      for (const r of rs) {
        if (r.width < 1 || r.height < 4) continue;
        if (r.top < 0 || r.bottom > vh) return null;
        const l = Math.max(0, r.left);
        const rr = Math.min(vw, r.right);
        if (rr - l >= 1) out.push({ l, t: r.top, r: rr, b: r.bottom });
      }
      return out;
    };
    const large = (s) => {
      const px = parseFloat(s.fontSize);
      return px >= 24 || (px >= 18.66 && parseInt(s.fontWeight, 10) >= 700);
    };
    const targets = [];
    const add = (el, kind, rects, fg, need, sample) => {
      if (el.closest(':disabled, [aria-disabled="true"]')) return left('disabled', el);
      if (el.closest('[data-c-inert]')) return left('inactive', el);
      const s = getComputedStyle(el);
      if (s.visibility !== 'visible') return left('hidden');
      const op = opacityOf(el);
      if (op < 0.05) return left('invisible');
      if (fg[3] * op < 0.02) return left('transparent', el);
      if (clippedAway(el, rects)) return left('clipped');
      // every line box: the last line of a list item can lie under a floating button, whose own label would count as
      // the item's glyphs on the picture with the glass targets hidden
      const pts = [];
      for (const r of rects) {
        for (const fy of [0.15, 0.5, 0.85]) {
          for (const fx of [0.05, 0.27, 0.5, 0.73, 0.95]) pts.push([r.l + (r.r - r.l) * fx, r.t + (r.b - r.t) * fy]);
        }
      }
      let glass = false;
      for (const [x, y] of pts) {
        const st = stackAt(el, x, y);
        if (st.cover && st.pseudo) return left('under a pseudo-element', st.cover);
        if (st.cover) return left('covered');
        glass = glass || st.glass;
      }
      el.setAttribute('data-c-t', String(targets.length));
      el.setAttribute('data-c-g', glass ? '2' : '1');
      targets.push({ kind, el: kindOf(el), text: sample.trim().replace(/\s+/g, ' ').slice(0, 48), rects,
        fg: [fg[0], fg[1], fg[2], Math.round(fg[3] * op * 1000) / 1000], need, glass: el.getAttribute('data-c-g') === '2',
        aria: !!el.closest('[aria-hidden="true"]') });
      return null;
    };
    document.documentElement.setAttribute('data-c-pe', '');
    const inert = [...document.querySelectorAll('[inert]')];
    for (const e of inert) {
      e.setAttribute('data-c-inert', '');
      e.inert = false;
    }
    try {
      // texts: one target per element (all its text nodes)
      const byEl = new Map();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.data.trim()) continue;
        const el = n.parentElement;
        if (!el || el.closest('script, style, noscript, template, option, [data-c-done], #c-hide')) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const all = [...range.getClientRects()];
        if (!all.length) continue;
        const rects = inView(all);
        if (rects === null) {
          left('outside');
          continue;
        }
        if (!rects.length) continue;
        const e = byEl.get(el) || { rects: [], text: '' };
        e.rects.push(...rects);
        e.text += n.data;
        byEl.set(el, e);
      }
      for (const [el, e] of byEl) {
        const s = getComputedStyle(el);
        const svgText = el instanceof SVGElement;
        if (/\p{Extended_Pictographic}/u.test(e.text) && !/[\p{L}\p{N}]/u.test(e.text.replace(/\p{Extended_Pictographic}/gu, ''))) {
          left('emoji', el);
          continue;
        }
        const fill = svgText ? s.fill : s.webkitTextFillColor || s.color;
        const fg = rgba(fill && fill !== 'none' ? fill : s.color);
        // a symbol on its own (›, ·, –) is a graphical object: 3:1
        const need = !/[\p{L}\p{N}]/u.test(e.text) ? 3 : large(s) ? 3 : 4.5;
        add(el, 'text', e.rects, fg, need, e.text);
      }
      // fields: the value, else the placeholder
      for (const el of document.querySelectorAll('input:not([type=hidden], [type=checkbox], [type=radio], [type=range], [type=color], [type=file], [type=submit], [type=button], [type=reset], [type=image]), textarea, select')) {
        if (el.closest('[data-c-done]')) continue;
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        const s = getComputedStyle(el);
        const pad = (side) => parseFloat(s['padding' + side]) + parseFloat(s['border' + side + 'Width']);
        const rects = inView([{ left: b.left + pad('Left'), top: b.top + pad('Top'), right: b.right - pad('Right'),
          bottom: b.bottom - pad('Bottom'), width: b.width - pad('Left') - pad('Right'), height: b.height - pad('Top') - pad('Bottom') }]);
        if (!rects || !rects.length) continue;
        const value = el.tagName === 'SELECT' ? (el.selectedOptions[0] || { textContent: '' }).textContent : el.value;
        const placeholder = !value && el.placeholder;
        if (!value && !placeholder) continue;
        const fg = rgba(placeholder ? getComputedStyle(el, '::placeholder').color : s.webkitTextFillColor || s.color);
        add(el, 'field', rects, fg, large(s) ? 3 : 4.5, value || placeholder);
      }
      // icons: the only visible content of a control, or labelled
      const CONTROL = 'button, a[href], summary, [role="button"], [role="link"], [role="tab"], [role="switch"], [role="menuitem"], [role="radio"], [role="checkbox"], [role="option"]';
      const hasText = (ctl) => [...byEl.keys()].some((e) => ctl.contains(e));
      for (const svg of document.querySelectorAll('svg')) {
        if (svg.closest('[data-c-done]') || svg.parentElement?.closest('svg')) continue;
        const b = svg.getBoundingClientRect();
        if (b.width < 10 || b.height < 10 || b.width > 48 || b.height > 48) continue;
        const ctl = svg.closest(CONTROL);
        const labelled = svg.getAttribute('role') === 'img' && !!svg.getAttribute('aria-label');
        if (!labelled && !(ctl && !hasText(ctl))) continue;
        const rects = inView([b]);
        if (!rects || !rects.length) continue;
        const s = getComputedStyle(svg);
        const paint = [s.stroke, s.fill].find((c) => c && c !== 'none' && rgba(c)[3] > 0);
        add(svg, 'icon', rects, rgba(paint || s.color), 3, (ctl && (ctl.getAttribute('aria-label') || ctl.getAttribute('title'))) || svg.getAttribute('aria-label') || '(icon)');
      }
    } finally {
      document.documentElement.removeAttribute('data-c-pe');
      for (const e of inert) {
        e.inert = true;
        e.removeAttribute('data-c-inert');
      }
    }
    window.__cT = targets;
    return { count: targets.length, skip, skipKinds };
  }

  /**
   * In the page (K109): the contrast of each target of `contrastTargets` from four pictures of the viewport (one pixel
   * per CSS pixel): `a` with everything, `b1` with the targets off glass hidden, `b2` with those on glass hidden, `a2`
   * like `a` once more. Glyph pixels are those where `a` differs from the target's background picture; at each the
   * target's colour laid over the background pixel is compared with that pixel and the worst counts (WCAG; a text shadow
   * is not part of the background, GLAS-DESIGN §2). Pixels that changed between `a` and `a2` do not count; a target
   * with more than 2 % of them is unstable and stays for another try. Fewer than 3 glyph pixels: the colour against the
   * background in the middle of the box (an invisible text is a finding). Measured targets get `data-c-done`.
   */
  async function contrastMeasure(pics) {
    const decode = async (b64) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const cv = document.createElement('canvas');
      cv.width = img.naturalWidth;
      cv.height = img.naturalHeight;
      const c = cv.getContext('2d', { willReadFrequently: true });
      c.drawImage(img, 0, 0);
      return { w: cv.width, h: cv.height, d: c.getImageData(0, 0, cv.width, cv.height).data };
    };
    const [A, B1, B2, A2] = await Promise.all(pics.map(decode));
    const lin = (c) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const diff = (p, q, i) => Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]);
    const results = [];
    const targets = window.__cT || [];
    targets.forEach((t, k) => {
      const B = t.glass ? B2 : B1;
      const [fr, fgc, fb, fa] = t.fg;
      const ratioAt = (b, i) => {
        const lb = lum(b[i], b[i + 1], b[i + 2]);
        const lf = lum(fr * fa + b[i] * (1 - fa), fgc * fa + b[i + 1] * (1 - fa), fb * fa + b[i + 2] * (1 - fa));
        return (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
      };
      let n = 0;
      let total = 0;
      let unstable = 0;
      let worst = Infinity;
      let bg = null;
      for (const r of t.rects) {
        for (let y = Math.max(0, Math.floor(r.t)); y < Math.min(A.h, Math.ceil(r.b)); y++) {
          for (let x = Math.max(0, Math.floor(r.l)); x < Math.min(A.w, Math.ceil(r.r)); x++) {
            const i = (y * A.w + x) * 4;
            total++;
            if (diff(A.d, A2.d, i) > 12) {
              unstable++;
              continue;
            }
            if (diff(A.d, B.d, i) < 12) continue;
            n++;
            const q = ratioAt(B.d, i);
            if (q < worst) {
              worst = q;
              bg = [B.d[i], B.d[i + 1], B.d[i + 2]];
            }
          }
        }
      }
      const res = { k, n, unstable: total ? Math.round((unstable / total) * 1000) / 1000 : 0 };
      if (res.unstable > 0.02) res.state = 'unstable';
      else if (n >= 3) {
        res.ratio = Math.round(worst * 100) / 100;
        res.bg = bg;
      } else {
        const r = t.rects[0];
        const x = Math.min(A.w - 1, Math.max(0, Math.round((r.l + r.r) / 2)));
        const y = Math.min(A.h - 1, Math.max(0, Math.round((r.t + r.b) / 2)));
        const i = (y * A.w + x) * 4;
        res.ratio = Math.round(ratioAt(B.d, i) * 100) / 100;
        res.bg = [B.d[i], B.d[i + 1], B.d[i + 2]];
        res.state = 'noGlyphs';
      }
      const el = document.querySelector(`[data-c-t="${k}"]`);
      if (el && res.state !== 'unstable') el.setAttribute('data-c-done', '');
      results.push(res);
    });
    for (const e of document.querySelectorAll('[data-c-t]')) {
      e.removeAttribute('data-c-t');
      e.removeAttribute('data-c-g');
    }
    return results;
  }

  /**
   * In the page (K109): up to `max` focusable controls fully inside the viewport, enabled, active, on top where they
   * are, two of a kind; each gets `data-c-f`.
   */
  function focusTargets(max) {
    for (const e of document.querySelectorAll('[data-c-f]')) e.removeAttribute('data-c-f');
    const SEL = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex="-1"]), '
      + '[role="button"], [role="tab"], [role="switch"], [role="radio"], [role="menuitem"]';
    const kinds = new Map();
    const out = [];
    for (const el of document.querySelectorAll(SEL)) {
      if (out.length >= max) break;
      if (el.matches(':disabled, [aria-disabled="true"]') || el.closest('[inert]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || r.top < 6 || r.left < 6 || r.bottom > innerHeight - 6 || r.right > innerWidth - 6) continue;
      if (getComputedStyle(el).visibility !== 'visible') continue;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!hit || !(hit === el || el.contains(hit))) continue;
      const kind = (el.tagName.toLowerCase() + [...el.classList].slice(0, 3).map((c) => '.' + c).join('')).slice(0, 90);
      const k = kinds.get(kind) || 0;
      if (k >= 2) continue;
      kinds.set(kind, k + 1);
      el.setAttribute('data-c-f', String(out.length));
      out.push({ i: out.length, kind, label: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        r: { l: r.left, t: r.top, r: r.right, b: r.bottom } });
    }
    return out;
  }

  /**
   * In the page (K109): brings control `i` into view as the keyboard's focus does — where it is not (behind the tab
   * bar, at the end of a strip that scrolls, cut by its list), each box that scrolls it to the nearest edge, its scroll
   * padding counted — at once, and keeps the positions before for ringRestore. True when anything moved, null when the
   * control is gone.
   */
  function ringReveal(i) {
    const el = document.querySelector(`[data-c-f="${i}"]`);
    if (!el) return null;
    const boxes = [];
    for (let a = el.parentElement; a; a = a.parentElement) {
      if (a.scrollHeight > a.clientHeight || a.scrollWidth > a.clientWidth) boxes.push(a);
    }
    if (!boxes.includes(document.scrollingElement)) boxes.push(document.scrollingElement);
    const before = boxes.map((b) => [b.scrollLeft, b.scrollTop]);
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    window.__cR = boxes.map((b, k) => [b, before[k]]);
    return boxes.some((b, k) => b.scrollLeft !== before[k][0] || b.scrollTop !== before[k][1]);
  }

  /** In the page: the scroll positions before ringReveal. */
  function ringRestore() {
    for (const [b, [x, y]] of window.__cR || []) b.scrollTo({ left: x, top: y, behavior: 'instant' });
    delete window.__cR;
  }

  /**
   * In the page (K109): focuses control `i` without scrolling and returns the box its ring is drawn on: its own and
   * that of each of its four nearest ancestors whose outline or shadow the focus changed (a search field's ring on its
   * box, :focus-within); null when it did not take the focus.
   */
  function ringFocus(i) {
    const el = document.querySelector(`[data-c-f="${i}"]`);
    if (!el) return null;
    const look = (e) => {
      const s = getComputedStyle(e);
      return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow].join('|');
    };
    const chain = [];
    for (let a = el.parentElement; a && chain.length < 4; a = a.parentElement) chain.push([a, look(a)]);
    el.focus({ preventScroll: true });
    if (document.activeElement !== el) return null;
    const r = el.getBoundingClientRect();
    const box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
    for (const [a, was] of chain) {
      if (look(a) === was) continue;
      const q = a.getBoundingClientRect();
      Object.assign(box, { l: Math.min(box.l, q.left), t: Math.min(box.t, q.top), r: Math.max(box.r, q.right), b: Math.max(box.b, q.bottom) });
    }
    return box;
  }

  /**
   * In the page (K109): the focus ring of the focused control `i` from a picture of the place (`f64`, the clip `clip`:
   * the box and 8 px around it) against the same place without focus (`window.__cU`, kept by the caller). Each changed
   * pixel counts as its colour against the unfocused pixel (WCAG 2.4.13: the change of the indicator's pixels), in 32
   * sectors around the middle of the strongest changes, spread along their shape (a flat ring like the grabber's gets as
   * many at its ends as at its sides): a sector shows the ring when one of its pixels changed by ≥ 3:1, `share` = the
   * part of the sectors that do. So a ring passes only where it stands out all around; one in two tones (GLAS-DESIGN
   * §2.5 rule 7) where one of its tones does, its anti-aliased edge does not count against it, and slight changes around
   * it (glass that picked up another frame of the page under it) neither help nor hurt. `how` and `color` only report
   * how the ring is drawn: an outline (also on a part inside, like the close button's circle) or anything else (a
   * shadow, a pseudo-element such as the grabber's bar).
   */
  async function ringMeasure([i, f64, clip]) {
    const host = document.querySelector(`[data-c-f="${i}"]`);
    if (!host) return { state: 'gone' };
    const drawn = (e) => getComputedStyle(e).outlineStyle !== 'none' && parseFloat(getComputedStyle(e).outlineWidth) >= 1;
    const el = drawn(host) ? host : [...host.querySelectorAll('*')].find(drawn) || host;
    const cs = getComputedStyle(el);
    const outline = drawn(el);
    const img = new Image();
    img.src = 'data:image/png;base64,' + f64;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const F = c.getImageData(0, 0, cv.width, cv.height).data;
    const U = window.__cU;
    const lin = (v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const cr = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    /** [change, contrast, x, y] of each changed pixel */
    const changed = [];
    for (let y = 0; y < cv.height; y++) {
      for (let x = 0; x < cv.width; x++) {
        const ux = Math.floor(clip.x + x);
        const uy = Math.floor(clip.y + y);
        if (ux < 0 || uy < 0 || ux >= U.w || uy >= U.h) continue;
        const ui = (uy * U.w + ux) * 4;
        const fi = (y * cv.width + x) * 4;
        const d = Math.abs(F[fi] - U.d[ui]) + Math.abs(F[fi + 1] - U.d[ui + 1]) + Math.abs(F[fi + 2] - U.d[ui + 2]);
        if (d < 12) continue;
        changed.push([d, cr(lum(F[fi], F[fi + 1], F[fi + 2]), lum(U.d[ui], U.d[ui + 1], U.d[ui + 2])), ux + 0.5, uy + 0.5]);
      }
    }
    const SECTORS = 32;
    const best = [];
    if (changed.length) {
      const top = Math.max(...changed.map((p) => p[0]));
      const core = changed.filter((p) => p[0] >= top / 2);
      const x0 = Math.min(...core.map((p) => p[2]));
      const x1 = Math.max(...core.map((p) => p[2]));
      const y0 = Math.min(...core.map((p) => p[3]));
      const y1 = Math.max(...core.map((p) => p[3]));
      const hx = Math.max(1, (x1 - x0) / 2);
      const hy = Math.max(1, (y1 - y0) / 2);
      best.push(...new Array(SECTORS).fill(0));
      for (const [, v, x, y] of changed) {
        const a = Math.atan2((y - (y0 + y1) / 2) / hy, (x - (x0 + x1) / 2) / hx);
        const k = Math.min(SECTORS - 1, Math.floor(((a + Math.PI) / (2 * Math.PI)) * SECTORS));
        best[k] = Math.max(best[k], v);
      }
    }
    const vals = [...best].sort((p, q) => p - q);
    const at = (q) => (vals.length ? Math.round(vals[Math.min(vals.length - 1, Math.floor(vals.length * q))] * 100) / 100 : null);
    const b = el.getBoundingClientRect();
    return { fv: host.matches(':focus-visible'), how: outline ? 'outline' : 'shadow', on: el === host ? null : el.getAttribute('class'),
      n: changed.length, share: best.length ? Math.round((best.filter((v) => v >= 3).length / SECTORS) * 100) / 100 : 0,
      p10: at(0.1), median: at(0.5), color: outline ? cs.outlineColor : null,
      box: { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom) } };
  }

  /**
   * In the page, before the app: records every view transition — its kind (`data-g-vt`), the named elements at the start
   * (with their boxes) and at `ready` (each with whether glass lies inside it), the new page at `ready` (path, h1, focus,
   * the entry mark, scroll position, the tab bar's state, the tile a picture lands in and whether its marks wait, what
   * in the page moves), the animations then, and the end (the landing tile's marks fading in). `noApi`: a browser
   * without view transitions.
   */
  function recordTransitions(noApi) {
    window.__vt = [];
    const proto = Document.prototype;
    if (noApi) {
      delete proto.startViewTransition;
      return;
    }
    const orig = proto.startViewTransition;
    if (!orig) return;
    const label = (e) => (e && e !== document.body ? e.getAttribute('aria-label') || e.textContent.trim().slice(0, 40) : null);
    const box = (e) => {
      const b = e.getBoundingClientRect();
      return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom) };
    };
    const named = () => [...document.querySelectorAll('body *')]
      .filter((e) => getComputedStyle(e).viewTransitionName !== 'none')
      .map((e) => ({ cls: String(e.className || e.tagName).split(' ')[0], src: e.getAttribute('data-src'), box: box(e),
        glassInside: [...e.querySelectorAll('*')].some((d) => getComputedStyle(d).backdropFilter !== 'none') }));
    proto.startViewTransition = function (arg) {
      const root = document.documentElement; // not there yet when the init script runs
      const rec = { kind: root.getAttribute('data-g-vt'), from: location.pathname, focus: label(document.activeElement),
        named0: named(), y0: Math.round(scrollY), t0: performance.now() };
      const landing = () => [...document.querySelectorAll('[data-g-landing]')]
        .map((e) => `${e.getAttribute('data-nvr-camera')}:${e.getAttribute('data-g-landing')}`);
      window.__vt.push(rec);
      const t = orig.call(this, arg);
      t.ready.then(() => {
        rec.ready = Math.round(performance.now() - rec.t0);
        rec.path = location.pathname;
        rec.h1 = (document.querySelector('main h1') || { textContent: null }).textContent;
        rec.focusReady = label(document.activeElement);
        rec.named = named();
        const entry = document.querySelector('.app-main > .stagger-rise[data-g-entry]');
        rec.entry = !!entry;
        rec.entryKind = entry ? entry.getAttribute('data-g-entry') : null;
        rec.y = Math.round(scrollY);
        rec.tabsMin = root.hasAttribute('data-tabs-min');
        rec.landing = landing();
        // the landing tile: its marks (everything but the picture's box) wait, the box is wholly on screen
        rec.landingHidden = [...document.querySelectorAll('[data-g-landing=""]')].every((t) => [...t.children]
          .filter((c) => !c.matches('.nvr-camtile__pic, .nvr-home__cam-pic'))
          .every((c) => getComputedStyle(c).opacity === '0') && getComputedStyle(t, '::before').opacity !== '1');
        rec.landRect = [...document.querySelectorAll('[data-g-landing] :is(.nvr-camtile__pic, .nvr-home__cam-pic)')]
          .map((e) => ({ ...box(e), vw: innerWidth, vh: innerHeight,
            radius: Math.max(parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0,
              parseFloat(getComputedStyle(e.closest('[data-g-landing]')).borderTopLeftRadius) || 0) }));
        // what in the new page moves on its own (endless animations such as a pulsing dot aside)
        const main = document.querySelector('.app-main');
        rec.pageMoves = document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target
          && main && main.contains(a.effect.target) && Number.isFinite(a.effect.getComputedTiming().endTime))
          .map((a) => `${(a.effect.target.getAttribute('class') || a.effect.target.tagName).split(' ')[0]} ${a.animationName
            || (a.transitionProperty ? 'transition:' + a.transitionProperty : '')}`);
        rec.radii = [root.style.getPropertyValue('--g-vt-r0'), root.style.getPropertyValue('--g-vt-r1')];
        rec.anims = document.getAnimations().map((a) => ({
          name: a.animationName || (a.transitionProperty ? 'transition:' + a.transitionProperty : ''),
          pseudo: (a.effect && a.effect.pseudoElement) || null,
          target: a.effect && a.effect.target ? (a.effect.target.getAttribute('class') || a.effect.target.tagName).split(' ')[0] : null,
          duration: a.effect ? a.effect.getTiming().duration : null,
          transform: !!(a.effect && a.effect.getKeyframes && a.effect.getKeyframes().some((k) => k.transform || k.translate || k.scale)),
        }));
      }, (e) => { rec.readyError = String(e && e.name); });
      // read after the app's own `finished` handlers (they were attached after this one)
      t.finished.then(() => setTimeout(() => {
        rec.finished = Math.round(performance.now() - rec.t0);
        rec.namedAfter = named().length;
        rec.attrAfter = root.getAttribute('data-g-vt');
        rec.yAfter = Math.round(scrollY);
        rec.tabsMinAfter = root.hasAttribute('data-tabs-min');
        rec.landingAfter = landing();
        rec.landFades = document.getAnimations().filter((a) => a.animationName === 'g-fade-in' && a.effect && a.effect.target
          && a.effect.target.closest && a.effect.target.closest('[data-g-landing]')).length;
      }, 0));
      return t;
    };
  }

  /** A recorded transition in short: what the checks compare. */
  function summary(r) {
    if (!r) return null;
    const anims = r.anims || [];
    const pseudo = (p) => anims.filter((a) => a.pseudo === p).map((a) => a.duration);
    return {
      kind: r.kind, from: r.from, path: r.path, h1: r.h1, ready: r.ready, finished: r.finished, error: r.readyError || null,
      named0: r.named0.map((n) => n.cls), named: (r.named || []).map((n) => n.cls + (n.src ? `[${n.src}]` : '') + (n.glassInside ? ' (glass inside)' : '')),
      box0: r.named0.map((n) => n.box), pageMoves: r.pageMoves || [],
      radii: r.radii, root: [...pseudo('::view-transition-old(root)'), ...pseudo('::view-transition-new(root)')],
      cam: pseudo('::view-transition-group(g-cam)'), round: anims.filter((a) => a.name === 'g-vt-round').map((a) => a.duration),
      rise: anims.filter((a) => a.name === 'g-vt-rise').length, entryAnims: anims.filter((a) => a.name === 'g-rise').length,
      transforms: anims.filter((a) => !a.pseudo && a.transform && a.duration > 1).map((a) => `${a.target} ${a.name} ${a.duration}`),
      lens: anims.some((a) => a.target === 'g-tabs__lens'), focusSame: r.focus === r.focusReady, entry: r.entry,
      entryKind: r.entryKind, close: anims.filter((a) => a.name === 'g-vt-close').map((a) => a.duration),
      y0: r.y0, y: r.y, tabsMin: r.tabsMin, landing: r.landing, landingHidden: r.landingHidden, landRect: r.landRect,
      after: { named: r.namedAfter, attr: r.attrAfter, y: r.yAfter, tabsMin: r.tabsMinAfter, landing: r.landingAfter,
        landFades: r.landFades },
    };
  }

  /**
   * In the page, before the app (reduced motion, GLAS-DESIGN §6.4): every animation and transition that changes
   * something — CSS, the Web Animations of the Glas runtime and the view transition's pseudo-elements — once, with its
   * duration, its repetitions and the properties it changes (`moves`: position, size or transform). `window.__ra` is the
   * list, `window.__raScan()` looks once more.
   */
  function recordAnimations() {
    const seen = new WeakSet();
    window.__ra = [];
    const MOVES = /^(transform|translate|scale|rotate|offset-|background-position|inset|top|left|right|bottom|width|height|margin)/;
    const META = new Set(['offset', 'computedOffset', 'easing', 'composite']);
    const kebab = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
    const scan = () => {
      for (const a of document.getAnimations()) {
        if (seen.has(a)) continue;
        seen.add(a);
        const e = a.effect;
        const tm = e && e.getComputedTiming();
        if (!tm || !(tm.duration > 1)) continue; // switched off (global.css: 0.01 ms)
        const values = {};
        for (const k of e.getKeyframes()) {
          for (const p of Object.keys(k)) if (!META.has(p)) (values[kebab(p)] = values[kebab(p)] || []).push(String(k[p]));
        }
        // a property in one keyframe only runs from or to the element's own value: counted as a change
        const changes = Object.keys(values).filter((p) => values[p].length < 2 || values[p].some((v) => v !== values[p][0]));
        if (!changes.length) continue;
        const t = e.target;
        window.__ra.push({
          type: a.constructor.name,
          name: a.animationName || a.transitionProperty || a.id || '',
          target: t ? t.tagName.toLowerCase() + (t.classList && t.classList.length ? '.' + [...t.classList].slice(0, 3).join('.') : '') : '',
          pseudo: e.pseudoElement || '',
          duration: Math.round(tm.duration),
          iterations: tm.iterations === Infinity ? 'infinite' : tm.iterations,
          changes,
          moves: changes.filter((p) => MOVES.test(p)),
        });
      }
    };
    window.__raScan = scan;
    const loop = () => {
      scan();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  async function polishChecks(browser, url, out, opts = {}) {
    const pageErrors = [];
    const ran = [];
    const only = opts.only || [];
    const block = async (name, fn) => {
      if (only.length && !only.includes(name)) return;
      ran.push(name);
      try {
        await fn();
      } catch (e) {
        // WebKit has no CDP (Etappe 7, K112): a block that needs it is skipped and listed, never counted as green
        if (/CDP session is only available in Chromium/.test(String(e && e.message))) {
          ran.splice(ran.indexOf(name), 1);
          (out.skippedNoCdp = out.skippedNoCdp || []).push(name);
          return;
        }
        out[name + 'Error'] = String(e && e.message).split('\n')[0].slice(0, 300);
        out[name + 'Ok'] = false;
      }
    };
    const ev = (page, fn, a) => page.evaluate(fn, a);

    /** A real-time document of the demo. `extra`: mode, customization, storage, sentinel (the stand-in), prepare (a
     *  scene's), forced, locale, state, reduce, init ([function, argument] run before the app), clock (Playwright's clock
     *  in real time, so a check can hold the page's timers for a moment: `hold`). */
    const open = async (device, style, p, extra = {}) => {
      const ctx = await browser.newContext({
        ...DEVICES[device], locale: extra.locale || 'de-DE', timezoneId: 'Europe/Berlin', colorScheme: extra.mode || 'light',
        reducedMotion: extra.reduce ? 'reduce' : 'no-preference', forcedColors: extra.forced ? 'active' : 'none',
      });
      if (extra.clock) {
        await ctx.clock.install();
        await ctx.clock.resume();
      }
      await ctx.route((u) => !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(u.href), (r) => r.abort());
      if (extra.sentinel) await NVR.mockSentinel(ctx, extra.sentinel === true ? {} : extra.sentinel);
      if (extra.prepare) await extra.prepare(ctx); // a scene's own stand-in
      await ctx.addInitScript(seedScript({ demo: true, mode: extra.mode || 'light', style, strength: 'clear',
        customization: extra.customization, state: extra.state, storage: extra.storage }));
      if (extra.init) await ctx.addInitScript(extra.init[0], extra.init[1]);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push('exc: ' + String(e.stack || e.message).slice(0, 600)));
      page.on('console', (m) => {
        if (m.type() !== 'error' || ABORTED.test(m.text())) return;
        // the Sentinel stand-in refuses some requests on purpose (glas-checks-nvr.cjs)
        if (((m.location() && m.location().url) || '').startsWith(NVR.BASE.replace(/\/endpoint.*$/, '/'))) return;
        errors.push('console: ' + m.text().slice(0, 200));
      });
      await page.goto(url + p, { waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelector('#root > *') && window.__hapulseDemo, null, { timeout: 15000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      await sleep(600);
      await settleAnimations(page);
      const close = async () => {
        if (errors.length) pageErrors.push({ device, style, path: p, errors: errors.slice(0, 3) });
        await ctx.close();
      };
      return { ctx, page, close };
    };
    const nvrOpts = (p) => (p.startsWith('/nvr') ? { sentinel: true, customization: NVR.NVR } : {});
    /** A scene's step: its click, then its act; a note when it cannot be done. */
    const step = async (page, sc) => {
      if (sc.click) {
        const el = page.locator(sc.click).filter({ visible: true }).first();
        if (!(await el.count())) return 'not visible: ' + sc.click;
        await el.click();
        await sleep(300);
        await settleAnimations(page);
      }
      return sc.act ? (await sc.act(page)) || '' : '';
    };
    /** Opens a scene in Glas, does its step and hands the document to `fn`; records a skipped scene. */
    const inScene = async (device, name, extra, into, fn) => {
      const sc = sceneOf(name);
      const o = await open(device, 'glas', sc.path || '/', { customization: sc.customization, prepare: sc.prepare, ...extra });
      try {
        const note = await step(o.page, sc);
        if (note) {
          into[`${device} ${name}`] = { skipped: note };
          return;
        }
        await sleep(400);
        await settleAnimations(o.page);
        into[`${device} ${name}`] = await fn(o);
      } finally {
        await o.close();
      }
    };

    // ---- K108: on a touch screen no hover tint stays after a tap — every page, window, menu and edit mode in Glas on
    //      the phone and the iPad (both report `(hover: none)`); in forced colours the tiles and buttons of the windows
    //      keep an edge. The selectors of `:hover` rules no view met are listed (coverage) ----
    await block('polishHover', async () => {
      const res = { media: {}, pages: {}, views: {}, edges: {}, unparsed: 0, findings: [], allowed: [], edgeless: [] };
      const seen = new Set();
      const matched = new Set();
      const audit = async (page, ctx, where) => {
        const cdp = await ctx.newCDPSession(page);
        await settleAnimations(page);
        const collected = await ev(page, collect, PROPS);
        res.unparsed += collected.unparsed;
        for (const sel of collected.seen) seen.add(sel);
        for (const sel of collected.matched) matched.add(sel);
        const diffs = await hoverDiffs(page, cdp, collected);
        await cdp.detach();
        for (const d of diffs) {
          const ok = ALLOWED.find((a) => a.kind.test(d.kind) && Object.keys(d.changed).every((p) => a.props.includes(p)));
          if (ok) res.allowed.push({ where, kind: d.kind, why: ok.why });
          else res.findings.push({ where, ...d });
        }
        return { checked: collected.items.length, findings: diffs.length };
      };
      for (const device of ['phone', 'ipad']) {
        for (const p of ROUTES) {
          const o = await open(device, 'glas', p, nvrOpts(p));
          try {
            if (!(device in res.media)) res.media[device] = await ev(o.page, () => matchMedia('(hover: none)').matches);
            if (p === '/nvr/1') await o.page.waitForFunction(() => window.__snvr && window.__snvr.state(), null, { timeout: 15000 });
            res.pages[`${device} ${p}`] = await audit(o.page, o.ctx, `${device} ${p}`);
          } finally {
            await o.close();
          }
        }
        for (const name of [...WINDOWS, ...VIEWS]) {
          await inScene(device, name, {}, res.views, (o) => audit(o.page, o.ctx, `${device} ${name}`));
        }
        for (const name of WINDOWS) {
          await inScene(device, name, { forced: true }, res.edges, async (o) => {
            const r = await ev(o.page, edgeless);
            for (const m of r.missing) res.edgeless.push({ where: `${device} ${name}`, ...m });
            return { checked: r.checked, missing: r.missing.length, ...(r.noWindow ? { noWindow: true } : {}) };
          });
        }
      }
      const unmatched = [...seen].filter((sel) => !matched.has(sel)).sort();
      res.coverage = { seen: seen.size, unmatched: unmatched.length,
        upstream: unmatched.filter((sel) => !sel.startsWith(':root[data-style="glas"]')),
        glas: unmatched.filter((sel) => sel.startsWith(':root[data-style="glas"]')) };
      out.polishHover = res;
      out.polishHoverOk = Object.values(res.media).every(Boolean) && res.findings.length === 0 && res.edgeless.length === 0
        && Object.values(res.pages).every((r) => r.checked > 0)
        && Object.values(res.edges).filter((r) => r.checked > 0).length >= WINDOWS.length;
    });

    // ---- K109: contrast on the screen, light — every visible text ≥ 4.5:1 (large ≥ 3:1), a symbol on its own, the icons
    //      of controls without text and the focus rings ≥ 3:1; on the iPad (required, GLAS-PLAN §5.4) and the phone:
    //      every page scrolled through, every window and the menus, edit modes and camera views of the hover sweep. The
    //      page's timers are held while it is measured. Text over the moving camera picture is unstable here: the NVR
    //      part measures it on white, black and infrared pictures (nvrImmersive) ----
    await block('polishContrast', async () => {
      const res = { views: {}, findings: [], unstable: [], noGlyphs: [], rings: {}, ringFindings: [], skip: {}, skipKinds: {} };
      /** A picture of the viewport (or a clip), one pixel per CSS pixel, CSS animations stopped for it (Playwright). */
      const shot = (page, clip) => page.screenshot({ scale: 'css', animations: 'disabled', caret: 'hide', ...(clip ? { clip } : {}) });
      const hide = (page, g) => ev(page, (k) => {
        for (const e of document.querySelectorAll('[data-c-h]')) e.removeAttribute('data-c-h');
        if (k) for (const e of document.querySelectorAll(`[data-c-g="${k}"]`)) e.setAttribute('data-c-h', '');
      }, g);
      /** Holds the page's timers (the demo's updates, clocks, progress) while it is measured; `page.clock.resume()` after.
       *  The page's clock runs in real time until then: on a busy machine it can pass the target between reading it and
       *  pausing ("Cannot fast-forward to the past"), so the target moves further ahead and is tried again. */
      const hold = async (page) => {
        for (let ahead = 20; ; ahead *= 5) {
          try {
            return await page.clock.pauseAt((await ev(page, () => Date.now())) + ahead);
          } catch (e) {
            if (!/fast-forward to the past/.test(String(e && e.message)) || ahead >= 2500) throw e;
          }
        }
      };
      const worst = new Map();
      const finding = (where, t, r) => {
        const key = `${t.el}|${t.text}|${t.need}`;
        const f = worst.get(key);
        if (!f) worst.set(key, { kind: t.kind, el: t.el, text: t.text, need: t.need, ratio: r.ratio, fg: t.fg, bg: r.bg,
          glass: t.glass, ...(t.aria ? { ariaHidden: true } : {}), ...(r.state ? { state: r.state } : {}), where: [where],
          ...(t.dbg ? { dbg: t.dbg } : {}) });
        else {
          if (f.where.length < 4) f.where.push(where);
          if (r.ratio < f.ratio) Object.assign(f, { ratio: r.ratio, bg: r.bg, fg: t.fg });
        }
      };
      /** Measures what the viewport shows now; what was unstable gets one more try. Returns the measured counts. */
      const measureHere = async (page, where) => {
        const tally = {};
        for (let attempt = 0; attempt < 2; attempt++) {
          let again = false;
          await hold(page);
          try {
            const meta = await ev(page, contrastTargets);
            for (const [k, v] of Object.entries(meta.skip)) res.skip[k] = (res.skip[k] || 0) + v;
            for (const [k, v] of Object.entries(meta.skipKinds)) {
              const l = (res.skipKinds[k] = res.skipKinds[k] || []);
              for (const x of v) if (!l.includes(x) && l.length < 30) l.push(x);
            }
            if (!meta.count) return tally;
            const targets = await ev(page, () => window.__cT.map(({ kind, el, text, need, glass, aria, fg, rects }) => ({ kind, el, text, need, glass, aria, fg, rects })));
            const a = await shot(page);
            await hide(page, '1');
            const b1 = await shot(page);
            await hide(page, '2');
            const b2 = await shot(page);
            await hide(page, null);
            const a2 = await shot(page);
            const results = await ev(page, contrastMeasure, [a, b1, b2, a2].map((b) => b.toString('base64')));
            for (const r of results) {
              const t = targets[r.k];
              if (r.state === 'unstable') {
                if (attempt) res.unstable.push({ where, el: t.el, text: t.text });
                else again = true;
                continue;
              }
              tally[t.kind] = (tally[t.kind] || 0) + 1;
              if (r.ratio < t.need) finding(where, t, r);
              else if (r.state === 'noGlyphs' && res.noGlyphs.length < 40) res.noGlyphs.push({ where, el: t.el, text: t.text, ratio: r.ratio });
            }
          } finally {
            await page.clock.resume();
          }
          if (!again) break;
          await sleep(300);
        }
        return tally;
      };
      /** Scrolls the page through (60 % of the viewport per step, at most 12 steps) and measures at each position. */
      const scrollThrough = async (page, where) => {
        const total = {};
        let positions = 0;
        for (let k = 0; k < 12; k++) {
          positions++;
          const t = await measureHere(page, where);
          for (const [kind, n] of Object.entries(t)) total[kind] = (total[kind] || 0) + n;
          const next = await ev(page, () => {
            const max = document.scrollingElement.scrollHeight - innerHeight;
            const y = Math.min(max, scrollY + Math.round(innerHeight * 0.6));
            if (y <= scrollY + 1) return false;
            window.scrollTo({ top: y, behavior: 'instant' });
            return true;
          });
          if (!next) break;
          await sleep(350);
          await settleAnimations(page);
        }
        return { positions, ...total };
      };
      /** The focus rings of up to 12 controls in the viewport (two of a kind): Tab once for the keyboard's focus, then
       *  each control as the keyboard reaches it — brought into view where it is not (ringReveal) — focused by script
       *  against a picture of the same place without focus. The picture covers the control and the box its ring is
       *  drawn on (ringFocus). */
      const ringsHere = async (page, where) => {
        await page.keyboard.press('Tab');
        await ev(page, () => document.activeElement && document.activeElement.blur && document.activeElement.blur());
        await sleep(150);
        const targets = await ev(page, focusTargets, 12);
        if (!targets.length) return { checked: 0 };
        let checked = 0;
        /** the picture without focus, kept in the page for ringMeasure */
        const unfocused = async () => {
          const u = await shot(page);
          await ev(page, async (b64) => {
            const img = new Image();
            img.src = 'data:image/png;base64,' + b64;
            await img.decode();
            const cv = document.createElement('canvas');
            cv.width = img.naturalWidth;
            cv.height = img.naturalHeight;
            const c = cv.getContext('2d', { willReadFrequently: true });
            c.drawImage(img, 0, 0);
            window.__cU = { w: cv.width, h: cv.height, d: c.getImageData(0, 0, cv.width, cv.height).data };
          }, u.toString('base64'));
        };
        await hold(page);
        try {
          await unfocused();
          const vp = page.viewportSize();
          for (const t of targets) {
            const moved = await ev(page, ringReveal, t.i);
            if (moved === null) continue;
            if (moved) {
              await sleep(100);
              await unfocused();
            }
            const box = await ev(page, ringFocus, t.i);
            let r = null;
            if (box) {
              const x = Math.max(0, Math.floor(box.l) - 8);
              const y = Math.max(0, Math.floor(box.t) - 8);
              const clip = { x, y, width: Math.min(vp.width, Math.ceil(box.r) + 8) - x, height: Math.min(vp.height, Math.ceil(box.b) + 8) - y };
              const f = await shot(page, clip);
              r = await ev(page, ringMeasure, [t.i, f.toString('base64'), clip]);
              await ev(page, () => document.activeElement && document.activeElement.blur && document.activeElement.blur());
            }
            if (moved) {
              await ev(page, ringRestore);
              await sleep(100);
              await unfocused();
            }
            if (!r) continue;
            checked++;
            const bad = !r.fv ? 'not focus-visible' : !r.n ? 'no ring' : r.share < 0.9 ? 'below 3:1' : null;
            if (bad) res.ringFindings.push({ where, kind: t.kind, label: t.label, why: bad, ...r });
          }
        } finally {
          await page.clock.resume();
          await ev(page, () => {
            delete window.__cU;
            for (const e of document.querySelectorAll('[data-c-f]')) e.removeAttribute('data-c-f');
          });
        }
        return { checked };
      };
      for (const device of ['ipad', 'phone']) {
        for (const p of ROUTES) {
          const where = `${device} ${p}`;
          const o = await open(device, 'glas', p, { ...nvrOpts(p), clock: true });
          try {
            if (p === '/nvr/1') await o.page.waitForFunction(() => window.__snvr && window.__snvr.state(), null, { timeout: 15000 });
            await settleAnimations(o.page);
            res.rings[where] = await ringsHere(o.page, where);
            res.views[where] = await scrollThrough(o.page, where);
          } finally {
            await o.close();
          }
        }
        for (const name of [...WINDOWS, ...VIEWS]) {
          await inScene(device, name, { clock: true }, res.views, async (o) => {
            const r = await measureHere(o.page, `${device} ${name}`);
            if (WINDOWS.includes(name)) res.rings[`${device} ${name}`] = await ringsHere(o.page, `${device} ${name}`);
            return r;
          });
        }
      }
      res.findings = [...worst.values()].sort((a, b) => a.ratio - b.ratio);
      out.polishContrast = res;
      const measured = (r) => !r.skipped && Object.keys(r).some((k) => k !== 'positions' && r[k] > 0);
      out.polishContrastOk = res.findings.length === 0 && res.ringFindings.length === 0
        && ROUTES.every((p) => ['ipad', 'phone'].every((d) => measured(res.views[`${d} ${p}`] || {})));
    });

    // ---- K110: performance (GLAS-PLAN §5.5, E17) — the phone with 4× CPU slowdown (it slows the main thread only, not
    //      the compositor and the blur), Glas against Klassisch under the same emulation: the overview scrolled for 3 s
    //      by a wheel gesture, p95 of the frame times (median of three runs each, the styles taking turns) Glas ≤ 1.25 ×
    //      Klassisch. A miss goes to Jannick with the numbers; changes wait for the device (E17). Without a GPU (WebGL
    //      renderer SwiftShader/llvmpipe) the blur is drawn in software: the numbers are reported, the budget is the
    //      device's (main's Glas measured 2.99 there as well). Opening a window: sheetsPerf ----
    await block('polishPerf', async () => {
      const res = { runs: { classic: [], glas: [] }, p95: {}, budget: 1.25 };
      const within = (pr, ms, what) => Promise.race([pr, sleep(ms).then(() => {
        throw new Error(what + ' did not end');
      })]);
      for (let i = 0; i < 3; i++) {
        for (const style of ['classic', 'glas']) {
          const o = await open('phone', style, '/');
          try {
            const cdp = await o.ctx.newCDPSession(o.page);
            await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
            await sleep(500);
            const start = await ev(o.page, () => {
              const f = (window.__fr = []);
              const tick = (t) => {
                f.push(t);
                requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
              return performance.now();
            });
            // a wheel gesture: the synthetic touch gesture leaves the page where it is in headless Chromium (scrollY 0,
            // main's build alike); the frames of the compositor's scroll are the same
            await within(cdp.send('Input.synthesizeScrollGesture',
              { x: 195, y: 640, yDistance: -1800, speed: 600, gestureSourceType: 'mouse' }), 30000, 'the scroll gesture');
            res.runs[style].push(await ev(o.page, (t0) => {
              const f = window.__fr.filter((t) => t >= t0);
              const d = [];
              for (let k = 1; k < f.length; k++) d.push(f[k] - f[k - 1]);
              d.sort((a, b) => a - b);
              const q = (p) => (d.length ? +d[Math.min(d.length - 1, Math.floor(p * d.length))].toFixed(1) : 0);
              return { frames: f.length, ms: Math.round(f[f.length - 1] - f[0]), p50: q(0.5), p95: q(0.95), max: q(1),
                dropped: d.reduce((s, x) => s + Math.max(0, Math.round(x / 16.7) - 1), 0), scrolled: Math.round(scrollY) };
            }, start));
            await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
            await cdp.detach();
          } finally {
            await o.close();
          }
        }
      }
      const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
      for (const style of ['classic', 'glas']) res.p95[style] = median(res.runs[style].map((r) => r.p95));
      res.ratio = +(res.p95.glas / res.p95.classic).toFixed(2);
      out.polishPerf = res;
      const probe = await open('phone', 'classic', '/');
      try {
        res.renderer = await ev(probe.page, () => {
          const gl = document.createElement('canvas').getContext('webgl');
          const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
          return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
        });
      } finally {
        await probe.close();
      }
      res.software = !res.renderer || /swiftshader|llvmpipe|software/i.test(res.renderer);
      out.polishPerfOk = ['classic', 'glas'].every((s) => res.runs[s].every((r) => r.scrolled > 300))
        && (res.software || res.ratio <= res.budget);
    });

    // ---- GLAS-DESIGN §6.4, GLAS-PLAN Etappe 7: reduced motion once for everything — every route (opened and scrolled),
    //      a window (opened and closed), the menus and the context menu on the phone and a tab change; the routes, the
    //      window and the notifications also on the iPad. No animation moves or resizes anything, nothing repeats, a
    //      fade lasts at most 200 ms ----
    await block('polishReduced', async () => {
      const res = { views: {}, findings: [] };
      const rec = [recordAnimations, null];
      const keys = new Set();
      /** The animations since the last look; the ones against §6.4 become findings (once per place and element). */
      const look = async (page, where) => {
        const list = await ev(page, () => {
          window.__raScan();
          return window.__ra.splice(0);
        });
        for (const a of list) {
          const why = [];
          if (a.moves.length) why.push('moves ' + a.moves.join(' '));
          if (a.duration > 200) why.push(a.duration + ' ms');
          if (a.iterations !== 1) why.push('repeats ' + a.iterations);
          const key = `${where}|${a.target}${a.pseudo}|${a.name}`;
          if (!why.length || keys.has(key)) continue;
          keys.add(key);
          res.findings.push({ where, target: a.target + a.pseudo, name: a.name, type: a.type, why: why.join(', '), changes: a.changes });
        }
        return list.length;
      };
      for (const device of ['phone', 'ipad']) {
        for (const p of ROUTES) {
          const where = `${device} ${p}`;
          const o = await open(device, 'glas', p, { ...nvrOpts(p), reduce: true, init: rec });
          try {
            if (p === '/nvr/1') await o.page.waitForFunction(() => window.__snvr && window.__snvr.state(), null, { timeout: 15000 });
            let n = await look(o.page, where);
            for (const y of [600, 0]) {
              await ev(o.page, (top) => window.scrollTo(0, top), y);
              await sleep(500);
            }
            n += await look(o.page, where);
            res.views[where] = { animations: n };
          } finally {
            await o.close();
          }
        }
        const names = device === 'phone' ? ['win-lights', 'avatar', 'notifications', 'more', 'rooms', 'ctx-card'] : ['win-lights', 'notifications'];
        for (const name of names) {
          await inScene(device, name, { reduce: true, init: rec }, res.views, async (o) => {
            const where = `${device} ${name}`;
            const n = await look(o.page, where);
            await o.page.keyboard.press('Escape');
            await sleep(600);
            return { animations: n + (await look(o.page, where + ' (closed)')) };
          });
        }
      }
      {
        const o = await open('phone', 'glas', '/', { reduce: true, init: rec });
        try {
          await look(o.page, 'phone /');
          await o.page.locator('.app-tabs a.app-tabs__item').filter({ hasText: DE['nav.pool'] }).tap();
          await sleep(900);
          res.views['phone tab change'] = { animations: await look(o.page, 'phone tab change') };
        } finally {
          await o.close();
        }
      }
      out.polishReduced = res;
      out.polishReducedOk = res.findings.length === 0 && ROUTES.every((p) => res.views[`phone ${p}`] && res.views[`ipad ${p}`])
        && !Object.values(res.views).some((v) => v.skipped);
    });

    // ---- K111: the style row says "Glas" without "Vorschau" in all seven languages; non-admins see it read-only (with
    //      "Den Stil legt ein Administrator fest." without the admin management, with its hints under it); admins can
    //      change it ----
    await block('polishPreview', async () => {
      const res = { labels: {}, access: {} };
      for (const lang of ['de', 'en', 'es', 'fr', 'it', 'pt', 'sv']) {
        const T = textsOf(lang);
        const o = await open('desktop', 'glas', '/settings', { state: { language: lang } });
        try {
          res.labels[lang] = await ev(o.page, () => {
            const opt = document.querySelector('[data-glas-style-option="glas"]');
            return opt ? opt.textContent.trim() : null;
          });
          if (res.labels[lang] !== T['glas.style.glas']) res.labels[lang] += ' (expected ' + T['glas.style.glas'] + ')';
        } finally {
          await o.close();
        }
      }
      const MANAGED = { 'hapulse:global-meta': { state: { meta: { managed: true, rev: 1, activatedAt: '2026-10-02T18:00:00Z',
        activatedBy: { id: 'user_bob', name: 'Bob' }, updatedAt: '2026-10-09T07:30:00Z', updatedBy: { id: 'user_bob', name: 'Bob' },
        shareSecrets: false } }, version: 0 } };
      for (const [key, admin, storage] of [['admin', true, undefined], ['user', false, undefined], ['userManaged', false, MANAGED]]) {
        for (const style of ['classic', 'glas']) {
          const o = await open('desktop', style, '/settings', { storage });
          try {
            if (!admin) await ev(o.page, () => window.__hapulseDemo.admin(false));
            await sleep(200);
            res.access[`${key} ${style}`] = await ev(o.page, () => {
              const row = document.querySelector('[data-glas-style-option]').closest('.settings-card__row');
              const fieldset = row.closest('fieldset');
              const opts = [...row.querySelectorAll('[data-glas-style-option]')];
              return { shown: !!row, disabled: !!fieldset && fieldset.disabled, optionsDisabled: opts.every((b) => b.matches(':disabled')),
                hint: row.querySelector('.managed-row-hint')?.textContent || '' };
            });
          } finally {
            await o.close();
          }
        }
      }
      out.polishPreview = res;
      const a = res.access;
      out.polishPreviewOk = Object.entries(res.labels).every(([lang, l]) => l === textsOf(lang)['glas.style.glas'] && !/\(/.test(l))
        && ['classic', 'glas'].every((s) => a[`admin ${s}`].shown && !a[`admin ${s}`].disabled
          && !a[`admin ${s}`].hint.includes(DE['glas.style.adminOnly'])
          && a[`user ${s}`].disabled && a[`user ${s}`].optionsDisabled && a[`user ${s}`].hint.includes(DE['glas.style.adminOnly'])
          && a[`userManaged ${s}`].disabled && a[`userManaged ${s}`].hint.includes(DE['globalSettings.mode.hintGlobal'])
          && !a[`userManaged ${s}`].hint.includes(DE['glas.style.adminOnly']));
    });

    // ---- K107: page changes as view transitions — tabs, sidebar, More menu, camera tiles and the camera page's back in
    //      Glas (back: to where the camera was opened, the picture shrinking into its tile); everything else, Klassisch,
    //      reduced motion and a browser without the API as specified ----
    await block('polishTransitions', async () => {
      const res = {};
      const bad = [];
      const want = (ok, msg) => {
        if (!ok) bad.push(msg);
      };
      const rec = [recordTransitions, false];
      const count = (page) => ev(page, () => window.__vt.length);
      const settled = async (page, n) => {
        await page.waitForFunction((k) => window.__vt.length >= k && window.__vt[k - 1].finished != null, n, { timeout: 8000 });
        await sleep(150);
        return summary(await ev(page, (k) => window.__vt[k - 1], n));
      };
      /** Waits a moment and returns how many transitions ran meanwhile. */
      const quiet = async (page, before) => {
        await sleep(900);
        return (await count(page)) - before;
      };
      const tabLink = (page, key) => page.locator('.app-tabs a.app-tabs__item').filter({ hasText: DE[key] });
      const sideLink = (page, key) => page.locator('.app-sidebar a.sidebar-nav__item').filter({ hasText: DE[key] });
      const tileReady = (page, sel) => page.waitForFunction((s) => {
        const img = document.querySelector(s);
        return img && img.complete && img.naturalWidth > 0;
      }, sel, { timeout: 15000 });
      /** A page change: the new page at `ready`, no names, nothing left behind; `link`: the pressed link stays on screen
       *  (tab bar, sidebar), so it keeps the focus. */
      const pageOk = (s, path, msg, link = false) => {
        want(s && !s.error && s.path === path && !!s.h1, `${msg}: new page at ready ${JSON.stringify(s && [s.path, s.h1, s.error])}`);
        if (!s) return;
        want(s.named0.length === 0 && s.named.length === 0, `${msg}: names ${JSON.stringify([s.named0, s.named])}`);
        want(s.cam.length === 0, `${msg}: camera morph on a page change`);
        want(!link || s.focusSame, `${msg}: focus moved`);
        want(s.after.named === 0 && s.after.attr === null, `${msg}: left behind ${JSON.stringify(s.after)}`);
      };
      /** The root fades (old out, new in; each with its blend animation) for `ms`. */
      const fades = (s, ms) => s.root.length >= 2 && s.root.every((d) => d === ms);
      /** The camera page shows a picture (the live stand-in or its still): back has something to shrink. */
      const stageReady = (page) => page.waitForFunction(() => [...document.querySelectorAll('.nvr-stage > .nvr-stage__video')]
        .some((e) => !e.classList.contains('hidden') && (e.tagName !== 'IMG' || (e.complete && e.naturalWidth > 0))
          && (e.tagName !== 'VIDEO' || e.videoWidth > 0)), null, { timeout: 15000 });
      const backButton = (page) => page.locator(`.nvr-iconbtn[aria-label="${DE['nvr.back']}"]`);
      /** The landing tile's marks are back and the tile lets go of its mark (motion.css, glasNavigate `landed`). */
      const landingGone = async (page) => {
        await sleep(300);
        return ev(page, () => document.querySelectorAll('[data-g-landing]').length === 0);
      };
      /**
       * Back from a camera page (K107 addendum): to `path` at the scroll position `y0`, the page as it was (nothing in it
       * rises or grows, the tab bar expanded), the stage's picture named first and, with `pic`, landing in that box of
       * camera `camId`'s tile on screen — where it was when the camera opened (`box0`) — 480 ms, the corners to the
       * tile's, its marks waiting, then fading in; without `pic` it closes where it is (270 ms, the corners as they were).
       */
      const backOk = (s, msg, { path, y0, camId, pic, box0 }) => {
        want(s && !s.error && s.path === path, `${msg}: new page at ready ${JSON.stringify(s && [s.path, s.error])}`);
        if (!s) return;
        want(s.kind === 'back' && fades(s, 160), `${msg}: kind and fade ${JSON.stringify([s.kind, s.root])}`);
        want(s.named0.length === 1 && /^nvr-stage__video/.test(s.named0[0]), `${msg}: the stage's picture named ${JSON.stringify(s.named0)}`);
        want(!s.entry && s.rise === 0 && s.entryAnims === 0 && s.pageMoves.length === 0,
          `${msg}: the page as it was ${JSON.stringify([s.entry, s.rise, s.entryAnims, s.pageMoves])}`);
        want(Math.abs(s.y - y0) <= 1 && Math.abs(s.after.y - y0) <= 1, `${msg}: scroll ${JSON.stringify([y0, s.y, s.after.y])}`);
        want(!s.tabsMin && !s.after.tabsMin, `${msg}: tab bar minimised ${JSON.stringify([s.tabsMin, s.after.tabsMin])}`);
        want(s.after.named === 0 && s.after.attr === null, `${msg}: left behind ${JSON.stringify(s.after)}`);
        if (pic) {
          const r = s.landRect[0];
          want(s.named.length === 1 && s.named[0] === pic && s.landing.join() === `${camId}:` && s.landingHidden,
            `${msg}: lands in the tile ${JSON.stringify([s.named, s.landing, s.landingHidden])}`);
          want(!!r && r.l >= 0 && r.r <= r.vw && r.t >= 0 && r.b <= r.vh, `${msg}: tile on screen ${JSON.stringify(r)}`);
          if (box0) {
            want(!!r && ['l', 'r', 't', 'b'].every((k) => Math.abs(r[k] - box0[k]) <= 1),
              `${msg}: the tile where it was ${JSON.stringify([box0, r])}`);
          }
          want(s.cam.join() === '480' && s.round.join() === '480' && s.close.length === 0,
            `${msg}: morph ${JSON.stringify([s.cam, s.round, s.close])}`);
          want(!!r && s.radii[1] === `${r.radius}px` && s.radii[0] !== '', `${msg}: corners ${JSON.stringify([s.radii, r && r.radius])}`);
          want(s.after.landing.join() === `${camId}:in` && s.after.landFades > 0,
            `${msg}: marks fade in ${JSON.stringify([s.after.landing, s.after.landFades])}`);
        } else {
          want(s.named.length === 0 && s.landing.length === 0 && s.after.landing.length === 0,
            `${msg}: no tile ${JSON.stringify([s.named, s.landing])}`);
          want(s.close.join() === '270' && s.round.length > 0 && s.round.every((d) => d === 0) && s.radii[0] === s.radii[1],
            `${msg}: closes in place ${JSON.stringify([s.close, s.round, s.radii])}`);
        }
      };

      // phone, Glas: tab, active tab, More menu, browser back
      {
        const o = await open('phone', 'glas', '/', { init: rec });
        try {
          await tabLink(o.page, 'nav.pool').tap();
          const tab = (res.tab = await settled(o.page, 1));
          pageOk(tab, '/pool', 'tab', true);
          if (tab) {
            want(tab.kind === 'page' && fades(tab, 160), `tab: fade ${JSON.stringify([tab.kind, tab.root])}`);
            want(tab.rise > 0 && tab.entryAnims === 0 && tab.entry, `tab: sections rise ${JSON.stringify([tab.rise, tab.entryAnims, tab.entry])}`);
            want(tab.lens, 'tab: the lens does not glide');
          }
          await tabLink(o.page, 'nav.pool').tap();
          res.activeTab = await quiet(o.page, 1);
          want(res.activeTab === 0, 'active tab started a transition');
          await o.page.locator(`.app-tabs__item[aria-label="${DE['nav.moreNavigation']}"]`).tap();
          await sleep(500);
          await o.page.locator('.app-more-menu a.app-more-menu__row').filter({ hasText: DE['nav.security'] }).tap();
          const more = (res.more = await settled(o.page, 2));
          pageOk(more, '/security', 'More menu');
          res.moreClosed = await ev(o.page, () => !document.querySelector('.app-more-menu--open'));
          want(res.moreClosed, 'More menu stays open');
          await o.page.goBack();
          res.back = { transitions: await quiet(o.page, 2), path: await ev(o.page, () => location.pathname) };
          want(res.back.transitions === 0 && res.back.path === '/pool', `browser back ${JSON.stringify(res.back)}`);
          await o.page.goForward();
          res.forward = await quiet(o.page, 2);
          want(res.forward === 0, 'browser forward started a transition');
        } finally {
          await o.close();
        }
      }

      // phone, Glas, Sentinel: an event on the Home card opens as before; the camera tile morphs, and back shrinks the
      // picture into its tile on Home, the page where it was (K107 addendum) — also for the second camera, whose tile
      // the row brings back into view; a camera opened from an event goes back to Home the same way; the browser's back to
      // that Home page later does not take the kept place again
      {
        const o = await open('phone', 'glas', '/', { init: rec, sentinel: true, customization: NVR.NVR });
        try {
          await tileReady(o.page, '.g-nvr__cam img');
          await o.page.locator('.g-nvr__ev').first().tap();
          res.event = { transitions: await quiet(o.page, 0), url: await ev(o.page, () => location.pathname + location.search) };
          want(res.event.transitions === 0 && /^\/nvr\/[^/]+\?at=/.test(res.event.url), `event ${JSON.stringify(res.event)}`);
          await o.page.goBack();
          await tileReady(o.page, '.g-nvr__cam[data-nvr-camera="1"] img');
          await sleep(300);
          // the card a little down the page: back must find it at that place
          await ev(o.page, () => document.querySelector('.g-nvr__cam[data-nvr-camera="1"]').scrollIntoView({ block: 'center', behavior: 'instant' }));
          await sleep(300);
          await o.page.locator('.g-nvr__cam[data-nvr-camera="1"]').tap();
          const cam = (res.camera = await settled(o.page, 1));
          want(cam && cam.y0 > 0, `camera: the Home page did not scroll (${cam && cam.y0})`);
          want(cam && !cam.error && /^\/nvr\/[^/]+$/.test(cam.path), `camera: page ${JSON.stringify(cam && [cam.path, cam.error])}`);
          if (cam) {
            want(cam.kind === 'camera' && cam.named0.join() === 'nvr-home__cam-pic', `camera: tile picture named ${JSON.stringify([cam.kind, cam.named0])}`);
            want(cam.named.length === 1 && /^nvr-stage__video\[\w+\]$/.test(cam.named[0]), `camera: still named ${JSON.stringify(cam.named)}`);
            want(cam.cam.join() === '540' && cam.round.join() === '540', `camera: morph ${JSON.stringify([cam.cam, cam.round])}`);
            want(fades(cam, 160) && cam.after.named === 0 && cam.after.attr === null && cam.y === 0,
              `camera: fade, left behind or scroll ${JSON.stringify([cam.root, cam.after, cam.y])}`);
          }
          await stageReady(o.page);
          await backButton(o.page).tap();
          backOk((res.cameraBack = await settled(o.page, 2)), 'camera back',
            { path: '/', y0: cam && cam.y0, camId: '1', pic: 'nvr-home__cam-pic', box0: cam && cam.box0[0] });
          res.cameraBackGone = await landingGone(o.page);
          want(res.cameraBackGone, 'camera back: the tile keeps its landing mark');

          // the second camera: its tile peeks in at the row's edge — back brings it into the row before it lands
          const row = '.g-nvr__cams';
          await ev(o.page, () => document.querySelector('.g-nvr__cam[data-nvr-camera="2"]').scrollIntoView({ block: 'center', inline: 'start', behavior: 'instant' }));
          await sleep(400);
          await o.page.locator('.g-nvr__cam[data-nvr-camera="2"]').tap();
          const cam2 = (res.secondCamera = await settled(o.page, 3));
          await stageReady(o.page);
          await backButton(o.page).tap();
          const second = (res.secondBack = await settled(o.page, 4));
          backOk(second, 'second camera back',
            { path: '/', y0: cam2 && cam2.y0, camId: '2', pic: 'nvr-home__cam-pic', box0: cam2 && cam2.box0[0] });
          res.secondRow = await ev(o.page, (sel) => Math.round(document.querySelector(sel).scrollLeft), row);
          want(res.secondRow > 0, `second camera back: the row did not bring the tile in (${res.secondRow})`);
          await landingGone(o.page);

          // a camera opened from an event: back goes to Home too, to the same place, and lands in that camera's tile
          // when it shows a picture there (the offline and stalled stand-ins show a thumbnail the card does not keep)
          await ev(o.page, () => document.querySelector('.g-nvr__ev').scrollIntoView({ block: 'center', inline: 'start', behavior: 'instant' }));
          await sleep(300);
          const yEv = await ev(o.page, () => Math.round(scrollY));
          await o.page.locator('.g-nvr__ev').first().tap();
          await o.page.waitForFunction(() => /^\/nvr\/[^/]+$/.test(location.pathname), null, { timeout: 8000 });
          const evCam = await ev(o.page, () => decodeURIComponent(location.pathname.split('/')[2]));
          await stageReady(o.page);
          await backButton(o.page).tap();
          const evBack = (res.eventBack = await settled(o.page, 5));
          want(evBack && evBack.path === '/', `event back: to Home ${JSON.stringify(evBack && [evBack.path, evCam])}`);
          if (evBack) {
            backOk(evBack, 'event back', { path: '/', y0: yEv, camId: evCam,
              pic: ['1', '2'].includes(evCam) ? 'nvr-home__cam-pic' : null });
          }
          await landingGone(o.page);

          // the browser's back to that Home page does not take the place kept for the camera page's back again
          // (keptScrollY, POP): left at the top, Home comes back at the top (the browser restores where it was left),
          // without a transition and with the tab bar as it was
          await ev(o.page, () => window.scrollTo({ top: 0, behavior: 'instant' }));
          await sleep(400);
          await tabLink(o.page, 'nav.pool').tap();
          pageOk((res.popPool = await settled(o.page, 6)), '/pool', 'pool tab after back', true);
          await o.page.goBack();
          await o.page.waitForFunction(() => location.pathname === '/', null, { timeout: 8000 });
          res.popBack = { yEv, transitions: await quiet(o.page, 6), ...(await ev(o.page, () => ({ y: Math.round(scrollY),
            tabsMin: document.documentElement.hasAttribute('data-tabs-min') }))) };
          want(yEv > 0 && res.popBack.y === 0 && res.popBack.transitions === 0 && !res.popBack.tabsMin,
            `browser back to Home ${JSON.stringify(res.popBack)}`);
        } finally {
          await o.close();
        }
      }

      // phone, Glas, Sentinel: a camera page reached by a link has no way in — back goes to the overview at the top and
      // the picture closes where it is (no tile shows a picture yet); an event there opens without a transition
      {
        const o = await open('phone', 'glas', '/nvr/1', { init: rec, sentinel: true, customization: NVR.NVR });
        try {
          await stageReady(o.page);
          await backButton(o.page).tap();
          backOk((res.linkBack = await settled(o.page, 1)), 'link back', { path: '/nvr', y0: 0, camId: '1', pic: null });
          await o.page.locator('.nvr-layout .g-nvr__ev').first().tap();
          res.stripEvent = await quiet(o.page, 1);
          want(res.stripEvent === 0, 'event of the overview strip started a transition');
        } finally {
          await o.close();
        }
      }

      // desktop, Glas, Sentinel: the overview tile (the NVR card's) morphs (stage radius) and back lands in it again, the page where it
      // was; sidebar fades, a modifier key and the browser keep their own way
      {
        const o = await open('desktop', 'glas', '/nvr', { init: rec, sentinel: true, customization: NVR.NVR });
        try {
          await tileReady(o.page, '.nvr-layout .g-nvr__cam[data-nvr-camera="1"] img.nvr-home__cam-img');
          // the tile is the page's first: the page scrolled to its end (the tile still wholly in sight) for back to keep
          await ev(o.page, () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
          await sleep(300);
          await o.page.locator('.nvr-layout .g-nvr__cam[data-nvr-camera="1"]').click();
          const cam = (res.desktopCamera = await settled(o.page, 1));
          want(cam && cam.y0 > 0, `desktop camera: the overview did not scroll (${cam && cam.y0})`);
          if (cam) {
            want(cam.kind === 'camera' && cam.named0.join() === 'nvr-home__cam-pic' && cam.named.length === 1, `desktop camera: names ${JSON.stringify([cam.named0, cam.named])}`);
            want(cam.cam.join() === '540' && cam.radii[1] === '18px', `desktop camera: morph ${JSON.stringify([cam.cam, cam.radii])}`);
          }
          await stageReady(o.page);
          await backButton(o.page).click();
          backOk((res.desktopBack = await settled(o.page, 2)), 'desktop back',
            { path: '/nvr', y0: cam && cam.y0, camId: '1', pic: 'nvr-home__cam-pic', box0: cam && cam.box0[0] });
          await landingGone(o.page);
          await sideLink(o.page, 'nav.energy').click();
          pageOk((res.sidebar = await settled(o.page, 3)), '/energy', 'sidebar', true);
          const popup = o.ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null);
          await sideLink(o.page, 'nav.scenes').click({ modifiers: ['Control'] });
          const opened = await popup;
          res.ctrlClick = { transitions: await quiet(o.page, 3), path: await ev(o.page, () => location.pathname), opened: !!opened };
          if (opened) await opened.close();
          want(res.ctrlClick.transitions === 0 && res.ctrlClick.path === '/energy' && res.ctrlClick.opened, `ctrl-click ${JSON.stringify(res.ctrlClick)}`);
        } finally {
          await o.close();
        }
      }

      // phone, Glas, reduced motion: a 200-ms fade, no rise, no morph — back too, to the same place
      {
        const o = await open('phone', 'glas', '/', { init: rec, reduce: true, sentinel: true, customization: NVR.NVR });
        try {
          await tabLink(o.page, 'nav.pool').tap();
          const tab = (res.reducedTab = await settled(o.page, 1));
          pageOk(tab, '/pool', 'reduced tab');
          if (tab) want(tab.kind === 'fade' && fades(tab, 200) && tab.rise === 0 && !tab.entry
            && tab.transforms.length === 0, `reduced tab ${JSON.stringify([tab.kind, tab.root, tab.rise, tab.entry, tab.transforms])}`);
          await o.page.goBack();
          await tileReady(o.page, '.g-nvr__cam img');
          await ev(o.page, () => document.querySelector('.g-nvr__cam').scrollIntoView({ block: 'center', behavior: 'instant' }));
          await sleep(300);
          const y0 = await ev(o.page, () => Math.round(scrollY));
          await o.page.locator('.g-nvr__cam').first().tap();
          const cam = (res.reducedCamera = await settled(o.page, 2));
          if (cam) want(cam.kind === 'fade' && cam.named0.length === 0 && cam.named.length === 0 && cam.cam.length === 0
            && fades(cam, 200) && cam.transforms.length === 0, `reduced camera ${JSON.stringify(cam)}`);
          await stageReady(o.page);
          await backButton(o.page).tap();
          const back = (res.reducedBack = await settled(o.page, 3));
          if (back) want(back.kind === 'fade' && back.path === '/' && back.named0.length === 0 && back.named.length === 0
            && back.cam.length === 0 && back.close.length === 0 && fades(back, 200) && back.rise === 0 && !back.entry
            && back.transforms.length === 0 && back.landing.length === 0 && back.y === y0 && back.after.y === y0,
          `reduced back ${JSON.stringify([back, y0])}`);
        } finally {
          await o.close();
        }
      }

      // phone, Glas, a browser without view transitions: back goes to Home all the same, to the same place
      {
        const o = await open('phone', 'glas', '/', { init: [recordTransitions, true], sentinel: true, customization: NVR.NVR });
        try {
          await tileReady(o.page, '.g-nvr__cam img');
          await ev(o.page, () => document.querySelector('.g-nvr__cam').scrollIntoView({ block: 'center', behavior: 'instant' }));
          await sleep(300);
          const top = () => ev(o.page, () => Math.round(document.querySelector('.g-nvr__cam').getBoundingClientRect().top));
          const y0 = await ev(o.page, () => Math.round(scrollY));
          const top0 = await top();
          await o.page.locator('.g-nvr__cam').first().tap();
          await o.page.waitForFunction(() => /^\/nvr\/[^/]+$/.test(location.pathname), null, { timeout: 8000 });
          await stageReady(o.page);
          await backButton(o.page).tap();
          await o.page.waitForFunction(() => location.pathname === '/', null, { timeout: 8000 });
          await sleep(600);
          res.noApiBack = { y0, top0, top: await top(), ...(await ev(o.page, () => ({ y: Math.round(scrollY),
            transitions: window.__vt.length, names: document.querySelectorAll('[style*="view-transition-name"]').length,
            landing: document.querySelectorAll('[data-g-landing]').length }))) };
          want(res.noApiBack.y === y0 && Math.abs(res.noApiBack.top - top0) <= 1 && res.noApiBack.transitions === 0
            && res.noApiBack.names === 0 && res.noApiBack.landing === 0, `no API back ${JSON.stringify(res.noApiBack)}`);
        } finally {
          await o.close();
        }
      }

      // phone, Glas, a browser without view transitions; phone and desktop Klassisch
      for (const [key, style, device, noApi] of [['noApi', 'glas', 'phone', true], ['classic', 'classic', 'phone', false]]) {
        const o = await open(device, style, '/', { init: [recordTransitions, noApi] });
        try {
          const h1 = await ev(o.page, () => (document.querySelector('main h1') || {}).textContent);
          await tabLink(o.page, 'nav.pool').tap();
          await sleep(900);
          res[key] = await ev(o.page, (before) => ({ path: location.pathname, newH1: (document.querySelector('main h1') || {}).textContent !== before,
            transitions: window.__vt.length, names: [...document.querySelectorAll('[style*="view-transition-name"]')].length }), h1);
          want(res[key].path === '/pool' && res[key].newH1 && res[key].transitions === 0 && res[key].names === 0, `${key} ${JSON.stringify(res[key])}`);
        } finally {
          await o.close();
        }
      }
      {
        const o = await open('desktop', 'classic', '/energy', { init: rec });
        try {
          const popup = o.ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null);
          await sideLink(o.page, 'nav.scenes').click({ modifiers: ['Control'] });
          const opened = await popup;
          await sideLink(o.page, 'nav.security').click();
          await sleep(900);
          res.classicDesktop = { opened: !!opened, path: await ev(o.page, () => location.pathname), transitions: await count(o.page) };
          if (opened) await opened.close();
          want(res.classicDesktop.opened && res.classicDesktop.path === '/security' && res.classicDesktop.transitions === 0,
            `Klassisch desktop ${JSON.stringify(res.classicDesktop)}`);
        } finally {
          await o.close();
        }
      }
      res.problems = bad;
      out.polishTransitions = res;
      out.polishTransitionsOk = bad.length === 0;
    });

    out.polishPageErrors = pageErrors;
    return ran.every((k) => out[k + 'Ok']) && pageErrors.length === 0;
  }

  return { polishChecks, collect, hoverDiffs, edgeless };
};
