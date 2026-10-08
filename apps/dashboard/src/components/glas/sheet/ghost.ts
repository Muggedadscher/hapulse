/**
 * [fork] Glas sheets (stage 3) — the closing animation (plan docs/glas/PLAN-ETAPPE-3.md K47, K49, K69, §3.4).
 *
 * React calls the cleanup of the backdrop's ref before it takes a window out of the document (react-dom 19.3:
 * `safelyDetachRef` before `removeChild`), so the window still hangs there, laid out. React calls the same cleanup when
 * the window stays (StrictMode, style switch, Suspense hiding). The ghost therefore clones, sits right in front of the
 * original (a window opened in the same commit lies above it) and decides in a microtask, still before the next frame:
 * original still there → the clone goes; otherwise it shows and animates out. This covers windows that get
 * `open=false` and windows that disappear with their parent alike, without changing a caller.
 *
 * Everything the ghost needs from the original is read before the clone goes in, and the clone waits with
 * `display: none` until it decides: otherwise a read in between, or Chromium restyling the page while React takes the
 * window out, styles and lays out the clone in the middle of the commit (29 ms for the entity list). A big window copies
 * only what its scroll areas show (plan §6.3, §13.1).
 */

import { batches, handoff, type HandoffNote } from './sheetHost';
import { DIALOG_FROM, morphFrom, originVisible, type Detent, type Presentation } from './sheetMath';
import { rectOf, type Origin, type OriginRect } from './origin';
import { allDone, DIALOG_OUT, EASE_IN, layoutRect, play, reducedMotion, REDUCED_MS, spring, translateScale } from './sheetMotion';

export interface GhostSource {
  id: number;
  /** The window this one is a page in. */
  parentId: number | null;
  pres: Presentation;
  detent: Detent | null;
  origin: Origin | null;
  trigger: HTMLElement | null;
  /** Closed by dragging: leaves from where the finger let go. */
  dragged: boolean;
}

interface Ghost {
  clone: HTMLElement;
  panel: HTMLElement;
  scrim: HTMLElement | null;
  src: GhostSource;
  batch: number;
  /** The original panel's box without its transform. */
  box: OriginRect;
  note: HandoffNote | null;
  /** Read while copying, like everything from the page: the decision reads nothing (a read there restyled the page in
   *  the click's task, plan §13.1). Only a scrolled copy is laid out there, together with the page: a scroll position
   *  needs the layout, which the next frame would do anyway. */
  view: { w: number; h: number };
  /** Where the window came from, if it showed then. */
  originRect: OriginRect | null;
  /** The shadow a page casts while it slides out. */
  pageShadow: string;
  /** Scroll positions of the copy, set once it shows (a box without layout forgets them; setting one lays it out). */
  scrolled: Copy['scrolled'];
  /** The clone's own inline display, back when it shows. */
  display: string;
  /** Decided and animating out. */
  shown: boolean;
}

/** Ghosts that have not finished; ghosts of the same commit find each other here (window and page leave together). */
const ghosts: Ghost[] = [];

/** Properties the runtime animates with Web Animations — a clone does not carry those, so they are written inline. */
const PANEL_FROZEN = ['transform', 'opacity', 'border-radius', 'clip-path', 'box-shadow', 'filter'] as const;
const PART_FROZEN = ['transform', 'opacity', 'filter'] as const;
/** Properties that place an image; a still copy keeps them. */
const STILL_PROPS = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'margin', 'border-radius', 'flex', 'align-self',
  'justify-self', 'grid-area', 'vertical-align', 'opacity', 'transform', 'filter', 'box-shadow', 'z-index',
] as const;
const PAGE_SHADOW_REACH = 40;
const FALLBACK_MS = 1200;
/** Windows with more elements than this copy only what their scroll areas show: the entity list's 2121 elements took
 *  38 ms at full speed and 177 ms at 4× CPU slowdown, most of it styling and laying out the copy (plan §13.1). */
