/**
 * [fork] Recovery from stale lazy chunks after a deploy.
 *
 * Every page is a lazy chunk (Router.tsx). A tab that was opened before a deploy
 * still references the old hashed file names; if one of them is gone, navigating
 * to that page throws. One reload picks up the new index.html. A second failure
 * within a minute is shown by the PageErrorBoundary instead of reloading in a loop.
 */

const KEY = 'hapulse:chunk-reload';
const WINDOW_MS = 60_000;

const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError/i;

export function isChunkLoadError(err: unknown): boolean {
  if (err instanceof Error) return CHUNK_ERROR_RE.test(`${err.name} ${err.message}`);
  return typeof err === 'string' && CHUNK_ERROR_RE.test(err);
}

type KV = Pick<Storage, 'getItem' | 'setItem'>;

function session(): KV | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Reloads the page unless it already did so within the last minute. Returns whether it reloads. */
export function reloadOnceForChunkError(
  now: number = Date.now(),
  store: KV | null = session(),
  reload: () => void = () => window.location.reload(),
): boolean {
  if (!store) return false;
  const last = Number(store.getItem(KEY) || 0);
  if (now - last < WINDOW_MS) return false;
  store.setItem(KEY, String(now));
  reload();
  return true;
}

/** Vite fires `vite:preloadError` when a dynamic import's dependencies fail to load. */
export function installChunkReload(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadOnceForChunkError()) event.preventDefault();
  });
}
