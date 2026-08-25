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

- **Sensor-Verlauf**: Klick auf numerische Sensor-Kachel → History-Modal
  (Inline-SVG-Chart). Dateien: `packages/core/src/history.ts`,
  `apps/dashboard/src/ha/{history.ts,useHistory.ts}`,
  `apps/dashboard/src/components/history/*`.
- **NVR-Seite**: bettet die Scrypted-Web-UI per iframe ein. Route `/nvr`,
  `apps/dashboard/src/pages/Nvr.{tsx,css}`, Setting `customization.scryptedUrl`.
- **Pool-Seite**: native Poolpumpen-Steuerung im HAPulse-Stil (ersetzt das
  Lovelace-`dashboard-pool`). Route `/pool`, `apps/dashboard/src/pages/Pool.{tsx,css}`,
  Karten unter `apps/dashboard/src/components/pool/*`, Entity-Wiring in
  `poolConfig.ts`, Service-Facade `apps/dashboard/src/ha/pool.ts`. Enthält
  Hero-Pumpenstatus + Modus-Umschalter, Solar-Gauge mit editierbarer Schwelle,
  Manuell-Timer-Ring, Laufzeit/Verbrauch (History-Modal wiederverwendet), einen
  **vollen Zeitplan-Editor** (grafische Tages-Timeline, schreibt via
  `scheduler.edit`), einen **Verbrauchs-Chart** (`PoolChartCard`, nutzt
  `HistoryChart`) und eine Admin-Sektion (nur HA-Admins). Scheduler- und
  Slot-Konvertierung (Timeslots ↔ On-Fenster ↔ Tages-Slots) liegt DOM-frei in
  `packages/core/src/pool.ts` (getestet in `packages/core/scripts/smoke.mjs`).
  Die Seite ist ein **editierbares Sektions-Grid** wie Home/Energie/System
  (Stift: umsortieren/ein-/ausblenden/Größe), Settings-Felder `poolSection*`.
  Pool erscheint zudem als **Chip** in der Home-Summary-Leiste (`PoolModal`,
  `home.summaryChips.pool*`). Alles blendet sich aus, wenn die Pool-Entities
  fehlen.

## Geplantes Feature — Trigger „mach es"

Wenn der User sinngemäß **„mach es"** / „mach die native Integration" sagt, ist
die **native Live-Kamera-Integration im HAPulse-Stil** gemeint. Der vollständige,
umsetzungsfertige Plan steht in **`docs/NVR-NATIVE-PLAN.md`** — dann diesen Plan
Schritt für Schritt abarbeiten.
