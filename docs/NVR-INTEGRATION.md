# Sentinel NVR — native Integration in HAPulse

Stand: 2026-09-26 (Paket `@sentinel-nvr/web` 0.11). Ersetzt die frühere iframe-Einbettung der Sentinel-Web-UI
auf der NVR-Seite. Die Integration ist **bewusst als abgegrenztes Modul**
gebaut, damit sie sich (Sentinel ist in starker Entwicklung) jederzeit
**komplett entfernen und neu aufsetzen** lässt — siehe „Rausnehmen" unten.

Schnittstelle: `docs/API.md` im Sentinel-NVR-Repo (verbindlich). **Benötigt
Sentinel ≥ `567c8a0`** (CORS auf jeder Antwort + Preflight, 2026-09-12); ältere
Builds laufen mit Einschränkungen (siehe CORS unten). Sentinel wurde von der
HAPulse-Seite aus nicht verändert (nur gelesen).

## Was es tut

| Oberfläche | Inhalt |
|---|---|
| **`/nvr`** (Übersicht) | Hero („Sentinel NVR" – Ereignisse heute, Kameras online, Aufnahme, Speicher, Aufbewahrung), Ereignis-Leiste (letzte 24 h, Objekt-Ausschnitte + Klassen-Badges), Kamera-Kacheln (Snapshot alle 5 s, Aufnahme-Punkt, Offline-Badge, „N heute · vor 5 min"), „Ereignisse pro Stunde", „Speicher & Aufbewahrung" (Meter + Prognose, dieselbe Rechnung wie Sentinels Status-Seite). |
| **`/nvr/:cameraId`** (Kamera) | 1:1-Port von Sentinels Zeitleisten-Seite: Bühne mit Live/Aufnahme-Video, Steuer-Pille (±15 s, Play/Pause, Tempo 1/2/4/8×), Stumm-Knopf, Snapshot/PiP/Vollbild; rechts Tabs Zeitleiste/Ereignisse, Klassenfilter, **vertikale Mehrtages-Zeitleiste** (Scroll = Scrub-Zeitraffer über `api/relay-rate`, Halten/Loslassen = Seek, Zoom, Live-Linie, Ereignis-Thumbnails), Datum-Chip + Datum/Uhrzeit-Dialog. Tastatur: Leertaste, ←/→ (±10 s, Shift 60 s), n/p Ereignis, l Live. Deep-Link `?at=<ms>&ev=<ts>`. |
| **Sicherheits-Seite**, Sektion „Sentinel NVR" | Kamera-Kacheln + Ereignis-Leiste des NVR direkt unter Home Assistants eigener Kamera-Sektion (Section-ID `nvr`, volle Breite, Reorder/Hide/Resize wie die übrigen Sektionen). Erscheint nur bei konfigurierter Verbindung; ein NVR allein reicht, damit die Seite nicht leer ist. |
| **Home-Karte** „Sentinel NVR" | Kamera-Snapshots + die letzten 4 Ereignisse; Tap → Kamera-Zeitleiste (am Ereignis). Section-ID `nvr` (Reorder/Hide/Resize wie andere Karten), erscheint nur bei konfigurierter Verbindung. |
| **Einrichtung** | Auf der NVR-Seite (Setup-Karte bzw. Zahnrad-Modal, Enter speichert): Scrypted-URL + entweder Zugriffs-Token **oder** Anmeldung mit einem Scrypted-**Administrator**-Konto (Login-Tausch `api/token-exchange` → das Plugin gibt sein Token heraus; eingeschränkte Scrypted-Konten bekommen 403, Plugin ≥ 2026-09-26). „Verbindung testen" (`api/stats`). Die alte Embed-URL mit `?token=` kann direkt eingefügt werden — ihr Token ersetzt den Inhalt des Token-Felds. Hinter einem Reverse-Proxy mit Pfad-Präfix die volle Plugin-URL einfügen (`https://proxy/scrypted/endpoint/@local/sentinel-nvr/public/`): der Präfix vor `/endpoint/` bleibt erhalten. |

Wiedergabe-Pfade (aus Sentinels `PlayerController`, unverändert übernommen):
Live = WebRTC über WebSocket-Signaling (Trickle-ICE) → Live-MSE (fMP4) →
MJPEG; Aufnahme = WebRTC-**Relay** (server-seitiger Seek ohne Renegotiation,
Scrub-Zeitraffer in place, Watchdog über präsentierte Frames) → MSE
(progressive Segmente, Trick-Play) → natives `<video src=segment>`. Client-Telemetrie geht wie bei Sentinels
eigener UI an `api/clientlog` (Serverlog `[client]`, erkennbar an `b:hapulse`).

