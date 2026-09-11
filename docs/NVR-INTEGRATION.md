# Sentinel NVR — native Integration in HAPulse

Stand: 2026-09-11. Ersetzt die frühere iframe-Einbettung der Sentinel-Web-UI
auf der NVR-Seite. Die Integration ist **bewusst als abgegrenztes Modul**
gebaut, damit sie sich (Sentinel ist in starker Entwicklung) jederzeit
**komplett entfernen und neu aufsetzen** lässt — siehe „Rausnehmen" unten.

Schnittstelle: `docs/API.md` im Sentinel-NVR-Repo (verbindlich). Sentinel
wurde für diese Integration **nicht** verändert (nur gelesen).

## Was es tut

| Oberfläche | Inhalt |
|---|---|
| **`/nvr`** (Übersicht) | Hero („Sentinel NVR" – Ereignisse heute, Kameras online, Aufnahme, Speicher, Aufbewahrung), Ereignis-Leiste (letzte 24 h, Objekt-Ausschnitte + Klassen-Badges), Kamera-Kacheln (Snapshot alle 5 s, Aufnahme-Punkt, Offline-Badge, „N heute · vor 5 min"), „Ereignisse pro Stunde", „Speicher & Aufbewahrung" (Meter + Prognose, dieselbe Rechnung wie Sentinels Status-Seite). |
| **`/nvr/:cameraId`** (Kamera) | 1:1-Port von Sentinels Zeitleisten-Seite: Bühne mit Live/Aufnahme-Video, Steuer-Pille (±15 s, Play/Pause, Tempo 1/2/4/8×), Stumm-Knopf, Snapshot/PiP/Vollbild; rechts Tabs Zeitleiste/Ereignisse, Klassenfilter, **vertikale Mehrtages-Zeitleiste** (Scroll = Scrub-Zeitraffer über `api/relay-rate`, Halten/Loslassen = Seek, Zoom, Live-Linie, Ereignis-Thumbnails), Datum-Chip + Datum/Uhrzeit-Dialog. Tastatur: Leertaste, ←/→ (±10 s, Shift 60 s), n/p Ereignis, l Live. Deep-Link `?at=<ms>&ev=<ts>`. |
| **Home-Karte** „Sentinel NVR" | Kamera-Snapshots + die letzten 4 Ereignisse; Tap → Kamera-Zeitleiste (am Ereignis). Section-ID `nvr` (Reorder/Hide/Resize wie andere Karten), erscheint nur bei konfigurierter Verbindung. |
| **Einrichtung** | Auf der NVR-Seite (Setup-Karte bzw. Zahnrad-Modal): Scrypted-URL + Zugriffs-Token, „Verbindung testen" (`api/stats`). Die alte Embed-URL mit `?token=` kann direkt eingefügt werden — der Token wird daraus übernommen. |

Wiedergabe-Pfade (aus Sentinels `PlayerController`, unverändert übernommen):
Live = WebRTC über WebSocket-Signaling (Trickle-ICE) → MJPEG-Fallback;
Aufnahme = WebRTC-**Relay** (server-seitiger Seek ohne Renegotiation,
Scrub-Zeitraffer in place, Watchdog über präsentierte Frames) → natives
`<video src=segment>`-Fallback. Client-Telemetrie geht wie bei Sentinels
eigener UI an `api/clientlog` (Serverlog `[client]`, erkennbar an `b:hapulse`).

## Architektur-Entscheid: Browser → Sentinel direkt (kein Backend)

`docs/API.md` empfiehlt ein HAPulse-**Backend** mit Header-Token. HAPulse ist
aber eine **statische SPA ohne Server** (nginx liefert nur Dateien, siehe
`docs/SELF-HOSTING.md`). Deshalb spricht der Browser den token-geschützten
`/public/`-Endpoint des Plugins **direkt** an — genau wie es die frühere
iframe-Einbettung mit `?token=` schon tat.

Konsequenzen:

- Das Token liegt in `customization.scryptedToken` — pro HA-Benutzer in
  Home Assistants `frontend/user_data` (wie `maToken` von Music Assistant
  im Upstream), nie anderswo. Es ist im Browser sichtbar (DevTools/URLs).
  Wer das nicht will, braucht einen kleinen Proxy (z. B. nginx-`location`
  mit `proxy_set_header x-sentinel-token`) — dann in `nvr/api.ts` die
  Basis-URL auf den Proxy zeigen lassen; alles andere bleibt gleich.
- **CORS** (Stand Sentinel `main.ts`): JSON-Antworten tragen
  `Access-Control-Allow-Origin: *` → normale `fetch`s mit `?token=` (keine
  Preflight). Die 204/404-**Steuer-Antworten** (`relay-seek`, `relay-rate`,
  `relay-scrub`, `webrtc-stop`, `clientlog`) tragen **keinen** CORS-Header →
  sie werden mit `mode: 'no-cors'` geschickt (Server führt aus, Antwort ist
  opak; „angekommen" gilt als Erfolg, tote Sessions erkennt der Watchdog
  über `relay-pos` wie bei Sentinel selbst). Bilder/Video laufen über
  `<img>`/`<video>` (kein CORS nötig). **MSE-Pfade** (`api/segment`,
  `api/livemse` per `fetch`) funktionieren cross-origin **nicht** und sind
  nur bei Same-Origin aktiv (`SentinelClient.corsMedia`).
- WebSocket-Signaling (`wss://…/public/?token=…&camera=…&signaling=1`) kennt
  keine CORS-Beschränkung — Live und Aufnahme per WebRTC laufen vollständig.
