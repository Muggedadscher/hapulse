# Glas Etappe 7 — Feinschliff und Freigabe (kurzer Plan)

Stand `main` nach Etappe 6. Ablauf nach [GLAS-PLAN §3](../GLAS-PLAN.md): kurzer Plan, unabhängig geprüft (§5), ein PR.
Maßstab: GLAS-PLAN Etappe 7, §5.4–§5.6, §6, [GLAS-DESIGN](../GLAS-DESIGN.md) §6.3/§6.4, offene Punkte der Etappen
(K62 aus Etappe 3, K106 aus Etappe 6, PLAN-ETAPPE-5 §8 „Offen für Etappe 7“, PLAN-ETAPPE-6 §7.4), Laborliste
PLAN-ETAPPE-0-1 §6, „Glas geht vor“ (§3). Pfade relativ zu `apps/dashboard/src/`. Nach dieser Etappe ist Glas fertig:
„(Vorschau)“ fällt weg (Entscheid des Users vom 09.10.).

## 1. Festlegungen

| # | Festlegung |
|---|---|
| K107 | **Seitenwechsel als View Transition** (K62, K106, GLAS-DESIGN §6.3). Ein Helfer `app/glas/glasNavigate.ts` navigiert in Glas über `document.startViewTransition`, wenn der Browser es kann; Klassisch und Browser ohne die Funktion navigieren wie heute. Reduzierte Bewegung: Überblendung 200 ms ohne Anstieg und ohne Morph (§6.4). **Auslöser:** Tab-Leiste, Seitenleiste und Mehr-Menü (`onClick` an Upstreams `NavLink` mit `[fork]`; es prüft wie React Router: linke Taste, keine Zusatztaste, kein `target`, nicht `defaultPrevented`, nicht die aktuelle Adresse, und setzt das Schließen des Mehr-Menüs fort), Kamerakacheln (`nav.openCamera` ohne `at`/`ev` in `nvr/ui.tsx`, Kacheln der Glas-Home-Karte `nvr/NvrHomeGlas.tsx`) und „Zurück“ der Kameraseite. **Wie heute ohne Übergang:** Status-Pille, Räume-Menü, „Zurück“ im Raum, Ereignisse (öffnen mit `at`/`ev`, Ereignisbild als Poster), Zurück/Vor des Browsers und das Wischen in Safari (POP). **Keine Namen am Rahmen:** die Überblendung der Wurzel (`plus-lighter`) lässt gleiche Pixel stehen, Tab-Leiste, Seitenleiste und Kopf bleiben also ruhig; ein benannter Rahmen würde zur Backdrop-Wurzel und verlöre sein Glas (in Chromium gemessen), eine benannte Linse läge über den Symbolen (benannte Gruppen liegen über der Wurzel). Die Linse gleitet im lebenden neuen Bild, ihr altes Bild blendet in 160 ms aus. **Tab-Wechsel und „Zurück“:** alte Seite aus, neue ein, 160 ms; die Abschnitte der neuen Seite steigen 6 px (`g-vt-rise`, nur `transform`, an denselben Elementen wie der Eintritt, ohne Staffel) statt des Eintritts `g-rise`. Die Markierung sitzt am neuen Seitenelement (`data-g-entry`) und vergeht mit ihm, ein späteres Entfernen startet nichts neu. **Warten auf die neue Seite:** der Callback navigiert und wartet auf den Commit (Layout-Effekt auf die Adresse in `GlasRuntime`); das Seiten-Chunk wird beim Drücken geladen (`app/glas/routeChunks.ts`, dieselben Module wie `Router.tsx`). Danach, noch im Callback: Scroll oben (wie `ScrollToTop`) und die Scroll-Auswertung von `GlasRuntime` sofort statt per `requestAnimationFrame` (das läuft im Callback nicht). Kappe 300 ms; danach zeigt der Übergang, was da ist. **Kamera öffnen:** Name `g-cam` (inline, nur für diesen Übergang) am Bild der gedrückten Kachel (`peekOrigin()`, ihr `img`) und, sobald die Kameraseite ihr Standbild gezeichnet hat (`.nvr-stage__freeze[data-src]`), an diesem Standbild — nicht an `.nvr-stage`, darin liegt die Steuerkapsel mit Glas. Gruppe 540 ms `smooth`, Bilder füllen die Gruppe (`object-fit: cover`), Ecken per `clip-path: inset(0 round r)` vom Kachel- zum Bühnenradius. Kappe erreicht: kein Name am Ziel, also Überblendung statt Morph ins Graue. Das NVR-Chunk lädt beim Drücken der Kachel. **Zurück** ohne Morph (Überblendung wie beim Tab): die Kachel der Übersicht trägt keine Kamera-Kennung, ihr frisches Bild ist beim Aufnehmen noch nicht dekodiert. React 19.3 `<ViewTransition>` nicht: Typen nur in `@types/react` canary; der Helfer lässt Klassisch und alle übrigen Navigationen bauartbedingt unberührt. |
| K108 | **Hover nur mit Zeiger** (PLAN-ETAPPE-5 §8): Glas-eigene Hover-Effekte stehen unter `@media (hover: hover)` (Haupteingabe; ein iPad mit Trackpad zählt als Touch und bekommt keine, wie Inhalte in iPadOS). Wo Glas gar keine Tönung will (Inhaltskarten, Zeilen ohne eigene Bedienung), setzt eine Regel ohne Bedingung den Ruhezustand. Wo Glas unter dem Zeiger eine eigene Tönung hat und eine Upstream-Regel nach einem Tipp trotzdem greift (später geladene Seiten-CSS gleicher Spezifität, Eigenschaften, die die Glas-Ruhe-Regel nicht setzt: `opacity`, `filter`, `box-shadow`), setzt direkt nach dem Hover-Block eine Regel unter `@media (hover: none)` den Ruhezustand; beide Bedingungen schließen sich aus, die Reihenfolge der Dateien spielt keine Rolle. Wächter in `test/glasSelectors.test.ts` (`styleRules`): eine `:hover`-Regel außerhalb von `(hover: hover)` darf nur den Ruhezustand setzen (kein `--g-hover`, `--g-fill-2`, `brightness(`, `opacity < 1`). Kacheln in Fenstern bekommen in erzwungenen Farben einen Rand (Player-Kachel u. a.). |
| K109 | **Kontrast am Bildschirm** (§5.4, Pflicht hell auf iPad-Breite, dazu Handy): jeder sichtbare Text jeder Seite ≥ 4,5:1, große Schrift (≥ 24 px oder ≥ 18,66 px mit Gewicht ≥ 700) ≥ 3:1; bedeutungstragende Symbole und Fokusringe ≥ 3:1 (WCAG 1.4.11, GLAS-DESIGN §2.5). Ausgenommen nur: deaktivierte Bedienelemente, Dekoration, Logos, Text in Bildern. Text über Kamerabildern ist UI-Text: gemessen auf weißem und auf schwarzem Bild der Probe. Methode: berechnete, mit Alpha verrechnete Schriftfarbe gegen den gemessenen Grund an derselben Stelle (Schrift je Element per `-webkit-text-fill-color: transparent` ausgeblendet, nie `opacity`/`visibility` an Containern); Animationen, Uhr, Demo-Aktualisierung, Cursor und Video eingefroren. Funde werden in Glas-Tokens (`glasTokens.ts`) oder Glas-CSS behoben, Ausnahmen mit Grund im Plan. |
| K110 | **Leistung** (§5.5, Maßstab iPad, E17): Handy-Emulation mit 4× CPU-Drossel, Glas gegen Klassisch unter derselben Emulation (die Drossel trifft nur den Hauptthread, nicht Compositor und Weichzeichner): Übersicht 3 s per `Input.synthesizeScrollGesture` scrollen, p95 der Bildzeit Glas ≤ 1,25 × Klassisch; Fenster öffnen: verworfene Bilder Glas ≤ Klassisch + 2 (`sheetsPerf` prüft das künftig). Höchstens 3 Glasflächen je Seite in Ruhe prüft der Rahmen-Block schon. Reißt eine Seite das Budget, gehen die Zahlen an Jannick; geändert wird erst nach dem Gerät (E17). |
| K111 | **„(Vorschau)“ entfällt** (E11 endet): `glas.style.glas` heißt in allen sieben Sprachen nur noch „Glas“ (Glass, Cristal, Verre, Vetro, Vidro, Glas). Die Stil-Zeile ist für alle sichtbar; ändern dürfen Stil, Stärke und „Transparenz reduzieren“ nur Admins (E1, E2), mit und ohne Verwaltung. Nicht-Admins sehen die Zeile gesperrt: unter der Verwaltung mit den vorhandenen Hinweisen, ohne Verwaltung mit „Den Stil legt ein Administrator fest.“ (`glas.style.adminOnly`, sieben Sprachen). Glas bleibt nicht Standard; ob Glas für alle Standard wird, entscheidet Jannick nach dieser Etappe. Historische Einträge im Fork-Changelog behalten „Vorschau“. |
| K112 | **WebKit im Labor** (PLAN-ETAPPE-0-1 §6, Punkte 3–5 und 7): `glas-shots.cjs --engine webkit` im Labor (Playwright-WebKit) für die Bilder beider Stile (Durchsicht von Hand, `compare` läuft nur in Chromium) und die `checks`-Blöcke; Blöcke mit CDP (etwa 20) gelten dort als übersprungen, nicht als grün. WebKitGTK ist nicht iOS-Safari: behoben wird, was als Standard-WebKit-Verhalten reproduziert; der Rest kommt auf die Liste für das Gerät. View Transitions und erzwungene Farben in Playwright-WebKit werden dabei erst festgestellt. |
| K113 | **Bleibt, wie es ist:** `tabular-nums` an der Wurzel (GLAS-DESIGN §4; die breiten Striche in PLAN-ETAPPE-6 §7.4 sind die Ersatzschrift unter Linux, das iPhone prüft Jannick); Hintergrund „Bild“ (E15) ist nicht umgesetzt und bleibt optional; Akzentfarbe bleibt einstellbar (Frage vom 10.10., Jannick am selben Tag: bleibt); Bildrate der Federn auf dem iPhone (am 08.10. von Jannick zurückgestellt). |
| K114 | **Abschluss:** die Top 20 des Inventars (`docs/glas/HAPULSE-INVENTORY.md`) in beiden Stilen, abgebildet auf die vorhandenen Prüfblöcke (Tabelle im Plan beim Bau); reduzierte Bewegung einmal für alles (GLAS-PLAN Etappe 7); Klick-Fuzz beider Stile; `nvr-sweep-test` im Labor. Fork-Changelog F41 „Stil Glas“ (ohne Vorschau), Doku final: `CLAUDE.md` (Glas-Punkt ohne Etappenzähler), GLAS-PLAN (Etappen 0–7 erledigt, E15 offen und optional, Zeile „Bis zur letzten Etappe … Vorschau“), `docs/SYNC.md`, `docs/NVR-INTEGRATION.md`. Für Jannick am Gerät bleibt eine kurze Liste: Statusleiste der Home-Bildschirm-App (K39), Textbreiten in SF Pro, Leistung am iPad, Kontrast bei Tageslicht, erstes Bild beim Start, Übergänge in Safari. |

