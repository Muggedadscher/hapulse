# CLAUDE.md — Arbeitsanweisungen für diesen Fork

Dies ist ein **Fork** von [jlnbln/HAPulse](https://github.com/jlnbln/HAPulse).
Ziel des Users: eigene Erweiterungen einbauen **und** Upstream-Updates weiter
sauber übernehmen können.

## Fork-Konventionen (immer einhalten)

- Upstream-Updates & Merge-Workflow: siehe **`docs/SYNC.md`**.
- Betrieb/Neuaufbau (CT 210, nginx, Autoupdate vom Proxmox-Host): **`deploy/proxmox-lxc/README.md`**. Die Dateien dort
  sind Kopien der laufenden Konfiguration; wer sie auf Host oder CT ändert, zieht sie im selben PR nach.
- **Neue Funktionen möglichst als neue Dateien** — minimiert Merge-Konflikte.
- Jede Änderung an einer **bestehenden Upstream-Datei** mit `// [fork]`
  (bzw. `/* [fork] */` in CSS) markieren. Finden: `git grep "\[fork\]"`.
- Keine Umformatierungen von Upstream-Dateien. Nur Design-Tokens (kein Hex),
  vorhandene Bausteine wiederverwenden (`Modal`, `Card`, `EmptyState`, `.btn …`).
- `@hapulse/core` bleibt React-/DOM-frei (HA-Logik dort, Components sind dünn).
- **Zwei Stile (Klassisch und Glas):** Jede neue Fork-Funktion in beiden Stilen prüfen (`apps/dashboard/scripts/glas-shots.cjs`,
  Klick-Fuzz auch mit `glas`); neue Settings-Felder auch für Glas durchdenken (Scope-Tabelle, Darstellung). Glas-CSS nur in
  `apps/dashboard/src/styles/glas/` und nur unter `:root[data-style='glas']`. Glas geht vor (User, 2026-10-10): keine Umwege,
  nur um Klassisch pixelgleich zu halten; beabsichtigte Klassisch-Änderungen einzeln im PR (`docs/GLAS-PLAN.md` §3).
- Vor jedem Push: `npm run typecheck && npm run build && npm test -w @hapulse/core`.
- **Changelog:** Jede für Nutzer sichtbare Fork-Änderung bekommt im selben PR einen Eintrag in
  `packages/core/src/forkChangelog.ts` (DE + EN, neuer Release `F<n+1>` mit Merge-Datum oder der neueste, solange er
  noch nicht ausgerollt ist), danach `npm run build -w @hapulse/core && node packages/core/scripts/gen-fork-changelog.mjs`
  (`CHANGELOG.fork.md`; der Test `forkChangelog.test.ts` prüft, dass die Datei aktuell ist). Upstreams
  `changelog.ts`/`CHANGELOG.md` und die `version` in den `package.json` bleiben unberührt.
  (Stand nach Upstream-Merge: alle Tests grün. Die früher roten
  `air-vent`/`roomIcons`-Tests hat der Upstream selbst gefixt.)

## Bereits umgesetzte Fork-Features

- **Sensor-Verlauf**: Ein Tap auf eine Sensor-Kachel (bzw. eine Pool-Kachel)
  öffnet Upstreams **Entity-Detail-Modal** (Chart + Logbook, für *alle*
  Entities). Das frühere eigene History-Modal des Forks ist damit abgelöst und
  wurde entfernt (`components/history/*`, `ha/useHistory.ts`). **Fork-Anpassung
  am Detail-Modal:** Upstreams schlichter 24h/7d-Umschalter wurde durch eine
  **Pill-Auswahl (24H/7D/30D)** ersetzt — `[fork]`-markiert in
  `apps/dashboard/src/components/home/EntityDetailModal.{tsx,css}`; die Auswahl
  wird pro User gespeichert (`customization.detailHistoryRange`). Was vom
  Fork-History bleibt: `packages/core/src/sensorHistory.ts` (DOM-frei; nur noch
  `parseNumericHistory` + `demoHistory`) und `apps/dashboard/src/ha/history.ts`
  (`getHistory` via `HAConnection.fetchSensorHistory`) — beides ausschließlich
  für den Pool-Laufzeit-Chart (`PoolChartCard`).
- **Sentinel NVR (nativ)**: Sentinel NVR (Scrypted-Plugin, Repo
  `Muggedadscher/sentinel-nvr`, Schnittstelle dessen `docs/API.md`) wird
  **nativ im HAPulse-Stil** gerendert — kein iframe mehr. Route `/nvr/*`
  (`pages/Nvr.tsx` = Routen-Einstieg), alles Weitere im abgegrenzten Modul
  `apps/dashboard/src/nvr/**` (Store, `VerticalTimeline`, Komponenten, Seiten,
  Home-Karte `'nvr'`, Sicherheits-Sektion `'nvr'` in `Security.tsx`, `nvr.css`).
  Datenmodell, API-Client, Player UND die komplette Kameraseite (`CameraPage`) kommen aus dem
  gemeinsamen npm-Paket **`@sentinel-nvr/web`** (`/api`, `/player`, `/ui`; Repo
  `Muggedadscher/sentinel-nvr-web`, dort getestet) — `nvr/api.ts`/`nvr/format.ts` re-exportieren nur,
  `NvrCameraPage.tsx` ist ein Wrapper. UI-Fixes an der Kameraseite gehören ins Paket (beide Konsumenten
  sehen dann dasselbe). **Texte:** HAPulse übersetzt die `nvr.*`-Schlüssel des Pakets mit seinen EIGENEN Locales (`nvr/ui.tsx`) —
  neue Paket-Schlüssel bei jedem Paket-Update in alle 7 `packages/core/locales/*.json` übernehmen (`test/nvrLocales.test.ts`
  schlägt sonst fehl). `scryptedToken`/`maToken` sind GERÄTELOKAL: `exportSettings()` strippt sie,
  `importSettings()` (auch HA-Settings-Sync) behält den lokalen Wert, wenn der Snapshot keinen trägt. Settings `customization.scryptedUrl` +
  `scryptedToken` (Browser spricht den `/public/`-Endpoint direkt — HAPulse hat
  kein Backend). **Sentinel selbst nur lesend nutzen; Änderungen dort erst mit
  dem User klären.** Architektur, CORS-Regeln und die Anleitung zum kompletten
  Rausnehmen/Neu-Integrieren: **`docs/NVR-INTEGRATION.md`**.
- **App-Icons / PWA**: das in Settings gewählte „Symbol" steuert auch Favicon,
  iOS-Touch-Icon und Web-App-Manifest (`app/appIcon.ts` → `syncAppIcon`, in
  `DashboardApp` neben dem Titel-Sync). Je Symbol liegt ein Satz unter
  `apps/dashboard/public/icons/<id>.{svg,webmanifest}` + `<id>-{180,192,512}.png`;
  erzeugt mit `apps/dashboard/scripts/gen-app-icons.mjs` (Lucide-Glyphen wie
  `PulseLogo`) und `render-app-icons.sh` (Chromium headless), Ergebnisse sind
  eingecheckt. Neues Symbol in `APP_ICON_ALTERNATES` → beide Skripte erneut laufen lassen.
- **Pool-Seite**: native Poolpumpen-Steuerung im HAPulse-Stil (ersetzt das
  Lovelace-`dashboard-pool`). Route `/pool`, `apps/dashboard/src/pages/Pool.{tsx,css}`,
  Karten unter `apps/dashboard/src/components/pool/*`, Entity-Wiring in
  `poolConfig.ts`, Service-Facade `apps/dashboard/src/ha/pool.ts`. Enthält
  Hero-Pumpenstatus + Modus-Umschalter, Solar-Gauge mit editierbarer Schwelle,
  Manuell-Timer-Ring, Laufzeit/Verbrauch (Kacheln öffnen Upstreams
  Entity-Detail-Modal), einen
  **vollen Zeitplan-Editor** (grafische Tages-Timeline, schreibt via
  `scheduler.edit`), einen **Laufzeit-Chart** (`PoolChartCard`: Balken der
  Pumpen-Laufzeit pro Tag aus der State-History, Tages-Max) und eine
  Admin-Sektion (nur HA-Admins). Scheduler-/Slot-Konvertierung (Timeslots ↔
  On-Fenster ↔ Tages-Slots) und das Tages-Bucketing (`dailyRuntimeBars`) liegen
  DOM-frei in `packages/core/src/pool.ts` (getestet in
  `packages/core/scripts/smoke.mjs`). Die Seite ist ein **festes Layout**
  (Hero + fließendes Karten-Grid, NICHT editierbar — bewusst schlank für
  Upstream-Merges). Pool erscheint zudem als **Chip** in der Home-Summary-Leiste
  (`PoolModal`, `home.summaryChips.pool*`). Alles blendet sich aus, wenn die
  Pool-Entities fehlen.
- **Müll-Übersicht**: eine **Karte im Home-Grid** („Waste collection" /
  „Müllabholung"), die die Sensoren der `waste_collection_schedule`-Integration
  **automatisch erkennt** — eine Kachel je Tonne (nächster Termin zuerst) mit
  typgetöntem Icon, Name, Datum und Countdown („Heute" / „in 3 Tagen"). Ein Tap
  öffnet ein Modal mit den nächsten Terminen (aus dem `upcoming`-Attribut, inkl.
  „(verlegt)"-Kennzeichnung). Erkennung/Dedup (mehrere Sensoren je Tonne:
  Basis/`_komplett`/`_verlegt` werden per Kollektionstyp gruppiert, der reichste
  gewinnt) liegt DOM-frei in `packages/core/src/waste.ts` (`detectWasteBins`,
  getestet in `packages/core/scripts/smoke.mjs`). UI: `components/waste/*`
  (`WasteCard`, `WasteBinModal`, `wasteDisplay.ts` mit Ton-Heuristik +
  Datumsformat). In `Home.tsx` als Section `'waste'` verdrahtet (Reorder/Resize/
  Hide wie andere Karten); `settingsStore` `wasteSectionMigrated` gibt der Karte
  bei bestehenden Section-Ordnungen einmalig einen Platz nach „Security". I18n:
  `waste.*` + `home.section.*.waste` in allen sieben Locales. Respektiert
  `customization.hiddenEntities` (einzelne Tonne ausblenden) und blendet sich
  komplett aus, wenn keine Müll-Sensoren existieren.

- **Einstellungen für alle (globale Verwaltung)**: Ein HA-Admin übernimmt seine Einstellungen
  einmalig für alle HA-User (dauerhaft, kein Ausschalter). Ablage HA `frontend/system_data`
  `hapulse:global` (alle lesen, nur Admins schreiben); Scope-Tabelle `stores/settingsScope.ts`
  (GLOBAL / USER: Favoriten, Sprache, Lautsprecher, Verlaufsbereich, Bearbeiten-Schalter /
  DEVICE: Seitenleiste eingeklappt, „Was ist neu“, Hell/Dunkel-Override / SECRET: NVR-/MA-Token,
  optional vom Admin geteilt). Start-Reihenfolge in `wireConnection`: erst `ha/globalSettings.ts`,
  dann `settingsSync` (im verwalteten Modus nur `ha/userSettingsSync.ts`, Key
  `hapulse:user-settings`). Admin-Schreiben = Dreiwege-Diff gegen den zuletzt angewendeten
  Stand. **Neue Settings-Felder immer in der Scope-Tabelle einordnen** — der Test
  `test/globalSettings.test.ts` schlägt sonst fehl.
- **Kameraquelle Sentinel**: Ist Sentinel nutzbar (URL + Token), kommen alle Kameras aus
  Sentinel, HA-`camera.*` sind überall ausgeblendet (`nvr/cameraSource.ts`); Räume zeigen die
  vom Admin zugeordneten Sentinel-Kameras (`customization.nvrCameraRooms`). Details:
  `docs/NVR-INTEGRATION.md` → „Kameraquelle“.

- **Garagentore wie Schlösser**: `cover.*` mit `device_class` `garage`/`gate` gelten nicht mehr als
  Rollladen, sondern als sicherheitsrelevant. Reine Regeln in `packages/core/src/garage.ts`
  (`isGarageDoor`, `garageStatus` closed/open/moving/unavailable, `garageCanAct`/`garageTargets` — nur
  Tore, die gerade handeln können; `garageSummary` — „alle zu“ nur wenn JEDES Tor `closed` ist,
  nicht erreichbar = gelb; getestet in `smoke.mjs`). UI in `components/garage/*`: `GarageCard`
  (Entity-Karte, via `EntityCard`), `GarageList`, `GarageSectionCard` (Sicherheits-Sektion `'garage'`
  nach `locks`), `useGarageAction` (**Öffnen fragt immer nach, Schließen sofort**; Stopp nur beim
  Fahren und wenn unterstützt), `garageText.ts` (gemeinsame Ton-/Textregel für Chip, Home-Karte,
  Hero). Überall eingebunden: Home-Chip `'garage'` + `GarageModal`, Home-`SecurityCard`-Zeile,
  `SecurityHeroCard`-Chip, Raum-Sektion `'garage'` (Tore raus aus „Rollläden“, `BlindsCard`/
  `BlindsAllModal` filtern sie), Raum-Status-Symbol `car` bei offenem Tor, Favoriten rot, Geräte-Zeile,
  Aktivität. Neue Sektionen bekommen bei älteren gespeicherten Reihenfolgen ihren Platz über
  `lib/defaultSlot.ts`. Chip-Marker `garageChipMigrated` (wie `poolChipMigrated`); `applyGlobal`
  behandelt einen fehlenden Marker im Admin-Dokument als `false`. `binary_sensor` `garage_door`
  bleibt ein Tür-Sensor (Türen-Chip/-Sektion). Labor-Probe CT 213: `/root/lab/hp-garage-test.cjs`.
- **Schloss-Chip** (wie Garage): Home-Chip `'locks'` + `LocksModal` (Zeilen aus `LocksList`: Entriegeln fragt immer,
  Verriegeln nur bei Code-Schlössern). Gemeinsame Regel `lockSummary`/`lockTone`/`lockSummaryText` in
  `components/security/lockLogic.ts` für Chip, Home-`SecurityCard` und `SecurityHeroCard`: offen (auch fahrend) = rot,
  `jammed`/`unavailable`/`unknown` = gelb „Störung“, nie „alle verriegelt“. Marker `locksChipMigrated` (wie Garage),
  Standardplatz nach dem Garagen-Chip (sonst nach Türen). Labor-Probe CT 213: `/root/lab/hp-locks-chip.cjs`.

- **Zahlen immer sprachabhängig**: Angezeigte Zahlen nur über `formatNumber` (`@hapulse/core`,
  `numberFormat.ts`) bzw. `formatEntityState(entity, locale)` — nie `toFixed`/`${n}` in UI-Text
  (Upstream zeigte überall „5.5“ statt „5,5“). Ausnahmen: Werte an HA, SVG/CSS, Uhrzeiten, Versionsnummern.

- **Fork-Changelog („Was ist neu“)**: Eigene Releases F1, F2, … in `packages/core/src/forkChangelog.ts` (DE + EN,
  `pickText` wählt nach UI-Sprache, sonst Englisch) — getrennt von Upstreams semver-`RELEASES`, damit Upstream-Merges nie
  kollidieren. `components/changelog/ForkChangelogModal.tsx` + `forkEntries.ts` mischen beide Listen nach Datum
  (Abzeichen „Fork“); „Was ist neu“ zeigt ab 3 ungesehenen Einträgen den neuesten voll und die übrigen als Titelliste
  („Alle Details“ klappt auf). Upstreams `ChangelogModal` exportiert dafür nur `ReleaseEntry` (+ `badge`).
  Gesehen-Stand `lastSeenFork` ist DEVICE (nie exportiert/synchronisiert); frische Installation = aktueller Stand,
  ältere gespeicherte Daten = 0. Über: „Version 1.3.2 · F11“. Labor-Probe CT 213: `/root/lab/hp-changelog-test.cjs`.

- **Stil „Glas“ (Etappe 0–5 von 0–7 umgesetzt, „Glas (Vorschau)“ nur für Admins)**: zweiter Stil neben Klassisch, Apple-/iOS-26-artig —
  **nur Aussehen und Bewegung, gleiche Komponenten, Funktionen und Seiten**. Felder `customization.uiStyle`
  (`classic`/`glas`), `glassStrength` (klar/getönt/deckend) und `reduceTransparency`, alle GLOBAL: der Admin stellt den Stil
  für alle ein, pro Gerät gibt es nur Hell/Dunkel. Zeilen unter Einstellungen → Darstellung
  (`components/settings/StyleSettings.tsx`). `applyAppearance` (`theme/glasAppearance.ts`, umhüllt `applyTheme`, auch im
  First Paint in `main.tsx`) schreibt in Glas die 24 HAPulse-Tokens mit Glas-Werten und alle `--g-*`-Variablen inline auf
  `:root` und setzt `data-style="glas"`; die Werte kommen DOM-frei aus `packages/core/src/glasTokens.ts` (Farben,
  `glasAccent`, Federn; Kontrast aller Text-Paare in `smoke.mjs`). `--accent` ist in Glas die lesbare Akzent-Ink,
  Akzent-Flächen holen sich das helle Orange in `styles/glas/accent.css`. Der Selektor-Wächter
  `test/glasSelectors.test.ts` hält die Glas-CSS auf `:root[data-style='glas']` und meldet Klassen, die Upstream
  umbenannt hat (siehe `docs/SYNC.md` → „Feature: Stil Glas“). Screenshots beider Stile + Laufzeitprüfungen:
  `apps/dashboard/scripts/glas-shots.cjs` (deterministisch, `compare` verlangt 0 Pixel). Design **`docs/GLAS-DESIGN.md`**
  (+ `docs/glas/glas-tokens.json`), Etappen und verbindliche User-Entscheidungen (§7.3) **`docs/GLAS-PLAN.md`**, Stand,
  Abweichungen und Laborliste **`docs/glas/PLAN-ETAPPE-0-1.md`**, **`docs/glas/PLAN-ETAPPE-2.md`** und
  **`docs/glas/PLAN-ETAPPE-3.md`**, Skizze und
  Funktions-Checkliste **`docs/glas/`**. **Rahmen (Etappe 2):** Glas-Laufzeit in `app/glas/` (`GlasRuntime` schreibt
  Scroll-Lage `--g-y`/`--g-edge`, `data-tabs-min`, `data-g-scrolled`; `GlasTabBar` legt Glas, Linse und „Tab-Leiste
  einblenden“ in Upstreams `.app-tabs`; `GlasNavGroups` gruppiert die Seitenleiste; `menuKeys` gibt Räume- und
  Mehr-Menü Pfeiltasten), Handy-Teile in `components/glas/` (Avatar-Menü, „Fertig“, Wetterzeile), CSS in
  `styles/glas/{shell,tabbar,menus,titles,feedback}.css`. Glas-Flächen stehen in EINER `:where()`-Liste in
  `styles/glas/material.css` (der Wächter prüft, dass alle Blöcke dieselbe Liste tragen); eine Fläche setzt nur Lage,
  Größe, Radius und `--g-surface-*`. Nie `opacity`, `filter`, `mask`, `clip-path` oder `backdrop-filter` auf Vorfahren
  einer Glasfläche (sonst sieht das Glas die Seite nicht mehr); `!important` nur für die 200-ms-Überblendungen bei
  reduzierter Bewegung (K38). **Fenster (Etappe 3a):** jedes `Modal` ist in Glas unter 900 px ein Sheet (mittel/groß,
  Griff, Ziehen), ab 900 px ein Glas-Dialog, ein Fenster aus einem Fenster eine Seite darauf; Laufzeit in
  `components/glas/sheet/` (`useGlasSheet` im `Modal`-Fork, `sheetHost` = Stapel mit `inert`, ein Esc, `data-g-sheets` als
  Scroll-Sperre; `origin` = Auslöser, aus dem das Fenster wächst; `ghost` = Schließen-Bewegung ohne Rolle), CSS in
  `styles/glas/{sheets,sheet-content}.css`. In Glas setzt die Laufzeit Fokus, Esc und Scroll-Sperre, Klassisch bleibt
  beim Upstream-`Modal`. Prüfungen `glas-shots.cjs checks --part sheets` (Szenen `win-…` in
  `scripts/glas-checks-sheets.cjs`). **Gesten und Inspector (Etappe 3b):** Langdruck (550 ms), Rechtsklick oder
  Kontextmenü-Taste auf einer Karte im Raum öffnet in Glas das Kontextmenü (`components/glas/ContextMenu.tsx`, Host in
  `GlasRuntime`, Zustand `stores/glasUiStore.ts`, Aktionen je Entität und Rechten rein in `contextActions.ts`; im
  Bearbeiten-Modus wie Klassisch); `SwipeRow` macht Listenzeilen wischbar (Benachrichtigung verwerfen, Licht aus,
  Garage schließen, Verriegeln; nie Öffnen oder Entriegeln, die Aktion läuft erst per Tipp, ihr Zwilling bleibt in der
  Zeile); das Detail ist ab 1100 px der Inspector (rechts, nicht modal, die Seite rückt zur Seite; `Modal`-Props
  `presentation`/`requestKey`, ein Routenwechsel schließt ihn). CSS in `styles/glas/gestures.css`, Prüfungen
  `checks --part gestures` (`scripts/glas-checks-gestures.cjs`). **Übersicht (Etappe 4, `docs/glas/PLAN-ETAPPE-4.md`):**
  in beiden Stilen die Karte „Hinweise“ (Sektion `'hints'`, nur mit Abweichung, im Bearbeiten-Modus leer; Regeln in
  Core `hints.ts`, Fenster `HintWindows` außerhalb des Rasters), „Aktiv“ an Szenen (Core `activeScene.ts`, Heuristik:
  aktiv, bis sich ein Mitglied ändert) und Netz/Solar gestapelt in der Energie-Karte. Nur Glas: eigene Körper der Karten
  in `components/glas/home/` (Hauptraum mit Lichtkreisen, Geräte als Kachel/Zeile, Klima und Rollläden mit Raumauswahl,
  `EnergyGlas` mit Tag/Woche/Monat über `ha/useEnergyWindow.ts`), Detail mit `LightBrightnessControl` und `Segment`,
  Bearbeiten ab 900 px mit `SizeBar` (S/M/L, Feld `tallSections`, „⋯“ = `SizeSheet`, beide in `components/glas/edit/`
  über den Hook `useGlasSectionEdit`), Kontextmenü auch an Szenen und Geräten (`GlasMenuTarget`). CSS in
  `styles/glas/{home,home-cards,home-lists,controls,detail,edit,nvr}.css`. Prüfungen `checks --part home`
  (`scripts/glas-checks-home.cjs`, steuert die Demo über `window.__hapulseDemo` aus `ha/demoControl.ts`). **Übrige
  Seiten (Etappe 5, `docs/glas/PLAN-ETAPPE-5.md`):** nur Glas, fast nur CSS an den klassischen Klassen: Kartentitel über
  der Fläche, ruhige Heroes, Spalten nach Inhaltsbreite (`pages.css`), iOS-Schalter, Stepper, Pillen, Regler und Play
  (`controls.css`), Listen und Felder (`lists.css`), Karten im Raum und in „Klima/Rollläden alle“ (`cards.css`), je Seite
  eine Datei (`security`, `pool`, `energy`, `music`, `devices`, `system`, `settings`, `onboarding`); neues Markup nur für
  `Segment` (Zeitraum, Raster/Liste, Hell/Dunkel, Pool-Modus `PoolModeSegment`), die Bearbeiten-Leiste auf Sicherheit,
  Energie, Automationen, Szenen und System, die Menü-Werte (`MoreValue.tsx`, `roomsMenuStatus.ts`) und die Untertitel der
  Chip-Fenster (`chipLabels.ts`; die Zählung steht für beide Stile in Core `chipCounts.ts`). Prüfungen
  `checks --part pages` (`scripts/glas-checks-pages.cjs`; Demo-Hilfen `demoCalls.ts`, `demoEnergy.ts`). Nächste
  Etappen 6–7 (NVR, Feinschliff) nach `docs/GLAS-PLAN.md` §3.

## Optionales Folge-Feature — HA-Kameras live

`docs/NVR-NATIVE-PLAN.md` beschreibt einen **anderen**, noch nicht gebauten
Ausbau: Live-Streams für **beliebige HA-`camera.*`-Entities** (HLS/WebRTC über
Home Assistant) in der Security-`CameraGrid`. Die Sentinel-Integration oben ist
davon unabhängig und bereits umgesetzt.
