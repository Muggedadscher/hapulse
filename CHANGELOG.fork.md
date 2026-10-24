# Changelog — Fork-Erweiterungen

Die eigenen Erweiterungen dieses Forks (F1, F2, …), zusätzlich zu den Upstream-Releases in `CHANGELOG.md`.
In der App: „Was ist neu“ nach einem Update und Einstellungen → Über.

<!-- Generiert aus packages/core/src/forkChangelog.ts: `npm run build -w @hapulse/core && node packages/core/scripts/gen-fork-changelog.mjs`.
     Nicht von Hand ändern — die Datei wird überschrieben. -->

## F62 — 2026-10-24

**Komfortzeiten im Heizplan ändern** · _Change the comfort times of a heating plan_

### Neu / Added

- Im Fenster „Zeitplan und Temperaturen“ öffnet ein Tipp auf eine Gruppe von Tagen ihre Zeiten: Tage wählen, am 24-Stunden-Ring ziehen oder die Uhrzeit eintippen, in Schritten von 5 Minuten  
  _In the window “Schedule and temperatures” a tap on a group of days opens its times: choose the days, drag on the 24-hour ring or type the time, in steps of 5 minutes_
- Eine zweite Zeit am Tag hinzufügen, eine Zeit entfernen oder alle Zeiten der gewählten Tage löschen; „Zeiten für weitere Tage“ legt Zeiten für Tage ohne Komfortzeit an  
  _Add a second time of the day, remove a time or delete all times of the chosen days; “Times for other days” sets times for days without a comfort time_
- Der Haken speichert die Zeiten sofort in Home Assistant, auch ohne Administratorrechte; nimmt Home Assistant sie nicht an, bleibt die Seite offen mit „Erneut versuchen“  
  _The check mark saves the times in Home Assistant at once, also without administrator rights; when Home Assistant does not take them, the page stays open with “Try again”_

## F61 — 2026-10-24

**Heizplan in jedem Raum** · _Heating plan in every room_

### Neu / Added

- In Räumen mit Heizplan steht unter „Klima“ die Karte „Heizplan“: was gerade gilt und bis wann, der heutige Tag als Balken mit den Komfortzeiten, Komfort- und Eco-Temperatur und ein Schalter für den Plan  
  _Rooms with a heating plan show the card “Heating plan” under “Climate”: what applies now and until when, today as a bar with the comfort times, the comfort and eco temperatures and a switch for the plan_
- „Zeitplan und Temperaturen“ öffnet ein Fenster mit dem Schalter, Komfort und Eco zum Einstellen und den Komfortzeiten, nach gleichen Tagen gruppiert  
  _“Schedule and temperatures” opens a window with the switch, comfort and eco to set and the comfort times grouped by equal days_
- Ausschalten fragt vorher, denn dann sind auch Fenster- und Frostschutz des Raums aus; die Karte sagt, wenn ein Fenster offen ist oder das Thermostat dem Plan nicht folgt  
  _Switching off asks first, as the room’s window and frost protection are off then too; the card says when a window is open or the thermostat does not follow the plan_
- Alle Benutzer können das bedienen, auch ohne Administratorrechte in Home Assistant  
  _Every user can do this, also without administrator rights in Home Assistant_

## F60 — 2026-10-24

**Automationen nach den Kategorien aus Home Assistant** · _Automations grouped by Home Assistant’s categories_

### Geändert / Changed

- Die Gruppen unter Automationen tragen die Kategorie, die eine Automation in Home Assistant hat, wie dessen eigene Automationsliste; Automationen ohne Kategorie bleiben nach dem ersten Wort ihres Namens gruppiert  
  _The groups on the automations page carry the category an automation has in Home Assistant, like its own automation list; automations without a category stay grouped by the first word of their name_
- Eine Gruppe, die dadurch einen neuen Namen bekommt, steht einmalig wieder sichtbar an ihrem Standardplatz, auch wenn sie vorher ausgeblendet oder verschoben war; ebenso nach dem Umbenennen einer Kategorie in Home Assistant  
  _A group that gets a new name this way shows up once more at its default place, even if it was hidden or moved before; the same after renaming a category in Home Assistant_

## F59 — 2026-10-24

**Thermostat in der Raumkarte zählt jeden Tipp** · _Thermostat in the room card counts every tap_

### Behoben / Fixed

- Plus und Minus an der Thermostat-Pille der Raumkarte zählen jeden Tipp und zeigen den neuen Wert sofort, wie die Klima-Karte; vorher schickten schnelle Tipps immer denselben Wert, bis das Thermostat geantwortet hatte  
  _Plus and minus on the room card’s thermostat pill count every tap and show the new value at once, like the climate card; quick taps used to send the same value until the thermostat had answered_
- Die Pille hält Schrittweite, Mindest- und Höchstwert des Thermostats ein und ist gesperrt, wenn es keine einzelne Solltemperatur meldet (etwa im Bereichsmodus)  
  _The pill keeps to the thermostat’s step, minimum and maximum and is disabled when it reports no single target temperature (e.g. in range mode)_

## F58 — 2026-10-23

**Pool: aufgeräumt auf breiten Bildschirmen** · _Pool: tidy on wide screens_

### Geändert / Changed

- Die Karte „Solar-Automatik“ steht in einer schmalen Spalte mittig untereinander wie „Manueller Betrieb“, statt mit leerer rechter Hälfte  
  _The card “Solar automation” stacks centred in a narrow column like “Manual run”, instead of leaving its right half empty_
- „Laufzeit pro Tag“ ist auf Tablet und Desktop zwei Spalten breit, auf sehr breiten Bildschirmen der Rest der Zeile; im Stil Glas steht der Wert des Tages groß oben in der Karte  
  _“Runtime per day” is two columns wide on tablet and desktop, the rest of the row on very wide screens; in Glass the day’s value stands large at the top of the card_

## F57 — 2026-10-22

**Energie: Balken stehen wieder unten** · _Energy: bars stand on the base again_

### Behoben / Fixed

- Die Balken der Karten „Verbrauch“ und „Solar“ füllen ihre Spalte auch bei kleinen Werten unter 1 kWh und schweben nicht mehr über der Grundlinie  
  _The bars of the cards “Consumption” and “Solar” fill their column also for small values below 1 kWh and no longer float above the base line_

## F56 — 2026-10-21

**Energie: jetzt und Batterie** · _Energy: now and battery_

### Neu / Added

- Die Karte „Jetzt“ sagt in einem Satz, was gerade passiert, und zeigt den Fluss von Solar, Batterie und Netz zum Haus, zur Batterie und ins Netz  
  _The card “Now” says in one sentence what is happening and shows the flow from solar, battery and grid to the home, the battery and the grid_
- Die Karte „Batterie“ zeigt den Ladezustand, ob sie lädt oder entlädt, wann sie ungefähr voll ist und den Ladezustand des Tages  
  _The card “Battery” shows the charge, whether it charges or discharges, when it will be about full and the charge of the day_
- Die Energiekarte der Übersicht rechnet ihre Balken wie die Energieseite, zeigt die Batterie als Teil der Balken und darunter ihren Ladezustand  
  _The overview’s energy card computes its bars like the energy page, shows the battery as part of the bars and its charge below them_

## F55 — 2026-10-21

**Energie: Verbrauch nach Herkunft, Solar nach Ziel** · _Energy: consumption by origin, solar by destination_

### Geändert / Changed

