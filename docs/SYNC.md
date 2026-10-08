# Fork pflegen: Upstream-Updates + eigene Erweiterungen

Dieses Repo ist ein Fork von **[jlnbln/HAPulse](https://github.com/jlnbln/HAPulse)**.
Ziel: eigene Erweiterungen einbauen **und** die Updates aus dem Original
regelmäßig sauber übernehmen — ohne Merge-Albträume.

Das Grundprinzip: **eigene Änderungen strikt von Upstream trennen.**

---

## 1. Remotes einrichten (einmalig)

```bash
git remote add upstream https://github.com/jlnbln/HAPulse.git
git fetch upstream
git remote -v
# origin    https://github.com/Muggedadscher/hapulse (dein Fork)
# upstream  https://github.com/jlnbln/HAPulse        (das Original)
```

---

## 2. `main` = deine eigene Linie (Fork **+** Upstream)

`main` enthält **deine Erweiterungen**. Neue Arbeit passiert in Feature-Branches
und kommt per PR in `main` (Schritt 3). Upstream-Updates holst du per **echtem
Merge** in `main`:

```bash
git checkout main
git pull origin main            # deinen aktuellen Fork-Stand holen
git fetch upstream
git merge upstream/main         # Original-Updates einmischen
# Konflikte lösen (dank [fork]-Marker leicht zu finden), dann prüfen:
npm run typecheck && npm run build && npm test -w @hapulse/core
git push origin main
```

Konflikte entstehen praktisch nur in den wenigen mit `// [fork]` markierten
Upstream-Dateien (Inventar unten) — wegen der Datei-Isolation bleibt das klein.

> Merke: seit dem Merge der Fork-Features ist `main` **kein** reiner
> Upstream-Spiegel mehr, deshalb `git merge` statt `--ff-only`.

---

## 3. Eigene Erweiterungen in Feature-Branches

Neue Features nicht direkt auf `main`, sondern in einem Branch — dann per PR
zurück nach `main`:

```bash
git checkout main && git pull origin main
git checkout -b feature/mein-feature
# ... entwickeln, committen ...
git push -u origin feature/mein-feature
# danach PR  feature/mein-feature -> main  öffnen und mergen
```

So bleibt `main` immer buildbar und die History nachvollziehbar. Läuft parallel
ein Upstream-Merge in `main`, hol ihn danach mit `git merge main` in deinen
offenen Feature-Branch (behält die History; `rebase main` nur auf noch nicht
geteilten Branches).

---

## 4. Konflikte minimieren — die wichtigste Regel

Je weniger du an **bestehenden** Upstream-Dateien änderst, desto reibungsloser
der Merge. Konkret in diesem Projekt:

1. **Neue Funktionen = neue Dateien.** Neue Komponenten/Module kollidieren
   praktisch nie beim Merge.
2. **Bestehende Dateien nur minimal und markiert anfassen.** Jede Fork-Zeile in
   einer Upstream-Datei trägt den Marker `// [fork]` (bzw. `/* [fork] */` in
   CSS). So findest du deine Änderungen sofort wieder — auch nach einem Merge:
   ```bash
   git grep -n "\[fork\]"
   ```
3. **Keine Umformatierungen** von Upstream-Dateien (kein Reindent, keine
   Import-Sortierung) — das erzeugt Konflikte ohne Nutzen.
4. **Design-Tokens statt Hex-Werte** und die vorhandenen Bausteine (`Modal`,
   `Card`, `EmptyState`, `.btn …`) wiederverwenden — dann bleibt alles im Stil
   und du änderst weniger.

---

## 5. Inventar der Fork-Änderungen

Damit bei einem Upstream-Merge klar ist, wo Konflikte entstehen können.

### Neue Dateien (konfliktfrei)

| Datei | Zweck |
|---|---|
| `packages/core/src/sensorHistory.ts` | Numerisches Sample-Parsing + Demo-Daten für den Pool-Laufzeit-Chart (umbenannt von `history.ts`, um mit Upstreams eigener `history.ts` zu koexistieren) |
| `apps/dashboard/src/ha/history.ts` | History-Facade (`getHistory`, live/demo) — nur noch für `PoolChartCard` |
| `apps/dashboard/src/pages/Nvr.tsx` | NVR-Routen-Einstieg (`/nvr/*`) der nativen Sentinel-Integration |
| `apps/dashboard/src/nvr/**` | Native Sentinel-NVR-Integration (API-Client, Store, Player-Port, Komponenten, Seiten, Home-Karte, CSS) — siehe `docs/NVR-INTEGRATION.md` |
| `packages/core/src/sentinel.ts` | DOM-freies Sentinel-Datenmodell + Helfer (Setup-Parsing, Speicherprognose, Zeitleisten-Runs) |
| `docs/NVR-INTEGRATION.md` | Architektur + Rausnehmen/Neu-Integrieren der NVR-Integration |
| `apps/dashboard/src/stores/navOrderMigration.ts` | Einmalige Seitenleisten-Migration (Übersicht, Räume, NVR, Pool vorn) für gespeicherte `navOrder` |
| `apps/dashboard/test/navOrder.test.ts` | Tests dazu |
| `apps/dashboard/src/stores/settingsScope.ts` | Globale Verwaltung: Scope-Tabelle GLOBAL/USER/DEVICE/SECRET, Extrakt/Diff/Merge, Dokumentformat |
| `apps/dashboard/src/stores/settingsApplyGuard.ts` | Gemeinsamer „Remote wird angewendet“-Schutz beider Sync-Module |
| `apps/dashboard/src/stores/globalSettingsStore.ts` | UI-Zustand der globalen Verwaltung (`hapulse:global-meta` in localStorage) |
| `apps/dashboard/src/ha/globalSettings.ts` | Lesen/Anwenden/Schreiben von `hapulse:global` (HA `system_data`), Einrichten, Teilen |
| `apps/dashboard/src/ha/userSettingsSync.ts` | USER-Felder unter `hapulse:user-settings` (nur im verwalteten Modus) |
| `apps/dashboard/src/ha/managedHooks.ts` | `useIsManaged`, `useSettingsLocked`, `useEditingEnabled` |
| `apps/dashboard/src/components/settings/{GlobalSettingsAdmin,ManagedHint,DeviceModeRow}.tsx`, `GlobalSettings.css` | Admin-Zeilen + Bestätigung, Sperrhinweis, Hell/Dunkel pro Gerät |
| `apps/dashboard/src/components/home/FavoriteToggle.tsx` | Stern im Entity-Detailfenster (eigene Favoriten) |
| `apps/dashboard/test/globalSettings.test.ts` | Tests mit nachgebautem HA (user_data/system_data) |
| `apps/dashboard/test/cameraSource.test.ts` | Kameraquelle, Filter, Raumzuordnung, Namensvorschlag |
| `apps/dashboard/src/components/pool/poolFormat.ts`, `test/poolFormat.test.ts` | Pool: Ring-Restzeit (h:mm ab 1 h), „bis morgen/Wochentag“ |
| `packages/core/src/numberFormat.ts` | `formatNumber` — sprachabhängige Zahlen (Dezimalkomma, Tausendergruppierung), Standard `'en'` |
| `packages/core/src/garage.ts`, `apps/dashboard/test/garage.test.ts` | Garagentore/Tore (`cover` garage/gate): Erkennung, Status, Aktionen, Zusammenfassung |
| `apps/dashboard/src/components/garage/*` | Garagen-Karte, -Liste, Sicherheits-Sektion, Bestätigung, Symbole, gemeinsame Ton-/Textregel (`garageText.ts`) |
| `apps/dashboard/src/components/home/chipmodals/{GarageModal,LocksModal}.tsx` | Fenster der Home-Chips „Garage“ und „Schlösser“ |
| `apps/dashboard/src/lib/defaultSlot.ts` | Standardplatz neuer Sektionen in älteren gespeicherten Reihenfolgen |
| `packages/core/src/forkChangelog.ts`, `packages/core/scripts/gen-fork-changelog.mjs`, `CHANGELOG.fork.md` | Eigene Releases F1, F2, … (DE + EN) + generierte Markdown-Fassung |
| `apps/dashboard/src/components/changelog/{ForkChangelogModal.tsx,forkEntries.ts}`, `test/forkChangelog.test.ts` | Changelog-Anzeige mit Upstream- und Fork-Releases, Kompaktansicht |
| `apps/dashboard/test/nvrLocales.test.ts` | Jeder `nvr.*`-Schlüssel des Pakets `@sentinel-nvr/web` existiert in HAPulses Locales (sonst erscheint er roh) |
| `packages/core/src/glasTokens.ts` | Stil Glas: Farben, Akzent (`glasAccent`), Federn, Kontrast-Hilfen, Abbildung auf die 24 HAPulse-Tokens + `--g-*` (DOM-frei) |
| `apps/dashboard/src/theme/glasAppearance.ts` | Stil Glas: `applyAppearance` (umhüllt `applyTheme`, schreibt Tokens + `--g-*` + Attribute auf `:root`), `resolveAppearance`, `readPersistedStyle` (Pre-Paint), `watchAppearance` |
| `apps/dashboard/src/app/glas/useUiStyle.ts` | `useUiStyle`/`useIsGlas` für Komponenten |
| `apps/dashboard/src/styles/glas/*.css` | Glas-CSS (`index`, `base`, `accent`, `material`, `motion`; Rahmen seit Etappe 2: `shell`, `tabbar`, `menus`, `titles`, `feedback`; Fenster seit Etappe 3: `sheets`, `sheet-content`); jeder Selektor beginnt mit `:root[data-style='glas']` |
| `apps/dashboard/src/app/glas/{GlasRuntime,GlasTabBar,GlasNavGroups}.tsx`, `{glasScroll,menuKeys,navGroups,shellStore,useLens}.ts` | Glas-Rahmen (Etappe 2): Scroll-Kante und kleiner Titel, Tab-Leiste minimieren, Linse, Pfeiltasten in Räume-/Mehr-Menü, Gruppen der Seitenleiste, Bearbeiten-Angebot je Seite |
| `apps/dashboard/src/components/glas/{AvatarMenu,DoneCapsule,WeatherLine}.tsx`, `weatherIcon.ts` | Glas am Handy: Avatar-Menü (Benachrichtigungen, Bearbeiten, Einstellungen), „Fertig“, Wetterzeile; Wettersymbol je Zustand |
| `apps/dashboard/test/{glasScroll,menuKeys,navGroups}.test.ts` | Tests des Glas-Rahmens |
| `apps/dashboard/src/components/glas/sheet/{useGlasSheet,sheetHost,sheetStack,sheetMath,sheetMotion,origin,ghost,shake}.ts`, `{SheetHeader,SheetGrabber}.tsx`, `SheetContext.ts` | Glas-Fenster (Etappe 3): Sheet, Dialog oder Seite je Breite und Stapel, Stapel mit `inert` und einem Esc für alle, Wachsen aus dem Auslöser und zurück (Geist), Ziehen am Griff, Übergabe an das nächste Fenster, Fokus hinein und zurück, Schütteln bei falschem Code |
| `apps/dashboard/src/components/glas/{NotificationsSheet.tsx,notificationOrder.ts}` | Glas am Handy: Benachrichtigungen als Fenster (neueste zuerst, Verwerfen, „Alle verwerfen“) |
| `apps/dashboard/test/{sheetMath,sheetStack,notificationOrder}.test.ts` | Tests der Fenster |
| `apps/dashboard/scripts/glas-checks-sheets.cjs` | Fenster-Szenen (`win-…`) und `checks --part sheets` für `glas-shots.cjs` |
| `apps/dashboard/src/components/settings/StyleSettings.tsx` | Einstellungen „Stil“, Glas-Stärke, Transparenz reduzieren; `GlasThemeHint` |
| `apps/dashboard/test/{glasAppearance,glasSelectors}.test.ts` | Erscheinung (Umschalten ohne Reste, Pre-Paint-Lesen) und Selektor-Wächter der Glas-CSS |
| `apps/dashboard/scripts/glas-shots.cjs` | Screenshot-Matrix beider Stile, Pixelvergleich, Laufzeitprüfungen (siehe „Feature: Stil Glas“) |
| `docs/GLAS-DESIGN.md`, `docs/GLAS-PLAN.md`, `docs/glas/**` | Designsystem, Etappenplan, Skizze/Screenshots, Umsetzungspläne Etappe 0/1 (`docs/glas/PLAN-ETAPPE-0-1.md`), 2 (`docs/glas/PLAN-ETAPPE-2.md`) und 3 (`docs/glas/PLAN-ETAPPE-3.md`) |
| `docs/SYNC.md` | dieses Dokument |

### Geänderte Upstream-Dateien (alle mit `[fork]`-Marker)

| Datei | Änderung |
|---|---|
| `apps/dashboard/vite.config.ts` | `define` `__HAPULSE_BUILD__` (Build-Kennung `hapulse-<sha7>` in der Sentinel-Telemetrie, `NvrCameraPage.tsx`) |
| `packages/core/src/connection.ts` | `fetchSensorHistory()` + Import (Upstreams eigenes `fetchHistory` bleibt daneben); `getSystemDataStrict`/`setSystemData`/`subscribeSystemData` |
| `apps/dashboard/src/stores/connectionStore.ts` | Globale Verwaltung vor dem Settings-Sync starten, beim Teardown stoppen |
| `apps/dashboard/src/ha/settingsSync.ts` | Verwalteter Modus → nur `userSettingsSync`; gemeinsamer Anwende-Schutz |
| `apps/dashboard/src/app/DashboardApp.tsx`, `main.tsx` | Hell/Dunkel pro Gerät (`modeOverride`) auch im First Paint |
| `apps/dashboard/src/app/DashboardApp.tsx`, `main.tsx` | Stil Glas: `applyAppearance` statt `applyTheme` (auch im First Paint aus `hapulse:settings`), `watchAppearance` statt `watchSystemMode`; `DashboardApp.tsx` importiert `styles/glas/index.css` als letztes Stylesheet (so hat auch ein Host, der `<DashboardApp />` rendert, das Glas-CSS) |
| `apps/dashboard/src/pages/Settings.tsx` | Sperren (Aussehen, Räume), Hell/Dunkel pro Gerät, Admin-Zeilen, Backup-Import im verwalteten Modus |
| `apps/dashboard/src/pages/Settings.tsx` | Stil Glas: `<StyleSettings />` in „Darstellung“; in Glas `GlasThemeHint` statt der Farbwelt-Karten, Akzent-Vorschau aus `glasAccent`; ohne eigenen Farbton folgt der Akzent-Regler einem Stilwechsel |
| `apps/dashboard/src/ha/useDevices.ts`, `pages/Devices.tsx`, `components/devices/DeviceDetailsModal.tsx`, `components/home/chipmodals/WeatherModal.tsx` | wirksamer Bearbeiten-Schalter (`useEditingEnabled`) |
| `apps/dashboard/src/components/music/QueueCard.tsx` | MA-Verbindung nur für Admins im verwalteten Modus |
| `apps/dashboard/src/components/home/EntityDetailModal.tsx` | Favoriten-Stern im verwalteten Modus; bei Kameraquelle Sentinel Hinweis statt HA-Kamerabild |
| `apps/dashboard/src/pages/Security.tsx` | Kameraquelle Sentinel → keine HA-Kameras |
| `apps/dashboard/src/components/security/SecurityHeroCard.tsx`, `components/home/SecurityCard.tsx` | Kamerazähler aus Sentinel |
| `apps/dashboard/src/pages/Room.tsx` | Sektion `nvrCameras`, keine HA-Kameras bei Kameraquelle Sentinel |
| `apps/dashboard/src/pages/Home.tsx` | keine HA-Kamera-Favoriten bei Kameraquelle Sentinel |
| `apps/dashboard/src/ha/useDevices.ts` | `camera.*` ausblenden bei Kameraquelle Sentinel |
| `packages/core/src/index.ts` | Export des `sensorHistory`-, `pool`-, `waste`-, `sentinel`-, `garage`-, `forkChangelog`- und `glasTokens`-Moduls |
| `apps/dashboard/src/components/ui/Modal.{tsx,css}` | Anfangsfokus auf ein Element mit `data-autofocus` (sonst das Panel); kein Fokusrahmen um das Panel selbst |
| `apps/dashboard/src/components/changelog/ChangelogModal.{tsx,css}` | `ReleaseEntry` exportiert (+ optionales `badge`), Stile für Abzeichen und Kompaktliste |
| `apps/dashboard/src/app/AppLayout.tsx`, `pages/Settings.tsx` | `ForkChangelogModal` statt `ChangelogModal`; Auslöser auch bei neuen Fork-Releases; Über: „Version 1.3.2 · F11“ |
| `apps/dashboard/src/stores/{settingsStore,settingsScope}.ts` | `lastSeenFork` (DEVICE, `markVersionSeen` setzt beide Stände) |
| `apps/dashboard/src/stores/settingsStore.ts` | `scryptedUrl`/`scryptedToken`-, `detailHistoryRange`- + Chip-Marker (`poolChipMigrated`, `garageChipMigrated`, `locksChipMigrated`), `wasteSectionMigrated`, `nvrSectionMigrated`, `navOrderV2Migrated` (+ Aufruf `migrateNavOrderV2`); `modeOverride`, `applyGlobal`/`applyUser`/`applySharedSecrets`, `effectiveMode` |
| `apps/dashboard/src/stores/settingsStore.ts` | Stil Glas: `uiStyle`, `glassStrength`, `reduceTransparency` (GLOBAL); `applyGlobal` setzt sie auf den Standard, wenn das Admin-Dokument sie nicht trägt |
| `apps/dashboard/src/app/AppLayout.tsx` | Stil Glas (Etappe 2): `GlasRuntime` vor dem Inhalt, `GlasTabBar` als erste Kinder der Tab-Leiste, Gruppen der Seitenleiste außerhalb des Bearbeiten-Modus (`GlasNavGroups`), Kopf: Zurück 48, Kapsel „Bearbeiten“/„Fertig“ statt des Stift-Knopfs, Wettersymbol je Zustand und „14 °C“ |
| `apps/dashboard/src/components/ui/{PageHeaderActions,EditToggle,PulseLogo}.tsx`, `components/home/GreetingBlock.tsx`, `pages/Room.tsx` | Stil Glas (Etappe 2): Avatar-Menü statt Glocke + Avatar am Handy; `EditToggle` meldet Seiten mit Bearbeiten-Modus und hat die Variante `label` (Kopf-Kapsel); Wortmarke 20/25 700; Wetterzeile unter der Begrüßung; Zurück als Glaskreis 44 |
| `apps/dashboard/src/components/notifications/NotificationsPanel.tsx` | Stil Glas (Etappe 2/3): `useNotifications` und `HANotification` (mit `createdAt`) exportiert (Avatar-Menü, Benachrichtigungs-Fenster), Glocke 44 |
| `apps/dashboard/src/components/ui/Modal.tsx` | Stil Glas (Etappe 3): `useGlasSheet` (Sheet, Dialog oder Seite; Ziehen; Wachsen aus dem Auslöser), Glas-Kopf und Griff, Props `subtitle`, `swipeToClose`, `contentKey`, `returnFocus` (wirken nur in Glas); in Glas setzt die Laufzeit den Fokus |
| `apps/dashboard/src/components/security/AlarmPanelCard.tsx` | Stil Glas (Etappe 3): Ziffernblock als Fenster (Seite im Alarm-Fenster, sonst eigenes Sheet), schüttelt bei falschem Code; Klassisch unverändert |
| `apps/dashboard/src/components/home/chipmodals/LightsModal.tsx` | Stil Glas (Etappe 3): „Alle ausschalten“ ohne Inline-Größe (prominent per Glas-CSS) |
| `apps/dashboard/src/components/home/EntityDetailModal.tsx` | Stil Glas (Etappe 3): `contentKey` = Entity (ein Tipp auf ein Gruppenmitglied tauscht den Inhalt im selben Fenster) |
| `apps/dashboard/src/pages/Home.tsx` | Sections `'waste'` und `'nvr'` (Import, ID, Toggle-Keys, Gate, `renderWidget`) |
| `apps/dashboard/src/pages/Security.tsx` | Section `'nvr'` (Sentinel-Kameras + Ereignisse unter der HA-Kamera-Sektion) |
| `packages/core/src/domain.ts` | `formatEntityState`: Zahl über `formatNumber` (Sprache), numerische Zustände ohne Einheit (sensor/number/input_number/counter) formatiert statt `humanizeState` (Minus ging verloren) |
| `packages/core/src/i18n.ts` | Nicht-ganze Zahlen in Textbausteinen mit Dezimalkomma (ganze Zahlen ungruppiert) |
| `apps/dashboard/src/components/energy/EnergyCards.tsx`, `components/home/EnergyWidget.tsx` | `fmtEnergy`/`fmtCost` mit Sprache (Währung per `Intl`) |
| `apps/dashboard/src/components/{cards,home}/ClimateCard.tsx`, `components/home/RoomCard.tsx`, `components/home/{WeatherHero,chipmodals/WeatherModal}.tsx`, `app/AppLayout.tsx`, `components/home/EntityDetailModal.tsx`, `components/system/SystemMonitorCard.tsx`, `components/devices/DeviceEntityRow.tsx` | Anzeige-Zahlen über `formatNumber` (Sprache) |
| `packages/core/src/demo.ts` | Demo-Pool-Entities (`demoPoolEntities`, IDs wie `poolConfig.ts`) — Pool-Seite in Demo/Labor |
| `packages/core/scripts/smoke.mjs` | Testblöcke „pool schedule“, „waste collection“, „sentinel nvr“, „glas tokens“ |
| `apps/dashboard/src/components/home/SummaryChips.tsx`, `SummaryChipsBar.tsx`, `chipmodals/index.ts` | Chips Pool, Garage, Schlösser in der Home-Leiste (+ Fenster, Standardplatz) |
| `apps/dashboard/src/components/home/SecurityCard.tsx`, `components/security/SecurityHeroCard.tsx` | Garagen-Zeile/-Chip; Schlösser nach gemeinsamer Regel (`lockSummary`: offen rot, blockiert/nicht erreichbar gelb) |
| `apps/dashboard/src/components/security/{LockConfirm,lockLogic}.*` | Bestätigung beim Entriegeln, Code-Feld, Klick-Stopp im Portal; `lockSummary`/`lockTone`/`lockSummaryText` |
| `apps/dashboard/src/pages/{Security,Room}.tsx`, `components/home/{BlindsCard,chipmodals/BlindsAllModal,ActivityCard,FavoriteTile}.tsx`, `components/cards/EntityCard.tsx`, `components/devices/DeviceEntityRow.tsx`, `components/settings/DomainIcon.tsx` | Garagentore als eigene Sektion, raus aus Rollläden, Symbole/Farben |
| `packages/core/src/{domain,roomIcons,demo}.ts` | Garagentore: Zustandsanzeige, Raum-Symbol `car`, Demo-Tore |
| `apps/dashboard/src/components/home/EntityDetailModal.{tsx,css}` | Bereichs-**Pills** (24H/7D/30D) statt Upstreams 24h/7d-Umschalter |
| `docs/DESIGN.md` | Verweis auf den zweiten Stil „Glas“ (`docs/GLAS-DESIGN.md`) |
| `apps/dashboard/src/app/Router.tsx` | Routen `/nvr/*`, `/pool` |
| `apps/dashboard/src/app/AppLayout.tsx` | Nav-Einträge „NVR" + „Pool" (`nav.nvr`, `nav.pool`), direkt nach „Räume" |
| `packages/core/locales/*.json` | i18n-Keys `nav.nvr`, `nav.pool`, `history.error/empty`, `nvr.*`, `pool.*`, `waste.*`, `globalSettings.*`, `garage.*`, `locks.*`, `glas.*`, `home.summaryChips.locksAllLocked`, `home.section.*.{waste,nvr}`, `security.section.*.nvr` in **allen** Sprachen (en/de/es/fr/it/pt/sv) |

> Hinweis: `SensorTile.tsx` und die `.sensor-tile--clickable`-CSS-Regel sind seit
> dem v1.2.0-Merge **wieder Upstream-Stand** — siehe „Feature: Sensor-Verlauf".
>
> Hinweis: JSON erlaubt keine `[fork]`-Kommentare. Deshalb sind alle Fork-Keys
> eindeutig unter `history.*` / `nvr.*` / `pool.*` (+ `nav.nvr`, `nav.pool`)
> benannt und am **Dateiende** jeder Locale angehängt — so bleibt die
> Merge-Fläche minimal.
>
> **Wichtig:** Der Parity-Test (`packages/core/scripts/smoke.mjs`) verlangt
> **identische Keys in allen Sprachen**. Neue Fork-Strings also immer in *jede*
> `locales/*.json` eintragen, sonst wird `npm test` rot.

### Gelöschte Upstream-Dateien

| Datei | Grund |
|---|---|
| `apps/dashboard/src/components/security/AlarmCard.{tsx,css}` | nirgends importiert (die Alarm-Bedienung ist `AlarmPanelCard`); bei einem Upstream-Merge „modified/deleted“ → gelöscht lassen, solange Upstream sie nicht wieder einbindet |

---

## 6. Changelog pflegen

Upstreams Release-Notes (`packages/core/src/changelog.ts`, `CHANGELOG.md`, `version` in den `package.json`) **nie**
für Fork-Änderungen anfassen — sie kommen per Upstream-Merge. Eigene, für Nutzer sichtbare Änderungen kommen im
selben PR nach `packages/core/src/forkChangelog.ts` (neuer Release `F<n+1>`, Datum = Merge-Tag, DE + EN, kurz,
ohne Schlusspunkt), dann:

```bash
npm run build -w @hapulse/core && node packages/core/scripts/gen-fork-changelog.mjs   # → CHANGELOG.fork.md
```

Bei einem Upstream-Merge mit neuem Release zeigt „Was ist neu“ beides (nach Datum gemischt); nichts weiter zu tun.

## 7. Vor jedem Push kurz prüfen

```bash
npm run typecheck
npm run build
npm test -w @hapulse/core
```

---

## Feature: NVR (Sentinel NVR, nativ)

Scrypted-Kameras sind i. d. R. **nicht** als HA-Entities exportiert, tauchen
also nicht auf der Security-Seite auf. Die **NVR**-Seite rendert stattdessen
Sentinel NVR (Scrypted-Plugin) **nativ** über dessen HTTP/WebSocket-API:
Übersicht (`/nvr`), Kamera-Zeitleiste mit Live/Aufnahme-Video (`/nvr/:id`)
und eine Home-Karte. Verbindung (Scrypted-URL + Token) wird auf der Seite
gesetzt: die URL liegt in den (mit HA synchronisierten) Einstellungen, das Token
bleibt **gerätelokal** (unter globaler Verwaltung kann der Admin es teilen, s. u.).
Architektur, CORS-Details und die Anleitung zum **kompletten Rausnehmen**:
`docs/NVR-INTEGRATION.md`. Die frühere iframe-Einbettung ist damit abgelöst.

## Feature: Sensor-Verlauf

**Stand seit Upstream v1.2.0:** Upstream hat ein eigenes **Entity-Detail-Modal**
(„more-info", Werte-Chart + Logbook für *alle* Entities) eingeführt, das beim Tap
auf eine Kachel über `uiStore.openEntityDetail` (via `EntityCard`) aufgeht. Ein
Sensor-Tap öffnet jetzt dieses Modal. Das frühere eigene History-Modal des Forks
war damit redundant und wurde **entfernt** (`components/history/*`,
`ha/useHistory.ts`); `SensorTile.tsx` ist wieder Upstream-Stand.

**Fork-Anpassung am Detail-Modal:** Upstreams schlichter 24h/7d-Umschalter wurde
durch eine **Pill-Auswahl (24H/7D/30D)** ersetzt — `[fork]`-markiert in
`EntityDetailModal.{tsx,css}` (`.entity-detail__ranges`/`__range-btn`, Stil des
alten History-Modals). Die Auswahl wird **pro User in den Settings gespeichert**
(`customization.detailHistoryRange`) und bleibt über Entities/Öffnen hinweg
erhalten. Beim Umschalten bleibt das alte Diagramm stehen und dimmt kurz ab,
bis die neuen Daten da sind (Cross-Fade statt Blank) — `.entity-detail__history-view`
in der CSS. Auch die **Pool-Kacheln** („Usage & runtime") öffnen jetzt dieses
Detail-Modal statt eines eigenen Modals.

**Was vom Fork-History bleibt (nur für den Pool-Laufzeit-Chart):**
`packages/core/src/sensorHistory.ts` (numerisches Sample-Parsing + Demo-Daten;
umbenannt von `history.ts`, um mit Upstreams `history.ts` zu koexistieren) und
`apps/dashboard/src/ha/history.ts` (`getHistory`). Die HA-Fetch-Methode heißt
`HAConnection.fetchSensorHistory` — Upstreams `fetchHistory`/`history.ts`/
`HistoryPoint` existieren unverändert daneben. `PoolChartCard` bucketet die
State-History via `dailyRuntimeBars` zu Laufzeit-Balken pro Tag.

## Feature: Stil Glas

Zweiter Stil neben Klassisch, nur Aussehen und Bewegung (Plan `docs/GLAS-PLAN.md`, Design `docs/GLAS-DESIGN.md`, Stand
und Abweichungen `docs/glas/PLAN-ETAPPE-0-1.md`, `docs/glas/PLAN-ETAPPE-2.md` und `docs/glas/PLAN-ETAPPE-3.md`). Klassisch bleibt Upstream-Stand: Glas schreibt seine Werte nur, wenn
`<html data-style="glas">` gesetzt ist, und jede Regel in `styles/glas/` beginnt mit `:root[data-style='glas']`.

Nach jedem Upstream-Merge:

1. `npm test -w @hapulse/dashboard` — der Selektor-Wächter (`test/glasSelectors.test.ts`) meldet jede Klasse, auf die
   Glas-CSS zielt und die Upstream umbenannt oder entfernt hat.
2. Neue HAPulse-Tokens in `ThemeTokens` → `glasThemeTokens` (`packages/core/src/glasTokens.ts`) muss sie abbilden
   (`npm run typecheck` schlägt sonst fehl), dazu `docs/glas/glas-tokens.json → classicMapping` (`smoke.mjs` vergleicht).
3. Neue Flächen in Akzentfarbe (`background: var(--accent)`) → in `styles/glas/accent.css` aufnehmen; sonst erscheinen
   sie in Glas in der dunkleren Akzent-Ink (lesbar, aber nicht wie die Skizze). Neue Schalter: den Knopf im
   eingeschalteten Zustand in die Knopf-Regel dort aufnehmen (in Glas weiß).
4. Neue Ränder an Karten, die einen Zustand zeigen (`border-color` an einem Element mit `.card`), → in die
   `:not(…)`-Liste in `styles/glas/base.css`; sonst blendet Glas sie mit den übrigen Kartenrändern aus.
5. Seit Etappe 2 (Rahmen) zusätzlich: eine neue Seite in `NAV_CONFIG` landet in der Seitenleisten-Gruppe „Bereiche“,
   bis `app/glas/navGroups.ts` sie einordnet; Lucide-Symbole, die die Tab-Leiste gefüllt zeigt, prüft der
   Selektor-Wächter (Klasse und Teile, `FILLED_ICONS`) — ein Lucide-Update, das sie ändert, fällt dort auf; neue
   Elemente in `.app-content`, `.app-tabs` oder der Seitenleiste vor dem Merge in beiden Stilen ansehen (Glas fixiert
   den Kopf, die Tab-Leiste und die Seitenleiste).
6. Screenshot-Matrix beider Stile ansehen und die Laufzeitprüfungen laufen lassen:
   `node apps/dashboard/scripts/glas-shots.cjs shoot --serve apps/dashboard/dist <ordner> --style classic|glas`,
   `… checks --serve apps/dashboard/dist` (Kopf des Skripts beschreibt `compare` und `checks`).
7. Seit Etappe 3 (Fenster): jedes Fenster, das `Modal` nutzt, bekommt in Glas Rahmen, Kopf, Griff und Bewegung von
   selbst. Upstream-Änderungen an `components/ui/Modal.tsx` (Fokus, Portal, Esc, Props) mit
   `components/glas/sheet/useGlasSheet.ts` abgleichen: in Glas übernimmt die Laufzeit Fokus, Esc und Scroll-Sperre.
   Neue Fenster und neue Inhalte in Fenstern in beiden Stilen ansehen (Szene in `scripts/glas-checks-sheets.cjs`
   ergänzen, `shoot --scenes win-…`, `checks --part sheets`); Textfelder in Fenstern brauchen in Glas mindestens
   16 px (die Prüfung `sheetsAll` meldet kleinere). Nach einem React-Update `checks --part sheets` immer laufen lassen:
   das Schließen (der Geist, `ghost.ts`) hängt an der Reihenfolge, in der React beim Entfernen Refs löst
   (PLAN-ETAPPE-3 K47).
