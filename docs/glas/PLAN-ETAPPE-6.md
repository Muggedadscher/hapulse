# Glas Etappe 6 — NVR (kurzer Plan)

Stand `main` nach Etappe 5 und dem Texte-PR. Ablauf nach [GLAS-PLAN §3](../GLAS-PLAN.md): kurzer Plan, unabhängig geprüft,
je Repo ein PR. Maßstab: GLAS-PLAN §4, [GLAS-DESIGN](../GLAS-DESIGN.md) D13, §3.6, §6.4, §7.15, §7.27, §7.33, Skizze
`screens/g5h-kamera-d.webp`, Entscheide E12/E13 (GLAS-PLAN §7.3), „Glas geht vor“ (§3, 10.10.). Inventar J bleibt
vollständig (Tabelle §3). Pfade relativ zu `apps/dashboard/src/`, Paket = Repo `sentinel-nvr-web` (öffentlich, MIT:
keine internen Adressen, Beispiele mit `192.0.2.x`).

Ist-Stand: Die NVR-Ansichten haben Glas-Farben und -Schrift über die Tokens, Fenster sind Sheets, die NVR-Karte der
Übersicht ist fertig (Etappe 4). Es fehlen die immersive Kameraseite, der Glas-Look von Übersicht, Sicherheits-Sektion,
Raum-Kameras und Einrichtung sowie E13.

## 1. Festlegungen

