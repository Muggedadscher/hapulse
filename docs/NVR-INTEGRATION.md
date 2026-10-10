# Sentinel NVR — native Integration in HAPulse

Stand: 2026-10-10 (Paket `@sentinel-nvr/web` 0.18, Kameraseite im Stil Glas); Clip-Export 2026-10-06 (Paket 0.17),
Grundgerüst 2026-09-26 (Paket 0.11). Ersetzt die frühere iframe-Einbettung der Sentinel-Web-UI
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
| **Home-Karte** „Sentinel NVR" | Kamera-Snapshots (verkleinert, `w=640/960`; das geladene Bild meldet sie per `rememberTileSnapshot` → sofortiges Poster beim Öffnen der Kamera) + die letzten 4 Ereignisse; Tap → Kamera-Zeitleiste (am Ereignis). Section-ID `nvr` (Reorder/Hide/Resize wie andere Karten), erscheint nur bei konfigurierter Verbindung. |
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
  solange eine NVR-Ansicht (`full`) offen ist. Der Poller (`nvr/poller.ts`) hat
  EINEN Takt und EINEN Sichtbarkeits-Listener für alle Abonnenten; Abonnenten
  aus demselben Render teilen sich die erste Abfrage, und eine laufende Abfrage
  wird mitbenutzt (`full` deckt `cameras`). Startseite/Sicherheitsseite: 4 statt
  8 Anfragen bei der Rückkehr in den Tab.

## Abweichungen zu Sentinels eigener Web-UI

Die Spielmechanik (Player, Relay-Seek/Scrub, Watchdog, Zeitleiste) ist ein
1:1-Port. Abweichungen gibt es dort, wo HAPulse-Konventionen gelten oder wo
Sentinels UI eine eigenständige App ist:

| Bereich | Sentinel-UI | HAPulse |
|---|---|---|
| Shell | eigene Sidebar (Kameras / Zeitleiste / Status), Hell/Dunkel-Schalter + Uhr im Fuß, auf der Zeitleisten-Seite ein 64-px-Icon-Rail ohne Breitenkappe, `?embed=1`-Modus | HAPulse-Shell (Sidebar/Tab-Bar, „NVR“ ist ein Nav-Eintrag), kein Rail — die Bühne bekommt die Content-Breite der Seite (Shell-Maximum 1400 px, dadurch etwas kleiner als bei Sentinel), Theme = HAPulse-Theme (alle vier Identities + Akzent-Hue statt nur `aurora`), kein eigener Theme-Schalter, keine Uhr, kein Embed-Modus |
| Seiten | drei Seiten: Home (Ereignisleiste + Kameragrid), Zeitleiste, Status | zwei Routen: **Übersicht** = Home **und** Status in einer Seite (Hero oben, dann Ereignisse, Kameras, Histogramm/Speicher), **Kamera** = Zeitleiste. Zusätzlich Home-Karte und Sicherheits-Sektion, die Sentinel nicht hat |
| Kopfzeile | Zeitleisten-Seite mobil ohne Seitentitel (Name + Zurück in der Bühnen-Leiste) | HAPulse-Seitenkopf auf allen Breiten (Zurück-Chevron + Kameraname, „Sentinel öffnen“ an der Abspielposition (live ohne), Glocke/Avatar mobil); der Zurück-Knopf in der Bühnen-Leiste entfällt |
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

## Glas-Stil (Etappe 1 und 6, Oktober 2026)

Im zweiten HAPulse-Stil „Glas“ (`docs/GLAS-DESIGN.md`) bleiben alle NVR-Ansichten Paket-Code mit demselben Verhalten wie
in Klassisch und in Sentinels eigener UI. Plan, Abweichungen und Messwerte: `docs/glas/PLAN-ETAPPE-6.md`.

