# Plan: Manuelle Pool-Laufzeit (inkl. 24 h) + Steuerung von NodeRED nach HA

> **Status:** abgestimmter Plan, **noch nichts umgesetzt**. Erst nach Freigabe
> Schritt für Schritt bauen — Fork-Konventionen wie in `docs/SYNC.md`
> (neue Dateien bevorzugen, Upstream-Änderungen minimal + `// [fork]`-Marker).

## Ziel

1. Die Poolpumpe soll **beliebig lange manuell** laufen können — Presets
   (30 min / 1 h / 2 h / 6 h / 24 h) **plus frei einstellbar** — direkt in
   HAPulse.
2. Die heute in **NodeRED** liegende Pumpen-Logik **sauber nach Home-Assistant-
   Automationen** ziehen (versionierbar, lesbar, ohne NodeRED-Abhängigkeit).

## Abgestimmte Entscheidungen

| Thema | Entscheidung |
|---|---|
| Vorgehen | Erst dieser Detail-Plan, dann Umsetzung nach Freigabe |
| Nach Ablauf der manuellen Dauer | zurück auf **Automatik** (wie heute) |
| Bedienung | **Presets + frei einstellbar** in HAPulse |
| Siri-Taster `input_button.poolpumpe_manuell` | bleibt **fix 30 min** (Startpunkt für Siri); optional zusätzlich als UI-Button |
| Optik | nur **Müll-Icon** an den Akzent-Stil angleichen |

---

## Teil 1 — Ist-Zustand (NodeRED), kompakt

Zustandsmaschine um `input_select.modus_poolpumpe` (*Ausgeschalten / Automatik /
Manuell*):

- **Ausgeschalten:** Zeitplan-Schalter aus, `input_boolean.poolpumpe_zeitplan`
  aus, Timer abbrechen, **Pumpe aus**.
- **Automatik:** Zeitplan-Schalter an. **Pumpe = AN, wenn Solar ≥ Schwelle ODER
  im Zeitplan-Fenster; sonst AUS.** Reagiert live auf Solar-Sensor- und
  Zeitplan-Boolean-Änderungen.
- **Manuell:** Zeitplan aus, `timer.poolpumpe_manuell` **Start (30 min Default)**,
  **Pumpe an**. Bei `timer.finished` → Modus zurück auf **Automatik**.

NodeRED **erzeugt zwei eigene Entities**, die ohne NodeRED verschwinden:
- `binary_sensor.schwellwert_poolpumpe_solarleistung` (Solar ≥ Schwelle, 2 min
  entprellt)
- `switch.*` „Schalter Poolpumpe Manuell" (reiner UI-Umschalter, mit Modus
  synchronisiert)

Weitere Einstiegspunkte in „Manuell": der Siri-Taster
`input_button.poolpumpe_manuell` und der o. g. Schalter.

> Hinweis: Der NodeRED-Node „Pumpe über 12 h → notify" ist **unverdrahtet (tot)**.
> Aktiv ist nur die HA-Automation `automation.poolpumpe_lange_laufzeit_benachrichtigung`
> (**> 10 h**). Ein 24-h-Lauf würde diese auslösen → siehe Teil 2.7.

---

## Teil 2 — Ziel-Architektur in Home Assistant (ersetzt den NodeRED-Pool-Tab)

Alles in **einem HA-Package** (`packages/pool.yaml` o. ä. via
`homeassistant: packages:`), damit es an einer Stelle liegt und versionierbar ist.

### 2.1 Neue/ersetzte Entities

**Neu — Dauer-Helfer** (für Presets + frei):
```yaml
input_number:
  poolpumpe_manuell_dauer:
    name: Poolpumpe Manuell Dauer
    min: 5
    max: 1440          # 24 h
    step: 5
    unit_of_measurement: min
    mode: box
    icon: mdi:timer-cog
```

**Ersetzt NodeRED — Solar-Schwelle als Template-Binärsensor** (gleiche
`entity_id`, damit alles Weitere unverändert funktioniert):
```yaml
template:
  - binary_sensor:
      - name: Schwellwert Poolpumpe Solarleistung   # → binary_sensor.schwellwert_poolpumpe_solarleistung
        unique_id: schwellwert_poolpumpe_solarleistung
        state: >
          {{ states('sensor.balkonkraftwerk_power') | float(0)
             >= states('input_number.schwellwert_poolpumpe_solarleistung') | float(0) }}
        delay_on:  "00:02:00"   # entspricht NodeReds 2-min-Entprellung
        delay_off: "00:02:00"
```

**Timer** `timer.poolpumpe_manuell` bleibt (Default 30 min als Fallback); wir
übergeben die Dauer künftig explizit beim Start.

