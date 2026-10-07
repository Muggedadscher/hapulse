# Glas — konkreter Umsetzungsplan Etappe 3 (Sheets, Dialoge, Gesten)

Stand 2026-10-07, Entwurf vor dem unabhängigen Review (§12). Basis ist `main` c07f153: Etappe 2 mit PR #104, der
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
| K47 | GLAS-PLAN §2.1 `usePresence(open, exitMs)` | Schließen-Animation über einen **Geist**: Bevor React ein Fenster aus dem Dokument nimmt, löst es die Ref der `.modal-backdrop` (React 19.3, `react-dom-client` `commitDeletionEffectsOnFiber`: `safelyDetachRef` vor `removeChild`). Das Fenster hängt in diesem Moment noch fertig gelayoutet im Dokument; `ghost.ts` klont es, hängt den Klon an `body`, animiert ihn aus und entfernt ihn danach. Klassisch behält `if (!open) return null` unverändert | Mehrere Fenster schließen nicht über `open=false`, sondern verschwinden mit ihrem Elternteil: `EntityDetailModal` (gibt `null` zurück), `DeviceDetailsModal` (`if (!device) return null`), `LockConfirm`, `GarageConfirm`, `DatePickerModal` (vom Paket ein- und ausgehängt), `GlobalSettingsAdmin` nach dem Aktivieren, der Ziffernblock (K56). `usePresence` sähe diese Fälle nie. Der Geist deckt beide Wege ab, ohne einen Aufrufer zu ändern, und hält nichts Unsichtbares gemountet, das Klicks blockieren könnte (Risiko GLAS-PLAN §7.1) |
| K48 | GLAS-PLAN §2.2 „Modal mit `depth > 0` = Seite im Sheet“; GLAS-DESIGN §7.18/§7.19 „Bestätigungsblock in der Zeile“ | Jedes Fenster, das öffnet, während schon ein Glas-Sheet oder -Dialog offen ist, wird zur **Seite** im obersten Fenster: gleiches Rechteck, braucht die Seite mehr Höhe, wächst das Sheet mit (höchstens bis zur Mittel-Grenze, sonst groß); deckend `sheetSolid`; schiebt sich von rechts herein; links „‹ Zurück“ statt ×; kein Greifer, kein Ziehen. Reihenfolge = Öffnungsreihenfolge; öffnen zwei im selben Commit, liegt ein in einem anderen gerendertes Fenster (React-Kontext, geht durch Portale) über diesem. Esc, „Zurück“ und Tipp daneben schließen nur die oberste Seite. Gilt auf Handy und Desktop. Den Bestätigungsblock in der Zeile baut Etappe 3 nicht | So erscheinen „Entriegeln?“ mit Code, „Garage öffnen?“, der Alarm-Code und ein aus „Alle Klimageräte“ geöffnetes Detail im Fenster, ohne einen Aufrufer zu ändern. Der Block in der Zeile bräuchte Markup in jeder Liste und gäbe es für Bestätigungen von Seitenkarten (Sicherheit, Räume, Favoriten) gar nicht. Tipp daneben trifft die Fläche des obersten Fensters, so wie in Klassisch |
| K49 | — | **Übergabe**: schließt ein Fenster und öffnet im selben Commit ein anderes (Pool → „Manuell“ → Dauerwahl, `PoolModal.tsx:94`), übernimmt das neue Lage und Detent ohne Hochfahren: ist es höher, wächst es von der alten Oberkante (`clip-path`, `snappy` .35 s); der Geist blendet in 140 ms aus, der neue Inhalt kommt wie beim Inhaltstausch (300 ms `smooth`, 10 px). Erkannt über einen Geist aus demselben Commit (Merker, der in einem Mikrotask verfällt; React führt Mutation und Layout-Effekte eines Commits synchron aus) | Morph zurück in den Auslöser ginge nicht (der Knopf liegt im schließenden Sheet), Herunter- und wieder Hochfahren sähe aus wie zwei Fenster. Die Skizze wechselt dort den Inhalt im selben Blatt |
| K50 | GLAS-DESIGN §7.18 Detents | **Mittel**: `left/right/bottom 8` (+ Safe Area unten), Radius 40, Höhe = Inhalt, höchstens `100dvh − 144px`, Sheet-Material. **Groß**: unten angedockt, Höhe `100dvh − 52px`, Radius `40 40 0 0`, deckend `sheetSolid`, Schatten `sheetLarge`. Start: passt der Inhalt in mittel → mittel, sonst groß. Beide Detents gibt es immer (wie die Skizze, auch bei kurzem Inhalt); Fensterhöhe < 560 → nur groß. Ab 600 px Breite höchstens 560 breit, mittig (wie K33). Der Greifer ist ein Knopf („Blatt vergrößern/verkleinern“), nur bei einem Detent `aria-hidden` | Werte aus §7.18 und der Skizze (`SH_H`, jedes Blatt kann groß werden). Bei 390 px Höhe (Handy quer) blieben für mittel 246 px. GLAS-PLAN nannte den Greifer `aria-hidden`; GLAS-DESIGN §7.18 gibt ihm ein Label — mit zwei Detents ist er die einzige Tastatur-Bedienung dafür |
| K51 | GLAS-DESIGN §7.18 „Ziehen“, §6.3 | Ziehen nur am Greifer und am Kopf (nicht an dessen Knöpfen), nur unter 900 px. Mittel nach oben: das Sheet wächst mit dem Finger bis zur Höhe von groß, darüber Gummiband ×0,2; nach unten: `translateY`. Groß nach oben: Gummiband ×0,2. Scrim-Deckkraft `1 − max(0, dy)/500`. Loslassen (`sheetMath.snapAfterDrag`): mittel → groß bei dy < −50 oder Wurf < −0,8 px/ms; mittel schließt bei dy > 25 % der Höhe oder Wurf > 0,8 px/ms; groß schließt bei dy > 45 % der Höhe; groß → mittel bei dy > 80 oder Wurf > 0,8 px/ms (nur groß: wie mittel schließen); sonst zurück. `swipeToClose={false}`: nie schließen, unten ebenfalls Gummiband. Weigert sich `onClose` (z. B. `GlobalSettingsAdmin` während es arbeitet), federt das Sheet nach einem Bild zurück | Skizze bei 844 px: mittel → groß −50, mittel schließt 110, groß → mittel 80, groß schließt 360 (= 45 % von 792); GLAS-DESIGN „allgemein 25 % oder 0,8 px/ms“. Inhalt scrollt normal, Listen und Regler im Inhalt kollidieren nicht |
| K52 | GLAS-DESIGN §7.19 Desktop-Dialog | Ab 900 px zentrierter Glas-Dialog: Breiten aus §7.19 per `:has()` am Inhalt (Personen 440, Wetter 500, Licht 480, Türen 460, Garage und Schlösser 560, Alarm 460, Pool 480, Medien 500, Klima alle 760, Rollläden alle 780, Müll 440); alle übrigen behalten ihre Upstream-Breite (480, `--wide` 760, Detail 34rem, Entitäten 800). Höhe höchstens `min(100dvh − 64px, 900px)`, Radius 34, Tönung `dialogDesktop` (.68), Schatten `dialog`, Scrim `scrimDesktop` ohne Blur. Kein Greifer, kein Ziehen | Upstream setzt Breiten ebenso per `:has()` (`all-modal.css:13`, `Settings.css:787`); die Chip-Fenster tragen keine eigene Klasse |
| K53 | GLAS-DESIGN §7.18/§7.19 Kopf | In Glas rendert `Modal` einen eigenen Kopf (`SheetHeader`, `[fork]`-Zweig): Raster `44px 1fr 44px`, links Schließen (Trefferfläche 44, Kreis 32 `fill`) bzw. „‹ Zurück“ auf Seiten, Mitte Titel 17/22 600 (`h2` mit derselben `id` für `aria-labelledby`) und Untertitel 13/18; das Symbol nur am Desktop links neben dem Titel. Neue optionale Prop `subtitle` (nur Glas). In 3a nutzt sie nur das Benachrichtigungs-Sheet; die Untertitel der Chip-Sheets („Licht · 5 an“) kommen mit den Chip-Arten in Etappe 4 | Die Upstream-Reihenfolge (Symbol, Titel, ×) und `margin-left: auto` am × lassen sich per CSS nur mit Rastertricks umstellen, und für den Untertitel fehlt ein Element. Ein eigener Kopf hängt nicht an Upstream-Klassen. Die Untertitel brauchen dieselbe Zählung wie die Chips (Etappe 4) |
| K54 | — | Eingabefelder, Auswahllisten und Textfelder in Fenstern mindestens 16 px Schrift | iOS vergrößert sonst die Seite beim Fokus (Code-Feld, Suche, Wetter-Auswahl, NVR-Einrichtung) |
| K55 | GLAS-PLAN §2.1 „Fokus wie heute“ | In Glas übernimmt der Hook den Fokus: beim Öffnen bleibt er, wo ein `autoFocus`-Feld ihn hingesetzt hat, sonst `[data-autofocus]`, sonst das Panel; beim Schließen — auch wenn das Fenster verschwindet, statt `open=false` zu bekommen — zurück zum Auslöser, wenn der noch im Dokument und nicht `inert` ist. Unter einer Seite liegende Fenster sind `inert`. Keine Fokusfalle (wie Klassisch) | `Modal` fokussiert in einem `useEffect` nach React-`autoFocus` und zieht den Fokus so aus dem Code-Feld von `LockConfirm` (K63); beim Aushängen gibt es den Fokus heute gar nicht zurück |
| K56 | GLAS-PLAN §2.2 „Alarm-Ziffernblock: CSS oder `Modal`?“ | In Glas rendert `AlarmPanelCard` den Ziffernblock in einem `Modal` mit `swipeToClose={false}` (`[fork]`), Titel = Aktion, Inhalt = Untertitel, Punkte, Tasten, „Abbrechen“; die eigene Überschrift entfällt dort. Damit ist er im Alarm-Sheet eine Seite (K48), auf der Sicherheitsseite ein eigenes Sheet, mit Esc und Fokus. Falscher Code: der Block bleibt offen, leert und **schüttelt** (420 ms, −10/9/−6/4 px; Punkte des Ziffernblocks bzw. Code-Feld von `LockConfirm`), nicht bei reduzierter Bewegung | Stapel, Esc und Fokus gibt es so ohne eigene Logik; das CSS allein hätte das Overlay nie in das Sheet bekommen. Schütteln: GLAS-DESIGN §6.3 „Code falsch“ |
| K57 | PLAN-ETAPPE-2 K25 (Handy-Popover bis Etappe 3) | Am Handy öffnet „Benachrichtigungen“ im Avatar-Menü ein Sheet (`NotificationsSheet`, Fork-Datei, ein `Modal`): Untertitel „N ungelesen“/„Keine neuen“, Zeile „N Benachrichtigungen“ + „Alle verwerfen“ (`accentInk`), Liste mit Titel, Text und Zeit („vor 3 Std.“, `relativeTime` aus `security/roomUtils.ts`, Feld `createdAt` neu in `useNotifications`), × je Zeile, Leerzustand nach §7.31. „Alle verwerfen“ lässt das Sheet offen (Leerzustand). Desktop behält das Glas-Popover. Wischen kommt mit 3b | Skizze `g5h-notifications-l`; die Zeit liefert HA in `created_at` (Typ `PersistentNotification`), `useNotifications` reicht sie bisher nicht durch |
| K58 | GLAS-PLAN §2.4 Kontextmenü (3b) | Langdruck (550 ms, `useLongPress`) auf einer `EntityCard` öffnet in Glas das Kontextmenü statt des Details, Rechtsklick und die Kontextmenü-Taste ebenso; Tipp auf Karten, deren Tipp nicht schaltet, öffnet weiter direkt das Detail. Vorschau = die echte Karte an ihrem Platz (`scale(1.04)` + `liftContext`), sichtbar durch ein Loch in der Abdunkel-Ebene (`clip-path` mit `evenodd`); eine Fläche über dem Loch schließt. Aktionen in dieser Reihenfolge: Aktivieren (Szene, zuerst) · Details · Ein-/Ausschalten (`light`, `switch`, `fan`, `input_boolean`) · Ausführen (`script`) · Drücken (`button`, `input_button`) · Zu/Aus Favoriten (wer heute Favoriten ändern kann: unter globaler Verwaltung jeder, sonst `useCanEdit()` und `editingEnabled`) · Raum öffnen (wenn die Entität einen Raum hat und man nicht schon dort ist) · Ausblenden (`useCanEdit()` und `editingEnabled`, sofort, `redInk`, zuletzt). Keine Zustands-Aktionen für Schloss, Garage, Rollladen, Klima, Medien. Scrollen und Größenänderung schließen; `role="menu"`, Pfeiltasten (`menuKeys`), Esc, Fokus zurück. Zustand in `stores/glasUiStore.ts`, Host in `GlasRuntime` | GLAS-DESIGN §7.23. Die Karte an ihrem Platz braucht keinen DOM-Klon und bleibt live; über die Abdunkel-Ebene käme sie nicht (Stapelkontexte der Seite), daher das Loch. Schloss und Garage hätten im Menü nur Wege, die ohnehin in ihre Bestätigung führen; die Karte zeigt sie schon |
| K59 | GLAS-PLAN §2.5 „Schwelle 72 px, langes Durchziehen löst aus“ | Wisch-Zeilen nach GLAS-DESIGN §7.24: Richtungsentscheid nach 8 px (waagerecht → `setPointerCapture`), Zeile folgt bis −(Aktionsbreite + 36), offen ab −45 % der Aktionsbreite, Loslassen `snappy` .35 s; **kein Auslösen durch Durchziehen**; eine offene Zeile je Liste, Tipp auf die offene Zeile und Scrollen schließen. Breiten Handy 104/88/104/112 (Benachrichtigungen, Licht, Garage, Schlösser), Desktop 96 / offen ab −48 / Anschlag −128. Die Aktion unter der Zeile ist `aria-hidden` mit `tabIndex=-1`; ihr Zwilling in der Zeile bleibt (×, Schalter, Verriegeln, Schließen). Licht „Aus“ nur bei an; Schlösser „Verriegeln“ nur unverriegelt und nicht beschäftigt, über `request('lock')` (fragt mit Code wie heute); Garage „Schließen“ nur, wenn das Tor schließen kann. Klassisch: `SwipeRow` gibt die Kinder unverändert zurück | GLAS-DESIGN §7.24 ist neuer als GLAS-PLAN §2.5 und kennt kein Durchziehen; ein versehentliches Durchziehen hätte bei Schloss und Garage echte Folgen |
| K60 | GLAS-PLAN §2.3 Inspector (3b, Grundgerüst) | `EntityDetailModal` übergibt `presentation="inspector"` (`[fork]`). In Glas ab 1100 px und wenn kein anderes Fenster offen ist: rechtes Panel (`top/right/bottom 12`, Breite 420, Radius 30, Tönung `inspector` .68, Schatten `inspector`), nicht modal (`aria-modal="false"`, kein Scrim, keine Scroll-Sperre, Seite bleibt bedienbar), Ebene 400; Inhalt und Kopf der Seite rücken rechts auf 452 (`:root[data-g-inspector]`); Tipp auf eine andere Kachel tauscht den Inhalt (K70); Routenwechsel schließt (`GlasRuntime`); Esc schließt, wenn es oben liegt. 900–1099 Dialog, unter 900 Sheet. Inhalt wie in Klassisch; fertig gestaltet in Etappe 4 | GLAS-DESIGN §7.20; Etappe 4 baut Kopf, Licht-Regler und Verlauf (GLAS-PLAN Etappe 4 „Inspector fertig“) |
| K61 | PLAN-ETAPPE-2 §3.6/§8 „Schließen des Mehr-Menüs mit Animation, Werte, Fuß, Raumstatus: Etappe 3“ | Schließen von Mehr- und Räume-Sheet animiert in 3a per CSS (`transition-behavior: allow-discrete` auf `display`, `translateY(calc(100% + 16px))`, 360 ms `cubic-bezier(.4,0,1,1)`; Scrim blendet 320 ms aus). Werte rechts, Fuß „Version · F…“ und Raumstatus (K43) kommen in Etappe 4 | Werte und Raumstatus brauchen dieselbe Logik wie die Räume-Kacheln (§7.17: Zeile 1/Zeile 2, Status-Override) und die Energie-Karte (§7.9, „8,4 kWh“) — beide baut Etappe 4; eine zweite Fassung jetzt würde doppelt gepflegt. Ohne `allow-discrete` (Safari < 17.4) schließen die Menüs wie bisher sofort |
| K62 | GLAS-DESIGN §6.3 „Tab-Wechsel: Überblendung 160 ms + 6 px Anstieg“ (Notizen des Users) | bleibt offen bis Etappe 7 (Feinschliff); das Labor prüft, ob der Seiteneintritt `g-rise` Bilder der Linse kostet | Etappe 3 ändert die Tab-Leiste nicht; die Überblendung gehört zum Seitenwechsel |
| K63 | — | Drei Nebenbefunde in Klassisch, die Glas nicht hat und Klassisch nicht ändert: (a) Esc schließt verschachtelte Fenster alle auf einmal (jedes offene `Modal` hat seinen Esc-Listener); (b) verschwinden Eltern- und Kind-Fenster im selben Commit, laufen die passiven Aufräum-Effekte vom Elternteil zum Kind, und `body.style.overflow` bleibt `hidden`; (c) das `autoFocus`-Code-Feld von `LockConfirm` verliert den Fokus an das Panel (K55). Alle drei vor dem Melden am Code nachprüfen (Probe in `checks`), dann dem User einzeln vorlegen | Klassisch bleibt ohne OK des Users unverändert |
| K64 | glas-tokens.json `zIndex` | Fenster 1000 (Scrim darin, wie Klassisch), Seiten 1010, Inspector 400, Kontextmenü: Abdunkelung 900, Menü 910; Toasts 1100 über allem. Geister behalten die Ebene ihres Fensters | wie §5.7 in PLAN-ETAPPE-2 |
| K65 | GLAS-DESIGN §6.4 | Reduzierte Bewegung: Sheet, Dialog, Inspector, Seiten, Übergabe und Inhaltstausch überblenden 200 ms (nur Deckkraft); Detent-Wechsel springt; Ziehen folgt dem Finger (vom Nutzer gesteuert), Loslassen rastet ohne Feder; Schütteln, Anheben der Kontext-Vorschau und das Hochskalieren des Menüs entfallen | Ausnahme `!important` nach K38 bleibt auf `transition-*`/`animation-*` beschränkt; Bewegungen der Laufzeit (Web Animations, K69) fragen die Media-Query selbst ab |
| K66 | GLAS-DESIGN §7.18 „groß deckend“ | Das Material wechselt am Ende des Einrastens (mittel → groß: nach der Höhenanimation deckend; groß → mittel: zu Beginn wieder Glas), kein Verlauf zwischen Glas und deckend | `backdrop-filter`-Werte werden nie animiert (GLAS-DESIGN §6.2) |
| K67 | GLAS-PLAN Etappe 3 „alle Chip-Modals …“ | 3a gestaltet den Rahmen aller 24 Fenster und den **Inhalt** der Sheets aus GLAS-DESIGN §7.18 per CSS an den vorhandenen Klassen: Personen, Licht, Türen & Fenster, Garage, Schlösser, Alarm (inkl. Ziffernblock), Pool (inkl. Dauerwahl), Medien, Wetter, Müll, Bestätigungen, Benachrichtigungen. „Alle ausschalten“ wird prominent 48 (`[fork]`, der Knopf hat Inline-Stile, wie K41). Knöpfe in Fenster-Füßen nach §7.29 (primär prominent 50, Gefahr `actDel` + Weiß, sekundär `fill` 44). Was Etappe 3 nicht anfasst: Schalter, Segmente und Regler in diesen Inhalten behalten die Klassisch-Form mit Glas-Farben (Etappe 5), Karten in „Klima/Rollläden alle“ (Etappe 4/5), Inhalt des Details (Etappe 4) | Die §7.18-Inhalte sind reine Darstellung derselben Daten; neue Bausteine (Segment mit Linse, Schalter 51 × 31) gehören zu Etappe 5, wo sie überall kommen |
| K68 | GLAS-PLAN Etappe 3 Abnahme „Pool-Neustart erscheint im Sheet“ | „Gerät neu starten“ im Admin-Bereich der Poolseite fragt in Glas mit einem Bestätigungs-Sheet (Text, „Abbrechen“, „Neu starten“ in `actDel`) statt mit `window.confirm`; Klassisch bleibt beim Browser-Dialog (`PoolAdminCard.tsx`, Fork-Datei). Die Admin-Sicherung in den Einstellungen (`window.confirm`) bleibt in beiden Stilen | Den Browser-Dialog kann kein Stil gestalten; die Sicherung ist ein seltener Admin-Weg (Etappe 5, Einstellungen) |
| K69 | GLAS-PLAN §2.1 „FLIP mit `transform`“ | Bewegungen mit gemessenen Rechtecken (Morph, Seiten, Übergabe, Detent, Geist) laufen über die Web Animations API (`element.animate`) aus dem Hook; das CSS beschreibt nur Ruhezustände. Die Kurven kommen aus `--g-spring-*` (vom Element gelesen, Rückfall `cubic-bezier` wie §6.1). Der Geist startet beim berechneten Zustand des Originals (`transform`, Deckkraft, Höhe), damit ein Schließen mitten im Öffnen nicht springt; CSS-Animationen im Geist sind aus | CSS-Keyframes können keine gemessenen Rechtecke; ein in den Klon kopierter Keyframe-Name würde die Öffnen-Animation neu starten |
| K70 | GLAS-DESIGN §6.3 „Sheet-Inhalt tauschen“ | Wechselt der Titel eines offenen Fensters (Detail: Tipp auf ein Gruppenmitglied, Inspector: andere Kachel), läuft der Inhaltstausch: 300 ms `smooth`, `translateY(10px)` + Einblenden; das Fenster selbst bleibt stehen | Das Detail tauscht seinen Inhalt, ohne zu schließen (`openEntityDetail` auf derselben Instanz) |

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
const sheet = useGlasSheet({ open, onClose, title, swipeToClose, presentation, panelRef }); // [fork]
```

- Neue optionale Props: `subtitle?: string` (K53), `swipeToClose?: boolean` (Standard `true`, K51), in 3b
  `presentation?: 'auto' | 'inspector'` (K60). Klassisch ignoriert alle drei.
- Klassisch-Effekte für Fokus, Esc und Scroll-Sperre bekommen am Anfang `|| sheet.on` bzw. `if (sheet.on) return`
  (Glas übernimmt sie, §3.6, K55); der Effekt, der den Auslöser merkt, bleibt für beide.
- `.modal-backdrop`: `ref={sheet.backdropRef}` (in Klassisch `undefined`), in Glas als erstes Kind
  `<div className="g-sheet-scrim" aria-hidden="true" />`.
- Panel: `{...sheet.panelProps}` (in Klassisch leer; in Glas `data-g-sheet="medium|large|dialog|page|inspector"`,
  `data-g-mat="glass|solid"`, `aria-modal`), als erstes Kind in Glas `<SheetGrabber />` (nur Sheets, keine Seiten).
- Kopf: `sheet.on ? <SheetHeader … /> : <div className="modal-header">…</div>` (K53); Körper und Fuß unverändert.
- `if (!open) return null` bleibt; das Schließen in Glas animiert der Geist (K47).

Klassisch rendert damit exakt dasselbe DOM (gleiche Klassen, Attribute, Inline-Stile, Effekte); `checks` vergleicht es
je Fenster mit `main` (§6.2).

### 3.2 `useGlasSheet` und die Präsentation

`components/glas/sheet/useGlasSheet.ts` (neu). In Klassisch gibt der Hook `{ on: false }` und leere Props zurück und
hängt nichts an. In Glas:

| Breite (Viewport) | Präsentation | Material |
|---|---|---|
| < 900 | Sheet, Detent nach K50 | mittel: Sheet-Material (`--g-sheet-fill/-filter`, Mindest-Tönung `sheetMedium`); groß: `sheetSolid` |
| ≥ 900 | Dialog (K52) | Glas, Tönung `dialogDesktop` |
| ≥ 1100, nur `presentation="inspector"` und kein anderes Fenster offen (3b) | Inspector (K60) | Glas, Tönung `inspector` |
| jede Breite, wenn schon ein Fenster offen ist | Seite (K48) | `sheetSolid` |

- Das Panel tritt in die `:where()`-Liste von `material.css` ein, solange `data-g-mat="glass"` (K30): Rezept, Rand,
  Rückfälle deckend/ohne `backdrop-filter`/`forced-colors` gelten so automatisch. „Transparenz reduzieren“, Stärke
  deckend und `prefers-contrast: more` machen jedes Fenster deckend.
- `.modal-backdrop` hat in Glas keinen Hintergrund, keinen `backdrop-filter`, keine Animation und keinen Innenabstand
  (sonst wäre sie Backdrop-Root und das Glas des Panels sähe die Seite nicht, GLAS-DESIGN §3.7); dunkel macht der Scrim
  (`--g-scrim`, am Desktop `--g-scrim-desktop`, `pointer-events: none`, damit der Klick daneben wie heute auf der
  Backdrop landet). Seiten haben keinen eigenen Scrim.
- Messen und Schreiben: Detent, Ursprung und Seitenrechteck als Attribute bzw. Inline-Stile am Panel; Ziehen schreibt
  nur Inline-Stile, ohne React neu zu rendern. Fenstergröße ändert sich (Drehen, Tastatur) → Präsentation und Detent neu
  bestimmen, ohne Animation.
- Stilwechsel bei offenem Fenster (Admin stellt um): kein Absturz, kein Geist, Zustand sofort richtig (`checks`).

### 3.3 Öffnen: Ursprung und Morph

- `components/glas/sheet/origin.ts` (neu): `GlasRuntime` meldet jedes `pointerdown` und jedes Enter/Leertaste
  (`keydown`, Capture) mit `closest('button, a, [role="button"], [role="menuitem"], .card, [data-morph-origin]')`;
  gespeichert werden Element und Rechteck. `takeOrigin()` liefert ihn, wenn er höchstens 1,5 s alt ist, sonst nichts.
- Sheet mit Ursprung: aus dessen Rechteck (`translate` + `scale`, Ursprung oben links, Radius `22/scale → 40`) in
  `smooth` .5 s; Inhalt blendet 240 ms ab 120 ms ein; Scrim 300 ms. Ohne Ursprung (z. B. „Was ist neu“ beim Start):
  `translateY(calc(100% + 16px)) → 0` `smooth` .5 s. Maßstab mindestens 0,05 je Achse.
- Dialog: Morph .52 s `smooth` (Radius `22/scale → 34`, Deckkraft voll ab 18 %), Inhalt ab 40 %.
- Seite: `translateX(100%) → 0` `smooth` .5 s, darunter wandert der Inhalt des Elternfensters (Kopf, Körper, Fuß, nicht
  das Panel mit dem Glas) um −25 % und auf `brightness(.86)`; Schatten `pushedScreen` an der linken Kante der Seite.
- Übergabe (K49) und Inhaltstausch (K70) wie in §1.
- Fokus nach K55 erst, wenn das Panel im Dokument ist (die Animation stört ihn nicht).

### 3.4 Schließen: der Geist (K47)

`components/glas/sheet/ghost.ts` (neu). Die Ref-Funktion der Backdrop gibt in Glas eine Aufräumfunktion zurück; die
ruft React beim Entfernen, solange das Fenster noch im Dokument hängt. Dann:

1. Nur in Glas, nur wenn das Element verbunden ist und die Ref schon mindestens einen Mikrotask hing (React 19 ruft
   Callback-Refs im StrictMode der Entwicklung einmal zusätzlich auf und ab).
2. `cloneNode(true)`; im Klon: `id`-Attribute weg, `inert`, `aria-hidden="true"`, `pointer-events: none`, Klasse
   `g-sheet-ghost`; Werte von `input`/`select`/`textarea` und `scrollTop` gescrollter Elemente übernehmen;
   `video`/`canvas` durch ein Standbild ersetzen bzw. ausblenden; laufende CSS-Animationen im Klon aus.
3. Startzustand = berechneter Zustand des Originals (K69), dann an `body` hängen.
4. Animation nach Schließ-Art (der Hook merkt sie sich vor dem Aufruf von `onClose`):
   - Morph zurück in den Ursprung, wenn er noch im Dokument und sichtbar ist: 420 ms `smooth`, bis 70 % deckend, dann
     aus; Inhalt 140 ms; Dialog .44 s `cubic-bezier(.32,.72,0,1)`.
   - ohne Ursprung: 360 ms `cubic-bezier(.4,0,1,1)` nach unten; nach Ziehen 320 ms dieselbe Kurve ab der aktuellen Lage.
   - Seite: nach rechts hinaus, der Elterninhalt kommt zurück (`smooth` .5 s).
   - Übergabe: 140 ms ausblenden. Reduzierte Bewegung: 200 ms ausblenden.
   - Scrim 320 ms ease-in.
5. Nach dem Ende (spätestens 1 s, Sicherheitszeitgeber) entfernen. Mehrere Geister gleichzeitig sind erlaubt.

Alle Schließwege laufen so: ×, „Zurück“, Esc, Tipp daneben, Ziehen, Aktion im Fenster (Verriegeln, Starten …),
Elternteil hängt das Fenster aus, Routenwechsel.

### 3.5 Ziehen (`sheetMath.ts`, K51)

`components/glas/sheet/sheetMath.ts` (neu, rein, getestet): `pickDetent(contentH, viewportH)`,
`dragFrame(detent, dy, H, largeH)` (Höhe bzw. Versatz mit Gummiband), `snapAfterDrag({ detent, dy, vy, H, hasLarge,
canClose })` → `'medium' | 'large' | 'close' | 'stay'`, `scrimOpacity(dy)`, `morphFrom(origin, target, radius)`.
Pointer Events am Greifer und am Kopf (`touch-action: none`, `setPointerCapture`), Geschwindigkeit aus den letzten 80 ms.
Ein Tipp auf den Greifer (ohne Bewegung) wechselt mittel ↔ groß, die Tastatur genauso (Knopf). Detent-Wechsel animiert
Höhe, Einzug und Radius in `snappy` .35 s (einzige Höhen-Animation); das Material wechselt nach K66.

### 3.6 Stapel, Esc, Scroll-Sperre, Tab-Leiste (`sheetStack.ts`, K48)

`components/glas/sheet/sheetStack.ts` (neu). Reiner Kern (getestet): Liste offener Fenster mit Eltern-Bezug,
`register/unregister`, `top`, `depthOf`, Einordnung im selben Commit (Kind nach seinem Elternteil), Übergabe-Merker.
Dünne Seiteneffekte bei jeder Änderung:

- `inert` an allen Backdrops außer der obersten; der Inspector liegt dabei unten.
- **Esc**: ein einziger `keydown`-Listener (solange der Stapel nicht leer ist) schließt nur das oberste Fenster
  (`preventDefault`, letzte `onClose`-Referenz).
- **Scroll-Sperre** mit Zähler: das erste modale Fenster merkt sich `body.style.overflow` und setzt `hidden`, das letzte
  stellt ihn wieder her, egal in welcher Reihenfolge die Fenster verschwinden (K63 b). Der Inspector sperrt nicht.
- `data-g-sheets` an `:root`, solange ein modales Fenster offen ist: die Tab-Leiste fährt weg wie bei Mehr/Räume
  (`tabbar.css`), und `GlasRuntime` minimiert nichts.
- Fokus-Rückgabe nach dem Entfernen von `inert` (K55), sonst schlüge `focus()` fehl.

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

`components/glas/NotificationsSheet.tsx` (neu): `Modal` mit `subtitle`, öffnet aus dem Avatar-Menü (`AvatarMenu.tsx`
statt `Panel` am Handy; Fokus und Rückgabe übernimmt `Modal`). Inhalt nach der Skizze: Kopfzeile „N Benachrichtigungen“
15 `label2` + „Alle verwerfen“ 15/600 `accentInk` (Trefferfläche 44), Gruppe mit Zeilen (Titel 17/600, Text 15
`label2`, Zeit 13 `label2`, × 44 mit Glyphe 16 `label2`), Leerzustand „Keine Benachrichtigungen“ + „Neue Meldungen von
Home Assistant erscheinen hier.“. Dienste wie heute (`persistent_notification.dismiss`/`dismiss_all`). Der Zähler am
Avatar bleibt. Die Desktop-Glocke mit Glas-Popover bleibt.

### 3.10 Mehr- und Räume-Sheet schließen (K61)

Nur CSS in `menus.css`: Übergang auf `display` mit `allow-discrete`, `translate` und Deckkraft; der Scrim
(`.app-layout::before` aus Etappe 2) bleibt bestehen und blendet aus. Reduzierte Bewegung: 200 ms nur Deckkraft.

### 3.11 Bewegung und Material im Überblick

| Was | Normal | Reduziert |
|---|---|---|
| Sheet auf | Morph aus dem Ursprung .5 s `smooth` bzw. von unten | 200 ms Deckkraft |
| Sheet zu | zurück 420 ms bzw. nach unten 360/320 ms | 200 ms Deckkraft |
| Dialog | auf .52 s `smooth`, zu .44 s | 200 ms Deckkraft |
| Detent | `snappy` .35 s (Höhe, Einzug, Radius) | springt |
| Seite | von rechts .5 s `smooth`, Elterninhalt −25 % + `brightness(.86)` | 200 ms Deckkraft |
| Übergabe / Inhaltstausch | 140 ms aus / 300 ms ein | 200 ms Deckkraft |
| Code falsch | Schütteln 420 ms | entfällt |
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
  (`GarageList.tsx`, Fork); Schlösser (`LocksList.tsx`, Fork).

### 4.3 Inspector-Grundgerüst (K60, GLAS-DESIGN §7.20)

Präsentation `inspector` in `useGlasSheet`; rein `translateX(460px) → 0` .55 s `smooth`, raus .38 s mit Deckkraft → .6
(Geist); Backdrop ohne Scrim mit `pointer-events: none`, Panel mit `pointer-events: auto`; `:root[data-g-inspector]`
gibt `.app-main` und dem Desktop-Kopf rechts 452 px Platz. `GlasRuntime` schließt den Inspector beim Routenwechsel.
Öffnet ein anderes Fenster darüber, ist es ein Dialog (der Inspector wird `inert`). Wechsel über 1100 px bei offenem
Fenster: Präsentation wechselt ohne Animation.

---

## 5. Dateien

### 5.1 Neue Dateien (Fork)

| Datei | Teil | Inhalt |
|---|---|---|
| `components/glas/sheet/useGlasSheet.ts`, `sheetMath.ts`, `sheetStack.ts`, `origin.ts`, `ghost.ts`, `SheetHeader.tsx`, `SheetGrabber.tsx` | 3a | §3.1–3.6 |
| `components/glas/NotificationsSheet.tsx` | 3a | §3.9 |
| `styles/glas/sheets.css` (Rahmen, Scrim, Detents, Dialog, Seiten, Geist, Kopf, Greifer, Fuß-Knöpfe), `styles/glas/sheet-content.css` (§3.8) | 3a | in `index.css` |
| `test/sheetMath.test.ts`, `test/sheetStack.test.ts` | 3a | §6.1 |
| `stores/glasUiStore.ts`, `components/glas/ContextMenu.tsx`, `contextActions.ts`, `SwipeRow.tsx`, `swipeMath.ts`, `styles/glas/gestures.css` (Kontextmenü, Wischen, Inspector) | 3b | §4 |
| `test/contextActions.test.ts`, `test/swipeMath.test.ts` | 3b | §6.1 |

Geänderte Fork-Dateien: 3a `app/glas/GlasRuntime.tsx` (Ursprung), `components/glas/AvatarMenu.tsx` (§3.9),
`components/security/LockConfirm.tsx` (Schütteln), `components/pool/PoolAdminCard.tsx` (K68), `styles/glas/index.css`,
`material.css` (K30-Liste), `tabbar.css` (`data-g-sheets`), `menus.css` (K61), `packages/core/src/glasTokens.ts`
(Schatten `dialog`, `inspector`, `sheetLarge`, `liftContext`, `liftContextDesktop`, `pushedScreen` je Modus nach
`glas-tokens.json`), `test/glasSelectors.test.ts`, `scripts/glas-shots.cjs`, `packages/core/scripts/smoke.mjs`;
3b `GlasRuntime.tsx` (Kontextmenü-Host, Inspector), `NotificationsSheet.tsx`, `security/LocksList.tsx`,
`garage/GarageList.tsx`.

### 5.2 `[fork]`-Stellen in Upstream-Dateien

| Datei | Teil | Änderung |
|---|---|---|
| `components/ui/Modal.tsx` | 3a | §3.1 (Import, drei Props, Hook, drei Effekt-Wächter, Backdrop-Ref + Scrim, Panel-Attribute, Greifer, Kopf-Zweig); 3b `presentation` |
| `components/security/AlarmPanelCard.tsx` | 3a | Ziffernblock in Glas als `Modal` ohne eigene Überschrift, Schüttel-Schlüssel (K56) |
| `components/home/chipmodals/LightsModal.tsx` | 3a/3b | Inline-Stil von „Alle ausschalten“ nur in Klassisch (K67); 3b Zeilen in `SwipeRow` |
| `components/notifications/NotificationsPanel.tsx` | 3a/3b | `createdAt` in `useNotifications` (K57); 3b Zeilen des Popovers in `SwipeRow` |
| `components/cards/EntityCard.tsx` | 3b | Langdruck und Rechtsklick → Kontextmenü in Glas (K58) |
| `components/home/EntityDetailModal.tsx` | 3b | `presentation="inspector"` (K60) |
| `packages/core/locales/*.json` (7) | 3a/3b | `glas.sheet.*` (Zurück, Greifer-Labels), `glas.notifications.*`, `glas.context.*`, `glas.swipe.*`, `glas.pool.restart*` |

Klassisch: jede Stelle rendert dort exakt das Heutige.

---

## 6. Tests und Proben

### 6.1 Unit-Tests (vitest, Node-Umgebung)

| Test | Prüft |
|---|---|
| `sheetMath.test.ts` | `pickDetent` (passt/passt nicht, Grenze, Höhe < 560 nur groß); `dragFrame` (Wachsen bis groß, Gummiband ×0,2 oben und mit `swipeToClose=false` unten); `snapAfterDrag` (jede Schwelle und Geschwindigkeit, nur groß, nicht schließbar); `scrimOpacity`; `morphFrom` (Maßstab, Versatz, Radius `22/scale`, Mindestmaßstab 0,05) |
| `sheetStack.test.ts` | Öffnungsreihenfolge, Kind im selben Commit nach dem Elternteil, `top`/`depthOf`, Entfernen in beliebiger Reihenfolge (Elternteil zuerst), Esc-Ziel, Scroll-Zähler ausgeglichen, Übergabe-Merker verfällt, Inspector unten und ohne Sperre |
| `contextActions.test.ts` (3b) | Aktionen je Domäne und Recht, Reihenfolge, Szene zuerst, kein Schloss/Garage-Zustand, „Raum öffnen“ nicht auf dem eigenen Raum, Favoriten-Recht unter Verwaltung und ohne |
| `swipeMath.test.ts` (3b) | 8-px-Entscheid (senkrecht gewinnt), Anschlag −(w + 36), offen ab −45 %, Desktop-Werte |
| `glasSelectors.test.ts` | neue CSS-Dateien in der Liste; neue Klassen `g-*` oder Upstream; Laufzeit-Klassen (`g-sheet-ghost`) in `RUNTIME_CLASSES`; `:where()`-Liste in `material.css` überall gleich |
| `smoke.mjs` „glas tokens“ | neue Schatten je Modus; Kontrast: `accentInk` auf Sheet-Material und `sheetSolid`, Weiß auf `actDel`/`actOk`/`actNeutral`, `redInk` auf Menü-Glas (3b), Text auf `prominent`, `label2` auf `group` |

### 6.2 `glas-shots.cjs`

- **shoot**, beide Stile, Handy/iPad/Desktop, hell/dunkel, im Viewport aufgenommen: jedes Chip-Sheet (Personen, Licht,
  Türen, Garage, Schlösser, Alarm, Pool, Medien, Wetter, Müll, Klima alle, Rollläden alle), Detail (Sensor, Licht),
  Benachrichtigungen, Seite „Entriegeln“ (Schlösser), Seite „Garage öffnen“, Ziffernblock-Seite, Dauerwahl nach der
  Übergabe, großes Sheet (Detail lang, Einstellungen-Entitäten), „Was ist neu“, Pool-Neustart (Admin); 3b
  Kontextmenü, offene Wisch-Zeile, Inspector. **Klassisch: 0 Pixel gegen `main`** über die volle Matrix plus die neuen
  Szenen (außer F34/F35 in den Einstellungen).
- **checks `--part sheets`** (3a):
  - Klassisch je Fenster: gleiches DOM wie `main` (keine `g-*`-Elemente, keine `data-g-*`, gleiche Inline-Stile),
    `body.style.overflow` danach leer; die drei Nebenbefunde aus K63 als Messung (Bericht, kein Fehler).
  - Glas-Geometrie: mittel Einzug 8 ± 1, Radius 40, Höhe ≤ `100dvh − 144`; groß oben 52, deckend, ohne
    `backdrop-filter`; 844 × 390 nur groß; 820 × 1180 Breite 560 mittig; Desktop-Breiten aus K52 ± 1, Radius 34;
    Kopf: Schließen links mit Trefferfläche ≥ 44, Titel mittig; Greifer sichtbar 36 × 5, Trefferfläche 120 × 30.
  - Ziehen per CDP-Touch: mittel schließt (30 % Höhe), federt zurück (10 %), wird groß (−60), groß → mittel (100),
    groß schließt (50 %), Wurf; Ziffernblock schließt nie; Gummiband.
  - Morph: Rechteck bei 0/80/160/320 ms vom Chip zur Endlage, im Endbild ruhend; Schließen: Geist vorhanden, läuft
    zurück in den Chip, nach ≤ 1 s weg; keine Reste, Scroll-Sperre aufgehoben, Fokus auf dem Auslöser — für ×, Esc,
    Tipp daneben, Ziehen und für Fenster, die verschwinden (Detail, Bestätigung).
  - Stapel: Schlösser → „Entriegeln“: gleiches Rechteck, deckend, Elterninhalt −25 %, „Zurück“ links, Elternfenster
    `inert`; Esc schließt nur die Seite, Fokus zurück auf „Entriegeln“; zweites Esc schließt das Sheet; Scroll-Sperre
    erst danach frei. Ziffernblock-Seite im Alarm-Sheet. Detail aus „Klima alle“ als Seite.
  - Übergabe Pool → Dauerwahl: kein Hochfahren, Geist blendet aus, ein Sheet sichtbar.
  - Tab-Leiste weg, solange ein Sheet offen ist, danach zurück; Glas-Regeln: Backdrop ohne `backdrop-filter`, Deckkraft
    und Animation (keine Backdrop-Root), kein Glas im Inhalt, deckende Stärke ohne `backdrop-filter` irgendwo.
  - Eingabefelder in Fenstern ≥ 16 px; Benachrichtigungs-Sheet (Zeiten, ×, „Alle verwerfen“ → Leerzustand, Fokus);
    Mehr/Räume schließen animiert; reduzierte Bewegung: nur Deckkraft ≤ 200 ms, kein `transform`; Stilwechsel bei
    offenem Fenster; Linsen-Probe aus Etappe 2 zeitfest machen (Uhr statt Echtzeit-Stichprobe).
- **checks `--part gestures`** (3b): Kontextmenü (Touch-Halten 550 ms, Rechtsklick, Aktionen je Karte, Loch ± 1 px über
  der Karte, Esc und Pfeile, Tipp auf das Loch schließt, Scrollen schließt, reduzierte Bewegung, Tipp ohne Halten öffnet
  weiter das Detail), Wisch-Zeilen (öffnen, Schwelle, eine offen, Scrollen schließt, Aktion nicht im Tab-Weg, kein
  Schalten nach dem Wischen), Inspector (≥ 1100 nicht modal, Seite klickbar, keine Überdeckung des Inhalts, Tausch,
  Esc, Fokus hinein und zurück, Routenwechsel schließt; 900–1099 Dialog; < 900 Sheet).
- Wird die Datei zu groß, wandern die neuen Teile in `scripts/glas-checks-sheets.cjs` mit gemeinsamen Helfern.

### 6.3 Weitere Prüfungen

| Prüfung | Inhalt |
|---|---|
| Klick-Fuzz | `click-fuzz-test.cjs … glas` Handy + Desktop, auch im Bearbeiten-Modus, ohne Fehler |
| Leistung (Bericht) | Chromium mit 4-facher CPU-Drosselung: Bildabstände beim Öffnen eines Sheets mit Morph (Ziel ≤ 2 verworfene Bilder, GLAS-PLAN §5.5); am iPad im Labor |
| Pflichtbefehle | `npm run typecheck && npm run build && npm test -w @hapulse/core && npm test -w @hapulse/dashboard && npm run lint` |

---

## 7. Abnahme (GLAS-PLAN §3 Etappe 3, ergänzt)

**3a**
- [ ] Jedes der 24 Fenster in Glas als Sheet (Handy) bzw. Glas-Dialog (Desktop), Morph aus dem Element und zurück,
      Detents mittel/groß, Wischen nach unten schließt (außer `swipeToClose={false}`).
- [ ] Bestätigungen (Garage öffnen, Entriegeln mit Code, Alarm-Code, Pool-Neustart) erscheinen im Sheet bzw. als
      Sheet; falscher Code: bleibt offen, leert und schüttelt (H3, H8).
- [ ] Reduzierte Bewegung: alles Überblendung; Bewegungsprobe zeigt Bewegung bei 0/80/160/320 ms.
- [ ] Klassisch 0 Pixel, gleiches DOM in jedem Fenster.

**3b**
- [ ] Kontextmenü: Langdruck 550 ms, Rechtsklick; Aktionen korrekt; Tipp auf Anzeige-Karten öffnet weiter direkt das
      Detail.
- [ ] Wisch-Aktionen mit Knopf-Zwilling; nie Entriegeln/Öffnen per Wischen.
- [ ] Inspector ab 1100 px nicht modal, Inhalt tauscht, Esc und Fokus.

**Nicht verlieren** (Inventar B, F, H2–H3, H8, I, V9, X; je PR geprüft, was er berührt)
- [ ] Personen: Avatare/Initiale, Zone (Zuhause grün/Weg/Name), seit wann (B2)
- [ ] Licht: nach Raum in Nutzer-Reihenfolge + „Andere“, Zeilen-Tipp schaltet, „Alle ausschalten“ (B4)
- [ ] Türen/Fenster: zwei Gruppen, offen/gesamt, offene zuerst (B6) · Alarm: ein Panel je Zentrale, schwerste zuerst,
      nur unterstützte Modi, nur Unscharf während „wird scharf“ (B8, H2)
- [ ] Medien: aktiv/inaktiv, Play/Pause, Lautstärke (300-ms-Drossel), Link Musik-Seite (B10)
- [ ] Pool: Status, Modus aus `input_select`, Manuell → Dauerwahl, Solar vs. Schwelle, Laufzeit, Restzeit live, Link (B12)
- [ ] Garage: offene zuerst, Stopp nur beim Fahren + unterstützt, Schließen sofort, Öffnen fragt (B14, I4)
- [ ] Schlösser: offene zuerst, Entriegeln fragt immer, Verriegeln nur mit Code fragt, gesperrt bei busy/jammed (B16, I7)
- [ ] Wetter: Kennzahlen, Stunden/Tage, Entitäts-Wahl für Bearbeiter (D10) · Klima-/Rollläden-„Alle anzeigen“ (C9, C11)
- [ ] Detail: Einstiegspunkte (F14) inkl. Pool-Kacheln, Gruppen-Mitglieder, Kamera-Kacheln; Inhalt vollständig (§2.3)
- [ ] Fokus-/Esc-Verhalten aller Fenster (V9) · `data-autofocus` („Verstanden“ in „Was ist neu“) · Leerzustände (X)

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

1. **Geist (K47):** hängt an der Reihenfolge im Commit von React 19 (Ref lösen vor `removeChild`). Ändert React das,
   schließen Fenster in Glas ohne Animation (kein Fehler). `checks` prüft den Geist bei jedem Schließweg; nach
   React-Updates gehört die Probe zum Pflichtlauf (`docs/SYNC.md`).
2. **Treue des Geists:** Diagramme (SVG) klonen sauber; Bilder aus dem Cache; Video und Canvas werden Standbild oder
   ausgeblendet; Eingaben werden übernommen. Fremde Laufzeit-Zustände (z. B. offene `<select>`-Liste) nicht.
3. **Gesten in WebKit:** `touch-action`, Pointer Capture und Gummiband verhalten sich auf iOS anders als in Chromium;
   die CDP-Touch-Proben ersetzen das Gerät nicht (Labor).
4. **`dvh` und Safari-Leisten:** Sheet-Höhen springen, wenn die Leisten ein-/ausfahren; Messung im Labor.
5. **Leistung:** Morph mit `backdrop-filter` (Blur 28 px im Sheet-Material) auf dem iPad; Rückfall „Transparenz
   reduzieren“ (GLOBAL) — Budget GLAS-PLAN §5.5, Messung §6.3 und Labor.
6. **Upstream-Merges:** `Modal.tsx` ist das zentrale Andockstück; die `[fork]`-Zeilen bleiben kurz, der Kopf ist ein
   eigener Zweig. Klassen der Chip-Fenster prüft der Selektor-Wächter.
7. **`inert`** (Safari ≥ 15.5) und **`allow-discrete`** (Safari ≥ 17.4): ältere Geräte bekommen Fenster ohne
   Inertheit bzw. Menüs, die sofort schließen — kein Funktionsverlust.
8. **Kontextmenü-Loch:** scrollt oder ändert sich die Karte während des Menüs, stimmt das Loch nicht mehr — deshalb
   schließen Scrollen und Größenänderung.

## 10. Bewusst offen nach Etappe 3

Untertitel der Chip-Sheets, Werte/Fuß/Raumstatus in Mehr und Räume (K61), Detail- und Inspector-Inhalt, weitere
Langdruck-Quellen: Etappe 4. Schalter, Segmente mit Linse, Regler in den Sheets: Etappe 5. Kameraseite und
NVR-Datumswahl im dunklen Teilbaum: Etappe 6. Tab-Wechsel-Überblendung (K62): Etappe 7. Bestätigungsblock in der Zeile
(K48) und Ziehen von Mehr/Räume: nicht geplant. `viewport-fit=cover` nur, wenn das Labor es verlangt (K39).

## 11. Labor (zusätzlich zu PLAN-ETAPPE-2 §9)

Echtes iPhone/iPad (WebKit), Home-Bildschirm-App und Safari:
- **K39 (weiter offen, blockiert nichts):** verdeckt die Statusleiste Avatar, „Zurück“ (Raumseite) oder „Fertig“?
- Sheets: Ziehen, Gummiband, Wurf; Detents mit ein- und ausfahrenden Safari-Leisten (`dvh`); Morph und Geist (Bilder,
  Diagramme) ohne Flackern; Tastatur über dem Code-Feld (Sheet bleibt bedienbar, keine Vergrößerung, K54).
- Leistung am iPad (E17): Sheet öffnen mit Morph, Ziehen, Seiten.
- Seiteneintritt `g-rise` beim Tab-Wechsel: kostet er Bilder der Linse (Notizen des Users, K62)?
- 3b: Langdruck ohne iOS-Callout, Wischen gegen senkrechtes Scrollen, Inspector am iPad quer.

## 12. Review des Plans

(folgt)
