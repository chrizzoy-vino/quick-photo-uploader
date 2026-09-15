# Security Policy

## Supported versions

This is a small, self-hosted, solo-maintained project. There's no versioned support matrix —
only the `latest` image built from `main` (see [README](README.md#deployment)) is supported.
If you're running an older tag, please update before reporting an issue.

## Reporting a vulnerability

Please use GitHub's [Private Vulnerability Reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)
(Security tab → "Report a vulnerability") instead of a public issue or a plaintext email address.

This is a hobby project maintained by one person in their spare time, so response times are
best-effort, not guaranteed. I'll do my best to acknowledge reports promptly and follow up once
I've had a chance to look into them.

## Already-known, intentional risk decisions

Before reporting, please check [`docs/adr/`](docs/adr/) — several things that might look like
vulnerabilities are deliberate, documented design decisions for this app's specific use case
(link-only sharing within a private circle), not oversights:

- No authentication at all beyond possessing the album link — [ADR-0001](docs/adr/0001-no-auth-link-grants-full-album-rights.md).
- No enforced upload size limit — [ADR-0003](docs/adr/0003-no-enforced-upload-size-limit.md).
- Admin access is a single shared secret, not per-admin accounts — [ADR-0005](docs/adr/0005-admin-access-via-shared-secret.md).
- EXIF/GPS metadata is preserved in originals — [ADR-0006](docs/adr/0006-exif-gps-preserved-in-originals.md).

If your report is about one of these specific behaviors, it likely won't be treated as a new
finding — but genuine bugs in how these are implemented (e.g. an access control bypass around
the owner-token check, or a path that leaks data despite the ADRs' intent) are absolutely worth
reporting.
