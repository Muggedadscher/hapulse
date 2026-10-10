# Glas — Texte richtig schreiben (kurzer Plan)

Stand: nach dem Merge von Etappe 5. Ablauf nach [GLAS-PLAN §3](../GLAS-PLAN.md): kurzer Plan, unabhängig geprüft (§7),
ein PR, danach Etappe 6. Pfade relativ zu `apps/dashboard/src/`, Core = `packages/core/`.

## Anlass

Entscheid des Users (2026-10-10, „Glas geht vor“, GLAS-PLAN §3): Glas wird sauber gebaut, ohne Umwege. Ein solcher
Umweg ist die Schreibweise: 353 Schlüssel beginnen in mindestens einer Sprache klein (en 321, de 152, es 348, fr 352,
it 324, pt 348, sv 322; dazu „← zurück zur startseite“), etwa „licht“, „türen & fenster“, „alle aus“, „keine räume —
bereiche in home assistant festlegen“. Davon sind 172 Vorlese-Texte des Bearbeiten-Modus und 8 `nvr.*` (bleiben, T3).
Glas hebt heute per CSS nur den ersten Buchstaben: 11 Regeln `::first-letter` (`menus.css`, `pages.css`,
`settings.css` ×7, `sheet-content.css`, `sheets.css` mit der Klasse `g-chip-window`) und 4 Regeln
`text-transform: capitalize` (`detail.css`, `home-lists.css`, `lists.css`, `security.css`). Ergebnis: „Türen &
fenster“, „Niemand zu hause“. Alle 15 Regeln treffen nur Texte aus den Locales (der eine Home-Assistant-Text, der
Untertitel des Alarm-Fensters, kommt schon groß).

Fakten: Der Fork hat bisher keinen Upstream-Text geändert (geprüft gegen Upstream v1.3.2: 0 abweichende Werte, 973
Upstream- und 512 Fork-Schlüssel, 7 Sprachen). Von den kleinen Schlüsseln stammen in en 283 aus dem Upstream und 38
aus dem Fork (de 137 / 15).

## Festlegungen

