# Spec: HAPulse "Glas" sketch (Vorher / Nachher)

Goal: a clickable before/after design sketch for the HAPulse smart-home dashboard (fork at /home/user/hapulse,
NVR package at /home/user/sentinel-nvr-web). "Vorher" = the app as it looks TODAY (faithful). "Nachher" = the
proposed optional style "Glas": Apple-like, modern, minimal, oriented on iOS 26 / iPadOS 26 "Liquid Glass".
All UI copy is GERMAN. Numbers use the German decimal comma ("21,5 °C", "1,2 kW"). Times "09:41".
No personal names anywhere (greeting is just "Guten Morgen").

Working folder (ROOT): /tmp/claude-0/-home-user/ed177dbc-ef3b-5bd8-b610-9794d02b3e51/scratchpad/glas
Artboard files live in ROOT/project/. Checker: `python3 ROOT/check_dc.py ROOT/project/<file>` (must report 0 errors).
Write files ONLY with the file-writing/editing tools (no shell heredocs, no generator scripts).
Do NOT render, screenshot, open a browser or install anything.

## 1. The four big artboards (one builder each)

| File | What | Size (fixed root) | Props (data-props) |
|---|---|---|---|
| `VorherHandy.dc.html` | today's mobile Übersicht, faithful | 390×844 | `dark` boolean (default false) |
| `Main.dc.html` | Nachher phone prototype, clickable | 390×844 | `dark` boolean (false), `screen` enum home/raeume/raum/nvr/kamera/pool/mehr (home), `sheet` enum none/licht/garage (none), `accent` color (default "#FF9500", options ["#FF9500","#007AFF","#34C759","#AF52DE"]) |
| `VorherDesktop.dc.html` | today's desktop Übersicht, faithful | 1440×1000 | `dark` boolean (false) |
| `Desktop.dc.html` | Nachher desktop/iPad, clickable | 1440×1000 | `dark` boolean (false), `sheet` enum none/licht (none), `accent` color as above |

Small wrapper artboards already exist and import these via `<dc-import name="Main" dark="{{ true }}" ...>`,
`screen="raum"`, `sheet="licht"`, `screen="kamera"` etc. So: props MUST be read as
`this.props.dark`, `this.props.screen`, `this.props.sheet`, `this.props.accent` with the defaults above, and the
initial screen/sheet come from props while later clicks live in `this.state`
(pattern: `const s = this.state || {}; const screen = s.screen ?? this.props.screen ?? 'home';`).
For the `dark` prop accept both true and the string "true".

## 2. The .dc.html format — rules that fail SILENTLY if broken

