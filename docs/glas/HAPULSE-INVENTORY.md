# HAPulse fork: user-facing UI inventory (a checklist so nothing gets lost)

Source: `/home/user/hapulse` @ `09a7c4a` (upstream 1.3.2 + fork F20). Paths are relative to `apps/dashboard/src/` unless they start with `packages/`.
**[F]** = fork feature or fork change (must survive upstream merges and redesigns). **[U]** = upstream HAPulse.
Format: **Name** · `file` · what it shows and does · *Why it matters.*

Screens checked: `screens/home.png`, `room.png`, `security.png`, `automations.png` (all dark mode, desktop).

---

## 0. Cross-cutting principles to keep in any redesign

These apply on every page. A redesign that drops one of them loses behaviour everywhere at once.

1. **Every count, tone and label is live HA state.** Nothing is static. Colours carry meaning: accent/orange = lights and energy, info/blue = climate and audio, positive/green = OK, danger/red = open or alarm, warning/amber = caution or unreachable. Source: `docs/DESIGN.md`.
2. **Hidden entities are respected everywhere.** `customization.hiddenEntities` filters chips, modals, cards, counters, hero pills, waste bins and the alarm pick.
3. **Tap vs long press.** Tapping a read-only card opens the detail modal. On a card where tapping is the action (light, switch, button, scene), a 550 ms long press opens it instead (`components/cards/EntityCard.tsx`, `lib/useLongPress.ts`).
4. **Danger actions need confirmation.** Unlocking, opening a garage door or gate, alarm codes and restarting the pool device all ask first. Locking and closing run at once.
5. **Locale-aware numbers [F].** All shown numbers go through `formatNumber` / `formatEntityState`, so German users see "5,5" (`packages/core/src/numberFormat.ts`).
6. **Pages are customizable** through edit mode: reorder, hide, hide on mobile only, column span and height cap. Only HA admins can edit (`useCanEdit`), and only while Settings → Admin → Editing is on.
7. **Features appear only with data.** Pool, waste, NVR, garage, locks, alarm, energy and Music Assistant parts show up only when their entities or config exist. Without them the user sees either nothing or a helpful empty state.
8. **Seven languages** (de, en, es, fr, it, pt, sv) are in `packages/core/locales/*.json`. Plurals and ARIA labels are translated too.

---

## A. App shell and navigation (`app/AppLayout.tsx`, `app/AppLayout.css`)

1. **Sidebar (desktop ≥900 px)** · `app/AppLayout.tsx` · Fixed left column, 240 px wide. It holds the logo and wordmark, a vertical nav (icon + label, active item filled with accent), a status pill and a collapse chevron at the bottom. *Why: everything is one click away, and the active page is always visible.*
2. **Logo and wordmark (`PulseLogo`)** · `components/ui/PulseLogo.tsx` · Shows the chosen app symbol (pulse, home, sparkles, zap, star, heart, flame or leaf) and the custom app name. The icon can be hidden. *Why: users can brand their own install.*
3. **Collapsible sidebar rail** · `AppLayout.tsx` (`sidebarCollapsed`, DEVICE scope) · The chevron toggles between 240 px and a 72 px icon rail. In the rail, labels become tooltips. The state is remembered per device. *Why: more room for content on small laptops and tablets.*
4. **Nav item set and order [F]** · `NAV_CONFIG` in `AppLayout.tsx` · Overview, Rooms, **NVR [F]**, **Pool [F]**, Devices, Automations, Energy, Security, Music, Scenes, System, Settings. The fork places NVR and Pool after Rooms, and `stores/navOrderMigration.ts` moves them there for orders saved earlier. *Why: one place for every page, ordered by daily use.*
5. **"Rooms" is a popover, not a page** · `components/nav/RoomsMenu.tsx` · On desktop, clicking Rooms opens a menu to the right of the sidebar, lined up with the button. Each row shows the room's MDI icon, its name and a chevron. The list follows the user's room order and skips hidden rooms. Escape or a click outside closes it, focus returns to the trigger, and the first row gets focus on open. *Why: the fastest way to jump to any room.*
6. **Rooms menu as a bottom sheet on mobile** · `RoomsMenu.css` · The same list slides up above the tab bar. *Why: built for thumb use.*
7. **Nav edit mode** · `AppLayout.tsx` (`SortableGrid`, `EditBadge`) · In edit mode, sidebar items can be dragged into a new order and hidden with an eye badge. Overview and Settings cannot be hidden. *Why: users can trim the nav to what they actually use.*
8. **System status pill ("Home Status")** · `SystemStatusPill` in `AppLayout.tsx` · Sits in the sidebar footer and links to /system. Its state is one of:
   - healthy: green check, "All systems normal"
   - warning: amber, "System under load", "N unavailable" or "N low batteries"
   - critical: red, CPU/RAM/disk above 90 %
   - unknown

   Thresholds: CPU over 75 % or RAM/disk over 80 % is a warning, any of them over 90 % is critical. Low battery means ≤20 %. It hides when the System nav item is hidden. The screenshot shows "404 unavailable". *Why: one glance tells you whether the house is healthy.*
9. **Mobile bottom tab bar (<900 px)** · `AppLayout.tsx` `.app-tabs` · Fixed, blurred bar, 64 px plus the safe area. It shows the first four visible nav items in user order (fork default: Overview, Rooms, NVR, Pool) plus "More". With five or fewer visible items it shows them all. *Why: native-app style navigation on phones.*
10. **"More" menu** · `.app-more-menu` · A bottom sheet with the overflow nav items as rows (icon, label, chevron). It closes on a click outside, on Escape and on route change. *Why: every page stays reachable on a phone.*
11. **Desktop header cluster** · `HeaderCluster` in `AppLayout.tsx` · A floating row above the content:
    - a back button on room pages
    - the summary chips on every route, left-aligned
    - pinned right: weather glance, the edit toggle (room pages only), the notifications bell and the user avatar

    *Why: status and quick actions on every page without leaving it.*
12. **Back button on room pages** · `HeaderCluster` and `pages/Room.tsx` (mobile header) · A chevron that runs `navigate(-1)`. *Why: easy return after jumping into a room.*
13. **Weather glance** · `WeatherGlance` in `AppLayout.tsx` · A pill with a cloud icon, the rounded temperature and unit, and the localized condition ("16°C Partlycloudy"). Clicking it opens the weather modal (B10). *Why: weather is always visible and one tap away from the forecast.*
14. **Notifications bell and panel** · `components/notifications/NotificationsPanel.tsx` · Subscribes live to HA persistent notifications. The badge shows the count, capped at "9+". The panel opens in a portal anchored under the bell (full width on mobile). Each row has title, message and an × button that dismisses it in HA. The header has "Dismiss all", and there is an empty state ("BellOff"). It closes on Escape or a click outside. *Why: HA's own alerts (updates, repairs, new devices) can be handled without opening HA.*
15. **User avatar** · `components/ui/UserAvatar.tsx` · A 44 px circle showing the HA user's picture, or their initial on accent-soft. Tapping it goes to /settings, or opens a host-injected account menu in the SaaS build. *Why: shows who is signed in and gives quick access to settings.*
16. **Mobile page header actions** · `components/ui/PageHeaderActions.tsx` · On mobile, every page title row carries the bell, the avatar and that page's edit toggle. *Why: the same actions as desktop, in a layout that fits a phone.*
17. **Mobile summary-chip strip on every page** · `AppLayout.tsx` (`.app-chips-mobile`) · On mobile, the chips row sits at the top of every route. Home renders its own strip inline. *Why: house status stays visible while browsing other pages.*
18. **Connection banner** · `AppLayout.tsx` `.app-banner` · "Reconnecting to Home Assistant…" (amber) or "Connection lost — check your Home Assistant instance" (red). The user stays in the app; the guard does not bounce them to onboarding. *Why: honest status without a scary logout.*
19. **Boot loading screen** · `components/ui/DashboardBootLoading.tsx` · A branded logo with a spinner and "Loading…" while a saved session resumes. It prevents the login screen from flashing. *Why: a smooth start.*
20. **Page error boundary [F]** · `app/PageErrorBoundary.tsx` · When a page fails, the shell stays usable and the page shows "Something went wrong / This page could not be displayed / Reload". It resets on route change. *Why: never a blank white screen.*
21. **Stale-chunk auto reload [F]** · `app/chunkReload.ts` · After a deploy, a stale lazy chunk triggers one silent reload, at most once per minute. *Why: old open tabs heal themselves.*
22. **Scroll to top on navigation** · `app/Router.tsx` `ScrollToTop` · Jumps to the top on route change, without the smooth animation. *Why: every page starts at its top.*
23. **Page loading fallback** · `Router.tsx` `PageFallback` · Faint "loading…" text while a lazy page loads. *Why: shows that something is happening.*
24. **Toasts [F]** · `components/ui/Toaster.tsx`, `stores/toastStore.ts`, `ha/service.ts` · Messages "domain.service failed: message" and "No connection to Home Assistant". They sit above the mobile tab bar, at most three at once, never duplicated. Each disappears after 6 s and has an × to dismiss. *Why: failed actions are never silent (wrong lock code, device offline).*
25. **Global entity detail modal host** · `AppLayout.tsx` + `stores/uiStore.ts` (`openEntityDetail`) · Any card on any page can open the detail modal (F). *Why: the same "more info" view everywhere.*
26. **What's New host** · `AppLayout.tsx` · Opens automatically once after an upstream or fork update (U1). *Why: users learn about new features.*