const PARTIAL_FROM = 600;
/** Subtrees this small are copied whole while no scroll area decides about them. */
const SMALL_TREE = 40;
/** Kept around what a scroll area shows, as a share of its height. */
const BAND_EXTRA = 0.25;
/** Display types whose box keeps its size and place without its content (an inline box would lose its baseline). */
const BOXES = new Set(['block', 'flex', 'grid', 'flow-root', 'list-item']);
/** Elements whose copy would load its resource again: cloning a loaded <img> requests it at once (a `no-store`
 *  snapshot, a camera's MJPEG stream as a second stream), <video> and <audio> select their source, an <iframe> loads
 *  once it is in the document. Their copies are built without the attributes that load. */
const LOADS = 'img, source, video, audio, iframe';
const LOADING = new Set(['IMG', 'SOURCE', 'VIDEO', 'AUDIO', 'IFRAME']);
const LOAD_ATTRS = new Set(['src', 'srcset', 'sizes', 'srcdoc', 'poster']);

type Pair = readonly [from: Element, to: Element];

/** The clone and what it needs from the original, all read before the clone goes into the document. */
interface Copy {
  clone: HTMLElement;
  /** Images, canvases and videos with their copies: drawn as stills. */
  media: Pair[];
  /** Scroll positions, set once the clone shows. */
  scrolled: { to: Element; top: number; left: number }[];
}

/** What a scroll area shows, in viewport coordinates. */
interface Band {
  top: number;
  bottom: number;
}

/** Called from the backdrop's ref cleanup. Never throws: an error here would reach React's error boundary. */
export function spawnGhost(backdrop: HTMLElement, src: GhostSource): void {
  try {
    if (document.documentElement.dataset.style !== 'glas' || !backdrop.isConnected) return;
    const panel = backdrop.querySelector<HTMLElement>(':scope > .modal-panel');
    if (!panel) return;
    const box = layoutRect(panel);
    const seen = panel.getBoundingClientRect();
    const view = { w: window.innerWidth, h: window.innerHeight };
    const originRect = src.origin?.el.isConnected ? rectOf(src.origin.el) : null;
    const pageShadow =
      src.pres === 'page'
        ? getComputedStyle(document.documentElement).getPropertyValue('--g-shadow-pushed-screen').trim() || 'none'
        : 'none';
    const copy = copyWindow(backdrop, panel);
    const clone = copy.clone;
    const clonePanel = clone.querySelector<HTMLElement>(':scope > .modal-panel');
    if (!clonePanel) return;

    // Freeze the current state: box, running animations (transform, opacity …) of the panel, its parts and the scrim.
    freeze(panel, clonePanel, PANEL_FROZEN);
    Object.assign(clonePanel.style, {
      position: 'fixed',
      inset: 'auto',
      left: `${box.x}px`,
      top: `${box.y}px`,
      width: `${box.w}px`,
      height: `${box.h}px`,
      margin: '0',
      maxWidth: 'none',
      maxHeight: 'none',
      animation: 'none',
    });
    const parts = [...panel.children];
    const cloneParts = [...clonePanel.children];
    parts.forEach((part, i) => {
      const twin = cloneParts[i];
      if (part instanceof HTMLElement && twin instanceof HTMLElement) freeze(part, twin, PART_FROZEN);
    });
    const scrim = backdrop.querySelector<HTMLElement>(':scope > .g-sheet-scrim');
    const cloneScrim = clone.querySelector<HTMLElement>(':scope > .g-sheet-scrim');
    if (scrim && cloneScrim) cloneScrim.style.opacity = getComputedStyle(scrim).opacity;
    stills(copy.media);

    // A ghost is no window: no ids, roles, form names or focus, nothing to hit.
    for (const el of clone.querySelectorAll('[id]')) el.removeAttribute('id');
    for (const el of clone.querySelectorAll('[name]')) el.removeAttribute('name');
    for (const attr of ['role', 'aria-modal', 'aria-labelledby', 'tabindex']) clonePanel.removeAttribute(attr);
    clone.classList.add('g-sheet-ghost');
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.style.pointerEvents = 'none';
    clone.style.animation = 'none';
    const display = clone.style.display;
    clone.style.display = 'none';

    backdrop.before(clone);

    const ghost: Ghost = {
      clone,
      panel: clonePanel,
      scrim: cloneScrim,
      src,
      batch: batches.now(),
      box,
      note: null,
      view,
      originRect,
      pageShadow,
      scrolled: copy.scrolled,
      display,
      shown: false,
    };
    if (src.pres === 'sheet' || src.pres === 'dialog') {
      ghost.note = {
        rect: { x: seen.left, y: seen.top, w: seen.width, h: seen.height },
        pres: src.pres,
        detent: src.detent,
        origin: src.origin,
        trigger: src.trigger,
        taken: false,
      };
      handoff.put(ghost.note);
    }
    ghosts.push(ghost);
    queueMicrotask(() => decide(ghost, backdrop));
  } catch {
    // no ghost; the window just closes as in Klassisch
  }
}

