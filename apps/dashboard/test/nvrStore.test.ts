import { beforeEach, describe, expect, it } from 'vitest';
import { useNvrStore } from '../src/nvr/store';
import type { SentinelClient } from '../src/nvr/api';

type Reply = unknown | Error;

/** A fake client: `routes` maps the path (without query) to the answer, an Error is thrown. */
function client(key: string, routes: Record<string, Reply>, log: string[] = []): SentinelClient {
  return {
    key,
    async getJson<T>(path: string): Promise<T> {
      log.push(path);
      const r = routes[path.split('?')[0]!];
      if (r instanceof Error) throw r;
      if (r === undefined) throw Object.assign(new Error('not found'), { status: 404 });
      return r as T;
    },
  } as unknown as SentinelClient;
}

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });
const cams = [{ id: '33', name: 'Pool', online: true }];
const full = {
  'api/cameras': cams,
  'api/recent-events': [{ camera: '33', ts: 1 }],
  'api/stats': { cameras: 1 },
  'api/events-histogram': { buckets: [1, 2, 3] },
};

describe('NVR store refresh', () => {
  beforeEach(() => useNvrStore.getState().reset());

  it('full: takes over all four answers, with the browser time zone', async () => {
    const log: string[] = [];
    await useNvrStore.getState().refresh(client('k1', full, log));
    const s = useNvrStore.getState();
    expect(s.status).toBe('ready');
    expect(s.cameras).toEqual(cams);
    expect(s.recent).toEqual(full['api/recent-events']);
    expect(s.stats).toEqual({ cameras: 1 });
    expect(s.histogram).toEqual([1, 2, 3]);
    expect(s.errorStatus).toBeNull();
    expect(s.loadedAt).toBeGreaterThan(0);
    expect(log).toHaveLength(4);
    expect(log.find((p) => p.startsWith('api/cameras'))).toMatch(/^api\/cameras\?tz=/);
  });

  it('cameras scope asks only for the camera list', async () => {
    const log: string[] = [];
    await useNvrStore.getState().refresh(client('k1', full, log), 'cameras');
    expect(log).toEqual([expect.stringMatching(/^api\/cameras\?tz=/)]);
    expect(useNvrStore.getState().cameras).toEqual(cams);
    expect(useNvrStore.getState().status).toBe('ready');
  });

  it('older plugin without histogram: the rest still loads', async () => {
    const { ['api/events-histogram']: _drop, ...noHist } = full;
    await useNvrStore.getState().refresh(client('k1', noHist));
    expect(useNvrStore.getState().status).toBe('ready');
    expect(useNvrStore.getState().histogram).toEqual([]);
  });

  it('first load fails: error with the HTTP status (0 = unreachable)', async () => {
    await useNvrStore.getState().refresh(client('k1', { ...full, 'api/stats': httpError(500) }));
    expect(useNvrStore.getState().status).toBe('error');
    expect(useNvrStore.getState().errorStatus).toBe(500);

    useNvrStore.getState().reset();
    await useNvrStore.getState().refresh(client('k1', { ...full, 'api/cameras': new TypeError('Failed to fetch') }));
    expect(useNvrStore.getState().errorStatus).toBe(0);
  });

  it('short outage after a good load keeps the old data visible', async () => {
    await useNvrStore.getState().refresh(client('k1', full));
    await useNvrStore.getState().refresh(client('k1', { 'api/cameras': new TypeError('Failed to fetch') }));
    const s = useNvrStore.getState();
    expect(s.status).toBe('ready');
    expect(s.cameras).toEqual(cams);
    expect(s.errorStatus).toBe(0);
  });

  it.each([401, 403])('%i after a good load: error, old data must not pose as current', async (code) => {
    await useNvrStore.getState().refresh(client('k1', full));
    await useNvrStore.getState().refresh(client('k1', { ...full, 'api/cameras': httpError(code) }));
    expect(useNvrStore.getState().status).toBe('error');
    expect(useNvrStore.getState().errorStatus).toBe(code);
  });

  it('config change: data reset at once, an answer for the old config is dropped', async () => {
    await useNvrStore.getState().refresh(client('old', full));
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slowOld = {
      key: 'old',
      async getJson<T>(path: string): Promise<T> {
        await gate;
        return (full as Record<string, unknown>)[path.split('?')[0]!] as T;
      },
    } as unknown as SentinelClient;
    const pending = useNvrStore.getState().refresh(slowOld);
    const other = [{ id: '40', name: 'Einfahrt', online: true }];
    const fresh = useNvrStore.getState().refresh(client('new', { ...full, 'api/cameras': other }));
    expect(useNvrStore.getState().key).toBe('new');
    await fresh;
    release();
    await pending;
    expect(useNvrStore.getState().cameras).toEqual(other);
  });

  it('a failure for the old config does not touch the new one', async () => {
    let fail!: () => void;
    const gate = new Promise<void>((r) => (fail = r));
    const dyingOld = {
      key: 'old',
      async getJson(): Promise<never> {
        await gate;
        throw httpError(401);
      },
    } as unknown as SentinelClient;
    const pending = useNvrStore.getState().refresh(dyingOld);
    await useNvrStore.getState().refresh(client('new', full));
    fail();
    await pending;
    expect(useNvrStore.getState().status).toBe('ready');
    expect(useNvrStore.getState().errorStatus).toBeNull();
  });
});
