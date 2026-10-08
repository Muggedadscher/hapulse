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
    version: 36,
    date: '2026-10-09',
    title: { de: 'Hinweise und aktive Szenen; Vorschau Glas: Übersicht', en: 'Notices and active scenes; Glass preview: overview' },
    sections: [
      {
        kind: 'added',
        items: [
          {
            de: 'Übersicht: neue Karte „Hinweise“, nur wenn etwas abweicht (Alarm, Wasser, Rauch, offene Garage oder offenes Schloss, offene Fenster, Türen ab 10 Minuten, Störungen, Kameras ohne Aufnahme, die Tonne von heute oder morgen); ein Tipp öffnet das passende Fenster, im Bearbeiten-Modus lässt sie sich ausblenden',
            en: 'Overview: a new “Notices” card, only when something deviates (alarm, water, smoke, an open garage door or lock, open windows, doors open for 10 minutes, faults, cameras not recording, the bin due today or tomorrow); a tap opens the matching window, in edit mode it can be hidden',
          },
          {
            de: 'Szenen-Kacheln zeigen nach dem Aktivieren „Aktiv“, sonst die Zahl ihrer Geräte; Home Assistant kennt diesen Zustand nicht, deshalb gilt eine Szene als aktiv, bis sich eines ihrer Geräte ändert (Rollläden dürfen zwei Minuten nachfahren), Szenen ohne Geräteliste nie',
            en: 'Scene tiles show “Active” after you activate them, otherwise how many devices they have; Home Assistant has no such state, so a scene counts as active until one of its devices changes (blinds may keep moving for two minutes), scenes without a device list never',
          },
          {
            de: 'Energie-Karte: Netz und Solar gestapelt, mit der Zeile „PV-Ertrag“, wenn eine Solaranlage eingerichtet ist',
            en: 'Energy card: grid and solar stacked, with a “PV yield” line when solar is set up',
          },
        ],
      },
      {
        kind: 'changed',
        items: [
          {
            de: 'Glas: die ganze Übersicht im Glas-Look, Titel über den Karten, ein Ring um die aktive Szene, Lichtkreise im Hauptraum, Geräte als Kacheln (Handy) oder Zeilen mit Schalter (Computer), Klima und Rollläden mit Raumauswahl; ein hier ausgeschaltetes Gerät bleibt als „Aus“ stehen, bis die Seite neu lädt',
            en: 'Glass: the whole overview in the glass look, titles above the cards, a ring around the active scene, light circles in the main room, devices as tiles (phone) or rows with a switch (computer), climate and blinds with a room choice; a device switched off here stays as “Off” until the page reloads',
          },
          {
            de: 'Glas: Energie für Tag, Woche oder Monat mit Verbrauchsbalken (Netz unten, eigener Solarstrom oben), dem Wert eines Balkens per Tipp und dem Vergleich mit dem Zeitraum davor',
            en: 'Glass: energy for a day, week or month with consumption bars (grid at the bottom, your own solar power on top), the value of a bar on a tap and the comparison with the period before',
          },
          {
            de: 'Glas ab 900 Pixel Breite: im Bearbeiten-Modus hat jede Karte eine Leiste mit den Größen S, M und L, Verschieben, Ausblenden und „⋯“ für Spalten und Höhe',
            en: 'Glass from 900 pixels wide: in edit mode every card has a bar with the sizes S, M and L, move, hide and “⋯” for columns and height',
          },
          {
            de: 'Glas: das Detail eines Lichts mit großem Helligkeitsregler, der Verlauf mit 24H, 7D und 30D; langes Drücken auf Szenen und Geräte der Übersicht öffnet das Kontextmenü mit „Raum öffnen“; die Chips oben zeigen ihre Art in Farbe',
            en: 'Glass: a light’s detail with a large brightness control, the history with 24H, 7D and 30D; a long press on scenes and devices of the overview opens the context menu with “Open room”; the chips at the top show their kind in colour',
          },
        ],
      },
    ],
  },
  {
    version: 35,
    date: '2026-10-08',
    title: { de: 'Vorschau Glas: Kontextmenü, Wischen, Inspector', en: 'Glass preview: context menu, swipe, inspector' },
    sections: [
      {
        kind: 'changed',
        items: [
          {
            de: 'Glas: langes Drücken auf eine Karte in einem Raum (am Computer Rechtsklick) öffnet ein Menü mit Details, Ein/Aus, Favoriten und Ausblenden; kurzes Tippen bleibt, wie es war',
            en: 'Glass: a long press on a card in a room (a right click on a computer) opens a menu with details, on/off, favourites and hide; a short tap stays as it was',
          },
          {
            de: 'Glas: Zeilen nach links wischen, um eine Benachrichtigung zu verwerfen, ein Licht auszuschalten, eine Garage zu schließen oder ein Schloss zu verriegeln; die Aktion läuft erst beim Antippen, geöffnet und entriegelt wird nie per Wischen',
            en: 'Glass: swipe a row to the left to dismiss a notification, turn a light off, close a garage door or lock a lock; the action runs only when you tap it, nothing is ever opened or unlocked by swiping',
          },
          {
            de: 'Glas ab 1100 Pixel Breite: Details öffnen rechts neben der Seite, die bedienbar bleibt; ein Tipp auf eine andere Karte wechselt den Inhalt',
            en: 'Glass from 1100 pixels wide: details open on the right next to the page, which stays usable; tapping another card switches the content',
          },
        ],
      },
    ],
  },
  {
    version: 34,
    date: '2026-10-08',
    title: { de: 'Vorschau Glas: Fenster', en: 'Glass preview: windows' },
    sections: [
      {
        kind: 'changed',
        items: [
          {
            de: 'Glas am Handy und am iPad hochkant: Fenster kommen als Blatt von unten und wachsen aus dem, was man angetippt hat; am Griff zieht man sie größer, kleiner oder nach unten weg, am Handy quer sind sie gleich groß',
            en: 'Glass on the phone and on an upright iPad: windows come up as a sheet and grow out of what you tapped; drag the grabber to make them taller or smaller or to pull them down, on a phone in landscape they open tall right away',
          },
          {
            de: 'Glas ab 900 Pixel Breite (Desktop, iPad quer): Fenster schweben als Glas-Dialoge in passender Breite über der Seite',
            en: 'Glass from 900 pixels wide (desktop, iPad in landscape): windows float over the page as glass dialogs with a fitting width',
          },
          {
            de: 'Glas: Rückfragen wie „Entriegeln“ oder „Garage öffnen“ sind eine eigene Seite im Fenster mit „Zurück“; der Ziffernblock des Alarms hat runde Tasten und wackelt bei falschem Code',
            en: 'Glass: questions such as “Unlock” or “Open garage” are a page of their own inside the window with “Back”; the alarm keypad has round keys and shakes on a wrong code',
          },
          {
            de: 'Glas am Handy: Benachrichtigungen aus dem Avatar-Menü als Fenster, neueste zuerst, mit Uhrzeit, Verwerfen und „Alle verwerfen“',
            en: 'Glass on the phone: notifications from the avatar menu as a window, newest first, with the time, dismiss and “Dismiss all”',
          },
          {
            de: 'Glas: Personen, Licht, Türen & Fenster, Garage, Schlösser, Alarm, Pool, Medien, Wetter und Müll im Glas-Look; der Neustart der Poolpumpe fragt im Fenster statt im Browser-Dialog',
            en: 'Glass: people, lights, doors & windows, garage, locks, alarm, pool, media, weather and waste in the glass look; restarting the pool pump asks in a window instead of a browser dialog',
          },
        ],
      },
    ],
  },
  {
    version: 33,
    date: '2026-10-07',
    title: { de: 'Vorschau Glas: ruhigere Tab-Leiste', en: 'Glass preview: calmer tab bar' },
    sections: [
      {
        kind: 'changed',
        items: [
          {
            de: 'Glas am Handy: die Linse der Tab-Leiste gleitet langsamer zum neuen Eintrag, und die Leiste schrumpft und wächst beim Scrollen ruhiger, damit man die Bewegung sieht',
            en: 'Glass on the phone: the tab bar’s lens glides more slowly to the new entry, and the bar shrinks and grows more calmly when you scroll, so the motion can be seen',
          },
        ],
      },
    ],
  },
  {
    version: 32,
    date: '2026-10-06',
    title: { de: 'Vorschau Glas: neuer Rahmen', en: 'Glass preview: new frame' },
    sections: [
      {
        kind: 'changed',
        items: [
          {
            de: 'Glas am Handy: die Tab-Leiste schwebt mit einer gleitenden Linse und schrumpft beim Scrollen nach unten zu einem Kreis; oben rechts öffnet der Avatar Benachrichtigungen, Bearbeiten und Einstellungen, auf Raumseiten führt oben links ein Knopf zurück',
            en: 'Glass on the phone: the tab bar floats with a gliding lens and shrinks to a circle when you scroll down; at the top right the avatar opens notifications, edit and settings, on room pages a button at the top left goes back',
          },
          {
            de: 'Glas am Desktop und iPad: schwebende Seitenleiste mit den Gruppen Zuhause, Bereiche und System, oben Glas-Knöpfe für Benachrichtigungen und Bearbeiten',
            en: 'Glass on desktop and iPad: a floating sidebar with the groups Home, Categories and System, glass buttons for notifications and edit at the top',
          },
          {
            de: 'Glas überall: große Seitentitel, am Handy werden sie beim Scrollen an einer weichen Kante zu einem kleinen Titel; Menüs, Verbindungsbanner und Fehlermeldungen im Glas-Look',
            en: 'Glass everywhere: large page titles, which on the phone become a small title at a soft edge when you scroll; menus, the connection banner and error messages in the Glass look',
          },
        ],
      },
    ],
  },
  {
    version: 31,
    date: '2026-10-06',
    title: { de: 'Vorschau: Stil „Glas“', en: 'Preview: “Glass” style' },
    sections: [
      {
        kind: 'added',
        items: [
          {
            de: 'Für Admins: unter Einstellungen → Darstellung den Stil „Klassisch“ oder „Glas“ wählen; Glas ändert nur Aussehen und Bewegung (iOS-Farben, Systemschrift, reines Schwarz im Dunkelmodus), alle Funktionen bleiben, und bei der Verwaltung für alle gilt der Stil für jeden Nutzer',
            en: 'For admins: choose the style “Classic” or “Glass” under Settings → Appearance; Glass only changes the look and the motion (iOS colours, system font, pure black in dark mode), every function stays, and with the shared administration the style applies to every user',
          },
          {
            de: 'Im Stil Glas: Glas-Stärke klar, getönt oder deckend und „Transparenz reduzieren“; Hell/Dunkel lässt sich weiterhin pro Gerät wählen',
            en: 'In the Glass style: glass strength clear, tinted or opaque, and “Reduce transparency”; light/dark can still be chosen per device',
          },
        ],
      },
    ],
  },
  {
    version: 30,
    date: '2026-10-06',
    title: { de: 'NVR: Clip speichern bleibt auf der Seite', en: 'NVR: saving a clip stays on the page' },
    sections: [
      {
        kind: 'fixed',
        items: [
          {
            de: 'NVR: „Speichern“ eines fertigen Clips lädt das Video jetzt herunter, statt es anstelle von HAPulse zu öffnen; sehr große Clips öffnen sich zum Speichern in einem neuen Tab',
            en: 'NVR: “Save” on a finished clip now downloads the video instead of opening it in place of HAPulse; very large clips open in a new tab for saving',
          },
        ],
      },
    ],
  },
  {
    version: 29,
    date: '2026-10-06',
    title: { de: 'NVR: Kameraseite passt aufs Handy', en: 'NVR: camera page fits the phone' },
    sections: [
      {
        kind: 'fixed',
        items: [
          {
            de: 'NVR: Auf dem Handy endet die Kameraseite jetzt über der Tab-Leiste; „Clip erstellen“ und die Datumsauswahl lagen vorher teils dahinter, bei kleinem Bildschirm wird dafür das Bild etwas kleiner',
            en: 'NVR: On the phone the camera page now ends above the tab bar; “Create clip” and the date picker were partly behind it before, on a small screen the picture gets a little smaller for this',
          },
        ],
      },
    ],
  },
  {
    version: 28,
    date: '2026-10-06',
    title: { de: 'NVR: Clips herunterladen', en: 'NVR: download clips' },
    sections: [
      {
        kind: 'added',
        items: [
          {
            de: 'NVR: „Clip herunterladen“ auf der Kameraseite speichert ein Ereignis (mit 5 s davor und danach) oder einen frei gewählten Zeitraum „von bis“ als Video in Originalauflösung mit Ton, bis 30 Minuten; die Kanten setzt man, indem man die Zeitleiste unter der Abspiel-Linie verschiebt',
            en: 'NVR: “Download clip” on the camera page saves an event (with 5 s before and after) or a freely chosen “from–to” range as a video in original resolution with sound, up to 30 minutes; you set the edges by moving the timeline under the playback line',
          },
          {
            de: 'NVR: Der fertige Clip lässt sich speichern und auf dem iPhone bis 100 MB direkt teilen, z. B. „Video sichern“ in Fotos; jedes Ereignis der Ereignisliste hat dafür einen eigenen Download-Knopf',
            en: 'NVR: The finished clip can be saved and, on the iPhone up to 100 MB, shared directly, e.g. “Save Video” to Photos; every event in the event list has its own download button for this',
          },
        ],
      },
    ],
  },
  {
    version: 27,
    date: '2026-10-05',
    title: { de: 'Fette Zahlen in echter Schriftstärke', en: 'Bold numbers in their real weight' },
    sections: [
      {
        kind: 'fixed',
        items: [
          {
            de: 'Zahlen in der Datenschrift (z. B. Pool-Ring, Wetter, Klima, Systemwerte, NVR-Kennzahlen) erscheinen in ihrer echten Stärke statt künstlich verdickt; halbfette Zahlen sehen nicht mehr aus wie normale',
            en: 'Numbers in the data font (e.g. pool ring, weather, climate, system values, NVR figures) show in their real weight instead of artificially thickened; medium-weight numbers no longer look like regular ones',
          },
        ],
      },
    ],
  },
  {
    version: 26,
    date: '2026-10-05',
    title: { de: 'NVR: „Sentinel öffnen“ an der Abspielposition', en: 'NVR: “Open in Sentinel” at the playback position' },
    sections: [
      {
        kind: 'fixed',
        items: [
          {
            de: 'NVR: „Sentinel öffnen“ auf der Kameraseite öffnet Sentinel wieder an der Stelle, die gerade läuft oder pausiert ist, statt live; ebenso „In Safari öffnen“ beim Bild-in-Bild-Hinweis der Home-Bildschirm-App',
            en: 'NVR: “Open in Sentinel” on the camera page opens Sentinel at the moment that is playing or paused again instead of live; so does “Open in Safari” in the picture-in-picture note of the Home Screen app',
          },
        ],
      },
    ],
  },
  {
    version: 25,
    date: '2026-10-05',
    title: { de: 'NVR: Hängende Aufnahme wird angezeigt', en: 'NVR: a stalled recording is shown' },
    sections: [
      {
        kind: 'added',
        items: [
          {
            de: 'NVR: Schreibt eine Kamera keine Aufnahmen mehr, obwohl sie verbunden ist, zeigen Kachel, Statuspille, Startseiten-Karte und Sicherheitsseite „Aufnahme hängt“; Sentinel startet die Aufnahme selbst neu, die Anzeige verschwindet mit der nächsten Aufnahme',
            en: 'NVR: when a camera stops writing recordings while still connected, its tile, the status pill, the home card and the security page show “Recording stalled”; Sentinel restarts the recording itself and the notice goes away with the next recording',
          },
        ],
      },
    ],
  },
  {
    version: 24,
    date: '2026-10-05',
    title: { de: 'NVR: „gestern“ in der Ereignisleiste', en: 'NVR: “yesterday” in the events strip' },
    sections: [
      {
        kind: 'changed',
        items: [
          {
            de: 'NVR: In der Ereignisleiste steht bei Ereignissen von vor Mitternacht „gestern“ vor der Uhrzeit, bei älteren ein kurzes Datum; heutige zeigen weiter nur die Uhrzeit',
            en: 'NVR: in the events strip, events from before midnight show “yesterday” in front of the time, older ones a short date; today’s still show the time only',
          },
        ],
      },
    ],
  },
  {
    version: 23,
    date: '2026-10-04',
    title: { de: 'NVR: Ereigniszahl für den sichtbaren Tag', en: 'NVR: event count for the visible day' },
    sections: [
      {
        kind: 'changed',
        items: [
          {
            de: 'NVR: Die Zahl im Reiter „Ereignisse“ der Kameraseite zählt nur den Tag in der Mitte der Zeitleiste; auf heute passt sie zur Zahl auf der Kamerakachel, die Liste zeigt weiter alle geladenen Tage',
            en: 'NVR: the number in the camera page’s Events tab counts only the day in the middle of the timeline; on today it matches the camera tile, the list still shows every loaded day',
          },
        ],
      },
    ],
  },
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
