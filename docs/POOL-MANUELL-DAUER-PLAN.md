# Plan: Manuelle Pool-Laufzeit (inkl. 24 h) + Steuerung von NodeRED nach HA

> **Status: UMGESETZT & live getestet.** Fork-Konventionen wie in `docs/SYNC.md`
> (neue Dateien bevorzugt, Upstream-Änderungen minimal + `// [fork]`-Marker).

## Umgesetzt

**Home Assistant** (über den Connector, alles via Config-API, best-practice-konform):
- Helfer `input_number.poolpumpe_manuell_dauer` und `input_number.poolpumpe_siri_dauer`
  (5–1440 min, Schritt 5).
- `binary_sensor.schwellwert_poolpumpe_solarleistung` als **Template-Helper**
  neu (gleiche `entity_id`); die 2-Min-Entprellung liegt als `for:` an der
  Nachführ-Automation.
- `switch.schalter_poolpumpe_manuell` als **Template-Switch-Helper** neu (gleiche
  `entity_id`, spiegelt den Modus; `turn_on` setzt Siri-Dauer → Manuell,
  `turn_off` → Automatik). HomeKit-Bridge (Port 21063) neu geladen → Apple-Home-
  Kachel bleibt.
- Skripte `pool_automatik_auswerten` (Pumpe = Solar ODER Zeitplan) und
  `pool_manuell_timer_starten` (Timer mit gewählter Dauer + Pumpe an).
- 6 Automationen: Modus Aus/Automatik/Manuell, Automatik-Nachführung,
  Timer-fertig→Automatik, Siri-Taster. **Verfeinerung ggü. Plan:** die
  Automatik-Automation bricht beim Eintritt zusätzlich den Manuell-Timer ab
  (Manuell→Automatik lässt keinen Rest-Timer laufen).
- „>10 h"-Benachrichtigung: schweigt bei bewusstem Manuell-Lauf.
- NodeRED-Pool-Tab bleibt deaktiviert (Rollback-Reserve).

**HAPulse:** Core-Helfer + Tests (`packages/core/src/pool.ts`,
`scripts/smoke.mjs`), `setDurationMinutes` (`ha/pool.ts`), neue Rollen in
`poolConfig.ts`, überarbeitete `ManualTimerCard` (Presets 30 min–24 h + freier
Stepper + Start/Stop + Siri-Dauer-Einstellung), i18n in 7 Locales, Müll-Icon
im Akzent-Stil. `typecheck` + `build` + `npm test -w @hapulse/core` (404) grün.

**Live getestet:** Manuell 5 min, Timer-Ende→Automatik, Siri-Dauer 45,
Apple-Home-Schalter an/aus (inkl. Timer-Cancel), Automatik „Solar ODER
Zeitplan", 24 h → Timer `24:00:00`. Endzustand: Modus Automatik, Pumpe aus.

## Ziel

1. Die Poolpumpe soll **beliebig lange manuell** laufen können — Presets
   (30 min / 1 h / 2 h / 6 h / 24 h) **plus frei einstellbar** — direkt in HAPulse.
2. Die heute in **NodeRED** liegende Pumpen-Logik **sauber nach Home-Assistant-
   Automationen** ziehen (versionierbar, lesbar, ohne NodeRED-Abhängigkeit).

## Abgestimmte Entscheidungen

| Thema | Entscheidung |
|---|---|
| Vorgehen | Erst dieser Detail-Plan, User prüft, dann Umsetzung |
| Nach Ablauf der manuellen Dauer | zurück auf **Automatik** |
| **Stop**-Button in der Manuell-Karte | zurück auf **Automatik** |
| Bedienung (UI) | **Presets + frei einstellbar** in HAPulse |
| **Siri / Apple Home** | **eigene, einstellbare Dauer** (`input_number.poolpumpe_siri_dauer`, Default 30 min) — nicht mehr fix |
| `switch.schalter_poolpumpe_manuell` (Apple Home) | **erhalten** → in HA als Template-Switch nachbauen (gleiche `entity_id`) |
| **> 10 h-Benachrichtigung** | **unterdrücken**, während ein bewusster Manuell-Lauf aktiv ist |
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
  entprellt) → **muss in HA nachgebaut werden**.