Skeleton (copy exactly, keep the support.js line EXACTLY):
```html
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Short screen name</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="https://fonts.googleapis.com/css2?family=...&amp;display=swap" rel="stylesheet">   (only if web fonts are needed)
<style>
body{margin:0}
/* minimal shared rules only, see below */
</style>
</helmet>
<div class="..." data-mode="{{mode}}" style="width: 390px; height: 844px; ...">
  ... ALL UI as markup ...
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"dark":{"editor":"boolean","default":false},"$preview":{"width":390,"height":844}}'>
class Component extends DCLogic {
  renderVals() {
    const s = this.state || {};
    return { mode: this.props.dark ? 'dark' : 'light' };
  }
}
</script>
</body>
</html>
```
Rules:
- Close EVERY non-void element explicitly, including SVG children: `<path d="..."></path>`, `<circle ...></circle>` (no `<path/>`). Quote EVERY attribute value with double quotes.
- `{{hole}}` = dotted lookup only (`{{item.label}}`, `{{t.title}}`, `{{ true }}`, `{{ $index }}`). NEVER expressions (`{{a+b}}`, `{{!x}}`, `{{fn()}}`, ternaries). Compute everything in `renderVals()` and return it by name.
- Attribute forms: `x="literal"`; `x="{{path}}"` passes the raw value (function, number, bool); `x="a {{p}} b"` interpolates a string. `class` and `for` are fine (auto-mapped).
- Events: JSX camelCase whole-value attributes: `onClick="{{openSheet}}"`, `onScroll="{{onScroll}}"`, `onPointerDown`, etc. Handlers are functions returned from renderVals. Per-item handlers: map items in renderVals, e.g. `lights: L.map(l => ({...l, toggle: () => this.setState({...}) }))` then `onClick="{{item.toggle}}"` inside `<sc-for>`.
- Loops: `<sc-for list="{{items}}" as="item" hint-placeholder-count="3"> ... {{item.x}} ... </sc-for>`. Conditionals: `<sc-if value="{{cond}}" hint-placeholder-val="{{ true }}"> ... </sc-if>` (no else: use a second sc-if with the negated flag computed in renderVals). ALWAYS set the hint attributes.
- Conditional styling: precompute per item in renderVals (e.g. `item.tileStyle`, `item.iconBg`) or branch with sc-if. A style hole is allowed for state-driven values; static theme values go inline as `var(--token)`.
- Script: classic JS, `class Component extends DCLogic`, no import/export, no TypeScript. Available: `this.props`, `this.state`, `this.setState`, React lifecycle minus render(). Avoid setState on every scroll event: only when a derived flag changes.
- NEVER build UI from script (`innerHTML`, `appendChild`, `createElement`, `document.write`, own `window.X`). No `<iframe>`, `<object>`, `<embed>`, no global keydown handlers, no emoji, no network except a Google Fonts css2 `<link>` in helmet and the `/_blob/...` image URLs below.
- `data-props` is a single-quoted HTML attribute holding JSON: escape `&` as `&amp;` and a literal `'` as `&#39;`. Declare few deliberate tweaks (the props from the table) — never copy text as props. Always include `"$preview":{"width":W,"height":H}`.
- Copy text is literal markup (not props) unless it is genuinely data rendered in a loop.
- Accessibility as drawn: real `<button type="button">` for every clickable thing (never onClick on div/span), `aria-label` on icon-only buttons, `aria-pressed` on toggles, `<a href>` only for links. Touch targets ≥ 44 px. Text contrast ≥ 4.5:1 (≥ 3:1 at ≥ 24 px). Colours that must be told apart also differ in lightness.
- Icons: inline stroke SVGs in the style of Lucide (24×24 viewBox, `fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"`), drawn by you. Never emoji.
- No fake iOS status bar, no fake home indicator, no device bezel. The artboard IS the screen.
- Styling: put layout + visual styles INLINE (`style="..."`) so the design editor can edit them; reference colours as `var(--token)`. The helmet `<style>` holds ONLY: `body{margin:0}`, the token blocks (light + `[data-mode="dark"]` override, scoped to one root class), `@keyframes`, `:hover/:active/:focus-visible` states, scrollbar hiding, and pseudo-elements. Prefix every class with the file's prefix to avoid collisions between artboards: `vh-` (VorherHandy), `vd-` (VorherDesktop), `g-` (Main), `gd-` (Desktop).
- Root element: fixed size (`width/height` in px), `position: relative; overflow: hidden`; inner scroll areas `overflow-y: auto` so Play mode can scroll.

## 3. Shared content inventory (SAME data in Vorher and Nachher — fair comparison)

