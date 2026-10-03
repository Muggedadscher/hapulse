import { describe, expect, it } from 'vitest';
import { NvrPoller } from '../src/nvr/poller';
import type { NvrPollScope } from '../src/nvr/poller';

interface Client { key: string }

/** A poller with fake timer, visibility and refresh; refreshes stay open until `settle()`. */
function setup() {
  const calls: { key: string; scope: NvrPollScope }[] = [];
  const open: (() => void)[] = [];
  const timers = new Map<number, { cb: () => void; ms: number }>();
  const visible = new Set<() => void>();
  const deferred: (() => void)[] = [];
  let nextTimer = 1;
  let hidden = false;
  const poller = new NvrPoller<Client>({
    refresh: (client, scope) => {
      calls.push({ key: client.key, scope });
      return new Promise<void>((resolve) => open.push(resolve));
    },
    isHidden: () => hidden,
    onVisible: (cb) => { visible.add(cb); return () => visible.delete(cb); },
    setInterval: (cb, ms) => { const id = nextTimer++; timers.set(id, { cb, ms }); return id; },
    clearInterval: (h) => { timers.delete(h as number); },
    defer: (cb) => deferred.push(cb),
  });
  return {
    poller,
    calls,
    timers,
    visible,
    /** Run the deferred initial refresh (what the microtask does after a React commit). */
    commit: () => { for (const cb of deferred.splice(0)) cb(); },
    /** Answer every open refresh and let the promise callbacks run. */
    settle: async () => { for (const r of open.splice(0)) r(); await Promise.resolve(); await Promise.resolve(); },
    fireTimer: () => { for (const t of timers.values()) t.cb(); },
    becomeVisible: () => { hidden = false; for (const cb of visible) cb(); },
    hide: () => { hidden = true; },
  };
}

const A: Client = { key: 'https://nvr TOK' };

describe('NVR poller', () => {
  it('Home card + security counter mounted together: ONE full refresh', () => {
    const t = setup();
    t.poller.subscribe(A, 15_000, 'full'); // NvrHomeCard
    t.poller.subscribe(A, 30_000, 'cameras'); // SecurityCard camera counter
    t.commit();
    expect(t.calls).toEqual([{ key: A.key, scope: 'full' }]);
  });

  it('back to the tab: one refresh in the widest scope, not one per subscriber', async () => {
    const t = setup();
    t.poller.subscribe(A, 10_000, 'full'); // NvrSecuritySection
    t.poller.subscribe(A, 30_000, 'cameras'); // SecurityHeroCard counter
    t.commit();
    await t.settle();
    t.calls.length = 0;
    expect(t.visible.size).toBe(1); // a single listener for all subscribers
    t.becomeVisible();
    expect(t.calls).toEqual([{ key: A.key, scope: 'full' }]);
  });

  it('joins a refresh still in flight; full covers cameras, not the other way round', async () => {
    const t = setup();
    t.poller.subscribe(A, 10_000, 'full');
    t.commit();
    t.fireTimer(); // previous request still open (timer and request timeout are both 10 s)
    t.becomeVisible();
    void t.poller.request(A, 'cameras');
    expect(t.calls.length).toBe(1);
    await t.settle();
    t.fireTimer(); // answered → the next tick asks again
    expect(t.calls.length).toBe(2);

    const u = setup();
    void u.poller.request(A, 'cameras');
    void u.poller.request(A, 'full');
    void u.poller.request(A, 'cameras');
    expect(u.calls.map((c) => c.scope)).toEqual(['cameras', 'full']);
  });

  it('a different client never joins the old one’s request', () => {
    const t = setup();
    void t.poller.request(A, 'full');
    void t.poller.request({ key: 'https://nvr NEW' }, 'full');
    expect(t.calls.map((c) => c.key)).toEqual([A.key, 'https://nvr NEW']);
  });

  it('a late cameras subscriber next to a mounted full one only asks for cameras', async () => {
    const t = setup();
    t.poller.subscribe(A, 10_000, 'full');
    t.commit();
    await t.settle();
    t.poller.subscribe(A, 30_000, 'cameras'); // e.g. a room page opened later
    t.commit();
    expect(t.calls.map((c) => c.scope)).toEqual(['full', 'cameras']);
  });

  it('timer: smallest interval, skipped while hidden, scope follows the subscribers', async () => {
    const t = setup();
    const offFull = t.poller.subscribe(A, 15_000, 'full');
    const offCams = t.poller.subscribe(A, 30_000, 'cameras');
    t.commit();
    await t.settle();
    expect(t.poller.intervalMs).toBe(15_000);
    expect(t.timers.size).toBe(1);

    t.calls.length = 0;
    t.hide();
    t.fireTimer();
    expect(t.calls).toEqual([]);

    t.becomeVisible();
    await t.settle();
    t.calls.length = 0;
    offFull();
    expect(t.poller.intervalMs).toBe(30_000);
    t.fireTimer();
    expect(t.calls).toEqual([{ key: A.key, scope: 'cameras' }]);

    offCams();
    expect(t.poller.intervalMs).toBe(0);
    expect(t.timers.size).toBe(0);
    expect(t.visible.size).toBe(0);
    offCams(); // double unsubscribe is harmless
    expect(t.timers.size).toBe(0);
  });

  it('subscribe + unsubscribe in one commit (React StrictMode) sends nothing for the dead one', () => {
    const t = setup();
    const off = t.poller.subscribe(A, 10_000, 'full');
    off();
    t.commit();
    expect(t.calls).toEqual([]);
    t.poller.subscribe(A, 10_000, 'full');
    t.poller.subscribe(A, 10_000, 'full');
    t.commit();
    expect(t.calls.length).toBe(1);
  });
});
