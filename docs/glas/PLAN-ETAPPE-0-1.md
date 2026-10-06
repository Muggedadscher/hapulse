# Glas — konkreter Umsetzungsplan Etappe 0 + 1

Stand 2026-10-06, Branch `claude/glas-etappe-1-8cc3sm` (ab `main` @ `8d9c783`). Dieser Plan macht
[`../GLAS-PLAN.md`](../GLAS-PLAN.md) §3 „Etappe 0“ und „Etappe 1“ am echten Code fest. Maßgeblich bleiben
GLAS-PLAN §7.3 (Entscheidungen des Users) und [`../GLAS-DESIGN.md`](../GLAS-DESIGN.md); wo dieser Plan davon abweicht,
steht es in §1 mit Grund.

Ein unabhängiger Prüfer hat den Plan vor der Umsetzung gelesen (2026-10-06). Seine Befunde sind eingearbeitet: K6 und
K11 neu gefasst, K7 mit echten Zahlen, K14–K18 neu, dazu §2.1 (Determinismus), §3.6 (Sichtbarkeit), §3.10 (Prüfungen)
und §3.12 (bewusst offen). Umsetzungsstand: §2.4 und §3.11. Den PR hat ein zweiter unabhängiger Prüfer gelesen
(2026-10-06): kein Blocker, ein Soll-Befund, sechs Kleinigkeiten, alle behoben (§3.13).

Etappe 0 und 1 kommen in **einen** PR (vorgegebener Branch), als getrennte Commits: Etappe 0 hat keinen
Nutzer-Effekt (nur Probe-Skripte), die Referenzbilder werden nicht eingecheckt. Der PR wird **nicht** gemergt, bevor
der User zustimmt (Merge = Live-Deploy über den stündlichen Autoupdate).

---

## 1. Korrekturen und Abweichungen gegenüber GLAS-PLAN / GLAS-DESIGN