- **Kameraseite (Paket ≥ 0.18.0):** `NvrCameraPage` rendert `CameraPage` in Glas mit `appearance="immersive"` (README des
  Pakets, „Immersive appearance“), in Klassisch im Standard wie bisher. Unter 900 px gehört der Seite der Bildschirm: sie
  meldet sich über `useGlasImmersive` (`app/glas/useGlasImmersive.ts`, Zustand `immersive` in `stores/glasUiStore.ts`),
  `GlasRuntime` setzt daraus vor dem Zeichnen `data-g-immersive` an `:root`, und `styles/glas/shell.css` nimmt Tab-Leiste,
  Chip-Zeile und die Ränder von `.app-content`/`.app-main` weg; das Verbindungs-Banner schwebt oben über dem Bild. Ab
  900 px bleibt die Seitenleiste. Die Seite ist immer dunkel: solange sie offen ist, trägt die Inhaltsspalte
  `data-glas-scheme="dark"` (`AppLayout.tsx`, `[fork]`), und `applyAppearance` hält für diesen Teilbaum die
  Glas-Variablen des dunklen Modus bereit (`<style id="glas-dark-scope">`, `theme/glasAppearance.ts`); die Browserfarbe
  (`theme-color`) folgt. Seitenleiste, Fenster und Menüs bleiben im Modus des Geräts. Kopfzeile: `CameraTitle` mit `live`
  und `at` (Abzeichen LIVE bzw. Uhrzeit des Bilds) und „In Sentinel öffnen“ als runder `nvr-iconbtn`. Die Werte der
  Paket-Hooks (`--nvr-ctl-*` über dem Bild, `--nvr-float-*` über der Zeitleiste, `--nvr-seg-*`, `--nvr-live-*`,
  `--nvr-shade-top`/`--nvr-shade-bottom`, `--nvr-ease`/`--nvr-dur`) setzt `styles/glas/nvr.css`, deckend bei „Deckend“,
  „Transparenz reduzieren“ und mehr Kontrast. `useFitAboveTabs` ist in Glas aus (dort gibt es auf dieser Seite keine
  Tab-Leiste).
- **Übrige Ansichten:** Übersicht, Sicherheits-Sektion, Raum-Kameras, Einrichtung, das Fenster Datum/Uhrzeit und der
  Hinweis im Detail einer HA-Kamera bekommen den Glas-Look per CSS an den Klassen des Pakets und des NVR-Moduls
  (`styles/glas/nvr.css`, Akzentflächen in `accent.css`). Markup ändert sich nur an zwei Stellen: die Kopfaktionen der
  Übersicht sind in Glas Kreise 44 (`NvrOverviewPage.tsx`, Name auch als Tooltip, in beiden Stilen), und Token/Konto der
  Einrichtung ist in Glas ein `Segment` (`NvrSetup.tsx`). Die Home-Karte hat seit Etappe 4 einen eigenen Glas-Körper
  (`NvrHomeGlas.tsx`).
- **Wächter und Prüfungen:** Der Selektor-Wächter (`test/glasSelectors.test.ts`) prüft die Paket-Klassen gegen die
  `ui.css` des installierten Pakets; benennt ein Paket-Update eine davon um, wird `npm test -w @hapulse/dashboard` rot.
  Das Abzeichen „Aufnahme hängt“ einer Kachel erkennt Glas am Symbol `lucide-video-off` (`MARKER_ICONS` dort).
  `node apps/dashboard/scripts/glas-shots.cjs checks --serve apps/dashboard/dist --part nvr` prüft alle NVR-Ansichten
  beider Stile gegen ein nachgestelltes Sentinel (`scripts/glas-checks-nvr.cjs`, Adresse `192.0.2.10`, Playwright-Route;
  Bilder und Aufnahme-Segmente erzeugt es mit ffmpeg; ohne ffmpeg mit VP9 ist der Teil rot, `--no-media` überspringt ihn
  und meldet das). Echte Wiedergabe (Relay,
  Scrub, Ton, WebRTC) prüft der Klick-Test gegen ein echtes Sentinel mit dem Zusatz `glas` (unten).
- Sentinels eigene UI bekommt kein Glas; sie rendert die Kameraseite im Standard.

## Clip-Export (seit Paket 0.17.0, Oktober 2026)

„Clip herunterladen“ ist komplett Paket-Code (`CameraPage`, Clip-Leiste, Band `.vclip` auf der Zeitleiste) und sieht in
HAPulse und Sentinel gleich aus. HAPulse liefert nur die Texte `nvr.clip.*` (27 Schlüssel, alle 7 Locales;
`test/nvrLocales.test.ts` meldet fehlende) und die Paketversion. Verbindlich ist Sentinels `docs/API.md` (Abschnitt
„Clips exportieren“).