- Die Karte „Verbrauch“ ersetzt „Quellen“: wie viel Prozent aus eigenem Strom kamen, die Anteile Solar, Batterie und Netz und die Balken nach Herkunft  
  _The card “Consumption” replaces “Sources”: how much came from your own power, the shares of solar, battery and grid and the bars by origin_
- Die Karte „Solar“ zeigt, wie viel Prozent selbst genutzt wurden und wohin der Solarstrom ging (Haus, Batterie, Netz), auch je Stunde  
  _The card “Solar” shows how much was used yourself and where the solar power went (home, battery, grid), also per hour_
- Der Kopf der Energieseite vergleicht mit dem Vorzeitraum, zeigt die Batterie als Paar geladen und entladen und in Glas den PV-Ertrag unter dem Hausverbrauch  
  _The head of the energy page compares with the period before, shows the battery as a pair charged and discharged and, in Glas, the solar yield below the home consumption_

## F54 — 2026-10-21

**Energie: Netzkosten mit Einspeisevergütung** · _Energy: grid cost with feed-in compensation_

### Behoben / Fixed

- Die Netzkosten ziehen die Einspeisevergütung auch im aktuellen Format der Home-Assistant-Energieeinstellungen ab  
  _The grid cost subtracts the feed-in compensation also in the current format of the Home Assistant energy settings_

## F53 — 2026-10-19

**Kameras: Zeitanzeige beim Spulen** · _Cameras: time display while scrubbing_

### Behoben / Fixed

- Beim schnellen Spulen durch Aufnahmen, vor allem rückwärts, springt die Zeitanzeige nicht mehr vor und zurück  
  _When scrubbing quickly through recordings, above all backwards, the time display no longer jumps back and forth_

## F52 — 2026-10-19

**Kameras: Sprünge in kurze Aufnahmelücken** · _Cameras: jumps into short recording gaps_

### Behoben / Fixed

- Ein Sprung in eine der kurzen Lücken zwischen zwei Aufnahmen spielt ab der nächsten Aufnahme, statt „Keine Aufnahme“ zu zeigen  
  _A jump into one of the short gaps between two recordings plays from the next recording instead of showing "No recording"_
- Die Ersatz-Wiedergabe von Aufnahmen (wenn die normale nicht verfügbar ist) bleibt beim Start nicht mehr gelegentlich stehen  
  _The fallback playback of recordings (when the normal one is unavailable) no longer occasionally freezes at the start_

## F51 — 2026-10-18

**Ereignisse der letzten 24 Stunden** · _Events of the last 24 hours_

### Geändert / Changed

- Glas: Die NVR-Karte auf der Übersicht zeigt in der Bilderreihe alle Ereignisse der letzten 24 Stunden statt nur der letzten vier  
  _Glass: the NVR card on the overview shows every event of the last 24 hours in its row of pictures instead of only the latest four_
- Die Ereignis-Leiste auf der Sicherheitsseite zeigt ebenfalls alle Ereignisse der letzten 24 Stunden statt der letzten 20  
  _The event strip on the Security page also shows every event of the last 24 hours instead of the latest 20_
- Auch an Tagen mit mehr als 200 Ereignissen reichen die Ereignisse bis 24 Stunden zurück (mit dem aktuellen Sentinel)  
  _Even on days with more than 200 events the events reach back 24 hours (with the current Sentinel)_

## F50 — 2026-10-18

**Ereignis ohne Zurückspringen** · _Events without the jump back_

### Behoben / Fixed

- Kamera: Nach dem Tippen auf ein Ereignis zeigt das Standbild schon den Moment, an dem die Wiedergabe beginnt. Das Video springt beim Start nicht mehr ein paar Sekunden zurück  
  _Camera: after tapping an event the still picture already shows the moment the playback starts. The video no longer jumps back a few seconds when it starts_

## F49 — 2026-10-15

**Kamera ohne Seitenleiste** · _Camera without the sidebar_

### Geändert / Changed

- Glas: Auf dem Computer und dem iPad quer verschwindet die helle Seitenleiste, solange eine Kamera offen ist. Die Seite ist durchgehend dunkel und das Bild größer, die Zeile mit den Chips bleibt  
  _Glass: on a computer and a landscape iPad the light sidebar goes while a camera is open. The page is dark throughout and the picture larger; the row with the chips stays_

## F48 — 2026-10-14

**Rollläden einzeln aus der Übersicht** · _Single blinds from the overview_

### Geändert / Changed

- Glas: Die Rollläden-Karte und das Fenster „Alle anzeigen“ zeigen das Rollo-Symbol wie die übrige App statt „≡“, das wie ein Menü-Knopf aussah  
  _Glass: the blinds card and its "See all" window show the blind symbol like the rest of the app instead of "≡", which looked like a menu button_
- Glas: Ein Tipp auf das Rollo-Bild oder den Raumnamen der Rollläden-Karte öffnet die Rollläden dieses Raums einzeln, jeder mit Auf, Stopp und Zu  
  _Glass: a tap on the blinds card's picture or room name opens that room's blinds one by one, each with open, stop and close_

## F47 — 2026-10-14

**Rollläden-Karte wie in Apples Home** · _Blinds card as in Apple Home_

### Geändert / Changed

- Glas: Die Rollläden-Karte der Übersicht zeigt auf dem Handy statt des Rings ein kleines Fenster, dessen Rollo so weit unten ist wie im Raum, und daneben genau einen Zustand: „Offen“, „Geschlossen“ oder zum Beispiel „40 % offen“  
  _Glass: on the phone, the blinds card on the overview shows a little window instead of the ring, its blind drawn down as far as in the room, and beside it one state: "Open", "Closed" or for example "40% open"_
- Glas: Die Raumliste unter der Rollläden-Karte erscheint erst ab zwei Räumen und zählt wie überall sonst, wie weit offen  
  _Glass: the room list under the blinds card only appears with two or more rooms and counts how far open, as everywhere else_

## F46 — 2026-10-12

**Sentinel auf dem Desktop wie auf dem Handy** · _Sentinel on the desktop as on the phone_

### Geändert / Changed

- Glas: Die NVR-Karte auf der Übersicht und die NVR-Seite sehen auf dem Desktop jetzt aus wie auf dem Handy: große Kamerabilder mit Glas-Kapsel (Aufnahmepunkt, Name, Zustand) und die Ereignisse als Bilderreihe  
  _Glass: the NVR card on the overview and the NVR page now look on the desktop as on the phone: large camera pictures with a glass capsule (recording dot, name, state) and the events as a row of pictures_
- Glas: Mit der Maus blättern runde Pfeil-Knöpfe an den Enden die Kamera- und Ereignisreihe weiter  
  _Glass: with a mouse, round arrow buttons at the ends page through the camera and event rows_

## F45 — 2026-10-12

**Kopf-Tafeln in Glas** · _Head panels in Glass_

### Geändert / Changed

- Glas: Die großen Karten oben auf Geräte, System, Energie, Sicherheit, NVR, Automationen und Szenen sind jetzt einheitlich: oben der Zustand groß mit Symbol im Kreis, darunter die Werte in einem Raster mit feinen Linien statt grauer Kacheln  
  _Glass: the large cards at the top of Devices, System, Energy, Security, NVR, Automations and Scenes now share one look: the state large with its symbol in a circle on top, below it the values in a grid with fine lines instead of grey tiles_
- Glas: Farbe nur, wo etwas abweicht, offene Türen und Fenster gelb, offene Schlösser und Garagentore rot, alles Geschlossene und alle Zählwerte grau; die Karten haben keinen farbigen Schleier mehr  
  _Glass: colour only where something differs, open doors and windows yellow, open locks and garage doors red, everything closed and every count grey; the cards no longer have a coloured wash_