| # | Festlegung |
|---|---|
| K100 | **Paket 0.18.0, Kameraseite nur als Zusatz.** Ohne die neuen Props ist das DOM gleich 0.17.1 (Test gegen eine Vorlage aus 0.17.1) und die CSS von 0.17.1 Byte für Byte erhalten; jede neue Regel steht unter `.nvr-cam[data-nvr-appearance='immersive']` oder trifft nur Klassen, die es erst mit den neuen Props gibt (`.nvr-cam__name`, `.nvr-cam__badge*`) — ein statischer Test prüft beides. Player, Standbilder, Marker, Watchdog, Zeitleisten-Logik bleiben unberührt. Neu: Prop `appearance?: 'default' \| 'immersive'` (Attribut `data-nvr-appearance`, nur dann auch `data-active` an `.nvr-tabs` für die Linse); `header` als Funktion bekommt zusätzlich `{ live }` (`at` fehlt auch, solange eine Aufnahme lädt); `CameraTitle` optional `live`/`at` mit Abzeichen „LIVE“ (`nvr.live`, vorhanden) bzw. Uhrzeit (Paket-Formatierer). Keine neuen Texte. Mit im Release: die Typen aus #44 (`detection`, `backfill`, `storageProblem` als Werteliste, also enger). |
| K101 | **Immersiv, unter 900 px** (§7.33): die Seite gehört dem Bildschirm (der Host blendet seine Leisten aus; Körper `100dvh`, mindestens 27rem, das Bild weicht auf kurzen Schirmen bis 12rem wie heute in HAPulse). Spalte ohne Karten, Bühne randlos (`--stage-ar`), `CameraTitle` über dem Bild (Zurück und Host-Knöpfe `nvr-iconbtn` als Kreise 44, `top` 8 + Safe Area, Titel 17/22 600 + Abzeichen), Verläufe oben 104 / unten 120, Steuerkapsel 52 mit Knöpfen 44, Ton-Kreis 44, Info-Leiste 48 (Status 13), Segment Zeitleiste/Ereignisse (Spur 40, Linse 34 gleitet; reduzierte Bewegung: Überblendung 200 ms, §6.4), Filter-Kapseln 32, Zeitleiste bis zum unteren Rand. Safe Area unten für Datum-Chip, LIVE-Pille, Zoom, Clip-Leiste und die letzte Zeile der Ereignisliste. Clip-Modus wie im Standard (Bild 28vh mittig auf der dunklen Fläche, ohne Info-Leiste, Tabs, Filter), der Kopf bleibt über der Bildzeile. PiP-Hinweis als Hinweis-Fläche, Tageskopf der Ereignisliste auf dem Seitengrund, Vollbild (`.nvr-stage`) ohne Radius und ohne oberen Verlauf. **Ab 900 px:** Kopfzeile über den Spalten, Bühne ohne Kartenrahmen mit Radius 18, Zeitleisten-Spalte als Fläche ohne Rand, Steuerelemente wie am Handy. Bewusste Abweichungen von §7.33: Bildhöhe aus `--stage-ar` statt fest 3/4; Zeitleisten-Geometrie bleibt (Bilder 137 × 77 bzw. 112 × 63, Marker, Abspielkopf bei 35 %, der Code rechnet damit); Filter bleiben Mehrfach-Schalter ohne „Alle“ (an = Kapsel `fill`, aus = gedimmt, statt `label`-Fläche); die Info-Leiste zeigt den Zustand des Players ohne „63 heute“; Hook-Namen anders als GLAS-PLAN P1 (K102). |
| K102 | **Hooks des Pakets** (nur immersiv gelesen, Fallback = Paketwert): über dem Bild `--nvr-ctl-bg`, `-filter`, `-rim`, `-shadow`, `-fg`, `-text-shadow`; über der Zeitleiste (Datum-Chip, Zoom) `--nvr-float-*` mit denselben Endungen und `--nvr-float-accent`; Segment `--nvr-seg-track`, `-lens`, `-shadow`; LIVE `--nvr-live-bg`, `-fg`, `-shadow`; Verlaufsfarbe `--nvr-shade`; Bewegung `--nvr-ease`, `--nvr-dur`. Zahlen `tabular-nums`. Die an `:root` abgeleiteten Paketfarben (`--nvr-c-*`, `--nvr-rec*`, `--nvr-overlay`, `--nvr-on-overlay`) deklariert die immersive Wurzel neu, das Overlay mit der dunklen Formel (heute nur unter `:root[data-mode='dark']`). README: Hooks, Vertrag „unter 900 px gehört der Seite der Bildschirm“, Host-Knöpfe mit `nvr-iconbtn`, Kompatibilität; CHANGELOG. |
| K103 | **Dunkler Teilbaum** (GLAS-PLAN §1.2 Punkt 5): `applyAppearance` schreibt in Glas `<style id="glas-dark-scope">` mit `glasCssVars({ mode: 'dark', … })` (gleicher Akzent, Stärke, Kontrast) für `:root[data-style='glas'] [data-glas-scheme='dark']` samt `color-scheme: dark`, in Klassisch weg (Test). Solange die Kameraseite offen ist, trägt die Inhaltsspalte `.app-content` `data-glas-scheme="dark"` (`AppLayout`, `[fork]`): auch Ränder und Kopfzeile am Desktop sind dunkel, die Seitenleiste bleibt im Modus des Geräts, Fenster und Menüs (Portale) ebenso. Dazu `html` mit `--g-media-bg` (Überscrollen) und `theme-color` dunkel (`glasAppearance`). Hook-Werte in `styles/glas/nvr.css`: über dem Bild klares Glas (`--g-glass-clear-*`, `--g-on-media`), über der Zeitleiste reguläres Glas mit der Mindesttönung des Datum-Chips (`--g-tint-date-chip`, Rezept aus `material.css`), Text `accentInk` bei Aufnahme, LIVE `--g-live`; bei `data-glass='opaque'` und ohne `backdrop-filter` deckend (Füllung `--g-glass-opaque-clear-fill` bzw. `--g-card-solid`, kein Filter, kein Rand, deckende Schatten). `accent.css`: `.nvr-datechip--rec` fällt weg (Chip ist Glas, nicht Akzentfläche); Ton an bleibt prominent. Kopf: Handy klare Kreise (Zurück aus dem Paket, „In Sentinel öffnen“ als `nvr-iconbtn`), Desktop gefüllte Kreise 44 wie K32; kein Avatar (Skizze, geht über E13 hinaus). |
| K104 | **E13 an der Seite festgemacht:** `NvrCameraPage` meldet sich in Glas über `useGlasImmersive(true)` (setzt `immersive` im `glasUiStore` per Layout-Effekt; nicht im leeren Zustand ohne Verbindung), `GlasRuntime` setzt daraus `data-g-immersive` an `:root` vor dem Zeichnen. Unter 900 px dann Tab-Leiste und Chip-Leiste aus, Ränder von `.app-content`/`.app-main` 0, das Bild beginnt am oberen Rand; das Verbindungs-Banner bleibt oben schwebend (über dem Bild, unter dem Kopf). `useFitAboveTabs` ist in Glas aus (es misst eine Tab-Leiste, die es dort nicht gibt; die immersive Höhe des Pakets gilt, HAPulses `.nvr-page--fit`-Regeln greifen nie). Die Linse der Tab-Leiste erscheint beim Zurückkehren an ihrem Platz (`useLens` „0“, geprüft). Ab 900 px bleibt die Seitenleiste. Zurück führt zur Übersicht. |
| K105 | **Übrige NVR-Ansichten** per CSS an den Klassen des Pakets und des NVR-Moduls (`styles/glas/nvr.css`, wie Etappe 5): Übersicht mit Kopfaktionen als gefüllte Kreise (Name als `aria-label`/Tooltip), Karten mit Titel über der Fläche (K89), Hero ruhig mit Zustand als leiser Verlauf (K90: offline/Speicherproblem), Kamera-Kacheln wie die NVR-Karte am Desktop (§7.15: Radius 18, unterer Verlauf, Name + Abzeichen, klare Pillen, Offline/Fallback/REC), Ereignisleiste (Bilder Radius 16, Zeit 15/600, Klasse 13 `label2`), Histogramm und Speicher in Glas-Diagrammfarben, Banner als Hinweis-Kapsel. Sicherheits-Sektion (H5) und Raum-Kameras mit denselben Kacheln, Kopf wie die übrigen Karten. Einrichtung: Felder nach K94, Token/Konto als `Segment` (K92, manuelle Aktivierung), eine prominente Aktion. |
| K106 | **Morph „Kamera öffnen“ wandert nach Etappe 7.** Grund (Review): `BrowserRouter` von react-router 8 legt jede Navigation in `startTransition`, `flushSync` hilft nicht, die NVR-Route lädt nachträglich und das Poster entsteht im Effekt. Sauber geht es dort mit einem Versprechen: der Callback von `startViewTransition` navigiert und wartet, bis die Kameraseite nach dem Poster meldet (Effekt, Kappe 300 ms), nur wenn die NVR-Route schon geladen ist; reduzierte Bewegung ohne Morph. |

