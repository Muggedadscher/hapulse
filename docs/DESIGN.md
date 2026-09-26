# HAPulse — Design System (v2 "Daylight")

A clean, light-first smart-home dashboard. Calm, spacious, card-based — closer to a premium consumer app than a power-user panel. Reference: the attached Overview + mobile mockups.

## Theme architecture (IMPORTANT — read before any color work)

Theming is **identity × mode**:
- **Theme identity** = a color family: `aurora` (default, neutral surfaces + orange accent — matches the mockups), `sunset` (warm amber), `ocean` (cool blue), `forest` (green). Defined in `src/theme/themes.ts`, each with a **light** and **dark** token set.
- **Mode** = `light | dark | auto` (auto follows the OS). Settable in Settings.
- `applyTheme(name, mode, accentHue)` writes every token as an inline CSS var on `:root` and sets `data-theme` + `data-mode`. Components NEVER hardcode colors or key off a specific theme — they only read CSS variables, so they work across all identities and both modes automatically.

### Tokens (CSS variables — use these, never literals)
- Surfaces: `--bg` (page), `--bg-raised` (sidebar/sheets), `--bg-card`, `--bg-card-hover`, `--bg-subtle` (icon chips, inputs, segmented controls).
- Text: `--text`, `--text-dim`, `--text-faint`.
- Accent (primary = **lights/energy**): `--accent`, `--accent-soft` (tint bg), `--on-accent` (text on accent).
- Borders: `--border` (solid card border — the light look leans on hairline borders + soft shadow, not heavy elevation), `--line` (alpha divider).
- **Semantic colors** (each has a `-soft` tint variant for icon chips/badges):
  - `--positive` / `--positive-soft` = **green** — confirmation, armed-ok, "all systems normal", success.
  - `--danger` / `--danger-soft` = **red** — errors, alerts, triggered alarm, destructive (Log Out), open door/window warnings.
  - `--warning` / `--warning-soft` = amber — caution, pending.
  - `--info` / `--info-soft` = **blue** — climate / cooling / AC / speakers (cool category).
- Shadows: `--shadow-card` (resting, soft), `--shadow-elevated` (popovers/modals/hero), `--shadow-active` (on/active glow).
- Radii: `--radius-card` (20px), `--radius-control` (12px), `--radius-pill` (999px).

### Color semantics (apply consistently)
- **Lights & energy → accent (orange).** Light toggles use accent when on; energy bars/figures use accent.
- **Climate / AC / cooling / audio → `--info` (blue).** Climate gauge fill, AC icons, speaker icons.
- **Security OK / confirmations → `--positive` (green).** Armed/secure states, "normal" dots, success.
- **Errors / attention / destructive → `--danger` (red).** Open doors when it matters, triggered, Log Out.
- Device/category icons sit in a rounded square chip tinted with the matching `*-soft` token (e.g. a light icon in `--accent-soft`, an AC icon in `--info-soft`).

## Layout

- **Desktop (≥ 900px):** left **sidebar** (~240px, `--bg-raised`): logo top, vertical nav list with icon + label, active item = a filled rounded-rect using `--bg-subtle`/`--accent-soft` with accent icon/text. A "Home Status" pill near the bottom (green check + "All systems normal") and a collapse chevron. Main area: a generous **widget grid** of cards (≈ 3 columns, cards span 1–2 cols; a large hero room card spans 2). 32px padding, max-width ~1400px.
- **Mobile (< 900px):** bottom **tab bar** — the first four visible nav items (fork default: Overview, Rooms, NVR, Pool) plus "More" — `--bg-raised`, blur, active = accent. Single-column stacked cards. Header: logo + greeting, then a weather row + avatar.
- Header (both): greeting "Good morning, {name} 👋" (display font, bold) + subtitle; right side weather glance, notification bell, round avatar.

## Components / patterns (from the mockups)

- **Cards:** white (`--bg-card`) surface, `--border` hairline, `--shadow-card`, `--radius-card`. Section title top-left, optional action link top-right ("All Devices ›", "See All ›").
- **Hero room card:** large card with a room photo background + dark gradient scrim; white title + device count; top-right glance chips (temp, humidity, air quality); bottom row of frosted control pills (Lights/AC/Speaker) with the right semantic color per device.
- **Device/list rows:** icon chip (category-tinted) + name + location/subtitle, control on the right (accent toggle, ± stepper, or status tag like "Docked"/"Locked").
- **Toggles:** pill switch; ON = `--accent` track. **Steppers:** − / + round buttons around a value. **Sliders:** thick track, accent fill.
- **Climate gauge:** circular arc (accent or info), big temp in the center, mode + ± below.
- **Stat/energy widget:** big number (display font) + delta in green/red + a small bar chart in accent.
- **Scene tiles:** 2×2 grid; each = icon chip (semantic-tinted: Good Morning amber/sun, Relax green/leaf, etc.) + label.
- **Music player:** album art (rounded), title/subtitle, scrubber with elapsed/remaining (data font), transport (prev / play-pause big circle / next), volume slider, preset chips.
- **Settings list:** grouped rows (icon + label + chevron / value); destructive "Log Out" in `--danger`.
- **Status pills/dots:** small colored dot + label using the semantic colors.

## Typography (unchanged)
- Display: **Bricolage Grotesque** — greetings, page/section titles, big numerals.
- Body/UI: **Schibsted Grotesk** — labels, rows, buttons.
- Data: **Spline Sans Mono** (`.data-font`, tabular-nums) — clock, sensor values, energy figures, music time.

## Motion
- `.stagger-rise` page-enter (staggered children). Toggles/steppers 160–180ms ease-out. Press feedback `scale(.98)`. Modals/popovers fade+scale (bottom-sheet on mobile). Respect `prefers-reduced-motion`.
- No grain texture in light mode (dark-mode only, ~2.5% — `:root[data-mode='dark'] body::after`).

## Accessibility
- Contrast ≥ 4.5:1 in BOTH modes (token palettes are tuned for this — don't darken dims further on light). 44px hit targets. `:focus-visible` accent ring. Keyboard-operable controls and menus.

## Scope note (v2 rollout)
Restyle existing surfaces first: shell/nav, Home (as the rich Overview), Rooms, Room, Music, Security, Settings. Sidebar also lists Devices / Automations / Energy / Scenes — render these as styled **"coming soon"** placeholder routes for now (not yet functional).