## Architektur-Entscheid: Browser → Sentinel direkt (kein Backend)

`docs/API.md` empfiehlt ein HAPulse-**Backend** mit Header-Token. HAPulse ist
aber eine **statische SPA ohne Server** (nginx liefert nur Dateien, siehe
`docs/SELF-HOSTING.md`). Deshalb spricht der Browser den token-geschützten
`/public/`-Endpoint des Plugins **direkt** an — genau wie es die frühere
iframe-Einbettung mit `?token=` schon tat.

Konsequenzen:

- Das Token liegt in `customization.scryptedToken` — **gerätelokal** (localStorage dieses Browsers). Export und der
  HA-Settings-Sync (`frontend/user_data`) tragen es nie (`exportSettings` entfernt es, ebenso einen `?token=` in der
  URL); ein importierter Snapshot, der auf einen **anderen** Server zeigt, übernimmt das Token dieses Geräts nicht
  (`stores/settingsSecrets.ts`). Es ist im Browser sichtbar (DevTools/URLs). Wer das nicht will, setzt einen kleinen
  Proxy davor (z. B. nginx-`location` mit `proxy_set_header x-sentinel-token`) und trägt dessen URL (mit Pfad-Präfix)
  als Scrypted-URL ein — `nvr/config.ts` baut den Client mit diesem Präfix (`clientFor(origin, token, prefix)`).
- **CORS** (Sentinel ≥ `567c8a0`): *jede* Antwort trägt
  `Access-Control-Allow-Origin: *` — JSON, die 204-Steuerantworten
  (`relay-seek`, `relay-rate`, `relay-scrub`, `webrtc-stop`, `clientlog`),
  `api/segment` inkl. `206`, `api/livemse`, Bilder, Fehler — und `OPTIONS`
  wird beantwortet. Der Client schickt deshalb überall normale `fetch`s mit
  `?token=` (kein Preflight nötig, kein `no-cors`), liest die Statuscodes der
  Steuerantworten (404 = Session weg) und lädt Bild/Video mit
  `crossOrigin="anonymous"` (Freeze-Canvas bleibt sauber → Schnappschuss-
  Download funktioniert auch im MJPEG-/Segment-Fallback). Die **MSE-Pfade**
  (Live-MSE, Aufnahme-MSE) sind damit auch cross-origin aktiv.
  **Ältere Sentinel-Builds** (CORS nur auf JSON) degradieren sauber:
  `control()` wertet eine nicht lesbare Antwort als „zugestellt" (wie
  Sentinels eigener Client), MSE-Fetches scheitern in den nächsten Fallback
  (MJPEG bzw. natives `<video src>`); nur `crossOrigin`-Bilder würden dort
  nicht laden → im Zweifel Sentinel aktualisieren.
- WebSocket-Signaling (`wss://…/public/?token=…&camera=…&signaling=1`) kennt
  keine CORS-Beschränkung — Live und Aufnahme per WebRTC laufen vollständig.
- Zertifikat: Scrypted nutzt ein selbstsigniertes Zertifikat. Es muss im
  Browser einmal akzeptiert werden (Setup-Hinweis), sonst blockt der Browser
  still. Läuft HAPulse über http, ist https zu Scrypted trotzdem erlaubt.

Die beiden ursprünglichen Wünsche an Sentinel (CORS auf 204-Antworten und
auf `api/segment`/`api/livemse`) sind dort seit `567c8a0` umgesetzt; der
Client nutzt sie wie oben beschrieben.

## Kameraquelle (seit 26.09.2026)

Sobald Sentinel **nutzbar** ist — URL **und** Token (`nvrUsable`, `nvr/config.ts`) —
kommt in HAPulse **alles** Kamerabezogene aus Sentinel (`nvr/cameraSource.ts`):

- **Sicherheit:** HAs Kamera-Sektion (`CameraGrid`) entfällt, die NVR-Sektion bleibt.
  Kamerazähler in der Hero-Karte und in der Home-Karte „Sicherheit“ zählen
  Sentinels Kameras (online = „aktiv“).
- **Räume:** `camera.*` fehlen; stattdessen Sektion „Kameras“ (`nvrCameras`,
  `nvr/NvrRoomCameras.tsx`) mit den Sentinel-Kameras, die ein Admin dem Bereich
  zugeordnet hat (NVR-Seite → Kopfzeile „Kameras den Räumen zuordnen“,
  `customization.nvrCameraRooms`, Vorschlag nach Namen). Nicht zugeordnete
  Kameras erscheinen nur auf NVR-Seite und in der Sicherheits-Sektion.