- Glas: System zeigt CPU, RAM und Speicher als Ringe, darunter Hinweise zu schwachen Batterien und nicht verfügbaren Geräten  
  _Glass: System shows CPU, RAM and storage as rings, below them notes about low batteries and unavailable devices_

## F44 — 2026-10-11

**NVR-Seite wie die Karte** · _NVR page like the card_

### Geändert / Changed

- Glas: Die NVR-Seite sieht aus wie die NVR-Karte der Übersicht, erst die Kameras als große Bilder, dann die Ereignisse mit Uhrzeit, Art und Kamera; am Desktop stehen die Ereignisse als Liste neben den Kameras  
  _Glass: the NVR page looks like the overview’s NVR card, first the cameras as large pictures, then the events with time, kind and camera; on the desktop the events are a list beside the cameras_
- Glas: Ereignisse von gestern oder früher zeigen den Tag vor der Uhrzeit, auch auf der NVR-Karte  
  _Glass: events from yesterday or earlier show the day before the time, on the NVR card too_
- Glas: Auf großen Bildschirmen sind die Kameranamen auch über hellen Bildern gut lesbar, der Verlauf darunter ist dunkler  
  _Glass: on large screens the camera names stay readable over bright pictures too, the shade under them is darker_
- Kamera-Kacheln der NVR-Karte (und in Glas der NVR-Seite) laden ein fehlgeschlagenes Bild alle 30 Sekunden neu, etwa wenn eine Kamera wieder online ist  
  _Camera tiles on the NVR card (and in Glass on the NVR page) load a failed picture again every 30 seconds, for example once a camera is back online_

## F43 — 2026-10-11

**Zurück aus der Kamera** · _Back from a camera_

### Geändert / Changed

- Glas: Zurück aus einer Kamera führt dorthin, wo du sie geöffnet hast (Übersicht, Sicherheit, Raum oder NVR), an dieselbe Stelle der Seite; das Bild schrumpft dabei in seine Kachel zurück  
  _Glass: back from a camera returns to where you opened it (overview, security, a room or NVR), at the same place on the page, with the picture shrinking back into its tile_
- Kamera-Kacheln in beiden Stilen: beim Zurückkommen steht sofort das letzte Bild darin, bis das neue geladen ist  
  _Camera tiles in both styles: when you come back they show the last picture at once, until the new one has loaded_

## F42 — 2026-10-11

**Kameraseite oben scharf** · _Camera page sharp at the top_

### Behoben / Fixed

- Glas am Handy: auf der Kameraseite liegt die Statusleiste auf dem Schwarz hinter dem Bild; Bild, Knöpfe und Name oben werden nicht mehr verwischt  
  _Glass on the phone: on the camera page the status bar sits on the black behind the picture; the picture, the buttons and the name at the top are no longer blurred_

## F41 — 2026-10-10

**Stil Glas** · _Glass style_

### Geändert / Changed

- Glas ist fertig: der Stil heißt nur noch „Glas“, nicht mehr „Glas (Vorschau)“; die Stil-Zeile sehen alle, ändern dürfen Stil, Stärke und „Transparenz reduzieren“ nur Admins  
  _Glass is done: the style is just called “Glass”, no longer “Glass (preview)”; everybody sees the style row, only admins change the style, the strength and “Reduce transparency”_
- Glas: Seitenwechsel über Tab-Leiste, Seitenleiste und Mehr-Menü blenden weich über, die neue Seite steigt leicht auf; eine Kamera öffnet sich aus ihrer Kachel heraus; bei reduzierter Bewegung nur eine kurze Überblendung  
  _Glass: page changes from the tab bar, the sidebar and the More menu cross-fade while the new page rises a little; a camera opens out of its tile; with reduced motion only a short cross-fade_
- Glas auf Handy und iPad: nach einem Tipp bleibt keine Hover-Tönung mehr stehen  
  _Glass on the phone and the iPad: no hover tint stays behind after a tap_
- Glas besser lesbar: Fenster im hellen Modus weiß, der aktive Tab auf einer deckenden Linse, Kameranamen auf einer dunkleren Kapsel, Fenster über der Kameraseite dunkel, Fokusringe auch auf Bildern und farbigen Flächen deutlich  
  _Glass easier to read: windows white in light mode, the active tab on an opaque lens, camera names on a darker capsule, windows over the camera page dark, focus rings clear also on pictures and coloured surfaces_
- Glas am Handy: die Kameraseite ist auch unter der Statusleiste dunkel, oben schimmert nichts Helles mehr über dem Bild  
  _Glass on the phone: the camera page is dark under the status bar too, no light shimmer above the picture any more_
- Glas: die Sentinel-Übersicht beginnt mit einem ruhigen Kopf (Zustand groß, Werte als Kapseln), „Ereignisse“ und „Kameras“ tragen ihr Symbol im Titel, der Speicherhinweis steht als Fußnote; „Sentinel öffnen“, „Räume“ und „Einrichtung“ liegen im Menü „⋯“  
  _Glass: the Sentinel overview starts with a calm header (the state large, the values as capsules), “Events” and “Cameras” carry their symbol in the title, the storage notice is a footnote; “Open Sentinel”, “Rooms” and “Setup” are in the “⋯” menu_
- Glas: „Clip herunterladen“ ist eine schwebende Glasleiste über dem Bild mit „Von“ und „Bis“ als Segment und rundem Schließen-Knopf; am Handy bleibt das Bild randlos  
  _Glass: “Download clip” is a floating glass bar over the picture with “From” and “To” as a segment and a round close button; on the phone the picture stays edge to edge_
- Clip-Leiste in beiden Stilen: das × bleibt in seiner Zeile, auch bei breiten Uhrzeiten (12-Stunden-Uhr)  
  _Clip bar in both styles: the × stays on its line, also with wide times (12-hour clock)_
- Glas am iPad quer: neben dem offenen Detail bleiben die Knöpfe oben ganz, die Wetteranzeige wird kürzer oder weicht, die Chip-Leiste zeigt keine angeschnittenen Chips  
  _Glass on the iPad in landscape: beside the open detail the buttons at the top stay whole, the weather pill gets shorter or gives way, the chip strip shows no cut-off chips_

## F40 — 2026-10-10

**Vorschau Glas: Kameras** · _Glass preview: cameras_

### Geändert / Changed

- Glas auf dem Handy und dem iPad hochkant: die Kameraseite füllt den Bildschirm, das Bild beginnt am oberen Rand, Zurück und Name liegen darüber, Tab- und Chip-Leiste weichen und kommen beim Zurückgehen wieder; die Seite ist dunkel, auch im hellen Modus  
  _Glass on the phone and an upright iPad: the camera page fills the screen, the picture starts at the top edge with back and the name over it, the tab and chip bars step aside and come back when you go back; the page is dark, also in light mode_
- Glas: Steuerkapsel, Ton, Datum, Zoom und LIVE als Glas über Bild und Zeitleiste, Zeitleiste und Ereignisse als Segment, neben dem Namen LIVE oder die Uhrzeit des Bildes; ab 900 Pixel Breite das Bild mit runden Ecken und die Zeitleiste als dunkle Fläche neben der Seitenleiste  
  _Glass: control capsule, sound, date, zoom and LIVE as glass over the picture and the timeline, timeline and events as a segment, next to the name LIVE or the picture’s time; from 900 pixels wide the picture with round corners and the timeline as a dark surface next to the sidebar_
