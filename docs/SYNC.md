# Fork pflegen: Upstream-Updates + eigene Erweiterungen

Dieses Repo ist ein Fork von **[jlnbln/HAPulse](https://github.com/jlnbln/HAPulse)**.
Ziel: eigene Erweiterungen einbauen **und** die Updates aus dem Original
regelmäßig sauber übernehmen — ohne Merge-Albträume.

Das Grundprinzip: **eigene Änderungen strikt von Upstream trennen.**

---

## 1. Remotes einrichten (einmalig)

```bash
git remote add upstream https://github.com/jlnbln/HAPulse.git
git fetch upstream
git remote -v
# origin    https://github.com/Muggedadscher/hapulse (dein Fork)
# upstream  https://github.com/jlnbln/HAPulse        (das Original)
```

---

## 2. `main` = deine eigene Linie (Fork **+** Upstream)

`main` enthält **deine Erweiterungen**. Neue Arbeit passiert in Feature-Branches
und kommt per PR in `main` (Schritt 3). Upstream-Updates holst du per **echtem
Merge** in `main`:

```bash
git checkout main
git pull origin main            # deinen aktuellen Fork-Stand holen
git fetch upstream
git merge upstream/main         # Original-Updates einmischen
# Konflikte lösen (dank [fork]-Marker leicht zu finden), dann prüfen:
npm run typecheck && npm run build && npm test -w @hapulse/core
git push origin main
```

Konflikte entstehen praktisch nur in den wenigen mit `// [fork]` markierten
Upstream-Dateien (Inventar unten) — wegen der Datei-Isolation bleibt das klein.

> Merke: seit dem Merge der Fork-Features ist `main` **kein** reiner
> Upstream-Spiegel mehr, deshalb `git merge` statt `--ff-only`.

---

## 3. Eigene Erweiterungen in Feature-Branches

Neue Features nicht direkt auf `main`, sondern in einem Branch — dann per PR
zurück nach `main`:

```bash
git checkout main && git pull origin main
git checkout -b feature/mein-feature
# ... entwickeln, committen ...
git push -u origin feature/mein-feature
# danach PR  feature/mein-feature -> main  öffnen und mergen
```

So bleibt `main` immer buildbar und die History nachvollziehbar. Läuft parallel
ein Upstream-Merge in `main`, hol ihn danach mit `git merge main` in deinen
offenen Feature-Branch (behält die History; `rebase main` nur auf noch nicht
geteilten Branches).

---

## 4. Konflikte minimieren — die wichtigste Regel

Je weniger du an **bestehenden** Upstream-Dateien änderst, desto reibungsloser
der Merge. Konkret in diesem Projekt:

1. **Neue Funktionen = neue Dateien.** Neue Komponenten/Module kollidieren
   praktisch nie beim Merge.
2. **Bestehende Dateien nur minimal und markiert anfassen.** Jede Fork-Zeile in
   einer Upstream-Datei trägt den Marker `// [fork]` (bzw. `/* [fork] */` in
   CSS). So findest du deine Änderungen sofort wieder — auch nach einem Merge:
   ```bash
   git grep -n "\[fork\]"
   ```
3. **Keine Umformatierungen** von Upstream-Dateien (kein Reindent, keine
   Import-Sortierung) — das erzeugt Konflikte ohne Nutzen.
4. **Design-Tokens statt Hex-Werte** und die vorhandenen Bausteine (`Modal`,
   `Card`, `EmptyState`, `.btn …`) wiederverwenden — dann bleibt alles im Stil
   und du änderst weniger.

---

## 5. Inventar der Fork-Änderungen

Damit bei einem Upstream-Merge klar ist, wo Konflikte entstehen können.

### Neue Dateien (konfliktfrei)

| Datei | Zweck |
|---|---|
| `packages/core/src/history.ts` | History-Typen, Parsing, Ranges, Demo-Daten |
| `apps/dashboard/src/ha/history.ts` | History-Facade (live/demo) |
| `apps/dashboard/src/ha/useHistory.ts` | Hook: lädt History on demand |
| `apps/dashboard/src/components/history/HistoryChart.tsx` | Inline-SVG-Chart |
| `apps/dashboard/src/components/history/HistoryModal.tsx` | Verlauf-Modal |
| `apps/dashboard/src/components/history/history.css` | Styles dafür |
| `apps/dashboard/src/pages/Nvr.tsx` | NVR-Seite (Scrypted-Embed) |
| `apps/dashboard/src/pages/Nvr.css` | Styles dafür |
| `docs/SYNC.md` | dieses Dokument |

### Geänderte Upstream-Dateien (alle mit `[fork]`-Marker)

| Datei | Änderung |
|---|---|
| `packages/core/src/connection.ts` | `fetchHistory()` + Import |
| `packages/core/src/index.ts` | Export des History-Moduls |
| `apps/dashboard/src/components/cards/SensorTile.tsx` | numerische Tiles klickbar → History-Modal |
| `apps/dashboard/src/components/cards/cards.css` | `.sensor-tile--clickable` |
| `apps/dashboard/src/stores/settingsStore.ts` | `scryptedUrl`- + `historyRange`-Setting |
| `apps/dashboard/src/app/Router.tsx` | Route `/nvr` |
| `apps/dashboard/src/app/AppLayout.tsx` | Nav-Eintrag „NVR" (`labelKey: 'nav.nvr'`) |
| `packages/core/locales/*.json` | i18n-Keys `nav.nvr`, `history.*`, `nvr.*` in **allen** Sprachen (en/de/es/fr/it/pt/sv) |

> Hinweis: JSON erlaubt keine `[fork]`-Kommentare. Deshalb sind alle Fork-Keys
> eindeutig unter `history.*` / `nvr.*` (+ `nav.nvr`) benannt und am **Dateiende**
> jeder Locale angehängt — so bleibt die Merge-Fläche minimal.
>
> **Wichtig:** Der Parity-Test (`packages/core/scripts/smoke.mjs`) verlangt
> **identische Keys in allen Sprachen**. Neue Fork-Strings also immer in *jede*
> `locales/*.json` eintragen, sonst wird `npm test` rot.

---

## 6. Vor jedem Push kurz prüfen

```bash
npm run typecheck
npm run build
npm test -w @hapulse/core
```

---

## Feature: NVR (Scrypted)

Scrypted-Kameras sind i. d. R. **nicht** als HA-Entities exportiert, tauchen
also nicht auf der Security-Seite auf. Die neue **NVR**-Seite bettet stattdessen
die Scrypted-Weboberfläche per `<iframe>` ein. Die URL wird direkt auf der Seite
gesetzt und in den (mit HA synchronisierten) Einstellungen gespeichert.

Hinweise:
- Läuft HAPulse über **https**, muss Scrypted ebenfalls über **https** erreichbar
  sein (Mixed-Content-Blockade des Browsers). Scrypted: meist `https://<host>:10443`.
- Manche Oberflächen setzen `X-Frame-Options` / CSP `frame-ancestors` und
  verbieten das Einbetten → dann bleibt der Rahmen leer; der **Open**-Button
  öffnet Scrypted in einem neuen Tab.

## Feature: Temperatur-/Sensor-Verlauf

Ein Klick (oder Enter/Space) auf eine **numerische** Sensor-Kachel öffnet ein
Modal mit dem Werteverlauf (1H/6H/24H/7D/30D) plus min/avg/max. Die Daten kommen
aus dem HA-Recorder (`history/history_during_period`); im Demo-Modus wird eine
synthetische Kurve erzeugt.