## 2. Dateien

Neu: `app/glas/glasNavigate.ts` (reine Entscheidung „welcher Übergang“ + Ablauf, Test der Entscheidung),
`app/glas/routeChunks.ts`, `scripts/glas-checks-polish.cjs` (+ Verdrahtung in `glas-shots.cjs`), ein Test der
Stil-Zeile für Admin, Nicht-Admin, Nicht-Admin unter Verwaltung (der Demo-Benutzer ist Admin). Geändert: `app/AppLayout.tsx`
(`onClick`, `[fork]`), `app/glas/GlasRuntime.tsx` (Commit-Meldung, Scroll-Auswertung sofort), `nvr/ui.tsx`,
`nvr/NvrHomeGlas.tsx`, `nvr/NvrCameraPage.tsx` (Zurück), `styles/glas/motion.css` (Übergänge, `g-vt-rise`), Hover in
den Glas-CSS-Dateien, `test/glasSelectors.test.ts`, `components/settings/StyleSettings.tsx` (+ Kommentar),
`packages/core/locales/*.json` (`glas.style.glas`, `glas.style.adminOnly`), `scripts/glas-shots.cjs` (`badAncestors`
meldet `view-transition-name`), Fork-Changelog F41, `CLAUDE.md`, `docs/GLAS-PLAN.md`, `docs/SYNC.md`,
`docs/NVR-INTEGRATION.md`. `nvr/NvrHomeCard.tsx` (Klassisch) bleibt.