- Zertifikat: Scrypted nutzt ein selbstsigniertes Zertifikat. Es muss im
  Browser einmal akzeptiert werden (Setup-Hinweis), sonst blockt der Browser
  still. Läuft HAPulse über http, ist https zu Scrypted trotzdem erlaubt.

**Wünsche an Sentinel** (nicht umgesetzt, nur notiert — Sentinel bleibt
unverändert): `Access-Control-Allow-Origin: *` auch auf den 204-Antworten
und auf `api/segment`/`api/livemse` würde die Fallback-Pfade (MSE) auch
cross-origin freischalten und die opaken Steuer-Antworten lesbar machen.

## Dateien

### Neu (konfliktfrei beim Upstream-Merge)

| Datei | Zweck |
|---|---|
| `packages/core/src/sentinel.ts` | DOM-freies Datenmodell (Typen aus `API.md`), `parseSentinelSetup`, URL-Helfer, Ereignisklassen, `sentinelEventPlayTs`, `sentinelStorageForecast`, `sentinelClipRuns`, `sentinelMergeDays` — getestet in `packages/core/scripts/smoke.mjs` („sentinel nvr"). |
| `apps/dashboard/src/nvr/api.ts` | `SentinelClient` (URLs mit Token, JSON, `control()` no-cors, Signaling-URL, Medien-URL-Helfer). |
| `apps/dashboard/src/nvr/config.ts` | Verbindung aus den Settings ableiten (`useNvrConfig`, `getNvrConfig`). |
| `apps/dashboard/src/nvr/store.ts` | Übersichts-Store + gemeinsamer Poller (`useNvrOverview`). |
| `apps/dashboard/src/nvr/format.ts` | Intl-Formatierung (Zeit, Tag, relativ, Tage). |
| `apps/dashboard/src/nvr/paths.ts` | Routen-Helfer. |
| `apps/dashboard/src/nvr/player/{controller,webrtc,rlog}.ts` | Port von Sentinels `ui/src/player/*` (Client injiziert, Labels als i18n-Keys, MSE nur same-origin). |
| `apps/dashboard/src/nvr/components/*` | `ClassBadge`, `NvrHero` (+`StatTile`/`CardTitle`), `NvrEventsStrip`, `NvrCameraGrid`, `NvrStatsCards`, `NvrSetup` (Karte + Modal), `VerticalTimeline` (Port), `EventList`, `DatePickerModal`. |
| `apps/dashboard/src/nvr/NvrOverviewPage.tsx`, `NvrCameraPage.tsx`, `NvrHomeCard.tsx`, `nvr.css` | Seiten, Home-Karte, Styles (nur Tokens; `--nvr-c-*` auf HAPulse-Semantik gemappt). |
| `apps/dashboard/src/pages/Nvr.tsx` | Routen-Einstieg `/nvr/*` (Fork-Datei, war vorher die iframe-Seite). |
| `docs/NVR-INTEGRATION.md` | dieses Dokument |

### Geänderte Upstream-Dateien (alle Zeilen `[fork]`-markiert)

| Datei | Änderung |
|---|---|
| `packages/core/src/index.ts` | Export-Block `sentinel.js` |
| `packages/core/scripts/smoke.mjs` | Imports + Testblock „sentinel nvr" |
| `apps/dashboard/src/stores/settingsStore.ts` | `scryptedToken` (neben dem bestehenden `scryptedUrl`) |
| `apps/dashboard/src/app/Router.tsx` | Route `/nvr` → `/nvr/*` |
| `apps/dashboard/src/app/AppLayout.tsx` | Nav-Eintrag „NVR" (bestand schon) |
| `apps/dashboard/src/pages/Home.tsx` | Section `'nvr'` (Import, ID, Toggle-Keys, Gate, `renderWidget`) |
| `packages/core/locales/*.json` | `nvr.*`, `nav.nvr`, `home.section.*.nvr` in allen sieben Sprachen (am Dateiende) |

## Rausnehmen (komplett)

```bash
git rm -r apps/dashboard/src/nvr apps/dashboard/src/pages/Nvr.tsx packages/core/src/sentinel.ts docs/NVR-INTEGRATION.md
git grep -n "\[fork\]" -- apps/dashboard/src/pages/Home.tsx apps/dashboard/src/app/Router.tsx \
  apps/dashboard/src/app/AppLayout.tsx apps/dashboard/src/stores/settingsStore.ts \
  packages/core/src/index.ts packages/core/scripts/smoke.mjs   # NVR-Zeilen entfernen
# Locales: alle Keys nvr.*, nav.nvr, home.section.*.nvr aus packages/core/locales/*.json löschen
npm run typecheck && npm run build && npm test -w @hapulse/core
```

Danach ist HAPulse wieder ohne NVR (die Settings-Keys `scryptedUrl`/
`scryptedToken` in bestehenden HA-User-Daten stören nicht — `importSettings`
verwirft unbekannte Keys nicht, sie bleiben schlicht ungenutzt).

**Neu integrieren** = dieses Verzeichnis-Layout wieder anlegen; die
Schnittstelle bleibt `API.md`. Bei API-Änderungen in Sentinel zuerst
`packages/core/src/sentinel.ts` (Typen) und `nvr/api.ts` (Routen) anpassen.

## Prüfen

```bash
npm run typecheck && npm run build && npm test -w @hapulse/core
```

Manuell (echte Kamera): NVR-Seite → Setup (Scrypted-URL + Token) → „Verbindung
testen" → Kachel öffnen → Live (WebRTC), Ereignis-Klick → Aufnahme via Relay,
Scrollen in der Zeitleiste → Zeitraffer, `l` → Live. Auf dem Handy zuerst das
Serverlog von Sentinel lesen (`[client]`-Zeilen mit `b:hapulse`).
