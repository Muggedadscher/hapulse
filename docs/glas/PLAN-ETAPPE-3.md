# Glas — konkreter Umsetzungsplan Etappe 3 (Sheets, Dialoge, Gesten)

Stand 2026-10-07, überarbeitet nach dem unabhängigen Review (§12). Basis ist `main` c07f153: Etappe 2 mit PR #104, der
Nachtrag K45 (ruhigere Tab-Leiste) mit PR #105. Dieser Plan macht [`../GLAS-PLAN.md`](../GLAS-PLAN.md) §2.1–2.5 und
§3 „Etappe 3“ am echten Code fest. Maßgeblich bleiben GLAS-PLAN §7.3 (Entscheidungen des Users),
[`../GLAS-DESIGN.md`](../GLAS-DESIGN.md) für alle Werte (vor allem §6.3, §6.4, §7.18–7.24, §7.29–7.31),
[`PLAN-ETAPPE-0-1.md`](PLAN-ETAPPE-0-1.md) K1–K19 und [`PLAN-ETAPPE-2.md`](PLAN-ETAPPE-2.md) K20–K45; wo dieser Plan
abweicht, steht es in §1 mit Grund. Pfade relativ zu `apps/dashboard/src/`.

Etappe 3 ändert nur Aussehen und Bewegung der Fenster (alle `Modal`), der Bestätigungen und der Gesten. **Klassisch
bleibt pixelgleich**, alle Funktionen bleiben (Inventar B, F, H, I, V, X). Sie kommt in zwei PRs (K46): **3a „Sheets
und Dialoge“**, dann **3b „Gesten und Inspector“**. Gemergt wird ohne Rückfrage, wenn CI grün ist, das unabhängige
Review durch ist und Klassisch 0 Pixel abweicht (Freigabe des Users vom 2026-10-07); danach eine kurze Meldung.

