# Umsetzungsplan „Glas“ — zweiter Stil für HAPulse

> **Grundsatz (vom User freigegeben): „Glas ist nur ein Stil.“** Dieselben Komponenten, dieselben Funktionen,
> dieselbe Informationsarchitektur wie HAPulse. Eine Einstellung **Stil: Klassisch | Glas** schaltet nur Aussehen und
> Bewegung um. In keinem der beiden Stile darf etwas verloren gehen. Wo eine Apple-Regel eine HAPulse-Funktion
> entfernen würde, gewinnt HAPulse.

| Dokument | Inhalt |
|---|---|
| `docs/GLAS-DESIGN.md` | Designsystem Glas (Farben, Typo, Material, Bewegung, Komponenten-Anatomie) — separat geschrieben, **maßgeblich für das Aussehen** |
| `docs/GLAS-PLAN.md` | dieses Dokument: Architektur, Etappen, Abnahme, Tests, Risiken |
| `docs/glas/` | freigegebene Skizzen `Glas5Handy.dc.html`, `Glas5Desktop.dc.html` (+ Wrapper-Artboards, `support.js`), Screenshots `g5h-*.png` / `g5d-*.png`, Checkliste `HAPULSE-INVENTORY.md`, Specs `SPEC3/4/5.md` |

Die Skizzen sind **Referenz für Look und Bewegung, kein Code zum Kopieren** (eigenes Canvas-Format, Inline-Styles,
Beispieldaten). Gebaut wird in den echten HAPulse-Komponenten nach den Fork-Regeln aus `CLAUDE.md`/`docs/SYNC.md`.

Stand der Recherche: Fork `main` @ `f007a73` (Upstream 1.3.2 + F30), `@sentinel-nvr/web` ^0.17.1.

---

## Inhalt

