import { describe, expect, it } from 'vitest';
import { nextMenuIndex } from '../src/app/glas/menuKeys';

// [fork] Glas: arrow keys in menus (docs/glas/PLAN-ETAPPE-2.md K42).

describe('nextMenuIndex', () => {
  it('moves down and up with wrap-around', () => {
    expect(nextMenuIndex('ArrowDown', 0, 3)).toBe(1);
    expect(nextMenuIndex('ArrowDown', 2, 3)).toBe(0);
    expect(nextMenuIndex('ArrowUp', 1, 3)).toBe(0);
    expect(nextMenuIndex('ArrowUp', 0, 3)).toBe(2);
  });

  it('from the trigger (no item focused): down → first, up → last', () => {
    expect(nextMenuIndex('ArrowDown', -1, 4)).toBe(0);
    expect(nextMenuIndex('ArrowUp', -1, 4)).toBe(3);
  });

  it('Home and End', () => {
    expect(nextMenuIndex('Home', 2, 5)).toBe(0);
    expect(nextMenuIndex('End', 0, 5)).toBe(4);
    expect(nextMenuIndex('Home', -1, 5)).toBe(0);
  });

  it('other keys and empty menus: null', () => {
    expect(nextMenuIndex('Enter', 0, 3)).toBeNull();
    expect(nextMenuIndex('a', 0, 3)).toBeNull();
    expect(nextMenuIndex('ArrowLeft', 0, 3)).toBeNull();
    expect(nextMenuIndex('ArrowDown', -1, 0)).toBeNull();
    expect(nextMenuIndex('End', 0, 0)).toBeNull();
  });

  it('a single item stays on itself', () => {
    expect(nextMenuIndex('ArrowDown', 0, 1)).toBe(0);
    expect(nextMenuIndex('ArrowUp', 0, 1)).toBe(0);
  });
});
