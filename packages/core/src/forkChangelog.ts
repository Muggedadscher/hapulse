/**
 * [fork] Release notes of THIS fork's own extensions — shown next to upstream's notes (changelog.ts) in the What's
 * New modal and in Settings → About, and rendered to CHANGELOG.fork.md by scripts/gen-fork-changelog.mjs.
 *
 * WHY A SEPARATE FILE: upstream's RELEASES use strict semver tied to the package.json version; a fork version in
 * there would collide with the next upstream release and conflict on every upstream merge. Fork releases therefore
 * count on their own ("F1", "F2", …) and live here, conflict-free. The package.json version stays upstream's.
 *
 * WHY GERMAN + ENGLISH: this household reads German; English is the fallback for every other UI language (the same
 * reasoning as upstream's English-only notes — no release waits for five more translations).
 *
 * ADDING A RELEASE: every user-visible fork change gets an entry in the same PR — prepend a release (version + 1,
 * date = merge day) or extend the newest one if it has not been deployed yet, then regenerate CHANGELOG.fork.md
 * (see docs/SYNC.md). Items: short, sentence case, no trailing period. test/forkChangelog.test.ts checks the shape.
 */

import type { ChangeKind } from './changelog.js';

export interface ForkText {
  de: string;
  en: string;
}

export interface ForkReleaseSection {
  kind: ChangeKind;
  items: ForkText[];
}

export interface ForkRelease {
  /** Running number, shown as "F<n>". */
  version: number;
  /** Release date, `YYYY-MM-DD`. */
  date: string;
  title: ForkText;
  sections: ForkReleaseSection[];
}

