# Designsystem „Glas“ — HAPulse

> **Maßgeblich für das Aussehen** des Stils Glas. Architektur, Etappen, Tests: [`GLAS-PLAN.md`](GLAS-PLAN.md).
> Maschinenlesbare Werte: [`glas/glas-tokens.json`](glas/glas-tokens.json) (gleiche Werte wie hier; bei Abweichung gilt
> die JSON-Datei für Zahlen und dieses Dokument für Regeln).
> Quelle aller Zahlen: die freigegebene Skizze `glas/skizze/Glas5Handy.dc.html` (Präfix `g5-`) und
> `glas/skizze/Glas5Desktop.dc.html` (Präfix `gd5-`), Helmet-CSS + Skript. Wo Handy- und Desktop-Skizze leicht
> voneinander abweichen, steht der verbindliche Wert hier und die Abweichung in einer Fußnote „Skizze:“.
> Stand 2026-10-06.

## Inhalt

1. [Grundsatz und verbindliche Entscheidungen](#1-grundsatz-und-verbindliche-entscheidungen)
2. [Farben](#2-farben)
3. [Glas (Material)](#3-glas-material)
4. [Typografie](#4-typografie)
5. [Abstände, Raster, Radien, Trefferflächen](#5-abstände-raster-radien-trefferflächen)
6. [Bewegung](#6-bewegung)
7. [Komponenten-Katalog](#7-komponenten-katalog)
8. [Do & Don’t](#8-do--dont)
9. [Apple-Grundlagen (mit Quellen)](#9-apple-grundlagen-mit-quellen)
10. [Verweise: Skizze, Screenshots, Plan](#10-verweise)

---

## 1. Grundsatz und verbindliche Entscheidungen

**„Glas ist nur ein Stil.“** Jede HAPulse-Seite, -Karte, jeder Chip, jedes Modal, jede Information, Reihenfolge und
Interaktion bleibt wie in HAPulse (Checkliste: `glas/HAPULSE-INVENTORY.md`). Glas ändert **nur Aussehen und Bewegung**.
Wo eine Apple-Regel eine HAPulse-Funktion entfernen würde, **gewinnt HAPulse**.

### 1.1 Entscheidungen des Users (Design-Brief, verbindlich)

| # | Entscheidung | Quelle |
|---|---|---|
| D1 | Handy-Tabs wie HAPulse-Fork: **Übersicht · Räume · NVR · Pool · Mehr**; „Räume“ öffnet das Räume-Menü (Sheet, keine Seite), „Mehr“ das Mehr-Sheet | SPEC4 |
| D2 | Begrüßung „Guten Morgen, Anna“ (ohne Emoji); Untertitel „Das passiert gerade in deinem Zuhause.“ nur Desktop | SPEC4, SPEC5-1 |
| D3 | Logo (PulseLogo in Akzent-Kachel) + App-Name bleiben (Seitenleiste oben) | SPEC4 |
| D4 | **Keine Suche** | SPEC4 |
| D5 | Tab-Leiste = schwebende Glas-Kapsel, **minimiert beim Runterscrollen**, fährt beim Hochscrollen aus | SPEC4 (1) |
| D6 | Großer Titel klappt beim Scrollen in eine **weiche Scroll-Kante** mit kleinem zentrierten Titel ein (keine harte Leiste) | SPEC4 (2) |
| D7 | Desktop-Seitenleiste **gruppiert** (Zuhause / Bereiche / System), schwebendes Glas-Panel, Logo, Status-Pille mit echten Zuständen, einklappbar zur Leiste | SPEC4 (3) |
| D8 | Geräte-Kacheln nach Home-App: **Symbol schaltet, Name öffnet Steuerung**, an = hell, aus = gedämpft | SPEC4 (4) |
| D9 | Zusätzlicher Bereich **„Hinweise“** (nur Abweichungen), nie Ersatz für HAPulse-Karten | SPEC4 (5) |
| D10 | Szenen zeigen die **aktive Szene** (volle Farbe + Ring + „Aktiv“) | SPEC4 (6) |
| D11 | **iOS-Sheets für alle Modals** am Handy (eingerückt, Grabber, mittel/groß, nach unten wischen, wächst aus dem Element); Desktop: zentrierter Glas-Dialog, wächst aus dem Element | SPEC4 (7) |
| D12 | Licht: großer **senkrechter Control-Center-Regler** + Ein/Aus im Licht-Detail | SPEC4 (8) |
| D13 | Kameraseite **immer dunkel**, randlos, **klare** Glas-Steuerkapsel über dem Video; Tab- und Chip-Leiste nur dort aus | SPEC4 (9), E13 |
| D14 | Riskante Aktionen bestätigen **im Sheet** (Garage öffnen, Entriegeln, Alarm-Code) | SPEC4 (10) |
| D15 | Glas-Stärke **klar / getönt / deckend** | SPEC4 (11) |
| D16 | **Feste Zustandsfarben**: Licht an = Gelb, Heizen = Orange, Kühlen = Blau, Pool = Türkis, OK = Grün, Alarm = Rot; **Akzent nur für Auswahl/Primäraktion** | SPEC4 (12) |
| D17 | Desktop-Kopf: Werkzeuggruppen als **getrennte Glas-Kapseln** [Mitteilungen] · [Bearbeiten/Fertig] · Avatar, daneben Wetter-Pille; **Chips auf jeder Seite** | SPEC4 (13) |
| D18 | **Kontextmenü bei Langdruck (550 ms)**: angehobene Vorschau + Glas-Menü (Details, Zu/Aus Favoriten, Raum öffnen, Ausblenden, + Ein/Aus) | SPEC4 (14) |
| D19 | **Wisch-Aktionen** nach links (Mitteilung → Verwerfen, Licht → Aus, Schloss → Verriegeln, Garage → Schließen); Entriegeln/Öffnen **nie** per Wischen | SPEC4 (15) |
| D20 | Bearbeiten: Größen **S/M/L** statt Span-Punkte; Reihenfolge, Ausblenden, Handy-Ausblenden, Chip-/Nav-Bearbeitung bleiben; **kein Wackeln** | SPEC4 (16) |
| D21 | Desktop/iPad: Detail als **Inspector** rechts (~420 px, Übersicht bleibt bedienbar); Handy: Sheet | SPEC4 (17) |
| D22 | Dunkelmodus **reines Schwarz** (#000) mit #1C1C1E/#2C2C2E | SPEC4 |
| D23 | **Nur Systemschrift**, keine Bricolage/Schibsted/Spline Mono, kein ui-rounded | SPEC4 |
| D24 | **Eine neutrale iOS-Palette** + Akzent des Users (Akzent-Regler bleibt), keine vier Farbwelten | SPEC4, E14 |
| D25 | Schalter **iOS-Grün**, unabhängig vom Akzent | SPEC4 |
| D26 | **Kartentitel über der Karte** auf dem Seitenhintergrund (Title3 + optional „Alle ›“), Karte enthält nur Inhalt | SPEC4 |
| D27 | Handy-Kopf ruhig: oben rechts **nur der Avatar** (Glas-Kreis 40 px, roter Punkt bei Mitteilungen) → Glas-Menü „Mitteilungen (n) · Bearbeiten · Einstellungen“; unter der Begrüßung die **Wetterzeile**; Reihenfolge Begrüßung → Chips → Hinweise → Rest | SPEC5-1 |
| D28 | **Glas-3-Karten** überall (ruhig), fehlende HAPulse-Funktionen im Glas-3-Stil ergänzt | SPEC5-2 |
| D29 | Chips: schlichte Kapseln **ohne getönte Kreise**, Farbe nur an der Glyphe | SPEC5-3 |
| D30 | **Weniger Farbe**: Symbole in Hinweisen und neben Titeln einfarbig (`--g-label-2`); Farbe nur für echte Zustände | SPEC5-4 |
| D31 | **Kontrast**: Sekundärtext ≥ 4,5:1 auf **jeder** Fläche (iPad bei Tageslicht); Ink-Varianten ≥ 3:1 für Glyphen | SPEC5-5 |
| D32 | Hintergrund „Bild“ (Wallpaper) **später, optional** (frühestens Etappe 7); Standard „grau“ | SPEC4, E15 |
| E1/E2 | Stil, Glas-Stärke und **„Transparenz reduzieren“ legt nur der Admin fest (GLOBAL)**; pro Gerät nur Hell/Dunkel. `prefers-contrast: more` wirkt automatisch pro Gerät | §7.3 |
| E3/E9 | **Hinweise, „Aktiv“ bei Szenen, Netz/Solar-Balken + PV-Ertrag in beiden Stilen** | §7.3 |
| E6 | **L = 2 Spalten + höher**; S = 1 Spalte, M = 2 Spalten; „⋯ Anpassen“ behält alle alten Werte | §7.3 |
| E8 | Hauptraum-Karte **immer schlicht** (kein Verlauf, **kein Raumbild** – auch wenn in HA gesetzt) | §7.3 |
| E11 | „Glas (Vorschau)“ nur für HA-Admins sichtbar | §7.3 |
| E16 | Inspector ab **1100 px** | §7.3 |
| E17 | Leistungsmaßstab **iPad (Safari/WebKit)** | §7.3 |
| Energie | Apple-Health-Look: Segment Tag/Woche/Monat, schmale gerundete gestapelte Balken Netz/Solar, Hilfslinien mit Achswerten, Ø-Linie, Tipp → Info-Blase | §7.3 |

### 1.2 Die drei Ebenen

| Ebene | Was | Material |
|---|---|---|
| Hintergrund | Seite (`--g-bg`) | deckend, flach |
| Inhalt | Karten, Kacheln, Listen, Diagramme, Kamerabild | **deckend, randlos**, kein Glas |
| Funktion | Tab-Leiste, Seitenleiste, Kopf-Kapseln, Avatar, Sheets, Dialoge, Inspector, Menüs, Steuerung über Video | **Glas** (regular; über Video clear) |

---

## 2. Farben

Neutrale iOS-Palette + Akzent. Alle Werte als `--g-<name>` (Glas-eigen) und über die klassischen HAPulse-Namen
(Tabelle 2.6). Kontrast: WCAG 2.x, gemessen mit Skript (sRGB-Luminanz; Alpha über dem echten Untergrund zusammengerechnet).

### 2.1 Flächen und Text

| Token | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `bg` | `#F2F2F7` | `#000000` | Seite |
| `card` / `cardSolid` | `#FFFFFF` | `#1C1C1E` | Inhaltskarten, deckende Glas-Variante |
| `card2` | `#F2F2F7` | `#2C2C2E` | Felder in Karten, Info-Blase, Raumkachel (Desktop) |
| `cardHover` | `#F7F7FA` | `#2C2C2E` | Hover (Desktop) |
| `group` | `#FFFFFF` | `#2C2C2E` | Gruppen **in** Sheets/Dialogen |
| `sheetSolid` | `#F2F2F7` | `#1C1C1E` | Sheet groß, deckende Sheets |
| `fill` | `rgba(120,120,128,.12)` | `rgba(120,120,128,.24)` | graue Kreise, Kapseln, Segment-Spur, Knöpfe |
| `fill2` | `rgba(120,120,128,.20)` | `rgba(120,120,128,.36)` | Regler-Spur, Avatare im Chip |
| `fillSolid` | `#E5E5EA` | `#3A3A3C` | deckende Badges (Bearbeiten) |
| `sep` / `sepStrong` | `rgba(60,60,67,.18)` / `.36` | `rgba(84,84,88,.55)` / `.95` | Trennlinien 0,5 px / Raster, Rand deckend |
| `label` | `#000000` | `#FFFFFF` | Primärtext |
| `label2` | **`#5F5F64`** | `#AEAEB2` | Sekundärtext (≥ 4,5:1 überall) |
| `glassLabel2` | `#3A3A3C` | `#D1D1D6` | Sekundärtext **auf Glas** (ersetzt `label2` dort) |
| `label3` | `#7C7C80` | `#8E8E93` | **nur** Chevrons/dekorative Glyphen (≥ 3:1), nie Text |
| `textFaint` | `#636366` | `#A1A1A6` | neuer Wert für HAPulse `--text-faint` (kleine Texte) |
| `glyphDark` | `#1C1C1E` | `#1C1C1E` | Glyphe auf Gelb/Orange/Türkis/Grün |
| `onMedia` | `#FFFFFF` | `#FFFFFF` | Glyphen/Text über Bild/Video |
| `grabber` | `rgba(60,60,67,.30)` | `rgba(235,235,245,.30)` | Sheet-Griff |

Skizze: Desktop `label2` `#5E5E63` → verbindlich `#5F5F64` (Plan §1.3).

### 2.2 Zustandsfarben (fest, unabhängig vom Akzent)

Regel: **Vollfarbe** (`yellow` …) für Flächen (Kreis, Balken, Schalter-Spur), **Ink** für Text und Glyphen, **Soft** für
getönte Flächen – Soft nur auf Karte/Gruppe (#FFF bzw. #1C1C1E/#2C2C2E), nie direkt auf `bg`.

| Zustand | Bedeutung | Voll hell / dunkel | Ink hell / dunkel | Soft hell / dunkel | Glyphe auf Voll |
|---|---|---|---|---|---|
| light | Licht an, Solar, „Morgen hell“ | `#FFCC00` / `#FFD60A` | **`#7D5E00`** / `#FFD60A` | `rgba(255,204,0,.24)` / `rgba(255,214,10,.20)` | `glyphDark` |
| heat | Heizen, Temperatur | `#FF9500` / `#FF9F0A` | `#B25000` / `#FFB340` | `rgba(255,149,0,.16)` / `rgba(255,159,10,.22)` | `glyphDark` |
| cool | Kühlen, Feuchte, Medien, Bewegung (info) | `#007AFF` / `#0A84FF` | `#0060DF` / `#409CFF` | `rgba(0,122,255,.12)` / `rgba(10,132,255,.22)` | weiß |
| pool | Pumpe läuft | `#30B0C7` / `#40C8E0` | `#0A7389` / `#40C8E0` | `rgba(48,176,199,.16)` / `rgba(64,200,224,.20)` | `glyphDark` |
| ok | normal, scharf, verriegelt, zu Hause | `#34C759` / `#30D158` | `#1F7A35` / `#30D158` | `rgba(52,199,89,.16)` / `rgba(48,209,88,.20)` | `glyphDark` |
| alarm | offen, Fehler, destruktiv | `#FF3B30` / `#FF453A` | `#D70015` / `#FF6961` | `rgba(255,59,48,.12)` / `rgba(255,69,58,.22)` | weiß |
| warn | Fenster offen, Störung, „morgen“ | `#FFCC00` / `#FFD60A` | `#7D5E00` / `#FFD60A` | `rgba(255,204,0,.24)` / `rgba(255,214,10,.20)` | `glyphDark` |
| Szene Kino | — | `#AF52DE` / `#BF5AF2` | `#8944AB` / `#DA8FFF` | — | weiß |
| Szene Nacht | — | `#5856D6` / `#5E5CE6` | `#3634A3` / `#9D9BFF` | — | weiß |

Weitere feste Farben: Schalter an `#34C759` / `#30D158`, aus `rgba(120,120,128,.24)` / `.32`, Knopf `#FFFFFF`;
Badge/LIVE `#D70015` mit Weiß; Live-Punkt `#FF3B30`; Wisch-Aktionen: Verwerfen `#D70015`, Verriegeln/Schließen
`#1F7A35`, Aus `#636366` (je mit Weiß); Tonnen: Rest `#8E8E93`, Papier = blue, Gelber Sack = yellow, Bio = green,
Braun `#A2845E`/`#AC8E68`; Farbtemperatur-Punkte `#FFB25B` `#FFD39C` `#FFF3E3` `#DCE8FF`.

Skizze: Handy `yellowInk` `#8F6C00` fällt auf `#F2F2F7` (4,36:1) und auf `yellowSoft` (4,36:1) durch → verbindlich
Desktop-Wert `#7D5E00`. Desktop `redInk` `#C70014` → verbindlich `#D70015` (Plan, ≥ 4,58:1 überall).

### 2.3 Akzent und Akzent-Ink

Akzent **nur** für: Auswahl (Häkchen, aktiver Tab/Nav-Eintrag), Fokusring, die **eine** Primäraktion je Ansicht
(„Alle ausschalten“, „Fertig“, „Starten“) und Text-Links (Desktop). Nie für Zustände, nie für Schalter.

| | Hell | Dunkel |
|---|---|---|
| `accent` (Fläche, Standard) | `#FF9500` | `#FF9F0A` |
| `accentInk` (Text, Häkchen, Fokus) | **`#A64B00`** (5,19:1 auf bg, 4,65:1 auf Tab-Linse) | `#FFB340` |
| `tabInk` (aktiver Tab auf Linse) | `#A64B00` | `#FFB340` |
| `accentSoft` | `rgba(255,149,0,.16)` | `rgba(255,159,10,.26)` |
| `prominent` / `onProminent` | `#FF9500` / **`#1C1C1E`** (7,74:1) | `#FF9F0A` / `#1C1C1E` (8,28:1) |

**Weiß auf Orange = 2,20:1 → verboten.** Orange als Text auf Weiß ebenfalls (2,2:1) → immer `accentInk`.

Algorithmus `glasAccent(hue)` (Plan §1.3; Werte für die vier Vorgaben in `glas-tokens.json → accent.presets`):
1. Akzent = `hsl(h, 78 %, 50 %)` hell bzw. `60 %` dunkel; ohne Hue `#FF9500` / `#FF9F0A`.
2. `accentInk`: hell RGB × 0,9 je Schritt bis ≥ 4,5:1 auf `#F2F2F7`; dunkel je Schritt 12 % Richtung Weiß bis ≥ 4,5:1 auf `#1C1C1E`.
3. `tabInk`: `accentInk` weiter × 0,93 (hell) bzw. +10 % (dunkel) bis ≥ 4,5:1 auf der Linse (`#E6E6E9` / `#3C3C3D`).
4. `onProminent`: `#1C1C1E`, wenn ≥ 4,5:1 zum Akzent; sonst Weiß, wenn ≥ 4,5:1; sonst Fläche = `accentInk` mit Weiß.

Vorgaben: Blau `#007AFF` → Ink `#0060DF`, Prominent `#0060DF` + Weiß (5,62:1), Tab dunkel `#64AFFF`;
Grün `#34C759` → Ink `#1F7A35`, Tab hell `#1D7131`; Lila `#AF52DE` → Ink `#8944AB`, Prominent + Weiß.
Skizze: Handy nutzte für Orange `#B25000` + separat gerechnete Tab-Ink; `#B25000` hat auf der Linse nur 4,17:1 →
verbindlich `#A64B00` als Akzent-Ink. `#B25000` bleibt die Heizen-Ink.

### 2.4 Diagrammfarben (Energie Netz/Solar)

| Token | Hell | Dunkel | Regel |
|---|---|---|---|
| `chartNetz` | `#8E8E93` (3,26:1 auf Weiß) | `#8E8E93` (5,22:1) | Netz unten, neutralgrau |
| `chartSolar` | `#FFCC00` (1,51:1!) | `#FFD60A` (12,05:1) | Solar oben, gelb |
| `chartSolarEdge` | `#A67C00` als `inset 0 0 0 1px` (3,82:1) | transparent | **Pflicht im Hellen**, sonst ist Gelb auf Weiß unsichtbar |
| `chartGrid` | `sepStrong` | `sepStrong` | Grundlinie durchgezogen, weitere gestrichelt 2 px / 3 px Lücke |
| `chartAvg` | `label`, Deckkraft .7 | `label` | Ø-Linie gestrichelt 4 px / 3 px |
| Zukunft | `fill`, 3 px hoch | `fill` | noch nicht erreichte Stunden |

### 2.5 Kontrast — gemessen

Gerechnet für die echten Paare (Skript in der Sitzung; WCAG-Formel). Mindestwerte: Text ≤ 17 px 4,5:1; Text ≥ 24 px
bzw. ≥ 19 px fett 3:1; Glyphen/Grafik 3:1. **Hell zählt am meisten** (iPad bei Tageslicht).

**Hell – Text auf deckenden Flächen**

| Vordergrund | auf Karte `#FFF` | auf `bg #F2F2F7` | auf `fill` über Karte (`#EFEFF0`) | auf `fill` über bg (`#E3E3E9`) | Urteil |
|---|---|---|---|---|---|
| `label #000` | 21,00 | 18,82 | 18,24 | 16,48 | ✔ |
| `label2 #5F5F64` | 6,35 | 5,69 | 5,52 | 4,98 | ✔ überall |
| `glassLabel2 #3A3A3C` | 11,35 | 10,17 | 9,86 | 8,91 | ✔ |
| `textFaint #636366` | 5,99 | 5,37 | 5,20 | 4,70 | ✔ |
| `label3 #7C7C80` | 4,16 | 3,73 | 3,61 | 3,26 | ✘ Text – nur Glyphen |
| `yellowInk #7D5E00` | 6,05 | 5,42 | 5,25 | — | ✔ (auf `yellowSoft` 5,57) |
| (Skizze Handy `#8F6C00`) | 4,87 | **4,36** | 4,23 | — | ✘ → ersetzt |
| `orangeInk #B25000` | 5,20 | 4,66 | 4,51 | — | ✔ (auf `orangeSoft` 4,57) |
| `accentInk #A64B00` | 5,79 | 5,19 | 5,03 | 4,53 | ✔ (auf Tab-Linse 4,65) |
| `tealInk #0A7389` | 5,49 | 4,92 | 4,77 | — | ✔ (auf `tealSoft` 4,75) |
| `greenInk #1F7A35` | 5,39 | 4,83 | 4,69 | 4,22 | ✔ (auf `greenSoft` 4,73) |
| `redInk #D70015` | 5,38 | 4,83 | 4,68 | — | ✔ (auf `redSoft` über Karte 4,58; über bg nur 4,14 → Soft nie auf bg) |
| `blueInk #0060DF` | 5,62 | 5,03 | 4,88 | 4,39 | ✔ (auf `blueSoft` 4,81) |
| `purpleInk #8944AB` | 6,04 | 5,41 | 5,24 | — | ✔ |
| `indigoInk #3634A3` | 9,65 | 8,64 | 8,38 | — | ✔ |

**Hell – Glyphe/Text auf Vollfarbe**

| Paar | Kontrast | Urteil |
|---|---|---|
| `glyphDark` auf Gelb / Orange / Türkis / Grün | 11,25 / 7,74 / 6,61 / 7,66 | ✔ |
| Weiß auf Lila / Indigo / Rot / Blau | 4,13 / 5,65 / 3,55 / 4,02 | ✔ Glyphen (≥ 3), **kein Fließtext** auf Rot/Blau |
| Weiß auf `#D70015` (Badge, LIVE, Verwerfen, Bestätigen) | 5,38 | ✔ Text |
| Weiß auf `#1F7A35` / `#636366` (Wisch-Aktionen) | 5,39 / 5,99 | ✔ |
| `#1C1C1E` auf Akzent `#FF9500` | 7,74 | ✔ Primärknopf |
| Weiß auf Akzent `#FF9500` | 2,20 | ✘ verboten |
| Weiß auf Toast `rgba(28,28,30,.92)` | 13,72 | ✔ |
| Weiß auf `#FF3B30` (Desktop-Banner „verloren“ in der Skizze) | 3,55 | ✘ → Banner mit Mischfläche (§7.26) |

**Dunkel**

| Vordergrund | auf `#000` | auf `#1C1C1E` | auf `#2C2C2E` | auf `fill` über `#1C1C1E` | auf `fill` über `#2C2C2E` |
|---|---|---|---|---|---|
| `label #FFF` | 21,00 | 17,01 | 13,94 | 12,76 | 10,61 |
| `label2 #AEAEB2` | 9,50 | 7,69 | 6,30 | 5,77 | 4,80 |
| `glassLabel2 #D1D1D6` | 13,80 | 11,18 | 9,16 | 8,39 | 6,98 |
| `textFaint #A1A1A6` | 8,16 | 6,61 | 5,42 | 4,96 | 4,13 (Grenzfall, vermeiden) |
| `label3 #8E8E93` | 6,44 | 5,22 | 4,27 ✘ | 3,91 ✘ | 3,26 ✘ |
| Inks (gelb/orange/türkis/grün/rot/blau/lila/indigo) | ≥ 7,4 | ≥ 6,0 | ≥ 4,92 | — | — |
| `redInk` / `blueInk` auf eigenem Soft über `#1C1C1E` | — | 4,61 / 4,57 | — | — | — |

**Glas** (Füllung über Hintergrund, inkl. `brightness(1.06)` hell / `.9` dunkel; unterer, schwächster Verlaufsstopp)

| Fläche (wirksame Tönung) | über Weiß | über `#F2F2F7` | über Grau `#808080` | über `#333333` | über Schwarz |
|---|---|---|---|---|---|
| Tab-Leiste hell (t .6): `label` | 21,0 | 21,0 | 10,24 | 5,50 | 3,39 |
| Tab-Leiste hell: `tabInk` auf Linse | 4,79 | 4,79 | 2,53 | 1,48 | — |
| Seitenleiste hell (t .5): `glassLabel2` | 11,35 | 11,35 | 5,25 | 2,66 | — |
| Desktop-Dialog hell (t .68, Scrim .22): `glassLabel2` | 9,01 | 8,51 | 4,73 | 2,95 | — |
| Menü hell (t .88): `redInk` („Ausblenden“) | 5,38 | 5,38 | 3,04 | 1,89 | — |
| Sheet mittel hell (Fläche 80 %): `label` / `glassLabel2` / `label2` | — | — | 15,24 / 8,24 / 4,61 | — | 11,78 / 6,36 / **3,56 ✘** |
| Glas dunkel (t .6): `label` | 3,10 ✘ | — | 7,78 | — | 18,77 |
| Sheet mittel dunkel: `label2 #AEAEB2` über Weiß | 4,37 ✘ | — | — | — | — |
| Sheet mittel dunkel: `glassLabel2` über Weiß | 6,35 ✔ | — | — | — | — |

**Folgerungen (Regeln):**
1. Auf **jeder Glasfläche** ersetzt `glassLabel2` den Sekundärtext (`--text-dim`/`label2`) – sonst 3,56:1 (hell) bzw. 4,37:1 (dunkel).
2. Im **Ruhezustand** liegt hinter Glas nur Seitenhintergrund oder helle Karte → alle Paare ≥ 4,5:1. Die Seitenleiste liegt
   nie über Inhalt (Inhalt beginnt rechts davon); die Tab-Leiste hat Inhalt nur beim Scrollen hinter sich.
3. Dunkle Medien (Kamerabild) unter heller Glas-Tab-Leiste sind **vorübergehend** erlaubt (Apple: Überschneidung nur beim
   Scrollen); Primärtext bleibt ≥ 3:1 über `#333`. Farbiger Text (Akzent, Rot) nur im Ruhezustand prüfen.
4. Abnahmetest (Plan §5.2) prüft Glas gegen **Weiß, `#F2F2F7` und `#808080`** (realistisch schlechtester Ruhe-Untergrund);
   Schwarz/`#333` nur als Information. Stärke „getönt“ und „deckend“ heben alle Werte an.
5. Klares Glas über Video (Fläche .20): Weiß über hellstem Bild 1,61:1 ✘; **mit 35 % Abdunklung** über Hellgrau `#C8C8C8`
   5,57:1 ✔, über reinem Weiß 3,71:1 (Glyphen ✔) → Verläufe oben/unten im Bild sind Pflicht (§3.6). Kopftext „Einfahrt“ über
   `imageTopStrong` (.7) ≈ 8,5:1.

### 2.6 Abbildung auf die bestehenden HAPulse-Namen

`applyAppearance` schreibt diese Werte in Glas inline auf `:root` (Plan §1.2); Klassisch setzt `applyTheme` sie zurück.
Stand der Umsetzung (Etappe 1, 2026-10-06): `--accent`, `--on-accent`, `--border` und `--radius-control` weichen von der
ersten Fassung ab, Gründe in [`glas/PLAN-ETAPPE-0-1.md`](glas/PLAN-ETAPPE-0-1.md) §1 (K6, K7, K14). Dieselben Werte stehen
in `glas-tokens.json → classicMapping`; `smoke.mjs` prüft sie gegen den Code.

| HAPulse-Token | Glas hell | Glas dunkel | Hinweis |
|---|---|---|---|
| `--bg` | `#F2F2F7` | `#000000` | |
| `--bg-raised` | `#FFFFFF` | `#1C1C1E` | Seitenleiste/Tab-Leiste/Sheets ersetzt Glas-CSS durch Material |
| `--bg-card` | `#FFFFFF` | `#1C1C1E` | Karten deckend, randlos |
| `--bg-card-hover` | `#F7F7FA` | `#2C2C2E` | |
| `--bg-subtle` | `rgba(120,120,128,.12)` | `rgba(120,120,128,.24)` | = `fill` |
| `--text` | `#000000` | `#FFFFFF` | |
| `--text-dim` | `#5F5F64` | `#AEAEB2` | auf Glas über Glas-CSS → `--g-glass-label-2` |
| `--text-faint` | `#636366` | `#A1A1A6` | **nicht** `#7C7C80` |
| `--accent` | `#A64B00` (bzw. `glasAccent(hue).accentInk`) | `#FFB340` | **Ink** (K6): Text, Symbole, Ränder, Fokus. Die Akzent-Flächen (Primärknöpfe, Schalter an — bis Etappe 5, dann iOS-Grün §7.28 —, Balken, Regler, Logo) setzen lokal `--accent: var(--g-prominent)` (`styles/glas/accent.css`) |
| `--accent-soft` | `rgba(255,149,0,.16)` | `rgba(255,159,10,.26)` | |
| `--on-accent` | `#FFFFFF` (5,79:1) | `#1C1C1E` | beste Schrift auf der Ink; auf den Akzent-Flächen `--g-on-prominent` (`#1C1C1E`); Schalter-Knöpfe nehmen in Glas immer `--g-knob` (Weiß) |
| `--line` | `rgba(60,60,67,.18)` | `rgba(84,84,88,.55)` | = `sep` |
| `--border` | `#E5E5EA` | `#3A3A3C` | = `fillSolid` (K14): Eingabefelder, Segmente, Spuren bleiben sichtbar; Karten randlos über `styles/glas/base.css` (Ränder, die einen Zustand zeigen, bleiben) |
| `--positive` (+`-soft`) | `#1F7A35` (`rgba(52,199,89,.16)`) | `#30D158` (`rgba(48,209,88,.20)`) | **Ink**, weil HAPulse es zu 54/63 als Textfarbe nutzt; Vollfarbe `--g-green` |
| `--warning` (+`-soft`) | `#7D5E00` (`rgba(255,204,0,.24)`) | `#FFD60A` (`rgba(255,214,10,.20)`) | Ink; Vollfarbe `--g-yellow` |
| `--danger` (+`-soft`) | `#D70015` (`rgba(255,59,48,.12)`) | `#FF6961` (`rgba(255,69,58,.22)`) | Ink; Vollfarbe `--g-red` |
| `--info` (+`-soft`) | `#0060DF` (`rgba(0,122,255,.12)`) | `#409CFF` (`rgba(10,132,255,.22)`) | Ink; Vollfarbe `--g-blue` |
| `--shadow-card` | `0 .5px 1px rgba(0,0,0,.04)` | `none` | Handy-Karten ohne Schatten (Glas-CSS) |
| `--shadow-elevated` | `0 1px 2px rgba(0,0,0,.08), 0 12px 32px rgba(0,0,0,.14)` | `0 1px 2px rgba(0,0,0,.3), 0 12px 32px rgba(0,0,0,.5)` | |
| `--shadow-active` | `0 1px 2px rgba(0,0,0,.04), 0 4px 14px rgba(0,0,0,.06)` | `none` | = `tileLift` |
| `--font-display/-body/-data` (CSS) | Systemschrift-Stack | | `--font-data` + `tabular-nums` |
| `--radius-card` / `--radius-control` / `--radius-pill` (CSS) | `26px` / `12px` / `999px` | | `--radius-control` trägt auch Kacheln und Panels; Kapseln je Baustein ab Etappe 2 (K7) |

**Neue `--g-*`-Variablen:** jeder Schlüssel aus `glas-tokens.json → color` als `--g-<kebab>` (z. B. `--g-yellow-ink`,
`--g-glass-label-2`, `--g-tile-off`, `--g-chart-solar-edge`), dazu `--g-glass-tint/-fill/-filter/-rim/-shadow/-glow`,
`--g-glass-clear-*`, `--g-sheet-fill/-filter/-solid/-large-shadow`, `--g-edge-blur`, `--g-scrim`,
`--g-state-{light,heat,cool,pool,ok,alarm,warn}` je `-ink`/`-soft`, `--g-switch-on/-off`, `--g-accent-ink`,
`--g-tab-ink`, `--g-prominent`, `--g-on-prominent`, `--g-focus`, `--g-lens`, `--g-seg`, `--g-seg-shadow`,
`--g-spring-{smooth,snappy,bouncy}`, `--g-d-{snappy,smooth,bouncy}`, `--g-card-head` (44 px), `--g-scroll`, `--gx/--gy`.

---

## 3. Glas (Material)

### 3.1 Wo Glas erlaubt ist – und wo nicht

| Erlaubt (Funktionsebene) | Verboten |
|---|---|
| Tab-Leiste (Handy), Seitenleiste (Desktop) | Inhaltskarten, Kacheln, Listenzeilen, Diagramme |
| Avatar-Kreis (Handy), Zurück-Knopf, Kopf-Kapseln Mitteilungen + Bearbeiten (Desktop) | Chips und Wetter-Pille (deckend `card`, nicht Glas) |
| Sheets (mittel), Desktop-Dialog, Inspector, Menüs, Popover, Toast (Desktop) | Seitenhintergrund (außer optionalem Wallpaper, später) |
| Steuerung über Kamerabild/Video (**clear**): Live-Kapsel der NVR-Karte, Kamera-Steuerkapsel, Ton, Zurück/Extern; Datum-Chip der Kameraseite (regular, über der Zeitleiste) | Glas **in** Glas (Knöpfe in der Tab-Leiste, Gruppen im Sheet bekommen Füllung, kein eigenes `backdrop-filter`) |

- **Höchstens 3 Glasflächen in Ruhe** (Handy: Tab-Leiste + Avatar [+ Zurück]; Desktop: Seitenleiste + Mitteilungen-Kapsel +
  Bearbeiten-Kapsel). Sheet/Menü kommt vorübergehend dazu, darunter liegt dann Scrim, kein weiteres Glas.
  Ausnahme Kameraseite: die clear-Steuerelemente über dem Video (Zurück, Extern, Steuerkapsel, Ton) zählen als eine
  Player-Steuerung (Skizze `g5h-kamera-d`); Tab- und Chip-Leiste sind dort aus.
- **Kein Glas auf Glas.** Elemente auf Glas: Füllung (`fill`, `lens`, `seg`), Transparenz, Farbe – nie `backdrop-filter`.
- Glas braucht Inhalt dahinter: Inhalt scrollt unter Tab-Leiste und Scroll-Kante durch (`padding-bottom` 132 px Handy).

### 3.2 Varianten: regular vs. clear

| | regular (Standard) | clear (nur über Bild/Video) |
|---|---|---|
| Einsatz | alles mit Text, alle Bars, Sheets, Menüs | Kamera-Steuerung, Live-Kapsel auf dem Kamerabild |
| Füllung hell | `linear-gradient(180deg, rgba(255,255,255,calc(.30 + .40*t)), rgba(255,255,255,calc(.14 + .40*t)))` | `rgba(0,0,0,.20)` |
| Füllung dunkel | `linear-gradient(180deg, rgba(40,40,44,calc(.30 + .40*t)), rgba(40,40,44,calc(.20 + .40*t)))` | `rgba(0,0,0,.20)` |
| Filter hell | `blur(calc(6px + 10px*t)) saturate(210%) brightness(1.06)` | `blur(4px) saturate(160%)` |
| Filter dunkel | `blur(calc(6px + 10px*t)) saturate(180%) brightness(.9)` | gleich |
| Glyphen | `label`, Sekundär `glassLabel2` | `onMedia` (Weiß) + `text-shadow 0 1px 2px rgba(0,0,0,.45)` |
| Abdunklung | — | **35 %** lokal hinter hellem Bild (Verläufe §3.6) |

`t` = `--g-glass-tint`. Regular und clear **nie mischen** (eine Steuergruppe ist entweder clear oder regular).
Ausnahme in der Skizze: der Datum-Chip auf der (dunklen) Kameraseite ist regular (t .55), weil er über der Zeitleiste
liegt, nicht über dem Video.

### 3.3 Rezept (verbindlich, Safari-tauglich, ohne SVG-Refraktion)

```css
.g-glass {                     /* :root[data-style='glas'] … davor */
  position: relative; isolation: isolate;
  background: var(--g-glass-fill);
  -webkit-backdrop-filter: var(--g-glass-filter); backdrop-filter: var(--g-glass-filter);
  box-shadow: var(--g-glass-shadow);
}
.g-glass::before {             /* spiegelnder Rand 1 px */
  content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none;
  background: var(--g-glass-rim);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
}
.g-glass::after {              /* Glanz ab Fingerpunkt */
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0;
  background: radial-gradient(120px circle at var(--gx, 50%) var(--gy, 50%), var(--g-glow), transparent 60%);
  transition: opacity 400ms ease-out;
}
.g-flex:active .g-glass::after, .g-glass.g-flex:active::after { opacity: 1; transition-duration: 120ms; }
```

| Teil | Hell | Dunkel |
|---|---|---|
| Rand (`rim`, 135°) | `rgba(255,255,255,.95) 0%, .35 22%, .06 50%, .30 78%, .85 100%` | `.55 0%, .2 22%, .04 50%, .17 78%, .5 100%` |
| Linse (Lensing-Andeutung) | `inset 1.5px 1.5px 1px -1px rgba(255,255,255,.6), inset -1.5px -1.5px 1px -1px rgba(255,255,255,.4)` | `.32` / `.2` |
| Dicke | `inset 0 1px 1.5px rgba(255,255,255,.75), inset 0 -1.5px 3px rgba(255,255,255,.22), inset 0 0 16px rgba(255,255,255,.18), inset 0 -12px 20px -14px rgba(0,0,0,.10)` | `inset 0 1px 1.5px rgba(255,255,255,.24), inset 0 0 16px rgba(255,255,255,.05)` |
| Kontur (iOS 27, dunkler Rand) | `0 0 0 .5px rgba(0,0,0,.10)` | `0 0 0 .5px rgba(0,0,0,.55)` |
| Schatten | `0 1px 2px rgba(0,0,0,.08), 0 12px 32px rgba(0,0,0,.14)` | `0 1px 2px rgba(0,0,0,.3), 0 12px 32px rgba(0,0,0,.5)` |
| Glanz (`glow`) | `rgba(255,255,255,.45)` | `rgba(255,255,255,.22)` |
| clear: Rand / Schatten | `rgba(255,255,255,.62) 0%, .2 24%, .04 50%, .18 76%, .52 100%` / `inset 1.5px 1.5px 1px -1px rgba(255,255,255,.35), inset 0 1px 1px rgba(255,255,255,.28), inset 0 0 12px rgba(255,255,255,.08), 0 0 0 .5px rgba(0,0,0,.25), 0 6px 20px rgba(0,0,0,.25)` | gleich |

**Flex (Druck):** `scale(var(--flex))` mit `spring-snappy` .35 s, Loslassen `spring-bouncy` .6 s; `--flex`: 1.02 Tab-Leiste,
1.04 Kapsel mit mehreren Knöpfen, 1.06 Standard, 1.08 Avatar/Datum/LIVE, 1.10 kleine Rundknöpfe. `--gx/--gy` in px aus
`pointerdown`. Skizze: Desktop baut den Rand über `border:1px transparent` + zweite Hintergrundebene und den Linsenglanz als
`::before` mit zwei `radial-gradient` (1,5 px) – gleichwertig; verbindlich ist die Struktur oben.

### 3.4 Stärke und Mindest-Tönung je Fläche

| Stärke (`data-glass`) | `--g-glass-tint` | Wirkung |
|---|---|---|
| **klar** (`clear`, Standard) | .25 | Blur 8,5 px; durchsichtig |
| **getönt** (`tinted`) | .75 | Blur 13,5 px; deutlich deckender |
| **deckend** (`opaque`) | — | Füllung `cardSolid`, kein Filter, kein Rand-Verlauf, Schatten `0 0 0 1px var(--g-sep-strong), 0 10px 30px rgba(0,0,0,.12)`; clear → `rgba(0,0,0,.72)` + `0 0 0 1px rgba(255,255,255,.35)`; Sheet → `sheetSolid`; `label2` → `#3A3A3C` / `#D1D1D6`; `sep` → `.36` / `rgba(84,84,88,.9)` |

**Wirksame Tönung = max(Fläche, Stärke)** (deckend ignoriert sie):

| Fläche | klar | getönt |
|---|---|---|
| Standard / Kopf-Kapseln Desktop | .25 | .75 |
| Tab-Leiste, Avatar-Kreis | .60 | .75 |
| Zurück-Knopf | .50 | .75 |
| Datum-Chip Kameraseite | .55 | .75 |
| Seitenleiste | .50 | .80 |
| Desktop-Dialog, Inspector, Toast (Desktop) | .68 | .85 |
| Menüs, Popover (Kontext, Avatar, Räume, Mitteilungen) | .88 | .94 |
| Sheet mittel (Handy) | ≥ .70, Fläche = `sheetFill` | |

**Sheet-Material (Handy, mittel; auch Kontext-/Avatar-Menü):** hell `linear-gradient(180deg, rgba(246,246,250,.86),
rgba(242,242,247,.80))` + `blur(28px) saturate(190%) brightness(1.04)`; dunkel `rgba(36,36,40,.86) → rgba(28,28,30,.80)` +
`blur(28px) saturate(170%) brightness(.9)`. Groß = `sheetSolid`, ohne Filter. Hinweis: 28 px liegt über dem Budget
≤ 16 px (Plan §5.5); erlaubt, weil vorübergehend und eine einzige Fläche – reißt das iPad-Budget, auf 16 px senken.

### 3.5 Scroll-Kante (statt harter Leiste)

| | Handy | Desktop |
|---|---|---|
| Höhe | 96 px | 104 px, beginnt an der rechten Kante der Seitenleiste |
| Fläche | `linear-gradient(var(--g-bg) 0%, transparent)` + `backdrop-filter: blur(10px)` | `linear-gradient(var(--g-edge-tint) 45%, transparent)` + `blur(12px)` |
| Maske | `linear-gradient(#000 45%, transparent)` | `linear-gradient(#000 55%, transparent)` |
| Einblenden | Deckkraft = min(y/40, 1) (scroll-gekoppelt) | ab `scrollY > 8` auf 1 (.25 s ease) |
| Titel | kleiner Titel 17/22 600, zentriert (top 8, Höhe 44, 72 px seitlich frei) | — (Kopf-Kapseln bleiben) |

Genau **eine** Kante pro Ansicht; keine Trennlinie, keine Abdunklung. Auf der Kameraseite keine Kante.

### 3.6 Medien: Verläufe und Abdunklung

| Ort | Verlauf |
|---|---|
| NVR-Karte oben (76 px) / unten (90 px) | `rgba(0,0,0,.35) → 0` / `0 → rgba(0,0,0,.6)` |
| Kamerabühne oben (104 px) / unten (120 px) | `rgba(0,0,0,.7) → 0` / `0 → rgba(0,0,0,.35) 50 %` |
| Desktop-NVR-Kachel unten (110 px) | `transparent → rgba(0,0,0,.5)` |

### 3.7 Barrierefreiheit und Fallbacks

| Auslöser | Wirkung |
|---|---|
| **„Transparenz reduzieren“** (App-Einstellung, GLOBAL, Admin – E2) | wie **deckend**; Scrims ohne Blur |
| `prefers-contrast: more` (pro Gerät, automatisch) | Glas deckend (`cardSolid`), Rand 1 px `label` (hell `#000`, dunkel `#FFF`), clear → `rgba(0,0,0,.72)` + `0 0 0 1px rgba(255,255,255,.7)`; `label2` → `#3A3A3C`/`#D1D1D6`; `sep` hell `.5`, stark `.7`; dunkel `.95` / `rgba(160,160,168,.9)`; Scroll-Kante ohne Blur |
| `prefers-reduced-transparency` | wie „Transparenz reduzieren“ – **nur Chromium**, Safari/iOS kennen die Abfrage nicht (deshalb der App-Schalter) |
| `forced-colors: active` | kein Glas, Systemfarben, Ränder sichtbar |
| `@supports not (backdrop-filter: blur(1px))` | deckend |
| `prefers-reduced-motion` | §6.4 |

**Safari-Grenzen:** `-webkit-backdrop-filter` **und** `backdrop-filter` immer zusammen; **keine** `backdrop-filter: url(#svg)`
(Refraktion nur Chromium; WebKit-PR offen); Maske mit `-webkit-mask-composite: xor` + `mask-composite: exclude`;
Backdrop-Root-Falle: kein Vorfahre eines Glas-Elements mit `opacity < 1`, `filter`, `mask`, `clip-path`,
`mix-blend-mode`, `backdrop-filter` oder `will-change` darauf – sonst sieht das Glas den Seitenhintergrund nicht;
`isolation: isolate` am Glas-Element gegen Artefakte mit `overflow: hidden` + Radius; `linear()` erst ab Safari 17.2 →
`cubic-bezier`-Rückfall (§6.1); nie den `backdrop-filter`-Wert animieren.

---

## 4. Typografie

### 4.1 Schrift

- Nur Systemschrift: `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", Roboto, sans-serif`
  (auf iPhone/iPad = SF Pro aus dem System, keine Datei ausliefern – Lizenz). Keine Webfonts in Glas (Fontsource lädt
  dann nichts).
- **Zahlen immer `font-variant-numeric: tabular-nums`** (in der Skizze auf der Wurzel gesetzt), **keine Monospace-Schrift**.
- `-webkit-font-smoothing: antialiased`. Tracking übernimmt Safari automatisch; nur die Large-Titles tragen `letter-spacing`.
- Zahlen weiter nur über `formatNumber` (deutsches Komma, `21,5 °C`).

### 4.2 Textstile (Größe/Zeilenhöhe px, Gewicht)

| Stil | Größe/Zeile | Gewicht | Tracking | Einsatz in Glas |
|---|---|---|---|---|
| Large Title | 34/41 | 700 | .37 px | Seitentitel, Begrüßung Desktop |
| Begrüßung Handy | 30/36 | 700 | .2 px | „Guten Morgen, Anna“ in einer Zeile bei 390 px |
| Title 1 | 28/34 | 700 | .2 px | Hauptraum-Name (Handy), Inspector-Zustand (.36 px), Tonnen-Countdown, Pool-Dauer |
| Title 2 | 22/28 | 700 (600 für Zahlen) | — | Detail-Zustand, Alarm-/Pool-Status, Klima-Soll (Handy) |
| Title 3 | 20/25 | 600 | — | Kartentitel über der Karte, Abschnittstitel in Sheets; Wortmarke 20/700 |
| Headline | 17/22 | 600 | — | Sheet-/Dialogtitel, betonte Zeilen, kleiner Scroll-Titel |
| Body | 17/22 | 400 | — | Listenzeilen, Menüs, Seitenleiste (aktiv 600) |
| Callout | 16/21 | 400 | — | selten |
| Subhead | 15/20 | 400 / 600 | — | Chips, Untertitel, Werte, Knopftext, Links |
| Footnote | 13/18 | 400 / 600 | — | Zustandszeilen, Legenden, Segment-Labels (600) |
| Caption 1 | 12/16 | 400 | — | Achsen, Raumzeile in Kacheln, Kennzahl-Labels |
| Caption 2 | 11/13 | 600 | — | Tab-Beschriftung; LIVE-Badge 11/13 700, .6 px |
| Kennzahl | 34/41 | 600 (Licht-% 700) | — | Energie, Klima-Soll Desktop, Licht-Prozent |
| Wetter groß | 48/54 | 700 | — | Wetter-Sheet (Desktop 48/52) |
| Ziffernblock | 30/36 Handy, 26/30 Desktop | 400 / 500 | — | Alarm-Code |

Mindestgröße 11 px. Hierarchie über Stufen und Gewicht, nicht über freie px-Werte.

### 4.3 Muster

- **Titel über der Karte:** Zeile min. 44 px (Handy) / 40 px (Desktop), Title 3, links ein **18-px-Symbol einfarbig**
  (`label2`, Strich 2), rechts optional Link Subhead mit Chevron. Abstand zur Karte 6 px (Handy) / 8 px (Desktop),
  Abstand zum vorigen Block 20 px. Umsetzung ohne Markup: Plan §2.13 (`--g-card-head` 44 px).
- **Satzschreibung** überall („Alle anzeigen“, „Energie heute“); keine Versalien, kein Tracking bei Abschnittsköpfen.
- Link-Farbe: Handy `label2`; Desktop `accentInk` mit Hover-Fläche (Skizze; Desktop-Links 15/500).
- Untertitel/Meta im Kartentitel (Desktop): Subhead 400 `label2` direkt hinter dem Titel („Geräte 4 an“).

---

## 5. Abstände, Raster, Radien, Trefferflächen

### 5.1 Raster

8-pt-Raster mit Feinstufen: **2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 40**.

| | Handy (< 900) | Desktop (≥ 900) |
|---|---|---|
| Seitenrand | 16 | links 28 ab Seitenleiste (Inhalt ab x = 12 + 260 + 28 = 300), rechts 32 (mit Inspector 452) |
| oben | 60 (mit Banner 120) | 92 (mit Banner 136) |
| unten | 132 (Inhalt läuft unter die Tab-Leiste) | 72 |
| Kachel-/Kartenabstand | 10 | Spalten 20, Zeilen 26 |
| Spalten Übersicht | 1 (Karten), Kacheln 2 | nach Inhaltsbreite: ≥ 1180 → 4, ≥ 900 → 3, sonst 2 (HAPulse: < 560 → 1) |
| Karten-Innenabstand | 16 (Hauptraum 18 16 16 20; Energie 6 16 16) | 16; Hauptraum 18 22; Energie 6 20 16; Listenkarten randlos, Zeilen 16–20 eingerückt |
| Chips | Höhe 44, Abstand 8, Reihe bis an den Rand (Rand −16, Innenabstand 16) | Höhe 44, Abstand 8 |

### 5.2 Radien (konzentrisch)

| Element | Radius |
|---|---|
| Inhaltskarte | 26 |
| Kachel (Szene, Gerät, Raum), Gruppe im Sheet | 22 |
| Sheet (mittel rundum, groß oben) | 40 |
| Desktop-Dialog / Inspector / Seitenleiste | 34 / 30 / 28 |
| Menü, Popover | 22 (Mitteilungs-Popover 26); Menüeintrag Desktop 14 |
| Desktop-Dialog-Gruppe | 18–20 |
| Thumbnail groß / klein | 16 / 12; NVR-Kachel Desktop 18 |
| Info-Blase (Energie) | 10 |
| Kapseln (Chips, Knöpfe, Segmente, Tab-Leiste) | halbe Höhe (`999px`); Tab-Leiste 31, Linse 27 |
| Licht-Regler | 32 (Handy 120 × 280), 28 (Desktop 104 × 232) |

**Regel:** innen = außen − Innenabstand (±2 px), sonst Kapsel. Beispiele: Tab-Leiste 31 − 4 = Linse 27; Segment 18 − 3 = 15;
Kamera-Tabs 20 − 3 = 17; Pool-Modus 22 − 3 = 19; Sheet 40 − 16 ≈ Gruppe 22. Nur drei Formtypen: fest, Kapsel, konzentrisch.

### 5.3 Trefferflächen

- **Min. 44 × 44 px** für alles Tippbare (sichtbar kleiner erlaubt: Schließen-Kreis 32 in 44, Energie-Segment 32 in 44,
  Avatar 40 in 44). Absolutes Minimum 28.
- Desktop-Skizze nutzt in Dialogen 40-px-Knöpfe und 36-px-Rundknöpfe → im Code **44 px Trefferfläche** (iPad ist Maßstab).
- Abstand um Elemente mit Fläche ≈ 12, ohne Fläche ≈ 24.
- `touch-action: manipulation` auf Bedienelementen; Langdruck-Ziele `-webkit-touch-callout: none; user-select: none`.

---

## 6. Bewegung

### 6.1 Federn

Verbindlich die Handy-Kurven (41 Stützpunkte, gedämpfte Feder). CSS: `--g-spring-*` + Dauer `--g-d-*`.

| Name | Dauer | Charakter | Dämpfung ζ | Rückfall ohne `linear()` |
|---|---|---|---|---|
| `smooth` | .5 s | kein Überschwingen | 0,995 | `cubic-bezier(.3,.6,.04,1)` |
| `snappy` | .35 s | ~4 % | 0,715 | `cubic-bezier(.34,.65,0,1.2)` |
| `bouncy` | .6 s | ~10 % | 0,595 | `cubic-bezier(.34,1.2,0,1.12)` |

```css
--g-spring-smooth: linear(0, 0.0263, 0.0895, 0.1722, 0.2626, 0.3534, 0.4399, 0.5197, 0.5916, 0.6551, 0.7104, 0.7581, 0.7988, 0.8334, 0.8624, 0.8868, 0.9071, 0.9239, 0.9379, 0.9494, 0.9588, 0.9665, 0.9729, 0.978, 0.9822, 0.9857, 0.9884, 0.9907, 0.9925, 0.994, 0.9952, 0.9961, 0.9969, 0.9975, 0.998, 0.9984, 0.9987, 0.999, 0.9992, 0.9993, 1);
--g-spring-snappy: linear(0, 0.0217, 0.0778, 0.1568, 0.2492, 0.3477, 0.4464, 0.5414, 0.6296, 0.7093, 0.7795, 0.8398, 0.8905, 0.932, 0.9651, 0.9908, 1.0099, 1.0234, 1.0323, 1.0375, 1.0398, 1.0398, 1.0381, 1.0354, 1.0319, 1.028, 1.0241, 1.0202, 1.0165, 1.0131, 1.0101, 1.0075, 1.0053, 1.0035, 1.002, 1.0008, 0.9999, 0.9993, 0.9989, 0.9986, 1);
--g-spring-bouncy: linear(0, 0.0371, 0.131, 0.2588, 0.4016, 0.5451, 0.679, 0.7967, 0.8947, 0.9716, 1.0283, 1.0667, 1.0892, 1.099, 1.099, 1.092, 1.0806, 1.0669, 1.0524, 1.0384, 1.0258, 1.015, 1.0063, 0.9997, 0.995, 0.992, 0.9904, 0.99, 0.9904, 0.9913, 0.9926, 0.9941, 0.9955, 0.9968, 0.998, 0.999, 0.9997, 1.0003, 1.0007, 1.0009, 1);
--g-d-snappy: .35s; --g-d-smooth: .5s; --g-d-bouncy: .6s;
```

Skizze: Desktop nutzt leicht andere Stützpunkte (max. Abweichung smooth 0,04 / snappy 0,13 / bouncy 0,07) – eine Kurve für beide.

### 6.2 Grundregeln

- Animiert werden nur `transform`, `opacity`, `filter` (am Element), `clip-path`, `border-radius`; Höhe nur beim Sheet-Detent.
  **Nie** `transition: all`, nie `backdrop-filter`.
- Jede Animation ist abbrechbar und folgt der Geste (Ziehen = 1:1 ohne Transition, Loslassen = Feder).
- Glas erscheint per **Materialisieren** (opacity 0, scale .92, blur 8 px → 1), nie per reinem Fade.
- Jeder Zustand ist im ersten Bild vollständig (kein Element bleibt mitten in der Animation stehen).

### 6.3 Interaktionen

| Interaktion | Bewegung |
|---|---|
| Druck Inhalt (Kachel, Karte, Chip, Knopf) | `scale(.97)` in 90–120 ms ease-out, zurück `smooth` .5 s |
| Druck Zeile | Hintergrund `fill` (150 ms); Hover Desktop `hover` |
| Druck Textlink | Deckkraft .55 |
| Druck Glas | Flex §3.3 + Glanz (120 ms ein, 400 ms aus) |
| Hover Kachel (Desktop) | `translateY(-1px)` + `cardHover`-Schatten, `smooth` .35 s |
| **Tab-Linse** | `translateX` `snappy` .35 s + Dehnung 420 ms ease-in-out (40 %: `scaleX(1.12) scaleY(.94)`); neues Symbol gefüllt + Pop `.9 → 1.15 → 1` 440 ms `cubic-bezier(.3,0,.2,1)` |
| **Tab-Leiste minimieren** | runter: ab y > Anker + 24 px → klein (`smooth` .5 s); hoch: y < Anker − 24 px oder y ≤ 40 → groß (`bouncy` .6 s); Beschriftungen blenden zuerst aus (120 ms); Gummiband (y < 0) ignorieren |
| **Großer Titel** | scroll-gekoppelt (y in 4-px-Schritten, max 64): Titel `opacity 1 − y/40`, `scale(1 − .05·min(y/48,1))` (Ursprung unten links); Wetterzeile/Untertitel `opacity 1 − y/28`; Kante `y/40`; kleiner Titel `opacity (y − 24)/28` + `translateY((1 − o)·6px)`; 120–160 ms linear |
| **Sheet öffnen (Morph)** | aus dem Rechteck des Auslösers: translate + scale, Radius `22/scale → 40`, `smooth` .5 s; Inhalt fade 240 ms ab 120 ms; Scrim fade 300 ms |
| Sheet öffnen ohne Ursprung | `translateY(calc(100% + 16px)) → 0`, `smooth` .5 s |
| **Sheet schließen** | zurück ins Rechteck 420 ms `smooth` (bis 70 % deckend, dann 0), Inhalt fade 140 ms; ohne Ursprung 360 ms `cubic-bezier(.4,0,1,1)`; nach Ziehen 320 ms gleiche Kurve; Scrim 320 ms ease-in |
| **Detent / Ziehen** | Höhe/Einzug/Radius `snappy` .35 s; Ziehen folgt 1:1; im großen Detent nach oben Gummiband ×0,2; Scrim-Deckkraft `1 − dy/500` |
| Sheet-Inhalt tauschen | 300 ms `smooth` (`translateY(10px)` + fade) |
| Gestapelte Seite (Bestätigung) | von rechts `translateX(100%) → 0` `smooth` .5 s; darunter −25 % + `brightness(.86)` |
| **Desktop-Dialog** | Fläche morpht aus dem Auslöser .52 s `smooth` (Radius `22/scale → 34`, Deckkraft voll ab 18 %); Inhalt ab 40 %; schließen .44 s `cubic-bezier(.32,.72,0,1)` |
| **Inspector** | `translateX(460px) → 0` .55 s `smooth`; raus .38 s, Deckkraft → .6 |
| Seitenleiste ein-/ausklappen | Breite 260 ↔ 72 `snappy` .55 s; Labels Deckkraft .2 s; Nav-Linse `translate` .45 s `snappy` + Dehnung `scale(.97, 1.16)` |
| **Kontextmenü** | Langdruck 550 ms; Vorschau `scale(1 → 1.04)` `bouncy` 420 ms + `liftContext`; Menü `scale(.6)` + blur 6 px → 1, `snappy` 420 ms, 40 ms später, Ursprung = Kachelmitte; zu: fade 180–260 ms |
| **Avatar-Menü** | wächst aus dem Avatar: `scale(.16,.3)` + blur 4 px → 1, `snappy` 460 ms, Ursprung `230px −28px`; Inhalt fade 200 ms ab 110 ms; zu 280 ms `cubic-bezier(.4,0,1,1)` |
| **Wischen** | Richtungsentscheid nach 8 px; folgt dem Finger; Loslassen `snappy` .35 s |
| **Toggle** | Kreisfarbe 300 ms + Puls `1 → 1.12 (35 %) → 1` .6–.7 s `bouncy` |
| **Szene aktivieren** | Ring-Sweep `stroke-dashoffset 126 → 0` 760 ms `cubic-bezier(.3,0,.2,1)`, am Ende ausblenden; Kachelfläche 350 ms |
| **Zahlen rollen** | neu von unten (70 %) + fade 380 ms `snappy`; alt nach oben 260 ms ease-in; Richtung nach Änderung (Thermostat, Licht-%, Klima) |
| Regler | Klick: Füllung `snappy` .35 s; Ziehen ohne Transition; Kapsel `scale(1.04)` beim Ziehen |
| Segment | Linse `snappy` .35 s (Desktop .4 s) |
| Schalter | Knopf `translateX(20px)` `snappy` .35 s; Spur 250 ms |
| Klima-Bogen | `stroke-dashoffset` `bouncy` .6 s (Desktop `dasharray` `smooth` .6 s); Farbe 350 ms |
| Rollladen-Bogen | 1,4 s `cubic-bezier(.4,0,.2,1)` (zeigt die Fahrt) |
| **Energie-Balken** | `scaleY(0 → 1)` .6 s `bouncy`, Versatz i × 14 / 40 / 9 ms (Tag/Woche/Monat), beim ersten Anzeigen und je Zeitraumwechsel; Kennzahl `translateY(6px)` + fade .45 s `smooth`; Blase `scale(.88 → 1)` .3 s `snappy`, Position .35 s `snappy` |
| Bildschirm-Eintritt | Abschnitte `translateY(8px)` + fade 420 ms `smooth`, 25 ms versetzt, max. 6 Stufen |
| Tab-Wechsel | Überblendung 160 ms + 6 px Anstieg |
| Kamera öffnen | Bild aus der Kachel zur Bühne 540 ms `smooth` (`clip-path: inset(… round …)`), zurück 480 ms |
| Bearbeiten | Badges `scale(.2 → 1)` .5 s `bouncy`, versetzt; Desktop „Bearbeiten“ (Glas, → `scale(.7,1)` + blur 6 px + fade) ↔ „Fertig“ (prominent, `scale(1.4,1) → 1` .55 s `snappy`); **kein Wackeln** |
| Code falsch | Schütteln 420 ms (−10 / 9 / −6 / 4 px) |
| Live-Punkt | Deckkraft 1 → .35 → 1, 2 s, unendlich |
| Toast | `translateY(16px) scale(.96)` → 1, 420 ms `snappy` (Desktop .5 s + blur 6 px) |

### 6.4 Reduzierte Bewegung (`prefers-reduced-motion: reduce`)

| Normal | Reduziert |
|---|---|
| jede Bewegung (Morph, Slide, Push, Zoom, Inspector) | Überblendung 200 ms ease |
| Druck-Skalieren, Glas-Flex | kein Skalieren, Deckkraft .6 |
| Puls, Sweep, Dehnung, Pop, Anheben, Schütteln, Live-Punkt | entfällt |
| Balken wachsen, Ziffern rollen | Fade 200 ms |
| Tab-Leiste minimieren | Zustandswechsel ohne Animation |
| Exit-Animationen | `fade-out` 200 ms |
| erlaubt | Farbübergänge (`background-color`, `color`, `box-shadow`, `stroke`) 200 ms |

---

## 7. Komponenten-Katalog

Notation: Maße in px; „Skizze H/D“ = Handy/Desktop. Gemeinsame Zustände (gelten für alle, sofern nicht anders genannt):

| Zustand | Regel |
|---|---|
| default | wie beschrieben |
| pressed | §6.3 (Inhalt .97, Zeile `fill`, Glas Flex + Glanz, Link .55) |
| hover (nur Desktop/Zeiger) | Zeilen/Links `hover`, Kacheln −1 px + `cardHover`, Nav-Einträge `hover` (nicht der aktive) |
| active/selected | Akzent nur als Auswahl (Linse, Häkchen `accentInk`, aktiver Tab `tabInk`); Zustandsfarbe für „an“ |
| focus-visible | `outline: 2px solid var(--g-focus)` (= `accentInk`), `outline-offset: 2px` |
| disabled | Deckkraft .4 (Knöpfe) bzw. .35 (Klima aus), kein Druckeffekt, `aria-disabled`/`disabled` |
| loading | Wert „–“, Knopf zeigt Ring-Spinner 16–20 px (`label2`, 1 s linear) statt separatem Spinner; Banner-Symbol dreht |
| empty | HAPulse-Leerzustand im Glas-Look (§7.31) |

### 7.1 Tab-Leiste (Handy)

- **Anatomie:** schwebende Glas-Kapsel, `left 16`, `bottom 22` (+ `env(safe-area-inset-bottom)`), Breite = Viewport − 32
  (358 bei 390), Höhe 62, Radius 31, Tönung ≥ .6, Innenabstand 4. Fünf Einträge (je flex 1, Höhe 54, Radius 27):
  Symbol 24 (Strich 1,75), Abstand 2, Beschriftung Caption 2 (11/13 600). Linse 70 × 54, Radius 27, `lens`.
- **Inhalt:** erste vier sichtbaren Nav-Einträge in Nutzer-Reihenfolge + Mehr (≤ 5 → alle). „Räume“ und „Mehr“ öffnen Sheets
  (`aria-haspopup="dialog"`).
- **Zustände:** aktiv = `tabInk` + gefülltes Symbol (`fill: currentColor`, Detail-Punkte mit `stroke: var(--g-bg)`) +
  Linse; inaktiv = `label`. **Minimiert:** Glasfläche `scale(.1453, .8387)` mit Ursprung unten links (→ 52 × 52 Kreis),
  Radius `179px / 31px` (kompensiert), aktives Symbol wandert in den Kreis (`translate(26 − cx, 12.5px)`), übrige
  `opacity 0` + `scale(.5)`, Beschriftungen aus; unsichtbarer 52-px-Knopf „Tab-Leiste einblenden“; `--flex 1.1`.
  **Versteckt** (Sheet, Kontextmenü, Kamera): `translateY(14px) scale(.94)`, Glas fade + blur 8 px.
- **Hell/Dunkel:** Glas regular; Linse `rgba(120,120,128,.16)` / `rgba(255,255,255,.14)`.
- **A11y:** `<nav aria-label="Hauptnavigation">`, `aria-current="page"`, Tab-Reihenfolge bleibt; minimiert nur der
  Einblenden-Knopf fokussierbar.

### 7.2 Seitenleiste (Desktop ≥ 900)

- **Anatomie:** Glas-Panel `left/top/bottom 12`, Breite 260 (Leiste 72), Radius 28, Innenabstand 12, Tönung .5.
  Kopf 48: PulseLogo-Kachel (Akzent) + „HAPulse“ 20/25 700 (.2 px). Gruppenköpfe 13/18 600 `glassLabel2`
  (Höhe 26 erste, 34 weitere; Text unten bündig, Einzug 12). Einträge 40 hoch, Kapsel, Innenabstand 0 12 0 13, Abstand 12,
  Symbol 20 + Body 17 (aktiv 600), Abstand zwischen Einträgen 2. Linse 40 hoch `lens`.
- **Gruppen (fest, E10):** Zuhause (Übersicht, Räume, Szenen, Automationen) · Bereiche (NVR, Pool, Sicherheit, Energie,
  Musik, Geräte) · System (System, Einstellungen); Reihenfolge innerhalb = Nutzer-Reihenfolge; im Bearbeiten-Modus flache
  Liste wie HAPulse.
- **Status-Pille (unten):** min. 52, Radius 18, `fill`; Kreis 26 in Zustandsfarbe mit Glyphe `glyphDark` (OK: Grün +
  Haken; unbekannt: `label3` + ?); Titel 15/19 600 („Alle Systeme normal“ / „N nicht verfügbar“ …), darunter
  „Heimstatus“ 12/16 `glassLabel2` → System. Darunter Einklapp-Knopf 44 × 36, Chevron `glassLabel2`.
- **Räume** hat Chevron und öffnet ein Glas-Popover (280 breit, Tönung .88, Einträge 44, Radius 14, Symbol + Name 17 + ›).
- **Zustände:** aktiv = Linse + Symbol `accentInk` + 600; inaktiv Symbol `glassLabel2`; hover `hover`; eingeklappt =
  Breite 72, Beschriftungen Deckkraft 0, Gruppenköpfe werden 0,5-px-Trennlinien, `title`-Tooltips; Bearbeiten = Auge-Knopf
  32 (`fill`) rechts, Übersicht/Einstellungen ohne Auge, ausgeblendete Einträge .4.
- **A11y:** `aria-current`, `aria-expanded` am Einklapp-Knopf, Popover `role="menu"` mit Pfeiltasten/Esc.
- Hinweis: iOS 27 färbt Sidebar-Symbole wieder im Akzent – Glas bleibt bewusst einfarbig (D30), nur der aktive Eintrag trägt Akzent.

### 7.3 Kopf Desktop

- **Anatomie:** `top 16`, Höhe 56, von Inhaltsrand links bis `padR`, Abstand 10, Reihenfolge:
  [Zurück 48 Glas-Kreis – nur Raumseiten] · **Chips** (flex, horizontal scrollbar, Maske weich an den Rändern, rechts
  „›“-Knopf 36, `card` + Schatten `0 1px 3px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.08)`) · **Wetter-Pille** (44, Kapsel,
  `card` + `card`-Schatten, Symbol + „14 °C“ 600 + Zustand `label2`, 15/20) · **[Mitteilungen]** Glas-Kapsel 48
  (Innenabstand 2) mit Glocken-Knopf 44 + Badge (min. 18, `#D70015`, Weiß 11/18 700, „9+“) · **[Bearbeiten]** Glas-Kapsel
  124 × 48, Text 17/22 500 ↔ „Fertig“ 92 × 48 prominent (17/22 600, Schatten `0 6px 16px rgba(0,0,0,.16)`) ·
  **Avatar** 44 (Kreis 40, `accentSoft`, Initiale 17/22 600 `label`) → Einstellungen bzw. SaaS-Kontomenü.
- **Regel:** Chips und Wetter sind **deckend** (Inhalt), nur Mitteilungen und Bearbeiten sind Glas; Avatar ohne Hintergrund-Glas.
  Kopf auf **jeder** Seite; Bearbeiten nur auf Seiten mit Bearbeiten-Modus.
- **Mitteilungs-Popover:** 392 breit, `top 78`, rechtsbündig unter der Glocke, Radius 26, Tönung .88, Innenabstand 8; Kopf
  „Benachrichtigungen“ 17/600 + „Alle schließen“ (`accentInk`); Einträge Radius 18, Symbol-Kachel 30 (Radius 9, Soft +
  Ink), Titel 15/600, Text 13 `label2`, Zeit 12; × 36 (Kreis 26 `fill`); Wischen → Verwerfen; Hinweis 12 `glassLabel2`.

### 7.4 Kopf Handy

- **Begrüßung:** h1 30/36 700 (.2 px), eine Zeile; darunter **Wetterzeile** als Knopf (min. 44, Rand −6 0): Wettersymbol +
  „14 °C · teilweise bewölkt“ 17/22 `label2` + Chevron → Wetter-Sheet. Danach Chips (Abstand 14), Hinweise, Rest.
- **Avatar:** Knopf 44 (`top 8`, `right 14`), Glas-Kreis 40 (Tönung .6), Initiale 17/22 600; **roter Punkt** 11 × 11
  `#D70015` mit 2-px-Ring in `bg` (`top 4`, `right 4`) bei Mitteilungen.
- **Avatar-Menü:** Glas-Menü 250 breit, `top 58`, `right 16`, Radius 22, `sheetFill`, Einträge min. 48, Body 17, Symbol
  rechts, Trennlinien ab 16: „Mitteilungen (3)“ → Mitteilungs-Sheet · „Bearbeiten“ (nur wer darf; im Modus „Bearbeiten
  beenden“ + Haken) · „Einstellungen“ (bzw. SaaS-Kontomenü). Hintergrund `avDim` (.10 / .36) + `blur(10px) saturate(120%)`.
- **Bearbeiten an:** zusätzlich Kapsel „Fertig“ 40 hoch (Innenabstand 0 16, 17/22 600, prominent) links neben dem Avatar
  (`right 66`), erscheint per Materialisieren.
- **Zurück** (nur geschobene Seiten): Glas-Kreis 44 `top 8`, `left 16`, Tönung .5.
- **A11y:** Avatar `aria-haspopup="menu"`, `aria-expanded`, Label „Konto Anna, 3 neue Mitteilungen. Menü öffnen“.

### 7.5 Chips (Status, 8 Stück in HAPulse-Reihenfolge)

Personen · Licht · Türen & Fenster · Garage · Schlösser · Alarm · Pool · Medien – jeder öffnet sein HAPulse-Modal als Sheet/Dialog.

- **Anatomie:** Kapsel 44, Radius 22, `card` (Desktop + `card`-Schatten), Subhead 15/20, Abstand Symbol–Text 8,
  Innenabstand 0 16 0 13 (Personen 0 16 0 9). Symbol 18 (Strich 2), Desktop 19. Personen: drei Monogramm-Kreise 26
  (`fill2`, 12/16 600, Ring 2 in `card`, Überlappung −7) vor (Handy) bzw. hinter dem Text (Desktop, 11/13 700).
- **Farbe nur an der Glyphe (D29):** an → Ink des Zustands (Licht `yellowInk`, Türen/Fenster offen `warnInk`, Garage/
  Schloss offen `redInk`, Alarm scharf `greenInk`, Pool läuft `tealInk`, Medien spielen `blueInk`), Licht-Glühbirne zusätzlich
  gelb gefüllt; aus → `label2`. Text: Warnung (offen) 600 `label`; an `label`; aus `label2`.
- **Bearbeiten (Desktop):** Auge-Badge 26 (`fillSolid`, Schatten `0 1px 4px rgba(0,0,0,.18)`) oben rechts (−6/−6); ausgeblendet .4.
- **A11y:** Liste `role="list"`, `aria-label="Licht: 5 an"`.

### 7.6 Hinweise (neu, nur Abweichungen)

- **Handy:** Abschnitt „Hinweise“ (Titelzeile wie §4.3, Glocke einfarbig), Listenkarte Radius 26; Zeile min. 60, Symbol
  24 (Spalte, Abstand 16), Titel 17 + Unterzeile 15 `label2`, Chevron `label3`; Trennlinie ab Textbeginn.
- **Desktop:** Reihe unter der Begrüßung (Abstand 20): Label „Hinweise“ 15/600 `label2`, dann Kapseln 52 hoch (`card` +
  Schatten, Innenabstand 0 14 0 16, Abstand 12): Symbol 20 + Titel 15/600 + Unterzeile 13 `label2` + Chevron 14.
- **Farbe:** Symbole einfarbig `label2`; nur **kritisch** (Garage offen, Schloss offen, Alarm ausgelöst, Wasser/Rauch) mit `redInk`.
- **Inhalt/Logik:** Plan §2.11 (Tabelle der Arten, Tür ≥ 10 min); leer → **keine** Karte; Tipp öffnet das passende Sheet
  („Tippen zum Schließen“). Beispiel: „2 Fenster offen · Schlafzimmer, Bad“, „Restmüll morgen · Di., 7. Okt.“.

### 7.7 Szenen-Kachel

- **Handy:** Raster 2 Spalten, Abstand 10; Kachel 64 hoch, Radius 22, Innenabstand 0 10 0 14, Abstand 10; Kreis 36 +
  Name 15/20 600 (eine Zeile, Ellipse) + bei aktiv „Aktiv“ 13/18 400 `label2`.
- **Desktop:** 2 Spalten (S) bzw. 4 (M/L); Kachel min. 116, zentriert senkrecht, Abstand 6: Kreis 40, Name 15/20 600,
  Untertitel 12/16 („Aktiv“ 600 `label` bzw. „6 Geräte“ `label2`).
- **Zustände:** **aktiv** = Fläche `tileOn` + `tileLift` (Desktop `tileOnDesktop`), Kreis in Vollfarbe der Szene mit Glyphe
  (`glyphDark` auf Gelb/Orange, Weiß auf Lila/Indigo), **Ring** 46 × 46 (r 20, Strich 2,5, `dasharray 126`) in Szenenfarbe,
  `aria-pressed="true"`; **inaktiv** = `tileOff`, Kreis `fill` mit Ink-Glyphe (≥ 3:1 – nie helles Lila/Grau).
- **Interaktion:** Tipp aktiviert (Sweep + Puls), Langdruck → Kontextmenü (Aktivieren, Details, Aus Favoriten, Raum öffnen,
  Ausblenden). Kopf-Link „Alle Szenen ›“; Leerzustand wie HAPulse.

### 7.8 Hauptraum-Karte

Automatisch aktivster Raum (Licht ×10, Medien ×5, Bewegung ×3). **Immer schlicht** – kein Verlauf, kein Raumbild (E8).

- **Handy:** Karte Radius 26, Innenabstand 18 16 16 20; ganze Karte = Knopf „Raum öffnen“. Oben links Name 28/34 700 +
  „Hauptraum · 23 Geräte“ 15/20 `label2`; oben rechts Glance-Kapseln 32 hoch (Radius 16, `fill`, 15/20 600, Symbol +
  „21,5 °C“ / „48 %“) → Detail des Sensors. Steuerzeile (Abstand 20, Abstand 8): **Licht-Pille** 44 (an: Gelb +
  `glyphDark`, „Licht 3 an“; aus: `fill`), **Thermostat-Kapsel** flex 44 (`fill`, − / + je 38 × 44, Sollwert 15/20 600 in
  Heiz-Ink, rollend), **Medien** 44 rund (`fill`, Glyphe `blueInk`, nur beim Abspielen), **›** 44 rund → Raum.
- **Desktop:** Titel „Wohnzimmer“ über der Karte; in der Karte Zeile „Hauptraum · 23 Geräte · 3 Lichter an“ 15 `label2` +
  Glance-Kapseln 36; **Lichtkreise** des Raums (5 Spalten M, 3 S): Trefferfläche 56, Kreis 48 (an Gelb + Glyphe
  `glyphDark` + Glow `0 4px 14px rgba(255,204,0,.35)`; aus `fill`/`label2`), darunter Name 15/600 + Zustand 13 → Detail;
  Steuerzeile: Licht-Pille 48 (Kreis 34 + „Licht“ 600 + „3 an“ `label2`), Klima-Kapsel 48 (Kreis 34 Heizen in Orange,
  Wert 17/22 600 rollend, − / + 36 auf `seg`), Medien-Pille 48 (`blueSoft`, Kreis 34 Blau, „Wiedergabe“, nur beim
  Abspielen), › 44.

### 7.9 Energie-Karte (exakt nach finaler Skizze, `g5e-*`)

- **Kopf:** „Energie heute“ + „Details ›“. Karte Innenabstand 6 16 16 (Desktop 6 20 16), `tabular-nums`.
- **Segment Tag | Woche | Monat:** Trefferfläche 44, sichtbare Spur 32 (`fill`, Radius 16, oben/unten 6 frei), Linse 28 hoch
  (Radius 14, `seg` + `segShadow`, Breite (100 % − 4)/3, gleitet `snappy`), Labels 13/18 600 `label`; `role="radiogroup"`.
- **Kennzahl (Apple Health):** Label 13/18 600 `label2` („Verbrauch heute“ / „Verbrauch, letzte 7 Tage“ / „… 30 Tage“);
  Zahl 34/41 600 + „kWh“ 17/22 600 `label2`; Zeile 15/20: Sonne (Solar-Ink) + „12,1 kWh“ 600 + „PV-Ertrag“ `label2`;
  Vergleich 13/18 `label2` („−12 % ggü. gestern“).
- **Diagramm:** Höhe 132 (Desktop flex, min. 124, max. 210), Abstand oben 22; Achse **rechts** (40 breit, 44 reserviert),
  Achswerte 12/16 `label2` (Tag 0 / 1 / 2 kWh, Woche/Monat 0 / 10 / 20 kWh; oberster mit Einheit); Raster: Grundlinie
  durchgezogen `sepStrong`, übrige gestrichelt (2 px Strich, 3 px Lücke); **Ø-Linie** gestrichelt (4/3) in `label` mit
  Deckkraft .7, Label „Ø“ 12/16 600 rechts; Achswert in < 10 % Abstand zur Ø-Linie ausblenden.
- **Balken:** gestapelt, **Netz unten `chartNetz`**, **Solar oben `chartSolar`** + hell `inset 0 0 0 1px #A67C00`, Fuge
  1,5 px zwischen beiden; nur oben gerundet. Je Zeitraum: Tag 24 Spalten, max. 14 breit, Radius 4, Abstand 3; Woche 7, max. 26,
  Radius 6, Abstand 4; Monat 30, max. 10, Radius 3, Abstand 3. Mindesthöhe 1,5 %. **Zukunft:** 3-px-Stummel `fill`.
  X-Achse 12/16 `label2` (Tag „0 · 6 · 12 · 18 Uhr“, Woche Wochentage zentriert, „Heute“, Monat Datumsmarken).
- **Info-Blase:** Tipp (bzw. Hover mit Maus) auf Balken → übrige Balken Deckkraft .35, senkrechte Linie 1 px `sepStrong`
  vom Balken bis 30 px unter Oberkante, Blase oben (`top −16`, Innenabstand 5 10, Radius 10, `card2`): Zeitraum 12/16 `label2`
  („14–15 Uhr“), Wert 15/20 600 „1,2 kWh“ + „ · 0,8 Solar“ 13 `label2`; horizontal geklemmt auf 82 px vom Rand. Erneuter
  Tipp oder Esc schließt.
- **Legende** (Abstand 12, 13/18 `label2`): Punkt 8 Netz, Punkt 8 Solar (mit Rand hell), rechts „Ø 0,5 kWh je Std.“.
- **A11y:** Balkengruppe mit Gesamtbeschreibung; ein Balken im Tab-Fokus, Pfeile ←/→, Pos1/Ende, Esc; jeder Balken
  `aria-label` „14–15 Uhr (läuft noch): 1,2 kWh, davon 0,8 kWh Solar“, `aria-pressed`.
- **Leer/nicht eingerichtet:** HAPulse-Einrichtungs-Hinweis bleibt (Leerzustand §7.31).

### 7.10 Geräte (aktive Favoriten)

- **Handy – Kachel (Home-App):** 2 Spalten, Abstand 10; Kachel 76 hoch, Radius 22, Innenabstand links 6. Links
  Schaltfläche 44 mit Kreis 36 (an: Gelb + `glyphDark`; aus: `fill` + `label2`) = **Schalten**; rechts Textknopf
  (Innenabstand 0 10 0 6): Raum 12/16 `label2`, Name 15/20 600 (an `label`, aus `label2`), Zustand 13/18 `label2`
  („An · 80 %“) = **Detail**. Fläche an `tileOn` + `tileLift`, aus `tileOff`.
- **Desktop – Zeile mit Schalter:** Liste in der Karte (Innenabstand 6 0), 1 Spalte (S) / 2 (M/L); Zeile min. 60:
  Einzug 16, Kreis 36 (Spalte 50), Name 17/22 (an `label`, aus `label2`), Unterzeile 13 „Wohnzimmer · An · 80 %“;
  **Schalter** rechts (Trefferfläche 64 × 44, `right 12`) – Zeile = Detail/Inspector, Schalter = Umschalten (Klick stoppt
  Weitergabe). Trennlinie oben ab 66.
- **Zustände:** Puls beim Umschalten; Langdruck 550 ms → Kontextmenü; „aus“ bleibt in der Sitzung sichtbar (keptOff).
  Zwei Leerzustände wie HAPulse („Alle deine Favoriten sind gerade aus.“ / Anleitung Stern).
- Kopf: „Geräte“ + Meta „4 an“ (Desktop) + „Alle Geräte ›“.

### 7.11 Klima-Karte

- **Handy:** Karte (Listenkarte, overflow hidden). Oben (Innenabstand 16 16 14, Abstand 16): **Bogen** 116 × 116
  (r 48, Strich 10, 270°, `dasharray 226.2 301.6`, `rotate(135°)`; Spur `fill`, Bogen in Aktionsfarbe: Heizen Orange,
  Auto Grün, Leerlauf/Aus `label3`), Mitte Sollwert 22/28 600 (rollend) + „Soll“ 13 `label2`. Rechts: Raum 17/22 600,
  „Aktuell 21,5 °C“ 15 `label2`, Aktionszeile 15/20 600 in Aktions-Ink mit Kreis 22 (`orangeSoft` …), darunter − / + 44
  (`fill`). Darunter **Raumliste** (`role="radiogroup"`): Zeilen min. 48, Einzug 16, Trennlinie oben, Name (gewählt 600),
  Wert `label2`, Häkchen 18 `accentInk` (nur gewählt sichtbar).
- **Desktop:** Bogen 168 × 150 (r 70, Strich 12, 270°, Spur `fill2`), **Ist-Markierung** 12 (Ring 2 px `label` auf `card`)
  auf dem Bogen; Mitte Soll 34/41 600 + Aktion 13/600 Ink; − / + 44 links/rechts unten außen (−56). Liste `role="listbox"`:
  Zeilen min. 46, Einzug 20, Name 17 (gewählt 600), Aktion 13/600 Ink nur bei Heizen/Kühlen, Temperatur 17 `label2`, Häkchen.
- **Link** „Alle anzeigen ›“ → Sheet/Dialog mit allen Thermostaten (Karte je Raum: Name, Aktion mit Punkt, Ist 22/28 700,
  Soll-Kapsel 40 mit − / +, Modus-Pillen Heizen/Auto/Aus 36 – gewählt `accentSoft` + `accentInk` + Ring 1,5 px Akzent;
  Desktop als Symbolknöpfe in Zustandsfarbe). Schrittweite/min/max wie HAPulse.

### 7.12 Rollläden-Karte

- **Handy:** wie Klima: Bogen 116 (Strich `label2`, Wert „35 %“ 22/28 600 + „geschlossen“ 13), Raum 17/600, Zustand 15
  `label2` („Teilweise“, „In Bewegung“), Knöpfe **Zu / Stopp / Auf** 44 (`fill`), Raumliste mit Häkchen.
- **Desktop:** je Raum eine Zeile min. 64 (Einzug 20): Name 17, Positionsbalken 6 hoch (max. 120, Spur `fill2`, Füllung
  `label3`) + Zustand 13; rechts Kapsel 44 (`fill`) mit drei Knöpfen 40 (Auf / Stopp / Zu); unten „Alle öffnen“ /
  „Alle schließen“ 44 (`fill`, 15/600).
- Garagentore sind ausgeschlossen. Link „Alle anzeigen ›“ → Sheet (Karte je Abdeckung: Mini-Rollo 40 Radius 12 mit Lamellen,
  Name, Raum, Position 15/600, Knöpfe 40).

### 7.13 Sicherheit-Liste

- **Inhalt (7 Zeilen):** Alarm, Schlösser, Garage, Fenster, Türen, Bewegung, Kameras – jede Zeile öffnet ihr Sheet/Ziel.
- **Handy:** Listenkarte; Zeile min. 52, Symbol 22 (Spalte 24, Abstand 16), Titel 17, Wert rechts, Chevron `label3`.
  Normal: Symbol und Wert `label2`; **Warnung** (Fenster offen, wird scharf): Warn-Symbol, Wert `warnInk` 600;
  **Alarm** (Schloss/Tor offen): Symbol + Wert `redInk` 600. Alles OK → Fußnote „Alle Sensoren normal“ 13 `label2`.
- **Desktop:** Zeile min. 48, Symbol-Spalte 36, Titel 17, Wert 15; Problemzeilen mit Fläche `redSoft`/`yellowSoft` und
  ohne Trennlinien daneben; Symbol/Wert in Ink.
- Link „Details ›“ → Sicherheit.

### 7.14 Müll-Karte

- **Handy:** Listenkarte; Zeile min. 60: Tonnenpunkt 14 (Tonnenfarbe, Ring `inset 0 0 0 .5px sep`) in Spalte 24 + 16,
  Name 17 (nächste 600) + Datum 15 `label2`, rechts Countdown (nächste `label` 600, sonst `label2`), Chevron. Nächste Tonne
  zuerst.
- **Desktop:** erste Zeile betont (min. 64): „Als Nächstes“ 13 `label2` + Name 17/600, rechts Countdown 17/600
  `orangeInk` + Datum 13; weitere Zeilen min. 52, Punkt 12, Name 17, Countdown 15 + Datum 13 `label2`.
- **Tonnen-Sheet:** Kopf-Gruppe (Kachel 56 Radius 18 in Tonnen-Soft + Ink, Countdown 28/34 700 – heute/morgen `warnInk`
  –, Datum 15), „Nächste Termine“ (Liste min. 48, Datum + „ (verlegt)“ 600 `warnInk`, Countdown `label2`).

### 7.15 NVR-Karte (Sentinel)

- **Handy:** Kamerabild 220 hoch, Radius 26, `object-fit: cover`, Verläufe oben/unten (§3.6); oben links **clear**-Kapsel
  32 hoch (Radius 16, Innenabstand 0 14 0 12): Live-Punkt 8 (pulsierend) + „Einfahrt · Live“ 15/600 Weiß; unten links
  „63 heute · vor 19 Min.“ 15/600 Weiß mit Textschatten. Tipp → Kameraseite (Zoom aus der Kachel). Darunter
  **Ereignisse** horizontal (Abstand 10, bis zum Rand): Karte 150 breit, Bild 150 × 112 Radius 16, Zeit 15/600,
  Klasse 13 `label2` → Kamera **an diesem Moment**.
- **Desktop:** Raster `1.65fr / 1fr` (M) bzw. 1 Spalte (S), Abstand 16; Kachel 16:10, Radius 18, unterer Verlauf 110:
  „Einfahrt“ 20/25 700 + LIVE-Badge (20 hoch, `#D70015`, 12/20 700, .4 px) + „63 heute · vor 19 Min.“ 15; Ereigniszeilen
  (Innenabstand 4, Radius 16): Bild 92 × 69 Radius 12, Zeit 17/600, „Fahrzeug · vor 19 Min.“ 13 `label2`.
- Link „Alle anzeigen ›“ → NVR. Offline/Fallback/REC wie HAPulse (Inventar J).

### 7.16 Aktivität

- **Handy:** Listenkarte, **ohne Farbsymbole**; Zeile min. 60 (Innenabstand 8 16 8 0, Einzug 16): Titel 17 (eine Zeile) +
  Unterzeile 15 `label2`, Zeit 15 `label2` rechts.
- **Desktop:** Zeile min. 56, Symbol einfarbig `label2` (Spalte 36), Titel 15/600, Unterzeile 13, Zeit 15 `label2`;
  Zeile → Detail/Inspector.
- Fünf Zeilen, „Details ›“.

### 7.17 Räume-Kacheln

- **Handy:** 2 Spalten, Abstand 10; Kachel min. 96, Radius 22, Innenabstand 13 12 12 16, `card`; oben Name 17/22 600;
  unten Statuskreis 26 + zwei Zeilen 13/18: „21,5° · 48 %“ `label2` und Lichtzeile („Licht 3 an“; Statuszeile 600 `label`).
- **Desktop:** `auto-fill minmax(208px, 1fr)`, Abstand 10; Kachel min. 76, Radius 22, Innenabstand 10 14, `card2`
  (an/Status: `tileOn` + `tileOnDesktop`); Kreis 36, Name 15/600, zwei Zeilen 13.
- **Statussymbol-Override (HAPulse):** Fenster/Tür offen → Fenster-Symbol, Kreis `warnSoft` + `warnInk`, Zeile „Fenster offen“
  600; Tor offen → Auto-Symbol, `redSoft` + `redInk`; Wasser/Rauch analog Alarm. Sonst: Licht an → Kreis Gelb + `glyphDark`;
  Pool läuft (Garten) → Türkis + `glyphDark`; sonst `fill` + `label2`. Handy-Skizze: Kachel mit Status zusätzlich Ring
  `inset 0 0 0 1.5px` Soft.

### 7.18 Sheet (Handy, alle Modals)

- **Mittel:** schwebend, Einzug `left/right/bottom 8`, Radius **40** rundum, Höhe = Inhalt, höchstens
  `100dvh − 144px` (Skizze: bis 700 von 844), Material `sheetFill` + `sheetFilter`, Glas-Schatten; `label2` → `glassLabel2`.
- **Groß:** volle Breite, Höhe `100dvh − 52px` (Skizze 792 von 844), Radius 40 40 0 0, **deckend** `sheetSolid`, ohne
  Filter, Schatten `sheetLarge`.
- Start-Detent: passt der Inhalt → mittel, sonst groß. *Plan §2.1 nannte `min(62dvh, Inhalt)`; die freigegebene Skizze
  nutzt Inhaltshöhe bis 700/844 – `sheetMath.pickDetent` danach ausrichten.*
- **Kopf:** Raster `44px 1fr 44px`, Innenabstand 16 14 6: links **Schließen** (Trefferfläche 44, Kreis 32 `fill`, ×
  `label2`), Mitte Titel 17/22 600 + Untertitel 13/18 `label2` (z. B. „Licht · 5 an“), rechts frei.
- **Grabber:** Trefferfläche 120 × 30 oben mittig (`touch-action: none`, `cursor: grab`), sichtbar 36 × 5, Radius 3,
  `grabber`, 6 von oben; Tipp wechselt mittel ↔ groß; `aria-label` „Blatt vergrößern/verkleinern“.
- **Inhalt:** scrollt (Innenabstand 8 16 28); Gruppen `group`, Radius 22; Gruppentitel 15/20 600 `label2` mit Zählung rechts.
- **Ziehen (Skizze 844 px):** mittel → groß bei dy < −50; mittel schließt bei dy > 110; groß → mittel bei dy > 80; groß
  schließt bei dy > 360. Allgemein (`sheetMath`): Schließen ab 25 % der Sheet-Höhe oder Wurf > 0,8 px/ms.
- **Morph** aus dem angetippten Element und zurück (§6.3); **Scrim** `scrim` (.25 / .45), Tipp schließt.
- **Gestapelte Bestätigung (D14):** Rückfrage erscheint **im** Sheet: als Bestätigungsblock in der Zeile (Fläche `fill`,
  Radius 18, Titel 17/600 zentriert, Hinweis 13 „Öffnen fragt immer nach.“, Knöpfe 44: „Abbrechen“ `group` + „Öffnen“/
  „Entriegeln“ `actDel` + Weiß) bzw. als von rechts eingeschobene Seite mit **‹ Zurück** führend (Plan §2.2).
  *Skizze zeigt den Zurück-Knopf rechts im Kopf; verbindlich ist führend (links), weil × dann entfällt.*
- `swipeToClose={false}` für den Alarm-Ziffernblock.
- **A11y:** `role="dialog"`, `aria-modal`, Fokus ins Sheet und zurück, Esc schließt das oberste; Wischen ist nie der einzige Weg.
- **Sheet-Inhalte (Chips):** Personen (Zeilen 62, Avatar 40 + Zonen-Punkt 12, Zone `greenInk` 600, „seit“), Licht („Alle
  ausschalten“ prominent 48, Gruppen je Raum, Zeilen 56 mit Kreis 32 + Schalter, Wischen → Aus), Türen & Fenster (zwei
  Gruppen, offen zuerst, Pille 26 „Offen“ `redSoft`/`redInk` 600 bzw. „Geschlossen“ `fill`/`label2` mit Punkt 7),
  Garage (Kachel 40 Kreis Soft, Zustand 15/600 Ink, Knöpfe 44 Stopp nur beim Fahren / Schließen / Öffnen),
  Schlösser (Knopf 40 „Verriegeln“/„Entriegeln“), Alarm (Kopf 56-Kreis + Zustand 22/28 700, Modus-Raster 2 Spalten 52 hoch
  Radius 18 – gewählt `accentSoft` + Ring 2 px Akzent –, Ziffernblock 3 × 76 rund, Punkte 14, Fehler schütteln),
  Pool (Status 22/28 700 `tealInk`, Segment Aus/Automatik/Manuell 44, Liste Solar/Laufzeit/Restzeit, Dauerwahl mit Presets
  44 + Stepper 28/34 700 + „Starten“ prominent 50), Medien (Gruppen aktiv/inaktiv mit Zähler, Karte je Player: Cover 52
  Radius 12, Play 44 – spielt: Blau + Weiß –, Lautstärke-Regler 28 hoch `fill2`/`label2`, Wert 13), Wetter (Kopf 48/54 700,
  Raster 3 × 3 Kennzahlen Radius 16, Stunden 56 breit, Tage-Liste 48 mit Regen in `blueInk`), Mehr (Liste 52, Symbole
  einfarbig `label2`, Wert rechts, Fuß „Version 1.3.2 · F…“), Räume (Liste 54, Kreis 32 mit Status-Override).

### 7.19 Desktop-Dialog (900–1099 auch für Detail)

- Zentriert, Breite je Inhalt (Personen 440, Wetter 500, Licht 480, Türen 460, Garage/Schlösser 560, Alarm 460, Pool 480,
  Medien 500, Klima alle 760, Rollläden alle 780, Müll 440), max. Höhe 900, Radius **34**, Glas Tönung .68, Schatten
  `dialog`; Scrim `scrimDesktop` (.22 / .45).
- Kopf `44px 1fr 44px`, Innenabstand 12 12 6: Schließen 44/32, Titel 17/600 mit Symbol + Untertitel 13 `glassLabel2`;
  Inhalt Innenabstand 8 20 22; Gruppen `group` (Desktop-Skizze `rgba(255,255,255,.74)` / `rgba(58,58,60,.55)` auf Glas,
  deckend `#FFF`/`#2C2C2E` in Zeilen mit Wischen), Radius 18–20.
- Morph aus Chip/Zeile und zurück (§6.3). Esc schließt. Bestätigungen in der Zeile (Fläche `redSoft`, „Abbrechen“ `fill`,
  „Öffnen“ `actDel` + Weiß – *Skizze: Vollton-Rot mit Weiß 3,55:1 → durch `#D70015` ersetzen*).

### 7.20 Inspector (Desktop/iPad ≥ 1100)

- Rechts `top/right/bottom 12`, Breite **420**, Radius 30, Glas Tönung .68, Schatten `inspector`; **nicht modal**
  (`aria-modal="false"`, kein Scrim, Übersicht bleibt bedienbar); Inhalt rückt rechts auf 452.
- Kopf (Innenabstand 14 14 10 18): Zustands-Kachel 40 (Radius 12, Zustandsfarbe bzw. Soft + Ink), Name 17/600 +
  Raum 13 `glassLabel2`, Stern 44/32 (`fill`, Favorit `yellowInk` gefüllt), Schließen 44/32.
- Inhalt (Innenabstand 4 18 24): Zustand 28/34 700 (.36 px) + „Zuletzt geändert …“ 13 rechts; dann Licht-Regler (§7.22),
  Verlauf, Aktivität, Attribute (§7.21). Klick auf andere Kachel tauscht den Inhalt.

### 7.21 Detail (Entity-Detail, Sheet am Handy)

- **Kopf-Gruppe** (Handy): Kachel `group` Radius 22, Innenabstand 12 8 12 12: Kreis 44 (Zustandsfarbe), Zustand 22/28 700
  („An · 80 %“), „An seit 09:38“ 13 `label2`, Stern 44.
- **Verlauf:** Titel 20/25 600 (Desktop 17/600) + **Segment 24H / 7D / 30D** 168 breit (Handy 36 hoch, Linse 54 × 30,
  Radius 18/15; Desktop 32) – Auswahl je Nutzer gespeichert (`detailHistoryRange`). Diagramm-Gruppe Radius 22 (Desktop 20),
  Innenabstand 14 14 10:
  - **Wert** (Sensor): Fläche + Linie in der Zustandsfarbe (Temperatur Orange, Feuchte Blau), Fläche Deckkraft .22,
    Linie 2,5; „max./min.“ 12/16 `label2`; Höhe 140 (Desktop).
  - **An/Aus-Zeitleiste** (Licht/Binär): Band 34–36 hoch, Radius 9–10, Segmente an = Gelb + `glyphDark`, aus = `fill` +
    `label2` (Desktop: Legende Quadrate 10 + Beschriftung); Beschriftung im Segment, wenn > 14 % breit.
  - Achse 12/16 `label2` („10:00 · 16:00 · 22:00 · 04:00 · Jetzt“). Wechsel blendet .36 s.
  - Leer: „Kein aufgezeichneter Verlauf für diesen Zeitraum“ 15 `label2`.
- **Aktivität (Logbuch):** Tagesköpfe 13/18 600 `label2` („Heute · Mo., 6. Okt.“), Gruppe Radius 22/18: Zeilen min. 44
  (Desktop 42), Punkt 8 (an/aktiv Gelb, sonst `label3`), Zustand 15, Zeit 15/13 `label2`; „Mehr anzeigen“ `accentInk`
  (ab > 6 Einträgen).
- **Attribute:** Zeile 52 (Desktop 44) aufklappbar mit Chevron, Liste min. 44, Schlüssel 15 / Wert 15 `label2`.
- Alles aus Inventar F bleibt (eingebettete Steuerkarte, Kamera-Hinweis, Gruppen-Mitglieder, Lade-/Leerzustände).

### 7.22 Licht-Regler (senkrecht, Control Center)

- **Handy:** Kapsel **120 × 280**, Radius 32, Spur `fill2`, Füllung Gelb von unten (`translateY(100 − level %)`), Sonne
  unten (20 von unten, Farbe `glyphDark` ab 14 %, sonst `label2`); darunter **Ein/Aus** rund 60 (an Gelb + `glyphDark`,
  aus `fill` + `label`). Rechts: Prozent 34/41 700 (rollend), „Eingeschaltet seit 09:38“ 15 `label2`, „Farbtemperatur“ 13,
  vier Punkte 30 in 44 (gewählt Ring `inset 0 0 0 2px group, 0 0 0 2px label`), Text „Warmweiß · 2.700 K“ 13.
- **Desktop (Inspector):** Gruppe Innenabstand 18, Radius 22: Kapsel **104 × 232**, Radius 28; Prozent 34/41 700, Knopf
  „Ausschalten“ 52 hoch (Kreis 38 Gelb), „Eingeschaltet seit …“ 13.
- **Verhalten:** Klick setzt Stufe aus Position (Feder), Ziehen folgt exakt, Kapsel `scale(1.04)` beim Ziehen; < 3 % = aus;
  nicht dimmbar → nur an/aus; Senden beim Loslassen (`useCommitRange`). Tasten ↑/→ +10, ↓/← −10, Bild↑/↓ ±20, Pos1 = 0,
  Ende = 100. `role="slider"`, `aria-orientation="vertical"`, `aria-valuetext` „80 Prozent“/„Aus“.
- Farbtemperatur und Farbton der eingebetteten `LightCard` bleiben sichtbar (nur deren Helligkeitsregler entfällt in Glas).

### 7.23 Kontextmenü (Langdruck 550 ms, Rechtsklick)

- **Handy:** Hintergrund `ctxDim` (.18 / .40) + `blur(14px) saturate(140%)`; **Vorschau** = Kachel an ihrem Platz, `cardSolid`,
  Radius 22, `scale(1.04)` + `liftContext`; **Menü** 250 breit, Radius 22, `sheetFill`, unter der Kachel (+14) oder darüber,
  seitlich 16 Rand; Einträge min. 46, Innenabstand 0 16, Body 17 + Symbol rechts, Trennlinie ab 16, **Ausblenden** in
  `redInk` (letzter Eintrag).
- **Desktop:** Scrim `ctxScrimDesktop` (`rgba(242,242,247,.35)` / `rgba(0,0,0,.35)`) + `blur(10px) saturate(120%)`; Zeile
  angehoben (`card`, `scale(1.04)`, `0 18px 50px rgba(0,0,0,.28)`); Menü 256 breit, Innenabstand 6, Radius 22, Tönung .88,
  Einträge 44 (Radius 14, 17/22); vor „Ausblenden“ 6-px-Gruppenband `fill`.
- **Aktionen:** Details · Aus-/Einschalten (entitätsspezifisch) · Zu/Aus Favoriten · Raum öffnen · Ausblenden (nur wer
  bearbeiten darf). Szenen: Aktivieren zuerst. Schloss/Garage: nie Entriegeln/Öffnen ohne Bestätigung.
- **A11y:** `role="menu"`/`menuitem`, Pfeiltasten, Esc, Fokus zurück; Tipp auf reine Anzeige-Karten öffnet weiterhin direkt das Detail.

### 7.24 Wisch-Zeile

| Liste | Aktion | Breite (Handy) | Farbe |
|---|---|---|---|
| Mitteilungen | Verwerfen | 104 | `actDel` #D70015 |
| Licht-Sheet | Aus | 88 | `actNeutral` #636366 |
| Garage | Schließen | 104 | `actOk` #1F7A35 |
| Schlösser | Verriegeln | 112 | `actOk` #1F7A35 |

- Aktion liegt rechts unter der Zeile, Text 15/20 600 Weiß, blendet ein, sobald die Zeile sich bewegt.
- Gesten: Richtungsentscheid nach 8 px (horizontal → `setPointerCapture`), Zeile folgt bis −(Breite + 36); offen, wenn
  < −45 % der Aktionsbreite; Tipp auf offene Zeile schließt; Scrollen schließt. Desktop-Skizze: Breite 96, offen ab −48,
  Anschlag −128. `touch-action: pan-y`.
- **Nie** Entriegeln/Öffnen per Wischen. Jede Wisch-Aktion hat einen sichtbaren Knopf-Zwilling in der Zeile (×, Schalter,
  Verriegeln) – Tastatur/Desktop. Hinweistext 13 `label2`: „Tipp: Zeile nach links wischen zum Verwerfen.“

### 7.25 Toast

- **Handy:** über der Tab-Leiste (`bottom 96`, ohne Tab-Leiste 22), `left/right 16`, min. 52, Radius 20, `toastBg`
  (`rgba(28,28,30,.92)` / `rgba(58,58,60,.94)`) + `blur(20px) saturate(180%)`, Schatten `0 10px 30px rgba(0,0,0,.25)`;
  Kreis 26 Rot mit Weiß, Text 15/20 Weiß, × 40.
- **Desktop:** unten rechts (`right = padR`, `bottom 24`), Glas-Kapsel (Tönung .68) max. 460, min. 52, Symbol in `redInk`
  (Fehler) bzw. `blueInk` (Info), Text 15/500, × 40 (Kreis 28 `fill`).
- Regeln: höchstens 3, keine Dubletten, 6 s, × schließt; `aria-live="polite"`, Fehler `role="alert"`.

### 7.26 Verbindungs-Banner

- **Handy:** `top 58`, `left/right 16`, min. 40, Radius 20, Innenabstand 8 14 8 12, Footnote 13/18 600 `label`, Symbol
  links, Schatten `banner`; Fläche „wird wiederhergestellt“ `bannerReconnecting` (Gelb 26 % auf `cardSolid`), „verloren“
  `bannerLost` (Rot 16 % auf `cardSolid`). Inhalt rückt nach unten (`padTop` 120).
- **Desktop:** zentrierte Kapsel `top 80`, min. 40, Subhead 15/600, gleiche Mischflächen (*Skizze: Vollton-Rot mit Weiß
  3,55:1 → ersetzt*); Symbol dreht beim Wiederverbinden (1 s linear, nicht bei reduzierter Bewegung).
- `role="status"`, `aria-live="polite"`; Aktionen ohne Verbindung → Toast „Keine Verbindung zu Home Assistant“.

### 7.27 Segmented Control

| Einsatz | Spur | Linse | Label |
|---|---|---|---|
| Energie Tag/Woche/Monat | 44 Treffer / 32 sichtbar, Radius 16 | 28, Radius 14 | 13/18 600 `label` |
| Detail 24H/7D/30D | 168 × 36 (Desktop 32), Radius 18 | 54 × 30, Radius 15 | 13/18 600; gewählt `label`, sonst `label2` |
| Kamera Zeitleiste/Ereignisse | 40, Radius 20, Innenabstand 3 | 34, Radius 17 | 15/20 600 |
| Pool Aus/Automatik/Manuell | 44, Radius 22, Innenabstand 3 | 38, Radius 19 | 15/20; gewählt 600 `label`, sonst 400 `label2` |
| Bearbeiten S/M/L | 120 × 36, Kapsel, Innenabstand 2 | Drittel, Kapsel | 13/18 600 |

Spur `fill`, Linse `seg` (#FFF / #636366) + `segShadow`; gleich breite Segmente, nur Text oder nur Symbole, ≤ 5;
`role="radiogroup"` + `role="radio"`/`aria-checked`; Linse gleitet `snappy`.

### 7.28 Switch (iOS-Grün)

51 × 31, Radius 16 (Kapsel); Knopf 27 Weiß (`top/left 2`), Schatten `0 3px 8px rgba(0,0,0,.15), 0 1px 1px rgba(0,0,0,.16)`,
an `translateX(20px)`. Spur an `switchOn` (#34C759 / #30D158), aus `switchOff` (.24 / .32). Nur in **Listenzeilen**
(HIG); auf Kacheln schaltet der Symbol-Kreis. `role="switch"`, `aria-checked`, Trefferfläche ≥ 44 (Desktop 64 × 44).
Zustand nie nur über Farbe: Knopfposition + Text („an/aus“, „80 %“).

### 7.29 Buttons

| Stil | Aussehen | Beispiel |
|---|---|---|
| **prominent** (eine Primäraktion je Ansicht) | Fläche `prominent`, Text `onProminent`, Kapsel; 48–50 hoch, 17/22 600, Symbol 18 | „Alle ausschalten“, „Starten“, „Fertig“ (40 Handy / 48 Desktop) |
| **plain / grau** | Fläche `fill`, Text `label`, Kapsel 44, 15/20 600 | Zu/Stopp/Auf, Schließen, Abbrechen |
| **rund** | 44 Kreis `fill` (Glyphe `label`) | −/+, ›, Play |
| **Text/Link** | ohne Fläche, Handy `label2` + Chevron, Desktop/Sheet `accentInk`; min. 44 hoch | „Alle anzeigen ›“, „Mehr anzeigen“, „Poolseite öffnen ›“ |
| **destruktiv** | Bestätigung: `actDel` #D70015 + Weiß; im Menü/als Text `redInk` | „Öffnen“, „Entriegeln“, „Ausblenden“, „Verwerfen“ |
| **Glas** (Funktionsebene) | §3.3 mit Flex + Glanz | Avatar, Zurück, Kopf-Kapseln, Kamera-Steuerung |

Zustände: disabled .4; loading = Spinner im Knopf; Auswahl-Pillen (Modus, Dauer) gewählt `accentSoft` + `accentInk` +
Ring `inset 0 0 0 2px accent` (Klima-Modi 1,5 px). Labels: Verb, Satzschreibung. Destruktiv nie als Primärrolle.

### 7.30 Listen (inset grouped)

- Karte/Gruppe deckend, Radius 26 (Seite) / 22 (Sheet) / 18–20 (Desktop-Dialog), keine Ränder.
- Zeilen min. 44–60 (Standard: einfach 48–52, zweizeilig 56–62); Einzug 16 (Desktop-Karten 20); führendes Symbol 22–24
  in eigener Spalte (Abstand 12–16) bzw. Kreis 32–40.
- Trennlinie **0,5 px `sep`**, beginnt am Textanfang (z. B. 16, 56, 60, 66), keine nach der letzten Zeile, keine neben
  getönten Problemzeilen.
- Rechts: Wert `label2`, Chevron 14–18 `label3`; Auswahl = Häkchen `accentInk`; Navigation = Chevron.
- Gruppentitel über der Gruppe: 15/20 600 `label2` (Sheets) bzw. 13/18 600 (Desktop-Dialog), Satzschreibung.

### 7.31 Leere Zustände

- In einer Karte: zentriert, Innenabstand 22 20 (Handy), Symbol `label2` (Kreis 44–60 `fill`), Titel 17/22 600,
  Text 15/20 `label2`; Einblenden `swap-in` 300 ms.
- Sheet/Popover: Kreis 52–56 `fill` + Symbol `label2`, Titel 15–17/600, Erklärung 15 `label2` („Neue Meldungen von Home
  Assistant erscheinen hier.“).
- Alle HAPulse-Leerzustände (Inventar X) bleiben inhaltlich gleich; Hinweise ohne Abweichung = **keine** Karte.

### 7.32 Bearbeiten-Modus

- **Einstieg:** Desktop Kopf-Kapsel „Bearbeiten“ ↔ „Fertig“ (prominent); Handy Avatar-Menü → „Bearbeiten“, Kapsel „Fertig“
  oben rechts.
- **Je Karte (Desktop, Leiste über der Karte, Abstand −2 0 10):** Segment **S / M / L** (120 × 36) · Abstandhalter ·
  ‹ › Verschieben (36 rund `fill`; Code 44) · **Auge** (Ausblenden; aktiv invertiert: `label` Fläche, `bg` Glyphe) ·
  **Handy-Ausblenden** (gleich). Ausgeblendete Karten Deckkraft .4. Ziehen zum Sortieren bleibt (6 px / 200 ms Touch / Tastatur).
- **Größen (E6):** S = 1 Spalte, M = 2 Spalten, **L = 2 Spalten + höher** (Skizze min. 470 px Desktop); Räume immer volle
  Breite; „⋯ Anpassen“ öffnet die klassischen Werte (Spalten 1–4, Höhendeckel aus/180/280/400/560); passt kein Preset →
  Segment ohne Auswahl („Eigene“).
- **Chips/Nav:** Auge-Badges an Chips (26) und Nav-Einträgen (32); Übersicht/Einstellungen nicht ausblendbar.
- Badges erscheinen mit `bouncy`-Skalieren, versetzt; **kein Wackeln**; Links in Kartenköpfen sind im Modus ausgeblendet.

### 7.33 Kameraseite (immer dunkel)

Teilbaum mit `data-glas-scheme="dark"`; Tab- und Chip-Leiste aus (E13).

- **Bühne** randlos, Höhe = Breite × 3/4 (293 bei 390; Vollbild 100 %), Verläufe oben 104 / unten 120 (§3.6).
- Oben: Zurück + Extern als **clear**-Kreise 44 (`top 8`, `left/right 12`), Mitte Titel 17/22 600 Weiß + LIVE-Badge
  20 hoch (Radius 10, `#D70015`, 11/13 700, .6 px, Schatten `live`) bzw. Uhrzeit 15/600.
- Unten mittig **Steuerkapsel clear** 52 hoch (Innenabstand 4, Radius 26): −15 s · Play/Pause · +15 s (bei Live .4) ·
  Tempo „1×“ (15/600), Knöpfe 44; rechts unten Ton-Kreis 44 (`bottom 16`).
- Info-Leiste 48: grüner Punkt 8 + „Aufnahme läuft · 63 heute“ 13 `label2`; rechts Schnappschuss, Bild-in-Bild (gewählt
  `fill2`), Vollbild je 44.
- Segment Zeitleiste/Ereignisse (§7.27), Klassen-Filter 32 hoch (gewählt `label` Fläche + `bg` Text 600, sonst `fill`).
- Zeitleiste: Spur 6 `fill2`, Bewegung 3 Grün, Marken 14 (`label3`, gewählt `label`), Abspielkopf 40 × 2 + Punkt 14 `label`,
  Ereignis-Bild 96 × 72 Radius 12 (gewählt Ring 2+2), Zeit 17/600, Klassen-Kapsel 24 `fill`.
- Unten links **Datum-Chip** regular-Glas 44 (Tönung .55, Text `accentInk` bei Aufnahme) und darüber „LIVE“-Pille 36
  (Rot, Weiß 15/700) nur außerhalb von Live.
- Nicht-verlieren-Liste: Inventar J / Plan §4.

---

## 8. Do & Don’t

| Do | Don’t |
|---|---|
| Jede HAPulse-Funktion, Karte, Reihenfolge und Information behalten | Inhalte reduzieren oder Abschnitte „aufräumen“ (Iteration Glas 2/3: verworfen) |
| Glas nur auf Navigation/Steuerung; Karten deckend und randlos | Glas auf Karten, Kacheln, Listen; Glas auf Glas; mehr als 3 Glasflächen in Ruhe |
| Kartentitel über der Karte, Title 3, Symbol einfarbig `label2` | Getönte Symbol-Chips/Quadrate in Titeln, Chips oder Hinweisen (Glas 4 → in Glas 5 entfernt) |
| Farbe nur für Zustände; Glyphen/Text in Ink-Varianten | Akzent als Zustandsfarbe, Orange als Textfarbe, Weiß auf Orange |
| Akzent für Auswahl, Fokus, **eine** Primäraktion | mehrere farbige Knöpfe nebeneinander |
| Systemschrift + `tabular-nums` | Monospace, Webfonts, ui-rounded |
| Scroll-Kante weich, kleiner Titel | harte Navigationsleisten mit Hintergrund/Trennlinie |
| `glassLabel2` für Sekundärtext auf Glas; Kontrast messen (hell, iPad, Tageslicht) | `label3` (#7C7C80) als Text; helles Lila/Grau als Symbol auf hellem Glas |
| Ruhiger Handy-Kopf: nur Avatar | Glocke + Stift + Wetter-Pille oben am Handy (Glas 4) |
| Schalter iOS-Grün, nur in Listen; Kacheln schalten über den Symbolkreis | Akzentfarbene Schalter; Schalter auf Kacheln |
| Riskante Aktionen bestätigen im Sheet | Öffnen/Entriegeln per Wischen oder ohne Rückfrage |
| Federn, Morph aus dem Element, abbrechbar; reduzierte Bewegung = Überblendung | `transition: all`, `backdrop-filter` animieren, Wackeln im Bearbeiten-Modus |
| Solar-Gelb im Hellen mit 1-px-Rand `#A67C00` | Gelbe Balken ohne Rand auf Weiß (1,5:1) |
| Kamera immer dunkel, clear-Glas + Verläufe | clear-Glas ohne Abdunklung über hellem Bild; regular und clear mischen |
| Konzentrische Radien, Kapseln für Steuerelemente | beliebige Einzelradien, „gekniffene“ Ecken |
| 44-px-Trefferflächen auch am Desktop (iPad) | 36–40-px-Knöpfe aus der Desktop-Skizze unverändert übernehmen |
| Hauptraum schlicht | Raumtyp-Verlauf oder HA-Raumbild in Glas (E8) |
| Hex nur in `glasTokens.ts`, CSS nur `var(--…)` | Hex-Werte in Glas-CSS oder Komponenten |

---

## 9. Apple-Grundlagen (mit Quellen)

Recherche-Stand 04.10.2026, gegen Primärquellen geprüft. Apple nennt für das Material selbst **nur eine Zahl** (35 %
Abdunklung bei clear); Blur, Sättigung, Rand und Schatten sind unsere Ableitung (Skizze).

### 9.1 Regeln, die Glas übernimmt

| Regel | Quelle |
|---|---|
| Liquid Glass nur in der **Funktionsebene** (Tab-Bar, Sidebar, Toolbars, Sheets, Popover, Menüs), nie im Inhalt; Ausnahme: Slider/Toggle-Knopf nur während der Bedienung | [HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials) |
| **Kein Glas auf Glas**; Elemente darauf mit Füllung/Transparenz/Vibrancy | [WWDC25 „Meet Liquid Glass“](https://developer.apple.com/videos/play/wwdc2025/219/) |
| Sparsam einsetzen, nur wichtigste Funktionselemente | [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass) |
| **regular** Standard; **clear** nur über medienreichem Inhalt, nie mischen; bei hellem Inhalt **35 % Abdunklung** | [HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [WWDC25-219](https://developer.apple.com/videos/play/wwdc2025/219/) |
| Glas hat keine Eigenfarbe; Farbe sparsam; Primäraktion über **getönten Hintergrund**, nicht farbiges Symbol; nie mehrere Controls farbig | [HIG Color](https://developer.apple.com/design/human-interface-guidelines/color) |
| Bunter Inhalt → Leisten-Beschriftungen monochrom; im Ruhezustand kein Inhalt unter Glas | [HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [WWDC25-219](https://developer.apple.com/videos/play/wwdc2025/219/) |
| **Scroll-Edge-Effekt** statt Leisten-Hintergrund; nur unter schwebender UI; einer pro Ansicht; keine Deko | [HIG Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views), [HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout) |
| iOS 27: einheitliche Fläche oben, wenn Inhalt unter Bars scrollt; stärkere Diffusion; **dunkler Rand + hellere Glanzkante** | [WWDC26 Platforms State of the Union](https://developer.apple.com/videos/play/wwdc2026/102/) |
| Spiegelnde Kanten, Leuchten ab Berührpunkt, elastisches Nachgeben; eigene Controls brauchen Druckzustand | [WWDC25-219](https://developer.apple.com/videos/play/wwdc2025/219/), [HIG Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) |
| Glas erscheint per **materialize**, nicht per Fade; größeres Glas = dickeres Material | [WWDC25-219](https://developer.apple.com/videos/play/wwdc2025/219/) |
| Menüs, Popover, Sheets, Dialoge **wachsen aus ihrem Auslöser** | [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass) |
| **Konzentrische Formen**, nur fest / Kapsel / konzentrisch; Kapseln für Touch | [WWDC25 „Get to know the new design system“](https://developer.apple.com/videos/play/wwdc2025/356/) |
| Tab-Bar schwebt unten, nur Navigation, Ein-Wort-Labels, ≤ 5; **Minimieren beim Scrollen optional** | [HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) |
| Sidebar schwebt als Glas, Inhalt läuft darunter; ausblendbar, nicht standardmäßig versteckt | [HIG Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars) |
| Toolbar-Gruppen ≤ 3 je eigene Kapsel; **eine** Primäraktion trailing; Text- und Symbolknöpfe nicht in einer Kapsel | [HIG Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) |
| Sheets: Detents mittel/groß, Grabber, Wischen schließt; halbe Sheets eingerückt (Glas), voll deckend; Schließen leading | [HIG Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) |
| Listen inset grouped, mehr Luft, größere Radien; Abschnittsköpfe **nicht in Versalien** | [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass) |
| Switch nur in Listenzeilen, Standard Grün; außerhalb Button-Toggle | [HIG Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles) |
| Segmented: eng verwandte Optionen, ≤ 5, gleich breit, nur Text oder nur Symbole | [HIG Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls) |
| Menü-Icons: alle oder keine je Gruppe | [HIG Menus](https://developer.apple.com/design/human-interface-guidelines/menus) |
| Textstile (Large Title 34/41 … Caption 2 11/13), Standard 17, Minimum 11; Systemschrift nicht einbetten | [HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Apple Fonts](https://developer.apple.com/fonts/) |
| Trefferfläche 44 × 44 (min. 28); Abstand 12 mit / 24 ohne Fläche | [HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) |
| Kontrast ≥ 4,5:1 (≤ 17 pt), ≥ 3:1 (≥ 18 pt/fett); hell **und** dunkel prüfen; jede Farbe mit Kontrast-erhöht-Variante | [HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [HIG Color](https://developer.apple.com/design/human-interface-guidelines/color) |
| Transparenz reduzieren → frostiger/deckender; Kontrast erhöhen → schwarz/weiß mit Rand; Bewegung reduzieren → keine elastischen Effekte, Überblendungen | [WWDC25-219](https://developer.apple.com/videos/play/wwdc2025/219/), [HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion) |
| Federn (Dauer + Bounce) statt Bezier; Bounce 0 als Normalfall; Bewegung unterbrechbar, folgt der Geste | [WWDC23 „Animate with springs“](https://developer.apple.com/videos/play/wwdc2023/10158/) |
| Dunkelmodus: gedämpfte Hintergründe, Ebenen base/elevated (#1C1C1E/#2C2C2E) | [HIG Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode) |
| iOS 26.1: Liquid Glass **Klar/Getönt**; iOS 27: stufenloser Regler → unser `--g-glass-tint` 0…1 | [Apple Support 123075](https://support.apple.com/en-us/123075), [Newsroom 09/2026](https://www.apple.com/newsroom/2026/09/major-updates-for-apples-software-platforms-are-now-available/) |
| Home-App: Kachel geteilt – **Symbol schaltet, Name öffnet Steuerung**, Halten → Menü; Kategorie-Buttons mit Kurzstatus | [Apple Support – Zubehör steuern](https://support.apple.com/guide/iphone/control-accessories-iph0a717a8fd/ios) |

### 9.2 Korrekturen aus dem Faktencheck

| Annahme | Richtig |
|---|---|
| „HIG-Prinzipien = Hierarchy/Harmony/Consistency“ bzw. „Clarity/Deference/Depth“ | Seit 08.06.2026 nennt die HIG acht Prinzipien: Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity, Craft, Delight ([Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)); das Dreigespann stammt aus der Liquid-Glass-Übersicht 2025 |
| `prefers-reduced-transparency` reicht | Safari/iOS (bis 27) unterstützen die Abfrage **nicht** (MDN/WebKit-Bug 175497) → App-Schalter „Transparenz reduzieren“; Apples Glas-Regler ist aus dem Web nicht lesbar |
| „Höchstens 2–3 Glasflächen“ ist Apple-Vorgabe | Eigene Richtzahl; Apple sagt nur „sparsam“ |
| `r_innen = r_außen − padding` steht so bei Apple | Prinzip belegt, Formel ist unsere Ableitung |
| Tab-Bar muss minimieren | Optional; bei uns User-Entscheidung D5 |
| Echte Lichtbrechung per CSS | `backdrop-filter: url(#svg)` nur Chromium; iPhone/iPad nicht (WebKit-PR offen) → nur Blur/Sättigung/Rand |
| iOS 27: Sidebar-Symbole wieder im Akzent | Stimmt – Glas weicht bewusst ab (weniger Farbe, D30); nur der aktive Eintrag trägt Akzent |
| An/Aus-Optik der Home-Kacheln | Nicht offiziell belegt; unsere Optik (an hell + Zustandskreis) folgt der Skizze |
| Seitenränder 16/20 pt sind HIG | UIKit-Standard, nicht mehr als Zahl in der HIG |
| shadcn/ui, Vercel Geist, v0 helfen beim Glas-Look | Nein (Tailwind-gebunden bzw. kein Apple-Stil). Brauchbar: Base UI Drawer als Rückfall für Sheets, Vercels Web-Interface-Guidelines als Prüfliste ([vercel.com/design/guidelines](https://vercel.com/design/guidelines)); Vaul ist ungepflegt |

### 9.3 Web-Umsetzung (Prüfliste)

- `-webkit-backdrop-filter` + `backdrop-filter` immer zusammen; Backdrop-Root-Falle beachten (§3.7).
- Systemschrift per Keyword, nie SF Pro ausliefern; Lucide-Symbole statt SF Symbols (gefüllt nur für den aktiven Tab).
- Safe Area: HAPulse-PWA nutzt `black-translucent` **ohne** `viewport-fit=cover` (Insets 0) – Tab-Leiste trotzdem mit
  `env(safe-area-inset-bottom)` rechnen; Sheet-Höhen in `dvh`.
- Eingabefelder ≥ 16 px Schrift (kein iOS-Auto-Zoom), `overscroll-behavior: contain` in Sheets, `touch-action` gezielt.
- Testmatrix: hell/dunkel × klar/getönt/deckend × über hellem Foto/dunklem Video × Kontrast erhöhen × Bewegung reduzieren.

---

## 10. Verweise

### 10.1 Skizze (Referenz für Look und Bewegung, kein Code zum Kopieren)

| Datei | Inhalt |
|---|---|
| `glas/skizze/Glas5Handy.dc.html` | Handy 390 × 844; Props `dark`, `sheet` (weather, notifications, rooms, more, people, lights, doors, garage, locks, alarm, pool, media, detail-light, detail-sensor, climate-all, blinds-all, waste, context, avatar), `glass` (klar/getönt/deckend), `accent`, `hintergrund`, `banner`, `screen` (home/kamera) |
| `glas/skizze/Glas5Desktop.dc.html` | Desktop 1440 × 1000; Props `dark`, `dialog`, `inspector` (light/sensor), `glass`, `accent`, `hintergrund`, `banner`, `collapsed` |
| `Glas5Handy-Dunkel`, `Glas5-Avatar`, `Glas5-Detail`, `Glas5-Licht`, `Glas5-Wetter`, `Glas5Desktop-Dunkel`, `Glas5Desktop-Inspector` (`.dc.html`) | Wrapper-Artboards mit gesetzten Props (brauchen `support.js` des Skizzen-Renderers) |

Token-Fundstellen (Zeilennummern der Dateien): Handy-Helmet `.g5-root` 13–55, dunkel 57–82, Stärken/Bild 83–92,
`.g5-glass` 94–125, Bewegung/Keyframes 126–186, reduzierte Bewegung/Kontrast 187–201; Desktop-Helmet `.gd5-root` 13–48,
dunkel 49–73, `.gd5-mat` 85–114; Skript: Akzent (`accentFor`), Sheet-Geometrie (`SH_H`, `geo`, `dragUp`),
Tab-Leiste (`tb`, `tabs`), Energie (`en`), Kontext (`ctx`), Avatar (`av`).

### 10.2 Screenshots (`glas/screens/`, WebP)

| Komponente | Datei |
|---|---|
| Übersicht Handy hell/dunkel, gescrollt | `g5h-none-l.webp`, `g5h-none-d.webp`, `g5h-none-l-s700.webp`, `-s1500`, `-s2300` |
| Übersicht Desktop hell/dunkel, gescrollt | `g5d-hell.webp`, `g5d-dunkel.webp`, `g5d-scroll-hell.webp` |
| Energie-Karte (Tag, Blase, dunkel, Desktop) | `g5e-h-light.webp`, `g5e-h-callout-light.webp`, `g5e-h-dark.webp`, `g5e-d-light.webp` |
| Avatar-Menü | `g5h-avatar-l.webp` |
| Mitteilungen, Wetter | `g5h-notifications-l.webp`, `g5h-weather-l.webp` |
| Licht-Sheet | `g5h-lights-l.webp`, `g5h-lights-d.webp`; Desktop-Dialog `g5d-dialog-lights.webp` |
| Detail (Licht-Regler, Verlauf) | `g5h-detail-light-l.webp`; Inspector `g5d-inspector-light.webp` |
| Kontextmenü | `g5h-context-l.webp`, `g5d-kontextmenue-langdruck.webp` |
| Bearbeiten (S/M/L) | `g5d-bearbeiten.webp` |
| Kameraseite | `g5h-kamera-d.webp` |
| Sheet-Inhalte (Glas 4, Kopf überholt, Inhalt gültig) | `g4h-alarm-l`, `g4h-doors-l`, `g4h-garage-l`, `g4h-media-l`, `g4h-people-l`, `g4h-pool-l`, `g4d-dialog-alarm`, `g4d-dialog-weather` (`.webp`) |

### 10.3 Plan und Specs

| Thema | Ort |
|---|---|
| Stil-Achse, Einstellungen, Scopes | GLAS-PLAN §1.1 (+ §7.3 E1/E2: kein Geräte-Override, „Transparenz reduzieren“ GLOBAL) |
| `applyAppearance`, Inline-Tokens, dunkler Teilbaum | GLAS-PLAN §1.2 |
| `glasTokens.ts`, `glasAccent`, Kontrast-Hilfen | GLAS-PLAN §1.3 |
| CSS-Ordner `styles/glas/`, Selektor-Regeln | GLAS-PLAN §1.4 |
| Sheets/Dialog/Inspector/Kontext/Wischen/Avatar | GLAS-PLAN §2.1–2.6 |
| Titel-Kollaps, Tab-Leiste, Seitenleiste, Kopf | GLAS-PLAN §2.7–2.10 |
| Hinweise, aktive Szene, Kartentitel, Energie, Licht, S/M/L | GLAS-PLAN §2.11–2.16 |
| Tests (Kontrast, Selektor-Wächter, Screenshots, Leistung, Safari) | GLAS-PLAN §5 |
| Umsetzung Etappe 0 und 1, Abweichungen K1–K19, Laborliste | `glas/PLAN-ETAPPE-0-1.md` |
| Umsetzung Etappe 2 (Rahmen), Festlegungen K20–K44, Abweichungen U1–U13, Laborpunkte | `glas/PLAN-ETAPPE-2.md` |
| NVR-Paket-Hooks, immersive Kameraseite | GLAS-PLAN §4 |
| Checkliste „nicht verlieren“ | `glas/HAPULSE-INVENTORY.md` |
| Glas-Rezept / Bewegung / Grundsatz / Glas-5-Änderungen | `glas/spec/SPEC3.md` §1–2, `SPEC4.md`, `SPEC5.md`; Beispieldaten `SPEC.md` §3 |