| # | Stelle | Festlegung hier | Grund |
|---|---|---|---|
| K1 | GLAS-PLAN §1.1 (`uiStyleOverride`), §1.2, §3 Etappe 1 („Stil auf diesem Gerät“), Abnahme („Gerät mit Override“), §5.2, §5.5 („Stil-Override“) | **entfällt** — kein Feld, keine Zeile, kein Test | E1: Stil nur vom Admin für alle; pro Gerät nur Hell/Dunkel |
| K2 | §1.1 `reduceTransparency` Top-Level DEVICE, Zeile „(dieses Gerät)“ | **`customization.reduceTransparency`** (GLOBAL), Schalter ohne „dieses Gerät“, geht wie alle GLOBAL-Felder in Export/Sync | E2 |
| K3 | §1.3 Mapping-Tabelle und Ink-Werte | gelten nicht; Werte nur aus GLAS-DESIGN §2 / `glas-tokens.json` | Vorrang-Hinweis |
| K4 | §1.2 „die drei `applyTheme`-Zeilen“ in `DashboardApp` | real: zwei Aufrufe (`DashboardApp.tsx:66`, `:72`) + `watchSystemMode` (`:78`) + einer in `main.tsx:66` | Code-Stand |
| K5 | §6.1 Changelog „… pro Gerät“ | Text siehe §3.9 | K2 |
| K6 | GLAS-DESIGN §2.6 / `glas-tokens.json → classicMapping`: `--accent` = helles Orange `#FF9500`, `--on-accent` `#1C1C1E`, Textstellen per Glas-CSS auf `--g-accent-ink` | **Umgekehrt verdrahtet, gleiches Bild.** `--accent` auf `:root` = `accentInk` (`#A64B00` / `#FFB340` bzw. aus `glasAccent(hue)`), `--on-accent` = beste Schrift darauf (hell Weiß 5,79:1, dunkel `#1C1C1E`). Die Flächen holen sich das helle Orange lokal: `styles/glas/accent.css` setzt an 60 Flächen-Selektoren (51 HAPulse, 9 Sentinel-Paket, nur Farbe) `--accent: var(--g-prominent)` und `--on-accent: var(--g-on-prominent)` — Primärknöpfe, Schalter „an“, Balken, Regler, Fortschritt, gewählte Tage, App-Logo. Fokusringe auf diesen Flächen nehmen `--g-focus` (Ink). Ergebnis wie Skizze und E14: orange Flächen mit dunkler Schrift, Text und Symbole in Ink. Schalter-Knöpfe auf der orangen Spur sind weiß (`--g-knob`, GLAS-DESIGN §7.28); mit `--on-accent` wären sie dunkel. Die Spur wird mit den Schaltern in Etappe 5 iOS-Grün (D25). | `var(--accent)` steht 211× im Dashboard-CSS (98× in `color`, 49× in Hintergründen, 31× `outline`, 21× `border`, 6× `box-shadow`, 4× Hero-Verläufe, je 1× `accent-color`/`stroke`) und 20× inline (19× `color`). Mit Orange auf `:root` hätte jede Textstelle 2,2:1, bis sie einzeln umgestellt ist; die Flächen sind die kleinere, abzählbare Menge. GLAS-DESIGN macht es bei `--positive`/`--danger`/… genauso (Ink auf dem Token, Vollfarbe als `--g-*`). Bis Etappe 2 bleiben in Ink: die Hero-Verläufe (`--hero-grad` der Energie- und Wiedergabe-Karte, 15 % Akzent) und der Bogen der Rollladen-Karte (Inline-`stroke` ohne Klasse). |
| K7 | GLAS-DESIGN §2.6: `--radius-control` = `999px` | bleibt in Etappe 1 **12 px**; Kapseln je Baustein ab Etappe 2. `--radius-card` = 26 px schon in Etappe 1 | `--radius-control` steht 71× im Dashboard-CSS (+ 9× im Paket), darunter Kacheln (`.pool-tile`), Panels (`.pool-hero__glance`) und mehrzeilige Kästen (`.onboarding__error`, `.onboarding__advanced`) — `999px` würde sie zu Ovalen verformen. `--radius-card` (22× CSS, 3× inline, 1× Paket) tragen Karten und ihre deckungsgleichen Ebenen (`__bg`, `__wash`, Bearbeiten-Rahmen), dazu zwei Panels (`.numpad-modal`, `.notifications-panel`) und Kacheln in Karten (`.sys-metric-tile`, `.rooms-quick-tile`, `.now-playing-card__artwork-wrap`, die Listen von Garage, Türen, Schlössern). Alle werden in Etappe 1 26 px; die konzentrischen Innenradien (GLAS-DESIGN §5.2) kommen mit den Bausteinen ab Etappe 2. |
| K8 | GLAS-PLAN §1.2 Punkt 5 (`<style id="glas-dark-scope">`) | erst Etappe 6 | nur die Kameraseite braucht einen dauerhaft dunklen Teilbaum |
| K9 | `prefers-contrast: more`, `prefers-reduced-transparency` (§1.6, GLAS-DESIGN §3.7) | wirken über **JS** (`applyAppearance` liest `matchMedia`, schreibt die angepassten Werte inline, setzt `data-contrast="more"`), nicht über CSS-Media-Queries | Inline-Werte auf `:root` schlagen jede Stylesheet-Regel; so bleibt `glasTokens.ts` die einzige Wertequelle und die Kontrast-Tests decken die Variante mit ab |
| K10 | GLAS-PLAN §1.3 `glass-fill`/`glass-filter` als fertige Werte auf `:root` | Material wird in **Bausteinen** gesetzt (`--g-glass-tint`, `--g-glass-rgb`, `--g-glass-a0`, `--g-glass-a1`, `--g-glass-sat`, `--g-glass-bright`) und erst am Element zusammengesetzt (`--g-surface-tint` je Fläche, wirksam `max(Fläche, Stärke)`); die Namen `--g-glass-fill`/`--g-glass-filter` aus `glas-tokens.json → glasVariables` bleiben, werden aber in `material.css` am Glas-Element deklariert | `var()` in einer Custom Property wird dort aufgelöst, wo sie deklariert ist (`:root`) — eine fertige Füllung könnte die Tönung je Fläche (GLAS-DESIGN §3.4) nicht mehr ändern |
| K11 | GLAS-PLAN §1.5 `GlasRuntime` (rendert `null`, importiert das CSS) | **entfällt in Etappe 1.** `app/DashboardApp.tsx` importiert `styles/glas/index.css` als **letzten** Import, nach allen statisch geladenen Stylesheets; die Attribute setzt `applyAppearance` | Das CSS muss mit dem Einstieg geladen sein — sonst zeigen Boot-Anzeige, Onboarding und Anmeldung (ohne `AppLayout`) Klassisch-Schrift — und nach den Upstream-Stylesheets stehen, damit gleich spezifische Upstream-Regeln Glas nicht überschreiben. In `DashboardApp.tsx` (nicht `main.tsx`), damit auch ein Host, der `<DashboardApp />` rendert, das Glas-CSS bekommt; `main.tsx` importiert `DashboardApp` direkt nach `global.css`, der gebaute CSS-Code ist byteweise gleich. Die Stylesheets nachgeladener Seiten stehen danach im Dokument; gegen sie gewinnt jede Glas-Regel über das Präfix (zwei Klassen-Stufen mehr Spezifität als die klassische Regel, die sie kopiert). Scroll-/Druck-Beobachter kommen mit der Shell (Etappe 2). |
| K12 | Selektor-Wächter (GLAS-PLAN §5.2) | schon in Etappe 1 | billig, schützt vom ersten Upstream-Merge an |
| K13 | Spring-Rückfall `@supports not (… linear(0, 1))` per CSS | `applyAppearance` prüft `CSS.supports(…)` und setzt die `cubic-bezier`-Werte direkt | gleiche Inline-Regel wie K9 |
| K14 | GLAS-DESIGN §2.6: `--border` = `transparent` („Karten randlos“) | `--border` = `fillSolid` (`#E5E5EA` / `#3A3A3C`); randlos werden nur die Karten: `base.css` setzt bei `.card` und `.nvr-card` `border-color: transparent`, außer bei Rändern, die einen Zustand zeigen (Alarm ausgelöst, Bewegung, gewählte Farbwelt) | `var(--border)` steht 73× im Dashboard (70× CSS, 3× inline) und 19× im Paket, überwiegend an Eingabefeldern, Segmenten, Spuren von Reglern und Anzeigen (z. B. die Spur des Rollladen-Bogens) und Trennlinien. `transparent` hätte sie unsichtbar gemacht. |
| K15 | GLAS-DESIGN §2.3 Schritt 2: `accentInk` nur gegen `bg` (hell) bzw. `card` (dunkel) prüfen | zusätzlich gegen die Flächen, auf denen Ink tatsächlich steht (Füllung über Karte und `bg`, `card2`, `accentSoft` über der Karte) | mit eigenen Farbtönen des Akzent-Reglers fiel Ink dort sonst auf bis zu 3,3:1; das Standard-Orange ist unverändert (Werte = `glas-tokens.json`) |
| K16 | §3.6 alt: sichtbar „für Admins oder wenn Glas aktiv ist“ | die Zeilen sehen **nur HA-Admins** (E11). Einzige Ausnahme: ein Nicht-Admin **ohne** Admin-Verwaltung, bei dem Glas trotzdem aktiv ist (z. B. aus einem importierten Export), sieht sie als Rückweg. Unter der Verwaltung entscheidet das Dokument des Admins; fehlt darin der Stil (Dokument von vor Glas), gilt Klassisch: `applyGlobal` setzt die drei Felder dann auf den Standard. Beim Admin selbst bleibt eine noch nicht hochgeladene Wahl erhalten (der Abgleich mischt seine lokale Änderung vor `applyGlobal` ein) und wird hochgeladen. | E11 wörtlich. Ohne den Standard in `applyGlobal` hätte ein Gerät mit lokal gesetztem Glas unter einem alten Admin-Dokument Glas behalten, ohne die Zeile zum Abschalten zu sehen. |
| K17 | §3.7 Schlüssel unter `settings.appearance.*` | eigener Namensraum **`glas.*`** | `settings.appearance.*` gehört Upstream; eigene Schlüssel dort kollidieren bei Upstream-Merges und sind schwer vom Upstream-Bestand zu trennen (wie `nvr.*`, `waste.*`) |
| K18 | — | `applyAppearance` merkt sich den zuletzt angewendeten Zustand und schreibt nur bei einer Änderung | der Store ruft es bei **jeder** Einstellungsänderung auf; Glas schreibt 145 Eigenschaften (121 `--g-*`, 24 klassische) |
| K19 | GLAS-PLAN §1.4 `base.css`: Typo-Skala (Large Title 34 … Caption 12), Abstände im 8-pt-Raster, konzentrische Radien, Fokusring | `base.css` hat in Etappe 1 nur Systemschrift, `tabular-nums` und `--radius-card` 26 px. Die Textstile aus GLAS-DESIGN §4.2 kommen mit den Bausteinen, die sie tragen: großer Titel, Seitenleiste und Tab-Leiste in Etappe 2, Sheet-Titel und Listenzeilen in Etappe 3, Kartentitel über der Karte und die Übersicht in Etappe 4, die übrigen Seiten in Etappe 5. Abstände und Innenradien ebenso (K7), Fokusring siehe §3.12 | GLAS-DESIGN §4.2 ordnet jeden Stil einem Einsatzort zu, und die meisten Orte entstehen erst mit den neuen Bausteinen. Auf die heutigen Klassen gelegt hätte z. B. Body 17 px die Kacheln und Zeilen von Klassisch-Layouts gesprengt; nur als Variablen angelegt hätte die Skala nichts sichtbar geändert. Nachgetragen am 2026-10-06 nach dem Vergleich mit der Skizze, vorher stand die Lücke hier nicht |