function freeze(from: HTMLElement, to: HTMLElement, props: readonly string[]): void {
  const cs = getComputedStyle(from);
  for (const p of props) to.style.setProperty(p, cs.getPropertyValue(p));
}

/**
 * Copies the window. A small one is copied whole. A big one keeps only what the scroll areas of its panel show, plus a
 * quarter of their height around it: everything further out becomes an empty box of the same size (same tag and
 * classes), so what shows sits where it sat and the scroll positions still fit. The ghost only shrinks or slides
 * away, so nothing outside a scroll area's box ever comes into view.
 */
function copyWindow(backdrop: HTMLElement, panel: HTMLElement): Copy {
  const copy: Copy = { clone: backdrop, media: [], scrolled: [] };
  if (backdrop.getElementsByTagName('*').length <= PARTIAL_FROM) {
    copy.clone = whole(backdrop, copy);
    return copy;
  }
  // `scan`: inside the panel, where an element may be a scroll area (the backdrop and the panel never decide)
  const visit = (el: Element, band: Band | null, scan: boolean): Node => {
    if (!(el instanceof HTMLElement)) return deep(el);
    if (el instanceof HTMLDetailsElement && !el.open) return shut(el, copy);
    if (band) {
      const r = el.getBoundingClientRect();
      if (r.bottom < band.top || r.top > band.bottom) {
        const stand = standIn(el);
        if (stand) return stand;
      } else if (r.top >= band.top && r.bottom <= band.bottom) {
        return whole(el, copy);
      }
    }
    const inner = scan ? scrollBand(el, band) : band;
    if (!inner && el.getElementsByTagName('*').length <= SMALL_TREE) return whole(el, copy);
    const to = shallow(el) as HTMLElement;
    note(el, to, copy);
    const deeper = scan || el === panel;
    for (const child of el.childNodes) {
      to.appendChild(child instanceof Element ? visit(child, inner, deeper) : child.cloneNode(true));
    }
    return to;
  };
  copy.clone = visit(backdrop, null, false) as HTMLElement;
  return copy;
}

/** A closed <details>: its summary, and its other children empty — they are not rendered, in the ghost neither (the
 *  entity groups in the settings hold most of that window's elements). */
function shut(el: HTMLDetailsElement, copy: Copy): HTMLElement {
  const to = shallow(el) as HTMLElement;
  note(el, to, copy);
  for (const child of el.childNodes) {
    to.appendChild(
      child instanceof HTMLElement && child.tagName === 'SUMMARY' ? whole(child, copy)
      : child instanceof Element ? shallow(child)
      : child.cloneNode(false),
    );
  }
  return to;
}

/** A subtree copied whole. */
function whole(el: HTMLElement, copy: Copy): HTMLElement {
  const to = deep(el) as HTMLElement;
  noteTree(el, to, copy);
  return to;
}

/** `cloneNode(true)`, but copies of media load nothing (`LOADS`): native where the subtree holds none. */
function deep(el: Element): Element {
  if (!LOADING.has(el.tagName) && !el.querySelector(LOADS)) return el.cloneNode(true) as Element;
  const to = shallow(el);
  for (const child of el.childNodes) to.appendChild(child instanceof Element ? deep(child) : child.cloneNode(true));
  return to;
}

/** `cloneNode(false)`, but a copy of media is built without the attributes that load (`stills` draws what showed). */
function shallow(el: Element): Element {
  if (!LOADING.has(el.tagName)) return el.cloneNode(false) as Element;
  const to = document.createElement(el.localName);
  for (const { name, value } of el.attributes) if (!LOAD_ATTRS.has(name)) to.setAttribute(name, value);
  if (to instanceof HTMLMediaElement) to.preload = 'none';
  return to;
}

