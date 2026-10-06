# Spec "Glas 3": realistic glass + full iOS-26 motion + visual QA

Applies on top of SPEC.md (format rules section 2 — still binding, they fail silently) and SPEC2.md (Apple rules —
keep everything that is right). Revise IN PLACE: `project/Glas2Handy.dc.html` and `project/Glas2Desktop.dc.html`
(keep file names, class prefixes g2-/gd2-, all props and wrapper contracts). Checker must stay at 0 errors.

## 0. You can now RENDER (the user asked for a full visual re-check)
- A static server already serves ROOT/../render on http://localhost:8765/ ; the artboard files there are SYMLINKS to
  ROOT/project/*.dc.html, so your edits are live. `support.js` there = the canvas runtime; `/_blob/<id>` images work.
  If the server is down: `cd <scratchpad>/render && python3 -m http.server 8765 &`.
- Screenshot: `cd <scratchpad> && NODE_PATH=$(npm root -g) node shot.js <File.dc.html> <w> <h> shots/<name>.png`
  (prints console errors; waits 2.5 s). Wrapper artboards (e.g. Glas2-Sheet.dc.html, Glas2Handy-Dunkel.dc.html,
  Glas2-Kamera.dc.html, Glas2Desktop-Dunkel.dc.html …) show the other states. View PNGs with the Read tool.
- For interaction/animation checks write your own Playwright scripts in the scratchpad (chromium at
  /opt/pw-browsers/chromium is found automatically; use NODE_PATH=$(npm root -g)): click, scroll the inner scroll
  container, take screenshots at 0/80/160/320 ms to verify an animation actually moves, record console errors.
  The artboard is rendered inside the page's DOM (no iframe) — find elements by class/aria-label.
- Linux has no SF Pro: screenshots use a wider fallback font. Leave ~10 % width headroom so text does not truncate
  with SF either; but do fix truncations you see ("Morgen h…", "Abendes…", "Sicherheit & Kame…").
- Do the loop: render every state → critique like an Apple design lead → fix → re-render. Minimum: light + dark
  of every screen/sheet the wrappers show, plus scrolled states.

## 1. Glass that looks real (works in Safari — NO SVG refraction, it is Chromium-only and not on iPhone)
Liquid Glass reads as a thick clear lens, not frosted paper. Recipe for the REGULAR variant (light; adapt dark):
- Backdrop: `-webkit-backdrop-filter` and `backdrop-filter`: `blur(calc(6px + 10px*var(--glass-tint))) saturate(210%)
  brightness(1.06)` (dark: brightness(.9), saturate(180%)). Low blur + strong saturation = colourful, lively glass.
- Fill: `linear-gradient(180deg, rgba(255,255,255,calc(.30 + .40*var(--glass-tint))), rgba(255,255,255,calc(.14 +
  .40*var(--glass-tint))))` on `padding-box` (dark: rgba(40,40,44,…) .30/.20 + tint).
- Rim (specular edge, the key cue): `border: 1px solid transparent` + second background layer on `border-box`:
  `linear-gradient(135deg, rgba(255,255,255,.95) 0%, rgba(255,255,255,.35) 22%, rgba(255,255,255,.06) 50%,
  rgba(255,255,255,.30) 78%, rgba(255,255,255,.85) 100%)` (dark: same with ~.55 max).
- Thickness: `box-shadow: inset 0 1px 1.5px rgba(255,255,255,.75), inset 0 -1.5px 3px rgba(255,255,255,.22),
  inset 0 0 16px rgba(255,255,255,.18), inset 0 -12px 20px -14px rgba(0,0,0,.10), 0 1px 2px rgba(0,0,0,.08),
  0 12px 32px rgba(0,0,0,.14)`; plus iOS 27's slightly darker outer contour `0 0 0 .5px rgba(0,0,0,.10)`.
- Lensing hint (allowed fake): a 1–2 px brighter inner band just inside the rim at top-left and bottom-right
  (a `::before` with a radial-gradient), so the edge looks curved.
- Interaction "flex" (Liquid Glass responds to touch): on pointer down a glass control scales to 1.04–1.08 with a
  spring and a soft light glows from the touch point: set `--gx/--gy` (px) from `nativeEvent.offsetX/Y` on
  pointerdown and paint `radial-gradient(120px circle at var(--gx) var(--gy), rgba(255,255,255,.45), transparent 60%)`
  in a `::after` layer that fades in 120 ms / out 400 ms; release springs back with a small overshoot.
- Legibility: text/icons on glass keep ≥ 4.5:1 against the WORST background that can pass behind (verify by
  rendering over the camera image and over white cards). If needed raise fill alpha only behind text (e.g. the
  medium sheet uses tint ≥ .6), never add a hard bar.
- CLEAR variant over media (camera): blur 4px, saturate 160%, fill rgba(0,0,0,.20) + local 35 % dimming behind, same
  rim at lower strength, white glyphs.
- Glass needs something behind it: make sure content actually scrolls under the tab bar / sidebar so the material
  is visible in the first frame where sensible (e.g. the camera strip passes behind on scroll; on desktop the camera
  band extends under the sidebar). Add a tweak `hintergrund` enum "grau" | "bild" (default "grau"): "bild" = Home-app
  style wallpaper — the camera frame `/_blob/8ae29bb6f0522a5160781e5c8a6e133d` as page background, heavily blurred
  (`filter: blur(40px) saturate(140%)`, scaled 1.2, darkened/lightened so text on it keeps contrast) with content
  tiles on it as STANDARD content material (opaque-ish card at 82–88 %, not Liquid Glass). This shows the glass at its
  best and mirrors the Home app wallpaper.

## 2. Motion — "alles wie iOS 26"
Use springs, not plain ease curves. Define in helmet CSS (generate values; bounce ≈ 0 for most, small bounce for
playful bits):
  `--spring-smooth: linear(…)` (≈ 0.5 s, no overshoot), `--spring-snappy: linear(…)` (≈ 0.35 s, ~4 % overshoot),
  `--spring-bouncy: linear(…)` (≈ 0.6 s, ~10 % overshoot). Compute the linear() points from a damped spring in a
  node script (≥ 20 points) and paste them. Durations: --d-snappy .35s, --d-smooth .5s, --d-bouncy .6s.
Everything below must really animate in Chromium (verify with timed screenshots):
1. Tab bar: the selection lens SLIDES to the new tab (translateX with --spring-snappy) and stretches slightly while
   moving (scaleX 1.12 at mid-flight via a keyframe), the newly selected icon does a quick fill + scale 1→1.15→1.
2. Tab bar minimizes on scroll down: width/scale morph into a small capsule with only the active icon (labels fade
   first), expands with a spring on scroll up; search button stays round and slides along.
3. Search: tapping the round search button MORPHS it into the bottom search field (circle widens to the field,
   radius stays capsule, icon slides left, placeholder fades in), the tab bar shrinks/fades away; "Abbrechen"
   reverses it.
4. Navigation push/pop: pushed screens (raum, mehr, kamera from list) slide in from the right (100 % → 0) while the
   previous screen moves -25 % and dims; back reverses. Keep both screens mounted during the transition (state
   `{prev, dir, anim}` cleared by setTimeout after the duration). Tab switches crossfade (150 ms) with a 6 px rise.
5. Large title collapses progressively with scroll: title scales/fades (0–60 px), the small centred title fades in,
   the scroll-edge effect fades in — scroll-linked (store a rounded scroll value in state, only on change; or use
   CSS scroll-driven animations with an IntersectionObserver-free fallback).
6. Sheets: rise with --spring-smooth from the bottom, scrim fades; opened from a tile/chip they MORPH from that
   element (start at its rect: translate + scale + radius 22 → 40), close reverses back into it (keep mounted during
   exit). Detent change (grabber) animates height/inset/radius with a spring; drag on the grabber follows the finger
   (pointer events) and snaps to medium/large or dismisses below a threshold.
7. Camera: tapping the camera tile ZOOMS the image from the tile into the full-screen camera view (shared element:
   animate the image box from the tile rect to full width), × reverses into the tile.
8. Tiles: toggling animates the circle fill (yellow) with a pulse 1→1.12→1 (--spring-bouncy) and crossfades the tile
   surface/shadow; scenes: activating plays a short ring sweep + fill.
9. Press feedback: content tiles/rows scale .97 (smooth spring back); glass controls use the flex + glow from 1.
10. Slider: fill animates on click (snappy), follows the pointer exactly while dragging (no transition), capsule grows
    to 1.04 while dragging; percentage digits roll (old value slides up/out, new slides in).
11. Segmented controls: lens slides with --spring-snappy.
12. Thermostat ±: number rolls up/down; the heating ring/arc animates to the new value.
13. Screen enter: content sections rise 8 px + fade, staggered 25 ms (max 6 steps), only when a screen appears.
14. Glass appears by "materializing" (scale .92 → 1, blur 8px → 0 on the element, opacity 0 → 1, spring), never by a
    plain fade.
15. Desktop: sidebar collapse/expand with a spring (transform/width), lens slides between sidebar items, tiles lift
    on hover (translateY -1px + shadow), sheet morphs from the clicked tile, edit mode: handles/badges scale in with
    stagger, tiles wiggle very subtly (±0.6°) like iOS edit mode, "Bearbeiten" morphs into "Fertig".
16. `prefers-reduced-motion: reduce`: all movement → 200 ms crossfades, no scale, no bounce, no wiggle.
Implementation rules: only transform/opacity/filter/clip-path/border-radius animate (no layout thrash; height only
for the sheet detent); no global keydown handlers; timers cleared in componentWillUnmount; everything still renders
correctly in its first frame for every wrapper prop set (no element stuck mid-animation or invisible).

## 3. Full re-check ("alles nochmal überprüfen")
Besides glass and motion, fix whatever the screenshots show: truncation, overlaps, cut-off rows, uneven spacing,
alignment to the 8-pt grid, weak hierarchy, colours that break SPEC2 B, contrast. Keep Apple rules from SPEC2 A
(≤ 3 glass surfaces at rest, no glass on glass, scroll-edge effect, content opaque).