**„Schalter Poolpumpe Manuell":** siehe offene Mini-Entscheidung — löschen oder
als `input_boolean` ersetzen (nur nötig, falls du ihn auf einem Wand-/Lovelace-
Dashboard nutzt).

### 2.2 Eine gemeinsame „Automatik-Auswertung" (DRY)

Regel als Skript, das die Modus- und die Nachführ-Automation teilen:
```yaml
script:
  pool_automatik_auswerten:
    alias: Pool – Automatik auswerten
    sequence:
      - if:
          - condition: template
            value_template: >
              {{ is_state('binary_sensor.schwellwert_poolpumpe_solarleistung','on')
                 or is_state('input_boolean.poolpumpe_zeitplan','on') }}
        then:
          - service: switch.turn_on
            target: { entity_id: switch.esppoolpumpe_poolpumpe }
        else:
          - service: switch.turn_off
            target: { entity_id: switch.esppoolpumpe_poolpumpe }
```

### 2.3 Automationen (ersetzen die NodeRED-Nodes)

1. **Modus: Ausgeschalten** — trigger `to: Ausgeschalten` → Zeitplan-Schalter aus,
   Boolean aus, `timer.cancel`, Pumpe aus.
2. **Modus: Automatik** — trigger `to: Automatik` → Zeitplan-Schalter an,
   danach `script.pool_automatik_auswerten`.
3. **Modus: Manuell** — trigger `to: Manuell` → Zeitplan aus, Boolean aus,
   Timer mit gewählter Dauer starten, Pumpe an:
   ```yaml
   - service: timer.start
     target: { entity_id: timer.poolpumpe_manuell }
     data:
       duration: >
         {% set m = states('input_number.poolpumpe_manuell_dauer') | int(30) %}
         {{ '%02d:%02d:00' % (m // 60, m % 60) }}
   - service: switch.turn_on
     target: { entity_id: switch.esppoolpumpe_poolpumpe }
   ```
4. **Automatik nachführen** — trigger: State-Änderung von
   `binary_sensor.schwellwert_poolpumpe_solarleistung` **und**
   `input_boolean.poolpumpe_zeitplan`; condition Modus = Automatik →
   `script.pool_automatik_auswerten`.
5. **Manuell-Timer fertig** — trigger `event: timer.finished` (Timer
   `poolpumpe_manuell`) → Modus = **Automatik**.
6. **Siri-Schnellstart 30 min** — trigger: `input_button.poolpumpe_manuell`
   gedrückt → `input_number = 30`; wenn schon Manuell: Timer 30 min neu starten +
   Pumpe an; sonst Modus = Manuell (Automation 3 übernimmt).

> Damit ist die HA-Fassung **einfacher** als NodeRED: die verschachtelten
> „Schwellwert/Zeitplan"-Zweige werden zu **einer** ODER-Regel (2.2).

### 2.4 Lange-Laufzeit-Benachrichtigung

`automation.poolpumpe_lange_laufzeit_benachrichtigung` feuert ab 10 h — bei einem
gewollten 24-h-Lauf unerwünscht. Vorschlag: Condition ergänzen „nur benachrichtigen,
wenn **kein** bewusst langer Manuell-Lauf aktiv ist" (z. B. Timer inaktiv **oder**
Dauer ≤ 6 h). Alternativ Schwelle anheben. → offene Mini-Entscheidung.

---

## Teil 3 — HAPulse (Dashboard)

### 3.1 `apps/dashboard/src/components/pool/poolConfig.ts`
Neue Rollen ergänzen:
```ts
manualDuration: 'input_number.poolpumpe_manuell_dauer',
manualSiriButton: 'input_button.poolpumpe_manuell', // optionaler UI-Schnellstart
```

### 3.2 `apps/dashboard/src/ha/pool.ts`
Dünne Wrapper (Fork-Datei):
```ts
/** Manuell-Laufzeit (Minuten) setzen. */
export function setManualDuration(entityId: string, minutes: number): Promise<void> {
  return callService('input_number', 'set_value', { value: minutes }, { entity_id: entityId });
}
```
`setPoolMode` (Manuell) und `pressButton` (Siri) existieren bereits.

### 3.3 `apps/dashboard/src/components/pool/ManualTimerCard.tsx` (Fork-Datei)
- **Idle-Zustand:** Preset-Chips **30 min / 1 h / 2 h / 6 h / 24 h** + freie
  Eingabe (Stepper/Zahlfeld) + **Start**-Button.
  Start = `setManualDuration(min)` → `setPoolMode(Manuell)`.
  Optionaler kleiner „30 min (Siri)"-Schnellstart = `pressButton(manualSiriButton)`
  (exakt derselbe Weg wie Siri).