- **Favoriten, Geräte:** `camera.*` ausgeblendet. Detailfenster einer
  `camera.*` (z. B. aus dem Logbuch): Hinweis + Knopf zum NVR statt HA-MJPEG.
  Die Admin-Entity-Liste in den Einstellungen bleibt vollständig.
- Entschieden wird nach **Konfiguration**, nicht nach Erreichbarkeit: ist
  Sentinel offline, zeigt HAPulse Sentinels Offline-Zustand, kein Zurückkippen
  auf HA-Kameras. URL ohne Token (Admin teilt den Zugang nicht) → Quelle HA,
  NVR-Karte/-Sektion ausgeblendet.
- Last: Raumseiten und Zähler pollen nur `api/cameras` (30 s, Scope `cameras`
  des gemeinsamen Pollers, `nvr/store.ts`); alle vier Übersichts-Endpunkte nur,
  solange eine NVR-Ansicht (`full`) offen ist.

## Abweichungen zu Sentinels eigener Web-UI

Die Spielmechanik (Player, Relay-Seek/Scrub, Watchdog, Zeitleiste) ist ein
1:1-Port. Abweichungen gibt es dort, wo HAPulse-Konventionen gelten oder wo
Sentinels UI eine eigenständige App ist:

| Bereich | Sentinel-UI | HAPulse |
|---|---|---|
| Shell | eigene Sidebar (Kameras / Zeitleiste / Status), Hell/Dunkel-Schalter + Uhr im Fuß, auf der Zeitleisten-Seite ein 64-px-Icon-Rail ohne Breitenkappe, `?embed=1`-Modus | HAPulse-Shell (Sidebar/Tab-Bar, „NVR“ ist ein Nav-Eintrag), kein Rail — die Bühne bekommt die Content-Breite der Seite (Shell-Maximum 1400 px, dadurch etwas kleiner als bei Sentinel), Theme = HAPulse-Theme (alle vier Identities + Akzent-Hue statt nur `aurora`), kein eigener Theme-Schalter, keine Uhr, kein Embed-Modus |
| Seiten | drei Seiten: Home (Ereignisleiste + Kameragrid), Zeitleiste, Status | zwei Routen: **Übersicht** = Home **und** Status in einer Seite (Hero oben, dann Ereignisse, Kameras, Histogramm/Speicher), **Kamera** = Zeitleiste. Zusätzlich Home-Karte und Sicherheits-Sektion, die Sentinel nicht hat |
| Kopfzeile | Zeitleisten-Seite mobil ohne Seitentitel (Name + Zurück in der Bühnen-Leiste) | HAPulse-Seitenkopf auf allen Breiten (Zurück-Chevron + Kameraname, „Sentinel öffnen“, Glocke/Avatar mobil); der Zurück-Knopf in der Bühnen-Leiste entfällt |
| Einrichtung | keine (URL trägt Token bzw. Scrypted-Login) | Setup-Karte / Zahnrad-Modal mit Scrypted-URL, Token und Verbindungstest; Fehler-/Stale-Zustände, 10-s-Request-Timeout |
| Kamera-Kacheln | Name als Text mit Schatten auf dem Bild, roter Punkt, Meta-Text | Name und Meta in Blur-Pills, **Offline-Badge** (neu), Fallback Snapshot → Segment-Thumbnail → Platzhalter, HAPulse-Card-Radius/-Schatten |
| Klassen-Badges | Buchstaben-Glyphen (P/F/Z/T/K/M) in NVR-eigenen Farben `--c-*` | Lucide-Icons (Person/Auto/Rad/Pfote/Paket/Aktivität), Farben auf HAPulse-Semantik gemappt (Person = info, Fahrzeug = accent, Zweirad = info/danger-Mix, Tier = positive, Paket = warning, Bewegung = text-faint); Aufnahmeband = info-Mix statt `--rec` |
| Sprache/Format | Deutsch fest verdrahtet, Datum „Fr. 11.09.“ | sieben Sprachen, Datum/Zeit per `Intl` (z. B. „Fr., 11. Sept.“), Pluralformen |
| Zeitleiste | — | identisch (Playhead 35 %, Lineal, Thumbnails, Live-Linie, Zoom, Datum-Chip); Filter-Chips zeigen Icon-Badges, Chip-Pfeile sind Lucide-Chevrons |
| Datum/Uhrzeit-Dialog | eigenes Overlay | HAPulse-`Modal` (mobil Bottom-Sheet), Monats-/Wochentagsnamen per `Intl`, Tage vor der Aufbewahrungsgrenze sind auch im Kalender gesperrt (Sentinel sperrt nur die Chip-Pfeile) |
| Histogramm | 24 Balken | gleich, zusätzlich ist die **aktuelle Stunde** hervorgehoben |
| Status-Labels | „Live …“, „Wiedergabe“, „Spule“ … | dieselben Zustände, übersetzt (`nvr.player.*`) |
| Mobil-Zeitleiste | Dokument-Scroll ist gesperrt (`html.lock`), nur die Zeitleisten-Spalte scrollt | **nicht gesperrt** — die HAPulse-Seite bleibt scrollbar (die Zeitleiste scrollt intern mit `overscroll-behavior: contain`). Läuft eine Geste am Spaltenende aus, kann die Seite mitscrollen; bewusst so gelassen, weil ein globaler Scroll-Lock die HAPulse-Shell beträfe |
| Telemetrie | `b:<build-id>` | `b:hapulse` (so sind Zeilen der Integration im Sentinel-Serverlog unterscheidbar), Nutzlast unter `d:` wie bei Sentinel |
| Nicht übernommen | Anmeldeseite, iOS-Homescreen-Meta, `/status`-Route, Theme-Schalter, Uhr, Embed-Modus | (HAPulse liefert das selbst; Menschen öffnen Sentinels UI über „Sentinel öffnen“) |