## 2. Dateien

- **Paket:** `src/ui/components/CameraPage.tsx`, `src/ui/ui.css` (Block „immersive“ am Ende),
  `test/ui/camerapage-immersive.test.tsx` (+ Vorlage), `test/ui/immersive-css.test.ts`, `README.md`, `CHANGELOG.md`,
  Version 0.18.0.
- **HAPulse:** `apps/dashboard/package.json` + Lock, `nvr/NvrCameraPage.tsx`, `stores/glasUiStore.ts`,
  `app/glas/useGlasImmersive.ts`, `app/glas/GlasRuntime.tsx`, `app/AppLayout.tsx` (`[fork]`-Attribut),
  `theme/glasAppearance.ts` (+ Tests), `nvr/components/NvrSetup.tsx` (Segment-Weiche), `styles/glas/{nvr,shell,accent}.css`,
  Selektor-Wächter, `scripts/glas-checks-nvr.cjs`, Fork-Changelog F40, `docs/NVR-INTEGRATION.md`, `docs/SYNC.md`,
  `CLAUDE.md`, `docs/GLAS-PLAN.md`.

## 3. Prüfungen

**Neuer Teil `checks --part nvr`** (`scripts/glas-checks-nvr.cjs`) mit nachgestelltem Sentinel auf `192.0.2.10`
(Playwright-Route, CORS-Kopf wie der echte Server): Kameras (online, offline, Aufnahme hängt), Statistik, Ereignisse,
Histogramm, Clips, Schnappschüsse (hell und dunkel), `features: ["export"]`. Wiedergabe: der Signalisierungs-WebSocket wird
geschlossen (`routeWebSocket`), MSE-Live antwortet 404, Live läuft als MJPEG-Einzelbild; Aufnahmen gehen nach dem Relay
(WebSocket zu) und MSE (der Codec fehlt in Playwrights Chromium) auf den nativen Weg, `api/segment` liefert eine kurze
VP9-Datei, die der Prüfteil beim Start mit ffmpeg erzeugt (ohne ffmpeg mit VP9 rot; `--no-media` überspringt den Teil und
meldet das). Blöcke:
`nvrImmersive` (Handy, iPad, Desktop, hell und dunkel: Seite und Inhaltsspalte dunkel, Kopf über dem Bild, Tab-/Chip-Leiste
nur dort aus und danach wieder da, Linse der Tab-Leiste ohne Gleiten, Maße K101, Safe Area, Clip-Modus; Kontrast ≥ 4,5:1 für
Titel, Uhrzeit-Abzeichen und „1×“ und ≥ 3:1 für Glyphen der Kapsel über hellem und dunklem Bild), `nvrKeep` (Tabelle),
`nvrPages`, reduzierte Bewegung, erzwungene Farben, deckendes Glas. Szenen `nvr-cam`, `nvr-overview` u. a. für Bilder
beider Stile und den Klassisch-Vergleich (Klassisch gleich `main`, auch die Kameraseite mit 0.18.0 im Standard).

