# Changelog — Fork-Erweiterungen

Die eigenen Erweiterungen dieses Forks (F1, F2, …), zusätzlich zu den Upstream-Releases in `CHANGELOG.md`.
In der App: „Was ist neu“ nach einem Update und Einstellungen → Über.

<!-- Generiert aus packages/core/src/forkChangelog.ts: `npm run build -w @hapulse/core && node packages/core/scripts/gen-fork-changelog.mjs`.
     Nicht von Hand ändern — die Datei wird überschrieben. -->

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
