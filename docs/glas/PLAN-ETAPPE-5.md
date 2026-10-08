# Glas Etappe 5 — Übrige Seiten (kurzer Plan)

Stand `main` 18d85a5 (nach PR #108). Ablauf nach [GLAS-PLAN §3](../GLAS-PLAN.md): kurzer Plan, unabhängig geprüft,
ein PR. Für die Seiten gibt es keine Skizze. Maßstab sind [GLAS-DESIGN](../GLAS-DESIGN.md) §4, §5 und §7.5–7.31 sowie die
Sheet-Skizzen, die dieselben Bausteine zeigen (`g5h-lights-*`, `g5d-dialog-lights`, `g4h-*`). Hier steht nur, was
gebaut wird, wo und wie es geprüft wird. Pfade relativ zu `apps/dashboard/src/`, Core = `packages/core/src/`.

Ist-Stand: Die Seiten haben seit Etappe 1–4 Glas-Farben, Schrift, den großen Titel und Sheets, aber noch die klassische
Form. Es fehlen Kartentitel über der Fläche, schlichte Heroes, iOS-Schalter, Segmente, Glas-Regler und Listen.

## 1. Festlegungen

| # | Festlegung |
|---|---|
| K88 | **Grundsatz:** Nur Aussehen und Bewegung ändern sich (GLAS-PLAN §1). **Klassisch bleibt pixelgleich mit `main`**, Etappe 5 bringt dort keine neuen Inhalte (anders als K74). Neues Markup gibt es nur in Glas und nur, wo ein Baustein fehlt (Segment mit Linse, Bearbeiten-Leiste, Menü-Werte). Alles andere ist CSS an den vorhandenen Klassen in `styles/glas/`. Szenen-Kacheln außerhalb der Übersicht bekommen deren Look, aber kein „Aktiv“ (K74 gilt nur für die Übersicht). |
| K89 | **Seitenrahmen:** Der große Titel bleibt wie in Etappe 2. Die Karten aller Seiten tragen ihren Titel über der Fläche wie auf der Übersicht (§2.13). Dafür werden die Regeln aus `home.css` auf eine gemeinsame Kartenliste erweitert: Sicherheit (Personen, Schlösser, Garage, Sensoren), Energie (`energy-card`), Pool (`pool-card`), Musik (Bibliothek, Warteschlange, Zonen, andere Player), System (Monitor, Batterien), Automationen (Kategorie, Verlauf), Szenen (Verlauf, Räume). Die Spalten richten sich nach der Inhaltsbreite (K85), auf allen Seiten mit `overview-grid`. `SectionLabel` verliert die Versalien. Im Raum wird es ein Titel 20/25 600, in den Einstellungen ein Gruppentitel 15/20 600 `label2` über der Liste (§7.30). Die Reihenfolge Avatar, Chips, Titel am Handy (K27) ist geprüft und bleibt. |
| K90 | **Heroes schlicht** (§3.6, wie der Hauptraum, E8): Sicherheit, Pool, Energie, Geräte, Automationen, Szenen und System verlieren Verlauf und Tönung, die Fläche ist `bg-card`. Der Zustand steht nur als Wort und Symbol in seiner Ink. Die Chips im Sicherheits-Hero sehen aus wie die Status-Chips (§7.5, Farben K87). Kamera-Kacheln: Radius 18, das Badge „Bewegung“ als Kapsel. Inhalte und Reihenfolge bleiben unverändert. |
| K91 | **Schalter = iOS-Schalter** (§7.28, D25), nur per CSS, an allen Varianten: `pill-toggle`, `device-toggle` (Karte und Zeile), `auto-row-toggle`, `admin-toggle`, `pool-switch`, `lights-modal__toggle` und die Schalter in `Settings`, `StyleSettings` und `GlobalSettingsAdmin`. Spur 51 × 31 in `switchOn`/`switchOff`, Knopf 27 weiß mit Schatten, Trefferfläche mindestens 44 (Desktop 64 × 44). Bei reduzierter Bewegung gleitet nichts. |
| K92 | **Segmente mit Linse** (§7.27, K80): `Segment` ersetzt in Glas über eine `[fork]`-Weiche wie im Detail den Energie-Zeitraum, den Pool-Modus (Seite und Sheet, nur Text), Stil, Glas-Stärke, Hell/Dunkel/Auto, den Geräte-Override, die Geräte-Ansicht, die Zonen-Ansicht und die Bibliotheks-Tabs. Dafür lernt `Segment` zwei Dinge: `role="tablist"` (Tabs mit `aria-selected`, für Energie und Bibliothek) und reine Symbol-Optionen mit Namen (Raster/Liste); Text und Symbol werden nie gemischt. Der NVR-Einrichtungsdialog folgt in Etappe 6. |
| K93 | **Knöpfe, Pillen, Stepper, Regler** (§7.29), per CSS: Klima-Modi werden Auswahl-Pillen. Die Alarm-Modi sind Aktionen, also Kapseln „plain“ 44. Stepper werden rund 44 `fill`. „Alle verriegeln/entriegeln“ und „Alle schließen/öffnen“ werden „plain“ 44, die Bestätigung aus Etappe 3 bleibt. Je Ansicht gibt es eine prominente Aktion. Waagerechte Regler (Helligkeit, Farbtemperatur, Farbton, Lautstärke, Position, Akzent): Spur 8 als Kapsel `fill` bzw. mit ihrem Verlauf, Füllung `prominent`, Knopf 27 weiß mit dem Schalter-Schatten, Trefferfläche 44. Gesendet wird weiter beim Loslassen (E2). Musik: Play rund und prominent, die übrigen Steuerknöpfe rund 44. Der Hintergrund aus dem Cover bleibt (Medien, §3.6). |
| K94 | **Listen „inset grouped“** (§7.30): Einstellungen (alle Gruppen), System (Batterien), Sicherheit (Personen, Schlösser, Garage, Türen, Fenster, Bewegung), Geräte in der Listenansicht, Automationen (Kategorien), Musik (Warteschlange, andere Player), Pool (Kennzahlen). Zeilen 48–60 hoch, Trennlinie 0,5 px ab Textanfang und keine nach der letzten Zeile, Wert in `label2`, Chevron in `label3`. Eingabefelder (App-Name, Suche) als iOS-Feld: `fill`, Radius 10, 36 hoch, Lupe. |
| K95 | **Raum:** Der Hero ist die Hauptraum-Karte aus Etappe 4. Die Entitäts-Karten (`EntityCard`-Familie, `cards.css`) werden Glas-Flächen ohne Rand, Radius 22, mit dem Symbol im Kreis 40 in Zustandsfarbe wie die Geräte-Kacheln (E4), Schaltern nach K91 und Reglern nach K93. Szenen-Kacheln sehen aus wie auf der Übersicht (K88). Halb/Voll-Breite und Ziehen bleiben wie in Klassisch (nur zwei Größen, kein S/M/L), die Griffe bekommen den Glas-Look. Sentinel-Kameras folgen in Etappe 6. |
| K96 | **Bearbeiten S/M/L auf den Seiten** (E6, K78): Sicherheit, Energie, Automationen, Szenen, System und Musik bekommen die Leiste aus Etappe 4. Ein gemeinsamer Hook `components/glas/edit/useSectionSizes.ts` regelt Preset ↔ Spalten/Höhe/`tallSections`, ‹ ›, Auge, Handy-Ausblenden und „⋯“. Die Übersicht übernimmt ihn auch. Die Schlüssel in `tallSections` heißen `<seite>:<id>` (kein neues Feld). Musik hat keine Höhenwerte, deshalb zeigt „⋯“ dort nur die Spalten. Pool, Geräte, Einstellungen und Onboarding haben keinen Bearbeiten-Modus. |
| K97 | **Aus Etappe 4 nachgeholt** (K82, K67): Die Chip-Sheets bekommen Untertitel („5 an“, „2 offen“). Sie kommen aus einer gemeinsamen Zählung in Core `chipCounts.ts`, die `SummaryChips` in beiden Stilen nutzt (Klassisch bleibt gleich). Das Mehr-Menü zeigt Werte (Energie „8,4 kWh“ heute, Zahl der Szenen, System „normal“) und den Fuß „Version … · F…“. Das Räume-Menü bekommt den Status-Kreis (Licht an). „Klima alle“ und „Rollläden alle“ bekommen die Glas-Körper der Übersicht (Raumzeilen, Ring, Zu/Stopp/Auf). Der Energie-Abruf läuft nur, solange das Mehr-Menü offen ist. |
| K98 | **Einstellungen und Onboarding:** Die Einstellungen werden eine iOS-Einstellungsliste (K94). „Version … · F…“ und „Was ist neu ›“ werden Zeilen. Onboarding bekommt nur Tokens, eine prominente Hauptaktion, Felder nach K94 und Karten ohne Rand, kein neues Layout. |
| K99 | **Pool:** Das Status-Wort steht in `tealInk`. Solar- und Manuell-Ring bekommen Glas-Farben (Spur `fill2`, wie der Klima-Bogen). Der Zeitplan-Editor im Sheet bekommt Glas-Griffe (Tages-Zeitleiste, 5-min-Schritte, Grenzpunkte, Speichern prominent), das Diagramm die Glas-Diagrammfarben. Die Inhalte K1–K10 bleiben unverändert. |

## 2. Dateien

| Teil | Neu | Geändert (`[fork]` in Upstream-Dateien) |
|---|---|---|
| Bausteine | `components/glas/edit/useSectionSizes.ts`, `GlasSectionEdit.tsx` (Leiste + „⋯“); Core `chipCounts.ts` | `components/glas/Segment.tsx` (Tabs, Symbole), `pages/Home.tsx` (auf den Hook) |
| Segmente | — | `components/energy/EnergyCards.tsx`, `components/devices/DevicesToolbar.tsx`, `components/music/ZonesCard.tsx`, `components/music/LibraryCard.tsx`, `pages/Settings.tsx`; Fork-Dateien `PumpHeroCard.tsx`, `PoolModal.tsx`, `StyleSettings.tsx`, `DeviceModeRow.tsx` |
| Bearbeiten | — | `pages/Security.tsx`, `Energy.tsx`, `Automations.tsx`, `Scenes.tsx`, `System.tsx`, `Music.tsx` |
| Menüs, Sheets | — | `components/home/SummaryChips.tsx`, Chip-Modals (Untertitel), `ClimateAllModal.tsx`, `BlindsAllModal.tsx`; Fork-Datei `app/glas/GlasTabBar.tsx` |
| CSS | `styles/glas/pages.css` (Rahmen, Heroes, Kartentitel, Spalten), `cards.css` (Raum-Karten), `lists.css` (Listen, Felder), je Seite `security.css`, `pool.css`, `energy.css`, `music.css`, `devices.css`, `settings.css` | `styles/glas/controls.css` (Schalter, Regler, Stepper, Pillen, Segment-Größen), `home.css` (Kartenliste nach `pages.css`) |

Dazu kommen Texte in allen sieben Sprachen (nur neue Namen und Menü-Werte), Fork-Changelog F37 + `CHANGELOG.fork.md`,
`docs/SYNC.md` (neue Dateien, `[fork]`-Stellen, Klassen), `CLAUDE.md`, GLAS-PLAN §3 Etappe 5 und der Selektor-Wächter
für die neuen CSS-Dateien.

## 3. Prüfungen

- **Unit:** `Segment` als Tabs und mit Symbolen (Tasten, Rollen, Name), `useSectionSizes` (Preset ↔ Felder je Seite,
  Musik ohne Höhe), `chipCounts` (jede Art, ausgeblendete Entitäten, gleich wie die bisherige Zählung) in `smoke.mjs`.
- **`checks --part pages`** (neu `scripts/glas-checks-pages.cjs`), nur Glas, soweit nicht anders gesagt:
  - `pagesFrame`: Kartentitel über der Fläche, Heroes ohne Verlauf, keine Versalien, Spalten nach K85 bei 1440/1100/900.
  - `pagesSwitches`: jeder Schalter auf jeder Seite und im Licht-Sheet: Größe, Farben an/aus, Knopf weiß, Treffer ≥ 44;
    Klick und Leertaste schalten.
  - `pagesSegments`: jedes Segment aus K92: Pfeiltasten wählen, die Linse folgt, derselbe Wert landet im Store bzw. Dienst
    wie in Klassisch; Tabs-Rollen bei Energie und Bibliothek.
  - `pagesEdit`: auf allen sechs Seiten schreibt S/M/L dieselben Felder, die Klassisch liest; ‹ ›, Auge,
    Handy-Ausblenden, „⋯“; nach dem Stilwechsel gleiche Reihenfolge und Sichtbarkeit.
  - `pagesKeep` (Nicht verlieren, GLAS-PLAN Etappe 5): je Seite eine Aktion pro Inventar-Gruppe G, E, H, K, M–T, z. B.
    Licht-Regler senden beim Loslassen, Ziffernblock, „Alle entriegeln“ mit Bestätigung, Zeitplan speichern, Pool-Neustart
    bestätigen, Seek/Shuffle, Suche/Filter/Ansicht, Automations-Schalter, alle Einstellungszeilen S1–S16, Onboarding T1–T6.
  - `pagesMenus`: Chip-Untertitel = Chip-Zahl, Werte und Fuß im Mehr-Menü, der Energie-Abruf nur bei offenem Menü,
    Status-Kreise im Räume-Menü, Klima/Rollläden alle.
  - Auch gegen den Entwicklungsserver (StrictMode).
- **§5.4-Proben:** reduzierte Bewegung (Schalter, Linse), erzwungene Farben (Schalter, Segment, Regler, Listenkanten),
  neue Kontrastpaare `pagesContrastPairs` in `glasTokens.ts`.
- **Bilder:** jede Seite hell/dunkel auf Handy und Desktop (Raum und Sicherheit auch iPad), Bearbeiten auf Sicherheit
  und Energie, die Sheets mit Schaltern und Segmenten neben `g5h-lights-*` und `g4h-pool-l`. Die Glas-Übersicht wird mit
  Etappe 4 verglichen (keine ungewollte Änderung durch geteilte Klassen).
- **Klassisch:** 0 px gegen `main` für alle Szenen (Seiten und Sheets); das DOM der 49 Fenster und der Details bleibt gleich.
- **Genau einmal vor dem Merge:** alle `checks`, der Klassisch-Vergleich, der Klick-Fuzz in beiden Stilen (Handy, Desktop,
  Bearbeiten) und die Pflichtbefehle. Nach Korrekturen aus der Code-Prüfung laufen nur die betroffenen Prüfungen.

## 4. Reihenfolge

1. Bausteine: `Segment` (Tabs, Symbole), `useSectionSizes` mit der Übersicht darauf (`homeEdit` bleibt grün),
   Schalter, Regler, Stepper, Pillen, Listen und Felder in CSS.
2. Rahmen: Kartentitel, Heroes, `SectionLabel`, Spalten.
3. Seiten in dieser Reihenfolge, je Seite Bilder und ihr `pagesKeep`-Block: Raum, Sicherheit, Pool, Energie, Musik,
   Geräte, Automationen, Szenen, System, Einstellungen, Onboarding.
4. K97: Zählung, Chip-Untertitel, Mehr- und Räume-Menü, Klima/Rollläden alle.
5. Texte, Changelog F37, Doku. Dann Code-Prüfung, Gesamtlauf, Merge.

## 5. Risiken

- **Größter PR bisher:** Die Code-Prüfung geht nach Bereichen vor (Bausteine, Rahmen, je Seite, Menüs). Das Sicherheitsnetz
  für alles, was beide Stile teilen (`SummaryChips` auf `chipCounts`, die Übersicht auf dem Hook), ist Klassisch mit 0 px.
- **Geteilte Klassen:** Schalter- und Kartenklassen kommen auch in Sheets und auf der Übersicht vor. Die Prüfteile
  `frame`, `sheets`, `gestures` und `home` laufen im Gesamtlauf mit.
- **Upstream-Merges:** Es kommen viele Selektoren auf Upstream-Klassen dazu. Sie stehen im Selektor-Wächter und in
  `docs/SYNC.md`.
- **Leistung:** Auf den Seiten kommt kein neuer `backdrop-filter` dazu; die Karten sind deckend (§3.1).
- **Ohne Skizze:** Abweichungen und offene Regeln kommen in diesen Plan (§6 ff.); im Zweifel gilt der Look der Übersicht
  und der Sheets.
