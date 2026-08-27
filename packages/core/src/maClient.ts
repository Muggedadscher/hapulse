/**
 * Direct Music Assistant WebSocket client (issue #2, full-queue phase).
 *
 * Home Assistant's API exposes only a queue SUMMARY (get_queue). The full
 * item list — and moving/removing items — lives on Music Assistant's own
 * WebSocket API, which since MA 2.9 requires an API token the user creates in
 * MA's settings. HAPulse therefore treats the direct connection as an
 * OPTIONAL upgrade: URL + token configured once in the queue card, stored in
 * customization (synced per-user like everything else). Without it the queue
 * card keeps its HA-fed summary.
 *
 * Protocol (verified against a live MA 2.9.13):
 * - on connect the server sends a ServerInfo message
 * - `{message_id, command: "auth", args: {token}}` authenticates (error_code
 *   23 = bad token)
 * - requests are `{message_id, command, args}`, responses echo message_id
 *   with `result` or `error_code`/`details`
 *
 * Uses the global WebSocket (browsers, Node ≥ 22) — no DOM. The client
 * reconnects lazily on the next call after a drop.
 */

export interface MAFullQueueItem {
  queueItemId: string;
  name: string;
  artist: string | null;
  /** Only remotely-accessible artwork URLs; proxied-only images stay null. */
  image: string | null;
  durationSeconds: number | null;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
}

const REQUEST_TIMEOUT_MS = 8_000;

export class MusicAssistantClient {
  #url: string;
  #token: string;
  #ws: WebSocket | null = null;
  #ready: Promise<void> | null = null;
  #pending = new Map<string, PendingRequest>();
  #nextId = 0;

  constructor(url: string, token: string) {
    // Normalize: accept "http(s)://host:8095" or a bare "host:8095".
    const base = url.replace(/\/+$/, '');
    const withScheme = /^(https?|wss?):\/\//.test(base) ? base : `http://${base}`;
    this.#url = withScheme.replace(/^http/, 'ws') + '/ws';
    this.#token = token;
  }

  /** Connect + authenticate (memoized; re-armed after a drop). */
  #connect(): Promise<void> {
    if (this.#ready != null && this.#ws != null && this.#ws.readyState <= WebSocket.OPEN) {
      return this.#ready;
    }
    this.#ready = new Promise<void>((resolve, reject) => {
      if (typeof WebSocket === 'undefined') {
        reject(new Error('WebSocket is not available in this environment'));
        return;
      }
      const ws = new WebSocket(this.#url);
      this.#ws = ws;
      let authenticated = false;

      const failAll = (err: Error) => {
        for (const p of this.#pending.values()) p.reject(err);
        this.#pending.clear();
      };

      ws.onmessage = (event: MessageEvent) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(event.data)) as Record<string, unknown>;
        } catch {
          return;
        }
        // ServerInfo greeting → authenticate.
        if (!authenticated && (msg['server_version'] != null || msg['server_id'] != null)) {
          ws.send(JSON.stringify({ message_id: 'auth', command: 'auth', args: { token: this.#token } }));
          return;
        }
        const id = typeof msg['message_id'] === 'string' ? msg['message_id'] : null;
        if (id === 'auth') {
          if (msg['error_code'] != null) {
            reject(new Error(`Music Assistant auth failed: ${String(msg['details'] ?? msg['error_code'])}`));
            ws.close();
          } else {
            authenticated = true;
            resolve();
          }
          return;
        }
        if (id != null && this.#pending.has(id)) {
          const p = this.#pending.get(id)!;
          this.#pending.delete(id);
          if (msg['error_code'] != null) {
            p.reject(new Error(`${String(msg['error_code'])}: ${String(msg['details'] ?? '')}`));
          } else {
            p.resolve(msg['result']);
          }
        }
      };
      ws.onerror = () => {
        reject(new Error('Music Assistant connection failed'));
        failAll(new Error('Music Assistant connection failed'));
      };
      ws.onclose = () => {
        failAll(new Error('Music Assistant connection closed'));
        this.#ws = null;
        this.#ready = null;
      };
    });
    return this.#ready;
  }

