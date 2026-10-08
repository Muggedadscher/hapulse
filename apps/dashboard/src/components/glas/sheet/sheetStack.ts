/**
 * [fork] Glas sheets (stage 3) — the stack of open windows (plan docs/glas/PLAN-ETAPPE-3.md K48, K49, §3.6). Pure
 * core: the order of the open windows, which one is on top (Esc, focus, the only one without `inert`), the commit
 * batches and the hand-over marker. Whether a window is a page in another one is not decided here but by
 * `SheetContext` (rendered inside an open window's content). The DOM effects live in `useGlasSheet.ts`.
 *
 * Order: the inspector (not modal) lies at the bottom; modal windows in the order they opened. Windows that open in
 * the same commit share a batch; inside a batch a window rendered in another one's content (React context, also
 * through portals) lies above it — React runs the child's layout effect first, so the order cannot come from the
 * order of registration. A window is registered once per opening; registering it again never moves it.
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

/** The list with `entry` at its place. An entry with the same id keeps its place: an update never changes the order. */
export function insertEntry(list: readonly StackEntry[], entry: StackEntry): StackEntry[] {
  if (list.some((e) => e.id === entry.id)) return list as StackEntry[];
  let i = list.length;
  while (i > 0 && before(entry, list[i - 1]!)) i--;
  return [...list.slice(0, i), entry, ...list.slice(i)];
}

export function removeEntry(list: readonly StackEntry[], id: number): StackEntry[] {
  return list.some((e) => e.id === id) ? list.filter((e) => e.id !== id) : (list as StackEntry[]);
}

/** The window on top: gets Esc and the focus, and is the only one without `inert`. */
export function topEntry(list: readonly StackEntry[]): StackEntry | undefined {
  return list[list.length - 1];
}

/** Modal windows (scroll lock, tab bar, `data-g-sheets`); the inspector does not count. */
export function modalCount(list: readonly StackEntry[]): number {
  return list.reduce((n, e) => n + (e.kind === 'modal' ? 1 : 0), 0);
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

/**
 * Hand-over marker (K49): a window that closes notes itself here during React's commit (its ghost); a window that
 * opens in the same commit takes the note in the layout phase and continues from that place instead of rising. The
 * note expires with the next microtask, after the commit, so a later opening never takes it.
 */
export class Handoff<T> {
  private note: T | null = null;
  private gen = 0;
  private readonly defer: (fn: () => void) => void;

  constructor(defer: (fn: () => void) => void) {
    this.defer = defer;
  }

  put(value: T): void {
    this.note = value;
    const gen = ++this.gen;
    this.defer(() => {
      if (this.gen === gen) this.note = null;
    });
  }

  /** The note of a window that closed in this commit, once. */
  take(): T | null {
    const value = this.note;
    this.note = null;
    return value;
  }
}