## 3. Prüfungen

Neuer Teil `checks --part polish` (`scripts/glas-checks-polish.cjs`):
- `polishTransitions`, gemessen bei `transition.ready`: Tab-Wechsel zeigt die neue Seite (ihr `h1`, nicht zweimal die
  alte), kein `g-rise`, Abschnitte mit `g-vt-rise`, Fokus unverändert, kein Element mit Namen hat Glas in sich
  (`badAncestors`), die Linse gleitet; Kamera öffnen: Standbild mit `data-src`, Name an Kachelbild und Standbild, Dauer
  540 ms; zurück und reduzierte Bewegung: nur Überblendung (≤ 200 ms); Zusatztaste, aktiver Tab, Zurück/Vor und
  Ereignisse starten keinen Übergang; ohne `startViewTransition` navigiert alles wie vorher; Klassisch: kein Übergang,
  kein Name, Strg-Klick öffnet wie bisher.
- `polishHover`: erst `matchMedia('(hover: none)')` belegt, dann je Seite, Fenster, Menü, Bearbeiten-Modus,
  Kontextmenü, Wischzeile und Kameraansicht (Handy und iPad) die `:hover`-Regeln des CSSOM, die Elemente treffen, per
  CDP an Element und Vorfahren erzwungen: danach Ruhezustand (Hintergrund, Schatten, Transform, Filter, Deckkraft,
  Farbe, Rand); gewollte Ausnahme nur die Steuerkapsel der Kamera (ein Tipp aufs Bild zeigt sie voll, wie in
  Sentinel). Die nie getroffenen Selektoren werden aufgelistet. Erzwungene Farben: Kacheln und Knöpfe in Fenstern mit
  eigener Fläche haben einen Rand.
- `polishContrast` (K109), `polishPerf` (K110), `polishPreview` (nur die Stil-Zeile: Beschriftung ohne „Vorschau“ in
  sieben Sprachen), `polishReduced` (alle Routen, ein Fenster, die Menüs, ein Tab-Wechsel unter `reduce`: keine
  Transform-Animation, Überblendungen ≤ 200 ms).
- Gesamtlauf einmal vor dem Merge: alle `checks`-Teile, Klassisch-Vergleich mit `main` (gewollt: Versionszeile F41,
  Stil-Zeile für Nicht-Admins, das Wort „Vorschau“), Klick-Fuzz beider Stile, Pflichtbefehle inkl. Lint.
- Labor (Freigabe vom 09.10.): WebKit (K112), `nvr-sweep-test` beider Stile mit dem Morph.

## 4. Risiken

- WebKit und View Transitions: Verhalten von Glas während des Übergangs in Safari erst im Labor (K112) und am iPhone
  (Jannick) gesehen.
- Seiten, die nach dem Commit noch nachladen, zeigen im neuen Bild ihren Ladezustand (wie heute ohne Übergang).
- Kontrast-Funde können Tokens ändern, die Klassisch nicht berühren dürfen (nur Glas-Werte in `glasTokens.ts`).

## 5. Prüfung des Plans

Unabhängig geprüft am 10.10. (Urteil: machbar mit Änderungen). Übernommen: kein Name am Rahmen (ein benannter Wrapper
wird zur Backdrop-Wurzel, sein Glas verliert den Weichzeichner), Anstieg an den Abschnitten statt an der Wurzel, Warten
auf den Commit samt Chunk und sofortiger Scroll-Auswertung (`requestAnimationFrame` läuft im Callback nicht), Markierung
am Seitenelement, Name am Standbild statt an der Bühne, Morph nur ohne `at`/`ev`, kein Morph zurück, POP ohne Übergang,
reduzierte Bewegung = Überblendung, Stil-Zeile nach E1 nur für Admins änderbar, Kontrast mit Symbolen/Fokus und Bildern
schwarz/weiß, Leistung relativ zu Klassisch, Prüfung unter reduzierter Bewegung, E15 als offen, Prüfungen, die bei
`transition.ready` den Inhalt belegen. Nicht übernommen: Name an der Linse (läge über den Symbolen).

## 6. Abweichungen und Nachträge beim Bau

### 6.1 Übergänge (K107)