/**
 * Notes media and scroll positions of a subtree and its copy, child by child. Skips what is not rendered — the content
 * of a closed <details> (the entity groups in the settings): reading a scroll position there lays it out first, which
 * made up most of the 38 ms (plan §13.1).
 */
function noteTree(from: Element, to: Element, copy: Copy): void {
  note(from, to, copy);
  const closed = from instanceof HTMLDetailsElement && !from.open;
  const a = from.children;
  const b = to.children;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (!x || !y || (closed && x.tagName !== 'SUMMARY')) continue;
    noteTree(x, y, copy);
  }
}

function note(from: Element, to: Element, copy: Copy): void {
  if (from instanceof HTMLImageElement || from instanceof HTMLCanvasElement || from instanceof HTMLVideoElement) {
    copy.media.push([from, to]);
  }
  if (from.scrollTop || from.scrollLeft) copy.scrolled.push({ to, top: from.scrollTop, left: from.scrollLeft });
}

/** The band of `el` if it scrolls vertically, narrowed by the band it lies in; else the band it lies in. */
function scrollBand(el: HTMLElement, band: Band | null): Band | null {
  if (el.scrollHeight <= el.clientHeight + 1) return band;
  const overflow = getComputedStyle(el).overflowY;
  if (overflow === 'visible' || overflow === 'clip') return band;
  const r = el.getBoundingClientRect();
  const extra = r.height * BAND_EXTRA;
  const own = { top: r.top - extra, bottom: r.bottom + extra };
  return band ? { top: Math.max(band.top, own.top), bottom: Math.min(band.bottom, own.bottom) } : own;
}

/** An element outside every band as an empty box of its size, never painted; `null` where the box needs its content
 *  for its size or place (inline, `contents`, table parts, a margin of its content that passes through it) — that one
 *  is visited instead. */
function standIn(el: HTMLElement): HTMLElement | null {
  const cs = getComputedStyle(el);
  if (cs.display === 'none') return shallow(el) as HTMLElement;
  if (!BOXES.has(cs.display) || passesMargin(el, cs, 'Top') || passesMargin(el, cs, 'Bottom')) return null;
  const px = (v: string) => parseFloat(v) || 0;
  const content = cs.boxSizing !== 'border-box';
  const w = px(cs.width) + (content ? px(cs.paddingLeft) + px(cs.paddingRight) + px(cs.borderLeftWidth) + px(cs.borderRightWidth) : 0);
  const h = px(cs.height) + (content ? px(cs.paddingTop) + px(cs.paddingBottom) + px(cs.borderTopWidth) + px(cs.borderBottomWidth) : 0);
  const box = shallow(el) as HTMLElement;
  Object.assign(box.style, {
    boxSizing: 'border-box',
    width: `${w}px`,
    minWidth: `${w}px`,
    maxWidth: `${w}px`,
    height: `${h}px`,
    minHeight: `${h}px`,
    maxHeight: `${h}px`,
    padding: '0',
    borderWidth: '0',
    flex: '0 0 auto',
    overflow: 'hidden',
    visibility: 'hidden',
    contain: 'strict',
  });
  return box;
}

/**
 * Whether a margin of the content collapses through the top (bottom) of `el`, outside its box: an empty box of the
 * same size would then move what follows. A block that starts no formatting context of its own and has no padding or
 * border on that side passes on the margin of its first (last) child, and that child the one of its own. Cautious: a
 * child out of the flow counts as passing.
 */
function passesMargin(el: Element, cs: CSSStyleDeclaration, side: 'Top' | 'Bottom'): boolean {
  let style = cs;
  let box: Element = el;
  for (let depth = 0; depth < 8; depth++) {
    if (style.display !== 'block' && style.display !== 'list-item') return false;
    if (!['visible', 'clip'].includes(style.overflowY) || style.float !== 'none') return false;
    if (style.position === 'absolute' || style.position === 'fixed' || /layout|paint|strict|content/.test(style.contain)) return false;
    if (parseFloat(style[`padding${side}`]) || parseFloat(style[`border${side}Width`])) return false;
    const child = side === 'Top' ? box.firstElementChild : box.lastElementChild;
    if (!child) return false;
    const childStyle = getComputedStyle(child);
    if (parseFloat(childStyle[`margin${side}`])) return true;
    if (childStyle.display === 'none' || childStyle.display === 'contents' || childStyle.float !== 'none'
      || childStyle.position === 'absolute' || childStyle.position === 'fixed') return true;
    box = child;
    style = childStyle;
  }
  return true;
}