- `switch.schalter_poolpumpe_manuell` (Umschalter, mit Modus synchronisiert,
  **in Apple Home genutzt**) → **muss in HA nachgebaut werden** (gleiche
  `entity_id`, sonst bricht Apple Home).

Manuell-Einstiegspunkte: HAPulse (Modus), der Siri-Taster
`input_button.poolpumpe_manuell` (HA-Helfer, bleibt) und der o. g. Apple-Home-
Schalter.

> `input_boolean.poolpumpe_manuell` existiert ebenfalls als HA-Helfer, wird aber
> im NodeRED-Flow **nicht** verwendet → bei der Umsetzung prüfen, ob er in Apple
> Home / anderswo genutzt wird; sonst aufräumen. **Nicht ungefragt löschen.**

---

## Teil 2 — Ziel-Architektur in Home Assistant (ersetzt den NodeRED-Pool-Tab)

Alles in **einem HA-Package** (`packages/pool.yaml` via `homeassistant: packages:`),
an einer Stelle und versionierbar.

### 2.1 Neue/ersetzte Entities

**Neu — zwei Dauer-Helfer:**
```yaml
input_number:
  poolpumpe_manuell_dauer:      # aktive/ad-hoc Laufzeit (setzt, wer den Lauf startet)
    name: Poolpumpe Manuell Dauer
    min: 5
    max: 1440                   # 24 h
    step: 5
    unit_of_measurement: min
    mode: box
    icon: mdi:timer-cog
  poolpumpe_siri_dauer:         # feste, einstellbare Dauer für Siri / Apple Home
    name: Poolpumpe Siri Dauer
    min: 5
    max: 1440
    step: 5
    unit_of_measurement: min
    icon: mdi:apple
```

**Ersetzt NodeRED — Solar-Schwelle als Template-Binärsensor** (gleiche
`entity_id`):
```yaml
template:
  - binary_sensor:
      - name: Schwellwert Poolpumpe Solarleistung   # → binary_sensor.schwellwert_poolpumpe_solarleistung
        unique_id: schwellwert_poolpumpe_solarleistung
        state: >
          {{ states('sensor.balkonkraftwerk_power') | float(0)
             >= states('input_number.schwellwert_poolpumpe_solarleistung') | float(0) }}
        delay_on:  "00:02:00"
        delay_off: "00:02:00"
```

**Ersetzt NodeRED — Apple-Home-Schalter als Template-Switch** (gleiche
`entity_id`, synchronisiert sich selbst mit dem Modus und startet dabei einen
Lauf mit **Siri-Dauer**):
```yaml
switch:
  - platform: template
    switches:
      schalter_poolpumpe_manuell:   # → switch.schalter_poolpumpe_manuell
        friendly_name: Schalter Poolpumpe Manuell
        value_template: "{{ is_state('input_select.modus_poolpumpe','Manuell') }}"
        turn_on:
          - service: input_number.set_value
            target: { entity_id: input_number.poolpumpe_manuell_dauer }
            data: { value: "{{ states('input_number.poolpumpe_siri_dauer') | int(30) }}" }
          - service: input_select.select_option
            target: { entity_id: input_select.modus_poolpumpe }
            data: { option: Manuell }
        turn_off:
          - service: input_select.select_option
            target: { entity_id: input_select.modus_poolpumpe }
            data: { option: Automatik }
```

**Timer** `timer.poolpumpe_manuell` bleibt; die Dauer wird künftig **explizit**
beim Start übergeben.

### 2.2 Gemeinsame „Automatik-Auswertung" (DRY)
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

1. **Modus: Ausgeschalten** — `to: Ausgeschalten` → Zeitplan-Schalter aus,
   Boolean aus, `timer.cancel`, Pumpe aus.
2. **Modus: Automatik** — `to: Automatik` → Zeitplan-Schalter an, dann
   `script.pool_automatik_auswerten`.
3. **Modus: Manuell** — `to: Manuell` → Zeitplan aus, Boolean aus, Timer mit
   **gewählter Dauer** starten, Pumpe an:
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
4. **Automatik nachführen** — Trigger: State-Änderung von
   `binary_sensor.schwellwert_poolpumpe_solarleistung` **und**
   `input_boolean.poolpumpe_zeitplan`; Condition Modus = Automatik →
   `script.pool_automatik_auswerten`.