Wie geplant (`app/glas/glasNavigate.ts`, `routeChunks.ts`, `styles/glas/motion.css`). Nachträge:
- Ziel des Morphs ist das Standbild des Pakets `.nvr-stage__freeze[data-src]` (`CAMERA_STILL`); `test/glasNavigate.test.ts`
  prüft, dass das installierte Paket die Klasse noch hat (umbenannt würde aus dem Morph eine Überblendung), und
  vergleicht die Module in `routeChunks.ts` mit den `lazy()`-Aufrufen in `Router.tsx`.
- Im Morph blenden die beiden Bilder in 270 ms ineinander, die Gruppe läuft 540 ms; die Ecken rechnet `clip-path` von
  `--g-vt-r0` (Radius der Kachel bzw. ihres Bilds) nach `--g-vt-r1` (Standbild bzw. Bühne). `polishTransitions` prüft
  den Morph am Handy aus der Home-Karte und am Desktop aus der Übersicht.
- `badAncestors` in `glas-shots.cjs` meldet jetzt auch einen Vorfahren einer Glasfläche mit `view-transition-name`
  (Wächter für später: heute trägt nur ein Bild für die Dauer des Morphs einen Namen).

### 6.2 Hover nur mit Zeiger (K108)

- Die Glas-eigenen Hover-Effekte stehen unter `@media (hover: hover)`. Wo eine Upstream- oder Paket-Regel nach einem
  Tipp trotzdem tönt, setzt eine Regel unter `@media (hover: none)` den Ruhezustand: Akzent-Knöpfe und „Fertig“ in „Was
  ist neu“, Stepper der Klima-Kapsel, Benachrichtigungen, Zeilen von Räume- und Mehr-Menü, Transport, Stumm und Zonen der
  Musik, andere Player, Kamerakacheln der Sicherheit, Gruppen im Entitäten-Fenster, Zeilen im Licht-Fenster,
  Kalendertage und Steuerkapsel der Kameraseite (Paket). Inhalte ohne eigene Bedienung (Karten in „Klima/Rollläden
  alle“, Formular der Einrichtung, Zeilen, deren Knöpfe antworten) bekommen keine Tönung, auch nicht unter dem Zeiger.
- Die Abzeichen der Bearbeiten-Ansicht (Auge, Handy, Stern, Größe) haben den Glas-Look auf jeder Seite mit
  Bearbeiten-Leiste (Sicherheit, Energie, Automationen, Szenen, System, Seitenleiste, Übersicht), bis Etappe 6 nur in
  Raum und Musik (`cards.css`, Selektor `.app-layout .edit-badge…`).
- Erzwungene Farben: Gruppen, Kacheln und Knöpfe in Fenstern, die sich nur durch ihre Füllung vom Fenster abheben,
  haben einen Rand (`sheets.css`, `sheet-content.css`).
- Wächter: `test/glasSelectors.test.ts` („tint on :hover only under @media (hover: hover)“) meldet `--g-hover`,
  `--g-fill-2`, `brightness(` und Deckkraft unter 1 in einer `:hover`-Regel außerhalb von `(hover: hover)`.

### 6.3 Kontrast am Bildschirm (K109)

**Messung** (`polishContrast`, iPad hell und Handy; jede Route bis zum Ende gescrollt, jedes Fenster der
Fenster-Prüfung, die Menüs, Bearbeiten-Modi, Kontextmenü und Kameraansichten des Hover-Durchlaufs; Uhr,
Demo-Aktualisierung, Animationen und Cursor angehalten):
- **Text, Felder, Symbole:** die berechnete Farbe (Alpha mal Deckkraft der Vorfahren) an jedem Glyphen-Pixel gegen den
  Grund an derselben Stelle; der Grund kommt aus Aufnahmen, in denen die Ziele per `-webkit-text-fill-color: transparent`
  ausgeblendet sind, getrennt nach „auf Glas“ und „nicht auf Glas“ (so bleibt die Seite unter dem Glas, wie sie ist).
  Ein Ziel unter etwas, das darüber gemalt ist (Scrim, Glasleiste, Pseudo-Element), zählt als verdeckt und wird in der
  Scroll-Lage gemessen, in der es frei liegt. Was sich zwischen zwei Aufnahmen ändert, gilt als unruhig und wird
  wiederholt.
- **Fokusringe:** je Ansicht bis zu 12 Bedienelemente (je Art höchstens zwei), so in den Blick gebracht wie vom Tabben
  (`scrollIntoView` „nearest“, das Scroll-Padding zählt). Gemessen werden die Pixel, die sich mit dem Fokus ändern, auch
  an Vorfahren, deren Rand oder Schatten sich mit `:focus-within` ändert. Das geschieht in 32 Sektoren rund um das
  Element: Mindestens 90 % der Sektoren brauchen ein Pixel mit ≥ 3:1 gegen das Bild ohne Fokus (WCAG 2.4.13 als Maß).
  Ein Ring, den eine Leiste, ein Rand oder eine Maske verdeckt, fällt so auf (2.4.11).

**Behoben** (Werte und Regeln in [GLAS-DESIGN](../GLAS-DESIGN.md) §2.5, Paare in `glasTokens.ts`, `smoke.mjs`):
- Die Linse der Tab-Leiste ist deckend (`#E6E6E9` / `#3C3C3D`): Der aktive Tab hatte über farbigen Karten nur 3,1:1.
- Fenster über der abgedunkelten Seite: Das helle Fenstermaterial ist weiß, und der Desktop-Dialog nimmt dieselbe
  Füllung. Vorher fiel farbige Schrift dort auf 3,9:1. Die Paare rechnen jetzt mit dem Scrim (`windowGround`). In Glas-Fenstern
  ist auch das eigene `--g-label-2` `glassLabel2`. Fenster über der Kameraseite sind dunkel; das helle Datumsfenster
  hatte am × 2,7:1.
