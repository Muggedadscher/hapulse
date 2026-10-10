# Glas Etappe 5 — Übrige Seiten (kurzer Plan)

Stand `main` 18d85a5 (nach PR #108). Ablauf nach [GLAS-PLAN §3](../GLAS-PLAN.md): kurzer Plan, unabhängig geprüft (§6),
ein PR. Für die Seiten gibt es keine Skizze. Maßstab sind [GLAS-DESIGN](../GLAS-DESIGN.md) §4, §5 und §7.5–7.31 sowie die
Sheet-Skizzen, die dieselben Bausteine zeigen (`g5h-lights-*`, `g5d-dialog-lights`, `g4h-*`). Hier steht nur, was
gebaut wird, wo und wie es geprüft wird. Pfade relativ zu `apps/dashboard/src/`, Core = `packages/core/src/`.
„Inventar E2“ meint einen Punkt aus [HAPULSE-INVENTORY](HAPULSE-INVENTORY.md), „Entscheid E8“ einen aus GLAS-PLAN §7.3.

Ist-Stand: Die Seiten haben seit Etappe 1–4 Glas-Farben, Schrift, den großen Titel und Sheets, aber noch die klassische
Form. Es fehlen Kartentitel über der Fläche, ruhige Heroes, iOS-Schalter, Segmente, Glas-Regler und Listen.

## 1. Festlegungen

| # | Festlegung |
|---|---|
| K88 | **Grundsatz:** Nur Aussehen und Bewegung ändern sich (GLAS-PLAN §1), Inhalte und Reihenfolge bleiben. **Klassisch bleibt pixelgleich mit `main`** bis auf die Versionszeile F38 (Einstellungen, „Was ist neu“); Etappe 5 bringt dort keine neuen Inhalte (anders als K74). Neues Markup gibt es nur in Glas (hinter `useIsGlas`) und nur, wo ein Baustein fehlt: Segment, Bearbeiten-Leiste, Menü-Werte, Status-Kreise, Rollladen-Position. Alles andere ist CSS an den vorhandenen Klassen in `styles/glas/`. Szenen-Kacheln außerhalb der Übersicht bekommen deren Look, aber kein „Aktiv“ (K74 gilt nur für die Übersicht). |
| K89 | **Seitenrahmen:** Der große Titel bleibt wie in Etappe 2. Die Karten tragen ihren Titel über der Fläche wie auf der Übersicht (§2.13). Die Regeln aus `home.css` werden eine gemeinsame Liste in `pages.css` mit den echten Wurzelklassen: Sicherheit `people-list-card`, `alarm-panel-card`, `locks-section-card`, `garage-section-card`, `sensor-section-card`; Energie `energy-sources`, `-devices`, `-solar`, `-water`, `-gas`; Pool `pool-card`; Musik `library-card`, `queue-card`, `zones-card`, `other-players-card`; System `sys-monitor-card`, `batteries-card`, `activity-card`; Automationen `auto-feed-card`, `auto-cat-card`; Szenen `scene-feed-card`, `scene-room-card`. Die Kamera-Sektion der Sicherheit hat weder Kopf noch Fläche, dort ändern sich nur die Kacheln (K90); kommt eine kopflose Karte in die Liste, setzt sie `--g-card-head: 0`. Den Titel in der Fläche behält eine Karte, deren Kopf ein Bedienelement trägt (Pool-Zeitplan mit Schalter), wie gedeckelte Karten auf der Übersicht. `energy-empty-state` ist ein Leerzustand (§7.31). Spalten nach Inhaltsbreite (K85) auf allen Seiten mit `overview-grid`; der Größen-Container bindet fixierte Nachfahren an sich, deshalb erst ab 900 px und je Seite geprüft (Menüs, Popover). `SectionLabel` verliert die Versalien, im Raum wird es ein Titel 20/25 600. Die Einstellungen bekommen Gruppentitel 15/20 600 `label2` über der Liste (§7.30). Die Reihenfolge Avatar, Chips, Titel am Handy (K27) bleibt. Die NVR-Sektion der Sicherheit folgt in Etappe 6. |
| K90 | **Heroes:** Heroes mit Zustand behalten ihn als Farbe: Sicherheit nach Alarmzustand (Inventar H1, „Verlauf nach Alarmzustand“), System nach Gesundheit. In Glas wird das ein leiser Verlauf aus dem Soft-Ton des Zustands, dazu Wort und Symbol in seiner Ink. Heroes ohne Zustand (Energie, Geräte, Automationen, Szenen) verlieren den Akzent- bzw. Türkis-Verlauf und werden schlicht `card`, wie der Hauptraum (Entscheid E8). Die Chips im Sicherheits-Hero sehen aus wie die Status-Chips (§7.5, Farben K87). Kamera-Kacheln bekommen Radius 18, das Badge „Bewegung“ wird eine Kapsel `actDel` + Weiß (heute Weiß auf `--danger`, dunkel 2,8:1). Now Playing behält den Hintergrund aus dem Cover (Medien). |
| K91 | **Schalter = iOS-Schalter** (§7.28, D25) in Listenzeilen und Kartenköpfen, nur per CSS: `auto-row-toggle`, `admin-toggle`, `pool-switch`, `lights-modal__toggle`, `device-toggle` (Zeile im Geräte-Detail) und die Schalter in `Settings`, `StyleSettings` und `GlobalSettingsAdmin`. Spur 51 × 31 in `switchOn`/`switchOff`, Knopf 27 weiß mit Schatten, Trefferfläche mindestens 44 (Desktop 64 × 44). Die Knopf-Elemente bleiben der gezeichnete Knopf. Die Regel aus dem Detail (Etappe 4, `detail.css`) wird die gemeinsame in `controls.css`. **Auf Kacheln kein Schalter** (§7.28): Licht- und Schalter-Karte im Raum schalten wie heute als Ganzes (Tipp, Enter, Leertaste). Der Symbol-Kreis 36 zeigt den Zustand (an Gelb + `glyphDark`), daneben steht der Zustandstext. Der Pill-Schalter bleibt im DOM und ist in Glas ausgeblendet. Die Karten-Variante von `device-toggle` erscheint in Glas nicht mehr (Etappe 4). Bei reduzierter Bewegung gleitet nichts. |
| K92 | **Segmente mit Linse** (§7.27, K80): `Segment` ersetzt in Glas über eine `[fork]`-Weiche den Energie-Zeitraum, den Pool-Modus (Seite und Sheet), Stil, Glas-Stärke, Hell/Dunkel/Auto, den Geräte-Override sowie die Ansicht Raster/Liste bei Geräten und Zonen. Es bleibt `radiogroup` wie auf der Übersicht, auch beim Energie-Zeitraum. Dafür lernt `Segment` drei Dinge: (1) **manuelle Aktivierung**: Pfeile bewegen nur den Fokus, Leertaste/Enter wählen. Das gilt für alles, was etwas schreibt (Pool, Einstellungen); reine Ansichten (Zeitraum, Raster/Liste) folgen dem Fokus. (2) **Erneutes Wählen** (`onReselect`): „Manuell“ öffnet immer die Dauerwahl, auch wenn es schon gewählt ist; der Modus ändert sich erst mit dem Start wie heute. (3) **Symbol-Optionen** mit Namen (Raster/Liste); Text und Symbol werden nie gemischt. Hat der Pool-Modus mehr als 5 Optionen, bleiben die klassischen Knöpfe. Nach dem Wechsel auf „Klassisch“ geht der Fokus auf den klassischen Knopf derselben Wahl. Die Bibliotheks-Tabs (5, Symbol und Text) bleiben eine waagerecht scrollende Reihe und werden Auswahl-Pillen (§7.29). Der NVR-Einrichtungsdialog folgt in Etappe 6. |
| K93 | **Knöpfe, Pillen, Stepper, Regler** (§7.29), per CSS. Klima-Modi werden Auswahl-Pillen 36 (gewählt `accentSoft` + `accentInk` + Ring 1,5 px). Die Alarm-Modi auf der Seite übernehmen die Regeln des Alarm-Sheets (Raster 2 Spalten, 52 hoch, Radius 18, gewählt `accentSoft` + Ring 2 px, `alarm-btn--active` bleibt). Stepper − / + werden rund 44 `fill`. „Alle verriegeln/entriegeln“ und „Alle schließen/öffnen“ werden „plain“ 44, die Bestätigung aus Etappe 3 bleibt. Gefahr-Knöpfe auf Seiten (Pool-Neustart, Trennen) werden `actDel` + Weiß wie im Sheet. Je Ansicht gibt es höchstens eine prominente Aktion. **Waagerechte Regler** bleiben Kapseln 28 ohne Knopf wie Klassisch und das Medien-Sheet: Spur `fill2`, Füllung Helligkeit Gelb (D16), Lautstärke und Seek `label2` (§7.18). Die Verlaufs-Regler (Farbtemperatur, Farbton, Akzent) behalten ihren Verlauf und bekommen einen weißen Knopf 24 mit dem Schalter-Schatten. Ziehen `scale(1.04)` (§6.3); gesendet wird weiter beim Loslassen (Inventar E2). Akzent ist nie Zustandsfarbe (§2.3). **Play** folgt dem Medien-Sheet auf Seite und Karten: rund 44 (Now Playing 56) `fill` mit Glyphe `label`, beim Spielen Blau + Weiß. Die übrigen Steuerknöpfe werden rund 44 `fill`. |
| K94 | **Listen „inset grouped“** (§7.30): Einstellungen (alle Gruppen), System (Batterien), Sicherheit (Personen, Schlösser, Garage, Türen, Fenster, Bewegung), Geräte in der Listenansicht, Automationen (Kategorien), Musik (Warteschlange, andere Player), Pool (Kennzahlen). Zeilen 48–60 hoch, Trennlinie 0,5 px ab Textanfang, Wert in `label2`, Chevron in `label3`. Keine Trennlinie nach der letzten Zeile einer Liste: die Regel hängt an der Liste, nicht am `managed-fieldset`, das eine Liste in Gruppen teilt. Die Symbol-Chips der Einstellungen haben Inline-Farben; Glas setzt die Tokens dort lokal (`--accent-soft` usw.) und zeigt das Symbol einfarbig `label2` wie im Mehr-Menü, ohne `!important`. **Felder** (App-Name, Suche, Token): `fill`, Radius 10, sichtbar 36, Trefferfläche 44, Schrift 17 (unter 16 px zoomt iOS), Lupe bei Suchen. Die Über-Karte wird Zeilen; `about-card__link--button` bleibt. |
| K95 | **Raum:** Der Hero hat den Glas-Look schon (gleiche Komponente wie die Übersicht, Etappe 4). Die Entitäts-Karten (`EntityCard`-Familie, `cards.css`) werden deckend `card`, ohne Rand, Radius 22, mit dem Symbol im Kreis 36 in Zustandsfarbe wie die Geräte-Kacheln (§7.10), Schaltern nach K91 und Reglern nach K93. Klima- und Rollladen-Karte folgen §7.11/§7.12 (siehe K97). Szenen-Kacheln sehen aus wie auf der Übersicht (K88). Halb/Voll-Breite und Ziehen bleiben wie in Klassisch (nur zwei Größen, kein S/M/L), die Griffe bekommen den Glas-Look. Sentinel-Kameras folgen in Etappe 6. |
| K96 | **Bearbeiten S/M/L auf fünf Seiten** (Entscheid E6, K78): Sicherheit, Energie, Automationen, Szenen und System bekommen die Leiste aus Etappe 4. `SizeBar` und `SizeSheet` ziehen nach `components/glas/edit/`. Ein Hook `useGlasSectionEdit` übernimmt nur die Glas-Wege (Preset ↔ Spalten/Höhe/`tallSections`, ‹ ›, „⋯“); die klassischen Handler der Seiten bleiben. Die Übersicht nutzt ihn auch. Die Schlüssel in `tallSections` heißen `<seite>:<id>` (kein neues Feld). Die Namen kommen aus den vorhandenen Titel-Schlüsseln, die Kategorien der Automationen aus ihrem Namen; neue `glas.edit.card.*`-Schlüssel nur, wo nichts passt. Die Regeln in `edit.css` gelten statt für `.home-page` für die Liste der Seiten. Die gefilterte Ansicht der Automationen gibt es nur außerhalb des Bearbeitens, also ohne Leiste. Musik hat nur Auge und Handy-Ausblenden, kein Raster (GLAS-PLAN §2.16): beide Knöpfe bekommen den Glas-Look, sonst bleibt alles. Pool, Geräte, Einstellungen und Onboarding haben keinen Bearbeiten-Modus. |
| K97 | **Aus Etappe 4 nachgeholt** (K82, K67): Die Chip-Sheets bekommen Untertitel („5 an“, „2 offen“) aus einer gemeinsamen Zählung in Core `chipCounts.ts`, die `SummaryChips` in beiden Stilen nutzt (Klassisch bleibt gleich). `lockSummary` liegt seit Etappe 4 in Core, die Pool-IDs gibt `SummaryChips` hinein. Das Mehr-Menü (`AppLayout.tsx`) zeigt Werte (Energie heute „8,4 kWh“, Zahl der Szenen, System „normal“) und den Fuß „Version … · F…“; der Energie-Abruf läuft nur, solange es offen ist. Das Räume-Menü (`RoomsMenu.tsx`) bekommt den Kreis 32 mit dem vollen Status wie `GlasRoomTile` (Offenes, Wasser, Rauch vor Licht an). „Klima alle“ und „Rollläden alle“ behalten ihre Karte je Gerät (`ClimateCard`, `CoverCard`) im Look von §7.11/§7.12: Soll-Kapsel 40 mit − / +, Modus-Pillen 36; Mini-Rollo 40 (Radius 12, Lamellen nach Position), Position 15/600, Knöpfe 40. Dieselben Regeln gelten für diese Karten im Raum. |
| K98 | **Einstellungen und Onboarding:** Die Einstellungen werden eine iOS-Einstellungsliste (K94). „Version … · F…“ und „Was ist neu ›“ werden Zeilen. Onboarding bekommt nur Tokens, eine prominente Hauptaktion, Felder nach K94 und Karten ohne Rand, kein neues Layout. |
| K99 | **Pool:** Das Status-Wort steht in `tealInk`. Solar- und Manuell-Ring bekommen Glas-Farben (Spur `fill2`, wie der Klima-Bogen). Der Zeitplan-Editor im Sheet bekommt Glas-Griffe (Tages-Zeitleiste, 5-min-Schritte, Grenzpunkte, Speichern prominent), das Diagramm die Glas-Diagrammfarben. Die Inhalte K1–K10 bleiben unverändert. |

## 2. Dateien

| Teil | Neu | Geändert (`[fork]` in Upstream-Dateien) |
|---|---|---|
| Bausteine | `components/glas/edit/useGlasSectionEdit.tsx`; `SizeBar.tsx`, `SizeSheet.tsx` ziehen von `glas/home/` nach `glas/edit/`; Core `chipCounts.ts` | `components/glas/Segment.tsx` (manuell, erneut wählen, Symbole), `pages/Home.tsx` (Hook), Core `index.ts` (Export), `glasTokens.ts` (Kontrastpaare) |
| Segmente | — | `components/energy/EnergyCards.tsx`, `components/devices/DevicesToolbar.tsx`, `components/music/ZonesCard.tsx`, `pages/Settings.tsx`; Fork-Dateien `PumpHeroCard.tsx`, `chipmodals/PoolModal.tsx`, `StyleSettings.tsx`, `DeviceModeRow.tsx` |
| Bearbeiten | — | `pages/Security.tsx`, `Energy.tsx`, `Automations.tsx`, `Scenes.tsx`, `System.tsx` |
| Menüs, Karten | — | `components/home/SummaryChips.tsx`, Chip-Modals (Untertitel), `app/AppLayout.tsx` (Mehr-Menü), `components/nav/RoomsMenu.tsx` (Status-Kreis), `components/cards/CoverCard.tsx` (Position als Variable, nur Glas) |
| CSS | `styles/glas/pages.css` (Kartentitel, Spalten, Heroes), `cards.css` (Raum-Karten, Klima/Rollläden), `lists.css` (Listen, Felder), je Seite `security.css`, `pool.css`, `energy.css`, `music.css`, `devices.css`, `settings.css` | `styles/glas/index.css` (Importe), `controls.css` (Schalter, Regler, Stepper, Pillen, Segment-Größen), `home.css` (Kartenliste nach `pages.css`), `edit.css` (Seitenliste), `accent.css` (Schalter-Spuren, Kachel-Schalter), `detail.css` (Schalter nach `controls.css`), `sheet-content.css` (Alarm-Modi auch auf der Seite; Kommentare „bis Etappe 5“) |
| Prüfungen | `scripts/glas-checks-pages.cjs` | `glas-shots.cjs` (`--part pages`; `knobs` zählt nur sichtbare Knöpfe), `glas-checks-sheets.cjs` (Pool-Selektoren für beide Formen) |

Dazu kommen Texte in allen sieben Sprachen (nur neue Namen und Menü-Werte), Fork-Changelog F38 (geplant als F37; F37 ging an die Klima-Einheit, PR #109) + `CHANGELOG.fork.md`,
`docs/SYNC.md` (neue Dateien, `[fork]`-Stellen, Klassen), `CLAUDE.md`, GLAS-PLAN §3 Etappe 5 und der Selektor-Wächter
für die neuen CSS-Dateien.

## 3. Prüfungen

- **Unit (Core, `smoke.mjs`):** `chipCounts` (jede Art, ausgeblendete Entitäten, gleich wie die bisherige Zählung) und
  `sizePresets` mit Schlüsseln anderer Seiten. Der Dashboard-vitest läuft ohne DOM; `Segment` wird deshalb im Browser in
  `pagesSegments` geprüft.
- **`checks --part pages`** (neu `scripts/glas-checks-pages.cjs`), nur Glas, soweit nicht anders gesagt:
  - `pagesFrame`: Kartentitel über der Fläche (Kamera-Sektion ohne Kopf und Fläche, Pool-Zeitplan mit Titel in der Fläche), Heroes nach
    K90, keine Versalien, Spalten nach K85 bei 1440/1100/900, nichts Fixiertes verrutscht.
  - `pagesSwitches`: jeder Listen-Schalter auf jeder Seite und im Licht-Sheet: Größe, Farben an/aus, Knopf weiß,
    Treffer ≥ 44, Klick und Leertaste schalten. Kacheln: kein sichtbarer Schalter, die Kachel schaltet per Klick und
    Leertaste.
  - `pagesSegments`: jedes Segment aus K92 schreibt denselben Wert in Store bzw. Dienst wie Klassisch. Manuelle
    Aktivierung (Pfeile ändern nichts, Leertaste wählt), „Manuell“ öffnet die Dauerwahl auch beim zweiten Tipp, mit
    6 Pool-Optionen (Demo-Steuerung) klassische Knöpfe, nach dem Stilwechsel liegt der Fokus auf dem klassischen Knopf.
  - `pagesEdit`: auf allen fünf Seiten schreibt S/M/L dieselben Felder, die Klassisch liest; ‹ ›, Auge,
    Handy-Ausblenden, „⋯“; nach dem Stilwechsel gleiche Reihenfolge und Sichtbarkeit. Musik: Auge und Handy schalten.
  - `pagesKeep` und `pagesEmpty`: „Nicht verlieren“ nach der Tabelle unten; Leerzustände (Inventar X, §7.31), soweit die
    Demo sie zeigen kann (Route, Demo-Steuerung), sonst Klasse und Text im DOM.
  - `pagesMenus`: Chip-Untertitel = Chip-Zahl, Werte und Fuß im Mehr-Menü, der Energie-Abruf nur bei offenem Menü,
    Status-Kreise im Räume-Menü, Klima/Rollläden alle.
  - Auch gegen den Entwicklungsserver (StrictMode).
- **Ältere Prüfungen anpassen:** `win-manual` und `sheetsHandoff` (`glas-checks-sheets.cjs:61`, `:547`) tippen
  `.pool-modal__mode-btn--manual` an und bekommen einen Selektor für beide Formen. `knobs` zählt nur sichtbare Knöpfe,
  die ausgeblendeten Kachel-Schalter fallen aus der Pflichtliste. Was die Teile `frame`, `sheets`, `gestures` und `home`
  sonst an alten Formen erwarten, wird mitgezogen.
- **§5.4-Proben:** reduzierte Bewegung (Schalter, Linse, Regler), erzwungene Farben (Schalter, Segment, Regler,
  Listenkanten), neue Kontrastpaare `pagesContrastPairs` in `glasTokens.ts` für neue Kombinationen (`actDel` + Weiß an
  Bewegungs-Badge und Gefahr-Knopf, Feldtext auf `fill`, Auswahl-Pillen über `card`). Die Play-Glyphe auf Blau hat ein
  Paar aus Etappe 3.
- **Bilder:** jede Seite hell/dunkel auf Handy und Desktop (Raum und Sicherheit auch iPad), Bearbeiten auf Sicherheit
  und Energie, die Sheets mit Schaltern und Segmenten neben `g5h-lights-*` und `g4h-pool-l`. Die Glas-Übersicht wird mit
  Etappe 4 verglichen (keine ungewollte Änderung durch geteilte Klassen).
- **Klassisch:** Pixelvergleich mit `main` für alle Szenen (Seiten und Sheets), erwartet ist nur F38 (`--expect` für
  Einstellungen und „Was ist neu“). Das DOM der 49 Fenster und der Details bleibt gleich.
- **Genau einmal vor dem Merge:** alle `checks`, der Klassisch-Vergleich, der Klick-Fuzz in beiden Stilen (Handy, Desktop,
  Bearbeiten) und die Pflichtbefehle. Nach Korrekturen aus der Code-Prüfung laufen nur die betroffenen Prüfungen.

### 3.1 „Nicht verlieren“ → Prüfung

| GLAS-PLAN Etappe 5 | Wo geprüft (`pagesKeep`, wenn nicht anders gesagt) |
|---|---|
| Raum G1–G10 | Sektionen in derselben Reihenfolge wie Klassisch, Halb/Voll schreibt dasselbe, Ziehen und Auge/Stern im Fuzz mit Bearbeiten, „nicht gefunden“/„keine Geräte“ in `pagesEmpty` |
| Entitäts-Karten E1–E13 | Helligkeit, Farbtemperatur, Farbton senden je einmal beim Loslassen; Klima-Pille und Stepper; Zu/Stopp/Auf; Garage fragt beim Öffnen; Play/Lautstärke; Kachel schaltet; Schloss mit Code bis zum Dialog; Button, Sauger; Sensor, Kamera und „nicht verfügbar“ im Bild |
| Sicherheit H1–H13 | Hero je Alarmzustand im Bild (Demo-Steuerung); Alarm-Modus und Ziffernblock bis zum Code; „Alle entriegeln“ mit Anzahl und Bestätigung; Garage alle; Kamera-Badge, Personen, Türen/Fenster/Bewegung im Bild; Leerzustand in `pagesEmpty` |
| Pool K1–K10 | Modus-Segment (siehe `pagesSegments`); Solar-Stepper; Stopp; Zeitplan: Griff um 5 min ziehen und speichern (Dienstaufruf in der Demo); Kachel → Detail; Neustart nur bis zur Bestätigung |
| Musik M1–M11 | Seek, Shuffle/Repeat, Raster/Liste, Raum stumm/Lautstärke, Bibliothek (Tabs, Favoriten, Suche, Elementmenü), Warteschlange (Übertragen, Gruppieren) — soweit die Demo es zeigt, sonst Klassen im DOM |
| Energie N1–N9 | Zeitraum-Segment; Hero, Quellen, Solar, Geräte, Wasser/Gas im Bild; Einrichtungs-Knopf in `pagesEmpty` |
| Geräte O1–O7 | Suche, Filter, Raster/Liste, Detail-Modal, Inline-Steuerung inkl. Garage/Schloss-Bestätigung, Stern/Auge |
| Automationen, Szenen P, Q | Schalter je Automation (Klick, Leertaste), Suche/Filter, Feed; Szenen-Kachel aktiviert |
| System R1–R5 | Balken und Schwellen, Batterien im Bild; Bearbeiten in `pagesEdit` |
| Einstellungen S1–S16 | jede Zeile bedienbar; Trennen (S1), „für alle übernehmen“ (S12) und Import (S14) nur bis zum Dialog; Version und „Was ist neu“ |
| Onboarding T1–T6 | in einem abgemeldeten Kontext ohne Demo: Felder, Mixed-Content-Warnung, Token-Weg aufklappen, Demo starten |

## 4. Reihenfolge

1. Bausteine: `Segment` (manuell, erneut wählen, Symbole), `SizeBar`/`SizeSheet` nach `glas/edit/` und
   `useGlasSectionEdit` mit der Übersicht darauf (`homeEdit` bleibt grün), Schalter, Regler, Stepper, Pillen, Listen und
   Felder in CSS. Danach Klassisch-Vergleich für die Übersicht.
2. Rahmen: Kartentitel, Heroes, `SectionLabel`, Spalten.
3. Seiten in dieser Reihenfolge, je Seite Bilder und ihr `pagesKeep`-Block: Raum, Sicherheit, Pool, Energie, Musik,
   Geräte, Automationen, Szenen, System, Einstellungen, Onboarding.
4. K97: Zählung, Chip-Untertitel, Mehr- und Räume-Menü, Klima/Rollläden alle. Danach Klassisch-Vergleich für Chips und
   Übersicht.
5. Ältere Prüfungen anpassen, Texte, Changelog F38, Doku. Dann Code-Prüfung, Gesamtlauf, Merge.

## 5. Risiken

- **Größter PR bisher:** Die Code-Prüfung geht nach Bereichen vor (Bausteine, Rahmen, je Seite, Menüs). Das Sicherheitsnetz
  für alles, was beide Stile teilen (`SummaryChips` auf `chipCounts`, die Übersicht auf dem Hook), ist der
  Klassisch-Vergleich nach Schritt 1 und 4. Wird der PR zu groß, wird er geteilt: 5a Bausteine, Rahmen und die Seiten bis
  Energie; 5b die übrigen Seiten und K97.
- **Geteilte Klassen:** Schalter- und Kartenklassen kommen auch in Sheets und auf der Übersicht vor. Die Prüfteile
  `frame`, `sheets`, `gestures` und `home` laufen im Gesamtlauf mit.
- **Upstream-Merges:** Es kommen viele Selektoren auf Upstream-Klassen dazu. Sie stehen im Selektor-Wächter und in
  `docs/SYNC.md`.
- **Leistung:** Auf den Seiten kommt kein neuer `backdrop-filter` dazu; die Karten sind deckend (§3.1).
- **Ohne Skizze:** Abweichungen und offene Regeln kommen in diesen Plan (§7 ff.); im Zweifel gilt der Look der Übersicht
  und der Sheets.

## 6. Prüfung des Plans (2026-10-09)

Unabhängige Prüfung des Entwurfs (07ea69c): ein Blocker, 11 Punkte „sollte“, 9 Kleinigkeiten. Alle am Code nachgeprüft
und übernommen, außer wo anders vermerkt.

| Befund | Ergebnis |
|---|---|
| B1 Musik kann kein S/M/L | Musik raus aus S/M/L, fünf Seiten; dort nur Auge und Handy im Glas-Look (K96). |
| S1 Segment verliert Verhalten | manuelle Aktivierung, erneutes Wählen, Fokus nach dem Stilwechsel, ab 6 Pool-Optionen klassisch (K92); Prüfung in `pagesSegments`. |
| S2 ältere Prüfungen, „0 px“ | Abschnitt „Ältere Prüfungen anpassen“, Klassisch mit `--expect` für F38 (§3, K88). |
| S3 Bearbeiten doppelt | `SizeBar`/`SizeSheet` ziehen um, Hook nur für die Glas-Wege, `edit.css` für alle Seiten, Namen und Automations-Filter (K96). |
| S4 Regler widersprechen GLAS-DESIGN | Kapsel 28 `fill2`, Helligkeit Gelb, Lautstärke `label2`, Verläufe mit weißem Knopf, `scale(1.04)`, kein „Position“, eine Play-Regel (K93). |
| S5 Schalter auf Kacheln | nach §7.28: die Kachel schaltet, Kreis 36, deckend (K91, K95); `accent.css` und `detail.css` in §2. |
| S6 „Klima/Rollläden alle“ | Karte je Gerät nach §7.11/§7.12, gilt auch im Raum (K97). |
| S7 Menüs, Status | `AppLayout.tsx` und `RoomsMenu.tsx` in §2, voller Status, Pool-IDs als Eingabe; `lockSummary` ist schon in Core (K97). |
| S8 Kartenliste | echte Klassen, Kamera-Sektion ohne Kopf und Fläche, Pool-Zeitplan mit Titel in der Fläche (K89). |
| S9 Alarm-Modi | Regeln des Sheets auch auf der Seite (K93). |
| S10 Abdeckung | Tabelle §3.1, Leerzustände, destruktive Zeilen nur bis zum Dialog, Kachel per Leertaste, Onboarding abgemeldet, Kontrastfälle (K90, K93, §3). |
| S11 Unit-Tests ohne DOM | Core-Tests in `smoke.mjs`, `Segment` im Browser (§3). |
| N1 Heroes ohne Verlauf | Zustands-Heroes behalten ihre Farbe als leisen Verlauf, kein Verlust von H1 (K90); damit keine Abweichung. |
| N2 Tabs als `tablist` | entfällt: Energie bleibt `radiogroup`, die Bibliothek wird Auswahl-Pillen statt Segment (K92). |
| N3 Symbol-Chips der Einstellungen | Tokens lokal, kein `!important` (K94). |
| N4 Über-Karte | `about-card__link--button` bleibt (K94). |
| N5 Trennlinien und `managed-fieldset` | Regel an der Liste (K94). |
| N6 Felder | Treffer 44, Schrift 17 (K94). |
| N7 E-Verweise | Inventar- und Entscheid-Verweise unterschieden (Kopf). |
| N8 Teilung, Zwischenvergleiche | Teilung 5a/5b, Klassisch-Vergleich nach Schritt 1 und 4 (§4, §5). |
| N9 Dateiliste | `index.css`, `sheet-content.css`, `glasTokens.ts`, Core `index.ts`, beide Prüfskripte ergänzt (§2). |

## 7. Abweichungen und Nachträge beim Bau

### 7.1 Schalter (K91)

- Die Regel gilt für alle Listen-Schalter in `controls.css`; die aus `detail.css` ist dort aufgegangen. `accent.css`
  behält nur die Pille auf Kacheln (bis zum Raum, K95) und den alten `toggle-switch`.
- **Trefferfläche** 64 × 44 über ein durchsichtiges `::before` an Label oder Knopf, das Layout bleibt. Die
  Automations-Liste scrollt und schnitt die Fläche rechts ab; seit dem Automations-Schritt (§7.14) reicht die Liste bis
  an die Kanten der Fläche und die Zeilen haben 16 Innenabstand, die Fläche bleibt in der Zeile (vorher: 7 px in den
  Innenabstand der Karte).
- **Pille der Schalter-Karte:** Sie ist nur ein Bild (`ToggleCard`: `aria-hidden`, kein Tab-Halt), ihr Label hält den
  Klick aber auf, deshalb tat ein Tipp genau auf die Pille nichts (auch in Klassisch, Nebenbefund 16). In Glas geht der
  Tipp zur Karte durch (`pointer-events: none`), die als Ganzes schaltet, wie K91 es für Kacheln will. Das betrifft die
  Steuerkarte im Detail und bis zum Raum-Schritt die Kacheln.
- `pagesSwitches` prüft auf Handy (dunkel) und Desktop (hell): Automationen, Pool-Zeitplan, Einstellungen, Licht-Sheet,
  Geräte-Detail und die Pille im Detail.

### 7.2 Stepper, Auswahl-Pillen, Regler, Play (K93, Bausteine)

- Gemeinsame Regeln in `controls.css`: Stepper der Klima-Karte und des Pools (Seite) rund 44 `fill`, Klima-Modi als
  Auswahl-Pillen 36, Regler in Glas-Farben (Spur `fill2`, Helligkeit Gelb, Lautstärke und Position `label2`), Play der
  Medien-Karte, der Player-Kacheln und von Now Playing (56). `accent.css` führt Helligkeits-Füllung, Musik-Regler und
  Play nicht mehr.
- Die Farbtemperatur füllt wie Klassisch von links; ihr Knopf sitzt am Ende der Füllung (mindestens 28 breit, damit
  er bei kleinen Werten sichtbar bleibt). Farbton und Akzent haben einen echten Regler-Knopf (24, weiß, Schatten).
- Der Fokusring der Kapseln liegt auf der Kapsel (`:has`), weil das Eingabefeld darüber unsichtbar ist.
- Now Playing kennt „spielt“ nur am Pause-Symbol (`:has(> .lucide-pause)`); die Karten über `card--active`. Der
  Selektor-Wächter prüft die Klasse des Symbols (`MARKER_ICONS`).
- Prüfung `pagesControls` (Teil `pages`): Größen und Farben, „+“ ändert den Zielwert, eine Pille wird gewählt, Play
  schaltet und wechselt die Farbe.
- Mit den Seiten (Schritt 3) folgen: Alarm-Modi auf der Sicherheitsseite, „Alle verriegeln/schließen“, Gefahr-Knöpfe,
  Play der Bibliothek, Stepper und Transport im Gerätefenster (`device-icon-btn`) und die übrigen Steuerknöpfe.

### 7.3 Felder (K94, Baustein)

- `lists.css`: App-Name/Token (`settings-text-input`), Onboarding, Suche in Geräten, Automationen und Bibliothek.
  Ein Feld für sich zeichnet seine sichtbaren 36 in einem durchsichtigen Rand von 4 oben und unten (Ecken
  `10px / 14px`, an der sichtbaren Kante 10); bei den Suchleisten ist die Leiste 36 hoch und ihr Eingabefeld ragt
  4 darüber und darunter hinaus. Fokusring innen (`focus`), mit erzwungenen Farben als Umriss.
- Prüfung `pagesFields`: sichtbar 36, Treffer 44, `fill`, Schrift 17, ein Klick 2 px über der sichtbaren Kante
  fokussiert das Feld, Tippen kommt an.
- Die Listen „inset grouped“ hängen an der Markup-Struktur jeder Seite; sie kommen mit den Seiten (Schritt 3) in
  `lists.css`, je Seite mit ihrem `pagesKeep`-Block.

### 7.4 Abschnittstitel (K89, erster Teil des Rahmens)

- Neue Datei `pages.css`: `SectionLabel` im Raum (auch im Bearbeiten-Modus) als Titel 20/25 600 `label`, in den
  Einstellungen als Gruppentitel 15/20 600 `label2`; ohne Versalien und ohne die Linie daneben.
- Abweichung: Die Einstellungs-Titel stehen in den Locales klein („verbindung“), Klassisch zeigt sie in Versalien.
  Glas setzt nur den ersten Buchstaben groß (Satzanfang, `::first-letter`), statt der Versalien. **Ersetzt** durch
  [PLAN-TEXTE](PLAN-TEXTE.md): die Texte sind selbst richtig geschrieben, die Regel ist weg.
- Prüfung `pagesTitles`. Kartentitel über der Fläche, Heroes und Spalten folgen.

### 7.5 Kontrastpaare (§3)

- `pagesContrastPairs` in `glasTokens.ts`: Feldtext und Platzhalter auf `fill` über Karte und Seite, gewählte
  Auswahl-Pille (`accentInk` auf `accentSoft` über der Karte); alle Modi, Stärken und Akzent-Farbtöne grün.
  `actDel` + Weiß (Bewegungs-Badge, Gefahr-Knopf) kommt mit den Seiten, die es benutzen.

### 7.6 Kartentitel über der Fläche (K89, Sicherheit)

- `pages.css`: Personen, Schlösser, Garagentore und Türen/Fenster/Bewegung tragen den Titel über der Fläche wie die
  Übersicht (Kopf 44, Abstand 6, Fläche als `::before`, Symbol ohne Chip in `label2`, Anzahl 15 `label2` am Ende der
  Zeile). Die Teile im Körper (Knöpfe, Trennlinie, Liste) haben einheitlich 12 Abstand wie auf der Übersicht (Klassisch
  12 bzw. 14).
- **Abweichung:** Die gemeinsame Liste beginnt mit der Sicherheit, `home.css` behält die Liste der Übersicht. Die
  übrigen Seiten kommen mit ihren Schritten dazu; erst wenn alle drin sind, wird die Übersicht in dieselbe Liste
  gezogen (ein Vergleich der Übersicht mit 0 Pixeln deckt das ab).
- Prüfung `pagesCardTitles` (Desktop hell, Handy dunkel); auf dem Stand davor ist sie rot.

### 7.7 Rahmen der übrigen Seiten (K89, K90, K85)

- **Titel über der Fläche** auf allen Seiten aus K89 (`pages.css`, eine Liste). Den Titel **in der Fläche** behalten:
  Pool-Zeitplan (Schalter im Kopf), auf der Musikseite Zonen (Ansicht), Warteschlange und Bibliothek (Player-Wahl).
  **Abweichungen:** (1) Auch die Player-Karte der Musikseite behält ihn, damit die rechte Spalte bündig mit Now Playing
  beginnt; sonst trüge auf der Seite nur sie den Titel über der Fläche. (2) Wasser mit einem Zähler und Gas bestehen
  in Klassisch nur aus dem Kopf; in Glas steht ihr Titel ebenfalls über der Fläche, der Wert darin als Zahl (§7.11).
  Der erste Entwurf ließ beide Titel in der Fläche; allein in einer Zeile sah die Lücke darüber wie ein Fehler aus.
- Die Übersicht behält ihre Liste in `home.css` (Abweichung von §7.6): Ihre Karten haben im Körper eigene Abstände
  (0 bzw. 12 je Karte), die Seiten einheitlich 12. Ein Zusammenlegen hätte die Übersicht verschoben und bringt nichts.
- **Spalten (K85)** auf Sicherheit, Energie, System, Automationen und Szenen: die Seite ist ab 900 px ein
  Größen-Container (`g-page`), Inhalt ≥ 1180 → 4, ≥ 900 → 3, darunter 2 bzw. 1. **Abweichung:** Ein Raster, dessen
  Karten alle mindestens zwei Spalten breit sind (System; Automationen mit Kategorie-Filter), nimmt im Bereich der drei
  Spalten vier, sonst bliebe in jeder Zeile ein Drittel leer (Klassisch zeigt dort auf breiten Schirmen ebenfalls
  Paare). Bei 1440 hat System deshalb 4 Spalten, die übrigen Seiten 3.
- **Bündig:** Ab drei Spalten beginnt die Fläche einer Karte ohne Titel (Hero, Alarm-Panel) auf der Linie der
  Nachbar-Flächen (50 = Kopf 44 + Abstand 6 frei darüber); eine Karte über die ganze Zeile behält ihren Platz.
- **Pool:** eigenes Raster (`auto-fit`, mindestens 300) mit den Abständen der übrigen Seiten (20, ab 900 px 26/20).
  `.pool-layout` ist bei jeder Breite Container (`g-pool`), die Seite hat keine fixierten Nachfahren (ihre Fenster
  sind portaliert); ab zwei Spalten steht der Zeitplan bündig mit den Nachbarn.
- **Heroes (K90):** Sicherheit nach Alarmzustand (scharf grün wie im Alarm-Fenster, ausgelöst/verzögert rot,
  unscharf ohne Ton), System nach Gesundheit (grün, Warnung gelb, kritisch rot): leiser Verlauf aus dem halben
  Soft-Ton (§7.16), Zustandswort 22/28 700 und Symbol im Kreis 56 in seiner Ink, Name 13/18 `label2` ohne Versalien.
  Die Chips im Sicherheits-Hero sind Kapseln 32 in `fill` (sie sind keine Knöpfe, deshalb nicht 44 wie die
  Status-Chips), Farbe nur am Symbol nach K87 (offene Tür `warnInk`), der Text dann 600 `label`; im System-Hero ebenso,
  ein Wert über seiner Schwelle bekommt einen Punkt vor dem Namen (§7.16).
  Energie, Automationen und Szenen verlieren den Verlauf; ihre Zeile über der Zahl wird 15/20 `label2` mit Symbol 18,
  der Energie-Hero behält seinen Titel 20/25 600 in der Fläche (er trägt die Zeitraum-Wahl).
- Die Alarm-Modi (K93), Kamera-Kacheln (Radius 18, Badge „Bewegung“) und Listen (K94) kommen mit den Seiten.
- Prüfungen: `pagesCardTitles` jetzt für alle Seiten (über bzw. in der Fläche), neu `pagesFrame`: Spalten bei
  1920/1440/1100/900, nichts breiter als das Fenster, bündige Flächen, Heroes in drei Zuständen, Kamera-Sektion ohne
  Kopf und Fläche, kein fixiertes Element in einer Container-Seite (auch mit offenem Ziffernfeld, Detail und
  Benachrichtigungen; das Panel hängt weiter unter seiner Glocke).

### 7.8 Raum (K95, mit §7.10–§7.12 aus K97)

- Neue Datei `cards.css` für die `EntityCard`-Familie, wo sie steht: Kacheln im Raum, Karten in „Klima alle“ und
  „Rollläden alle“ (`.all-modal__grid`, ihre Fläche folgt mit K97) und die Steuerkarte im Detail. Kreis 36 in der
  Zustandsfarbe wie die Geräte-Kacheln (Licht und Schalter Gelb, ein Schalter mit Ventilator-Symbol Türkis, Sauger Grün,
  Klima nach dem, was es tut: heizt Orange, kühlt Blau, Automatik Grün; Schloss, Tor und Binärsensoren im Soft-Ton wie
  in den Fenstern), Name 15/20 600, Zustand 13/18 `label2`, Abweichungen 600 in ihrer Ink.
- **Kacheln im Raum:** deckend `card`, ohne Rand, Radius 22; Licht- und Schalter-Kachel schalten als Ganzes, die Pille
  bleibt im DOM und ist ausgeblendet (`accent.css` führt sie nicht mehr). Die Zeile unter dem Namen nennt den Zustand:
  Licht „An · 78 %“ (`LightCard`, nur Glas), Schalter „An“/„Aus“ (`ToggleCard`, `g-tile-state`). Unter dem Finger 0,97,
  unter dem Zeiger 1 px höher (ab 900 px); eine vom Kontextmenü gehobene Kachel bewegt sich nicht zusätzlich.
- **Klima (§7.11):** Soll in einer Kapsel 40 `fill` mit − / + 40 darin (Treffer 44), Wert 17/22 600; die runden
  Stepper 44 aus §7.2 bleiben für den Pool. Die Zeile unter dem Namen in der Ink des Tons (`data-tone` an der
  `ClimateCard`, nur Glas). Aktuell 22/28 700, Beschriftungen 13/18 ohne Versalien.
- **Rollladen (§7.12):** Mini-Rollo 40 (Radius 12) mit Lamellen bis zur Position (`--g-pos` aus `CoverCard`; ohne
  Position nach Zustand: zu 0, sonst 100), Position 15/20 600, Knöpfe 40 (Treffer 44). Eine Karte unter 360 zeigt die
  Knöpfe nur als Symbol (die Namen bleiben `aria-label`).
- **Zeilen** (Schloss, Tor, Knopf): eine Zeile 70 hoch, Knopf „plain“ 44. **Abweichung:** Unter etwa 290 Breite
  (Desktop, iPad) bekommt der Knopf eine eigene Zeile über die ganze Karte; Klassisch quetscht dort den Namen auf einen
  Buchstaben (Nebenbefund 18).
- **Sensoren:** Wert 20/25 600, ein Wort (Kachel ohne Füllbalken) 17/22 auf derselben Linie, zu Langes endet mit „…“;
  der Füllbalken bleibt. **Abweichung:** Das Raster ist mindestens 150 statt 130 breit, damit „Geschlossen“ passt (am
  Handy 2 statt 3 Spalten, Nebenbefund 19).
- **Szenen** wie auf der Übersicht (gemeinsame Regeln in `home-cards.css`, Ton aus `glasSceneTone` in `Room.tsx`), am
  Handy in zwei Spalten. Der Raum kann ohne `ScenesCard.css` geladen werden (eigener Chunk); die Glas-Kachel bringt ihre
  Grundregeln deshalb selbst mit (Klassisch: Nebenbefund 17). Kein „Aktiv“ im Raum (K88).
- **Medien:** Cover-Fläche im Ton Blau, während es spielt; Play und Lautstärke wie §7.2. **Kamera:** Platzhalter in
  `fill`.
- **Bearbeiten:** kein gestrichelter Umriss; Griff als Kreis 32 `fill` (Treffer 44), Breiten-Punkte 14 × 6, Ziehgriff
  28 × 44 wie ein Knopf, Abzeichen 30 in `fillSolid` mit Schatten (ausgeblendet invertiert, Stern gelb). Halb/Voll und
  Ziehen wie Klassisch. Eine Szenen-Kachel behält im Bearbeiten-Modus ihre Breite, am Handy endet ihr Name vor den
  Abzeichen.
- **Leer und nicht gefunden (§7.31):** Titel 17/22 600 `label` (Text wie Klassisch klein aus den Locales), der Weg
  zurück als Link in `accentInk` ohne Unterstrich, Treffer 44.
- Erzwungene Farben: Kreise im An-Zustand mit `Highlight`-Umriss, Lamellen `CanvasText`, Knöpfe, Kapsel, Griffe und
  Abzeichen mit Rand.
- Prüfungen: `pagesControls` (Raum) prüft die Kapsel; neu `pagesKeep` (Raum: Sektionen in Klassischs Reihenfolge,
  Halb/Voll schreibt dasselbe `roomSectionSpans` wie Klassisch, Helligkeit, Farbtemperatur und Farbton senden je einmal
  beim Loslassen, Kachel per Klick und Leertaste, Lautstärke, Szene, Füllbalken und Binär-Wortlaut, „nicht verfügbar“
  gedimmt, Rollladen auf/Stopp/zu mit Mini-Rollo, Tor fragt beim Öffnen, Schloss mit Code bis zur Eingabe, Kamera,
  Knopf, Sauger) und `pagesEmpty` (Raum nicht gefunden, Raum ohne Geräte). Der Selektor-Wächter kennt `cards.css` und
  das Ventilator-Symbol als Marker.

### 7.9 Sicherheit (H1–H13, K93, K94, K96)

- Neue Datei `security.css`: Alarm-Karte, „Alle …“-Knöpfe und Kamera-Kacheln. Kopf und Modi der Alarm-Karte sowie die
  Zeilen der Schlösser und Tore teilen sich die Regeln mit den Fenstern (`sheet-content.css`, `:is(.modal-body,
  .security-page)`), die Listen stehen in `lists.css`.
- **Alarm-Karte:** Kopf wie im Alarm-Fenster (Kreis 56, Name 13 `label2`, Zustand 22/28 700), Modi in zwei Spalten
  52 hoch, Radius 18, auf der Karte in `fill`, der gewählte `accentSoft` mit Ring 2 px. **Abweichung:** Ausgelöst trägt
  die Karte einen roten Ring 2 px (Klassisch will das und zeigt es nicht, Nebenbefund 6). Der Ring ist eine Kontur
  innen an der Kante, kein Schatten: eine Schattenliste mit `var(--shadow-card)` ist im Dunkeln ungültig (dort `none`).
- **„Alle verriegeln/entriegeln“, „Alle schließen/öffnen“:** „plain“ 44 in `fill`, 15/20 600; die Trennlinie darunter
  entfällt (die Zeilen haben ihre eigenen ab dem Text). Die Bestätigung aus Etappe 3 bleibt. Die Schloss-Zeile hat wie
  im Fenster einen Knopf.
- **Listen (K94):** Personen (Avatar 40, zu Hause im Akzent-Soft-Ton mit Punkt 12, Zone `greenInk` 600), Türen, Fenster
  und Bewegung (Zeilen 62, Kreis 36; offene Tür rot, offenes Fenster und Bewegung gelb wie in Klassisch; Zustand als
  Pille 26: offen und Bewegung im Soft-Ton mit Punkt, zu und frei in `fill` mit grünem Punkt). **Abweichung:** Die
  Pillen beginnen groß („Geschlossen“; Klassisch klein aus den Locales).
- **Kamera-Kacheln:** Radius 18, ohne Rahmenlinie, Name 15/20 600, Raum 13 `label2`, Platzhalter in `fill`; „Bewegung“
  als Kapsel `actDel` mit Weiß, Satzanfang groß (Klassisch: Weiß auf `--danger`, 2,6–4,2:1, Nebenbefund 20).
- **Bearbeiten (K96):** dieselbe Leiste wie auf der Übersicht (S/M/L, ‹ ›, Auge, Handy, „⋯“) über `useGlasSectionEdit`
  in `Security.tsx`; Namen aus den Kartentiteln (Hero „Übersicht“, NVR `glas.edit.card.nvr`). `edit.css` gilt für
  `:is(.home-page, .security-page)`. Karten ohne Titel (Hero, Alarm, Kameras, NVR) tragen die Leiste über der Fläche;
  ab 900 px auf der Linie der Nachbar-Leisten, wenn sie eine Zeile mit einer Titel-Karte teilen. **Rahmen:** Die
  Vier-Spalten-Regel und die bündigen Flächen (§7.7) kennen die Hüllen des Bearbeitens (sonst sprang das Raster beim
  Einstieg von 3 auf 4 Spalten).
- **Leerzustand der Seite (§7.31):** wie im Fenster (Kreis 56 `fill`, Symbol 28 `label2`, Titel 17/22 600, Text 15/20
  `label2`); dieselbe Regel gilt für Geräte, Pool und Musik (`.page > .empty-state`).
- Kontrastpaare: `warnInk` auf der Karte und auf `warnSoft` über der Karte (Bewegung, offenes Fenster, Warnungen).
- Prüfungen: `pagesEdit` (Name, S/L, „⋯“ mit Spalten und Höhe, Fokus zurück, ‹ › mit Enter, Auge und Handy, Wechsel nach
  Klassisch mit gleichem Raster; die Leiste deckt bei Desktop/iPad/Handy nichts zu, auch mit Höhe und L), `pagesKeep`
  (Hero je Alarmzustand, Ring, Ziffernfeld bis zum Code und Esc ohne Folgen, ohne Code ein Tipp, „Alle entriegeln“ mit
  Anzahl, Esc und Bestätigung, „Alle verriegeln“ ohne Frage, Garage „Alle öffnen“ fragt und „Alle schließen“ schließt,
  Badge, Personen und Sensor-Listen) und `pagesEmpty` (Seite ohne Sicherheits-Entitäten). Die Bewegungs-Salve der Demo
  schreibt nach 3 s ihren alten Stand zurück; die Prüfung nimmt den Flur-Sensor vorher heraus.

### 7.10 Pool (K1–K10, K92, K93, K94, K99)

- Neue Datei `pool.css`. **Hero:** Kreis 56 in `fill`, läuft die Pumpe, Teal mit Glyphe `glyphDark`; Name 13/18
  `label2`, Zustand 22/28 700, „Läuft“ in `tealInk`; die Laufzeit als Kapsel 32 in `fill`.
- **Modus (K92):** `PoolModeSegment` auf der Seite und im Pool-Fenster, über eine Weiche in `PumpHeroCard` und
  `PoolModal`; die Optionen des `input_select` als Text, manuelle Aktivierung, „Manuell“ öffnet die Dauerwahl bei jedem
  Tipp. **Abweichung:** Die klassischen Knöpfe zeigen ein Symbol neben dem Text, das Segment nur Text (ein Segment
  mischt nie, §7.27). Mehr als fünf Optionen behalten die klassischen Knöpfe, in Glas als Kapsel-Reihe 44.
  `Segment` lernt dafür die **Etikett-Anpassung:** Passt ein Etikett nicht, wird das ganze Segment eng (`data-tight`:
  13 px, Innenabstand 2), gemessen bei jeder Größenänderung und nach dem Laden der Schrift; am Handy steht
  „Ausgeschalten“ so ganz da (360–430: eng, Desktop: normal; bei 320 endet es noch mit „…“).
- **Ringe (K99):** Spur `fill2`, Solar Gelb bzw. über der Schwelle Grün, Manuell Teal, die Zahl in der Ink des Rings.
  Gesteuert über lokale Tokens an den Ring-Teilen (`--accent`, `--positive`, `--info`), `PoolGauge` bleibt unverändert.
  `accent.css` führt Ringe, Balken, Zeitleiste und Ein/Aus nicht mehr.
- **Solar:** Pille 28 (über der Schwelle `greenSoft`/`greenInk`, sonst `fill`/`label2`), Stepper rund 44 (§7.2).
  **Manuell:** Stoppen „plain“ 44, Starten prominent 48, die Siri-Zeile mit Trennlinie 0,5 und Stepper.
  **Zeitplan:** Titel mit Schalter in der Fläche (§7.7), Wochentage als Kapseln 28 (gewählt `accentSoft`/`accentInk`),
  Fenster als `tealSoft`-Kapsel mit `tealInk`, Bearbeiten „plain“ 44.
- **Kennzahlen (K94):** Liste über die Fläche, Zeilen 52, Trennlinie ab dem Text, Wert `label2`, Chevron `label3`; eine
  Zeile öffnet das Detail (ab 1100 der Inspector). **Diagramm:** Balken Teal mit `tealInk`-Kante (im Hellen nötig wie
  beim Solar-Gelb), die übrigen Tage mit Deckkraft .35 wie bei der Info-Blase der Energie, der gezeigte Tag voll.
  **Admin:** Schalter-Zeilen 52, Neustart `actDel` mit Weiß; er fragt weiter (Etappe 3).
- **Zeitplan-Editor (K99):** Wochentage 44 hoch über die Breite, am Handy Kreise (gewählt `accentSoft`, Ring 2 px,
  `accentInk`), Zeitleiste mit Ein-Abschnitten in Teal (Uhrzeit `glyphDark`), Fugen in `group`, Griffe weiß 8 × 30 mit
  dem Schalter-Schatten (beim Ziehen 1,12, die Zeit darüber als Kapsel `label` mit `group`). Schaltpunkte: Feld (§7.3)
  und das feste 00:00 gleich breit. **Abweichung:** 144 statt wachsend wie Klassisch, damit die Ein/Aus-Kapseln
  untereinander stehen; 144 fasst eine 12-Stunden-Zeit mit Uhr-Symbol („12:00 PM“, Chrome braucht 141). Ein/Aus als
  Kapsel mit Linse, Löschen rund 44 mit `redInk`, „Zeit hinzufügen“ „plain“ 44, Speichern prominent im Fuß des
  Fensters. 5-min-Schritte, Grenzpunkte und Inhalt wie Klassisch.
- Reduzierte Bewegung: der Griff wächst nicht, Balken und Griffe ohne Übergang. Erzwungene Farben: Ringe, Balken und
  Ein-Abschnitte in `Highlight`, Kapseln und Kreise mit Rand.
- Kontrastpaare: Linse des Segments mit `label`, `glyphDark` auf Teal (Uhrzeiten der Ein-Abschnitte), `group` auf
  `label` (Zeit am gezogenen Griff).
- **Demo-Aufrufe:** Die Demo wendet `input_select`, `input_number`, `scheduler` und `button` nicht an. `ha/demoCalls.ts`
  merkt sich deshalb im Demo-Modus jeden Dienstaufruf (die neuesten 100), `__hapulseDemo.calls()` und `clearCalls()`
  lesen bzw. leeren die Liste; dafür eine `[fork]`-Zeile in `service.ts`.
- Prüfungen: neu `pagesSegments` (Seite und Fenster, Desktop hell und Handy dunkel: „Automatik“ sendet denselben Aufruf
  wie der klassische Knopf, Pfeile bewegen nur den Fokus, die Leertaste wählt, „Manuell“ fragt bei anderem Modus und
  zweimal als Modus, sendet nichts, das Fenster schließt dabei, die Linse bleibt beim echten Modus; Handy-Seite eng ohne
  „…“, Desktop nicht eng; sechs Optionen = klassische Knöpfe), `pagesKeep` Pool (Farben von Zustand und Ringen, Stepper
  schreibt 450, Stoppen → „Automatik“, Griff 12:00 → 12:05 und Speichern = `scheduler.edit` mit Schaltpunkt 12:05 Ein,
  Kennzahl → Detail, Neustart fragt, Esc sendet nichts, Bestätigen drückt) und `pagesEmpty` Pool (ohne Modus und
  Pumpe); `pagesFields` prüft das Zeitfeld des Editors (Pfeil hoch stellt die Stunde). `pagesCardTitles` kennt jetzt
  Karten, deren Körper eine Liste über die ganze Fläche ist (Personen, Türen/Fenster/Bewegung, Kennzahlen, Admin): sie
  beginnt an der Oberkante der Fläche statt 16 darunter (die Prüfung war seit den Listen der Sicherheit zu streng).

### 7.11 Energie (N1–N9, K90, K92, K96)

- Neue Datei `energy.css`. **Zeitraum (K92):** `Segment` über eine `[fork]`-Weiche in `EnergyCards.tsx`
  (`g-seg--energy` wie auf der Übersicht: 44 Trefferfläche, 32 sichtbar, Linse 28, 13/18 600), `radiogroup`, die
  Pfeile wählen (eine Ansicht). Ab 900 px neben dem Titel (240–300 breit), darunter in eigener Zeile über die ganze
  Breite. **Laden:** Lädt ein anderer Zeitraum, bleiben in Glas die Karten stehen und werden blass (.5, der Kopf des
  Heroes bleibt; `data-g-stale` in `Energy.tsx`) statt der Ladezeile; so behält das Segment den Fokus und die Pfeile
  gehen weiter. Klassisch tauscht die Seite wie bisher gegen die Ladezeile.
- **Hero (K90):** schlicht `card` ohne Hover-Ton; Zeile über der Zahl 15/20 `label2` mit Symbol 18, Zahl 34/41 600,
  „kWh“ 17/22 600 `label2`. Kacheln in `fill` ohne Rand, Radius 12, Kreis 32 im Soft-Ton mit der Ink (Solar Gelb wie
  sein Diagramm-Teil, die übrigen in den klassischen Tönen; Batterie neutral = Karte mit `label2`), Name 12/16
  `label2` (bricht um), Wert 17/22 600, Einheit 13/18 600 `label2`.
- **Quellen:** Netz grau, Solar gelb mit Kante wie die Energie-Karte der Übersicht (§2.4), 1,5 dazwischen, nur oben
  rund, auf einer festen Grundlinie; Breite nach Zahl der Balken (bis 12: 26, bis 24: 14, darüber 10), sie wachsen aus
  der Grundlinie (reduzierte Bewegung: 200 ms einblenden). Legende als Punkte 8, Summen 15/20 mit Haarlinie darüber.
  `accent.css` führt die Solar-Teile der Seite nicht mehr (sie waren orange).
- **Solar:** Zeilen 15/20, Messbalken 6 hoch auf `fill` in Solar-Gelb, Zeile darunter 13/18 `label2`. **Geräte:** Name
  15/20, Balken 6 hoch in Orange auf `fill`, Wert 13/18 600 `label2`; lange Namen enden wie in Klassisch mit „…“.
- **Wasser und Gas:** Titel über der Fläche (§7.7), mit einem Zähler der Wert als Zahl 22/28 600 in der Fläche (der
  Kopf der Karte fällt dafür weg: `display: contents`), mit mehreren die Liste und der Wert im Kopf wie bei Geräten.
- **Bearbeiten (K96):** die Leiste aus Etappe 4 über `useGlasSectionEdit` (`energy:<id>`); Namen aus den Titeln der
  Karten, der Hero heißt „Übersicht“. Am Hero steht die Leiste über der Karte, an den übrigen zwischen Titel und Fläche.
- **Nicht eingerichtet (§7.31):** Kreis 56 `fill` mit `label2`, Titel 17/22 600, Text 15/20 `label2`, der Weg zu Home
  Assistant prominent 48.
- **Demo-Schalter** (`ha/demoEnergy.ts`, je eine `[fork]`-Zeile in `energy.ts`): `energyConfigured(false)` (nicht
  eingerichtet), `energyHold(true)` (ein Zeitraum lädt, bis `energyHold(false)`), `setUrl(url)` (die Demo hat keine
  HA-Adresse, der Einrichtungs-Knopf braucht eine).
- Kontrastpaare: die Symbole der Kacheln in ihrer Ink auf dem Soft-Ton über `fill` über der Karte (3:1).
- Prüfungen (Datum fest wie bei `shoot`, die Demo-Zahlen hängen an der Stunde): `pagesSegments` Energie (Zahl wie im
  klassischen Reiter für alle vier Zeiträume, Tippen, Pfeil, Ende, Anfang; beim gehaltenen Laden blass, Fokus bleibt,
  keine Ladezeile), `pagesKeep` Energie (alle Texte, Balkenhöhen und Messwerte wie Klassisch, Farben, Balkenbreite 14
  bei 13 Balken, nichts abgeschnitten oder breiter als das Fenster, kein Hover-Ton, Ladezeile 15/20), `pagesEdit`
  Energie, `pagesEmpty` Energie (Aussehen, Link `…/config/energy` in neuem Tab, 48 hoch), `pagesCardTitles` mit Wasser
  über der Fläche. Neu in `shoot`: die Szenen `security-edit` und `energy-edit` (Seite im Bearbeiten-Modus, auch für
  den Klassisch-Vergleich).

### 7.12 Musik (M1–M11, K90, K92–K94, K96)

- Neue Dateien `music.css` und `components/glas/keepInCard.ts`. **Abstände** wie die übrigen Seiten (20, ab 900 px
  Zeilen 26); die Bibliothek liegt in der Spalte der Seite (Abstand 24), ihr Rand gleicht aus (−4, ab 900 px +2).
- **Now Playing (K90):** schlichte Karte ohne Tönung, das unscharfe Albumbild hinter einem laufenden Titel bleibt
  (§3.6). Bild Radius 16, Platzhalter `fill` mit der Note in `label2`, blau, solange es spielt. Playername 13/18
  `label2` ohne Versalien, Titel 22/28 700, Künstler 15/20 `label2`. Transport rund 44 ohne Fläche, Play 56
  (controls.css), Shuffle/Repeat an = `accentSoft` mit `accentInk`. Lautstärke: Stumm 44, die Linie zwischen zwei
  Symbolen. Quelle und die Player-Wahl von Warteschlange und Bibliothek: Kapsel 36 in `fill` in einer Trefferfläche 44,
  15/20 `label`.
- **Regler (K93):** die dünnen Linien behalten ihre Stärke (Now Playing 6, Zonen-Zeilen 5, Zonen-Kacheln 4) und
  bekommen eine Trefferfläche 28 (§5.3); Farben und das Wachsen unter dem Finger aus controls.css.
- **Zonen (K92):** Raster | Liste als Segment mit zwei Symbolen (`g-seg--view`, 88 × 44, `radiogroup`, die Pfeile
  wählen, eine Ansicht; `[fork]`-Weiche in `ZonesCard.tsx`). Kacheln in `fill` ohne Rand, Radius 18; Zeilen 64 als
  eingerückte Liste. **Abweichungen:** (1) eine Zone, die nicht spielt, wird nicht blass (.45 fiele unter das
  Kontrastminimum), sie sagt es in `label2`; die spielende zeigt ihr Symbol blau und die Lautstärke. (2) Das kleine
  Raumsymbol neben dem Namen fällt weg, das Bild zeigt den Raum. (3) Die Spalten des Rasters dürfen schrumpfen
  (`minmax(0, 1fr)`; Klassisch: Nebenbefund 21). (4) Das Abzeichen mit der Zahl spielender Player liegt auf der
  Kartenfarbe: `blueInk` auf `blueSoft` über `fill` bliebe hell unter 4,5:1.
- **Andere Player (K94):** eingerückte Liste über die Breite der Fläche (scrollt in ihrer Spalte), Zeilen 60, Bild 40
  Radius 10, Name 17/22 600, Zustand 13/18 `label2`. Der gewählte (er füllt Now Playing) `accentSoft`, sein Zustand in
  `label` (`label2` auf `accentSoft` fällt dunkel für manche Akzente unter 4,5:1). Spielend: Punkt am Bild und
  Play-Knopf blau. Play/Pause 32 in einer Trefferfläche 44.
- **Warteschlange (K94):** der Kopf bricht um, bevor der Titel abgeschnitten wird (am Handy bekommt die Player-Wahl
  eine eigene Zeile). Volle Liste von Rand zu Rand (scrollt wie in Klassisch), Zeilen 60: Griff 44 `label3`, Bild 40,
  Titel 17/22 mit Künstler 13/18 `label2`, Länge 15/20 `label2`, Entfernen 44 (`label3`, unter dem Zeiger `redInk`);
  der laufende Titel `blueInk` 600, die gezogene Zeile hebt sich als Karte. Ohne volle Liste „Läuft gerade“ und „Als
  Nächstes“ als Zeilen (die Demo zeigt immer die volle Liste: geprüft an Bildern mit eingesetzten Zeilen). Darunter
  Anzahl und Knöpfe mit Haarlinie: Shuffle, Repeat und Übertragen als Kreise 36 in `fill` (an = `accentSoft`), der
  Lautsprecher-Knopf eine Kapsel 36 (gruppiert blau).
- **Popover** (Übertragen, Zusammen abspielen, Menü eines Bibliothekselements): deckend `group`, Radius 22, Innenrand
  6, Schatten „lifted“, Titel 13/18 600 `label2` ohne Versalien, Einträge 44 (Radius 14, 17/22 `label`), so breit wie
  ihre Einträge (höchstens 280). Gruppierte Lautsprecher tragen einen Haken in `accentInk` ohne Kästchen. Kein neues
  `backdrop-filter` auf den Seiten (§5). **Abweichungen:** (1) das Gruppenmenü öffnet an den Aktionen des Kopfs (an
  ihrem rechten Rand), nicht am 44-px-Knopf. (2) Ein Popover, das die Karte verlassen würde (oder näher als 8 an ihren
  Rand käme), öffnet von der anderen Seite: `keepInCard` misst als Ref-Callback einmal beim Einhängen (vor dem ersten
  Bild) und setzt `data-g-flip`; je eine `[fork]`-Zeile nur für Glas in `LibraryCard.tsx` (Elementmenü) und
  `SpeakerGroupMenu.tsx`. In Klassisch ragt das Gruppenmenü am Handy links aus dem Bild (Nebenbefund 25).
- **Music Assistant verbinden:** Haarlinie, die Aufforderung als Link in `accentInk` mindestens 44 hoch (am Handy bricht
  sie um, das Symbol bleibt in der ersten Zeile), die Felder wie lists.css, Speichern prominent 48.
- **Bibliothek:** Medienarten als Auswahl-Pillen (controls.css) in einer Zeile, die scrollt; sie behalten ihre Breite
  (Klassisch: Nebenbefund 24), die Zeile läuft bis zum Kartenrand und lässt Platz für den Fokusring. Favoriten ein
  Kreis 36 (an: `yellowSoft` mit gefülltem Stern in `yellowInk`), die Suche füllt den Rest der Zeile bis 320, Blättern
  Kreise 36. Kacheln: Bild Radius 12 (Künstler rund) auf `fill`, Name 15/20, darunter 13/18 `label2`. Über dem Bild
  Play als weißer Kreis 36 mit dunklem Symbol und dem Schatten des Knopfs, Mehr ein Kreis 32 in `fillSolid`, der Stern
  eines Favoriten 22 in `fillSolid` mit `yellowInk`; sie erscheinen wie in Klassisch (unter dem Zeiger, bei Touch immer).
  Das Bild schneidet nicht mehr ab: das Menü zeigt sich ganz (Klassisch: Nebenbefund 23).
- **Spielen ist blau** wie im Medienfenster (sheet-content.css), der Akzent markiert nur eine Wahl (§2.3); `accent.css`
  führt Play der Bibliothek und den Gruppen-Haken nicht mehr.
- **Bearbeiten (K96):** nur Auge und Handy wie in Klassisch an der Ecke der Karte (cards.css, gemeinsam mit dem Raum):
  Kreise 30 (Trefferfläche 44) auf `fillSolid` mit dem Schatten des Knopfs, ausgeblendet invertiert. Der Kopf einer
  Karte hält im Bearbeiten rechts 14 frei, damit Anzahl, Segment und Player-Wahl frei bleiben. **Abweichung:** eine
  ausgeblendete (oder nicht verfügbare) Karte wird nur in ihrem Inhalt blass (.4, nicht verfügbar .5 und entsättigt),
  nicht ihre Knöpfe; das invertierte Auge muss lesbar bleiben. Gilt auch im Raum.
- **Erzwungene Farben:** Kanten an den Knöpfen; die Player-Wahl verliert ihre transparenten Trefferränder wie die
  Felder; Gewähltes und Eingeschaltetes in der Systemhervorhebung.
- Kontrastpaare: Abzeichen der Zonenkachel auf der Karte, gewählter Player (Name und Zustand), über dem Bild Mehr und
  Stern auf `fillSolid` und Play auf dem Knopf (3:1).
- Prüfungen: `pagesSegments` Musik (Rolle, Namen, 88 × 44, Raster vorgewählt, Tippen auf Liste, Pfeil, Anfang, Ende,
  Pfeil am Ende springt um; dieselben Räume wie in Klassisch in beiden Ansichten), `pagesKeep` Musik (dieselben Schritte
  in Klassisch und Glas senden dieselben Aufrufe und ändern die Seite gleich: Transport, Stumm, Quelle, Seek und
  Lautstärke per Tasten, anderer Player Play/Pause und Wählen, Zone stumm und Lautstärke, Shuffle, Repeat,
  Gruppieren, Titel entfernen und ziehen, Übertragen, Medienarten, Favoriten, Suche, Elementmenü mit Esc wie in
  Klassisch, „Warteschlange ersetzen“, Abspielen; in Glas zusätzlich gezogen: Seek mit einem Aufruf beim Loslassen,
  Lautstärke und Zonen-Lautstärke mit Aufrufen beim Ziehen), `pagesEdit` Musik (die Knöpfe verdecken auf Desktop,
  iPad und Handy nichts; Auge und Handy schreiben `hiddenMusicSections` und `mobileHiddenMusicSections`, Inhalt blass,
  Auge invertiert, nach dem Wechsel zu Klassisch dieselben Karten ausgeblendet), `pagesEmpty` Musik (ohne Player).
  Neu in `shoot`: die Szene `music-edit`.

### 7.13 Geräte (O1–O7, K90–K94)

- Neue Datei `devices.css`; die `[fork]`-Weiche für das Segment in `DevicesToolbar.tsx`.
- **Laden (O1):** die Linie 6 auf `fill` in der prominenten Farbe (accent.css), Text 15/20, Prozent und Hinweis 13/18
  `label2`.
- **Hero (O2, K90):** schlichte Karte (pages.css), Titel 20/25 600, Zählung 15/20 `label2`. Der Zustand als Chip 32 in
  `fill`, sein Symbol ein voller Kreis in der Zustandsfarbe mit dunklem Glyph wie die Status-Pille der Seitenleiste.
  Kennzahlen als Kacheln in `fill` ohne Rand, Radius 12, wie im Energie-Hero: das Symbol im Kreis 32 auf der
  Kartenfarbe in `label2` (eine Zahl hat keinen Zustand), Wert 22/28 600, Bezeichnung 12/16 `label2`.
- **Werkzeugleiste (O3, K92, K94):** die Suche aus lists.css; Raum und Integration als Kapsel 36 in `fill` in einer
  Trefferfläche 44 wie die Player-Wahl der Musik (lists.css, dieselbe Regel für die Wahlen der Automationen); Raster |
  Liste das Segment mit zwei Symbolen (`g-seg--view`, 88 × 44, `radiogroup`, die Pfeile wählen). Am Handy brechen Wahlen
  und Segment um wie in Klassisch.
- **Kacheln (O4):** deckend `card` ohne Rand, Radius 22; das Symbol im Kreis 36 (`fill`, `label2`; etwas an: Gelb mit
  dunklem Glyph wie ein eingeschaltetes Gerät, §7.10), Name 15/20 600 und Raum 13/18 `label2` wie die Kacheln im Raum,
  unter einer Haarlinie die Anzahl 13/18 `label2` und der Chevron `label3`. Ein Tipp gibt nach, ab 900 px hebt sich
  die Kachel unter dem Zeiger wie im Raum. **Abweichung:** der Punkt neben der Anzahl entfällt, der Kreis sagt es
  (`accent.css` führt ihn nicht mehr). Ein ausgeblendetes Gerät (beim Bearbeiten) bleibt blass wie in Klassisch (.5).
- **Liste (O4, K94):** eine Fläche, Radius 22; Zeilen 60 mit dem Kreis 36, Name 17/22, Raum 13/18 `label2`, rechts die
  Zahl 15/20 `label2` und der Chevron `label3`; Trennlinien ab dem Textanfang, nach der letzten keine.
- **Gerätefenster (O5–O7):** Chips 28 in `fill`, 13/18 `label2`; „Alle Entitäten ausblenden“ plain 44; Gruppentitel
  15/20 600 `label2` ohne Versalien, die Anzahl rechts; die Entitäten als Gruppe (`group`, Radius 22), Zeilen ab 52,
  das Symbol im Kreis 32, Name 17/22, Trennlinien ab dem Text. Was neben dem Namen keinen Platz hat (am Handy mit Stern
  und Auge), steht rechtsbündig in einer zweiten Zeile; der Name wird dafür nicht unter 120 gekürzt. Schalter aus
  controls.css (K91). Stern an: `yellowSoft` mit `yellowInk`; das Auge einer ausgeblendeten Entität invertiert, ihr
  Inhalt blass (.4), Stern und Auge nicht. Werte 15/20 `label2` (die Großschreibung wie in Klassisch, Nebenbefund 27).
  Auswahl als Kapsel 36 und Aktionen (Drücken, Aktivieren, Ausführen) plain 36, beide in einer Trefferfläche 44; die
  Demo hat solche Zeilen nicht, geprüft an Bildern mit eingesetzten Zeilen.
- **Abweichung von K93:** Stepper, Transport, Stern und Auge im Fenster sind Kreise 36 in `fill` in einer Trefferfläche
  44 (8 auseinander, die Flächen berühren sich), nicht 44 sichtbar: in Zeilen ab 52 stießen Kreise 44 an die
  Trennlinien. Ebenso die Knöpfe in den Zeilen der Musik (§7.12).
- **Erzwungene Farben:** Kanten an Kacheln, Liste, Kennzahlen, Wahlen und Knöpfen; Eingeschaltetes in der
  Systemhervorhebung.
- Kontrastpaare: der Stern an auf `yellowSoft` über `group`, das invertierte Auge, die Kreise des Hero-Chips (die Paare
  der Status-Pille).
- Prüfungen: `pagesSegments` Geräte (Rolle, Namen, 88 × 44, Raster vorgewählt, Tippen auf Liste, Pfeile; dieselben
  Geräte wie in Klassisch in beiden Ansichten), `pagesKeep` Geräte (dieselben Schritte in Klassisch und Glas senden
  dieselben Aufrufe und ändern Seite und Speicher gleich: Suche auch ohne Treffer, Raum, Integration, Raster und Liste,
  das Fenster mit Schalter, Stern, Auge, „alle ausblenden“ und Esc; Thermostat ±, TV-Transport, Rollo, Schloss mit
  Rückfrage beim Entriegeln, Garagentor mit Rückfrage beim Öffnen; in Glas zusätzlich die Maße: Kachel, Liste, Kapseln
  36 in 44, Knöpfe 36 mit Treffer 3 px neben dem Kreis, Zeilen ab 52, Gruppentitel), `pagesEmpty` Geräte (keine
  Geräte; eine Suche ohne Treffer).

### 7.14 Automationen (P1–P4, K90, K94, K96)

- Keine eigene Datei: Hero in `pages.css` (gemeinsam mit dem Szenen-Hero), Listen in `lists.css`, Bearbeiten in
  `edit.css`; die `[fork]`-Zeilen für die Leiste in `Automations.tsx` (K96).
- **Hero (P1, K90):** schlichte Karte, die Zahl 34/41 600, darunter 15/20 `label2`; rechts „Zuletzt ausgeführt“, der
  Name 15/20 600, die Zeit 13/18 `label2`. Die Kennzahlen bleiben eine Kapsel (die Form aus Klassisch), jetzt 44 in
  `fill` ohne Rand, die Teile durch eine Haarlinie getrennt: Symbol in seiner Ink (aktiv grün, Kategorien blau,
  deaktiviert `label2`; 3:1), Wert 17/22 600, Bezeichnung 13/18 `label2`. **Abweichung:** die Teile teilen sich die Breite
  nach Inhalt (Klassisch: gleiche Drittel), sonst wurden „deaktiviert“ und „Kategorien“ bei 390 px gekürzt.
- **Kategorien (P2, K94):** die Liste reicht bis an die Kanten der Fläche, Zeilen 60 mit 16 Innenabstand: Symbol im
  Kreis 32 (`fill`; eingeschaltet `label2`, aus `label3`), Name 17/22, die letzte Ausführung 13/18 `label2`, rechts der Schalter
  (controls.css). Trennlinien ab dem Text (60), nach der letzten keine. Eine deaktivierte Automation wird nicht blass
  (Klassisch .5, unter dem Kontrastminimum): ihr Name wird `label2`, der Schalter sagt es.
- **Letzte Aktivität (P3):** Zeilen 52, Name 17/22, daneben die Kategorie als schlichter Text 13/18 `label2`
  (**Abweichung:** in Klassisch eine Kapsel; in der Liste bleibt sie Nebensache und gibt bei Platzmangel zuerst nach),
  rechts die Zeit 15/20 `label2`. Im Kopf gibt am Handy beim Bearbeiten „8 heute ausgeführt“ vor dem Titel nach.
- **Höhen:** so viele ganze Zeilen wie in Klassisch: die Aktivität 5 (260, Klassisch 5 × 44 = 220), eine Kategorie 7
  (420, Klassisch 400). Eine L-Karte und eine gedeckelte Karte setzen ihre Höhe selbst.
- **Werkzeugleiste (P4):** Suche aus `lists.css`, Raum und Kategorie dieselben Wahlen wie in den Geräten (Kapsel 36 in
  44); ohne Treffer der Satz 15/20 `label2`.
- **Bearbeiten (K96):** die Leiste wie auf Sicherheit und Energie; der Hero bekommt sie darüber, ab 900 px in einer
  geteilten Zeile in seiner Spur. Die gefilterte Ansicht gibt es nur außerhalb des Bearbeitens.
- Kontrastpaare: die Symbole der Kennzahlen (`greenInk`, `blueInk`, `tealInk`) auf `fill` über der Karte, 3:1.
- Prüfungen: `pagesKeep` Automationen (dieselben Schritte in Klassisch und Glas: Hero, Aktivität, Kategorien, ein
  Schalter per Tipp und per Leertaste, Suche auch ohne Treffer, Raum, Kategorie; in Glas die Maße der Zeilen, Linien,
  Listenkanten, Kennzahlen und Wahlen), `pagesEdit` Automationen, `pagesEmpty` Automationen (Suche ohne Treffer, gar
  keine Automation), Szene `automations-edit` für den Klassisch-Vergleich.

### 7.15 Szenen (Q1–Q4, K88, K90, K94, K96)

- Keine eigene Datei: Hero in `pages.css` und Aktivität in `lists.css` (beide gemeinsam mit den Automationen), Kacheln
  in `home-cards.css` (die Regeln der Übersicht gelten jetzt auch für `.scenes-page`), Bearbeiten in `edit.css`;
  `[fork]`-Zeilen in `Scenes.tsx` (Leiste, K96) und `SceneRoomCard.tsx` (Ton statt Inline-Farbe, K88).
- **Hero (Q1, K90):** wie bei den Automationen; die Kennzahlen „heute genutzt“ (Symbol `tealInk`) und „Räume“
  (`blueInk`).
- **Letzte Aktivität (Q2, K94):** wie bei den Automationen, statt der Kategorie der Raum als schlichter Text; das Symbol
  `label2` im Kreis (eine Szene hat kein Aus).
- **Räume (Q3, K88):** Kacheln wie auf der Übersicht (Ton aus `glasSceneTone`, Kreis 36, ab 900 px 40 und 116 hoch),
  ohne „Aktiv“. Zwei Spalten, ab 900 px vier, sobald die Karte 480 breit ist (wie M und L der Übersicht).
  **Abweichung:** Am Handy stehen die Kacheln wie auf der Übersicht ohne Fläche auf dem Seitengrund, der Titel darüber.
  In einer Fläche verschwand ihr Grund im Dunkeln (`tileOff` gleich `card`) und die Namen wurden 32 px schmaler. Eine
  gedeckelte Karte behält ihre Fläche.
- **Bearbeiten (Q4, K96):** die Leiste wie auf den Automationen; die Namen: der Hero „Übersicht“, die Aktivität ihr
  Titel, ein Raum sein Name (ohne Raum „Allgemein“).
- Kopf der Aktivität (auch bei den Automationen): der Titel behält seine Breite, „8 heute genutzt“ nimmt den Rest und
  endet mit „…“. Mit Schrumpf-Gewichten verlor der Titel Bruchteile eines Pixels und zeigte schon „…“.
- Prüfungen: `pagesKeep` Szenen (dieselben Schritte in Klassisch und Glas: Hero, Aktivität, Räume mit ihren Kacheln, eine
  Kachel per Tipp, Enter und Leertaste, nirgends „Aktiv“; in Glas Look und Ton-Ink der Kacheln, Spalten, vier in einer
  Karte über zwei Spalten, am Handy ohne Fläche, die Aktivität wie bei den Automationen, die Kennzahlen), `pagesEdit`
  Szenen, `pagesEmpty` Szenen (gar keine Szene), `pagesCardTitles` (die Räume am Handy ohne Fläche), Szene
  `scenes-edit` für den Klassisch-Vergleich. Nebenbefund 28: „8 heute genutzt“ zählt die gezeigten Einträge.
- `homeKeep` (Übersicht, Ziehen per Tastatur am Handy) wartet nach dem Pfeil, bis die Karte über der nächsten liegt,
  statt fest 250 ms: der Pfeil rollt am Handy erst weich (Tastatur-Sensor von dnd-kit), und erst danach liegt die Karte
  dort. Seit dem Energie-Schritt ließ die Prüfung am Handy zu früh los (vermutlich rollt es etwas langsamer, nicht
  gemessen); das Ziehen selbst war nie kaputt (dieselben Schritte mit Wartezeit schieben die Karte).

### 7.16 System (R1–R5, K90, K94, K96)

- **Abweichung:** eine eigene Datei `system.css` (§2 sah für System keine vor) für Monitor, Batterien und die
  Abstände der Aktivität; der Hero in `pages.css`, Bearbeiten in `edit.css`, die Aktivität selbst in `home-lists.css`
  (deren Regeln gelten jetzt auch für `.system-page`); `[fork]`-Zeilen in `System.tsx` (Leiste, K96).
- **Hero (R1, K90):** Die Hinweise „N schwache Batterien“ und „N nicht verfügbar“ tragen ihr Symbol: wie im
  Sicherheits-Hero die Farbe am Symbol (`warnInk`, `redInk`), der Text 600 `label`. **Nachbesserung der Heroes aus
  §7.7:** (1) Ein Wert über seiner Schwelle (CPU über 75, RAM und Speicher über 80, alle über 90 kritisch) bekam die
  Farbe als Text; `redInk` auf `fill` über dem roten Verlauf erreicht nur 4,0–4,4:1. Jetzt steht ein Punkt 8 in
  `warnInk` bzw. `redInk` vor dem Namen, der Wert bleibt 600 `label`. (2) Der Verlauf beider Heroes ist der halbe
  Soft-Ton: über dem vollen gelben Ton fiel `label2` der Chips im Dunkeln auf 3,8:1. Neue Kontrastpaare dazu.
- **Aktivität (R2):** dieselbe Karte wie auf der Übersicht, auch die Abstände zwischen Kopf und Liste (der Kopf der
  Seiten-Karten hätte sonst gewonnen); die Prüfung vergleicht beide Karten Maß für Maß.
- **Monitor (R3):** Gruppentitel 15/20 600 `label2` ohne Symbol und Versalien, Kacheln in `fill` ohne Rand mit Radius
  12, Name 15/20 `label2`, Wert 15/20 600; Balken 6 hoch auf `fill`. Die Schwellen bleiben (über 75 gelb, über 90
  rot), die Balken in den vollen Farben grün, gelb, rot. Die Gruppen scrollen wie in Klassisch (400), aber bis an die
  Kanten der Fläche und an ihren runden Ecken beschnitten (432 mit den Einzügen). **Abweichung:** die Kacheln sind
  mindestens 220 breit (Klassisch 180; die Schrift ist größer) und füllen ihre Zeile (`auto-fit`): in Klassisch blieb
  auf dem iPad die rechte Hälfte leer, während die Namen gekürzt wurden (Nebenbefund 29). Eine einzelne Kachel nimmt
  die ganze Zeile.
- **Batterien (R4, K94):** eingerückte Liste über die ganze Fläche, Zeilen 52, Symbol im Kreis 32 (`fill`; grün, ab
  25 % orange, ab 10 % rot), Name 17/22, Balken 6, Prozent 15/20 `label2` (schwach `orangeInk`, kritisch `redInk`,
  beide 600); Trennlinien ab 60, nach der letzten keine. Die Bänder bleiben (bis 10, 25, 50 %), jedes in seiner Farbe:
  rot, orange, gelb, grün; das Band bis 50 % ist in Klassisch der Akzent und wird gelb (der Akzent ist in Glas keine
  Zustandsfarbe, GLAS-DESIGN §2.3). Die Liste scrollt wie in Klassisch, 432 hoch wie der Monitor daneben. Die Zahl der
  schwachen neben dem Titel als Kapsel 26 im weichen Orange.
- **Bearbeiten (R5, K96):** die Leiste wie auf den Szenen; die Namen: der Hero „Übersicht“, sonst die Titel. Gedeckelte
  Batterien (ohne eigenen Scroll-Körper) behalten den Titel in der Fläche, die Leiste steht dort oben rechts; Monitor
  und Aktivität scrollen in ihrem Körper, ihr Titel bleibt darüber.
- Kontrastpaare: Symbole der Batterien (`orangeInk`, `redInk`) auf `fill` über der Karte (3:1); in den Hero-Chips
  `label2` auf `fill` über dem halben Verlauf (grün, gelb, rot; 4,5:1) und Punkt bzw. Symbol in `warnInk`/`redInk`
  darauf (3:1). Prozente und die Kapsel der schwachen sind allgemeine Paare.
- Prüfungen: `pagesKeep` System (derselbe Inhalt in Klassisch und Glas bei denselben Werten: Hero mit Hinweisen,
  Monitor mit Werten und Bändern, Batterien mit Bändern und Zahl der schwachen; in Glas die Maße und Farben von
  Punkten, Symbolen, Gruppen, Kacheln, Balken, Zeilen, Linien, Listenkanten und der Kapsel; die Aktivität wie auf der
  Übersicht), `pagesEdit` System, Szene `system-edit` für den Klassisch-Vergleich.

### 7.17 Einstellungen (S1–S16, K91, K92, K94, K98)

- Dateien wie geplant: `settings.css`, die Segment-Größe `g-seg--settings` in `controls.css`; `[fork]`-Zeilen in
  `Settings.tsx` (Hell/Dunkel als Segment, die Inline-Maße von „zurücksetzen“ und der Import-Meldung nur in
  Klassisch), Fork-Dateien `StyleSettings.tsx` und `DeviceModeRow.tsx` (Segmente). `Segment` lernt Daten-Attribute je
  Option: die Stil-Optionen tragen den Haken der klassischen Knöpfe (`data-glas-style-option`), den Proben und ältere
  Prüfungen zum Umschalten nutzen.
- **Liste (K94, K98):** Jede Karte ist eine eingerückte Liste ohne Innenabstand: Zeilen ab 52 (zweizeilige höher),
  Name 17/22, Wert 17/22 `label2` rechts, Trennlinie 0,5 ab dem Text (56) bzw. ab der Kante (16: Knopfzeile, Räume, der
  Demo-Hinweis), keine über der ersten Zeile einer Liste; die Regel hängt an der Liste, nicht am `managed-fieldset`.
  Die Symbol-Chips werden eine Spalte 28 ohne Tönung mit dem Symbol 22 in `label2`; die Tokens setzt Glas lokal am Chip
  (N3, kein `!important`). Erklärungen und Hinweise 13/18 bzw. 15/20 `label2` unter dem Namen, ab 481 px eingerückt
  (40), am Handy ab der Kante.
- **Verbindung (S1):** Profil als erste Zeile (Avatar 56 in `accent-soft`, Name 20/25 600, Abzeichen und Rolle als
  schlichter Text mit „·“), Status, Adresse, Token und Zahlen als Zeilen mit Wert, der Demo-Hinweis als Zeile 13/18. Die
  Knöpfe sind Kapseln 44 in `fill`; „Abmelden“/„Trennen“ (OAuth, Token) in `actDel` mit weißer Schrift.
- **Darstellung (S2–S8, K92):** App-Name als Feld nach K94, unter dem Namen eingerückt; Symbole 44 mit Radius 12, das
  gewählte in `accent-soft` mit Ring 2. Stil, Glas-Stärke, Hell/Dunkel und Hell/Dunkel dieses Geräts sind Segmente 44
  mit manueller Aktivierung neben dem Namen, am Handy eine eigene Zeile über die ganze Breite. Die Optionen sind
  mindestens 72 breit und gleich breit; ein unsichtbarer Rand von 2 je Seite hält die Messung von `data-tight` ehrlich
  (sie zieht nur das Padding ab, eine Inhaltsbreite wäre sonst immer „eng“). Sprache als Wert mit Chevron `label3` (das
  native `select` bleibt), statt der Farbwelten der Hinweis aus Etappe 1, Akzent: Name mit Vorschau-Punkt,
  „zurücksetzen“ als Textknopf in `accentInk` (die Zeile verschiebt den Regler nicht, wenn er erscheint), der Regler
  darunter über die Zeile.
- **Admin (S10–S12):** Bearbeiten als Schalter (K91), „Entitäten bearbeiten ›“ als Navigationszeile (die ganze Zeile
  ist die Trefferfläche, Text `label2`, Chevron `label3`), die Verwaltung mit Erklärung, Kapsel-Knopf und dem Schalter
  „Zugänge teilen“. Das Fenster der Entitäten: Räume als eingerückte Listen (Radius 22, `group`), Kopfzeilen 52 mit
  Anzahl und Chevron, Entitäten 52 mit Kreis 32, Name 17/22, ID 13/18 `label2`, runde Knöpfe 36 mit Trefferfläche 44;
  der Stern im weichen Gelb, das Auge einer ausgeblendeten Entität invertiert; Umbenennen als Feld nach K94.
- **Räume (S13):** Zeilen 52, Name 17/22 (ausgeblendet `label2` durchgestrichen), Anzahl 15/20 `label2`, runde Knöpfe
  36 in `fill` mit Trefferfläche 44, das Auge eines ausgeblendeten Raums invertiert.
- **Sicherung (S14):** Erklärung 15/20 `label2`, zwei Kapsel-Knöpfe, Meldungen 15/20 in `redInk` bzw. `greenInk`.
- **Über (S15, K98):** der Kopf als Zeile (Symbol `label2` in der Spalte 28, Name 17/22 600), darunter Version und
  Leitsatz 15/20 `label2` ab dem Text; „Neuerungen ›“ und der Projekt-Link als Zeilen 52 (Symbol `label2`, Chevron bzw.
  Außen-Zeichen `label3`). **Abweichung:** Die Versionszeile bleibt eine zweite Zeile unter dem Namen statt einer
  eigenen Zeile „Version | 1.3.2 · F…“: Sie ist ein Text, Teilen hieße neues Markup, und Klassisch zeigt denselben.
- **Abweichungen:** (1) Texte der Locales in Kleinschrift (Abzeichen, Status, Demo-Hinweis, Version, Erklärungen,
  „zurücksetzen“) bekommen in Glas nur den ersten Buchstaben groß (`::first-letter`); im Satz bleibt „Demo-zuhause“,
  „räume“, „home assistant“. Die Texte selbst ändern sich nicht (Klassisch zeigt sie so). **Ersetzt** durch
  [PLAN-TEXTE](PLAN-TEXTE.md): die Texte sind selbst richtig geschrieben, die Regeln sind weg. (2) Der Fokus wechselt beim
  Stilwechsel in beide Richtungen auf die Wahl des neuen Stils (K92 nannte nur Glas → Klassisch); ist ein Fenster
  offen, bleibt er dort. (3) Ein gesperrter Schalter („Zugänge teilen“ ohne echte Verbindung) steht in Glas auf 0,4,
  Klassisch zeigt ihn unverändert. (4) Der Knopf „Meine Einstellungen für alle übernehmen“ darf am Handy zweizeilig sein.
- In der Demo nicht erreichbar, in einem Wegwerf-Build mit erzwungener Bedingung angesehen: gesperrte Zeilen eines
  Nicht-Admins unter der Verwaltung (S9), der Dialog „für alle übernehmen“ (S12, ohne echte Verbindung in beiden Stilen
  aus), „Trennen“/„Abmelden“ in Rot und der Sync-Status „verbunden“ (S16). Für das Labor mit echtem HA vorgemerkt.
- Nebenbei gesehen (nicht von diesem Schritt): In den Prüfbildern stehen Bindestriche in Fenstern breit („Home -
  Assistant“). Die Ersatzschrift des Labors (Inter) zählt den Bindestrich zu den tabellarischen Ziffern, die Glas seit
  Etappe 1 am Root setzt (gemessen bei 17 px: 11,0 statt 7,8 px breit). Ob SF das am iPad auch tut, prüft das Labor.
- Prüfungen: `pagesSegments` Einstellungen (vier Segmente: Optionen, Wahl, 44 hoch, nicht eng, Lage neben dem Namen bzw.
  am Handy über die Breite; Pfeile bewegen nur den Fokus, Leertaste, Enter und Tippen schreiben, was der klassische
  Knopf derselben Wahl schreibt; Stilwechsel mit der Tastatur nach Klassisch und mit Enter zurück, der Fokus folgt),
  `pagesKeep` Einstellungen (dieselben Schritte S1–S15 in Klassisch und Glas mit demselben Ergebnis: App-Name als
  Titel, Symbol als Favicon, Hell/Dunkel, Sprache hin und zurück, Akzent und „zurücksetzen“, Bearbeiten blendet die
  Räume aus und ein, Entitäten suchen, umbenennen, Stern, Auge, Räume verschieben und ausblenden, Export als Datei mit
  Inhalt, Import bis zum Dateidialog, Version, „Neuerungen“, Link, zuletzt der Weg der Demo zur Anmeldung; unter der
  Verwaltung Gerät, wer/wann, Schalter und Knopf; die Farbwelten nur in Klassisch, Glas zeigt den Hinweis und behält
  das gespeicherte Design; in Glas die Maße der Liste), dazu wieder grün: Schalter, Regler, Feld und Gruppentitel der
  Einstellungen, Stilwechsel mit offenem Fenster, mit offener Wischzeile, Rahmen nach dem Wechsel und Etappe 1.
  `glas-shots.cjs`: `seedScript` nimmt weitere Felder des Zustands (`state`) und weitere localStorage-Einträge
  (`storage`, z. B. die Verwaltung). Klassisch der Einstellungen gegen `main`: gleich.

### 7.18 Onboarding (T1–T6, K94, K98)

- Datei `onboarding.css` (neu, in `index.css` und im Selektor-Wächter); Feld und Orange gab es schon (`lists.css`,
  `accent.css`). Kein neues Layout, kein Markup.
- **Karte und Rahmen (K98):** Die Karte ohne Rand wie alle Glas-Karten. „Erweitert“ verliert seinen Rahmen: der
  Schalter ist eine Zeile 44 ab der Kante der Felder, 15/20 `label2` mit Chevron `label3`; das offene Formular ohne
  eigenen Hintergrund und ohne Linie. Ohne Rahmen schneidet nichts mehr ab, die Fokusringe der breiten Teile bleiben
  ganz. „oder“ zwischen Haarlinien 0,5.
- **Eine prominente Hauptaktion:** „mit home assistant anmelden“ als Kapsel 50 in `prominent` (17/22 600); „Mit
  Zugriffstoken verbinden“ und „Das Demo-Zuhause erkunden“ dieselbe Kapsel ohne Rand, grau (`fill`, `label`) bzw. getönt
  (`accent-soft` mit der Akzent-Tinte wie in Klassisch).
- **Felder (K94):** URL und Token sichtbar 36 in einer Trefferfläche 44, `fill`, Schrift 17.
- **Warnung und Fehler:** getönte Flächen ohne Rand mit Radius 12: die Mixed-Content-Warnung 13/18 in der Warn-Tinte
  auf ihrem weichen Ton, Fehler 15/20 in `redInk` auf `redSoft` (beide Paare stehen in der Kontrastliste von
  `glasTokens.ts`). Mit erzwungenen Farben bekommen Knöpfe und Hinweise wieder einen Rand.
- Prüfungen: `pagesKeep` Onboarding (abgemeldet, ohne Demo, Klassisch und Glas mit demselben Ergebnis): „/“ führt zur
  Anmeldung (T6), Logo, Name, Leitsatz (T1), Anmelden ohne URL, eine HTTP-URL auf einer HTTP-Seite ohne Warnung, auf
  einer über HTTPS ausgelieferten Seite (eine Test-Herkunft, die der Kontext aus dem Build bedient) Warnung und Fehler,
  mit einer HTTPS-URL der Weg zur Login-Seite von Home Assistant mit dieser App als Client (T2, abgefangen; die Adresse
  ist eine Dokumentationsadresse); der Token-Weg auf und zu, fehlender Token, Warnung und Fehler auf HTTPS, eine
  abgelehnte Verbindung zeigt erst den Ladebildschirm, dann den Fehler (T3, T5); die Demo startet (T4). In Glas die
  Maße: Karte ohne Rand, genau ein Knopf in `prominent`, drei Kapseln 50, Felder 44/36, Warnung, Fehler, „Erweitert“,
  Haarlinien. Klassisch der Anmeldung gegen `main`: gleich.

### 7.19 Chip-Fenster, Mehr- und Räume-Menü, „Klima/Rollläden alle“ (K97)

- **Eine Zählung:** Core `chipCounts.ts` zählt für alle acht Chips (Personen, Licht, Türen/Fenster, Alarm, Medien, Pool,
  Garage, Schlösser), `components/home/chipLabels.ts` macht daraus die Texte der Chips. `SummaryChips` nutzt beides in
  beiden Stilen (Klassisch gleich). Ausgeblendete Entitäten zählen nicht.
- **Untertitel der Chip-Fenster (nur Glas):** derselbe Text wie der Chip („5 an“, „alle geschlossen“), auch wenn das
  Fenster aus „Hinweise“ geöffnet wird, und live. Gerechnet wird nur, solange das Fenster offen ist
  (`useChipWindow(id, open)`, das auch die Klasse liefert; Klassisch behält sein DOM). Klassisch zeigt keinen Untertitel.
- **Großbuchstabe am Anfang:** Titel und Untertitel der Chip-Fenster stehen in den Locales klein („licht“, „alle aus“);
  Glas hebt den ersten Buchstaben per `::first-letter` (Klasse `g-chip-window`, wie §7.4), ebenso am Knopf „alle
  ausschalten“ im Licht-Fenster. **Abweichung:** nur in den Chip-Fenstern. Andere Fenster tragen Namen, die Leute
  vergeben haben („iPhone Lampe“, ein Raum); die bleiben, wie sie geschrieben sind (geprüft). **Ersetzt** durch
  [PLAN-TEXTE](PLAN-TEXTE.md): die Texte sind selbst richtig geschrieben, Regel und Klasse `g-chip-window` sind weg.
- **Mehr-Menü (Handy):** rechts in der Zeile Energie heute („8,4 kWh“, dieselbe Zahl wie die Energie-Karte), die Zahl
  der Szenen (wie der Hero der Szenen-Seite) und das System in einem Wort („Normal“, „Ausgelastet“, „Kritisch“; Zählungen
  wie die Status-Pille, etwa „1 nicht verfügbar“); unter der Liste „Version … · F…“, für Vorleser verborgen (die Version
  steht in den Einstellungen). Das Menü bleibt eingehängt; jeden Wert liest eine kleine Komponente, die nur bei offenem
  Menü eingehängt ist und ihren Text vor dem Malen meldet (geschlossen bleibt der letzte Text stehen, nichts wird gelesen
  oder gezählt). Die Energie lädt deshalb nur, solange es offen ist; eine gemerkte Zahl erscheint sofort, solange sie
  zum heutigen Tag gehört. Zahl und Name stehen mittig auf einer Linie, der Wert in `glassLabel2`, 17/22.
- **Räume-Menü:** der Zustand je Raum wie auf den Raumkacheln (`roomTone.ts`, gemeinsam mit `GlasRoomTile`: Offenes,
  Wasser und Rauch vor Licht an), am Handy als Kreis 32 mit Symbol im Soft-Ton, am Desktop als Farbe des Symbols; der
  Vorleser hört „Name, Zustand“. Klassisch unverändert.
- **„Klima alle“ und „Rollläden alle“:** die Karten je Gerät im Look von §7.8 (Kapsel 40 mit − / +, Pillen 36;
  Mini-Rollo 40, Position 15/20 600, Knöpfe 40).
- **Demo:** `demoEnergy.ts` zählt die Statistik-Abrufe (`__hapulseDemo.energyLoads()`), damit die Prüfung „lädt nur,
  solange offen“ messen kann.
- Prüfungen: neu `pagesMenus` mit den Teilen `chips` (alle acht Untertitel gleich dem Chip, Großbuchstabe, live, aus
  „Hinweise“, ausgeblendete Entität, Name im Detail unverändert, Klassisch ohne Untertitel), `more` (keine Abrufe vor
  dem Öffnen und nach dem Schließen, neue Stunde lädt beim nächsten Öffnen, Werte wie Energie-Karte und Szenen-Hero,
  System bei einer nicht verfügbaren Entität, Fuß), `rooms` (Ton und Text je Raum, Kreis bzw. Farbe, gleiches Symbol wie
  die Kachel, live; Klassisch ohne Zustand) und `all` (Maße der Karten in beiden Fenstern).
- Changelog: F38 (geplant als F37, siehe §2).
- **Nachtrag (Entscheid des Users 2026-10-10, „Glas geht vor“, GLAS-PLAN §3):** `::first-letter` und `text-transform:
  capitalize` sind Umwege, weil die Texte in den Locales klein stehen; sie heben nur den ersten Buchstaben („Türen &
  fenster“), andere Stellen bleiben klein („zu hause“, „poolseite öffnen“). Der nächste PR schreibt die Texte selbst
  richtig (eigene Textdatei des Forks, alle 7 Sprachen, beide Stile) und entfernt diese Regeln samt `g-chip-window`.
  Umgesetzt nach [PLAN-TEXTE](PLAN-TEXTE.md) (F39).

## 8. Review des Codes (2026-10-10)

Drei unabhängige Prüfungen (CSS in zwei Teilen, Logik), keine Blocker. Behoben:

- **Hover auf Touch:** Die Glas-Grundregeln der Knöpfe schlagen die klassischen Hover-Regeln (höchstens (0,3,0)), damit
  ein „klebendes“ Hover nach einem Tipp den Ruhezustand zeigt; die Tönung beim Überfahren steht unter
  `@media (hover: hover)`: Knöpfe der Karten im Raum (Schloss, Tor, Knopf, Sauger; Start und Aufblitzen behalten ihre
  Farben), Griff und Größen-Griff, Stepper (die Pool-Seite lädt ihre klassische Regel später, deshalb ein Neutralisierer
  außerhalb), Modus-Pillen, Bibliotheks-Reiter, Auswahlfelder, Pool-Knöpfe, Sicherheits-Knöpfe, Schloss- und Torzeilen,
  Alarm-Modi.
- **Drücken:** Verkleinern beim Drücken nur ohne „Bewegung reduzieren“ (Kamerakachel, Knopf der leeren Energie-Seite).
- **Fokus:** Ring an den sichtbaren Reglern (Farbton, Akzent, Musik), innen an den Auswahlfeldern von Geräten und
  Automationen; am Knopf „Entitäten bearbeiten“ eine transparente Kontur, die Hochkontrast sichtbar macht, wo der Ring
  der Zeile fehlt.
- **Hochkontrast (forced colors):** Schwellen-Punkt im System-Hero als Zeichen in Textfarbe; aktive Musik-Knöpfe und der
  gewählte Player so spezifisch wie ihre Glas-Regeln (sonst blieb die Glas-Farbe), der Inhalt der gewählten Zeile in
  Systemfarben; Ränder auch beim Überfahren (Gerätekacheln, Gruppen-Knopf, Rollladen-Knöpfe, Größen-Griff,
  Bearbeiten-Abzeichen, Alarm-Modi, diese jetzt auch im Alarm-Fenster), an den Kennzahlen des Geräte-Heros, den Kapseln
  und Symbol-Feldern der Einstellungen und am Umbenennen-Feld (im Fokus mit Kontur). Geprüft mit `forcedColors` in
  Chromium (Ränder, Hover, Fokus); der gewählte Player und der Gruppen-Knopf sind in der Demo nicht erreichbar, dort nur
  über die Spezifität begründet.
- **Gekappte Karten:** Die Listen von Personen, Türen/Fenster, Bewegung und Batterien beginnen unter dem angehefteten
  Titel wie die der Automationen (vorher lagen 8 px darunter, gemessen); die Aktivitäten auf der System-Seite reichen
  wie auf der Übersicht bis an die Fläche.
- **Logik:** Mehr- und Räume-Menü lesen nur bei offenem Menü (vorher abonnierten sie den Store auch geschlossen); die
  Energie-Zahl kommt aus `energyFigure.ts` (die Energie-Karte bleibt in ihrem eigenen Paket); ein gemerktes
  Energie-Ergebnis gilt nur für sein Fenster (nach Mitternacht ist es nicht mehr „heute“); die Größen-Segmente
  (`SizeBar`, `SizeSheet`) schalten erst per Enter oder Leertaste (`activation="manual"`, K92); `[fork]`-Marker in
  `ZonesCard.tsx`.
- Bewusst so gelassen: `useChipWindow` rechnet alle acht Texte (eine Zählung, vernachlässigbar).

**Offen für Etappe 7:** die übrigen Hover-Tönungen, auch älterer Etappen (rund 100 Regeln), unter `(hover: hover)`,
mit einer Prüfung „nach einem Tipp zeigt jedes Bedienelement seinen Ruhezustand“; Kacheln in Fenstern ohne Rand in
Hochkontrast (etwa die Player-Kachel).

## 9. Gesamtlauf vor dem Merge (2026-10-10)

- `checks` aller Teile: 75 von 75 Blöcken grün. Zwei Blöcke waren im ersten Durchgang rot, beide durch die Prüfskripte:
  `gesturesInspector` drückte Enter, bevor das Kontextmenü den Fokus hatte (jetzt wartet die Probe darauf), und
  `pagesCardTitles` erwartete in den System-Karten noch einen Körper unter der Fläche, obwohl sie seit K94 Listen sind
  (die Aktivitäten liegen wie auf der Übersicht 6 px tiefer). Danach liefen nur diese Teile erneut.
- Klassisch gegen `main`: 338 Bilder von 66 Szenen (Handy, iPad, Desktop, hell und dunkel), 326 gleich, 12 nur in den
  Einstellungen (Versionszeile) und unter „Was ist neu“ durch F38.
- Klick-Fuzz mit einem Hinweis: acht Läufe (Glas und Klassisch, Handy und Desktop, mit und ohne Bearbeiten), 3632 Klicks
  auf je 13 Seiten, keine JS-Fehler, keine Fehlerkarte, kein HTTP ≥ 400.