| Inventar | Prüfung |
|---|---|
| J1 Route | `nvrPages`: `/nvr`, `/nvr/<id>`, Unbekanntes → `/nvr` |
| J2 Übersicht | `nvrPages`: Kopfaktionen, Stale-Banner, Hero, Ereignisleiste (Klassen, „läuft“), Kacheln (Offline, Fallback, REC, heute), Histogramm, Speicher |
| J3 Home-Karte | Etappe 4 (`checks --part home`), unverändert |
| J4 Sicherheit | `nvrPages`: Sektion mit Kacheln und Ereignissen |
| J5 Kameraseite | `nvrKeep`: ±15 s, Play/Pause, Tempo (Aufnahme); Ton (nur mit Ton-Spur, sonst Labor); Schnappschuss, Vollbild, Tabs, Filter, Zoom, Zeitleiste, LIVE, Datum, Tastatur, Deep-Link `?at=&ev=`, Clip; Scrub und Relay: Labor |
| J6 Datum/Uhrzeit | `nvrKeep`: Datum-Chip öffnet das Sheet, Tag wählen springt |
| J7 PiP-Hinweis | `nvrKeep` mit nachgestellter Home-Bildschirm-App (PiP abgelehnt → Hinweis mit „In Safari öffnen“) |
| J8 Einrichtung | `nvrPages`: Felder, Segment Token/Konto, Fehlertexte 401/403/404/429/nicht erreichbar |
| J9 Kameras ↔ Räume | `nvrPages`: Fenster öffnet, „Vorschlagen“ |
| J10 Kameraquelle | `nvrPages`: Raum und Sicherheit zeigen Sentinel-Kacheln |
| J11 Hinweis im Detail | `nvrPages`, sonst bestehende Tests |
| J12 Fehler/Leer | `nvrPages`: nicht eingerichtet, nicht erreichbar/401 mit „Erneut versuchen“, Laden |
| J13 Geräte-Secrets | bestehende Tests (`globalSettings`, Export), unverändert |

- **Paket:** `typecheck`, `lint`, `format:check`, `test:tz`, `build`.
- **Labor** (Freigabe vom 09.10.): Sentinels eigene Oberfläche mit dem unveröffentlichten Paket (Ablauf im privaten
  Plugin-Repo). Sentinels Proben (`ui-sweep-test` in drei Varianten, `app-test`, `clip-ui-test`, `shot-app`) zeigen den
  Standard unverändert. HAPulse gegen den echten Sentinel: `nvr-sweep-test.cjs` (bekommt `glas`) Handy und Desktop in
  beiden Stilen, echte Wiedergabe in Glas (Live, Aufnahme, Scrub, Clip, Ton).
- **Gesamtlauf** einmal vor dem HAPulse-Merge (alle `checks`-Teile, Klassisch-Vergleich, Klick-Fuzz beide Stile,
  Pflichtbefehle inkl. Lint).

## 4. Reihenfolge

1. Paket (K100–K102) als PR, CI; HAPulse (K103–K105) gegen den lokalen Paketstand bauen und alle Prüfteile laufen lassen,
   damit kein Hook fehlt, bevor 0.18.0 getaggt ist.
