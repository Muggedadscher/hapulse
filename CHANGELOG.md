# Changelog

All notable changes to HAPulse are recorded here.

<!-- Generated from packages/core/src/changelog.ts by `npm run changelog`.
     Edit that file, not this one — this file is overwritten. -->

## 1.3.2 — 2026-09-01

_Room name blends into the hero card again_

### Fixed

- On a height-capped Overview hero card, the room name no longer sits on an opaque block over the gradient or photo — the card now crops at the cap with the backdrop showing through, in normal view and in edit mode

## 1.3.1 — 2026-08-26

_Real covers on the hosted version_

### Fixed

- With the direct Music Assistant connection set up, the Now Playing card, the player list and the Zones now show the real album cover — fetched from the music provider itself — whenever the Home Assistant one cannot load on the hosted (https) version
- Artwork the browser would block anyway (http:// images on an https page) is skipped up front instead of producing a console warning per cover

## 1.3.0 — 2026-08-26

_Music Assistant, fully at home_

### Added

- A music library browser on the Music page when Music Assistant is set up: playlists, albums, artists, tracks and radio, with artwork, favourites, pagination and per-item queueing (play now, play next, add, replace)
- Search spans every provider Music Assistant knows — Spotify included — and results play directly on any of your speakers
- Speaker grouping: link speakers to play together, straight from the queue card — works for any integration that supports grouping
- A play queue card: what’s playing, what’s next, shuffle, repeat, and moving the queue to another speaker mid-play
- Connect Music Assistant directly (server URL + API token, one-time) and the queue becomes the full list — scroll it, drag tracks to reorder, remove them

### Fixed

- Album covers and artwork that cannot load — typically http:// images blocked on the hosted (https) version — now fall back to a tidy placeholder everywhere instead of a broken image
- Popovers (like the speaker group menu) no longer render underneath sections further down the page

## 1.2.0 — 2026-08-26

_Every entity gets a detail view_

### Added

- A detail view for every entity, like Home Assistant’s more-info dialog: current state, a history timeline (or a value chart for numeric sensors) switchable between 24 hours and 7 days, and the recent activity list
- Sensors open it with a tap; cards with controls (media, climate, covers, locks, vacuums) open it by tapping the card body; lights, switches and buttons open it with a press-and-hold — mouse and touch alike
- Cameras open a live view — the camera’s stream on top, its activity below — from any camera tile
- Group entities list their members in the detail view, and tapping a member opens its own details

### Fixed

- A room picture no longer breaks the hero card when the section has a custom height — the image could render at full size inside a scrolling card, or vanish entirely
- The alarm chip in the header now agrees with the Security page when a home has several alarm panels: the armed one wins over a stray disarmed one, and hidden panels are ignored everywhere
- The alarm dialog shows every alarm panel, not just the first one Home Assistant happened to list

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
