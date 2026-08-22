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

## Geplantes Feature — Trigger „mach es"

Wenn der User sinngemäß **„mach es"** / „mach die native Integration" sagt, ist
die **native Live-Kamera-Integration im HAPulse-Stil** gemeint. Der vollständige,
umsetzungsfertige Plan steht in **`docs/NVR-NATIVE-PLAN.md`** — dann diesen Plan
Schritt für Schritt abarbeiten.
