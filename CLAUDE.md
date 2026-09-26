# CLAUDE.md — Arbeitsanweisungen für diesen Fork

Dies ist ein **Fork** von [jlnbln/HAPulse](https://github.com/jlnbln/HAPulse).
Ziel des Users: eigene Erweiterungen einbauen **und** Upstream-Updates weiter
sauber übernehmen können.

## Fork-Konventionen (immer einhalten)

- Upstream-Updates & Merge-Workflow: siehe **`docs/SYNC.md`**.
- **Neue Funktionen möglichst als neue Dateien** — minimiert Merge-Konflikte.
- Jede Änderung an einer **bestehenden Upstream-Datei** mit `// [fork]`
  (bzw. `/* [fork] */` in CSS) markieren. Finden: `git grep "\[fork\]"`.
- Keine Umformatierungen von Upstream-Dateien. Nur Design-Tokens (kein Hex),
  vorhandene Bausteine wiederverwenden (`Modal`, `Card`, `EmptyState`, `.btn …`).
- `@hapulse/core` bleibt React-/DOM-frei (HA-Logik dort, Components sind dünn).
- Vor jedem Push: `npm run typecheck && npm run build && npm test -w @hapulse/core`.
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
  sehen dann dasselbe). `scryptedToken`/`maToken` sind GERÄTELOKAL: `exportSettings()` strippt sie,
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

- **Zahlen immer sprachabhängig**: Angezeigte Zahlen nur über `formatNumber` (`@hapulse/core`,
  `numberFormat.ts`) bzw. `formatEntityState(entity, locale)` — nie `toFixed`/`${n}` in UI-Text
  (Upstream zeigte überall „5.5“ statt „5,5“). Ausnahmen: Werte an HA, SVG/CSS, Uhrzeiten, Versionsnummern.

## Optionales Folge-Feature — HA-Kameras live

`docs/NVR-NATIVE-PLAN.md` beschreibt einen **anderen**, noch nicht gebauten
Ausbau: Live-Streams für **beliebige HA-`camera.*`-Entities** (HLS/WebRTC über
Home Assistant) in der Security-`CameraGrid`. Die Sentinel-Integration oben ist
davon unabhängig und bereits umgesetzt.