- Text auf klarem Glas über Bildern (Kameranamen, Pille der NVR-Karte) hat die Füllung `textFill` .50. Vorher waren es
  1,4:1 über hellem Himmel.
- Einzelfunde: abwesende Person im Sicherheits-Hero (Deckkraft .6, 2,5:1 → `label2` auf `fill`), Beschriftung laufender
  Pool-Slots in der Schrift der Fläche, Griffe des Zeitplans zweifarbig.
- Fokusringe:
  - **Tab-Leiste:** innen, in der Schriftfarbe des Eintrags. Über einem Kamerabild hatte `focus` nur 2,5:1.
  - **Auf Bildern:** ein dritter Ton innen (`focusPair`, Technik C40).
  - **Über dem Kamerabild:** innen auf dem Glas des Knopfs.
  - **Chip-Leiste:** Scroll-Padding = Maske + Ring, und die Maske fällt weg, solange ein Chip den Ring trägt. Unter
    200 px Breite (Inspector am iPad quer, Laptop) zeigt sie keinen Chip mehr statt eines angeschnittenen.
  - **Scroll-Padding der Seite:** am Handy oben die Scroll-Kante (96) und unten die Tab-Leiste, ab 900 px die
    Kopfzeile (104). So scrollt ein Element, das die Tastatur erreicht, samt Ring frei (2.4.11).
  - **Seitenleiste:** blendet am unteren Ende über 16 px aus statt am Fuß hart abzuschneiden (iPad quer mit allen
    Seiten: 6 px Überlauf), mit 16 px Platz unter dem letzten Eintrag.
  - **Pool-Zeitplan:** Ring des Slots auf `::after`, über den Griffen und innerhalb der Leiste. Auf dem laufenden Slot
    in dessen Schriftfarbe (die Fokusfarbe auf Türkis hatte 2,3:1).
  - **Attribute im Detail:** Ring mit den Ecken der Gruppe, offen nur oben.

**Ausnahmen** (nicht gemessen oder nicht änderbar):
- deaktivierte Bedienelemente, Dekoration, Logos, Text in Bildern;
- Text über dem laufenden Kamerabild: Er misst `nvrImmersive` auf weißem, schwarzem und Infrarot-Bild;
- der scharfe Rand an Glasflächen im Testbrowser (§6.8, letzter Punkt).

### 6.4 Leistung (K110)

`polishPerf` misst am Handy (4× CPU-Bremse) die Bildzeiten beim Scrollen der Übersicht, drei Läufe je Stil im Wechsel.
Ergebnis im Prüf-Container: Klassisch p95 16,8 ms, Glas p95 50 ms (Verhältnis 2,98, Ziel ≤ 1,25), in Glas einzelne
Bilder bis gut 0,5 s. Der Container hat keinen Grafikchip (WebGL-Renderer SwiftShader), die Unschärfe hinter dem Glas
rechnet dort die CPU. main (Glas aus Etappe 6) misst unter denselben Bedingungen dasselbe (2,99), Etappe 7 macht es also
nicht langsamer. Deshalb meldet die Probe ohne Grafikchip die Zahlen und prüft nur, dass gescrollt wurde; das Urteil
fällt am Gerät (§9, iPad). Nachtrag beim Bau: die synthetische Touch-Geste bewegte die Seite im Headless-Chromium nicht
(`scrollY` 0, auch auf main); die Probe scrollt jetzt mit dem Mausrad, die Bildzeiten des Compositors sind dieselben.

### 6.5 Stil-Zeile (K111)

Wie geplant. Die Demo kann den Benutzer zum Nicht-Admin machen (`window.__hapulseDemo.admin(false)`, `ha/demoControl.ts`,
Aufruf in `stores/connectionStore.ts`); `polishPreview` prüft damit Admin, Nicht-Admin und Nicht-Admin unter der
Verwaltung in beiden Stilen sowie die Beschriftung in sieben Sprachen. Ein eigener Unit-Test der Zeile kam nicht dazu:
der Block prüft dasselbe im echten Build.

### 6.6 WebKit (K112)

Die `checks`-Teile laufen mit `--engine webkit`; ein Block, der eine CDP-Sitzung braucht, fängt den Fehler „CDP session
is only available in Chromium“ ab, zählt nicht als grün und steht in `skippedNoCdp` (Gesten `swipe`/`finger`, Langdruck
der Übersicht, `safeArea` der Kameraseite, `polishHover`, `polishPerf`, Ziehen und Schließen der Fenster, `sheetsPerf`).

Laborrunde am 11.10. auf dem Stand 1d23354 (Playwright-WebKit 26.6 unter Linux), das Live-HAPulse unberührt:

- NVR-Klick-Durchlauf gegen das echte Sentinel (Chromium): Klassisch am Desktop und am Handy je 44/44, Glas je 46/46;
  keine JS- oder Konsolenfehler, kein HTTP ≥ 400 (Kamera öffnen, immersive Seite und zurück, live und Aufnahme, Clip
  herunterladen).
- Das Labor-WebKit kann View Transitions (`polishTransitions` grün: Tab-Wechsel, „Mehr“, Kamera-Morph), erzwungene Farben,
  mehr Kontrast, reduzierte Bewegung, `linear()`, `mask-composite`, `dvh` und `hover: none`/`pointer: coarse` am Handy.
  `backdrop-filter` malt es gar nicht (Minimalprobe: mit und ohne Filter pixelgleich). Glasmaterial und Kontrast auf Glas
  sind dort nicht beurteilbar.