---

## B. Summary chips (header and mobile strip)

Files: `components/home/SummaryChipsBar.tsx`, `SummaryChips.tsx`, modals in `components/home/chipmodals/*`.

Common behaviour:
- Chips are pills with a mono/data font.
- Dimmed when idle, accent when active, amber when alerting, red for danger.
- A chip is hidden when its domain has no entities.
- Every chip opens a modal. On mobile the modal becomes a bottom sheet.

1. **People chip** · `SummaryChips.tsx` · "4 home" with overlapping avatar circles (entity_picture, or the initial), or "nobody home" dimmed. Opens **PeopleModal**. *Why: see at a glance who is home.*
2. **PeopleModal** · `chipmodals/PeopleModal.tsx` · Every `person.*` with avatar or initial, name, zone ("Home" green, "Away", or a raw zone name such as "Work") and a relative time since the last change. *Why: presence details without HA's map.*
3. **Lights chip** · `SummaryChips.tsx` · "10 on", or "all off" dimmed. Opens **LightsModal**. *Why: answers "did I leave lights on?"*
4. **LightsModal** · `chipmodals/LightsModal.tsx` · Every light grouped by room (in the user's room order), plus an "Other" group. Rows show a bulb chip (lit when on), the name, brightness % or "off", and a toggle. Tapping a row toggles that light. A **"Turn all off"** button appears whenever any light is on. *Why: a one-tap way to switch off the whole house.*
5. **Doors chip** · `SummaryChips.tsx` · "4 open" in amber (alert), or "all closed". It counts `binary_sensor` door, window, opening and garage_door. Opens **DoorsModal**. *Why: open-door awareness.*
6. **DoorsModal** · `chipmodals/DoorsModal.tsx` · Two groups, Doors and Windows, each with an "open/total" count (red when anything is open). Rows show the name and an Open/Closed pill with a dot. Open sensors sort first. *Why: shows exactly which door or window is open.*
7. **Alarm chip** · `SummaryChips.tsx` · The localized alarm state ("armed home"), amber when armed. The panel is chosen by severity across all panels (`pickAlarmPanel`). The chip is hidden without an alarm entity. Opens **AlarmModal**. *Why: shows the security state at a glance.*
8. **AlarmModal** · `chipmodals/AlarmModal.tsx` · One full **AlarmPanelCard** per visible panel, most severe first, including the arm buttons and the keypad (H3). *Why: arm or disarm from any page.*
9. **Media chip** · `SummaryChips.tsx` · "N playing" or "nothing playing" dimmed. Opens **MediaModal**. *Why: shows what is playing where.*
10. **MediaModal** · `chipmodals/MediaModal.tsx` · Players grouped Active / Idle, each with a count. Each player is a PlayerTile (art, name, room, play/pause, volume slider). The footer links "Open music page →". *Why: quick pause or volume change for any speaker.*
11. **Pool chip [F]** · `SummaryChips.tsx` · "Pool running" in accent, or idle dimmed. It shows only when the pool entities exist. Its default slot is just before Media. Opens **PoolModal**. *Why: pump status at a glance.*
12. **PoolModal [F]** · `chipmodals/PoolModal.tsx` · Shows:
    - the pump status tile (running or idle)
    - mode buttons taken from the `input_select` options (Aus / Automatik / Manuell). Choosing Manuell closes this modal and opens the duration picker (K4).
    - glance rows: solar W against the threshold (green when exceeded), today's runtime, and the remaining manual timer (a live countdown)
    - a footer link "open pool page →"

    *Why: full pump control from any page.*
13. **Garage chip [F]** · `SummaryChips.tsx` + `components/garage/garageText.ts` · An MDI garage icon in one of three versions (closed, open, alert). The text is "all closed", "N open" (red) or "N unreachable" (amber). It shows only when garage doors or gates exist. Its default slot is after Doors, and `garageChipMigrated` places it for orders saved earlier. Opens **GarageModal**. *Why: answers "is the garage open?" at once.*
14. **GarageModal [F]** · `chipmodals/GarageModal.tsx` · Each row (open ones first) shows icon, name, room and HA's state wording, with Stop (only while moving and if supported), Close (runs at once) and Open (asks for confirmation). *Why: closing the garage from bed is safe.*
15. **Locks chip [F]** · `SummaryChips.tsx` + `components/security/lockLogic.ts` · A lock or open-lock icon with "all locked", "N unlocked" (red) or "N fault" (amber, for jammed or unavailable). It never says "all locked" when a lock has a problem. Its default slot is after Garage (or after Doors), and `locksChipMigrated` handles saved orders. Opens **LocksModal**. *Why: shows whether the house is locked.*
16. **LocksModal [F]** · `chipmodals/LocksModal.tsx` → `LocksList` · Open locks first. Each row shows icon, name, room and state, with Lock and Unlock buttons. Unlock always asks first. Lock asks only when the lock needs a code. Buttons are disabled while the lock is moving, jammed or unavailable. *Why: secure remote locking.*
17. **Chip editing** · `SummaryChipsBar.tsx` · In edit mode on Home, the strip appears on desktop too. Chips can be dragged into a new order (stored as `entityOrder['__home:chips']`) and shown or hidden with an eye badge (`homeChips`). *Why: each user picks the status that matters to them.*
18. **Counts exclude hidden entities** · `SummaryChipsBar.tsx` · *Why: counts are never inflated by junk entities.*

---

## C. Home page (`pages/Home.tsx`)

1. **Greeting** · `components/home/GreetingBlock.tsx` · "Good morning / afternoon / evening, {name} 👋" in the display font, chosen by time of day, with the subtitle "Here's what's happening in your home." The name comes from the userName override, then the linked person, then the HA user. *Why: a personal, friendly start.*
2. **Home header row** · `Home.tsx` · The greeting on the left. On the right: the mobile bell and avatar, and the edit toggle (pencil, or a check while editing). *Why: the entry point for customization.*
3. **Overview widget grid** · `Home.tsx`, `pages/Page.css` · Columns by width: 4 on desktop, 3 at 900–1279 px, 2 on tablets, 1 on phones. Multi-column cards collapse sensibly. The default order is scenes, hero, energy, devices, climate, blinds, security, **waste [F]**, **nvr [F]**, activity, rooms. *Why: a dense, information-rich overview.*
4. **Scenes card** · `components/home/ScenesCard.tsx` · Favorited scenes as tiles in a 2×2 grid, scrolling sideways when there are more than four. Each tile has an icon picked from the name (sun for morning, moon for night, sunset for relax, tv for movie, and so on) in a rotating semantic colour. Tap activates the scene. An "All scenes ›" link goes to /scenes. Empty state: a star with a hint to favorite scenes. *Why: one-tap moods.*
5. **Hero room card** · `components/home/HeroRoomCard.tsx` · Spans 2 columns. It picks the most active room automatically (lights on ×10, media ×5, motion ×3). It shows:
   - background: the HA area picture with a scrim, or a gradient tinted by room type (living, bedroom, kitchen, bathroom, office, garage, outdoor)
   - title and "N devices"
   - top-right glance chips: temperature, humidity
   - bottom frosted pills: **Lights** (toggles all visible lights in the room, "N on" or "off", accent when on), **Climate** (target ° with − / + stepper), **Media** (shown only when playing, play/pause), and a **›** pill that opens the room

   Tapping the card body opens the room. Note: there is no photo carousel; the › pill only navigates. *Why: the most-used room's controls are right on the overview.*
6. **Energy widget** · `components/home/EnergyWidget.tsx` · "Energy today": home consumption in kWh as a big number, plus a mini bar chart of grid and solar per hour. "Details ›" goes to /energy. When HA energy isn't configured, it shows a prompt card with a link to HA `/config/energy`. *Why: daily consumption at a glance.*
7. **Devices card** · `components/home/DevicesCard.tsx` · Shows only *favorited* devices (light, switch, fan, media, vacuum) that are *currently active*. Rows: a tinted icon chip, name, room, and an accent toggle (or a status text). "All devices ›" goes to /devices. Two empty states: "no favorites" and "all off". *Why: shows what is running right now.*
8. **Climate card** · `components/home/ClimateCard.tsx` · An arc gauge with the current temperature (taken from the room's temperature sensor first) and the HVAC action label. The arc is red when heating, blue when cooling, green on auto. Below it, a − / + setpoint stepper that uses the entity's own step, min and max. Fast taps build on each other. Then a list of rooms with a coloured dot and the temperature; tapping a row selects that room. "See all ›" opens **ClimateAllModal**. Empty state when there is no climate. *Why: whole-house temperature view plus control.*
9. **ClimateAllModal** · `chipmodals/ClimateAllModal.tsx` · A grid of full ClimateCards (current, target stepper, HVAC mode pills) for every `climate.*`. *Why: control any thermostat.*
10. **Blinds card** · `components/home/BlindsCard.tsx` · An arc gauge of the selected room's average "% closed", labelled open, partial, closed or moving. Close / Stop / Open buttons act on all of that room's covers. A room list with a dot and % (or "moving"). Garage doors are excluded [F]. "See all ›" opens **BlindsAllModal**. *Why: room-wide shading in one control.*
11. **BlindsAllModal** · `chipmodals/BlindsAllModal.tsx` · A grid of CoverCards (Open / Stop / Close, % open) for every cover except garage doors. *Why: per-blind control.*
12. **Security card** · `components/home/SecurityCard.tsx` · The shield chip is green, amber or red. Rows, each with a status dot and a value:
    - Alarm
    - Locks (shared lock rule [F]; one lock shows its own name)
    - **Garage [F]**
    - Windows
    - Doors
    - Motion ("N detected")
    - Cameras ("N active"; with Sentinel as the source, Sentinel's online count [F])

    "All systems normal" shows when nothing is wrong. "Details ›" goes to /security. *Why: a security summary in one card.*
13. **Waste collection card [F]** · `components/waste/WasteCard.tsx` · See section L. *Why: never miss bin day.*
14. **Sentinel NVR home card [F]** · `nvr/NvrHomeCard.tsx` · See J3. *Why: camera glance on the overview.*
15. **Activity card** · `components/home/ActivityCard.tsx` · The five most recently changed notable entities (lights, switches, fans, media, locks, climate, covers, alarm, vacuum, binary sensors). Each row has a domain icon chip with a semantic tint (garage tone [F]), the name, a short description ("turned on", "motion detected", "set to 21°") and the HH:MM time. "Details ›" goes to /system. *Why: shows what just happened.*
16. **Rooms quick access** · `components/home/RoomsQuickAccess.tsx` · A "Rooms" section with a horizontal strip of room tiles. Each tile shows:
    - the room's MDI icon. It is replaced by a **status icon** when something is wrong: open door, **garage open (car) [F]**, open window, water leak, smoke.
    - name, temperature, humidity, and lights on or off
    - the device count when there are no other stats

    A tile is accent when its lights are on and alert-styled when it shows a status icon. Tap opens the room. *Why: compact room status plus navigation.*
17. **Section visibility gates** · `Home.tsx` · The rooms section hides when no rooms have devices. Waste hides without bins [F]. NVR hides without a usable Sentinel config [F]. The energy card always renders, because it handles its own setup prompt. *Why: no empty cards.*

---

## D. Edit mode and customization (shared across pages)

1. **Edit toggle** · `components/ui/EditToggle.tsx` · A 40 px pencil button that turns into an accent check while editing. It exists on Home, Room, Security, Music, Energy, Automations, Scenes and System, and in the header on room pages. It is shown only to HA admins with editing enabled, and is forced off otherwise. *Why: safe customization.*
2. **Drag to reorder sections** · `components/ui/SortableGrid.tsx`, `SortableItem.tsx` (dnd-kit) · Pointer drag starts after 6 px. On touch, a 200 ms long press starts it. Keyboard sorting works too. *Why: users arrange the layout themselves.*
3. **Edit badge** · `components/ui/EditBadge.tsx` · A cluster on each item:
   - eye: hide or show
   - **phone: hide on mobile only**
   - star: favorite (entities)
   - optional ← / → move arrows

   Hidden items stay visible but dimmed while editing. *Why: per-item control.*
4. **Column span resize** · `ResizeHandle` and `SpanDots` in Home, Security, Energy, Automations, Scenes and System · Drag sideways to span 1–4 columns. Dots show the current span. Saved per page (`*SectionSpans`). *Why: give important cards more room.*
5. **Height caps** · `components/ui/SectionResize.tsx` (`HeightHandle`, `HeightDots`) · Drag up or down through five levels: none, 180, 280, 400, 560 px. A capped card scrolls inside while its header stays put (`.card-scroll-body` rules in `Page.css`). Available on Home, Security, Energy, Automations, Scenes and System. *Why: line up rows and keep long lists compact.*
6. **Hide on mobile only** · `section-mobile-hidden` in `Page.css` · Sections can be hidden below 900 px only. Supported on Home, Security, Energy, Automations, Scenes, System and Music. *Why: phones get a lean layout and desktop keeps everything.*
7. **Room-page edit mode** · `pages/Room.tsx` · Sections get a grip to drag them. Each section is half or full width (2-column grid). Entities can be dragged within a section, and each card gets eye and star badges. Hidden entities show dimmed. *Why: per-room arrangement.*
8. **Nav edit mode** · see A7.
9. **Chip edit mode** · see B17.
10. **Weather entity picker** · `chipmodals/WeatherModal.tsx` · When editing is enabled, a select at the top of the weather modal chooses which `weather.*` entity drives the glance and the modal (`customization.weatherEntity`). *Why: handles homes with several weather providers.*
11. **Default-slot migrations [F]** · `lib/defaultSlot.ts`, `settingsStore` markers · New sections and chips (garage, locks, pool, waste) get a sensible place in layouts saved before they existed. *Why: new features never land at the bottom or disappear.*

---

## E. Entity cards (room page and modals; `components/cards/*`)

1. **EntityCard dispatcher** · `cards/EntityCard.tsx` · Picks a card by domain. Tapping opens details on read-only cards (sensor, media, climate, cover, lock, vacuum, camera). A long press opens details on action cards (light, switch, fan, input_boolean, button, scene, script). Taps on the card's own controls never open the modal. *Why: one consistent interaction model.*
2. **LightCard** · `cards/LightCard.tsx` · Icon chip, name, brightness % and a pill toggle; tapping the card also toggles. While the light is on, it adds sliders: **brightness**, **colour temperature** (kelvin, warm-to-cold gradient) and **hue** (rainbow, keeps the saturation), each shown only if the light supports it. Values update locally while dragging and are sent on release, key-up or blur [F fix]. *Why: full light control without a modal.*
3. **ClimateCard (entity)** · `cards/ClimateCard.tsx` · Name and HVAC action. "Current" temperature with one decimal. "Target" with a − / + stepper that uses the entity's step [F]. HVAC mode pills (Heat, Cool, Auto, Off, Fan) with icons. *Why: the thermostat on the card.*
4. **CoverCard** · `cards/CoverCard.tsx` · An icon by device class (blinds or curtain, generic), the name, "N % open", and Open / Stop / Close buttons. *Why: blind control.*
5. **GarageCard [F]** · `components/garage/GarageCard.tsx` · A tone chip (green closed, red open or moving, amber unreachable), the MDI garage or gate icon, HA's state wording, and one context button: Open (asks), Close, or Stop while moving if supported. *Why: garage handled like a lock, not like a blind.*
6. **MediaCard** · `cards/MediaCard.tsx` · Artwork or a speaker icon, title and artist (or the state), play/pause, and a volume slider (sent at most every 300 ms while dragging and on release [F]). *Why: quick media control.*
7. **ToggleCard** · `cards/ToggleCard.tsx` · Switch, fan or input_boolean: icon chip, name and pill toggle; tapping the whole card toggles. *Why: simple on/off.*
8. **SensorTile** · `cards/SensorTile.tsx` · For numbers: a device-class icon, the value (locale-formatted), the name, and a coloured fill bar along the bottom scaled by class (temperature, humidity, battery, illuminance, pressure, power). For binary sensors: wording by class (Open/Closed, Detected/Clear, Wet/Dry, Connected, Low, Problem) and colour (danger for moisture, smoke or CO; positive for presence; info for door or motion). Tap opens details with history. *Why: sensor values at a glance, history on tap.*
9. **LockCard** · `cards/LockCard.tsx` · A green or amber chip, the state, and one Lock/Unlock button. Unlock asks; code entry appears when needed [F]. *Why: safe lock control.*
10. **CameraCard (HA camera)** · `cards/CameraCard.tsx` · A signed `camera_proxy` snapshot refreshed every 10 s, with a name label and a placeholder on error. *Why: camera glance inside the room.*
11. **ButtonCard** · `cards/ButtonCard.tsx` · A "Press" button that flashes briefly on press. *Why: fire `button` entities.*
12. **VacuumCard** · `cards/VacuumCard.tsx` · Status text, battery %, and Start/Resume, Pause and Dock buttons that depend on the state. *Why: robot control.*
13. **Unavailable dimming** · `pages/Room.tsx` `.entity-unavailable` · Cards whose entity is unavailable are dimmed. *Why: obvious device faults.*

---

## F. Entity detail modal ("more info") (`components/home/EntityDetailModal.tsx`)

1. **Modal frame** · Title is the entity name (or its override). On mobile it is a bottom sheet. *Why: works the same for every entity.*
2. **Header** · A domain icon chip, the name, "last changed N ago" and the formatted current state. *Why: shows the current status.*
3. **Favorite star [F]** · `FavoriteToggle.tsx` · Shown under global management so every user can pin and unpin their own favorites. *Why: non-admins can still personalise.*
4. **Embedded control card** · For light, switch, fan, input_boolean, climate, cover, media, lock, vacuum, button, scene and script, the normal card is embedded with detail press disabled. *Why: control and history in one place.*
5. **Camera live view** · `CameraLiveView` · A HA MJPEG stream (`camera_proxy_stream`). It falls back to a snapshot refreshed every 5 s, then to a placeholder. With Sentinel as the camera source it shows **NvrCameraHint** instead: "open in NVR" [F]. *Why: live camera access.*
6. **History with 24H / 7D / 30D pill selector [F]** · A pill group in the History section head. The choice is remembered per user (`detailHistoryRange`, USER scope). While a new range loads, the old chart stays visible and dims, then cross-fades (no flicker). *Why: trend analysis over a useful time span.*
7. **Numeric value chart** · `ValueChart` · An SVG area plus line with locale-formatted max and min labels. *Why: shows sensor trends.*
8. **State timeline bar** · `TimelineBar` · Proportional segments (active, neutral or unavailable tones) with the state label on the longest segment and tooltips. *Why: on/off history at a glance.*
9. **Time axis ticks** · Five ticks: hours, or weekday names for ranges over 48 h. *Why: makes the chart readable.*
10. **Activity (logbook) list** · `ActivityList` · Entries grouped under day headers ("Today · date", "Yesterday · …") with a dot, the state and the time to the second. Six are shown first; "Show more" reveals up to 40. *Why: exactly when something changed.*
11. **Group members** · `MemberRow` · For groups: tappable member rows (icon, name, state, chevron) that open each member's details. *Why: drill down into light groups.*
12. **Attributes (collapsible)** · Humanized keys and locale-formatted values, with noise attributes filtered out. *Why: power-user detail without clutter.*
13. **Loading and empty placeholders** · "Loading…", "No history", "No activity". *Why: honest states.*
14. **Entry points** · Sensor tiles, cards via long press or tap, camera tiles (Security), pool data tiles [F], group members, PoolModal. *Why: consistent access to "more info".*

---

## G. Room page (`pages/Room.tsx`, route `/room/:areaId`)

1. **Room hero card** · The same HeroRoomCard (C5) for this room: picture or gradient, device count, temperature and humidity chips, lights / climate / media pills. *Why: room status and main controls at the top.*
2. **Mobile header** · A back chevron, plus bell, avatar and edit toggle. *Why: works well on phones.*
3. **Auto-built sections** · In this order:
   - Scenes
   - **Cameras (Sentinel, assigned to this room) [F]**
   - Lights
   - Climate
   - Media
   - Blinds / Covers
   - **Garage [F]**
   - Switches (switch, fan, input_boolean)
   - Buttons
   - Vacuum
   - Sensors (sensor + binary_sensor)
   - Misc (every other domain)

   Only non-empty sections are shown, each under an uppercase section label. *Why: no manual dashboard building; every device has a home.*
4. **Scene tiles (compact)** · Tap activates; the icon is chosen from the name. *Why: room moods.*
5. **Grid types per section** · Sensor grid, scene grid, wide grid (climate, vacuum) and card grid. *Why: each device type gets a fitting layout.*
6. **Entity name cleanup** · `stripRoomName` · The room name is removed from entity names ("Living room Lamp" becomes "Lamp"). Overrides from Settings apply. *Why: short, readable labels.*
7. **Per-room ordering** · `entityOrder[areaId]`, `roomSectionOrder[areaId]`, `roomSectionSpans` (half or full width). *Why: rooms can be personalised.*
8. **Not-found and empty states** · "Room not found" or "No devices" with a "Back to home" link. *Why: graceful dead ends.*
9. **Garage section placement [F]** · `lib/defaultSlot.ts` · For saved orders, the garage section takes the slot where blinds were. *Why: continuity for existing layouts.*
10. **Sentinel room cameras [F]** · `nvr/NvrRoomCameras.tsx` · Live tiles (snapshot every 5 s while visible); tap opens the timeline. HA `camera.*` entities are hidden while Sentinel is the source. *Why: the room's cameras inside the room.*

---

## H. Security page (`pages/Security.tsx`)

Sections (all reorderable, hideable, mobile-hideable, resizable and height-cappable; default spans in brackets):

1. **Security hero card** [2] · `components/security/SecurityHeroCard.tsx` · The background gradient follows the alarm state (disarmed, armed home, night, away, triggered). It shows:
   - a large shield icon, the alarm name and the localized state
   - a person avatar row with home dots and "4 people home" or "Julian is home"
   - status chips: locks (shared rule [F]), **garage [F]**, doors ("Doors closed" or "N open" in red), windows, motion and cameras

   *Why: the whole security posture in one hero.*
2. **Alarm panel card** [2] · `components/security/AlarmPanelCard.tsx` · State icon and label (pulsing when triggered, animated dots while arming or pending). Buttons Arm Home / Arm Away / Arm Night / Vacation / Disarm, shown only when the panel supports them (supported_features [F]). The active mode is highlighted. Buttons are disabled when they would do nothing; during arming or pending only Disarm is enabled [F]. *Why: full alarm control.*
3. **Alarm keypad (numpad)** · `AlarmPanelCard.tsx` `NumpadModal` · Opens when the panel has `code_format`. It shows the action title, PIN dots (at least four, up to eight digits), a 3×4 grid of 1–9, backspace, 0 and ✓, plus Cancel. On a wrong code it stays open and clears [F]. The code goes to the panel the keypad was opened for [F]. *Why: secure code entry.*
4. **Camera grid (HA cameras)** [4] · `components/security/CameraGrid.tsx` · Snapshot tiles refreshed every 10 s with name and room. A red **MOTION** badge appears when a motion sensor in the same room is on. Tap opens the detail modal with the live stream. The order is configurable (`__security:cameras`). Hidden when Sentinel is the camera source [F]. *Why: see every camera plus motion at a glance.*
5. **Sentinel NVR section [F]** [4] · `nvr/NvrSecuritySection.tsx` · See J4.
6. **People list** [1] · `components/security/PeopleList.tsx` · "home/total" count. Rows: avatar with a home or away dot, name, Home/Away, and the relative time since the last change (refreshed every 30 s). People at home sort first. *Why: presence for security decisions.*
7. **Locks section** [2] · `components/security/LocksSectionCard.tsx` · "locked/total". **Lock All** sends only to locks that are unlocked and able to act. **Unlock All** asks first, with the count. Then the LockRow list. *Why: lock the house in one tap.*
8. **Lock confirm dialog [F]** · `components/security/LockConfirm.tsx` · Shows "Unlock Front door?" or "Unlock 3 locks?". A code field appears for coded locks (numeric keypad when the code format is digits). The confirm button is red for unlock. On error it stays open and clears the code. *Why: no accidental unlocks.*
9. **Garage section [F]** [2] · `components/garage/GarageSectionCard.tsx` · "closed/total". **Close All** runs at once. **Open All** asks first and sends only to doors that can act. Then the GarageRows. By default it sits after Locks. *Why: garage and gates handled with lock-level care.*
10. **Doors section** [1] · `components/security/SensorSectionCard.tsx` + `DoorWindowList.tsx` · The header shows "N open" or "N total". Rows: icon, name, room, an Open (red dot) or Closed pill, and the relative time. Open ones sort first. *Why: which door is open, and since when.*
11. **Windows section** [1] · Same list, but open windows show amber. *Why: ventilation and security awareness.*
12. **Motion section** [1] · `MotionList.tsx` · Covers motion, occupancy and presence (presence uses a person-check icon). Each row has a Motion/Clear pill and the relative time. *Why: shows where there is activity right now.*
13. **Empty state** · A shield with "No security devices" text. Sentinel alone is enough to show the page [F]. *Why: guidance for new installs.*

---

## I. Garage doors and locks: shared fork rules (`packages/core/src/garage.ts`, `components/garage/*`, `components/security/lockLogic.ts`)

1. **Garage detection [F]** · `isGarageDoor`: `cover` with device class `garage` or `gate` is security-relevant. It is removed from blinds everywhere (BlindsCard, BlindsAllModal, Room Blinds section). A `binary_sensor` with device class `garage_door` stays a door sensor. *Why: garage doors are a security matter, not shading.*
2. **Garage status model [F]** · Closed, open, moving or unavailable. "All closed" is shown only when *every* door is closed; an unreachable door turns the summary amber. *Why: never a false sense of safety.*
3. **Garage icons [F]** · `GarageIcon.tsx` · MDI garage, garage-open and garage-alert, with gate variants. Lucide icons stand in while MDI loads. *Why: clear, recognizable status.*
4. **Open asks, Close is instant, Stop while moving [F]** · `GarageConfirm.tsx` (`useGarageAction`) · *Why: safety without friction.*
5. **Shared garage wording [F]** · `garageText.ts` · Chip, Home card, hero and section always agree. *Why: consistent status.*
6. **Lock summary tone [F]** · `lockSummary` / `lockTone` · Open (including moving) is red. Jammed, unavailable or unknown is amber "fault". Never "all locked" while a fault exists. *Why: trustworthy lock status.*
7. **Lock busy states [F]** · Buttons are disabled while locking, unlocking, opening, jammed or unavailable. *Why: no confusing double actions.*
8. **Garage and lock everywhere [F]** · Home chip, Home security row, Security hero chip, Security section, Room section, favorites, the Devices row (DeviceEntityRow open/stop/close with confirmation), activity icons and the room status icon (car). *Why: one feature, consistent across the whole app.*

---

## J. Sentinel NVR (native) [F] (`pages/Nvr.tsx`, `nvr/**`, package `@sentinel-nvr/web`)

1. **NVR route** · `pages/Nvr.tsx` · `/nvr` is the overview, `/nvr/:cameraId` the camera timeline; anything else redirects to `/nvr`. *Why: native NVR inside the dashboard.*
2. **NVR overview page** · `nvr/NvrOverviewPage.tsx` · A fixed layout:
   - header actions: **Open Sentinel** (external link); for admins, **assign cameras to rooms** (map pin) and **NVR connection** settings (gear)
   - a stale-data banner, "Connection lost — showing the last known data"
   - **Hero** (package): Sentinel NVR system status with events today, cameras online, "N cameras offline", recording, storage used, retention, and "Storage unavailable — not recording"
   - **Events strip**: recent events with thumbnails, class badges (person, vehicle, bike, animal, package, motion) and a "running" marker for ongoing events; tap opens the timeline at the event
   - **Camera grid**: live snapshot tiles with blur pills, an offline badge, a thumbnail fallback, a recording dot and the count of events today
   - **Events per hour** histogram for today, all cameras, with the current hour highlighted
   - **Storage & retention** card: a bar split into recordings, system, free and reserve (hatched); recording rate per day; room for recordings; retention against its target; segments; a forecast note ("Full in about…", "Target reachable…")

   Polls every 10 s. *Why: all NVR status at a glance.*
3. **NVR Home card** · `nvr/NvrHomeCard.tsx` · "Sentinel NVR" with "View all ›". A meta line with events today and the camera count, or "N offline" in red. Camera snapshot tiles refresh every 10 s while visible, with an online or offline dot; tap opens the timeline. The snapshot doubles as the camera page's instant poster. The four latest events show a thumbnail, class badges, a label, "camera · N min ago" and the time; tap jumps to the event. The chip turns red when a recording camera is offline. *Why: camera glance on Home.*
4. **Security NVR section** · `nvr/NvrSecuritySection.tsx` · Title with events today and offline count, camera tiles, and the last 20 events. *Why: NVR in the security context.*
5. **Camera page (timeline)** · `nvr/NvrCameraPage.tsx` → package `CameraPage`:
   - header: back to overview, camera name, Open Sentinel
   - stage: live view (WebRTC, then MSE, then MJPEG) and recorded playback over a WebRTC relay, with frame-exact still handling and no black flashes
   - control pill: −15 s, play/pause, +15 s, speed 1/2/4/8×
   - round sound button
   - info bar: snapshot, picture-in-picture, fullscreen
   - tabs: Timeline / Events
   - class filter chips
   - vertical scrolling timeline across several days: zoom, ruler, event markers with thumbnails, a green motion track beside the recording band, day separators, events shown as time spans
   - scrubbing as time-lapse toward a target
   - LIVE pill, and a date chip that opens a calendar and time dialog
   - keyboard: Space plays or pauses, ←/→ jump 10 s (Shift for 60 s), n/p next or previous event, l goes live
   - deep link `?at=&ev=` with the event frame as poster

   *Why: full NVR playback, the same as Sentinel's own UI.*
6. **Date and time picker** · `nvr/components/DatePickerModal.tsx` · A HAPulse modal around the package calendar grid. It blocks days before retention and has a time field and "Show". *Why: jump to any recorded moment.*
7. **PiP Home-Screen hint** · package · On iPhone PWAs: "Apple blocks picture-in-picture… Open in Safari". *Why: explains a platform limit and offers a workaround.*
8. **NVR setup card and modal** · `nvr/components/NvrSetup.tsx` · Fields:
   - Scrypted URL. A pasted embed URL fills in the token automatically; a reverse-proxy prefix is supported.
   - an auth mode toggle: **Access token** or **Scrypted account** (username and password exchanged for a token; the password is never stored)
   - **Test connection**: "Connected — N cameras", or a specific error for 401/403/404/429, an HTTP code, or unreachable (certificate hint)
   - Save

   *Why: setup in a minute, with helpful errors.*
9. **Assign cameras to rooms** · `nvr/components/NvrCameraRoomsModal.tsx` · Per-camera room selects plus a **Suggest** button that guesses the area from the camera name (handles German umlauts). Saved in `nvrCameraRooms`. *Why: Sentinel cameras appear in the right rooms.*
10. **Camera source switch** · `nvr/cameraSource.ts` · Once Sentinel has a URL and token, *all* camera views use Sentinel and HA `camera.*` is hidden everywhere: Security grid, Home counter, rooms, favorites, devices and detail modal. Camera counters use Sentinel's online count. *Why: one source of truth, no duplicate cameras.*
11. **NVR camera hint in detail modal** · `nvr/components/NvrCameraHint.tsx` · "Cameras come from Sentinel → Open NVR". *Why: guides users to the right view.*
12. **NVR error and empty states** · Not set up (setup card, or "not set up" for non-admins), unreachable or 401 with Retry and Settings, Loading. *Why: robust in the field.*
13. **Device-local secrets** · `scryptedToken` is never exported. Admins may share it via global settings. *Why: security.*

---

## K. Pool page [F] (`pages/Pool.tsx`, `components/pool/*`, `ha/pool.ts`, `packages/core/src/pool.ts`)

1. **Pool page layout** · A fixed layout: a full-width pump hero, then a flowing card grid. Shows an empty state when the pool entities are missing. *Why: replaces the old Lovelace pool dashboard.*
2. **Pump hero card** · `PumpHeroCard.tsx` · A running (waves) or idle (power) icon with "Pump running" or "Pump idle". Today's runtime as a glance stat. A segmented **mode control** built from the input_select options (Aus / Automatik / Manuell, each with its own icon and tone). Manuell opens the duration modal. *Why: the pump's state and mode in one place.*
3. **Solar card** · `SolarCard.tsx` · A ring gauge of current solar watts against the threshold (green when exceeded). An "exceeded" or "below" chip. A **threshold − / + stepper** that respects the input_number's min, max and step. *Why: the solar automation explained and adjustable.*
4. **Manual run modal** · `PumpManualModal.tsx` + `PoolDurationPicker.tsx` · Preset chips from 30 min to 24 h, a free − / + 5-minute stepper, and **Start**. If a manual run is already active, it restarts the timer with the new duration. The modal stays open on error. *Why: start manual runs with a precise duration.*
5. **Manual timer card** · `ManualTimerCard.tsx` · While active: a countdown ring (minutes or hours left), "runs until 18:30 / tomorrow / weekday", and **Stop** (back to Automatik). While idle: a prompt and "Start manual run". Below that, the **Siri / Apple Home duration** stepper (its own setting). *Why: live timer plus voice-start configuration.*
6. **Schedule card** · `ScheduleCard.tsx` · An enable switch, "Next action HH:MM turns on/off", weekday chips, window chips ("08:00–12:00"), "N h per day", or "no windows", and **Edit**. *Why: the schedule at a glance.*
7. **Schedule editor modal** · `ScheduleEditorModal.tsx` · Weekday toggles. A **graphical day timeline**: tap a segment to flip it on or off, drag boundary handles (5-minute snap), and "add boundary" splits the widest segment. A list of switch points with exact time inputs, an on/off choice and remove. Shows on-hours per day. Save writes through `scheduler.edit`. Save is disabled with no weekdays; errors are shown. *Why: a full schedule editor without YAML.*
8. **Usage tiles card** · `PoolDataCard.tsx` · Runtime today and energy today, this week and this month. Each tile opens the entity detail modal with history. *Why: consumption overview with drill-down.*
9. **Runtime chart** · `PoolChartCard.tsx` · Bars of pump runtime per day over 14 days, using the daily maximum and dropping days outside retention. A readout shows today's value, or the hovered or tapped day. Loading, empty and error states. It refetches at midnight. *Why: spot trends and failures.*
10. **Admin card** · `PoolAdminCard.tsx` · For HA admins only: a raw pump switch, a bypass switch, and a **Restart device** button with confirmation. *Why: maintenance access.*
11. **Pool chip and modal** · see B11 and B12.

---

## L. Waste collection [F] (`components/waste/*`, `packages/core/src/waste.ts`)

1. **Auto-detection** · `detectWasteBins` · Finds `waste_collection_schedule` sensors. Several sensors for the same bin (base, `_komplett`, `_verlegt`) are merged, and the richest wins. Sorted by next date. Respects hidden entities. *Why: zero configuration.*
2. **Waste card hero row** · `WasteCard.tsx` · "Next up": a tinted MDI bin icon, the bin name, a countdown ("Today", "Tomorrow", "in 3 days", accented when soon) and the localized date ("Fri, 11 Sep"; the year appears only when it differs). Tap opens the bin modal. *Why: the next pickup is unmissable.*
3. **Other bins grid** · Compact tiles with icon, name, date and countdown. *Why: every bin at a glance.*
4. **Colour heuristic** · `wasteDisplay.ts` · Paper is blue, organic is green, recycling or yellow is amber, hazardous is red, anything else neutral (German and English keywords). *Why: the colour matches the real bin.*
5. **Bin modal** · `WasteBinModal.tsx` · The next countdown and date, then an "Upcoming" list of dates from the `upcoming` attribute. A rescheduled date shows its type, such as "(verlegt)". Empty state. *Why: plan ahead, including holiday changes.*
6. **Home section integration** · Reorderable, resizable and hideable. `wasteSectionMigrated` places it after Security once. The card is gone when no bins exist. *Why: fits into user layouts.*

---

## M. Music page (`pages/Music.tsx`, `components/music/*`)

1. **Layout** · The left column holds Now Playing, Zones and Queue. The right column holds Other Players, capped to the left column's height. A full-width Library row appears only with Music Assistant. *Why: a music-app layout.*
2. **Now Playing card** · `NowPlayingCard.tsx` · Shows:
   - the hero player (playing, else paused, else first; selectable from other players)
   - a blurred artwork backdrop while playing, otherwise a gradient
   - artwork (with the MA artwork rescue), title, artist, "player · room"
   - a live progress bar (500 ms tick) with a seek slider (sent on release [F]), elapsed and −remaining
   - shuffle, previous, a big play/pause, next, and repeat (off, all, one)
   - mute and a volume slider (300 ms throttle [F])
   - a **source** select

   Each control is shown only if the player supports it. *Why: full transport control.*
3. **Zones card** · `ZonesCard.tsx` · Every room that has players, as a **grid or list** (toggle). Each zone shows art, room name, a playing-count badge, a subline, a room-wide **mute** and a **room volume** slider (only players that support volume [F]). The header says "N / M playing". *Why: whole-home audio by room.*
4. **Other players card** · `OtherPlayersCard.tsx` · Rows with art, name, state and play/pause. Tap selects the player as the Now Playing hero; tap again to deselect. *Why: switch quickly between players.*
5. **PlayerTile** · `PlayerTile.tsx` · A compact tile with play/pause and volume, used in MediaModal. *Why: reusable quick control.*
6. **Library (Music Assistant)** · `LibraryCard.tsx` · Shows:
   - tabs: Playlists, Albums, Artists, Tracks, Radio
   - a favorites-only filter, search and pagination
   - a "Play on" player picker, remembered per user (`libraryPlayerId`)
   - a tile grid with artwork (colour placeholder when an image fails)
   - tap to play, plus an item menu: Play now, Play next, Add to queue, Replace queue

   *Why: browse and play your library without the MA app.*
7. **Queue (Music Assistant)** · `QueueCard.tsx` · "Now playing" and "Up next", "N of M in the queue", shuffle and repeat, **transfer the queue to another speaker** (select), and **speaker grouping**. With a direct MA connection (inline URL and token form, "Connect") it upgrades to the **full queue list**. *Why: queue management.*
8. **Full queue list** · `FullQueueList.tsx` · Drag to reorder (mouse, touch or keyboard) and remove per row. Changes show at once and re-sync afterwards. *Why: edit the queue like Spotify.*
9. **Speaker group menu** · `SpeakerGroupMenu.tsx` · A popover "Play together on" with checkboxes, using `media_player.join` and `unjoin`. Only compatible players from the same integration are listed. *Why: multi-room grouping.*
10. **Music section editing** · Now Playing, Zones, Other Players, Library and Queue can be hidden or hidden on mobile. *Why: personal layout.*
11. **Empty state** · "No media players found" with guidance. *Why: onboarding.*

---

## N. Energy page (`pages/Energy.tsx`, `components/energy/EnergyCards.tsx`)

1. **Period selector** · Tabs: Today, Week, Month, Year. *Why: time-range analysis.*
2. **Energy hero** · Home consumption in kWh as a big figure. Stat tiles: From grid, Returned, Solar, Battery out, and Grid cost (in the HA currency). *Why: an energy summary.*
3. **Sources card** · A stacked bar chart of grid and solar over time with a legend. Totals: from grid, solar produced, returned to grid. *Why: see where energy came from.*
4. **Solar card** · Self-consumed versus returned, plus a meter "N% self-consumed". *Why: solar efficiency.*
5. **Devices card** · Per-device consumption as horizontal bars with kWh values and a total in the header. *Why: find the big consumers.*
6. **Water card / Gas card** · Total consumption with the unit, and a per-source list when there are several. *Why: covers every utility.*
7. **Not configured** · Explanation plus a button "Open Energy settings in Home Assistant". *Why: a guided setup path.*
8. **Section editing** · Reorder, hide, mobile-hide, span and height. Sections appear only when configured in HA. *Why: fits each home.*
9. **Loading and error text** · *Why: honest states.*

---

## O. Devices page (`pages/Devices.tsx`, `components/devices/*`)

1. **Loading with progress** · A progress bar with a percentage and a hint while the device registry loads. *Why: large installs are slow, and this shows progress.*
2. **Devices hero** · "N devices · M rooms". Stats for integrations, devices, entities and rooms. The system health status pill matches the sidebar. *Why: an inventory summary.*
3. **Toolbar** · Search across name, room, manufacturer, model, integration, entity names and IDs. A room filter, an integration filter with friendly labels, and a **grid/list toggle**. *Why: find any device fast.*
4. **Device card** · Domain icon (active tint when anything is on), name, room or "Unassigned", entity count, an activity dot and a chevron. Dimmed when all its entities are hidden (editors only). *Why: browse every device.*
5. **Device details modal** · `DeviceDetailsModal.tsx` · Chips for area, integration and manufacturer · model. Entities grouped as Controls, Sensors, Configuration and Diagnostic, each with a count. For editors there is a **hide all / show all** toggle. *Why: device-level overview and control.*
6. **Device entity rows** · `DeviceEntityRow.tsx` · Inline controls by domain: toggles (light, switch, fan, input_boolean, humidifier, siren); lock (unlock asks [F]); climate stepper; number and input_number stepper; garage open/stop/close with confirmation [F]; cover open/stop/close; media previous/play-pause/next; vacuum start-pause/dock; select dropdown; Press, Activate (scene) and Run (script) buttons. For editors, a **favorite star** and **hide eye** on each row. *Why: control every entity, including config entities.*
7. **Empty states** · No devices; no matches for the filter. *Why: clarity.*

---

## P. Automations page (`pages/Automations.tsx`, `components/automation/*`)

1. **Automation hero** · `AutomationHeroCard.tsx` · Total count (big), "last ran" name and time, and a stats bar: active (green), disabled, categories (blue). Visible in `screens/automations.png`. *Why: automation health at a glance.*
2. **Recent activity feed** · `AutomationActivityFeed.tsx` · The eight most recent runs with relative times and "N ran today". *Why: shows what fired.*
3. **Category cards** · `AutomationCategoryCard.tsx` · One card per category (the HA category, else the first word of the entity id; otherwise "General"). It shows a "enabled/total" count and rows with name, last-triggered relative time ("5m ago", "Never") and an **enable/disable toggle**. Disabled rows are dimmed. *Why: manage hundreds of automations in groups.*
4. **Toolbar** · `AutomationsToolbar.tsx` · Search, a room filter (from the entity or device area), and a category filter. While a filter is active, the view becomes a filtered set of category cards. *Why: find one automation among 300+.*
5. **Section editing** · Hero, activity and every category card can be reordered, hidden, mobile-hidden, spanned and height-capped. *Why: put the most important categories first.*
6. **Empty-filter text** · *Why: clarity.*

---

## Q. Scenes page (`pages/Scenes.tsx`, `components/scenes/*`)

1. **Scene hero** · `SceneHeroCard.tsx` · Total scenes, last used (name and time), used today, rooms count. *Why: a scene overview.*
2. **Scene activity feed** · `SceneActivityFeed.tsx` · Recently activated scenes with times and "N used today". *Why: recent moods.*
3. **Per-room scene cards** · `SceneRoomCard.tsx` · Scenes grouped by area (named rooms first, "General" last) with a count. Tap activates a scene. *Why: room-organized mood control.*
4. **Section editing** · Reorder, hide, mobile-hide, span and height. *Why: personal layout.*

---

## R. System page (`pages/System.tsx`, `components/system/*`)

1. **System hero** · `SystemHeroCard.tsx` · Health status (healthy, warning or critical, same thresholds as the pill) and CPU / RAM / Disk chips. Alerts: "N low batteries", "N unavailable", or "no metrics". *Why: system health in one place.*
2. **Activity card** · Reuses the Home ActivityCard without the "Details" link. *Why: recent changes.*
3. **System monitor card** · `SystemMonitorCard.tsx` · `systemmonitor` entities grouped as Processor, Memory, Disk, Network, System and Misc. Percentage metrics get bars (green, amber above 75, red above 90). Uptime reads "N days N hours". *Why: server diagnostics without HA.*
4. **Batteries card** · `BatteriesCard.tsx` · Every battery sensor with a level-dependent icon, a colour-coded bar (≤10 critical, ≤25 low, ≤50 medium) and %. The header says "N low". *Why: battery replacement planning.*
5. **Section editing** · Reorder, hide, mobile-hide, span and height. *Why: personal layout.*

---

## S. Settings page (`pages/Settings.tsx`, `components/settings/*`)

1. **Connection card** · The user's avatar and name, a badge (demo home, HA account or token), a role (owner or user), a status dot with text (connected, reconnecting, disconnected, error, idle), the URL, the token masked as "••••1234", and data counts (N rooms · M entities). **Sign out / Disconnect**, or **Connect your Home Assistant** in demo mode. *Why: connection transparency and logout.*
2. **App name** · A text field; the name appears in the sidebar wordmark and the browser title. *Why: personal branding.*
3. **App icon picker [F incl. PWA]** · Swatches: none, pulse, home, sparkles, lightning, star, heart, flame, leaf. The choice also sets the favicon, iOS touch icon and web manifest (V3). *Why: a branded home-screen app.*
4. **Appearance mode** · Light / Dark / Auto (follows the OS). *Why: comfort.*
5. **Per-device light/dark override [F]** · `components/settings/DeviceModeRow.tsx` · Under global management: follow the global mode, or force light or dark on *this* device (for example a wall tablet). *Why: different devices have different needs.*
6. **Language** · A select: Auto plus seven languages shown in their own names (USER scope). *Why: a multilingual household.*
7. **Theme identity swatches** · `ThemeSwatch.tsx` · Aurora (neutral with orange), Sunset (amber), Ocean (blue) and Forest (green). Each swatch is a mini preview in the mode currently shown. *Why: a look the user likes.*
8. **Accent colour** · A hue slider, a live preview and "reset" to the theme default. *Why: fine personalisation.*
9. **Managed hint and read-only fieldsets [F]** · `ManagedHint.tsx` · "Managed by your administrator"; shared settings are disabled for non-admins. *Why: clear expectations.*
10. **Admin: Editing toggle** · Turns edit mode on or off for this install. Admin only. *Why: protects the layout from accidental edits.*
11. **Admin: Edit entities modal** · `EditEntitiesModal` + `EntityRow.tsx` · Search; entities grouped by room plus "Uncategorised". Per row: **inline rename** (pencil, input, ✓ / ×), **favorite star** and **hide eye**. *Why: central entity cleanup.*
12. **Admin: Settings for everyone (global management) [F]** · `GlobalSettingsAdmin.tsx` · While inactive: a hint and an "Apply my settings for everyone" button. It opens a confirmation dialog explaining that this is permanent, with an option to share the Sentinel and Music Assistant tokens. While active: "Active since … by …", "Last change … by …", a **share access** toggle and **Refresh defaults** (favorites and language for users). Write errors are shown. *Why: a household-wide consistent dashboard managed by one admin.*
13. **Rooms order and visibility** · `RoomRow.tsx` · Up / down arrows and a hide eye per room; this order drives the rooms menu, quick access and the lights modal grouping. Editors only. *Why: rooms in a sensible order.*
14. **Backup** · **Export settings** downloads `hapulse-settings.json`. **Import settings** validates the file and reports specific errors; under management a non-admin imports only their own settings [F]. The sync status line says "Settings are saved to your Home Assistant and sync across your devices". *Why: portability and safety.*
15. **About** · HAPulse, "Version 1.3.2 · F20", tagline, **What's new** (the full changelog history), and a GitHub link. *Why: version transparency.*
16. **HA settings sync** · `ha/settingsSync.ts`, `ha/userSettingsSync.ts`, `ha/globalSettings.ts` · Settings are stored in HA frontend storage. GLOBAL is stored once (the admin writes, everyone reads), USER is per HA user, DEVICE stays local, SECRET is device-local unless shared. *Why: the same dashboard on every device.*

---

## T. Onboarding and connection (`pages/Onboarding.tsx`)

1. **Onboarding screen** · The logo and the tagline "your Home Assistant, beautifully simplified". *Why: the first impression.*
2. **Sign in with Home Assistant (OAuth)** · A URL field with a mixed-content warning (HTTPS page with an HTTP URL) and a "sign in with home assistant" button. A hint says the password is never seen. Specific errors for a missing URL, mixed content, sign-in failure and an unreachable server. *Why: secure, standard login.*
3. **Advanced: long-lived token** · A collapsible URL and token form with "Connect with access token". A hint says the token is stored only in this browser. Specific errors, including a rejected token. *Why: an alternative for special setups.*
4. **Explore the demo home** · Demo mode with sample data; Settings then shows a demo badge and a "Connect your HA" call to action. *Why: try before connecting.*
5. **Finishing sign-in / Connecting** · A boot loading screen during the OAuth callback. *Why: a smooth hand-off.*
6. **Route guard** · `app/Guard.tsx` · Without credentials the user goes to onboarding. A temporary disconnect keeps them in the app. *Why: never feels like being logged out.*

---

## U. What's New / changelog

1. **Auto What's New after an update** · `components/changelog/ForkChangelogModal.tsx` · Shows upstream releases newer than last seen *and* fork releases (F-numbers) merged by date. Fork entries carry a "Fork" badge and are bilingual (DE/EN). With three or more unseen releases, the newest is shown in full and the rest as a title list under "Also new", with an **All details** button to expand. The "Got it" button has focus [F]. Closing marks everything as seen (`lastSeenFork` is DEVICE scope). *Why: users notice new features without being flooded.*
2. **Release entry sections** · `ChangelogModal.tsx` `ReleaseEntry` · Version, date, title, and Added / Changed / Fixed lists. *Why: clear release notes.*
3. **Changelog history** · Settings → About → What's new opens the full merged history. *Why: look things up later.*
4. **Fresh install shows no changelog** · `settingsStore` seeding. *Why: no noise for new users.*

---

## V. Theming, PWA, i18n and system behaviours

1. **Theme system** · `theme/themes.ts`, `packages/core/src/themes.ts` · Four identities × light/dark/auto, plus an accent override. All colours come from CSS tokens, there is a grain texture in dark mode only, and the OS mode is watched live. *Why: a consistent, attractive look in both modes.*
2. **Typography** · Bricolage Grotesque (display), Schibsted Grotesk (body) and Spline Sans Mono (data numerals with tabular figures). *Why: a distinct identity, and numbers that line up.*
3. **App icon sync and PWA [F]** · `app/appIcon.ts` → `syncAppIcon` · Swaps the favicon SVG, the apple-touch-icon (180 px PNG) and the manifest per chosen symbol (`public/icons/<id>.{svg,webmanifest}`, 180/192/512 PNGs). *Why: the installed home-screen app matches the chosen branding.*
4. **PWA meta** · `index.html` · `mobile-web-app-capable`, an Apple status bar set to black-translucent, an app title and a theme colour. *Why: a full-screen app feel on iOS and Android.*
5. **Document title sync** · `DashboardApp.tsx` · The browser tab title follows the app name. *Why: easy to recognise among tabs.*
6. **Seven languages, plurals, relative times** · `i18n/*`, `packages/core/locales/*` · *Why: native-language UX.*
7. **Locale-aware numbers [F]** · `formatNumber` · *Why: correct decimal separators.*
8. **Motion** · `.stagger-rise` page entrance, a press scale of 0.98, modals that fade and scale (bottom sheet on mobile), and `prefers-reduced-motion` respected. *Why: polish and accessibility.*
9. **Accessibility** · ARIA roles and labels on every control, focus management in modals (focus is returned on close, `data-autofocus`), Escape closes popovers and modals, keyboard-sortable grids, 44 px hit targets, and a visible accent focus ring. *Why: usable by everyone.*
10. **Optimistic and throttled controls [F]** · `components/ui/useCommitRange.ts` · Sliders update locally and send on release or with a throttle. Steppers stack quick taps. *Why: responsive, and does not flood HA.*
11. **Demo mode** · `packages/core/src/demo.ts` · Deterministic sample data, including history and logbook. *Why: try it and test it.*

---

## W. Shared UI building blocks (reuse them, don't reinvent)

1. **Modal** · `components/ui/Modal.tsx` · A portal with a blurred backdrop, Escape and backdrop click to close, scroll lock, focus trap and return, an icon and title header, an optional footer, and a bottom sheet at ≤640 px.
2. **Card** · `components/ui/Card.tsx` · A surface with hairline border, soft shadow and 20 px radius, with an `active` glow variant.
3. **EmptyState** · `components/ui/EmptyState.tsx` · Icon, title, description and an optional action.
4. **IconButton** · `components/ui/IconButton.tsx` · Ghost, default and accent variants; 36–44 px.
5. **SectionLabel** · `components/ui/SectionLabel.tsx` · Uppercase section headings with a rule (visible on the room page).
6. **MdiIcon** · `components/ui/MdiIcon.tsx` · Lazy MDI icons with a Lucide fallback (rooms, garage, waste).
7. **RoomIcon / RoomDisplayIcon** · Room identity icon and status override icon.
8. **Buttons** · `.btn--primary`, `--secondary`, `--ghost`, `--danger`; pill toggles; `.mode-toggle` segmented control.
9. **Icon chips** · Rounded squares tinted with the matching `--*-soft` token (accent, info, positive, warning, danger).
10. **Status dots and pills** · Coloured dot plus label (security rows, sensor pills, waste countdown).

---

## X. Empty, loading and error states (catalogue)

Empty states with a guiding text exist for:

- Home: scenes (star hint), devices (no favorites / all off), climate, blinds, hero (no rooms)
- every chip modal (people, lights, doors, alarm, media, garage, locks, climate-all, blinds-all, weather)
- notifications
- rooms menu, room not found, room with no devices
- security, music, energy (not configured, loading, error), devices (loading %, empty, no filter match), automations filter
- pool (not configured), pool chart (loading, empty, error), pool schedule (no windows)
- waste (no upcoming dates)
- NVR (not set up, error with retry, loading, stale banner), music library (empty, no search match, error), music queue (empty, connect prompt)
- entity detail (loading, no history, no activity, no attributes)
- page error boundary

*Why: no blank screens; every state tells the user what to do next.*

---

## Top 20 most characteristic and valuable items (protect these first)

1. **Summary chips with live counts and modals** (people avatars, lights + "Turn all off", doors, alarm, media, pool, garage, locks). The core glanceability of the app. (B)
2. **Entity detail modal** with chart or timeline, **24H/7D/30D pills (per user)**, logbook grouped by day, members, attributes and embedded controls, reachable from every card. (F)
3. **Hero room card**: auto-picked active room, photo or gradient, temperature and humidity chips, frosted Lights / Climate stepper / Media pills. (C5, G1)
4. **Edit mode**: drag reorder, eye hide, **hide on mobile only**, **column span**, **height caps with internal scroll**, nav and chip editing, admin-gated. (D)
5. **Security posture**: Home security card rows, Security hero with gradient by alarm state, people avatars and status chips. (C12, H1)
6. **Alarm panel with keypad**: supported-mode buttons, PIN dots, stays open on a wrong code. (H2, H3)
7. **Safe-action confirmations**: unlock always asks, garage open always asks, Lock/Close All and Unlock/Open All with counts, code entry. (H8, I4)
8. **Garage doors handled like locks** everywhere: chip, card, section, room, devices, status icon. (I)
9. **Native Sentinel NVR**: overview hero, events strip, histogram, storage forecast, full camera timeline with scrubbing, speeds, PiP and deep links; Sentinel as the single camera source. (J)
10. **NVR Home card**: live snapshots plus the latest events, jumping straight to the event. (J3)
11. **Pool page**: mode control, solar gauge with threshold stepper, manual timer ring and duration picker, graphical **schedule editor**, 14-day runtime chart. (K)
12. **Waste collection card**: auto-detected bins, "Next up" hero with countdown and colour, upcoming dates including rescheduled ones. (L)
13. **Room page auto-sections** with rich cards: light sliders for brightness, colour temperature and hue; climate modes; covers; vacuum; sensor tiles with fill bars. (E, G3)
14. **Rooms quick access and status icons** (open door or window, leak, smoke, garage open) on tiles and the rooms menu. (C16, A5)
15. **Climate and Blinds home cards**: arc gauge, per-room selection, steppers or open-stop-close, "See all" modals. (C8–C11)
16. **Music**: Now Playing with backdrop, seek and source; Zones grid/list with room volume and mute; MA Library and Queue with reorder, transfer and grouping. (M)
17. **System health pill** in the sidebar and the System page (CPU, RAM, disk, unavailable, batteries). (A8, R)
18. **Notifications bell and panel** with dismiss and dismiss all. (A14)
19. **Settings for everyone (global admin management)**: scopes, per-device dark-mode override, shared tokens, managed hints, per-user favorites star. (S12, S5, F3)
20. **Personalisation and identity**: four themes × modes, accent hue, app name and icon driving the PWA icons and manifest, seven languages, locale-aware numbers, What's New with fork releases. (S2–S8, V, U)

---

## Notes for the "Glas" redesign (risk list)

- Keep the **chip strip on every page** (desktop header and mobile top). It is easy to drop when only Home is restyled.
- Keep the **mobile-hide phone badge** and the **height-cap handle** in the edit overlays. They are small and easy to overlook.
- Keep the **"Turn all off"** action in the Lights modal and the **"Lock All / Unlock All"** and **"Close All / Open All"** group actions.
- Keep the **room status icon override** (a tile shows the open-door, leak, smoke or garage icon instead of the room icon).
- Keep **Climate "See all"** and **Blinds "See all"**. They are the only path to the all-thermostats and all-covers grids.
- Keep the **hero media pill** (it appears only while something is playing) and the **hero › pill**. The hero has no carousel; it auto-picks the room.
- Keep the **weather modal**: stats grid, hourly or daily forecast, and the weather entity picker for editors.
- Keep **sidebar collapse to rail**, the **RoomsMenu popover** (Rooms is not a page), and the **More** bottom sheet.
- Keep **toasts** for failed service calls and the **connection banner**.
- Keep the **"Fork" badge** and the compact "Also new" list in What's New.
