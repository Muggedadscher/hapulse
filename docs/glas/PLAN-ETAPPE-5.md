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
| K88 | **Grundsatz:** Nur Aussehen und Bewegung ändern sich (GLAS-PLAN §1), Inhalte und Reihenfolge bleiben. **Klassisch bleibt pixelgleich mit `main`** bis auf die Versionszeile F37 (Einstellungen, „Was ist neu“); Etappe 5 bringt dort keine neuen Inhalte (anders als K74). Neues Markup gibt es nur in Glas (hinter `useIsGlas`) und nur, wo ein Baustein fehlt: Segment, Bearbeiten-Leiste, Menü-Werte, Status-Kreise, Rollladen-Position. Alles andere ist CSS an den vorhandenen Klassen in `styles/glas/`. Szenen-Kacheln außerhalb der Übersicht bekommen deren Look, aber kein „Aktiv“ (K74 gilt nur für die Übersicht). |
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

Dazu kommen Texte in allen sieben Sprachen (nur neue Namen und Menü-Werte), Fork-Changelog F37 + `CHANGELOG.fork.md`,
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
- **Klassisch:** Pixelvergleich mit `main` für alle Szenen (Seiten und Sheets), erwartet ist nur F37 (`--expect` für
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
5. Ältere Prüfungen anpassen, Texte, Changelog F37, Doku. Dann Code-Prüfung, Gesamtlauf, Merge.

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
| S2 ältere Prüfungen, „0 px“ | Abschnitt „Ältere Prüfungen anpassen“, Klassisch mit `--expect` für F37 (§3, K88). |
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
  Automations-Liste scrollt und schnitt die Fläche rechts ab; sie reicht in Glas 7 px in den Innenabstand der Karte
  (`lists.css`), sichtbar ändert sich nichts. Ihre Zeilen werden 4 px höher (Label 44 statt 40, innerhalb von K94).
- **Pille der Schalter-Karte:** Sie ist nur ein Bild (`ToggleCard`: `aria-hidden`, kein Tab-Halt), ihr Label hält den
  Klick aber auf, deshalb tat ein Tipp genau auf die Pille nichts (auch in Klassisch, Nebenbefund 16). In Glas geht der
  Tipp zur Karte durch (`pointer-events: none`), die als Ganzes schaltet, wie K91 es für Kacheln will. Das betrifft die
  Steuerkarte im Detail und bis zum Raum-Schritt die Kacheln.
- `pagesSwitches` prüft auf Handy (dunkel) und Desktop (hell): Automationen, Pool-Zeitplan, Einstellungen, Licht-Sheet,
  Geräte-Detail und die Pille im Detail.
