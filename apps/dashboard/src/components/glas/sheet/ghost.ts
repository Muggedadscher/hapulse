/**
 * [fork] Glas sheets (stage 3) — the closing animation (plan docs/glas/PLAN-ETAPPE-3.md K47, K49, K69, §3.4).
 *
 * React calls the cleanup of the backdrop's ref before it takes a window out of the document (react-dom 19.3:
 * `safelyDetachRef` before `removeChild`), so the window still hangs there, laid out. React calls the same cleanup when
 * the window stays (StrictMode, style switch, Suspense hiding). The ghost therefore clones invisibly, sits right in
 * front of the original (a window opened in the same commit lies above it) and decides in a microtask, still before
 * the next frame: original still there → the clone goes; otherwise it becomes visible and animates out. This covers
 * windows that get `open=false` and windows that disappear with their parent alike, without changing a caller.
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

/** Called from the backdrop's ref cleanup. Never throws: an error here would reach React's error boundary. */
export function spawnGhost(backdrop: HTMLElement, src: GhostSource): void {
  try {
    if (document.documentElement.dataset.style !== 'glas' || !backdrop.isConnected) return;
    const panel = backdrop.querySelector<HTMLElement>(':scope > .modal-panel');
    if (!panel) return;
    const clone = backdrop.cloneNode(true) as HTMLElement;
    const clonePanel = clone.querySelector<HTMLElement>(':scope > .modal-panel');
    if (!clonePanel) return;

    // Freeze the current state: box, running animations (transform, opacity …) of the panel, its parts and the scrim.
    const box = layoutRect(panel);
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
      const copy = cloneParts[i];
      if (part instanceof HTMLElement && copy instanceof HTMLElement) freeze(part, copy, PART_FROZEN);
    });
    const scrim = backdrop.querySelector<HTMLElement>(':scope > .g-sheet-scrim');
    const cloneScrim = clone.querySelector<HTMLElement>(':scope > .g-sheet-scrim');
    if (scrim && cloneScrim) cloneScrim.style.opacity = getComputedStyle(scrim).opacity;
    stills(panel, clonePanel);

    // A ghost is no window: no ids, roles, form names or focus, nothing to hit.
    for (const el of clone.querySelectorAll('[id]')) el.removeAttribute('id');
    for (const el of clone.querySelectorAll('[name]')) el.removeAttribute('name');
    for (const attr of ['role', 'aria-modal', 'aria-labelledby', 'tabindex']) clonePanel.removeAttribute(attr);
    clone.classList.add('g-sheet-ghost');
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.style.pointerEvents = 'none';
    clone.style.animation = 'none';
    clone.style.visibility = 'hidden';

    backdrop.before(clone);
    copyScroll(backdrop, clone); // only now: a clone outside the document forgets scroll positions

    const ghost: Ghost = { clone, panel: clonePanel, scrim: cloneScrim, src, batch: batches.now(), box, note: null };
    if (src.pres === 'sheet' || src.pres === 'dialog') {
      const r = panel.getBoundingClientRect();
      ghost.note = {
        rect: { x: r.left, y: r.top, w: r.width, h: r.height },
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

/** Loaded images, canvases and video frames as still copies: a cloned <img> loads again (empty with `no-store`), a
 * cloned canvas is blank. The copies are drawn, never read. */
function stills(from: HTMLElement, to: HTMLElement): void {
  const a = from.querySelectorAll<HTMLElement>('img, canvas, video');
  const b = to.querySelectorAll<HTMLElement>('img, canvas, video');
  a.forEach((orig, i) => {
    const copy = b[i];
    if (!copy) return;
    try {
      if (orig instanceof HTMLImageElement && !(orig.complete && orig.naturalWidth > 0)) return;
      if (orig instanceof HTMLVideoElement && orig.readyState < 2) {
        copy.style.visibility = 'hidden';
        return;
      }
      const w = orig.offsetWidth;
      const h = orig.offsetHeight;
      if (!w || !h) return;
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
      if (!ctx) return;
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
  });
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

function copyScroll(from: HTMLElement, to: HTMLElement): void {
  const a = from.querySelectorAll<HTMLElement>('*');
  const b = to.querySelectorAll<HTMLElement>('*');
  a.forEach((el, i) => {
    if (!el.scrollTop && !el.scrollLeft) return;
    const copy = b[i];
    if (!copy) return;
    copy.scrollTop = el.scrollTop;
    copy.scrollLeft = el.scrollLeft;
  });
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
    g.clone.style.visibility = '';
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
  const { clone, panel, scrim, src, box } = g;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const from = panel.style.transform || 'none';
  const opacity = Number(panel.style.opacity || 1);
  const parts = [...panel.children];
  const out: (Animation | null)[] = [];

  if (reducedMotion()) {
    out.push(play(clone, [{ opacity: 1 }, { opacity: 0 }], { duration: REDUCED_MS, easing: 'ease', fill: 'forwards' }));
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
    const radius = panel.style.borderRadius || getComputedStyle(panel).borderRadius;
    const shadow = getComputedStyle(document.documentElement).getPropertyValue('--g-shadow-pushed-screen').trim() || 'none';
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

  const origin = src.origin?.el.isConnected ? rectOf(src.origin.el) : null;
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
          { transform: from, borderRadius: panel.style.borderRadius || getComputedStyle(panel).borderRadius },
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
      o.clone.style.visibility !== 'hidden' &&
      !o.note?.taken &&
      (o.src.id === id || (origin !== null && o.src.origin?.el === origin)),
  );
  if (!g) return null;
  const r = g.panel.getBoundingClientRect();
  drop(g);
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}