2. Paket-Review, Labor (Sentinel mit dem unveröffentlichten Paket, Proben) → Merge, Tag `v0.18.0`, Veröffentlichung,
   Laborkopie nachziehen.
3. HAPulse-PR mit 0.18.0 → Review, Labor (`nvr-sweep-test` beide Stile) → Gesamtlauf → Merge.

## 5. Risiken

- Abgeleitete Variablen im dunklen Teilbaum: `nvrImmersive` misst Farben in der Seite, nicht nur an der Wurzel.
- iPhone: `100dvh`, Safe Area, Statusleiste der Home-Bildschirm-App — K39 gilt auch für den Kopf der Kameraseite; endgültig
  am Gerät.
- Sentinels eigene UI zieht 0.18.0 mit einem eigenen PR nach (dort fallen `detection`/`backfill` aus der Liste in
  `api-contract.ts`); nicht Teil dieser Etappe.

## 6. Review des Plans

Unabhängig geprüft am 10.10.: machbar. Eingearbeitet: B1 (Morph nach Etappe 7, K106), S1 (E13 an der Seite, Höhe ohne
Tab-Leiste, `useFitAboveTabs` aus, K101/K104), S2 (Safe Area, Clip-Modus, PiP-Hinweis, Tageskopf, K101), S3 (deckende
Hook-Werte, `accent.css`, K103), S4 (Inhaltsspalte dunkel, Überscrollen, `theme-color`, K103), S5 (WebSocket schließen,
MJPEG, VP9 für Aufnahmen, Tabelle §3), S6 (Labor mit lokaler Zeile, Typen in K100), S7 (Reihenfolge §4), S8 (DOM-Vorlage,
CSS-Test, `data-active` nur immersiv, K100); Hinweise: dunkle Overlay-Formel (K102), Abzeichen nur in Glas (HAPulse gibt
`live`/`at` nur dort), Abweichungen (K101, K103), Überblendung bei reduzierter Bewegung, Vollbild, Kontrast-Probe, Banner,
Linse der Tab-Leiste.

## 7. Abweichungen und Nachträge beim Bau

### 7.1 Kameraseite (K101–K104)

- **iPad hochkant:** „Bühne randlos“ gilt am Handy wörtlich (390 × 293 bei 4:3). Am iPad hochkant (820 × 1180) begrenzt
  die Höhenregel des Pakets das Bild auf `max(12rem, min(46vh, 100dvh - 15rem))` = 543 px; das 4:3-Bild ist dann 724
  breit und steht mittig auf der dunklen Fläche (links und rechts je 48 px Seitengrund, ohne Rahmen). Randlos über
  820 px wäre es 615 hoch und schöbe die Zeitleiste in die untere Hälfte. `nvrImmersive` nimmt beides an: randlos oder
  so hoch wie die Kappe und mittig.
- **Verläufe:** zwei Hooks statt `--nvr-shade` (K102): `--nvr-shade-top` (unter dem Kopf, Standard Schwarz 70 %, läuft
  nach unten aus) und `--nvr-shade-bottom` (unter der Kapsel, Standard Schwarz 35 %, voll ab der halben Höhe). Ein Wert
  für beide war oben zu schwach für den Titel über hellem Bild oder unten zu dunkel.
- **LIVE:** die Marke an der Live-Linie der Zeitleiste nimmt dieselben Hooks wie das Abzeichen und die Pille; auf der
  Seite ohne Spaltenfläche haben die Ringe der Ereignis-Marker die Seitenfarbe (`--bg`). Schatten `--g-shadow-live`
  (`glasTokens.ts`, `smoke.mjs`).
- **Linse der Tab-Leiste:** beim Zurückkehren steht sie an ihrem Platz (`data-g-lens="0"`) und blendet in 200 ms ein wie
  beim ersten Laden; sie gleitet und dehnt sich nicht (geprüft: kein Übergang außer der Deckung).
- **Kontrast über dem Bild** (gemessen an den Pixeln unter den Zeichen, `nvrImmersive`, GLAS-DESIGN §2 Regel 5): über
  hellem Grau #C8C8C8 Titel und Uhrzeit 5,17:1, „1×“ 5,66:1, Zeichen der Kapsel und Ton 5,57:1, Kreise im Kopf
  7,1–7,5:1; über dem Infrarot-Bild ab 14,7:1; über reinem Weiß (nur gemeldet) Titel 3,36:1, Zeichen 3,69:1.
