import { describe, expect, it } from 'vitest';
import {
  contextActions,
  contextRights,
  contextService,
  holePath,
  liftBox,
  placeContextMenu,
  unscaledBox,
  type ContextActionInput,
} from '../src/components/glas/contextActions';

// [fork] Glas context menu (stage 3b): what the menu of an entity card offers, in which order (K58).

const input = (entityId: string, over: Partial<ContextActionInput> = {}): ContextActionInput => ({
  entityId,
  state: 'off',
  favorite: false,
  canFavorite: false,
  canHide: false,
  roomId: null,
  currentRoomId: null,
  ...over,
});

const all = { canFavorite: true, canHide: true, roomId: 'kitchen' } as const;

describe('contextActions', () => {
  it('puts "activate" first for scenes', () => {
    expect(contextActions(input('scene.movie', { state: '2026-10-08T07:00:00Z' }))).toEqual(['activate', 'details']);
  });

  it('turns lights and the other toggles off when on and on otherwise', () => {
    expect(contextActions(input('light.desk', { state: 'on' }))).toEqual(['details', 'turnOff']);
    expect(contextActions(input('light.desk', { state: 'off' }))).toEqual(['details', 'turnOn']);
    for (const id of ['switch.fan_plug', 'fan.ceiling', 'input_boolean.guest_mode']) {
      expect(contextActions(input(id, { state: 'on' }))).toEqual(['details', 'turnOff']);
      expect(contextActions(input(id, { state: 'off' }))).toEqual(['details', 'turnOn']);
    }
  });

  it('runs scripts and presses buttons', () => {
    expect(contextActions(input('script.good_night'))).toEqual(['details', 'run']);
    expect(contextActions(input('button.restart', { state: 'unknown' }))).toEqual(['details', 'press']);
    expect(contextActions(input('input_button.ring', { state: 'unknown' }))).toEqual(['details', 'press']);
  });

  it('offers no state action for an entity HA cannot reach', () => {
    for (const id of ['scene.movie', 'light.desk', 'switch.plug', 'script.good_night', 'button.restart']) {
      expect(contextActions(input(id, { state: 'unavailable' }))).toEqual(['details']);
    }
  });

  it('never changes locks, garage doors, covers, climate or media from the menu', () => {
    for (const [id, state] of [
      ['lock.front_door', 'locked'],
      ['lock.front_door', 'unlocked'],
      ['cover.garage_door', 'closed'],
      ['cover.living_room', 'open'],
      ['climate.living_room', 'heat'],
      ['media_player.kitchen', 'playing'],
      ['alarm_control_panel.home', 'armed_away'],
      ['sensor.temperature', '21.5'],
      ['binary_sensor.door', 'on'],
      ['camera.porch', 'idle'],
    ] as const) {
      expect(contextActions(input(id, { state, ...all }))).toEqual(['details', 'favoriteAdd', 'room', 'hide']);
    }
  });

  it('adds or removes the favourite only with the right', () => {
    expect(contextActions(input('sensor.t', { canFavorite: true }))).toEqual(['details', 'favoriteAdd']);
    expect(contextActions(input('sensor.t', { canFavorite: true, favorite: true }))).toEqual(['details', 'favoriteRemove']);
    expect(contextActions(input('sensor.t', { canFavorite: false, favorite: true }))).toEqual(['details']);
  });

  it('opens the room only when the entity has one and it is not on screen', () => {
    expect(contextActions(input('sensor.t', { roomId: 'kitchen' }))).toEqual(['details', 'room']);
    expect(contextActions(input('sensor.t', { roomId: 'kitchen', currentRoomId: 'bath' }))).toEqual(['details', 'room']);
    expect(contextActions(input('sensor.t', { roomId: 'kitchen', currentRoomId: 'kitchen' }))).toEqual(['details']);
    expect(contextActions(input('sensor.t', { roomId: null, currentRoomId: 'kitchen' }))).toEqual(['details']);
  });

  it('hides only with the right, always last', () => {
    expect(contextActions(input('sensor.t', { canHide: true }))).toEqual(['details', 'hide']);
    expect(contextActions(input('light.desk', { state: 'on', favorite: true, ...all }))).toEqual([
      'details',
      'turnOff',
      'favoriteRemove',
      'room',
      'hide',
    ]);
    expect(contextActions(input('scene.movie', { state: 'x', ...all }))).toEqual([
      'activate',
      'details',
      'favoriteAdd',
      'room',
      'hide',
    ]);
  });
});

