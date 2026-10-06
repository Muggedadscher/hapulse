# Spec "Glas 5" — user feedback on Glas 4 (binding)

Base = Glas 4 (SPEC4 + all its user decisions stay valid unless changed here). Files: project/Glas5Handy.dc.html
(prefix g5-) and project/Glas5Desktop.dc.html (prefix gd5-) — copies of Glas 4; revise IN PLACE.
Reference for "Glas 3 cards": project/Glas2Handy.dc.html and project/Glas2Desktop.dc.html (these files ARE Glas 3),
screenshots shots/g3h-*.png and shots/g3d-*.png. Glas 4 screenshots: shots/g4h-*.png, g4d-*.png.

User ranking: Glas 4 best thought-through; Glas 3 visually calmest and cleanest. Keep Glas 4's thinking, adopt
Glas 3's calm look.

## Keep from Glas 4 (user praised these explicitly — do not lose)
- "Hinweise" (2 Fenster offen, Restmüll morgen) near the top.
- Detail sheet / inspector with history 24H/7D/30D + logbook.
- Lights sheet grouped by room with "Alle ausschalten".
- Scenes show which one is "Aktiv".
- Energy chart distinguishes Netz vs Solar (stacked bars + legend).
- Everything else from SPEC4 (all chips + their sheets, context menu, swipe actions, inspector on desktop, …).

## Changes
1. Phone header (too full in Glas 4) → calm like Glas 3:
   - Top right ONLY the avatar (glass circle 40 px) with a small red dot when there are notifications. Tapping it
     opens a glass menu that morphs from the avatar: "Mitteilungen (3)" → notifications sheet, "Bearbeiten",
     "Einstellungen". Remove the separate weather pill and the tool capsule (pencil/bell).
   - Large title "Guten Morgen, Anna"; directly under it the weather line "☀ 14 °C · teilweise bewölkt ›" in
     secondary text (tappable → weather sheet). The HAPulse subtitle sentence is dropped on phone (weather line
     replaces it; keep it on desktop).
   - Order: greeting → chips row → Hinweise → rest. Generous spacing (Glas 3 rhythm).
   - Add sheet/menu prop value "avatar" (shows the open avatar menu).
2. Cards: use the Glas 3 CARDS everywhere (look AND behaviour) — Szenen, Wohnzimmer/Hauptraum, Energie, Geräte,
   Klima, Rollläden, Sicherheit, Müll, NVR, Aktivität, Räume. Take each card's markup/structure from the Glas 3 files
   and port it. Rules:
   - Wohnzimmer card: Glas 3's clean card, no room-type gradient.
   - Energie: Glas 3 layout (two big figures 8,4 kWh Verbrauch / 12,1 kWh PV-Ertrag + chart) BUT the chart shows
     Netz vs Solar like Glas 4 (stacked, neutral grey for Netz, yellow for Solar, small legend).
   - Geräte: Glas 3 style (list rows with iOS switches on desktop; on phone use Glas 3's phone device presentation).
     Row tap → detail, switch → toggle.
   - If a Glas 3 card lacks a HAPulse function required by SPEC4 (climate room selection + "Alle anzeigen", blinds
     Zu/Stopp/Auf + "Alle anzeigen", waste next-up + bin sheet, NVR event → camera at that moment, room status icons,
     security rows), add it IN Glas 3's visual style.
   - Titles above the cards remain (SPEC4).
3. Chips: plain capsules without tinted circles behind icons; colour only on the icon glyph itself (state colour),
   text in --label / --label-2.
4. Less colour overall: icons in Hinweise rows and next to section titles are monochrome (--label-2); colour only for
   real states (light on, open window warning, alarm, heating, pool running, active scene).
5. Contrast (applies everywhere, especially light mode on glass and tinted tiles; the user reads on an iPad in
   daylight):
   - Secondary text --label-2 must be ≥ 4.5:1 on EVERY surface it sits on (white card, #F2F2F7, glass over content,
     tinted tiles). Use #5F5F64-ish in light (check), #AEAEB2+ in dark; tertiary text only ≥ 3:1 at ≥ 15 px or use
     --label-2.
   - Scene / category icons: use ink variants with ≥ 3:1 against their actual background (e.g. purple #8944AB,
     indigo #3634A3, orange ink #B25000, teal ink #0A7389, yellow ink #8F6C00 on light); never light lilac/grey icons
     on light glass. Inactive scene circles: --fill background with the ink-coloured glyph.
   - Verify by computing contrast for the real colour pairs (write a small node script) AND by looking at light-mode
     screenshots.
6. Desktop: same card/colour/contrast changes; header stays as in Glas 4 (it is not crowded there), chips without
   circles.

Verification as before: local renderer (SPEC3 §0), screenshots light + dark of overview top, scrolled, avatar menu,
lights sheet, detail; check_dc 0 errors; update verify scripts (verify_g5.js / verify_gd5.js) by copying and adapting
verify_g4.js / verify_gd4.js. Screenshots: shots/g5h-*.png, shots/g5d-*.png.