- **Aktiv-Zustand:** bestehender Ring/Countdown bleibt; zusätzlich **Stop**
  (→ Modus Automatik, konsistent mit „Timer fertig") und optional **+30 min**
  (Timer verlängern).
- Nur vorhandene Bausteine/Design-Tokens verwenden (kein Hex).

### 3.4 `packages/core/src/pool.ts` (DOM-frei, getestet)
Kleine reine Helfer + Tests in `packages/core/scripts/smoke.mjs`:
```ts
export const POOL_MANUAL_PRESETS_MIN = [30, 60, 120, 360, 1440] as const;
export function minutesToDurationString(min: number): string { /* "HH:MM:00" */ }
export function clampManualMinutes(min: number): number { /* 5..1440 */ }
```

### 3.5 i18n — `packages/core/locales/{de,en,es,fr,it,pt,sv}.json`
Neu unter `pool.manual.*`: `durationTitle`, `start`, `stop`, `extend`,
`custom` (freie Eingabe, aria), `siriQuick`, sowie Preset-Labels (bzw. über
vorhandene Zahlen-/Zeit-Formatierung). In **allen sieben** Locales.

### 3.6 Müll-Icon orange — `apps/dashboard/src/components/waste/WasteCard.css`
`.waste-card__icon-chip` (Z. 29–30): `--bg-subtle`/`--text-dim` →
`--accent-soft`/`--accent`. Reine Fork-Datei, eine Zeile.

---

## Teil 4 — Migrations-Reihenfolge (wichtig, Kollisionen vermeiden)

Der Template-Binärsensor teilt sich die `entity_id` mit dem NodeRED-Sensor →
Reihenfolge zählt. Umschalten, wenn die Pumpe idle ist:

1. HA: `input_number.poolpumpe_manuell_dauer` anlegen (harmlos).
2. HA: Skript + 6 Automationen anlegen, zunächst **deaktiviert**.
3. Modus auf **Ausgeschalten** (Pumpe sicher aus).
4. In **NodeRED** den **Pool-Tab deaktivieren** (Solar-Sensor + Schalter geben
   die `entity_id` frei).
5. HA: Template-Binärsensor anlegen/laden → belegt jetzt
   `binary_sensor.schwellwert_poolpumpe_solarleistung`. Prüfen, dass die id
   **exakt** stimmt (nicht `_2`).
6. HA-Automationen **aktivieren**, Modus auf Automatik, alle drei Modi + Solar +
   Zeitplan + Timer-Ende durchtesten.
7. „Schalter Poolpumpe Manuell" löschen oder als `input_boolean` ersetzen.
8. HAPulse-Änderungen (Teil 3), `npm run typecheck && npm run build &&
   npm test -w @hapulse/core`, committen + auf den Feature-Branch pushen.

---

## Teil 5 — Tests / Abnahme

- **Core:** `npm test -w @hapulse/core` (neue Helfer in `smoke.mjs`).
- **Build:** `npm run typecheck && npm run build`.
- **Live in HA (mit dir):**
  - Manuell 5 min über UI → Pumpe an, Timer läuft, nach 5 min → Automatik.
  - 24 h wählen → Timer zeigt 24:00:00 (ohne durchlaufen zu lassen wieder stoppen).
  - Siri-Taster → immer 30 min.
  - Automatik: Solar über/unter Schwelle (2 min) schaltet korrekt; Zeitplan-
    Fenster schaltet korrekt; Pumpe nur aus, wenn **beides** aus.
  - Stop-Button → Automatik; +30 min verlängert.

---

## Offene Mini-Entscheidungen

1. **„Schalter Poolpumpe Manuell"**: ersatzlos löschen, oder als `input_boolean`
   nachbauen? (Nutzt du ihn irgendwo außerhalb von HAPulse/Siri?)
2. **> 10 h-Benachrichtigung** bei langem Lauf: während bewusst langer Manuell-
   Läufe unterdrücken, oder Schwelle anheben, oder unverändert lassen?
3. **Stop-Button** in der Manuell-Karte: zurück auf **Automatik** (empfohlen) oder
   auf **Ausgeschalten**?
4. **Siri-Weg zusätzlich als UI-Button** (30 min Schnellstart) — ja/nein, und wie
   beschriften?

---

## Risiken & Rollback

- **Doppelte Steuerung** (NodeRED + HA gleichzeitig) unbedingt vermeiden → Schritt 4
  vor 6.
- **Rollback:** Der exportierte NodeRED-Flow bleibt erhalten → bei Problemen
  Pool-Tab wieder aktivieren, HA-Automationen deaktivieren. HA-Teil liegt in
  **einem** Package → schnell abschaltbar.
- **Solar-Semantik:** `delay_on/off: 2 min` exakt wie NodeRED; nach Umschaltung
  einmal beobachten.
