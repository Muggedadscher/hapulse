# Roadmap: native Kamera-Integration im HAPulse-Stil

> **Trigger:** Wenn der User sinngemäß sagt „**mach es**" / „mach die native
> Integration", ist **dieser Plan** gemeint. Dann Schritt für Schritt umsetzen
> wie unten, mit denselben Fork-Konventionen (`docs/SYNC.md`): neue Dateien
> bevorzugen, Änderungen an Upstream-Dateien minimal + mit `// [fork]`-Marker.

## Ziel

Live-Kameras **direkt in HAPulse**, im gleichen Look wie der Rest — zusätzlich
zur bereits gebauten NVR-Embed-Seite:

1. **Klick auf eine Kamera-Kachel** (Security-Seite / Room / CameraCard) öffnet
   ein Modal mit **Live-Stream** (statt nur dem 10-s-Snapshot).
2. Optional: ausgewählte Kameras **inline live** statt Snapshot.
3. Funktioniert für **jede HA-Kamera** — nicht nur Scrypted.

## Wichtige Voraussetzung (dem User sagen, bevor es losgeht)

Aktuell sind **Scrypteds Kameras NICHT als HA-Entities gebridged** (in der HA
des Users gibt es nur `camera.fire_tablet_wohnzimmer_fully`). Für die native
Integration müssen die Scrypted-Cams zuerst als `camera.*`-Entities in HA
erscheinen:

- In Scrypted das **„Home Assistant"-Plugin** aktivieren (exportiert Kameras
  nach HA), **oder** Kameras via **go2rtc / WebRTC** in HA einbinden.
- Danach tauchen sie automatisch in HAPulses vorhandener `CameraGrid` auf
  (Snapshots) — und dieser Plan macht sie live.

Solange nichts gebridged ist, bleibt die **NVR-Embed-Seite** (bereits gebaut)
der Weg, um Scrypted zu sehen. Beide können koexistieren.

## Streaming-Ansatz

Home Assistant liefert Live-Streams auf zwei Wegen:

| Weg | WS-Command | Latenz | Aufwand | Deps |
|---|---|---|---|---|
| **HLS** (empfohlen als Start) | `camera/stream` → gibt `{ url: ".m3u8" }` | ~2–8 s | gering | `hls.js` (Chrome/FF); Safari/iOS nativ |
| **WebRTC** (Upgrade) | `camera/webrtc/offer` (neuere Cores) bzw. `camera/web_rtc_offer` | <1 s | höher (SDP/ICE) | **keine** (Browser-`RTCPeerConnection`) |

**Empfehlung:** Mit **HLS** starten (breite Kompatibilität, wenig Code). Für
Scrypted-Cams, die WebRTC gut können, später WebRTC als Low-Latency-Pfad
nachrüsten. Snapshot bleibt immer der Fallback (Laden/Fehler).

`hls.js` ist die **einzige** neue Runtime-Dependency — bewusst abwägen; Safari
braucht sie nicht (natives HLS in `<video>`). Alternativ komplett dep-frei über
WebRTC gehen, dann aber mehr Signaling-Code.

## Konkrete Umsetzung

### Core (`packages/core`) — neue Datei `camera.ts` + kleine Ergänzung

- `packages/core/src/camera.ts` (**neu**):
  - Typen: `CameraStreamSource { url: string; format: 'hls' }`.
  - (bei WebRTC später: Offer/Answer-Typen.)
- `connection.ts` (**edit, `[fork]`**): Methode
  ```ts
  async fetchCameraStream(entityId: string): Promise<string> {
    const r = await this.#conn.sendMessagePromise<{ url: string }>({
      type: 'camera/stream', entity_id: entityId, format: 'hls',
    });
    return r.url; // relativer Pfad, mit HA-Base-URL zusammensetzen
  }
  ```
  (WebRTC-Upgrade: `camera/webrtc/offer` mit SDP.)
- `index.ts` (**edit, `[fork]`**): camera-Typen exportieren.

### Dashboard

- `apps/dashboard/src/ha/camera.ts` (**neu**): Facade `getCameraStreamUrl(entityId)`
  — live über `getLiveConnection()`, Demo → null (Snapshot/Placeholder zeigen).
  URL mit `useConnectionStore.url` zu absoluter URL zusammensetzen (analog
  `resolveEntityPicture` in `lib/media.ts`).
- `apps/dashboard/src/components/security/CameraLiveModal.tsx` (**neu**):
  - Nutzt `Modal` (`modal-panel--wide`), Titel = Kameraname, Icon `Cctv`.
  - `<video autoplay muted playsinline>`; HLS via `hls.js` laden, sonst
    `video.src = url` (Safari). Beim Laden Snapshot als Poster/Overlay,
    bei Fehler auf Snapshot zurückfallen.
  - Aufräumen: `hls.destroy()` / `video.src=''` beim Schließen.
  - CSS `CameraLiveModal.css` mit Design-Tokens (Card/Radius/Shadow).
- `CameraGrid.tsx` + `cards/CameraCard.tsx` (**edit, `[fork]`**):
  - `CameraTile`/`CameraCard` klickbar machen (`role="button"`, `tabIndex`,
    `onClick`, `onKeyDown` Enter/Space) → öffnet `CameraLiveModal`.
  - Muster exakt wie bei `SensorTile` → `HistoryModal` (schon umgesetzt).

### Stil / UX

- Alles über CSS-Variablen, keine Hex-Werte (siehe `docs/DESIGN.md`).
- Motion: `prefers-reduced-motion` respektieren; Modal nutzt bestehende
  Animationen.
- Mobile: Modal wird zur Bottom-Sheet (schon im `Modal`-Primitive).
- Motion-Badge / Raum-Label wie in `CameraGrid` beibehalten.

### Demo-Modus

- Kein echter Stream → Snapshot/Placeholder weiter zeigen, Modal zeigt einen
  „Live in demo not available"-Hinweis (im Stil der übrigen Empty-States).

### Tests / Checks vor Push

- `npm run typecheck && npm run build && npm test -w @hapulse/core`.
- Manuell: eine echte HA-Kamera live im Modal; Fallback auf Snapshot bei
  Fehler; Cleanup beim Schließen (kein weiterlaufender Stream/Netz).

## Offene Entscheidungen (beim „mach es" kurz mit User klären)

1. **HLS zuerst (mit `hls.js`)** oder gleich **WebRTC (dep-frei, mehr Code)**?
   → Default-Empfehlung: HLS zuerst.
2. **Nur Klick→Modal**, oder auch **inline-live** für ausgewählte Kameras?
   → Default: erst Klick→Modal, inline optional danach.
3. Scrypted-Cams schon nach HA gebridged? Wenn nein, zuerst Bridging (s. o.).