/** Loaded images, canvases and video frames as still copies (the copies of media load nothing, `shallow`; a cloned
 * canvas is blank). What is not loaded yet stays an empty box. The copies are drawn, never read. */
function stills(media: readonly Pair[]): void {
  for (const [from, to] of media) {
    const orig = from as HTMLElement;
    const copy = to as HTMLElement;
    try {
      if (
        (orig instanceof HTMLImageElement && !(orig.complete && orig.naturalWidth > 0))
        || (orig instanceof HTMLVideoElement && orig.readyState < 2)
      ) {
        copy.style.visibility = 'hidden';
        continue;
      }
      const w = orig.offsetWidth;
      const h = orig.offsetHeight;
      if (!w || !h) continue;
      const canvas = document.createElement('canvas');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.className = copy.getAttribute('class') ?? '';
      const cs = getComputedStyle(orig);
      for (const p of STILL_PROPS) canvas.style.setProperty(p, cs.getPropertyValue(p));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        copy.style.visibility = 'hidden';
        continue;
      }
      const source = orig as CanvasImageSource;
      const [sw, sh] =
        orig instanceof HTMLImageElement ? [orig.naturalWidth, orig.naturalHeight]
        : orig instanceof HTMLVideoElement ? [orig.videoWidth, orig.videoHeight]
        : [(orig as HTMLCanvasElement).width, (orig as HTMLCanvasElement).height];
      drawFitted(ctx, source, sw, sh, canvas.width, canvas.height, orig instanceof HTMLCanvasElement ? 'fill' : cs.objectFit);
      copy.replaceWith(canvas);
    } catch {
      copy.style.visibility = 'hidden';
    }
  }
}

function drawFitted(
  ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, dw: number, dh: number, fit: string,
): void {
  if (!sw || !sh) return;
  if (fit === 'cover' || fit === 'contain' || fit === 'scale-down') {
    const scale = fit === 'cover' ? Math.max(dw / sw, dh / sh) : Math.min(dw / sw, dh / sh, fit === 'scale-down' ? 1 : Infinity);
    const w = sw * scale;
    const h = sh * scale;
    ctx.drawImage(src, (dw - w) / 2, (dh - h) / 2, w, h);
    return;
  }
  ctx.drawImage(src, 0, 0, dw, dh);
}

function drop(g: Ghost): void {
  g.clone.remove();
  const i = ghosts.indexOf(g);
  if (i >= 0) ghosts.splice(i, 1);
}

function decide(g: Ghost, original: HTMLElement): void {
  try {
    if (original.isConnected) {
      drop(g); // the window stays
      return;
    }
    const same = ghosts.filter((o) => o !== g && o.batch === g.batch);
    const parentGone = g.src.parentId !== null && same.some((o) => o.src.id === g.src.parentId);
    const together = parentGone || same.some((o) => o.src.parentId === g.src.id);
    g.clone.style.display = g.display;
    g.shown = true;
    for (const { to, top, left } of g.scrolled) {
      to.scrollTop = top;
      to.scrollLeft = left;
    }
    const animations = leave(g, together);
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      drop(g);
    };
    void allDone(animations).then(end);
    window.setTimeout(end, FALLBACK_MS);
  } catch {
    drop(g);
  }
}