- **Einstieg:** Knopf „Clip herunterladen“ in der Info-Leiste (Bereich = laufendes Ereignis, sonst Position ±30 s, live
  die letzten 60 s) und ein Download-Knopf je Zeile der Ereignisliste (Ereignis ±5 s). Beides schaltet auf den Reiter
  „Zeitleiste“ in den **Clip-Modus**: Chips „Von“/„Bis“ unten in der Zeitleisten-Karte; Chip tippen, dann die Zeitleiste
  verschieben — die Abspiel-Linie setzt die Kante (nur Nutzer-Scrollen, nie das Mitlaufen der Wiedergabe). Höchstens
  30 min.
- **Fähigkeit:** Der Knopf erscheint nur, wenn `api/clips` `features: ["export"]` meldet. Mit einem älteren Sentinel
  fehlt er einfach — kein Klick, der erst mit einer Fehlermeldung endet.
- **Routen** (alle hinter dem Token, Antworten JSON, auch Fehler): `POST api/export?camera=&from=&to=&tz=` startet einen
  Auftrag (`202 {id, …, filename, gaps, clipped}`), `GET api/export-status?id=` liefert `state`/`progress`,
  `GET api/export-file?id=` die fertige MP4 (`+faststart`, Originalauflösung mit Ton, 15 min abholbar),
  `POST api/export-cancel?id=` bricht ab. Fehlercodes: 400 Bereich, 404 Kamera/keine Aufnahme/abgelaufen, 405 GET auf
  eine POST-Route, 409 Kamerawechsel im Bereich bzw. noch nicht fertig, 413 zu lang, 429 zwei Exporte laufen schon,
  503 Speicher, 507 kein Platz. Parameter und Token (`?token=`) stehen in der URL; CORS kommt wie überall von
  Sentinel (`Access-Control-Allow-Origin: *`), einen etwaigen Preflight (`OPTIONS`, z. B. bei `Content-Type:
  application/json`) beantwortet Sentinel vor der Auth.
- **Download cross-origin:** HAPulse läuft auf einer anderen Origin als Sentinel, deshalb wirkt das `download`-Attribut
  eines Links auf `api/export-file` nicht (Browser ignorieren es cross-origin). Den Download löst dort
  `Content-Disposition: attachment; filename="…"; filename*=UTF-8''…` der Antwort aus; den Dateinamen
  (`<Kamera>_<JJJJ-MM-TT>_<HH-MM-SS>.mp4`) liest der Client aus dem JSON, nicht aus dem Header (Sentinel nennt
  `Content-Disposition` trotzdem in `Access-Control-Expose-Headers`). Das Paket weiß über die schon vorhandene
  `crossOrigin`-Prop (`NvrCameraPage.tsx`), dass es diesen Weg nehmen muss. HAPulses nginx-Vorlage `docker/nginx.conf` setzt
  nur `frame-ancestors` als CSP, blockt also weder Blob- noch Cross-Origin-Downloads (CT 210 läuft mit System-nginx;
  wer dort eine strengere CSP setzt, muss `blob:` und den Sentinel-Ursprung erlauben).
- **iPhone/iPad:** In der Home-Bildschirm-App (`navigator.standalone`) und wenn `navigator.canShare({files})` geht, lädt
  die Clip-Leiste die Datei bis **100 MB** vorab als Blob („Wird geladen …“). „Teilen“ ruft `navigator.share({files})`
  dann synchron im Tipp auf (WebKit verlangt eine frische Nutzergeste; nach einem `await fetch` wäre sie verfallen) —
  z. B. „Video sichern“ in Fotos. „Speichern“ in der Home-Bildschirm-App geht über denselben Blob und `<a download>`
  (wie der Schnappschuss). Größer als 100 MB: Hinweis „Zu groß zum Teilen“ + „In Safari öffnen“ (`x-safari-https://`).
  Blob-URLs werden beim Schließen des Clip-Modus freigegeben. Ob Downloads in Home-Bildschirm-Apps auf echten Geräten
  gehen, ist erst mit dem iPhone-Test belegt.
- **Abbruch und Ablauf:** Clip-Modus schließen oder Kamera verlassen, während ein Auftrag läuft → `export-cancel`.
  Abgelaufene Datei (404) → Knopf „Neu erstellen“. Die Fortschrittsabfrage (700 ms) ruht im verborgenen Tab.
- Telemetrie: `[client]`-Zeile `clip` (`ms`, `bytes`, `w` = download|blob|share|safari, `standalone`, `ok`, `err`) mit
  `b:hapulse` im Sentinel-Serverlog.