| # | Festlegung |
|---|---|
| T1 | **Eine Textquelle für beide Stile.** Die richtige Schreibweise gilt in Glas und Klassisch, ohne Stil-Schalter im Wörterbuch. Klassisch ist der Standard: **alle, die heute Klassisch sehen, sehen die neue Schreibweise mit dem Ausrollen**, auch dort, wo der Upstream bewusst klein schreibt (die Begrüßung hebt `home.css` per CSS ohnehin auf Kleinbuchstaben, das bleibt). Jede Stelle, an der Klassisch sich ändert, steht im PR (Klassisch-Vergleich mit `main`). Klassisch-Code wird nicht gelöscht. |
| T2 | **Upstream-Texte bleiben unberührt.** Korrekturen stehen je Sprache in einer eigenen Datei des Forks, `Core locales/case/<lang>.json` (nur die geänderten Schlüssel). Core exportiert `withCase(dict, fix)`; dieselbe Überlagerung nutzen `I18nProvider` (`DICTS`, `fallback` und der Standardwert von `I18nContext`, `[fork]`), die Prüfskripte (`glas-shots.cjs` lädt `DE` einmal überlagert) und die Tests. Upstream-Merges an den Locales bleiben konfliktfrei. |
| T3 | **Fork-Texte direkt.** Fork-eigene Schlüssel (`pool.*`, `waste.*`, `glas.*`, Garage, Schlösser, Hinweise, Sektionen des Forks) werden in den Locales selbst korrigiert. `nvr.*` bleibt unverändert und darf nicht in der Überlagerung stehen (Paket-Texte, `nvrLocales.test` vergleicht die Rohdateien; die Kameraseite ist Etappe 6). |
| T4 | **Regeln, alle Sprachen.** (a) Ein Text, der für sich steht (Titel, Beschriftung, Knopf, Chip, Zustand, Leermeldung, Hinweis, Vorlese-Text, Platzhalter), beginnt groß; eine Beschriftung unter oder neben einer Zahl in eigenem Element zählt dazu (`home.roomsQuickAccess.*Label`, `automations.hero.stat*`, `scenes.hero.statUsedToday`). (b) Namen wie Namen, auch in Zusammensetzungen: „Home Assistant“, „Home-Assistant-Instanz“, „HAPulse“, „Music Assistant“. (c) Englisch: Satzschreibung, also nur der erste Buchstabe und Namen („Doors & windows“) — wie die Mehrheit der kurzen Upstream-Texte (rund 177 zu 36 in Title Case) und die Titel des Forks („Garage doors“, „Waste collection“). Großbuchstaben, die schon im Text stehen, bleiben; gesenkt wird nie. (d) Deutsch: Nomen groß, in jedem deutschen Text im Umfang, auch mitten im Satz („{entity} zu Favoriten hinzufügen“). (e) Französisch, Spanisch, Italienisch, Portugiesisch, Schwedisch: Satzschreibung. (f) Jeder Satz beginnt groß, auch der zweite (`settings.backup.hint`), außer nach Abkürzungen („z. B.“, „e.g.“). (g) Ein Text, der in einen anderen eingesetzt wird (Einheit in derselben Zeichenkette nach einer Zahl, Teilsatz), bleibt in Sprachen ohne Nomen-Großschreibung klein. Wird ein Schlüssel sichtbar allein gezeigt und nur in Vorlese-Texte eingesetzt, gilt (a): `common.time.*` (allein in MotionList, DoorWindowList, MotionGrid, PeopleList, PeopleModal, EntityDetailModal, GlasDetailHead, NotificationsSheet; eingesetzt in `home.chipmodals.people.lastChangedAria`), `automations.time.*` und `scenes.time.*` (eingesetzt in `ranAria`/`activatedAria`) — passend zu „Gerade eben“ des Upstreams in derselben Spalte. (h) Bezeichner und Adressen bleiben, wie sie geschrieben werden müssen: `onboarding.urlPlaceholder`, `settings.backup.error.*` („accentHue must …“). |
| T5 | **Nur die Schreibweise, nur nach oben.** Gegenüber dem Ausgangstext darf sich nur ein Kleinbuchstabe in seinen Großbuchstaben ändern; Platzhalter `{…}`, Wortlaut und Satzzeichen bleiben Zeichen für Zeichen gleich. |
| T6 | **CSS-Umwege weg:** die 11 `::first-letter`- und 4 `capitalize`-Regeln, die Klasse `g-chip-window` und `windowClass` in `useChipWindow` (der Hook liefert nur noch den Untertitel). |

**Ausnahmen** (`KEEP_LOWER`): eine JSON-Datei neben dem Test, nicht im Laufzeit-Code. Je Schlüssel (Plural-Schlüssel
mit ihrem Stamm, `.one`/`.other` zusammen) die Sprachen, in denen der kleine Anfang richtig ist, und der Grund (T4 g/h).
Deutsch steht dort nur bei Bezeichnern und Adressen (T4 h); so rutschen deutsche Nomen wie „7 räume · 101 entitäten“
(`settings.connection.rooms/entities`) nicht durch.

## Dateien

- neu Core `locales/case/{en,de,es,fr,it,pt,sv}.json`, Core `src/textCase.ts` (`withCase`, exportiert), Test
  `apps/dashboard/test/textCase.test.ts` mit `test/keep-lower.json`
- `i18n/I18nProvider.tsx` `[fork]`: `DICTS`, `fallback` und Kontext-Standard über `withCase`
- Core `locales/*.json`: nur Fork-Schlüssel (T3)
- `styles/glas/{menus,pages,settings,sheet-content,sheets,detail,home-lists,lists,security}.css`: Regeln weg (T6)
- `components/home/chipLabels.ts` und die Chip-Fenster: ohne `windowClass`
- Prüfskripte: `glas-shots.cjs` (`DE` überlagert, damit auch die Bannertexte der Bilder; neue Option `--lang` für
  `shoot`, setzt Sprache und Browser-Locale), `glas-checks-pages.cjs`: die Stellen, die heute `::first-letter` oder
  den Rohtext erwarten, prüfen den Text selbst (pagesTitles, Versionszeile der Einstellungen, Untertitel der Anmeldung,
  Chips und Chip-Fenster samt Klassisch-Titel, Fuß des Mehr-Menüs)
