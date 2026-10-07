import { describe, expect, it } from 'vitest';
import {
  Batches,
  ScrollLock,
  insertEntry,
  isPage,
  modalCount,
  parentOf,
  removeEntry,
  topEntry,
  type StackEntry,
} from '../src/components/glas/sheet/sheetStack';

// [fork] Glas sheets (stage 3): the stack of open windows (docs/glas/PLAN-ETAPPE-3.md K48, §3.6).

const modal = (id: number, batch: number, depth = 0): StackEntry => ({ id, kind: 'modal', batch, depth });
const inspector = (id: number, batch: number): StackEntry => ({ id, kind: 'inspector', batch, depth: 0 });
const ids = (list: readonly StackEntry[]) => list.map((e) => e.id);

describe('order', () => {
  it('windows lie in the order they opened', () => {
    let list: StackEntry[] = [];
    list = insertEntry(list, modal(1, 1));
    list = insertEntry(list, modal(2, 2));
    list = insertEntry(list, modal(3, 3));
    expect(ids(list)).toEqual([1, 2, 3]);
    expect(topEntry(list)?.id).toBe(3);
  });

  it('in one commit a window rendered inside another lies above it, although its effect runs first', () => {
    let list: StackEntry[] = [];
    list = insertEntry(list, modal(7, 4, 1)); // child: layout effect first
    list = insertEntry(list, modal(6, 4, 0)); // its parent
    expect(ids(list)).toEqual([6, 7]);
    // a later window still goes on top
    list = insertEntry(list, modal(8, 5, 0));
    expect(ids(list)).toEqual([6, 7, 8]);
  });

  it('the inspector stays at the bottom, also when it opens later', () => {
    let list: StackEntry[] = [modal(1, 1)];
    list = insertEntry(list, inspector(2, 2));
    expect(ids(list)).toEqual([2, 1]);
    expect(topEntry(list)?.id).toBe(1);
  });

  it('registering the same id again replaces the entry', () => {
    const list = insertEntry(insertEntry([], modal(1, 1)), modal(1, 3));
    expect(list).toEqual([modal(1, 3)]);
  });

  it('windows can go in any order, the parent first too', () => {
    let list: StackEntry[] = [modal(1, 1), modal(2, 2), modal(3, 3)];
    list = removeEntry(list, 1);
    expect(ids(list)).toEqual([2, 3]);
    list = removeEntry(list, 3);
    expect(ids(list)).toEqual([2]);
    expect(removeEntry(list, 9)).toBe(list);
    expect(removeEntry(list, 2)).toEqual([]);
  });
});

describe('pages', () => {
  it('a modal window above another modal window is a page in it', () => {
    const list = [modal(1, 1), modal(2, 2), modal(3, 3)];
    expect(isPage(list, 1)).toBe(false);
    expect(isPage(list, 2)).toBe(true);
    expect(parentOf(list, 2)?.id).toBe(1);
    expect(parentOf(list, 3)?.id).toBe(2);
    expect(parentOf(list, 1)).toBeUndefined();
  });

  it('a window above the inspector is not a page (it is a dialog, the inspector becomes inert)', () => {
    const list = [inspector(1, 1), modal(2, 2)];
    expect(isPage(list, 2)).toBe(false);
    expect(parentOf(list, 2)).toBeUndefined();
    expect(isPage(list, 1)).toBe(false);
  });

  it('the page becomes a window of its own when the window below goes', () => {
    const list = removeEntry([modal(1, 1), modal(2, 2)], 1);
    expect(isPage(list, 2)).toBe(false);
  });

  it('counts only modal windows', () => {
    expect(modalCount([inspector(1, 1), modal(2, 2), modal(3, 3)])).toBe(2);
    expect(modalCount([inspector(1, 1)])).toBe(0);
  });
});

describe('ScrollLock', () => {
  it('the first window locks, the last one restores, in any order', () => {
    const style = { overflow: 'auto' };
    const lock = new ScrollLock();
    lock.acquire(style);
    expect(style.overflow).toBe('hidden');
    lock.acquire(style);
    lock.release(style); // the parent goes first
    expect(style.overflow).toBe('hidden');
    lock.release(style);
    expect(style.overflow).toBe('auto');
    expect(lock.held).toBe(0);
  });

  it('a release without an acquire changes nothing', () => {
    const style = { overflow: '' };
    const lock = new ScrollLock();
    lock.release(style);
    expect(style.overflow).toBe('');
    lock.acquire(style);
    lock.release(style);
    lock.release(style);
    expect(style.overflow).toBe('');
  });
});

describe('Batches', () => {
  it('one number per commit (until the next microtask)', () => {
    const queue: (() => void)[] = [];
    const b = new Batches((fn) => queue.push(fn));
    const first = b.now();
    expect(b.now()).toBe(first);
    queue.shift()!();
    expect(b.now()).toBe(first + 1);
  });
});
