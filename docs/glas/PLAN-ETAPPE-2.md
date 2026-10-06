# Glas — konkreter Umsetzungsplan Etappe 2 (Rahmen)

Stand 2026-10-06, nach dem unabhängigen Review (Befunde und Umgang damit in §10). Basis ist der Stand von Etappe 1
(Draft-PR #103, Branch `claude/glas-etappe-1-8cc3sm`); Etappe 2 bekommt einen eigenen Branch und PR, sobald Etappe 1
gemergt ist (bis dahin auf Etappe 1 aufgesetzt). Dieser Plan macht [`../GLAS-PLAN.md`](../GLAS-PLAN.md) §2.6–2.10,
§2.18 und §3 „Etappe 2“ am echten Code fest. Maßgeblich bleiben GLAS-PLAN §7.3 (Entscheidungen des Users),
[`../GLAS-DESIGN.md`](../GLAS-DESIGN.md) für alle Werte und [`PLAN-ETAPPE-0-1.md`](PLAN-ETAPPE-0-1.md) K1–K19; wo
dieser Plan abweicht, steht es in §1 mit Grund.

Entscheidung des Users (2026-10-06): Reihenfolge **wie geplant** — Etappe 2 bringt nur den Rahmen, danach Etappe 3
(Fenster als Sheets), dann Etappe 4 (Startseite); die Startseite sieht erst nach dem dritten PR aus wie die Skizze.

Etappe 2 ändert nur Aussehen und Bewegung des Rahmens (Seitenleiste, Kopf, Tab-Leiste, Menüs, Seitentitel, Banner,
Toasts). **Klassisch bleibt pixelgleich**, alle Funktionen bleiben (Inventar A, B17, D8). Der PR wird nicht ohne
Zustimmung des Users gemergt (Merge = Live-Deploy).

---

## 1. Abweichungen und Festlegungen gegenüber GLAS-PLAN / GLAS-DESIGN

| # | Stelle | Festlegung hier | Grund |
|---|---|---|---|
| K20 | GLAS-PLAN §2.8 „Kein Markup-Eingriff“ an der Tab-Leiste | eine `[fork]`-Zeile in `<nav className="app-tabs">`: `<GlasTabBar …/>` (rendert in Klassisch `null`). Er trägt die Glasfläche, die Linse und den Knopf „Tab-Leiste einblenden“ | Beim Minimieren schrumpft nur die Glasfläche, die Einträge bewegen sich getrennt; Rand und Glanz brauchen eigene Pseudo-Elemente; die Linse gleitet zwischen Einträgen; der Einblenden-Knopf ist ein echter Knopf (GLAS-DESIGN §7.1 A11y). Auf `.app-tabs` selbst liegt dafür kein Glas, sonst wäre es Glas auf Glas |
| K21 | GLAS-PLAN §2.7 kleiner Titel „aus dem ersten `main h1`“ | aus der Route: Nav-Beschriftung der aktiven Seite, auf `/room/:id` der Raumname aus dem Store, sonst erstes `main h1`; Kameraseite `/nvr/:id` ohne Kante (GLAS-DESIGN §3.5) | Die Übersicht hat als `h1` die Begrüßung, die Skizze zeigt „Übersicht“ (`g5h-none-l-s700`); die Raumseite hat kein `h1` |
| K22 | GLAS-PLAN §2.7 `--g-scroll` 0…1 über 0–60 px | zwei einheitenlose Werte, geschrieben an `.app-main` und `.g-edge` (nicht an `:root`): `--g-y` (px, seit der große Titel unter die Kante läuft, 0–64 in 4-px-Schritten; ohne `h1`, z. B. auf der Raumseite, = `scrollY`) und `--g-edge` (Deckkraft der Kante, `scrollY/40` in Zehnteln). Desktop: `data-g-scrolled` ab `scrollY > 8` | GLAS-DESIGN §6.3 braucht y mit mehreren Schwellen (Titel /40, Skalierung /48, Untertitel /28, kleiner Titel 24–52). Einheitenlos, weil CSS Längen nicht durch Längen teilen kann. Zwei Werte, weil auf Seiten ohne Titel ganz oben (Chips darüber, K27) die Kante früher einblenden muss als der Titel einklappt; auf der Übersicht sind beide gleich. Nur an den zwei Elementen, damit eine Änderung nicht die ganze Seite neu berechnet |
| K23 | GLAS-PLAN §2.10 Liste `EDITABLE_ROUTES` | keine Liste: jedes `EditToggle` in der Symbol-Variante meldet sich beim Einhängen in einem kleinen Store an (Zähler, `useLayoutEffect`), aber nur, wenn es auch gezeigt würde (`useCanEdit()` und `editingEnabled`). Danach richten sich die Kapsel „Bearbeiten“ (Desktop) und der Eintrag im Avatar-Menü (Handy) | Seiten zeigen das `EditToggle` nur in manchen Zuständen (Sicherheit und Musik leer, Energie lädt oder ist nicht eingerichtet); eine Routen-Liste böte dort „Bearbeiten“ an, wo Klassisch keins hat. Neue Upstream-Seiten mit `EditToggle` funktionieren ohne Pflege. `useLayoutEffect`, damit die Kapsel nach einem Seitenwechsel nicht ein Bild zu spät erscheint |
| K24 | GLAS-DESIGN §7.3/§7.32 „Bearbeiten nur auf Seiten mit Bearbeiten-Modus“ | „Bearbeiten“ nur dort (K23); **„Fertig“ immer, solange der Modus an ist** (jede Route, Handy und Desktop). Am Handy rendert `GlasRuntime` die Kapsel, nicht `PageHeaderActions` | Der Modus ist global (`uiStore`) und verändert auf jeder Route die Seitenleiste (Ziehen, Augen); ohne „Fertig“ gäbe es auf Seiten ohne `EditToggle` keinen sichtbaren Ausweg. Manche Zustände haben kein `PageHeaderActions` (Raum nicht gefunden `Room.tsx:312`, Kameraseite ohne Einrichtung, Lade-Platzhalter) |
| K25 | GLAS-DESIGN §7.4 „Mitteilungen (n)“ → Mitteilungs-Sheet (`g5h-notifications-l`) | Etappe 2: das bestehende Mitteilungs-Panel als Glas-Popover unter dem Avatar (`top 58`, `left/right 16`); das Sheet mit Ziehen, Wischen-zum-Verwerfen und Zeitangaben kommt mit den Sheets in Etappe 3 | Sheets (Detents, Ziehen, Morph) baut Etappe 3; ein Zwischen-Sheet hier wäre doppelte Arbeit. Zeitangaben brauchen ein zusätzliches Feld in `useNotifications` (Etappe 3) |
| K26 | GLAS-PLAN Etappe 4 „Reihenfolge Handy Begrüßung → Wetter → Chips“ | Begrüßung, Wetterzeile, dann Chips schon in Etappe 2, per CSS `order` (`.page` ist eine Flex-Spalte). Die Reihenfolge im Markup (Tab-Reihenfolge) stellt Etappe 4 um | Der große Titel gehört zum Rahmen (Titel, Scroll-Kante, Wetterzeile); mit den Chips darüber sähe die Startseite weiter anders aus als die Skizze. Bis Etappe 4 erreicht die Tastatur die Chips vor der Wetterzeile |
| K27 | — (GLAS-DESIGN zeigt nur die Übersicht) | übrige Seiten am Handy: Avatar-Band 60 px, darunter die Chip-Leiste (`.app-chips-mobile`, bleibt auf jeder Seite, A17), dann die Titelzeile mit großem Titel; Überprüfung in Etappe 5 | Die Chip-Leiste liegt außerhalb von `<main>`, der Titel darin; per CSS lassen sie sich nicht tauschen. Chips auf jeder Seite sind Pflicht (Inventar A17) |
| K28 | GLAS-DESIGN §3.4 „Wirksame Tönung = max(Fläche, Stärke)“ | `glasCssVars` schreibt je Fläche die Mindest-Tönung der **aktuellen** Stärke als `--g-tint-<fläche>` (z. B. `--g-tint-sidebar` = .5 bei klar, .8 bei getönt); die Fläche setzt `--g-surface-tint: var(--g-tint-sidebar)` | Die Tabelle hat für „getönt“ eigene Werte (Seitenleiste .8, Menüs .94), die `max(Fläche_klar, .75)` nicht ergibt. Zahlen bleiben an einer Stelle (`GLAS_SURFACE_TINT`), nicht im CSS |
| K29 | GLAS-DESIGN §3.4 Sheet-Material, glas-tokens.json `elevation` | `glasTokens.ts` bekommt `sheetFill`/`sheetFilter` (hell/dunkel) als `--g-sheet-fill`/`--g-sheet-filter` und die Schatten des Rahmens als `--g-shadow-{menu,popover,banner,toast,prominent}`; Etappe 2 nutzt das Sheet-Material für Avatar-Menü, Mehr- und Räume-Sheet am Handy | gleiche Quelle wie alle Werte (K3); die Schatten stehen bisher nur in `glas-tokens.json`. Kontrastpaare dazu im Test |
| K30 | `material.css` `.g-glass` | Das Rezept gilt zusätzlich für die Rahmenflächen über eine Selektorliste in **`:where(…)`** (Spezifität 0), Upstream-Markup bekommt keine Klasse `g-glass`. Dieselbe Liste steht in allen Blöcken von `material.css` (Rezept, `::before`/`::after`, Glanz, deckend, `@supports not`, `forced-colors`); der Selektor-Wächter prüft, dass sie überall gleich ist. Jede Flächenregel setzt `position` und `--g-surface-tint` selbst und nie Hintergrund, Filter oder Schatten. „Fertig“ (prominent, kein Glas) steht nicht in der Liste (`.g-edit-capsule:not([aria-pressed='true'])`) | Mit `:is()` zählte die Liste mit ihrem stärksten Glied (0,4,0); Rezeptwerte wie `position: relative` und `--g-surface-tint: 0` hätten dann jede Flächenregel geschlagen, und die Rückfälle (deckend, ohne `backdrop-filter`, `forced-colors`) hätten nur `.g-glass` erreicht. Keine der Rahmenklassen nutzt in Klassisch `::before`/`::after` (geprüft) |
| K31 | GLAS-DESIGN §7.2 Status-Pille „Kreis 26 mit Glyphe; unbekannt ?“ | Kreis per CSS am vorhandenen Lucide-Symbol (Fläche, Innenabstand, Radius); der Kreisumriss von `CheckCircle2`/`AlertCircle` wird ausgeblendet (`circle` im SVG). Das Warn-Dreieck bleibt als Dreieck im Kreis. „Unbekannt“ behält das Bildschirm-Symbol statt „?“ | ohne Eingriff in `SystemStatusPill`; „?“ bräuchte ein anderes Symbol im Upstream-Code |
| K32 | GLAS-DESIGN §7.3 „Zurück 48 Glas-Kreis – nur Raumseiten“ (Desktop) | runder Knopf 48 mit `fill`, ohne Glas | sonst vier Glasflächen in Ruhe (Seitenleiste, Zurück, Mitteilungen, Bearbeiten); §3.1 erlaubt drei |
| K33 | GLAS-DESIGN §7.1 Tab-Leiste „Breite = Viewport − 32“ | ab 600 px Breite höchstens 560 breit, mittig | iPad hochkant (820) hätte eine 788 px breite Leiste mit fünf Einträgen; die Skizze zeigt nur das Handy |
| K34 | GLAS-DESIGN §7.2 Wortmarke „20/25 700 (.2 px)“ | zwei `[fork]`-Zeilen in `PulseLogo.tsx` (Gewicht, Zeilenhöhe 25 und Laufweite, wenn Glas aktiv) | Die Wortmarke hat Inline-Stile; CSS kommt ohne `!important` nicht dagegen an (Selektor-Wächter) |
| K35 | GLAS-DESIGN §6.3 Bildschirm-Eintritt (alle Abschnitte steigen auf) | in Glas steigen die Kopfzeilen (`.page__header-row`, `.home-page__header`, `.room-page__header`) nicht als Ganzes auf, nur ihre Kinder, und zwar ohne die Kopfaktionen und alles, was sie enthält (`> :not(.page-header-actions, :has(.page-header-actions))`) und ohne die fixierten Knöpfe | In den Kopfzeilen liegen fixierte Elemente (Avatar, Zurück). Eine Animation mit `transform` am Vorfahren verschiebt fixierte Kinder, `opacity` macht ihn zur Backdrop-Root (GLAS-DESIGN §3.7). Die NVR-Übersicht hängt `PageHeaderActions` in `.nvr-actions` (`NvrOverviewPage.tsx:38–57`), deshalb `:has()` statt nur der Klasse |
| K36 | GLAS-DESIGN §7.3 Mitteilungs-Popover „Symbol-Kachel 30“ | keine Symbol-Kachel | HA-Mitteilungen (`persistent_notification`) haben keine Art; jede Zeile bekäme dieselbe Glocke |
| K37 | GLAS-DESIGN §7.3 Chips „rechts ›-Knopf 36“ | ohne Knopf, nur die weiche Maske an den Rändern | der Knopf bräuchte Markup und Scroll-Logik in `SummaryChipsBar`; Wischen, Mausrad und Tastatur scrollen die Reihe schon |
| K38 | GLAS-DESIGN §6.4 „Reduziert: Überblendung 200 ms“; Etappe-1-Wächter „kein `!important`“ | Bei reduzierter Bewegung überblenden Menüs, Popover, Avatar-Menü, der Wechsel Bearbeiten ↔ Fertig, Toasts, Banner, Kante und kleiner Titel 200 ms (nur Deckkraft); Lage, Größe, Tab-Leiste und Linse wechseln sofort. Dafür erlaubt der Selektor-Wächter `!important` nur in `@media (prefers-reduced-motion: reduce)` und nur für `transition-*`/`animation-*` | Upstream setzt bei reduzierter Bewegung jede Dauer mit `!important` auf 0,01 ms (`global.css:191–197`); ohne Gegen-`!important` gäbe es nur Sprünge. GLAS-PLAN §1.4 erlaubt `!important` bisher nur für die Bewegungs-Abschaltung; K38 erweitert das auf die Überblendungen, die GLAS-DESIGN §6.4 für reduzierte Bewegung vorschreibt. Die Web Animations API wäre ein zweiter Weg für dasselbe |
| K39 | GLAS-DESIGN §9.3 „PWA ohne `viewport-fit=cover`, Insets 0“ | bleibt so; alle oberen Lagen werden trotzdem als `calc(N + env(safe-area-inset-top, 0px))` geschrieben. Ob die Statusleiste der Home-Bildschirm-App über Avatar, Zurück, „Fertig“ und Banner liegt, prüft das Labor vor dem Merge (Pflichtpunkt §9). Liegt sie darüber, setzt Glas `viewport-fit=cover` zur Laufzeit und rechnet alle vier Insets ein (eigener Schritt mit Bildern zur Entscheidung) | Klassisch hat oben dieselbe Lage (Inhalt ab 16 px) ohne bekannte Überdeckung, scrollt aber weg; Glas fixiert dort den einzigen Handy-Weg zu Benachrichtigungen, Bearbeiten und Einstellungen. `cover` verschiebt auch unten alle Abstände, deshalb nicht auf Verdacht |
| K40 | GLAS-DESIGN §7.2 Seitenleiste „Einträge 40, Abstand 2“, Einklapp-Knopf 44 × 36, × 36 bzw. 40 in Popover und Toasts | Trefferfläche überall mindestens 44 × 44 (GLAS-DESIGN §5.3): Seitenleisten-Einträge 44 hoch mit sichtbarer Kapsel und Linse 40 (dadurch 4 statt 2 px sichtbarer Abstand), Einklapp-Knopf 44 × 44 bei sichtbar 44 × 36, ×-Knöpfe 44 bei sichtbarem Kreis 26/28, „Fertig“ am Handy 44 bei sichtbar 40 | iPad quer nutzt die Seitenleiste mit dem Finger; §5.3 nennt das iPad als Maßstab. Klassisch hat ebenfalls 44 hohe Einträge (`AppLayout.css:118`), die Leiste wird also nicht länger als heute |
| K41 | — | Größen, die Upstream inline setzt, ändern `[fork]`-Zeilen mit `useIsGlas()`: Glocke 44 (`NotificationsPanel.tsx:214`), Zurück 44 am Handy (`Room.tsx:562`), Zurück 48 im Desktop-Kopf (`AppLayout.tsx:265`). Die Kapsel „Bearbeiten/Fertig“ ist ein eigener `<button>` (`EditToggle variant="label"`, Klasse `g-edit-capsule`) | Inline-Stile schlägt CSS nur mit `!important`, das der Wächter verbietet |
| K42 | GLAS-DESIGN §7.2 „Popover `role="menu"` mit Pfeiltasten/Esc“ | In Glas bewegen Pfeile, Pos1 und Ende den Fokus in den Upstream-Menüs (Räume-Popover und -Sheet, Mehr-Menü) über einen Tasten-Helfer in `GlasRuntime` (`menuKeys.ts`); das Mehr-Menü fokussiert beim Öffnen den ersten Eintrag wie das Räume-Menü. Klassisch bleibt, wie es ist (nur Esc) | `RoomsMenu.tsx:80–89` und das Mehr-Menü (`AppLayout.tsx:369–393`) kennen nur Esc und Außenklick; mit Scrim wirkt das Mehr-Menü modal. Ein Helfer an einer Stelle statt Eingriffen in zwei Upstream-Dateien |
| K43 | GLAS-DESIGN §7.18 Inhalte der Sheets „Mehr“ (Wert rechts, Fuß „Version · F…“) und „Räume“ (Kreis 32 mit Status-Override) | Etappe 2 baut per CSS Zeilen 52 (Mehr) bzw. 54 (Räume), einfarbige Symbole `label2` und den Kreis 32 am vorhandenen Raum-Symbol. Werte rechts, Fuß und Status-Override kommen mit den echten Sheets in Etappe 3 | Sie brauchen Markup und Logik (Werte je Eintrag, Raumstatus) in `AppLayout`/`RoomsMenu`; Etappe 3 baut beide Menüs ohnehin als Sheets neu |
| K44 | Plan-Entwurf „Symbole aus `WeatherHero.tsx` (dort `export`)“ | eigene Zuordnung HA-Wetterzustand → Lucide-Symbol in `components/glas/weatherIcon.ts` | `WeatherHero.tsx` ist toter Code (nirgends eingebunden); entfernt Upstream die Datei, bräche der Import |

Begriffe: „Benachrichtigungen“ statt „Mitteilungen“ (die Skizze nutzt beide; HAPulse heißt sie überall
„Benachrichtigungen“, `notifications.title`).

---

## 2. Laufzeit: `app/glas/`

### 2.1 `GlasRuntime.tsx` (neu, in `AppLayout` eingehängt, eine `[fork]`-Zeile)

Rendert in Klassisch nichts und hängt keine Listener an. In Glas:

| Aufgabe | Umsetzung |
|---|---|
| Scroll | ein `scroll`-Listener (`passive`), Auswertung in `requestAnimationFrame`; schreibt nur bei Änderung: `--g-y` und `--g-edge` an `.app-main` und `.g-edge` (K22), `data-tabs-min` (Handy), `data-g-scrolled` (Desktop). Breakpoint per `matchMedia('(min-width: 900px)')`. Solange der Fokus in der Tab-Leiste liegt, minimiert sie nicht |
| Titel-Lage | Oberkante des großen Titels (`main h1`) im Dokument, neu gemessen bei Routenwechsel und `ResizeObserver` auf `main`; Bandhöhe 60 (Banner 120). Ohne `h1` folgt `--g-y` direkt `scrollY` |
| Scroll-Kante | ein fixiertes Element `.g-edge` (Handy 96 px, Desktop 104 px ab der Kante der Seitenleiste), Kind von `.app-layout`, nicht Vorfahre einer Glasfläche, `pointer-events: none`, Ebenen nach §5.7; am Handy mit dem kleinen Titel (K21, `aria-hidden`, das `h1` bleibt die Überschrift) |
| „Fertig“ am Handy | `components/glas/DoneCapsule.tsx`, solange der Modus an ist, auf jeder Route (K24) |
| Menü-Tasten | ein `keydown`-Listener für die Upstream-Menüs (K42): steht der Fokus auf einem `[role=menuitem]` in `.rooms-menu--open` oder `.app-more-menu--open`, bewegen Pfeile/Pos1/Ende ihn nach `menuKeys.ts`; vom Auslöser mit `aria-expanded="true"` führt Pfeil runter/hoch auf den ersten/letzten Eintrag |
| Glanz | `pointerdown` (delegiert) auf Glasflächen setzt `--gx`/`--gy` (px) am Element |
| Aufräumen | Wechsel nach Klassisch: Listener weg, `--g-y`/`--g-edge`/`--gx`/`--gy`/Attribute entfernt, Kante und Kapsel ausgehängt |

Routenwechsel: `ScrollToTop` setzt `scrollTop = 0` → der nächste Scroll-Wert klappt die Leiste aus. Steht die Seite schon
oben, setzt `GlasRuntime` den Zustand beim Routenwechsel selbst zurück.

### 2.2 `glasScroll.ts` und `menuKeys.ts` (neu, rein, getestet)

- `titleY(scrollY, titleTop, band)` → 0–64 in 4-px-Schritten (ohne Titel: `scrollY`); `edgeOpacity(scrollY)` → 0–1 in
  Zehnteln.
- `nextTabsMin(state, y, maxY)`: Zustand `{ min, anchor }`. Runter: `y > anchor + 24` → klein (Anker = y); hoch:
  `y < anchor − 24` oder `y ≤ 40` → groß; Seitenende (`y ≥ maxY − 2`) → groß; Gummiband (`y < 0` oder `y > maxY`)
  ändert nichts; der Anker folgt der jeweiligen Gegenrichtung (sonst müsste man nach langem Runterscrollen erst 24 px
  hoch, um wieder zu minimieren). Werte aus GLAS-DESIGN §6.3, GLAS-PLAN §2.8.
- `tabMinGeometry(width, activeCenter)` → `{ sx: 52 / width, sy: 52 / 62, rx: width / 2, dx: 26 − activeCenter }` für
  die minimierte Leiste (§3.1).
- `edgeTitle({ pathname, navLabel, roomName, h1 })` (K21).
- `menuKeys.ts`: `nextMenuIndex(key, index, count)` für Pfeil runter/hoch (mit Umlauf), Pos1, Ende (K42; auch vom
  Avatar-Menü genutzt).

### 2.3 `shellStore.ts` (neu)

Kleiner Zustand ohne Persistenz: `editTargets` (Zähler, von `EditToggle` gemeldet, K23) und `tabsMin` (von `GlasRuntime`
gesetzt, von `GlasTabBar` gelesen, damit der Einblenden-Knopf ihn zurücksetzen kann).

### 2.4 `useLens.ts` (neu)

Misst das aktive Element in einem Container (`offsetLeft/Top`, Breite, Höhe, wahlweise mit Einzug) bei Routenwechsel,
Größenänderung, Einklappen und Bearbeiten-Modus und schreibt `--g-lens-x/-y/-w/-h` auf den Container. Genutzt von
Tab-Leiste und Seitenleiste (dort Einzug 2 px oben und unten, K40). Reduzierte Bewegung: Linse springt (keine
Transition).

---

## 3. Handy (< 900 px)

### 3.1 Tab-Leiste (GLAS-DESIGN §7.1, §6.3)

- `.app-tabs` in Glas: `left/right 16`, `bottom calc(22px + env(safe-area-inset-bottom, 0px))`, Höhe 62,
  Innenabstand 4, ohne eigenen Hintergrund, Rand und `backdrop-filter` (sonst Backdrop-Root für die Glasfläche darin).
  K33 ab 600 px.
- `GlasTabBar` (K20): `.g-tabs__glass` (Glas, Radius 31, Tönung `--g-tint-tab-bar`), `.g-tabs__lens` (70 × 54,
  Radius 27, `--g-lens`, gleitet `snappy` .35 s mit Dehnung 420 ms; Position aus `useLens`), `.g-tabs__expand`
  (52-px-Knopf „Tab-Leiste einblenden“, nur minimiert vorhanden). Alle `aria-hidden` außer dem Knopf. Nach dem
  Einblenden per Knopf geht der Fokus auf den aktiven Eintrag (der Knopf verschwindet, sonst fiele er auf `body`).
- Einträge: 54 hoch, Radius 27, Symbol 24 (per CSS, Strich 1,75), Abstand 2, Beschriftung 11/13 600 `label`; aktiv
  `--g-tab-ink`. **Gefülltes Symbol** nur für eine geprüfte Liste von Lucide-Symbolen (Haus, Kamera, Wellen, Schild,
  Raster …) über ihre Klassen am `svg` (`lucide-house` usw., stehen im Selektor-Wächter als Laufzeit-Klassen),
  Innendetails mit `stroke: var(--g-bg)`; alle übrigen bleiben Strich (Liste per Screenshot geprüft, §6.3).
- **„Mehr“ aktiv:** liegt die aktuelle Route im Mehr-Menü, sitzt die Linse auf „Mehr“ und das Symbol ist `tab-ink` (wie
  iOS). `AppLayout` gibt dafür die Pfade der Mehr-Einträge mit (`morePaths`, Teil der `[fork]`-Zeile); steht „Räume“ im
  Mehr-Menü, gehört `/room/` dazu. In Klassisch bleibt dort nichts markiert, wie heute.
- **Mehr-Menü:** `GlasTabBar` bekommt auch `moreOpen` und fokussiert beim Öffnen den ersten Eintrag (K42).
- **Minimiert** (`:root[data-tabs-min]`): Glasfläche `scale(var(--g-tab-sx), var(--g-tab-sy))` mit Ursprung unten links,
  Radius `var(--g-tab-rx) / 31px` — beides aus der gemessenen Breite W (`tabMinGeometry`, neu bei Größenänderung), damit
  bei jeder Breite ein Kreis 52 entsteht (bei W = 358 sind es `scale(.1453, .8387)` und `179px / 31px` aus GLAS-DESIGN
  §7.1); aktives Symbol per `translate(var(--g-tab-dx), 12.5px)` in den Kreis; übrige Einträge `opacity 0` +
  `scale(.5)`, Beschriftungen zuerst (120 ms). Einträge sind dann `visibility: hidden` (nicht fokussierbar), das aktive
  Symbol bleibt sichtbar; fokussierbar ist nur der Einblenden-Knopf. Klein `smooth` .5 s, groß `bouncy` .6 s; reduzierte
  Bewegung: ohne Animation.
- **Versteckt**, solange das Mehr- oder Räume-Sheet offen ist (`:has()`): `translateY(14px) scale(.94)`, Glas blendet aus.
- Inhalt läuft unter die Leiste: `.app-main` unten 132 + Safe Area.

### 3.2 Avatar und Avatar-Menü (GLAS-DESIGN §7.4, GLAS-PLAN §2.6)

`components/glas/AvatarMenu.tsx` (neu). `PageHeaderActions` rendert in Glas im Handy-Teil
(`.page-header-actions__mobile`, am Desktop schon ausgeblendet) `<AvatarMenu />` statt Glocke und Avatar; das
mitgegebene `EditToggle` bleibt eingehängt (es schaltet den Modus für Nicht-Admins ab und meldet sich an, K23), ist in
Glas aber per CSS ausgeblendet. So bleibt der Knopf an seiner Stelle im DOM (Tab-Reihenfolge oben), sitzt aber fixiert
oben rechts.

- Knopf 44 (`top calc(8px + Safe Area oben)`, `right 14`), Glas-Kreis 40 (Tönung `--g-tint-avatar-button`), Bild oder
  Initiale 17/22 600; ohne Nutzerdaten ein Personen-Symbol (das Menü muss erreichbar bleiben). Roter Punkt 11 × 11
  `--g-badge` mit 2-px-Ring `--g-bg` (`top 4`, `right 4`), solange Benachrichtigungen da sind. `aria-haspopup="menu"`,
  `aria-expanded`, Label „Konto {Name}, {n} neue Benachrichtigungen. Menü öffnen“.
- Menü (Portal an `body`): 250 breit, `top calc(58px + Safe Area oben)`, `right 16`, Radius 22, Sheet-Material (K29),
  Einträge min. 48, Body 17, Symbol rechts, Trennlinien ab 16. Dahinter Abdunklung `--g-av-dim` +
  `blur(10px) saturate(120%)`.
  1. **Benachrichtigungen (n)** → Popover (K25, §3.3).
  2. **Bearbeiten** (nur wenn ein `EditToggle` der Seite gezeigt würde, K23); im Modus „Bearbeiten beenden“ mit Haken.
  3. **Einstellungen** → `/settings`; mit Host-Menü (`UserMenuContext`, SaaS) dessen Inhalt nach einer Trennlinie, mit
     `DashboardNavContext` wie in `UserAvatar`.
- `role="menu"`, Einträge `menuitem`; Fokus auf den ersten Eintrag, Pfeile/Pos1/Ende (`menuKeys.ts`), Esc und Außenklick
  schließen, Fokus zurück zum Avatar. Öffnen: `scale(.16, .3)` + `blur(4px)` → 1, `snappy` 460 ms, Ursprung
  `230px −28px`, Inhalt ab 110 ms (Keyframes `g-*`); Schließen 280 ms `cubic-bezier(.4,0,1,1)`; reduziert:
  Überblendung 200 ms (K38).

### 3.3 Benachrichtigungen am Handy (K25)

`NotificationsPanel.tsx` exportiert `useNotifications`, `Panel` und den Typ (`[fork]`). `AvatarMenu` öffnet `Panel`
mit fester Lage (`top calc(58px + Safe Area oben)`, `left/right 16`, in Glas `width: auto` auch zwischen 560 und
899 px, wo Klassisch 340 setzt); Verwerfen und „Alle schließen“ rufen dieselben Dienste
(`persistent_notification.dismiss`/`dismiss_all`). Außenklick, Esc und Fokusrückgabe baut `AvatarMenu` nach (sie stecken
in der Hauptkomponente `NotificationsPanel.tsx:173–197`, nicht in `Panel`): beim Öffnen Fokus auf den ersten Knopf im
Panel (leer: auf dem Avatar), beim Schließen zurück zum Avatar. Aussehen wie das Desktop-Popover (§4.4). Abo, Zähler
„9+“ (am Desktop), Leerzustand bleiben (A14).

### 3.4 Großer Titel, Wetterzeile, Scroll-Kante (GLAS-DESIGN §3.5, §7.4, §6.3; GLAS-PLAN §2.7, §2.18)

- Seitentitel `.page__title`: Large Title 34/41 700 (.37 px). Begrüßung `.greeting__title` am Handy 30/36 700 (.2 px),
  eine Zeile, ohne 👋 (CSS); am Desktop 34/41.
- `components/glas/WeatherLine.tsx` (neu): Knopf min. 44 (Rand −6 0), Wettersymbol nach Zustand (K44) + „14 °C ·
  Teilweise bewölkt“ 17/22 `label2` + Chevron → `WeatherModal` (wie die Wetter-Pille; Entitätswahl für Bearbeiter
  bleibt, A13). Temperatur gerundet wie die Pille, über `formatNumber`, Einheit mit festem Leerzeichen; Zustandstext wie
  HA ihn übersetzt (nicht kleingeschrieben — „nebel“ wäre falsch). `GreetingBlock.tsx` rendert sie in Glas zusätzlich
  (`[fork]`), ohne Wetter-Entität nicht. CSS zeigt am Handy die Wetterzeile statt des Untertitels, aber nur wenn es sie
  gibt (`:has(.g-weather-line)`); am Desktop den Untertitel.
- Kopplung (nur Handy): Titel `opacity: calc(1 − var(--g-y) / 40)`, `scale(1 − .05 · min(y/48, 1))` (Ursprung unten
  links); Wetterzeile/Untertitel `1 − y/28`; Kante `var(--g-edge)`; kleiner Titel `clamp(0, (y − 24)/28, 1)` +
  `translateY((1 − o) · 6px)`; Übergänge 140 ms linear.
- Kante Handy: 96 hoch (+ Safe Area oben), `linear-gradient(var(--g-bg) 0%, transparent)` + `blur(10px)`, Maske
  `linear-gradient(black 45%, transparent)`; kleiner Titel 17/22 600 zentriert (`top 8`, Höhe 44, seitlich 72 frei).
  Keine Linie, keine Abdunklung. Mit `data-contrast="more"` ohne Blur.

### 3.5 Reihenfolge und Abstände

- Inhalt: oben 60 (mit Banner 120), Seiten 16, unten 132 + Safe Area; oben jeweils + Safe Area (K39).
- Übersicht: Begrüßung → Wetterzeile → Chips (K26), Chips mit Abstand 14 zur Wetterzeile, Reihe bis an den Rand
  (Rand −16, Innenabstand 16).
- Übrige Seiten: Chips, dann Titelzeile (K27). Raumseite: Zurück als Glas-Kreis 44 (`top 8` + Safe Area, `left 16`,
  Tönung `--g-tint-back-button`, Größe per `[fork]`, K41), der Raumname bleibt in der Raumkarte und erscheint beim
  Scrollen klein in der Kante.
- „Fertig“ (K24, `DoneCapsule`): Trefferfläche 44 (`top 8` + Safe Area), sichtbare Kapsel 40, `right 66` neben dem
  Avatar bzw. `right 16` auf Seiten ohne Avatar, 17/22 600, `prominent`, erscheint per Materialisieren.

### 3.6 Mehr- und Räume-Menü als Sheet-Look (GLAS-PLAN §3 Etappe 2)

Keine Modals, deshalb nur CSS: `bottom/left/right 8` (+ Safe Area), Radius 40, Sheet-Material, Zeilen 52 (Mehr) bzw.
54 (Räume, Symbol im Kreis 32 `fill`), Symbol 22 einfarbig `label2` in eigener Spalte, Trennlinie 0,5 px ab
Textbeginn, Chevron `label3`; aktive Zeile Häkchen-Farbe `accent-ink` statt Hintergrund; Werte, Fuß und Raumstatus
folgen in Etappe 3 (K43). Scrim `--g-scrim` über `.app-layout:has(.app-more-menu--open, .rooms-menu--open)::before`
(nicht am Menü-Container: dessen `pointerdown`-Stopp würde den Außenklick schlucken). Beide Menüs wechseln
`display: none` → `block`, eine Transition startet dort nicht: Einblenden als Keyframes `g-sheet-in`
(`translateY(calc(100% + 16px))` → 0, `smooth` .5 s); Schließen ohne Animation (kommt mit Etappe 3). Kein Greifer
(nicht ziehbar). Schließen bei Außenklick, Esc, Routenwechsel wie heute (A5, A6, A10); Pfeiltasten und Fokus beim Öffnen
nach K42.

### 3.7 Banner und Toasts

- Verbindungsbanner (A18): fixiert `top calc(58px + Safe Area oben)`, `left/right 16`, min. 40, Radius 20,
  Innenabstand 8 14 8 12, 13/18 600 `label`, Fläche `--g-banner-reconnecting` bzw. `--g-banner-lost`, Schatten
  `--g-shadow-banner`; Symbol per `::before` (Ring, der sich beim Wiederverbinden dreht, außer bei reduzierter Bewegung;
  „!“ im Kreis bei verloren). Inhalt rückt auf 120.
- Toasts (A24): `bottom calc(96px + Safe Area)` (über der Tab-Leiste), `left/right 16`, min. 52, Radius 20,
  `--g-toast-bg` + `blur(20px) saturate(180%)`, Schatten `--g-shadow-toast`, Text 15/20 `--g-toast-text`, roter Kreis
  26 mit „!“ per `::before`, × sichtbar 40 (Trefferfläche 44, K40). Einblenden `translateY(16px) scale(.96)` → 1,
  420 ms `snappy`. `Toaster.tsx` ist eine Fork-Datei: in Glas trägt jeder Toast `role="alert"` (es sind immer
  Fehlermeldungen, GLAS-DESIGN §7.25) statt der höflichen Live-Region; Klassisch bleibt unverändert.

---

## 4. Desktop und iPad quer (≥ 900 px)

### 4.1 Seitenleiste (GLAS-DESIGN §7.2, GLAS-PLAN §2.9)

- Glas-Panel fixiert `left/top/bottom 12`, Breite `--g-sidebar-w` (260 bzw. 72 eingeklappt; eigene Variable, weil
  `--sidebar-width` inline auf `.app-layout` steht), Radius 28, Innenabstand 12, Tönung `--g-tint-sidebar`.
  `.app-content` rückt um `12 + w` ein; Breite und Einzug wechseln `snappy` .55 s, Beschriftungen blenden in .2 s.
- Kopf 48: Logo-Kachel 32 + Wortmarke 20/25 700 (K34).
- **Gruppen** (E10): `app/glas/navGroups.ts` (rein, getestet) + `GlasNavGroups.tsx`; in Glas und nicht im
  Bearbeiten-Modus rendert `AppLayout` statt der flachen Liste die Gruppen „Zuhause“ (Übersicht, Räume, Szenen,
  Automationen), „Bereiche“ (NVR, Pool, Sicherheit, Energie, Musik, Geräte), „System“ (System, Einstellungen).
  Reihenfolge in der Gruppe = Nutzer-Reihenfolge, ausgeblendete fehlen, leere Gruppen fehlen, unbekannte Einträge (neue
  Upstream-Seiten) landen in „Bereiche“. Die Einträge selbst rendert weiter `renderSidebarItem` (NavLink, Räume-Knopf mit
  Refs und `aria-expanded`). Gruppenköpfe 13/18 600 `glass-label-2`, Höhe 26 (erste) bzw. 34, Einzug 12; eingeklappt
  0,5-px-Trennlinien. Im Bearbeiten-Modus die flache Liste wie heute (Ziehen, Augen; A7).
- Einträge mit Trefferfläche 44, sichtbar als Kapsel 40 (K40), Innenabstand 0 12 0 13, Symbol 20 + 17 px (aktiv 600);
  aktiv = Linse 40 (`useLens` mit Einzug 2, `--g-lens`, gleitet `snappy` .45 s mit Dehnung `scale(.97, 1.16)`) + Symbol
  `accent-ink`; inaktiv Symbol `glass-label-2`; Hover `--g-fill` auf der sichtbaren Kapsel. „Räume“ mit Chevron (CSS).
  Eingeklappt: Tooltips wie heute (A3).
- Status-Pille (A8): min. 52, Radius 18, `--g-fill`, Kreis 26 in Zustandsfarbe mit Glyphe `glyph-dark` (K31), Titel
  15/19 600, „Heimstatus“ 12/16 `glass-label-2`; alle Zustände und Schwellen unverändert. Einklapp-Knopf 44 × 44,
  sichtbar 44 × 36 (K40).
- Räume-Popover (A5): 280 breit, Radius 22, Tönung `--g-tint-menu`, Einträge 44 (Radius 14), Symbol + Name 17 + ›,
  neben der Seitenleiste (`--sidebar-width` am Popover neu gesetzt; die Upstream-Regel mit `!important` liest die
  Variable am Popover), Materialisieren beim Öffnen (Keyframes, es wechselt `display`), Pfeiltasten (K42).

### 4.2 Kopf (GLAS-DESIGN §7.3, GLAS-PLAN §2.10)

- `.app-header-cluster-wrapper` fixiert `top 16`, Höhe 56, `left 12 + w`, `right 0`; die innere Reihe hat dieselbe
  Breitenregel wie `.app-main` (max. 1400, mittig, innen 28 links, 32 rechts), damit Kopf und Inhalt bündig bleiben.
  Abstand 10.
- Reihenfolge: [Zurück 48, nur Raumseiten, K32, Größe per `[fork]`, K41] · Chips (flex, scrollt, Maske an den Rändern,
  K37) · Wetter-Pille 44 (`card` + Schatten, Symbol nach Zustand (K44), „14 °C“ 600, Zustand `label2`, 15/20) ·
  **Benachrichtigungen** Glas-Kapsel 48 um die Glocke 44 (Größe per `[fork]`, K41), Zähler min. 18
  `--g-badge`/`--g-on-badge` 11/18 700 „9+“ · **Bearbeiten** Glas-Kapsel 124 × 48, 17/22 500 ↔ **Fertig** 92 × 48
  `prominent` 17/22 600 · Avatar 44 (Kreis 40 `accent-soft`, Initiale 17/22 600), ohne Glas → Einstellungen bzw.
  Host-Menü (A15).
- „Bearbeiten“/„Fertig“: `EditToggle` bekommt `variant="label"` (`[fork]`): eigener `<button>` mit Text statt Symbol,
  Klasse `g-edit-capsule`, Zustand über `aria-pressed` (die Aktiv-Klasse von Upstream gibt es nur zur Laufzeit); die
  Variante meldet sich nicht im `shellStore` an. `HeaderCluster` rendert sie in Glas, wenn die Seite Bearbeiten anbietet
  oder der Modus an ist (K23, K24). Die übrigen `EditToggle` (Seitenköpfe, Raum-Kopf) sind in Glas ausgeblendet, bleiben
  aber eingehängt. Wechsel Bearbeiten ↔ Fertig: alt `scale(.7, 1)` + Blur + Ausblenden, neu `scale(1.4, 1)` → 1
  `snappy` .55 s; kein Wackeln; reduziert Überblendung (K38).

### 4.3 Inhalt und Scroll-Kante

`.app-main` oben 92 (mit Banner 136), links 28, rechts 32, unten 72. Kante 104 px ab der Seitenleiste:
`linear-gradient(var(--g-edge-tint) 45%, transparent)` + `blur(12px)`, Maske `linear-gradient(black 55%, transparent)`,
blendet bei `data-g-scrolled` in .25 s ein; ohne kleinen Titel; unter dem Kopf (§5.7). Der große Titel klappt am
Desktop nicht ein.

### 4.4 Popover

- Benachrichtigungen (A14): 392 breit, unter der Glocke (die vorhandene Lage aus dem Auslöser ergibt `top` ≈ 76),
  Radius 26, Tönung `--g-tint-menu`, Schatten `--g-shadow-popover`, Innenabstand 8; Kopf 17/600 + „Alle schließen“
  `accent-ink`; Zeilen Radius 18, Titel 15/600, Text 13 `label2`, × Trefferfläche 44 mit Kreis 26 `--g-fill` (K40);
  Leerzustand im Glas-Look (§7.31). Ohne Symbol-Kachel (K36).
- Avatar-Host-Menü (SaaS): gleiche Menü-Fläche, Schatten `--g-shadow-menu`.
- Öffnen per Materialisieren (Keyframes `g-materialize`: `opacity 0`, `scale(.92)`, `blur(8px)` → 1, `snappy`; ersetzt
  in Glas die Upstream-Animation `notif-panel-in`), reduziert Überblendung 200 ms (K38).

### 4.5 Banner und Toasts

Banner: zentrierte Kapsel `top 80`, min. 40, 15/20 600, gleiche Flächen und Symbole wie am Handy. Toasts: unten rechts
(`right 32`, `bottom 24`), Glas-Kapsel (Tönung `--g-tint-toast-desktop`) max. 460, min. 52, Symbol `red-ink`, Text
15/500, × Trefferfläche 44 mit Kreis 28 `--g-fill`; Einblenden 500 ms `snappy` + Blur; `role="alert"` wie am Handy.

---

## 5. Gemeinsam

### 5.1 Material, Tönung, Tokens (K28–K30)

- `glasTokens.ts`: `--g-tint-<fläche>` für die Flächen aus `GLAS_SURFACE_TINT` (Tab-Leiste, Avatar, Zurück,
  Kopf-Kapsel, Seitenleiste, Menü, Toast Desktop, Sheet mittel); `sheetFill`/`sheetFilter` je Modus;
  `--g-shadow-{menu,popover,banner,toast,prominent}` aus `glas-tokens.json` `elevation`; deckend/„Transparenz
  reduzieren“/mehr Kontrast wie bisher über `data-glass="opaque"`.
- `material.css`: Rezept für `:where(.g-glass, <Rahmenflächen>)` (K30): `.g-tabs__glass`, `.app-sidebar`, Avatar-Kreis,
  Zurück (Handy), Glocken-Kapsel, `.g-edit-capsule:not([aria-pressed='true'])`, Popover, Desktop-Toast. Sheet-Material
  als zweite `:where()`-Liste (Avatar-Menü, Mehr/Räume am Handy), ebenfalls in allen Rückfall-Blöcken. Flächenregeln
  setzen nur Lage, Größe, Radius und `--g-surface-tint`.
- **Höchstens drei Glasflächen in Ruhe:** Handy Tab-Leiste + Avatar (+ Zurück auf der Raumseite); Desktop Seitenleiste
  + Benachrichtigungen + Bearbeiten. Die Scroll-Kante zählt nicht (kein Glas, GLAS-DESIGN §3.5). Menüs kommen
  vorübergehend dazu, mit Scrim darunter.
- **Kein Glas auf Glas:** Linse, Einträge, Knöpfe auf Glas bekommen Füllung, nie `backdrop-filter`. Kein Vorfahre einer
  Glasfläche mit `opacity < 1`, `filter`, `mask`, `clip-path`, `mix-blend-mode`, `backdrop-filter` oder
  `will-change` (K35; geprüft in §6.3).
- Druck: Glas-Knöpfe `scale(var(--flex))` (Avatar 1.08, Kapseln 1.04, Tab-Leiste 1.02, Zurück 1.10) + Glanz.

### 5.2 Textstile (K19, Teil Rahmen)

Large Title, Begrüßung, Headline (kleiner Titel), Body (Seitenleiste, Menüs), Subhead (Chips, Wetter, Toasts),
Footnote (Banner Handy), Caption 2 (Tab-Beschriftung). Alles andere behält die Größen von Klassisch bis zu seiner Etappe.

### 5.3 Chips (GLAS-DESIGN §7.5, nur CSS)

Kapsel 44, Radius 22, `card` (Desktop + Schatten), 15/20, Symbol 18 (Desktop 19), Abstand 8, Innenabstand 0 16 0 13;
Farbe nur an der Glyphe (an = Ink des Zustands, aus `label2`), Text Warnung 600; Personen-Monogramme 26 mit Ring.
Die Chip-Fenster selbst bleiben bis Etappe 3 die klassischen Modals.

### 5.4 Bewegung und reduzierte Bewegung

Federn und Dauern aus `--g-spring-*`/`--g-d-*`. Animiert werden nur `transform`, `opacity`, `filter`, Radius und die
Breite der Seitenleiste (wie heute in Klassisch). Menüs, die `display` wechseln, blenden per Keyframes `g-*` ein.
Reduziert (K38): Menüs, Popover, Kapselwechsel, Toasts, Banner, Kante und kleiner Titel überblenden 200 ms; kein Flex,
keine Dehnung, Linse springt, Minimieren ohne Animation, Banner-Ring dreht nicht.

### 5.5 Boot, Fehlerkarte (A19–A21, A23)

Nur Tokens: Boot-Anzeige (Logo, Spinner, „Lädt …“) und Fehlerkarte (`PageErrorBoundary`, Inline-Stile mit Tokens) im
Glas-Look ohne Markup-Änderung. Der Seiten-Platzhalter nutzt schon `--text-faint` (`Router.tsx:55`) und bleibt so.
Chunk-Reload unverändert.

### 5.6 Texte (alle 7 Locales, `glas.*`, K17)

`glas.nav.group.{home,areas,system}`, `glas.tabs.expand`, `glas.avatar.{label,labelUnread,notifications,edit,editDone}`
(Plural über `.one`/`.other` wie die vorhandenen Schlüssel), `glas.edit.{label,done}`. Wiederverwendet:
`nav.settings`, `notifications.*`, `editToggle.*` (ARIA), `nav.weatherGlance.ariaLabel`.

### 5.7 Ebenen (aus `glas-tokens.json` `zIndex`)

| Ebene | z | Elemente |
|---|---|---|
| Kante | 90 (Titel 95) | `.g-edge`, kleiner Titel; `pointer-events: none` |
| Seitenleiste | 100 | wie Klassisch |
| Kopf | 120 | Desktop-Kopf, am Handy Avatar, Zurück, „Fertig“ |
| Tab-Leiste | 200 | wie Klassisch |
| Banner | 210 | Verbindungsbanner |
| Menüs | 300 | Mehr, Räume (wie Klassisch) |
| Avatar-Menü | 910 | Menü und Abdunklung |
| Popover, Modals | 1000 | Benachrichtigungen, Host-Menü, Modals (wie Klassisch) |
| Toast | 1100 | über Modals (Klassisch 1000) |

---

## 6. Dateien, Tests, Prüfung

### 6.1 Neue Dateien (Fork)

| Datei | Inhalt |
|---|---|
| `app/glas/GlasRuntime.tsx`, `glasScroll.ts`, `menuKeys.ts`, `shellStore.ts`, `useLens.ts` | §2 |
| `app/glas/navGroups.ts`, `GlasNavGroups.tsx`, `GlasTabBar.tsx` | §3.1, §4.1 |
| `components/glas/AvatarMenu.tsx`, `DoneCapsule.tsx`, `WeatherLine.tsx`, `weatherIcon.ts` | §3.2–3.5, K44 |
| `styles/glas/shell.css` (Inhalt, Kopf, Seitenleiste, Kante), `tabbar.css`, `menus.css` (Avatar-Menü, Popover, Sheets), `titles.css` (Titel, Wetterzeile, Chips), `feedback.css` (Banner, Toasts, Boot, Fehler) | in `index.css` importiert |
| `test/glasScroll.test.ts`, `test/menuKeys.test.ts`, `test/navGroups.test.ts` | §6.3 |

Geänderte Fork-Dateien: `styles/glas/material.css` (K30), `styles/glas/motion.css` (K35, K38),
`components/ui/Toaster.tsx` (§3.7), `test/glasSelectors.test.ts`, `scripts/glas-shots.cjs`.

### 6.2 `[fork]`-Stellen in Upstream-Dateien

| Datei | Änderung |
|---|---|
| `app/AppLayout.tsx` | Importe; `WeatherGlance`: Symbol nach Zustand in Glas; `HeaderCluster`: Kapsel „Bearbeiten/Fertig“ und Zurück 48 in Glas; Seitenleiste: Gruppen statt flacher Liste in Glas ohne Bearbeiten; Tab-Leiste: `<GlasTabBar morePaths={…} moreOpen={…} />`; `<GlasRuntime />` |
| `components/ui/PageHeaderActions.tsx` | in Glas `<AvatarMenu />` statt Glocke und Avatar |
| `components/notifications/NotificationsPanel.tsx` | `export` für `useNotifications`, `Panel`, Typ; Glocke 44 in Glas (K41) |
| `components/ui/EditToggle.tsx` | `variant?: 'icon' \| 'label'` (Standard wie heute); Anmeldung im `shellStore` (K23) |
| `pages/Room.tsx` | Zurück 44 in Glas (K41) |
| `components/home/GreetingBlock.tsx` | `<WeatherLine />` in Glas |
| `components/ui/PulseLogo.tsx` | Wortmarke in Glas (K34) |
| `packages/core/src/glasTokens.ts` (Fork-Datei), `locales/*.json` | §5.1, §5.6 |

Klassisch: jede Stelle rendert dort exakt das Heutige (`null`, gleiche Props, gleiche Klassen, gleiche Inline-Größen).

### 6.3 Tests und Proben

| Prüfung | Inhalt |
|---|---|
| `smoke.mjs` „glas tokens“ | `--g-tint-*` je Stärke = `GLAS_SURFACE_TINT`; Sheet-Material und `--g-shadow-*` vorhanden; neue Kontrastpaare: Tab-Beschriftung und `tab-ink` auf Tab-Glas (Tönung .6) über Weiß/`#F2F2F7`/`#808080` bzw. Schwarz/Karte; Menütext und `label2` auf Sheet-Material und Menü-Glas; „Alle schließen“ (`accentInk`) auf Menü-Glas; Toast-Text auf `toastBg`; `redInk` auf dem Desktop-Toast; Bannertext auf beiden Mischflächen; Zähler `onBadge` auf `badge`; `glass-label-2` auf Seitenleisten-Glas und auf `fill` über Glas; `accentInk` auf der Linse über Seitenleisten-Glas; `glyphDark` auf den Statusfarben der Pille; Fokusring auf Glas |
| `glasScroll.test.ts` | Schritte von `--g-y`/`--g-edge`, ohne Titel = `scrollY`; Minimieren mit Anker, Gummiband oben und unten, Seitenende, `y ≤ 40`, kein Flattern bei ±23 px; `tabMinGeometry` bei 343/358/398/560; kleiner Titel je Route |
| `menuKeys.test.ts` | Pfeile mit Umlauf, Pos1, Ende, leere Liste |
| `navGroups.test.ts` | Gruppen, Reihenfolge in der Gruppe, Ausgeblendete, leere Gruppen, unbekannte IDs → „Bereiche“ |
| `glasSelectors.test.ts` | neue CSS-Dateien in der Liste; neue Klassen `g-*` oder Upstream; Lucide-Klassen der gefüllten Symbole in `RUNTIME_CLASSES`; `!important` nur in `@media (prefers-reduced-motion: reduce)` und nur für `transition-*`/`animation-*` (K38); die `:where()`-Listen in `material.css` sind in allen Blöcken gleich (K30) |
| `glas-shots.cjs shoot` | neue Szenen in beiden Stilen: gescrollt (Handy 700, Desktop 400), Avatar-Menü, Benachrichtigungen (Handy/Desktop), Mehr, Räume, Bearbeiten an, Seitenleiste eingeklappt, Banner und Toast (eingefügtes Markup wie von den Komponenten), minimierte Leiste bei 375, 390 und 430 |
| Klassisch | volle Matrix + neue Szenen gegen den Etappe-1-Build: **0 Pixel**; solange Etappe 1 nicht in `main` ist, zusätzlich gegen `main` mit `--expect settings` |
| `glas-shots.cjs checks` | Uhr: `requestAnimationFrame` läuft nur mit der Playwright-Uhr, jede Scroll-Prüfung rückt sie mit `run()` vor, höchstens 1900 ms je Dokument (`BUDGET`), sonst ein neues Dokument. Klassisch ohne Glas-Reste (keine `--g-*`/`data-tabs-min`/`data-g-scrolled`, keine `.g-*`-Elemente, gleiche Kinderzahl in `.app-tabs`); Minimieren/Ausklappen beim Scrollen, Seitenende, kein Minimieren bei Fokus in der Leiste; minimiert Kreis 52 ± 1 und Symbol mittig ± 1 bei 375/390/430; Linse liegt auf dem aktiven Eintrag (±1 px), „Mehr“ auf einer Mehr-Route; minimiert nur der Einblenden-Knopf fokussierbar, danach Fokus auf dem aktiven Eintrag; Avatar-Menü per Tastatur (Enter, Pfeile, Pos1/Ende, Esc, Fokus zurück) und Außenklick; Benachrichtigungen am Handy: Fokus ins Panel und zurück; Pfeile in Räume- und Mehr-Menü, Mehr fokussiert den ersten Eintrag; „Bearbeiten“ nur auf Seiten mit `EditToggle`, „Fertig“ auf jeder Route bei Modus an (auch Raum nicht gefunden); fixierte Elemente auf jeder Route an ihrer Soll-Lage (findet transformierte Vorfahren); Ebenen: die Mitte von Avatar, Zurück und „Fertig“ trifft den Knopf (`elementFromPoint`), die Kante fängt keine Taps; Trefferflächen des Rahmens ≥ 44 × 44; höchstens drei Glasflächen in Ruhe je Route und Breite, kein Glas in Glas, keine Backdrop-Root-Vorfahren; mit `data-glass=opaque` hat keine Rahmenfläche `backdrop-filter`; Gruppenköpfe, flache Liste im Bearbeiten-Modus, Einklappen mit Tooltips, Räume-Popover neben der Seitenleiste; Chips auf jeder Route; reduzierte Bewegung: Menüs und Toasts 200 ms nur Deckkraft, Tab-Leiste und Linse ohne Animation |
| Gefüllte Tab-Symbole | Screenshot aller Nav-Symbole aktiv in hell/dunkel; nur geprüfte kommen in die Liste |
| Klick-Fuzz | `click-fuzz-test.cjs … glas` Handy + Desktop ohne Fehler |
| Pflichtbefehle | `npm run typecheck && npm run build && npm test -w @hapulse/core && npm test -w @hapulse/dashboard && npm run lint` |

### 6.4 Abnahme (GLAS-PLAN §3 Etappe 2, ergänzt)

- [ ] Handy: Tab-Leiste minimiert beim Runterscrollen, klappt beim Hochscrollen und am Seitenende aus, kein Zittern beim
      Gummiband; minimiert ein runder Kreis bei jeder Breite; Linse gleitet; „Mehr“ markiert auf Mehr-Seiten.
- [ ] Handy: großer Titel klappt in die Kante ein, kleiner Titel erscheint; Wetterzeile öffnet das Wetter-Fenster.
- [ ] Handy: Avatar-Menü mit Benachrichtigungen, Bearbeiten (nur wo es geht) und Einstellungen bzw. Host-Menü; roter
      Punkt; „Fertig“ beendet den Modus auf jeder Seite.
- [ ] Desktop: Gruppen, Einklappen zur 72-px-Leiste mit Tooltips, Bearbeiten-Kapsel auf allen bearbeitbaren Seiten,
      „Fertig“ immer bei Modus an; Kopf bündig mit dem Inhalt; Kante ab 8 px.
- [ ] ≤ 3 Glasflächen in Ruhe, kein Glas auf Glas, Trefferflächen ≥ 44, Klassisch 0 Pixel Unterschied.
- [ ] Tastatur: Tab-Reihenfolge, Fokusring `--g-focus`, Pfeiltasten in allen Menüs, Esc schließt Räume-, Mehr-,
      Avatar-Menü und Popover, Fokus kehrt zurück.
- [ ] Labor (§9): Statusleiste der Home-Bildschirm-App verdeckt nichts (K39).
- [ ] Nicht verlieren: A1–A26 (u. a. Logo/Wortmarke, Einklappen pro Gerät, Nav-Reihenfolge, Räume als Popover/Sheet,
      Nav-Bearbeiten, Status-Pille, Tab-Leiste 4 + Mehr, Kopf mit Zurück/Chips/Wetter, Benachrichtigungen, Avatar,
      Kopfaktionen auf allen Seiten, Banner, Boot, Fehlerkarte, Chunk-Reload, Toasts, „Was ist neu“), B17 (Chips
      bearbeiten auf der Übersicht), D8 (Nav-Bearbeiten).

### 6.5 Changelog und Doku

Fork-Changelog: F31 erweitern, solange Etappe 1 nicht ausgerollt ist, sonst F32 („Glas (Vorschau): Rahmen im neuen
Stil“ — schwebende Tab-Leiste, Avatar-Menü, großer Titel, Glas-Seitenleiste mit Gruppen, Kopf-Kapseln). Nachziehen:
`docs/SYNC.md` (neue Dateien, `[fork]`-Stellen, Klassen, die Glas voraussetzt), `CLAUDE.md` (Stand der Etappen),
GLAS-PLAN-Haken, GLAS-DESIGN §10.3 (Verweis auf diesen Plan).

---

## 7. Risiken

1. **Fixierte Elemente in Seitenköpfen:** jeder Vorfahre mit `transform`, `filter`, `contain` oder `will-change`
   verschiebt Avatar, Zurück und „Fertig“. K35 nimmt die Eintritts-Animation heraus; die Lage-Prüfung (§6.3) läuft auf
   jeder Route.
2. **NVR-Kameraseite:** das Paket rendert `PageHeaderActions` in seinem Kopf; am Handy sitzt der Avatar dann fixiert
   über der Chip-Leiste statt in der Kopfzeile. Prüfen (Demo zeigt nur die Einrichtungskarte, mit echten Kameras im
   Labor); die immersive Kameraseite kommt in Etappe 6.
3. **iPad quer:** die Glas-Seitenleiste nimmt dem Inhalt 60 px mehr als Klassisch (1180: drei Spalten zu ~271 statt
   ~283 px). Spalten nach Inhaltsbreite kommen mit der Übersicht (Etappe 4).
4. **Gefüllte Symbole** hängen am SVG-Aufbau und an den Klassennamen von Lucide; deshalb Liste + Screenshot, unbekannte
   Symbole bleiben Strich, und der Selektor-Wächter kennt die Klassen ausdrücklich.
5. **Leistung:** Seitenleiste (Blur 11 px bei klar) + zwei Kapseln + Kante auf dem iPad; `--g-y` ändert sich in den
   ersten 64 px bis zu 17-mal, wirkt aber nur unter `.app-main` und `.g-edge` (K22). Messung im Labor (E17, Budget
   GLAS-PLAN §5.5).
6. **Upstream-Merges:** `AppLayout.tsx` ändert sich oft; die `[fork]`-Stellen in sieben Upstream-Dateien bleiben je ein
   bis drei Zeilen. `:has()` und Upstream-Klassen (`__inner`, `--open`) prüft der Selektor-Wächter.
7. **Statusleiste (K39):** in Chromium sind die Insets immer 0; ob die Home-Bildschirm-App oben etwas verdeckt, zeigt erst
   das echte iPhone. Fällt das Labor rot aus, kommt `viewport-fit=cover` mit allen Insets als eigener Schritt.
8. **`!important` in Bewegungsregeln (K38):** eng begrenzt; der Wächter lehnt jede andere Verwendung ab.
9. **Etappe 1 noch offen:** ändert sie sich im Review, wird Etappe 2 neu aufgesetzt.

## 8. Bewusst offen nach Etappe 2

Sheets und Desktop-Dialoge für alle Fenster (Chips, Wetter, Benachrichtigungen am Handy), das Schließen des
Mehr-Menüs mit Animation und die Sheet-Inhalte aus K43 (Werte, Fuß „Version · F…“, Raumstatus): Etappe 3. Hinweise,
Kartentitel, Spalten nach Inhaltsbreite, Reihenfolge der Übersicht im Markup: Etappe 4. Titel der übrigen Seiten im
Detail, Schalter, Segmente: Etappe 5. Kameraseite: Etappe 6. `viewport-fit=cover` nur, wenn das Labor es verlangt (K39).

## 9. Labor (zusätzlich zu PLAN-ETAPPE-0-1 §6)

Echtes iPhone/iPad (WebKit): **Pflicht vor dem Merge:** Home-Bildschirm-App oben (Statusleiste über Avatar, Zurück,
„Fertig“, Banner und Kante? K39) und unten (schwebende Leiste mit Safe Area). Außerdem: Gummiband oben/unten ohne
Flattern, dynamische Safari-Leisten mit fixierten Elementen, `-webkit-backdrop-filter` an Seitenleiste und Kapseln,
`:has()`-Scrim, minimierte Leiste als Kreis, Seitenleiste mit dem Finger (Trefferflächen), Leistung beim Scrollen und
Einklappen.

---

## 10. Review des Plans (2026-10-06)

Ein unabhängiger Prüfer hat den Entwurf gegen GLAS-PLAN, GLAS-DESIGN und den Code gelesen. Alle Befunde wurden am Code
nachgeprüft und stimmen.

| # | Befund | Eingearbeitet |
|---|---|---|
| 1 | Blocker: die Material-Liste in `:is()` hob die Rezeptregel auf 0,4,0; sie hätte `position` und Mindest-Tönung jeder Fläche überschrieben, und die Rückfälle (deckend, ohne `backdrop-filter`, `forced-colors`) galten nur für `.g-glass` | K30: `:where()`, dieselbe Liste in allen Blöcken (Wächter prüft), Flächen setzen Lage und Tönung selbst, „Fertig“ ausgenommen; Prüfung „deckend ohne `backdrop-filter`“ in `checks` |
| 2 | Glocke, Zurück (Handy und Desktop) und `EditToggle` setzen ihre Größe inline auf 40 | K41: `[fork]`-Zeilen mit `useIsGlas()`; die Kapsel ist ein eigener Knopf |
| 3 | Selektor-Wächter: `edit-toggle--label` und `edit-toggle--active` gibt es in keinem Klassisch-CSS, Lucide-Klassen nur zur Laufzeit | Klasse `g-edit-capsule`, `aria-pressed`, Lucide-Klassen in `RUNTIME_CLASSES` (§4.2, §3.1, §6.3) |
| 4 | Upstream schaltet bei reduzierter Bewegung jede Dauer mit `!important` ab; 200-ms-Überblendungen wären so nicht baubar | K38: eng begrenzte `!important`-Ausnahme im Wächter |
| 5 | Feste Werte für die minimierte Leiste ergeben nur bei 358 px Breite einen Kreis | `tabMinGeometry` aus der gemessenen Breite; Szenen und Prüfung bei 375/390/430 |
| 6 | Trefferflächen unter 44 (Seitenleiste 40, Einklapp-Knopf 36, × 36) | K40 |
| 7 | Keine Ebenen genannt; die Kante hätte Avatar, Zurück und „Fertig“ verdeckt und Taps gefangen; Toasts lagen auf Modal-Höhe | §5.7 aus `glas-tokens.json`, Kante `pointer-events: none`, Prüfung mit `elementFromPoint` |
| 8 | Statusleiste der Home-Bildschirm-App über fixierten Knöpfen nicht ausgeschlossen | K39: Lagen mit Safe Area, Labor-Pflichtpunkt vor dem Merge, Rückweg `viewport-fit=cover` |
| 9 | Tastatur: keine Pfeiltasten im Räume-Menü, Fokus fällt nach „Einblenden“ auf `body`, Panel-Fokus und -Schließen stecken nicht in `Panel`, Panel-Breite 340 zwischen 560 und 899 px, Mehr-Menü ohne Fokus beim Öffnen | K42, §3.1, §3.3 |
| 10 | Kann: „Fertig“ fehlt auf Seiten ohne `PageHeaderActions` | K24: `GlasRuntime` rendert die Kapsel |
| 11 | Kann: NVR-Übersicht hängt die Kopfaktionen in `.nvr-actions` | K35 mit `:has()` |
| 12 | Kann: „Räume“ im Mehr-Menü markiert „Mehr“ nicht | `/room/` in `morePaths` |
| 13 | Kann: Menüs wechseln `display`, Transitionen starten dort nicht | Keyframes `g-*` (§3.6, §4.1, §4.4) |
| 14 | Kann: Schatten nur in `glas-tokens.json` | K29: `--g-shadow-*` |
| 15 | Kann: Platzhalter in `label3` widerspricht GLAS-DESIGN §2.1 | Zeile gestrichen, Platzhalter bleibt `--text-faint` (§5.5) |
| 16 | Kann: `WeatherHero.tsx` ist toter Code | K44 |
| 17 | Kann: GLAS-DESIGN §7.18 (Räume 54 mit Kreis 32, Mehr-Fuß) ohne Begründung offen | K43 |
| 18 | Kann: `--g-y` auf `:root` | K22: an `.app-main` und `.g-edge` |
| 19 | Kleinkram: Zeilenhöhe 25 (K34), Warn-Dreieck (K31), Raumseite ohne `h1`, Untertitel ohne Wetter-Entität, `useLayoutEffect` (K23), Toast `role="alert"` (GLAS-DESIGN §7.25) | alle übernommen (K22, K23, K31, K34, §3.4, §3.7) |
| 20 | Tests: Playwright-Uhr ersetzt `requestAnimationFrame`; Vergleichsbasis solange Etappe 1 offen ist; fehlende Kontrastpaare | §6.3 |

Vom Prüfer bestätigt: `--sidebar-width` am Räume-Popover zu überschreiben funktioniert; der Scrim per
`.app-layout:has(…)::before` ist richtig, weil beide Menüs `pointerdown` stoppen; K21 und K27 (Begrüßung als `h1`,
Raumseite ohne `h1`, Chips außerhalb von `main`); die Zustände mit und ohne `EditToggle` (K23); der Modus ist global
(K24); keine Rahmenklasse nutzt in Klassisch `::before`/`::after` (K30); die Wortmarke hat Inline-Stile (K34); die
Begründung von K35; `.page` ist eine Flex-Spalte und `ScrollToTop` setzt `scrollTop = 0`; alle genannten `--g-*`-Farben
und Tönungs-Schlüssel gibt es; die `[fork]`-Stellen rendern in Klassisch unverändert.