- Doku: `docs/SYNC.md` (neue Dateien, `I18nProvider`-Zeile, Merge-Schritt „Test meldet geänderten Upstream-Text →
  Überlagerung nachziehen“, Zeilen zu `g-chip-window`), `docs/glas/PLAN-ETAPPE-5.md` (§7.4/§7.19: Regeln ersetzt),
  Fork-Changelog F39 (DE + EN; F38 ist dann ausgerollt), `CHANGELOG.fork.md`

## Erzeugung

Ein einmaliges Skript (nicht im Repo) schlägt je Sprache die Satzschreibung, die Satzanfänge und die Namen vor; die
Einordnung nach T4 (a)/(g) geschieht je Schlüssel an seinen Aufrufstellen, auch über Hilfsfunktionen (etwa
`roomUtils.ts` für `common.time.*`). Deutsch: alle klein geschriebenen Wörter aller deutschen Texte im Umfang als Liste,
von Hand auf Nomen geprüft. Das Ergebnis wird von Hand gelesen, nicht blind übernommen.

## Test (`textCase.test.ts`)

1. Überlagerung: jeder Schlüssel existiert in derselben Sprache und ist kein `nvr.*`; der Text unterscheidet sich vom
   Ausgangstext und nur nach T5 (Zeichen gleich oder Klein- zu Großbuchstabe, in `{…}` alles gleich).
2. Vollständigkeit je Sprache, nach dem Überlagern, ohne `nvr.*`: kein Text beginnt klein (`^[^\p{L}\p{N}{]*\p{Ll}`),
   kein Satz nach `. ! ?` beginnt klein (außer nach den Abkürzungen der Liste), „home assistant“, „hapulse“, „music
   assistant“ (auch mit Bindestrich) stehen nie klein — außer laut `KEEP_LOWER` für diese Sprache. Neue oder geänderte
   Upstream-Texte fallen so beim nächsten Merge auf.
3. `KEEP_LOWER` nennt nur Schlüssel (oder Plural-Stämme), die es gibt, gültige Sprachen und einen Grund.

## Abnahme

- Glas: `pagesMenus` chips und die Szenen aus Etappe 4–5 ohne kleine Anfänge außerhalb von `KEEP_LOWER`; Bilder per
  `shoot --lang`: Deutsch alle Szenen, die übrigen Sprachen Übersicht, Einstellungen und ein Chip-Fenster, beide Stile.
- Klassisch-Vergleich mit `main`: Unterschiede nur bei geänderter Schreibweise, je Szene im PR benannt.
- Gesamtlauf einmal vor dem Merge (alle `checks`-Teile, Klick-Fuzz beide Stile, Pflichtbefehle inkl. Lint).

## Risiken

- Upstream ändert Wortlaut eines überlagerten Textes: Test 1 schlägt an, die Überlagerung wird im Merge nachgezogen.
- Umfang (rund 350 Schlüssel × 7 Sprachen, dazu die deutschen Nomen): Vorschlag per Skript, Prüfung von Hand, Review
  mit Stichproben je Sprache.
- Ein Text wird an einer zweiten Stelle eingesetzt, an der klein richtig wäre: die Einordnung prüft alle Aufrufstellen;
  im Zweifel bleibt er klein und steht mit Grund in `KEEP_LOWER`.

## 7. Prüfung des Plans (2026-10-10)

