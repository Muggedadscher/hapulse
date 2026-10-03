/**
 * [fork] Framework-free core of the shared Sentinel poller (`useNvrPolling` in store.ts is the
 * React wrapper). Kept free of React and of `document` so it runs in the node test environment.
 *
 * - One timer for all subscribers (interval = the smallest requested), skipped while the tab is hidden.
 * - ONE visibility listener: returning to the tab refreshes once, not once per subscriber.
 * - Subscribers mounting together (one React commit) share one initial refresh.
 * - A refresh already in flight is joined instead of sent again (a `full` one also covers `cameras`).
 */

export type NvrPollScope = 'cameras' | 'full';

export interface NvrPollerDeps<C extends { key: string }> {
  refresh: (client: C, scope: NvrPollScope) => Promise<void>;
  isHidden: () => boolean;
  /** Call `cb` whenever the page becomes visible again; returns the unsubscribe. */
  onVisible: (cb: () => void) => () => void;
  setInterval: (cb: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
  /** Defers the shared initial refresh until all effects of the current commit have run. */
  defer?: (cb: () => void) => void;
}

interface Sub<C> {
  client: C;
  ms: number;
  scope: NvrPollScope;
}

const wider = (a: NvrPollScope | null, b: NvrPollScope): NvrPollScope => (a === 'full' || b === 'full' ? 'full' : 'cameras');

export class NvrPoller<C extends { key: string }> {
  private readonly deps: NvrPollerDeps<C>;
  private readonly subs = new Map<symbol, Sub<C>>();
  private readonly inflight = new Map<string, Promise<void>>();
  private timer: unknown = null;
  private timerMs = 0;
  private stopVisible: (() => void) | null = null;
  private pending: { client: C; scope: NvrPollScope } | null = null;
  /** The most recently subscribed client — the one the timer and the visibility refresh use. */
  private client: C | null = null;

  constructor(deps: NvrPollerDeps<C>) {
    this.deps = deps;
  }

  /** Register a subscriber; returns its unsubscribe. */
  subscribe(client: C, ms: number, scope: NvrPollScope): () => void {
    const id = Symbol('nvr-poll');
    this.subs.set(id, { client, ms, scope });
    this.client = client;
    this.restartTimer();
    if (!this.stopVisible) this.stopVisible = this.deps.onVisible(() => this.tick());
    this.kick(client, scope);
    return () => {
      if (!this.subs.delete(id)) return;
      if (this.subs.size === 0) {
        this.stopVisible?.();
        this.stopVisible = null;
      }
      this.restartTimer();
    };
  }

  /**
   * Refresh, joining a request already in flight for the same client: a running `full` refresh
   * covers a `cameras` one, a running `cameras` refresh does not cover `full`.
   */
  request(client: C, scope: NvrPollScope): Promise<void> {
    const joined = this.inflight.get(`${client.key}|full`) ?? this.inflight.get(`${client.key}|${scope}`);
    if (joined) return joined;
    const k = `${client.key}|${scope}`;
    const p = this.deps.refresh(client, scope).finally(() => {
      if (this.inflight.get(k) === p) this.inflight.delete(k);
    });
    this.inflight.set(k, p);
    return p;
  }

  /** The widest scope anybody currently needs: all four endpoints only while a `full` subscriber is mounted. */
  scope(): NvrPollScope {
    for (const s of this.subs.values()) if (s.scope === 'full') return 'full';
    return 'cameras';
  }

  /** Current timer interval (0 = no timer) — for tests. */
  get intervalMs(): number {
    return this.timer == null ? 0 : this.timerMs;
  }

  private tick(): void {
    if (this.subs.size === 0 || this.deps.isHidden() || !this.client) return;
    void this.request(this.client, this.scope());
  }

  /** Initial refresh of the subscribers added since the last kick: one request in the widest of THEIR scopes. */
  private kick(client: C, scope: NvrPollScope): void {
    const first = this.pending == null;
    this.pending = { client, scope: wider(this.pending?.scope ?? null, scope) };
    if (!first) return;
    const run = () => {
      const p = this.pending;
      this.pending = null;
      if (p && this.subs.size > 0) void this.request(p.client, p.scope);
    };
    if (this.deps.defer) this.deps.defer(run);
    else run();
  }

  private restartTimer(): void {
    if (this.timer != null) {
      this.deps.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.subs.size === 0) return;
    this.timerMs = Math.min(...[...this.subs.values()].map((s) => s.ms));
    this.timer = this.deps.setInterval(() => this.tick(), this.timerMs);
  }
}
