/**
 * [fork] Glas gestures (stage 3b) — the context menu of an entity card (plan docs/glas/PLAN-ETAPPE-3.md K58, §4.1;
 * GLAS-DESIGN §7.23, §6.3). `GlasRuntime` hosts it; an `EntityCard` opens it in Glas with a long press (550 ms), a
 * right click or the context-menu key (`glasUiStore`).
 *
 * The preview is the real card at its place: lifted (`data-g-lifted`: scale 1.04 and the lift shadow) and seen
 * through a hole in the dim layer (`clip-path` with `evenodd`) — over the dim layer it could not come (the page's
 * stacking contexts). A surface over the hole takes taps and closes, so the live card does not react under the menu.
 * The menu (`role="menu"`) sits 14 px under the card or above it, 16 px from the sides, and grows out of the card's
 * centre. Scrolling and resizing close it (the hole would not match any more), as do Esc, Tab and a tap anywhere
 * outside the menu; the focus goes back to the card. Reduced motion: no lifting and no scaling, fades of 200 ms.
 */

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { DoorOpen, EyeOff, Info, Play, Power, PowerOff, Sparkles, Star, StarOff, Zap, type LucideIcon } from 'lucide-react';
import {
  CONTEXT_LIFT,
  contextActions,
  contextRights,
  contextService,
  holePath,
  liftBox,
  placeContextMenu,
  type ContextActionId,
} from './contextActions';
import { noteOrigin } from './sheet/origin';
import { allDone, layoutRect, play, reducedMotion, spring } from './sheet/sheetMotion';
import { roomIdOf } from '../../app/glas/glasScroll';
import { nextMenuIndex } from '../../app/glas/menuKeys';
import { useCanEdit, useRooms } from '../../ha/hooks';
import { useIsManaged } from '../../ha/managedHooks';
import { callService } from '../../ha/service';
import { useEntityStore } from '../../stores/entityStore';
import { useGlasUiStore, type ContextMenuTarget } from '../../stores/glasUiStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUIStore } from '../../stores/uiStore';
import { useT, type TKey } from '../../i18n/useT';

const DESKTOP = '(min-width: 900px)';
const FADE_IN_MS = 200;
const FADE_OUT_MS = 220;
const LIFT_MS = 420;
const DROP_MS = 260;
const MENU_MS = 420;
const MENU_DELAY_MS = 40;
/** The click of the long press that opened the menu comes after the finger lifts; it must not close the menu. */
const RELEASE_GUARD_MS = 400;

/** How the last input came: a menu opened from the keyboard puts the focus on its first item (with its ring), one
 * opened by finger or mouse on the menu itself (browsers show a ring on any focus a script sets after a touch). */
let lastInput: 'key' | 'pointer' = 'pointer';
const onKeyInput = (e: KeyboardEvent) => {
  if (!e.repeat) lastInput = 'key';
};
const onPointerInput = () => {
  lastInput = 'pointer';
};

const LABEL: Record<ContextActionId, TKey> = {
  activate: 'glas.context.activate',
  details: 'glas.context.details',
  turnOn: 'glas.context.turnOn',
  turnOff: 'glas.context.turnOff',
  run: 'glas.context.run',
  press: 'glas.context.press',
  favoriteAdd: 'glas.context.favoriteAdd',
  favoriteRemove: 'glas.context.favoriteRemove',
  room: 'glas.context.room',
  hide: 'glas.context.hide',
};

const ICON: Record<ContextActionId, LucideIcon> = {
  activate: Sparkles,
  details: Info,
  turnOn: Power,
  turnOff: PowerOff,
  run: Play,
  press: Zap,
  favoriteAdd: Star,
  favoriteRemove: StarOff,
  room: DoorOpen,
  hide: EyeOff,
};

