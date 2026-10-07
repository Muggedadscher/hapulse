import { describe, expect, it } from 'vitest';
import {
  Batches,
  Handoff,
  insertEntry,
  modalCount,
  removeEntry,
  topEntry,
  type StackEntry,
} from '../src/components/glas/sheet/sheetStack';

// [fork] Glas sheets (stage 3): the stack of open windows (docs/glas/PLAN-ETAPPE-3.md K48, K49, §3.6).

const modal = (id: number, batch: number, depth = 0): StackEntry => ({ id, kind: 'modal', batch, depth });
const inspector = (id: number, batch: number): StackEntry => ({ id, kind: 'inspector', batch, depth: 0 });
const ids = (list: readonly StackEntry[]) => list.map((e) => e.id);

/** A microtask queue the test drains by hand. */
function queue() {
  const fns: (() => void)[] = [];
  return {
    defer: (fn: () => void) => fns.push(fn),
    flush: () => fns.splice(0).forEach((fn) => fn()),
    step: () => fns.shift()?.(),
  };
}

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

  it('registering the same id again changes nothing: an update never moves a window', () => {
    // the lower window re-renders on every HA update (e.g. with an inline onClose) while a page lies above it
    const list = [modal(1, 1), modal(2, 2)];
    const again = insertEntry(list, modal(1, 9));
    expect(again).toBe(list);
    expect(ids(again)).toEqual([1, 2]);
    expect(topEntry(again)?.id).toBe(2);
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

  it('a window and its page removed in the same commit leave nothing behind', () => {
    // route change: React cleans up the outer window first, then the page rendered inside it
    let list: StackEntry[] = [modal(1, 1), modal(2, 2, 1)];
    list = removeEntry(list, 1);
    list = removeEntry(list, 2);
    expect(list).toEqual([]);
    expect(topEntry(list)).toBeUndefined();
    expect(modalCount(list)).toBe(0);
  });

  it('counts only modal windows', () => {
    expect(modalCount([inspector(1, 1), modal(2, 2), modal(3, 3)])).toBe(2);
    expect(modalCount([inspector(1, 1)])).toBe(0);
  });
});

describe('Batches', () => {
  it('one number per commit (until the next microtask)', () => {
    const q = queue();
    const b = new Batches(q.defer);
    const first = b.now();
    expect(b.now()).toBe(first);
    q.flush();
    expect(b.now()).toBe(first + 1);
  });
});

describe('Handoff', () => {
  it('a window opening in the same commit takes the note of the one that closed, once', () => {
    const q = queue();
    const h = new Handoff<string>(q.defer);
    h.put('pool');
    expect(h.take()).toBe('pool');
    expect(h.take()).toBeNull();
  });

  it('the note expires with the microtask after the commit', () => {
    const q = queue();
    const h = new Handoff<string>(q.defer);
    h.put('pool');
    q.flush();
    expect(h.take()).toBeNull();
  });

  it('an older expiry does not clear a newer note (two commits before the microtask)', () => {
    const q = queue();
    const h = new Handoff<string>(q.defer);
    h.put('first');
    h.put('second');
    q.step(); // the first note's expiry
    expect(h.take()).toBe('second');
    h.put('third');
    q.flush();
    expect(h.take()).toBeNull();
  });
});