- **Deckend** („Deckend“, „Transparenz reduzieren“, mehr Kontrast): die Kapsel über dem Bild füllt mit
  `--g-glass-opaque-clear-fill` (Deckung 0,72), ohne Weichzeichner und Rand; der Datum-Chip ohne Glas-Verlauf.
- **Datum-Chip bei Aufnahme:** `.nvr-datechip--rec` ist aus `accent.css` gefallen (K103); der Chip ist Glas, nur sein Text
  nimmt bei Aufnahme `--nvr-float-accent`.

### 7.2 Übrige Ansichten (K105)

- **Dazu gekommen**, weil sie zu den NVR-Ansichten gehören und sonst klassisch aussähen: das Fenster Datum/Uhrzeit (Monat
  zwischen Pfeilen in Kreisen 44, Wochentage 13/18, Tage als Kreise 44, der gewählte prominent und auch unter dem Zeiger
  gefüllt, die Uhrzeit als Feld nach K94, im Fuß „Heute“ grau und „Anzeigen“ prominent), der Hinweis im Detail einer
  HA-Kamera (J11: getönte Fläche, „NVR öffnen ›“ als Link in einer Trefferfläche 44), die Beschriftung der
  Ereignisleiste in der Sicherheits-Sektion und die Knöpfe des Fehlerzustands (bleiben mittig, wenn sie umbrechen).
- **Kopfaktionen der Übersicht:** in Glas Kreise 44 (`NvrOverviewPage.tsx`, `IconButton size`), ihr Name steht in beiden
  Stilen auch als Tooltip (`title`). Gewollte Klassisch-Änderung (K105 „Name als `aria-label`/Tooltip“).
- **Abzeichen „Aufnahme hängt“ einer Kachel:** das Paket hat dafür keine Klasse; Glas erkennt es am Symbol
  `lucide-video-off` (Selektor-Wächter `MARKER_ICONS`) und färbt es gelb wie die NVR-Karte.
- **Zahlen im Paket:** die Zahl der Segmente (Speicher) und der Ereignisse von heute (Hero) gruppiert das Paket jetzt in
  der UI-Sprache („48.210“, vorher „48210“; neuer Formatierer `fmtCount`, Paket-CHANGELOG 0.18.0). Gesehen an den
  Glas-Bildern, gilt in beiden Stilen und in Sentinels eigener UI. Gewollte Klassisch-Änderung (Regel des Pakets: Zahlen
  über `Intl`).

### 7.3 Prüfteil `nvr`

- Das nachgestellte Sentinel liefert Segmente mit Byte-Bereichen (206) wie das Plugin; ohne sie spult Chromium im
  nativen `<video>` nicht, die Position blieb am Segmentanfang (±15 s und die Tastatur sprangen falsch).
- Der Klassenfilter wird in der Ereignisliste gezählt, nicht an den Markern (die Zeitleiste zeichnet nur, was im Fenster
  liegt).
- Am Desktop zeigt das Paket die Kapsel erst, wenn der Zeiger über dem Bild ist; die Kontrastmessung legt ihn vorher
  dorthin. Die Übersicht wartet vor dem Messen das Einblenden der Seite ab (`g-rise`).
- Safe Area per Browser-Emulation (CDP `Emulation.setSafeAreaInsetsOverride`, oben 47, unten 34 wie ein iPhone mit Notch):
  Kopf bei 8 + 47, oberer Verlauf 104 + 47, Datum-Chip und Zoom 10 + 34 über dem unteren Rand, LIVE-Pille 62 + 34, die
  letzte Zeile der Ereignisliste endet über dem Datum-Chip (Abstand unten 62 + 34), Clip-Leiste mit der unteren Safe Area.
- Langer Kameraname am Handy: zwischen Zurück und Aktion, mit Auslassungspunkten, das Uhrzeit-Abzeichen bleibt ganz.
- Ergebnis: alle sechs Blöcke grün (`nvrImmersive`; `nvrKeep` mit 17 Schritten auf Handy und Desktop in Klassisch und Glas;
  `nvrPages`; `nvrReducedMotion`; `nvrForcedColors`; `nvrOpaque`).