## Dateien

### Neu (konfliktfrei beim Upstream-Merge)

| Datei | Zweck |
|---|---|
| npm `@sentinel-nvr/web/api` | DOM-freies Datenmodell (Typen aus `API.md`), `parseSentinelSetup`, URL-Helfer, Ereignisklassen, `sentinelEventPlayTs`, `sentinelStorageForecast`, `sentinelClipRuns`, `sentinelMergeDays`, Intl-Formatierer und der `SentinelClient` — gemeinsames Paket (Repo `Muggedadscher/sentinel-nvr-web`, dort getestet). `nvr/api.ts`/`nvr/format.ts` re-exportieren nur. |
| `apps/dashboard/src/nvr/api.ts` | re-exportiert `SentinelClient`, `SentinelHttpError` usw. aus dem Paket. |
| `apps/dashboard/src/nvr/config.ts` | Verbindung aus den Settings ableiten (`useNvrConfig`, `getNvrConfig`), Client inkl. Proxy-Präfix (`clientFor`, `storedNvrUrl`). |
| `apps/dashboard/src/nvr/store.ts` | Übersichts-Store + React-Hülle des gemeinsamen Pollers (`useNvrPolling`, `useNvrOverview`); 401/403 schaltet auf Fehler (keine alten Daten als aktuell), das Histogramm ist optional. Tests `test/nvrStore.test.ts`. |
| `apps/dashboard/src/nvr/poller.ts` | Kern des Pollers ohne React/DOM (Takt, Sichtbarkeit, laufende Abfragen mitbenutzen), Tests `test/nvrPoller.test.ts`. `config.ts`: `test/nvrConfig.test.ts`. |
| `apps/dashboard/src/nvr/format.ts` | Intl-Formatierung (Zeit, Tag, relativ, Tage). |
| `apps/dashboard/src/nvr/paths.ts` | Routen-Helfer. |
| npm `@sentinel-nvr/web/ui` | React-Komponenten (die komplette **Kameraseite** `CameraPage` + Kopfzeile `CameraTitle`, Hero/Stats, Ereignisleiste, Kamerakacheln, Ereignisliste, vertikale Zeitleiste, Datumswahl, `AppearanceSection`), `SentinelUiProvider` (Client, `t`, Locale, Navigation), Themes und die `nvr.*`-Wörterbücher; Styles `@sentinel-nvr/web/ui/ui.css`. Host-Wrapper: `nvr/ui.tsx`. |
| npm `@sentinel-nvr/web/player` | `PlayerController`/`WebRtcSession`/`rlog` aus dem gemeinsamen Paket (Client injiziert, Labels als i18n-Keys, `storagePrefix`/`brand` als Host-Nähte). |
| `apps/dashboard/src/nvr/components/*` | nur noch `NvrSetup` (Karte + Modal) und `DatePickerModal` — alle übrigen Komponenten kommen aus `@sentinel-nvr/web/ui`. |
| `apps/dashboard/src/stores/settingsSecrets.ts` | gerätelokale Tokens: Origin-Bindung beim Import, `?token=`-Migration aus der URL. |
| `apps/dashboard/src/nvr/NvrOverviewPage.tsx`, `NvrCameraPage.tsx`, `NvrHomeCard.tsx`, `NvrSecuritySection.tsx`, `useFitAboveTabs.ts`, `nvr.css` | Seiten, Home-Karte, Styles (nur Tokens; Glas-CSS in `styles/glas/nvr.css`, siehe „Glas-Stil“). `NvrCameraPage` ist seit 0.4.0 nur ein Wrapper um `CameraPage` (Routing, Kopfzeile mit Sentinel-Link, Modal um die Datumswahl); die Kameraseiten-Styles kommen aus dem Paket, `nvr.css` hält nur noch Setup/Home/Security und eine Ausnahme: mobil misst `useFitAboveTabs` den Platz vom Kameraseiten-Körper bis zur Tab-Leiste (`--nvr-cam-h`), weil HAPulse über der Seite noch die Chip-Zeile zeigt und die Paket-Höhe (für Sentinels eigene Seite gerechnet) sonst unter die Tab-Leiste reicht; in Glas aus. |
| `apps/dashboard/src/pages/Nvr.tsx` | Routen-Einstieg `/nvr/*` (Fork-Datei, war vorher die iframe-Seite). |
| `apps/dashboard/src/app/glas/useGlasImmersive.ts` | Glas (Etappe 6): die Kameraseite meldet sich als immersiv (`glasUiStore.immersive`); `GlasRuntime` setzt `data-g-immersive`, `AppLayout` den dunklen Teilbaum. |
| `apps/dashboard/scripts/glas-checks-nvr.cjs` | Glas (Etappe 6): nachgestelltes Sentinel, Szenen `nvr-*` und `checks --part nvr` für `glas-shots.cjs`. |
| `docs/NVR-INTEGRATION.md` | dieses Dokument |