describe('contextService', () => {
  it('maps the state actions to their Home Assistant service', () => {
    expect(contextService('activate', 'scene.movie')).toEqual(['scene', 'turn_on']);
    expect(contextService('turnOn', 'light.desk')).toEqual(['light', 'turn_on']);
    expect(contextService('turnOff', 'fan.ceiling')).toEqual(['fan', 'turn_off']);
    expect(contextService('turnOff', 'input_boolean.guest_mode')).toEqual(['input_boolean', 'turn_off']);
    expect(contextService('run', 'script.good_night')).toEqual(['script', 'turn_on']);
    expect(contextService('press', 'button.restart')).toEqual(['button', 'press']);
    expect(contextService('press', 'input_button.ring')).toEqual(['input_button', 'press']);
  });

  it('gives null for the other actions', () => {
    for (const id of ['details', 'favoriteAdd', 'favoriteRemove', 'room', 'hide'] as const) {
      expect(contextService(id, 'light.desk')).toBeNull();
    }
  });
});

describe('contextRights', () => {
  it('lets everybody pin favourites under global management, hiding stays with editing admins', () => {
    expect(contextRights({ managed: true, isAdmin: false, editingEnabled: false })).toEqual({ canFavorite: true, canHide: false });
    expect(contextRights({ managed: true, isAdmin: false, editingEnabled: true })).toEqual({ canFavorite: true, canHide: false });
    expect(contextRights({ managed: true, isAdmin: true, editingEnabled: false })).toEqual({ canFavorite: true, canHide: false });
    expect(contextRights({ managed: true, isAdmin: true, editingEnabled: true })).toEqual({ canFavorite: true, canHide: true });
  });

  it('needs an admin with editing enabled without global management', () => {
    expect(contextRights({ managed: false, isAdmin: true, editingEnabled: true })).toEqual({ canFavorite: true, canHide: true });
    expect(contextRights({ managed: false, isAdmin: true, editingEnabled: false })).toEqual({ canFavorite: false, canHide: false });
    expect(contextRights({ managed: false, isAdmin: false, editingEnabled: true })).toEqual({ canFavorite: false, canHide: false });
    expect(contextRights({ managed: false, isAdmin: false, editingEnabled: false })).toEqual({ canFavorite: false, canHide: false });
  });
});

describe('liftBox', () => {
  it('grows the box about its centre', () => {
    expect(liftBox({ x: 100, y: 200, w: 100, h: 50 }, 1.04)).toEqual({ x: 98, y: 199, w: 104, h: 52 });
    expect(liftBox({ x: 10, y: 20, w: 30, h: 40 }, 1)).toEqual({ x: 10, y: 20, w: 30, h: 40 });
  });
});

