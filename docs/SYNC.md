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
| `docs/SYNC.md` | dieses Dokument |

### Geänderte Upstream-Dateien (alle mit `[fork]`-Marker)

| Datei | Änderung |
|---|---|
| `packages/core/src/connection.ts` | `fetchSensorHistory()` + Import (Upstreams eigenes `fetchHistory` bleibt daneben); `getSystemDataStrict`/`setSystemData`/`subscribeSystemData` |
| `apps/dashboard/src/stores/connectionStore.ts` | Globale Verwaltung vor dem Settings-Sync starten, beim Teardown stoppen |
| `apps/dashboard/src/ha/settingsSync.ts` | Verwalteter Modus → nur `userSettingsSync`; gemeinsamer Anwende-Schutz |
| `apps/dashboard/src/app/DashboardApp.tsx`, `main.tsx` | Hell/Dunkel pro Gerät (`modeOverride`) auch im First Paint |
| `apps/dashboard/src/pages/Settings.tsx` | Sperren (Aussehen, Räume), Hell/Dunkel pro Gerät, Admin-Zeilen, Backup-Import im verwalteten Modus |
| `apps/dashboard/src/ha/useDevices.ts`, `pages/Devices.tsx`, `components/devices/DeviceDetailsModal.tsx`, `components/home/chipmodals/WeatherModal.tsx` | wirksamer Bearbeiten-Schalter (`useEditingEnabled`) |
| `apps/dashboard/src/components/music/QueueCard.tsx` | MA-Verbindung nur für Admins im verwalteten Modus |
| `apps/dashboard/src/components/home/EntityDetailModal.tsx` | Favoriten-Stern im verwalteten Modus |
| `packages/core/src/index.ts` | Export des `sensorHistory`-, `pool`-, `waste`- und `sentinel`-Moduls |
| `apps/dashboard/src/stores/settingsStore.ts` | `scryptedUrl`/`scryptedToken`-, `detailHistoryRange`- + Pool-Chip-Setting (`poolChipMigrated`), `wasteSectionMigrated`, `nvrSectionMigrated`, `navOrderV2Migrated` (+ Aufruf `migrateNavOrderV2`); `modeOverride`, `applyGlobal`/`applyUser`/`applySharedSecrets`, `effectiveMode` |
| `apps/dashboard/src/pages/Home.tsx` | Sections `'waste'` und `'nvr'` (Import, ID, Toggle-Keys, Gate, `renderWidget`) |
| `apps/dashboard/src/pages/Security.tsx` | Section `'nvr'` (Sentinel-Kameras + Ereignisse unter der HA-Kamera-Sektion) |
| `packages/core/scripts/smoke.mjs` | Testblöcke „pool schedule“, „waste collection“, „sentinel nvr“ |
| `apps/dashboard/src/components/home/SummaryChips.tsx` | Pool-Chip in der Home-Leiste |
| `apps/dashboard/src/components/home/EntityDetailModal.{tsx,css}` | Bereichs-**Pills** (24H/7D/30D) statt Upstreams 24h/7d-Umschalter |
| `apps/dashboard/src/app/Router.tsx` | Routen `/nvr/*`, `/pool` |
| `apps/dashboard/src/app/AppLayout.tsx` | Nav-Einträge „NVR" + „Pool" (`nav.nvr`, `nav.pool`), direkt nach „Räume" |
| `packages/core/locales/*.json` | i18n-Keys `nav.nvr`, `nav.pool`, `history.error/empty`, `nvr.*`, `pool.*`, `waste.*`, `globalSettings.*`, `home.section.*.{waste,nvr}`, `security.section.*.nvr` in **allen** Sprachen (en/de/es/fr/it/pt/sv) |

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

---

## 6. Vor jedem Push kurz prüfen

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
