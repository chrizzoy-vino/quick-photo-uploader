# Quick Photo Uploader

Web-App, mit der man **ohne Login** schnell Fotos und Videos in ein gemeinsam genutztes Album
hochladen und ansehen kann. Der Album-Link wird typischerweise per Messenger (z. B. WhatsApp)
verteilt — wer den Link hat, darf hochladen und ansehen.

## Features

- **Kein Login nötig** — ein Album entsteht implizit mit dem ersten Upload und existiert, solange
  es mindestens eine Mediendatei enthält.
- **Slug-basierte Alben** — frei wählbarer, sprechender Link statt kryptischer ID (z. B.
  `.../hochzeit-anna`).
- **Galerie** mit Listen-/Rasteransicht und Mehrfachauswahl zum Löschen.
- **Eigene Uploads löschen** — pro Datei wird beim Upload ein Lösch-Token im Browser hinterlegt,
  das ausschließlich dessen Löschung erlaubt.
- **Duplikat-Erkennung** innerhalb eines Albums per Datei-Hash.
- **Automatische Vorschaubilder** inkl. korrekter EXIF-Rotation, HEIC-Konvertierung für die
  Anzeige.
- **Admin-Bereich** (`/admin`) für eine Instanz-weite Übersicht aller Alben inkl. Löschen ohne
  Lösch-Token.

Begriffe wie *Album*, *Slug*, *Mediendatei* oder *Lösch-Token* sind in [CONTEXT.md](CONTEXT.md)
verbindlich definiert.

## Tech-Stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19, TypeScript
- [Prisma](https://www.prisma.io/) mit SQLite als Datenbank
- [sharp](https://sharp.pixelplumbing.com/) für Vorschaubilder, `heic-convert` für HEIC/HEIF
- Dateien liegen direkt im Dateisystem (Filesystem als Source of Truth, siehe
  [ADR-0002](docs/adr/0002-filesystem-is-source-of-truth.md))

## Lokale Entwicklung

```bash
npm install
cp .env.example .env   # ADMIN_SECRET setzen, z.B. via `openssl rand -hex 32`
npm run prisma:migrate:dev
npm run dev
```

Die App läuft danach unter `http://localhost:3000`.

Weitere Skripte:

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run test        # Vitest (einmalig)
npm run test:watch  # Vitest (watch mode)
npm run build        # Produktions-Build
```

### Umgebungsvariablen

| Variable       | Beschreibung                                                                 |
| -------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL` | SQLite-Pfad, z. B. `file:./data/db.sqlite`                                   |
| `STORAGE_ROOT` | Verzeichnis für Album-Dateien (Originale, Vorschaubilder, Anzeige-Varianten) |
| `ADMIN_SECRET` | Zugangs-Secret für `/admin`. Ohne gesetzten Wert bleibt der Bereich gesperrt. |

## Deployment

Bei jedem Push auf `main` baut die CD-Pipeline (`.github/workflows/cd.yml`) ein Image und pusht es
nach `ghcr.io/chrizzoy-vino/quick-photo-uploader`. Deployment erfolgt darüber per Docker Compose:

```bash
cp docker-compose.example.yml docker-compose.yml
# ADMIN_SECRET in docker-compose.yml eintragen
docker compose up -d
```

Das Compose-File bindet `./data` als Volume ein — dort liegen sowohl die SQLite-Datenbank als auch
alle Album-Dateien. Für lokale Image-Builds statt des vorgebauten GHCR-Images siehe
`docker-compose.yml` (`build: .`).

Der Server erwartet TLS/HTTPS über einen vorgeschalteten Reverse Proxy bzw. Cloudflare; Sicherheits-
Header (HSTS, CSP, `X-Robots-Tag: noindex`, …) setzt die App selbst über `proxy.ts`. Alben sind
nicht für Suchmaschinen gedacht — siehe `app/robots.ts`.

## Architektur-Entscheidungen

Wichtige, nicht offensichtliche Design-Entscheidungen sind als ADRs dokumentiert:

- [0001 — Kein Login: Link gewährt vollen Album-Zugriff](docs/adr/0001-no-auth-link-grants-full-album-rights.md)
- [0002 — Dateisystem ist Source of Truth](docs/adr/0002-filesystem-is-source-of-truth.md)
- [0003 — Kein erzwungenes Upload-Größenlimit](docs/adr/0003-no-enforced-upload-size-limit.md)
- [0004 — Löschrechte auf eigene Uploads beschränkt](docs/adr/0004-loeschrechte-auf-eigene-uploads-beschraenkt.md)
- [0005 — Admin-Zugang per geteiltem Secret](docs/adr/0005-admin-zugang-per-geteiltes-secret.md)
- [0006 — EXIF-GPS in Originalen bleibt erhalten](docs/adr/0006-exif-gps-in-originalen-bleibt-erhalten.md)
- [0007 — Duplikat-Erkennung per clientseitigem Hash](docs/adr/0007-duplikat-erkennung-per-clientseitigem-hash.md)

Für den Missbrauchsfall (z. B. Anfrage zu einem illegalen Upload) siehe
[docs/runbook.md](docs/runbook.md).

## Lizenz & Impressum

Privates Homelab-Projekt. Rechtliche Hinweise siehe `/impressum` und `/datenschutz` der laufenden
Instanz.