Weather: 14 °C, "Teilweise bewölkt". Notifications: 1 unread.
Summary chips (order): Personen "3 zu Hause" (3 monogram avatars: "A", "M", "L"), Licht "5 an", Fenster/Türen "2 offen",
Garage "geschlossen", Schlösser "alle verriegelt", Pool "läuft", Medien "nichts läuft".
Greeting: "Guten Morgen" — subtitle "Das passiert gerade in deinem Zuhause."
Szenen (favorites): "Morgen hell" (sun, amber), "Kinoabend" (film/tv, purple-ish → in Vorher use info tint), "Abendessen" (utensils, accent), "Gute Nacht" (moon, info).
Hauptraum (hero): Wohnzimmer · 23 Geräte · 21,5 °C · 48 % · Licht 3 an · Thermostat Soll 22,0 °.
Geräte (active favourites): "Decke" Wohnzimmer – an 80 %; "Spots" Küche – an; "Stehlampe" Wohnzimmer – an 40 %;
"Leselampe" Wohnzimmer – aus; "Lampe" Büro – an.
Klima: Wohnzimmer 21,5 °C → Soll 22,0 °C, Heizen; Schlafzimmer 19,8 °C; Büro 21,2 °C; Bad 23,1 °C.
Sicherheit: Alarm "Scharf (zu Hause)"; Schlösser "Alle verriegelt"; Garage "Geschlossen"; Fenster "2 offen";
Türen "Alle geschlossen"; Bewegung "1 erkannt"; Kameras "1 aktiv".
Sentinel NVR card: camera "Einfahrt", Live, "63 heute · vor 19 Min." ; events strip: 14:46 Fahrzeug, 14:29 Fahrzeug, 14:19 Person.
Müllabholung: Restmüll "Morgen" (Di., 7. Okt.); Papier "in 3 Tagen"; Gelber Sack "in 6 Tagen"; Bio "in 9 Tagen".
Pool: Pumpe läuft · Modus Automatik · Solar 31,5 °C · Wasser 24,8 °C · Laufzeit heute 3 h 20 min.
Energie (desktop only, optional): Verbrauch heute 8,4 kWh, PV 12,1 kWh.
Aktivität: 09:41 Haustür – Tür geschlossen; 09:38 Decke Wohnzimmer – Eingeschaltet; 09:12 Garage – Geschlossen;
09:05 Einfahrt – Bewegung erkannt; 08:57 Bad – Auf 23 ° gestellt.
Nav (desktop sidebar order): Übersicht, Räume, NVR, Pool, Musik, Sicherheit, Energie, Geräte, Automationen, Szenen,
System, Einstellungen. Sidebar footer status: "Alle Systeme normal" / "Heimstatus".
Mobile tab bar (fork default): Übersicht, Räume, NVR, Pool, Mehr.
Rooms (for Räume list): Wohnzimmer (21,5 °C · 3 Lichter an), Küche (22,0 °C · 1 Licht an), Schlafzimmer (19,8 °C),
Büro (21,2 °C · 1 Licht an), Bad (23,1 °C), Garten (14 °C · Pool läuft), Garage (Tor geschlossen).
Wohnzimmer room page: Szenen chips (Morgen hell, Kinoabend, Abendessen); Licht: Decke an 80 %, Stehlampe an 40 %,
Leselampe aus, LED-Leiste aus, Wandlampe an 60 %; Klima: Thermostat 21,5 °C, Soll 22,0 °C, Heizen;
Rollläden: Fenster links offen 100 %, Fenster rechts 30 %; Medien: "Wohnzimmer" Lautsprecher – nichts läuft;
Sensoren: Luftfeuchte 48 %, CO₂ 612 ppm.

