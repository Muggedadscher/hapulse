# Spec "Glas 4" — HAPulse in the Glas style (user-approved principle)

## Grundsatz (approved by the user)
Glas is a STYLE of HAPulse, not a redesign. Every HAPulse page, card, chip, modal, piece of information, order and
interaction stays exactly as in HAPulse (source of truth: /home/user/hapulse + the checklist
ROOT/HAPULSE-INVENTORY.md — read the relevant parts fully; also the Vorher artboards VorherHandy/VorherDesktop show
today's look). Only LOOK and MOTION change. Where an Apple rule would remove a HAPulse function, HAPulse wins.

## User decisions
- Mobile tabs exactly as HAPulse fork default: Übersicht · Räume · NVR · Pool · Mehr. "Räume" opens the RoomsMenu
  (bottom sheet list of rooms, not a page); "Mehr" opens the More sheet (overflow nav items).
- Greeting "Guten Morgen, Anna 👋"-style is HAPulse — use "Guten Morgen, Anna" (sample user name "Anna"; no emoji
  in the sketch) + subtitle "Das passiert gerade in deinem Zuhause."
- Logo + app name stay (sidebar top, HAPulse PulseLogo in accent tile + "HAPulse").
- NO search.

## Apple elements the user CHOSE to adopt (and only these)
Navigation: (1) phone tab bar floats as glass capsule and MINIMIZES on scroll down / expands on scroll up;
(2) large page title collapses on scroll into a soft scroll-edge glass zone with small centred title (no hard bar);
(3) desktop sidebar GROUPED with section headers (e.g. Zuhause: Übersicht, Räume, Szenen, Automationen · Bereiche:
NVR, Pool, Sicherheit, Energie, Musik, Geräte · System: System, Einstellungen) as floating glass panel — keep logo,
system status pill (with real states: "Alle Systeme normal" / "N nicht verfügbar" …) and collapse to rail.
Overview: (4) Home-app tile anatomy for device tiles (icon taps = toggle, name = opens control/detail; on = bright,
off = muted); (5) an ADDITIONAL "Hinweise" area that collects only abnormal things (2 Fenster offen, Restmüll morgen)
— in addition to all HAPulse cards, never replacing them; (6) scenes show the active scene (full colour + ring).
Sheets/controls: (7) iOS sheets for ALL modals on phone (inset, rounded, grabber, medium/large detent, swipe down to
close, grow from the tapped element; desktop: centred glass dialog growing from the element); (8) light control with
big vertical Control-Center slider + on/off button (inside the HAPulse light card/detail); (9) camera page always dark
full-bleed with a clear-glass control capsule over the video; (10) risky actions confirm INSIDE the sheet (garage
open, unlock).
Look: (11) glass strength setting klar / getönt / deckend; (12) fixed state colours: light on = yellow, heating =
orange, cooling = blue, pool = teal, OK green, alarm red — accent only for selection/primary action; (13) desktop
header tool groups as separate glass capsules: [Mitteilungen] | [Bearbeiten/Fertig] | Avatar — next to HAPulse's
weather glance pill; the summary chips stay in the header on EVERY page (desktop) / top strip (phone).
NOT adopted: search, Apple-Home "Zuhause" title, removing HAPulse sections, wallpaper as default (keep the
`hintergrund` tweak but default "grau").

## Second round of user decisions (also binding)
- (14) Context menu on long press (550 ms): lifted preview of the tile/card + glass menu with actions "Details",
  "Zu Favoriten" / "Aus Favoriten", "Raum öffnen", "Ausblenden" (+ entity-specific e.g. "Ausschalten"). The detail
  sheet is reached via "Details" (tap on read-only cards still opens detail directly, as in HAPulse).
- (15) Swipe actions in lists: swipe a row left to reveal actions (notification → Verwerfen; light row in the Lights
  sheet → Aus; lock row → Verriegeln; garage row → Schließen). Unlock/open are never swipe actions (they need confirm).
- (16) Widget sizes S/M/L in edit mode instead of span dots + height grip: S = 1 column, M = 2 columns, L = 2 columns
  + taller (maps onto HAPulse spans/height caps); keep reorder, hide, hide-on-mobile, chip & nav editing. No wiggle.
- (17) Desktop/iPad: entity detail opens as a right-side INSPECTOR panel (glass, ~420 px, slides in, overview stays
  visible and usable); phone keeps the sheet.
- Dark mode: pure black background (#000) with #1C1C1E / #2C2C2E surfaces (iOS).
- Typography: ONLY the system font everywhere (no Bricolage/Schibsted/Spline Mono, no ui-rounded).
- Colour worlds: NOT the four HAPulse identities — one neutral iOS palette + the user's accent colour (settings keeps
  the accent picker).
- Switches: iOS green when on (#34C759 / #30D158), regardless of accent.
- Section/card titles stand ABOVE the cards on the page background (Apple style: Title3 + optional "Alle ›"/Details
  link on the right), cards below contain only content.

## Visual language (from SPEC2/SPEC3, still valid)
Glass recipe SPEC3 §1 (Safari-compatible), glass only on the functional layer (tab bar, sidebar, header tool
capsules, sheets/dialogs, controls over photos/video incl. the hero card pills over the room photo), content cards
opaque and borderless, system font + tabular numbers, iOS type scale, concentric radii, springs + morphs (SPEC3 §2),
reduced-motion fallbacks, prefers-contrast. Section headers in sentence case; card title icons small and
monochrome (HAPulse keeps an icon per card title — keep it, just quieter).

## Stage 1 (now): Rahmen + Übersicht komplett, phone + desktop
Shell: logo/app name, grouped sidebar + status pill + collapse (desktop), floating tab bar with Mehr sheet and Räume
sheet (phone), header cluster with chips on top (desktop) incl. weather glance pill → weather sheet (current, stats
grid, hourly/daily forecast), notifications bell → panel (3 sample HA notifications, dismiss + "Alle verwerfen"),
avatar → settings, connection banner state (tweak), toasts (one example after a failed action tweak).
Chips (all 8, HAPulse order: people, lights, doors, garage, locks, alarm, pool, media) each opening ITS HAPulse
modal content as sheet: People (persons, zone, since), Lights (grouped by room, toggles, "Alle ausschalten"),
Doors/Windows (two groups with open/total, open first), Garage (rows, Stop/Schließen/Öffnen with confirm), Locks
(rows, Verriegeln/Entriegeln with confirm), Alarm (panel with mode buttons + PIN keypad), Pool (status, mode
buttons, solar vs threshold, runtime, manual timer, link to Pool page), Media (players grouped active/idle with
play/pause + volume, link).
Übersicht = HAPulse order: greeting · Hinweise (new, small) · scenes · hero (auto most active room = Wohnzimmer,
room photo placeholder = blurred camera image is NOT ok — use the HAPulse room-type gradient for "living", glance
chips temp/humidity, pills Licht / Klima −/+ / Medien (only when playing) / ›) · energy (big number + mini bars,
Details ›) · devices (active favourites, Home-app tiles) · climate (arc gauge, stepper, room list selectable, "Alle
anzeigen" → sheet with all thermostats) · blinds (arc gauge of selected room, Zu/Stopp/Auf, room list, "Alle
anzeigen" → sheet) · security (rows Alarm, Schlösser, Garage, Fenster, Türen, Bewegung, Kameras; Details ›) · waste
(next-up hero with countdown + bin colour, upcoming list, tap → bin sheet with upcoming dates incl. "(verlegt)") ·
Sentinel NVR (live snapshot tile + latest events; event tap → camera page at that moment) · activity (5 rows, Details
›) · rooms (tiles with temp/humidity/lights, STATUS ICON override when door open etc., tap → room).
Entity DETAIL sheet (HAPulse EntityDetailModal): opened by tapping any read-only card/row or long-press (550 ms) on
action tiles; shows header, current state, chart with 24H/7D/30D pill selector (value chart for sensors, on/off
timeline for lights), logbook grouped by day, attributes; for a light: the big vertical slider (8) on top.
Pages other than Übersicht and the camera page from the NVR card: not in stage 1 (nav may show a simple "folgt in
Etappe 3/4" state).
