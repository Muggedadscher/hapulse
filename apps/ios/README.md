# HAPulse für iOS (nativ, SwiftUI)

Native App für iPhone und iPad, die HAPulse im Stil **Glas** nachbaut (Klassisch wird nicht nachgebaut). Plan, Etappen und
Entscheidungen: `/mnt/project-files/ios-app/PLAN-NATIV-2026-11-19.md` (Projektordner, nicht im Repo).

Mindestversion iOS 26 (Liquid Glass, `glassEffect`). Bundle-ID `de.schleerag.hapulse`, URL-Schema `hapulse`.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `Packages/HAPulseKit` | Logik ohne UI (läuft auch unter Linux): Texte (`I18n`, Plural, Zahlenformat), Glas-Farben und Akzent (`RGBA`, `GlasAccent`), Symbole (`SVGPath`), Demo-Haus. `Sources/HAPulseKit/Data` und `Generated/` sind erzeugt. |
| `Packages/HAPulseUI` | SwiftUI-Bausteine: Farben (`.glas(.card)`, `HPTone`), Schrift (`.hpText(.title)`), Glasflächen (`.hpGlass`), Symbole (`HPIcon`), Bewegung (`HPMotion`), Schatten (`.hpShadow`), Karte/Liste (`HPCard`, `HPSection`, `HPListGroup`), Chips (`HPStatusChip`, `HPChoicePill`, `HPStatusPill`), `HPSegment`, Schalter (`.hpSwitch()`), Regler (`HPTrackSlider`, `HPLightCapsule`), Stepper (`HPCapsuleStepper`, `HPRoundButton`), `HPSwipeRow`, Kacheln (`HPDeviceTile`, `HPRoomTile`), Detail (`HPDetailHeader`, `HPHistoryChart`, `HPOnOffBar`). Nur Darstellung, Daten kommen als einfache Werte. |
| `App/` | App-Ziel: `HAPulseApp`, Startoptionen für Tests, Anmeldung in `Sources/SignIn` (`AppRoot` zeigt nach der Anmeldung den Rahmen auf der Sitzung von `AppController`), Rahmen in `Sources/Shell` (TabView `sidebarAdaptable`: iPhone 4 Tabs + „Mehr“ wie im Web, iPad Seitenleiste; Detail als Inspector bzw. Sheet; Einstellungen Darstellung/Akzent/Sprache; `AppModel` für alle Fenster, `WindowNav` je Fenster), Katalog-Szenen in `Sources/Catalog`. |
| `UITests/` | Bildschirmfotos je Szene × Sprache × Hell/Dunkel. |
| `project.yml` | XcodeGen-Projekt; die `.xcodeproj` wird erzeugt, nie eingecheckt. |
| `tools/export/` | Generator (vitest): kopiert Texte, Demo-Haus, Farben, Symbole aus dem Web und schreibt die Prüffälle. |
| `icons.json` | Liste der Symbole, die die App braucht (Lucide = Strich, MDI = Fläche). |

## Die Web-Logik ist die Quelle

Was das Web schon rechnet (Zahlen, Plural, Texte, Akzentfarben, später Einstellungsregeln, Klima, Energie …), wird in
Swift nachgebaut und gegen **Prüffälle aus dem Web** getestet (`Tests/HAPulseKitTests/Fixtures/*.json`). Ändert sich die
Web-Logik, den Generator laufen lassen; die Swift-Tests zeigen dann, was nachzuziehen ist.

```bash
# im Repo-Wurzelordner (TZ=UTC wie die CI, sonst verschiebt sich demo.json)
TZ=UTC npx vitest run --config apps/ios/tools/export/vitest.config.mts   # erzeugt Data/, Generated/, Fixtures/
cd apps/ios/Packages/HAPulseKit && swift test                      # Linux oder Mac
```

Der Generator arbeitet mit fester Uhr (`2026-06-15T09:41Z`), damit die erzeugten Dateien stabil sind. Die CI
(`.github/workflows/ios.yml`) prüft, dass sie aktuell sind; rot ist das nur in PRs, die `apps/ios` ändern.

## App bauen (Mac mit Xcode 26)

```bash
brew install xcodegen            # CI pinnt 2.46.0
cd apps/ios && xcodegen generate
open HAPulse.xcodeproj
```

Ohne `-hp-scene` startet die App mit der Anmeldung (bzw. der gespeicherten Sitzung); die Rahmen-Szenen starten im Demo-Haus. Szenen nutzen nie die gespeicherte Anmeldung im Schlüsselbund. Ein `AppController` für alle Fenster (`HAPulseApp`). Bildschirmfoto-Szenen lesen keine gespeicherten Einstellungen. UI-Tests: `testScenes` (alle Szenen × de/en × hell/dunkel), `testSignInToFrameAndBack` (Anmeldeseite → Demo → Übersicht; Einstellungen → Abmelden → Anmeldeseite), `testLargeText` (größte Bedienhilfe-Schrift), `testIPadLandscape` (nur iPad).

Startoptionen (für Tests und Bildschirmfotos): `-hp-scene catalog|controls|tiles|detail|signin|shell|rooms|settings|sheet`, `-hp-locale de`, `-hp-scheme dark`, `-hp-accent 210`.

## CI

`ios.yml`: Kit-Tests unter Linux (`swift:6.3.3-noble`), Generator aktuell, und auf `macos-26` (Xcode 26.6) Kit-Tests,
App-Build und UI-Tests auf iPhone 17 Pro und iPad Pro 13" (iOS 26.5). Die Bildschirmfotos liegen als Artefakt
`screenshots` am Lauf. Das Web-Autoupdate (CT 210) schaut nur auf `ci.yml`, die iOS-CI hält kein Web-Deploy auf.

## Regeln

- Keine Zugangsdaten im Repo (Tokens landen später im Schlüsselbund).
- Neue Logik zuerst im Web/Core prüfbar machen, dann in Swift mit Prüffällen nachbauen.
- Nur Glas; Werte aus den Glas-Tokens, keine Farbwerte in Views.