1. [Architektur](#1-architektur)
2. [Verhalten: neue Bausteine oder nur CSS](#2-verhalten-neue-bausteine-oder-nur-css)
3. [Etappen mit Abnahme und „Nicht verlieren“-Listen](#3-etappen)
4. [NVR und das Paket `@sentinel-nvr/web`](#4-nvr-und-das-paket-sentinel-nvrweb)
5. [Prüfung](#5-prüfung)
6. [Changelog und Doku](#6-changelog-und-doku)
7. [Risiken und offene Entscheidungen](#7-risiken-und-offene-entscheidungen)
8. [Start-Prompt für die neue Session](#8-start-prompt-für-die-neue-session)

---

## 1. Architektur

### 1.1 Die Stil-Achse

Neben **Farbwelt** (`theme`: aurora/sunset/ocean/forest) und **Modus** (`mode`: hell/dunkel/auto) kommt eine dritte
Achse **Stil** dazu. Sie wirkt auf Aussehen und Bewegung, nie auf Daten oder Funktionen.

| Einstellung | Ort im Store | Werte | Scope | Begründung |
|---|---|---|---|---|
| Stil | `customization.uiStyle` | `'classic'` \| `'glas'` (Standard `'classic'`) | **GLOBAL** | Wie `theme`/`mode`: das Aussehen des Haushalts. Unter „Einstellungen für alle“ legt der Admin es für alle fest. Als `customization`-Schlüssel ist es automatisch GLOBAL (`isGlobalCustomizationKey`), wird von `extractGlobal`/`diffGlobal`/`mergeGlobal`, `sanitizeCustomization`, Export/Import und dem normalen Settings-Sync ohne neuen Code mitgenommen. |
| Stil auf diesem Gerät | `uiStyleOverride` (Top-Level) | `'classic'` \| `'glas'` \| `null` | **DEVICE** | Spiegel von `modeOverride`: Wandtablet mit schwacher GPU bleibt Klassisch, obwohl der Haushalt Glas nutzt. Nie exportiert/synchronisiert. |
| Glas-Stärke | `customization.glassStrength` | `'clear'` \| `'tinted'` \| `'opaque'` (Standard `'clear'`) | **GLOBAL** | Geschmack des Haushalts (Skizze: klar / getönt / deckend). |
| Transparenz reduzieren | `reduceTransparency` (Top-Level) | `boolean` (Standard `false`) | **DEVICE** | Barrierefreiheit und Leistung pro Gerät. Safari kennt `prefers-reduced-transparency` nicht, deshalb ein App-Schalter. Erzwingt auf diesem Gerät „deckend“ ohne Blur. |
| (optional, Etappe 4) „L“-Höhe | `customization.tallSections` | `string[]` (`'home:energy'`, …) | GLOBAL | Nur falls Entscheidung E6 = Variante A (siehe §7). Klassisch ignoriert das Feld. |

Pflicht bei jedem neuen Feld (Test `apps/dashboard/test/globalSettings.test.ts` schlägt sonst fehl):
- `customization`-Felder in `KNOWN_GLOBAL` des Tests eintragen, Default in `DEFAULT_CUSTOMIZATION` (`// [fork]`).
- Top-Level-Felder in `DEVICE_TOP_KEYS` (`stores/settingsScope.ts`), Default im Store, Bereinigung in `merge`
  (wie `modeOverride`: `isUiStyle(p.uiStyleOverride) ? … : null`), **nicht** in `exportSettings`.
- `applyGlobal`: `uiStyle`/`glassStrength` laufen über den `customization`-Pfad, kein Extra-Code nötig.
- Abgeleiteter Wert: `effectiveStyle(s) = s.uiStyleOverride ?? s.customization.uiStyle` (neben `effectiveMode`).

Alternative USER-Scope (jeder HA-User wählt selbst) ist möglich, braucht aber eine Erweiterung von
`UserSettingsPayload` (v1-Schema) und `userSettingsSync.ts` → siehe Entscheidung E1.

### 1.2 Anwenden auf das Dokument — Zusammenspiel mit `applyTheme`

**Wichtigste Falle:** `applyTheme()` (`apps/dashboard/src/theme/themes.ts`) schreibt alle Farb-Tokens **inline** auf
`:root`. Inline schlägt jedes Stylesheet. Glas-Farben in `:root[data-style='glas'] { --bg: … }` würden also **nicht**
greifen. Außerdem ruft `watchSystemMode` bei OS-Hell/Dunkel-Wechsel nur `applyTheme` auf und würde Glas-Farben
überschreiben.

Lösung — neue Datei `apps/dashboard/src/theme/glasAppearance.ts`:

```ts
export type UiStyle = 'classic' | 'glas';
export interface AppearanceInput { theme; mode /* effektiv */; accentHue?; uiStyle; glassStrength; reduceTransparency; }
export function resolveAppearance(s: SettingsLike): AppearanceInput        // rein, getestet
export function readPersistedAppearance(raw: string | null): AppearanceInput // für main.tsx (vor Hydration), getestet
export function applyAppearance(a: AppearanceInput): void
export function watchAppearance(get: () => AppearanceInput): () => void  // ersetzt den watchSystemMode-Aufruf
```

`applyAppearance` macht:
1. `applyTheme(theme, mode, accentHue)` — unverändert, setzt alle klassischen Tokens + `data-theme`/`data-mode`.
2. Bei `glas`: alle Werte aus `glasTokenVars(…)` (Core, §1.3) per `root.style.setProperty` darüberschreiben —
   sowohl die **klassischen Token-Namen** (`--bg`, `--bg-card`, `--text`, `--text-dim`, `--accent`, …) als auch die
   Glas-eigenen `--g-*`. Bei `classic`: alle `--g-*` entfernen (die klassischen Namen hat Schritt 1 schon
   zurückgesetzt, weil `applyTheme` sie immer vollständig schreibt).
3. Attribute auf `:root`: `data-style="classic|glas"`, `data-glass="clear|tinted|opaque"` (bei
   `reduceTransparency` immer `opaque`), `data-reduce-transparency` (nur gesetzt, wenn an).
4. Optional: `<meta name="theme-color">` auf `--bg` setzen (Statusleiste der PWA; heute statisch `#f3f4f6`).
5. Einmalig ein `<style id="glas-dark-scope">` mit den **dunklen** Glas-Werten für den Selektor
   `:root[data-style='glas'] [data-glas-scheme='dark']` erzeugen. Weil Custom Properties vererben und eine
   Deklaration am Nachfahren den Inline-Wert der Wurzel schlägt, kann so ein Teilbaum dauerhaft dunkel sein (Kameraseite,
   §4) — eine Quelle für alle Werte bleibt `glasTokens.ts`.

Invariante (Test): Jeder Schlüssel aus `glasTokenVars` ist entweder ein Name aus `TOKEN_TO_VAR` (dann setzt
`applyTheme` ihn beim Zurückschalten wieder) oder beginnt mit `--g-`. Sonst bliebe Glas-Farbe nach dem Umschalten
auf Klassisch hängen.

`[fork]`-Änderungen dafür (alle klein, markiert):

| Datei | Änderung |
|---|---|
| `apps/dashboard/src/main.tsx` | In `initTheme()` nach dem Parsen `applyAppearance(readPersistedAppearance(raw))` statt nur `applyTheme(…)` — sonst Blitz „klassisch → Glas“ beim Laden. |
| `apps/dashboard/src/app/DashboardApp.tsx` | Die drei `applyTheme(…)`-Zeilen → `applyAppearance(resolveAppearance(s))`; `watchSystemMode(…)` → `watchAppearance(…)`. |

Fonts und Radien sind **nicht** inline (stehen in `styles/global.css` `:root`), sie werden rein per CSS
`:root[data-style='glas'] { --font-display: …; }` überschrieben — höhere Spezifität reicht.

### 1.3 Token-Quelle: `packages/core/src/glasTokens.ts` (DOM-frei)

Neue Core-Datei (keine React-/DOM-Abhängigkeit), Export in `packages/core/src/index.ts` (`// [fork]`).

| Export | Zweck |
|---|---|
| `GLAS_PALETTE: { light, dark }` | neutrale iOS-Palette (Werte aus `Glas5Handy.dc.html` `.g5-root` bzw. `[data-mode="dark"]`): `bg #F2F2F7 / #000000`, `card #FFFFFF / #1C1C1E`, `card2 #F2F2F7 / #2C2C2E`, `fill`, `sep`, `label`, `label2 #5F5F64 / #AEAEB2`, `label3`, Zustandsfarben mit **Ink-Varianten** (`yellow`/`yellowInk #8F6C00`, `orange`/`orangeInk #B25000`, `teal`/`tealInk #0A7389`, `green`/`greenInk`, `red`/`redInk #D70015`, `blue`/`blueInk`, `purpleInk #8944AB`, `indigoInk #3634A3`), `switchOn #34C759 / #30D158` |
| `GlasStrength`, `GLAS_TINT: { clear: .25, tinted: .75 }` | Glas-Stärke → `--g-glass-tint`; `opaque` = deckende Füllung, kein Blur |
| `glasAccent(hue: number \| undefined, mode)` | `{ accent, accentInk, accentSoft, onAccent }`. Ohne Hue: iOS-Orange `#FF9500` / `#FF9F0A`. **`accentInk`** ist die dunklere (hell) bzw. hellere (dunkel) Variante für Text/Links — `#FF9500` auf Weiß hat nur **2,2:1**, `#B25000` hat 5,2:1. |
| `glasTokenVars(input): Record<string, string>` | Mappt die Palette auf die **bestehenden HAPulse-Token-Namen** (dadurch sieht jede Seite sofort „Glas“ aus, ohne Komponenten-CSS anzufassen) + Glas-eigene `--g-*` (Material, Zustände, Federn, Dauern). Mapping-Tabelle siehe unten. |
| `GLAS_SPRINGS` | `--g-spring-smooth/-snappy/-bouncy` als `linear(…)`-Strings (aus der Skizze übernehmen, ≥ 20 Stützpunkte) + `--g-d-snappy .35s`, `--g-d-smooth .5s`, `--g-d-bouncy .6s` |
| `contrastRatio(fg, bg)`, `compositeOver(rgba, bg)` | WCAG-Kontrast; Glas-Füllung über weißem/schwarzem Inhalt zusammenrechnen (für Tests) |
| `GLAS_CONTRAST_PAIRS` | Liste aller Paare, die der Test prüft (§5.2) |

Mapping auf bestehende Namen (Auszug, Details in `GLAS-DESIGN.md`):

| HAPulse-Token | Glas hell | Glas dunkel | Hinweis |
|---|---|---|---|
| `--bg` | `#F2F2F7` | `#000000` | rein schwarz im Dunkelmodus |
| `--bg-raised` | Sheet-Fläche | `#1C1C1E` | Sheets/Popover |
| `--bg-card` / `--bg-card-hover` | `#FFFFFF` / `#F7F7FA` | `#1C1C1E` / `#2C2C2E` | Inhaltskarten deckend, randlos |
| `--bg-subtle` | `rgba(120,120,128,.12)` | `rgba(120,120,128,.24)` | iOS `fill` |
| `--text` | `#000000` | `#FFFFFF` | |
| `--text-dim` | `#5F5F64` (6,35:1 auf Weiß, 5,69:1 auf `#F2F2F7`) | `#AEAEB2` (7,7:1 auf `#1C1C1E`) | sekundär ≥ 4,5:1 überall |
| `--text-faint` | **nicht** `#7C7C80` (nur 3,7:1 auf `#F2F2F7`) — dunkler wählen, Test entscheidet | `#8E8E93` | HAPulse nutzt `--text-faint` für kleine Texte; klassisch hat es nur 2,6:1 |
| `--accent` / `--accent-soft` / `--on-accent` | aus `glasAccent` | aus `glasAccent` | Flächen; für Text-Links in Glas-CSS `--g-accent-ink` |
| `--positive` / `--danger` / `--warning` / `--info` (+ `-soft`) | iOS grün/rot/gelb/blau, Text-Stellen über `--g-*-ink` | iOS dunkel-Varianten | |
| `--border` / `--line` | `transparent` / `rgba(60,60,67,.18)` | `transparent` / `rgba(84,84,88,.55)` | Karten ohne Rand |
| `--shadow-card` | `none` bzw. sehr weich | `none` | |

Zusätzliche Glas-Tokens (`--g-…`): `glass-tint`, `glass-fill`, `glass-filter`, `glass-rim`, `glass-shadow` (Rezept
SPEC3 §1, Werte aus der Skizze `.g5-glass`), `glass-clear-*` (über Video), `sheet-fill`, `sheet-filter`, `grabber`,
`scrim`, `state-light` (gelb), `state-heat` (orange), `state-cool` (blau), `state-pool` (türkis), `state-ok`
(grün), `state-alarm` (rot), jeweils `-ink`/`-soft`, `switch-on`, `lens`, `seg`, `seg-shadow`, `toast-bg`,
`chart-bar`, `chart-solar`, `focus`.

**Feste Zustandsfarben (SPEC4 Punkt 12):** Licht an = gelb, Heizen = orange, Kühlen = blau, Pool = türkis, OK = grün,
Alarm = rot — unabhängig vom Akzent. Der Akzent nur für Auswahl/Primäraktion. Schalter immer iOS-grün.

### 1.4 Wo das Glas-CSS liegt

Neuer Ordner `apps/dashboard/src/styles/glas/` — **ein** Einstieg `index.css`, der alle Teile importiert:

| Datei | Inhalt |
|---|---|
| `base.css` | Systemschrift, Typo-Skala (iOS: Large Title 34, Title1 28, Title2 22, Title3 20, Headline 17/600, Body 17, Callout 16, Subhead 15, Footnote 13, Caption 12), `tabular-nums` für Daten, Radien (konzentrisch), Abstände 8-pt-Raster, Fokusring |
| `material.css` | Glas-Rezept als Klassen/Mixins: `.g-glass` (regulär), `.g-glass--clear` (über Medien), Rand (`::before` mit Maske, `-webkit-mask-composite: xor`), Linsen-Glanz, Druck-„Flex“ mit Lichtpunkt (`--gx/--gy`), Stärke-Varianten über `[data-glass]`, `@supports not (backdrop-filter: blur(1px))` → deckend |
| `motion.css` | Federkurven, Keyframes (materialize, rise, morph), `@supports not (transition-timing-function: linear(0, 1))` → `cubic-bezier`-Ersatz, `prefers-reduced-motion` → 200-ms-Überblendungen |
| `shell.css` | Seitenleiste, Kopf-Kapseln, Tab-Leiste (inkl. minimiert), Mehr-/Räume-Sheet, Scroll-Kante, Banner, Toasts |
| `sheets.css` | `.modal-*` in Glas: Sheet mit Grabber, Detents, Dialog (Desktop), Inspector, gestapelte Seiten |
| `cards.css` | Karten randlos/deckend, **Kartentitel über der Fläche** (Technik §2.13), Kacheln, Zeilen, Schalter, Segmente, Stepper |
| `home.css`, `pages/*.css` | seiten-/kartenspezifische Anpassungen (Klassennamen der Upstream-Komponenten) |
| `edit.css` | Bearbeiten-Modus (S/M/L, Badges, kein Wackeln) |
| `nvr.css` | HAPulse-NVR-Modul (`nvr/**`) + Werte für die Paket-Hooks (§4) |

Regeln:
- **Jeder Selektor beginnt mit `:root[data-style='glas']`** — Klassisch bleibt Byte-für-Byte gleich. Kein `@layer`
  (ungeschichtetes Upstream-CSS würde jede Schicht schlagen), kein `!important` außer für Bewegungs-Abschaltung.
- Nur Tokens (`var(--…)`), **keine Hex-Werte** in CSS — Werte kommen aus `glasTokens.ts`.
- Import **einmal** in `apps/dashboard/src/app/glas/GlasRuntime.tsx` (`import '../../styles/glas/index.css'`). So
  landet es in beiden Einstiegen (eigene App und SaaS-Host über `DashboardApp`), ohne `global.css` (Upstream) oder
  `main.tsx` dafür anzufassen.
- Systemschrift nur in Glas: `--font-display/--font-body/--font-data: -apple-system, BlinkMacSystemFont, "SF Pro Text",
  system-ui, "Segoe UI", Roboto, sans-serif` und `font-variant-numeric: tabular-nums` für Daten. Die Fontsource-Dateien
  werden von Browsern nur geladen, wenn eine Schrift tatsächlich benutzt wird → in Glas kein Download.
- Die Körnung im Dunkelmodus (`body::after`) in Glas aus.

### 1.5 Laufzeit-Helfer: `apps/dashboard/src/app/glas/`

| Datei | Zweck |
|---|---|
| `useUiStyle.ts` | `useUiStyle()`, `useIsGlas()` (aus dem Settings-Store, `effectiveStyle`), `isGlasNow()` (liest `data-style`, für Nicht-React-Code) |
| `GlasRuntime.tsx` | **einmal** in `AppLayout` gemountet (`// [fork]`), rendert in Klassisch `null`. Installiert: Scroll-Beobachter (rAF, passiv) → `data-tabs-min` auf `:root` + `--g-scroll` (Titel-Kollaps); Ursprungs-Rechteck des letzten Drucks (Capture-`pointerdown`, für Morph-Sheets); `prefers-contrast`/`prefers-reduced-transparency` (Chromium) als Attribute; die kleine Scroll-Kanten-Titelleiste (§2.7) |
| `navGroups.ts` | Zuordnung Nav-ID → Gruppe (Zuhause / Bereiche / System), unbekannte IDs → Bereiche; `groupNav(orderedIds)` behält die Nutzer-Reihenfolge innerhalb der Gruppe |
| `originRect.ts` | `rememberPress(e)`, `takeOrigin(): DOMRect \| null` (max. 1 s alt, Element noch im DOM) |

### 1.6 Palette, Akzent, Modus, Stärke, Kontrast — wie es zusammenpasst

| Eingang | Wirkung in Glas |
|---|---|
| `theme` (Farbwelt) | **ignoriert** (Glas = eine neutrale Palette). Wert bleibt gespeichert für Klassisch. In den Einstellungen sind die Farbwelt-Karten in Glas ausgeblendet mit Hinweis „Im Stil Glas gilt eine neutrale Farbpalette“. |
| `accentHue` | → `glasAccent(hue)`; ohne Hue iOS-Orange. Akzent-Regler bleibt sichtbar. |
| `mode` + `modeOverride` | hell = iOS-Hell, dunkel = **reines Schwarz** + `#1C1C1E`/`#2C2C2E`-Flächen |
| `glassStrength` | `data-glass` → `--g-glass-tint` .25 (klar) / .75 (getönt) / deckend (Füllung = `--bg-raised`, kein Blur, deutlichere Trennlinien, `--text-dim` dunkler) |
| `reduceTransparency` (Gerät) | wie deckend, zusätzlich keine Blur-Ebenen im Hintergrund (Scrim ohne Blur) |
| `prefers-contrast: more` | deckende Füllungen, Trennlinien `sep-strong`, `--text-dim` → `--text`-nah, Rand an Kapseln 1 px |
| `forced-colors: active` | kein Glas, Systemfarben, Ränder sichtbar |
| `prefers-reduced-motion` | alle Federn/Morphs → 200-ms-Überblendung, kein Skalieren, kein Federn, Tab-Leiste minimiert ohne Animation |

---

## 2. Verhalten: neue Bausteine oder nur CSS

Leitregel: **CSS zuerst.** Eine eigene Komponente nur, wenn Verhalten (Gesten, Stapel, Morph) oder Markup fehlt. Neue
Bausteine liegen unter `apps/dashboard/src/components/glas/**` bzw. `app/glas/**` (neue Dateien = keine
Merge-Konflikte). Eingriffe in Upstream-Dateien sind kurz und mit `// [fork]` markiert. Jeder Baustein **degradiert in
Klassisch zu exakt dem heutigen Verhalten** (No-op-Hook bzw. Durchreichen der Kinder).

Übersicht:

| # | Verhalten | Art | Andockpunkt | Klassisch |
|---|---|---|---|---|
| 2.1 | Sheets mit Detents, Ziehen, Morph; Desktop-Dialog | eigener Hook + CSS (Entscheidung E7) | `components/ui/Modal.tsx` | unverändert |
| 2.2 | Gestapelte Dialoge / Bestätigung im Sheet | Teil von 2.1 | `Modal.tsx` (Stapel) | eigenes Modal wie heute |
| 2.3 | Inspector (Desktop/iPad) | Präsentation von 2.1 | `EntityDetailModal.tsx` | Modal wie heute |
| 2.4 | Kontextmenü bei Langdruck | neue Komponente | `cards/EntityCard.tsx` | Langdruck → Detail |
| 2.5 | Wisch-Aktionen | neue Komponente | Zeilen in Licht/Schloss/Garage/Mitteilungen | Durchreichen |
| 2.6 | Avatar-Menü (Handy) | neue Komponente | `ui/PageHeaderActions.tsx` | Glocke + Avatar + Stift |
| 2.7 | Großer Titel klappt ein, Scroll-Kante | Laufzeit + CSS | `GlasRuntime` | nichts |
| 2.8 | Tab-Leiste minimiert beim Scrollen | Laufzeit + CSS | `GlasRuntime` + `.app-tabs` | nichts |
| 2.9 | Gruppierte Seitenleiste | Markup-Ergänzung | `AppLayout.tsx` | flache Liste |
| 2.10 | Kopf-Kapseln Desktop (Mitteilungen \| Bearbeiten \| Avatar) | CSS + 1 Zeile | `AppLayout.tsx` `HeaderCluster` | wie heute |
| 2.11 | Hinweise-Bereich | **neue Home-Sektion + Core-Logik** | `pages/Home.tsx` | siehe E3 |
| 2.12 | Aktive Szene | Core-Logik + Attribut | `home/ScenesCard.tsx` | siehe E3 |
| 2.13 | Kartentitel über der Fläche | nur CSS | `cards.css` | nichts |
| 2.14 | Energie Netz/Solar | Glas-Variante der Balken | `home/EnergyWidget.tsx` | siehe E9 |
| 2.15 | Licht-Detail mit senkrechtem Regler | neue Komponente | `EntityDetailModal.tsx` | `LightCard` wie heute |
| 2.16 | Größen S/M/L im Bearbeiten-Modus | neue Komponente | Seiten mit Spans/Höhen | Span-Punkte + Griffe |
| 2.17 | Geräte-Zeilen (Tipp → Detail) | 1 Zeile | `home/DevicesCard.tsx` | nur Schalter |
| 2.18 | Wetterzeile unter der Begrüßung (Handy) | neue Mini-Komponente | `home/GreetingBlock.tsx` | Untertitel wie heute |

### 2.1 Sheets (Handy) und Glas-Dialog (Desktop)

**Ziel (SPEC4 Punkt 7):** alle Modals am Handy als iOS-Sheet (eingerückt, gerundet, Grabber, Detents mittel/groß,
nach unten wischen schließt, wächst aus dem angetippten Element). Desktop: zentrierter Glas-Dialog, wächst aus dem
Element. Schließen läuft rückwärts in das Element.

**Entscheidung eigene Komponente vs. Base UI Drawer (E7) — Rechercheergebnis:**

| | Eigenbau auf `Modal.tsx` | Base UI `Drawer` (`@base-ui/react` 1.8.0) | Vaul |
|---|---|---|---|
| Lizenz | — | MIT (passt zu HAPulse MIT) | MIT |
| Pflege | eigene | aktiv (MUI-Team) | **nicht gepflegt** (letzte Version 1.1.2, Dez. 2024) |
| Funktionen | Detents, Ziehen am Grabber, Morph, Stapel — genau das Nötige | Snap-Points, Wischrichtung, Swipe-Area, „Indent“-Hintergrund | — |
| Bundle (gemessen, esbuild min+gzip, React extern) | ca. 4–6 kB | **≈ 38 kB** (Drawer allein), ≈ 70 kB mit `ContextMenu` + `Menu` | — |
| Umbau der 25 Modal-Nutzer | keiner (Hook in `Modal`) | jeder Aufrufer oder ein Adapter um `Modal` | — |
| Morph aus Ursprungsrechteck | selbst | selbst (nicht eingebaut) | — |

**Empfehlung: Eigenbau** in `Modal.tsx`, weil (a) `Modal` schon Portal, Esc, Fokus, Scroll-Sperre hat, (b) alle 25
Aufrufer (Chip-Modals, Bestätigungen, Detail, Pool, NVR-Datum, Einstellungen …) ohne Änderung Sheets werden, (c) der
Morph sowieso selbst gebaut werden muss, (d) Klassisch nicht 38 kB mehr laden soll. Base UI bleibt Rückfalloption,
falls die Gestenphysik nicht befriedigt — dann **nur im Glas-Pfad dynamisch importieren**.

Neue Dateien `apps/dashboard/src/components/glas/sheet/`:

| Datei | Inhalt |
|---|---|
| `sheetMath.ts` | rein, getestet: `pickDetent(contentH, viewportH)`, `snapAfterDrag(offset, velocity, detents)` → `'medium' \| 'large' \| 'close'` (Schwelle 25 % oder > 0,8 px/ms), `morphTransform(origin, target)` (translate/scale), Rubber-Band über `large` |
| `usePresence.ts` | `usePresence(open, exitMs)` → bleibt nach `open=false` noch `exitMs` gemountet (Exit-Animation); Klassisch `exitMs = 0` |
| `useSheetBehaviour.ts` | `useSheetBehaviour(panelRef, { open, onClose, isGlas })`: setzt `data-detent`, `--g-morph-*` aus `takeOrigin()`, Pointer-Ziehen am Grabber/Kopf (`touch-action: none`, `setPointerCapture`), Tastatur: keine neuen globalen Keydown-Handler (Esc macht `Modal` schon) |
| `sheetStack.ts` | Modul-Stapel offener Modals: `push(id)/pop(id)/depth(id)`; das obere wird in Glas als **Seite im Sheet** gezeigt (siehe 2.2) |
| `SheetGrabber.tsx` | Grabber (36×5 px, `aria-hidden`), nur in Glas |

`[fork]`-Änderungen in `components/ui/Modal.tsx` (ca. 8 Zeilen, Struktur bleibt):
1. `const glas = useIsGlas();`
2. `const present = usePresence(open, glas ? 420 : 0);` und `if (!open) return null` → `if (!present) return null`
   (Panel bekommt `data-state="open|closing"`).
3. `useSheetBehaviour(panelRef, { open, onClose, isGlas: glas })`.
4. `{glas && <SheetGrabber />}` als erstes Kind des Panels.
5. Optionale Prop `presentation?: 'auto' | 'inspector'` (nur von 2.3 genutzt).
6. Prop `swipeToClose?: boolean` (Standard `true`; z. B. Alarm-Ziffernblock `false`, damit Eingaben nicht verloren gehen).

Details:
- **Detents:** mittel = `min(62dvh, Inhalt)`, groß = oben `max(env(safe-area-inset-top), 10px)` Abstand. Start:
  passt der Inhalt in „mittel“ → mittel, sonst groß. Ziehen nur am Grabber/Kopf; der Inhalt scrollt normal (kein
  Konflikt mit Listen). Detent-Wechsel animiert Höhe/Einzug/Radius (einzige erlaubte Höhen-Animation).
- **Morph:** Ursprung = Rechteck des zuletzt gedrückten Elements (`GlasRuntime` merkt sich `closest('button, a,
  [role=button], .card, [data-morph-origin]')`). FLIP mit `transform` + `border-radius 22 → 38 px` über
  `--g-spring-smooth`. Kein Ursprung oder `prefers-reduced-motion` → normales Hochfahren bzw. Überblenden.
- **Desktop ≥ 900 px:** zentrierter Glas-Dialog (Material `sheet-fill`), Morph aus dem Element, kein Grabber.
- **Hintergrund:** Scrim `--g-scrim`; in „Transparenz reduzieren“ ohne Blur.
- **Barrierefreiheit:** `role="dialog"`, `aria-modal`, Fokus wie heute (`data-autofocus`), Grabber `aria-hidden`,
  Schließen-Knopf bleibt (Wischen ist nie der einzige Weg).

### 2.2 Gestapelte Dialoge = Bestätigung im Sheet (SPEC4 Punkt 10)

Heute öffnen `GarageConfirm`, `LockConfirm`, `PumpManualModal`, der Alarm-Ziffernblock u. a. ein **zweites** Modal
über dem ersten. In Glas rendert `Modal` ein Modal mit `depth > 0` als **in das obere Sheet geschobene Seite**
(von rechts hinein, gleicher Detent, „‹ Zurück“ statt ×, Esc schließt nur die oberste). Damit erscheinen
„Garage öffnen?“, „Entriegeln?“ mit Code-Feld usw. **im Sheet**, ohne einen einzigen Aufrufer zu ändern.
Reihenfolge-Regeln (Öffnen fragt immer, Schließen sofort; Entriegeln fragt immer, Verriegeln nur bei Code) bleiben,
weil sie in `useGarageAction`/`LockConfirm` liegen.

Ausnahme: `AlarmPanelCard` portalt seinen Ziffernblock selbst (`ReactDOM.createPortal`, kein `Modal`) → in Glas per CSS
als Sheet-Seite gestalten; prüfen, ob ein `[fork]`-Wechsel auf `Modal` sinnvoller ist (dann Stapel gratis).

### 2.3 Inspector (Desktop/iPad, SPEC4 Punkt 17)

`EntityDetailModal` übergibt `presentation="inspector"` (`// [fork]`). In Glas und Viewport **≥ 1100 px** rendert
`Modal` dann statt des Dialogs ein rechtes Glas-Panel (≈ 420 px, gleitet ein): **nicht modal** (`aria-modal="false"`,
kein Scrim, keine Scroll-Sperre), Übersicht bleibt bedienbar; `:root[data-inspector]` gibt `.app-content` rechts
Platz (`padding-inline-end`). Esc schließt, Fokus geht ins Panel und beim Schließen zurück. Ein Klick auf eine andere
Kachel tauscht den Inhalt (der globale Host `uiStore.detailEntityId` bleibt). 900–1099 px: Glas-Dialog; < 900 px:
Sheet. Klassisch: unverändert Modal.

Inhalt bleibt komplett (Inventar F): Kopf, Zustand, „zuletzt geändert“, Favoriten-Stern (verwaltet), eingebettete
Steuerkarte, Kamera-Hinweis bei Sentinel, Verlauf mit **24H/7D/30D** (in Glas als Segment mit gleitender Linse),
Wert-Diagramm/Zeitleiste, Achsen, Logbuch nach Tagen mit „Mehr anzeigen“, Gruppen-Mitglieder, Attribute aufklappbar,
Lade-/Leerzustände.

### 2.4 Kontextmenü bei Langdruck (SPEC4 Punkt 14)

- Neue Dateien: `stores/glasUiStore.ts` (`contextMenu: { entityId, rect } | null`, `openContextMenu`,
  `closeContextMenu`), `components/glas/ContextMenu.tsx` (+ `.css`): angehobene Vorschau der Kachel (Klon des Rechtecks
  als Bild der Karte via CSS-`transform` auf einem Platzhalter, kein DOM-Klon nötig: gedimmter Hintergrund + Glas-Menü
  am Rechteck ausgerichtet), Aktionen **Details**, **Zu/Aus Favoriten**, **Raum öffnen**, **Ausblenden** (nur wer
  bearbeiten darf, `useCanEdit`), plus entitätsspezifisch (**Ausschalten**/**Einschalten**, bei Schloss/Garage **nie**
  Entriegeln/Öffnen ohne Bestätigung → führt in deren Bestätigung).
- Rolle `menu`, Pfeiltasten, Esc, Fokus zurück; Rechtsklick (Desktop) öffnet dasselbe Menü.
- Andockpunkt `components/cards/EntityCard.tsx` (`// [fork]`): Langdruck-Callback
  `glas ? openContextMenu(id, rect) : openEntityDetail(id)`. Tipp auf **reine Anzeige-Karten** öffnet weiterhin direkt
  das Detail (wie HAPulse). Gemountet einmal in `GlasRuntime`.
- Weitere Langdruck-Quellen (`FavoritesStrip`, Geräte-Zeilen der Home-Karte) in Etappe 4 nachziehen.

### 2.5 Wisch-Aktionen (SPEC4 Punkt 15)

`components/glas/SwipeRow.tsx`: horizontales Ziehen (Pointer Events, `touch-action: pan-y`), Schwelle 72 px, enthüllt
eine Aktion rechts; langes Durchziehen löst sie aus. In Klassisch gibt `SwipeRow` nur `children` zurück → Aufrufer
können **immer** umhüllen (kleinster Eingriff).

| Liste | Datei | Aktion | Bemerkung |
|---|---|---|---|
| Mitteilungen | `notifications/NotificationsPanel.tsx` | Verwerfen | × bleibt |
| Licht-Sheet | `home/chipmodals/LightsModal.tsx` | Aus | Zeilen-Tipp toggelt weiter |
| Schlösser | `security/LocksList.tsx` (über `LocksModal`) | Verriegeln | Entriegeln **nie** per Wischen |
| Garage | `garage/GarageList.tsx` (über `GarageModal`) | Schließen | Öffnen **nie** per Wischen |

Jede Wisch-Aktion hat einen sichtbaren Knopf-Zwilling in der Zeile (Barrierefreiheit, Desktop).

### 2.6 Avatar-Menü am Handy (SPEC5 Änderung 1)

`components/glas/AvatarMenu.tsx`: oben rechts nur der Avatar (40 px Glas-Kreis) mit rotem Punkt, wenn Mitteilungen da
sind. Tipp → Glas-Menü morpht aus dem Avatar: **Mitteilungen (n)** → Mitteilungs-Sheet, **Bearbeiten** (nur wer darf;
während des Bearbeitens wird der Avatar zur Kapsel **Fertig**), **Einstellungen** (bzw. das vom SaaS-Host injizierte
Kontomenü aus `UserMenuContext` — bleibt erhalten).

Andockpunkte (`// [fork]`):
- `components/ui/PageHeaderActions.tsx`: in Glas < 900 px `<AvatarMenu editToggle={children} />` statt Glocke/Avatar/Stift.
- `components/notifications/NotificationsPanel.tsx`: `useNotifications` und die Zeilen/den Listenrumpf **exportieren**,
  damit das Glas-Sheet dieselbe Logik nutzt (Abo, Verwerfen, „Alle verwerfen“, Leerzustand).

### 2.7 Großer Titel klappt ein, Scroll-Kante

`GlasRuntime` setzt bei Fenster-Scroll `--g-scroll` (0…1 über 0–60 px, gerundet, nur bei Änderung). CSS: `.page__title`
und `.greeting__title` skalieren/blenden aus; eine fixierte **Scroll-Kanten-Zone** (weicher Blur-Verlauf, keine harte
Leiste) blendet ein, mit kleinem zentriertem Titel. Den Titeltext liest `GlasRuntime` aus dem ersten `main h1`
(`aria-hidden` in der Kante, das `h1` bleibt die Überschrift) — **keine Seite muss geändert werden**. Nur Handy.
Kein `animation-timeline` (Safari-Lücke), JS + rAF.

### 2.8 Tab-Leiste minimiert beim Scrollen

Gleiche Laufzeit: Scroll nach unten > 24 px → `:root[data-tabs-min]`; nach oben oder Seitenende/-anfang → weg.
Überschwingen (iOS-Gummiband, negative `scrollY`) ignorieren. CSS: schwebende Glas-Kapsel (`.app-tabs`) schrumpft auf
das aktive Symbol (Beschriftungen blenden zuerst aus), Linse gleitet bei Tab-Wechsel mit `--g-spring-snappy`.
**Kein Markup-Eingriff** in `AppLayout` nötig. Inhalt der Leiste bleibt: erste vier sichtbaren Nav-Einträge in
Nutzer-Reihenfolge + Mehr; „Räume“ öffnet weiter `RoomsMenu` (Sheet), „Mehr“ das Mehr-Menü (in Glas als Sheet
gestaltet, `app-more-menu` per CSS).

### 2.9 Gruppierte Seitenleiste (SPEC4 Punkt 3)

`app/glas/navGroups.ts` + `// [fork]` in `AppLayout.tsx` `renderSidebarItem`-Schleife: in Glas und **nicht** im
Bearbeiten-Modus Gruppenüberschriften (Zuhause: Übersicht, Räume, Szenen, Automationen · Bereiche: NVR, Pool,
Sicherheit, Energie, Musik, Geräte · System: System, Einstellungen) einfügen; Reihenfolge innerhalb der Gruppe =
Nutzer-Reihenfolge, ausgeblendete bleiben weg. Im Bearbeiten-Modus flache Liste wie heute (Ziehen, Auge). Logo,
App-Name, Status-Pille (echte Zustände), Einklappen zur Leiste (Feder) bleiben. Seitenleiste als schwebendes Glas-Panel
(CSS).

### 2.10 Kopf-Kapseln Desktop (SPEC4 Punkt 13)

`HeaderCluster` bleibt: Chips links (auf **jeder** Seite), rechts Wetter-Pille, Mitteilungen, Bearbeiten, Avatar —
in Glas als getrennte Glas-Kapseln. `// [fork]`: Bearbeiten-Kapsel in Glas auf allen Seiten mit Bearbeiten-Modus
(Liste `EDITABLE_ROUTES` in `app/glas/`), die seiteneigenen `EditToggle` dann per CSS in Glas ausblenden. `EditToggle`
bekommt optional `variant="label"` (`// [fork]`) für „Bearbeiten“/„Fertig“ als Text.

### 2.11 Hinweise (neue Home-Sektion, SPEC4 Punkt 5)

**Datenlogik DOM-frei:** `packages/core/src/hints.ts`

```ts
export type HintKind = 'alarm-triggered' | 'leak' | 'smoke' | 'garage-open' | 'garage-unreachable' | 'lock-open'
  | 'lock-fault' | 'window-open' | 'door-open' | 'alarm-pending' | 'nvr-offline' | 'waste-soon';
export interface Hint { id: string; kind: HintKind; severity: 'critical' | 'warning' | 'info'; count: number;
  entityIds: string[]; areaIds: string[]; at?: number /* Abholtag etc. */ }
export interface HintInput { garage: GarageSummary; locks: LockSummaryLike; openWindows: Opened[]; openDoors: Opened[];
  alarm?: AlarmLike; leaks: string[]; smoke: string[]; waste: WasteBin[]; nvrOfflineRecording: number; now: number;
  doorOpenMinutes: number /* Standard 10 */ }
export function collectHints(input: HintInput): Hint[]   // sortiert: critical > warning > info, dann Anzahl
```

Was ein Hinweis ist — nur **Abweichungen vom Normalzustand** (Vorschlag, Bestätigung E4):

| Art | Bedingung | Schwere | Ziel beim Tippen |
|---|---|---|---|
| Alarm ausgelöst | `triggered` | critical | Alarm-Sheet |
| Wasser / Rauch / CO | `binary_sensor` moisture/smoke/gas/co an | critical | Detail des Sensors |
| Garagentor offen | `garageSummary` offen > 0 | critical | Garage-Sheet („Tippen zum Schließen“) |
| Schloss entriegelt | Schloss-Regel offen > 0 | critical | Schlösser-Sheet („Tippen zum Verriegeln“) |
| Schloss/Tor Störung | `jammed`/`unavailable` | warning | jeweiliges Sheet |
| Fenster offen | Fenster offen (mit Raumnamen „Küche, Bad“) | warning | Türen/Fenster-Sheet |
| Tür offen | länger als `doorOpenMinutes` offen | warning | Türen/Fenster-Sheet |
| Alarm wird scharf / ausstehend | `arming`/`pending` | warning | Alarm-Sheet |
| Kamera offline | Sentinel: aufnehmende Kamera offline | warning | `/nvr` |
| Müll | Abholung heute/morgen („heute Abend rausstellen“) | info | Tonnen-Sheet |

Regeln: respektiert `customization.hiddenEntities`; dieselben Zählregeln wie Chips/Sicherheitskarte (wiederverwenden,
nicht nachbauen). Die Schloss-Regel liegt heute im Dashboard (`components/security/lockLogic.ts`, Fork-Datei) → den
reinen Teil nach Core verschieben (`packages/core/src/locks.ts`) und aus `lockLogic.ts` re-exportieren, oder als fertige
Zusammenfassung übergeben (Variante wählen, keine Duplikate).

**Dashboard:**
- `components/home/useHints.ts` sammelt die Eingaben aus vorhandenen Selektoren/Hooks (Garage, Schlösser, Türen/Fenster
  wie `SummaryChipsBar`, `detectWasteBins`, NVR-Store) und ruft `collectHints`.
- `components/home/HintsCard.tsx` (+ `.css`): Liste (Handy, Glas-3-Zeilen mit Chevron) bzw. Kapselreihe (Desktop
  „Hinweise [2 Fenster offen ›] [Restmüll morgen ›]“); öffnet die vorhandenen Modals (`GarageModal`, `LocksModal`,
  `DoorsModal`, `AlarmModal`, `WasteBinModal`) mit eigenem `open`-State — kein Eingriff in die Chips nötig.
  Symbole monochrom (`--text-dim`), Farbe nur für echte Zustände (SPEC5 Punkt 4).
- `pages/Home.tsx` (`// [fork]` wie `'waste'`): Sektion `'hints'` in `SECTION_IDS` (an erster Stelle), Toggle-Keys,
  Gate „nur wenn Hinweise da“ (leer = **keine** Karte), `renderWidget`. Standard-Span: volle Breite.
- Migration wie `wasteSectionMigrated`: Marker `hintsSectionMigrated` (GLOBAL, in `KNOWN_GLOBAL`), setzt `'hints'` in
  gespeicherte Reihenfolgen **an den Anfang** (`lib/defaultSlot.ts`).
- Reihenfolge am Handy in Glas: Begrüßung → Wetterzeile → Chips → Hinweise → Rest (per CSS-`order`; Klassisch: Chips
  oben wie heute).
- i18n: `hints.*` (mit Plural `.one/.other`) + `home.section.*.hints` in **allen sieben** Locales.
- Demo: `packages/core/src/demo.ts` (schon `[fork]`) ggf. um ein offenes Fenster + Müll-Sensor ergänzen, damit Demo und
  Screenshots einen Hinweis zeigen.

### 2.12 Aktive Szene (SPEC4 Punkt 6)

`packages/core/src/activeScene.ts`:

```ts
export function activeSceneIds(scenes: HassEntity[], states: Record<string, HassEntity>, now: number,
  opts?: { graceMs?: number /* 15 000 */; maxAgeMs?: number /* 12 h */ }): Set<string>
```

Heuristik (HA kennt keinen „aktiv“-Zustand; `scene.*`-Zustand = Zeitstempel der letzten Aktivierung): eine Szene gilt
als aktiv, wenn (1) sie aktiviert wurde und nicht älter als `maxAgeMs` ist, (2) sie unter den Szenen mit
überlappenden Mitgliedern die zuletzt aktivierte ist, (3) sie eine Mitgliederliste hat (`attributes.entity_id`) und
**kein Mitglied** seitdem geändert wurde (`last_updated` ≤ Aktivierung + `graceMs`, nicht `unavailable`). Szenen ohne
Mitgliederliste (manche Integrations-Szenen) sind nie „aktiv“. Grenzen dokumentieren, Tests in `smoke.mjs`.

UI: `home/ScenesCard.tsx` (`// [fork]`): `data-active` am Kachel-Knopf + Untertitel („Aktiv“ bzw. „5 Geräte“ aus
der Mitgliederzahl). Glas: volle Farbe + Ring, Ring-Sweep beim Aktivieren. Szenen-Symbole mit Ink-Farben ≥ 3:1
(SPEC5 Punkt 5). Klassisch: siehe E3.

### 2.13 Kartentitel über der Fläche (nur CSS)

Jede Home-Karte hat ihren eigenen Kopf (`.scenes-card__header`, `.security-card__header`, `.climate-card__header`, …)
**innerhalb** der Karte. Ohne Markup-Umbau: In Glas wird die `.card`-Fläche transparent, die Fläche malt ein
`::before` ab `top: var(--g-card-head)` (Kopfhöhe fest 44 px in Glas) mit Radius und `--bg-card`, `isolation:
isolate`. Der Kopf steht damit optisch auf dem Seitenhintergrund (Title3 + „Alle ›“ rechts in `--g-accent-ink`).
Höhendeckel-Karten (`.card-scroll-body`) prüfen. Karten ohne Kopf: `--g-card-head: 0`. Pro Karte im Screenshot
abnehmen; wo der Kopf nicht direktes Kind ist, eine `// [fork]`-Klasse ergänzen.

### 2.14 Energie (Netz/Solar)

Daten sind da: `useEnergy('today')` liefert je Stunde `gridConsumed` und `solar` (`EnergyWidget.tsx` summiert sie heute
zu einem Balken). Glas: zwei große Zahlen (Verbrauch, PV-Ertrag) + gestapelte Balken (Netz neutralgrau
`--g-chart-bar`, Solar gelb `--g-state-light`) + kleine Legende. Umsetzung als `components/glas/home/EnergyBars.tsx`,
in `EnergyWidget.tsx` per `// [fork]` `glas ? <EnergyBars …/> : <bestehende Balken/>`. Vorher prüfen, ob `solar` die
Erzeugung oder den Eigenverbrauch meint (Summe = „PV-Ertrag“ nur bei Erzeugung). „Nicht eingerichtet“-Karte bleibt.

### 2.15 Licht-Detail mit senkrechtem Regler (SPEC4 Punkt 8)

`components/glas/LightBrightnessControl.tsx`: großer senkrechter Control-Center-Regler (Fülle gelb, Prozent mit
rollenden Ziffern, `role="slider"`, Pfeiltasten/Bild-auf/ab, `aria-valuetext`), Knopf „Ein-/Ausschalten“, „Eingeschaltet
seit …“. Senden über `useCommitRange` (lokal beim Ziehen, senden beim Loslassen — vorhandene Fork-Regel). In
`EntityDetailModal.tsx` (`// [fork]`) bei `glas && domain === 'light'` oben einsetzen; der Helligkeitsregler der
eingebetteten `LightCard` wird in Glas per CSS ausgeblendet, **Farbtemperatur und Farbton bleiben sichtbar**.

### 2.16 Größen S/M/L im Bearbeiten-Modus (SPEC4 Punkt 16)

`components/glas/SizePicker.tsx` (Segment S/M/L) + `components/glas/SizeFineTuneSheet.tsx` („⋯ Anpassen“: die
klassischen Werte Spalten 1–4 und Höhendeckel aus/180/280/400/560).

| Glas | schreibt | Anmerkung |
|---|---|---|
| S | Span 1, Höhe 0 | |
| M | Span 2, Höhe 0 | |
| L | Span 2 + „höher“ | siehe E6 (neues Feld `tallSections` oder Verzicht) |
| ⋯ | beliebige Span/Höhe | **damit geht nichts verloren** (3/4 Spalten, Deckel mit Innen-Scroll) |

Passt der gespeicherte Wert zu keinem Preset, zeigt das Segment nichts gewählt („Eigene“). Andockpunkte: Bearbeiten-
Overlays in `Home.tsx`, `Security.tsx`, `Energy.tsx`, `Automations.tsx`, `Scenes.tsx`, `System.tsx` (`// [fork]` je eine
Zeile; die klassischen `SpanDots`/`ResizeHandle`/`HeightDots`/`HeightHandle` bleiben im DOM und werden in Glas per CSS
ausgeblendet). Augen-, Handy-Ausblenden-, Stern-Badges, Ziehen zum Sortieren, Chip- und Nav-Bearbeitung bleiben. Kein
Wackeln (User-Entscheid). Musik hat nur Ausblenden → unverändert.

### 2.17 Geräte-Karte

Glas-3-Zeilen (Desktop: Liste mit iOS-Schaltern; Handy: Glas-3-Darstellung). `// [fork]` in `DevicesCard.tsx`: in Glas
Zeilen-Tipp → `openEntityDetail`, Schalter → toggle (Klick am Schalter stoppt die Weitergabe). Klassisch unverändert.

### 2.18 Wetterzeile (Handy)

`components/glas/WeatherLine.tsx`: „☀ 14 °C · teilweise bewölkt ›“ in `--text-dim`, Tipp → `WeatherModal` (Stats,
Stunden/Tage, Entity-Wahl für Bearbeiter bleiben). `GreetingBlock.tsx` (`// [fork]`) rendert sie in Glas < 900 px statt
des Untertitels; Desktop behält Untertitel + Wetter-Pille im Kopf. Zahlen über `formatNumber`.

### 2.19 Was **nur CSS** ist (kein neuer Baustein)

Chips (Kapseln ohne getönte Kreise, Farbe nur am Symbol), alle Karten-Looks (Szenen, Hauptraum, Klima-Bogen, Rollläden,
Sicherheit, Müll, NVR-Karte, Aktivität, Räume), Schalter iOS-grün, Segmente mit Linse, Stepper, Toasts, Verbindungs-
Banner, „Was ist neu“, Einstellungen, Onboarding (nur Tokens), Seitenleiste/Status-Pille, Druck-Feedback, Seiteneintritt
(`.stagger-rise` in Glas mit Feder, max. 6 Stufen), Raumkacheln mit Status-Symbol-Override.

---

## 3. Etappen

Jede Etappe = **ein Branch + ein PR** (`claude/glas-etappe-<n>-…`), CI grün, Screenshots angehängt, `CHANGELOG`-Eintrag
(§6), `docs/SYNC.md`-Inventar aktualisiert (neue Dateien, neue `[fork]`-Stellen). Vor jedem Push:
`npm run typecheck && npm run build && npm test -w @hapulse/core` (+ `npm test -w @hapulse/dashboard`, `npm run lint`).

Bis zur letzten Etappe heißt die Option **„Glas (Vorschau)“** (siehe E11).

### Etappe 0 — Vorbereitung (kein Nutzer-Effekt)

- Skizzen/Screenshots/Inventar liegen in `docs/glas/` (vom Auftraggeber kopiert); `docs/GLAS-DESIGN.md` lesen.
- **Referenz-Screenshots Klassisch** aller Seiten (Handy 390×844, Desktop 1440×1000, hell+dunkel, Demo-Modus) mit dem
  Probe-Skript aus §5.3 erzeugen und **nicht** einchecken (lokal/Artefakt) — Basis für „Klassisch unverändert“.
- Probe-Skript-Gerüst `apps/dashboard/scripts/glas-shots.cjs` anlegen.

### Etappe 1 — Fundament: Einstellung, Tokens, Schrift

Umfang: §1 komplett. `glasTokens.ts` (+ Tests), `glasAppearance.ts` (+ Tests), Store-Felder + Scope + Migration,
Einstellungen „Stil“ (`components/settings/StyleSettings.tsx`, in `Settings.tsx` per `// [fork]` unter „Darstellung“:
Segment Klassisch | Glas (Vorschau); darunter in Glas „Glas-Stärke: Klar | Getönt | Deckend“, Schalter „Transparenz
reduzieren (dieses Gerät)“, „Stil auf diesem Gerät: Wie alle | Klassisch | Glas“ analog `DeviceModeRow`; Farbwelt-Karten
in Glas ausgeblendet mit Hinweis), `styles/glas/base.css`, `material.css`, `motion.css`, `GlasRuntime` (vorerst nur
CSS-Import + Attribute), i18n in 7 Locales.

Abnahme:
- [ ] Klassisch: Screenshot-Vergleich mit Etappe 0 ohne Abweichung (alle Seiten, hell/dunkel, Handy/Desktop).
- [ ] Glas: jede Seite rendert mit iOS-Palette, Systemschrift, reinem Schwarz im Dunkelmodus; kein Blitz beim Neuladen
      (Pre-Paint); OS-Hell/Dunkel-Wechsel in „auto“ behält Glas.
- [ ] Umschalten Glas ↔ Klassisch ohne Reload, ohne Reste (`--g-*` entfernt, Tokens zurück).
- [ ] Verwalteter Modus: Admin stellt Glas ein → zweiter User bekommt Glas; Gerät mit Override bleibt Klassisch;
      `reduceTransparency`/`uiStyleOverride` erscheinen nicht im Export.
- [ ] Kontrast-Test (§5.2) grün; `globalSettings.test.ts` grün.

Nicht verlieren:
- [ ] Hell/Dunkel/Auto + Hell/Dunkel pro Gerät (S4, S5) · Sprache (S6) · Akzent-Regler (S8) · Farbwelten bleiben für
      Klassisch gespeichert (S7) · App-Name/-Symbol/PWA-Icons (S2, S3, V3) · Verwaltet-Hinweis/gesperrte Felder (S9)
      · Export/Import (S14) · „Was ist neu“ (U) · Zahlen sprachabhängig (V7).

### Etappe 2 — Rahmen (Shell) Handy + Desktop

Umfang: 2.6–2.10, 2.18; Seitenleiste als Glas-Panel mit Gruppen, Status-Pille, Einklappen mit Feder; Kopf-Kapseln
Desktop; schwebende Tab-Leiste mit Minimieren; Mehr- und Räume-Menü als Glas-Sheet-Look (sie sind keine `Modal`s →
CSS + Linse); großer Titel/Scroll-Kante; Avatar-Menü + Wetterzeile am Handy; Banner, Toasts, Boot-Ladebildschirm,
Fehlerkarte, Seiten-Platzhalter in Glas.

Abnahme:
- [ ] Handy: Tab-Leiste minimiert beim Runterscrollen, erweitert beim Hochscrollen, kein Zittern beim Gummiband.
- [ ] Desktop: Gruppen-Überschriften, Einklappen zur 72-px-Leiste mit Tooltips, Bearbeiten-Kapsel auf allen
      bearbeitbaren Seiten.
- [ ] ≤ 3 Glasflächen in Ruhe (Seitenleiste/Tab-Leiste, Kopf-Kapseln, ggf. Sheet), kein Glas auf Glas.
- [ ] Tastatur: Tab-Reihenfolge, Fokusring, Esc schließt Räume-/Mehr-Menü und Avatar-Menü, Fokus kehrt zurück.

Nicht verlieren (Inventar A, B17, D8):
- [ ] Logo + Wortmarke (A2) · Einklappen gespeichert pro Gerät (A3) · Nav-Reihenfolge inkl. NVR/Pool-Migration (A4)
- [ ] **Räume = Popover/Sheet, keine Seite** (A5, A6) · Nav-Bearbeiten: Ziehen + Auge, Übersicht/Einstellungen nicht
      ausblendbar (A7) · Status-Pille mit allen Zuständen + Schwellen, versteckt wenn System ausgeblendet (A8)
- [ ] Tab-Leiste: erste vier sichtbare + Mehr; ≤ 5 → alle (A9) · Mehr-Sheet schließt bei Außenklick/Esc/Routenwechsel (A10)
- [ ] Kopf: Zurück auf Raumseiten (A12), Chips auf **jeder** Route (A11, A17), Wetter-Pille → Wetter-Modal (A13)
- [ ] Mitteilungen: Live-Abo, Zähler „9+“, Verwerfen, „Alle verwerfen“, Leerzustand (A14)
- [ ] Avatar: Bild/Initiale; Tipp → Einstellungen bzw. SaaS-Kontomenü (A15) · Handy-Kopfaktionen auf allen Seiten (A16)
- [ ] Verbindungsbanner beide Zustände (A18) · Boot-Laden (A19) · Fehlerkarte (A20) · Chunk-Reload (A21)
- [ ] Toasts: über der Tab-Leiste, max. 3, keine Dubletten, 6 s, × (A24) · „Was ist neu“-Host (A26)

### Etappe 3 — Sheets, Dialoge, Gesten

Umfang: 2.1–2.5. Alle Chip-Modals, Wetter, Klima-/Rollläden-„Alle“, Müll-Tonne, Pool (inkl. Dauerwahl), Alarm mit
Ziffernblock, Bestätigungen im Sheet, Kontextmenü, Wisch-Aktionen, Inspector-Grundgerüst.

Abnahme:
- [ ] Jedes der 25 `Modal`-Vorkommen in Glas als Sheet (Handy) bzw. Glas-Dialog (Desktop), Morph aus dem Element und
      zurück, Detents mittel/groß, Wischen nach unten schließt (außer `swipeToClose={false}`).
- [ ] Bestätigungen (Garage öffnen, Entriegeln mit Code, Pool-Neustart, Alarm-Code) erscheinen **im** Sheet; falscher
      Code: bleibt offen und leert (H3, H8).
- [ ] Kontextmenü: Langdruck 550 ms, Rechtsklick; Aktionen korrekt; Tipp auf Anzeige-Karten öffnet weiter direkt das Detail.
- [ ] Reduzierte Bewegung: alles Überblendung; Animationsprobe (§5.4) zeigt Bewegung zwischen 0/80/160/320 ms.

Nicht verlieren (Inventar B, F, H2–H3, H8, I):
- [ ] People: Avatare/Initiale, Zone (Zuhause grün/Weg/Name), seit wann (B2)
- [ ] Licht: nach Raum in Nutzer-Reihenfolge + „Andere“, Zeilen-Tipp toggelt, **„Alle ausschalten“** (B4)
- [ ] Türen/Fenster: zwei Gruppen, offen/gesamt, offene zuerst (B6) · Alarm: ein Panel je Zentrale, schwerste zuerst,
      nur unterstützte Modi, nur Unscharf während „wird scharf“ (B8, H2)
- [ ] Medien: aktiv/inaktiv, Play/Pause, Lautstärke (300-ms-Drossel), Link Musik-Seite (B10)
- [ ] Pool: Status, Modus aus `input_select`, Manuell → Dauerwahl, Solar vs. Schwelle, Laufzeit, Restzeit live, Link (B12)
- [ ] Garage: offene zuerst, Stopp nur beim Fahren + unterstützt, Schließen sofort, Öffnen fragt (B14, I4)
- [ ] Schlösser: offene zuerst, Entriegeln fragt immer, Verriegeln nur mit Code fragt, gesperrt bei busy/jammed (B16, I7)
- [ ] Wetter: Kennzahlen, Stunden/Tage, **Entity-Wahl für Bearbeiter** (D10) · Klima-/Rollläden-„Alle anzeigen“ (C9, C11)
- [ ] Detail: alle Punkte aus §2.3; Einstiegspunkte (F14) inkl. Pool-Kacheln, Gruppen-Mitglieder, Kamera-Kacheln
- [ ] Fokus-/Esc-Verhalten aller Modals (V9) · `data-autofocus` („Verstanden“ in „Was ist neu“) · Leerzustände (X)

### Etappe 4 — Übersicht komplett

Umfang: 2.11–2.17; alle elf Sektionen im Glas-3-Look (SPEC5 Änderung 2), Hinweise, aktive Szene, Energie Netz/Solar,
Geräte-Zeilen, Licht-Detail, Inspector fertig, Bearbeiten-Modus S/M/L, Handy-Reihenfolge Begrüßung → Wetter → Chips →
Hinweise.

Abnahme:
- [ ] Vergleich mit `docs/glas/g5h-*.png` / `g5d-*.png` (hell/dunkel, oben/gescrollt, Bearbeiten, Inspector, Licht-Sheet,
      Avatar-Menü, Wetter, Kontextmenü) — gleiche Hierarchie, Abstände, Farben (Abweichung nur durch echte Daten/Schrift).
- [ ] Hinweise erscheinen/verschwinden live mit den Entitäten; keine Karte, wenn nichts abweicht; ausgeblendete
      Entitäten zählen nicht.
- [ ] Aktive Szene: wird nach Aktivierung markiert, verliert die Markierung bei Änderung eines Mitglieds.
- [ ] S/M/L + „⋯ Anpassen“ schreiben dieselben Felder wie Klassisch; Wechsel des Stils zeigt dasselbe Layout.

Nicht verlieren (Inventar C, D, E, F):
- [ ] Begrüßung nach Tageszeit + Namensquelle (C1) · Grid 4/3/2/1 Spalten (C3) · Standard-Reihenfolge inkl. Müll/NVR (C3)
- [ ] Szenen: Favoriten, Symbol nach Name, „Alle Szenen ›“, Leerzustand (C4)
- [ ] Hauptraum: automatisch aktivster Raum (Licht ×10, Medien ×5, Bewegung ×3), Temp/Feuchte, **Licht-Pille**,
      **Klima −/+**, **Medien-Pille nur beim Abspielen**, **› öffnet Raum**, Tipp auf Karte öffnet Raum (C5)
- [ ] Energie: kWh groß, Balken, „Details ›“, Einrichtungs-Hinweis (C6) · Geräte: nur aktive Favoriten, zwei Leerzustände (C7)
- [ ] Klima: Bogen mit Farbe nach Aktion, Stepper mit Schrittweite/min/max, schnelle Tipps addieren, **Raumliste wählbar**,
      „Alle ›“ (C8) · Rollläden: Bogen, **Zu/Stopp/Auf**, Raumliste, Garagen ausgeschlossen, „Alle ›“ (C10)
- [ ] Sicherheit: alle sieben Zeilen inkl. Garage, Sentinel-Kamerazähler, „Alles normal“, „Details ›“ (C12)
- [ ] Müll: nächste Tonne mit Countdown + Farbe, weitere Tonnen, Tonnen-Sheet mit „(verlegt)“ (C13, L)
- [ ] NVR-Karte: Schnappschüsse, Online-Punkt, neueste Ereignisse → Kamera **an diesem Moment** (C14, J3)
- [ ] Aktivität: fünf Zeilen, Ton je Domain inkl. Garage, „Details ›“ (C15)
- [ ] Räume: Kacheln, **Status-Symbol-Override** (Tür, Garage/Auto, Fenster, Wasser, Rauch), Licht an = hervorgehoben (C16)
- [ ] Sichtbarkeits-Gates (C17) · Bearbeiten: Ziehen (6 px / 200 ms Touch / Tastatur), Auge, **Handy-Ausblenden**,
      **Spalten**, **Höhendeckel mit Innen-Scroll**, Chip-Bearbeiten (Reihenfolge + Auge) (D1–D6, B17) · Standard-Slots (D11)
- [ ] Langdruck vs. Tipp (Prinzip 3) · Gefahr-Aktionen bestätigen (Prinzip 4) · versteckte Entitäten überall (Prinzip 2)

### Etappe 5 — Übrige Seiten

Umfang: Raum, Sicherheit, Pool (inkl. Zeitplan-Editor, Laufzeit-Chart), Energie, Musik, Geräte, Automationen, Szenen,
System, Einstellungen, Onboarding (Tokens + Feinschliff). Jede Seite: Titel über den Karten, Segmente/Stepper/Schalter
im Glas-Look, Bearbeiten mit S/M/L wo vorhanden.

Abnahme je Seite: Screenshot hell/dunkel Handy/Desktop, Klick-Fuzz in Glas ohne Fehler, Kontrast-Audit grün.

Nicht verlieren (Inventar G, H, K, M–T):
- [ ] Raum: Hero, Auto-Sektionen in Reihenfolge (inkl. Sentinel-Kameras, Garage), Namen ohne Raumpräfix,
      Halb/Voll-Breite, Ziehen von Entitäten, Auge/Stern, „nicht gefunden“/„keine Geräte“ (G1–G10)
- [ ] Licht-Karte: Helligkeit, **Farbtemperatur**, **Farbton**, Senden beim Loslassen (E2) · Klima-Karte mit Modus-Pillen (E3)
      · Rollladen, Garage, Medien, Toggle, Sensor (Füllbalken, Binär-Wortlaut), Schloss mit Code, Kamera, Button, Sauger,
      „nicht verfügbar“ gedimmt (E4–E13)
- [ ] Sicherheit: Hero mit Verlauf nach Alarmzustand + Personen + Chips (H1), Alarm + Ziffernblock (H2, H3), HA-Kamera-Grid
      mit BEWEGUNG-Badge (H4), NVR-Sektion (H5), Personen (H6), **Alle verriegeln / Alle entriegeln** mit Anzahl (H7),
      Garage **Alle schließen / Alle öffnen** (H9), Türen/Fenster/Bewegung (H10–H12), Leerzustand (H13)
- [ ] Pool: Hero + Modus, Solar-Ring + Schwellen-Stepper, Manuell-Ring + Stopp + Siri-Dauer, **Zeitplan-Editor**
      (Tages-Zeitleiste, Griffe 5-min, Grenzpunkte, Speichern über `scheduler.edit`), Verbrauchskacheln → Detail,
      14-Tage-Chart, Admin-Karte mit Neustart-Bestätigung (K1–K10)
- [ ] Musik: Now Playing (Hintergrund, Seek, Quelle, Shuffle/Repeat), Zonen Raster/Liste + Raum-Stumm/-Lautstärke, andere
      Player, MA-Bibliothek (Tabs, Favoriten, Suche, „Abspielen auf“, Elementmenü), Warteschlange (Übertragen, Gruppieren,
      volle Liste mit Ziehen), Lautsprecher-Gruppen (M1–M11)
- [ ] Energie: Zeitraum-Tabs, Hero, Quellen gestapelt, Solar, Geräte, Wasser/Gas, Einrichtungs-Knopf (N1–N9)
- [ ] Geräte: Ladefortschritt, Hero, Suche/Filter/Raster-Liste, Detail-Modal mit Gruppen, Inline-Steuerung je Domain inkl.
      Garage/Schloss-Bestätigung, Stern/Auge (O1–O7)
- [ ] Automationen: Hero, Feed, Kategorien mit Schaltern, Suche/Filter (P1–P6) · Szenen: Hero, Feed, Raumkarten (Q1–Q4)
- [ ] System: Hero, Monitor mit Balken/Schwellen, Batterien (R1–R5)
- [ ] Einstellungen: Verbindungskarte, App-Name/-Symbol, Modus, Gerät-Override, Sprache, Akzent, Admin (Bearbeiten,
      Entitäten umbenennen/Stern/Auge, **Einstellungen für alle** inkl. Teilen von Tokens, Räume sortieren/ausblenden),
      Backup, Über „Version … · F…“ + „Was ist neu“ (S1–S16)
- [ ] Onboarding: OAuth, Mixed-Content-Warnung, Token-Weg, Demo (T1–T6)

### Etappe 6 — NVR (separat, siehe §4)

### Etappe 7 — Feinschliff und Freigabe

- Leistung auf dem Wandtablet (§5.5), Kontrast-Audit aller Seiten, reduzierte Bewegung, Safari/iPad-Test durch den User.
- „(Vorschau)“ entfernen, Doku final (§6), optional Hintergrund „Bild“ (E15).
- Abschluss-Check: komplette Top-20-Liste des Inventars in **beiden** Stilen durchklicken.

---

## 4. NVR und das Paket `@sentinel-nvr/web`

Ausgangslage: Das Paket liest schon die HAPulse-Tokens (`--text`, `--bg-card`, `--accent`, `--font-display`,
`--font-data`, `--radius-*`, …) — Farben und Schrift folgen Glas also **automatisch**, sobald Etappe 1 die Tokens
setzt. Was fehlt, ist das Glas-**Material** und das **immersive Layout** der Kameraseite (SPEC4 Punkt 9: immer dunkel,
randlos, klare Glas-Steuerkapsel über dem Video; Skizze `g5h-kamera-d.png`).

Achtung: Der lokale Klon `/home/user/sentinel-nvr-web` stand bei der Recherche auf **0.16.6**, HAPulse nutzt **^0.17.1**
(z. B. `header` ist dort eine Funktion `(at) => …`). Vor der Arbeit `git pull`.

### 4.1 Änderungen im Paket (Repo `Muggedadscher/sentinel-nvr-web`, eigener PR, Minor-Version, z. B. 0.18.0)

| # | Änderung | Datei(en) | Standard = heutiges Aussehen? |
|---|---|---|---|
| P1 | **Material-Hooks** als Custom Properties mit heutigen Werten als Fallback: Steuer-Pille, Ton-Knopf, LIVE-Pille, Datum-Chip, Info-Leisten-Knöpfe (`--nvr-ctl-fill`, `--nvr-ctl-filter`, `--nvr-ctl-rim`, `--nvr-ctl-shadow`, `--nvr-ctl-fg`), Segment/Tabs (`--nvr-seg-bg`, `--nvr-seg-lens`, `--nvr-seg-shadow`), Filter-Chips, Radien (`--nvr-radius-ctl`), Zahlen (`font-variant-numeric: tabular-nums`) | `src/ui/ui.css` | ja |
| P2 | Prop `appearance?: 'default' \| 'immersive'` an `CameraPage` (+ Attribut `data-nvr-appearance` an der Wurzel): Handy randlose Bühne, Kopfzeile **über** dem Video (Zurück, Name + LIVE, Extern) mit Verlauf-Scrim, Steuerkapsel unten im Bild, darunter Info-Leiste/Tabs/Zeitleiste auf Schwarz; Desktop Bühne ohne Kartenrahmen | `src/ui/components/CameraPage.tsx`, `ui.css` | ja (`default`) |
| P3 | Klasse/Prop für die Kopfzeile, damit der Host `CameraTitle` im immersiven Modus als Overlay rendern kann (z. B. `CameraTitle` mit `overlay`) | `CameraPage.tsx` | ja |
| P4 | Bewegungs-Hooks: Tabs-Linse gleitet (`--nvr-ease-snappy`, `--nvr-d-snappy`), Druck-Feedback der Kapsel-Knöpfe, `prefers-reduced-motion` respektiert | `ui.css` | ja (Fallback `ease`) |
| P5 | Keine neuen Texte nötig; falls doch: Schlüssel in alle 7 Paket-Locales **und** HAPulse-Locales (`test/nvrLocales.test.ts`) | `src/ui/locales/*` | — |

Regeln: Player-/Standbild-Logik **nicht** anfassen (siehe Sentinel-`CLAUDE.md`: Standbild-Regeln, Marker-Breiten,
Watchdog). Nur CSS-Hooks und Layout-Variante. Tests im Paket (`npm test`, `test:tz`, `typecheck`, `lint`,
`format:check`), CHANGELOG im Paket, Tag `v0.18.0` auf dem Merge-Commit → Workflow `release` veröffentlicht. Sentinels
eigene UI bleibt optisch gleich (Standardwerte); dort optional `scripts/shot-app.js` als Regressionsblick. **Sentinel-
Plugin selbst wird nicht verändert.** Paket-Änderungen vorher mit dem User abstimmen (E12).

### 4.2 Änderungen in HAPulse (Etappe 6)

| Datei | Änderung |
|---|---|
| `apps/dashboard/package.json` | `@sentinel-nvr/web` auf die neue Version |
| `apps/dashboard/src/nvr/NvrCameraPage.tsx` (Fork-Datei) | in Glas `appearance="immersive"`, Wurzel mit `data-glas-scheme="dark"` (dunkler Teilbaum aus §1.2 Punkt 5) |
| `apps/dashboard/src/styles/glas/nvr.css` | Werte für P1-Hooks (klares Glas `--g-glass-clear-*`), Übersicht (`NvrOverviewPage`: Hero, Ereignisleiste, Kamera-Grid, Histogramm, Speicher), `NvrHomeCard`, `NvrRoomCameras`, `NvrSecuritySection`, Setup-Karte |
| `apps/dashboard/src/nvr/components/DatePickerModal.tsx` | nichts — nutzt `Modal`, wird automatisch Sheet |
| Kamera öffnen | Morph der Kachel in die Kameraseite (SPEC3 Motion 7) über das vorhandene Poster (`posterFromSnapshot`) — nur CSS-View-Transition, wo unterstützt; sonst normale Navigation |

Abnahme: `apps/dashboard/scripts/nvr-sweep-test.cjs` (Handy + Desktop) in **beiden** Stilen grün; Kameraseite in Glas
hell **und** dunkel immer dunkel; Steuerkapsel lesbar über hellem und dunklem Bild (Kontrast-Probe über Schnappschuss).

Nicht verlieren (Inventar J): Übersicht mit Kopfaktionen (Sentinel öffnen, Kameras zuordnen, Verbindung), Stale-Banner,
Hero, Ereignisleiste mit Klassen-Badges + „läuft“, Kamera-Grid (Blur-Pillen, Offline, Fallback, REC-Punkt, Ereignisse
heute), Histogramm, Speicher & Aufbewahrung mit Prognose; Kameraseite komplett (Live/Aufnahme, ±15 s, Play/Pause,
Tempo, Ton, Schnappschuss, PiP, Vollbild, Tabs, Filter, Zeitleiste mit Zoom/Lineal/Markern/Bewegungsspur/Tagestrennern,
Scrub, LIVE, Datum, Tastatur, Deep-Link, **Clip speichern** aus F30), PiP-Hinweis, Setup inkl. Token-Tausch und
Fehlertexten, Kameras↔Räume, Kameraquelle Sentinel, Geräte-lokale Secrets. Offene Frage E13: Chips/Tab-Leiste auf der
immersiven Kameraseite am Handy.

---

## 5. Prüfung

### 5.1 Pflichtbefehle (aus `CLAUDE.md`)

```bash
npm run typecheck && npm run build && npm test -w @hapulse/core
npm test -w @hapulse/dashboard
npm run lint
npm run build -w @hapulse/core && node packages/core/scripts/gen-fork-changelog.mjs   # nach Changelog-Änderung
```

### 5.2 Neue Unit-Tests

| Test | Ort | Prüft |
|---|---|---|
| Glas-Tokens | `packages/core/scripts/smoke.mjs` (Block „glas tokens“, `// [fork]`) | gleiche Schlüssel hell/dunkel; jeder Schlüssel ist ein HAPulse-Token oder `--g-*`; **Kontrast**: `--text-dim` ≥ 4,5:1 auf `--bg`, `--bg-card`, `card2`, getönten Kacheln und auf Glas (Füllung bei Stärke klar über Weiß **und** über Schwarz zusammengerechnet); `--text-faint` ≥ 4,5:1 (oder dokumentiert ≥ 3:1 nur für ≥ 15 px); Ink-Farben ≥ 3:1 auf ihrem `-soft`-Hintergrund und auf Weiß; `glasAccent(h).accentInk` ≥ 4,5:1 auf `--bg` für h = 0…359 (Schritt 15); `--on-accent` auf `--accent` ≥ 4,5:1; Federn sind gültige `linear(…)` mit Ende 1 |
| Hinweise | `smoke.mjs` (Block „hints“) | jede Regel einzeln, Sortierung, versteckte Entitäten, Tür-Schwelle, Müll heute/morgen/übermorgen, Zeitzone/Mitternacht |
| Aktive Szene | `smoke.mjs` (Block „active scene“) | aktiviert → aktiv; Mitglied geändert → nicht aktiv; Überlappung → nur neueste; ohne Mitgliederliste nie aktiv; `unknown`-Zustand |
| Erscheinung | `apps/dashboard/test/glasAppearance.test.ts` | `resolveAppearance` (Override schlägt GLOBAL, `reduceTransparency` → opaque), `readPersistedAppearance` (kaputtes JSON, alte Stände ohne Felder → classic) |
| Scope | `apps/dashboard/test/globalSettings.test.ts` (erweitern) | neue Felder klassifiziert; Admin-Glas erreicht User; DEVICE-Felder nicht im Export/Global-Dokument |
| Sheet-Mathematik | `apps/dashboard/test/sheetMath.test.ts` | Detent-Wahl, Snap nach Ziehen (Weg/Geschwindigkeit), Morph-Transform |
| Nav-Gruppen | `apps/dashboard/test/navGroups.test.ts` | Reihenfolge innerhalb der Gruppen, unbekannte IDs, ausgeblendete |
| **Selektor-Wächter** | `apps/dashboard/test/glasSelectors.test.ts` | liest `src/styles/glas/**/*.css`, sammelt alle Klassen-Selektoren und prüft, dass jede Klasse in `src/**/*.{ts,tsx}` bzw. im Paket-CSS vorkommt → ein Upstream-Merge, der eine Klasse umbenennt, wird **rot** statt still kaputt |

### 5.3 Screenshot-Proben (Playwright/CDP)

Neues Skript `apps/dashboard/scripts/glas-shots.cjs <base-url> [mobile]` im Stil von `click-fuzz-test.cjs` (Demo-Modus
über `addScriptToEvaluateOnNewDocument`, Settings vorbelegt mit `uiStyle`, `mode`, `glassStrength`):

- Matrix: **Stil** {classic, glas} × **Modus** {hell, dunkel} × **Gerät** {Handy 390×844 @3x, iPad 1180×820, Desktop
  1440×1000} × **Seite** {/, /room/<id>, /security, /pool, /energy, /music, /devices, /automations, /scenes, /system,
  /settings, /nvr, /nvr/<cam>} + Zustände (gescrollt, jedes Chip-Sheet, Detail Sensor/Licht, Kontextmenü, Avatar-Menü,
  Bearbeiten, Inspector, Banner, Toast) + Glas-Stärken {klar, getönt, deckend} + `reduceTransparency`.
- Ausgabe nach `$TMP/glas-shots/<stil>-<modus>-<gerät>-<seite>.png`, nicht einchecken; in PRs die relevanten anhängen.
- Klassisch-Läufe gegen die Etappe-0-Referenz pixelvergleichen (Toleranz nur Antialiasing).
- Zusätzlich `click-fuzz-test.cjs` um ein Argument `glas` erweitern (`// [fork]`-Datei), damit der Klick-Fuzz beide
  Stile fährt. Labor-Variante wie gewohnt in CT 213 (`/root/lab/…`), lokal mit Playwright aus `$(npm root -g)`.
- Linux hat kein SF Pro: Screenshots nutzen eine breitere Ersatzschrift → ~10 % Breitenreserve einplanen, aber echte
  Abschneidungen beheben.

### 5.4 Kontrast-, Bewegungs- und A11y-Proben

- `apps/dashboard/scripts/glas-contrast-audit.cjs`: läuft über dieselben Seiten, liest für sichtbare Textknoten
  `getComputedStyle` Farbe und die effektive Hintergrundfarbe (Vorfahren-Kette; bei Glas die zusammengerechnete Füllung
  über dem schlechtesten Hintergrund) und meldet Paare < 4,5:1 (< 3:1 bei ≥ 24 px bzw. ≥ 19 px fett). **Pflicht: hell auf
  iPad-Breite** (der User liest am iPad bei Tageslicht). Zusätzlich Sichtkontrolle der hellen Screenshots.
- Bewegung: zeitversetzte Screenshots (0/80/160/320/600 ms) für Sheet auf/zu, Inspector, Kontextmenü, Tab-Linse,
  Seitenleiste, Szene aktivieren, Thermostat — jedes Bild muss sich unterscheiden und im Endbild ruhen (Vorlage:
  `verify_g5.js`/`verify_gd5.js` aus der Skizzenphase, in `docs/glas/` falls mitkopiert).
- `prefers-reduced-motion: reduce` per CDP `Emulation.setEmulatedMedia` → nur Überblendungen ≤ 200 ms, kein Skalieren.
- `prefers-contrast: more`, `forced-colors: active` je ein Screenshot-Satz.
- Tastatur: Tab durch Shell, Sheet, Kontextmenü, Inspector; Fokus sichtbar; Esc-Verhalten; Fokus-Rückgabe.

### 5.5 Leistungsbudget (`backdrop-filter` auf Wandtablets)

| Regel | Wert |
|---|---|
| Glasflächen in Ruhe | ≤ 3 (Seitenleiste **oder** Tab-Leiste, Kopf-Kapseln, ggf. offenes Sheet); nie Glas in Listenzeilen/Karten |
| Blur-Radius | ≤ 16 px (klar ≈ 8,5 px, getönt ≈ 13,5 px nach Formel `6 + 10 × tint`) |
| Animiert werden | nur `transform`, `opacity`, `filter` am Element, `clip-path`, `border-radius`; **nie** der `backdrop-filter`-Wert; Höhe nur beim Detent |
| Scroll | passive Listener, rAF, keine Layout-Lesungen pro Frame außer `scrollY` |
| Messung | Chromium-Trace mit 4× CPU-Drossel, Handy-Emulation: Home 3 s scrollen → p95 Frame ≤ 20 ms; Sheet öffnen ≤ 2 verworfene Frames. Echtes iPad (User) und das Wandtablet (Modell beim User erfragen) manuell |
| Rückfall | wenn ein Gerät das Budget reißt: „Transparenz reduzieren“ bzw. Stil-Override auf diesem Gerät — beides DEVICE |

### 5.6 Safari-Besonderheiten

- `-webkit-backdrop-filter` **und** `backdrop-filter` immer zusammen; **keine SVG-Refraktion** (`backdrop-filter:
  url(#…)` gibt es nur in Chromium, nicht auf iPhone/iPad).
- Rand-Maske mit `-webkit-mask-composite: xor` + `mask-composite: exclude` (wie Skizze).
- `linear()`-Easing erst ab Safari 17.2 → `@supports`-Rückfall auf `cubic-bezier`.
- Kein `prefers-reduced-transparency` → App-Schalter (§1.1). Kein `animation-timeline` → JS-Scroll (§2.7).
- Langdruck: `-webkit-touch-callout: none`, `user-select: none` am Ziel; Wischzeilen `touch-action: pan-y`; Grabber
  `touch-action: none`.
- PWA: Status-Leiste `black-translucent`, kein `viewport-fit=cover` → Safe-Area-Insets 0; schwebende Tab-Leiste trotzdem
  mit `env(safe-area-inset-bottom)` rechnen. `dvh` für Sheet-Höhen.
- `backdrop-filter` an Elementen mit `overflow: hidden` + Radius: auf iOS Artefakte möglich → `isolation: isolate`
  testen.

---

## 6. Changelog und Doku

### 6.1 Fork-Changelog (`packages/core/src/forkChangelog.ts`)

Pro Etappe-PR ein Eintrag, **neuer Release `F<n+1>` mit Merge-Datum** (aktuell neuester: F30 vom 2026-10-06) oder
Erweiterung des neuesten, solange er nicht ausgerollt ist. Danach
`npm run build -w @hapulse/core && node packages/core/scripts/gen-fork-changelog.mjs` (`CHANGELOG.fork.md`, Test
`forkChangelog.test.ts`). Upstreams `changelog.ts`/`CHANGELOG.md` und die `package.json`-Versionen bleiben unberührt.

Vorschlag Etappe 1:

```ts
{
  version: 31, // nächste freie Nummer zum Merge-Zeitpunkt
  date: '2026-10-XX',
  title: { de: 'Neuer Stil „Glas“ (Vorschau)', en: 'New “Glass” style (preview)' },
  sections: [{
    kind: 'added',
    items: [
      { de: 'Einstellungen → Darstellung: Stil Klassisch oder Glas — Glas ändert nur Aussehen und Bewegung, alle Funktionen bleiben',
        en: 'Settings → Appearance: Classic or Glass style — Glass changes only look and motion, every feature stays' },
      { de: 'Glas-Stärke klar, getönt oder deckend und „Transparenz reduzieren“ pro Gerät',
        en: 'Glass strength clear, tinted or opaque, and “Reduce transparency” per device' },
    ],
  }],
},
```

Spätere Etappen analog („Glas: schwebende Tab-Leiste und Seitenleiste“, „Glas: Sheets mit Bestätigung im Sheet“,
„Übersicht: Hinweise“ …). Hinweise/aktive Szene, falls in beiden Stilen (E3), als eigener `added`-Punkt ohne „Glas:“.

### 6.2 Doku

| Datei | Änderung |
|---|---|
| `CLAUDE.md` (Fork) | Abschnitt „Bereits umgesetzte Fork-Features“ → Punkt **„Stil Glas“** (Architektur in drei Sätzen, Einstellung + Scopes, `glasTokens.ts`, `styles/glas/`, Selektor-Wächter); Konvention ergänzen: **„Jede neue Fork-Funktion in beiden Stilen prüfen; neue Settings-Felder auch in die Stil-Tabelle denken.“** |
| `docs/DESIGN.md` (Upstream!) | nur ein markierter Verweis oben: `<!-- [fork] --> Zweiter Stil „Glas“: siehe docs/GLAS-DESIGN.md` |
| `docs/SYNC.md` | Inventar: neue Dateien (Tabelle „Neue Dateien“) und jede neue `[fork]`-Stelle (Tabelle „Geänderte Upstream-Dateien“) — pro Etappe |
| `docs/NVR-INTEGRATION.md` | Abschnitt „Glas-Stil“: immersive Kameraseite, Paket-Hooks, Mindestversion |
| `docs/GLAS-PLAN.md` | Fortschritt je Etappe abhaken, Entscheidungen aus §7 mit Datum eintragen |

---

## 7. Risiken und offene Entscheidungen

### 7.1 Risiken

| Risiko | Wirkung | Gegenmittel |
|---|---|---|
| Glas-CSS hängt an Upstream-Klassennamen | Upstream-Merge benennt um → Glas still kaputt | Selektor-Wächter-Test (§5.2), Screenshot-Matrix nach jedem Upstream-Merge, Klassen-Liste in `docs/SYNC.md` |
| Inline-Tokens von `applyTheme` | Glas-Farben greifen nicht / bleiben hängen | `applyAppearance` (§1.2), Invarianten-Test |
| Spezifitäts-Kämpfe | Upstream-Regel gewinnt | Präfix `:root[data-style='glas']` (+0,2,0), kein `@layer`, kein `!important` |
| Doppelte Pflege zweier Stile | neue Funktionen nur in einem Stil schön | Konvention in `CLAUDE.md`, Probes fahren beide Stile, Tokens auf HAPulse-Namen gemappt (Grundlook gratis) |
| Leistung `backdrop-filter` | Ruckeln auf Wandtablet/älteren iPads | Budget §5.5, ≤ 3 Flächen, Geräte-Schalter |
| Kontrast auf Glas bei Tageslicht | schlecht lesbar am iPad | Kontrast-Tests (Token + gerendert), Ink-Varianten, getönt/deckend |
| Akzent-Orange als Text | 2,2:1 | `--g-accent-ink` für Text |
| Gesten-Konflikte | Sheet-Ziehen vs. Liste scrollen, Wischen vs. horizontales Scrollen (Chips, Szenen) | Ziehen nur am Grabber/Kopf; SwipeRow nur in vertikalen Listen; Schwellen + Richtungssperre |
| Gestapelte Modals | Fokus/Esc/Zurück durcheinander | `sheetStack.ts` mit Tests, Esc schließt nur oberstes |
| Exit-Animation | Modal bleibt unsichtbar gemountet, blockiert Klicks | `usePresence` setzt `pointer-events: none` beim Schließen, Timer-Aufräumen |
| Paket-Release-Kette | HAPulse wartet auf `@sentinel-nvr/web` | NVR als eigene Etappe am Ende; Hooks haben Fallbacks |
| Unterschiedliche Daten in Demo vs. echt | Hinweise/aktive Szene im Demo unsichtbar | Demo-Daten ergänzen (§2.11) |
| Ersatzschrift in Screenshots | falsche Abschneidungen | 10 % Reserve, echte Prüfung am iPad durch den User |

### 7.2 Offene Entscheidungen (vor dem Coden mit dem User klären)

| # | Frage | Empfehlung |
|---|---|---|
| E1 | Scope des Stils: GLOBAL + Geräte-Override (wie Hell/Dunkel) oder USER (jeder HA-User selbst)? | GLOBAL + DEVICE-Override |
| E2 | Glas-Stärke GLOBAL, „Transparenz reduzieren“ DEVICE? | ja |
| E3 | Neue **Inhalte** (Hinweise, „Aktiv“ bei Szenen, Untertitel „5 Geräte“) nur in Glas oder in beiden Stilen? „Nur ein Stil“ spricht für beide | beide Stile; Hinweise als normale, ausblendbare Home-Sektion |
| E4 | Welche Bedingungen sind Hinweise (Tabelle §2.11)? Tür ab wie vielen Minuten? Batterien/nicht verfügbare Geräte ja/nein? Müll ab „morgen“ oder schon „übermorgen“? | Tabelle wie vorgeschlagen, Tür 10 min, ohne Batterien |
| E5 | Heuristik „aktive Szene“ (§2.12) akzeptabel? | ja, Grenzen im Changelog nennen |
| E6 | Größe „L“: (A) neues Feld `tallSections` → Mindesthöhe, (B) L = 2 Spalten ohne „höher“, (C) L = volle Breite | A (Klassisch ignoriert es), „⋯ Anpassen“ behält alle alten Werte |
| E7 | Sheets: Eigenbau oder Base UI Drawer (+≈ 38 kB gz)? | Eigenbau |
| E8 | Hauptraum-Karte: Glas-3-Lichtkacheln (Decke, Stehlampe …) als **zusätzliche** Zeile — in Glas, in beiden oder gar nicht? HA-Raumbild (falls gesetzt) in Glas zeigen? | Lichtkacheln nur Glas (Darstellung derselben Raumlichter); Raumbild zeigen, wenn gesetzt, sonst sauberer Glas-3-Kopf ohne Verlauf |
| E9 | Energie: gestapelte Netz/Solar-Balken + „PV-Ertrag“ nur in Glas oder auch Klassisch? | nur Glas (Daten unverändert) |
| E10 | Seitenleisten-Gruppen fest zugeordnet; im Bearbeiten-Modus flache Liste — ok? | ja |
| E11 | Ausrollen: „Glas (Vorschau)“ ab Etappe 1 für alle sichtbar oder nur für Admins bis Etappe 5? | nur Admins sehen die Option bis Etappe 4 |
| E12 | Paket-Änderungen in `@sentinel-nvr/web` (§4.1) freigeben? Sentinels eigene UI später auch Glas? | Paket ja (Standard unverändert); Sentinel-UI vorerst nicht |
| E13 | Immersive Kameraseite am Handy: Tab-Leiste und Chip-Leiste dort ausblenden (Skizze) — widerspricht „Chips auf jeder Seite“ | ausblenden nur auf `/nvr/<kamera>`; Zurück führt zur Übersicht |
| E14 | Farbwelten (Aurora/Sunset/Ocean/Forest) in Glas ausblenden, Akzent-Standard iOS-Orange? | ja |
| E15 | Skizzen-Option Hintergrund „Bild“ (Wallpaper) umsetzen? Mit welchem Bild? | nicht in Etappe 1–6; ggf. Etappe 7 mit HA-Bereichsbild |
| E16 | Inspector-Breakpoint ≥ 1100 px (iPad quer ja, iPad hoch = Sheet)? | ja |
| E17 | Welches Wandtablet (Modell/Browser) ist Leistungsmaßstab? | beim User erfragen |

### 7.3 Entscheidungen des Users (2026-10-06) — verbindlich, überschreiben die Empfehlungen oben

| # | Entscheidung |
|---|---|
| E1 | **Nur der Admin legt den Stil fest, für alle (GLOBAL). Kein Geräte- oder User-Override für den Stil.** Pro Gerät änderbar bleibt ausschließlich Hell/Dunkel (wie heute `modeOverride`). |
| E2 | Glas-Stärke GLOBAL (Admin). „Transparenz reduzieren“ folgt derselben Regel → GLOBAL (Admin), kein Geräte-Schalter. `prefers-contrast: more` greift weiterhin automatisch pro Gerät (Systemeinstellung, kein App-Schalter). |
| E3 | Neue Inhalte (**Hinweise**, **„Aktiv“ bei Szenen**, **Netz/Solar-Balken** + PV-Ertrag) kommen in **beide Stile**. Hinweise = normale, ausblendbare Home-Sektion. |
| E4, E5, E7, E10, E14, E16 | Empfehlung übernommen (Hinweis-Tabelle §2.11 mit Tür ≥ 10 min, ohne Batterien; Szenen-Heuristik; Sheets als Eigenbau; feste Seitenleisten-Gruppen; Farbwelten in Glas aus, Akzent iOS-Orange; Inspector ab 1100 px). Bei Unklarheit im Detail kurz beim User nachfragen. |
| E6 | **L = 2 Spalten + höher.** S = 1 Spalte, M = 2 Spalten; feinere Werte bleiben über „⋯ Anpassen“ erhalten. |
| E8 | Hauptraum-Karte **immer schlicht** (Glas-3-Kopf, kein Verlauf), **auch wenn in HA ein Raumbild gesetzt ist — kein Raumbild in Glas.** Lichtkacheln wie Empfehlung (Glas-Darstellung derselben Raumlichter). |
| E9 | Netz/Solar in beiden Stilen (folgt aus E3). |
| E11 | Ausrollen: „Glas (Vorschau)“ **nur für HA-Admins sichtbar**, bis die wichtigsten Etappen fertig sind. |
| E12 | Paket-Änderungen in `@sentinel-nvr/web` wie empfohlen (Standard unverändert); Sentinels eigene UI vorerst nicht. |
| E13 | Kameraseite am Handy als dunkles Vollbild: **Tab- und Chip-Leiste nur dort ausblenden**, überall sonst sichtbar. |
| E15 | Hintergrund „Bild“: **später, optional** (frühestens Etappe 7). |
| E17 | Leistungsmaßstab: **iPad** (Safari/WebKit). |
| Energie | Die Energie-Karte bekommt den Apple-Look aus der finalen Skizze (`docs/glas/Glas5*.dc.html`, Screenshots `g5e-*`): Segment Tag/Woche/Monat, schmale gerundete Balken Netz/Solar gestapelt, Hilfslinien mit Achswerten, Ø-Linie, Tipp auf Balken → Info-Blase. |

---

## 8. Start-Prompt für die neue Session

```text
Du arbeitest im HAPulse-Fork (/home/user/hapulse). Lies zuerst CLAUDE.md und docs/SYNC.md (Fork-Regeln:
neue Funktionen als neue Dateien, jede Änderung an Upstream-Dateien mit // [fork] markieren, nur Design-Tokens,
@hapulse/core bleibt React-/DOM-frei, Scope-Tabelle für neue Settings, Changelog-Pflicht in forkChangelog.ts).

Aufgabe: den vom User freigegebenen zweiten Stil „Glas“ umsetzen. Grundsatz: „Glas ist nur ein Stil“ — gleiche
Komponenten, gleiche Funktionen, gleiche Informationsarchitektur; die Einstellung „Stil: Klassisch | Glas“ ändert
nur Aussehen und Bewegung. In keinem Stil darf etwas verloren gehen; Klassisch muss pixelgleich bleiben.

Lies vollständig:
1. docs/GLAS-PLAN.md — Architektur, Etappen, Abnahme, Tests, Risiken, offene Entscheidungen (§7.2).
2. docs/GLAS-DESIGN.md — das Designsystem (Farben, Typo, Material, Bewegung, Komponenten).
3. docs/glas/ — freigegebene Skizzen Glas5Handy.dc.html / Glas5Desktop.dc.html (Referenz für Look und Bewegung,
   kein Code zum Kopieren), Screenshots g5h-*.png / g5d-*.png (schau dir mindestens die hellen und dunklen
   Übersichten, Inspector, Licht-Sheet, Avatar-Menü, Bearbeiten und Kamera an) und HAPULSE-INVENTORY.md
   (Checkliste, was nicht verloren gehen darf).

Vorgehen:
- Kläre vor dem ersten Code die offenen Entscheidungen E1, E2, E11 und E14 aus GLAS-PLAN.md §7.2 mit mir
  (kurze Liste mit deiner Empfehlung); die übrigen frage ich, wenn die jeweilige Etappe dran ist.
- Beginne mit Etappe 0 (Referenz-Screenshots Klassisch, Probe-Skript-Gerüst) und dann Etappe 1 (Fundament:
  Settings-Felder + Scope, packages/core/src/glasTokens.ts mit Kontrast-Tests, theme/glasAppearance.ts mit
  Pre-Paint, styles/glas/ Basis, Einstellungen „Stil“, i18n in allen 7 Locales, Changelog F<n+1>).
- Eigener Branch claude/glas-etappe-1-…, ein PR pro Etappe. Vor jedem Push:
  npm run typecheck && npm run build && npm test -w @hapulse/core && npm test -w @hapulse/dashboard && npm run lint
- Prüfe jede Etappe gegen ihre Abnahme- und „Nicht verlieren“-Liste im Plan, mit Screenshots hell/dunkel,
  Handy/iPad/Desktop, Klassisch und Glas. Hake im Plan ab, was erledigt ist, und trage meine Entscheidungen mit
  Datum ein. docs/SYNC.md-Inventar bei jeder neuen Datei/[fork]-Stelle mitpflegen.
```
