/**
 * [fork] Glas gestures (stage 3b) — what the context menu of an entity card offers (plan docs/glas/PLAN-ETAPPE-3.md
 * K58, GLAS-DESIGN §7.23). Pure: the caller passes the entity, the user's rights and where it is; the menu shows the
 * actions in the order returned here.
 *
 * Order: activate (scene, first) · details · turn on/off (light, switch, fan, input_boolean) · run (script) · press
 * (button, input_button) · add to / remove from favourites · open the room · hide (last). Locks, garage doors, covers,
 * climate and media get no state action: their own controls on the card lead into the confirmations that guard them.
 */

export type ContextActionId =
  | 'activate'
  | 'details'
  | 'turnOn'
  | 'turnOff'
  | 'run'
  | 'press'
  | 'favoriteAdd'
  | 'favoriteRemove'
  | 'room'
  | 'hide';

export interface ContextActionInput {
  entityId: string;
  state: string;
  /** The entity is one of the user's favourites. */
  favorite: boolean;
  /** May change favourites (`contextRights`). */
  canFavorite: boolean;
  /** May hide entities (`contextRights`). */
  canHide: boolean;
  /** The visible room the entity belongs to; null without one. */
  roomId: string | null;
  /** The room page on screen; null on any other page. */
  currentRoomId: string | null;
}

const TOGGLES = new Set(['light', 'switch', 'fan', 'input_boolean']);
const PRESSES = new Set(['button', 'input_button']);

const domainOf = (entityId: string): string => entityId.split('.')[0] ?? '';

export function contextActions(i: ContextActionInput): ContextActionId[] {
  const domain = domainOf(i.entityId);
  // an entity HA cannot reach gets no state action (the service call would fail)
  const live = i.state !== 'unavailable';
  const out: ContextActionId[] = [];
  if (domain === 'scene' && live) out.push('activate');
  out.push('details');
  if (TOGGLES.has(domain) && live) out.push(i.state === 'on' ? 'turnOff' : 'turnOn');
  if (domain === 'script' && live) out.push('run');
  if (PRESSES.has(domain) && live) out.push('press');
  if (i.canFavorite) out.push(i.favorite ? 'favoriteRemove' : 'favoriteAdd');
  if (i.roomId !== null && i.roomId !== i.currentRoomId) out.push('room');
  if (i.canHide) out.push('hide');
  return out;
}

/** The Home Assistant service a state action calls, as [domain, service]; null for the other actions. */
export function contextService(id: ContextActionId, entityId: string): [domain: string, service: string] | null {
  const domain = domainOf(entityId);
  switch (id) {
    case 'activate':
      return ['scene', 'turn_on'];
    case 'turnOn':
      return [domain, 'turn_on'];
    case 'turnOff':
      return [domain, 'turn_off'];
    case 'run':
      return ['script', 'turn_on'];
    case 'press':
      return [domain, 'press'];
    default:
      return null;
  }
}

export interface ContextRightsInput {
  /** An admin has activated the global management. */
  managed: boolean;
  isAdmin: boolean;
  /** The user's own "editing enabled" switch (settings). */
  editingEnabled: boolean;
}

/**
 * Who may change what from the menu, as today elsewhere: favourites are per user under global management, so everybody
 * may pin them there (like the star in the detail); otherwise only admins with editing enabled (edit mode, entity
 * list). Hiding stays with admins who have editing enabled.
 */
export function contextRights({ managed, isAdmin, editingEnabled }: ContextRightsInput): { canFavorite: boolean; canHide: boolean } {
  const editor = isAdmin && editingEnabled;
  return { canFavorite: managed || editor, canHide: editor };
}

// ---- Geometry of the menu (GLAS-DESIGN §7.23) ----

export interface CtxBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The lifted preview grows by 4 % about its centre. */
export const CONTEXT_LIFT = 1.04;
/** Gap between the card and the menu. */
export const CONTEXT_GAP = 14;
/** The menu keeps this distance to the edges of the screen. */
export const CONTEXT_EDGE = 16;

/** `b` scaled by `scale` about its centre. */
export function liftBox(b: CtxBox, scale: number): CtxBox {
  const w = b.w * scale;
  const h = b.h * scale;
  return { x: b.x - (w - b.w) / 2, y: b.y - (h - b.h) / 2, w, h };
}

/**
 * The box a card takes in the layout, from where it shows (`shown`) under a transform of scale and translation (`a`,
 * `d`, `e`, `f` of its matrix) about `origin` (px from the box's top left): a card that is pressed (`:active` scales it
 * to .98) or lifted is measured as if it were not.
 */
export function unscaledBox(
  shown: CtxBox,
  m: { a: number; d: number; e: number; f: number },
  origin: { x: number; y: number },
): CtxBox {
  if (!m.a || !m.d) return shown;
  return {
    x: shown.x - origin.x * (1 - m.a) - m.e,
    y: shown.y - origin.y * (1 - m.d) - m.f,
    w: shown.w / m.a,
    h: shown.h / m.d,
  };
}

/**
 * Where the menu goes: 14 under the card when it fits above the bottom margin, else 14 above it, else as low as the
 * screen allows (a card taller than the screen). Horizontally it lines up with the card's left edge, or its right edge
 * when the card's centre is in the right half, and keeps 16 from both sides.
 */
export function placeContextMenu(card: CtxBox, menu: { w: number; h: number }, view: { w: number; h: number }): { x: number; y: number } {
  const alignRight = card.x + card.w / 2 > view.w / 2;
  const x = clamp(alignRight ? card.x + card.w - menu.w : card.x, CONTEXT_EDGE, view.w - CONTEXT_EDGE - menu.w);
  const below = card.y + card.h + CONTEXT_GAP;
  const above = card.y - CONTEXT_GAP - menu.h;
  let y: number;
  if (below + menu.h <= view.h - CONTEXT_EDGE) y = below;
  else if (above >= CONTEXT_EDGE) y = above;
  else y = Math.max(CONTEXT_EDGE, view.h - CONTEXT_EDGE - menu.h);
  return { x, y };
}

/**
 * The dim layer's clip: its whole box (`view`) but the card, whose corners round with `r` — one `evenodd` path. The
 * outer rectangle is the layer's own size: with a far larger one Chromium drew the blurred backdrop over the hole.
 */
export function holePath(b: CtxBox, r: number, view: { w: number; h: number }): string {
  const rr = Math.max(0, Math.min(r, b.w / 2, b.h / 2));
  const n = (v: number) => String(Math.round(v * 100) / 100);
  const [x, y, x2, y2] = [b.x, b.y, b.x + b.w, b.y + b.h];
  const a = `A${n(rr)} ${n(rr)} 0 0 1`;
  return (
    `path(evenodd, 'M0 0 H${n(view.w)} V${n(view.h)} H0 Z ` +
    `M${n(x + rr)} ${n(y)} H${n(x2 - rr)} ${a} ${n(x2)} ${n(y + rr)} V${n(y2 - rr)} ${a} ${n(x2 - rr)} ${n(y2)} ` +
    `H${n(x + rr)} ${a} ${n(x)} ${n(y2 - rr)} V${n(y + rr)} ${a} ${n(x + rr)} ${n(y)} Z')`
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
