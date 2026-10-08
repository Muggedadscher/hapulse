# Glas Etappe 4 — Übersicht komplett (kurzer Plan)

Stand `main` a8bd8f7 (nach PR #107). Ablauf nach [GLAS-PLAN §3](../GLAS-PLAN.md): kurzer Plan, unabhängig geprüft,
ein PR. Wie die Teile aussehen, steht in [GLAS-DESIGN](../GLAS-DESIGN.md) §7.5–7.22 und §7.32; hier steht nur, was
gebaut wird, wo und wie es geprüft wird. Pfade relativ zu `apps/dashboard/src/`, Core = `packages/core/src/`.

## 1. Festlegungen

| # | Festlegung |
|---|---|
| K74 | **Klassisch ändert sich nur durch die neuen Inhalte aus E3/E9:** die Hinweise-Karte (nur wenn etwas abweicht), die Untertitel der Szenen-Kacheln („Aktiv“ bzw. „5 Geräte“) und Netz/Solar gestapelt samt Zeile „PV-Ertrag“ in der Energie-Karte. Alles andere bleibt pixelgleich mit `main`. Weil Klassisch damit nicht mehr pixelgleich ist, legt der Thread Jannick vor dem Merge Vorher/Nachher-Bilder vor und fragt; die stehende Merge-Erlaubnis gilt nur für pixelgleiches Klassisch. |
| K75 | **Energie in Glas = V4** (`glas/energie-varianten`, Frage an Jannick offen; eine andere Variante ändert nur die Karte). Zeiträume = die vorhandenen von `useEnergy`: Tag stündlich, Woche ab Montag und Monat ab dem 1. täglich, wie die Energieseite; Zukunft als 3-px-Stummel. Balken = `gridConsumed` unten + `solar` oben je Stunde bzw. Tag (dieselbe Summe wie heute), Zahl = `homeConsumption`, PV-Ertrag = `solarProduced` (nur mit Solarquelle). Vergleich mit demselben Abschnitt des Zeitraums davor (gestern bis zur selben Uhrzeit, Vorwoche bis zum selben Wochentag und zur selben Uhrzeit, Vormonat bis zum selben Tag); ein zusätzlicher Statistik-Abruf je Zeitraum, ohne Daten entfällt die Zeile. |
| K76 | **Hinweise** nach GLAS-PLAN §2.11 (E4: Tür ab 10 min offen, ohne Batterien, Müll heute oder morgen); „Kamera offline“ nur mit Sentinel als Kameraquelle. Die reine Schloss-Regel zieht nach Core (`locks.ts`), `components/security/lockLogic.ts` re-exportiert sie. Ohne Abweichung keine Karte, auch im Bearbeiten-Modus (wie Müll und NVR). Sektion `'hints'` steht vorn (Standard-Reihenfolge, Marker `hintsSectionMigrated` wie bei Müll), Standardbreite volle Zeile. Tipp öffnet das vorhandene Fenster (Garage, Schlösser, Türen, Alarm, Müll-Tonne) bzw. `/nvr`. Glas: am Handy die Liste, ab 900 px eine Kapselreihe ohne Kartenfläche (§7.6). |
| K77 | **Aktive Szene** nach GLAS-PLAN §2.12. Die Demo-Szenen bekommen Mitgliederlisten (`attributes.entity_id`), damit „Aktiv“ prüfbar ist; ohne Favoriten-Szenen zeigt Klassisch davon nichts. |
| K78 | **Größen S/M/L** (E6) nur in Glas und auf der Übersicht (übrige Seiten: Etappe 5): Leiste über jeder Karte mit Segment S/M/L, ‹ ›, Auge, Handy-Ausblenden und „⋯“ (die klassischen Werte Spalten 1–4 und Höhendeckel als Sheet). S = Span 1, M = Span 2, L = Span 2 + Eintrag in `tallSections`; passt kein Preset, ist nichts gewählt. Neues Feld `customization.tallSections: string[]` (GLOBAL, Scope-Tabelle, Export). Wirkung nur in Glas ab 900 px (`grid-row: span 2`), Klassisch und Handy lesen es nicht. Die klassischen Griffe bleiben im DOM und sind in Glas per CSS aus. Räume bleiben volle Breite ohne Segment. |
| K79 | **Detail und Inspector fertig** (§7.20–7.22): Glas-Kopf (Zustands-Kachel, Name und Raum, Stern, Schließen), Zustandszeile, senkrechter Licht-Regler `LightBrightnessControl` (Senden beim Loslassen über `useCommitRange`; der Helligkeitsregler der eingebetteten `LightCard` ist in Glas aus, Farbtemperatur und Farbton bleiben), Verlauf mit Segment 24H/7D/30D, Logbuch und Attribute im Glas-Look. Inhalt und Funktionen wie heute (Inventar F). |
| K80 | **Neue Bausteine:** Segment mit Linse (`components/glas/Segment.tsx`, `role="radiogroup"`, Pfeiltasten) und der iOS-Schalter (CSS) entstehen hier für Übersicht und Detail; die übrigen Seiten und Sheets bekommen sie in Etappe 5 (K67 bleibt). |
| K81 | **Kontextmenü an weiteren Karten:** Szenen-Kacheln (Aktivieren, Details, Aus Favoriten, Raum öffnen, Ausblenden) und Geräte (Details, Ein/Aus, Favorit, Raum öffnen, Ausblenden). „Raum öffnen“ gibt es für jede Entität mit Raum, außer auf der Seite dieses Raums (Regel aus 3b in `contextActions.ts`). Klassisch unverändert. |
| K82 | **Nachzügler aus Etappe 3:** Untertitel der Chip-Sheets („Licht · 5 an“, K53) mit derselben Zählung wie die Chips; Mehr-Menü mit Fuß „Version · F…“ und Werten rechts für Energie (kWh heute), Pool (Zustand) und Sicherheit (Zusammenfassung); Räume-Menü mit dem Status-Kreis der Räume-Kacheln (K43, K61). |
| K83 | **Karten-Looks per CSS** (GLAS-PLAN §2.13, §2.19): Kopf über der Fläche mit einfarbigem Symbol, Szenen, Klima, Rollläden, Sicherheit, Müll, NVR-Karte, Aktivität, Räume. Eigenes Markup nur, wo die Skizze Elemente braucht, die es nicht gibt: Lichtkreise im Hauptraum ab 900 px (E8), Geräte als Kachel (Handy) bzw. Zeile mit Schalter (Desktop), getrennt in Schalten und Detail (§2.17), Ist-Markierung im Klima-Bogen (ein SVG-Kreis). Rollläden bleiben auch am Desktop Bogen + Raumliste; die Zeilen der Skizze bräuchten eigenes Markup (Abweichung, in Etappe 7 ansehen). |
| K84 | **Demo-Steuerung für Prüfungen:** im Demo-Modus `window.__hapulseDemo.patch(id, { state, attributes })` (eigene Datei `ha/demoControl.ts`, eine `[fork]`-Zeile in `stores/connectionStore.ts`), damit Prüfungen Hinweise live erscheinen und verschwinden lassen und eine Szene aktiv machen. Ohne Demo-Modus gibt es das Objekt nicht. |

## 2. Dateien

| Teil | Neu | `[fork]` in Upstream-Dateien |
|---|---|---|
| Hinweise | Core `hints.ts`, `locks.ts`; `components/home/useHints.ts`, `HintsCard.tsx/.css` | `pages/Home.tsx` (Sektion, Gate, Standardbreite, Render), `stores/settingsStore.ts` (Marker, Migration), `components/security/lockLogic.ts` (Re-Export) |
| Aktive Szene | Core `activeScene.ts` | `components/home/ScenesCard.tsx` (`data-active`, Untertitel, Kontextmenü), Core `demo.ts` |
| Energie | Core `glasEnergy.ts` (Achse, Ø, Balken, Vergleichsbereich); `components/glas/home/EnergyGlas.tsx`; `ha/useEnergyCompare.ts` | `components/home/EnergyWidget.tsx` (Klassisch gestapelt + PV-Zeile, Glas `EnergyGlas`) |
| Hauptraum, Geräte, Klima | `components/glas/home/HeroLights.tsx`, `GlasDeviceItem.tsx` | `HeroRoomCard.tsx`, `DevicesCard.tsx`, `ClimateCard.tsx` |
| Detail | `components/glas/detail/DetailHead.tsx`, `LightBrightnessControl.tsx`, `components/glas/Segment.tsx` | `components/home/EntityDetailModal.tsx` |
| Bearbeiten | `components/glas/edit/SizeBar.tsx`, `SizeFineTune.tsx`, Core `sizePresets.ts` | `pages/Home.tsx`, `stores/settingsStore.ts`, `stores/settingsScope.ts` |
| Menüs | — | `app/AppLayout.tsx` bzw. Räume-Menü, Chip-Fenster (`subtitle`) |
| Demo | `ha/demoControl.ts` | `stores/connectionStore.ts` |
| CSS | `styles/glas/home.css`, `home-cards.css`, `detail.css`, `edit.css` | — |

Dazu Texte in allen sieben Sprachen (`hints.*`, `home.section.*.hints`, `glas.energy.*`, `glas.size.*` u. a.),
Fork-Changelog F36 + `CHANGELOG.fork.md`, `docs/SYNC.md` (neue Dateien, `[fork]`-Stellen, Klassen), `CLAUDE.md`,
GLAS-PLAN §3 Etappe 4 und der Selektor-Wächter für die neuen CSS-Dateien.

## 3. Prüfungen

- **Unit:** `hints` (jede Art, ausgeblendete Entitäten, Sortierung, Tür-Minuten, Müll heute/morgen), `activeScene`
  (Gnadenzeit, Überlappung, ohne Mitglieder, zu alt), `glasEnergy` (Achswerte 0/1/2 bzw. 0/10/20, Ø und ausgeblendeter
  Achswert, Stummel, Vergleichsbereich über Monats- und Zeitumstellungsgrenzen), `sizePresets` (S/M/L ↔ Span/Höhe/tall,
  „Eigene“), `contextActions` (Raum öffnen), Scope-Test (`tallSections`, `hintsSectionMigrated`), Migration.
- **`checks --part home`** (neu `scripts/glas-checks-home.cjs`): Hinweise erscheinen und verschwinden live, Tipp öffnet
  das richtige Fenster, ausgeblendete Entitäten zählen nicht; eine Szene wird nach dem Aktivieren „Aktiv“ und verliert
  es, wenn sich ein Mitglied ändert; Energie-Segment mit Tastatur, Blase per Tipp, Pfeil und Esc; S/M/L schreibt dieselben
  Felder, die Klassisch liest, ein Stilwechsel zeigt dieselbe Reihenfolge; ‹ › verschiebt; Licht-Regler mit Tastatur,
  gesendet wird erst beim Loslassen; Inspector-Kopf; Handy-Reihenfolge Begrüßung → Wetter → Chips → Hinweise;
  Kontextmenü an Szenen und Geräten samt „Raum öffnen“; keine Seitenfehler. Auch gegen den Entwicklungsserver
  (StrictMode).
- **Bilder:** neue Szenen `home-hints`, `home-edit`, `energy-bubble`, `detail-light` (Glas, Handy/iPad/Desktop,
  hell/dunkel) und die Übersicht, verglichen mit `g5h-*`, `g5d-*`, `g5e-*`; Abweichungen im Plan.
- **Klassisch:** Pixelvergleich mit `main` — erwartet sind nur die Energie-Karte der Übersicht, Hinweise und Szenen,
  wo die Szene sie zeigt, und F36; das DOM der 49 Klassisch-Fenster bleibt gleich.
- **Genau einmal vor dem Merge:** alle `checks`, Klassisch-Vergleich, Klick-Fuzz (Glas, Handy und Desktop, auch
  Bearbeiten) und die Pflichtbefehle. Nach Korrekturen aus der Code-Prüfung laufen nur die betroffenen Prüfungen.

## 4. Reihenfolge

1. Core (`hints`, `locks`, `activeScene`, `glasEnergy`, `sizePresets`) mit Tests.
2. Inhalte in beiden Stilen (Hinweise, Szenen, Energie Klassisch) und die Demo-Steuerung.
3. Glas-Looks per CSS.
4. Hauptraum-Lichtkreise, Geräte, Energie in Glas.
5. Detail und Inspector.
6. Bearbeiten S/M/L.
7. Kontextmenü-Quellen, Chip-Untertitel, Menü-Werte.
8. Texte, Changelog, Doku. Dann Code-Prüfung, voller Lauf, Frage an Jannick (K74), Merge.

## 5. Risiken

- **Großer PR:** die Code-Prüfung geht nach Bereichen vor, die Inhalte beider Stile zuerst (sie ändern Klassisch).
- **Weitere Abrufe:** der Vergleich holt je Zeitraum einmal Statistik nach, nur beim Laden und beim Wechsel des
  Segments; das Ergebnis bleibt je Zeitraum gemerkt.
- **`grid-row: span 2`** mit dichter Packung kann die Reihenfolge am Desktop optisch verschieben; Bilder mit
  gemischten Größen.
- **Upstream-Klassen** in der neuen Glas-CSS: Selektor-Wächter und `docs/SYNC.md` nennen sie.
