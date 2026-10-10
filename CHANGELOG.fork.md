# Changelog — Fork-Erweiterungen

Die eigenen Erweiterungen dieses Forks (F1, F2, …), zusätzlich zu den Upstream-Releases in `CHANGELOG.md`.
In der App: „Was ist neu“ nach einem Update und Einstellungen → Über.

<!-- Generiert aus packages/core/src/forkChangelog.ts: `npm run build -w @hapulse/core && node packages/core/scripts/gen-fork-changelog.mjs`.
     Nicht von Hand ändern — die Datei wird überschrieben. -->

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
