# HAPulse

A calm, modern dashboard for Home Assistant.

HAPulse is a fully client-side single-page app that connects directly to your Home Assistant instance over WebSocket. Your credentials never leave your browser — all communication goes from your device straight to your HA server.

---

## Features

- **Rooms from HA areas** — your floor plan, built automatically from Home Assistant's area registry
- **Live updates over WebSocket** — entity state changes reflect instantly, no polling
- **Home** — greeting, live clock, weather hero, and summary chips (lights on, doors open, people home, media playing) each with a tap-to-drill modal
- **Room pages** — entities grouped by domain (Lights, Climate, Media, Covers, Switches, Sensors) with toggles, sliders, and favorites
- **Music** — full Now Playing card with artwork, progress bar, volume, and transport controls for every media player
- **Security** — alarm panel, camera snapshots, door/window sensors, locks, and motion sensors in one view
- **Automations & Scenes** — toggle automations and activate scenes directly from the dashboard
- **Energy** — live consumption, solar production, and grid flow using Home Assistant's long-term statistics
- **System** — CPU, RAM, and disk metrics from the System Monitor integration, battery levels for all devices, and a health indicator in the sidebar
- **Four themes** — Aurora (warm dark, default), Sunset, Ocean, Forest — each with light, dark, and auto (OS) mode
- **Seven languages** — German, English, Spanish, French, Italian, Portuguese and Swedish. Left on Auto, HAPulse follows your Home Assistant language, then your browser's; entity states come from Home Assistant's own translations
- **Full edit mode** — drag to reorder, resize, and hide any section or card on every page
- **Settings stored in your Home Assistant** — your layout and customization are saved to HA's per-user storage, so they survive browser storage being cleared and sync live across every device you use with the same HA login
- **Settings export / import** — back up your entire layout and customization to a JSON file; import it on any other browser or share with household members
- **Demo mode** — explore the full UI without a Home Assistant connection
- **Fully client-side** — tokens are stored only in your browser's `localStorage` and never sent anywhere except your own HA instance
- **PWA-ready** — installable on desktop and mobile

---

## Screenshots

| | |
|---|---|
| ![Home](screens/home.png) | ![Room](screens/room.png) |
| ![Security](screens/security.png) | ![Automations](screens/automations.png) |

---

## Quick start

### Hosted — try it instantly

