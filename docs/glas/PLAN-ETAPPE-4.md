# Glas Etappe 4 — Übersicht komplett (kurzer Plan)

Stand `main` a8bd8f7 (nach PR #107), überarbeitet nach der unabhängigen Prüfung des Plans (§6). Ablauf nach
[GLAS-PLAN §3](../GLAS-PLAN.md): kurzer Plan, unabhängig geprüft, ein PR. Wie die Teile aussehen, steht in
[GLAS-DESIGN](../GLAS-DESIGN.md) §7.5–7.22 und §7.32; hier steht nur, was gebaut wird, wo und wie es geprüft wird.
Pfade relativ zu `apps/dashboard/src/`, Core = `packages/core/src/`.

## 1. Festlegungen

| # | Festlegung |
|---|---|
| K74 | **Klassisch ändert sich nur durch die neuen Inhalte aus E3/E9:** die Hinweise-Karte (nur wenn etwas abweicht; im Bearbeiten-Modus als leere Karte, K76), die Untertitel der Szenen-Kacheln („Aktiv“ bzw. „5 Geräte“) und Netz/Solar gestapelt samt Zeile „PV-Ertrag“ in der Energie-Karte. Die Demo-Szenen bekommen Mitglieder (K77), dadurch zeigt das Szenen-Detail der Demo den Abschnitt „Mitglieder“. Alles andere bleibt pixelgleich mit `main`. Weil Klassisch damit nicht mehr pixelgleich ist, fragt der Thread Jannick **gleich nach Schritt 2** (§4) mit Vorher/Nachher-Bildern, nicht erst vor dem Merge; die stehende Merge-Erlaubnis gilt nur für pixelgleiches Klassisch. **Entscheid Jannick 08.10.: „Beide Stile“** (Bilder `glas/etappe-4/k74-*`; Vergleich mit `main`: 24 von 33 Klassisch-Bildern gleich, die übrigen nur an diesen Stellen). |
| K75 | **Energie in Glas = V4 kompakt** (Entscheid Jannick 08.10., `glas/energie-varianten`). Eigene Karte `EnergyGlas`, die `Home.tsx` in Glas statt `EnergyWidget` rendert (kein Hook-Wechsel in einer Komponente beim Stilwechsel). Zeiträume wie die Skizze: Tag = heute stündlich, Woche = letzte 7 Tage bis heute, Monat = letzte 30 Tage bis heute (täglich, letzte Spalte „Heute“); Zukunft als 3-px-Stummel. Ein eigener Hook `ha/useEnergyWindow.ts` holt Zeitraum und Vergleich zusammen, merkt sich das Ergebnis je Zeitraum und zeigt beim Wechsel das vorige Ergebnis gedimmt, bis das neue da ist (die Karte bleibt stehen, der Fokus im Segment auch). **Balken = Verbrauch je Stunde bzw. Tag:** Netzbezug unten, selbst genutzter Solarstrom oben (`max(0, Solar − Einspeisung)` je Balken, wie HAs Verbrauchsdiagramm ohne Batterie); die Zahl ist `homeConsumption`, PV-Ertrag `solarProduced` (nur mit Solarquelle). Ø = Mittel der **abgeschlossenen** Balken (die laufende Stunde bzw. heute zählt nicht, wie die Skizze). Vergleich: beide Zeiträume enden an der letzten vollen Stunde (HA schreibt die Stundenzeile erst nach der Stunde), verglichen wird `homeConsumption` bis dorthin; er wird bei jedem Laden mitgeholt; ohne Daten entfällt die Zeile. Klassisch stapelt weiter Netzbezug + Erzeugung (dieselbe Summe wie `main` und wie das Quellen-Diagramm der Energieseite), damit sich dort nur die Farbe ändert. |
| K76 | **Hinweise** nach GLAS-PLAN §2.11 (E4: Tür ab 10 min offen, ohne Batterien, Müll heute oder morgen). „Kamera nimmt nicht auf“ nur mit Sentinel als Kameraquelle und nur für Kameras im Zustand `offline` oder `stalled` (`sentinelRecordingState`; abgeschaltete Aufnahme ist keine Abweichung). Wasser, Rauch und CO öffnen das Detail des Sensors. Die reine Schloss-Regel zieht nach Core (`locks.ts`), `components/security/lockLogic.ts` re-exportiert sie. Ohne Abweichung keine Karte; **im Bearbeiten-Modus** steht die Karte immer da (leer: „Gerade weicht nichts ab.“), damit man sie aus- und einblenden kann, in beiden Stilen. Sektion `'hints'` vorn (Marker `hintsSectionMigrated` wie bei Müll), Standardbreite volle Zeile, ohne S/M/L. Die Fenster (Garage, Schlösser, Türen, Alarm, Tonne) hängen in `Home.tsx` außerhalb des Rasters (`HintWindows`): löst eine Aktion im Fenster den Hinweis auf, bleibt das Fenster offen. Glas: am Handy die Liste, ab 900 px eine Kapselreihe ohne Kartenfläche (§7.6). |
| K77 | **Aktive Szene** nach GLAS-PLAN §2.12. Die Demo-Szenen bekommen Mitgliederlisten (`attributes.entity_id`, ohne Mediaplayer, der Demo-Takt würde „Aktiv“ sofort beenden). Ohne Favoriten-Szenen zeigt Klassisch davon nichts. |
| K78 | **Größen S/M/L** (E6) nur in Glas ab 900 px und auf der Übersicht (übrige Seiten: Etappe 5): Leiste über jeder Karte mit Segment S/M/L, ‹ ›, Auge, Handy-Ausblenden und „⋯“ (die klassischen Werte Spalten 1–4 und Höhendeckel als Sheet). S = Span 1, M = Span 2, L = Span 2 + Eintrag `home:<id>` in `tallSections`; S, M und L setzen den Höhendeckel auf 0; passt kein Preset, ist nichts gewählt. **L = M + Mindesthöhe 470 px** am Rasterkind (im Bearbeiten-Modus am `SortableItem`), kein Zeilen-Span. Neues Feld `customization.tallSections: string[]` (GLOBAL über den `customization`-Pfad, `KNOWN_GLOBAL`, `DEFAULT_CUSTOMIZATION`, Export); Klassisch und Handy lesen es nicht. Unter 900 px zeigt die Leiste nur Auge und Handy-Ausblenden (eine Spalte, Breite wirkungslos). Hinweise und Räume ohne Segment. Die klassischen Griffe bleiben im DOM und sind in Glas per CSS aus. Abnahme prüft dieselben Felder und dieselbe Reihenfolge nach einem Stilwechsel; das Bild ist wegen der Glas-Spalten nicht gleich. |
| K79 | **Detail und Inspector fertig** (§7.20–7.22): der Glas-Kopf kommt in den Fensterkopf, nicht in den Inhalt: `Modal` reicht zwei neue optionale Props an `SheetHeader` (`lead` = Zustands-Kachel statt Symbol, auch am Handy; `trailing` = Stern), der Raum wird `subtitle`. Darunter Zustandszeile, senkrechter Licht-Regler `LightBrightnessControl` (`role="slider"`, Tasten ±10/±20, Pos1/Ende; < 3 % = aus; nicht dimmbar → nur an/aus; gesendet wird beim Loslassen bzw. nach der Taste über einen kleinen wertbasierten Commit, nicht `useCommitRange`, das nur Input-Ereignisse kennt). Der Helligkeitsregler der eingebetteten `LightCard` ist in Glas im Detail aus (`:has(.light-card__fill:not(.light-card__fill--temp))`), Farbtemperatur und Farbton bleiben. Verlauf mit Segment 24H/7D/30D, Logbuch und Attribute im Glas-Look. Inhalt und Funktionen wie heute (Inventar F). |
| K80 | **Neue Bausteine:** Segment mit Linse (`components/glas/Segment.tsx`, `role="radiogroup"`, Pfeiltasten) und der iOS-Schalter (CSS) entstehen hier für Übersicht und Detail; die übrigen Seiten und Sheets bekommen sie in Etappe 5 (K67 bleibt). |
| K81 | **Kontextmenü an weiteren Karten:** Szenen-Kacheln (Aktivieren, Details, Aus Favoriten, Raum öffnen, Ausblenden) und Geräte (Details, Ein/Aus, Favorit, Raum öffnen, Ausblenden). „Raum öffnen“ gibt es für jede Entität mit Raum, außer auf der Seite dieses Raums (Regel aus 3b in `contextActions.ts`). Klassisch unverändert. Die Favoritenleiste (`FavoritesStrip`) ist nirgends eingehängt und bekommt keinen Langdruck. |
| K82 | **Verschoben nach Etappe 5:** Untertitel der Chip-Sheets, Werte und Fuß im Mehr-Menü, Status-Kreis im Räume-Menü. Sie brauchen eine gemeinsame Zählung für Chips und Sheets (heute rechnet `SummaryChips.tsx` inline) und, für „kWh heute“, einen Energie-Abruf, der nur bei offenem Menü laufen darf; das gehört zu den Menüs der übrigen Seiten. „Klima/Rollläden alle“ (K67) ebenfalls Etappe 5. |
| K83 | **Karten-Looks per CSS** (GLAS-PLAN §2.13, §2.19): Kopf über der Fläche mit einfarbigem Symbol, Szenen, Klima, Rollläden, Sicherheit, Müll, NVR-Karte, Aktivität, Räume. **Hauptraum immer schlicht (E8):** in Glas weder Verlauf noch Raumbild, auch wenn HA ein Bild setzt. Eigenes Markup nur, wo die Skizze Elemente braucht, die es nicht gibt: Lichtkreise im Hauptraum ab 900 px (E8), Geräte als Kachel (Handy) bzw. Zeile mit Schalter (Desktop), getrennt in Schalten und Detail (§2.17), Ist-Markierung im Klima-Bogen (ein SVG-Kreis), Rollläden am Desktop als Zeilen je Raum (§7.12). **Geräte, die man in der Karte ausschaltet, bleiben bis zum Neuladen als „Aus“ stehen** (keptOff, nur Glas, Sitzungs-Store), damit ein versehentliches Aus rückgängig zu machen ist. |
| K84 | **Demo-Steuerung für Prüfungen:** im Demo-Modus `window.__hapulseDemo.patch(id, { state, attributes })` und `patchArea(id, { picture })` (eigene Datei `ha/demoControl.ts`, eine `[fork]`-Zeile in `stores/connectionStore.ts`), damit Prüfungen Hinweise live erscheinen und verschwinden lassen, eine Szene aktiv machen und ein Raumbild setzen. Ohne Demo-Modus gibt es das Objekt nicht; die Demo selbst bleibt ohne Raumbild. |
| K85 | **Spalten nach Inhaltsbreite** (PLAN-ETAPPE-2 §8, GLAS-DESIGN §5.1): in Glas ab 900 px ist `.home-page` ein Größen-Container; Inhalt ≥ 1180 → 4 Spalten, ≥ 900 → 3, sonst 2, Abstände Spalten 20, Zeilen 26. Spans, die breiter als das Raster sind, werden volle Zeile. Unter 900 px gelten die klassischen Regeln. |
| K86 | **Reihenfolge im Markup** (K26): in Glas rendert `Home.tsx` die Chip-Leiste nach der Begrüßung (Tab-Reihenfolge Begrüßung → Wetter → Chips → Hinweise); Klassisch unverändert. Die CSS-`order` aus Etappe 2 entfällt. |
| K87 | **Chip-Farbe je Art** (U5): `SummaryChips.tsx` setzt in Glas `data-chip="<id>"`; an = Ink der Art (Licht `yellowInk` mit gefüllter Glühbirne, Türen/Fenster `warnInk`, Garage/Schloss `redInk`, Alarm scharf `greenInk`, Pool `tealInk`, Medien `blueInk`). |

## 2. Dateien

| Teil | Neu | `[fork]` in Upstream-Dateien |
|---|---|---|
| Hinweise | Core `hints.ts`, `locks.ts`; `components/home/useHints.ts`, `HintsCard.tsx/.css` | `pages/Home.tsx` (Sektion, Gate, Standardbreite, Render, `HintWindows`), `stores/settingsStore.ts` (Marker, Migration), `components/security/lockLogic.ts` (Re-Export) |
| Aktive Szene | Core `activeScene.ts` | `components/home/ScenesCard.tsx` (`data-active`, Untertitel, Kontextmenü, Glas ohne Inline-Farbe), Core `demo.ts` |
| Energie | Core `glasEnergy.ts` (Fenster, Balken, Achse, Ø, Vergleich); `components/glas/home/EnergyGlas.tsx`; `ha/useEnergyWindow.ts` | `components/home/EnergyWidget.tsx` (nur Klassisch: gestapelt + PV-Zeile), `pages/Home.tsx` (Glas → `EnergyGlas`) |
| Hauptraum, Geräte, Klima, Rollläden | `components/glas/home/HeroLights.tsx`, `GlasDeviceItem.tsx`, `GlasBlindsRows.tsx`, `stores/keptOffStore.ts` | `HeroRoomCard.tsx`, `DevicesCard.tsx`, `ClimateCard.tsx`, `BlindsCard.tsx` |
| Chips | — | `components/home/SummaryChips.tsx` (`data-chip`, nur Glas), `pages/Home.tsx` (Reihenfolge) |
| Detail | `components/glas/detail/LightBrightnessControl.tsx`, `components/glas/Segment.tsx` | `components/home/EntityDetailModal.tsx`, `components/ui/Modal.tsx` (`lead`, `trailing`), `components/glas/sheet/SheetHeader.tsx` |
| Bearbeiten | `components/glas/edit/SizeBar.tsx`, `SizeFineTune.tsx`, Core `sizePresets.ts` | `pages/Home.tsx`, `stores/settingsStore.ts` (`DEFAULT_CUSTOMIZATION`, Test `KNOWN_GLOBAL`) |
| Demo | `ha/demoControl.ts` | `stores/connectionStore.ts` |
| CSS | `styles/glas/home.css`, `home-cards.css`, `detail.css`, `edit.css` | — |

Dazu Texte in allen sieben Sprachen (`hints.*`, `home.section.*.hints`, `glas.energy.*`, `glas.size.*` u. a.),
Fork-Changelog F36 + `CHANGELOG.fork.md` (die Inhalte beider Stile als eigener Eintrag ohne „Glas:“),
`docs/SYNC.md` (neue Dateien, `[fork]`-Stellen, Klassen), `CLAUDE.md`, GLAS-PLAN §3 Etappe 4 und der
Selektor-Wächter für die neuen CSS-Dateien.

## 3. Prüfungen

- **Unit:** `hints` (jede Art, ausgeblendete Entitäten, Sortierung, Tür-Minuten, Müll heute/morgen), `activeScene`
  (Gnadenzeit, Überlappung, ohne Mitglieder, zu alt), `glasEnergy` (Fenster Tag/7/30 über Monats- und
  Zeitumstellungsgrenzen, Verbrauchsbalken, Achswerte 0/1/2 bzw. 0/10/20, Ø ohne laufenden Balken und ausgeblendeter
  Achswert, Stummel, Vergleich bis zur letzten vollen Stunde), `sizePresets` (S/M/L ↔ Span/Höhe/tall, „Eigene“),
  `contextActions` (Raum öffnen), Scope-Test (`tallSections`, `hintsSectionMigrated`), Migration.
- **`checks --part home`** (neu `scripts/glas-checks-home.cjs`), soweit nicht anders gesagt in **beiden Stilen**:
  - Hinweise erscheinen und verschwinden live, Tipp öffnet das richtige Fenster, ausgeblendete Entitäten zählen nicht;
    Aktion im Fenster bis der Hinweis verschwindet, das Fenster bleibt offen; leere Karte im Bearbeiten-Modus.
  - Szene wird nach dem Aktivieren „Aktiv“ und verliert es, wenn sich ein Mitglied ändert.
  - **Nicht verlieren** (GLAS-PLAN Etappe 4): Hauptraum-Pillen und Klima-Stepper, Klima-Raumliste, Zu/Stopp/Auf, die
    sieben Sicherheitszeilen, Räume mit Status-Override, Höhendeckel mit Innen-Scroll, Ziehen per Tastatur,
    Chip-Bearbeiten, Bestätigung gefährlicher Aktionen.
  - Nur Glas: Energie-Segment mit Tastatur (Fokus bleibt, Karte bleibt stehen), Blase per Tipp, Pfeil und Esc;
    S/M/L schreibt dieselben Felder, die Klassisch liest, Stilwechsel zeigt dieselbe Reihenfolge; ‹ › verschiebt;
    Licht-Regler mit Tastatur, gesendet wird erst beim Loslassen; Inspector-Kopf; Tab-Reihenfolge Begrüßung → Wetter →
    Chips → Hinweise; Kontextmenü an Szenen und Geräten samt „Raum öffnen“; ausgeschaltetes Gerät bleibt stehen;
    Raumbild per `patchArea` erscheint in Glas nicht; keine Seitenfehler. Auch gegen den Entwicklungsserver (StrictMode).
- **Bilder:** neue Szenen `home-hints`, `home-edit`, `energy-bubble`, `detail-light` (Glas, Handy/iPad/Desktop,
  hell/dunkel), die Übersicht oben und gescrollt, Inspector und Kontextmenü, verglichen mit `g5h-*`, `g5d-*`, `g5e-*`
  und `glas/energie-varianten/v4-*`; Abweichungen im Plan.
- **§5.4-Proben** für die neuen Teile: reduzierte Bewegung (Ring-Sweep, Segment-Linse, Puls), erzwungene Farben
  (Diagramm, Schalter, Segment), Kontrastpaare für Diagrammfarben und Szenen-Inks.
- **Klassisch:** Pixelvergleich mit `main` je `[data-section]` und für die Seite; erwartet sind nur Energie-Karte,
  Hinweise, Szenen (mit Favoriten), das Szenen-Detail der Demo und F36. Vorher/Nachher-Bilder für K74 mit Hinweis und
  Favoriten-Szenen. Das DOM der 49 Klassisch-Fenster plus Licht- und Szenen-Detail bleibt gleich (Szenen-Detail bis auf
  „Mitglieder“).
- **Genau einmal vor dem Merge:** alle `checks`, Klassisch-Vergleich, Klick-Fuzz in beiden Stilen (Handy, Desktop und
  Bearbeiten, mit einem Hinweis) und die Pflichtbefehle. Nach Korrekturen aus der Code-Prüfung laufen nur die
  betroffenen Prüfungen.

## 4. Reihenfolge

1. Core (`hints`, `locks`, `activeScene`, `glasEnergy`, `sizePresets`) mit Tests.
2. Inhalte in beiden Stilen (Hinweise samt leerer Karte und `HintWindows`, Szenen, Energie Klassisch) und die
   Demo-Steuerung. **Dann die Frage an Jannick (K74) mit Vorher/Nachher-Bildern.**
3. Glas-Looks per CSS, Spalten, Reihenfolge und Chip-Farben.
4. Hauptraum-Lichtkreise, Geräte, Rollläden-Zeilen, Energie in Glas.
5. Detail und Inspector.
6. Bearbeiten S/M/L.
7. Kontextmenü-Quellen.
8. Texte, Changelog, Doku. Dann Code-Prüfung, voller Lauf, Merge (mit Jannicks Antwort zu K74).

## 5. Risiken

- **Großer PR:** die Code-Prüfung geht nach Bereichen vor, die Inhalte beider Stile zuerst (sie ändern Klassisch).
  Muss geteilt werden, dann entlang K74: 4a alles, was Klassisch ändert (K74–K77, K84), 4b nur Glas.
- **Weitere Abrufe:** der Vergleich holt je Laden einmal Statistik nach, zusammen mit dem Zeitraum; das Ergebnis bleibt
  je Zeitraum gemerkt, bis neu geladen wird.
- **Größen-Container** (K85): `container-type` macht `.home-page` zum Bezug für fixierte Nachfahren; deshalb erst ab
  900 px, wo dort nichts fixiert ist (Avatar, Zurück und „Fertig“ sind nur am Handy fixiert).
- **Upstream-Klassen** in der neuen Glas-CSS: Selektor-Wächter und `docs/SYNC.md` nennen sie.

## 6. Prüfung des Plans (2026-10-08)

Unabhängige Prüfung: keine Blocker, 12 Punkte „sollte“, 9 Kleinigkeiten; alle geprüft und übernommen, außer wo
anders vermerkt.

| Befund | Ergebnis |
|---|---|
| S1 Solar-Anteil der Balken ist Erzeugung | Glas: Verbrauchsbalken (K75). Klassisch behält die Summe von `main`, nur zweifarbig. |
| S2 laufende Stunde, Vergleich, Cache | Vergleich bis zur letzten vollen Stunde, Ø ohne laufenden Balken, Vergleich bei jedem Laden (K75). |
| S3 Zeitraumwechsel hängt die Karte aus | eigene Karte und eigener Hook mit Merk-Cache, voriges Ergebnis gedimmt (K75). |
| S4 Hinweise im Bearbeiten-Modus | leere Karte im Bearbeiten-Modus, beide Stile (K76). |
| S5 Fenster verschwinden mit der Karte | `HintWindows` in `Home.tsx` (K76). |
| S6 „L“ per Zeilen-Span | Mindesthöhe 470 px (K78). |
| S7 Detail-Kopf doppelt | Kopf über `Modal`/`SheetHeader` (K79). |
| S8 keptOff | übernommen (K83). |
| S9 E8 nicht genannt | K83, Prüfung per `patchArea` (K84). |
| S10 offene Punkte früherer Etappen | Reihenfolge K86, Spalten K85, Chip-Farben K87; „Klima/Rollläden alle“ Etappe 5 (K82); Favoritenleiste ist nicht eingehängt (K81). |
| S11 Menüs | nach Etappe 5 verschoben (K82). |
| S12 Prüfungen | „Nicht verlieren“, beide Stile, Klassisch-Fuzz, Vergleich je Sektion (§3). |
| N1 Woche/Monat | rollierend wie die Skizze (K75). |
| N2 Licht-Regler | wertbasierter Commit, Helligkeitszeile per `:has()`, < 3 % und nicht dimmbar (K79). |
| N3 S/M/L | Schlüssel `home:<id>`, Höhe 0, Hinweise ohne Segment, unter 900 px (K78). |
| N4 Hinweis-Ziele, Kameras | Wasser/Rauch/CO → Detail; Kamera-Regel `offline`/`stalled` (K76). |
| N5 Frage früher, „5 Geräte“, Mitglieder | K74, Frage nach Schritt 2. |
| N6 Dateitabelle | ergänzt (§2). |
| N7 F36 | eigener Eintrag für beide Stile (§2). |
| N8 Rollläden | Zeilen am Desktop gebaut statt Abweichung (K83). |
| N9 Bilder und Proben | §3. |