/** Hosted by GlasRuntime: follows the store; a closed menu stays on screen while it fades out. */
export function ContextMenu() {
  const target = useGlasUiStore((s) => s.contextMenu);
  const [view, setView] = useState<{ target: ContextMenuTarget; closing: boolean } | null>(null);
  const ids = useRef(new WeakMap<ContextMenuTarget, number>());
  const seq = useRef(0);

  // leaving Glas closes it: a menu must not come back for a stale card when Glas returns
  useEffect(() => {
    document.addEventListener('keydown', onKeyInput, { capture: true, passive: true });
    document.addEventListener('pointerdown', onPointerInput, { capture: true, passive: true });
    return () => {
      document.removeEventListener('keydown', onKeyInput, { capture: true });
      document.removeEventListener('pointerdown', onPointerInput, { capture: true });
      useGlasUiStore.getState().closeContextMenu();
    };
  }, []);

  // derived from the store during render (React's pattern for state that follows a value)
  if (target && view?.target !== target) setView({ target, closing: false });
  else if (!target && view && !view.closing) setView({ target: view.target, closing: true });
  if (!view) return null;

  let id = ids.current.get(view.target);
  if (id === undefined) {
    id = ++seq.current;
    ids.current.set(view.target, id);
  }
  return <Menu key={id} target={view.target} closing={view.closing} onGone={() => setView(null)} />;
}

interface MenuProps {
  target: ContextMenuTarget;
  closing: boolean;
  onGone: () => void;
}

/** The card's own focusable control (the card itself is `role="button"` on the toggles), else the wrapper. */
function focusTarget(el: HTMLElement): HTMLElement | null {
  if (!el.isConnected) return null;
  return el.querySelector<HTMLElement>('[tabindex]:not([tabindex="-1"]), button:not([disabled]), a[href]');
}

