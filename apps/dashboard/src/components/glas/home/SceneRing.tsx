/**
 * [fork] The ring around the circle of the active scene in Glas (docs/GLAS-DESIGN.md §7.7, plan
 * docs/glas/PLAN-ETAPPE-4.md K83): 46 × 46, r 20, stroke 2.5 in the scene colour. On the phone it stays; on the
 * desktop it only sweeps once when the scene is tapped (like the sketches). The sweep is CSS on the tile's
 * `data-swept` (styles/glas/home-cards.css); `pathLength` 100 keeps the dash the same at either size.
 */

import React from 'react';

export function SceneRing() {
  return (
    <svg className="g-scene-ring" viewBox="0 0 46 46" aria-hidden="true" focusable="false">
      <circle cx="23" cy="23" r="20" pathLength={100} />
    </svg>
  );
}