### Geänderte Upstream-Dateien (alle Zeilen `[fork]`-markiert)

| Datei | Änderung |
|---|---|
| `packages/core/src/index.ts` | nur noch ein Hinweis-Kommentar (das Modell liegt im Paket) |
| `apps/dashboard/src/stores/settingsStore.ts` | `scryptedToken` (neben dem bestehenden `scryptedUrl`), Tokens aus Export/Sync entfernt, `keepDeviceSecrets`/`migrateUrlToken` |
| `apps/dashboard/src/app/Router.tsx` | Route `/nvr` → `/nvr/*` |
| `apps/dashboard/src/app/AppLayout.tsx` | Nav-Eintrag „NVR" (bestand schon); Glas: `data-glas-scheme="dark"` an `.app-content`, solange die Kameraseite offen ist |
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
# Stil Glas: styles/glas/nvr.css (+ Import in styles/glas/index.css) und scripts/glas-checks-nvr.cjs (+ require,
# Szenen und --part nvr in glas-shots.cjs) entfernen; NVR-Selektoren stehen auch in anderen Glas-Dateien
# (git grep -n nvr -- apps/dashboard/src/styles/glas: lists, material, controls, accent, home, edit, base, sheets …).
# Im Selektor-Wächter (test/glasSelectors.test.ts) den Eintrag für nvr.css und VideoOff in MARKER_ICONS entfernen;
# er liest sonst die ui.css des entfernten Pakets. useGlasImmersive, glasUiStore.immersive und data-glas-scheme
# bleiben dann ungenutzt.
npm run typecheck && npm run build && npm test -w @hapulse/core && npm test -w @hapulse/dashboard
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

## Klick-Test gegen ein echtes Sentinel

`apps/dashboard/scripts/nvr-sweep-test.cjs <hapulse-url> <sentinel-origin> <token> [mobile] [glas]` klickt die Integration mit
echten Mausereignissen durch (HA im Demo-Modus, Kameras aus einem echten Sentinel): Home-Karte (Kamera, Ereignis),
`/nvr` (Kachel, Ereignisleiste, Zurück), die komplette Kameraseite (Live-Sperren, ±15 s inkl. „+15 s an der Kante →
Live“, Pause/Play, Tempo, Ton, Schnappschuss, Vollbild, Tabs, Filter, Ereignisliste, Zoom, Datumsdialog, LIVE-Chip,
Tastatur, Clip herunterladen: Clip-Modus aus Info-Leiste und Ereignisliste, Kante per Scroll-Geste, Kante bleibt bei
laufender Wiedergabe stehen, „Clip erstellen“ → „Speichern“ → MP4 per CDP-Download in einen Temp-Ordner, `ffprobe` falls
vorhanden, kein hängender Download) und die Security-Sektion; rot bei JS-/Konsolenfehlern oder HTTP ≥ 400. Mit dem
Zusatz `noexport` prüft er gegen ein Sentinel ohne `features: ["export"]`, dass der Clip-Knopf fehlt. Mit `glas` läuft
dasselbe im Stil Glas (Glas-Karte der Übersicht, Kameraseite immersiv, auf dem Handy ohne Tab-Leiste, die danach
wieder da ist). Chromium auf Port 9222 startet
Sentinels `scripts/cdp-run.sh`; im Labor (CT 213) `/root/lab/hp-nvr-sweep.sh [mobile]`.

Allgemein (ohne NVR): `apps/dashboard/scripts/click-fuzz-test.cjs <hapulse-url> [mobile]` öffnet im HA-Demo-Modus jede Seite
und klickt jedes Bedienelement einmal (Dialoge zu, zerstörerische Knöpfe ausgelassen); rot bei JS-/Konsolenfehler,
Fehlerkarte oder HTTP ≥ 400. Labor: `/root/lab/hp-fuzz.sh [mobile]`.