The quickest way to use HAPulse is the **[hosted version](https://pulse.homeassistant-dashboard.com)** — no setup, no maintenance, always up to date. Create an account, connect your Home Assistant, and you're done. Even on the hosted version your Home Assistant access token is never stored on the server — it stays in your browser. Subscriptions also help fund ongoing development.

Want to look around first? **[Explore the live demo](https://pulse.homeassistant-dashboard.com/demo)** — no account or Home Assistant required.

### Docker (recommended for self-hosting)

Prebuilt images are published to GitHub Container Registry — nothing to clone or build:

```bash
docker run -d --name hapulse -p 7421:80 --restart unless-stopped ghcr.io/jlnbln/hapulse:latest
```

Or with Compose, using the file in this repository:

```bash
docker compose -f docker/docker-compose.yml up -d
```

Then open [http://localhost:7421](http://localhost:7421).

> Port 7421 is used by default to avoid conflict with Home Assistant's port 8123.

Tags: `latest` tracks `main`; `1.1.0`, `1.1` and `1` track a release, its patch line
and its major line. See [docs/SELF-HOSTING.md](docs/SELF-HOSTING.md) for updating,
reverse proxies and TLS.

### Run from source

Requirements: Node ≥ 20, npm ≥ 10.

```bash
git clone https://github.com/jlnbln/HAPulse.git
cd HAPulse
npm install
npm run dev
```

The dev server starts at [http://localhost:5173](http://localhost:5173).

---

## Connecting to Home Assistant

### Recommended: sign in with your Home Assistant account

HAPulse uses **Home Assistant's own OAuth2 login page** — your password never touches HAPulse.

1. On the onboarding screen, enter your HA URL (e.g. `http://homeassistant.local:8123`).
2. Click **Sign in with Home Assistant** — your browser is redirected to your HA login page.
3. Sign in with your HA credentials (including MFA if enabled).
4. HA redirects you back to HAPulse, now fully connected.

Tokens are stored only in your browser's `localStorage` and auto-refreshed — no re-login needed while the session is active. Sign out from **Settings → Connection** to revoke the token.

**Multi-user households:** each person signs in with their own HA account in their own browser. No shared secrets, no shared sessions.

### Advanced: long-lived access token

Expand **"Advanced: connect with an access token"** on the onboarding screen to connect with a long-lived token instead.

1. In Home Assistant, go to your profile → **Security** → **Long-Lived Access Tokens**.
2. Click **Create token**, give it a name (e.g. "HAPulse"), and copy it.
3. Paste your HA URL and the token into HAPulse's advanced form.

---

## Setting up HAPulse

HAPulse reads your Home Assistant configuration directly — the better organized your HA is, the better HAPulse looks out of the box. Follow these steps for the best experience.

### 1. Prepare Home Assistant

Do this before logging into HAPulse for the first time.

**Rooms and areas**
- Create an area in Home Assistant for every room you want to appear in HAPulse (**Settings → Areas, Labels & Zones**).
- Give each area a meaningful name and an icon.
- Optionally if you want a picture as the background for the Room Hero Card, upload one to your area via Home Assistant. 
- Assign every entity and device to its room. Entities that are not assigned to any area will not appear on Room pages (you can still manage them via Settings → Edit Entities in HAPulse).

**Entity names**
- Rename entities to something readable before you start — HAPulse displays the `friendly_name` exactly as set in HA. "Living Room Ceiling Light" is much better than the default `light.sonos_living_room_sl_2`.

**Person entities and pictures**
- Create a User in Home Assistant for each household member who will use HAPulse (**Settings → People**).
- Upload a profile picture for each person — it appears on the Home page summary chip modal.

**Energy page (optional)**
- If you want to use the Energy page, complete the Energy Dashboard setup in Home Assistant first (**Settings → Dashboards → Energy**). HAPulse reads the same long-term statistics HA uses for its own energy dashboard.

**System Monitor integration (optional)**
- If you want CPU, RAM, and disk metrics on the System page, add the **System Monitor** integration in Home Assistant (**Settings → Devices & Services → Add Integration → System Monitor**). No further configuration is needed — HAPulse detects the integration automatically.

---

### 2. Log in to HAPulse

Open HAPulse and sign in with your Home Assistant account (or access token). HAPulse will automatically import your areas, entities, and registry — your rooms will appear immediately.

If you don't have a Home Assistant instance yet, click **Explore the demo home** on the onboarding screen to tour the full UI with realistic sample data.

---

### 3. Customize HAPulse

Once logged in, use **Edit Mode** to tailor every page to your preference.

**Enable Edit Mode**
- Open **Settings** and toggle **Edit Mode** on. A pencil icon appears in the header of every page.
- While editing, you can drag sections to reorder them, drag the resize handle to change how wide a card is, and click the eye icon to hide sections you don't need.
- Toggle Edit Mode off when you're done — hidden sections disappear and the layout locks in place.

**Home page**
- Hide or reorder the summary chips row, weather card, and rooms grid.
- In the summary chip modals (e.g. Lights), you can hide individual entities that you never want counted.

**Room pages**
- On each Room page, hide entity cards that clutter the view (guest room motion sensor, diagnostic sensors, etc.).
- Tap the star icon on any entity to add it to the room's Favorites section at the top.
- Reorder sections to match how you think about each room.

**Music, Security, Automations, Scenes, Energy, System pages**
- Same pattern: drag to reorder, resize, and hide sections. The layout persists per page.

**Edit Entities (Settings)**
- Go to **Settings → Edit Entities** to manage entities that aren't assigned to any room. You can hide them globally here so they never count toward chip totals or appear anywhere in the app.

---

### 4. Export your settings

HAPulse stores your customization locally in the browser. To use the same layout on another device or browser — or to share it with another household member — export it:

1. Go to **Settings → Data**.
2. Click **Export Settings** to download a `.json` file.
3. On the other device, open HAPulse, go to **Settings → Data**, and click **Import Settings**.

Anyone who imports your settings file gets the same layout, hidden entities, favorites, and section order. Each person can still make their own changes from there.

---

## Important networking note

**HAPulse connects from your browser directly to Home Assistant** — the nginx container only serves the static files; it is not a proxy.

This means:

- The HA URL you enter must be **reachable from the browser** that opens HAPulse, not just from the machine running Docker.
- If you serve HAPulse over **https**, the browser will block connections to an `http://` HA URL (mixed content). In that case your HA must also be on **https/wss** — use a [Nabu Casa](https://www.nabucasa.com/) remote URL, or set up a reverse proxy with a valid TLS certificate in front of HA.
- If you access HAPulse over plain **http** on your LAN, there is no restriction — `http://homeassistant.local:8123` works fine.

---

## Monorepo structure

| Path | Package | Description |
|---|---|---|
| `packages/core/` | `@hapulse/core` | Framework-agnostic TypeScript: HA connection, registries, rooms, energy, demo data |
| `apps/dashboard/` | `@hapulse/dashboard` | Vite + React 19 SPA (the product) |
| `docker/` | — | Dockerfile, nginx.conf, docker-compose.yml |
| `docs/` | — | PLAN.md, DESIGN.md |

---

## Roadmap

| Phase | Description | Status |
|---|---|---|
| v0.1 | Self-hosted Docker release — core pages, themes, edit mode, export/import | Done |
| Phase 7 | Hosted cloud version — landing page, Supabase auth, Stripe subscriptions, settings sync | Planned |
| Phase 8 | iOS and Android apps via Expo, sharing `@hapulse/core` and SaaS accounts | Planned |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).