---

## 2. Etappe 0 — Probe-Skript und Klassisch-Referenz

### 2.1 `apps/dashboard/scripts/glas-shots.cjs` (neue Fork-Datei)

Playwright (global installiert: `$(npm root -g)/playwright`, abweichender Ort per `HP_PW`; **kein** `playwright install`).
CommonJS wie `click-fuzz-test.cjs`, keine neuen Abhängigkeiten.

| Befehl | Zweck |
|---|---|
| `--serve <dist>` (statt einer URL) | eingebauter statischer Server mit SPA-Rückfall auf `index.html`, freier Port |
| `shoot <url> <out> [--style classic\|glas] [--strength …] [--reduce] [--contrast] [--forced-colors] [--devices …] [--modes …] [--scenes …] [--elements <css>] [--suffix …] [--engine chromium\|webkit]` | Screenshots der Matrix (§2.3). `--elements .settings-page__section` legt zusätzlich ein Bild je Einstellungs-Abschnitt an (`…-settings__2-darstellung.png`) |
| `compare <dirA> <dirB> [<diffDir>] [--expect <regex>]` | Pixelvergleich im Browser (Canvas, keine Bibliothek): je Bild abweichende Pixel und Zeilen, rote Differenzbilder; Exit-Code ≠ 0 bei Abweichung. Bilder, deren Name auf `--expect` passt, dürfen abweichen (werden gelistet) |
| `checks <url>` | Laufzeitprüfungen Etappe 1 (§3.10): Pre-Paint, keine Webfonts in Glas, Rückweg Glas → Klassisch ohne Reste, Akzent-Regler folgt dem Stil, OS-Wechsel in „auto“, reduzierte Bewegung, weiße Schalter-Knöpfe, Kartenränder |

**Determinismus** (sonst ist „pixelgleich“ nicht prüfbar): Demo-Modus über `addInitScript` wie in `click-fuzz-test.cjs`
(`hapulse:connection`, `hapulse:settings` mit `lastSeenVersion`/`lastSeenFork` hoch, damit „Was ist neu“ nicht aufgeht),
`timezoneId: 'Europe/Berlin'`, `locale: 'de-DE'`, `Math.random` mit festem Startwert, nur lokale Anfragen (alles andere
wird abgebrochen). Uhr: `clock.install` auf einen festen Zeitpunkt − 60 s und sofort `pauseAt` (Zeitpunkt + 0,5 s), noch
bevor eine Seite existiert — ein späteres `pauseAt` warf auf einer langsamen Maschine. Timer laufen nur über `run`
weiter, höchstens 1900 ms je Dokument (sonst bricht das Skript ab): der Demo-Ticker (`demo.ts:875`) startet nach
2000 ms und darf nie laufen. CSS-Animationen und sanftes Scrollen (`scroll-behavior: smooth`, z. B. wenn ein Dialog den
Fokus nimmt) laufen in Echtzeit, nicht auf der angehaltenen Uhr: vor jedem Bild wartet das Skript, bis keine endliche
Animation mehr läuft und die Scrollposition steht (eine feste Wartezeit war zu kurz, als mehrere Läufe die Maschine
teilten — das Chip-Fenster lag dann 16 px versetzt). Zeiger auf 0,0 (kein Hover), Bilder mit `animations: 'disabled'`,
`fonts.ready` abgewartet. Abnahme des Skripts: zwei Läufe auf demselben Build → **0 Pixel** Unterschied.

### 2.2 Referenz

`main` @ `8d9c783` bauen, `apps/dashboard/dist` nach `<scratchpad>/ref-dist` kopieren, mit `shoot --style classic`
fotografieren. Bilder bleiben außerhalb des Repos (Auswahl für den User in den Projektdateien unter
`glas/etappe-1/`).

### 2.3 Matrix

| Achse | Werte |
|---|---|
| Gerät | Handy 390×844 @2x (Touch), iPad 1180×820 @2x (Touch), Desktop 1440×1000 @1x |
| Modus | hell, dunkel |
| Seiten (ganze Seite, `fullPage`) | `/`, `/room/living_room`, `/security`, `/pool`, `/energy`, `/music`, `/devices`, `/automations`, `/scenes`, `/system`, `/settings`, `/nvr`; Onboarding (ohne Demo) |
| Zustände | Chip-Fenster (Personen), Wetter-Fenster (Handy: kein Wetterknopf im Kopf → übersprungen), Einstellungs-Abschnitte einzeln (`--elements`) |
| nur Glas | Stärke klar/getönt/deckend, `reduceTransparency`, `prefers-contrast: more`, `forced-colors: active`, Material-Probe (§3.10) |

Ein Satz = 88 Seitenbilder + 36 Abschnittsbilder. Entity-Detail (Sensor) ist nicht in der Matrix — es braucht einen
Klick auf eine Kachel je Seite und ändert sich in Etappe 1 nur über die Tokens (abgedeckt durch Startseite und Fenster).

### 2.4 Abnahme Etappe 0

- [x] Skript läuft, `npm run lint` grün (ESLint deckt `.cjs` ab). (2026-10-06)
- [x] Zwei Läufe auf demselben Build → 0 Pixel Unterschied (Klassisch und Glas, je 124 Bilder). (2026-10-06)

---

## 3. Etappe 1 — Fundament

### 3.1 Einstellungen und Scope

| Feld | Ort | Werte / Standard | Scope | Pflege |
|---|---|---|---|---|
| Stil | `customization.uiStyle` | `'classic'` \| `'glas'`, Standard `'classic'` | GLOBAL (automatisch, `isGlobalCustomizationKey`) | Typ + Default in `settingsStore.ts` (`// [fork]`), `KNOWN_GLOBAL` im Test |
| Glas-Stärke | `customization.glassStrength` | `'clear'` \| `'tinted'` \| `'opaque'`, Standard `'clear'` | GLOBAL | dito |
| Transparenz reduzieren | `customization.reduceTransparency` | `boolean`, Standard `false` | GLOBAL | dito |