/** Newest first. */
export const FORK_RELEASES: ForkRelease[] = [
  {
    version: 22,
    date: '2026-10-04',
    title: { de: 'NVR: Ereignis-Markierungen gruppiert', en: 'NVR: event markers grouped' },
    sections: [
      {
        kind: 'changed',
        items: [
          {
            de: 'NVR: Ereignisse, die auf der Zeitleiste der Kameraseite übereinander lägen, erscheinen als eine Markierung mit Zahl; ein Tippen zoomt in die Gruppe hinein und spielt von dort ab',
            en: 'NVR: events that would overlap on the camera page timeline show as one marker with a count; a tap zooms into the group and plays from there',
          },
        ],
      },
    ],
  },
  {
    version: 21,
    date: '2026-10-04',
    title: { de: 'NVR: Ereignisse der letzten 24 Stunden', en: 'NVR: events of the last 24 hours' },
    sections: [
      {
        kind: 'changed',
        items: [
          {
            de: 'NVR: Die Ereignisleiste auf der NVR-Seite zeigt jetzt die Ereignisse der letzten 24 Stunden statt nur der letzten 40',
            en: 'NVR: the events strip on the NVR page now shows the events of the last 24 hours instead of only the last 40',
          },
        ],
      },
    ],
  },
  {
    version: 20,
    date: '2026-10-04',
    title: { de: 'NVR: Dezimalkomma und neue Ereignisse beim Zurückschauen', en: 'NVR: decimal comma and new events while playing back' },
    sections: [
      {
        kind: 'changed',
        items: [
          {
            de: 'NVR: Die Kameraseite zeigt neue Ereignisse auch beim Zurückschauen, laufende Ereignisse wachsen weiter und das Aufnahmeband wird länger',
            en: 'NVR: the camera page shows new events while you play back a recording too; running events keep growing and the recording band extends',
          },
        ],
      },
      {
        kind: 'fixed',
        items: [
          {
            de: 'NVR: Speicherwerte erscheinen mit dem Dezimaltrennzeichen der eingestellten Sprache (Deutsch „7,7 GB“, Englisch „7.7 GB“)',
            en: 'NVR: storage values use the decimal separator of the selected language (German "7,7 GB", English "7.7 GB")',
          },
        ],
      },
    ],
  },
  {
    version: 19,
    date: '2026-10-02',
    title: { de: 'Kamerabild mit Abstand zum Titel', en: 'Camera picture clear of the title' },
    sections: [
      {
        kind: 'fixed',
        items: [
          {
            de: 'NVR: Auf kleinen Handy-Bildschirmen rutscht das Kamerabild nicht mehr unter den Titel, die Zeitleiste nimmt den restlichen Platz',
            en: 'NVR: on small phone screens the camera picture no longer slides under the title; the timeline takes the remaining space',
          },
        ],
      },
    ],
  },
  {
    version: 18,
    date: '2026-10-02',
    title: { de: 'LIVE-Marke gut lesbar', en: 'Readable LIVE label' },
    sections: [
      {
        kind: 'fixed',
        items: [
          {
            de: 'NVR: Die orange Abspiel-Linie verdeckt die LIVE-Marke in der Zeitleiste nicht mehr',
            en: 'NVR: the orange playhead line no longer covers the LIVE label on the timeline',
          },
        ],
      },
    ],
  },
  {
    version: 17,
    date: '2026-10-01',
    title: { de: 'Ruhiges Zoomen der Zeitleiste', en: 'Calm timeline zoom' },
    sections: [
      {
        kind: 'fixed',
        items: [
          {
            de: 'NVR: Beim Zoomen der Zeitleiste springt der Inhalt nicht mehr kurz weg',
            en: 'NVR: zooming the timeline no longer makes its content jump for a moment',
          },
          {
            de: 'NVR: Wer während des Spulens oder in der Pause zoomt, bleibt an der gewählten Stelle, statt zum Video zurückzuspringen',
            en: 'NVR: zooming while scrubbing or paused keeps the spot you picked instead of jumping back to the video',
          },
        ],
      },
    ],
  },
  {
    version: 16,
    date: '2026-09-30',
    title: { de: 'Ruhige Zeitleiste beim Spulen', en: 'A calm timeline while scrubbing' },
    sections: [
      {
        kind: 'fixed',
        items: [
          {
            de: 'NVR: Beim Hinspulen bleibt der Zeiger der Zeitleiste an der gewählten Stelle, bis das Video dort normal läuft — er springt nicht mehr hin und her',
            en: 'NVR: while the video fast-forwards to where you scrolled, the timeline pointer stays there until the video plays normally — no more jumping around',
          },
          {
            de: 'NVR: Das Video kommt genau dort an, wo man hingescrollt hat — vorher landete es manchmal 30 s daneben oder hielt bei weiten Strecken zu früh an',
            en: 'NVR: the video arrives exactly where you scrolled — before, it sometimes landed 30 s off or stopped short on long distances',
          },
          {
            de: 'NVR: Das Datum beim Tageswechsel steht neben dem Aufnahmebalken statt darunter',
            en: 'NVR: the date at midnight sits beside the recording bar instead of beneath it',
          },
        ],
      },
    ],
  },
  {
    version: 15,
    date: '2026-09-29',
    title: { de: 'Ereignisse mit Dauer', en: 'Events with a duration' },
    sections: [
      {
        kind: 'added',
        items: [
          {
            de: 'NVR: ein Ereignis zeigt, wie lange es ging — in der Zeitleiste als Balken bis zur letzten Bewegung, in der Liste als Dauer; ein laufendes Ereignis pulsiert und heißt „läuft“',
            en: 'NVR: an event shows how long it lasted — a bar up to the last movement on the timeline, the duration in the list; a running event pulses and reads “running”',
          },
        ],
      },
    ],
  },
  {
    version: 14,
    date: '2026-09-29',
    title: { de: 'Radfahrer zählen als Person', en: 'Cyclists count as persons' },
    sections: [
      {
        kind: 'changed',
        items: [
          {
            de: 'NVR: Ereignisse mit mehreren Klassen zeigen die wichtigste zuerst (Person vor Tier, Fahrrad und Fahrzeug) — ein Radfahrer ist eine Person',
            en: 'NVR: events with several classes show the most important one first (person before animal, bike and vehicle) — a cyclist is a person',
          },
          {
            de: 'NVR: ein Klassenfilter blendet ein Ereignis nur aus, wenn alle seine Klassen aus sind; die Chips zählen jede enthaltene Klasse',
            en: 'NVR: a class filter hides an event only when all of its classes are off; the chips count every class an event contains',
          },
        ],
      },
    ],
  },
  {
    version: 13,
    date: '2026-09-28',
    title: { de: 'Fokus auf „Alles klar“', en: 'Focus on “Got it”' },
    sections: [
      {
        kind: 'fixed',
        items: [
          {
            de: '„Was ist neu“ öffnet mit dem Fokus auf „Alles klar“ statt mit einem orangen Rahmen um das ganze Fenster',
            en: 'What’s New opens with the focus on “Got it” instead of an orange frame around the whole window',
          },
          {
            de: 'Fenster, die sich ohne Klick öffnen, zeigen keinen Fokusrahmen mehr um das ganze Fenster',
            en: 'Windows that open without a click no longer show a focus frame around the whole window',
          },
        ],
      },
    ],
  },
  {
    version: 12,
    date: '2026-09-28',
    title: { de: 'Bild-in-Bild in der Home-Bildschirm-App', en: 'Picture-in-picture in the Home Screen app' },
    sections: [
      {
        kind: 'changed',
        items: [
          {
            de: 'Bild-in-Bild sperrt Apple in Home-Bildschirm-Apps auf iPhone und iPad — der Knopf sagt das jetzt und öffnet die Kamera auf Wunsch in Safari, wo es geht',
            en: 'Apple blocks picture-in-picture in Home Screen apps on iPhone and iPad — the button now says so and can open the camera in Safari, where it works',
          },
        ],
      },
      {
        kind: 'fixed',
        items: [
          {
            de: 'NVR: Die Speicherwarnung und der Hinweis „Kompatibilitätsmodus“ erschienen als interner Text statt übersetzt',
            en: 'NVR: the storage warning and the “compatibility mode” label showed an internal key instead of the text',
          },
        ],
      },
    ],
  },
  {
    version: 11,
    date: '2026-09-28',
    title: { de: 'Schloss-Chip und Feinschliff', en: 'Locks chip and polish' },
    sections: [
      {
        kind: 'added',
        items: [
          {
            de: 'Chip „Schlösser“ in der Übersicht: ruhig, wenn alles verriegelt ist, rot bei einem offenen Schloss, gelb bei einer Störung — ein Tipp öffnet alle Schlösser zum Ver- und Entriegeln',
            en: 'A “Locks” chip on the Overview: calm when everything is locked, red for an open lock, amber for a fault — a tap lists every lock to lock or unlock',
          },
          {
            de: 'Dieses „Was ist neu“ zeigt jetzt auch unsere eigenen Erweiterungen (F1 bis F11), auf Deutsch und Englisch',
            en: 'This What’s New now also lists this fork’s own extensions (F1 to F11), in German and English',
          },
        ],
      },
      {
        kind: 'changed',
        items: [
          {
            de: 'Ein blockiertes oder nicht erreichbares Schloss heißt überall „Störung“ statt „Alle verriegelt“ — im Chip, in der Sicherheitskarte und auf der Sicherheitsseite',
            en: 'A jammed or unreachable lock reads “fault” everywhere instead of “All locked” — in the chip, the security card and on the Security page',
          },
          {
            de: 'Einstellungen: kurze Erklärung, dass „Darstellung“ für alle gilt und „Hell/Dunkel auf diesem Gerät“ nur hier',
            en: 'Settings: a short note that “Appearance” applies to everyone and “Light/dark on this device” only here',
          },
        ],
      },
      {
        kind: 'fixed',
        items: [
          {
            de: 'Pool: Die Restzeit im Manuell-Ring ragt nicht mehr in den Ring — die Einheit steht jetzt darunter („Min. übrig“)',
            en: 'Pool: the remaining time no longer runs into the manual ring — the unit now sits below (“min left”)',
          },
          {
            de: 'Die Hell/Dunkel-Knöpfe sind gleich breit, „Vorgabe“ sitzt mittig, und am Handy passt die Leiste in die Zeile',
            en: 'The light/dark buttons are equally wide, “Default” is centred, and on phones the toggle fits the row',
          },
          {
            de: 'NVR: Das Symbol „In Sentinel öffnen“ ist am Handy wieder zu sehen (vorher ein leerer Rahmen)',
            en: 'NVR: the “Open in Sentinel” icon shows on phones again (it was an empty frame)',
          },
        ],
      },
    ],
  },
  {
    version: 10,
    date: '2026-09-27',
    title: { de: 'Garagentore und schnellere Kameras', en: 'Garage doors and faster cameras' },
    sections: [
      {
        kind: 'added',
        items: [
          {
            de: 'Garagentore und Tore werden wie Schlösser behandelt: eigener Bereich auf der Sicherheitsseite und im Raum, Chip „Garage“ in der Übersicht, Zeile in der Sicherheitskarte',
            en: 'Garage doors and gates are handled like locks: their own section on the Security page and in rooms, a “Garage” chip on the Overview, a line in the security card',
          },
          {
            de: 'Öffnen fragt immer nach, Schließen geht sofort; ein offenes Tor ist rot, ein nicht erreichbares gelb',
            en: 'Opening always asks first, closing is immediate; an open door is red, an unreachable one amber',
          },
        ],
      },
      {
        kind: 'changed',
        items: [
          {
            de: 'Garagentore stehen nicht mehr bei den Rollläden',
            en: 'Garage doors no longer appear among the blinds',
          },
          {
            de: 'Eine Kamera öffnet sofort mit dem Bild ihrer Kachel, Live startet ohne Wartezeit, und die Kacheln laden kleinere Bilder',
            en: 'A camera opens with its tile picture at once, live starts without waiting, and the tiles load smaller pictures',
          },
        ],
      },
      {
        kind: 'fixed',
        items: [
          {
            de: '„Ereignisse heute“ und die Karte „Ereignisse pro Stunde“ zählen in deiner Zeitzone (vorher 2 Stunden verschoben)',
            en: '“Events today” and the events-per-hour chart count in your time zone (they were two hours off)',
          },
          {
            de: 'Scheitert die schnelle Live-Verbindung, läuft Live als Video weiter statt als Standbilder',
            en: 'When the fast live connection fails, live keeps running as video instead of still pictures',
          },
        ],
      },
    ],
  },
  {
    version: 9,
    date: '2026-09-26',
    title: { de: 'Einstellungen für alle', en: 'Settings for everyone' },
    sections: [
      {
        kind: 'added',
        items: [
          {
            de: 'Ein HA-Admin übernimmt seine HAPulse-Einstellungen einmal für alle — alle Nutzer und Geräte folgen, nur Admins ändern sie; Favoriten und Sprache bleiben pro Person',
            en: 'An HA admin takes over their HAPulse settings for everyone once — all users and devices follow, only admins change them; favourites and language stay per person',
          },
          {
            de: 'Hell/Dunkel pro Gerät, z. B. ein Wandtablet, das immer dunkel ist',
            en: 'Light/dark per device, e.g. a wall tablet that is always dark',
          },
        ],
      },
      {
        kind: 'changed',
        items: [
          {
            de: 'Seitenleiste: Übersicht, Räume, NVR und Pool stehen vorn',
            en: 'Sidebar: Overview, Rooms, NVR and Pool come first',
          },
          {
            de: 'Ist Sentinel verbunden, kommen alle Kameras von dort; der Admin ordnet sie den Räumen zu',
            en: 'Once Sentinel is connected, every camera comes from it; the admin assigns them to rooms',
          },
          {
            de: 'Zahlen folgen der Sprache: Dezimalkomma und Tausenderpunkt überall',
            en: 'Numbers follow the language: decimal comma and thousands separators everywhere',
          },
          {
            de: 'Pool: Restzeit ab einer Stunde als Stunden, „Läuft bis morgen, 15:11“ über Mitternacht, Modus-Umschalter passt aufs Handy',
            en: 'Pool: remaining time in hours from one hour on, “Runs until tomorrow, 15:11” past midnight, the mode switch fits on phones',
          },
        ],
      },
      {
        kind: 'fixed',
        items: [
          {
            de: 'Die Raumliste der Klimakarte scrollt nicht mehr seitlich',
            en: 'The climate card’s room list no longer scrolls sideways',
          },
        ],
      },
    ],
  },
  {
    version: 8,
    date: '2026-09-26',
    title: { de: 'Zuverlässiger und sicherer', en: 'More reliable and safer' },
    sections: [
      {
        kind: 'changed',
        items: [
          {
            de: 'Entriegeln fragt immer nach; Schlösser mit Code bekommen ein Code-Feld',
            en: 'Unlocking always asks first; locks with a code get a code field',
          },
          {
            de: 'NVR: Warnung, wenn das Aufnahme-Laufwerk fehlt',
            en: 'NVR: a warning when the recording drive is missing',
          },
        ],
      },
      {
        kind: 'fixed',
        items: [
          {
            de: 'Der Alarm lässt sich auch während der Ein- und Ausgangsverzögerung unscharf schalten',
            en: 'The alarm can be disarmed during the entry and exit delay',
          },
          {
            de: 'Schlägt eine Aktion in Home Assistant fehl, erscheint eine Meldung statt nichts',
            en: 'When an action fails in Home Assistant, a message appears instead of nothing',
          },
          {
            de: 'Nach einem Update lädt HAPulse fehlende Seitenteile neu statt einer leeren Seite; beim Start wird Home Assistant erneut versucht',
            en: 'After an update HAPulse reloads missing page parts instead of showing a blank page; at start it retries Home Assistant',
          },
          {
            de: 'Regler senden beim Loslassen, Tastatur-Änderungen an Lampen kommen an, Klima-Schritte und Grenzen stimmen',
            en: 'Sliders send on release, keyboard changes to lights arrive, climate steps and limits are respected',
          },
          {
            de: 'NVR hinter einem Reverse-Proxy funktioniert, ein fehlender Zugriff wird als Fehler angezeigt',
            en: 'The NVR works behind a reverse proxy, and missing access is shown as an error',
          },
          {
            de: 'Kalendertage im NVR und das Pool-Laufzeit-Diagramm bleiben bei der Zeitumstellung richtig',
            en: 'NVR calendar days and the pool runtime chart stay right across daylight-saving changes',
          },
        ],
      },
    ],
  },
  {
    version: 7,
    date: '2026-09-25',
    title: { de: 'Flüssigere Wiedergabe', en: 'Smoother playback' },
    sections: [
      {
        kind: 'changed',
        items: [
          {
            de: 'Scrubben in der Zeitleiste fährt die Wiedergabe genau dorthin und bleibt stehen — kein Überschießen mehr beim schnellen Scrollen',
            en: 'Scrubbing the timeline drives playback exactly there and stops — no more overshoot when scrolling fast',
          },
          {
            de: 'Bei Sprüngen bleibt das Standbild, bis das neue Video wirklich läuft — kein grauer Blitz',
            en: 'On jumps the still stays until the new video really runs — no grey flash',
          },
          {
            de: 'Tempo-Knöpfe ändern die Geschwindigkeit an Ort und Stelle',
            en: 'Speed buttons change the speed in place',
          },
          {
            de: 'Beim Öffnen einer Kamera erscheint sofort das Bild ihrer Kachel',
            en: 'Opening a camera shows its tile picture at once',
          },
        ],
      },
      {
        kind: 'fixed',
        items: [
          {
            de: 'Ein Ereignis aus der Übersicht öffnet die richtige Aufnahme statt „keine Aufnahme“',
            en: 'An event opened from the overview lands on its recording instead of “no recording”',
          },
        ],
      },
    ],
  },
  {
    version: 6,
    date: '2026-09-22',
    title: { de: 'Kameraseite und App-Symbol', en: 'Camera page and app icon' },
    sections: [
      {
        kind: 'added',
        items: [
          {
            de: 'Sentinel mit einem Scrypted-Konto verbinden — Benutzername und Passwort werden einmal gegen einen Zugang getauscht',
            en: 'Connect Sentinel with a Scrypted account — user name and password are exchanged for an access token once',
          },
          {
            de: 'Das gewählte App-Symbol ist auch das Symbol auf dem Home-Bildschirm und im Browser-Tab',
            en: 'The chosen app symbol is also the home-screen and browser-tab icon',
          },
        ],
      },
      {
        kind: 'changed',
        items: [
          {
            de: 'Die Kameraseite ist dieselbe wie in Sentinel; die Bühne schmiegt sich ans Bild',
            en: 'The camera page is the same as in Sentinel; the stage hugs the picture',
          },
          {
            de: 'Die NVR-Karte steht in der Übersicht nach Müll und Sicherheit',
            en: 'The NVR card sits after Waste and Security on the Overview',
          },
        ],
      },
    ],
  },
  {
    version: 5,
    date: '2026-09-19',
    title: { de: 'Gemeinsamer Player mit Sentinel', en: 'One player with Sentinel' },
    sections: [
      {
        kind: 'changed',
        items: [
          {
            de: 'Player, Zeitleiste und Kacheln stammen aus demselben Paket wie Sentinels eigene Oberfläche — beide sehen gleich aus und verhalten sich gleich',
            en: 'Player, timeline and tiles come from the same package as Sentinel’s own interface — both look and behave the same',
          },
          {
            de: 'Das Kamerabild ohne schwarze Balken, die Zeitleiste reicht bis oben',
            en: 'The camera picture without black bars, the timeline reaches the top',
          },
        ],
      },
      {
        kind: 'fixed',
        items: [
          {
            de: 'Einrichtung verständlicher, ein alter Ladefehler verschwindet nach dem Speichern',
            en: 'Clearer setup, and a stale loading error clears after saving',
          },
          {
            de: 'Zugangs-Token landen nie in einem Einstellungs-Export',
            en: 'Access tokens never end up in a settings export',
          },
        ],
      },
    ],
  },
  {
    version: 4,
    date: '2026-09-12',
    title: { de: 'Sentinel NVR in HAPulse', en: 'Sentinel NVR in HAPulse' },
    sections: [
      {
        kind: 'added',
        items: [
          {
            de: 'NVR-Seite für Sentinel NVR im HAPulse-Stil: Systemstatus, Ereignisse, Kameras mit Live und Aufnahmen, Ereignisse pro Stunde, Speicher',
            en: 'An NVR page for Sentinel NVR in HAPulse style: system status, events, cameras with live and recordings, events per hour, storage',
          },
          {
            de: 'NVR-Bereich auf der Sicherheitsseite und NVR-Karte in der Übersicht',
            en: 'An NVR section on the Security page and an NVR card on the Overview',
          },
          {
            de: 'Pool: manueller Betrieb mit wählbarer Dauer bis 24 Stunden, auch die Dauer für Siri und den Taster',
            en: 'Pool: manual run with a chosen duration up to 24 hours, including the duration for Siri and the button',
          },
        ],
      },
    ],
  },
  {
    version: 3,
    date: '2026-09-09',
    title: { de: 'Müllabholung', en: 'Waste collection' },
    sections: [
      {
        kind: 'added',
        items: [
          {
            de: 'Karte „Müllabholung“ in der Übersicht: erkennt die Tonnen automatisch, die nächste zuerst, mit Countdown („Heute“, „in 3 Tagen“)',
            en: 'A “Waste collection” card on the Overview: finds the bins automatically, next pickup first, with a countdown (“Today”, “in 3 days”)',
          },
          {
            de: 'Ein Tipp zeigt die nächsten Termine, verlegte Abholungen sind markiert',
            en: 'A tap shows the upcoming dates, rescheduled pickups are marked',
          },
        ],
      },
    ],
  },
  {
    version: 2,
    date: '2026-09-03',
    title: { de: 'Verlauf im Detailfenster', en: 'History in the detail view' },
    sections: [
      {
        kind: 'added',
        items: [
          {
            de: 'Zeitbereich 24H / 7D / 30D im Detailfenster, die Wahl merkt sich HAPulse pro Person',
            en: 'A 24H / 7D / 30D range in the detail view, remembered per person',
          },
        ],
      },
      {
        kind: 'changed',
        items: [
          {
            de: 'Pool-Kacheln öffnen das Detailfenster mit Verlauf und Logbuch',
            en: 'Pool tiles open the detail view with history and logbook',
          },
          {
            de: 'Das Pool-Laufzeit-Diagramm zeigt den Wert jedes Tages, und der Bereichswechsel blendet sanft über',
            en: 'The pool runtime chart shows each day’s value, and switching the range cross-fades',
          },
        ],
      },
    ],
  },
  {
    version: 1,
    date: '2026-08-25',
    title: { de: 'Pool-Seite', en: 'Pool page' },
    sections: [
      {
        kind: 'added',
        items: [
          {
            de: 'Pool-Seite zur Steuerung der Poolpumpe: Status, Modus (Aus / Automatik / Manuell), Solar-Anzeige mit einstellbarer Schwelle, Manuell-Timer, Laufzeit und Verbrauch',
            en: 'A Pool page to control the pool pump: status, mode (off / automatic / manual), a solar gauge with an adjustable threshold, manual timer, runtime and consumption',
          },
          {
            de: 'Grafischer Wochen-Zeitplan: Abschnitte ein- und ausschalten, Grenzen ziehen — auch am Handy',
            en: 'A graphical weekly schedule: switch segments on and off, drag their edges — on phones too',
          },
          {
            de: 'Pool-Chip in der Übersicht mit Schnellzugriff',
            en: 'A Pool chip on the Overview with quick controls',
          },
          {
            de: 'Diagramm der Pumpenlaufzeit pro Tag',
            en: 'A chart of the pump runtime per day',
          },
        ],
      },
    ],
  },
];