- `checks --engine webkit`: grün `stage1`, `frame`, `home`, in `polish` Übergänge, reduzierte Bewegung und Vorschau.
  Übersprungen (CDP, zählt nicht als grün): die oben genannten Blöcke, in diesem Lauf zwölf. Rot, mit Ursache:
  - `gesturesMenuDesktop`, `gesturesInspector`: WebKit löst bei der Kontextmenü-Taste und bei Shift+F10 kein
    `contextmenu` aus (Minimalprobe; der Rechtsklick geht), ohne Zeiger öffnet sich das Kartenmenü dort also nicht.
    Bewusst so gelassen: Klassisch verhält sich genauso (dort öffnet `contextmenu` das Detail, Upstream), die
    Mac-Tastatur hat keine Kontextmenü-Taste, und Control-Klick oder Zwei-Finger-Klick öffnen das Menü wie in jeder
    Mac-App.
  - `sheetsMorph`, `sheetsGrow`, `sheetsStyleSwitch`: Zeitverhalten. Das Fenster bewegt sich bei 0, 80 und 160 ms noch
    nicht und ist bei 320 ms fast offen; gerendert ohne Grafikchip, das Urteil fällt am Gerät (§9).
  - `pagesFields`: Pfeil hoch ändert die Pool-Uhrzeit in WebKit nicht (natives Zeitfeld; iPhone und iPad zeigen das Rad).
    Safari am Mac mit Tastatur steht in §9.
  - `pagesSegments`, `pagesKeep` (Automationen am Handy): Textbreiten der Ersatzschrift unter Linux (Segment im Fenster
    am Desktop eng, Kennzahlen im Kopf abgeschnitten); die Abläufe sind in beiden Stilen richtig. Am Gerät mit SF Pro
    (§9).
  - `nvrKeep`, `nvrClip`: der Prüf-Server. WebKit spielt Aufnahmen per MSE mit H.264, der nachgestellte Server liefert
    VP9; in der Handy-Emulation fehlt `document.exitFullscreen`, das das Prüfskript selbst aufruft. Kein Befund der App.
  - `polishContrast`: 16 Funde, fast alle auf Glas (der fehlende Weichzeichner). Zwei außerhalb von Glas (Müll-Datum
    2,9:1, kWh-Wert 4,0:1), für die Chromium nichts findet; am Gerät ansehen (§9).
- Bilder beider Stile in WebKit (Klassisch 166, Glas 154), von Hand durchgesehen: Aufbau und Inhalte in beiden Stilen
  richtig. In Glas fehlen `nvr-setup-window` und `nvr-rooms`, die zwei Tipps über „⋯“ überschreiten dort das Uhr-Budget
  des Bildskripts. „Geräte“ zeigt in beiden Stilen noch „wird geladen“; in Ganzseiten-Bildern steht die Tab-Leiste am Ende
  des ersten Bildschirms (Eigenheit der WebKit-Aufnahme).

### 6.7 Top 20 des Inventars (K114)

Klassisch: in jeder Zeile zusätzlich der Klassisch-Vergleich mit `main` (alle Szenen, 0 Pixel außer den gewollten) und der
Klick-Fuzz; die Blöcke `…Classic` prüfen Klassisch im Ablauf. Glas:

| # | Inventar | Prüfung in Glas |
|---|---|---|
| 1 | Chips mit Zählung und Fenstern (B) | `pagesMenus` (Untertitel = Wort des Chips, ausgeblendete Entitäten), `sheetsAll` (jedes Fenster), `homeKeep` (Chip ausblenden), `editEverywhere` |
| 2 | Detail mit Verlauf, 24H/7D/30D, Logbuch (F) | `homeLight` (Detail eines Lichts), `pagesSegments` (Zeitraum), `gesturesInspector` (ab 1100 px), `sheetsAll` |
| 3 | Hauptraum-Karte (C5, G1) | `homeKeep` (Medien-Pille nur beim Spielen, ›, Licht-Pille, Klima-Stepper), `homePicture` |
| 4 | Bearbeiten-Modus (D) | `homeEdit`, `pagesEdit`, `editEverywhere`, `homeKeep` (Ziehen per Tastatur, gedeckelte Karte scrollt), Fuzz `edit` |
| 5 | Sicherheitslage (C12, H1) | `pagesKeep` Sicherheit (Hero nach Alarmzustand, Personen, Türen, Fenster, Bewegung), `homeKeep` (sieben Zeilen) |
| 6 | Alarm mit Ziffernblock (H2, H3) | `pagesKeep` Sicherheit (Modus mit Code → Ziffernblock, Escape ändert nichts, ohne Code ein Tipp), `sheetsAll` (`win-keypad`) |
| 7 | Sichere Aktionen (H8, I4) | `pagesKeep` (Entriegeln fragt mit Zahl, Garage „Alle öffnen“ fragt, Code-Schloss), `homeKeep` (Frage vor dem Entriegeln), `sheetsClose` (Bestätigung), `gesturesSwipeOthers` (nie Öffnen/Entriegeln per Wischen) |
| 8 | Garagentore wie Schlösser (I) | `pagesKeep` (Raum, Sicherheit, Geräte: Öffnen fragt), `gesturesSwipeOthers` (Schließen per Wischen) |
| 9 | Sentinel nativ (J) | `nvrKeep` (17 Schritte), `nvrPages`, `nvrImmersive`, Labor `nvr-sweep-test` beider Stile |
| 10 | NVR-Karte der Übersicht (J3) | `nvrForcedColors` (jeder Zustand der Karte), `polishTransitions` (Kamera aus der Karte öffnen), Etappe 4 `homeKeep` |
| 11 | Pool (K) | `pagesKeep` Pool (Solar-Stepper, „Stopp“, Zeitplan-Griff + Speichern, Kennzahl → Detail, Neustart fragt), `pagesSegments` (Modus) |
| 12 | Müll-Karte (L) | `homeHints` (Hinweis „Abholung morgen“), `sheetsAll` (`win-waste`) |
| 13 | Raumseite mit Karten (E, G3) | `pagesKeep` Raum (Reihenfolge, Regler, Kacheln, Lautstärke, Sensoren, „nicht verfügbar“, Rollläden, Saugroboter), `pagesSwitches`, `pagesControls` |
| 14 | Räume und Status-Symbole (C16, A5) | `homeKeep` (Status-Symbol eines Raums), `pagesMenus` (Räume-Menü mit Zustand), `menus` |
| 15 | Klima- und Rollläden-Karten (C8–C11) | `homeKeep` (Räume und Stepper der Klima-Karte, Schließen/Stopp/Öffnen), `sheetsAll` (`win-climate`, `win-blinds`) |
| 16 | Musik (M) | `pagesKeep` Musik (Transport, Ton, Quelle, Spulen, Zonen, Warteschlange, Bibliothek) |
| 17 | Systemzustand (A8, R) | `pagesKeep` System (Hero, Monitor, Batterien), `sidebar` (Status-Pille) |
| 18 | Mitteilungen (A14) | `notifications`, `sheetsNotifications`, `gesturesSwipeOthers` (Verwerfen per Wischen) |
| 19 | Einstellungen für alle (S12, S5, F3) | `pagesKeep` Einstellungen (S1–S16 in beiden Stilen), `polishPreview` (Stil-Zeile für Admin, Nicht-Admin, unter Verwaltung), Unit-Tests `globalSettings` |
| 20 | Personalisierung (S2–S8, V, U) | `pagesKeep` Einstellungen (Name, Symbol, Hell/Dunkel, Sprache, Akzent), `accentSlider`, `autoMode`, `sheetsStyleSwitch`, Unit-Tests (Changelog, Sprachen) |