- Keine neuen Top-Level-Felder, kein neuer Setter (`updateCustomization`), keine Migration (der Deep-Merge in `merge`
  füllt fehlende Schlüssel mit dem Default). `sanitizeCustomization` prüft nur Typen → unbekannte Strings werden beim
  Lesen in `resolveAppearance` auf `classic`/`clear` zurückgesetzt.
- Export/Import, Settings-Sync und globales Dokument tragen die Felder ohne neuen Code (`customization`-Pfad). Ein
  Import ohne die Felder (Datei von vor Glas) oder mit falschen Typen ergibt Klassisch.
- `applyGlobal` setzt fehlende Felder auf den Standard (K16).
- Pro Gerät bleibt nur `modeOverride` (unverändert).

### 3.2 Core: `packages/core/src/glasTokens.ts` (neu, DOM-frei)

| Export | Inhalt |
|---|---|
| `UI_STYLES`, `GLAS_STRENGTHS`; Typen `UiStyle`, `GlasMode`, `GlasStrength`, `GlasColorKey`, `GlasAccent`, `GlasInput`, `ContrastPair`, `Rgba` | Werte und Typen |
| `GLAS_COLORS: Record<GlasMode, Record<GlasColorKey, string>>` | alle 92 Farbschlüssel aus `glas-tokens.json → color` (wörtlich) |
| `GLAS_TINT` | `{ clear: .25, tinted: .75 }` |
| `GLAS_SURFACE_TINT` | Tabelle GLAS-DESIGN §3.4 (für Etappe 2+, dokumentiert die Zahlen an einer Stelle) |
| `GLAS_SPRINGS` | `smooth`/`snappy`/`bouncy`: `linear(…)` (41 Stützpunkte, GLAS-DESIGN §6.1), `cubic-bezier`-Rückfall, Dauer |
| `glasAccent(hue, mode)` | `{ accent, accentInk, tabInk, accentSoft, prominent, onProminent, onAccentInk, focus }` nach GLAS-DESIGN §2.3 (Schritte ×0,9 bzw. +12 % Richtung Weiß, max. 40), Ink gegen alle Flächen geprüft (K15) |
| `glasThemeTokens({ mode, accentHue, strength, contrastMore })` | die 24 HAPulse-Tokens (`ThemeTokens`) in Glas — Tabelle GLAS-DESIGN §2.6 mit K6 und K14 |
| `glasCssVars({ mode, accentHue, strength, contrastMore, supportsLinear })` | `Record<string,string>`: die 24 klassischen Namen (`--bg` …) + 121 `--g-*` (Farben als `--g-<kebab>`, Akzent, Material-Bausteine K10, Federn K13, Dauern) |
| `classicTokenVar`, `glasColorVar` | Namensregeln (`bgCardHover` → `--bg-card-hover`, `glassLabel2` → `--g-glass-label-2`) |
| `parseColor`, `toHex`, `compositeOver`, `relativeLuminance`, `contrastRatio`, `hslToHex`, `glassOver` | Farbrechnung für Algorithmus und Tests |
| `glasContrastPairs(input)` | die geprüften Paare (§3.8) |

Export in `packages/core/src/index.ts` (ein markierter Block).

### 3.3 Dashboard: `apps/dashboard/src/theme/glasAppearance.ts` (neu)

```ts
export interface AppearanceInput { theme: ThemeName; mode: ThemeMode; accentHue?: number;
  uiStyle: UiStyle; glassStrength: GlasStrength; reduceTransparency: boolean }
export function resolveAppearance(s): AppearanceInput            // rein; mode = effectiveMode(s); Werte normalisiert
export function readPersistedStyle(raw: string | null)           // rein; für main.tsx; kaputtes JSON / alter Stand → classic
export function readMediaEnv(): { contrastMore: boolean; reducedTransparency: boolean; supportsLinear: boolean }
export function applyAppearance(a: AppearanceInput, env = readMediaEnv()): void
export function watchAppearance(get: () => AppearanceInput): () => void
export function normalizeUiStyle(v), normalizeGlassStrength(v)   // unbekannt → classic / clear
```

`applyAppearance`:
1. Gleicher Zustand wie beim letzten Aufruf (Stil, Stärke, Transparenz, Farbwelt, Modus samt aufgelöstem „auto“,
   Farbton, Systemeinstellungen) → nichts tun (K18).
2. `applyTheme(theme, mode, accentHue)` — unverändert (Klassisch exakt wie heute).
3. Alle inline gesetzten `--g-*` entfernen.
4. Nur bei `glas`: `glasCssVars(…)` inline setzen (überschreibt die klassischen Namen); wirksame Stärke =
   `opaque`, wenn `reduceTransparency` oder `prefers-reduced-transparency` oder `prefers-contrast: more`.
5. Attribute: `data-style` = `classic`|`glas`; nur in Glas `data-glass` (wirksame Stärke) und `data-contrast="more"`
   (falls aktiv); in Klassisch beide entfernt.
6. `<meta name="theme-color">`: in Glas = `--bg` (`#F2F2F7` / `#000000`), in Klassisch der ursprüngliche Wert aus
   `index.html` (beim ersten Aufruf gemerkt).

`watchAppearance` ersetzt den `watchSystemMode`-Aufruf: hört auf `prefers-color-scheme` (nur bei Modus `auto` neu
anwenden — wie heute), `prefers-contrast` und `prefers-reduced-transparency` (nur in Glas neu anwenden); ein zweiter
Aufruf ersetzt den ersten.

### 3.4 Dashboard: übrige neue Dateien