- Glas: Sentinel-Übersicht, Sicherheit und Räume mit Kamera-Kacheln wie die Kamera-Karte der Übersicht, Ereignisleiste, Diagramm und Speicher im Glas-Look; die Einrichtung wählt Token oder Konto per Segment, Datum und Uhrzeit wählt man in einem Glas-Fenster  
  _Glass: the Sentinel overview, security and rooms with camera tiles like the overview’s camera card, events strip, chart and storage in the glass look; the setup picks token or account with a segment, date and time are picked in a glass window_
- Sentinel-Übersicht in beiden Stilen: die Zahl der Segmente und der Ereignisse von heute mit Tausenderpunkt („48.210“), die Knöpfe oben nennen ihren Namen auch beim Darüberfahren mit der Maus  
  _Sentinel overview in both styles: the number of segments and today’s events with digit grouping (“48,210”), the buttons at the top also show their name on mouse hover_

## F39 — 2026-10-10

**Texte richtig geschrieben** · _Texts written properly_

### Behoben / Fixed

- Texte beginnen groß, Nomen und Namen sind richtig geschrieben (etwa „Türen & Fenster“, „Niemand zu Hause“, „Home Assistant“), in beiden Stilen und allen sieben Sprachen; vorher zeigte Glas nur den ersten Buchstaben groß und Klassisch viele Texte klein  
  _Texts start with a capital and names are spelled right (for example “Doors & windows”, “Home Assistant”), in both styles and all seven languages; before, Glass only raised the first letter and Classic showed many texts in lower case_

## F38 — 2026-10-10

**Vorschau Glas: übrige Seiten und Menüs** · _Glass preview: the other pages and menus_

### Geändert / Changed

- Glas: alle übrigen Seiten im Glas-Look (Raum, Sicherheit, Pool, Energie, Musik, Geräte, Automationen, Szenen, System, Einstellungen, Anmeldung) mit Kartentiteln über der Fläche, ruhigen Kopfkarten und Listen wie in den iOS-Einstellungen  
  _Glass: all remaining pages in the glass look (room, security, pool, energy, music, devices, automations, scenes, system, settings, sign-in) with card titles above the cards, calm header cards and lists like in the iOS settings_
- Glas: iOS-Schalter in allen Listen, Segmente für Zeitraum, Pool-Modus, Stil, Hell/Dunkel und Ansicht, dazu runde Stepper, Auswahl-Pillen, Regler und Eingabefelder im Glas-Look  
  _Glass: iOS switches in every list, segments for the period, pool mode, style, light/dark and view, plus round steppers, choice pills, sliders and text fields in the glass look_
- Glas im Raum: Licht- und Schalter-Kacheln schalten als Ganzes, Klima mit Soll-Kapsel − / +, Rollläden mit einem kleinen Rollo nach der Position; ebenso in den Fenstern „Klima“ und „Rollläden“  
  _Glass in a room: light and switch tiles switch as a whole, climate with a target capsule − / +, blinds with a little blind that follows the position; the same in the “Climate” and “Blinds” windows_
- Glas ab 900 Pixel Breite: Bearbeiten mit den Größen S, M und L auch auf Sicherheit, Energie, Automationen, Szenen und System  
  _Glass from 900 pixels wide: edit with the sizes S, M and L also on security, energy, automations, scenes and system_
- Glas: die Fenster der Chips nennen oben, was der Chip sagt („5 an“); das Mehr-Menü zeigt den Energieverbrauch von heute, die Zahl der Szenen und den Systemzustand, das Räume-Menü den Zustand jedes Raums wie die Raumkacheln  
  _Glass: the chips’ windows say at the top what the chip says (“5 on”); the More menu shows today’s energy use, the number of scenes and the system state, the rooms menu each room’s state like the room tiles_

## F37 — 2026-10-10

**Klima: richtige Temperatureinheit** · _Climate: the right temperature unit_

### Behoben / Fixed

- Klima: HAPulse übernimmt die Temperatureinheit aus Home Assistant; Thermostate mit hohem Höchstwert (etwa 90 °C) galten vorher als Fahrenheit, in Glas stand „°F“ und der Bogen der Klima-Karte blieb in beiden Stilen leer  
  _Climate: HAPulse takes the temperature unit from Home Assistant; thermostats with a high maximum (about 90 °C) counted as Fahrenheit before, Glass showed “°F” and the climate card’s ring stayed empty in both styles_

## F36 — 2026-10-09

**Hinweise und aktive Szenen; Vorschau Glas: Übersicht** · _Notices and active scenes; Glass preview: overview_

### Neu / Added

- Übersicht: neue Karte „Hinweise“, nur wenn etwas abweicht (Alarm, Wasser, Rauch, offene Garage oder offenes Schloss, offene Fenster, Türen ab 10 Minuten, Störungen, Kameras ohne Aufnahme, die Tonne von heute oder morgen); ein Tipp öffnet das passende Fenster, im Bearbeiten-Modus lässt sie sich ausblenden  
  _Overview: a new “Notices” card, only when something deviates (alarm, water, smoke, an open garage door or lock, open windows, doors open for 10 minutes, faults, cameras not recording, the bin due today or tomorrow); a tap opens the matching window, in edit mode it can be hidden_
- Szenen-Kacheln zeigen nach dem Aktivieren „Aktiv“, sonst die Zahl ihrer Geräte; Home Assistant kennt diesen Zustand nicht, deshalb gilt eine Szene als aktiv, bis sich eines ihrer Geräte ändert (Rollläden dürfen zwei Minuten nachfahren), Szenen ohne Geräteliste nie  
  _Scene tiles show “Active” after you activate them, otherwise how many devices they have; Home Assistant has no such state, so a scene counts as active until one of its devices changes (blinds may keep moving for two minutes), scenes without a device list never_
- Energie-Karte: Netz und Solar gestapelt, mit der Zeile „PV-Ertrag“, wenn eine Solaranlage eingerichtet ist  
  _Energy card: grid and solar stacked, with a “PV yield” line when solar is set up_

### Geändert / Changed

- Glas: die ganze Übersicht im Glas-Look, Titel über den Karten, ein Ring um die aktive Szene, Lichtkreise im Hauptraum, Geräte als Kacheln (Handy) oder Zeilen mit Schalter (Computer), Klima und Rollläden mit Raumauswahl; ein hier ausgeschaltetes Gerät bleibt als „Aus“ stehen, bis die Seite neu lädt  
  _Glass: the whole overview in the glass look, titles above the cards, a ring around the active scene, light circles in the main room, devices as tiles (phone) or rows with a switch (computer), climate and blinds with a room choice; a device switched off here stays as “Off” until the page reloads_
- Glas: Energie für Tag, Woche oder Monat mit Verbrauchsbalken (Netz unten, eigener Solarstrom oben), dem Wert eines Balkens per Tipp und dem Vergleich mit dem Zeitraum davor  
  _Glass: energy for a day, week or month with consumption bars (grid at the bottom, your own solar power on top), the value of a bar on a tap and the comparison with the period before_
- Glas ab 900 Pixel Breite: im Bearbeiten-Modus hat jede Karte eine Leiste mit den Größen S, M und L, Verschieben, Ausblenden und „⋯“ für Spalten und Höhe  
  _Glass from 900 pixels wide: in edit mode every card has a bar with the sizes S, M and L, move, hide and “⋯” for columns and height_