/** The fork release this build reports — always the newest. */
export const CURRENT_FORK_VERSION: number = FORK_RELEASES[0]!.version;

/** "F11" */
export function forkLabel(version: number): string {
  return `F${version}`;
}

/** Fork releases newer than `since`; `null` = nothing to catch up on (fresh install). */
export function forkReleasesSince(since: number | null): ForkRelease[] {
  if (since === null) return [];
  return FORK_RELEASES.filter((r) => r.version > since);
}

/** German for German UIs, English for every other language. */
export function pickText(text: ForkText, locale: string): string {
  return locale.toLowerCase().startsWith('de') ? text.de : text.en;
}

const KIND_HEADING: Record<ChangeKind, string> = { added: 'Neu / Added', changed: 'Geändert / Changed', fixed: 'Behoben / Fixed' };

/** CHANGELOG.fork.md — German first, English in italics below each line. Kept here so the generator script and the
 *  test (which checks the committed file is current) render the very same text. */
export function renderForkChangelogMarkdown(releases: readonly ForkRelease[] = FORK_RELEASES): string {
  const lines = [
    '# Changelog — Fork-Erweiterungen',
    '',
    'Die eigenen Erweiterungen dieses Forks (F1, F2, …), zusätzlich zu den Upstream-Releases in `CHANGELOG.md`.',
    'In der App: „Was ist neu“ nach einem Update und Einstellungen → Über.',
    '',
    '<!-- Generiert aus packages/core/src/forkChangelog.ts: `npm run build -w @hapulse/core && node packages/core/scripts/gen-fork-changelog.mjs`.',
    '     Nicht von Hand ändern — die Datei wird überschrieben. -->',
    '',
  ];
  for (const r of releases) {
    lines.push(`## ${forkLabel(r.version)} — ${r.date}`, '', `**${r.title.de}** · _${r.title.en}_`, '');
    for (const kind of ['added', 'changed', 'fixed'] as const) {
      const section = r.sections.find((s) => s.kind === kind);
      if (!section || section.items.length === 0) continue;
      lines.push(`### ${KIND_HEADING[kind]}`, '');
      for (const item of section.items) lines.push(`- ${item.de}  `, `  _${item.en}_`);
      lines.push('');
    }
  }
  return lines.join('\n');
}
