# Changelog

All notable changes to HAPulse are recorded here.

<!-- Generated from packages/core/src/changelog.ts by `npm run changelog`.
     Edit that file, not this one — this file is overwritten. -->

## 1.1.1 — 2026-08-23

_Fixes for translated installs, colour lights and deep links_

### Fixed

- System Monitor readings — the sidebar health indicator, the CPU/RAM/disk chips and the System page — were blank on every non-English Home Assistant, because the sensors were being matched by their English names
- Colour-capable bulbs now have a colour slider. A light reporting both a colour mode and colour temperature previously offered only warmth, with no way to change its colour
- Opening Scenes, Security, Energy, Automations or System directly — from a bookmark, a refresh or a shared link — laid the page out without its grid styling

## 1.1.0 — 2026-08-23

_HAPulse speaks seven languages_

### Added

- HAPulse is now available in German, English, Spanish, French, Italian, Portuguese and Swedish
- A language picker in Settings → Appearance. Left on “Auto”, HAPulse follows your Home Assistant language, then your browser’s
- Entity states (Sunny, Heating, Armed home, …) are translated by Home Assistant itself, so they match the language of the rest of your setup
- The sidebar wordmark and logo icon can be renamed and swapped in Settings → Appearance, and the browser tab follows
- This changelog — new releases announce themselves once, and the full history lives in Settings → About

### Fixed

- A brief network drop no longer signs you out of a Home Assistant OAuth session
- Dates, times and name sorting now follow the language you are using rather than always English
- Scenes now find their room through the device they belong to, so fewer of them land in “Other”
- Long lock names and the alarm state label no longer overflow their cards on narrow screens

## 1.0.0 — 2026-08-16

_First public release_

### Added

- A themeable Home Assistant dashboard that connects straight from your browser, over your Home Assistant account or a long-lived access token
- Home, room, devices, automations, energy, security, music, scenes and system pages
- Four colour identities, each in light and dark, with an adjustable accent
- Drag-to-reorder editing, hidden entities, favourites and per-room layout, saved to your Home Assistant and synced across your devices
- A demo home, so you can try everything before connecting anything