- Glas: das Detail eines Lichts mit großem Helligkeitsregler, der Verlauf mit 24H, 7D und 30D; langes Drücken auf Szenen und Geräte der Übersicht öffnet das Kontextmenü mit „Raum öffnen“; die Chips oben zeigen ihre Art in Farbe  
  _Glass: a light’s detail with a large brightness control, the history with 24H, 7D and 30D; a long press on scenes and devices of the overview opens the context menu with “Open room”; the chips at the top show their kind in colour_

## F35 — 2026-10-08

**Vorschau Glas: Kontextmenü, Wischen, Inspector** · _Glass preview: context menu, swipe, inspector_

### Geändert / Changed

- Glas: langes Drücken auf eine Karte in einem Raum (am Computer Rechtsklick) öffnet ein Menü mit Details, Ein/Aus, Favoriten und Ausblenden; kurzes Tippen bleibt, wie es war  
  _Glass: a long press on a card in a room (a right click on a computer) opens a menu with details, on/off, favourites and hide; a short tap stays as it was_
- Glas: Zeilen nach links wischen, um eine Benachrichtigung zu verwerfen, ein Licht auszuschalten, eine Garage zu schließen oder ein Schloss zu verriegeln; die Aktion läuft erst beim Antippen, geöffnet und entriegelt wird nie per Wischen  
  _Glass: swipe a row to the left to dismiss a notification, turn a light off, close a garage door or lock a lock; the action runs only when you tap it, nothing is ever opened or unlocked by swiping_
- Glas ab 1100 Pixel Breite: Details öffnen rechts neben der Seite, die bedienbar bleibt; ein Tipp auf eine andere Karte wechselt den Inhalt  
  _Glass from 1100 pixels wide: details open on the right next to the page, which stays usable; tapping another card switches the content_

## F34 — 2026-10-08

**Vorschau Glas: Fenster** · _Glass preview: windows_

### Geändert / Changed

- Glas am Handy und am iPad hochkant: Fenster kommen als Blatt von unten und wachsen aus dem, was man angetippt hat; am Griff zieht man sie größer, kleiner oder nach unten weg, am Handy quer sind sie gleich groß  
  _Glass on the phone and on an upright iPad: windows come up as a sheet and grow out of what you tapped; drag the grabber to make them taller or smaller or to pull them down, on a phone in landscape they open tall right away_
- Glas ab 900 Pixel Breite (Desktop, iPad quer): Fenster schweben als Glas-Dialoge in passender Breite über der Seite  
  _Glass from 900 pixels wide (desktop, iPad in landscape): windows float over the page as glass dialogs with a fitting width_
- Glas: Rückfragen wie „Entriegeln“ oder „Garage öffnen“ sind eine eigene Seite im Fenster mit „Zurück“; der Ziffernblock des Alarms hat runde Tasten und wackelt bei falschem Code  
  _Glass: questions such as “Unlock” or “Open garage” are a page of their own inside the window with “Back”; the alarm keypad has round keys and shakes on a wrong code_
- Glas am Handy: Benachrichtigungen aus dem Avatar-Menü als Fenster, neueste zuerst, mit Uhrzeit, Verwerfen und „Alle verwerfen“  
  _Glass on the phone: notifications from the avatar menu as a window, newest first, with the time, dismiss and “Dismiss all”_
- Glas: Personen, Licht, Türen & Fenster, Garage, Schlösser, Alarm, Pool, Medien, Wetter und Müll im Glas-Look; der Neustart der Poolpumpe fragt im Fenster statt im Browser-Dialog  
  _Glass: people, lights, doors & windows, garage, locks, alarm, pool, media, weather and waste in the glass look; restarting the pool pump asks in a window instead of a browser dialog_

## F33 — 2026-10-07

**Vorschau Glas: ruhigere Tab-Leiste** · _Glass preview: calmer tab bar_

### Geändert / Changed

- Glas am Handy: die Linse der Tab-Leiste gleitet langsamer zum neuen Eintrag, und die Leiste schrumpft und wächst beim Scrollen ruhiger, damit man die Bewegung sieht  
  _Glass on the phone: the tab bar’s lens glides more slowly to the new entry, and the bar shrinks and grows more calmly when you scroll, so the motion can be seen_

## F32 — 2026-10-06

**Vorschau Glas: neuer Rahmen** · _Glass preview: new frame_

### Geändert / Changed

- Glas am Handy: die Tab-Leiste schwebt mit einer gleitenden Linse und schrumpft beim Scrollen nach unten zu einem Kreis; oben rechts öffnet der Avatar Benachrichtigungen, Bearbeiten und Einstellungen, auf Raumseiten führt oben links ein Knopf zurück  
  _Glass on the phone: the tab bar floats with a gliding lens and shrinks to a circle when you scroll down; at the top right the avatar opens notifications, edit and settings, on room pages a button at the top left goes back_
- Glas am Desktop und iPad: schwebende Seitenleiste mit den Gruppen Zuhause, Bereiche und System, oben Glas-Knöpfe für Benachrichtigungen und Bearbeiten  
  _Glass on desktop and iPad: a floating sidebar with the groups Home, Categories and System, glass buttons for notifications and edit at the top_
- Glas überall: große Seitentitel, am Handy werden sie beim Scrollen an einer weichen Kante zu einem kleinen Titel; Menüs, Verbindungsbanner und Fehlermeldungen im Glas-Look  
  _Glass everywhere: large page titles, which on the phone become a small title at a soft edge when you scroll; menus, the connection banner and error messages in the Glass look_

## F31 — 2026-10-06

**Vorschau: Stil „Glas“** · _Preview: “Glass” style_

### Neu / Added

- Für Admins: unter Einstellungen → Darstellung den Stil „Klassisch“ oder „Glas“ wählen; Glas ändert nur Aussehen und Bewegung (iOS-Farben, Systemschrift, reines Schwarz im Dunkelmodus), alle Funktionen bleiben, und bei der Verwaltung für alle gilt der Stil für jeden Nutzer  
  _For admins: choose the style “Classic” or “Glass” under Settings → Appearance; Glass only changes the look and the motion (iOS colours, system font, pure black in dark mode), every function stays, and with the shared administration the style applies to every user_
- Im Stil Glas: Glas-Stärke klar, getönt oder deckend und „Transparenz reduzieren“; Hell/Dunkel lässt sich weiterhin pro Gerät wählen  
  _In the Glass style: glass strength clear, tinted or opaque, and “Reduce transparency”; light/dark can still be chosen per device_

## F30 — 2026-10-06

**NVR: Clip speichern bleibt auf der Seite** · _NVR: saving a clip stays on the page_

### Behoben / Fixed

- NVR: „Speichern“ eines fertigen Clips lädt das Video jetzt herunter, statt es anstelle von HAPulse zu öffnen; sehr große Clips öffnen sich zum Speichern in einem neuen Tab  
  _NVR: “Save” on a finished clip now downloads the video instead of opening it in place of HAPulse; very large clips open in a new tab for saving_

## F29 — 2026-10-06

**NVR: Kameraseite passt aufs Handy** · _NVR: camera page fits the phone_

### Behoben / Fixed

- NVR: Auf dem Handy endet die Kameraseite jetzt über der Tab-Leiste; „Clip erstellen“ und die Datumsauswahl lagen vorher teils dahinter, bei kleinem Bildschirm wird dafür das Bild etwas kleiner  
  _NVR: On the phone the camera page now ends above the tab bar; “Create clip” and the date picker were partly behind it before, on a small screen the picture gets a little smaller for this_

## F28 — 2026-10-06

**NVR: Clips herunterladen** · _NVR: download clips_

### Neu / Added