function leave(g: Ghost, together: boolean): (Animation | null)[] {
  const { panel, scrim, src, box } = g;
  const vw = g.view.w;
  const vh = g.view.h;
  const from = panel.style.transform || 'none';
  const opacity = Number(panel.style.opacity || 1);
  const parts = [...panel.children];
  const out: (Animation | null)[] = [];

  if (reducedMotion()) {
    // Panel and scrim fade on their own: opacity on the clone (their parent) would make it the backdrop root of the
    // panel's glass, which would then blur nothing.
    if (scrim) {
      out.push(play(scrim, [{ opacity: Number(scrim.style.opacity || 1) }, { opacity: 0 }], { duration: REDUCED_MS, easing: 'ease', fill: 'forwards' }));
    }
    out.push(play(panel, [{ opacity }, { opacity: 0 }], { duration: REDUCED_MS, easing: 'ease', fill: 'forwards' }));
    return out;
  }
  if (g.note?.taken) {
    // Hand-over (K49): the new window takes the place; the old one only fades.
    if (scrim) scrim.style.opacity = '0';
    out.push(play(panel, [{ opacity }, { opacity: 0 }], { duration: 140, easing: 'ease', fill: 'forwards' }));
    return out;
  }
  if (scrim) {
    out.push(play(scrim, [{ opacity: Number(scrim.style.opacity || 1) }, { opacity: 0 }], { duration: 320, easing: 'ease-in', fill: 'forwards' }));
  }

  const dialogLike = vw >= DIALOG_FROM;
  if (together) {
    // A window and its page in one commit (route change): both leave the same way, at the same time (K48).
    out.push(
      dialogLike
        ? play(panel, [{ opacity }, { opacity: 0 }], { duration: 440, easing: 'ease', fill: 'forwards' })
        : play(panel, [{ transform: from }, { transform: `translateY(${vh}px)` }], { duration: 360, easing: EASE_IN, fill: 'forwards' }),
    );
    return out;
  }

  if (src.pres === 'page') {
    const radius = panel.style.borderRadius;
    const shadow = g.pageShadow;
    const w = box.w;
    out.push(
      play(
        panel,
        [
          { transform: 'none', clipPath: `inset(0 0 0 -${PAGE_SHADOW_REACH}px round ${radius})`, boxShadow: shadow },
          { transform: `translateX(${w}px)`, clipPath: `inset(0 ${w}px 0 -${PAGE_SHADOW_REACH}px round ${radius})`, boxShadow: 'none' },
        ],
        { duration: 500, easing: spring('smooth'), fill: 'forwards' },
      ),
    );
    return out;
  }

  const origin = src.origin?.el.isConnected ? g.originRect : null;
  const target = origin && originVisible(origin, vw, vh) ? origin : null;
  const dialog = src.pres === 'dialog';
  if (target) {
    // Back into the element it came from (GLAS-DESIGN §6.3).
    const m = morphFrom(target, box);
    const duration = dialog ? 440 : 420;
    out.push(
      play(
        panel,
        [
          { transform: from, borderRadius: panel.style.borderRadius },
          { transform: translateScale(m.x, m.y, m.sx, m.sy), borderRadius: `${m.rx}px / ${m.ry}px` },
        ],
        { duration, easing: dialog ? DIALOG_OUT : spring('smooth'), fill: 'forwards' },
      ),
      play(panel, [{ opacity }, { opacity, offset: 0.7 }, { opacity: 0 }], { duration, easing: 'linear', fill: 'forwards' }),
    );
    for (const part of parts) out.push(play(part, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease', fill: 'forwards' }));
    return out;
  }
  if (dialog) {
    out.push(
      play(
        panel,
        [
          { transform: from, opacity },
          { transform: `translate(${box.w * 0.02}px, ${box.h * 0.02}px) scale(0.96)`, opacity: 0 },
        ],
        { duration: 440, easing: DIALOG_OUT, fill: 'forwards' },
      ),
    );
    return out;
  }
  // Down and out: after a drag from where the finger let go (320 ms), else 360 ms.
  out.push(
    play(panel, [{ transform: from }, { transform: `translateY(${Math.max(vh - box.y, 0) + 16}px)` }], {
      duration: src.dragged ? 320 : 360,
      easing: EASE_IN,
      fill: 'forwards',
    }),
  );
  return out;
}

/**
 * Reopening while the window still leaves (GLAS-DESIGN §6.2 "abbrechbar"): the ghost of the same window — or of one
 * that came from the same element (a window its parent mounts anew) — goes, and the new one grows from where it was.
 */
export function takeGhost(id: number, origin: HTMLElement | null): OriginRect | null {
  const g = ghosts.find(
    (o) =>
      o.clone.isConnected &&
      o.shown &&
      !o.note?.taken &&
      (o.src.id === id || (origin !== null && o.src.origin?.el === origin)),
  );
  if (!g) return null;
  const r = g.panel.getBoundingClientRect();
  drop(g);
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}
