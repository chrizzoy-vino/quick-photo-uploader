# Runbook

## Missbrauchsfall (illegaler Upload, Host-Provider-Anfrage)

Die App selbst loggt bewusst nichts Personenbezogenes (keine IPs, keine User-Agents — siehe
ADR-0001, "kein Login"-Philosophie). Im Ernstfall (z.B. Meldung/Anfrage zu einem konkreten
Upload) sind die Cloudflare-eigenen Request-Logs die erste Anlaufstelle:

- Cloudflare-Dashboard → Analytics & Logs / Security → Events, gefiltert auf Zeitraum und Pfad
  (`/api/albums/<slug>/upload`).
- Enthält u.a. Ziel-IP des Clients, Zeitstempel, User-Agent — unabhängig vom App-Code.
- Den betroffenen Upload danach über den [Admin-Bereich](../CONTEXT.md) manuell entfernen.