function Menu({ target, closing, onGone }: MenuProps) {
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const entity = useEntityStore((s) => s.entities[target.entityId]);
  const rooms = useRooms();
  const favorites = useSettingsStore(useShallow((s) => s.customization.favorites));
  const hiddenEntities = useSettingsStore(useShallow((s) => s.customization.hiddenEntities));
  const hiddenRooms = useSettingsStore(useShallow((s) => s.customization.hiddenRooms));
  const editingEnabled = useSettingsStore((s) => s.customization.editingEnabled);
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);
  const managed = useIsManaged();
  const isAdmin = useCanEdit();
  const openEntityDetail = useUIStore((s) => s.openEntityDetail);
  const closeMenu = useGlasUiStore((s) => s.closeContextMenu);
  const dimRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const anims = useRef<(Animation | null)[]>([]);
  /** The opening press: whether it has been released, and until when its click may still come (event time). */
  const release = useRef({ seen: !target.pressing, until: -Infinity });
  /** Where the focus goes when the menu closes without opening something else. */
  const restoreFocus = useRef(true);
  const onGoneRef = useRef(onGone);
  onGoneRef.current = onGone;

  const id = target.entityId;
  const room = rooms.find((r) => r.entityIds.includes(id) && !hiddenRooms.includes(r.id)) ?? null;
  const rights = contextRights({ managed, isAdmin, editingEnabled });
  const actions = entity
    ? contextActions({
        entityId: id,
        state: entity.state,
        favorite: favorites.includes(id),
        ...rights,
        roomId: room?.id ?? null,
        currentRoomId: roomIdOf(pathname),
      })
    : [];

  // Open: measure the card, cut the hole, place the menu, lift — before the first paint. Close: fade, drop the card.
  useLayoutEffect(() => {
    const el = target.el;
    const dim = dimRef.current;
    const hole = holeRef.current;
    const menu = menuRef.current;
    if (!dim || !hole || !menu) return undefined;
    if (!el.isConnected) {
      closeMenu();
      return undefined;
    }
    const desktop = window.matchMedia(DESKTOP).matches;
    const reduced = reducedMotion();
    const card = el.firstElementChild instanceof HTMLElement ? el.firstElementChild : el;
    const radius = parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0;
    const box = layoutRect(el);
    const scale = reduced ? 1 : CONTEXT_LIFT;
    const lifted = liftBox(box, scale);
    const layer = { w: dim.offsetWidth, h: dim.offsetHeight };
    dim.style.clipPath = holePath(lifted, radius * scale, layer);
    Object.assign(hole.style, {
      left: `${lifted.x}px`,
      top: `${lifted.y}px`,
      width: `${lifted.w}px`,
      height: `${lifted.h}px`,
      borderRadius: `${radius * scale}px`,
    });
    const view = { w: document.documentElement.clientWidth, h: window.innerHeight };
    const at = placeContextMenu(lifted, { w: menu.offsetWidth, h: menu.offsetHeight }, view);
    menu.style.left = `${at.x}px`;
    menu.style.top = `${at.y}px`;
    menu.style.transformOrigin = `${lifted.x + lifted.w / 2 - at.x}px ${lifted.y + lifted.h / 2 - at.y}px`;
    el.setAttribute('data-g-lifted', desktop ? 'desktop' : 'phone');

    const fade = { duration: reduced ? 200 : FADE_IN_MS, easing: 'ease' };
    anims.current = [
      play(dim, [{ opacity: 0 }, { opacity: 1 }], fade),
      play(hole, [{ opacity: 0 }, { opacity: 1 }], fade),
      play(menu, [{ opacity: 0 }, { opacity: 1 }], { ...fade, delay: reduced ? 0 : MENU_DELAY_MS, fill: 'backwards' }),
    ];
    if (!reduced) {
      const lift = { duration: LIFT_MS, easing: spring('bouncy') };
      anims.current.push(
        play(el, [{ transform: 'scale(1)' }, { transform: `scale(${CONTEXT_LIFT})` }], lift),
        play(dim, [{ clipPath: holePath(box, radius, layer) }, { clipPath: holePath(lifted, radius * scale, layer) }], lift),
        // the shadow grows with the card
        play(hole, [{ transform: `scale(${1 / CONTEXT_LIFT})` }, { transform: 'none' }], lift),
        play(
          menu,
          [
            { transform: 'scale(.6)', filter: 'blur(6px)' },
            { transform: 'none', filter: 'none' },
          ],
          { duration: MENU_MS, delay: MENU_DELAY_MS, easing: spring('snappy'), fill: 'backwards' },
        ),
      );
    }

    // the focus goes into the menu (arrows, Home, End, Enter); the card gets it back when the menu closes
    const first = lastInput === 'key' ? menu.querySelector<HTMLElement>('[role="menuitem"]') : null;
    (first ?? menu).focus({ preventScroll: true });

    return () => {
      for (const a of anims.current) a?.cancel();
      anims.current = [];
      el.removeAttribute('data-g-lifted');
    };
    // measured once per opening; the store gives every opening its own instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A press that opened the menu (long press) lifts after it: its click must not land on the dim layer, and the finger
  // that is still down must not scroll the page under the menu (scrolling closes it).
  useLayoutEffect(() => {
    if (!target.pressing) return undefined;
    let down = true;
    const onUp = (e: PointerEvent | TouchEvent) => {
      down = false;
      release.current = { seen: true, until: e.timeStamp + RELEASE_GUARD_MS };
      remove();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (down && e.cancelable) e.preventDefault();
    };
    const remove = () => {
      document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('pointercancel', onUp, true);
      document.removeEventListener('touchend', onUp, true);
      document.removeEventListener('touchcancel', onUp, true);
    };
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('pointercancel', onUp, true);
    document.addEventListener('touchend', onUp, true);
    document.addEventListener('touchcancel', onUp, true);
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    return () => {
      remove();
      document.removeEventListener('touchmove', onTouchMove, { capture: true });
    };
  }, [target.pressing]);

  // Scrolling, resizing and Esc close it (Esc before the windows' listener: an inspector may be open under it).
  useLayoutEffect(() => {
    if (closing) return undefined;
    const onScroll = () => closeMenu();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.isComposing) return;
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
    };
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    document.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [closing, closeMenu]);

  // An entity that is gone (removed, hidden elsewhere) or a card that left the page closes the menu.
  useLayoutEffect(() => {
    if (!closing && (!entity || !target.el.isConnected)) closeMenu();
  });

  // Closing: everything fades, the card drops back; then the instance goes.
  useLayoutEffect(() => {
    if (!closing) return;
    const el = target.el;
    const dim = dimRef.current;
    const hole = holeRef.current;
    const menu = menuRef.current;
    const reduced = reducedMotion();
    // where the running movements are now, before they stop
    const lifted = el.hasAttribute('data-g-lifted') && !reduced ? getComputedStyle(el).transform : 'none';
    const opacity = (node: HTMLElement | null) => (node ? getComputedStyle(node).opacity : '1');
    const from = { dim: opacity(dim), hole: opacity(hole), menu: opacity(menu) };
    for (const a of anims.current) a?.cancel();
    el.removeAttribute('data-g-lifted');
    const fade = { duration: reduced ? 200 : FADE_OUT_MS, easing: 'ease-out', fill: 'forwards' as const };
    anims.current = [
      dim ? play(dim, [{ opacity: from.dim }, { opacity: 0 }], fade) : null,
      hole ? play(hole, [{ opacity: from.hole }, { opacity: 0 }], fade) : null,
      menu ? play(menu, [{ opacity: from.menu }, { opacity: 0 }], fade) : null,
      lifted !== 'none' && el.isConnected
        ? play(el, [{ transform: lifted }, { transform: 'none' }], { duration: DROP_MS, easing: spring('smooth') })
        : null,
    ];
    if (restoreFocus.current) {
      const active = document.activeElement;
      if (!active || active === document.body || menu?.contains(active)) focusTarget(el)?.focus({ preventScroll: true });
    }
    const mine = anims.current;
    void allDone(mine).then(() => {
      if (anims.current === mine) onGoneRef.current();
    });
  }, [closing, target.el]);

  const run = (action: ContextActionId) => {
    if (closing || !entity) return;
    restoreFocus.current = action !== 'details' && action !== 'room' && action !== 'hide';
    closeMenu();
    const service = contextService(action, id);
    if (service) {
      void callService(service[0], service[1], {}, { entity_id: id });
      return;
    }
    switch (action) {
      case 'details': {
        // the detail grows out of the card, not out of the menu item that is fading away
        const card = target.el.firstElementChild ?? target.el;
        noteOrigin(card);
        openEntityDetail(id);
        break;
      }
      case 'favoriteAdd':
        updateCustomization({ favorites: [...favorites, id] });
        break;
      case 'favoriteRemove':
        updateCustomization({ favorites: favorites.filter((f) => f !== id) });
        break;
      case 'room':
        if (room) void navigate(`/room/${room.id}`);
        break;
      case 'hide':
        if (!hiddenEntities.includes(id)) updateCustomization({ hiddenEntities: [...hiddenEntities, id] });
        break;
      default:
        break;
    }
  };

  const onDismissClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const r = release.current;
    if (!r.seen) {
      // the release came before this instance listened: this click is the opening press's own
      release.current = { seen: true, until: -Infinity };
      return;
    }
    if (e.timeStamp <= r.until) return;
    closeMenu();
  };

  // A press on the layers (also the mouse events after a long press's release) must not move the focus to the body.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      closeMenu();
      return;
    }
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const next = nextMenuIndex(e.key, items.indexOf(document.activeElement as HTMLElement), items.length);
    if (next === null) return;
    e.preventDefault();
    items[next]!.focus();
  };

  return ReactDOM.createPortal(
    <div className={`g-ctx${closing ? ' g-ctx--closing' : ''}`}>
      <div ref={dimRef} className="g-ctx__dim" aria-hidden="true" onMouseDown={keepFocus} onClick={onDismissClick} />
      <div ref={holeRef} className="g-ctx__hole" aria-hidden="true" onMouseDown={keepFocus} onClick={onDismissClick} />
      <div
        ref={menuRef}
        className="g-ctx__menu g-glass"
        role="menu"
        tabIndex={-1}
        aria-label={t('glas.context.menuLabel', { name: target.name })}
        onKeyDown={onMenuKey}
      >
        {actions.map((a, i) => {
          const Icon = ICON[a];
          const danger = a === 'hide';
          return (
            <Fragment key={a}>
              {/* the desktop's group band before "Hide" */}
              {danger && i > 0 && <div className="g-ctx__band" role="separator" />}
              <button
                type="button"
                role="menuitem"
                className={`g-ctx__item${danger ? ' g-ctx__item--danger' : ''}`}
                onClick={() => run(a)}
              >
                <span className="g-ctx__text">{t(LABEL[a])}</span>
                <Icon className="g-ctx__icon" size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
