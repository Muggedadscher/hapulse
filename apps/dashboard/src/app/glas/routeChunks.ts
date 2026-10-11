/**
 * [fork] Glas page changes (plan docs/glas/PLAN-ETAPPE-7.md K107): the page modules of Router.tsx by their first path
 * segment, so a transition can request the new page's chunk when the link is pressed instead of when React renders it.
 * The same modules as the `lazy()` calls in Router.tsx (the bundler hands both the same chunk; test/glasNavigate.test.ts
 * compares the two lists).
 */

const PAGES: Record<string, () => Promise<unknown>> = {
  '': () => import('../../pages/Home'),
  room: () => import('../../pages/Room'),
  music: () => import('../../pages/Music'),
  security: () => import('../../pages/Security'),
  nvr: () => import('../../pages/Nvr'),
  pool: () => import('../../pages/Pool'),
  settings: () => import('../../pages/Settings'),
  devices: () => import('../../pages/Devices'),
  automations: () => import('../../pages/Automations'),
  energy: () => import('../../pages/Energy'),
  scenes: () => import('../../pages/Scenes'),
  system: () => import('../../pages/System'),
};

/** Starts loading the page module of `pathname`. Never rejects: a failed load is left to the route's own `lazy()`
 *  (app/chunkReload.ts handles it there). */
export function preloadRoute(pathname: string): Promise<void> {
  const load = PAGES[pathname.split('/')[1] ?? ''];
  if (!load) return Promise.resolve();
  return load().then(
    () => undefined,
    () => undefined,
  );
}