| Datei | Inhalt |
|---|---|
| `app/glas/useUiStyle.ts` | `useUiStyle()`, `useIsGlas()` (aus dem Store, normalisiert wie `applyAppearance`) |
| `styles/glas/index.css` | importiert `base.css`, `accent.css`, `material.css`, `motion.css`; selbst importiert als letzter Import in `app/DashboardApp.tsx` (K11) |
| `styles/glas/base.css` | `--font-display/-body/-data` = Systemschrift-Stack (GLAS-DESIGN §4.1), `--radius-card: 26px` (K7), `tabular-nums`; Karten randlos (`.card`, `.nvr-card`, K14), Zustandsränder ausgenommen; Körnung `body::after` aus |
| `styles/glas/accent.css` | Akzent als Fläche (K6): 60 Flächen-Selektoren bekommen `--accent: var(--g-prominent)` und `--on-accent: var(--g-on-prominent)`, Fokusringe darauf `--g-focus`; Schalter-Knöpfe im eingeschalteten Zustand weiß (`--g-knob`, alle sieben Schalter-Arten) |
| `styles/glas/material.css` | Rezept GLAS-DESIGN §3.3 als `.g-glass` / `.g-glass--clear` aus den Bausteinen (K10), `-webkit-` + Standard-`backdrop-filter`, Rand-Maske mit `-webkit-mask-composite: xor` + `mask-composite: exclude`, `isolation: isolate`; `[data-glass='opaque']` und `@supports not (backdrop-filter …)` → deckend; `forced-colors: active` → Systemfarben, kein Glas. Noch von keiner Komponente benutzt (ab Etappe 2), geprüft über die Material-Probe |
| `styles/glas/motion.css` | `.stagger-rise` in Glas: 8 px + Überblendung 420 ms `--g-spring-smooth`, 25 ms versetzt, max. 6 Stufen (GLAS-DESIGN §6.3), Keyframes `g-rise`; bei `prefers-reduced-motion` aus (zusätzlich zum globalen Aus) |
| `components/settings/StyleSettings.tsx` | Zeilen „Stil“, „Glas-Stärke“, „Transparenz reduzieren“ (§3.6) und der Hinweis statt der Farbwelt-Karten (`GlasThemeHint`) |
| `test/glasAppearance.test.ts`, `test/glasSelectors.test.ts` | §3.8 |
| `scripts/glas-shots.cjs` | §2.1 |

Regeln (GLAS-PLAN §1.4, geprüft vom Selektor-Wächter): jeder Selektor beginnt mit `:root[data-style='glas']`, keine
Hex-Werte im CSS, kein `@layer`, kein `!important`, kein `@property`/`@font-face`/fremdes `@import`, Keyframes heißen
`g-*` (ein klassischer Name würde die klassische Animation ersetzen).

### 3.5 `[fork]`-Änderungen an Upstream-Dateien

| Datei | Änderung |
|---|---|
| `packages/core/src/index.ts` | Export `glasTokens` |
| `apps/dashboard/src/main.tsx` | `initTheme()`: `applyTheme(theme, mode, accentHue)` → `applyAppearance({ theme, mode, accentHue, ...readPersistedStyle(raw) })` (Pre-Paint); Import von `applyTheme` entfällt |
| `apps/dashboard/src/app/DashboardApp.tsx` | `:66`/`:72` → `applyAppearance(resolveAppearance(s))`; `:78` `watchSystemMode` → `watchAppearance`; Import; `import '../styles/glas/index.css'` als letzter Import (K11) |
| `apps/dashboard/src/pages/Settings.tsx` | `<StyleSettings />` vor der Hell/Dunkel-Zeile; in Glas statt der Farbwelt-Karten `GlasThemeHint`; Akzent-Vorschaupunkt und Standard-Farbton in Glas aus `glasAccent`; ohne eigenen Farbton springt der Regler bei einem Stilwechsel auf den Standard des neuen Stils (Klassisch ohne Wechsel unverändert) |
| `apps/dashboard/src/stores/settingsStore.ts` | drei Felder in `CustomizationSettings` + `DEFAULT_CUSTOMIZATION`; `applyGlobal`: fehlende Felder = Standard (K16) |
| `packages/core/scripts/smoke.mjs` | Block „glas tokens“ (§3.8) |
| `packages/core/locales/*.json` (7) | 13 neue Schlüssel `glas.*` am Ende (§3.7) |
| `docs/DESIGN.md` | ein markierter Verweis auf `GLAS-DESIGN.md` |

Fork-eigene Dateien, die mitgepflegt werden: `apps/dashboard/test/globalSettings.test.ts`,
`apps/dashboard/scripts/click-fuzz-test.cjs` (Option `glas`), `packages/core/src/forkChangelog.ts` + `CHANGELOG.fork.md`,
`docs/SYNC.md` (Inventar), `CLAUDE.md` (Abschnitt „Stil Glas“), `docs/GLAS-PLAN.md` (Haken, Daten, Verweis hierher),
`docs/GLAS-DESIGN.md` §2.6 und `docs/glas/glas-tokens.json → classicMapping` (Hinweise zu K6/K7/K14, Werte für
`--accent`/`--on-accent`/`--border` wie umgesetzt).

### 3.6 Einstellungen „Darstellung“

Neue Zeilen nach App-Name/-Symbol, vor Hell/Dunkel, im gesperrten Bereich (`managed-fieldset`, `disabled` für
Nicht-Admins im verwalteten Modus):

1. **Stil** — Segment `Klassisch | Glas (Vorschau)` (`mode-toggle`), Hinweis „Glas ändert nur Aussehen und Bewegung,
   alle Funktionen bleiben.“; im verwalteten Modus zusätzlich der bestehende Hinweis „Für alle Nutzer und Geräte“.
2. nur in Glas: **Glas-Stärke** — `Klar | Getönt | Deckend`.
3. nur in Glas: **Transparenz reduzieren** — Schalter (`admin-toggle`), Hinweis „Deckende Flächen statt Glas, auf allen
   Geräten (z. B. für ältere Tablets)“ — der Zusatz „auf allen Geräten“, weil der Schalter GLOBAL ist (E2).

Sichtbar nur für HA-Admins (`useCanEdit()`), Ausnahme siehe K16. In Glas statt der Farbwelt-Karten: Zeile „Design“ mit
dem Hinweis „Im Stil Glas gilt eine neutrale Farbpalette. Das Design bleibt für Klassisch gespeichert.“ Der
Akzent-Regler bleibt (E14); ohne eigenen Farbton zeigen Vorschaupunkt und Regler in Glas das iOS-Orange.

### 3.7 Texte (alle 7 Locales, Parität prüft `smoke.mjs`)

`glas.style.{label,groupAria,classic,glas,hint}`, `glas.strength.{label,groupAria,clear,tinted,opaque}`,
`glas.reduceTransparency.{label,hint}`, `glas.themeHint` (K17). Die Zeile „Design“ nutzt den bestehenden Schlüssel
`settings.appearance.theme.label`.

### 3.8 Tests

