/**
 * [fork] NVR route entry (`/nvr/*`) — the native Sentinel NVR integration.
 *
 * Everything lives in `src/nvr/` (API client, store, player, components, CSS);
 * this file only routes: the overview at `/nvr`, a camera's timeline at
 * `/nvr/:cameraId`. See docs/NVR-INTEGRATION.md for the architecture and how
 * to remove the whole feature again.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { NvrOverviewPage } from '../nvr/NvrOverviewPage';
import { NvrCameraPage } from '../nvr/NvrCameraPage';
import './Page.css';

export function Nvr() {
  return (
    <Routes>
      <Route index element={<NvrOverviewPage />} />
      <Route path=":cameraId" element={<NvrCameraPage />} />
      <Route path="*" element={<Navigate to="/nvr" replace />} />
    </Routes>
  );
}