- NVR: „Clip herunterladen“ auf der Kameraseite speichert ein Ereignis (mit 5 s davor und danach) oder einen frei gewählten Zeitraum „von bis“ als Video in Originalauflösung mit Ton, bis 30 Minuten; die Kanten setzt man, indem man die Zeitleiste unter der Abspiel-Linie verschiebt  
  _NVR: “Download clip” on the camera page saves an event (with 5 s before and after) or a freely chosen “from–to” range as a video in original resolution with sound, up to 30 minutes; you set the edges by moving the timeline under the playback line_
- NVR: Der fertige Clip lässt sich speichern und auf dem iPhone bis 100 MB direkt teilen, z. B. „Video sichern“ in Fotos; jedes Ereignis der Ereignisliste hat dafür einen eigenen Download-Knopf  
  _NVR: The finished clip can be saved and, on the iPhone up to 100 MB, shared directly, e.g. “Save Video” to Photos; every event in the event list has its own download button for this_

## F27 — 2026-10-05

**Fette Zahlen in echter Schriftstärke** · _Bold numbers in their real weight_

### Behoben / Fixed

- Zahlen in der Datenschrift (z. B. Pool-Ring, Wetter, Klima, Systemwerte, NVR-Kennzahlen) erscheinen in ihrer echten Stärke statt künstlich verdickt; halbfette Zahlen sehen nicht mehr aus wie normale  
  _Numbers in the data font (e.g. pool ring, weather, climate, system values, NVR figures) show in their real weight instead of artificially thickened; medium-weight numbers no longer look like regular ones_

## F26 — 2026-10-05

**NVR: „Sentinel öffnen“ an der Abspielposition** · _NVR: “Open in Sentinel” at the playback position_

### Behoben / Fixed

- NVR: „Sentinel öffnen“ auf der Kameraseite öffnet Sentinel wieder an der Stelle, die gerade läuft oder pausiert ist, statt live; ebenso „In Safari öffnen“ beim Bild-in-Bild-Hinweis der Home-Bildschirm-App  
  _NVR: “Open in Sentinel” on the camera page opens Sentinel at the moment that is playing or paused again instead of live; so does “Open in Safari” in the picture-in-picture note of the Home Screen app_

## F25 — 2026-10-05

**NVR: Hängende Aufnahme wird angezeigt** · _NVR: a stalled recording is shown_

### Neu / Added

- NVR: Schreibt eine Kamera keine Aufnahmen mehr, obwohl sie verbunden ist, zeigen Kachel, Statuspille, Startseiten-Karte und Sicherheitsseite „Aufnahme hängt“; Sentinel startet die Aufnahme selbst neu, die Anzeige verschwindet mit der nächsten Aufnahme  
  _NVR: when a camera stops writing recordings while still connected, its tile, the status pill, the home card and the security page show “Recording stalled”; Sentinel restarts the recording itself and the notice goes away with the next recording_

## F24 — 2026-10-05

**NVR: „gestern“ in der Ereignisleiste** · _NVR: “yesterday” in the events strip_

### Geändert / Changed

- NVR: In der Ereignisleiste steht bei Ereignissen von vor Mitternacht „gestern“ vor der Uhrzeit, bei älteren ein kurzes Datum; heutige zeigen weiter nur die Uhrzeit  
  _NVR: in the events strip, events from before midnight show “yesterday” in front of the time, older ones a short date; today’s still show the time only_

## F23 — 2026-10-04

**NVR: Ereigniszahl für den sichtbaren Tag** · _NVR: event count for the visible day_

### Geändert / Changed

- NVR: Die Zahl im Reiter „Ereignisse“ der Kameraseite zählt nur den Tag in der Mitte der Zeitleiste; auf heute passt sie zur Zahl auf der Kamerakachel, die Liste zeigt weiter alle geladenen Tage  
  _NVR: the number in the camera page’s Events tab counts only the day in the middle of the timeline; on today it matches the camera tile, the list still shows every loaded day_

## F22 — 2026-10-04

**NVR: Ereignis-Markierungen gruppiert** · _NVR: event markers grouped_

### Geändert / Changed

- NVR: Ereignisse, die auf der Zeitleiste der Kameraseite übereinander lägen, erscheinen als eine Markierung mit Zahl; ein Tippen zoomt in die Gruppe hinein und spielt von dort ab  
  _NVR: events that would overlap on the camera page timeline show as one marker with a count; a tap zooms into the group and plays from there_

## F21 — 2026-10-04

**NVR: Ereignisse der letzten 24 Stunden** · _NVR: events of the last 24 hours_

### Geändert / Changed

- NVR: Die Ereignisleiste auf der NVR-Seite zeigt jetzt die Ereignisse der letzten 24 Stunden statt nur der letzten 40  
  _NVR: the events strip on the NVR page now shows the events of the last 24 hours instead of only the last 40_

## F20 — 2026-10-04

**NVR: Dezimalkomma und neue Ereignisse beim Zurückschauen** · _NVR: decimal comma and new events while playing back_

### Geändert / Changed

- NVR: Die Kameraseite zeigt neue Ereignisse auch beim Zurückschauen, laufende Ereignisse wachsen weiter und das Aufnahmeband wird länger  
  _NVR: the camera page shows new events while you play back a recording too; running events keep growing and the recording band extends_

### Behoben / Fixed

- NVR: Speicherwerte erscheinen mit dem Dezimaltrennzeichen der eingestellten Sprache (Deutsch „7,7 GB“, Englisch „7.7 GB“)  
  _NVR: storage values use the decimal separator of the selected language (German "7,7 GB", English "7.7 GB")_

## F19 — 2026-10-02

**Kamerabild mit Abstand zum Titel** · _Camera picture clear of the title_

### Behoben / Fixed

- NVR: Auf kleinen Handy-Bildschirmen rutscht das Kamerabild nicht mehr unter den Titel, die Zeitleiste nimmt den restlichen Platz  
  _NVR: on small phone screens the camera picture no longer slides under the title; the timeline takes the remaining space_

## F18 — 2026-10-02

**LIVE-Marke gut lesbar** · _Readable LIVE label_

### Behoben / Fixed

- NVR: Die orange Abspiel-Linie verdeckt die LIVE-Marke in der Zeitleiste nicht mehr  
  _NVR: the orange playhead line no longer covers the LIVE label on the timeline_

## F17 — 2026-10-01

**Ruhiges Zoomen der Zeitleiste** · _Calm timeline zoom_

### Behoben / Fixed

- NVR: Beim Zoomen der Zeitleiste springt der Inhalt nicht mehr kurz weg  
  _NVR: zooming the timeline no longer makes its content jump for a moment_
- NVR: Wer während des Spulens oder in der Pause zoomt, bleibt an der gewählten Stelle, statt zum Video zurückzuspringen  
  _NVR: zooming while scrubbing or paused keeps the spot you picked instead of jumping back to the video_

## F16 — 2026-09-30

**Ruhige Zeitleiste beim Spulen** · _A calm timeline while scrubbing_

### Behoben / Fixed

- NVR: Beim Hinspulen bleibt der Zeiger der Zeitleiste an der gewählten Stelle, bis das Video dort normal läuft — er springt nicht mehr hin und her  
  _NVR: while the video fast-forwards to where you scrolled, the timeline pointer stays there until the video plays normally — no more jumping around_
- NVR: Das Video kommt genau dort an, wo man hingescrollt hat — vorher landete es manchmal 30 s daneben oder hielt bei weiten Strecken zu früh an  
  _NVR: the video arrives exactly where you scrolled — before, it sometimes landed 30 s off or stopped short on long distances_