| Test | Ort | Prüft |
|---|---|---|
| Glas-Tokens | `smoke.mjs` Block „glas tokens“ | gleiche Schlüssel hell/dunkel; Farben, Standard-Akzent und Federn = `glas-tokens.json` (wörtlich); jeder Schlüssel von `glasCssVars` ist einer der 24 klassischen Namen oder `--g-*`, jede Glas-Farbe als `--g-<kebab>`; `--accent` = Ink und `--g-accent` = Orange (K6), `--border` = `fillSolid` (K14); die 24 klassischen Werte = `glas-tokens.json → classicMapping` (Doku und Code laufen nicht auseinander); Tönung je Stärke; Federn = `linear(…)` mit 41 Stützpunkten 0…1, Rückfall ohne `linear()`; Nachrechnung von GLAS-DESIGN §2.5 (Stichproben ± 0,05); **jedes Text-/Symbolpaar ≥ seinem Minimum** über Modus × Stärke × Kontrast × Farbton (ohne + 0…345 in 15er-Schritten); „mehr Kontrast“ senkt nie ein Paar |
| Erscheinung | `apps/dashboard/test/glasAppearance.test.ts` | `resolveAppearance` (Normalisierung, `modeOverride` gewinnt); `readPersistedStyle` (kaputtes JSON, alter Stand, Müllwerte); `applyAppearance` gegen ein nachgebautes `document`: Glas setzt Tokens + `--g-*` + Attribute + `theme-color`; **Glas → Klassisch ergibt exakt den Zustand eines frischen Klassisch** (Inline-Stil, Attribute, `theme-color`); Transparenz/Kontrast → `opaque`; `linear()`-Rückfall; unveränderter Zustand wird nicht neu geschrieben, Stärke, Farbton und Farbwelt schreiben neu (K18); `watchAppearance` (System-Hell/Dunkel nur in „auto“, Kontrast/Transparenz nur in Glas, kein doppelter Listener) |
| Scope | `globalSettings.test.ts` | drei Felder in `KNOWN_GLOBAL`; Admin stellt Glas ein → Nicht-Admin bekommt Stil, Stärke, Transparenz; `modeOverride` bleibt Gerätewert; Nicht-Admin mit lokalem Glas unter einem Dokument von vor Glas → Klassisch; ungespeicherte Glas-Wahl des Admins übersteht ein solches Dokument und wird hochgeladen (K16); Export enthält die Felder, Import mit falschen Typen bzw. einer Datei ohne die Felder → Klassisch |
| Selektor-Wächter | `apps/dashboard/test/glasSelectors.test.ts` | Dateiliste; jeder Selektor beginnt mit `:root[data-style='glas']`; keine Hex-Werte, kein `!important`/`@layer`/`@property`/`@font-face`/fremdes `@import`; Keyframes `g-*`; jede Klasse außer `g-*` ist in einem Klassisch-Stylesheet oder im Paket-CSS definiert |
| Changelog | `forkChangelog.test.ts` (besteht) | `CHANGELOG.fork.md` aktuell |

Pflichtbefehle vor jedem Push: `npm run typecheck && npm run build && npm test -w @hapulse/core && npm test -w @hapulse/dashboard && npm run lint`.

### 3.9 Changelog F31

Titel „Vorschau: Stil „Glas““ / “Preview: “Glass” style”, Abschnitt `added`:
- „Für Admins: unter Einstellungen → Darstellung den Stil „Klassisch“ oder „Glas“ wählen; Glas ändert nur Aussehen und
  Bewegung (iOS-Farben, Systemschrift, reines Schwarz im Dunkelmodus), alle Funktionen bleiben, und bei der Verwaltung
  für alle gilt der Stil für jeden Nutzer“
- „Im Stil Glas: Glas-Stärke klar, getönt oder deckend und „Transparenz reduzieren“; Hell/Dunkel lässt sich weiterhin
  pro Gerät wählen“

Datum = Merge-Datum (im PR auf den Tag des Schreibens gesetzt; vor dem Merge anpassen).

### 3.10 Screenshot- und Laufzeitprüfung

- **Klassisch:** komplette Matrix (§2.3) mit dem Branch-Build gegen die Referenz → **0 Pixel** Unterschied, mit einer
  Ausnahme: `/settings`. Für Admins (der Demo-Nutzer ist Admin) kommt in „Darstellung“ die Zeile „Stil“ dazu, und „Über“
  zeigt F31. Deshalb wird `/settings` zusätzlich **je Abschnitt** verglichen: Verbindung gleich; Darstellung und Über
  wie erwartet anders; Admin, Räume, Sicherung haben dieselbe Breite und Höhe (im DOM gemessen) und liegen nur um die
  neue Zeile tiefer (Handy +153,4 px, iPad/Desktop +95,2 px) — der Bruchteil eines Pixels verschiebt die Kanten.
- **Klassisch nach Umschalten** (`checks`): Glas laden, über den Knopf „Klassisch“ in den Einstellungen umschalten, dann
  ohne Reload zur Startseite → derselbe Inline-Stil, dieselben Attribute, dasselbe `theme-color` und dieselben Pixel wie
  ein frisches Klassisch **desselben Builds** (nicht der Referenz — der Build hat die neue Zeile).
- **Glas:** alle Seiten hell/dunkel × Handy/iPad/Desktop; Stärken getönt/deckend an Start, Einstellungen und Fenster;
  „Transparenz reduzieren“, `prefers-contrast: more`, `forced-colors` je an Start und Einstellungen.
- **Material-Probe:** die Probe legt `.g-glass`-Flächen (Tönung .25/.5/.6/.88, clear über einem Kamerabild) über die
  Startseite — prüft das Rezept in Chromium, bevor Etappe 2 es benutzt; in Klassisch bleibt sie wirkungslos.
- **Pre-Paint** (`checks`): ein Init-Skript beobachtet `#root`; beim ersten Kind müssen `data-style="glas"` und das
  Glas-`--bg` gesetzt sein. Das Bild **vor** dem App-Skript (leere Seite mit HTML-Standard, hell) prüft nur das Labor
  (§6, Punkt 2).
- **Keine Webfonts in Glas** (`checks`): nach dem Setzen von `data-style="glas"` keine Fontsource-Anfrage. Die erste
  Layout-Runde des Browsers läuft vor dem App-Skript auf den HTML-Standards und lädt dabei die Klassisch-Grundschrift
  (Schibsted 400) für die Zeilenmaße — wie in Klassisch; das Skript listet sie getrennt.
- **Modus „auto“** (`checks`): Farbschema per Emulation wechseln → Glas bleibt, `--bg` wechselt hin und zurück.
- **Reduzierte Bewegung** (`checks`): `g-rise` startet normal, mit `prefers-reduced-motion: reduce` nie.
- **Akzent-Regler** (`checks`): ohne eigenen Farbton zeigt er den Standard des Stils, auf dem Bildschirm, in beide
  Richtungen umgeschaltet (Aurora hell 34, Glas hell 35).
- **Schalter-Knöpfe** (`checks`): jeder eingeschaltete Schalter auf Start (mit Favoriten), Raum, Automationen, Pool und
  Einstellungen hat in Glas hell und dunkel einen weißen Knopf (gefunden: Karten-, Automations-, Pool-, Geräte- und
  Admin-Schalter). Gegenprobe ohne die Regel: fast schwarze Knöpfe (`#1C1C1E`) an Karten- und Automations-Schaltern in
  beiden Modi, an Geräte- und Pool-Schaltern im Dunkelmodus; der Admin-Schalter ist schon in Klassisch weiß.