5. **Manuell-Timer fertig** — `event: timer.finished` (Timer `poolpumpe_manuell`)
   → Modus = **Automatik**.
6. **Siri-Taster** — Trigger `input_button.poolpumpe_manuell` gedrückt →
   `poolpumpe_manuell_dauer = poolpumpe_siri_dauer`; wenn schon Manuell: Timer mit
   dieser Dauer neu starten + Pumpe an; sonst Modus = Manuell (Automation 3
   übernimmt).

> Der Apple-Home-Schalter (2.1) nutzt denselben Weg wie der Siri-Taster:
> beide starten mit **Siri-Dauer**. HAPulse setzt dagegen `poolpumpe_manuell_dauer`
> direkt auf den in der UI gewählten Wert und schaltet dann auf Manuell.
> So läuft Siri/Apple-Home unabhängig von der letzten UI-Auswahl.

### 2.4 Lange-Laufzeit-Benachrichtigung

`automation.poolpumpe_lange_laufzeit_benachrichtigung` (feuert ab 10 h) bekommt
eine **Condition**, damit sie bei bewusst langem Manuell-Lauf schweigt:
```yaml
condition:
  - condition: template
    value_template: >
      {{ not (is_state('input_select.modus_poolpumpe','Manuell')
              or is_state('timer.poolpumpe_manuell','active')) }}
```

---

## Teil 3 — HAPulse (Dashboard)

### 3.1 `apps/dashboard/src/components/pool/poolConfig.ts`
```ts
manualDuration: 'input_number.poolpumpe_manuell_dauer',
siriDuration:   'input_number.poolpumpe_siri_dauer',
// switch.schalter_poolpumpe_manuell wird NICHT in HAPulse gebraucht (nur Apple Home)
```

### 3.2 `apps/dashboard/src/ha/pool.ts` (Fork-Datei)
```ts
/** input_number-Wert (Minuten) setzen – für Manuell- und Siri-Dauer. */
export function setDurationMinutes(entityId: string, minutes: number): Promise<void> {
  return callService('input_number', 'set_value', { value: minutes }, { entity_id: entityId });
}
```
`setPoolMode` (Manuell/Automatik) und `pressButton` existieren bereits.

### 3.3 `apps/dashboard/src/components/pool/ManualTimerCard.tsx` (Fork-Datei)
- **Idle:** Preset-Chips **30 min / 1 h / 2 h / 6 h / 24 h** + freie Eingabe +
  **Start** (`setDurationMinutes(manualDuration, m)` → `setPoolMode(Manuell)`).
- **Aktiv:** bestehender Ring/Countdown + **Stop** (→ Modus Automatik) und
  optional **+30 min** (Timer verlängern).
- **Siri-Dauer-Einstellung:** kleine Zeile „Siri-/Apple-Home-Start: `X` min" mit
  Stepper (`setDurationMinutes(siriDuration, m)`), damit du steuerst, wie lange
  ein Start per Siri/Apple-Home-Schalter läuft.
- Nur vorhandene Bausteine/Design-Tokens (kein Hex).

### 3.4 `packages/core/src/pool.ts` (DOM-frei, getestet in `scripts/smoke.mjs`)
```ts
export const POOL_MANUAL_PRESETS_MIN = [30, 60, 120, 360, 1440] as const;
export function minutesToDurationString(min: number): string; // "HH:MM:00"
export function clampManualMinutes(min: number): number;        // 5..1440
```

### 3.5 i18n — `packages/core/locales/{de,en,es,fr,it,pt,sv}.json`
Neu unter `pool.manual.*`: `durationTitle`, `start`, `stop`, `extend`, `custom`,
`siriDuration`, ggf. Preset-Labels. In **allen sieben** Locales.

### 3.6 Müll-Icon orange — `apps/dashboard/src/components/waste/WasteCard.css`
`.waste-card__icon-chip` (Z. 29–30): `--bg-subtle`/`--text-dim` →
`--accent-soft`/`--accent`. Eine Zeile, reine Fork-Datei.

---

## Teil 4 — Migrations-Reihenfolge