describe('unscaledBox', () => {
  const near = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
    (['x', 'y', 'w', 'h'] as const).forEach((k) => expect(a[k]).toBeCloseTo(b[k], 6));

  it('keeps an untransformed box', () => {
    expect(unscaledBox({ x: 10, y: 20, w: 30, h: 40 }, { a: 1, d: 1, e: 0, f: 0 }, { x: 15, y: 20 })).toEqual({ x: 10, y: 20, w: 30, h: 40 });
  });

  it('measures a pressed card (scale .98 about its centre) as if it were not pressed', () => {
    // laid out at 100/200, 300 × 100; pressed it shows at 103/201, 294 × 98
    near(unscaledBox({ x: 103, y: 201, w: 294, h: 98 }, { a: 0.98, d: 0.98, e: 0, f: 0 }, { x: 150, y: 50 }), { x: 100, y: 200, w: 300, h: 100 });
  });

  it('undoes a lift about another origin and a translation', () => {
    const box = { x: 40, y: 60, w: 200, h: 80 };
    const o = { x: 0, y: 80 };
    const m = { a: 1.04, d: 1.04, e: 5, f: -3 };
    const shown = { x: box.x + o.x * (1 - m.a) + m.e, y: box.y + o.y * (1 - m.d) + m.f, w: box.w * m.a, h: box.h * m.d };
    near(unscaledBox(shown, m, o), box);
  });

  it('gives a box with a flat scale back as it shows', () => {
    expect(unscaledBox({ x: 1, y: 2, w: 0, h: 4 }, { a: 0, d: 1, e: 0, f: 0 }, { x: 0, y: 0 })).toEqual({ x: 1, y: 2, w: 0, h: 4 });
  });
});

describe('placeContextMenu', () => {
  const view = { w: 390, h: 844 };
  const menu = { w: 250, h: 200 };

  it('goes 14 under the card, lined up with its left edge', () => {
    expect(placeContextMenu({ x: 16, y: 100, w: 170, h: 100 }, menu, view)).toEqual({ x: 16, y: 214 });
  });

  it('lines up with the right edge of a card in the right half', () => {
    expect(placeContextMenu({ x: 204, y: 100, w: 170, h: 100 }, menu, view)).toEqual({ x: 124, y: 214 });
  });

  it('keeps 16 from the sides', () => {
    expect(placeContextMenu({ x: 2, y: 100, w: 100, h: 100 }, menu, view).x).toBe(16);
    expect(placeContextMenu({ x: 300, y: 100, w: 100, h: 100 }, menu, view).x).toBe(124);
    expect(placeContextMenu({ x: 300, y: 100, w: 88, h: 100 }, { w: 380, h: 200 }, view).x).toBe(16);
  });

  it('goes above the card when it does not fit under it', () => {
    expect(placeContextMenu({ x: 16, y: 600, w: 170, h: 100 }, menu, view)).toEqual({ x: 16, y: 386 });
    // exactly fits under: bottom edge at 844 - 16
    expect(placeContextMenu({ x: 16, y: 514, w: 170, h: 100 }, menu, view).y).toBe(628);
  });

  it('stays on the screen next to a card taller than the room around it', () => {
    expect(placeContextMenu({ x: 16, y: 100, w: 358, h: 650 }, menu, view)).toEqual({ x: 16, y: 628 });
    expect(placeContextMenu({ x: 16, y: 0, w: 358, h: 844 }, { w: 250, h: 900 }, view).y).toBe(16);
  });
});

describe('holePath', () => {
  const view = { w: 390, h: 844 };

  it('cuts the rounded card out of the layer, whose own size is the outer edge', () => {
    expect(holePath({ x: 10, y: 20, w: 100, h: 50 }, 8, view)).toBe(
      "path(evenodd, 'M0 0 H390 V844 H0 Z M18 20 H102 A8 8 0 0 1 110 28 V62 A8 8 0 0 1 102 70 H18 A8 8 0 0 1 10 62 V28 A8 8 0 0 1 18 20 Z')",
    );
  });

  it('keeps the radius inside the box and rounds to hundredths', () => {
    expect(holePath({ x: 0, y: 0, w: 20, h: 10 }, 30, view)).toContain('M5 0 H15 A5 5 0 0 1 20 5 V5');
    expect(holePath({ x: 0.123, y: 0, w: 10, h: 10 }, 0, view)).toContain('M0.12 0 H10.12');
    expect(holePath({ x: 0, y: 0, w: 10, h: 10 }, 0, { w: 1439.5, h: 999.999 })).toMatch(/^path\(evenodd, 'M0 0 H1439.5 V1000 H0 Z /);
  });
});
