# Quick Photo Uploader

A web app that lets you quickly upload and view photos and videos in a shared album, **without a
login**. The album link is typically distributed via messenger (e.g. WhatsApp) — whoever has the
link can upload and view.

## Features

- **No login required** — an album comes into existence implicitly with the first upload and
  exists for as long as it contains at least one media item.
- **Slug-based albums** — a freely chosen, readable link instead of a cryptic ID (e.g.
  `.../wedding-anna`).
- **Gallery** with list/grid view and multi-select for deletion.
- **Delete your own uploads** — an owner token is stored in the browser for each file at upload
  time, which alone permits deleting that file.
- **Duplicate detection** within an album via file hash.
- **Automatic thumbnails**, including correct EXIF rotation and HEIC conversion for display.
- **Admin area** (`/admin`) for an instance-wide overview of all albums, including deletion
  without an owner token.
- **Bilingual UI** (English default, German switchable via the 🌐 icon) — see
  [ADR-0011](docs/adr/0011-multilingual-ui-english-default-german-optional.md).

Terms like *album*, *slug*, *media item*, or *owner token* are formally defined in
[CONTEXT.md](CONTEXT.md).

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19, TypeScript
- [Prisma](https://www.prisma.io/) with SQLite as the database
- [sharp](https://sharp.pixelplumbing.com/) for thumbnails, `heic-convert` for HEIC/HEIF
- [next-intl](https://next-intl.dev/) for the bilingual UI (message files under `messages/`)
- Files live directly on the filesystem (filesystem as source of truth, see
  [ADR-0002](docs/adr/0002-filesystem-is-source-of-truth.md))

## Local development

```bash
npm install
cp .env.example .env   # set ADMIN_SECRET, e.g. via `openssl rand -hex 32`
npm run prisma:migrate:dev
npm run dev
```

The app then runs at `http://localhost:3000`.

Other scripts:

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run test        # Vitest (single run)
npm run test:watch  # Vitest (watch mode)
npm run build        # Production build
```

### Environment variables

| Variable       | Description                                                                |
| -------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL` | SQLite path, e.g. `file:./data/db.sqlite`                                  |
| `STORAGE_ROOT` | Directory for album files (originals, thumbnails, display variants)        |
| `ADMIN_SECRET` | Access secret for `/admin`. The admin area stays locked without a value.   |
| `CONTENT_ROOT` | Directory for optional legal-page markdown files, see below.               |

## Deployment

On every push to `main`, the CD pipeline (`.github/workflows/cd.yml`) builds an image and pushes
it to `ghcr.io/chrizzoy-vino/quick-photo-uploader`. Deployment from there is via Docker Compose:

```bash
cp docker-compose.example.yml docker-compose.yml
# set ADMIN_SECRET in docker-compose.yml
docker compose up -d
```

The compose file mounts `./data` as a volume — it holds both the SQLite database and all album
files. For local image builds instead of the prebuilt GHCR image, see `docker-compose.yml`
(`build: .`).

The server expects TLS/HTTPS to be terminated by a reverse proxy in front of it (e.g.
Cloudflare); the app itself sets security headers (HSTS, CSP, `X-Robots-Tag: noindex`, ...) via
`proxy.ts`. Albums are not meant to be indexed by search engines — see `app/robots.ts`.

### Legal pages (Impressum / Datenschutz)

`/impressum` and `/datenschutz` show a placeholder until you add
`data/content/impressum.md` and `data/content/datenschutz.md` (each should start with its own
top-level Markdown heading, e.g. `# Impressum`, since the page no longer renders one itself) —
see [ADR-0010](docs/adr/0010-legal-pages-read-from-mounted-markdown-files.md).
These files are never part of the repo or the built image; they live only in your `./data`
volume on the host, alongside the database and album files. Filling them in with real,
jurisdiction-specific content is your responsibility as the operator — this repo doesn't ship a
template for legal text it can't write on your behalf.

## Architecture decisions

Important, non-obvious design decisions are documented as ADRs:

- [0001 — No login: possessing the link grants full album rights](docs/adr/0001-no-auth-link-grants-full-album-rights.md)
- [0002 — The filesystem is the source of truth](docs/adr/0002-filesystem-is-source-of-truth.md)
- [0003 — No enforced upload size limit](docs/adr/0003-no-enforced-upload-size-limit.md)
- [0004 — Delete rights limited to own uploads](docs/adr/0004-delete-rights-limited-to-own-uploads.md)
- [0005 — Admin access via a shared secret](docs/adr/0005-admin-access-via-shared-secret.md)
- [0006 — EXIF/GPS metadata preserved in originals](docs/adr/0006-exif-gps-preserved-in-originals.md)
- [0007 — Duplicate detection via client-side hash](docs/adr/0007-duplicate-detection-via-client-side-hash.md)
- [0008 — MIT license chosen](docs/adr/0008-mit-license-chosen.md)
- [0009 — Repo docs in English, product UI stays German](docs/adr/0009-repo-docs-in-english-product-ui-stays-german.md)
- [0010 — Legal pages read from mounted markdown files](docs/adr/0010-legal-pages-read-from-mounted-markdown-files.md)
- [0011 — Multilingual UI: English default/fallback, German switchable](docs/adr/0011-multilingual-ui-english-default-german-optional.md)

**Before self-hosting this**, please read the ADRs above — the security model is intentionally
minimal for this app's own private, link-only use case (no auth beyond the link, no enforced
upload size limit, GPS metadata kept in originals). Those trade-offs may not be right for your
use case.

For the abuse-handling case (e.g. a report about an illegal upload), see
[docs/runbook.md](docs/runbook.md).

## Security

To report a vulnerability, please see [SECURITY.md](SECURITY.md) — use GitHub's Private
Vulnerability Reporting rather than a public issue.

## License

MIT — see [LICENSE](LICENSE).