> **Voraussetzung:** Der NodeRED-Pool-Tab wird **deaktiviert** (macht der User).
> Solange NodeRED aus und die HA-Seite noch nicht steht, ist der Pool ungesteuert
> → **Modus „Ausgeschalten" / Pumpe aus lassen.**

1. Pumpe sicher aus (Modus **Ausgeschalten**).
2. **NodeRED-Pool-Tab aus** (durch User) → `binary_sensor.schwellwert_…` und
   `switch.schalter_poolpumpe_manuell` werden „unavailable".
3. Die zwei **verwaisten Entities aus der Registry entfernen** (sonst bekommt der
   Nachbau `…_2`).
4. HA-Package anlegen: Dauer-Helfer, Template-Binärsensor, Template-Switch,
   Skript, 6 Automationen. `entity_id`s **exakt** prüfen
   (`binary_sensor.schwellwert_poolpumpe_solarleistung`,
   `switch.schalter_poolpumpe_manuell`).
5. **Apple Home prüfen:** HomeKit-Bridge „Home Assistant Bridge" (Port 21063) neu
   laden; `switch.schalter_poolpumpe_manuell` muss als dieselbe Kachel wieder
   erscheinen (gleiche `entity_id` → kein Neu-Koppeln nötig).
6. Alle drei Modi + Solar + Zeitplan + Timer-Ende + Siri-Taster + Apple-Home-
   Schalter durchtesten.
7. HAPulse-Änderungen (Teil 3): `npm run typecheck && npm run build &&
   npm test -w @hapulse/core`, dann committen + auf `claude/fervent-sagan-cecepz`
   pushen.

---

## Teil 5 — Tests / Abnahme

- **Core:** `npm test -w @hapulse/core` (neue Helfer in `smoke.mjs`).
- **Build:** `npm run typecheck && npm run build`.
- **Live in HA (mit dir):**
  - Manuell 5 min über UI → Pumpe an, Timer läuft, nach 5 min → Automatik.
  - 24 h wählen → Timer 24:00:00 (nicht durchlaufen lassen, wieder stoppen).
  - Siri-Taster **und** Apple-Home-Schalter → laufen mit eingestellter Siri-Dauer.
  - Siri-Dauer in HAPulse ändern → nächster Siri-Start nutzt den neuen Wert.
  - Automatik: Solar über/unter Schwelle (2 min) + Zeitplan-Fenster schalten
    korrekt; Pumpe nur aus, wenn **beides** aus.
  - Stop → Automatik; +30 min verlängert; > 10 h-Meldung bleibt bei langem
    Manuell-Lauf stumm.

---

## Geklärte Mini-Entscheidungen

1. **`input_boolean.poolpumpe_manuell`**: **nicht** in der HomeKit-Bridge, nicht im
   Flow, nicht in Automationen → ungenutzt. Bleibt vorerst stehen (schadet nicht);
   auf Wunsch am Ende aufräumen.
2. **Siri-Dauer: separat** → eigener Helfer `input_number.poolpumpe_siri_dauer`.
3. **HomeKit-Reload nach Neuanlage: ok.**

**HomeKit-Kontext (bestätigt):** `switch.schalter_poolpumpe_manuell` ist über die
**HomeKit-Bridge „Home Assistant Bridge" (Port 21063)** per `include_entities`
freigegeben. Weil HomeKit-Accessoires an die **`entity_id`** gebunden sind, bleibt
die Apple-Home-Kachel erhalten, wenn der Template-Switch **dieselbe `entity_id`**
bekommt — nach dem Nachbau einmal die HomeKit-Bridge neu laden.

---

## Risiken & Rollback

- **Doppelte Steuerung** (NodeRED + HA) vermeiden → NodeRED bleibt aus, bevor die
  HA-Automationen aktiv sind.
- **Rollback:** Der exportierte NodeRED-Flow bleibt erhalten → Pool-Tab wieder
  aktivieren, HA-Package deaktivieren. HA-Teil liegt in **einem** Package.
- **Apple Home:** Nach dem Schalter-Nachbau kurz gegenprüfen, dass er in Apple
  Home weiter funktioniert.
- **Solar-Semantik:** `delay_on/off: 2 min` exakt wie NodeRED; nach Umschaltung
  einmal beobachten.
