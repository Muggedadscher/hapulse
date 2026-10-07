/**
 * [fork] Glas sheets (stage 3) — the stack of open windows (plan docs/glas/PLAN-ETAPPE-3.md K48, §3.6). Pure core:
 * the order of the open windows, which one is on top (Esc, `inert`), whether a new one is a page in the window below,
 * and the counted scroll lock. The DOM effects live in `useGlasSheet.ts`.
 *
 * Order: the inspector (not modal) lies at the bottom; modal windows in the order they opened. Windows that open in
 * the same commit share a batch; inside a batch a window rendered in another one's children (React context, also
 * through portals) lies above it — React runs the child's layout effect first, so the order cannot come from the
 * order of registration.
 */

export type StackKind = 'modal' | 'inspector';

export interface StackEntry {
  id: number;
  kind: StackKind;
  /** Commit batch the window opened in. */
  batch: number;
  /** Nesting depth through React context: 0 = not rendered inside another window. */
  depth: number;
}

function before(a: StackEntry, b: StackEntry): boolean {
  if (a.kind !== b.kind) return a.kind === 'inspector';
  if (a.batch !== b.batch) return a.batch < b.batch;
  return a.depth < b.depth;
}

/** The list with `entry` at its place (an entry with the same id is replaced). */
export function insertEntry(list: readonly StackEntry[], entry: StackEntry): StackEntry[] {
  const rest = list.filter((e) => e.id !== entry.id);
  let i = rest.length;
  while (i > 0 && before(entry, rest[i - 1]!)) i--;
  return [...rest.slice(0, i), entry, ...rest.slice(i)];
}

export function removeEntry(list: readonly StackEntry[], id: number): StackEntry[] {
  return list.some((e) => e.id === id) ? list.filter((e) => e.id !== id) : (list as StackEntry[]);
}

/** The window on top: gets Esc, focus and is the only one without `inert`. */
export function topEntry(list: readonly StackEntry[]): StackEntry | undefined {
  return list[list.length - 1];
}

/** A modal window with another modal window below it is a page in that window (K48). */
export function isPage(list: readonly StackEntry[], id: number): boolean {
  const i = list.findIndex((e) => e.id === id);
  if (i < 0 || list[i]!.kind !== 'modal') return false;
  return list.slice(0, i).some((e) => e.kind === 'modal');
}

/** The modal window directly below `id` (the one a page covers), if any. */
export function parentOf(list: readonly StackEntry[], id: number): StackEntry | undefined {
  const i = list.findIndex((e) => e.id === id);
  for (let j = i - 1; j >= 0; j--) if (list[j]!.kind === 'modal') return list[j];
  return undefined;
}

export function modalCount(list: readonly StackEntry[]): number {
  return list.reduce((n, e) => n + (e.kind === 'modal' ? 1 : 0), 0);
}

/**
 * Scroll lock with a counter (K63 b): the first modal window remembers `overflow` and sets `hidden`, the last one
 * restores it — whatever order the windows disappear in.
 */
export class ScrollLock {
  private count = 0;
  private saved = '';

  acquire(style: { overflow: string }): void {
    if (this.count === 0) {
      this.saved = style.overflow;
      style.overflow = 'hidden';
    }
    this.count++;
  }

  release(style: { overflow: string }): void {
    if (this.count === 0) return;
    this.count--;
    if (this.count === 0) style.overflow = this.saved;
  }

  get held(): number {
    return this.count;
  }
}

/**
 * Commit batches: windows registered before the next microtask belong to the same commit (React runs the mutation
 * and layout phase of one commit synchronously). `now` returns the current batch number.
 */
export class Batches {
  private n = 0;
  private open = false;
  private readonly defer: (fn: () => void) => void;

  constructor(defer: (fn: () => void) => void) {
    this.defer = defer;
  }

  now(): number {
    if (!this.open) {
      this.open = true;
      this.n++;
      this.defer(() => {
        this.open = false;
      });
    }
    return this.n;
  }
}
