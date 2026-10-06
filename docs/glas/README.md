# docs/glas — Referenz für den Stil „Glas“

Dieser Ordner enthält die **freigegebene Design-Skizze „Glas 5“** und alles, was die Umsetzung braucht. Er wird nicht
gebaut und nicht ausgeliefert.

| Pfad | Inhalt |
|---|---|
| `../GLAS-DESIGN.md` | **Designsystem** (Tokens, Glas-Rezept, Typografie, Bewegung, Komponenten-Katalog, Apple-Grundlagen) |
| `../GLAS-PLAN.md` | **Umsetzungsplan** (Architektur, Etappen, Prüfungen, Entscheidungen des Users in §7.3, Start-Prompt in §8) |
| `glas-tokens.json` | Tokens maschinenlesbar (Quelle für `packages/core/src/glasTokens.ts`) |
| `skizze/Glas5Handy.dc.html`, `skizze/Glas5Desktop.dc.html` | Die freigegebene Skizze (Handy 390×844, Desktop/iPad 1440×1000) — Markup, CSS-Tokens, Federkurven und Interaktionen sind dort exakt abzulesen |
| `skizze/Glas5*-*.dc.html` | Zustands-Artboards (dunkel, Avatar-Menü, Licht-Sheet, Detail, Wetter, Inspector), importieren die beiden Hauptdateien mit Props |
| `screens/*.webp` | Screenshots der Skizze: `g5h-*` Handy, `g5d-*` Desktop, `g5e-*` Energie-Karte, `g4h-*`/`g4d-*` Chip-Fenster aus Glas 4 (Inhalt identisch in Glas 5) |
| `HAPULSE-INVENTORY.md` | Checkliste aller ~250 HAPulse-Funktionen — **nichts davon darf in Glas verloren gehen** |
| `spec/SPEC*.md` | Entstehungsgeschichte der Skizze (Beispieldaten, Glas-Rezept, Bewegung, Entscheidungen Glas 4 und Glas 5) |

## Skizze ansehen

- **Online (klickbar):** Design-Leinwand <https://claude.ai/artifact/3ASR75aENSKM1Twdy1WYps> (privat; Reihen „Glas 5“
  ganz unten; blau markierte Artboards über „Play“ bedienen). Dort liegen zum Vergleich auch Vorher, Glas 1–4.
- **Lokal rendern:** Die `.dc.html`-Dateien brauchen die Laufzeit der Leinwand als `support.js` im selben Ordner
  (nicht eingecheckt). Sie lässt sich mit dem Artifact-Tool lesen (`action: read`, `path: "artifact-type/dc-runtime.js"`
  der Leinwand) und als `support.js` neben die Dateien legen; Kamerabilder werden über `/_blob/<id>` geladen (fehlen
  lokal → leere Bildflächen). Dann `python3 -m http.server` im Ordner und Chromium/Playwright auf die Datei.

## Wichtig

- Die Skizze ist **Referenz, kein Code zum Kopieren**: Sie ist ein einzelnes HTML-Artboard mit Beispieldaten. Umgesetzt
  wird in den bestehenden HAPulse-Komponenten gemäß `GLAS-PLAN.md` (gleiche Komponenten, Stil per `data-style`).
- Beispieldaten (Anna, Wohnzimmer, 8,4 kWh …) stammen aus `spec/SPEC.md` §3 und sind keine echten Daten.