- NVR: Das Datum beim Tageswechsel steht neben dem Aufnahmebalken statt darunter  
  _NVR: the date at midnight sits beside the recording bar instead of beneath it_

## F15 — 2026-09-29

**Ereignisse mit Dauer** · _Events with a duration_

### Neu / Added

- NVR: ein Ereignis zeigt, wie lange es ging — in der Zeitleiste als Balken bis zur letzten Bewegung, in der Liste als Dauer; ein laufendes Ereignis pulsiert und heißt „läuft“  
  _NVR: an event shows how long it lasted — a bar up to the last movement on the timeline, the duration in the list; a running event pulses and reads “running”_

## F14 — 2026-09-29

**Radfahrer zählen als Person** · _Cyclists count as persons_

### Geändert / Changed

- NVR: Ereignisse mit mehreren Klassen zeigen die wichtigste zuerst (Person vor Tier, Fahrrad und Fahrzeug) — ein Radfahrer ist eine Person  
  _NVR: events with several classes show the most important one first (person before animal, bike and vehicle) — a cyclist is a person_
- NVR: ein Klassenfilter blendet ein Ereignis nur aus, wenn alle seine Klassen aus sind; die Chips zählen jede enthaltene Klasse  
  _NVR: a class filter hides an event only when all of its classes are off; the chips count every class an event contains_

## F13 — 2026-09-28

**Fokus auf „Alles klar“** · _Focus on “Got it”_

### Behoben / Fixed

- „Was ist neu“ öffnet mit dem Fokus auf „Alles klar“ statt mit einem orangen Rahmen um das ganze Fenster  
  _What’s New opens with the focus on “Got it” instead of an orange frame around the whole window_
- Fenster, die sich ohne Klick öffnen, zeigen keinen Fokusrahmen mehr um das ganze Fenster  
  _Windows that open without a click no longer show a focus frame around the whole window_

## F12 — 2026-09-28

**Bild-in-Bild in der Home-Bildschirm-App** · _Picture-in-picture in the Home Screen app_

### Geändert / Changed

- Bild-in-Bild sperrt Apple in Home-Bildschirm-Apps auf iPhone und iPad — der Knopf sagt das jetzt und öffnet die Kamera auf Wunsch in Safari, wo es geht  
  _Apple blocks picture-in-picture in Home Screen apps on iPhone and iPad — the button now says so and can open the camera in Safari, where it works_

### Behoben / Fixed

- NVR: Die Speicherwarnung und der Hinweis „Kompatibilitätsmodus“ erschienen als interner Text statt übersetzt  
  _NVR: the storage warning and the “compatibility mode” label showed an internal key instead of the text_

## F11 — 2026-09-28

**Schloss-Chip und Feinschliff** · _Locks chip and polish_

### Neu / Added

- Chip „Schlösser“ in der Übersicht: ruhig, wenn alles verriegelt ist, rot bei einem offenen Schloss, gelb bei einer Störung — ein Tipp öffnet alle Schlösser zum Ver- und Entriegeln  
  _A “Locks” chip on the Overview: calm when everything is locked, red for an open lock, amber for a fault — a tap lists every lock to lock or unlock_
- Dieses „Was ist neu“ zeigt jetzt auch unsere eigenen Erweiterungen (F1 bis F11), auf Deutsch und Englisch  
  _This What’s New now also lists this fork’s own extensions (F1 to F11), in German and English_

### Geändert / Changed

- Ein blockiertes oder nicht erreichbares Schloss heißt überall „Störung“ statt „Alle verriegelt“ — im Chip, in der Sicherheitskarte und auf der Sicherheitsseite  
  _A jammed or unreachable lock reads “fault” everywhere instead of “All locked” — in the chip, the security card and on the Security page_
- Einstellungen: kurze Erklärung, dass „Darstellung“ für alle gilt und „Hell/Dunkel auf diesem Gerät“ nur hier  
  _Settings: a short note that “Appearance” applies to everyone and “Light/dark on this device” only here_

### Behoben / Fixed

- Pool: Die Restzeit im Manuell-Ring ragt nicht mehr in den Ring — die Einheit steht jetzt darunter („Min. übrig“)  
  _Pool: the remaining time no longer runs into the manual ring — the unit now sits below (“min left”)_
- Die Hell/Dunkel-Knöpfe sind gleich breit, „Vorgabe“ sitzt mittig, und am Handy passt die Leiste in die Zeile  
  _The light/dark buttons are equally wide, “Default” is centred, and on phones the toggle fits the row_
- NVR: Das Symbol „In Sentinel öffnen“ ist am Handy wieder zu sehen (vorher ein leerer Rahmen)  
  _NVR: the “Open in Sentinel” icon shows on phones again (it was an empty frame)_

## F10 — 2026-09-27

**Garagentore und schnellere Kameras** · _Garage doors and faster cameras_

### Neu / Added

- Garagentore und Tore werden wie Schlösser behandelt: eigener Bereich auf der Sicherheitsseite und im Raum, Chip „Garage“ in der Übersicht, Zeile in der Sicherheitskarte  
  _Garage doors and gates are handled like locks: their own section on the Security page and in rooms, a “Garage” chip on the Overview, a line in the security card_
- Öffnen fragt immer nach, Schließen geht sofort; ein offenes Tor ist rot, ein nicht erreichbares gelb  
  _Opening always asks first, closing is immediate; an open door is red, an unreachable one amber_

### Geändert / Changed

- Garagentore stehen nicht mehr bei den Rollläden  
  _Garage doors no longer appear among the blinds_
- Eine Kamera öffnet sofort mit dem Bild ihrer Kachel, Live startet ohne Wartezeit, und die Kacheln laden kleinere Bilder  
  _A camera opens with its tile picture at once, live starts without waiting, and the tiles load smaller pictures_

### Behoben / Fixed

- „Ereignisse heute“ und die Karte „Ereignisse pro Stunde“ zählen in deiner Zeitzone (vorher 2 Stunden verschoben)  
  _“Events today” and the events-per-hour chart count in your time zone (they were two hours off)_
- Scheitert die schnelle Live-Verbindung, läuft Live als Video weiter statt als Standbilder  
  _When the fast live connection fails, live keeps running as video instead of still pictures_

## F9 — 2026-09-26

**Einstellungen für alle** · _Settings for everyone_

### Neu / Added

- Ein HA-Admin übernimmt seine HAPulse-Einstellungen einmal für alle — alle Nutzer und Geräte folgen, nur Admins ändern sie; Favoriten und Sprache bleiben pro Person  
  _An HA admin takes over their HAPulse settings for everyone once — all users and devices follow, only admins change them; favourites and language stay per person_
- Hell/Dunkel pro Gerät, z. B. ein Wandtablet, das immer dunkel ist  
  _Light/dark per device, e.g. a wall tablet that is always dark_

### Geändert / Changed

- Seitenleiste: Übersicht, Räume, NVR und Pool stehen vorn  
  _Sidebar: Overview, Rooms, NVR and Pool come first_
- Ist Sentinel verbunden, kommen alle Kameras von dort; der Admin ordnet sie den Räumen zu  
  _Once Sentinel is connected, every camera comes from it; the admin assigns them to rooms_
- Zahlen folgen der Sprache: Dezimalkomma und Tausenderpunkt überall  
  _Numbers follow the language: decimal comma and thousands separators everywhere_
- Pool: Restzeit ab einer Stunde als Stunden, „Läuft bis morgen, 15:11“ über Mitternacht, Modus-Umschalter passt aufs Handy  
  _Pool: remaining time in hours from one hour on, “Runs until tomorrow, 15:11” past midnight, the mode switch fits on phones_

