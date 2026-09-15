# Runbook

## Abuse case (illegal upload, hosting-provider inquiry)

The app itself deliberately logs nothing personally identifiable (no IPs, no user agents — see
ADR-0001's "no login" philosophy). In an actual case (e.g. a report/inquiry about a specific
upload), Cloudflare's own request logs are the first place to look:

- Cloudflare dashboard → Analytics & Logs / Security → Events, filtered by time range and path
  (`/api/albums/<slug>/upload`).
- Includes the client's source IP, timestamp, user agent, among others — independent of the app
  code.
- Afterwards, remove the affected upload manually via the [admin area](../CONTEXT.md).