## Dateien

### Neu (konfliktfrei beim Upstream-Merge)

| Datei | Zweck |
|---|---|
| npm `@sentinel-nvr/web/api` | DOM-freies Datenmodell (Typen aus `API.md`), `parseSentinelSetup`, URL-Helfer, Ereignisklassen, `sentinelEventPlayTs`, `sentinelStorageForecast`, `sentinelClipRuns`, `sentinelMergeDays`, Intl-Formatierer und der `SentinelClient` — gemeinsames Paket (Repo `Muggedadscher/sentinel-nvr-web`, dort getestet). `nvr/api.ts`/`nvr/format.ts` re-exportieren nur. |
| `apps/dashboard/src/nvr/api.ts` | re-exportiert `SentinelClient`, `SentinelHttpError` usw. aus dem Paket. |
| `apps/dashboard/src/nvr/config.ts` | Verbindung aus den Settings ableiten (`useNvrConfig`, `getNvrConfig`), Client inkl. Proxy-Präfix (`clientFor`, `storedNvrUrl`). |
| `apps/dashboard/src/nvr/store.ts` | Übersichts-Store + gemeinsamer Poller (`useNvrOverview`); 401/403 schaltet auf Fehler (keine alten Daten als aktuell), das Histogramm ist optional. |
| `apps/dashboard/src/nvr/format.ts` | Intl-Formatierung (Zeit, Tag, relativ, Tage). |
| `apps/dashboard/src/nvr/paths.ts` | Routen-Helfer. |
| npm `@sentinel-nvr/web/ui` | React-Komponenten (die komplette **Kameraseite** `CameraPage` + Kopfzeile `CameraTitle`, Hero/Stats, Ereignisleiste, Kamerakacheln, Ereignisliste, vertikale Zeitleiste, Datumswahl, `AppearanceSection`), `SentinelUiProvider` (Client, `t`, Locale, Navigation), Themes und die `nvr.*`-Wörterbücher; Styles `@sentinel-nvr/web/ui/ui.css`. Host-Wrapper: `nvr/ui.tsx`. |
| npm `@sentinel-nvr/web/player` | `PlayerController`/`WebRtcSession`/`rlog` aus dem gemeinsamen Paket (Client injiziert, Labels als i18n-Keys, `storagePrefix`/`brand` als Host-Nähte). |
| `apps/dashboard/src/nvr/components/*` | nur noch `NvrSetup` (Karte + Modal) und `DatePickerModal` — alle übrigen Komponenten kommen aus `@sentinel-nvr/web/ui`. |
| `apps/dashboard/src/stores/settingsSecrets.ts` | gerätelokale Tokens: Origin-Bindung beim Import, `?token=`-Migration aus der URL. |
| `apps/dashboard/src/nvr/NvrOverviewPage.tsx`, `NvrCameraPage.tsx`, `NvrHomeCard.tsx`, `NvrSecuritySection.tsx`, `nvr.css` | Seiten, Home-Karte, Styles (nur Tokens). `NvrCameraPage` ist seit 0.4.0 nur ein Wrapper um `CameraPage` (Routing, Kopfzeile mit Sentinel-Link, Modal um die Datumswahl); die Kameraseiten-Styles kommen aus dem Paket, `nvr.css` hält nur noch Setup/Home/Security. |
| `apps/dashboard/src/pages/Nvr.tsx` | Routen-Einstieg `/nvr/*` (Fork-Datei, war vorher die iframe-Seite). |
| `docs/NVR-INTEGRATION.md` | dieses Dokument |

