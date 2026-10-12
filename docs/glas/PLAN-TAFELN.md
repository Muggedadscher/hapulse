# Plan: einheitliche Kopf-Tafeln in Glas (Stil A)

Stand 2026-10-11. Auftrag des Users: neue, „mehr Apple/iOS 26“ Entwürfe der großen Karten oben auf den Seiten. Er wählte
Variante A („Zusammenfassung“) und dann „Ja, alle acht“, dazu „sehr sauber, alles bedenken“. Nach den Bildern
(2026-10-12): „alles gut bis auf Pool. Das soll bei vorher bleiben“; die Pool-Karte bleibt deshalb unverändert, es sind
sieben Tafeln. Nur Glas; Klassisch bleibt pixelgleich. Entscheid GLAS-PLAN §7.3 E18, Design GLAS-DESIGN §7.34. Der Plan
wurde vor der Umsetzung unabhängig geprüft; die Befunde der Prüfung sind unten eingearbeitet.

## 1. Muster „Tafel“ (gilt für alle sieben)

- **Kopf:** Symbol 28 in einem Kreis 56, Zeile 13/18 `label2` darüber, Zustand 22/28 700 in der Ink seines Zustands
  (ok grün, warn `warnInk`, danger `redInk`; ohne Zustand `label`), optional eine Zeile 15/20 darunter.
  Kreis: Zustand = `<ton>Soft` + Ink, sonst `fill` + `label2`.
- **Raster:** `<dl>` mit Zellen (Symbol 15 + Beschriftung 13/18 600 `label2`, darunter der Wert). Zahlen 28/34 600,
  Wörter 17/22 600. Haarlinien 0,5 `sep` nur zwischen Zellen. Spalten `auto-fit` mit Mindestbreite und Obergrenze
  (4 bzw. 3), damit keine einzelne Zelle in einer letzten Reihe hängt, wo es vermeidbar ist.
- **Farbe nur für Abweichungen** (GLAS-DESIGN §2.2, wie die Status-Chips K87): Zählwerte, Geschlossenes, Verriegeltes
  und Ruhe `label2`; offene Türen/Fenster, Bewegung und Störungen `warnInk`, offene Schlösser und Garagentore `redInk`,
  je an Symbol und Wert; Solar `yellowInk` am Symbol als Diagrammfarbe (§2.4).
- Keine grauen Kacheln/Kapseln, kein Verlauf auf der Karte, kein Hover; der Seitentitel wird nicht wiederholt.
- Ringe (System): Spur `fill`, Bogen in der Vollfarbe der klassischen Schwelle.

## 2. Die sieben Tafeln (Inhalte bleiben, nur die Darstellung ändert sich)

| Seite | Kopf | darunter |
|---|---|---|
| Geräte | Gesundheit (Zeile „System“) | Raster: Integrationen, Geräte, Entitäten, Räume |
| System | Gesundheit | Ringe CPU/RAM/Speicher, Hinweiszeilen (schwache Batterien, nicht verfügbar; beide `warnInk`, denn die Gesundheit im Kopf zählt nur die Messwerte) |
| Energie | Zeitraum-Segment, Hausverbrauch groß | Raster: Aus dem Netz, Eingespeist, Solar, Batterie-Abgabe, Netzkosten |
| Sicherheit | Alarm (scharf grün, ausgelöst/wartend rot, sonst `label`) | Personen-Zeile, Raster: Schlösser, Garagentore, Türen, Fenster, Bewegung, Kameras |
| NVR | Kameras/Speicher (jedes Problem rot wie die Pille des Pakets) | Raster: Ereignisse heute, Aufnahme, Belegt, Aufbewahrung (unerreichbar `warnInk`) |
| Automationen | zuletzt ausgeführt (Name, Zeit); ohne Lauf „Nie“ | Raster: Automationen, Aktiv, Deaktiviert, Kategorien |
| Szenen | zuletzt genutzt (Name, Zeit); ohne Nutzung „Nie“ | Raster: Szenen, Heute genutzt, Räume |

## 3. Dateien

- Neu `components/glas/tafel/` (`Tafel.tsx` Bausteine, je Seite `*Tafel.tsx`, `health.tsx`, `heroes.tsx` = Weichen mit den
  Upstream-Namen), CSS `styles/glas/tafel.css`. Pool (`PumpHeroCard.tsx`, `styles/glas/pool.css`) bleibt wie auf main.
- Weiche nur in Glas im Elternteil (Hooks bleiben stabil, Stilwechsel zur Laufzeit möglich): die Seiten importieren den
  Hero aus `heroes.tsx` (je eine `[fork]`-Zeile); `nvr/NvrHeroGlas.tsx` direkt. Die
  Karte behält ihre Klasse (`devices-hero`, `energy-hero`, …): Raster- und Bearbeiten-Regeln (pages.css, edit.css)
  greifen weiter. Upstream-Exporte nur wo nötig, je mit `[fork]`: `PeriodSelector`, `deriveHealth`/`metricChipClass`,
  `alarmGradientClass`, `formatRelativeTime` (Automationen, Szenen).
- Tote Glas-Regeln der alten Innen-Klassen entfernt (pages.css, devices.css, energy.css, system.css, nvr.css);
  das Abdunkeln der Energie-Tafel beim Laden (.5) lässt nur das Segment aus.
- Texte: `glas.tafel.doorsClosed`, `.windowsClosed`, `.garageClosed` (je Sprache in der richtigen Form, z. B. fr
  „Fermées“, pt Tore „Fechados“), `glas.tafel.noMotion`; sonst vorhandene Schlüssel.
- Fork-Changelog F45, `CHANGELOG.fork.md`; GLAS-DESIGN §7.34, GLAS-PLAN §7.3 E18, Hinweis bei K90 (PLAN-ETAPPE-5).

## 4. Prüfungen

- typecheck, build, `npm test` (core + dashboard: Selektor-Wächter, Locales, Groß-/Kleinschreibung, Changelog), ESLint.
- Prüfskripte: `glas-checks-pages.cjs` liest die Fakten der Heroes aus beiden Markups (Klassisch und Tafel) und vergleicht
  sie; eine gemeinsame Tafel-Prüfung (Kreis 56, Zustand 22/28 700, keine Versalien, kein Verlauf, Farben nach Ton, nichts
  abgeschnitten) für alle Seiten; `glas-checks-nvr.cjs` ebenso für den NVR-Kopf, erzwungene Farben `Highlight`.
- Bildvergleich Klassisch gegen main: 0 Pixel. Glas: Handy/iPad/Desktop, hell/dunkel, `--strength opaque`,
  `--forced-colors`, Französisch (lange Wörter).
- Checks `--part pages`, `nvr`, `polish` ganz; Klick-Fuzz (Klassisch + Glas) einmal vor dem Merge.
- Unabhängiges Code-Review, CI grün. Merge erst nach dem OK des Users zu den Bildern im PR.