- **Kartenränder** (`checks`): in Glas hat keine Karte der Sicherheitsseite einen Rand; eine ausgelöste Alarm-Karte
  behält den Rand, den Klassisch ihr gibt.
- **Klick-Fuzz** (`click-fuzz-test.cjs … glas`) Handy + Desktop: keine Fehler.
- **NVR:** `/nvr` im Demo-Modus (Einrichtungskarte) in beiden Stilen; die Paket-Ansichten (Übersicht, Kameraseite)
  brauchen einen Sentinel-Server → Labor (§6, Punkt 7).

### 3.11 Abnahme Etappe 1 (aus GLAS-PLAN, angepasst nach K1/K2)

- [x] Klassisch: Vergleich mit Etappe 0 ohne Abweichung (alle Seiten, hell/dunkel, Handy/iPad/Desktop) — außer der neuen
      Zeile „Stil“ und „F31“ in `/settings` (§3.10). (2026-10-06)
- [x] Glas: jede Seite mit iOS-Palette, Systemschrift, reinem Schwarz im Dunkelmodus; Glas vor dem ersten React-Knoten
      angewendet; OS-Hell/Dunkel-Wechsel in „auto“ behält Glas. (2026-10-06; das Bild vor dem App-Skript: Labor)
- [x] Umschalten Glas ↔ Klassisch ohne Reload, ohne Reste. (2026-10-06)
- [x] Verwalteter Modus: Admin stellt Glas ein → zweiter User bekommt Glas; Hell/Dunkel pro Gerät bleibt Gerätewert
      (Tests mit nachgebautem HA). (2026-10-06)
- [x] Option nur für Admins sichtbar (E11, K16); Farbwelten in Glas ausgeblendet mit Hinweis, Akzent bleibt. (2026-10-06)
- [x] Kontrast-Test grün; `globalSettings.test.ts` grün; Selektor-Wächter grün. (2026-10-06)

Nicht verlieren (Inventar) — alles noch da, in beiden Stilen: Hell/Dunkel/Auto + Hell/Dunkel pro Gerät (S4, S5) ·
Sprache (S6) · Akzent-Regler (S8) · Farbwelten für Klassisch gespeichert (S7) · App-Name/-Symbol/PWA-Icons (S2, S3,
V3) · Verwaltet-Hinweis/gesperrte Felder (S9) · Export/Import (S14) · „Was ist neu“ (U) · Zahlen sprachabhängig (V7).

### 3.12 Bekannt und bewusst offen nach Etappe 1 (kommt in Etappe 2–5)

- Glas-Material an Seitenleiste/Tab-Leiste/Sheets, Kapselformen der Steuerelemente (K7), Titel über den Karten,
  Satzschreibung der Abschnittsköpfe.
- Schalter im Glas-Look (Etappe 5, GLAS-DESIGN §7.28): Spur iOS-Grün, Größe 51 × 31, Aus-Zustand. In Etappe 1 ist die
  Spur orange mit weißem Knopf; ausgeschaltet sehen die Schalter aus wie in Klassisch.
- Glas-Stärke: „Klar“ und „Getönt“ sehen in Etappe 1 gleich aus (Startseite gemessen: 0 Pixel Unterschied), weil noch
  keine Fläche aus Glas-Material ist. „Deckend“ und „Transparenz reduzieren“ machen schon Zweittext und Trennlinien
  kräftiger. Voll wirksam ab Etappe 2.
- Akzent: Hero-Verläufe und der Bogen der Rollladen-Karte noch in Ink (K6).
- Konzentrische Innenradien (GLAS-DESIGN §5.2) für Kacheln und Listen in Karten (K7).
- Textstile der iOS-Skala (GLAS-DESIGN §4.2) und Abstände im 8-pt-Raster: je Baustein ab Etappe 2 (K19). Bis dahin
  haben alle Texte die Größen von Klassisch, nur in Systemschrift.
- Kontrast-Audit über alle Seiten (GLAS-PLAN §5.4) mit Etappe 2. Bekannt: fünf Stellen mit fest weißer Schrift auf
  `--danger`/`--info` (Fehler-Banner, Mitteilungs-Zähler, Bewegungs-Abzeichen der Kamera, Gefahr-Knopf,
  Abspielknopf der Medienkarte) haben in Glas dunkel 2,8:1 — in Klassisch dunkel heute 2,2–3,0:1, in Glas hell 5,4–5,6:1.
- Reduzierte Bewegung: Überblendung 200 ms statt keiner Animation (GLAS-DESIGN §6.4), sobald Glas eigene Übergänge hat.
- Fokusdarstellung im Detail (Ringe auf Glas, Tastaturwege durch Shell und Sheets).

Bis dahin ist Glas eine **Vorschau für Admins**: neue Farben, Schrift und Kartenform auf dem bestehenden Layout.

### 3.13 Review des PR (2026-10-06)

| # | Befund | Behoben |
|---|---|---|
| 1 | Soll: eingeschaltete Schalter bekamen in Glas einen fast schwarzen Knopf (`#1C1C1E`): Karten- und Automations-Schalter in beiden Modi (`--on-accent` auf der Akzentfläche), Geräte- und Pool-Schalter im Dunkelmodus (Flächenfarbe) | eine Knopf-Regel für alle sieben Schalter-Arten in `accent.css` (`--g-knob`, weiß, beide Modi); Prüfung in `checks` |
| 2 | Fokusring-Liste ohne die Medien-Regler (`.now-playing-card__progress`, `__volume-slider`, `.player-tile__volume`) | aufgenommen; die Regler unterdrücken ihren Ring heute selbst (`.slider { outline: none }`), so bleibt ein künftiger Ring Ink |
| 3 | Akzent-Regler zeigte nach einem Stilwechsel den Standard des alten Stils | Regler springt beim Stilwechsel auf den neuen Standard, solange kein eigener Farbton gewählt ist; die Zeile `value={localHue}` ist wieder Upstream; Prüfung in `checks` |
| 4 | `base.css` blendete auch Ränder aus, die einen Zustand zeigen (`.alarm-panel-card--triggered`) | `:not(…)` für die Zustandsränder; Hinweis in `docs/SYNC.md` für künftige Upstream-Ränder; Prüfung in `checks` |
| 5 | `main.tsx`: geänderte Import-Zeile ohne `[fork]` | markiert |
| 6 | Glas-CSS nur in `main.tsx` — ein Host mit `<DashboardApp />` hätte es nicht | Import nach `DashboardApp.tsx` (K11); gebauter CSS-Code byteweise gleich |
| 7 | Test des Merkens (K18) prüfte nur die Stärke | prüft auch Farbton und Farbwelt; Gegenprobe ohne die beiden im Schlüssel schlägt fehl |