### 6.8 Wünsche vom 10.10. (N1–N3)

Jannick sah Etappe 6 am 10.10. am iPhone und wünschte drei Änderungen („Mache es so wie Apple es machen würde“); alle
in diesem PR, N3 mit `@sentinel-nvr/web` 0.19.0 (Paket-PR mit eigenem Review und Labor, Freigabe zum Veröffentlichen
von Jannick am 10.10.).
- **N1 Kameraseite unter der Statusleiste:** ein heller Schimmer über dem Bild. Ursache (aus dem Bildschirmfoto
  abgeleitet, nicht am iPhone geprüft): WebKit malt das Band der Statusleiste der Home-Bildschirm-App, den weichen Rand
  darunter und das Überscrollen in der Farbe des Dokuments, und die nimmt es vom `body`, wenn der deckend ist — der war
  hell. Solange die Kameraseite offen ist, ist jetzt auch der `body` dunkel (`shell.css`, `[data-g-immersive] body`). Die
  Knöpfe bleiben, wo sie sind (Jannick: „müssen dann nicht unbedingt tiefer“). Prüfung `nvrImmersive` (Farbe von `html`
  und `body` in beiden Modi).
- **N2 Sentinel-Übersicht „wie der Rest“:** in Glas ein eigener ruhiger Kopf wie bei Sicherheit und System
  (`nvr/NvrHeroGlas.tsx`: Symbol im Kreis, „Sentinel NVR“, der Zustand groß in seiner Farbe, die Werte als Kapseln; die
  Fakten wie im Kopf des Pakets, den Klassisch behält), Abschnittstitel „Ereignisse“ und „Kameras“ mit Symbol in einer
  Zeile (Prop `icon` aus 0.19.0), Kartentitel ohne zweite Zeile, der Speicherhinweis als Fußnote unter einer Linie statt
  gelber Fläche. Die drei grauen Knöpfe neben „NVR“ liegen hinter einem „⋯“ (Entscheid vom 10.10.: „wie die
  Empfehlung“): `components/glas/HeaderMenu.tsx` — am Handy ein Glaskreis links neben dem Avatar, ab 900 px ein
  gefüllter Kreis 44 am Ende der Kopfzeile; das Menü hängt darunter, rechts bündig mit dem Kreis wie bei UIKit, und
  enthält „Sentinel öffnen“ (neuer Tab), „Räume“, „Einrichtung“. Tasten, Fokus und Schließen teilt es mit dem
  Avatar-Menü (`app/glas/useGlasMenu.ts`, aus `AvatarMenu.tsx` herausgezogen); ein Fenster aus dem Menü gibt den Fokus
  an das „⋯“ zurück (`Modal` `returnFocus`). Hat das Menü nur einen Eintrag (Nicht-Admin unter Verwaltung: nur der
  Link), ist der Kreis diese Aktion. Neue Texte `glas.headerMenu.label`, `glas.nvr.menu.rooms`, `glas.nvr.menu.setup`
  (sieben Sprachen). Prüfungen `nvrPages` (Kopf, Kapseln, Titel), `nvrMenu` (Menü, Tasten, Fokus, ein Eintrag, deckendes
  Glas), `nvrKeep` (Fenster aus dem Menü).
- **N3 „Clip herunterladen“:** in Glas bleibt das Bild am Handy randlos, die Leiste ist eine schwebende Karte mit Von|Bis
  als Segment (Linse unter der aktiven Kante), rundem × und Kapsel-Knöpfen (Paket 0.19.0, `appearance="immersive"`,
  das HAPulse seit 0.18.0 übergibt). In beiden Stilen bleibt das × in seiner Zeile, auch bei breiten Uhrzeiten
  (Englisch, 12-Stunden-Uhr: vorher eigene Zeile in der Desktop-Spalte). Prüfung `nvrClip` (Deutsch und Englisch, Handy
  und Desktop, beide Stile; Linse per `transitionrun`), Szene `nvr-cam-clip`.