Unabhängige Prüfung ohne Blocker; Zahlen, Herkunft, CSS-Spur und Aufrufstellen bestätigt. Eingearbeitet: Prüfskripte
lesen die überlagerte Datei (T2, Dateien); Test 1 hält Platzhalter und `nvr.*` fest (T3, T5); Bezeichner und
Adressen (T4 h); Umfang mit Pfeil-Anfang, zweiten Sätzen, deutschen Nomen im ganzen Text und „Home-Assistant-Instanz“
(T4 b/d/f); Englisch in Satzschreibung entschieden (T4 c); Schlüssel, die allein und eingesetzt vorkommen, benannt
(T4 g); `KEEP_LOWER` je Sprache und mit Plural-Stämmen, außerhalb des Laufzeit-Codes; Doku-Zeilen, `--lang`,
Kontext-Standard, F39; T1 sagt, dass Klassisch sich für alle ändert. Die Überlagerung liegt in Core neben den Locales.

## 8. Umsetzung (2026-10-10)

- Überlagerung je Sprache (Schlüssel): en 274, de 134, es 298, fr 302, it 277, pt 298, sv 275. Fork-Schlüssel direkt
  korrigiert: de 7, übrige Sprachen je 27 (Pool-Chip und -Fenster, Müll „In {count} Tag(en)“, Schlösser „Alle
  verriegelt“, Glas „Geschlossen“, Vorlese-Texte der Fork-Sektionen). Reihenfolge der Schlüssel unverändert.
- `KEEP_LOWER` (`apps/dashboard/test/keep-lower.json`): 16 Einträge. Alle Sprachen: die Beispiel-Adresse, die
  Fehlertexte der Sicherung, die mit dem Namen einer Einstellung beginnen, die Teilsätze des Pool-Zeitplans nach
  der Uhrzeit (`pool.schedule.turnsOn/Off`) und „kein Limit“ (`sectionResize.noLimit`, nur in Name und Tooltip des
  Größengriffs nach „derzeit“ oder in Klammern eingesetzt; Deutsch schreibt das Nomen groß). Alle außer Deutsch (dort stehen Nomen groß): Einheiten nach der Zahl
  (`settings.connection.rooms/entities`, `pool.manual.left*`, `glas.energy.consumption`) und eingesetzte Teile
  (`editBadge.entityDefault`, `glas.energy.chartAriaStacked`).
- CSS: 11 `::first-letter`- und 4 `capitalize`-Regeln entfernt (in `detail.css` und `security.css` steht
  `text-transform: none`, weil Klassisch dort Versalien setzt), Klasse `g-chip-window` und `windowClass` weg.
- Erzeugung wie geplant: Vorschlag per Skript, englische und deutsche Überlagerung ganz von Hand gelesen, deutsche
  Nomen aus der Wortliste aller deutschen Texte; zwei Fehler des Skripts behoben („p. Ej.“ nach Abkürzungen aus einem
  Buchstaben, schwedischer Genitiv „Home Assistants“).
- Code-Review (unabhängig): zwei Blocker behoben (ESLint `no-control-regex` im Test: Platzhalter jetzt mit `\uE000`
  maskiert; `CHANGELOG.fork.md` neu erzeugt). Behoben außerdem: „kein Limit“ wird eingesetzt und bleibt klein (oben),
  deutsch „Auf Mobilgeräten Ausblenden umschalten“, Satzanfänge auch nach Anführungszeichen oder Klammer
  (`. „…`, `?) …`), die Einträge in `KEEP_LOWER` müssen in ihren Sprachen wirklich klein beginnen (veraltete fallen
  auf), zwei veraltete CSS-Kommentare, Wortlaut in `docs/SYNC.md`.
- Gesamtlauf vor dem Merge: alle Prüfungsteile grün (`pages` nach dem Nachziehen der Erwartungen an Automationen und
  Szenen), Klick-Fuzz in beiden Stilen (Desktop und Handy, je mit und ohne Bearbeiten) ohne Fehler, `main` neu
  aufgenommen gegen die Bilder des Etappe-5-Laufs 338 von 338 gleich. Klassisch gegen `main`: 24 Bilder gleich, 314
  anders; ein Abgleich der sichtbaren Texte, Vorlese-Texte und Platzhalter aller 56 Klassisch-Szenen (hell, drei
  Geräte) zeigt nur Groß/Klein, dazu „Was ist neu“ mit F39 und die Versionszeile „Version 1.3.2 · F39“.