Nach den Korrekturen (Screenshots wie §3.10): Klassisch 124 von 124 Bildern gleich wie vor dem Review, gegen `main`
weiter nur `/settings` anders; Glas in zwei Läufen 124 von 124 gleich; gegenüber Glas vor dem Review ändern sich nur
die Bilder mit eingeschalteten Schaltern (Raum und Automationen hell und dunkel, Pool dunkel, je Handy, iPad und
Desktop).

Nebenbefund in Klassisch (nicht Teil von Glas, nicht geändert): Im Produktions-Build zeigt eine ausgelöste Alarm-Karte
weder den roten Rand noch den roten Schein aus `AlarmPanelCard.css`. Die Regel liegt in einem gemeinsamen CSS-Teil, den
`index.html` vor dem Haupt-Stylesheet einbindet; im Haupt-Stylesheet setzt `.card` (gleiche Spezifität, später) Rand
und Schatten zurück (gemessen am gebauten Stand in Chromium). Glas blendet an dieser Karte nichts aus, was Klassisch zeigt.

---

## 4. NVR und `@sentinel-nvr/web`

- **Etappe 1 ändert im Paket nichts.** Die NVR-Seiten (Übersicht und Kameraseite) sind Paket-Komponenten und lesen die
  HAPulse-Tokens — in Glas bekommen sie automatisch Farben, Schrift und Kartenradius des Stils, **Layout und Verhalten
  bleiben 1:1** wie in Sentinels eigener UI. In Klassisch bleibt alles exakt wie heute.
- HAPulses Glas-CSS berührt Paket-Klassen nur in der Farbe: Karten randlos wie `.card` (`.nvr-card`, K14) und neun
  Akzentflächen in hellem Orange (`accent.css`, K6) — so wie Sentinels eigene UI ihren Akzent als Fläche zeigt.
- Sentinels eigene UI bekommt kein Glas (E12); in Glas unterscheiden sich die beiden UIs also nur in den Tokens.
- Die **immersive Kameraseite** (dunkles Vollbild, klare Glas-Kapsel über dem Video, Tab-/Chip-Leiste nur dort aus —
  E12/E13) kommt erst in Etappe 6 als Paket-Option mit unverändertem Standard. Weil das vom Layout der Sentinel-UI
  abweicht, wird es vor Etappe 6 noch einmal mit dem User bestätigt.

---

## 5. Randnotiz Energie-Karte („ein kleines bisschen minimalistischer“)

Gemeint ist die Glas-Energiekarte der Skizze (`screens/g5e-h-light.webp`, GLAS-DESIGN §7.9). Varianten als Bilder in den
Projektdateien unter `glas/energie-varianten/` (`uebersicht-hell.png`, `uebersicht-dunkel.png`, je Variante hell/dunkel,
README), nicht im Repo. Alle zeigen dieselben Werte.

| Variante | Was sich ändert | Kartenhöhe (Handy) |
|---|---|---|
| V0 Skizze | Referenz | 377 px |
| V1 Ruhigeres Diagramm | nur Grundlinie statt gestrichelter 1-/2-kWh-Linien, nur „2 kWh“ als Maßstab, „Ø 0,5“ direkt an der Ø-Linie, Legende nur Netz · Solar | 377 px |
| V2 + kompakter Kopf | wie V1; „8,4 kWh Verbrauch“ ohne eigene Zeile darüber, PV-Ertrag und Vergleich in einer Zeile | 339 px (−38) |
| V3 nur heute | wie V2 ohne Segment Tag/Woche/Monat (Woche/Monat nur noch auf der Energieseite) | 299 px (−78) |
| **V4 kompakt, alle Werte** | kompakter Kopf wie V2, der Vergleich „−12 % ggü. gestern“ direkt unter dem Verbrauch, darunter PV-Ertrag; Diagramm mit allen Werten der Skizze (Achswerte 0/1/2 kWh, Ø-Linie, „Ø 0,5 kWh je Std.“), Hilfslinien nur fein durchgezogen statt gepunktet | 339 px (−38) |

**Empfehlung: V4.** V1 bis V3 lassen Achswerte und Hilfslinien weg bzw. kürzen den Durchschnitt; die Entscheidung
„Energie“ in GLAS-PLAN §7.3 („Hilfslinien mit Achswerten, Ø-Linie“) und GLAS-DESIGN §8 („Inhalte nicht reduzieren“)
verlangen sie. V3 nähme der Karte zudem die Zeitraumwahl. V4 wird ruhiger und kürzer, ohne einen Wert zu verlieren.
Umsetzung in Etappe 4 (Glas-Energiekarte); **Klassisch wird dafür nicht angefasst**, bis der User zustimmt.

---

## 6. Später im Labor (echtes WebKit, iPad)

`glas-shots.cjs` kann mit `--engine webkit` laufen (Playwright-WebKit im Labor). Offen für echte WebKit-/iPad-Prüfung:

1. Systemschrift = SF Pro auf iPad/iPhone: Textbreiten, Abschneidungen (Linux rendert mit einem Ersatz).
2. Erstes Bild beim Laden als Home-Bildschirm-App: vor dem App-Skript zeigt die Seite den HTML-Standard (hell,
   Klassisch-Hintergrund) — in Klassisch mit Dunkelmodus heute genauso. Ansehen, ob es sichtbar blitzt; Abhilfe für
   beide Stile wäre ein kleines Inline-Skript in `index.html` (Upstream-Datei, eigene Entscheidung). Statusleiste mit
   `theme-color` in hell/dunkel.
3. Material-Probe in Safari: `-webkit-backdrop-filter`, Rand-Maske (`-webkit-mask-composite: xor`), `isolation`.
4. `linear()`-Federn (Safari ≥ 17.2) bzw. `cubic-bezier`-Rückfall auf älteren Geräten.
5. iOS „Kontrast erhöhen“ (`prefers-contrast: more`) → deckende Flächen; „Transparenz reduzieren“ von iOS kommt im Web
   nicht an → App-Schalter.
6. Kontrast hell auf iPad bei Tageslicht (Sichtprüfung durch den User).
7. Sentinel-Kameraseite und -Übersicht in Glas mit echten Kameras (`nvr-sweep-test.cjs` in beiden Stilen).
8. Ab Etappe 2: Leistungsbudget (`backdrop-filter`) auf dem iPad (E17).