  async #request<T = unknown>(command: string, args: Record<string, unknown>): Promise<T> {
    await this.#connect();
    const ws = this.#ws;
    if (ws == null || ws.readyState !== WebSocket.OPEN) {
      throw new Error('Music Assistant connection not open');
    }
    const message_id = `q${++this.#nextId}`;
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(message_id, { resolve: resolve as (v: unknown) => void, reject });
      ws.send(JSON.stringify({ message_id, command, args }));
      setTimeout(() => {
        if (this.#pending.has(message_id)) {
          this.#pending.delete(message_id);
          reject(new Error(`Music Assistant request timed out: ${command}`));
        }
      }, REQUEST_TIMEOUT_MS);
    });
  }

  /** The queue's item list (queue_id comes from HA's get_queue summary). */
  async queueItems(queueId: string, limit = 200, offset = 0): Promise<MAFullQueueItem[]> {
    const result = await this.#request<unknown[]>('player_queues/items', {
      queue_id: queueId,
      limit,
      offset,
    });
    return parseMAFullQueueItems(result);
  }

  /** Move an item `positionShift` places (negative = up, positive = down). */
  async moveItem(queueId: string, queueItemId: string, positionShift: number): Promise<void> {
    await this.#request('player_queues/move_item', {
      queue_id: queueId,
      queue_item_id: queueItemId,
      pos_shift: positionShift,
    });
  }

  /** Remove an item from the queue. */
  async deleteItem(queueId: string, queueItemId: string): Promise<void> {
    await this.#request('player_queues/delete_item', {
      queue_id: queueId,
      item_id_or_index: queueItemId,
    });
  }

  /**
   * Artwork for every active queue in one call (`player_queues/all`) — feeds
   * the Now Playing / Players / Zones artwork fallback when entity_picture
   * cannot load (mixed content on the hosted dashboard).
   */
  async queuesArtwork(): Promise<MAQueueArtwork[]> {
    const result = await this.#request<unknown[]>('player_queues/all', {});
    return parseMAQueuesArtwork(result);
  }

  close(): void {
    this.#ws?.close();
    this.#ws = null;
    this.#ready = null;
  }
}

/** Artwork for one active queue: what's playing and its (loadable) cover. */
export interface MAQueueArtwork {
  queueId: string;
  /** Current item's title, for matching wrapper players by media_title. */
  title: string | null;
  /** Remotely-accessible artwork URL, or null. */
  image: string | null;
}

/** ImageType dict → URL, but only when a browser can load it directly
 *  (proxied-only images need MA's image proxy and stay null). */
function remotelyAccessibleImage(raw: unknown): string | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const img = raw as Record<string, unknown>;
  return img['remotely_accessible'] === true && typeof img['path'] === 'string' ? img['path'] : null;
}

/** Defensive parse of `player_queues/items` rows. */
export function parseMAFullQueueItems(rows: unknown): MAFullQueueItem[] {
  if (!Array.isArray(rows)) return [];
  const out: MAFullQueueItem[] = [];
  for (const raw of rows) {
    if (typeof raw !== 'object' || raw === null) continue;
    const it = raw as Record<string, unknown>;
    const id = typeof it['queue_item_id'] === 'string' ? it['queue_item_id'] : null;
    const media = typeof it['media_item'] === 'object' && it['media_item'] !== null
      ? (it['media_item'] as Record<string, unknown>)
      : {};
    const name = typeof it['name'] === 'string' && it['name'] !== '' ? it['name']
      : typeof media['name'] === 'string' ? media['name'] : null;
    if (id == null || name == null) continue;
    const artists = Array.isArray(media['artists'])
      ? (media['artists'] as unknown[])
          .map((a) => (typeof a === 'object' && a !== null ? (a as Record<string, unknown>)['name'] : null))
          .filter((n): n is string => typeof n === 'string')
      : [];
    const image = remotelyAccessibleImage(it['image']) ?? remotelyAccessibleImage(media['image']);
    out.push({
      queueItemId: id,
      name,
      artist: artists.length > 0 ? artists.join(', ') : null,
      image,
      durationSeconds: typeof it['duration'] === 'number' ? it['duration'] : null,
    });
  }
  return out;
}

/** Defensive parse of `player_queues/all` into per-queue artwork entries. */
export function parseMAQueuesArtwork(rows: unknown): MAQueueArtwork[] {
  if (!Array.isArray(rows)) return [];
  const out: MAQueueArtwork[] = [];
  for (const raw of rows) {
    if (typeof raw !== 'object' || raw === null) continue;
    const q = raw as Record<string, unknown>;
    const queueId = typeof q['queue_id'] === 'string' ? q['queue_id'] : null;
    if (queueId == null) continue;
    const current = typeof q['current_item'] === 'object' && q['current_item'] !== null
      ? (q['current_item'] as Record<string, unknown>)
      : null;
    if (current == null) continue;
    const media = typeof current['media_item'] === 'object' && current['media_item'] !== null
      ? (current['media_item'] as Record<string, unknown>)
      : {};
    const title = typeof current['name'] === 'string' ? current['name']
      : typeof media['name'] === 'string' ? media['name'] : null;
    out.push({
      queueId,
      title,
      image: remotelyAccessibleImage(current['image']) ?? remotelyAccessibleImage(media['image']),
    });
  }
  return out;
}