### Geänderte Upstream-Dateien (alle Zeilen `[fork]`-markiert)

| Datei | Änderung |
|---|---|
| `packages/core/src/index.ts` | nur noch ein Hinweis-Kommentar (das Modell liegt im Paket) |
| `apps/dashboard/src/stores/settingsStore.ts` | `scryptedToken` (neben dem bestehenden `scryptedUrl`), Tokens aus Export/Sync entfernt, `keepDeviceSecrets`/`migrateUrlToken` |
| `apps/dashboard/src/app/Router.tsx` | Route `/nvr` → `/nvr/*` |
| `apps/dashboard/src/app/AppLayout.tsx` | Nav-Eintrag „NVR" (bestand schon) |
| `apps/dashboard/src/pages/Home.tsx` | Section `'nvr'` (Import, ID, Toggle-Keys, Gate, `renderWidget`) |
| `apps/dashboard/src/pages/Security.tsx` | Section `'nvr'` (Import, ID, Toggle-Keys, Span 4, Gate, Empty-State-Bedingung, `renderWidget`) |
| `packages/core/locales/*.json` | `nvr.*`, `nav.nvr`, `home.section.*.nvr`, `security.section.*.nvr` in allen sieben Sprachen (am Dateiende) |

## Rausnehmen (komplett)

```bash
git rm -r apps/dashboard/src/nvr apps/dashboard/src/pages/Nvr.tsx docs/NVR-INTEGRATION.md   # + Dependency @sentinel-nvr/web aus apps/dashboard/package.json
git grep -n "\[fork\]" -- apps/dashboard/src/pages/Home.tsx apps/dashboard/src/pages/Security.tsx apps/dashboard/src/app/Router.tsx \
  apps/dashboard/src/app/AppLayout.tsx apps/dashboard/src/stores/settingsStore.ts \
  packages/core/src/index.ts   # NVR-Zeilen entfernen (settingsSecrets.ts bleibt: gilt auch für Music Assistant)
# Locales: alle Keys nvr.*, nav.nvr, home.section.*.nvr, security.section.*.nvr aus packages/core/locales/*.json löschen
npm run typecheck && npm run build && npm test -w @hapulse/core
```

Danach ist HAPulse wieder ohne NVR (die Settings-Keys `scryptedUrl`/
`scryptedToken` in bestehenden HA-User-Daten stören nicht — `importSettings`
verwirft unbekannte Keys nicht, sie bleiben schlicht ungenutzt).

**Neu integrieren** = dieses Verzeichnis-Layout wieder anlegen; die
Schnittstelle bleibt `API.md`. Bei API-Änderungen in Sentinel zuerst
das Paket `@sentinel-nvr/web` (Typen + Client) versionieren und die Dependency anheben.

**Server-Stand:** das Paket ab 0.7 setzt neuere Relay-Endpunkte des Sentinel-Plugins voraus (Tabelle „Server
compatibility" im README von `sentinel-nvr-web`): 0.7 Scrub nach Ziel (`relay-target`), 0.8 Sprünge mit Standbild
(`relay-seek&mark=1`), 0.9 Tempo an Ort und Stelle (`relay-speed`), 0.10 Kalendertage statt ±24 h (Zeitumstellung), 0.11
Robustheit (Tempo übersteht neue Sessions, Timeouts, Live-Watchdog, Speicher-Warnung aus `stats.storageOk`). Ältere Server
funktionieren weiter, nur ohne diese Verbesserungen. Stand 26.09.2026: Paket 0.11.0, Plugin-`main` passend.

## Prüfen

```bash
npm run typecheck && npm run build && npm test -w @hapulse/core
```

Manuell (echte Kamera): NVR-Seite → Setup (Scrypted-URL + Token) → „Verbindung
testen" → Kachel öffnen → Live (WebRTC), Ereignis-Klick → Aufnahme via Relay,
Scrollen in der Zeitleiste → Zeitraffer, `l` → Live. Auf dem Handy zuerst das
Serverlog von Sentinel lesen (`[client]`-Zeilen mit `b:hapulse`). Nützliche Zeilen: `swap` (`how`: `marker` = Standbild
beim ersten Frame der neuen Position aufgehoben, `timer` = Server ohne Markierung oder Tempowechsel, `cap` = Sicherheitsnetz),
`cadence` (Stalls/Bildrate alle 30 s), `stall-snap`/`relay-recover` (Watchdog). Tempo 1/2/4/8× darf beim Umschalten weder
zurückspringen noch „Lädt …" zeigen.