- **Kopfzeile neben dem Inspector (iPad quer):** mit dem „⋯“ war die Kopfzeile neben dem offenen Detail zu breit, der
  Avatar lag unter dem Inspector. Die Zeile ist ein Container (`g-head-row`): unter 600 px zeigt die Wetter-Pille nur die
  Temperatur, unter 480 px weicht sie (wie eine Symbolleiste ihr unwichtigstes Element); Name und Zustand stehen weiter in
  der Beschriftung des Knopfs. Die Chip-Leiste zeigt dort keinen Chip mehr, sie ist schmaler als ein Chip (unter 200 px,
  §6.3). Prüfung `gesturesInspector` (iPad quer: vier Kapseln ganz, nebeneinander, 12 vor dem Inspector).
- **iPad-Menü im Testbrowser:** im „⋯“-Menü und anderen Glasflächen scheint am Rand (etwa so breit wie der
  Weichzeichner) die scharfe Seite durch. Das ist Headless-Chromium, kein Fehler im Glas: an einer Testseite mit nur
  einer Fläche mit `backdrop-filter` nachgestellt (DPR 1 und 2, auch mit dem Kanal `chromium`). Am Gerät prüft es Jannick.

## 7. Review des Codes

Zwei unabhängige Prüfungen des Stands 608e28f gegen main: eine für CSS, Prüfskripte und Doku, eine für Laufzeit-Code
und Tests (Typprüfung, 329 Tests des Dashboards, 708 Smoke-Prüfungen, ESLint grün). Nichts Blockierendes. Behoben:

- Musik (K108): getippte Zeilen im Gruppen-, Übertragungs- und Kachelmenü und der Blätter-Knopf der Bibliothek blieben
  unter dem Finger getönt, weil die Upstream-Hover-Regeln mit der Seite später geladen werden; jetzt je eine Ruhe-Regel
  unter `(hover: none)` in `music.css`.
- Seitenwechsel (K107): der Sprung nach oben im Übergang war weich (`scroll-behavior: smooth` in `global.css`), die neue
  Seite lag beim Überblenden noch an der alten Stelle und glitt danach hoch; jetzt `window.scrollTo` mit
  `behavior: 'instant'` in `glasNavigate.ts`. Die Dauer in `motion.css` gilt auch für `::view-transition-group(root)`.
- Der Test der Kamera-Überblendung findet `ui.css` über den Export des Pakets; den `[data-src]`-Teil des Selektors sieht
  nur die Browserprobe.
- Doku: Sentinel-Übersicht in Glas (`docs/NVR-INTEGRATION.md`), `--g-glass-clear-text-fill` in `glas-tokens.json`,
  ein Kommentar in `NvrSetup.tsx`.

Bewusst so gelassen: ein Nicht-Admin ohne Verwaltung, der Glas aus einem importierten Export hat, kann den Stil nicht
zurückstellen. K111 legt fest, dass nur Admins Stil, Stärke und „Transparenz reduzieren“ ändern.

## 8. Gesamtlauf

Einmal vor dem Merge, auf dem Stand mit den Befunden der Prüfung: Typprüfung, Build, Core-Tests (708 Smoke-Prüfungen),
329 Tests des Dashboards und ESLint grün. Alle acht Prüfteile (`stage1`, `frame`, `sheets`, `gestures`, `home`,
`pages`, `nvr`, `polish`) grün; in `polish` lief nach der Korrektur der Leistungsprobe (§6.4) nur dieser Block noch
einmal. Klassisch gegen main, alle Szenen hell und dunkel an Handy, iPad und Desktop (416 Bilder): 401 gleich, 12 gewollt
anders (Einstellungen: „Glas“ statt „Glas (Vorschau)“; „Was ist neu“: F41), 3 anders (Chip-Fenster am Handy hell und
dunkel, Sentinel-Anmeldung am iPad dunkel), die beim erneuten Aufnehmen beider Stände gleich waren (Zeitfehler im langen
Lauf). Klick-Fuzz 8 von 8 sauber (Klassisch und Glas, Desktop und Handy, je normal und im Bearbeiten-Modus).

## 9. Für Jannick am Gerät

Was kein Testbrowser zeigt, prüft Jannick am iPhone (Home-Bildschirm-App) und am iPad:

1. **Statusleiste** (K39, N1): Inhalt unter der Statusleiste in beiden Stilen; auf der Kameraseite ist das Band schwarz mit
   weißer Schrift, ohne hellen Schimmer.
2. **Textbreiten in SF Pro:** Kapseln, Chips und Titel brechen nicht um und werden nicht abgeschnitten (gemessen wurde
   mit der Ersatzschrift unter Linux), besonders das Segment im Pool-Fenster und die Kennzahlen im Kopf der Automationen.
3. **Leistung am iPad:** Scrollen der Übersicht, Öffnen von Fenstern, das „⋯“-Menü (E17); ohne Grafikchip öffneten die
   Fenster im Labor zu langsam für die Zeitprüfung (§6.6).
4. **Kontrast bei Tageslicht:** Tab-Leiste über Kamerabildern, Fenster über der abgedunkelten Seite, Material und Text
   auf Glas (das Labor-WebKit malt keine Unschärfe), Müll-Datum und kWh-Wert (§6.6).
5. **Erstes Bild beim Start** der App in Glas: kein Aufblitzen von Klassisch.
6. **Übergänge in Safari:** Tab-Wechsel, Kamera öffnen (Morph), Zurück.
7. **Ränder der Glasflächen am iPad:** im Testbrowser scheint dort die scharfe Seite durch (§6.8).
8. **Safari am Mac mit Tastatur:** Pfeiltasten im Zeitfeld des Pools, Kartenmenü per Control-Klick (§6.6).
