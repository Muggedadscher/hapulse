# Heizplan je Raum — Einrichtung in Home Assistant

Stand: 2026-10-25 (Etappe 2a: Karte und Fenster in der Raumseite; Etappe 2b: Zeiten ändern; Etappe 4: Einrichten per
Knopf). Logik: `packages/core/src/heatingPlan.ts`, Aufrufe: `apps/dashboard/src/ha/heatingPlan.ts`, Oberfläche:
`apps/dashboard/src/components/heating/*` (Glas: `styles/glas/heating.css`), Demo: `packages/core/src/heatingPlanDemo.ts`.

In jedem Raum mit Thermostat schaltet HAPulse den Heizplan an und aus, stellt Komfort und Eco und ändert die Zeiten.
**Jeder HA-Benutzer** kann das, auch ohne Admin-Rechte (Standard-Rechte vorausgesetzt; eine Nur-lesen-Gruppe scheitert).

## Was Home Assistant braucht
Voraussetzungen: Blueprint [panhans/advanced_heating_control](https://github.com/panhans/HomeAssistant) V5 und
[Spook](https://github.com/frenck/spook) (Dienst `schedule.set_day`).

Je Raum, alle im **Bereich des Raums** und mit dem **Label „Heizplan“** (Kennung `heizplan`):

| Eintrag | Beispiel | Zweck |
|---|---|---|
| Automation aus dem Blueprint | `automation.advanced_heating_kueche` | an = Plan an. Aus schaltet auch Fenster- und Frostschutz der Automation ab. |
| Zeitplan (`schedule`) | `schedule.zeitplan_heizung_kueche` | an = Komfort, aus = Eco. Gehört genau einem Raum. |
| Helfer `input_number`, Endung `_komfort` (oder `_comfort`) | `input_number.heizplan_kueche_komfort` | Komfort-Temperatur, 5–30 °C, Schritt wie das Thermostat |
| Helfer `input_number`, Endung `_eco` | `input_number.heizplan_kueche_eco` | Eco-Temperatur |

Eingaben der Automation: `input_trvs` = Thermostat(e), `input_schedulers` = der Zeitplan,
`input_temperature_comfort`/`_eco` = die Helfer, `input_temperature_comfort_static`/`_eco_static` = feste Zahlen als
Rückfall, `input_physical_change: false` (sonst schriebe jede verspätete Meldung des Thermostats ohne Benutzer in den
Helfer). Ohne Zeitplan setzt der Blueprint nie eine Temperatur, mit leerem Zeitplan gilt immer Eco.

Die Thermostate findet HAPulse als `climate.*` im selben Bereich. Automation, Zeitplan und Helfer mit dem Label erscheinen
nicht unter den Geräten des Raums und zählen dort nicht mit (`buildRooms`); das Label an anderen Einträgen ändert nichts.

Einmal für alle Räume, **ohne Label und ohne Bereich**: die Automation `automation.heizplan_speichern` (so in HA,
im YAML-Modus des Automations-Editors einfügen; die Prüfung steht absichtlich als Aktion und nicht als Bedingung:
übergebene Variablen ersetzen sie nicht, und `automation.trigger` überspringt sie nicht).

```yaml
alias: Heizplan speichern
description: 'Speichert Heizungs-Zeitpläne für HAPulse, auch für Benutzer ohne Admin-Rechte. HAPulse startet sie mit automation.trigger und den Variablen zeitplan (Entität mit Label Heizplan) und tage (Liste von {tag, bloecke: [{from, to}]}). Alles andere wird abgelehnt. Keine eigenen Auslöser.'
triggers: []
conditions: []
actions:
- note: Prueft alles vorab, auch Reihenfolge und Ueberschneidung, damit nie nur ein Teil der Tage gespeichert wird. Steht als Aktion, damit uebergebene Variablen sie nicht ersetzen und automation.trigger sie nicht ueberspringt.
  variables:
    ok: '{% set wd = [''monday'',''tuesday'',''wednesday'',''thursday'',''friday'',''saturday'',''sunday''] %}{% set re_from = ''^([01][0-9]|2[0-3]):[0-5][0-9](:00)?$'' %}{% set re_to = ''^(([01][0-9]|2[0-3]):[0-5][0-9](:00)?|24:00(:00)?)$'' %}{% set ns = namespace(ok = zeitplan is defined and zeitplan is string and zeitplan.startswith(''schedule.'') and zeitplan in label_entities(''heizplan'') and tage is defined and tage is list and tage | count > 0 and tage | count <= 7) %}{% if ns.ok %}{% for t in tage %}{% if not (t is mapping and t.tag is defined and t.tag is string and t.tag in wd and t.bloecke is defined and t.bloecke is list and t.bloecke | count <= 10) %}{% set ns.ok = false %}{% else %}{% set ns.p = [] %}{% for b in t.bloecke %}{% if not (b is mapping and b[''from''] is defined and b[''to''] is defined and b[''from''] is string and b[''to''] is string and b[''from''] is match(re_from) and b[''to''] is match(re_to)) %}{% set ns.ok = false %}{% else %}{% set ns.p = ns.p + [[b[''from''][:5], b[''to''][:5]]] %}{% endif %}{% endfor %}{% set ns.end = ''00:00'' %}{% for p in ns.p | sort %}{% if not (p[0] < p[1] and p[0] >= ns.end) %}{% set ns.ok = false %}{% endif %}{% set ns.end = p[1] %}{% endfor %}{% endif %}{% endfor %}{% endif %}{{ ns.ok }}'
- if:
  - condition: template
    value_template: '{{ not ok }}'
  then:
  - error: true
    stop: 'Abgelehnt: kein Heizplan-Zeitplan oder ungültige Tage/Zeiten'
- repeat:
    for_each: '{{ tage }}'
    sequence:
    - note: Blöcke nur aus from/to neu bauen, nichts anderes geht durch.
      variables:
        bloecke: '{% set ns = namespace(l=[]) %}{% for b in repeat.item.bloecke %}{% set ns.l = ns.l + [{''from'': b[''from''], ''to'': b[''to'']}] %}{% endfor %}{{ ns.l }}'
    - action: schedule.set_day
      data:
        blocks: '{{ bloecke }}'
        day: '{{ repeat.item.tag }}'
      target:
        entity_id: '{{ zeitplan }}'
max: 10
mode: queued
```

## Wie HAPulse ohne Admin-Rechte arbeitet

| Aufgabe | Aufruf |
|---|---|
| Raum finden | Entity-Register (`area_id`, `labels`), lädt HAPulse ohnehin |
| Plan an/aus | `automation.turn_on`/`turn_off`; nach dem Einschalten `automation.trigger` auf die Raum-Automation, damit der Plan sofort gilt |
| Temperaturen | `input_number.set_value`; die Automation stellt das Thermostat sofort nach |
| Zeitplan lesen | `schedule.get_schedule` (Ende des Tages kommt als `23:59:59.999999`, HAPulse macht `24:00` daraus) |
| Zeitplan ändern | `automation.trigger` auf `automation.heizplan_speichern` mit `variables: {zeitplan, tage: [{tag, bloecke: [{from, to}]}]}`, Zeiten `HH:MM`, Ende `24:00` |

Warum eine Automation: Zeitpläne ändern dürfen in HA nur Admins, aber Spooks `schedule.set_day` prüft das nur, wenn ein
Benutzer hinter dem Aufruf steht. Eine Automation läuft immer ohne Benutzer (`automation.trigger` legt einen neuen
Kontext an); ein Skript liefe mit dem Benutzer des Aufrufers. Den Weg kann jeder HA-Benutzer nutzen, aber nur für
Zeitpläne mit dem Label.

Fehler meldet eine Automation nicht an den Aufrufer, nur in ihre Ablaufverfolgung. Deshalb liest HAPulse nach dem
Speichern den Zeitplan neu und vergleicht (`saveHeatingWeek`); stimmt er nicht, bleibt der Editor offen.

Eine Änderung direkt am Thermostat hält bei laufendem Plan bis zum nächsten Wechsel: Zeitplan, Fenster, Helfer,
HA-Neustart oder Neuladen der Automationen (auch das Speichern irgendeiner Automation: HA lädt dann nur sie neu, meldet
aber `automation_reloaded`).

## In HAPulse
Karte „Heizplan“ in der Raumseite unter „Klima“ nach den Thermostaten (`HeatingPlanCard`), auch wenn der Raum sonst keine
Klima-Geräte zeigt; nicht im Bearbeiten-Modus. Kopf mit Statuszeile und Schalter, heute als Balken mit den Komfortzeiten
und einer Marke für jetzt, Komfort und Eco (die gerade gültige umrandet), „Zeitplan und Temperaturen“ öffnet das Fenster
(`HeatingPlanSheet`: Schalter, Komfort/Eco mit − und +, Zeiten nach gleichen Tagen gruppiert). Ein Tipp auf eine Gruppe
oder „Zeiten für weitere Tage“ (nur solange ein Tag keine Komfortzeit hat) öffnet die Seite mit den Zeiten
(`HeatingTimesPage`, siehe unten).

- **Schalter:** An wirkt sofort. Aus fragt vorher und sagt, dass Fenster- und Frostschutz dann aus sind.
- **Fenster:** Im Fenster wartet alles auf ✓ (Glas) bzw. „Speichern“ (Klassisch). Beim Einschalten zuerst die
  Temperaturen, dann der Schalter; beim Ausschalten zuerst der Schalter (`heatingSave.ts`). Scheitert ein Aufruf, bleibt
  das Fenster offen mit „Nicht gespeichert … Erneut versuchen“.
- **Fenster offen:** Die Fenster- und Türkontakte des Raums (`binary_sensor` der Klassen window, door, opening;
  `heatingWindowSensors`). Die Fenster-Eingaben der Automation kann ein Benutzer ohne Admin-Rechte nicht lesen; in jedem
  Raum sind es diese Kontakte.
- **„Thermostat folgt dem Plan nicht“:** Läuft Komfort oder Eco und hält ein erreichbares Thermostat länger als 3 min
  nach der letzten Änderung an Plan, Zeitplan, Helfern oder Fenstern einen anderen Wert als der gültige Helfer (mehr als
  ein halber Schritt des Thermostats daneben) oder ist es aus (`heatingThermostatDeviates`). Das passt, weil der Blueprint
  die Abweichung des Raumsensors über die Kalibrierung ausgleicht und nicht über den Sollwert. Ursachen: eine Änderung
  von Hand (hält bis zum nächsten Wechsel) oder die Automation tut nichts (Raumsensor nicht erreichbar). Geprüft werden
  alle `climate.*` im Bereich des Raums (die Thermostat-Eingabe der Automation kann ein Benutzer ohne Admin-Rechte
  nicht lesen); ein zweites Klimagerät im Raum, das der Plan nicht steuert, gehört deshalb in einen anderen Bereich.
- **Schließen:** Solange ✓ läuft, bleibt das Fenster offen (×, Esc, Wischen und „Abbrechen“ warten), damit eine
  Ablehnung sichtbar bleibt. Der Zeitplan wird neu gelesen, wenn sich die Zeitplan-Entität ändert und wenn die
  Verbindung zu Home Assistant wieder steht.

### Zeiten ändern (Etappe 2b)
Die Seite liegt als eigenes Fenster auf dem Fenster: in Glas eine Seite mit rundem Zurück-Knopf (Pfeil, wie das ×) und ✓,
Titel = die Gruppe („Werktags“) ohne Untertitel, groß bis 8 px unter den oberen Rand (der Kopf der Raumseite bleibt
verdeckt); in Klassisch ein Dialog mit „Abbrechen“/„Speichern“. Esc schließt nur die Seite.

- **Tage:** Die Gruppe bringt ihre Tage mit, „Zeiten für weitere Tage“ die Tage ohne Komfortzeit. Die gewählten Tage
  bekommen die Zeiten der Seite, abgewählte behalten ihre. Ohne gewählten Tag wartet ✓.
- **Ring:** 24 Stunden, Mitternacht oben, im Uhrzeigersinn (`HeatingRing`). Die gewählte Zeit hat zwei Knöpfe, die Sonne
  für „Komfort ab“ und das Blatt für „Eco ab“; beide sind Schieberegler (Ziehen, Pfeile ±5 min, Bild auf/ab ±1 h,
  Pos1/Ende). Ein Tipp auf einen anderen Bogen wählt diese Zeit. Mitte: Dauer der gewählten Zeit. Liegen beide Knöpfe
  übereinander (ganzer Tag, wenige Minuten), wählt die erste Bewegung den Knopf: der in Zugrichtung, solange er sich
  dorthin noch bewegen kann.
- **Uhrzeiten:** „Komfort ab“/„Eco ab“ je Zeit als Uhrzeit-Feld; es übernimmt beim Verlassen oder mit Enter. `00:00` als
  „Eco ab“ heißt Mitternacht am Ende des Tages.
- **Regeln** (`packages/core/src/heatingEdit.ts`): Schritte von 5 Minuten; eine Zeit ist mindestens 5 Minuten lang,
  überquert nie Mitternacht, ihre eigene andere Kante oder eine Nachbarzeit (sich berührende Zeiten bleiben getrennt).
  Eine neue Zeit liegt in der größten freien Spanne des Tages, eine Stunde (höchstens ein Viertel der Spanne) nach
  deren Anfang und bis zu zwei Stunden lang; passt keine mehr (oder sind es 10), fehlt die Zeile. Ein leerer Tag
  bekommt 06:00–22:00. Eine kürzere Zeit aus Home Assistant (anderswo gesetzt) kann wachsen, nie kippen.
- **Speichern:** ✓ schickt nur die Tage, die sich ändern, in einem Aufruf an „Heizplan speichern“ und liest nach
  (`saveHeatingWeek`). Danach zeigt das Fenster darunter den nachgelesenen Zeitplan (`adoptWeek`; ein älterer
  Lesevorgang überschreibt ihn nicht, ein weiterer bestätigt ihn). Nimmt Home Assistant die Zeiten nicht an, bleibt die
  Seite offen mit „Nicht gespeichert … Erneut versuchen“; solange ✓ läuft, stehen Ring, Felder und Tage still. Die Zeiten speichern sich also mit dem ✓ der Seite, Schalter und Temperaturen
  weiter mit dem ✓ des Fensters.

## Einrichten per Knopf (Etappe 4)
Nur für Admins. Logik: `packages/core/src/heatingSetup.ts`, Aufrufe: `apps/dashboard/src/ha/heatingSetup.ts`,
Oberfläche: `HeatingSetupCard`, `HeatingSetupSheet`, `useHeatingSetup.ts`; Hinweis „Heizplan fehlt“ in
`packages/core/src/hints.ts`.

- **Welcher Raum:** ein Bereich ohne Plan (`findHeatingPlans`) mit einem `climate.*`, das eingeschaltet, nicht
  versteckt, erreichbar ist, `heat` kann und von keiner Automation aus dem Blueprint gesteuert wird, egal in welchem
  Bereich (`search/related` auf den Blueprint, dann auf jede seiner Automationen). Ein nicht erreichbares Thermostat
  zählt nicht (es kann gleich wieder da sein). Antwortet Home Assistant nicht, zeigt HAPulse nichts.
- **Wo:** Karte „Heizplan einrichten“ unter „Klima“ des Raums und eine Zeile „Heizplan fehlt“ in den Hinweisen der
  Übersicht (Tipp öffnet den Raum). Benutzer ohne Admin-Rechte sehen beides nicht.
- **„Nicht einrichten“:** Label „Ohne Heizplan“ (`ohne_heizplan`) an die Thermostate des Raums; die Karte zeigt dann nur
  „Kein Heizplan · Doch einrichten“ (nimmt das Label wieder ab), der Hinweis entfällt.
- **Fenster:** die Thermostate des Raums (ein Gerät, das auch kühlen kann, ist nicht vorgewählt: der Plan stellt es auf
  Heizen), die Fenster- und Türkontakte (Fenster und Öffnungen vorgewählt, Türen angeboten), Komfort und Eco. Beide
  starten mit dem Sollwert des ersten Thermostats, das nicht aus ist, sonst mit dem kleinsten Wert: der Raum ändert sich
  erst, wenn Zeiten und Komfort im Heizplan stehen. Bereich der Helfer = was alle gewählten Thermostate annehmen
  (innerhalb 5–30 °C), Schritt = der gröbste.
- **Vorher geprüft:** Blueprint geladen (`blueprint/list`), `automation.heizplan_speichern` vorhanden, REST aus dieser
  Adresse erlaubt (GET auf die Automation des Raums). Fehlt etwas, sagt das Fenster was und bietet den Knopf nicht an.
- **Was entsteht** (Reihenfolge, jeder Schritt sieht erst nach, ob es seinen Eintrag schon gibt):
  1. Label „Heizplan“, Kategorie „Heizung Zeitplan“ (Automationen) und „Zeitplan“ (Helfer), falls sie fehlen.
  2. Helfer `input_number.heizplan_<raum>_komfort` und `_eco` (Raum ohne Umlaute: `kueche`; gehört die Kennung einem
     anderen Raum oder einem Helfer aus YAML, mit `_2`, `_3` …): angelegt mit der Kennung als Namen, dann
     „Heizplan <Raum> Komfort/Eco“ genannt; weiter geht es mit der Kennung, die HA zurückgibt. Wert per `set_value`, solange
     die Automation des Raums noch nicht gespeichert ist (nie `initial`, das setzte ihn bei jedem Neustart zurück). Hat HA die Entity-ID nummeriert
     (`…_komfort_2`), benennt HAPulse sie um, damit sie auf `_komfort`/`_eco` endet. Bereich, Label, Kategorie.
  3. Zeitplan `schedule.zeitplan_heizung_<raum>`, leer (= immer Eco), „Zeitplan Heizung <Raum>“, Bereich, Label, Kategorie.
  4. Automation „Advanced Heating <Raum>“ über REST `POST /api/config/automation/config/heizplan_<bereichs-id>` (feste
     Kennung je Bereich: ein zweiter Versuch überschreibt statt zu verdoppeln), Eingaben wie beim WC, Beschreibung mit
     dem Zustand der Thermostate vorher. Bereich, Label, Kategorie, dann `automation.trigger`.
  5. Label „Ohne Heizplan“ von den Thermostaten nehmen, Register neu laden: der Raum zeigt seine Heizplan-Karte.
- **Abbruch:** Das Fenster nennt den Schritt; ein neuer Versuch übernimmt, was schon da ist (Helfer und Zeitplan ohne
  Bereich oder in diesem Raum, ein Helfer, der noch seine Kennung als Namen trägt, wird benannt). Auch nach einem
  Neuladen der Seite: die Automation `heizplan_<bereichs-id>` zählt für die Thermostate ihres eigenen Raums nicht als
  Plan, der Raum behält den Knopf, bis sie Bereich und Label hat.
- **Nebenwirkung:** Jede gespeicherte Automation meldet `automation_reloaded`, alle Räume stellen ihren Planwert einmal
  neu ein; von Hand gestellte Thermostate springen zurück. Das Fenster sagt es.
- **REST aus dem Browser:** Automationen speichert Home Assistant nur über REST, und das erlaubt ein Browser nur, wenn
  die Adresse von HAPulse (so wie sie oben im Browser steht; welche IP der DNS liefert, ist egal) zu den erlaubten
  CORS-Ursprüngen gehört. Seit Home Assistant 2026.8 steht das unter **Einstellungen → System → Netzwerk → HTTP-Server**
  (ein `http:`-Block in `configuration.yaml` wird nur einmal übernommen und danach ignoriert). `https://cast.home-assistant.io`
  bleibt in der Liste. Speichern startet Home Assistant neu; danach die Änderung bestätigen, sonst nimmt Home Assistant
  sie nach 5 Minuten zurück. Über die WebSocket-API: `http/config` lesen, `http/config/configure` mit der ganzen
  Konfiguration (ohne `created_at`/`error`), nach dem Neustart `http/config/promote`. Fehlt die Adresse, zeigt das
  Fenster sie zum Kopieren.

## Demo
Im Demo-Wohnzimmer: Automation, Zeitplan (Mo–Fr 06:00–08:30 und 16:30–22:00, Sa/So 08:00–22:30), Helfer 21/18 °C und
„Save Heating Plan“. Die Zeiten liegen im Attribut `demo_week` des Zeitplans; `get_schedule` und das Speichern wirken
darauf, mit derselben Prüfung wie in HA. Zustand und `next_event` des Zeitplans folgen der Uhr (`tickDemoHeating` im
Demo-Takt). Das Thermostat folgt dem Plan in der Demo nicht, deshalb zeigt die Demo den Hinweis „folgt dem Plan nicht“ nie.
Im Demo-Schlafzimmer fehlt der Plan: Admins sehen dort „Heizplan einrichten“ und in der Übersicht den Hinweis. „Einrichten“
legt die Einträge in der Demo an (`demoHeatingSetup`), „Nicht einrichten“ setzt das Label; ein Neuladen fängt neu an.
