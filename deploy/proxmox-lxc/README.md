# [fork] Betrieb in einem Proxmox-LXC mit Autoupdate

So läuft dieser Fork produktiv (CT 210): nginx liefert den Build als statische SPA aus, ein stündlicher Cron auf dem
Proxmox-Host baut jeden neuen Commit auf `main`, sobald die CI auf genau diesem Commit grün ist, und schaltet ihn
atomar live. Alle Dateien hier sind Kopien der laufenden Konfiguration (Stand 2026-10-06). Wer auf Host oder CT etwas
daran ändert, zieht die Kopie hier im selben Zug nach.

| Datei | Ziel | Läuft wo |
|---|---|---|
| `lxc.conf.example` | `/etc/pve/lxc/<id>.conf` | Proxmox-Host |
| `hapulse-build-deploy` | `/usr/local/bin/hapulse-build-deploy` (755) | CT |
| `nginx-site.conf` | `/etc/nginx/sites-available/hapulse`, Link in `sites-enabled/` | CT |
| `hapulse-security.conf` | `/etc/nginx/snippets/hapulse-security.conf` | CT |
| `hapulse-autoupdate` | `/usr/local/bin/hapulse-autoupdate` (755) | Proxmox-Host |
| `hapulse-autoupdate.cron` | `/etc/cron.d/hapulse-autoupdate` | Proxmox-Host |
| `hapulse-autoupdate.env.example` | `/etc/hapulse-autoupdate.env` (600, echte Werte) | Proxmox-Host |

## 1. Container

Debian 12, unprivilegiert, 1 Kern, 2 GB RAM, 4 GB Platte (Vorlage `lxc.conf.example`). Der Build braucht kurzzeitig
etwa 3 GB; `hapulse-autoupdate` setzt den RAM dafür per `pct set --memory 3072` hoch und danach wieder auf 2048.

```bash
apt update && apt install -y git nginx curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
git clone https://github.com/Muggedadscher/hapulse.git /opt/hapulse
install -m 755 hapulse-build-deploy /usr/local/bin/
install -m 644 hapulse-security.conf /etc/nginx/snippets/
install -m 644 nginx-site.conf /etc/nginx/sites-available/hapulse
ln -sf /etc/nginx/sites-available/hapulse /etc/nginx/sites-enabled/hapulse && rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

`hapulse-build-deploy <sha>` checkt den Commit in `/opt/hapulse` aus, baut (`npm ci`, `npm run build`), legt das
Ergebnis unter `/var/www/hapulse-releases/<sha7>` ab, schaltet den Symlink `/var/www/hapulse-current` (nginx-root) um und
prüft per Smoke-Test über nginx `index.html` und alle darin genannten Assets; schlägt das fehl, springt es auf das
vorige Release zurück. Gehashte Assets sammelt es im Pool `/var/www/hapulse-assets` (offene Tabs finden ihre Chunks
auch nach einem Deploy; ungenutzte gehen nach 14 Tagen). Es behält die drei neuesten Releases, Build-Logs liegen in
`/var/log/hapulse-build/`. Testschalter: `HAPULSE_FORCE_SMOKE_FAIL=1`.

## 2. Autoupdate auf dem Host

```bash
install -m 755 hapulse-autoupdate /usr/local/bin/
install -m 644 hapulse-autoupdate.cron /etc/cron.d/hapulse-autoupdate
install -m 600 hapulse-autoupdate.env.example /etc/hapulse-autoupdate.env   # echte Gotify-Werte eintragen
/usr/local/bin/hapulse-autoupdate && tail /var/log/hapulse-autoupdate.log    # erster Deploy
```

Ablauf jede Stunde (Minute 17): `git fetch` in CT 210, Vergleich von `origin/main` mit
`/var/lib/hapulse-autoupdate/deployed-sha`, Abfrage der GitHub-API, ob der Workflow „CI“ auf genau diesem Commit
erfolgreich war (öffentliches Repo, kein Token), dann `pct exec 210 -- hapulse-build-deploy <sha>`. Rote CI wird nicht
ausgerollt; ein fehlgeschlagener Build wird jede Stunde wiederholt, Gotify meldet den 1. und 3. Fehlschlag und jeden
erfolgreichen Deploy. Log: `/var/log/hapulse-autoupdate.log`. Ein Merge in `main` geht also ohne weiteres Zutun live.

Sofort statt zur nächsten vollen Stunde ausrollen: `/usr/local/bin/hapulse-autoupdate` von Hand aufrufen (deployt nur bei
grüner CI auf dem Commit).

## 3. TLS und Domain

CT 210 spricht nur HTTP auf Port 80. TLS und die öffentliche Domain macht ein vorgeschalteter Reverse-Proxy (hier
Nginx Proxy Manager in einem eigenen Container, Proxy-Host auf `http://<CT-IP>:80`). Die Security-Header setzt nginx
im CT selbst (`hapulse-security.conf`).

## Zugangsdaten

Im Container liegen keine Zugangsdaten: HA-Zugang und Sentinel-Token speichert das Dashboard im Browser. Auf dem Host
liegt einzig der Gotify-Zugang in `/etc/hapulse-autoupdate.env` (600).