- Ohne ffmpeg mit VP9 kann der nachgestellte Sentinel keine Bilder und Aufnahmen liefern: dann ist der Teil rot,
  `--no-media` überspringt ihn ausdrücklich (vorher lief er still grün durch).
- Labor bleibt (§3): Scrub und Relay, hörbarer Ton, echte Wiedergabe über WebRTC. Dafür kennt
  `scripts/nvr-sweep-test.cjs` jetzt `glas` (Glas-Karte der Übersicht, Kameraseite immersiv, auf dem Handy ohne
  Tab-Leiste, danach der Rahmen wieder da).

### 7.4 Beobachtung, nicht geändert

- `tabular-nums` an der Wurzel (Etappe 1, `base.css`, gilt für alle Seiten) macht in der Schrift der Prüfumgebung (Inter
  als Systemschrift unter Linux) auch Bindestrich und Doppelpunkt so breit wie eine Ziffer; ob SF Pro auf dem iPhone das
  auch tut, ist ungeprüft. Eine Regel für alle Seiten, deshalb nicht in dieser Etappe; Kandidat für Etappe 7:
  `tabular-nums` nur an Zahlen, die sich ändern.

## 8. Review des Codes (2026-10-10)

**Paket** (PR in sentinel-nvr-web, unabhängig geprüft): keine Blocker. Behoben: langer Name am Handy (die Knöpfe behalten
ihre Spalten, der Name endet mit Auslassungspunkten), Name und Uhrzeit über dem oberen Verlauf weiß auch ohne
`--nvr-ctl-fg` (der Verlauf ist in jedem Theme dunkel), Hover der Knöpfe am Datum-Chip und der Zoom-Werkzeuge, der untere
Verlauf am Desktop nur mit der Kapsel, Safe Areas (oberer Verlauf, seitliche Abstände, Ereignisliste über dem Datum-Chip),
Hook-Liste in `ui.css`, README und JSDoc; der CSS-Test lehnt jetzt auch andere At-Regeln, Verschachtelung und
Geschwister-Kombinatoren ab (mit Selbsttest), die gruppierten Zahlen sind in Deutsch und Englisch getestet.

**HAPulse** (unabhängig geprüft, keine Blocker). Behoben:

- **Öffentliches Repo:** ein interner Gerätename stand in diesem Plan; aus dem Commit entfernt, bevor es einen PR gab.
- **Prüfteil ohne ffmpeg** lief still grün durch (alle Blöcke übersprungen): jetzt rot, `--no-media` überspringt
  ausdrücklich, auch die NVR-Szenen von `shoot`.
- **Szene `nvr-trouble` wackelte** im Klassisch-Vergleich (4 von 78 Bildern): der nachgestellte Sentinel ließ nach dem
  Umschalten auf „Fehler“ auch die noch ladenden Bilder scheitern. `fail` gilt jetzt nur für JSON-Antworten.
- **Konsole:** `shoot` überging alle 401/503-Meldungen, jetzt nur die des nachgestellten Sentinels.
- **Hochkontrast:** die Punkte für „Aufnahme hängt“ (Kachel, NVR-Karte) und der Punkt der Problem-Pille behielten ihre
  Farbe, weil ihre Zustandsregeln spezifischer waren als die Hochkontrast-Regel; jetzt zeichnen alle Punkte in
  `CanvasText`, `nvrForcedColors` prüft jeden Zustand in der Übersicht und auf der NVR-Karte der Startseite.
- **Kleinigkeiten:** das Segment Token/Anmeldung setzt beim erneuten Wählen des gewählten Wegs die Prüfung zurück wie die
  klassischen Knöpfe (`onReselect`); `immersive` im Glas-Store ist gezählt (`holdImmersive`), damit zwei kurz zugleich
  eingehängte Kameraseiten den Rahmen nicht zwischendurch einblenden; Tests für die dunkle Browser-Farbe der Kameraseite
  und für mehr Kontrast im dunklen Teilbaum; Anleitung zum Entfernen der NVR-Integration um die Glas-Dateien ergänzt.