### Behoben / Fixed

- Die Raumliste der Klimakarte scrollt nicht mehr seitlich  
  _The climate card’s room list no longer scrolls sideways_

## F8 — 2026-09-26

**Zuverlässiger und sicherer** · _More reliable and safer_

### Geändert / Changed

- Entriegeln fragt immer nach; Schlösser mit Code bekommen ein Code-Feld  
  _Unlocking always asks first; locks with a code get a code field_
- NVR: Warnung, wenn das Aufnahme-Laufwerk fehlt  
  _NVR: a warning when the recording drive is missing_

### Behoben / Fixed

- Der Alarm lässt sich auch während der Ein- und Ausgangsverzögerung unscharf schalten  
  _The alarm can be disarmed during the entry and exit delay_
- Schlägt eine Aktion in Home Assistant fehl, erscheint eine Meldung statt nichts  
  _When an action fails in Home Assistant, a message appears instead of nothing_
- Nach einem Update lädt HAPulse fehlende Seitenteile neu statt einer leeren Seite; beim Start wird Home Assistant erneut versucht  
  _After an update HAPulse reloads missing page parts instead of showing a blank page; at start it retries Home Assistant_
- Regler senden beim Loslassen, Tastatur-Änderungen an Lampen kommen an, Klima-Schritte und Grenzen stimmen  
  _Sliders send on release, keyboard changes to lights arrive, climate steps and limits are respected_
- NVR hinter einem Reverse-Proxy funktioniert, ein fehlender Zugriff wird als Fehler angezeigt  
  _The NVR works behind a reverse proxy, and missing access is shown as an error_
- Kalendertage im NVR und das Pool-Laufzeit-Diagramm bleiben bei der Zeitumstellung richtig  
  _NVR calendar days and the pool runtime chart stay right across daylight-saving changes_

## F7 — 2026-09-25

**Flüssigere Wiedergabe** · _Smoother playback_

### Geändert / Changed

- Scrubben in der Zeitleiste fährt die Wiedergabe genau dorthin und bleibt stehen — kein Überschießen mehr beim schnellen Scrollen  
  _Scrubbing the timeline drives playback exactly there and stops — no more overshoot when scrolling fast_
- Bei Sprüngen bleibt das Standbild, bis das neue Video wirklich läuft — kein grauer Blitz  
  _On jumps the still stays until the new video really runs — no grey flash_
- Tempo-Knöpfe ändern die Geschwindigkeit an Ort und Stelle  
  _Speed buttons change the speed in place_
- Beim Öffnen einer Kamera erscheint sofort das Bild ihrer Kachel  
  _Opening a camera shows its tile picture at once_

### Behoben / Fixed

- Ein Ereignis aus der Übersicht öffnet die richtige Aufnahme statt „keine Aufnahme“  
  _An event opened from the overview lands on its recording instead of “no recording”_

## F6 — 2026-09-22

**Kameraseite und App-Symbol** · _Camera page and app icon_

### Neu / Added

- Sentinel mit einem Scrypted-Konto verbinden — Benutzername und Passwort werden einmal gegen einen Zugang getauscht  
  _Connect Sentinel with a Scrypted account — user name and password are exchanged for an access token once_
- Das gewählte App-Symbol ist auch das Symbol auf dem Home-Bildschirm und im Browser-Tab  
  _The chosen app symbol is also the home-screen and browser-tab icon_

### Geändert / Changed

- Die Kameraseite ist dieselbe wie in Sentinel; die Bühne schmiegt sich ans Bild  
  _The camera page is the same as in Sentinel; the stage hugs the picture_
- Die NVR-Karte steht in der Übersicht nach Müll und Sicherheit  
  _The NVR card sits after Waste and Security on the Overview_

## F5 — 2026-09-19

**Gemeinsamer Player mit Sentinel** · _One player with Sentinel_

### Geändert / Changed

- Player, Zeitleiste und Kacheln stammen aus demselben Paket wie Sentinels eigene Oberfläche — beide sehen gleich aus und verhalten sich gleich  
  _Player, timeline and tiles come from the same package as Sentinel’s own interface — both look and behave the same_
- Das Kamerabild ohne schwarze Balken, die Zeitleiste reicht bis oben  
  _The camera picture without black bars, the timeline reaches the top_

### Behoben / Fixed

- Einrichtung verständlicher, ein alter Ladefehler verschwindet nach dem Speichern  
  _Clearer setup, and a stale loading error clears after saving_
- Zugangs-Token landen nie in einem Einstellungs-Export  
  _Access tokens never end up in a settings export_

## F4 — 2026-09-12

**Sentinel NVR in HAPulse** · _Sentinel NVR in HAPulse_

### Neu / Added

- NVR-Seite für Sentinel NVR im HAPulse-Stil: Systemstatus, Ereignisse, Kameras mit Live und Aufnahmen, Ereignisse pro Stunde, Speicher  
  _An NVR page for Sentinel NVR in HAPulse style: system status, events, cameras with live and recordings, events per hour, storage_
- NVR-Bereich auf der Sicherheitsseite und NVR-Karte in der Übersicht  
  _An NVR section on the Security page and an NVR card on the Overview_
- Pool: manueller Betrieb mit wählbarer Dauer bis 24 Stunden, auch die Dauer für Siri und den Taster  
  _Pool: manual run with a chosen duration up to 24 hours, including the duration for Siri and the button_

## F3 — 2026-09-09

**Müllabholung** · _Waste collection_

### Neu / Added

- Karte „Müllabholung“ in der Übersicht: erkennt die Tonnen automatisch, die nächste zuerst, mit Countdown („Heute“, „in 3 Tagen“)  
  _A “Waste collection” card on the Overview: finds the bins automatically, next pickup first, with a countdown (“Today”, “in 3 days”)_
- Ein Tipp zeigt die nächsten Termine, verlegte Abholungen sind markiert  
  _A tap shows the upcoming dates, rescheduled pickups are marked_

## F2 — 2026-09-03

**Verlauf im Detailfenster** · _History in the detail view_

### Neu / Added

- Zeitbereich 24H / 7D / 30D im Detailfenster, die Wahl merkt sich HAPulse pro Person  
  _A 24H / 7D / 30D range in the detail view, remembered per person_

### Geändert / Changed

- Pool-Kacheln öffnen das Detailfenster mit Verlauf und Logbuch  
  _Pool tiles open the detail view with history and logbook_
- Das Pool-Laufzeit-Diagramm zeigt den Wert jedes Tages, und der Bereichswechsel blendet sanft über  
  _The pool runtime chart shows each day’s value, and switching the range cross-fades_

## F1 — 2026-08-25

**Pool-Seite** · _Pool page_

### Neu / Added

- Pool-Seite zur Steuerung der Poolpumpe: Status, Modus (Aus / Automatik / Manuell), Solar-Anzeige mit einstellbarer Schwelle, Manuell-Timer, Laufzeit und Verbrauch  
  _A Pool page to control the pool pump: status, mode (off / automatic / manual), a solar gauge with an adjustable threshold, manual timer, runtime and consumption_
- Grafischer Wochen-Zeitplan: Abschnitte ein- und ausschalten, Grenzen ziehen — auch am Handy  
  _A graphical weekly schedule: switch segments on and off, drag their edges — on phones too_
- Pool-Chip in der Übersicht mit Schnellzugriff  
  _A Pool chip on the Overview with quick controls_
- Diagramm der Pumpenlaufzeit pro Tag  
  _A chart of the pump runtime per day_