Notizen des Users vom 2026-10-07 zu dieser Etappe: (1) die Tab-Leiste bewegte sich zu schnell — erledigt als Nachtrag
zu Etappe 2 (K45, PR #105); offen davon bleibt nur die Vermutung, dass der Seiteneintritt `g-rise` beim Tab-Wechsel
Bilder der Linse kostet (Labor §11) und die nicht eigens gebaute Tab-Wechsel-Überblendung (K62). (2) K39 (Statusleiste
der Home-Bildschirm-App am echten iPhone) ist weiter offen und blockiert nichts (§11).

---

## 1. Abweichungen und Festlegungen gegenüber GLAS-PLAN / GLAS-DESIGN

| # | Stelle | Festlegung hier | Grund |
|---|---|---|---|
| K46 | GLAS-PLAN §8 „ein PR pro Etappe“ | Etappe 3 in zwei PRs. **3a**: Rahmen aller Fenster (Sheet, Dialog, Detents, Ziehen, Morph, animiertes Schließen, Seiten im Sheet, Übergabe), Inhalte der Chip-Sheets, Bestätigungen samt Ziffernblock, Benachrichtigungen am Handy als Sheet, Mehr/Räume schließen animiert. **3b**: Kontextmenü, Wisch-Zeilen, Inspector-Grundgerüst. Jeder PR mit eigenem unabhängigem Review, eigenem Changelog-Eintrag (F34, F35) und denselben Prüfungen | Zusammen etwa 8 000 Zeilen (Etappe 2: 6 000); ein Review dieser Größe übersieht mehr. 3a ist für sich vollständig (jedes Fenster funktioniert, nichts halb fertig); 3b baut darauf auf (Wischen braucht das Benachrichtigungs-Sheet, der Inspector die Präsentationen aus 3a) |
| K47 | GLAS-PLAN §2.1 `usePresence(open, exitMs)` | Schließen-Animation über einen **Geist**: Bevor React ein Fenster aus dem Dokument nimmt, ruft es die Aufräumfunktion der Ref an der `.modal-backdrop` (React 19.3, `react-dom-client` `commitDeletionEffectsOnFiber`: `safelyDetachRef` vor `removeChild`). Das Fenster hängt in diesem Moment noch fertig gelayoutet im Dokument. Dieselbe Aufräumfunktion ruft React aber auch, wenn das Fenster **bleibt** (StrictMode der Entwicklung, Stilwechsel Glas → Klassisch, Suspense versteckt). Deshalb klont `ghost.ts` dort nur unsichtbar und **entscheidet in einem Mikrotask** (läuft noch vor dem nächsten Bild): hängt das Original noch, verschwindet der Klon; sonst wird er sichtbar und animiert aus (§3.4). Die Ref-Funktion ist je Instanz stabil. Klassisch behält `if (!open) return null` unverändert | Mehrere Fenster schließen nicht über `open=false`, sondern verschwinden mit ihrem Elternteil: `EntityDetailModal` (gibt `null` zurück), `DeviceDetailsModal` (`if (!device) return null`), `LockConfirm`, `GarageConfirm`, `DatePickerModal` (vom Paket ein- und ausgehängt), `GlobalSettingsAdmin` nach dem Aktivieren, der Ziffernblock (K56). `usePresence` sähe diese Fälle nie. Der Geist deckt beide Wege ab, ohne einen Aufrufer zu ändern, und hält nichts Unsichtbares gemountet, das Klicks blockieren könnte (Risiko GLAS-PLAN §7.1). Die Reihenfolge hat der Prüfer in Chromium mit react-dom 19.3 gemessen (§12) |
| K48 | GLAS-PLAN §2.2 „Modal mit `depth > 0` = Seite im Sheet“; GLAS-DESIGN §7.18/§7.19 „Bestätigungsblock in der Zeile“ | Ein Fenster, das **im Inhalt eines offenen Glas-Fensters gerendert** wird (React-Kontext von `Modal`, geht durch Portale), ist eine **Seite** in diesem Fenster: gleiches Rechteck, braucht die Seite mehr Höhe, wächst sie nach oben mit (höchstens bis zur Mittel-Grenze, sonst groß); deckend `sheetSolid`; schiebt sich von rechts herein; links „‹ Zurück“ statt ×; kein Greifer, kein Ziehen. Ein Fenster aus einem anderen Teilbaum, das öffnet, während schon eines offen ist (z. B. „Was ist neu“ per Effekt), liegt als **eigenes** Sheet bzw. eigener Dialog darüber; das untere wird `inert`. Esc, „Zurück“ und Tipp daneben schließen nur das oberste Fenster. Jedes Fenster wird je Öffnung genau einmal eingeordnet (Layout-Phase, `onClose` über eine Ref); spätere Renders ändern die Reihenfolge nie. Verschwinden ein Fenster und seine Seite im selben Commit (Routenwechsel), fahren beide Geister gemeinsam nach unten (Dialog: blenden gemeinsam aus), ohne Morph. Gilt auf Handy und Desktop. Den Bestätigungsblock in der Zeile baut Etappe 3 nicht | So erscheinen „Entriegeln?“ mit Code, „Garage öffnen?“, der Alarm-Code und die Bestätigung aus der Karte im Detail eines Schlosses oder Tors (`EntityDetailModal.tsx:403`) im Fenster, ohne einen Aufrufer zu ändern. Eine Seite steckt im Teilbaum ihres Fensters, verwaiste Seiten gibt es so nicht. Der Block in der Zeile bräuchte Markup in jeder Liste und gäbe es für Bestätigungen von Seitenkarten (Sicherheit, Räume, Favoriten) gar nicht. Tipp daneben trifft die Fläche des obersten Fensters, so wie in Klassisch |
| K49 | — | **Übergabe**: schließt ein Fenster und öffnet im selben Commit ein anderes (Pool → „Manuell“ → Dauerwahl, `PoolModal.tsx:94`), übernimmt das neue Lage und Detent ohne Hochfahren: ist es höher, wächst es von der alten Oberkante (`clip-path`, `snappy` .35 s); der Geist blendet in 140 ms aus, der neue Inhalt kommt wie beim Inhaltstausch (300 ms `smooth`, 10 px). Das neue Fenster erbt den Ursprung des alten (Morph zurück in den Pool-Chip). Erkannt über einen Geist aus demselben Commit: der Merker verfällt in einem Mikrotask, das neue Fenster ordnet sich in der Layout-Phase ein (nie in `useEffect`, das bei nicht-synchronen Commits erst in einem späteren Task liefe) | Morph zurück in den Auslöser ginge nicht (der Knopf liegt im schließenden Sheet), Herunter- und wieder Hochfahren sähe aus wie zwei Fenster. Die Skizze wechselt dort den Inhalt im selben Blatt |
| K50 | GLAS-DESIGN §7.18 Detents | **Mittel**: `left/right/bottom 8` (+ Safe Area unten), Radius 40, Höhe = Inhalt, höchstens `100dvh − 144px`, Sheet-Material, Glas-Schatten, Text direkt auf dem Material `label2` → `glassLabel2`. **Groß**: unten angedockt, Höhe `100dvh − 52px`, Radius `40 40 0 0`, deckend `sheetSolid`, Schatten `sheetLarge`. Start: passt der Inhalt in mittel → mittel, sonst groß. Beide Detents gibt es immer (wie die Skizze, auch bei kurzem Inhalt); Fensterhöhe < 560 → nur groß. Ab 600 px Breite höchstens 560 breit, mittig (wie K33). Der Greifer ist ein Knopf („Blatt vergrößern/verkleinern“); bei nur einem Detent `aria-hidden` und `tabIndex=-1`. **Inhalt ändert seine Größe** (`ResizeObserver`; Lader, Verlauf lädt nach, „Alle verwerfen“): bis zum Ende der Öffnen-Animation werden Start-Detent und Morph-Ziel nachgeführt (die Bewegung läuft von der aktuellen Lage zum neuen Ziel weiter, Restdauer, mindestens 200 ms); danach folgt mittel dem Inhalt (Höhe `snappy` .35 s ab 8 px Unterschied, sonst sofort; reduzierte Bewegung sofort) bis zur Mittel-Grenze, darüber scrollt der Körper; automatisch groß wird ein Sheet nie | Werte aus §7.18 und der Skizze (`SH_H`, jedes Blatt kann groß werden). Bei 390 px Höhe (Handy quer) blieben für mittel 246 px. GLAS-PLAN nannte den Greifer `aria-hidden`; GLAS-DESIGN §7.18 gibt ihm ein Label — mit zwei Detents ist er die einzige Tastatur-Bedienung dafür. Inhalte wechseln nach dem Öffnen: `EditEntitiesModal` zeigt 20 ms einen Lader (`pages/Settings.tsx:689-718`), das Detail „Laden …“ bis Verlauf und Logbuch da sind |
| K51 | GLAS-DESIGN §7.18 „Ziehen“, §6.3 | Ziehen nur am Greifer und am Kopf (nicht an dessen Knöpfen), nur unter 900 px. Mittel nach oben: das Sheet wächst mit dem Finger bis zur Höhe von groß, darüber Gummiband ×0,2; nach unten: `translateY`. Groß nach oben: Gummiband ×0,2. Scrim-Deckkraft `1 − max(0, dy)/500`. Loslassen (`sheetMath.snapAfterDrag`): mittel → groß bei dy < −50 oder Wurf < −0,8 px/ms; mittel schließt bei dy > 25 % der Höhe oder Wurf > 0,8 px/ms; groß schließt bei dy > 45 % der Höhe; groß → mittel bei dy > 80 oder Wurf > 0,8 px/ms (nur groß: wie mittel schließen); sonst zurück. Geschwindigkeit aus `PointerEvent.timeStamp` der letzten 80 ms; unter 4 px Weg ist es ein Tipp (Greifer: Detent wechseln). `swipeToClose={false}`: nie schließen, unten ebenfalls Gummiband. Weigert sich `onClose` (z. B. `GlobalSettingsAdmin` während es arbeitet; geprüft in einem Mikrotask nach `onClose`, also nach Reacts Commit desselben Ereignisses), federt das Sheet zurück und die gemerkte Schließ-Art verfällt | Skizze bei 844 px: mittel → groß −50, mittel schließt 110, groß → mittel 80, groß schließt 360 (= 45 % von 792); GLAS-DESIGN „allgemein 25 % oder 0,8 px/ms“. Inhalt scrollt normal, Listen und Regler im Inhalt kollidieren nicht |
| K52 | GLAS-DESIGN §7.19 Desktop-Dialog | Ab 900 px zentrierter Glas-Dialog: Breiten aus §7.19 per `:has()` am Inhalt (Personen 440, Wetter 500, Licht 480, Türen 460, Garage und Schlösser 560, Alarm 460, Pool 480, Medien 500, Klima alle 760, Rollläden alle 780, Müll 440); alle übrigen behalten ihre Upstream-Breite (480, `--wide` 760, Detail 34rem, Entitäten 800). Höhe höchstens `min(100dvh − 64px, 900px)`, Radius 34, Tönung `dialogDesktop` (.68), Schatten `dialog`, Scrim `scrimDesktop` ohne Blur. Kein Greifer, kein Ziehen | Upstream setzt Breiten ebenso per `:has()` (`all-modal.css:13`, `Settings.css:787`); die Chip-Fenster tragen keine eigene Klasse |
| K53 | GLAS-DESIGN §7.18/§7.19 Kopf | In Glas rendert `Modal` einen eigenen Kopf (`SheetHeader`, `[fork]`-Zweig): Raster `44px 1fr 44px`, Innenabstand 16 14 6 (Handy) bzw. 12 12 6 (Desktop), links Schließen (Trefferfläche 44, Kreis 32 `fill`) bzw. „‹ Zurück“ auf Seiten, Mitte Titel 17/22 600 (`h2` mit derselben `id` für `aria-labelledby`) und Untertitel 13/18; das Symbol nur am Desktop links neben dem Titel. Neue optionale Prop `subtitle` (nur Glas). In 3a nutzt sie nur das Benachrichtigungs-Sheet; die Untertitel der Chip-Sheets („Licht · 5 an“) kommen mit den Chip-Arten in Etappe 4 | Die Upstream-Reihenfolge (Symbol, Titel, ×) und `margin-left: auto` am × lassen sich per CSS nur mit Rastertricks umstellen, und für den Untertitel fehlt ein Element. Ein eigener Kopf hängt nicht an Upstream-Klassen. Die Untertitel brauchen dieselbe Zählung wie die Chips (Etappe 4) |
| K54 | — | Eingabefelder, Auswahllisten und Textfelder in Fenstern mindestens 16 px Schrift | iOS vergrößert sonst die Seite beim Fokus (Code-Feld, Suche, Wetter-Auswahl, NVR-Einrichtung) |
| K55 | GLAS-PLAN §2.1 „Fokus wie heute“ | In Glas übernimmt der Hook den Fokus: beim Öffnen bleibt er, wo ein `autoFocus`-Feld ihn hingesetzt hat, sonst `[data-autofocus]`, sonst das Panel; beim Schließen — auch wenn das Fenster verschwindet, statt `open=false` zu bekommen — zurück zum Auslöser (`focus({ preventScroll: true })`), wenn der noch im Dokument und nicht `inert` ist, nachdem der Stapel `inert` neu gesetzt hat. **Der Auslöser wird vor dem Commit festgehalten**: das zuletzt per Zeiger, Enter oder Leertaste aktivierte Element aus `origin.ts` (höchstens 1,5 s alt; klappt auch auf iOS, wo Knöpfe beim Tippen keinen Fokus bekommen), sonst `document.activeElement` beim ersten Rendern des offenen Fensters. Ein Aufrufer kann ein Rückgabeziel nennen (Prop `returnFocus`, nur Glas; K57). Unter einer Seite bzw. einem darüberliegenden Fenster sind Fenster `inert`. Keine Fokusfalle (wie Klassisch) | `Modal` merkt den Auslöser in einem `useEffect` — nach Reacts `autoFocus` (Layout-Phase) sieht er das neue Code-Feld statt „Entriegeln“ (vom Prüfer gemessen); es fokussiert danach das Panel und zieht den Fokus so aus dem Code-Feld von `LockConfirm` (K63); beim Aushängen gibt es den Fokus heute gar nicht zurück |
| K56 | GLAS-PLAN §2.2 „Alarm-Ziffernblock: CSS oder `Modal`?“ | In Glas rendert `AlarmPanelCard` den Ziffernblock in einem `Modal` mit `swipeToClose={false}` (`[fork]`), Titel = Aktion, Inhalt = Untertitel, Punkte, Tasten, „Abbrechen“; die eigene Überschrift entfällt dort. Damit ist er im Alarm-Sheet eine Seite (K48), auf der Sicherheitsseite ein eigenes Sheet, mit Esc und Fokus. Falscher Code: der Block bleibt offen, leert und **schüttelt** (420 ms, −10/9/−6/4 px; Punkte des Ziffernblocks bzw. Code-Feld von `LockConfirm`), nur in Glas (Klassisch bekommt weder Attribut noch `key`), nicht bei reduzierter Bewegung | Stapel, Esc und Fokus gibt es so ohne eigene Logik; das CSS allein hätte das Overlay nie in das Sheet bekommen. Schütteln: GLAS-DESIGN §6.3 „Code falsch“ |
| K57 | PLAN-ETAPPE-2 K25 (Handy-Popover bis Etappe 3) | Am Handy öffnet „Benachrichtigungen“ im Avatar-Menü ein Sheet (`NotificationsSheet`, Fork-Datei, ein `Modal`) mit eigenem Zustand; der Popover-Effekt des Avatar-Menüs (Klick daneben, Esc) gilt nur noch für das Popover. Untertitel „N ungelesen“/„Keine neuen“ — N = Zahl der Meldungen (HA kennt keinen Lesestatus; eine Meldung gilt als ungelesen, bis sie verworfen ist, wie der Punkt am Avatar); Zeile „N Benachrichtigungen“ + „Alle verwerfen“ (`accentInk`); Liste **neueste zuerst** (ohne Zeit am Ende, in HA-Reihenfolge) mit Titel, Text und Zeit („vor 3 Std.“, `relativeTime` aus `security/roomUtils.ts`, nur bei gültigem `createdAt`, Feld neu in `useNotifications`), × je Zeile, Leerzustand nach §7.31. **„Alle verwerfen“ lässt das Sheet offen** und zeigt den Leerzustand (heute schließen Popover und Klassisch-Panel). Fokus beim Schließen zurück auf den Avatar-Knopf (der Menüeintrag ist dann ausgehängt). Desktop behält das Glas-Popover. Wischen kommt mit 3b | Skizze `g5h-notifications-l`; die Zeit liefert HA in `created_at` (Typ `PersistentNotification`, optional), `useNotifications` reicht sie bisher nicht durch. Offen bleiben zeigt das Ergebnis wie die Skizze; ein Sheet, das unter dem Finger verschwindet, wirkt wie ein Fehler |
| K58 | GLAS-PLAN §2.4 Kontextmenü (3b) | Langdruck (550 ms, `useLongPress`) auf einer `EntityCard` öffnet in Glas das Kontextmenü statt des Details, Rechtsklick und die Kontextmenü-Taste ebenso; Tipp auf Karten, deren Tipp nicht schaltet, öffnet weiter direkt das Detail. Vorschau = die echte Karte an ihrem Platz (`scale(1.04)` + `liftContext`), sichtbar durch ein Loch in der Abdunkel-Ebene (`clip-path` mit `evenodd`); eine Fläche über dem Loch schließt. Aktionen in dieser Reihenfolge: Aktivieren (Szene, zuerst) · Details · Ein-/Ausschalten (`light`, `switch`, `fan`, `input_boolean`) · Ausführen (`script`) · Drücken (`button`, `input_button`) · Zu/Aus Favoriten (wer heute Favoriten ändern kann: unter globaler Verwaltung jeder, sonst `useCanEdit()` und `editingEnabled`) · Raum öffnen (wenn die Entität einen Raum hat und man nicht schon dort ist) · Ausblenden (`useCanEdit()` und `editingEnabled`, sofort, `redInk`, zuletzt). Keine Zustands-Aktionen für Schloss, Garage, Rollladen, Klima, Medien. Scrollen und Größenänderung schließen; `role="menu"`, Pfeiltasten (`menuKeys`), Esc, Fokus zurück. Zustand in `stores/glasUiStore.ts`, Host in `GlasRuntime`. Der Rechtsklick-Handler wird mit dem `onContextMenu`, das `useLongPress` schon verteilt (`lib/useLongPress.ts:96-99`, `EntityCard.tsx:107-111`), zusammengeführt; Öffnen ist idempotent (Android löst beim Langdruck zusätzlich `contextmenu` aus) | GLAS-DESIGN §7.23. Die Karte an ihrem Platz braucht keinen DOM-Klon und bleibt live; über die Abdunkel-Ebene käme sie nicht (Stapelkontexte der Seite), daher das Loch. Schloss und Garage hätten im Menü nur Wege, die ohnehin in ihre Bestätigung führen; die Karte zeigt sie schon |
| K59 | GLAS-PLAN §2.5 „Schwelle 72 px, langes Durchziehen löst aus“ | Wisch-Zeilen nach GLAS-DESIGN §7.24: Richtungsentscheid nach 8 px (waagerecht → `setPointerCapture`), Zeile folgt bis −(Aktionsbreite + 36), offen ab −45 % der Aktionsbreite, Loslassen `snappy` .35 s; **kein Auslösen durch Durchziehen**; eine offene Zeile je Liste, Tipp auf die offene Zeile und Scrollen schließen. Breiten Handy 104/88/104/112 (Benachrichtigungen, Licht, Garage, Schlösser), Desktop 96 / offen ab −48 / Anschlag −128. Die Aktion unter der Zeile ist `aria-hidden` mit `tabIndex=-1`; ihr Zwilling in der Zeile bleibt (×, Schalter, Verriegeln, Schließen). Licht „Aus“ nur bei an; Schlösser „Verriegeln“ nur unverriegelt und nicht beschäftigt, über `request('lock')` (fragt mit Code wie heute); Garage „Schließen“ nur, wenn das Tor schließen kann. Klassisch: `SwipeRow` gibt die Kinder unverändert zurück | GLAS-DESIGN §7.24 ist neuer als GLAS-PLAN §2.5 und kennt kein Durchziehen; ein versehentliches Durchziehen hätte bei Schloss und Garage echte Folgen |
| K60 | GLAS-PLAN §2.3 Inspector (3b, Grundgerüst) | `EntityDetailModal` übergibt `presentation="inspector"` (`[fork]`). In Glas ab 1100 px und wenn kein anderes Fenster offen ist: rechtes Panel (`top/right/bottom 12`, Breite 420, Radius 30, Tönung `inspector` .68, Schatten `inspector`), nicht modal (`aria-modal="false"`, kein Scrim, keine Scroll-Sperre, Seite bleibt bedienbar), Ebene 400; Inhalt und Kopf der Seite rücken rechts auf 452 (`:root[data-g-inspector]`); Tipp auf eine andere Kachel tauscht den Inhalt (K70); Routenwechsel schließt (`GlasRuntime`); Esc schließt, wenn es oben liegt. 900–1099 Dialog, unter 900 Sheet. Inhalt wie in Klassisch; fertig gestaltet in Etappe 4 | GLAS-DESIGN §7.20; Etappe 4 baut Kopf, Licht-Regler und Verlauf (GLAS-PLAN Etappe 4 „Inspector fertig“) |
| K61 | PLAN-ETAPPE-2 §3.6/§8 „Schließen des Mehr-Menüs mit Animation, Werte, Fuß, Raumstatus: Etappe 3“ | Schließen von Mehr- und Räume-Sheet animiert in 3a per CSS (`transition-behavior: allow-discrete` auf `display`, `translateY(calc(100% + 16px))`, 360 ms `cubic-bezier(.4,0,1,1)`). Der Scrim `.app-layout::before` gibt es dafür in Glas am Handy immer: in Ruhe `opacity: 0`, `visibility: hidden`, `pointer-events: none`, offen wie heute; er blendet in 320 ms aus (`visibility` diskret am Ende). Die Tab-Leiste kommt sofort mit ihrem K45-Übergang zurück; das fahrende Sheet liegt darüber (Ebene 300 über 200). Werte rechts, Fuß „Version · F…“ und Raumstatus (K43) kommen in Etappe 4 | Werte und Raumstatus brauchen dieselbe Logik wie die Räume-Kacheln (§7.17: Zeile 1/Zeile 2, Status-Override) und die Energie-Karte (§7.9, „8,4 kWh“) — beide baut Etappe 4; eine zweite Fassung jetzt würde doppelt gepflegt. Ohne `allow-discrete` (Safari < 17.4) schließen die Menüs wie bisher sofort |
| K62 | GLAS-DESIGN §6.3 „Tab-Wechsel: Überblendung 160 ms + 6 px Anstieg“ (Notizen des Users) | bleibt offen bis Etappe 7 (Feinschliff); das Labor prüft, ob der Seiteneintritt `g-rise` Bilder der Linse kostet | Etappe 3 ändert die Tab-Leiste nicht; die Überblendung gehört zum Seitenwechsel |
| K63 | — | Drei Nebenbefunde in Klassisch, die Glas nicht hat und Klassisch nicht ändert: (a) Esc schließt verschachtelte Fenster alle auf einmal (jedes offene `Modal` hat seinen Esc-Listener); (b) verschwinden Eltern- und Kind-Fenster im selben **gelöschten Teilbaum** (das Elternteil wird ausgehängt, nicht `open=false`), laufen die passiven Aufräum-Effekte vom Elternteil zum Kind, und `body.style.overflow` bleibt `hidden`; (c) das `autoFocus`-Code-Feld von `LockConfirm` verliert den Fokus an das Panel (K55). Alle drei vor dem Melden in `checks` nachstellen ((b) genau im Teilbaum-Fall), dann dem User einzeln vorlegen. Glas sperrt das Scrollen nicht über Inline-Stile, sondern per CSS solange `data-g-sheets` an `:root` steht (§3.6) | Klassisch bleibt ohne OK des Users unverändert. Ein CSS-Schalter kollidiert nie mit Klassischs Merken-und-Zurücksetzen von `body.style.overflow` — auch nicht beim Stilwechsel mit offenem Fenster |
| K64 | glas-tokens.json `zIndex` | Fenster 1000 (Scrim darin, wie Klassisch), Seiten 1010, Inspector 400, Kontextmenü: Abdunkelung 900, Menü 910; Toasts 1100 über allem. Geister behalten die Ebene ihres Fensters | wie §5.7 in PLAN-ETAPPE-2 |
| K65 | GLAS-DESIGN §6.4 | Reduzierte Bewegung: Sheet, Dialog, Inspector, Seiten, Übergabe und Inhaltstausch überblenden 200 ms (nur Deckkraft); Detent-Wechsel springt; Ziehen folgt dem Finger (vom Nutzer gesteuert), Loslassen rastet ohne Feder; Schütteln, Anheben der Kontext-Vorschau und das Hochskalieren des Menüs entfallen | Ausnahme `!important` nach K38 bleibt auf `transition-*`/`animation-*` beschränkt; Bewegungen der Laufzeit (Web Animations, K69) fragen die Media-Query selbst ab |
| K66 | GLAS-DESIGN §7.18 „groß deckend“ | Das Material wechselt am Ende des Einrastens (mittel → groß: nach der Höhenanimation deckend; groß → mittel: zu Beginn wieder Glas), kein Verlauf zwischen Glas und deckend | `backdrop-filter`-Werte werden nie animiert (GLAS-DESIGN §6.2) |
| K67 | GLAS-PLAN Etappe 3 „alle Chip-Modals …“ | 3a gestaltet den Rahmen aller 27 Fenster (K73) und den **Inhalt** der Sheets aus GLAS-DESIGN §7.18 per CSS an den vorhandenen Klassen: Personen, Licht, Türen & Fenster, Garage, Schlösser, Alarm (inkl. Ziffernblock), Pool (inkl. Dauerwahl), Medien, Wetter, Müll, Bestätigungen, Benachrichtigungen. „Alle ausschalten“ wird prominent 48 (`[fork]`, der Knopf hat Inline-Stile, wie K41). Knöpfe in Fenster-Füßen nach §7.29 (primär prominent 50, Gefahr `actDel` + Weiß, sekundär `fill` 44). Was Etappe 3 nicht anfasst: Schalter, Segmente und Regler in diesen Inhalten behalten die Klassisch-Form mit Glas-Farben (Etappe 5), Karten in „Klima/Rollläden alle“ (Etappe 4/5), Inhalt des Details (Etappe 4) | Die §7.18-Inhalte sind reine Darstellung derselben Daten; neue Bausteine (Segment mit Linse, Schalter 51 × 31) gehören zu Etappe 5, wo sie überall kommen |
| K68 | GLAS-PLAN Etappe 3 Abnahme „Pool-Neustart erscheint im Sheet“ | „Gerät neu starten“ im Admin-Bereich der Poolseite fragt in Glas mit einem Bestätigungs-Sheet (Text, „Abbrechen“, „Neu starten“ in `actDel`) statt mit `window.confirm`; Klassisch bleibt beim Browser-Dialog (`PoolAdminCard.tsx`, Fork-Datei). Die Admin-Sicherung in den Einstellungen (`window.confirm`) bleibt in beiden Stilen | Den Browser-Dialog kann kein Stil gestalten; die Sicherung ist ein seltener Admin-Weg (Etappe 5, Einstellungen) |
| K69 | GLAS-PLAN §2.1 „FLIP mit `transform`“ | Bewegungen mit gemessenen Rechtecken (Morph, Seiten, Übergabe, Detent, Geist) laufen über die Web Animations API (`element.animate`) aus dem Hook; das CSS beschreibt nur Ruhezustände. Die Kurven kommen aus `--g-spring-*` (vom Element gelesen, Rückfall `cubic-bezier` wie §6.1). Der Geist startet beim berechneten Zustand des Originals (`transform`, Deckkraft, Höhe), damit ein Schließen mitten im Öffnen nicht springt; CSS-Animationen im Geist sind aus | CSS-Keyframes können keine gemessenen Rechtecke; ein in den Klon kopierter Keyframe-Name würde die Öffnen-Animation neu starten |
| K70 | GLAS-DESIGN §6.3 „Sheet-Inhalt tauschen“ | Neue optionale Prop `contentKey` (nur Glas): wechselt sie bei offenem Fenster, läuft der Inhaltstausch: 300 ms `smooth`, `translateY(10px)` + Einblenden; das Fenster selbst bleibt stehen. `EntityDetailModal` übergibt `contentKey={entityId}` (`[fork]`, 3a) | Das Detail tauscht seinen Inhalt, ohne zu schließen (Tipp auf ein Gruppenmitglied, später der Inspector: `openEntityDetail` auf derselben Instanz). Der Titel taugt nicht als Schlüssel: er ändert sich beim Umbenennen und Sprachwechsel, gleichnamige Entitäten tauschten ohne Animation |
| K71 | GLAS-DESIGN §7.18 Pille „Offen“, §2.5 | Dunkel: Text der Pille „Offen“ in Gruppen `label` statt `redInk` (der rote Punkt bleibt); die Akzent-Ink eigener Akzentfarben wird dunkel auch gegen `accentSoft` über `group` geprüft (`glasTokens.ts` `inkSurfaces`) | Dunkel liegt `group` (#2C2C2E) heller als die Karte: `redInk` auf `redSoft` erreicht dort 3,85:1 (Skizze), Akzent-Ink der Farbtöne 0 und 15 auf der gewählten Alarm-Modus-Fläche 4,05–4,12:1; GLAS-DESIGN §2.5 verlangt 4,5:1. Gefunden mit den neuen Kontrastpaaren (§6.1) |
| K72 | GLAS-PLAN §2.1 „keine neuen globalen Keydown-Handler“ | Ein einziger `keydown`-Listener für Esc, registriert beim Start von `GlasRuntime` (und sicherheitshalber beim ersten Fenster), statt je Fenster einer; er übergeht `defaultPrevented` und `isComposing` und tut nichts ohne offenes Fenster | Er ersetzt die Listener der Fenster und läuft vor später registrierten Listenern (z. B. der Kameraseite des Pakets, die `defaultPrevented` beachtet) |
| K73 | GLAS-PLAN „alle 25 Modals“ | Im Code stehen 25 `<Modal`-Aufrufe; `changelog/ChangelogModal.tsx:92` wird nirgends gerendert (`ForkChangelogModal` importiert nur `ReleaseEntry`). Gerendert werden 24, in Glas kommen Ziffernblock (K56), Benachrichtigungen (K57) und Pool-Neustart (K68) dazu: **27 Fenster**, Liste in §6.0 | Die Liste ist die Grundlage für „gleiches DOM je Fenster“, die Aufnahmen und die Abnahme |

---

## 2. So sieht es nach Etappe 3 aus — und was noch fehlt

**Nach 3a (Handy):** Jedes Fenster ist ein Sheet wie in der Skizze: schwebend mit 8 px Rand und runden Ecken auf Glas
(mittel) oder unten angedockt und deckend (groß), Greifer oben, Schließen links, Titel mittig. Es wächst aus dem
angetippten Chip bzw. der Kachel und schrumpft beim Schließen dorthin zurück; nach unten ziehen schließt, nach oben
ziehen macht es groß. „Entriegeln?“, „Garage öffnen?“ und der Alarm-Code schieben sich als Seite mit „‹ Zurück“ ins
Sheet; Pool → „Manuell“ wechselt im selben Sheet zur Dauerwahl. Die Chip-Sheets zeigen ihre Inhalte im Listen-Stil der
Skizze (Gruppen, Zeilenhöhen, Alarm-Modusraster, Ziffernblock mit runden 76-px-Tasten, Wetter-Raster, Müll-Termine).
Benachrichtigungen kommen als Sheet mit Zeitangaben. **Desktop:** zentrierte Glas-Dialoge (Radius 34), die aus dem
angeklickten Element wachsen.

**Was nach 3a noch anders ist als die Skizze:** Unter den Sheet-Titeln stehen noch keine Untertitel („Licht · 5 an“,
Etappe 4). Das Detail-Sheet zeigt seinen Klassisch-Inhalt im Glas-Rahmen (Kopf-Gruppe, Segment 24H/7D/30D,
senkrechter Licht-Regler: Etappe 4). Schalter, Regler und Segmente in den Sheets haben noch die Klassisch-Form in
Glas-Farben (Etappe 5). Bestätigungen kommen als Seite statt als Block in der Zeile (K48). Mehr- und Räume-Sheet haben
noch keine Werte, keinen Fuß und keinen Raumstatus (K61). Die Startseite selbst sieht aus wie nach Etappe 2; die Karten
im Glas-Look kommen mit Etappe 4.

**Nach 3b:** Langdruck auf eine Kachel hebt sie an und zeigt ein Menü (Details, Schalten, Favorit, Raum, Ausblenden);
Zeilen in Licht, Garage, Schlössern und Benachrichtigungen lassen sich nach links wischen; ab 1100 px (iPad quer,
Desktop) öffnet das Detail als Panel rechts, die Übersicht bleibt bedienbar — mit dem Klassisch-Inhalt bis Etappe 4.

---

## 3. Teil 3a — Sheets und Dialoge

### 3.1 Andockpunkt `Modal.tsx` (`[fork]`, Struktur bleibt)

```tsx
const sheet = useGlasSheet({ open, onClose, title, swipeToClose, contentKey, returnFocus, presentation, panelRef }); // [fork]
```

- Neue optionale Props, die Klassisch alle ignoriert: `subtitle?: string` (K53), `swipeToClose?: boolean` (Standard
  `true`, K51), `contentKey?: string` (K70), `returnFocus?: () => HTMLElement | null` (K55, K57), in 3b
  `presentation?: 'auto' | 'inspector'` (K60).
- Die Klassisch-Effekte für Esc und Scroll-Sperre beginnen mit `if (!open || sheet.on) return` und bekommen `sheet.on`
  in die Abhängigkeiten (in Klassisch immer `false`, also wie heute; nach einem Stilwechsel bei offenem Fenster übernimmt
  so die jeweils andere Seite ohne Rest, §3.6). Der Fokus-Effekt schweigt in Glas über eine Ref (ein Stilwechsel
  fokussiert nichts um). Der Effekt, der den Auslöser merkt, bleibt unverändert; Glas nimmt den Auslöser aus `origin.ts`
  (K55).
- Der Portal-Inhalt steckt in `<SheetContext.Provider value={sheet.context}>` (in Klassisch `null`). Den Provider gibt
  es in beiden Stilen, damit ein Stilwechsel bei offenem Fenster den Inhalt nicht neu einhängt; er rendert kein DOM.
- `.modal-backdrop`: `ref={sheet.backdropRef}` (in Klassisch `undefined`; in Glas je Instanz stabil, K47), in Glas als
  erstes Kind `<div className="g-sheet-scrim" aria-hidden="true" />`.
- Panel: `{...sheet.panelProps}` (in Klassisch leer; in Glas `data-g-sheet="medium|large|dialog|page|inspector"`,
  `data-g-mat="glass|solid"`, `aria-modal`), als erstes Kind in Glas `<SheetGrabber />` (nur Sheets, keine Seiten).
- Kopf: `sheet.on ? <SheetHeader … /> : <div className="modal-header">…</div>` (K53); Körper und Fuß unverändert.
- `if (!open) return null` bleibt; das Schließen in Glas animiert der Geist (K47).

Klassisch rendert damit exakt dasselbe DOM (gleiche Klassen, Attribute, Inline-Stile, Effekte); `checks` vergleicht es
je Fenster mit `main` (§6.2).

### 3.2 `useGlasSheet` und die Präsentation

`components/glas/sheet/useGlasSheet.ts` (neu). In Klassisch gibt der Hook `{ on: false }` und leere Props zurück und
hängt nichts an. In Glas ordnet er das Fenster in der Layout-Phase in den Stapel ein (§3.6) und bestimmt dort die
Präsentation (ein Fenster, das im selben Commit schließt, ist dann schon ausgetragen — K49):

| Lage | Präsentation | Material |
|---|---|---|
| im Inhalt eines offenen Glas-Fensters gerendert, jede Breite | Seite (K48) | `sheetSolid` |
| sonst < 900 | Sheet, Detent nach K50 | mittel: Sheet-Material (`--g-sheet-fill/-filter`, Mindest-Tönung `sheetMedium`); groß: `sheetSolid` |
| sonst ≥ 900 | Dialog (K52) | Glas, Tönung `dialogDesktop` |
| ≥ 1100, nur `presentation="inspector"` und kein anderes Fenster offen (3b) | Inspector (K60) | Glas, Tönung `inspector` |

- Das Panel tritt in die `:where()`-Liste von `material.css` ein, solange `data-g-mat="glass"` (K30): Rezept, Rand,
  Rückfälle deckend/ohne `backdrop-filter`/`forced-colors` gelten so automatisch. „Transparenz reduzieren“, Stärke
  deckend und `prefers-contrast: more` machen jedes Fenster deckend. Auf dem mittleren Sheet gilt für Text direkt auf
  dem Material `label2` → `glassLabel2`, in den deckenden Gruppen bleibt `label2`.
- **Upstream-CSS des Panels wird in Glas überschrieben**, sonst greift die Laufzeit ins Leere: `.modal-panel` hat
  `animation: modal-panel-in … both` bzw. `modal-panel-slide-up … both` (`Modal.css:42`, `:132`); deren Füllung hält
  `transform` und `opacity` fest und schlägt Inline-Stile (vom Prüfer gemessen). In Glas: `animation: none`, `max-height`
  und `max-width` nach Präsentation (statt 85vh/90vh, die groß auf 760 statt 792 kappten), `border: 0`, `box-shadow` und
  `background` aus dem Material, Innenabstände von Kopf, Körper und Fuß nach §3.7/§3.8; `.modal-panel:focus-visible`
  bleibt ohne Rahmen.
- `.modal-backdrop` hat in Glas keinen Hintergrund, keinen `backdrop-filter`, keine Animation und keinen Innenabstand
  (sonst wäre sie Backdrop-Root und das Glas des Panels sähe die Seite nicht, GLAS-DESIGN §3.7); dunkel macht der Scrim
  (`--g-scrim`, am Desktop `--g-scrim-desktop`, `pointer-events: none`, damit der Klick daneben wie heute auf der
  Backdrop landet). Seiten haben keinen eigenen Scrim.
- Messen und Schreiben: Detent, Ursprung und Seitenrechteck als Attribute bzw. Inline-Stile am Panel; Ziehen schreibt
  nur Inline-Stile, ohne React neu zu rendern (`checks` prüft, dass ein Inline-Versatz im berechneten Stil ankommt).
  Fenstergröße ändert sich (Drehen) → Präsentation und Detent neu bestimmen, ohne Animation. Die iOS-Tastatur ändert
  nur den `visualViewport`: ein Sheet mit fokussiertem Eingabefeld rückt um die verdeckte Höhe nach oben (Labor §11).
  Inhalt ändert seine Größe → K50.
- Stilwechsel bei offenem Fenster (Admin stellt um): kein Absturz, kein Geist, keine Öffnen-Animation, Zustand sofort
  richtig (`checks`).

### 3.3 Öffnen: Ursprung und Morph

- `components/glas/sheet/origin.ts` (neu): `GlasRuntime` meldet jedes `pointerdown` und jedes Enter/Leertaste
  (`keydown`, Capture) mit `closest('button, a, [role="button"], [role="menuitem"], .card, [data-morph-origin]')`;
  gespeichert werden Element und Rechteck. `takeOrigin()` liefert ihn einmal (danach ist er verbraucht), wenn er
  höchstens 1,5 s alt ist, sonst nichts. Fenster, die ohne Geste öffnen („Was ist neu“ per Effekt), haben so keinen.
  Derselbe Eintrag ist der Auslöser für die Fokus-Rückgabe (K55).
- Sheet mit Ursprung: aus dessen Rechteck (`translate` + `scale`, Ursprung oben links, Radius `22/scale → 40`) in
  `smooth` .5 s; Inhalt blendet 240 ms ab 120 ms ein; Scrim 300 ms. Ohne Ursprung: `translateY(calc(100% + 16px)) → 0`
  `smooth` .5 s. Maßstab mindestens 0,05 je Achse.
- Dialog: Morph .52 s `smooth` (Radius `22/scale → 34`, Deckkraft voll ab 18 %), Inhalt ab 40 %; ohne Ursprung
  `scale(.96)` + Deckkraft 0 → 1 in `smooth` .5 s.
- Seite: `translateX(100%) → 0` `smooth` .5 s, darunter wandert der Inhalt des Elternfensters (Kopf, Körper, Fuß, nicht
  das Panel mit dem Glas) um −25 % und auf `brightness(.86)`; Schatten `pushedScreen` an der linken Kante der Seite.
- Übergabe (K49) und Inhaltstausch (K70) wie in §1.
- **Wiederöffnen während des Schließens**: läuft noch der Geist desselben Fensters, verschwindet er, und das Fenster
  wächst aus dessen aktueller Lage (GLAS-DESIGN §6.2 „abbrechbar“).
- Fokus nach K55 erst, wenn das Panel im Dokument ist (die Animation stört ihn nicht).

### 3.4 Schließen: der Geist (K47)

`components/glas/sheet/ghost.ts` (neu). Die Ref-Funktion der Backdrop ist je Instanz stabil (`useCallback(…, [])`,
Zustand über Refs) und gibt in Glas eine Aufräumfunktion zurück. React ruft sie, wenn das Fenster entfernt wird —
aber auch, wenn es bleibt (StrictMode der Entwicklung, auch bei Updates außerhalb von Klicks; Stilwechsel; Suspense
versteckt). Deshalb, alles in `try/catch` (eine Ausnahme dort landete sonst über die Fehlergrenze auf der Fehlerkarte):

1. Nur wenn `:root` gerade `data-style="glas"` trägt (aus dem DOM gelesen: `applyAppearance` läuft vor Reacts Commit)
   und das Element verbunden ist.
2. Synchron klonen: berechneten Zustand des Originals lesen (`transform`, Deckkraft, Rechteck, `scrollTop` gescrollter
   Elemente — K69), `cloneNode(true)`; im Klon `id`, `role`, `aria-modal` und `aria-labelledby` weg, `inert`,
   `aria-hidden="true"`, `pointer-events: none`, Klasse `g-sheet-ghost`, CSS-Animationen aus; `video`/`canvas` als
   Standbild bzw. ausgeblendet (Eingabewerte kopiert `cloneNode` selbst). Den Klon **unsichtbar direkt vor** das Original
   setzen (`backdrop.before(clone)`): so liegt ein im selben Commit geöffnetes Fenster danach darüber (K49). Erst jetzt
   `scrollTop` setzen (an einem nicht eingehängten Klon geht es verloren).
3. In einem Mikrotask entscheiden (er läuft nach dem Commit, noch vor dem nächsten Bild): hängt das Original noch, den
   Klon entfernen — fertig. Sonst den Klon sichtbar machen und erst jetzt den Ursprung prüfen (verbunden und sichtbar;
   was im selben Commit verschwand, zählt nicht).
4. Animation nach Schließ-Art (der Hook merkt sie sich vor dem Aufruf von `onClose`; sie verfällt, wenn `onClose` sich
   weigert):
   - Morph zurück in den Ursprung: 420 ms `smooth`, bis 70 % deckend, dann aus; Inhalt 140 ms; Dialog .44 s
     `cubic-bezier(.32,.72,0,1)`.
   - ohne Ursprung: 360 ms `cubic-bezier(.4,0,1,1)` nach unten (Dialog: `scale(.96)` + ausblenden, .44 s); nach Ziehen
     320 ms dieselbe Kurve ab der aktuellen Lage.
   - Seite: nach rechts hinaus, der Elterninhalt kommt zurück (`smooth` .5 s).
   - Fenster und Seite im selben Commit: beide wie „ohne Ursprung“, gemeinsam (K48).
   - Übergabe: 140 ms ausblenden. Reduzierte Bewegung: 200 ms ausblenden.
   - Scrim 320 ms ease-in.
5. Entfernen bei `animation.finished`; ein Zeitgeber (1 s) nur als Rückfall. Mehrere Geister gleichzeitig sind erlaubt.

Alle Schließwege laufen so: ×, „Zurück“, Esc, Tipp daneben, Ziehen, Aktion im Fenster (Verriegeln, Starten …),
Elternteil hängt das Fenster aus, Routenwechsel. Kosten: große Fenster (Entitäten, Detail mit Diagramm) werden im
Commit geklont — das Schließen gehört in den Leistungsbericht (§6.3).

### 3.5 Ziehen und Inhaltsgröße (`sheetMath.ts`, K50, K51)

`components/glas/sheet/sheetMath.ts` (neu, rein, getestet): `pickPresentation`, `pickDetent(contentH, viewportH)`,
`mediumHeight`, `dragFrame({ detent, dy, height, largeH, hasMedium, canClose })` (Höhe bzw. Versatz mit Gummiband),
`snapAfterDrag({ detent, dy, vy, height, hasMedium, canClose })` → `'medium' | 'large' | 'close' | 'stay'`,
`scrimOpacity(dy)`, `releaseVelocity(samples)`, `morphFrom(origin, target, radius)`, `originVisible`.
Pointer Events am Greifer und am Kopf (`touch-action: none`, `setPointerCapture`), Geschwindigkeit aus
`PointerEvent.timeStamp` der letzten 80 ms; unter 4 px Weg ist es ein Tipp. Ein Tipp auf den Greifer wechselt
mittel ↔ groß, die Tastatur genauso (Knopf). Detent-Wechsel animiert Höhe, Einzug und Radius in `snappy` .35 s; das
Material wechselt nach K66. Die Inhaltsgröße verfolgt ein `ResizeObserver` am Körper (K50: Nachführen während des
Öffnens, danach folgt mittel dem Inhalt).

### 3.6 Stapel, Esc, Scroll-Sperre, Tab-Leiste (`sheetStack.ts`, K48, K63, K72)

`components/glas/sheet/sheetStack.ts` (neu). Reiner Kern (getestet): die Liste der offenen Fenster
`{ id, kind, batch, depth }` mit `insertEntry` (Inspector unten, sonst in Öffnungs-Reihenfolge; öffnen ein Fenster und
ein in seinem Inhalt gerendertes im selben Commit, liegt das innere oben — React führt den Layout-Effekt des Kindes
zuerst aus, deshalb zählt die Kontext-Tiefe, nicht die Reihenfolge der Aufrufe), `removeEntry`, `topEntry`,
`modalCount`, `Batches` (eine Nummer je Commit, bis zum nächsten Mikrotask) und der Übergabe-Merker (K49, verfällt im
Mikrotask). Ob ein Fenster eine Seite ist, sagt nicht die Liste, sondern `SheetContext` (K48): jedes offene Glas-Fenster
stellt ihn seinem Inhalt bereit (Id, Tiefe, Panel des Wurzelfensters für das Rechteck); entschieden wird einmal beim
Öffnen.

- **Einmal je Öffnung:** eingetragen im Layout-Effekt des Hooks (Abhängigkeiten `open` und Glas an/aus), ausgetragen in
  dessen Aufräumfunktion. `onClose` liest der Stapel erst beim Auslösen über eine Ref; ein neues Rendern (z. B. ein
  Inline-Pfeil als `onClose` bei jedem HA-Update) ändert die Stelle nie (`insertEntry` mit vorhandener Id gibt die Liste
  unverändert zurück).
- **`inert`** an allen Backdrops außer der obersten — unter einer Seite also am Elternfenster, unter einem eigenen
  Fenster am unteren. Der Inspector (3b) liegt unten und wird `inert`, sobald etwas darüber liegt.
- **Esc (K72):** ein einziger `keydown`-Listener am `document`, angemeldet beim Start von `GlasRuntime` und beim ersten
  Fenster (dieselbe Funktion; doppelt angemeldet zählt einmal). Ohne offenes Fenster, bei `defaultPrevented` oder
  `isComposing` tut er nichts, sonst `preventDefault` und `onClose` des obersten Fensters. Der Esc-Effekt von `Modal`
  schweigt in Glas.
- **Scroll-Sperre per CSS (K63):** solange ein modales Fenster offen ist, steht `data-g-sheets` an `:root`, und
  `sheets.css` setzt unter `:root[data-style='glas'][data-g-sheets]` `body { overflow: hidden }`. Glas schreibt keinen
  Inline-Stil und zählt nichts. Der Klassisch-Effekt (merkt sich `body.style.overflow` und stellt ihn zurück) schweigt in
  Glas und hängt an `sheet.on` (§3.1): nach einem Stilwechsel bei offenem Fenster übernimmt die jeweils andere Seite,
  und nichts bleibt hängen. Der Inspector sperrt nicht.
- **Tab-Leiste:** `data-g-sheets` lässt sie wegfahren wie bei Mehr/Räume (`tabbar.css`, Übergang aus K45); `GlasRuntime`
  minimiert solange nichts.
- **Fokus (K55):** nach dem Austragen in einem Mikrotask (das Fenster ist dann aus dem Dokument, `inert` neu gesetzt):
  zum gemerkten Auslöser bzw. zu `returnFocus()`, wenn er verbunden und nicht `inert` ist, sonst zum Panel des Fensters,
  das jetzt oben liegt; immer `focus({ preventScroll: true })`.

### 3.7 Desktop-Dialog (K52)

Zentriert in der Backdrop wie Klassisch; Kopf `44px 1fr 44px`, Innenabstand 12 12 6, Schließen 44/32, Titel 17/600
mit Symbol, Untertitel 13 `glassLabel2`; Inhalt Innenabstand 8 20 22; Gruppen Radius 18–20 (`group` deckend auf Glas).
Seiten wie auf dem Handy, im Dialog-Rechteck. Kein Ziehen.

### 3.8 Inhalte der Sheets (K67, GLAS-DESIGN §7.18, §7.30, §7.31)

Gemeinsam: Inhalt Innenabstand 8 16 28; Gruppen `group`, Radius 22 (Desktop 18–20), keine Ränder; Gruppentitel 15/20 600
`label2` mit Zählung rechts; Zeilen nach §7.30 mit Trennlinie 0,5 px `sep` ab Textbeginn, keine nach der letzten Zeile;
Leerzustände nach §7.31 (Kreis 52–56 `fill`, Titel, Erklärung). Kein Glas im Inhalt.

| Fenster (Datei, Klassen) | In Glas |
|---|---|
| Personen (`PeopleModal`, `people-modal__*`) | Zeilen 62, Avatar 40 + Zonen-Punkt 12, Zone `greenInk` 600 (zu Hause) bzw. `label2`, „seit“ 13 `label2` |
| Licht (`LightsModal`, `lights-modal__*`) | „Alle ausschalten“ prominent 48 (`[fork]`: Inline-Stil nur in Klassisch); Gruppen je Raum in Nutzer-Reihenfolge + „Andere“; Zeilen 56 mit Kreis 32 (an Gelb + `glyphDark`, aus `fill`), Zeilen-Tipp schaltet weiter |
| Türen & Fenster (`DoorsModal`, `doors-modal__*`) | zwei Gruppen, offen zuerst, Pille 26 „Offen“ `redSoft`/`redInk` 600 bzw. „Geschlossen“ `fill`/`label2` mit Punkt 7 |
| Garage (`GarageModal` → `GarageList`) | Kachel-Kreis 40 Soft, Zustand 15/600 Ink, Knöpfe 44 (Stopp nur beim Fahren, Schließen, Öffnen) |
| Schlösser (`LocksModal` → `LocksList`) | Knopf 40 „Verriegeln“/„Entriegeln“, gesperrt bei beschäftigt/klemmt wie heute |
| Alarm (`AlarmModal` → `AlarmPanelCard`) | Kopf Kreis 56 + Zustand 22/28 700; Modus-Raster 2 Spalten, 52 hoch, Radius 18, gewählt `accentSoft` + Ring 2 px Akzent; nur unterstützte Modi; Ziffernblock-Seite (K56): Punkte 14, Tasten 3 × 76 rund, „Abbrechen“ Text `accentInk` |
| Pool (`PoolModal`, `pool-modal__*`; Dauerwahl `PumpManualModal`, `pool-duration`, `pool-manual__*`) | Status 22/28 700 `tealInk`; Modus-Knöpfe als Kapselreihe 44 (Form wie Segment, Linse erst Etappe 5); Kennzahlen als Liste; Dauerwahl: Presets 44, Stepper-Wert 28/34 700, „Starten“ prominent 50 |
| Medien (`MediaModal`, `media-modal__*`) | Gruppen aktiv/inaktiv mit Zähler; Karte je Player mit Cover 52 Radius 12, Play 44 (spielt: `blue` + Weiß); Lautstärke-Regler in Klassisch-Form |
| Wetter (`WeatherModal`, `weather-modal__*`) | Kopf 48/54 700; Kennzahlen 3 × 3 Radius 16; Stunden 56 breit; Tage-Liste 48 mit Regen in `blueInk`; Entitäts-Wahl für Bearbeiter bleibt |
| Müll (`WasteBinModal`, `waste-modal__*`) | nächster Termin als Kopf-Gruppe, Liste der Termine 48, „(verlegt)“ bleibt sichtbar |
| Klima/Rollläden alle (`all-modal__grid`) | nur Rahmen; Raster einspaltig unter 600, zweispaltig ab 600 |
| Bestätigungen (`LockConfirm`, `GarageConfirm`, Pool-Neustart K68) | Frage 17/22 600 zentriert, Hinweis 13 `label2` („Entriegeln fragt immer nach.“ aus den vorhandenen Texten, wo es sie gibt), Code-Feld 17 (≥ 16 px), Knöpfe nach K67 |
| Detail, Geräte, Zeitplan, Einstellungen-Entitäten, NVR, „Was ist neu“, Admin-Bestätigung | nur Rahmen (Inhalte: Etappe 4/5/6) |

### 3.9 Benachrichtigungen am Handy (K57)

`components/glas/NotificationsSheet.tsx` (neu): ein `Modal` mit `subtitle` und `returnFocus` (Avatar-Knopf; der
Menüeintrag, der es öffnet, ist nach dem Schließen des Menüs ausgehängt). `AvatarMenu.tsx` öffnet es mit eigenem
Zustand; den Popover-Zweig (`panelOpen`, sein Effekt für Klick daneben und Esc, `PANEL_STYLE`) braucht das Avatar-Menü
nicht mehr — es erscheint nur unter 900 px (`.page-header-actions__mobile`), und das Glas-Popover der Glocke am Desktop
gehört zur Shell (`NotificationsPanel`). `Panel` braucht der Fork damit nicht mehr; sein Export geht auf Upstream zurück.

Inhalt nach der Skizze `g5h-notifications-l`: Untertitel „N ungelesen“ bzw. „Keine neuen“ (N = Zahl der Meldungen);
Kopfzeile „N Benachrichtigungen“ 15 `label2` + „Alle verwerfen“ 15/600 `accentInk` (Trefferfläche 44); eine Gruppe,
Zeilen neueste zuerst (ohne gültige Zeit am Ende, in der Reihenfolge von HA): Titel 17/600, Text 15 `label2`, Zeit 13
`label2` („vor 3 Std.“, `relativeTime(t, createdAt)` aus `security/roomUtils.ts`, nur wenn `Date.parse` eine Zahl
liefert), × 44 mit Glyphe 16 `label2`; Leerzustand „Keine Benachrichtigungen“ + „Neue Meldungen von Home Assistant
erscheinen hier.“ „Alle verwerfen“ ruft `dismiss_all` und lässt das Sheet offen; der Leerzustand erscheint, sobald HA
die leere Liste meldet (die Höhe folgt nach K50). Dienste wie heute (`persistent_notification.dismiss`/`dismiss_all`).
Der Punkt am Avatar bleibt.

### 3.10 Mehr- und Räume-Sheet schließen (K61)

Nur CSS in `menus.css`. Upstream wechselt bei beiden Menüs nur `display` (`--open`-Klasse, AppLayout.css,
RoomsMenu.css), sie bleiben gemountet. Der geschlossene Zustand bekommt in Glas einen Übergang auf `display`
(`allow-discrete`), `transform` (`translateY(calc(100% + 16px))`) und Deckkraft, 360 ms `cubic-bezier(.4,0,1,1)`; am
offenen Zustand steht `transition: none`, damit kein Übergang die Öffnen-Animation `g-sheet-in` überdeckt (Übergänge
stehen in der Kaskade über Animationen). Den Scrim `.app-layout::before` gibt es in Glas am Handy dafür immer: in Ruhe
`opacity: 0`, `visibility: hidden`, `pointer-events: none` (heute existiert er nur, solange `:has()` ein offenes Menü
findet, und ließe sich so nicht ausblenden); offen wie heute; zu in 320 ms, `visibility` wechselt am Ende. Die Tab-Leiste
kommt sofort mit ihrem K45-Übergang zurück, das fahrende Sheet liegt darüber. Ohne `allow-discrete` (Safari < 17.4)
schließen die Menüs sofort wie heute. Reduzierte Bewegung: 200 ms nur Deckkraft.

### 3.11 Bewegung und Material im Überblick

| Was | Normal | Reduziert |
|---|---|---|
| Sheet auf | Morph aus dem Ursprung .5 s `smooth`; ohne Ursprung von unten .5 s | 200 ms Deckkraft |
| Sheet zu | zurück in den Ursprung 420 ms; ohne Ursprung nach unten 360 ms, nach Ziehen 320 ms ab der Lage | 200 ms Deckkraft |
| Dialog | auf .52 s aus dem Ursprung, ohne Ursprung `scale(.96)` + Einblenden .5 s; zu .44 s | 200 ms Deckkraft |
| Detent | `snappy` .35 s (Höhe, Einzug, Radius); Material wechselt am Ende (K66) | springt |
| Inhalt wächst nach dem Öffnen | Höhe `snappy` .35 s ab 8 px (K50) | sofort |
| Seite | von rechts .5 s `smooth`, Elterninhalt −25 % + `brightness(.86)`; zu nach rechts .5 s | 200 ms Deckkraft |
| Fenster mit Seite zu (ein Commit) | beide nach unten 360 ms (Dialog: beide ausblenden .44 s) | 200 ms Deckkraft |
| Übergabe / Inhaltstausch | 140 ms aus / 300 ms ein, 10 px | 200 ms Deckkraft |
| Code falsch | Schütteln 420 ms (nur Glas) | entfällt |
| Scrim | auf 300 ms, zu 320 ms ease-in | 200 ms |
| Mehr/Räume zu | 360 ms nach unten | 200 ms Deckkraft |

---

## 4. Teil 3b — Gesten und Inspector

### 4.1 Kontextmenü (K58, GLAS-DESIGN §7.23)

- `stores/glasUiStore.ts` (neu): `contextMenu: { entityId, el, rect } | null`, `openContextMenu`, `closeContextMenu`.
- `components/glas/contextActions.ts` (neu, rein, getestet): Aktionen je Entität und Rechten (Reihenfolge K58).
- `components/glas/ContextMenu.tsx` (neu, Host in `GlasRuntime`): Abdunkelung `ctxDim` + `blur(14px) saturate(140%)`
  (Desktop `ctxScrimDesktop` + `blur(10px) saturate(120%)`) mit Loch über der Karte; die Karte bekommt
  `data-g-lifted` (`scale(1.04)` `bouncy` 420 ms + `liftContext`, Desktop `liftContextDesktop`); Menü 250 breit
  (Desktop 256, Innenabstand 6), Radius 22, Sheet-Material bzw. Glas Tönung `menu`, unter der Karte (+14) oder darüber,
  seitlich 16 Rand; Einträge min. 46 (Desktop 44), 17/22 + Symbol rechts, Trennlinien ab 16, vor „Ausblenden“ am Desktop
  ein 6-px-Band `fill`; erscheint `scale(.6)` + `blur(6px)` → 1 in `snappy` 420 ms, 40 ms nach der Vorschau, Ursprung
  Kartenmitte; zu: 180–260 ms ausblenden.
- `EntityCard.tsx` (`[fork]`): in Glas `useLongPress(openContextMenuForCard)` statt `openDetail` und `onContextMenu`
  (Rechtsklick, Kontextmenü-Taste) → Kontextmenü; Klassisch unverändert. `-webkit-touch-callout: none` und
  `user-select: none` an der Karte nur in Glas.
- Weitere Langdruck-Quellen (Favoritenleiste, Geräte-Zeilen) folgen in Etappe 4 (GLAS-PLAN §2.4).

### 4.2 Wisch-Zeilen (K59, GLAS-DESIGN §7.24)

- `components/glas/swipeMath.ts` (neu, rein, getestet): Richtungsentscheid, Versatz mit Anschlag, offen/zu.
- `components/glas/SwipeRow.tsx` (neu): Zeile vorne, Aktion dahinter (Text 15/20 600 Weiß auf `actDel`, `actNeutral`
  bzw. `actOk`), `touch-action: pan-y`; nach einem Wischen wird der folgende Klick geschluckt (der Zeilen-Tipp im
  Licht-Sheet schaltet nicht mit). Klassisch: nur `children`.
- Einsätze: Benachrichtigungen (`NotificationsSheet`, Desktop-Popover über `[fork]` in `NotificationsPanel.tsx`) mit
  Hinweis „Tipp: Zeile nach links wischen zum Verwerfen.“; Licht-Sheet (`[fork]` in `LightsModal.tsx`); Garage
  (`GarageList.tsx`, Fork-Datei); Schlösser (`[fork]` in `LocksList.tsx`, Upstream-Datei).

### 4.3 Inspector-Grundgerüst (K60, GLAS-DESIGN §7.20)

Präsentation `inspector` in `useGlasSheet`; rein `translateX(460px) → 0` .55 s `smooth`, raus .38 s mit Deckkraft → .6
(Geist); Backdrop ohne Scrim mit `pointer-events: none`, Panel mit `pointer-events: auto`; `:root[data-g-inspector]`
gibt `.app-main` und dem Desktop-Kopf rechts 452 px Platz. `GlasRuntime` schließt den Inspector beim Routenwechsel.
Ein Fenster aus dem Inhalt des Inspectors (Bestätigung aus der eingebetteten Karte) ist eine Seite im Inspector (K48);
ein Fenster aus der Seite (Chip, Kachel) liegt als Dialog darüber, und der Inspector wird `inert`. Wechsel über
1100 px bei offenem Fenster: Präsentation wechselt ohne Animation.

---

## 5. Dateien

Pfade wie oben relativ zu `apps/dashboard/src/`; Tests und Skripte liegen unter `apps/dashboard/test/` bzw.
`apps/dashboard/scripts/` (vitest `include: ['test/**/*.test.ts']`).

### 5.1 Neue Dateien (Fork)

| Datei | Teil | Inhalt |
|---|---|---|
| `components/glas/sheet/useGlasSheet.ts`, `sheetMath.ts`, `sheetStack.ts`, `SheetContext.ts`, `origin.ts`, `ghost.ts`, `SheetHeader.tsx`, `SheetGrabber.tsx` | 3a | §3.1–3.6 (`sheetMath.ts` und `sheetStack.ts` liegen als Entwurf im Zweig) |
| `components/glas/NotificationsSheet.tsx` | 3a | §3.9 |
| `styles/glas/sheets.css` (Rahmen, Scrim, Detents, Dialog, Seiten, Geist, Kopf, Greifer, Fuß-Knöpfe, Scroll-Sperre), `styles/glas/sheet-content.css` (§3.8) | 3a | in `index.css` und in der Liste „exist“ des Selektor-Wächters |
| `apps/dashboard/test/sheetMath.test.ts`, `apps/dashboard/test/sheetStack.test.ts` | 3a | §6.1 |
| `stores/glasUiStore.ts`, `components/glas/ContextMenu.tsx`, `contextActions.ts`, `SwipeRow.tsx`, `swipeMath.ts`, `styles/glas/gestures.css` (Kontextmenü, Wischen, Inspector; ebenso in „exist“) | 3b | §4 |
| `apps/dashboard/test/contextActions.test.ts`, `apps/dashboard/test/swipeMath.test.ts` | 3b | §6.1 |

Geänderte Fork-Dateien: 3a `app/glas/GlasRuntime.tsx` (Ursprung, Esc-Listener K72), `components/glas/AvatarMenu.tsx`
(§3.9), `components/security/LockConfirm.tsx` (Schütteln, nur Glas), `components/pool/PoolAdminCard.tsx` (K68),
`styles/glas/index.css`, `material.css` (K30-Liste), `tabbar.css` (`data-g-sheets`), `menus.css` (K61),
`packages/core/src/glasTokens.ts` und `packages/core/scripts/smoke.mjs` (Schatten und Kontrastpaare, im Entwurf schon
da), `apps/dashboard/test/glasSelectors.test.ts` („exist“), `apps/dashboard/scripts/glas-shots.cjs`; 3b
`GlasRuntime.tsx` (Kontextmenü-Host, Inspector beim Routenwechsel schließen), `NotificationsSheet.tsx`,
`garage/GarageList.tsx`. Laufzeit-Klassen `g-*` (z. B. `g-sheet-ghost`) brauchen keinen Eintrag in `RUNTIME_CLASSES`,
der Wächter nimmt `g-*` aus.

### 5.2 `[fork]`-Stellen in Upstream-Dateien

| Datei | Teil | Änderung |
|---|---|---|
| `components/ui/Modal.tsx` | 3a | §3.1: Import, vier Props, Hook, Wächter in drei Effekten, Kontext-Provider, Backdrop-Ref + Scrim, Panel-Attribute, Greifer, Kopf-Zweig; 3b `presentation` |
| `components/security/AlarmPanelCard.tsx` | 3a | Ziffernblock in Glas als `Modal`, Schütteln (K56) |
| `components/home/chipmodals/LightsModal.tsx` | 3a/3b | Inline-Stil von „Alle ausschalten“ nur in Klassisch (K67); 3b Zeilen in `SwipeRow` |
| `components/home/EntityDetailModal.tsx` | 3a/3b | `contentKey={entityId}` (K70); 3b `presentation="inspector"` (K60) |
| `components/notifications/NotificationsPanel.tsx` | 3a/3b | `createdAt` in `useNotifications` (K57, im Entwurf schon da); `Panel` wieder ohne Export; 3b Zeilen des Desktop-Popovers in `SwipeRow` |
| `components/security/LocksList.tsx` | 3b | Zeilen in `SwipeRow` (K59) |
| `components/cards/EntityCard.tsx` | 3b | Langdruck und Rechtsklick → Kontextmenü in Glas (K58) |
| `packages/core/locales/*.json` (7) | 3a/3b | `glas.sheet.*` (Zurück, Greifer-Labels), `glas.notifications.*`, `glas.pool.restart*`, `glas.context.*`, `glas.swipe.*` |

Klassisch: jede Stelle rendert dort exakt das Heutige.

---

## 6. Tests und Proben

### 6.0 Die 27 Fenster (K73)

Grundlage für „gleiches DOM je Fenster“, die Aufnahmen und die Abnahme. Demo-Modus, Demo-Nutzer ist Admin.

| # | Fenster | Datei | So öffnet es die Demo | Hinweis |
|---|---|---|---|---|
| 1 | Personen | `home/chipmodals/PeopleModal.tsx` | Start → Chip „Personen“ | `person.alice`, `person.bob` |
| 2 | Licht | `…/LightsModal.tsx` | Chip „Licht“ | |
| 3 | Türen & Fenster | `…/DoorsModal.tsx` | Chip „Türen“ | |
| 4 | Alarm | `…/AlarmModal.tsx` | Chip „Alarm“ | `alarm_control_panel.home`, Code `number` |
| 5 | Medien | `…/MediaModal.tsx` | Chip „Medien“ | Cover-Bilder (Geist, §9) |
| 6 | Pool | `…/PoolModal.tsx` | Chip „Pool“ | |
| 7 | Garage | `…/GarageModal.tsx` | Chip „Garage“ | `cover.garage_door` |
| 8 | Schlösser | `…/LocksModal.tsx` | Chip „Schlösser“ | `lock.front_door` |
| 9 | Wetter | `…/WeatherModal.tsx` | Wetterzeile (Handy), Wetter-Kapsel (Desktop) | |
| 10 | Klima alle | `…/ClimateAllModal.tsx` | Start → Klima-Karte „Alle anzeigen“ | kein Weg ins Detail |
| 11 | Rollläden alle | `…/BlindsAllModal.tsx` | Start → Rollläden-Karte „Alle anzeigen“ | kein Weg ins Detail |
| 12 | Müll | `waste/WasteBinModal.tsx` | Start → Müll-Karte → Tonne | |
| 13 | Detail | `home/EntityDetailModal.tsx` | Tipp auf eine Sensor-Kachel; Langdruck auf eine Licht-Kachel | in `AppLayout` gerendert, also nie Seite; Inhaltstausch K70 |
| 14 | Dauerwahl | `pool/PumpManualModal.tsx` | Pool-Sheet → „Manuell“ (Übergabe K49); Poolseite → Manuell-Karte | |
| 15 | Zeitplan | `pool/ScheduleEditorModal.tsx` | Poolseite → Zeitplan bearbeiten | |
| 16 | Was ist neu | `changelog/ForkChangelogModal.tsx` | Einstellungen → „Was ist neu“; beim Start mit ungesehenen Einträgen (Effekt, ohne Geste) | `data-autofocus` „Verstanden“ |
| 17 | Gerät | `devices/DeviceDetailsModal.tsx` | Geräte → Zeile | verschwindet statt `open=false` |
| 18 | Entriegeln | `security/LockConfirm.tsx` | Schlösser-Sheet → „Entriegeln“; Sicherheit → Schlösser; Detail des Schlosses → Karte | Seite bzw. eigenes Fenster; verschwindet statt `open=false` |
| 19 | Garage öffnen | `garage/GarageConfirm.tsx` | Garage-Sheet → „Öffnen“; Sicherheit → Garage; Detail des Tors → Karte | wie 18 |
| 20 | Für alle übernehmen | `settings/GlobalSettingsAdmin.tsx` | Einstellungen → Verwaltung → Aktivieren | weigert sich zu schließen, solange es arbeitet (K51) |
| 21 | Entitäten | `pages/Settings.tsx` (`EditEntitiesModal`) | Einstellungen → Entitäten bearbeiten | Lader 20 ms, dann Liste (K50) |
| 22 | NVR-Einrichtung | `nvr/components/NvrSetup.tsx` | `/nvr` mit gesetzter Sentinel-Adresse → Kopf-Knopf | die Shots setzen eine Adresse aus dem Dokumentationsbereich (RFC 5737) und brechen deren Anfragen per `page.route` ab |
| 23 | Kameras zu Räumen | `nvr/components/NvrCameraRoomsModal.tsx` | wie 22, Kopf-Knopf | Liste leer |
| 24 | NVR-Datumswahl | `nvr/components/DatePickerModal.tsx` | Kameraseite → Datum-Chip | braucht einen laufenden Sentinel: nur Labor (`nvr-sweep-test.cjs`); Klassisch-DOM sichert der gemeinsame `Modal`-Pfad |
| 25 | Ziffernblock (nur Glas) | `security/AlarmPanelCard.tsx` | Alarm-Sheet → Modus | Seite im Alarm-Sheet; auf der Sicherheitsseite eigenes Sheet |
| 26 | Benachrichtigungen (nur Glas, < 900 px) | `glas/NotificationsSheet.tsx` | Avatar → „Benachrichtigungen“ | Demo-Meldungen mit `created_at` |
| 27 | Pool-Neustart (nur Glas) | `pool/PoolAdminCard.tsx` | Poolseite → Admin → „Gerät neu starten“ | `button.poolpumpe_esppoolpumpe_geraeteneustart` |

`changelog/ChangelogModal.tsx:92` wird nirgends gerendert und fehlt deshalb.

### 6.1 Unit-Tests (vitest, Node-Umgebung)

| Test | Prüft |
|---|---|
| `sheetMath.test.ts` | `pickPresentation`; `pickDetent` (passt/passt nicht, Grenze, Höhe < 560 nur groß); `dragFrame` (Wachsen bis groß, Gummiband ×0,2 oben und mit `swipeToClose=false` unten); `snapAfterDrag` (jede Schwelle und Geschwindigkeit, Wurf nur in Zugrichtung, nur groß, nicht schließbar); `releaseVelocity` (Fenster 80 ms); `scrimOpacity`; `morphFrom` (Maßstab, Versatz, Radius `22/scale`, Mindestmaßstab 0,05); `originVisible` |
| `sheetStack.test.ts` | Öffnungsreihenfolge; Kind im selben Commit über dem Elternteil; erneutes Eintragen derselben Id ändert nichts (ein Update ändert die Reihenfolge nie); Elternteil und Kind im selben Commit ausgetragen; Entfernen in beliebiger Reihenfolge; Inspector unten; `modalCount` ohne Inspector; `Batches`; Übergabe-Merker verfällt mit dem Mikrotask |
| `contextActions.test.ts` (3b) | Aktionen je Domäne und Recht, Reihenfolge, Szene zuerst, kein Schloss/Garage-Zustand, „Raum öffnen“ nicht auf dem eigenen Raum, Favoriten-Recht unter Verwaltung und ohne |
| `swipeMath.test.ts` (3b) | 8-px-Entscheid (senkrecht gewinnt), Anschlag −(w + 36), offen ab −45 %, Desktop-Werte |
| `glasSelectors.test.ts` | „exist“ mit `sheets.css` und `sheet-content.css` (3b `gestures.css`); alle Selektoren unter `:root[data-style='glas']`, Klassen `g-*` oder Upstream; `!important` nur nach K38; `:where()`-Liste in `material.css` überall gleich |
| `smoke.mjs` „glas tokens“ | Schatten je Modus (dunkel weichen `sheetLarge`, `liftContext`, `liftContextDesktop` ab); Kontrast in Fenstern: Text und Inks auf `group`, Akzent-Ink auf `group` und auf `accentSoft` über `group`, Pille „Offen“ (K71) und „Geschlossen“, sekundärer Knopf auf `fill` über `group`, Weiß auf `actDel`/`actOk`/`actNeutral`, Play-Glyphe auf `blue` (3:1), `label`/`glassLabel2` auf Dialog- und Inspector-Glas; das Sheet-Material prüft Etappe 2 schon; 3b `redInk` auf Menü-Glas |

### 6.2 `glas-shots.cjs`

- **Uhr:** `glas-shots` hält die Playwright-Uhr an; `requestAnimationFrame`, Timer und `performance.now()` laufen nur
  per `run()` (höchstens 1 900 ms je Dokument), CSS- und Web-Animationen in Echtzeit. Deshalb: Geschwindigkeit aus
  `PointerEvent.timeStamp` (K51), Ende des Geists über `animation.finished` (§3.4), Bewegungsproben über
  `document.getAnimations()` (anhalten, `currentTime` setzen, messen) statt Wartezeiten; jede Szene nennt ihr
  Uhr-Budget. Proben zählen nur Fenster `:not(.g-sheet-ghost)`. Ziehen per CDP-Touch gibt es nur in Chromium (WebKit:
  Labor).
- **shoot**, beide Stile, Handy/iPad/Desktop, hell/dunkel, im Viewport: die Fenster aus §6.0 (ohne 24) in Ruhelage,
  dazu Seite „Entriegeln“ im Schlösser-Sheet, Seite „Garage öffnen“, Ziffernblock-Seite, Dauerwahl nach der Übergabe,
  großes Sheet (Detail lang, Entitäten); 3b Kontextmenü, offene Wisch-Zeile, Inspector. **Klassisch: 0 Pixel gegen
  `main`** über die volle Matrix plus die neuen Szenen (außer F34/F35 in den Einstellungen).
- **checks `--part sheets`** (3a):
  - Klassisch je Fenster aus §6.0: gleiches DOM wie `main` (keine `g-*`-Elemente, keine `data-g-*`, gleiche
    Inline-Stile), `body.style.overflow` danach leer; die drei Nebenbefunde aus K63 als Messung (Bericht, kein Fehler),
    (b) genau im Teilbaum-Fall (Routenwechsel mit Schlösser-Fenster und offener Bestätigung).
  - Glas-Geometrie: mittel Einzug 8 ± 1, Radius 40, Höhe ≤ `100dvh − 144`; groß oben 52, deckend, ohne
    `backdrop-filter`; 844 × 390 nur groß (Greifer `aria-hidden`, nicht fokussierbar); 820 × 1180 Breite 560 mittig;
    Desktop-Breiten aus K52 ± 1, Radius 34; Kopf: Schließen links mit Trefferfläche ≥ 44, Titel mittig; Greifer
    sichtbar 36 × 5, Trefferfläche 120 × 30; Panel ohne Upstream-Animation, ein Inline-Versatz kommt im berechneten
    Stil an.
  - Ziehen per CDP-Touch: mittel schließt (30 % Höhe), federt zurück (10 %), wird groß (−60), groß → mittel (100),
    groß schließt (50 %), Wurf; Tipp auf den Greifer wechselt das Detent; Ziffernblock schließt nie; Gummiband;
    `GlobalSettingsAdmin` während es arbeitet: federt zurück.
  - Inhalt ändert sich: Entitäten (Lader → Liste) und Detail („Laden …“ → Verlauf) landen ohne Sprung; mittel folgt
    dem Inhalt, nie automatisch groß; „Alle verwerfen“ schrumpft das Benachrichtigungs-Sheet.
  - Morph über `getAnimations()`: Rechteck bei 0/80/160/320 ms vom Chip zur Endlage, im Endbild ruhend; Schließen:
    Geist vorhanden und ohne `role`, läuft zurück in den Chip, nach dem Ende weg; keine Reste, Scroll-Sperre frei,
    Fokus auf dem Auslöser — für ×, Esc, Tipp daneben, Ziehen und für Fenster, die verschwinden (Detail, Gerät,
    Bestätigung). Eine gescrollte Liste (Entitäten) schließt ohne Sprung.
  - Kein Geist, wo das Fenster bleibt: Stilwechsel bei offenem Fenster (Glas → Klassisch → Glas: kein Absturz, keine
    Öffnen-Animation, Scroll-Sperre richtig, danach frei). `checks --part sheets` läuft zusätzlich einmal gegen den
    Vite-Entwicklungsserver (StrictMode): „Was ist neu“ per Effekt und ein Fenster per Klick ohne Geist.
  - Stapel: Schlösser → „Entriegeln“: gleiches Rechteck, deckend, Elterninhalt −25 %, „Zurück“ links, Elternfenster
    `inert`; Esc schließt nur die Seite, Fokus zurück auf „Entriegeln“; zweites Esc schließt das Sheet; Scroll-Sperre
    erst danach frei. Ziffernblock-Seite im Alarm-Sheet. Detail eines Schlosses bzw. Tors → Karte im Detail →
    Bestätigung als Seite im Detail. „Was ist neu“ über einem offenen Sheet: eigenes Fenster, das untere `inert`.
    Routenwechsel mit Sheet und Seite: beide Geister fahren gemeinsam nach unten, danach ist nichts mehr `inert`.
  - Übergabe Pool → Dauerwahl: kein Hochfahren, Geist blendet aus, ein Sheet sichtbar, Ursprung = Pool-Chip.
    Wiederöffnen während des Geists: ein Fenster, kein Doppel.
  - Tab-Leiste weg, solange ein Sheet offen ist, danach zurück; Glas-Regeln: Backdrop ohne `backdrop-filter`,
    Deckkraft und Animation (keine Backdrop-Root), kein Glas im Inhalt, deckende Stärke ohne `backdrop-filter`
    irgendwo.
  - Eingabefelder in Fenstern ≥ 16 px; Benachrichtigungs-Sheet (Zeiten, ×, „Alle verwerfen“ → Leerzustand, Fokus
    zurück auf den Avatar); Mehr/Räume schließen animiert, ihr Scrim fängt in Ruhe keinen Tipp (`elementFromPoint`);
    reduzierte Bewegung: nur Deckkraft ≤ 200 ms, kein `transform`; Esc auf der Kameraseite des Pakets wie heute (K72);
    Linsen-Probe aus Etappe 2 zeitfest machen.
- **checks `--part gestures`** (3b): Kontextmenü (Touch-Halten 550 ms, Rechtsklick, Aktionen je Karte, Loch ± 1 px über
  der Karte, Esc und Pfeile, Tipp auf das Loch schließt, Scrollen schließt, reduzierte Bewegung, Tipp ohne Halten öffnet
  weiter das Detail, Langdruck plus `contextmenu` öffnet einmal), Wisch-Zeilen (öffnen, Schwelle, eine offen, Scrollen
  schließt, Aktion nicht im Tab-Weg, kein Schalten nach dem Wischen), Inspector (≥ 1100 nicht modal, Seite klickbar,
  keine Überdeckung des Inhalts, Tausch, Esc, Fokus hinein und zurück, Routenwechsel schließt, Bestätigung aus der
  Karte als Seite; 900–1099 Dialog; < 900 Sheet).
- Klick-Fuzz und nvr-sweep erkennen Fenster an `[role=dialog]`; Geister tragen keine Rolle und zählen dort nicht.
- Wird die Datei zu groß, wandern die neuen Teile in `apps/dashboard/scripts/glas-checks-sheets.cjs` mit gemeinsamen
  Helfern.

### 6.3 Weitere Prüfungen

| Prüfung | Inhalt |
|---|---|
| Klick-Fuzz | `click-fuzz-test.cjs … glas` Handy + Desktop, auch im Bearbeiten-Modus, ohne Fehler |
| Leistung (Bericht) | Chromium mit 4-facher CPU-Drosselung: Bildabstände beim Öffnen eines Sheets mit Morph (Ziel ≤ 2 verworfene Bilder, GLAS-PLAN §5.5); Dauer des synchronen Klonens beim Schließen großer Fenster (Entitäten, Detail mit Diagramm) samt Zahl der Knoten — über einem Bild (16 ms) klont der Geist dort nur den sichtbaren Teil des Körpers (Entscheidung im Bau nach Messung); am iPad im Labor |
| Pflichtbefehle | `npm run typecheck && npm run build && npm test -w @hapulse/core && npm test -w @hapulse/dashboard && npm run lint` |

---

## 7. Abnahme (GLAS-PLAN §3 Etappe 3, ergänzt)

**3a** (2026-10-08, §13.1)
- [x] Jedes der 27 Fenster aus §6.0 in Glas als Sheet (Handy) bzw. Glas-Dialog (Desktop), Morph aus dem Element und
      zurück, Detents mittel/groß, Wischen nach unten schließt (außer `swipeToClose={false}`); die NVR-Datumswahl im
      Labor. (Fenster 20 ist in der Demo nicht erreichbar: Labor)
- [x] Schließen animiert auf jedem Weg, auch wenn ein Fenster verschwindet; kein Geist, wo ein Fenster bleibt
      (Stilwechsel, StrictMode).
- [x] Bestätigungen (Garage öffnen, Entriegeln mit Code, Alarm-Code, Pool-Neustart) erscheinen im Sheet bzw. als
      Sheet.
- [ ] Falscher Code: bleibt offen, leert und schüttelt (H3, H8) — Labor, die Demo nimmt jeden Code.
- [x] Reduzierte Bewegung: alles Überblendung; Bewegungsprobe zeigt Bewegung bei 0/80/160/320 ms.
- [x] Klassisch 0 Pixel, gleiches DOM in jedem Fenster aus §6.0.

**3b**
- [ ] Kontextmenü: Langdruck 550 ms, Rechtsklick; Aktionen korrekt; Tipp auf Anzeige-Karten öffnet weiter direkt das
      Detail.
- [ ] Wisch-Aktionen mit Knopf-Zwilling; nie Entriegeln/Öffnen per Wischen.
- [ ] Inspector ab 1100 px nicht modal, Inhalt tauscht, Esc und Fokus.

**Nicht verlieren** (Inventar B, F, H2–H3, H8, I, V9, X; je PR geprüft, was er berührt — 3a am 2026-10-08)
- [x] Personen: Avatare/Initiale, Zone (Zuhause grün/Weg/Name), seit wann (B2)
- [x] Licht: nach Raum in Nutzer-Reihenfolge + „Andere“, Zeilen-Tipp schaltet, „Alle ausschalten“ (B4)
- [x] Türen/Fenster: zwei Gruppen, offen/gesamt, offene zuerst (B6) · Alarm: ein Panel je Zentrale, schwerste zuerst,
      nur unterstützte Modi, nur Unscharf während „wird scharf“ (B8, H2)
- [x] Medien: aktiv/inaktiv, Play/Pause, Lautstärke (300-ms-Drossel), Link Musik-Seite (B10)
- [x] Pool: Status, Modus aus `input_select`, Manuell → Dauerwahl, Solar vs. Schwelle, Laufzeit, Restzeit live, Link (B12)
- [x] Garage: offene zuerst, Stopp nur beim Fahren + unterstützt, Schließen sofort, Öffnen fragt (B14, I4)
- [x] Schlösser: offene zuerst, Entriegeln fragt immer, Verriegeln nur mit Code fragt, gesperrt bei busy/jammed (B16, I7)
- [x] Wetter: Kennzahlen, Stunden/Tage, Entitäts-Wahl für Bearbeiter (D10) · Klima-/Rollläden-„Alle anzeigen“ (C9, C11)
- [x] Detail: Einstiegspunkte (F14) inkl. Pool-Kacheln, Gruppen-Mitglieder, Kamera-Kacheln; Inhalt vollständig (§2.3)
- [x] Benachrichtigungen: verwerfen einzeln und alle, Zähler am Avatar, Desktop-Popover unverändert (V9)
- [x] Fokus-/Esc-Verhalten aller Fenster (V9) · `data-autofocus` („Verstanden“ in „Was ist neu“) · Leerzustände (X)

---

## 8. Changelog und Doku

Fork-Changelog: **F34** mit 3a („Vorschau Glas: Fenster als Sheets und Dialoge“ — Sheets mit Ziehen und zwei Größen,
wachsen aus dem angetippten Element, Bestätigungen im Sheet, Benachrichtigungen als Sheet), **F35** mit 3b („Vorschau
Glas: Kontextmenü, Wischen, Inspector“); Nummer und Datum zum Merge-Zeitpunkt. Nachgezogen je PR: `docs/SYNC.md` (neue
Dateien, `[fork]`-Stellen, Prüfschritt nach Upstream-Merges: `Modal.tsx` und `AlarmPanelCard.tsx`), `CLAUDE.md` (Stand
der Etappen), GLAS-PLAN (Stand, Haken, Verweis auf K46/K47 statt `usePresence`), GLAS-DESIGN §10.3 (Verweis auf diesen
Plan), dieser Plan §13 (Umsetzung).

---

## 9. Risiken

1. **Geist (K47):** hängt an der Reihenfolge im Commit von React 19 (Ref lösen vor `removeChild`) und an der
   Entscheidung im Mikrotask. Ändert React das, schließen Fenster in Glas ohne Animation — kein Fehler, kein Rest.
   `checks` prüft den Geist bei jedem Schließweg; nach React-Updates gehört die Probe zum Pflichtlauf (`docs/SYNC.md`).
2. **Treue und Kosten des Geists:** Diagramme (SVG) klonen sauber, Eingaben übernimmt `cloneNode`; Video und Canvas
   werden Standbild oder ausgeblendet. Ein geklontes `<img>` lädt neu und bleibt bei `no-store` leer — der Geist zeichnet
   geladene Bilder deshalb als Canvas-Kopie (geht auch bei fremden Quellen, die Kopie wird nie ausgelesen). Fremde
   Laufzeit-Zustände (offene `<select>`-Liste) nicht. Das synchrone Klonen großer Fenster kostet Zeit im Commit (§6.3).
3. **Gesten in WebKit:** `touch-action`, Pointer Capture und Gummiband verhalten sich auf iOS anders als in Chromium;
   die CDP-Touch-Proben ersetzen das Gerät nicht (Labor).
4. **`dvh`, Safari-Leisten und Tastatur:** Sheet-Höhen springen, wenn die Leisten ein- und ausfahren. Die iOS-Tastatur
   ändert nur den `visualViewport`; ein unten angedocktes Sheet mit Code-Feld rückt deshalb selbst nach oben (§3.2).
   Beides misst das Labor.
5. **Leistung:** Morph mit `backdrop-filter` (Blur 28 px im Sheet-Material) auf dem iPad; Rückfall „Transparenz
   reduzieren“ (GLOBAL) — Budget GLAS-PLAN §5.5, Messung §6.3 und Labor.
6. **`clip-path` auf Glas in WebKit:** die Übergabe (K49) lässt das neue Fenster über `clip-path` wachsen. Schneidet
   WebKit den Blur dabei nicht mit, wächst es dort über seine Höhe (Rückfall, Labor).
7. **Upstream-Merges:** `Modal.tsx` ist das zentrale Andockstück; die `[fork]`-Zeilen bleiben kurz, der Kopf ist ein
   eigener Zweig. Klassen der Chip-Fenster prüft der Selektor-Wächter.
8. **`inert`** (Safari ≥ 15.5) und **`allow-discrete`** (Safari ≥ 17.4): ältere Geräte bekommen Fenster ohne
   Inertheit bzw. Menüs, die sofort schließen — kein Funktionsverlust.
9. **Kontextmenü-Loch (3b):** scrollt oder ändert sich die Karte während des Menüs, stimmt das Loch nicht mehr —
   deshalb schließen Scrollen und Größenänderung. Ob WebKit den Blur der Abdunkelung am `clip-path`-Loch (`evenodd`)
   beschneidet, prüft das Labor; sonst besteht die Abdunkelung aus vier Flächen um die Karte.

## 10. Bewusst offen nach Etappe 3

Untertitel der Chip-Sheets, Werte/Fuß/Raumstatus in Mehr und Räume (K61), Detail- und Inspector-Inhalt, weitere
Langdruck-Quellen: Etappe 4. Schalter, Segmente mit Linse, Regler in den Sheets: Etappe 5. Kameraseite und
NVR-Datumswahl im dunklen Teilbaum: Etappe 6. Tab-Wechsel-Überblendung (K62): Etappe 7. Bestätigungsblock in der Zeile
(K48) und Ziehen von Mehr/Räume: nicht geplant. `viewport-fit=cover` nur, wenn das Labor es verlangt (K39).

## 11. Labor (zusätzlich zu PLAN-ETAPPE-2 §9)

Echtes iPhone/iPad (WebKit), Home-Bildschirm-App und Safari:
- **K39 (weiter offen, blockiert nichts):** verdeckt die Statusleiste Avatar, „Zurück“ (Raumseite) oder „Fertig“?
- Sheets: Ziehen, Gummiband, Wurf; Detents mit ein- und ausfahrenden Safari-Leisten (`dvh`); Morph und Geist (Bilder,
  Medien-Cover, Diagramme) ohne Flackern; Übergabe Pool → Dauerwahl (`clip-path` auf Glas); Tastatur über dem Code-Feld
  (Sheet rückt hoch und bleibt bedienbar, keine Vergrößerung, K54).
- Leistung am iPad (E17): Sheet öffnen mit Morph, Ziehen, Seiten, Schließen großer Fenster.
- Seiteneintritt `g-rise` beim Tab-Wechsel: kostet er Bilder der Linse (Notizen des Users, K62)?
- NVR-Datumswahl (Fenster 24) gegen einen laufenden Sentinel.
- 3b: Langdruck ohne iOS-Callout, Wischen gegen senkrechtes Scrollen, Inspector am iPad quer, Loch der
  Kontext-Abdunkelung (Blur und `clip-path`).

## 12. Review des Plans (2026-10-07)

Ein unabhängiger Prüfer hat den Entwurf gegen GLAS-PLAN, GLAS-DESIGN, die Skizze und den Code von `main` c07f153
gelesen und eigene Messungen in Chromium mit react-dom 19.3.0 gemacht (Build und Entwicklung, mit und ohne StrictMode).
Alle Befunde wurden am Code nachgeprüft und stimmen.

| # | Befund | Eingearbeitet |
|---|---|---|
| 1 | Blocker: der Wächter des Geists trennte „Fenster wird entfernt“ nicht von „Ref wird gelöst, Fenster bleibt“ — gemessen bei neuer Ref-Funktion je Render, Ref → `undefined` beim Stilwechsel und StrictMode bei Updates außerhalb von Klicks („Was ist neu“ per Effekt bekäme im Entwicklungsserver bei jedem Start einen Geist); `scrollTop` geht an einem nicht eingehängten Klon verloren; ein mitgelöschter Ursprung hängt beim Aufräumen noch im Dokument; eine Ausnahme dort landet auf der Fehlerkarte | K47, §3.4: stabile Ref je Instanz, Glas aus dem DOM gelesen, unsichtbar klonen und vor das Original setzen, `scrollTop` danach, im Mikrotask entscheiden, Ursprung erst dann prüfen, `try/catch`; Proben Stilwechsel, Entwicklungsserver, gescrollte Liste (§6.2) |
| 2 | Die Upstream-Animation des Panels hält `transform` und Deckkraft per Füllung fest und schlägt Inline-Stile (gemessen); `max-height` 85vh/90vh kappt das große Detent | §3.2: Panel-Überschreibungen in Glas; `checks` prüft einen Inline-Versatz |
| 3 | Inhalte wechseln nach dem Öffnen (Lader der Entitäten, „Laden …“ im Detail, „Alle verwerfen“); Detents und Morph-Ziel waren dafür nicht festgelegt | K50 mit `ResizeObserver`: Nachführen während des Öffnens, danach folgt mittel dem Inhalt, nie automatisch groß; Proben (§6.2) |
| 4 | Stapel: Elternteil und Seite im selben Commit, verwaiste Seite aus einem anderen Teilbaum, Neu-Eintragen bei jedem Render (Inline-`onClose`) hob untere Fenster über die Seite, der Übergabe-Merker verfiele bei Eintragen in `useEffect` | K48 (Seite = im Inhalt gerendert, andere Teilbäume eigenes Fenster, einmal je Öffnung in der Layout-Phase, `onClose` per Ref, gemeinsam nach unten), K49 (Layout-Phase), Tests (§6.1) |
| 5 | Der Auslöser wurde erst nach Reacts `autoFocus` gemerkt — gemessen: der Effekt sieht das neue Code-Feld statt „Entriegeln“ | K55: Auslöser vor dem Commit (`origin.ts`, sonst erstes Rendern), Rückgabe nach `inert`, `returnFocus` |
| 6 | Unter der angehaltenen Playwright-Uhr liefern `performance.now()`, rAF und Timer nichts; der Klon behielt `role="dialog"` und hätte Klick-Fuzz und nvr-sweep gestört | K51 (`timeStamp`), §3.4 (`animation.finished`, Klon ohne `role`/`aria-*`), §6.2 (`getAnimations()`, `:not(.g-sheet-ghost)`, Uhr-Budget, CDP-Touch nur Chromium) |
| 7 | Benachrichtigungs-Sheet: Auslöser fehlt (Menüeintrag ausgehängt), der alte Panel-Effekt hätte jeden Tipp im Sheet als „daneben“ gewertet, `relativeTime` ohne Zeit ergibt „vor NaN Tagen“, „Alle verwerfen“ weicht ab, „ungelesen“ und Sortierung offen | K57, §3.9: Rückgabe an den Avatar, eigener Zustand ohne Popover-Zweig, Zeit nur bei gültigem Wert, neueste zuerst, Zahl der Meldungen, Abweichung in §1 |
| 8 | Den Weg „Detail aus Klima alle“ gibt es nicht | §6.0, §6.2: Detail eines Schlosses bzw. Tors → Karte → Bestätigung als Seite |
| 9 | „24 Fenster“ ohne Liste; GLAS-PLAN nennt 25, eines davon wird nie gerendert; mehrere Fenster fehlten in den Aufnahmen | K73, §6.0 (27 Fenster mit Weg und Hinweis), §6.2, §7 |
| 10 | Kann: K63(b) gilt nur, wenn Eltern- und Kind-Fenster im selben gelöschten Teilbaum verschwinden | K63 präzisiert, die Probe stellt genau diesen Fall nach |
| 11 | Kann: der Scrim von Mehr/Räume existiert nur unter `:has()` und ließe sich nicht ausblenden; die Tab-Leiste kommt sofort | K61, §3.10: Scrim immer da, in Ruhe unsichtbar und ohne Treffer; Übergang nur am geschlossenen Zustand |
| 12 | Kann: Esc-Reihenfolge gegenüber der Kameraseite des Pakets; ein globaler Listener weicht von GLAS-PLAN §2.1 ab | K72 |
| 13 | Kann: Stilwechsel Klassisch → Glas bei offenem Fenster ließe `overflow: hidden` hängen | K63, §3.6: Scroll-Sperre per CSS (`data-g-sheets`), Klassisch-Effekt mit `sheet.on` in den Abhängigkeiten (§3.1) |
| 14 | Kann: Wiederöffnen während des Geists, Ursprung nach der Übergabe, Schließ-Art bei Weigerung von `onClose` | §3.3, K49, K51 |
| 15 | Kann: fehlende Werte aus §7.18 (Kopf 16 14 6, `glassLabel2` auf mittel, Schatten, Tipp-Schwelle 4 px, Greifer bei einem Detent nicht fokussierbar) | K50, K51, K53 |
| 16 | Kann: Kosten und Treue des Geists (synchrones Klonen großer Fenster, `<img>` lädt neu) | §6.3 Leistungsbericht, §9 (Canvas-Kopie geladener Bilder) |
| 17 | Kann: Inhaltstausch über den Titel | K70: `contentKey`, im Detail `entityId` |
| 18 | Kann: Ursprung einmal verbrauchen, Öffnen ohne Geste, darf „Was ist neu“ Seite werden? | §3.3, K48 (eigenes Fenster) |
| 19 | Kann: Schütteln nur in Glas; `LockConfirm` ist eine Fork-Datei | K56, §5.1 |
| 20 | Kann (3b): Rechtsklick mit dem `onContextMenu` von `useLongPress` zusammenführen, Android löst beim Langdruck zusätzlich `contextmenu` aus | K58, Probe (§6.2) |
| 21 | Kann: nicht in Chromium prüfbar — `clip-path` auf Glas, Loch über `backdrop-filter`, Tastatur über angedockten Sheets | §9 mit Rückfällen, §11 |
| 22 | Kann: Pfade der Tests und Skripte, `RUNTIME_CLASSES` unnötig für `g-*`, Liste „exist“ | §5, §6.1 |
| 23 | Kann: andere Dokumente des Repos nennen Laborpfade | dieser Plan und seine Umsetzung (§13) nennen keine |

Beim Einarbeiten selbst gefunden: zwei Kontrastpaare unter 4,5:1 im Dunkeln (K71), aufgedeckt von den neuen Paaren aus
§6.1.

Vom Prüfer bestätigt: die Reihenfolge aus K47 im Quelltext (`commitDeletionEffectsOnFiber`: Ref lösen vor den Kindern
und vor `removeChild`, Portal hängt an `body`) und gemessen in Build und Entwicklung für `open=false`, ausgehängtes
Elternteil, gelöschten Host-Knoten und Verschachtelung (äußeres vor innerem Fenster, beide noch verbunden, laufende
Öffnen-Transformation lesbar) — damit auch K69; die Fälle, in denen Fenster verschwinden statt `open=false` zu bekommen
(Detail, Gerät, beide Bestätigungen, NVR-Datumswahl, Admin-Bestätigung, Ziffernblock); Routenwechsel laufen über
`startTransition` und verstecken nichts per Suspense; die Voraussetzung von K49 (ein Commit, Dauerwahl ist Geschwister);
die Code-Stellen zu K55, K56 (Ziffernblock ohne Esc und Scroll-Sperre, nicht in einer `EntityCard`), K57, K63(a, c),
K67 und K68; die Breiten aus K52, die Werte aus K50, K51, K53, K59, K64 und der Bewegungstabelle; die Schwellen der
Skizze (−50/110/80/360); Schatten je Modus (dunkel weichen nur `sheetLarge`, `liftContext`, `liftContextDesktop` ab);
`GlasRuntime` rendert nur in Glas, Mehr/Räume bleiben gemountet (K61 per CSS machbar); F34/F35, die Pflichtbefehle und
die Node-Umgebung von vitest passen; der Plan nennt keine internen Hosts, Adressen, Container oder Zugangsdaten.

## 13. Umsetzung

### 13.1 Teil 3a — Sheets und Dialoge (Stand 2026-10-08)

Gebaut wie §3 und §5. Zusätzlich zu §5.1 neu: `components/glas/sheet/sheetMotion.ts` (Federkurven aus `--g-spring-*`
und die Web-Animationen, die Hook und Geist teilen), `components/glas/sheet/shake.ts` (Schütteln von Ziffernblock und
Code-Feld, K56), `components/glas/notificationOrder.ts` mit Test (neueste zuerst, K57) und
`apps/dashboard/scripts/glas-checks-sheets.cjs` (Szenen `win-…` und `checks --part sheets`, wie in §6.2 vorgesehen).
`click-fuzz-test.cjs` läuft mit dem Argument `edit` auch im Bearbeiten-Modus.

**Abweichungen der Umsetzung**

| # | Stelle | Umsetzung | Grund |
|---|---|---|---|
| U1 | K64 Ebenen | Jedes Fenster und jede Seite liegt auf 1000 + Platz im Stapel (`sheetHost.ts`), Toasts auf 1100; Seiten nicht fest auf 1010 | Liegt ein eigenes Fenster über einem Sheet mit Seite, muss die Ebene der Reihenfolge folgen; eine feste 1010 legte die Seite des unteren Fensters über das obere |
| U2 | K67, GLAS-DESIGN §7.29 | Alle Knöpfe eines Fensterfußes sind gleich hohe Kapseln (50, 17/22 600) in einer Reihe, sekundär `fill`; passt die Reihe nicht, nimmt jeder Knopf die ganze Breite | Ein grauer 44er neben einem 50er Knopf („Abbrechen“ neben „Entriegeln“) wirkte schief |
| U3 | §3.8 Wetter | Keine eigene Stundenleiste: die Vorhersage bleibt eine Liste mit Zeilen 48 | `WeatherModal` lädt eine Vorhersage (stündlich, wenn die Entität sie liefert, sonst täglich) und zeigt sie in einem Markup; Stunden und Tage zugleich bräuchten ein zweites Abo und neues Markup in einer Upstream-Datei |
| U4 | K53 Kopf | Der Titel darf zweizeilig werden (ausgewogen umbrochen) statt mit „…“ abzubrechen | Lange Namen (Geräte, Entitäten im Detail) waren sonst nicht lesbar |
| U5 | §3.8 Pool | Die Dauerwahl bekommt in Glas ihr ganzes Layout aus `sheet-content.css` | `pages/Pool.css` ist nur geladen, wenn die Poolseite schon offen war; vom Pool-Chip der Startseite aus fehlte das Layout (in Klassisch auch — Nebenbefund für den User) |
| U6 | K54 | 16 px auch für die Entitäten-Suche in den Einstellungen (`.settings-text-input`, Upstream 15 px) | Von der Feld-Probe gefunden |
| U7 | §3.4 Schritt 2, §6.3 | Fenster mit mehr als 600 Elementen kopiert der Geist nur, soweit ihre Scroll-Bereiche sie zeigen (plus ein Viertel der Höhe darüber und darunter); alles weiter draußen wird ein leerer Kasten gleicher Größe, geschlossene `<details>` behalten nur ihre Zusammenfassung | Die Entitätenliste (2121 Elemente) kostete beim Schließen 38 ms, bei 4-facher Drosselung 177 ms; der Geist schrumpft oder gleitet nur, was außerhalb eines Scroll-Bereichs liegt, kommt nie ins Bild |
| U8 | §3.4 Schritt 2 und 3 | Alles, was der Geist vom Original braucht (Rechtecke, Ursprung, Schatten, Scroll-Lagen), liest er vor dem Einhängen; der Klon wartet mit `display: none` statt `visibility: hidden`, die Scroll-Lagen setzt erst die Entscheidung. Das legt einen gescrollten Klon dort aus, zusammen mit der Seite: eine Scroll-Lage braucht das Layout, das sonst im nächsten Bild anfiele | Chromium berechnete den versteckten Klon sonst mitten im Commit, als React das Fenster entfernte (29 ms bei der Entitätenliste); ein Lesen danach legte ihn erneut aus |
| U9 | §3.4 Schritt 2 | Kopien von Bildern, Videos, Quellen und iframes entstehen ohne die Attribute, die laden (`src`, `srcset`, `poster` …); Geladenes zeichnet der Geist als Standbild, noch nicht Geladenes bleibt ein leerer Kasten. Teilkopien ersetzen Elemente nicht durch leere Kästen, wenn ein Rand ihres Inhalts durch sie hindurchgeht oder sie Inline-Kästen sind | Review §13.2 Befunde 2 und 9: ein geklontes, geladenes Bild wurde sofort neu angefordert (ein MJPEG-Strom der Kamera hätte eine zweite Verbindung bekommen); ein leerer Kasten verlor durchgehende Ränder und die Grundlinie |
| U10 | §3.3 | Der gedrückte Ursprung gilt nur bis einen Task nach dem Klick (höchstens 1,5 s, ein Langdruck öffnet vor dem Klick); der Auslöser für den Fokus wird in beiden Stilen beim Öffnen gemerkt | Review §13.2 Befunde 5 und 7: ein Fenster ohne eigenen Tipp wuchs sonst aus dem zuletzt gedrückten Knopf, und nach einem Stilwechsel bei offenem Fenster ging der Fokus beim Schließen verloren |

Ergänzungen im Rahmen von §3.8: Schlösser zeigen je Zeile den einen möglichen Knopf („Entriegeln“ bei verriegelt,
sonst „Verriegeln“; bei klemmt/unbekannt beide gesperrt wie heute), Klassisch zeigt beide; der Kreis im Alarm-Kopf ist
scharf grün, beim Scharfschalten gelb, ausgelöst rot; „Geschlossen“ bei Türen bekommt den grünen Punkt per `::before`
(das Markup hat keinen); Titel und Text von Benachrichtigungen enden nach 2 bzw. 3 Zeilen; die Kennzahlen-Beschriftungen
im Wetter trennen bei Bedarf.

**Nicht in der Demo prüfbar (Labor, §11):** Fenster 20 („Für alle übernehmen“: der Knopf ist ohne echte Verbindung
gesperrt) samt „federt zurück, solange es arbeitet“; falscher Code mit Schütteln (der Demo-Alarm nimmt jeden Code, das
Demo-Schloss hat keinen) und damit K63 (c); „Was ist neu“ über einem offenen Fenster (öffnet nur beim Start; die
Reihenfolge prüft `sheetStack.test.ts`); Esc auf der Kameraseite des Pakets (K72) und die NVR-Datumswahl brauchen einen
laufenden Sentinel; alle Gesten in WebKit.

**Ergebnisse**

- Unit-Tests: `sheetMath`, `sheetStack`, `notificationOrder`, Selektor-Wächter; `smoke.mjs` mit den neuen
  Kontrastpaaren (K71).
- `checks --part sheets`: alle Blöcke grün (Klassisch-DOM, Geometrie, Ziehen samt Taste nach einem Maus-Zug, Morph,
  wachsender Inhalt, Seiten samt Ziffernblock und Bestätigung im Detail, Übergabe, Tab-Leiste und Glas-Regeln,
  Benachrichtigungen, Felder (auch die NVR-Fenster) und reduzierte Bewegung, Stilwechsel samt Fokus danach, Schließen
  auf jedem Weg inklusive Routenwechsel und gescrollter Liste, Fenster per Effekt, Mehr/Räume, Wiederöffnen, alle
  Fenster, Geist-Kopie, Geist lädt nichts neu, Ursprung verfällt nach dem Klick); dieselben Fenster-Proben auch gegen
  den Vite-Entwicklungsserver (StrictMode): kein Geist, wo ein Fenster bleibt. Die Geist-Kopie prüft, dass jeder Text,
  der in einem Scroll-Bereich zu sehen war, im Geist an derselben Stelle steht, auch in der Teilkopie (Entitätenliste
  mit offener, gescrollter Gruppe: 435 statt 2121 Elemente; „Was ist neu“: 119 statt 742; mit einem durchgehenden Rand
  und einem Inline-Block über dem sichtbaren Bereich, ohne U9 standen dort 23 von 24 Texten verschoben). Übersprungene
  Szenen machen Klassisch-DOM und „alle Fenster“ rot, außer den erwarteten (Wetter am Handy und Pool-Neustart gibt es
  in Klassisch nicht). Gegen den Stand vor den Behebungen waren die neuen Prüfungen zu Taste nach Maus-Zug,
  Stilwechsel-Fokus, Ursprung, Geist-Kopie mit Rändern und Geist-Laden rot. `--part frame` und `--part stage1`
  grün; die Linsen-Probe schaut jetzt mehrmals statt einmal.
- K63 nachgestellt: (a) ja — ein Esc schließt beide verschachtelten Fenster; (b) ja — nach dem Routenwechsel bleibt
  `body.style.overflow` auf `hidden`; (c) in der Demo nicht messbar.
- Klassisch: 284 Aufnahmen (Seiten und Rahmen 136, Fenster 148; Handy, iPad, Desktop, hell und dunkel) gleichen dem
  Build von `main` auf 0 Pixel; das DOM aller 49 Klassisch-Fenster (Handy und Desktop) ist gleich (nur die Uhrzeiten
  der Diagramm-Achse folgen der echten Uhr). Die Fenster-Szenen schwankten zuerst von Lauf zu Lauf, auch auf `main`:
  Playwright wiederholte den Klick, solange Karten noch einliefen, und scrollte dabei jedes Mal anders; jetzt holt die
  Szene den Auslöser vorher in die Mitte (`reach`).
- Klick-Fuzz: FUZZ_ERGEBNIS
- Leistung (Bericht; Chromium ohne GPU, zwei Läufe): bei voller Geschwindigkeit verwirft das Öffnen 0–3 Bilder, das
  Schließen 0–1; der Geist arbeitet 1–3 ms. Bei 4-facher CPU-Drosselung verwirft das Öffnen von Licht 3–5,
  Entitätenliste 11–13 und Detail 3–4 Bilder (Klassisch 3, 8–12 und 1–4), das Schließen 0–5 (Klassisch 0); der Geist
  arbeitet 6–10 ms (vor U7 und U8 bei der Entitätenliste 177 ms). Jedes Umschalten von `data-g-sheets` berechnete
  zudem die ganze Seite neu (658 Elemente); seit die Tab-Leiste nur ihre benannten Kinder ausblendet, sind es 79. Das
  Ziel ≤ 2 (GLAS-PLAN §5.5) verfehlt bei 4-facher Drosselung auch Klassisch, hier rechnet die CPU jede Unschärfe
  selbst; maßgeblich ist die Messung am iPad im Labor (§11).
