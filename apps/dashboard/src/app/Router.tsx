/**
 * Application router — react-router v7 library mode (BrowserRouter).
 */

import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router';
import { Guard } from './Guard';
import { AppLayout } from './AppLayout';

// Eager import for onboarding — always shown first
import { Onboarding } from '../pages/Onboarding';

// Lazy-load page stubs (each is a trivial component)
const Home        = lazy(() => import('../pages/Home').then((m) => ({ default: m.Home })));
const Room        = lazy(() => import('../pages/Room').then((m) => ({ default: m.Room })));
const Music       = lazy(() => import('../pages/Music').then((m) => ({ default: m.Music })));
const Security    = lazy(() => import('../pages/Security').then((m) => ({ default: m.Security })));
const Settings    = lazy(() => import('../pages/Settings').then((m) => ({ default: m.Settings })));
const Automations = lazy(() => import('../pages/Automations').then((m) => ({ default: m.Automations })));
const Scenes      = lazy(() => import('../pages/Scenes').then((m) => ({ default: m.Scenes })));
const System      = lazy(() => import('../pages/System').then((m) => ({ default: m.System })));
const Energy      = lazy(() => import('../pages/Energy').then((m) => ({ default: m.Energy })));
const Devices     = lazy(() => import('../pages/Devices').then((m) => ({ default: m.Devices })));
const Nvr         = lazy(() => import('../pages/Nvr').then((m) => ({ default: m.Nvr }))); // [fork]

/**
 * Resets scroll to the top on every route change. The app scrolls on the
 * window (the shell is min-height:100vh with no inner overflow container), so a
 * plain window.scrollTo is the correct reset.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Set scrollTop directly rather than window.scrollTo(): the app sets
    // `scroll-behavior: smooth` globally, which would otherwise animate the
    // reset on every navigation instead of jumping instantly to the top.
    const el = document.scrollingElement ?? document.documentElement;
    el.scrollTop = 0;
  }, [pathname]);
  return null;
}

function PageFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '40vh',
        color: 'var(--text-faint)',
        fontSize: '0.875rem',
      }}
    >
      loading…
    </div>
  );
}

export function AppRouter({ basename }: { basename?: string | undefined }) {
  return (
    <BrowserRouter {...(basename !== undefined ? { basename } : {})}>
      <ScrollToTop />
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />

        {/* All other routes are guarded and use AppLayout */}
        <Route
          path="/*"
          element={
            <Guard>
              <AppLayout>
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/room/:areaId" element={<Room />} />
                    <Route path="/music" element={<Music />} />
                    <Route path="/security" element={<Security />} />
                    <Route path="/nvr" element={<Nvr />} /> {/* [fork] */}
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/devices" element={<Devices />} />
                    <Route path="/automations" element={<Automations />} />
                    <Route path="/energy" element={<Energy />} />
                    <Route path="/scenes" element={<Scenes />} />
                    <Route path="/system" element={<System />} />
                  </Routes>
                </Suspense>
              </AppLayout>
            </Guard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