Images (already uploaded, use these URLs verbatim in `<img src>`; they are real frames of the user's own camera):
- Camera frame "Einfahrt" (776×470): `/_blob/8ae29bb6f0522a5160781e5c8a6e133d`
- Event thumbs (300×225, 4:3): car `/_blob/afa92b2e55510f3650c7ff2ab6221011`, carport `/_blob/58fb5de2d18b8b99f56c849d0980e6b7`,
  street `/_blob/20fba917a58d3f9b65fff7bee0458af5` (use for 14:46, 14:29, 14:19).
Room pictures do not exist: Vorher's hero room card shows its normal layout over a neutral `var(--bg-subtle)` area with a
dark bottom scrim (no fake illustration). Nachher uses no room photo.

## 4. "Vorher" — the current HAPulse look (be FAITHFUL; read the real source)

Read before building: /home/user/hapulse/docs/DESIGN.md, /home/user/hapulse/apps/dashboard/src/styles/global.css,
/home/user/hapulse/apps/dashboard/src/app/AppLayout.css (+ AppLayout.tsx), /home/user/hapulse/apps/dashboard/src/pages/Home.css,
/home/user/hapulse/apps/dashboard/src/components/home/*.css (+ the .tsx you need: SummaryChips, HeroRoomCard, ScenesCard,
DevicesCard, ClimateCard, SecurityCard, ActivityCard), components/waste/*.css, nvr/nvr.css, components/pool/* (chip only),
and the screenshots /home/user/hapulse/screens/home.png and room.png (look at them with the Read tool).
Tokens = Aurora (packages/core/src/themes.ts), exact values:
light: --bg #f3f4f6; --bg-raised #ffffff; --bg-card #ffffff; --bg-card-hover #f8f9fb; --bg-subtle #f1f3f5; --text #1a1d23;
--text-dim #697079; --text-faint #9aa1ab; --accent #f2941c; --accent-soft rgba(242,148,28,.12); --on-accent #ffffff;
--line rgba(20,24,30,.07); --border #e8eaee; --positive #16a34a; --positive-soft rgba(22,163,74,.12); --warning #e59411;
--warning-soft rgba(229,148,17,.12); --danger #e5484d; --danger-soft rgba(229,72,77,.10); --info #3b82f6;
--info-soft rgba(59,130,246,.12); --shadow-card 0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06);
--shadow-elevated 0 12px 32px -8px rgba(16,24,40,.16).
dark: --bg #0f1116; --bg-raised #171a21; --bg-card #171a21; --bg-card-hover #1e222b; --bg-subtle #22262f; --text #f2f4f7;
--text-dim #9aa1ad; --text-faint #646b76; --accent #f5a623; --accent-soft rgba(245,166,35,.16); --on-accent #1a1205;
--line rgba(255,255,255,.08); --border rgba(255,255,255,.09); --positive #3ad07f; --positive-soft rgba(58,208,127,.15);
--warning #f5b53d; --warning-soft rgba(245,181,61,.15); --danger #f0686d; --danger-soft rgba(240,104,109,.15);
--info #5fa0f5; --info-soft rgba(95,160,245,.15); --shadow-card 0 2px 8px -2px rgba(0,0,0,.5);
--shadow-elevated 0 16px 40px -12px rgba(0,0,0,.7). Dark mode also has the ~2.5 % grain overlay (may be omitted).
Fonts (Google Fonts): Bricolage Grotesque (display: greeting, card titles, big numbers), Schibsted Grotesk 400/500/700
(body), Spline Sans Mono 400 (data: chips, values, times — tabular). Radii: card 20, control 12, pill 999.
Link: `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&amp;family=Schibsted+Grotesk:wght@400;500;700&amp;family=Spline+Sans+Mono:wght@400&amp;display=swap`
Characteristic details to keep: hairline borders + soft shadow on every card; icon chip (rounded square, *-soft tint) in
every card title; orange "Alle Szenen ›"-style links top-right; uppercase tracked `.section-label`s; summary chips as
outlined pills with mono text; mobile bottom tab bar full-width, `--bg-raised` at 92 % + blur(12px) + top border, 64 px,
active = accent; desktop sidebar 240 px `--bg-raised` with filled accent-soft active item, logo "HAPulse" with the orange
pulse icon tile, home-status pill at the bottom.

## 5. "Nachher" — style "Glas" (iOS 26 / iPadOS 26 Liquid Glass, minimal)

Principles (apply strictly):
1. Glass ONLY on the navigation/control layer that floats above content: tab bar, collapsing nav bar, sidebar (desktop),
   sheet surfaces, toolbar buttons, summary chips row, controls over video. Content cards are opaque and borderless.
2. One typeface: system stack `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", sans-serif`;
   numbers use `font-variant-numeric: tabular-nums` (NO monospace anywhere).
   Scale: Large Title 34/41 bold (letter-spacing .37px); Title2 22/28 bold; Title3 20/25 semibold; Headline 17/22 semibold;
   Body 17/22; Callout 16/21; Subhead 15/20; Footnote 13/18; Caption 12/16. Section headers = Title3 in sentence case
   (no uppercase, no tracking), with an optional plain chevron instead of coloured "Alle …" links.
3. Surfaces instead of lines: no borders on cards, no card shadows (or a barely visible one in light), separators only
   inside grouped lists as 0.5 px hairlines inset from the left.
4. Colour only for STATE (on / active / alarm). Off devices are neutral. Card titles have NO icon chips.
5. Concentric, generous radii: tiles 22, cards 26, sheets 34 (top), buttons/chips = capsules, tab bar = capsule.
6. Motion: iOS-like easing `cubic-bezier(.32,.72,0,1)` 350–450 ms, press feedback `transform: scale(.97)`;
   respect `prefers-reduced-motion`.

Tokens (Nachher), define on the root class with `[data-mode="dark"]` override:
light: --bg #F2F2F7; --card #FFFFFF; --card-2 #F2F2F7 (inset fields); --fill rgba(120,120,128,.12) (neutral icon circles,
segmented track); --fill-2 rgba(120,120,128,.20); --sep rgba(60,60,67,.18); --label #000000; --label-2 #6C6C70;
--label-3 #8E8E93 (only ≥ 15 px non-essential); --accent = prop (default #FF9500); --on-accent #FFFFFF (only on icons/large
fills); --accent-text #B25000 (orange text on light); --green #34C759 / text #248A3D; --red #FF3B30 / text #D70015;
--blue #007AFF / text #0060DF; --yellow #FFCC00; --purple #AF52DE.
glass (light): background rgba(255,255,255,.62); backdrop-filter: blur(24px) saturate(180%) (+ -webkit-);
box-shadow: inset 0 1px 0 rgba(255,255,255,.85), inset 0 0 0 .5px rgba(0,0,0,.06), 0 8px 30px rgba(0,0,0,.12).
dark: --bg #000000; --card #1C1C1E; --card-2 #2C2C2E; --fill rgba(120,120,128,.24); --fill-2 rgba(120,120,128,.36);
--sep rgba(84,84,88,.55); --label #FFFFFF; --label-2 #AEAEB2; --label-3 #8E8E93; accent default #FF9F0A when the prop is
the default; --accent-text #FFB340; --green #30D158; --red #FF453A / text #FF6961; --blue #0A84FF / text #409CFF;
--yellow #FFD60A; --purple #BF5AF2.
glass (dark): background rgba(40,40,44,.55); same blur with saturate(160%);
box-shadow: inset 0 1px 0 rgba(255,255,255,.14), inset 0 0 0 .5px rgba(255,255,255,.08), 0 8px 30px rgba(0,0,0,.55).
glass over video ("clear"): background rgba(0,0,0,.28); blur(16px) saturate(150%); white icons; inset highlight .18.
Active tab/selection "lens": capsule behind the active item, light rgba(120,120,128,.16), dark rgba(255,255,255,.14);
active icon+label colour = accent.

Patterns:
- Phone frame: one scroll container (full 390×844) with content padding-bottom ≈ 130 px so content scrolls UNDER the
  floating tab bar (the glass must visibly show content through it — place colourful content, e.g. the camera image,
  so that it can pass behind it).
- Floating tab bar: absolute, left/right 16 px, bottom 22 px, height 64, capsule, glass, 5 items (icon 24 + label 11/600),
  active item with the lens capsule. Above it on the right may float a separate round glass button (e.g. "+" or search) —
  optional, only if useful.
- Large title "Übersicht" (34 bold) with the greeting line under it in --label-2 ("Guten Morgen · 14 °C, teilweise
  bewölkt"); when the content is scrolled > 40 px a glass nav bar fades in at the top (height 52) with the small centred
  title (Headline) — implement with an `onScroll` handler that only setStates when the flag flips.
- Summary chips: horizontally scrolling row of glass capsules (icon + text, 15 px, tabular numbers), state colour only on
  the icon (e.g. lights icon in accent when > 0 on, open windows icon in yellow/red).
- Device tiles (Apple-Home-like): 2 columns on phone, height 76, radius 22, --card. Left a 36 px circle: OFF = --fill with
  --label-2 icon, ON = accent circle with white icon; name (Subhead semibold, --label) + state ("An · 80 %", "Aus") in
  Footnote --label-2. Tapping the icon circle toggles; tapping the rest opens the detail sheet (licht).
- Grouped inset lists (Mehr, Sicherheit, Klima rows): --card, radius 26 (outer), rows 52 px, 0.5 px --sep inset 56 px,
  trailing value in --label-2 + chevron.
- Sheet: dim scrim rgba(0,0,0,.25) (dark .45), sheet from bottom with top radius 34, glass-tinted --card at 92 %, grabber
  36×5 capsule --fill-2 centred 6 px from top, header row: title (Headline) + round glass close button (×). Light sheet:
  big vertical capsule slider 120×300 (radius 30) with accent fill at 80 % from the bottom and a sun icon, value "80 %"
  (Large Title), segmented control "Weiß | Farbe", 4 colour-temperature dots, a row "Eingeschaltet seit 09:38".
  Clicking the slider sets the level from the click position (event `nativeEvent.offsetY`), clicking the scrim or ×
  closes. Garage sheet: status "Geschlossen" big with green icon, capsule button "Öffnen" (accent) with the note
  "Öffnen fragt immer nach", last change "09:12".
- Kameraseite (screen "kamera", dark): full-bleed video area (the camera frame, object-fit cover, ~ 390×293 at top
  under a glass nav bar with back chevron + "Einfahrt" + red "LIVE" capsule), floating clear-glass control capsule over
  the bottom of the video (−15 s, play/pause, +15 s, "1×") and a round clear-glass mute button bottom-right; below: segmented
  control "Zeitleiste | Ereignisse", a compact vertical timeline/event list with the 3 thumbnails (radius 12) and times,
  a date capsule "Heute" bottom-left floating glass. Back button returns to "nvr".
- NVR screen ("nvr"): large title "NVR", camera card (image, radius 26, overlay glass capsule "Einfahrt ●" top-left and
  "63 heute · vor 19 Min." bottom-left) → tap opens "kamera"; "Ereignisse" horizontal row of the 3 thumbs (radius 16) with
  time + class capsule.
- Pool screen: large title "Pool"; hero card with a ring showing "Läuft" and "noch 1 h 20 min"; segmented control
  "Aus | Automatik | Manuell" (Automatik selected, glass lens style); tiles Solar 31,5 °C / Wasser 24,8 °C /
  Laufzeit heute 3 h 20 min; a minimal 7-day bar chart in accent (bars only, day labels Mo–So, values from 2,0 to 4,5 h).
- Mehr screen: large title "Mehr", grouped inset lists: [Musik, Sicherheit, Energie, Geräte] [Automationen, Szenen,
  System] [Einstellungen] with tinted 30 px rounded-square icons (iOS Settings style — the ONLY place with coloured icon
  squares), plus a footer "Version 1.3.2 · F20" in Footnote --label-3.
- Räume screen: large title "Räume", 2-column room cards (--card, radius 26, height 96: name Headline, status Footnote,
  small state icons) → Wohnzimmer opens "raum". Raum screen: back chevron glass button + large title "Wohnzimmer",
  subtitle "21,5 °C · 48 % · 3 Lichter an", scene capsules row, sections "Licht", "Klima", "Rollläden", "Medien",
  "Sensoren" using tiles / grouped lists as above.
- Desktop (1440×1000, iPadOS-26-like): floating glass sidebar inset 12 px from top/left/bottom, width 260, radius 28,
  over a content area that extends BEHIND it (content starts at x≈296 but the page background runs full width);
  sidebar: app mark + "HAPulse", nav items 40 px with lens selection, footer status "Alle Systeme normal" with green
  dot; collapse button. Main: large title "Übersicht" + greeting line, glass toolbar capsule top-right (weather, bell with
  badge, avatar "A"); summary chips row; then a masonry-like grid (3 columns, gap 20) of borderless --card cards
  (radius 26, padding 20): Wohnzimmer (big, spans 2: temperature, humidity, light tiles row, thermostat capsule ±),
  Szenen (2×2 tinted-icon tiles — scenes may keep a tint, they are actions), Geräte (tiles), Klima (simple ring gauge in
  --blue/--accent + room rows), Sicherheit (grouped rows with status dot colour only when not normal), Sentinel NVR
  (camera image spanning the card width, glass overlays), Müllabholung (rows with coloured bin dot + date), Pool
  (status + mini bars), Aktivität (grouped list). Clicking a light tile icon toggles it; clicking a light tile opens a
  centred glass "sheet" (desktop form: centred card 420 wide, radius 34) with the same light controls; sidebar items
  only change the selection highlight + the large title text (content stays Übersicht — that is fine for a sketch).
